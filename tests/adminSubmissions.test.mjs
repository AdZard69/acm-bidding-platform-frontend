import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { loadSource, hookRuntime, deferred, flushPromises } from './helpers/runtime.mjs';

const flatten = (node) => !node || typeof node !== 'object' ? [] : Array.isArray(node)
  ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)];
const text = (node) => node == null || typeof node === 'boolean' ? '' : Array.isArray(node)
  ? node.map(text).join('') : typeof node === 'object' ? text(node.props?.children) : String(node);
const result = (submitted = 1) => ({ success: true,
  codingState: { isStarted: false, startTime: null, isPaused: false },
  submissions: [1, 2, 3].map((teamId) => ({ teamId, teamName: `Team ${teamId}`,
    assignment: { promptId: 1, promptTitle: 'Build a game', round: 1, bidMinutes: 60, multiplier: 1.5 },
    isSubmitted: teamId <= submitted, submission: teamId <= submitted
      ? { githubUrl: `https://github.com/team${teamId}/project`, submittedAt: '2026-11-01T00:00:00Z' } : null,
    deadline: null, remainingSeconds: 0, isExpired: false, isLate: false }))
});
function setup(t, firstError) {
  const runtime = hookRuntime();
  Object.assign(runtime.react, { createElement: React.createElement, Fragment: React.Fragment });
  const handlers = new Map();
  const requests = [];
  const first = deferred();
  const socket = { on(event, callback) { if (!handlers.has(event)) handlers.set(event, new Set()); handlers.get(event).add(callback); },
    off(event, callback) { handlers.get(event)?.delete(callback); } };
  const api = {
    listSubmissions() {
      const request = deferred(); requests.push(request);
      if (requests.length === 1) return first.promise.then(() => { if (firstError) throw new Error(firstError); return result(); });
      return request.promise;
    },
    listTeams: async () => ({ success: true, teams: [] }), listPrompts: async () => ({ success: true, prompts: [] }),
    getConfig: async () => ({ success: true, config: { currentRound: 0 } }),
    getLeaderboard: async () => ({ success: true, leaderboard: [] }), listBids: async () => ({ success: true, bids: [] })
  };
  const { AdminPage } = loadSource('pages/AdminPage.tsx', {
    react: runtime.react, '../api/client': { api }, '../context/SocketContext': { useSocket: () => ({
      socket, isConnected: true, gameStatus: 'waiting', currentRound: 0, rounds: [], openedPrompts: [], bids: [],
      refreshState() {}, totalPrompts: 0 }) },
    '../utils/rounds': loadSource('utils/rounds.ts'), '../utils/multiplier': loadSource('utils/multiplier.ts'),
    '../components/BiddingTimerBadge': { BiddingTimerBadge: () => null }
  }, { ...runtime.globals, Error, setTimeout() {}, queueMicrotask });
  const render = () => runtime.render(AdminPage);
  const nodes = () => flatten(render());
  const button = (label) => nodes().find((node) => node.type === 'button' && text(node) === label);
  t.after(() => runtime.cleanup());
  render();
  return { render, nodes, button, first, requests, runtime,
    emit(event) { handlers.get(event)?.forEach((callback) => callback()); } };
}

test('submissions load real team totals, refresh on assignment events and poll the open tab', async (t) => {
  const app = setup(t);
  assert.ok(app.button('Submissions (Loading…)'));
  assert.ok(!app.button('Submissions (0/0)'));
  app.first.resolve(); await flushPromises();
  assert.ok(app.button('Submissions (1/3)'));
  app.button('Submissions (1/3)').props.onClick(); app.render();
  await flushPromises();
  app.requests.at(-1).resolve(result()); await flushPromises();
  assert.match(text(app.render()), /Team 1.*Team 2.*Team 3/);
  app.emit('prompt:results');
  app.requests.at(-1).resolve(result(2)); await flushPromises();
  assert.ok(app.button('Submissions (2/3)'));
  const before = app.requests.length;
  app.runtime.tick(15000);
  assert.equal(app.requests.length, before + 1);
  app.requests.at(-1).resolve(result(3)); await flushPromises();
  assert.ok(app.button('Submissions (3/3)'));
});

test('submission load failures display an error and can be retried instead of showing zero teams', async (t) => {
  const app = setup(t, 'Service unavailable');
  app.first.resolve(); await flushPromises();
  app.button('Submissions (Unavailable)').props.onClick(); app.render();
  assert.match(text(app.render()), /Could not load submissions: Service unavailable/);
  assert.doesNotMatch(text(app.render()), /No teams registered|Submissions \(0\/0\)/);
  app.requests.at(-1).resolve(result()); await flushPromises();
  assert.ok(app.button('Submissions (1/3)'));
  assert.ok(!app.nodes().some((node) => node.props?.role === 'alert'));
});

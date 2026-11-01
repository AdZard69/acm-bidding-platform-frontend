import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadSource, hookRuntime, deferred, flushPromises } from './helpers/runtime.mjs';

const prompt = { id: 1, title: 'Build a game', description: 'A multiplayer game', displayOrder: 1 };
const snapshot = (overrides = {}) => ({
  success: true, status: 'bidding', currentRound: 1, currentPrompt: prompt,
  rounds: [{ roundNumber: 1, promptIds: [1, 2, 3] }],
  openedPrompts: [{ roundNumber: 1, promptId: 1 }],
  totalRounds: 1, hasNextRound: false, nextRoundNumber: 1,
  promptNumber: 1, totalPrompts: 3, passComplete: false, unassignedTeams: 3, hasNextPrompt: true, nextPromptNumber: 2,
  availableSlots: 3, remainingMs: 60000, secondsRemaining: 60, durationSeconds: 60,
  timerId: 'first-run', isPaused: false, hasExpired: false,
  config: { baseTime: 120, minBid: 30, slotsPerPrompt: 3, bidDurationSeconds: 60 },
  bids: [], ...overrides
});

function setup(t, role = 'team') {
  const runtime = hookRuntime();
  const handlers = new Map();
  const publicRequests = [];
  const privateRequests = [];
  const commands = [];
  let elapsed = 0;
  let pingReply;
  const connection = {
    connected: true,
    connect() {},
    on(event, handler) { handlers.set(event, handler); },
    removeAllListeners() { handlers.clear(); }, disconnect() {},
    timeout() { return { emit(event, input, ack) {
      commands.push({ event, input });
      ack(null, event === 'time:sync' ? pingReply : { success: true });
    } }; }
  };
  const api = {
    getCurrentBiddingState() { const pending = deferred(); publicRequests.push(pending); return pending.promise; },
    getMyAssignment() { const pending = deferred(); privateRequests.push(pending); return pending.promise; },
    getMyBids: async () => ({ success: true, bids: [] })
  };
  const auth = { token: 'test-token', user: { role, teamId: 1, teamName: 'One' } };
  const timer = loadSource('utils/biddingTimer.ts', {}, { performance: { now: () => elapsed } });
  const { useBiddingState } = loadSource('context/SocketContext.tsx', {
    react: runtime.react, 'socket.io-client': { io: () => connection },
    './AuthContext': { useAuth: () => auth }, '../api/client': { api, API_BASE: 'http://localhost/api' },
    '../utils/biddingTimer': timer,
    '../utils/socketOptions': loadSource('utils/socketOptions.ts')
  }, { ...runtime.globals, performance: { now: () => elapsed } }, '\nexport { useBiddingState };');
  const render = () => runtime.render(useBiddingState);
  const receive = (event, data) => { handlers.get(event)(data); return render(); };
  const mocks = {
    '../context/SocketContext': { useSocket: render },
    '../context/AuthContext': { useAuth: () => auth },
    '../components/BiddingTimerBadge': { BiddingTimerBadge: () => null },
    '../api/client': { api },
    '../utils/multiplier': loadSource('utils/multiplier.ts')
  };
  const { TeamPage } = loadSource('pages/TeamPage.tsx', mocks);
  const { ArenaPage } = loadSource('pages/ArenaPage.tsx', mocks);
  t.after(() => runtime.cleanup());
  render();
  return {
    render, receive, publicRequests, privateRequests, commands, api, mocks,
    setPingReply(reply) { pingReply = reply; },
    advance(ms) { elapsed += ms; runtime.tick(100); return render(); },
    teamHTML: () => renderToStaticMarkup(React.createElement(TeamPage)),
    arenaHTML: () => renderToStaticMarkup(React.createElement(ArenaPage)),
    adminHTML: () => {
      const { AdminPage } = loadSource('pages/AdminPage.tsx', { ...mocks,
        '../utils/rounds': loadSource('utils/rounds.ts'),
        '../utils/multiplier': loadSource('utils/multiplier.ts')
      });
      return renderToStaticMarkup(React.createElement(AdminPage));
    }
  };
}

test('public countdown renders at 60 without waiting for the assignment request', async (t) => {
  const app = setup(t);
  app.publicRequests.at(-1).resolve(snapshot());
  await flushPromises();
  assert.equal(app.render().secondsRemaining, 60);
  assert.match(app.teamHTML(), /60s left to bid/);
  assert.match(app.arenaHTML(), /01:00/);
  assert.equal(app.advance(1000).secondsRemaining, 59);
  assert.match(app.arenaHTML(), /00:59/);
});

test('arena counts new bids and updates each team in place', (t) => {
  const app = setup(t);
  app.receive('game:status', snapshot());
  app.receive('bid:new', { teamId: 1, promptId: 1, round: 1, bidMinutes: 50, teamName: 'One', timerId: 'first-run' });
  assert.match(app.arenaHTML(), /Total Bids: <strong[^>]*>1<\/strong>/);
  app.receive('bid:new', { teamId: 2, promptId: 1, round: 1, bidMinutes: 45, teamName: 'Two' });
  app.receive('bid:updated', { teamId: 1, promptId: 1, round: 1, bidMinutes: 40, teamName: 'One' });
  assert.deepEqual(Array.from(app.render().bids, (bid) => bid.bidMinutes), [40, 45]);
  assert.match(app.arenaHTML(), /Total Bids: <strong[^>]*>2<\/strong>/);
});

test('initial bidding refresh still loads a previous-round winner assignment', async (t) => {
  const app = setup(t);
  app.publicRequests.at(-1).resolve(snapshot());
  await flushPromises();
  app.privateRequests.at(-1).resolve({ success: true,
    assignment: { promptId: 2, prompt: { title: 'Previous prompt' }, bidMinutes: 40, multiplier: 1.5, round: 2 },
    score: { judgeScore: 80, finalScore: 120 }
  });
  await flushPromises();
  assert.equal(app.render().myAssignment.promptId, 2);
  assert.equal(app.render().myScore.finalScore, 120);
});

test('rerunning the same prompt reopens the team form despite a late closed REST response', async (t) => {
  const app = setup(t);
  app.receive('game:status', snapshot({ status: 'round_ended', remainingMs: 0, secondsRemaining: 0 }));
  app.receive('assignment:received', { promptId: 1, title: prompt.title, bidMinutes: 40, round: 1 });
  app.receive('score:received', { judgeScore: 90, finalScore: 180 });
  const pending = app.render().refreshState();
  app.receive('assignment:received', null);
  app.receive('round:started', snapshot({ timerId: 'rerun' }));
  app.publicRequests.at(-1).resolve(snapshot({ status: 'round_ended', remainingMs: 0 }));
  app.privateRequests.at(-1).resolve({ success: true, assignment: { promptId: 1 }, score: { judgeScore: 90 } });
  await pending;
  const state = app.render();
  assert.equal(state.gameStatus, 'bidding');
  assert.equal(state.myAssignment, null);
  assert.equal(state.myScore, null);
  assert.equal(state.secondsRemaining, 60);
  assert.match(app.teamHTML(), /Submit Bid: 60m/);
  const submitButton = app.teamHTML().match(/<button[^>]*type="submit"[^>]*>/)?.[0];
  assert.ok(submitButton);
  assert.doesNotMatch(submitButton, /\sdisabled(?:=|\s|>)/);
  assert.doesNotMatch(app.teamHTML(), /Bidding Closed|Timer Expired|Assigned Problem Statement/);
  assert.equal((await state.placeBid(45)).success, true);
  assert.equal(app.commands.at(-1).input.timerId, 'rerun');
  app.receive('bid:new', { teamId: 2, promptId: 1, round: 1, bidMinutes: 40, timerId: 'first-run' });
  app.receive('round:ended', { timerId: 'first-run' });
  assert.equal(app.render().bids.length, 0);
  assert.equal(app.render().gameStatus, 'bidding');
});

test('a timer extension after expiry updates rendered status and enables bidding', (t) => {
  const app = setup(t);
  app.receive('game:status', snapshot({ status: 'round_ended', remainingMs: 0, secondsRemaining: 0 }));
  const state = app.receive('timer:extended', { timerId: 'first-run', status: 'bidding', remainingMs: 15000 });
  assert.equal(state.gameStatus, 'bidding');
  assert.equal(state.isExpired, false);
  assert.match(app.teamHTML(), /15s left to bid/);
  assert.doesNotMatch(app.teamHTML(), /Bidding Closed|Timer Expired/);
});

test('older countdown snapshots cannot rewind a newer socket tick', async (t) => {
  const app = setup(t);
  app.receive('game:status', snapshot({ serverTime: 1000 }));
  const pending = app.render().refreshState();
  app.receive('timer:tick', { timerId: 'first-run', serverTime: 3000, remainingMs: 58000, status: 'bidding' });
  app.publicRequests.at(-1).resolve(snapshot({ serverTime: 2000, remainingMs: 59000 }));
  app.privateRequests.at(-1).resolve({ success: true, assignment: null, score: null });
  await pending;
  assert.equal(app.render().secondsRemaining, 58);
});

test('admin start applies the response immediately without waiting for another REST read', async (t) => {
  const app = setup(t, 'admin');
  app.api.startRound = async () => snapshot();
  const result = await app.render().adminStartRound(1);
  assert.equal(result.success, true);
  assert.equal(app.render().secondsRemaining, 60);
  assert.equal(app.render().gameStatus, 'bidding');
  assert.equal(app.advance(1000).secondsRemaining, 59);
});

test('monotonic snapshot sequence keeps clients synchronized across server wall-clock adjustments', (t) => {
  const app = setup(t);
  app.receive('game:status', snapshot({ timerStreamId: 'server', timerSequence: 5, serverTime: 10000 }));
  app.receive('timer:tick', { timerId: 'first-run', timerStreamId: 'server', timerSequence: 6,
    serverTime: -10000, status: 'bidding', remainingMs: 59000 });
  assert.equal(app.render().secondsRemaining, 59);
  app.receive('game:status', snapshot({ timerStreamId: 'server', timerSequence: 5, serverTime: 999999 }));
  assert.equal(app.render().secondsRemaining, 59);
});

test('delayed packets are aged against the central monotonic clock instead of restarting their displayed time', (t) => {
  const app = setup(t);
  app.setPingReply({ timer: { timerStreamId: 'server', serverMonotonicTime: 1000 } });
  app.receive('connect');
  app.receive('game:status', snapshot({ timerStreamId: 'server', timerSequence: 1, serverMonotonicTime: 1000 }));
  assert.equal(app.advance(5000).secondsRemaining, 55);
  app.receive('timer:tick', { timerId: 'first-run', timerStreamId: 'server', timerSequence: 2,
    serverMonotonicTime: 2000, remainingMs: 59000, status: 'bidding' });
  assert.equal(app.render().secondsRemaining, 55);
  assert.equal(app.advance(55000).secondsRemaining, 0);
});

test('a tick for a missed round start recovers its full state', async (t) => {
  const app = setup(t);
  app.receive('game:status', snapshot({ status: 'round_ended', remainingMs: 0 }));
  const requestsBefore = app.publicRequests.length;
  app.receive('timer:tick', { timerId: 'rerun', status: 'bidding', remainingMs: 59000 });
  app.receive('timer:tick', { timerId: 'rerun', status: 'bidding', remainingMs: 58000 });
  assert.equal(app.publicRequests.length, requestsBefore + 1);
  app.publicRequests.at(-1).resolve(snapshot({ timerId: 'rerun', remainingMs: 58000 }));
  await flushPromises();
  assert.equal(app.render().timerId, 'rerun');
  assert.equal(app.render().gameStatus, 'bidding');
  assert.equal(app.render().secondsRemaining, 58);
});

test('team renders the first 60-second rerun tick while its REST refresh is still pending', async (t) => {
  const app = setup(t);
  app.receive('game:status', snapshot({ status: 'round_ended', remainingMs: 0, secondsRemaining: 0,
    bids: [{ teamId: 1, promptId: 1, round: 1, bidMinutes: 40 }] }));
  // Simulate missing the one-off start event during connection/reconnection.
  app.receive('timer:tick', { timerId: 'rerun', promptId: 1, roundNumber: 1, status: 'bidding', remainingMs: 60000 });
  assert.equal(app.render().secondsRemaining, 60);
  assert.equal(app.render().gameStatus, 'bidding');
  assert.equal(app.render().bids.length, 0);
  assert.match(app.teamHTML(), /60s left to bid/);
  assert.match(app.arenaHTML(), /01:00/);
  app.advance(20000);
  assert.equal(app.render().secondsRemaining, 40);
  // Details arriving twenty seconds later enrich the already visible timer.
  app.publicRequests.at(-1).resolve(snapshot({ timerId: 'rerun', remainingMs: 40000, secondsRemaining: 40 }));
  app.privateRequests.at(-1).resolve({ success: true, assignment: null, score: null });
  await flushPromises();
  assert.equal(app.render().secondsRemaining, 40);
});

test('admin renders a new prompt timer immediately without keeping the previous prompt or bids', (t) => {
  // The same provider supplies the countdown and status to AdminPage.
  const app = setup(t, 'admin');
  app.receive('game:status', snapshot({ status: 'round_ended', remainingMs: 0, secondsRemaining: 0 }));
  app.receive('timer:tick', { timerId: 'round-2', promptId: 2, roundNumber: 2, status: 'bidding', remainingMs: 60000 });
  assert.equal(app.render().secondsRemaining, 60);
  assert.equal(app.render().currentRound, 2);
  assert.equal(app.render().currentPrompt, null);
  assert.equal(app.render().bids.length, 0);
  assert.match(app.adminHTML(), /TIME LEFT<\/span><span[^>]*>60s/);
  assert.match(app.adminHTML(), /<span>Round 2<\/span>/);
});

test('round and prompt rerun selectors keep both actions without a round slider', async (t) => {
  const runtime = hookRuntime();
  runtime.react.createElement = React.createElement;
  runtime.react.Fragment = React.Fragment;
  const actions = [];
  const state = snapshot({ status: 'round_ended', remainingMs: 0 });
  const socketState = {
    ...state, gameStatus: state.status, isExpired: true, rounds: state.rounds,
    adminStartRound: async (round) => { actions.push(['start', round]); return { success: true }; },
    adminRerunRound: async (round) => { actions.push(['rerun', round]); return { success: true }; },
    adminRerunPrompt: async (promptId, round) => { actions.push(['prompt', promptId, round]); return { success: true }; }
  };
  const api = {
    listTeams: async () => ({ success: true, teams: [] }),
    listPrompts: async () => ({ success: true, prompts: [prompt] }),
    getConfig: async () => ({ success: true, config: state.config }),
    getLeaderboard: async () => ({ success: true, leaderboard: [] }),
    listBids: async () => ({ success: true, bids: [] })
  };
  const { AdminPage } = loadSource('pages/AdminPage.tsx', {
    react: runtime.react,
    '../context/SocketContext': { useSocket: () => socketState },
    '../api/client': { api },
    '../utils/rounds': loadSource('utils/rounds.ts'),
    '../utils/multiplier': loadSource('utils/multiplier.ts'),
    '../components/BiddingTimerBadge': { BiddingTimerBadge: () => null }
  }, { ...runtime.globals, window: { confirm: () => true }, setTimeout() {}, queueMicrotask });
  t.after(() => runtime.cleanup());
  const flatten = (node) => !node || typeof node !== 'object' ? []
    : Array.isArray(node) ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)];
  const nodes = () => flatten(runtime.render(AdminPage));
  const text = (node) => node == null || typeof node === 'boolean' ? ''
    : Array.isArray(node) ? node.map(text).join('')
    : typeof node === 'object' ? text(node.props?.children) : String(node);
  const button = (label) => nodes().find((node) => node.type === 'button' && text(node) === label);
  nodes();
  await flushPromises();
  assert.ok(!nodes().some((node) => node.type === 'input' && node.props.type === 'range'));
  assert.ok(button('Open Round 1'));
  assert.ok(button('Rerun Round 1'));
  assert.ok(nodes().some((node) => node.type === 'select' && node.props['aria-label'] === 'Round to control'));
  assert.ok(!nodes().some((node) => text(node) === 'Return to Controls'));
  const roundInput = nodes().find((node) => node.props['aria-label'] === 'Round to control');
  roundInput.props.onChange({ target: { value: '1' } });
  await button('Open Round 1').props.onClick();
  await button('Rerun Round 1').props.onClick();
  const promptSelector = nodes().find((node) => node.props['aria-label'] === 'Prompt to rerun');
  promptSelector.props.onChange({ target: { value: '1:1' } });
  assert.equal(button(' Rerun Prompt').props.disabled, false);
  await button(' Rerun Prompt').props.onClick();
  assert.deepEqual(actions, [['start', 1], ['rerun', 1], ['prompt', 1, 1]]);
  socketState.gameStatus = 'bidding';
  socketState.currentPrompt = { ...prompt, id: 2 };
  assert.equal(button(' Rerun Prompt').props.disabled, true);
  socketState.gameStatus = 'round_ended';
  assert.equal(button(' Rerun Prompt').props.disabled, false);
  assert.ok(nodes().some((node) => node.type === 'select' && node.props['aria-label'] === 'Round to control'));
  assert.ok(!button('Round 2'));
  api.listBids = async () => ({ success: true, bids: [{ teamId: 2, promptId: 1, round: 2, bidMinutes: 45 }] });
  runtime.cleanup();
  const reloaded = hookRuntime();
  Object.assign(runtime.react, reloaded.react);
  reloaded.react.createElement = React.createElement;
  reloaded.react.Fragment = React.Fragment;
  reloaded.render(AdminPage);
  await flushPromises();
  const restoredNodes = flatten(reloaded.render(AdminPage));
  assert.ok(restoredNodes.some((node) => node.type === 'button' && text(node) === 'Round 2Bids'));
  reloaded.cleanup();
});


test('a later pass on the same prompt preserves an earlier winner assignment', async (t) => {
  const app = setup(t);
  app.receive('game:status', snapshot({ status: 'round_ended', remainingMs: 0 }));
  app.receive('assignment:received', { promptId: 1, title: prompt.title, bidMinutes: 40, round: 1, multiplier: 1.9 });
  app.receive('game:status', snapshot({ currentRound: 2, timerId: 'second-pass', promptNumber: 1 }));
  assert.equal(app.render().myAssignment.round, 1);
  assert.match(app.teamHTML(), /Assigned Problem Statement/);
  app.receive('game:status', snapshot({ currentRound: 2, timerId: 'second-pass-rerun', promptNumber: 1 }));
  assert.equal(app.render().myAssignment.round, 1);
  assert.doesNotMatch(app.teamHTML(), /multiplier|boost|k\s*=/i);
});

test('team and arena labels separate the pass from prompt progress while admin retains scoring details', async (t) => {
  const app = setup(t);
  app.receive('game:status', snapshot({ promptNumber: 2, status: 'round_ended', remainingMs: 0,
    bids: [{ teamId: 1, promptId: 1, round: 1, bidMinutes: 40, teamName: 'One' }] }));
  const team = app.teamHTML();
  assert.match(team, /ROUND 1 · PROMPT 2 \/ 3/);
  assert.match(team, /Waiting for the next prompt/);
  assert.doesNotMatch(team, /multiplier|boost|k\s*=/i);
  assert.match(app.arenaHTML(), /ROUND 1 · PROMPT 2 \/ 3/);
  assert.match(app.adminHTML(), /Scoring k = 1.0/);
  assert.match(app.adminHTML(), /Multiplier/);
  app.receive('game:status', snapshot({ promptNumber: 3, status: 'round_ended', remainingMs: 0,
    passComplete: true, nextRoundNumber: 2, hasNextRound: true, nextPromptNumber: 1 }));
  assert.match(app.teamHTML(), /Waiting for the next prompt/);
});


test('the shared homepage and team leaderboard do not show multiplier explanations', (t) => {
  const app = setup(t);
  const { HomePage } = loadSource('pages/HomePage.tsx', { ...app.mocks,
    'react-router-dom': { Link: ({ to, children, ...props }) => React.createElement('a', { href: to, ...props }, children) }
  });
  const { LeaderboardPage } = loadSource('pages/LeaderboardPage.tsx', { ...app.mocks,
    '../utils/multiplier': loadSource('utils/multiplier.ts')
  });
  assert.doesNotMatch(renderToStaticMarkup(React.createElement(HomePage)), /multiplier|boost|k\s*=/i);
  assert.doesNotMatch(renderToStaticMarkup(React.createElement(LeaderboardPage)), /multiplier|boost|k\s*=/i);
});


test('refreshing during Round 2 restores its navigation before complete metadata arrives', async (t) => {
  const app = setup(t, 'admin');
  app.receive('timer:tick', { timerId: 'round-2-reload', promptId: 1, roundNumber: 2, status: 'bidding', remainingMs: 45000 });
  assert.equal(app.render().rounds.length, 0);
  assert.match(app.adminHTML(), /<span>Round 2<\/span>/);
  app.publicRequests.at(-1).resolve(snapshot({ currentRound: 2, timerId: 'round-2-reload',
    rounds: [{ roundNumber: 1, promptIds: [1, 2, 3] }], remainingMs: 45000 }));
  await flushPromises();
  const html = app.adminHTML();
  assert.match(html, /<span>Round 2<\/span>/);
  assert.doesNotMatch(html, /View Bids \(|Winners? Assigned|Round 1 is|pass through the prompts/);
  assert.doesNotMatch(app.teamHTML(), /Each round is|Round 2 starts after|pass through the prompts/);
});


test('arena keeps one countdown and one bidding status', (t) => {
  const app = setup(t);
  app.receive('game:status', snapshot());
  const { BiddingTimerBadge } = loadSource('components/BiddingTimerBadge.tsx', app.mocks);
  const { ArenaPage } = loadSource('pages/ArenaPage.tsx', {
    ...app.mocks, '../components/BiddingTimerBadge': { BiddingTimerBadge }
  });
  const html = renderToStaticMarkup(React.createElement(ArenaPage));
  assert.equal((html.match(/STATUS:/g) || []).length, 1);
  assert.equal((html.match(/01:00/g) || []).length, 1);
  assert.doesNotMatch(html, /Bidding countdown/);
});


test('prompt rerun commands include the selected round and active session and apply the new snapshot', async (t) => {
  const app = setup(t, 'admin');
  app.receive('game:status', snapshot({ status: 'round_ended', remainingMs: 0 }));
  let input;
  app.api.rerunPrompt = async (...args) => {
    input = args;
    return snapshot({ timerId: 'prompt-rerun' });
  };
  const result = await app.render().adminRerunPrompt(1, 1);
  assert.equal(result.success, true);
  assert.deepEqual(input, [1, 1, 'first-run']);
  assert.equal(app.render().timerId, 'prompt-rerun');
});


test('round 2 reopening the same prompt preserves a round 1 winner assignment', async (t) => {
  const app = setup(t);
  app.receive('round:started', snapshot());
  app.receive('assignment:received', { promptId: 1, title: prompt.title, bidMinutes: 40, round: 1 });
  app.receive('round:started', snapshot({ timerId: 'round-two', currentRound: 2 }));
  assert.equal(app.render().myAssignment?.round, 1);
  assert.equal(app.render().myAssignment?.title, prompt.title);
});

test('extending a closed prompt reopens bidding and clears provisional winners across team and arena views', (t) => {
  const app = setup(t);
  app.receive('game:status', snapshot({ status: 'round_ended', remainingMs: 0,
    winners: [{ teamId: 1, teamName: 'One', bidMinutes: 40, multiplier: 1.5 }] }));
  app.receive('assignment:received', { promptId: 1, title: prompt.title, bidMinutes: 40, round: 1 });
  app.receive('assignment:cleared');
  app.receive('timer:extended', { timerId: 'first-run', status: 'bidding', remainingMs: 15000 });
  assert.equal(app.render().lastWinners, null);
  assert.equal(app.render().myAssignment, null);
  assert.equal(app.render().secondsRemaining, 15);
  assert.match(app.teamHTML(), /15s left to bid/);
  assert.doesNotMatch(app.arenaHTML(), /Awarded Winners/);
});

test('arena highlights the lowest three bids out of four teams', (t) => {
  const app = setup(t);
  app.receive('game:status', snapshot({ availableSlots: 3,
    bids: [40, 45, 50, 55].map((bidMinutes, index) => ({ teamId: index + 1, promptId: 1, round: 1, bidMinutes })) }));
  const html = app.arenaHTML();
  assert.match(html, /Lowest 3 Qualify/);
  assert.equal((html.match(/border-emerald-500\/40/g) || []).length, 3);
});

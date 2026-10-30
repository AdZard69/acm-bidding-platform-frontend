import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Compile the production utility in memory, without a test runtime dependency.
const source = readFileSync(new URL('../src/utils/biddingTimer.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2020 }
});
const { BiddingTimer } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const snapshot = (overrides = {}) => ({ timerId: 'session-1', status: 'bidding', remainingMs: 60000, durationSeconds: 60, ...overrides });

test('admin and team countdowns converge despite different device wall clocks and network latency', () => {
  let adminElapsed = 1000;
  let teamElapsed = 99999999;
  const admin = new BiddingTimer(() => adminElapsed);
  const team = new BiddingTimer(() => teamElapsed);
  admin.apply(snapshot({ remainingMs: 60000 }), 20);
  team.apply(snapshot({ remainingMs: 59970 }), 50);
  adminElapsed += 500;
  teamElapsed += 440;
  assert.equal(admin.remainingMs(), 59480);
  assert.equal(team.remainingMs(), 59480);
});

test('a paused extension is reflected immediately and remains frozen until resume', () => {
  let elapsed = 0;
  const timer = new BiddingTimer(() => elapsed);
  timer.apply(snapshot({ status: 'paused', remainingMs: 12345 }));
  elapsed = 100000;
  assert.equal(timer.remainingMs(), 12345);
  timer.apply(snapshot({ status: 'paused', remainingMs: 27345, durationSeconds: 75 }));
  elapsed += 100000;
  assert.equal(timer.remainingMs(), 27345);
  timer.apply(snapshot({ remainingMs: 27345, durationSeconds: 75 }));
  elapsed += 345;
  assert.equal(timer.secondsRemaining(), 27);
});

test('reload and reconnect use server remaining time rather than restart the duration', () => {
  let elapsed = 0;
  const timer = new BiddingTimer(() => elapsed);
  timer.apply(snapshot({ remainingMs: 18500 }));
  elapsed += 45000;
  assert.equal(timer.secondsRemaining(), 0);
  timer.apply(snapshot({ timerId: 'session-2', remainingMs: 42000 }));
  assert.equal(timer.secondsRemaining(), 42);
});

test('ending or resetting a paused timer clears the countdown', () => {
  const timer = new BiddingTimer(() => 0);
  timer.apply(snapshot({ status: 'paused' }));
  timer.apply(snapshot({ status: 'round_ended', timerId: null }));
  assert.equal(timer.secondsRemaining(), 0);
  timer.apply(snapshot({ status: 'waiting', timerId: null }));
  assert.equal(timer.secondsRemaining(), 0);
});

test('wall clock adjustments cannot change an active bidding countdown', () => {
  let elapsed = 0;
  const timer = new BiddingTimer(() => elapsed);
  timer.apply(snapshot());
  const original = Date.now;
  try {
    Date.now = () => original() + 86400000;
    elapsed += 5000;
    assert.equal(timer.secondsRemaining(), 55);
    Date.now = () => original() - 86400000;
    elapsed += 5000;
    assert.equal(timer.secondsRemaining(), 50);
  } finally { Date.now = original; }
});

test('a completed prompt stays at zero until a new round snapshot arrives', () => {
  let elapsed = 0;
  const timer = new BiddingTimer(() => elapsed);
  timer.apply(snapshot({ status: 'round_ended', remainingMs: 0 }));
  elapsed += 120000;
  assert.equal(timer.secondsRemaining(), 0);
  timer.apply(snapshot({ timerId: 'round-2', remainingMs: 60000 }));
  assert.equal(timer.secondsRemaining(), 60);
});

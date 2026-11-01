import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const compile = async (file) => {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2020 } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
};
const { promptRounds, groupRoundBids } = await compile('../src/utils/rounds.ts');
const { calculateMultiplier } = await compile('../src/utils/multiplier.ts');
const prompts = [
  { id: 90, title: 'Third', description: '', displayOrder: 30 },
  { id: 12, title: 'First', description: '', displayOrder: 10 },
  { id: 44, title: 'Second', description: '', displayOrder: 20 }
];

test('a round contains the whole prompt order rather than one prompt', () => {
  assert.deepEqual(promptRounds(prompts), [{ roundNumber: 1, promptIds: [12, 44, 90] }]);
});

test('all bids in one pass stay together across different prompts', () => {
  const history = [12, 44, 90].map((promptId, index) => ({ id: index + 1, teamId: 1, promptId, round: 1, bidMinutes: 45 + index }));
  const grouped = groupRoundBids(history, [], promptRounds(prompts));
  assert.deepEqual(Object.keys(grouped), ['1']);
  assert.equal(grouped[1].length, 3);
  assert.deepEqual(history.map((bid) => bid.round), [1, 1, 1]);
});

test('live updates replace only the matching team, prompt and pass', () => {
  const history = [
    { teamId: 1, promptId: 12, round: 1, bidMinutes: 60 },
    { teamId: 1, promptId: 44, round: 1, bidMinutes: 70 },
    { teamId: 1, promptId: 44, round: 2, bidMinutes: 80 }
  ];
  const grouped = groupRoundBids(history, [{ teamId: 1, promptId: 44, round: 2, bidMinutes: 50 }]);
  assert.equal(grouped[1].length, 2);
  assert.equal(grouped[1].find((bid) => bid.promptId === 44).bidMinutes, 70);
  assert.equal(grouped[2][0].bidMinutes, 50);
  assert.equal(grouped[2].length, 1);
});

test('captured pass definitions remain authoritative after metadata is reordered', () => {
  const captured = [{ roundNumber: 1, promptIds: [44, 12] }, { roundNumber: 2, promptIds: [44, 12] }];
  assert.deepEqual(promptRounds(prompts, captured), captured);
});

test('round 1 and round 2 have their distinct multiplier curves (k=1.0 vs k=0.7)', () => {
  const round1 = calculateMultiplier(45, 1, 120, 30);
  const round2 = calculateMultiplier(45, 2, 120, 30);
  assert.equal(round1, 1.868);
  assert.equal(round2, 1.549);
  assert.equal(calculateMultiplier(120, 1, 120, 30), 1.0);
  assert.equal(calculateMultiplier(120, 2, 120, 30), 1.0);
  assert.equal(calculateMultiplier(30, 1, 120, 30), 2.117);
  assert.equal(calculateMultiplier(30, 2, 120, 30), 1.69);
});


test('Round 2 is restored from the current or persisted round even with missing definitions', () => {
  assert.deepEqual(promptRounds(prompts, [], 2).map((round) => round.roundNumber), [1, 2]);
  assert.deepEqual(promptRounds([], [], 2).map((round) => round.roundNumber), [1, 2]);
  const captured = [{ roundNumber: 1, promptIds: [44, 12] }];
  assert.deepEqual(promptRounds(prompts, captured, 2), [
    { roundNumber: 1, promptIds: [44, 12] }, { roundNumber: 2, promptIds: [44, 12] }
  ]);
});

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

test('round numbers follow prompt display order, independent of IDs or gaps in display order', () => {
  assert.deepEqual(promptRounds(prompts), [
    { roundNumber: 1, promptId: 12 }, { roundNumber: 2, promptId: 44 }, { roundNumber: 3, promptId: 90 }
  ]);
});

test('legacy bids stored under round 1 appear only in their own prompt round', () => {
  const history = [12, 44, 90].map((promptId, index) => ({ id: index + 1, teamId: 1, promptId, round: 1, bidMinutes: 45 + index }));
  const grouped = groupRoundBids(history, [], promptRounds(prompts));
  assert.deepEqual(Object.keys(grouped), ['1', '2', '3']);
  assert.deepEqual(grouped[2].map((bid) => [bid.promptId, bid.round]), [[44, 2]]);
  assert.equal(grouped[1].length, 1);
  assert.equal(grouped[3].length, 1);
  assert.deepEqual(history.map((bid) => bid.round), [1, 1, 1]);
});

test('live bid updates replace one team entry without overwriting that team’s earlier-round bid', () => {
  const history = [
    { teamId: 1, promptId: 12, round: 1, bidMinutes: 60 },
    { teamId: 1, promptId: 44, round: 2, bidMinutes: 70 }
  ];
  const grouped = groupRoundBids(history, [{ teamId: 1, promptId: 44, round: 2, bidMinutes: 50 }], promptRounds(prompts));
  assert.equal(grouped[1][0].bidMinutes, 60);
  assert.equal(grouped[2][0].bidMinutes, 50);
  assert.equal(grouped[2].length, 1);
});

test('captured server ordering remains authoritative after prompt metadata is reordered', () => {
  const captured = [{ roundNumber: 1, promptId: 44 }, { roundNumber: 2, promptId: 12 }];
  const rounds = promptRounds(prompts, captured);
  assert.deepEqual(rounds, captured);
  const grouped = groupRoundBids([{ teamId: 1, promptId: 12, round: 1, bidMinutes: 45 }], [], rounds);
  assert.equal(grouped[2][0].promptId, 12);
});

test('the latest persisted revision is chosen when older bidding passes contain duplicate team/prompt records', () => {
  const history = [
    { id: 2, teamId: 1, promptId: 12, round: 2, bidMinutes: 40, submittedAt: '2026-10-30T10:01:00Z' },
    { id: 1, teamId: 1, promptId: 12, round: 1, bidMinutes: 60, submittedAt: '2026-10-30T10:00:00Z' }
  ];
  assert.equal(groupRoundBids(history, [], promptRounds(prompts))[1][0].bidMinutes, 40);
});

test('all prompt rounds use the same multiplier curve', () => {
  const expected = calculateMultiplier(45, 1, 120, 30);
  for (let round = 1; round <= 10; round++) assert.equal(calculateMultiplier(45, round, 120, 30), expected);
  assert.equal(expected, 1.868);
});

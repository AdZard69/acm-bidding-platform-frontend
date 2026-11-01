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

test('bids placed in round 1 and round 2 are grouped by round while isolating prompts', () => {
  const history = [
    { id: 1, teamId: 1, promptId: 12, round: 1, bidMinutes: 45 },
    { id: 2, teamId: 2, promptId: 44, round: 1, bidMinutes: 55 },
    { id: 3, teamId: 1, promptId: 90, round: 2, bidMinutes: 65 }
  ];
  const grouped = groupRoundBids(history, []);
  assert.deepEqual(Object.keys(grouped), ['1', '2']);
  assert.equal(grouped[1].length, 2);
  assert.equal(grouped[2].length, 1);
  assert.equal(grouped[2][0].bidMinutes, 65);
});

test('live bid updates replace one team entry without overwriting that team’s earlier prompt bid in the round', () => {
  const history = [
    { teamId: 1, promptId: 12, round: 1, bidMinutes: 60 },
    { teamId: 1, promptId: 44, round: 1, bidMinutes: 70 }
  ];
  const grouped = groupRoundBids(history, [{ teamId: 1, promptId: 44, round: 1, bidMinutes: 50 }]);
  assert.equal(grouped[1][0].bidMinutes, 50);
  assert.equal(grouped[1][1].bidMinutes, 60);
  assert.equal(grouped[1].length, 2);
});

test('the latest persisted revision is chosen when older bidding passes contain duplicate team/prompt records', () => {
  const history = [
    { id: 2, teamId: 1, promptId: 12, round: 1, bidMinutes: 40, submittedAt: '2026-10-30T10:01:00Z' },
    { id: 1, teamId: 1, promptId: 12, round: 1, bidMinutes: 60, submittedAt: '2026-10-30T10:00:00Z' }
  ];
  assert.equal(groupRoundBids(history, [])[1][0].bidMinutes, 40);
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

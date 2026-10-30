import { Bid, Prompt, RoundDefinition } from '../types';

export const promptRounds = (prompts: Prompt[], captured: RoundDefinition[] = []): RoundDefinition[] =>
  captured.length ? captured : [...prompts]
    .sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id)
    .map((prompt, index) => ({ roundNumber: index + 1, promptId: prompt.id }));

/** Project legacy pass-based history by prompt, and merge current bids without
 * putting one team's bids for different prompts into the same round. */
export const groupRoundBids = (history: Bid[], live: Bid[], rounds: RoundDefinition[]): Record<number, Bid[]> => {
  const numbers = new Map(rounds.map((round) => [round.promptId, round.roundNumber]));
  const latest = new Map<string, Bid>();
  for (const bid of [...history].sort((a, b) =>
    (Date.parse(a.submittedAt || '') || 0) - (Date.parse(b.submittedAt || '') || 0) || (a.id || 0) - (b.id || 0))) {
    latest.set(`${bid.promptId}:${bid.teamId}`, bid);
  }
  for (const bid of live) latest.set(`${bid.promptId}:${bid.teamId}`, bid);
  const grouped: Record<number, Bid[]> = {};
  for (const bid of latest.values()) {
    const round = numbers.get(bid.promptId) ?? bid.round;
    (grouped[round] ||= []).push({ ...bid, round });
  }
  Object.values(grouped).forEach((bids) => bids.sort((a, b) => a.bidMinutes - b.bidMinutes));
  return grouped;
};

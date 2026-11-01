import { Bid, Prompt, RoundDefinition } from '../types';

export const promptRounds = (prompts: Prompt[], captured: RoundDefinition[] = []): RoundDefinition[] =>
  captured.length ? captured : [...prompts]
    .sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id)
    .map((prompt, index) => ({ roundNumber: index + 1, promptId: prompt.id }));

/** Group bids by round (Round 1 or Round 2), and merge current live bids without
 * putting one team's bids for different prompts or rounds into collision. */
export const groupRoundBids = (
  history: Bid[],
  live: Bid[] = [],
  _rounds?: RoundDefinition[]
): Record<number, Bid[]> => {
  const latest = new Map<string, Bid>();
  for (const bid of [...history].sort((a, b) =>
    (Date.parse(a.submittedAt || '') || 0) - (Date.parse(b.submittedAt || '') || 0) || (a.id || 0) - (b.id || 0))) {
    const round = bid.round || 1;
    latest.set(`${round}:${bid.promptId}:${bid.teamId}`, { ...bid, round });
  }
  for (const bid of live) {
    const round = bid.round || 1;
    latest.set(`${round}:${bid.promptId}:${bid.teamId}`, { ...bid, round });
  }
  const grouped: Record<number, Bid[]> = {};
  for (const bid of latest.values()) {
    const round = bid.round || 1;
    (grouped[round] ||= []).push(bid);
  }
  Object.values(grouped).forEach((bids) => bids.sort((a, b) => a.bidMinutes - b.bidMinutes));
  return grouped;
};

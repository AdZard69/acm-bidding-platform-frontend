import { Bid, Prompt, RoundDefinition } from '../types';

export const promptRounds = (prompts: Prompt[], captured: RoundDefinition[] = [], highestRound = 0): RoundDefinition[] => {
  const promptIds = captured[0]?.promptIds || [...prompts]
    .sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id).map((prompt) => prompt.id);
  const count = Math.max(promptIds.length ? 1 : 0, highestRound, ...captured.map((round) => round.roundNumber));
  return Array.from({ length: count }, (_, index) =>
    captured.find((round) => round.roundNumber === index + 1) || { roundNumber: index + 1, promptIds });
};

/** Keep each team's bid for each prompt and pass; live revisions replace only
 * the matching bid, leaving earlier passes available for review. */
export const groupRoundBids = (history: Bid[], live: Bid[], _rounds: RoundDefinition[] = []): Record<number, Bid[]> => {
  const latest = new Map<string, Bid>();
  for (const bid of [...history].sort((a, b) =>
    (Date.parse(a.submittedAt || '') || 0) - (Date.parse(b.submittedAt || '') || 0) || (a.id || 0) - (b.id || 0))) {
    latest.set(`${bid.round}:${bid.promptId}:${bid.teamId}`, bid);
  }
  for (const bid of live) latest.set(`${bid.round}:${bid.promptId}:${bid.teamId}`, bid);
  const grouped: Record<number, Bid[]> = {};
  for (const bid of latest.values()) (grouped[bid.round] ||= []).push(bid);
  Object.values(grouped).forEach((bids) => bids.sort((a, b) => a.promptId - b.promptId || a.bidMinutes - b.bidMinutes));
  return grouped;
};

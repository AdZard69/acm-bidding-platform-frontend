/**
 * Multiplier calculation matching the backend formula:
 * multiplier = e ^ (k * (1 - bid / base_time))
 *
 * Round 1: k = 1.0  (range ~1.000 to ~2.117 for base=120, min=30)
 * Round 2: k = 0.7  (range ~1.000 to ~1.690 for base=120, min=30)
 */

export const K_FACTORS: Record<number, number> = {
  1: 1.0,
  2: 0.7
};

export function getKFactor(round = 1): number {
  return K_FACTORS[round] ?? 1.0;
}

export function calculateMultiplier(
  bidMinutes: number,
  round = 1,
  baseTime = 120,
  minBid = 30
): number {
  if (isNaN(bidMinutes)) return 1.0;
  const clampedBid = Math.max(minBid, Math.min(baseTime, bidMinutes));
  const k = getKFactor(round);
  const exponent = k * (1 - clampedBid / baseTime);
  const rawMultiplier = Math.exp(exponent);
  return Math.round(rawMultiplier * 1000) / 1000;
}

export function calculateFinalScore(judgeScore: number, multiplier: number): number {
  if (isNaN(judgeScore) || isNaN(multiplier)) return 0;
  const raw = judgeScore * multiplier;
  return Math.round(raw * 1000) / 1000;
}

export function calculateBoostPercentage(multiplier: number): number {
  return Math.round((multiplier - 1.0) * 1000) / 10;
}

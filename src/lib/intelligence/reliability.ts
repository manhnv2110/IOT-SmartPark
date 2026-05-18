import type { Snapshot } from "./forecast";

/**
 * Reliability ∈ [0,1] — penalises wild jumps and rewards stable, dense history.
 * - stability: % of consecutive snapshot pairs with |Δrate| ≤ 0.4
 * - density: more samples = closer to 1
 */
export function lotReliability(history: Snapshot[]): {
  reliability: number;
  stability: number;
  density: number;
  sampleCount: number;
} {
  const n = history.length;
  if (n < 2)
    return { reliability: 0.5, stability: 0.5, density: 0, sampleCount: n };
  let stable = 0;
  for (let i = 1; i < n; i++) {
    if (Math.abs(history[i].occupancy_rate - history[i - 1].occupancy_rate) <= 0.4)
      stable++;
  }
  const stability = stable / (n - 1);
  const density = Math.min(1, n / 200); // 200+ samples → max density
  const reliability = 0.7 * stability + 0.3 * density;
  return { reliability, stability, density, sampleCount: n };
}

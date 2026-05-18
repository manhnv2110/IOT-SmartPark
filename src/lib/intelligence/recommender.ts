/**
 * Multi-criteria scoring for parking lots. Pure function — easy to
 * explain in academic context (no hidden ML).
 *
 *   score = w1·norm(1/dist) + w2·availability + w3·norm(1/price) + w4·reliability
 *
 * weights default to (0.4, 0.3, 0.15, 0.15) and are user-tunable.
 */

export interface RecommenderWeights {
  w1: number; // distance
  w2: number; // availability
  w3: number; // price
  w4: number; // reliability
  w5: number; // predicted availability at ETA
}

export const DEFAULT_WEIGHTS: RecommenderWeights = {
  w1: 0.3,
  w2: 0.2,
  w3: 0.1,
  w4: 0.15,
  w5: 0.25,
};

export interface LotCandidate {
  id: string;
  name: string;
  distanceKm: number;
  availabilityRate: number; // (total-occupied)/total, in [0,1]
  pricePerHour: number;
  reliability: number; // [0,1]
  predictedAvailabilityRate?: number; // predicted available/total at ETA, in [0,1]
}

export interface ScoredBreakdown {
  distance: number;
  availability: number;
  price: number;
  reliability: number;
  predicted: number;
}

export interface ScoredLot extends LotCandidate {
  score: number; // [0,1]
  breakdown: ScoredBreakdown; // each contribution already weighted
  raw: ScoredBreakdown; // normalized but unweighted (for explain tooltip)
}

/** Normalize positive values to [0,1] using min-max within the candidate pool. */
function normalize(values: number[]): number[] {
  if (values.length === 0) return values;
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max - min < 1e-9) return values.map(() => 1);
  return values.map((v) => (v - min) / (max - min));
}

export function normalizeWeights(w: RecommenderWeights): RecommenderWeights {
  const sum = w.w1 + w.w2 + w.w3 + w.w4 + w.w5 || 1;
  return {
    w1: w.w1 / sum,
    w2: w.w2 / sum,
    w3: w.w3 / sum,
    w4: w.w4 / sum,
    w5: w.w5 / sum,
  };
}

export function rankLots(
  lots: LotCandidate[],
  weights: RecommenderWeights = DEFAULT_WEIGHTS,
): ScoredLot[] {
  if (lots.length === 0) return [];
  const w = normalizeWeights(weights);
  // closer = better → inverse distance
  const invDist = lots.map((l) => 1 / Math.max(0.05, l.distanceKm));
  const invPrice = lots.map((l) => 1 / Math.max(1, l.pricePerHour));
  const nDist = normalize(invDist);
  const nPrice = normalize(invPrice);

  return lots
    .map((l, i) => {
      const raw: ScoredBreakdown = {
        distance: nDist[i],
        availability: Math.max(0, Math.min(1, l.availabilityRate)),
        price: nPrice[i],
        reliability: Math.max(0, Math.min(1, l.reliability)),
        predicted: Math.max(0, Math.min(1, l.predictedAvailabilityRate ?? l.availabilityRate)),
      };
      const breakdown: ScoredBreakdown = {
        distance: w.w1 * raw.distance,
        availability: w.w2 * raw.availability,
        price: w.w3 * raw.price,
        reliability: w.w4 * raw.reliability,
        predicted: w.w5 * raw.predicted,
      };
      const score =
        breakdown.distance +
        breakdown.availability +
        breakdown.price +
        breakdown.reliability +
        breakdown.predicted;
      return { ...l, score, breakdown, raw };
    })
    .sort((a, b) => b.score - a.score);
}

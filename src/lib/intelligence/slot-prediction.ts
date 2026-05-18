import { emaForecast, seasonalForecast, type Snapshot } from "./forecast";
import type { AvailabilitySnapshot } from "./simulated-history";

export interface SlotPrediction {
  predictedAvailable: number;
  predictedAvailabilityRate: number;
  predictedOccupancyRate: number;
  confidence: number;
  seasonal: number;
  trend: number;
  sampleCount: number;
  source: "history" | "fallback";
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

function toSnapshot(history: AvailabilitySnapshot[] | Snapshot[]): Snapshot[] {
  return history
    .map((h) => ({
      bucket_ts: h.bucket_ts,
      occupancy_rate: clamp01(h.occupancy_rate),
    }))
    .sort((a, b) => new Date(a.bucket_ts).getTime() - new Date(b.bucket_ts).getTime());
}

export function predictAvailableSlots(
  history: AvailabilitySnapshot[] | Snapshot[],
  totalSlots: number,
  targetTime: Date,
): SlotPrediction {
  const snapshots = toSnapshot(history);
  if (totalSlots <= 0 || snapshots.length === 0) {
    return {
      predictedAvailable: 0,
      predictedAvailabilityRate: 0,
      predictedOccupancyRate: 1,
      confidence: 0,
      seasonal: 1,
      trend: 1,
      sampleCount: snapshots.length,
      source: "fallback",
    };
  }

  const series = snapshots.map((s) => s.occupancy_rate);
  const lastTs = new Date(snapshots.at(-1)!.bucket_ts).getTime();
  const horizonMinutes = Math.max(15, Math.round((targetTime.getTime() - lastTs) / 60_000));
  const horizonSteps = Math.max(1, Math.round(horizonMinutes / 15));
  const trend = emaForecast(series, 0.35, horizonSteps).predicted;
  const seasonal = seasonalForecast(snapshots, targetTime.getDay(), targetTime.getHours());

  const hasSeason = seasonal.samples >= 2;
  const predictedOccupancyRate = hasSeason
    ? clamp01(0.65 * seasonal.predicted + 0.35 * trend)
    : trend;
  const predictedAvailabilityRate = clamp01(1 - predictedOccupancyRate);
  const predictedAvailable = Math.max(
    0,
    Math.min(totalSlots, Math.round(totalSlots * predictedAvailabilityRate)),
  );
  const confidence = clamp01(
    0.35 +
      (Math.min(snapshots.length, 200) / 200) * 0.25 +
      (hasSeason ? 0.25 : 0) +
      Math.max(0, 1 - horizonMinutes / 120) * 0.15,
  );

  return {
    predictedAvailable,
    predictedAvailabilityRate,
    predictedOccupancyRate,
    confidence,
    seasonal: seasonal.predicted,
    trend,
    sampleCount: snapshots.length,
    source: hasSeason ? "history" : "fallback",
  };
}

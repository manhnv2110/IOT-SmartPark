import type { Snapshot } from "./forecast";

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/**
 * Velocity = average change in occupancy rate per minute,
 * computed from snapshots within the last `windowMin` minutes.
 */
export function fillVelocity(
  history: Snapshot[],
  windowMin = 15,
): number {
  if (history.length < 2) return 0;
  const cutoff = Date.now() - windowMin * 60_000;
  const recent = history.filter((s) => new Date(s.bucket_ts).getTime() >= cutoff);
  if (recent.length < 2) return 0;
  const first = recent[0];
  const last = recent[recent.length - 1];
  const minutes =
    (new Date(last.bucket_ts).getTime() - new Date(first.bucket_ts).getTime()) /
    60_000;
  if (minutes <= 0) return 0;
  return (last.occupancy_rate - first.occupancy_rate) / minutes;
}

export interface EtaAvailability {
  currentRate: number;
  etaRate: number;
  deltaPerMin: number;
  etaMinutes: number;
  predictedAvailable: number;
}

export function etaAvailability(
  currentRate: number,
  velocity: number,
  etaMin: number,
  totalSlots: number,
): EtaAvailability {
  const etaRate = clamp01(currentRate + velocity * etaMin);
  return {
    currentRate,
    etaRate,
    deltaPerMin: velocity,
    etaMinutes: etaMin,
    predictedAvailable: Math.max(0, Math.round((1 - etaRate) * totalSlots)),
  };
}

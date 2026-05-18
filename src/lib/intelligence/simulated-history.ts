import { MOCK_LOTS } from "@/lib/lot-coordinates";
import type { Snapshot } from "./forecast";

export interface AvailabilitySnapshot extends Snapshot {
  lot_device_id: string;
  total_slots: number;
  available_slots: number;
}

interface LotProfile {
  base: number;
  morning: number;
  midday: number;
  evening: number;
  night: number;
  weekend: number;
}

const DEFAULT_PROFILE: LotProfile = {
  base: 0.48,
  morning: 0.18,
  midday: 0.04,
  evening: 0.16,
  night: -0.22,
  weekend: 0.04,
};

const LOT_PROFILES: Record<string, LotProfile> = {
  "mock-hoankiem": {
    base: 0.5,
    morning: 0.08,
    midday: 0.08,
    evening: 0.22,
    night: -0.12,
    weekend: 0.16,
  },
  "mock-bahung": {
    base: 0.55,
    morning: 0.22,
    midday: 0.08,
    evening: 0.1,
    night: -0.28,
    weekend: -0.04,
  },
  "mock-caugiay": {
    base: 0.58,
    morning: 0.28,
    midday: 0.1,
    evening: 0.18,
    night: -0.32,
    weekend: -0.08,
  },
  "mock-thanhxuan": {
    base: 0.46,
    morning: 0.16,
    midday: 0.04,
    evening: 0.24,
    night: -0.24,
    weekend: 0.02,
  },
  "mock-haibatrung": {
    base: 0.5,
    morning: 0.16,
    midday: 0.06,
    evening: 0.18,
    night: -0.2,
    weekend: 0.06,
  },
  "mock-tayho": {
    base: 0.42,
    morning: 0.04,
    midday: 0.06,
    evening: 0.24,
    night: -0.08,
    weekend: 0.18,
  },
  "mock-longbien": {
    base: 0.44,
    morning: 0.12,
    midday: 0.03,
    evening: 0.13,
    night: -0.22,
    weekend: 0.02,
  },
};

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

function seededNoise(lotId: string, bucket: number): number {
  let h = 2166136261;
  const key = `${lotId}:${bucket}`;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000 - 0.5;
}

function gaussianHour(hour: number, center: number, width: number): number {
  const diff = Math.min(Math.abs(hour - center), 24 - Math.abs(hour - center));
  return Math.exp(-(diff * diff) / (2 * width * width));
}

export function simulatedOccupancyRate(lotId: string, date: Date): number {
  const profile = LOT_PROFILES[lotId] ?? DEFAULT_PROFILE;
  const hour = date.getHours() + date.getMinutes() / 60;
  const dow = date.getDay();
  const isWeekend = dow === 0 || dow === 6;
  const bucket = Math.floor(date.getTime() / (15 * 60_000));

  const commute =
    profile.morning * gaussianHour(hour, 8.25, 1.4) + profile.evening * gaussianHour(hour, 18, 1.8);
  const midday = profile.midday * gaussianHour(hour, 12.25, 1.6);
  const night = profile.night * Math.max(gaussianHour(hour, 2, 3.2), gaussianHour(hour, 23, 2));
  const weekend = isWeekend ? profile.weekend : 0;
  const weeklyCycle = 0.04 * Math.sin(((dow + hour / 24) / 7) * Math.PI * 2);
  const noise = seededNoise(lotId, bucket) * 0.08;

  return clamp01(profile.base + commute + midday + night + weekend + weeklyCycle + noise);
}

export function buildSimulatedAvailabilityHistory(
  lotDeviceId: string,
  totalSlots: number,
  opts: { days?: number; intervalMinutes?: number; now?: Date } = {},
): AvailabilitySnapshot[] {
  const days = opts.days ?? 30;
  const intervalMinutes = opts.intervalMinutes ?? 15;
  const now = opts.now ?? new Date();
  const end = Math.floor(now.getTime() / (intervalMinutes * 60_000)) * intervalMinutes * 60_000;
  const start = end - days * 24 * 60 * 60_000;
  const out: AvailabilitySnapshot[] = [];

  for (let t = start; t <= end; t += intervalMinutes * 60_000) {
    const d = new Date(t);
    const occupancyRate = simulatedOccupancyRate(lotDeviceId, d);
    const occupied = Math.round(totalSlots * occupancyRate);
    const available = Math.max(0, Math.min(totalSlots, totalSlots - occupied));
    out.push({
      lot_device_id: lotDeviceId,
      bucket_ts: d.toISOString(),
      occupancy_rate: totalSlots > 0 ? (totalSlots - available) / totalSlots : 0,
      total_slots: totalSlots,
      available_slots: available,
    });
  }

  return out;
}

export function getMockLotTotal(lotDeviceId: string): number | null {
  return MOCK_LOTS.find((l) => l.id === lotDeviceId)?.total ?? null;
}

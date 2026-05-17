import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fetchDevices } from "./parking.functions";
import { computeStats, getDeviceId } from "./parking.types";
import { lookupCoord, MOCK_LOTS } from "./lot-coordinates";
import { haversineKm, etaMinutes } from "./intelligence/distance";
import { rankLots, DEFAULT_WEIGHTS, type LotCandidate } from "./intelligence/recommender";
import {
  hybridForecast,
  sparkline,
  buildHeatmap,
  type Snapshot,
} from "./intelligence/forecast";
import { fillVelocity, etaAvailability } from "./intelligence/eta-availability";
import { dynamicPrice } from "./intelligence/pricing";
import { lotReliability } from "./intelligence/reliability";
import { computeFraud } from "./intelligence/fraud";

const PRICE_PER_HOUR = { car: 15000, motorbike: 5000 } as const;

function publicClient() {
  return createClient(
    process.env.SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY ??
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function loadHistory(
  lotDeviceId: string,
  hours = 7 * 24,
): Promise<Snapshot[]> {
  const sb = publicClient();
  const since = new Date(Date.now() - hours * 3600_000).toISOString();
  const { data, error } = await sb
    .from("occupancy_snapshots")
    .select("bucket_ts, occupancy_rate")
    .eq("lot_device_id", lotDeviceId)
    .gte("bucket_ts", since)
    .order("bucket_ts", { ascending: true })
    .limit(2500);
  if (error || !data) return [];
  return data.map((d) => ({
    bucket_ts: d.bucket_ts as string,
    occupancy_rate: Number(d.occupancy_rate),
  }));
}

/** Build candidate list from live devices + mock lots, keyed by id. */
async function loadCandidates(): Promise<
  Array<{
    id: string;
    name: string;
    lat: number | null;
    lng: number | null;
    total: number;
    available: number;
    occRate: number;
    isOnline: boolean;
    vehicleType: "car" | "motorbike";
  }>
> {
  const { devices } = await fetchDevices();
  const out: ReturnType<typeof loadCandidates> extends Promise<infer T> ? T : never =
    [];
  for (const d of devices) {
    const stats = computeStats(d);
    const coord = lookupCoord(d.name);
    out.push({
      id: getDeviceId(d),
      name: d.name,
      lat: coord?.lat ?? null,
      lng: coord?.lng ?? null,
      total: stats.total,
      available: stats.available,
      occRate: stats.occupancyRate,
      isOnline: d.is_online,
      vehicleType: "car",
    });
  }
  for (const m of MOCK_LOTS) {
    out.push({
      id: m.id,
      name: m.name,
      lat: m.lat,
      lng: m.lng,
      total: m.total,
      available: m.available,
      occRate: m.total > 0 ? (m.total - m.available) / m.total : 0,
      isOnline: m.isOnline,
      vehicleType: "car",
    });
  }
  return out;
}

// ---------------- getRecommendations ----------------
const RecInput = z.object({
  userLat: z.number(),
  userLng: z.number(),
  vehicleType: z.enum(["car", "motorbike"]).default("car"),
  weights: z
    .object({
      w1: z.number().min(0).max(1),
      w2: z.number().min(0).max(1),
      w3: z.number().min(0).max(1),
      w4: z.number().min(0).max(1),
    })
    .optional(),
  topN: z.number().int().min(1).max(20).default(5),
});

export const getRecommendations = createServerFn({ method: "POST" })
  .inputValidator((i) => RecInput.parse(i))
  .handler(async ({ data }) => {
    const cands = await loadCandidates();
    const withCoord = cands.filter(
      (c) => c.lat !== null && c.lng !== null && c.total > 0,
    );

    // load history for reliability — batched per lot
    const histories = await Promise.all(
      withCoord.map((c) => loadHistory(c.id, 7 * 24)),
    );

    const candidates: LotCandidate[] = withCoord.map((c, i) => ({
      id: c.id,
      name: c.name,
      distanceKm: haversineKm(data.userLat, data.userLng, c.lat!, c.lng!),
      availabilityRate: c.total > 0 ? c.available / c.total : 0,
      pricePerHour: PRICE_PER_HOUR[data.vehicleType],
      reliability: lotReliability(histories[i]).reliability,
    }));

    const ranked = rankLots(candidates, data.weights ?? DEFAULT_WEIGHTS).slice(
      0,
      data.topN,
    );

    return {
      recommendations: ranked.map((r) => {
        const cand = withCoord.find((c) => c.id === r.id)!;
        return {
          ...r,
          etaMin: etaMinutes(r.distanceKm),
          total: cand.total,
          available: cand.available,
          occRate: cand.occRate,
          isOnline: cand.isOnline,
          lat: cand.lat,
          lng: cand.lng,
        };
      }),
      weights: data.weights ?? DEFAULT_WEIGHTS,
    };
  });

// ---------------- getLotForecast ----------------
export const getLotForecast = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ lotDeviceId: z.string() }).parse(i))
  .handler(async ({ data }) => {
    const history = await loadHistory(data.lotDeviceId, 7 * 24);
    const spark = sparkline(history, 24);
    const next30 = hybridForecast(history, 30);
    const next60 = hybridForecast(history, 60);
    return {
      sparkline: spark,
      next30,
      next60,
      currentRate: history.at(-1)?.occupancy_rate ?? 0,
      sampleCount: history.length,
    };
  });

// ---------------- getLotHeatmap ----------------
export const getLotHeatmap = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ lotDeviceId: z.string() }).parse(i))
  .handler(async ({ data }) => {
    const history = await loadHistory(data.lotDeviceId, 30 * 24);
    return { heatmap: buildHeatmap(history), sampleCount: history.length };
  });

// ---------------- getEtaAvailability ----------------
export const getEtaAvailability = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z
      .object({
        lotDeviceId: z.string(),
        etaMin: z.number().int().min(0).max(120),
        totalSlots: z.number().int().min(1),
        currentOccRate: z.number().min(0).max(1),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const history = await loadHistory(data.lotDeviceId, 4);
    const velocity = fillVelocity(history, 15);
    return etaAvailability(
      data.currentOccRate,
      velocity,
      data.etaMin,
      data.totalSlots,
    );
  });

// ---------------- getDynamicPrice ----------------
export const getDynamicPrice = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z
      .object({
        lotDeviceId: z.string(),
        basePrice: z.number().int().min(1000),
        currentOccRate: z.number().min(0).max(1).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const history = await loadHistory(data.lotDeviceId, 7 * 24);
    const occ =
      data.currentOccRate ?? history.at(-1)?.occupancy_rate ?? 0.5;
    const { predicted } = hybridForecast(history, 30);
    return { ...dynamicPrice(data.basePrice, occ, predicted), currentRate: occ };
  });

// ---------------- getMyFraudProfile ----------------
export const getMyFraudProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ count: totalBookings }, { count: noShows }, { count: last7 }] =
      await Promise.all([
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
        supabase
          .from("no_show_events")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
        supabase
          .from("no_show_events")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte(
            "happened_at",
            new Date(Date.now() - 7 * 24 * 3600_000).toISOString(),
          ),
      ]);

    return computeFraud({
      noShows: noShows ?? 0,
      noShowsLast7d: last7 ?? 0,
      totalBookings: totalBookings ?? 0,
    });
  });

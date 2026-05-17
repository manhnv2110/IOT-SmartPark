// OSRM public router helpers — turn-by-turn, ETA, deep links.
// API: https://project-osrm.org/docs/v5.24.0/api/
import type { GeoPos } from "@/hooks/useGeolocation";

export type RouteProfile = "driving" | "cycling" | "foot";

export interface RouteStep {
  /** Vietnamese instruction. */
  text: string;
  distance: number; // meters
  duration: number; // seconds
  /** [lat, lng] of the maneuver point. */
  location: [number, number];
  type: string;
  modifier?: string;
}

export interface RouteResult {
  coords: Array<[number, number]>; // [lat, lng]
  distanceKm: number;
  durationMin: number;
  steps: RouteStep[];
}

const MANEUVER_VI: Record<string, string> = {
  turn: "Rẽ",
  "new name": "Tiếp tục trên",
  depart: "Xuất phát",
  arrive: "Đã đến nơi",
  merge: "Nhập làn",
  "on ramp": "Vào đường nhánh",
  "off ramp": "Ra đường nhánh",
  fork: "Tại ngã rẽ",
  "end of road": "Đến cuối đường",
  continue: "Đi tiếp",
  roundabout: "Vào vòng xuyến",
  rotary: "Vào bùng binh",
  "roundabout turn": "Tại vòng xuyến rẽ",
  notification: "",
  "exit roundabout": "Ra khỏi vòng xuyến",
  "exit rotary": "Ra khỏi bùng binh",
};

const MODIFIER_VI: Record<string, string> = {
  left: "trái",
  right: "phải",
  "slight left": "chếch trái",
  "slight right": "chếch phải",
  "sharp left": "gắt trái",
  "sharp right": "gắt phải",
  straight: "thẳng",
  uturn: "quay đầu",
};

function describeStep(step: any): string {
  const type: string = step.maneuver?.type ?? "continue";
  const modifier: string | undefined = step.maneuver?.modifier;
  const road: string = step.name || "đường không tên";
  const action = MANEUVER_VI[type] ?? "Đi tiếp";
  const mod = modifier ? ` ${MODIFIER_VI[modifier] ?? modifier}` : "";
  if (type === "depart") return `Xuất phát theo ${road}`;
  if (type === "arrive") return `Đã đến điểm đích`;
  if (type === "roundabout" || type === "rotary") {
    const exit = step.maneuver?.exit;
    return `${action}${exit ? `, ra lối thứ ${exit}` : ""} vào ${road}`;
  }
  if (type === "turn" || type === "end of road" || type === "fork") {
    return `${action}${mod} vào ${road}`;
  }
  return `${action} trên ${road}`;
}

export async function fetchRoute(
  from: GeoPos,
  to: { lat: number; lng: number },
  profile: RouteProfile = "driving",
  signal?: AbortSignal
): Promise<RouteResult | null> {
  const url = `https://router.project-osrm.org/route/v1/${profile}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true`;
  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  const json = await res.json();
  const r = json.routes?.[0];
  if (!r) return null;
  const coords: Array<[number, number]> = r.geometry.coordinates.map(
    (c: [number, number]) => [c[1], c[0]]
  );
  const steps: RouteStep[] = [];
  for (const leg of r.legs ?? []) {
    for (const s of leg.steps ?? []) {
      const loc = s.maneuver?.location ?? [0, 0];
      steps.push({
        text: describeStep(s),
        distance: s.distance ?? 0,
        duration: s.duration ?? 0,
        location: [loc[1], loc[0]],
        type: s.maneuver?.type ?? "continue",
        modifier: s.maneuver?.modifier,
      });
    }
  }
  return {
    coords,
    distanceKm: r.distance / 1000,
    durationMin: r.duration / 60,
    steps,
  };
}

export function googleMapsLink(
  to: { lat: number; lng: number },
  profile: RouteProfile = "driving"
): string {
  const mode =
    profile === "driving" ? "driving" : profile === "cycling" ? "bicycling" : "walking";
  return `https://www.google.com/maps/dir/?api=1&destination=${to.lat},${to.lng}&travelmode=${mode}`;
}

export function appleMapsLink(to: { lat: number; lng: number }): string {
  return `https://maps.apple.com/?daddr=${to.lat},${to.lng}`;
}

/** Distance from point P to segment AB in meters (approx for short segments). */
function distancePointToSegmentM(
  p: [number, number],
  a: [number, number],
  b: [number, number]
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const lat0 = toRad((a[0] + b[0]) / 2);
  const xA = toRad(a[1]) * Math.cos(lat0) * R;
  const yA = toRad(a[0]) * R;
  const xB = toRad(b[1]) * Math.cos(lat0) * R;
  const yB = toRad(b[0]) * R;
  const xP = toRad(p[1]) * Math.cos(lat0) * R;
  const yP = toRad(p[0]) * R;
  const dx = xB - xA;
  const dy = yB - yA;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(xP - xA, yP - yA);
  let t = ((xP - xA) * dx + (yP - yA) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = xA + t * dx;
  const cy = yA + t * dy;
  return Math.hypot(xP - cx, yP - cy);
}

/** Min distance (meters) from point to a polyline. */
export function offRouteMeters(
  pos: GeoPos,
  coords: Array<[number, number]>
): number {
  if (coords.length < 2) return Infinity;
  const p: [number, number] = [pos.lat, pos.lng];
  let min = Infinity;
  for (let i = 0; i < coords.length - 1; i++) {
    const d = distancePointToSegmentM(p, coords[i], coords[i + 1]);
    if (d < min) min = d;
  }
  return min;
}

/** Find the index of the step whose maneuver point is closest to pos. */
export function findNearestStep(
  pos: GeoPos,
  steps: RouteStep[]
): number {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < steps.length; i++) {
    const dx = (steps[i].location[0] - pos.lat) * 111_000;
    const dy =
      (steps[i].location[1] - pos.lng) *
      111_000 *
      Math.cos((pos.lat * Math.PI) / 180);
    const d = Math.hypot(dx, dy);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

export function formatEta(durationMin: number): string {
  const eta = new Date(Date.now() + durationMin * 60_000);
  return eta.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

const HIST_KEY = "parking-route-history";

export interface RouteHistoryItem {
  id: string;
  name: string;
  lat: number;
  lng: number;
  ts: number;
}

export function loadRouteHistory(): RouteHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function pushRouteHistory(item: Omit<RouteHistoryItem, "ts">) {
  if (typeof window === "undefined") return;
  const list = loadRouteHistory().filter((x) => x.id !== item.id);
  list.unshift({ ...item, ts: Date.now() });
  try {
    localStorage.setItem(HIST_KEY, JSON.stringify(list.slice(0, 5)));
  } catch {
    // ignore
  }
}

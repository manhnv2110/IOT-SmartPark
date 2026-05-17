import { Link } from "@tanstack/react-router";
import { Navigation, MapPin, ArrowRight } from "lucide-react";
import { useMemo } from "react";
import type { Device } from "@/lib/parking.types";
import { computeStats, getDeviceId } from "@/lib/parking.types";
import { lookupCoord, MOCK_LOTS } from "@/lib/lot-coordinates";
import { useGeolocation, haversineKm } from "@/hooks/useGeolocation";

interface NearLot {
  id: string;
  name: string;
  description: string;
  available: number;
  total: number;
  distanceKm: number;
  isReal: boolean;
}

/** Floating card highlighting the nearest available parking lot. */
export function NearestLotCard({
  devices,
  includeMock = true,
}: {
  devices: Device[];
  includeMock?: boolean;
}) {
  const { pos } = useGeolocation();

  const nearest: NearLot | null = useMemo(() => {
    if (!pos) return null;
    const items: NearLot[] = [];
    for (const d of devices) {
      const c = lookupCoord(d.name);
      if (!c) continue;
      const s = computeStats(d);
      if (s.available <= 0 || !d.is_online) continue;
      items.push({
        id: getDeviceId(d),
        name: d.name,
        description: d.description ?? "",
        available: s.available,
        total: s.total,
        distanceKm: haversineKm(pos, c),
        isReal: true,
      });
    }
    if (includeMock) {
      for (const m of MOCK_LOTS) {
        if (m.available <= 0 || !m.isOnline) continue;
        items.push({
          id: m.id,
          name: m.name,
          description: m.description,
          available: m.available,
          total: m.total,
          distanceKm: haversineKm(pos, { lat: m.lat, lng: m.lng }),
          isReal: false,
        });
      }
    }
    items.sort((a, b) => a.distanceKm - b.distanceKm);
    return items[0] ?? null;
  }, [pos, devices, includeMock]);

  if (!nearest) return null;

  return (
    <div className="rounded-2xl glass-strong p-4 flex items-center gap-4">
      <div className="size-12 rounded-xl bg-[var(--available)]/15 grid place-items-center text-[var(--available)] shrink-0">
        <MapPin className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Bãi gần bạn nhất
        </div>
        <div className="font-semibold truncate">{nearest.name}</div>
        <div className="text-xs text-muted-foreground">
          {nearest.distanceKm.toFixed(1)} km •{" "}
          <span className="text-[var(--available)] font-medium">
            {nearest.available}/{nearest.total} chỗ trống
          </span>
        </div>
      </div>
      <Link
        to="/map"
        search={{ route: nearest.id } as never}
        className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
      >
        <Navigation className="size-3.5" /> Đi ngay
      </Link>
      <Link
        to="/map"
        search={{ route: nearest.id } as never}
        className="sm:hidden size-10 grid place-items-center rounded-lg bg-primary text-primary-foreground"
        aria-label="Đi ngay"
      >
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}

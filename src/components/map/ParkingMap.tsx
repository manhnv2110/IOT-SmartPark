import { memo, useCallback, useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
  CircleMarker,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "@tanstack/react-router";
import type { Device } from "@/lib/parking.types";
import { computeStats, getDeviceId } from "@/lib/parking.types";
import { lookupCoord, MOCK_LOTS, type MockLot } from "@/lib/lot-coordinates";
import { useGeolocation, haversineKm, type GeoPos } from "@/hooks/useGeolocation";
import { Crosshair, Navigation } from "lucide-react";
import { MapLegend } from "./MapLegend";
import type { ActiveRoute, RouteTarget } from "@/hooks/useRouting";

interface MapLot {
  id: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
  total: number;
  available: number;
  isOnline: boolean;
  isReal: boolean;
}

function pinColor(lot: { isOnline: boolean; available: number; total: number }): string {
  if (!lot.isOnline) return "#94a3b8";
  if (lot.available === 0) return "#ef4444";
  if (lot.available / Math.max(1, lot.total) < 0.2) return "#f5a524";
  return "#22d3ee";
}

const iconCache = new Map<string, L.DivIcon>();
function makeIcon(lot: MapLot): L.DivIcon {
  const color = pinColor(lot);
  const key = `${color}|${lot.available}`;
  const cached = iconCache.get(key);
  if (cached) return cached;
  const icon = L.divIcon({
    className: "",
    iconSize: [44, 50],
    iconAnchor: [22, 48],
    html: `
      <div style="position:relative;width:44px;height:50px;filter:drop-shadow(0 6px 8px rgba(15,23,42,0.25));">
        <svg width="44" height="50" viewBox="0 0 44 50" fill="none">
          <path d="M22 48 C 8 32, 4 22, 4 14 a 18 18 0 1 1 36 0 c 0 8 -4 18 -18 34 z"
            fill="${color}" stroke="white" stroke-width="2.5" />
          <circle cx="22" cy="14" r="11" fill="white" opacity="0.95"/>
        </svg>
        <div style="position:absolute;top:5px;left:0;right:0;text-align:center;color:${color};font-weight:800;font-family:ui-monospace,SF Mono,monospace;font-size:13px;line-height:22px;letter-spacing:-0.02em;">
          ${lot.available}
        </div>
      </div>
    `,
  });
  iconCache.set(key, icon);
  return icon;
}

const userIconSingleton = L.divIcon({
  className: "",
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  html: `<div style="width:22px;height:22px;border-radius:9999px;background:oklch(0.62 0.2 250);border:3px solid white;box-shadow:0 0 0 4px color-mix(in oklab, oklch(0.62 0.2 250) 30%, transparent), 0 4px 12px rgba(0,0,0,0.18);"></div>`,
});

function destIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    html: `<div style="width:28px;height:28px;border-radius:9999px;background:#10b981;border:3px solid white;box-shadow:0 0 16px rgba(16,185,129,0.6);display:grid;place-items:center;color:white;font-weight:700;font-size:12px;">P</div>`,
  });
}

function FlyTo({ pos }: { pos: GeoPos | null }) {
  const map = useMap();
  useEffect(() => {
    if (pos) map.flyTo([pos.lat, pos.lng], 14, { duration: 0.8 });
    // run only on first non-null pos
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!pos]);
  return null;
}

function FocusTo({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, 16, { duration: 0.8 });
  }, [target, map]);
  return null;
}

function FitRoute({ coords }: { coords: Array<[number, number]> | null }) {
  const map = useMap();
  useEffect(() => {
    if (!coords || coords.length < 2) return;
    map.fitBounds(L.latLngBounds(coords as L.LatLngTuple[]), {
      padding: [50, 50],
    });
  }, [coords, map]);
  return null;
}

interface Props {
  devices: Device[];
  showMock?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Lộ trình đang active (lift lên page level). */
  route?: ActiveRoute | null;
  /** Đang loading lộ trình mới. */
  routing?: boolean;
  /** Callback "Chỉ đường" từ popup marker — page sẽ gọi `useRouting.routeTo`. */
  onRequestRoute?: (target: RouteTarget) => void;
}

const LotMarker = memo(
  function LotMarker({
    lot,
    pos,
    onSelect,
    onRoute,
  }: {
    lot: MapLot;
    pos: GeoPos | null;
    onSelect?: (id: string) => void;
    onRoute: (lot: MapLot) => void;
  }) {
    return (
      <Marker
        position={[lot.lat, lot.lng]}
        icon={makeIcon(lot)}
        eventHandlers={{ click: () => onSelect?.(lot.id) }}
      >
        <Popup>
          <div className="text-sm">
            <div className="font-semibold mb-1">
              {lot.name}{" "}
              {!lot.isReal && (
                <span className="text-[10px] text-muted-foreground">(demo)</span>
              )}
            </div>
            <div className="text-xs opacity-80 mb-2">{lot.description}</div>
            <div className="text-xs mb-2">
              Còn{" "}
              <span
                className="font-mono font-bold"
                style={{ color: pinColor(lot) }}
              >
                {lot.available}
              </span>{" "}
              / {lot.total} chỗ
              {pos && (
                <span className="ml-2 opacity-70">
                  •{" "}
                  {haversineKm(pos, { lat: lot.lat, lng: lot.lng }).toFixed(1)}{" "}
                  km
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onRoute(lot)}
                className="px-2 py-1 rounded-md text-xs bg-primary text-primary-foreground font-medium inline-flex items-center gap-1"
              >
                <Navigation className="size-3" /> Chỉ đường
              </button>
              {lot.isReal && (
                <Link
                  to="/lots/$deviceId"
                  params={{ deviceId: lot.id }}
                  className="px-2 py-1 rounded-md text-xs border border-border hover:bg-accent"
                >
                  Chi tiết
                </Link>
              )}
            </div>
          </div>
        </Popup>
      </Marker>
    );
  },
  (a, b) =>
    a.lot.id === b.lot.id &&
    a.lot.available === b.lot.available &&
    a.lot.isOnline === b.lot.isOnline &&
    a.lot.lat === b.lot.lat &&
    a.lot.lng === b.lot.lng &&
    a.pos?.lat === b.pos?.lat &&
    a.pos?.lng === b.pos?.lng,
);

export function ParkingMap({
  devices,
  showMock = true,
  selectedId,
  onSelect,
  route,
  routing,
  onRequestRoute,
}: Props) {
  const { pos, request } = useGeolocation({ watch: true });

  const lots: MapLot[] = useMemo(() => {
    const real: MapLot[] = devices
      .map((d): MapLot | null => {
        const c = lookupCoord(d.name);
        if (!c) return null;
        const s = computeStats(d);
        return {
          id: getDeviceId(d),
          name: d.name,
          description: d.description ?? "",
          lat: c.lat,
          lng: c.lng,
          total: s.total,
          available: s.available,
          isOnline: d.is_online,
          isReal: true,
        };
      })
      .filter((x): x is MapLot => x !== null);
    const mock: MapLot[] = showMock
      ? MOCK_LOTS.map((m: MockLot) => ({ ...m, isReal: false }))
      : [];
    return [...real, ...mock];
  }, [devices, showMock]);

  const center: [number, number] = pos
    ? [pos.lat, pos.lng]
    : [21.0285, 105.8542];

  const focusTarget = useMemo<[number, number] | null>(() => {
    if (!selectedId) return null;
    const found = lots.find((l) => l.id === selectedId);
    return found ? [found.lat, found.lng] : null;
  }, [selectedId, lots]);

  const handleRouteClick = useCallback(
    (lot: MapLot) => {
      if (!pos) {
        request();
        return;
      }
      onRequestRoute?.({
        id: lot.id,
        name: lot.name,
        lat: lot.lat,
        lng: lot.lng,
      });
    },
    [pos, request, onRequestRoute],
  );

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={center}
        zoom={13}
        className="h-full w-full rounded-2xl"
        zoomControl={false}
        preferCanvas
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={20}
        />

        {pos && (
          <>
            <Marker position={[pos.lat, pos.lng]} icon={userIconSingleton}>
              <Popup>Vị trí của bạn</Popup>
            </Marker>
            {pos.accuracy && (
              <CircleMarker
                center={[pos.lat, pos.lng]}
                radius={Math.min(40, Math.max(8, pos.accuracy / 30))}
                pathOptions={{
                  color: "oklch(0.62 0.2 250)",
                  fillColor: "oklch(0.62 0.2 250)",
                  fillOpacity: 0.1,
                  weight: 1,
                }}
              />
            )}
          </>
        )}

        {lots.map((lot) => (
          <LotMarker
            key={lot.id}
            lot={lot}
            pos={pos}
            onSelect={onSelect}
            onRoute={handleRouteClick}
          />
        ))}

        {route && (
          <>
            {/* white halo for legibility on light tiles */}
            <Polyline
              positions={route.coords}
              pathOptions={{ color: "#ffffff", weight: 10, opacity: 0.9 }}
            />
            <Polyline
              positions={route.coords}
              pathOptions={{
                color: "oklch(0.62 0.2 250)",
                weight: 6,
                opacity: 0.95,
              }}
            />
            <Polyline
              positions={route.coords}
              pathOptions={{
                color: "#ffffff",
                weight: 2,
                opacity: 0.85,
                dashArray: "1,14",
              }}
            />
            <Marker position={[route.lat, route.lng]} icon={destIcon()} />
            <FitRoute coords={route.coords} />
          </>
        )}

        <FlyTo pos={pos} />
        <FocusTo target={focusTarget} />
      </MapContainer>

      {/* HUD: locate + legend */}
      <div className="absolute top-3 right-3 flex flex-col gap-2 z-[400]">
        <button
          onClick={request}
          aria-label="Định vị lại vị trí của tôi"
          className="size-11 grid place-items-center rounded-xl glass hover:bg-accent text-foreground transition-colors"
          title="Định vị lại"
        >
          <Crosshair className="size-4" aria-hidden="true" />
        </button>
        <div className="hidden sm:block">
          <MapLegend />
        </div>
      </div>

      {routing && (
        <div
          role="status"
          aria-live="polite"
          className="absolute top-3 left-1/2 -translate-x-1/2 z-[400] glass rounded-full px-3 py-1.5 text-xs font-medium"
        >
          Đang tìm đường đi ngắn nhất…
        </div>
      )}
    </div>
  );
}

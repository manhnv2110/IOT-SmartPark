import { createFileRoute, ClientOnly, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useParkingDevices } from "@/hooks/useParkingDevices";
import { computeStats, getDeviceId } from "@/lib/parking.types";
import { lookupCoord, MOCK_LOTS } from "@/lib/lot-coordinates";
import { useGeolocation, haversineKm } from "@/hooks/useGeolocation";
import { useRouting, type RouteTarget } from "@/hooks/useRouting";
import { useIsMobile } from "@/hooks/use-mobile";
import { ParkingMap } from "@/components/map/ParkingMap";
import { RoutePanel } from "@/components/map/RoutePanel";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { MapPin, Navigation } from "lucide-react";

type MapSearch = { route?: string; select?: string };

export const Route = createFileRoute("/map")({
  validateSearch: (s: Record<string, unknown>): MapSearch => ({
    route: typeof s.route === "string" ? s.route : undefined,
    select: typeof s.select === "string" ? s.select : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Bản đồ bãi đỗ — SmartPark" },
      {
        name: "description",
        content: "Bản đồ bãi đỗ xe IoT realtime với chỉ đường ngắn nhất.",
      },
    ],
  }),
  component: MapPage,
});

interface SortedLot {
  id: string;
  name: string;
  description: string;
  available: number;
  total: number;
  isOnline: boolean;
  isReal: boolean;
  lat?: number;
  lng?: number;
  distance: number | null;
}

function MapPage() {
  const { data } = useParkingDevices();
  const devices = data?.devices ?? [];
  const { pos, request: requestPos } = useGeolocation();
  const search = Route.useSearch();
  const isMobile = useIsMobile();

  const [selectedId, setSelectedId] = useState<string | null>(
    search.select ?? search.route ?? null,
  );

  const routing = useRouting(pos, requestPos);
  const sorted = useSortedLots(devices, pos);

  // Auto-route khi user vào với ?route=<id>
  useEffect(() => {
    if (!search.route) return;
    setSelectedId(search.route);
    const target = sorted.find((l) => l.id === search.route);
    if (!target || target.lat == null || target.lng == null) return;
    routing.routeTo({
      id: target.id,
      name: target.name,
      lat: target.lat,
      lng: target.lng,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.route, sorted.length]);

  // Sync ?select=<id> tới selectedId
  useEffect(() => {
    if (search.select) setSelectedId(search.select);
  }, [search.select]);

  const handleRequestRoute = (target: RouteTarget) => {
    routing.routeTo(target);
  };

  // Khi đang chỉ đường: ẩn list, hiện RoutePanel ở sidebar (desktop)
  // hoặc bottom drawer (mobile).
  const showRoutePanel = !!routing.route;

  return (
    <div className="grid lg:grid-cols-[360px_1fr] gap-4 h-[calc(100vh-160px)]">
      {/* SIDEBAR (desktop only) */}
      <aside className="hidden lg:flex rounded-2xl glass overflow-hidden flex-col">
        {showRoutePanel ? (
          <RoutePanel
            routing={routing}
            variant="sidebar"
            onBackToList={() => {
              /* clearRoute đã được panel gọi */
            }}
          />
        ) : (
          <LotList
            sorted={sorted}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onRoute={handleRequestRoute}
          />
        )}
      </aside>

      {/* MAP */}
      <div className="rounded-2xl overflow-hidden relative">
        <ClientOnly
          fallback={
            <div className="h-full grid place-items-center text-muted-foreground glass rounded-2xl">
              Đang tải bản đồ...
            </div>
          }
        >
          <ParkingMap
            devices={devices}
            selectedId={selectedId}
            onSelect={setSelectedId}
            route={routing.route}
            routing={routing.loading}
            onRequestRoute={handleRequestRoute}
          />
        </ClientOnly>
      </div>

      {/* MOBILE: list ở dưới map (nếu chưa route), bottom-sheet khi route active */}
      <div className="lg:hidden">
        {!showRoutePanel && (
          <div className="rounded-2xl glass overflow-hidden">
            <LotList
              sorted={sorted}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onRoute={handleRequestRoute}
              compact
            />
          </div>
        )}
      </div>

      {/* MOBILE: bottom sheet chứa RoutePanel */}
      {isMobile && (
        <Drawer
          open={showRoutePanel}
          onOpenChange={(open) => {
            if (!open) routing.clearRoute();
          }}
        >
          <DrawerContent className="max-h-[85vh] p-0 outline-none">
            <DrawerTitle className="sr-only">Chỉ đường</DrawerTitle>
            {routing.route && (
              <RoutePanel routing={routing} variant="drawer" className="h-[80vh]" />
            )}
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}

/* ---------- helpers ---------- */

function useSortedLots(
  devices: ReturnType<typeof useParkingDevices>["data"] extends
    | { devices: infer D }
    | null
    | undefined
    ? D
    : never,
  pos: { lat: number; lng: number } | null,
): SortedLot[] {
  return useMemo(() => {
    const items: SortedLot[] = [
      ...(devices ?? []).map((d) => {
        const c = lookupCoord(d.name);
        const s = computeStats(d);
        return {
          id: getDeviceId(d),
          name: d.name,
          description: d.description ?? "",
          available: s.available,
          total: s.total,
          isOnline: d.is_online,
          isReal: true as const,
          lat: c?.lat,
          lng: c?.lng,
          distance: null,
        };
      }),
      ...MOCK_LOTS.map((m) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        available: m.available,
        total: m.total,
        isOnline: m.isOnline,
        isReal: false as const,
        lat: m.lat,
        lng: m.lng,
        distance: null,
      })),
    ];
    return items
      .map((i) => ({
        ...i,
        distance:
          pos && i.lat != null && i.lng != null
            ? haversineKm(pos, { lat: i.lat, lng: i.lng })
            : null,
      }))
      .sort((a, b) => {
        if (a.distance == null && b.distance == null) return 0;
        if (a.distance == null) return 1;
        if (b.distance == null) return -1;
        return a.distance - b.distance;
      });
  }, [devices, pos]);
}

function LotList({
  sorted,
  selectedId,
  onSelect,
  onRoute,
  compact,
}: {
  sorted: SortedLot[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRoute: (target: RouteTarget) => void;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h1 className="font-semibold tracking-tight">Bãi đỗ gần bạn</h1>
        <p className="text-xs text-muted-foreground">
          {sorted.length} bãi · Sắp xếp theo khoảng cách
        </p>
      </div>
      <div
        className={
          compact
            ? "max-h-[280px] overflow-y-auto scrollbar-thin"
            : "flex-1 overflow-y-auto scrollbar-thin"
        }
      >
        {sorted.map((lot) => (
          <div
            key={lot.id}
            className={`px-4 py-3 border-b border-border/50 hover:bg-accent/40 transition-colors ${
              selectedId === lot.id ? "bg-accent/60" : ""
            }`}
          >
            <button
              type="button"
              onClick={() => onSelect(lot.id)}
              className="w-full text-left"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate flex items-center gap-1.5">
                    {lot.name}
                    {!lot.isReal && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground">
                        demo
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                    <MapPin className="size-3" aria-hidden="true" />
                    {lot.description}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div
                    className={`font-mono font-bold text-sm ${
                      lot.available === 0
                        ? "text-[var(--occupied)]"
                        : "text-[var(--available)]"
                    }`}
                  >
                    {lot.available}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    /{lot.total}
                  </div>
                </div>
              </div>
            </button>
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
              {lot.distance != null && (
                <span>{lot.distance.toFixed(1)} km</span>
              )}
              <div className="flex items-center gap-2 ml-auto">
                {lot.lat != null && lot.lng != null && (
                  <button
                    type="button"
                    onClick={() =>
                      onRoute({
                        id: lot.id,
                        name: lot.name,
                        lat: lot.lat!,
                        lng: lot.lng!,
                      })
                    }
                    className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                  >
                    <Navigation className="size-3" aria-hidden="true" />
                    Chỉ đường
                  </button>
                )}
                {lot.isReal && (
                  <Link
                    to="/lots/$deviceId"
                    params={{ deviceId: lot.id }}
                    onClick={(e) => e.stopPropagation()}
                    className="text-primary hover:underline"
                  >
                    Chi tiết →
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

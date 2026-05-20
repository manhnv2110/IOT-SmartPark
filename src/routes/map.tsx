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
import { AiParkingAssistant } from "@/components/parking/AiParkingAssistant";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { MapPin, Navigation, Sparkles, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type MapSearch = { route?: string; select?: string };
type SidebarTab = "list" | "ai";

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
        content: "Bản đồ bãi đỗ xe IoT realtime với chỉ đường ngắn nhất và trợ lý AI.",
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
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("list");
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);

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

  /**
   * Khi AI đề xuất "Chỉ đường" → tra toạ độ trong sorted (đã merge real +
   * mock) và chuyển cho routing engine. Đóng drawer mobile sau khi gọi.
   */
  const handleAiRouteLot = (lotId: string, lotName: string) => {
    const target = sorted.find((l) => l.id === lotId);
    if (!target || target.lat == null || target.lng == null) {
      toast.error("Không tìm được toạ độ bãi này.");
      return;
    }
    routing.routeTo({
      id: target.id,
      name: target.name ?? lotName,
      lat: target.lat,
      lng: target.lng,
    });
    setAiDrawerOpen(false);
  };

  /**
   * Khi AI đề xuất "Xem trên bản đồ" → highlight pin và chuyển sidebar về
   * danh sách để dễ xem chi tiết. Trên mobile, đóng drawer.
   */
  const handleAiSelectLot = (lotId: string) => {
    setSelectedId(lotId);
    setSidebarTab("list");
    setAiDrawerOpen(false);
  };

  // Khi đang chỉ đường: ẩn list, hiện RoutePanel ở sidebar (desktop)
  // hoặc bottom drawer (mobile).
  const showRoutePanel = !!routing.route;

  return (
    <div className="grid lg:grid-cols-[380px_1fr] gap-4 min-h-[500px] h-[calc(100dvh-140px)]">
      {/* SIDEBAR (desktop only) */}
      <aside className="hidden lg:flex rounded-2xl glass overflow-hidden flex-col min-h-0">
        {showRoutePanel ? (
          <RoutePanel
            routing={routing}
            variant="sidebar"
            onBackToList={() => {
              /* clearRoute đã được panel gọi */
            }}
          />
        ) : (
          <>
            <SidebarTabs tab={sidebarTab} onChange={setSidebarTab} />
            <div className="flex-1 min-h-0 overflow-hidden">
              {sidebarTab === "list" ? (
                <LotList
                  sorted={sorted}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onRoute={handleRequestRoute}
                />
              ) : (
                <AiParkingAssistant
                  compact
                  onSelectLot={handleAiSelectLot}
                  onRouteLot={handleAiRouteLot}
                  className="h-full"
                />
              )}
            </div>
          </>
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

        {/* MOBILE FAB: mở AI Assistant — ẩn khi đang chỉ đường (đã có
            bottom-sheet RoutePanel chiếm chỗ) */}
        {!showRoutePanel && (
          <button
            type="button"
            onClick={() => setAiDrawerOpen(true)}
            aria-label="Mở Trợ lý AI"
            className="lg:hidden absolute bottom-5 right-5 z-[500] h-12 pl-4 pr-5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_10px_30px_-8px_rgba(16,185,129,0.55)] inline-flex items-center gap-2 text-sm font-semibold hover:-translate-y-0.5 transition-transform"
          >
            <Sparkles className="size-4" />
            Trợ lý AI
          </button>
        )}
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

      {/* MOBILE: bottom sheet chứa AI Assistant */}
      {isMobile && (
        <Drawer open={aiDrawerOpen} onOpenChange={setAiDrawerOpen}>
          <DrawerContent className="max-h-[85vh] p-0 outline-none flex flex-col">
            <DrawerTitle className="sr-only">Trợ lý tìm bãi đỗ AI</DrawerTitle>
            <div className="px-5 py-4 border-b border-border/60 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 grid place-items-center">
                  <Sparkles className="size-4 text-emerald-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-sm text-foreground">
                    Trợ lý tìm bãi đỗ AI
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    Mô tả nơi bạn muốn đến — AI sẽ gợi ý bãi phù hợp
                  </p>
                </div>
              </div>
            </div>
            <AiParkingAssistant
              compact
              onSelectLot={handleAiSelectLot}
              onRouteLot={handleAiRouteLot}
              className="h-[70vh]"
            />
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}

/* ---------- helpers ---------- */

function SidebarTabs({
  tab,
  onChange,
}: {
  tab: SidebarTab;
  onChange: (t: SidebarTab) => void;
}) {
  const items: { id: SidebarTab; label: string; icon: typeof List }[] = [
    { id: "list", label: "Bãi gần đây", icon: List },
    { id: "ai", label: "Trợ lý AI", icon: Sparkles },
  ];
  return (
    <div className="px-3 pt-3 pb-2 border-b border-border/60 shrink-0">
      <div className="inline-flex w-full p-1 rounded-xl bg-muted/60 gap-1">
        {items.map((it) => {
          const active = tab === it.id;
          const Icon = it.icon;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => onChange(it.id)}
              className={cn(
                "flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                active
                  ? "bg-card text-foreground shadow-[var(--shadow-1)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "size-3.5",
                  active && it.id === "ai" && "text-emerald-500",
                )}
              />
              {it.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

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
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 pt-3 pb-2 shrink-0 border-b border-border/50">
        <h1 className="font-semibold tracking-tight text-sm">Bãi đỗ gần bạn</h1>
        <p className="text-[11px] text-muted-foreground">
          {sorted.length} bãi · Sắp xếp theo khoảng cách
        </p>
      </div>
      <div
        className={
          compact
            ? "max-h-[280px] overflow-y-auto scrollbar-thin"
            : "flex-1 min-h-0 overflow-y-auto scrollbar-thin"
        }
      >
        {sorted.map((lot) => {
          const active = selectedId === lot.id;
          const occRate = lot.total > 0 ? 1 - lot.available / lot.total : 0;
          return (
            <div
              key={lot.id}
              className={cn(
                "px-4 py-3 border-b border-border/40 transition-colors cursor-pointer",
                active
                  ? "bg-primary/5 border-l-2 border-l-primary"
                  : "hover:bg-accent/30",
              )}
              onClick={() => onSelect(lot.id)}
            >
              {/* Row 1: Name + availability */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm truncate flex items-center gap-1.5">
                    {lot.name}
                    {!lot.isReal && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                        demo
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                    <MapPin className="size-3 shrink-0" aria-hidden="true" />
                    {lot.description || "—"}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div
                    className={cn(
                      "font-mono font-bold text-base tabular-nums",
                      lot.available === 0
                        ? "text-[var(--occupied)]"
                        : lot.available <= 5
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-[var(--available)]",
                    )}
                  >
                    {lot.available}
                  </div>
                  <div className="text-[10px] text-muted-foreground tabular-nums">
                    /{lot.total} chỗ
                  </div>
                </div>
              </div>

              {/* Row 2: Occupancy bar + distance */}
              <div className="mt-2 flex items-center gap-3">
                <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      occRate > 0.85
                        ? "bg-[var(--occupied)]"
                        : occRate > 0.5
                          ? "bg-amber-500"
                          : "bg-[var(--available)]",
                    )}
                    style={{ width: `${Math.min(100, occRate * 100)}%` }}
                  />
                </div>
                {lot.distance != null && (
                  <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                    {lot.distance.toFixed(1)} km
                  </span>
                )}
              </div>

              {/* Row 3: Action buttons */}
              <div className="mt-2.5 flex items-center gap-2">
                {lot.lat != null && lot.lng != null && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRoute({
                        id: lot.id,
                        name: lot.name,
                        lat: lot.lat!,
                        lng: lot.lng!,
                      });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
                  >
                    <Navigation className="size-3" aria-hidden="true" />
                    Chỉ đường
                  </button>
                )}
                {lot.isReal && (
                  <Link
                    to="/booking/new"
                    search={{ lot: lot.id, name: lot.name }}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm"
                  >
                    Đặt chỗ
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

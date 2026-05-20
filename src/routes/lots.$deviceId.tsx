import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, MapPin, Star, Share2, Box, Grid3x3, Map as MapIcon, Wifi, WifiOff, Navigation } from "lucide-react";
import { useParkingDevices } from "@/hooks/useParkingDevices";
import { computeStats, getDeviceId, type Device } from "@/lib/parking.types";
import { buildFloorLayouts, findPath, type FloorLayout } from "@/lib/slot-layout";
import { KpiCards } from "@/components/parking/KpiCards";
import { SlotGrid2D } from "@/components/parking/SlotGrid2D";
import { ParkingScene3D } from "@/components/parking/ParkingScene3D";
import { ParkingMap } from "@/components/map/ParkingMap";
import { ActivityFeed } from "@/components/parking/ActivityFeed";
import { LotIntelligencePanel } from "@/components/intelligence/LotIntelligencePanel";
import { useFavorites } from "@/hooks/useFavorites";
import { useReservation } from "@/hooks/useReservation";
import { formatRelative } from "@/lib/format";
import { toast } from "sonner";
import { ClientOnly } from "@tanstack/react-router";
import { AsyncSurface } from "@/components/ui/async-surface";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/lots/$deviceId")({
  head: ({ params }) => ({
    meta: [
      { title: `Bãi đỗ ${params.deviceId.slice(0, 8)} — SmartPark` },
      {
        name: "description",
        content: "Trạng thái realtime, sơ đồ 3D và chỉ đường tới slot trong bãi.",
      },
    ],
  }),
  component: DeviceDetail,
  notFoundComponent: () => (
    <main className="mx-auto max-w-md px-4 py-16">
      <EmptyState
        variant="search"
        title="Không tìm thấy bãi đỗ"
        description="Có thể bãi đã bị gỡ hoặc đường dẫn không đúng."
        action={
          <Link
            to="/lots"
            className="inline-flex items-center justify-center rounded-full stripe-btn px-5 py-2.5 text-xs font-bold text-primary-foreground"
          >
            Về danh sách bãi
          </Link>
        }
      />
    </main>
  ),
  errorComponent: ({ error, reset }) => (
    <main className="mx-auto max-w-md px-4 py-16">
      <ErrorComponentInner error={error} reset={reset} />
    </main>
  ),
});

function ErrorComponentInner({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const router = useRouter();
  return (
    <ErrorState
      title="Không tải được bãi đỗ"
      description={error.message}
      onRetry={() => {
        router.invalidate();
        reset();
      }}
      onBack={() => router.history.back()}
    />
  );
}

type View = "3d" | "2d" | "map";

function DeviceDetail() {
  const { deviceId } = Route.useParams();
  const query = useParkingDevices();
  const devices = query.data?.devices ?? [];
  const device: Device | undefined = useMemo(
    () => devices.find((d) => getDeviceId(d) === deviceId),
    [devices, deviceId]
  );

  const [view, setView] = useState<View>("3d");
  const [activeFloor, setActiveFloor] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const { isFav, toggle } = useFavorites();
  const { reserve } = useReservation();

  const layouts = useMemo(
    () => (device ? buildFloorLayouts(device.sensor_data) : []),
    [device]
  );
  const currentLayout: FloorLayout | undefined =
    layouts.find((l) => l.floor === activeFloor) ?? layouts[0];

  const stats = device ? computeStats(device) : null;

  const pathCells = useMemo(() => {
    if (!currentLayout || !selectedSlotId) return undefined;
    const target = currentLayout.slots.find((s) => s.slot.id === selectedSlotId);
    if (!target) return undefined;
    return findPath(currentLayout, target);
  }, [currentLayout, selectedSlotId]);

  if (query.isLoading && !device) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-[520px] w-full rounded-2xl" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        title="Không tải được dữ liệu bãi đỗ"
        description={(query.error as Error)?.message}
        onRetry={() => query.refetch()}
        onBack={() => history.back()}
      />
    );
  }

  if (!device || !stats) {
    return (
      <EmptyState
        variant="search"
        title="Không tìm thấy bãi đỗ với mã này"
        description="Có thể API chưa trả về thiết bị hoặc bãi đã bị gỡ."
        action={
          <Link
            to="/lots"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full stripe-btn text-primary-foreground text-xs font-bold"
          >
            Về danh sách bãi
          </Link>
        }
      />
    );
  }

  const fav = isFav(deviceId);

  function handleReserve() {
    if (!device || !currentLayout || !selectedSlotId) return;
    const target = currentLayout.slots.find((s) => s.slot.id === selectedSlotId);
    if (!target) return;
    reserve({
      deviceId,
      deviceName: device.name,
      slotId: selectedSlotId,
      slotNumber: target.slot.slot_number,
      floor: target.slot.floor,
    });
    toast.success(`Đã giữ chỗ ${target.slot.slot_number}`, {
      description: "Bạn có 10 phút để di chuyển tới bãi.",
    });
  }

  return (
    <div className="space-y-8">
      {/* Header section with back navigation and detailed options */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            to="/lots"
            className="text-xs font-bold text-muted-foreground hover:text-primary inline-flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="size-3.5" /> Quay lại danh sách
          </Link>
          <h1 className="mt-2 text-headline text-foreground">{device.name}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1 font-semibold">
            <MapPin className="size-4 text-muted-foreground/70" strokeWidth={2.25} />
            {device.description || "—"}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-semibold">
            {device.is_online ? (
              <span className="inline-flex items-center gap-1.5 text-[var(--available)]">
                <span className="size-2 rounded-full bg-[var(--available)] animate-pulse-dot" />
                <Wifi className="size-3.5" strokeWidth={2.5} /> Cảm biến trực tuyến
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <WifiOff className="size-3.5" strokeWidth={2.5} /> Cảm biến ngoại tuyến
              </span>
            )}
            {device.last_seen && (
              <span className="text-muted-foreground">
                Đồng bộ {formatRelative(device.last_seen)}
              </span>
            )}
          </div>
        </div>
        
        {/* Top actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggle(deviceId)}
            className="px-4.5 py-2 rounded-full glass hover:bg-accent text-xs font-bold inline-flex items-center gap-1.5 border border-border/40 hover:border-primary/20 transition-all"
          >
            <Star
              className={cn("size-4 transition-all", fav && "fill-[var(--reserved)] text-[var(--reserved)] scale-110")}
              strokeWidth={fav ? 0 : 2.5}
            />
            {fav ? "Đã lưu" : "Lưu bãi đỗ"}
          </button>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(window.location.href);
              toast.success("Đã copy đường dẫn liên kết bãi đỗ!");
            }}
            className="px-4.5 py-2 rounded-full glass hover:bg-accent text-xs font-bold inline-flex items-center gap-1.5 border border-border/40 hover:border-primary/20 transition-all"
          >
            <Share2 className="size-4" strokeWidth={2.5} /> Chia sẻ
          </button>
        </div>
      </div>

      {/* KPI Stats overview */}
      <KpiCards stats={stats} />

      {/* Intelligence analysis panel */}
      <LotIntelligencePanel lotDeviceId={deviceId} />

      {/* Floor selections */}
      {layouts.length > 1 && (
        <div className="flex flex-wrap gap-2 p-1 bg-muted/20 dark:bg-muted/10 border border-border/20 rounded-full w-max">
          {layouts.map((l) => {
            const isActive = (activeFloor ?? layouts[0].floor) === l.floor;
            return (
              <button
                key={l.floor}
                onClick={() => {
                  setActiveFloor(l.floor);
                  setSelectedSlotId(null);
                }}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-bold transition-all",
                  isActive
                    ? "bg-card text-primary shadow-sm border border-border/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                )}
              >
                Tầng {l.floor}
                <span className="opacity-60 ml-1.5 text-[10px] font-bold">({l.slots.length})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Controls & View switch segmented control */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="inline-flex glass rounded-full p-1 gap-0.5 border border-border/40 shadow-sm">
          <ViewBtn active={view === "3d"} onClick={() => setView("3d")}>
            <Box className="size-4" strokeWidth={2.25} /> Sơ đồ 3D
          </ViewBtn>
          <ViewBtn active={view === "2d"} onClick={() => setView("2d")}>
            <Grid3x3 className="size-4" strokeWidth={2.25} /> Sơ đồ 2D
          </ViewBtn>
          <ViewBtn active={view === "map"} onClick={() => setView("map")}>
            <MapIcon className="size-4" strokeWidth={2.25} /> Bản đồ lớn
          </ViewBtn>
        </div>
        
        {selectedSlotId && currentLayout && (
          <div className="flex items-center gap-3 bg-card border border-border/40 p-2 pl-4 rounded-full shadow-sm">
            <span className="text-xs text-muted-foreground font-semibold">
              Đã chọn vị trí:{" "}
              <span className="font-mono font-bold text-[var(--reserved)] bg-[var(--reserved)]/10 px-2 py-0.5 rounded-full border border-[var(--reserved)]/20">
                {
                  currentLayout.slots.find((s) => s.slot.id === selectedSlotId)
                    ?.slot.slot_number
                }
              </span>
            </span>
            <button
              onClick={handleReserve}
              className="px-4.5 py-2.5 rounded-full bg-[var(--reserved)] text-[oklch(0.15_0.02_60)] font-extrabold text-xs inline-flex items-center gap-1.5 shadow-md hover:scale-[1.02] active:scale-95 transition-all"
            >
              <Navigation className="size-4" strokeWidth={2.5} /> Giữ vị trí này
            </button>
          </div>
        )}
      </div>

      {/* Primary layout grid: 3D/2D and right statistics panel */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl overflow-hidden glass border border-border/40 shadow-lg min-h-[500px]">
          {currentLayout ? (
            view === "3d" ? (
              <ClientOnly fallback={<div className="h-[520px] rounded-2xl animate-pulse bg-muted/20" />}>
                <ParkingScene3D
                  layout={currentLayout}
                  selectedSlotId={selectedSlotId}
                  onSelectSlot={setSelectedSlotId}
                  pathCells={pathCells}
                />
              </ClientOnly>
            ) : view === "2d" ? (
              <div className="p-6 bg-card/40 dark:bg-card/10 h-full">
                <SlotGrid2D
                  layout={currentLayout}
                  selectedSlotId={selectedSlotId}
                  onSelectSlot={setSelectedSlotId}
                  pathCells={pathCells}
                />
              </div>
            ) : (
              <div className="h-[520px] overflow-hidden relative">
                <ClientOnly fallback={<div className="h-full animate-pulse bg-muted/20" />}>
                  <DeviceMiniMap device={device} />
                </ClientOnly>
              </div>
            )
          ) : (
            <div className="h-[520px] grid place-items-center text-muted-foreground font-semibold">
              Chưa có cấu hình dữ liệu sơ đồ cảm biến.
            </div>
          )}
        </div>
        
        {/* Right sidebar activity and details */}
        <div className="space-y-6">
          <ActivityFeed device={device} />
          
          <div className="rounded-2xl glass p-5 border border-border/40">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-4">Chi tiết mật độ tầng</h3>
            <div className="space-y-4">
              {Object.entries(stats.byFloor).map(([f, v]) => {
                const pct = v.total > 0 ? (v.available / v.total) * 100 : 0;
                
                // Color mapping
                const colorTone =
                  pct > 40
                    ? "bg-gradient-to-r from-emerald-400 to-teal-500"
                    : pct > 10
                      ? "bg-gradient-to-r from-amber-400 to-orange-500"
                      : "bg-gradient-to-r from-rose-500 to-red-600";

                return (
                  <div key={f} className="text-xs font-semibold">
                    <div className="flex justify-between text-muted-foreground mb-1.5">
                      <span>Tầng {f}</span>
                      <span className="font-mono text-foreground font-extrabold">
                        {v.available}/{v.total} trống
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted/60 dark:bg-muted/10 overflow-hidden border border-border/10">
                      <div
                        className={cn("h-full rounded-full transition-all duration-1000", colorTone)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ViewBtn({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-full text-xs font-bold inline-flex items-center gap-1.5 transition-all duration-200",
        active
          ? "bg-card text-primary shadow-sm border border-border/30"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function DeviceMiniMap({ device }: { device: Device }) {
  return <ParkingMap devices={[device]} showMock={false} />;
}

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
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Về danh sách
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
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
          >
            Về danh sách
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
      description: "Bạn có 10 phút để đến bãi.",
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to="/lots"
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <ArrowLeft className="size-3.5" /> Danh sách
          </Link>
          <h1 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight">{device.name}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
            <MapPin className="size-3.5" />
            {device.description || "—"}
          </p>
          <div className="mt-2 flex items-center gap-3 text-xs">
            {device.is_online ? (
              <span className="inline-flex items-center gap-1 text-[var(--available)]">
                <span className="size-2 rounded-full bg-[var(--available)] animate-pulse-dot" />
                <Wifi className="size-3" /> Online
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <WifiOff className="size-3" /> Offline
              </span>
            )}
            {device.last_seen && (
              <span className="text-muted-foreground">
                Cập nhật {formatRelative(device.last_seen)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggle(deviceId)}
            className="px-3 py-2 rounded-lg glass hover:bg-accent text-sm inline-flex items-center gap-1.5"
          >
            <Star
              className={`size-4 ${fav ? "fill-[var(--reserved)] text-[var(--reserved)]" : ""}`}
            />
            {fav ? "Đã thích" : "Yêu thích"}
          </button>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(window.location.href);
              toast.success("Đã copy đường dẫn");
            }}
            className="px-3 py-2 rounded-lg glass hover:bg-accent text-sm inline-flex items-center gap-1.5"
          >
            <Share2 className="size-4" /> Chia sẻ
          </button>
        </div>
      </div>

      <KpiCards stats={stats} />

      <LotIntelligencePanel lotDeviceId={deviceId} />


      {/* Floor tabs */}
      {layouts.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {layouts.map((l) => (
            <button
              key={l.floor}
              onClick={() => {
                setActiveFloor(l.floor);
                setSelectedSlotId(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                (activeFloor ?? layouts[0].floor) === l.floor
                  ? "bg-primary text-primary-foreground"
                  : "glass hover:bg-accent text-muted-foreground"
              }`}
            >
              Tầng {l.floor}{" "}
              <span className="opacity-60 ml-1 text-xs">({l.slots.length})</span>
            </button>
          ))}
        </div>
      )}

      {/* View switcher */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex glass rounded-xl p-1 gap-1">
          <ViewBtn active={view === "3d"} onClick={() => setView("3d")}>
            <Box className="size-4" /> 3D
          </ViewBtn>
          <ViewBtn active={view === "2d"} onClick={() => setView("2d")}>
            <Grid3x3 className="size-4" /> 2D
          </ViewBtn>
          <ViewBtn active={view === "map"} onClick={() => setView("map")}>
            <MapIcon className="size-4" /> Bản đồ
          </ViewBtn>
        </div>
        {selectedSlotId && currentLayout && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Đã chọn slot{" "}
              <span className="font-mono font-semibold text-[var(--reserved)]">
                {
                  currentLayout.slots.find((s) => s.slot.id === selectedSlotId)
                    ?.slot.slot_number
                }
              </span>
            </span>
            <button
              onClick={handleReserve}
              className="px-4 py-2 rounded-lg bg-[var(--reserved)] text-[oklch(0.15_0.02_60)] font-semibold text-sm inline-flex items-center gap-1.5"
            >
              <Navigation className="size-4" /> Giữ chỗ này
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          {currentLayout ? (
            view === "3d" ? (
              <ClientOnly fallback={<div className="h-[520px] rounded-2xl glass animate-pulse" />}>
                <ParkingScene3D
                  layout={currentLayout}
                  selectedSlotId={selectedSlotId}
                  onSelectSlot={setSelectedSlotId}
                  pathCells={pathCells}
                />
              </ClientOnly>
            ) : view === "2d" ? (
              <SlotGrid2D
                layout={currentLayout}
                selectedSlotId={selectedSlotId}
                onSelectSlot={setSelectedSlotId}
                pathCells={pathCells}
              />
            ) : (
              <div className="h-[520px] rounded-2xl glass overflow-hidden">
                <ClientOnly fallback={<div className="h-full animate-pulse" />}>
                  <DeviceMiniMap device={device} />
                </ClientOnly>
              </div>
            )
          ) : (
            <div className="h-[520px] rounded-2xl glass grid place-items-center text-muted-foreground">
              Chưa có dữ liệu cảm biến.
            </div>
          )}
        </div>
        <div className="space-y-4">
          <ActivityFeed device={device} />
          <div className="rounded-2xl glass p-5">
            <h3 className="text-sm font-semibold mb-3">Thông tin tầng</h3>
            <div className="space-y-2">
              {Object.entries(stats.byFloor).map(([f, v]) => {
                const pct = v.total > 0 ? (v.available / v.total) * 100 : 0;
                return (
                  <div key={f} className="text-sm">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Tầng {f}</span>
                      <span className="font-mono">
                        {v.available}/{v.total}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-[var(--available)]"
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
      className={`px-3 py-1.5 rounded-lg text-sm inline-flex items-center gap-1.5 ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function DeviceMiniMap({ device }: { device: Device }) {
  return <ParkingMap devices={[device]} showMock={false} />;
}

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Filter } from "lucide-react";
import { useParkingDevices } from "@/hooks/useParkingDevices";
import { computeStats, getDeviceId, type Device } from "@/lib/parking.types";
import { LotCard } from "@/components/parking/LotCard";
import { LiveBadge } from "@/components/parking/LiveBadge";
import { useFavorites } from "@/hooks/useFavorites";
import { useBookingCounts } from "@/hooks/useBookingCounts";
import { useGeolocation, haversineKm } from "@/hooks/useGeolocation";
import { lookupCoord } from "@/lib/lot-coordinates";
import { EmptyState } from "@/components/ui/empty-state";
import { LotCardSkeleton } from "@/components/ui/skeleton";
import { AsyncSurface } from "@/components/ui/async-surface";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/lots")({
  head: () => ({
    meta: [
      { title: "Danh sách bãi đỗ xe — SmartPark" },
      {
        name: "description",
        content:
          "Toàn bộ bãi đỗ xe IoT với cập nhật realtime. Lọc theo trạng thái và số slot trống.",
      },
    ],
  }),
  component: LotsPage,
});

type FilterKind = "all" | "online" | "available" | "favorite";
type Sort = "available" | "name" | "occupancy" | "nearest";

function LotsPage() {
  const query = useParkingDevices();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<FilterKind>("all");
  const [sort, setSort] = useState<Sort>("available");

  return (
    <div className="space-y-8">
      {/* Page Title Section */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-caption">Hệ thống bãi đỗ</span>
          <h1 className="mt-2 text-headline text-foreground">Bãi đỗ xe IoT</h1>
          <p className="text-sm text-muted-foreground mt-1.5 font-medium">
            Phân tích trạng thái <span className="font-bold text-foreground">{query.data?.devices.length ?? 0}</span> bãi đỗ đang hoạt động thời gian thực.
          </p>
        </div>
        <LiveBadge />
      </div>

      {/* Premium Filter Controls */}
      <FilterBar
        q={q}
        onQ={setQ}
        filter={filter}
        onFilter={setFilter}
        sort={sort}
        onSort={setSort}
      />

      <AsyncSurface
        query={query}
        skeleton={
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <LotCardSkeleton count={6} />
          </div>
        }
        errorTitle="Không tải được danh sách bãi đỗ"
      >
        {(data) => (
          <>
            {data.mock && (
              <div
                role="status"
                className="rounded-2xl bg-[var(--reserved)]/8 border border-[var(--reserved)]/20 p-4 text-xs flex items-center gap-2.5 mb-6 shadow-sm"
              >
                <span className="inline-block size-2 rounded-full bg-[var(--reserved)] animate-pulse-dot" />
                <span className="font-extrabold uppercase tracking-wider text-foreground">
                  Dữ liệu giả lập
                </span>
                <span className="text-muted-foreground/90 font-medium">
                  — Chế độ mô phỏng IOT_USE_MOCK đang hoạt động. Các tính năng đặt chỗ & thanh toán vẫn được duy trì đầy đủ.
                </span>
              </div>
            )}
            <FilteredGrid
              devices={data.devices ?? []}
              apiError={data.mock ? null : data.error ?? null}
              q={q}
              filter={filter}
              sort={sort}
              onClear={() => {
                setQ("");
                setFilter("all");
              }}
            />
          </>
        )}
      </AsyncSurface>
    </div>
  );
}

function FilteredGrid({
  devices,
  apiError,
  q,
  filter,
  sort,
  onClear,
}: {
  devices: Device[];
  apiError: string | null;
  q: string;
  filter: FilterKind;
  sort: Sort;
  onClear: () => void;
}) {
  const { isFav } = useFavorites();
  const { pos } = useGeolocation();
  const { getBookedCount } = useBookingCounts();

  const list = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return devices
      .filter((d) => {
        if (filter === "online" && !d.is_online) return false;
        if (filter === "available") {
          const s = computeStats(d);
          if (s.available <= 0) return false;
        }
        if (filter === "favorite" && !isFav(getDeviceId(d))) return false;
        if (
          ql &&
          !d.name.toLowerCase().includes(ql) &&
          !(d.description ?? "").toLowerCase().includes(ql)
        )
          return false;
        return true;
      })
      .sort((a, b) => {
        const sa = computeStats(a);
        const sb = computeStats(b);
        if (sort === "available") return sb.available - sa.available;
        if (sort === "occupancy") return sb.occupancyRate - sa.occupancyRate;
        if (sort === "nearest" && pos) {
          const ca = lookupCoord(a.name);
          const cb = lookupCoord(b.name);
          const da = ca ? haversineKm(pos, ca) : Infinity;
          const db = cb ? haversineKm(pos, cb) : Infinity;
          return da - db;
        }
        return a.name.localeCompare(b.name);
      });
  }, [devices, q, filter, sort, isFav, pos]);

  if (list.length === 0) {
    return (
      <div className="space-y-6">
        {apiError && <ApiErrorAlert message={apiError} />}
        <EmptyState
          variant="search"
          icon={Search}
          title={
            apiError
              ? "Chưa có dữ liệu cảm biến"
              : "Không tìm thấy bãi đỗ phù hợp"
          }
          description={
            apiError
              ? "Kết nối tới API cảm biến IoT đang bị gián đoạn. Vui lòng thử lại."
              : "Không có kết quả khớp. Hãy thử thay đổi từ khoá hoặc tắt bộ lọc."
          }
          action={
            !apiError ? (
              <button
                onClick={onClear}
                className="inline-flex items-center justify-center h-10 px-5 rounded-full stripe-btn text-primary-foreground text-xs font-bold"
              >
                Xoá bộ lọc
              </button>
            ) : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {apiError && <ApiErrorAlert message={apiError} />}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {list.map((d) => (
          <LotCard key={getDeviceId(d)} device={d} bookedSlots={getBookedCount(getDeviceId(d))} />
        ))}
      </div>
    </div>
  );
}

function ApiErrorAlert({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-2xl bg-destructive/10 border border-destructive/20 p-4.5 text-sm flex items-start gap-3 shadow-sm"
    >
      <div>
        <p className="font-bold text-destructive">
          Lỗi đồng bộ cảm biến IoT
        </p>
        <p className="text-muted-foreground text-xs mt-1 font-medium break-all">
          {message}
        </p>
      </div>
    </div>
  );
}

function FilterBar({
  q,
  onQ,
  filter,
  onFilter,
  sort,
  onSort,
}: {
  q: string;
  onQ: (v: string) => void;
  filter: FilterKind;
  onFilter: (v: FilterKind) => void;
  sort: Sort;
  onSort: (v: Sort) => void;
}) {
  return (
    <div className="rounded-2xl glass p-3 flex flex-wrap items-center gap-3">
      {/* Search Input */}
      <label className="flex-1 min-w-[240px] flex items-center gap-2 px-3.5 rounded-full bg-input/40 dark:bg-input/10 border border-border/40 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
        <Search className="size-4 text-muted-foreground" aria-hidden="true" />
        <input
          value={q}
          onChange={(e) => onQ(e.target.value)}
          placeholder="Tìm kiếm bãi đỗ, khu vực..."
          aria-label="Tìm bãi đỗ"
          className="flex-1 bg-transparent py-2.5 text-xs font-semibold outline-none placeholder:text-muted-foreground/75"
        />
      </label>

      {/* Filter Tabs / Chips */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/20 dark:bg-muted/10 rounded-full border border-border/20">
        <Chip active={filter === "all"} onClick={() => onFilter("all")}>
          Tất cả
        </Chip>
        <Chip active={filter === "online"} onClick={() => onFilter("online")}>
          Online
        </Chip>
        <Chip active={filter === "available"} onClick={() => onFilter("available")}>
          Còn chỗ
        </Chip>
        <Chip active={filter === "favorite"} onClick={() => onFilter("favorite")}>
          Yêu thích
        </Chip>
      </div>

      {/* Sort selection */}
      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground ml-auto bg-card/60 border border-border/40 px-3.5 py-2.5 rounded-full shadow-sm hover:border-primary/20 transition-all">
        <Filter className="size-3.5 text-primary" aria-hidden="true" strokeWidth={2.5} />
        <label className="sr-only" htmlFor="sort-select">
          Sắp xếp
        </label>
        <select
          id="sort-select"
          value={sort}
          onChange={(e) => onSort(e.target.value as Sort)}
          className="bg-transparent outline-none cursor-pointer font-bold text-foreground text-[11px]"
        >
          <option value="nearest">Gần nhất</option>
          <option value="available">Chỗ trống tăng dần</option>
          <option value="occupancy">Lấp đầy nhất</option>
          <option value="name">Tên A-Z</option>
        </select>
      </div>
    </div>
  );
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "px-4 py-2 rounded-full text-xs font-bold transition-all duration-200",
        active
          ? "bg-card text-primary shadow-sm border border-border/30"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
      )}
    >
      {children}
    </button>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Filter } from "lucide-react";
import { useParkingDevices } from "@/hooks/useParkingDevices";
import { computeStats, getDeviceId, type Device } from "@/lib/parking.types";
import { LotCard } from "@/components/parking/LotCard";
import { LiveBadge } from "@/components/parking/LiveBadge";
import { useFavorites } from "@/hooks/useFavorites";
import { useGeolocation, haversineKm } from "@/hooks/useGeolocation";
import { lookupCoord } from "@/lib/lot-coordinates";
import { EmptyState } from "@/components/ui/empty-state";
import { LotCardSkeleton } from "@/components/ui/skeleton";
import { AsyncSurface } from "@/components/ui/async-surface";

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bãi đỗ xe</h1>
          <p className="text-sm text-muted-foreground">
            {query.data?.devices.length ?? 0} bãi · Cập nhật realtime mỗi 3 giây
          </p>
        </div>
        <LiveBadge />
      </div>

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
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <LotCardSkeleton count={6} />
          </div>
        }
        errorTitle="Không tải được danh sách bãi đỗ"
      >
        {(data) => (
          <FilteredGrid
            devices={data.devices ?? []}
            apiError={data.error ?? null}
            q={q}
            filter={filter}
            sort={sort}
            onClear={() => {
              setQ("");
              setFilter("all");
            }}
          />
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
      <div className="space-y-4">
        {apiError && <ApiErrorAlert message={apiError} />}
        <EmptyState
          variant="search"
          icon={Search}
          title={
            apiError
              ? "Chưa có dữ liệu bãi đỗ"
              : "Không tìm thấy bãi đỗ phù hợp"
          }
          description={
            apiError
              ? "API IoT đang gặp sự cố. Vui lòng thử lại sau."
              : "Thử xoá bộ lọc hoặc tìm với từ khoá khác."
          }
          action={
            !apiError ? (
              <button
                onClick={onClear}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
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
    <div className="space-y-4">
      {apiError && <ApiErrorAlert message={apiError} />}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((d) => (
          <LotCard key={getDeviceId(d)} device={d} />
        ))}
      </div>
    </div>
  );
}

function ApiErrorAlert({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-xl bg-destructive/10 border border-destructive/30 p-4 text-sm flex items-start gap-3"
    >
      <div>
        <p className="font-medium text-destructive">
          Không kết nối được API IoT
        </p>
        <p className="text-muted-foreground text-xs mt-1 break-words">
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
    <div className="rounded-2xl glass p-3 flex flex-wrap items-center gap-2">
      <label className="flex-1 min-w-[200px] flex items-center gap-2 px-3 rounded-lg bg-input/50">
        <Search className="size-4 text-muted-foreground" aria-hidden="true" />
        <input
          value={q}
          onChange={(e) => onQ(e.target.value)}
          placeholder="Tìm theo tên hoặc địa chỉ..."
          aria-label="Tìm bãi đỗ"
          className="flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
        />
      </label>
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
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
        <Filter className="size-3.5" aria-hidden="true" />
        <label className="sr-only" htmlFor="sort-select">
          Sắp xếp
        </label>
        <select
          id="sort-select"
          value={sort}
          onChange={(e) => onSort(e.target.value as Sort)}
          className="bg-transparent outline-none cursor-pointer"
        >
          <option value="nearest">Gần nhất</option>
          <option value="available">Nhiều chỗ trống</option>
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
      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

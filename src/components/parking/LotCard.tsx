import { Link, useNavigate } from "@tanstack/react-router";
import { MapPin, Wifi, WifiOff, Star, Navigation, ArrowRight } from "lucide-react";
import { computeStats, getDeviceId, type Device } from "@/lib/parking.types";
import { OccupancyBar } from "./OccupancyBar";
import { useFavorites } from "@/hooks/useFavorites";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "@/lib/utils";

export function LotCard({ device }: { device: Device }) {
  const id = getDeviceId(device);
  const stats = computeStats(device);
  const { isFav, toggle } = useFavorites();
  const fav = isFav(id);
  const nav = useNavigate();

  return (
    <div
      role="article"
      onClick={() => nav({ to: "/lots/$deviceId", params: { deviceId: id } })}
      className="group block rounded-2xl bg-card border border-border p-5 shadow-[var(--shadow-1)] hover:shadow-[var(--shadow-2)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold tracking-tight truncate text-foreground group-hover:text-primary transition-colors">
            {device.name}
          </h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <MapPin className="size-3 shrink-0" strokeWidth={2} />
            <span className="truncate">{device.description || "—"}</span>
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggle(id);
          }}
          className="p-1.5 rounded-lg hover:bg-accent/60 text-muted-foreground hover:text-[var(--reserved)] transition-colors"
          aria-label="Yêu thích"
        >
          <Star
            className={cn(
              "size-4 transition-all",
              fav && "fill-[var(--reserved)] text-[var(--reserved)] scale-110",
            )}
            strokeWidth={1.75}
          />
        </button>
      </div>

      <div className="mt-5 flex items-end justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-semibold tabular-nums text-foreground">
              {stats.available}
            </span>
            <span className="text-xs text-muted-foreground">
              / {stats.total} chỗ trống
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {Math.round(stats.occupancyRate * 100)}% lấp đầy
          </p>
        </div>
        {device.is_online ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--available)]/12 text-[var(--available)] text-[11px] font-medium">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--available)] opacity-50" />
              <span className="relative inline-flex size-1.5 rounded-full bg-[var(--available)]" />
            </span>
            Online
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-muted-foreground text-[11px] font-medium">
            <WifiOff className="size-3" strokeWidth={2.25} />
            Offline
          </span>
        )}
      </div>

      <OccupancyBar
        className="mt-3"
        available={stats.available}
        total={stats.total}
      />

      <div className="mt-4 flex items-center justify-between gap-2">
        {device.last_seen ? (
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80">
            {formatDistanceToNow(new Date(device.last_seen), {
              addSuffix: true,
              locale: vi,
            })}
          </p>
        ) : <span />}
        <div className="flex items-center gap-1.5">
          <Link
            to="/map"
            search={{ route: id } as Record<string, string>}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-foreground/80 hover:bg-accent/60 text-xs font-medium transition-colors"
          >
            <Navigation className="size-3.5" strokeWidth={2} />
            Chỉ đường
          </Link>
          <Link
            to="/booking/new"
            search={{ lot: id, name: device.name } as Record<string, string>}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 text-xs font-semibold transition-opacity shadow-[var(--shadow-xs)]"
          >
            Đặt chỗ
            <ArrowRight className="size-3.5" strokeWidth={2.25} />
          </Link>
        </div>
      </div>
    </div>
  );
}

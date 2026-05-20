import { Link, useNavigate } from "@tanstack/react-router";
import { MapPin, WifiOff, Star, Navigation, ArrowRight } from "lucide-react";
import { computeStats, getDeviceId, type Device } from "@/lib/parking.types";
import { OccupancyBar } from "./OccupancyBar";
import { useFavorites } from "@/hooks/useFavorites";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "@/lib/utils";

export function LotCard({ device, bookedSlots = 0 }: { device: Device; bookedSlots?: number }) {
  const id = getDeviceId(device);
  const stats = computeStats(device);
  const adjustedAvailable = Math.max(0, stats.available - bookedSlots);
  const adjustedOccRate = stats.total > 0 ? 1 - adjustedAvailable / stats.total : 0;
  const { isFav, toggle } = useFavorites();
  const fav = isFav(id);
  const nav = useNavigate();

  return (
    <div
      role="article"
      onClick={() => nav({ to: "/lots/$deviceId", params: { deviceId: id } })}
      className="group block rounded-2xl glass p-5 hover:-translate-y-1 hover:shadow-2xl border border-border/40 hover:border-primary/20 transition-all duration-300 cursor-pointer relative overflow-hidden"
    >
      {/* Decorative gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="min-w-0">
          <h3 className="font-bold tracking-tight text-sm text-foreground group-hover:text-primary transition-colors duration-200">
            {device.name}
          </h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 font-semibold">
            <MapPin className="size-3.5 shrink-0 text-muted-foreground/80" strokeWidth={2.25} />
            <span className="truncate">{device.description || "—"}</span>
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggle(id);
          }}
          className="size-8.5 rounded-full grid place-items-center hover:bg-accent/80 text-muted-foreground hover:text-[var(--reserved)] transition-all shrink-0 border border-transparent hover:border-border/40"
          aria-label="Yêu thích"
        >
          <Star
            className={cn(
              "size-4 transition-all duration-200",
              fav && "fill-[var(--reserved)] text-[var(--reserved)] scale-110",
            )}
            strokeWidth={fav ? 0 : 2}
          />
        </button>
      </div>

      <div className="mt-5 flex items-end justify-between gap-3 relative z-10">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold font-mono tracking-tight text-foreground drop-shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
              {adjustedAvailable}
            </span>
            <span className="text-xs text-muted-foreground font-semibold">
              / {stats.total} chỗ trống
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-1">
            {Math.round(adjustedOccRate * 100)}% lấp đầy
            {bookedSlots > 0 && (
              <span className="text-amber-600 dark:text-amber-400 ml-1">
                · {bookedSlots} đã đặt
              </span>
            )}
          </p>
        </div>
        
        {device.is_online ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--available)]/12 border border-[var(--available)]/25 text-[var(--available)] text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--available)] opacity-55" />
              <span className="relative inline-flex size-1.5 rounded-full bg-[var(--available)]" />
            </span>
            Online
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted border border-border/60 text-muted-foreground text-[10px] font-extrabold uppercase tracking-wider">
            <WifiOff className="size-3" strokeWidth={2.25} />
            Offline
          </span>
        )}
      </div>

      <OccupancyBar
        className="mt-4 relative z-10"
        available={adjustedAvailable}
        total={stats.total}
      />

      <div className="mt-5 flex items-center justify-between gap-2 relative z-10">
        {device.last_seen ? (
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
            {formatDistanceToNow(new Date(device.last_seen), {
              addSuffix: true,
              locale: vi,
            })}
          </p>
        ) : <span />}
        
        <div className="flex items-center gap-2">
          <Link
            to="/map"
            search={{ route: id } as Record<string, string>}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-border bg-card/60 text-foreground/80 hover:bg-accent/60 text-xs font-bold transition-all"
          >
            <Navigation className="size-3.5 text-primary" strokeWidth={2.5} />
            Chỉ đường
          </Link>
          <Link
            to="/booking/new"
            search={{ lot: id, name: device.name } as Record<string, string>}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full stripe-btn text-primary-foreground text-xs font-bold"
          >
            Đặt chỗ
            <ArrowRight className="size-3.5" strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </div>
  );
}

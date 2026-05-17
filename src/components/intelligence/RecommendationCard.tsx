import { Link } from "@tanstack/react-router";
import { Navigation, MapPin, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Bar {
  label: string;
  value: number; // 0..1 weighted contribution
  rawPct: number; // 0..100 unweighted (for tooltip)
}

interface Props {
  rank: number;
  id: string;
  name: string;
  score: number;
  distanceKm: number;
  etaMin: number;
  available: number;
  total: number;
  bars: Bar[];
}

export function RecommendationCard({
  rank,
  id,
  name,
  score,
  distanceKm,
  etaMin,
  available,
  total,
  bars,
}: Props) {
  const scorePct = Math.round(score * 100);
  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-1)] hover:shadow-[var(--shadow-2)] transition-shadow">
      <div className="flex items-start gap-4">
        <div className="shrink-0 flex flex-col items-center">
          <div
            className={cn(
              "size-14 rounded-2xl grid place-items-center text-lg font-semibold tabular-nums",
              rank === 1
                ? "bg-primary text-primary-foreground shadow-[var(--shadow-2)]"
                : "bg-primary/10 text-primary",
            )}
          >
            {scorePct}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 uppercase tracking-wider">
            điểm
          </p>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-wider">
              #{rank}
            </span>
            <h3 className="font-semibold text-foreground truncate">{name}</h3>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" /> {distanceKm.toFixed(1)} km
            </span>
            <span className="inline-flex items-center gap-1">
              <Navigation className="size-3" /> ~{etaMin} phút
            </span>
            <span>
              <b className="text-foreground tabular-nums">{available}</b> /
              {total} chỗ trống
            </span>
          </div>

          <div className="mt-4 space-y-1.5">
            {bars.map((b) => (
              <div key={b.label} className="flex items-center gap-2">
                <span className="w-20 text-[11px] text-muted-foreground">
                  {b.label}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary/70 rounded-full transition-all"
                    style={{ width: `${Math.min(100, b.value * 400)}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground/80 w-8 text-right tabular-nums">
                  {Math.round(b.rawPct)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Link
          to="/lots/$deviceId"
          params={{ deviceId: id }}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
        >
          Xem chi tiết <ArrowRight className="size-3.5" />
        </Link>
        <Link
          to="/map"
          search={{ route: id } as never}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-border text-foreground/80 hover:bg-accent/60 text-sm font-medium"
        >
          <Navigation className="size-3.5" /> Chỉ đường
        </Link>
      </div>
    </article>
  );
}

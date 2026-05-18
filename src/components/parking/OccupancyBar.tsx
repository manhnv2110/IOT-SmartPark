import { cn } from "@/lib/utils";

export function OccupancyBar({
  available,
  total,
  className,
}: {
  available: number;
  total: number;
  className?: string;
}) {
  const pct = total > 0 ? (available / total) * 100 : 0;
  const tone =
    pct > 40
      ? "gradient-pay"
      : pct > 10
        ? "bg-[var(--reserved)]"
        : "bg-[var(--occupied)]";
  return (
    <div
      className={cn(
        "h-1.5 rounded-full bg-muted/70 overflow-hidden",
        className,
      )}
    >
      <div
        className={cn("h-full rounded-full transition-all duration-700", tone)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

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
  
  // High availability = glowing emerald gradient
  // Medium availability = glowing amber gradient
  // Low/No availability = glowing rose red gradient
  const tone =
    pct > 40
      ? "bg-gradient-to-r from-emerald-400 via-teal-400 to-teal-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
      : pct > 10
        ? "bg-gradient-to-r from-amber-400 to-orange-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
        : "bg-gradient-to-r from-rose-500 to-red-600 shadow-[0_0_8px_rgba(239,68,68,0.3)]";

  return (
    <div
      className={cn(
        "h-2 rounded-full bg-muted/60 dark:bg-muted/10 overflow-hidden border border-border/10",
        className,
      )}
    >
      <div
        className={cn("h-full rounded-full transition-all duration-1000 ease-out", tone)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

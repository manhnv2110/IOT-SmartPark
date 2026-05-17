import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Props {
  multiplier: number;
  className?: string;
}

export function SurgeBadge({ multiplier, className }: Props) {
  if (Math.abs(multiplier - 1) < 0.02) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground text-[10px] font-medium",
          className,
        )}
      >
        <Minus className="size-2.5" /> giá thường
      </span>
    );
  }
  const up = multiplier > 1;
  const pct = Math.round((multiplier - 1) * 100);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold tabular-nums",
        up
          ? "bg-[var(--reserved)]/15 text-[var(--reserved)]"
          : "bg-[var(--available)]/15 text-[var(--available)]",
        className,
      )}
    >
      {up ? (
        <TrendingUp className="size-2.5" strokeWidth={2.5} />
      ) : (
        <TrendingDown className="size-2.5" strokeWidth={2.5} />
      )}
      {up ? "+" : ""}
      {pct}%
    </span>
  );
}

import { cn } from "@/lib/utils";

const DAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

interface Props {
  /** 7×24 matrix of values 0..1, dow 0=Sun */
  data: number[][];
  className?: string;
}

function color(v: number): string {
  // OKLCH gradient from mint (low) → cyan → primary (high)
  if (v <= 0) return "oklch(0.97 0.01 220 / 0.4)";
  const l = 0.95 - v * 0.5; // 0.95 → 0.45
  const c = 0.05 + v * 0.15; // 0.05 → 0.20
  return `oklch(${l.toFixed(3)} ${c.toFixed(3)} 210)`;
}

export function Heatmap7x24({ data, className }: Props) {
  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <div className="inline-grid gap-px" style={{ gridTemplateColumns: "auto repeat(24, minmax(14px, 1fr))" }}>
        <div />
        {Array.from({ length: 24 }).map((_, h) => (
          <div
            key={h}
            className="text-[9px] text-muted-foreground/70 text-center tabular-nums"
          >
            {h % 3 === 0 ? h : ""}
          </div>
        ))}
        {data.map((row, dow) => (
          <div key={`r-${dow}`} className="contents">
            <div className="text-[10px] text-muted-foreground pr-2 self-center">
              {DAYS[dow]}
            </div>
            {row.map((v, h) => (
              <div
                key={`${dow}-${h}`}
                className="aspect-square rounded-[3px]"
                style={{ background: color(v) }}
                title={`${DAYS[dow]} ${h}h · ${Math.round(v * 100)}%`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
        <span>vắng</span>
        <div className="h-2 w-32 rounded-full"
          style={{
            background:
              "linear-gradient(to right, oklch(0.95 0.05 210), oklch(0.45 0.20 210))",
          }}
        />
        <span>đông</span>
      </div>
    </div>
  );
}

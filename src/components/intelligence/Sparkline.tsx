import { cn } from "@/lib/utils";

interface Props {
  data: number[]; // 0..1 values
  width?: number;
  height?: number;
  className?: string;
  strokeWidth?: number;
  fill?: boolean;
}

export function Sparkline({
  data,
  width = 120,
  height = 32,
  className,
  strokeWidth = 1.75,
  fill = true,
}: Props) {
  if (data.length < 2) {
    return (
      <div
        className={cn("text-[10px] text-muted-foreground/60", className)}
        style={{ width, height }}
      >
        chưa đủ dữ liệu
      </div>
    );
  }
  const n = data.length;
  const stepX = width / (n - 1);
  const points = data.map((v, i) => [i * stepX, height - v * height] as const);
  const path = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");
  const area = `${path} L${width},${height} L0,${height} Z`;
  const gid = `spk-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            stopColor="var(--primary)"
            stopOpacity={0.35}
          />
          <stop
            offset="100%"
            stopColor="var(--primary)"
            stopOpacity={0}
          />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#${gid})`} />}
      <path
        d={path}
        fill="none"
        stroke="var(--primary)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

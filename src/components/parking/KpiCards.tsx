import { motion } from "framer-motion";
import { CheckCircle2, Circle, Activity, Percent } from "lucide-react";
import type { DeviceStats } from "@/lib/parking.types";

export function KpiCards({ stats }: { stats: DeviceStats }) {
  const cards = [
    {
      label: "Tổng vị trí đỗ",
      value: stats.total,
      icon: <Circle className="size-4 text-foreground/80" strokeWidth={2.25} />,
      bg: "bg-muted/10",
      tone: "text-foreground",
    },
    {
      label: "Slot trống",
      value: stats.available,
      icon: <CheckCircle2 className="size-4 text-[var(--available)]" strokeWidth={2.25} />,
      bg: "bg-[var(--available)]/10 border-[var(--available)]/10",
      tone: "text-[var(--available)] drop-shadow-[0_2px_8px_rgba(16,185,129,0.15)]",
    },
    {
      label: "Đang đỗ xe",
      value: stats.occupied,
      icon: <Activity className="size-4 text-[var(--occupied)]" strokeWidth={2.25} />,
      bg: "bg-[var(--occupied)]/10 border-[var(--occupied)]/10",
      tone: "text-[var(--occupied)] drop-shadow-[0_2px_8px_rgba(239,68,68,0.15)]",
    },
    {
      label: "Tỉ lệ lấp đầy",
      value: `${Math.round(stats.occupancyRate * 100)}%`,
      icon: <Percent className="size-4 text-[var(--reserved)]" strokeWidth={2.25} />,
      bg: "bg-[var(--reserved)]/10 border-[var(--reserved)]/10",
      tone: "text-[var(--reserved)] drop-shadow-[0_2px_8px_rgba(245,158,11,0.15)]",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((c, i) => (
        <motion.div
          key={c.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: i * 0.05 }}
          className="rounded-2xl glass p-5 flex flex-col justify-between border border-border/40 hover:border-primary/20 hover:shadow-lg transition-all"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
              {c.label}
            </span>
            <div className={`grid place-items-center size-7 rounded-lg ${c.bg} border border-transparent`}>
              {c.icon}
            </div>
          </div>
          <div className={`mt-4 text-3xl font-black font-mono tracking-tight ${c.tone}`}>
            {c.value}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

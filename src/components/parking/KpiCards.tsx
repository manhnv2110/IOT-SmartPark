import { motion } from "framer-motion";
import { CheckCircle2, Circle, Activity, Percent } from "lucide-react";
import type { DeviceStats } from "@/lib/parking.types";

export function KpiCards({ stats }: { stats: DeviceStats }) {
  const cards = [
    {
      label: "Tổng slot",
      value: stats.total,
      icon: <Circle className="size-4" />,
      tone: "text-foreground",
    },
    {
      label: "Còn trống",
      value: stats.available,
      icon: <CheckCircle2 className="size-4" />,
      tone: "text-[var(--available)]",
    },
    {
      label: "Đang dùng",
      value: stats.occupied,
      icon: <Activity className="size-4" />,
      tone: "text-[var(--occupied)]",
    },
    {
      label: "Tỉ lệ lấp đầy",
      value: `${Math.round(stats.occupancyRate * 100)}%`,
      icon: <Percent className="size-4" />,
      tone: "text-[var(--reserved)]",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((c, i) => (
        <motion.div
          key={c.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="rounded-xl glass p-4"
        >
          <div className={`flex items-center gap-2 text-xs ${c.tone}`}>
            {c.icon}
            <span className="uppercase tracking-wider text-muted-foreground">
              {c.label}
            </span>
          </div>
          <div className={`mt-2 text-3xl font-mono font-bold ${c.tone}`}>
            {c.value}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

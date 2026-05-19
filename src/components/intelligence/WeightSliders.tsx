import { cn } from "@/lib/utils";
import type { RecommenderWeights } from "@/lib/intelligence/recommender";

interface Props {
  value: RecommenderWeights;
  onChange: (w: RecommenderWeights) => void;
  className?: string;
}

const ITEMS: Array<{ key: keyof RecommenderWeights; label: string; hint: string }> = [
  { key: "w1", label: "Khoảng cách", hint: "Càng gần càng tốt" },
  { key: "w2", label: "Còn nhiều chỗ", hint: "Tỉ ệ trống hiện tại" },
  { key: "w3", label: "Giá thấp", hint: "Phí theo giờ" },
  { key: "w4", label: "Độ ổn định", hint: "Lịch sử ổn định" },
  { key: "w5", label: "Dự đoán", hint: "Còn cho tới khi tới nơi" },
];

export function WeightSliders({ value, onChange, className }: Props) {
  return (
    <div className={cn("space-y-3", className)}>
      {ITEMS.map((it) => (
        <div key={it.key}>
          <div className="flex items-center justify-between text-xs">
            <div>
              <span className="font-medium text-foreground">{it.label}</span>
              <span className="text-muted-foreground ml-2">- {it.hint}</span>
            </div>
            <span className="tabular-nums text-muted-foreground">
              {(value[it.key] * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={value[it.key]}
            onChange={(e) => onChange({ ...value, [it.key]: parseFloat(e.target.value) })}
            className="w-full mt-1 accent-primary"
          />
        </div>
      ))}
    </div>
  );
}

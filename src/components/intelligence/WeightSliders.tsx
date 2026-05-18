import { cn } from "@/lib/utils";
import type { RecommenderWeights } from "@/lib/intelligence/recommender";

interface Props {
  value: RecommenderWeights;
  onChange: (w: RecommenderWeights) => void;
  className?: string;
}

const ITEMS: Array<{ key: keyof RecommenderWeights; label: string; hint: string }> = [
  { key: "w1", label: "Khoang cach", hint: "Cang gan cang tot" },
  { key: "w2", label: "Con nhieu cho", hint: "Ti le trong hien tai" },
  { key: "w3", label: "Gia thap", hint: "Phi theo gio" },
  { key: "w4", label: "Do tin cay", hint: "Lich su on dinh" },
  { key: "w5", label: "Du doan", hint: "Con cho khi toi noi" },
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

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function CopyRow({
  label,
  value,
  copyValue,
  highlight,
  mono = true,
  icon,
}: {
  label: string;
  value: string;
  copyValue?: string;
  highlight?: boolean;
  mono?: boolean;
  icon?: React.ReactNode;
}) {
  const [done, setDone] = useState(false);
  const onCopy = () => {
    navigator.clipboard.writeText(copyValue ?? value);
    toast.success(`Đã sao chép ${label.toLowerCase()}`);
    setDone(true);
    setTimeout(() => setDone(false), 1400);
  };
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl px-3 h-12 transition-colors",
        highlight ? "bg-primary-soft/40 ring-1 ring-primary/25" : "hover:bg-surface",
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <div className="min-w-0">
          <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</div>
          <div
            className={cn(
              "truncate text-sm",
              mono && "font-mono",
              highlight && "text-foreground font-semibold",
            )}
          >
            {value}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onCopy}
        aria-label={`Sao chép ${label}`}
        className={cn(
          "shrink-0 grid place-items-center w-9 h-9 rounded-lg border border-border bg-card text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors",
          done && "border-[var(--available)]/40 text-[var(--available)] bg-[var(--available)]/10",
        )}
      >
        {done ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}

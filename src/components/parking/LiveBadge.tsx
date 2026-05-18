import { useParkingDevices } from "@/hooks/useParkingDevices";
import { cn } from "@/lib/utils";

export function LiveBadge({ className }: { className?: string }) {
  const { data, isFetching, isError } = useParkingDevices();
  const ok = !isError && data && !data.error;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-medium border border-border bg-card/60",
        className,
      )}
    >
      <span className="relative inline-flex">
        <span
          className={cn(
            "size-1.5 rounded-full animate-pulse-dot",
            ok ? "bg-[var(--available)]" : "bg-[var(--occupied)]",
          )}
        />
      </span>
      <span className="text-muted-foreground">
        {ok ? (isFetching ? "Đồng bộ..." : "Trực tuyến") : "Mất kết nối"}
      </span>
    </div>
  );
}

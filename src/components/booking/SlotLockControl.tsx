import {
  Lock,
  Unlock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Wifi,
} from "lucide-react";
import { useSlotLock } from "@/hooks/useSlotLock";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SlotLockControlProps {
  bookingId: string;
  initialLocked?: boolean;
  compact?: boolean;
}

export function SlotLockControl({
  bookingId,
  initialLocked = false,
  compact = false,
}: SlotLockControlProps) {
  const { locked, loading, error, confirmed, setLocked } = useSlotLock({
    bookingId,
    initialLocked,
  });

  if (compact) {
    return (
      <button
        onClick={() => setLocked(!locked)}
        disabled={loading}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
          locked
            ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
            : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
          loading && "opacity-60"
        )}
      >
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : locked ? (
          <Lock className="w-3 h-3" />
        ) : (
          <Unlock className="w-3 h-3" />
        )}
        {locked ? "Đã khoá" : "Đã mở"}
      </button>
    );
  }

  return (
    <div className="rounded-2xl glass-strong overflow-hidden">
      {/* Status indicator bar */}
      <div
        className={cn(
          "h-1 transition-colors duration-500",
          locked
            ? "bg-gradient-to-r from-amber-400 to-orange-400"
            : "bg-gradient-to-r from-emerald-400 to-teal-400"
        )}
      />

      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-12 h-12 rounded-2xl grid place-items-center transition-all duration-500",
              locked
                ? "bg-amber-500/10 text-amber-600"
                : "bg-emerald-500/10 text-emerald-600"
            )}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : locked ? (
              <Lock className="w-5 h-5" />
            ) : (
              <Unlock className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm text-foreground">
              Điều khiển khoá chỗ đỗ
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <Wifi className="w-3 h-3" />
              {loading
                ? "Đang gửi lệnh..."
                : locked
                  ? "Barrier đang khoá"
                  : "Barrier đang mở"}
            </p>
          </div>
          {/* Live indicator */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 text-[10px] text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            IoT
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="lg"
            variant="outline"
            className={cn(
              "h-14 rounded-xl gap-2 text-sm font-medium transition-all duration-300",
              !locked
                ? "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-500/20"
                : "border-border/60 hover:bg-emerald-500/5 hover:border-emerald-500/30 hover:text-emerald-600"
            )}
            onClick={() => setLocked(false)}
            disabled={loading || !locked}
          >
            {loading && locked ? (
              <Loader2 className="w-4.5 h-4.5 animate-spin" />
            ) : (
              <Unlock className="w-4.5 h-4.5" />
            )}
            Mở khoá
          </Button>
          <Button
            size="lg"
            variant="outline"
            className={cn(
              "h-14 rounded-xl gap-2 text-sm font-medium transition-all duration-300",
              locked
                ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-500/20"
                : "border-border/60 hover:bg-amber-500/5 hover:border-amber-500/30 hover:text-amber-600"
            )}
            onClick={() => setLocked(true)}
            disabled={loading || locked}
          >
            {loading && !locked ? (
              <Loader2 className="w-4.5 h-4.5 animate-spin" />
            ) : (
              <Lock className="w-4.5 h-4.5" />
            )}
            Khoá lại
          </Button>
        </div>

        {/* Feedback messages */}
        {confirmed === true && !error && (
          <div className="flex items-center gap-2.5 rounded-xl bg-emerald-500/8 border border-emerald-500/20 px-3.5 py-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
              Thiết bị xác nhận — {locked ? "chỗ đỗ đã khoá" : "chỗ đỗ đã mở"}
            </p>
          </div>
        )}

        {confirmed === false && !error && (
          <div className="flex items-center gap-2.5 rounded-xl bg-amber-500/8 border border-amber-500/20 px-3.5 py-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Lệnh đã gửi — đang chờ thiết bị phản hồi
            </p>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl bg-red-500/8 border border-red-500/20 px-3.5 py-2.5">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Usage hint */}
        <div className="rounded-xl bg-muted/30 border border-border/30 p-3 space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Hướng dẫn
          </p>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
            <div className="flex items-start gap-1.5">
              <Unlock className="w-3 h-3 mt-0.5 shrink-0 text-emerald-500" />
              <span>Mở khoá khi đến bãi để đỗ xe vào</span>
            </div>
            <div className="flex items-start gap-1.5">
              <Lock className="w-3 h-3 mt-0.5 shrink-0 text-amber-500" />
              <span>Khoá lại khi rời đi để bảo vệ chỗ</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

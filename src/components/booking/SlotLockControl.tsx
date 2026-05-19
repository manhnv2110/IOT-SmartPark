import { Lock, Unlock, Loader2, AlertCircle, Shield, CheckCircle2, AlertTriangle } from "lucide-react";
import { useSlotLock } from "@/hooks/useSlotLock";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SlotLockControlProps {
  bookingId: string;
  /** Whether the slot is currently locked (from sensor data) */
  initialLocked?: boolean;
  /** Compact mode for inline display */
  compact?: boolean;
}

/**
 * Lock/Unlock control for a parking slot.
 * Primary feature on the ticket page — replaces the QR check-in flow.
 */
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
      <div className="flex items-center gap-2">
        <Button
          variant={locked ? "default" : "outline"}
          size="sm"
          onClick={() => setLocked(!locked)}
          disabled={loading}
          className={cn(
            "gap-1.5 transition-all",
            locked
              ? "bg-reserved text-white hover:bg-reserved/90"
              : "border-available text-available hover:bg-available/10"
          )}
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : locked ? (
            <Lock className="w-3.5 h-3.5" />
          ) : (
            <Unlock className="w-3.5 h-3.5" />
          )}
          {locked ? "Đã khoá" : "Đã mở"}
        </Button>
        {confirmed === true && (
          <CheckCircle2 className="w-4 h-4 text-available" />
        )}
        {error && (
          <span className="text-[10px] text-destructive flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Lỗi
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-card shadow-ticket overflow-hidden">
      {/* Header */}
      <div
        className={cn(
          "px-6 py-4 transition-colors",
          locked
            ? "bg-reserved/10 border-b border-reserved/30"
            : "bg-available/10 border-b border-available/30"
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-11 h-11 rounded-2xl grid place-items-center transition-colors",
              locked
                ? "bg-reserved/20 text-reserved"
                : "bg-available/20 text-available"
            )}
          >
            {locked ? (
              <Lock className="w-5 h-5" />
            ) : (
              <Unlock className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-base text-foreground flex items-center gap-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              Điều khiển chỗ đỗ
            </p>
            <p
              className={cn(
                "text-xs mt-0.5 font-medium",
                locked ? "text-reserved" : "text-available"
              )}
            >
              {loading
                ? "Đang gửi lệnh tới thiết bị IoT..."
                : locked
                  ? "🔒 Đang khoá — bảo vệ chỗ đỗ"
                  : "🔓 Đang mở — sẵn sàng để đỗ xe"}
            </p>
          </div>
        </div>
      </div>

      {/* Lock/Unlock buttons */}
      <div className="p-5 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="lg"
            variant={!locked ? "default" : "outline"}
            className={cn(
              "h-14 gap-2 text-base",
              !locked &&
                "bg-available hover:bg-available/90 text-white border-available"
            )}
            onClick={() => setLocked(false)}
            disabled={loading || !locked}
          >
            {loading && locked ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Unlock className="w-5 h-5" />
            )}
            Mở khoá
          </Button>
          <Button
            size="lg"
            variant={locked ? "default" : "outline"}
            className={cn(
              "h-14 gap-2 text-base",
              locked &&
                "bg-reserved hover:bg-reserved/90 text-white border-reserved"
            )}
            onClick={() => setLocked(true)}
            disabled={loading || locked}
          >
            {loading && !locked ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Lock className="w-5 h-5" />
            )}
            Khoá lại
          </Button>
        </div>

        {/* Confirmation status */}
        {confirmed === true && !error && (
          <div className="flex items-center gap-2 rounded-lg bg-available/10 border border-available/30 p-3">
            <CheckCircle2 className="w-4 h-4 text-available shrink-0" />
            <p className="text-xs text-available font-medium">
              ✓ Thiết bị IoT đã xác nhận — {locked ? "chỗ đỗ đã khoá" : "chỗ đỗ đã mở"}
            </p>
          </div>
        )}

        {confirmed === false && !error && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-700">
              Lệnh đã gửi nhưng chưa xác nhận từ thiết bị. Kiểm tra lại sau vài giây.
            </p>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/30 p-3">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        <div className="rounded-xl bg-muted/40 p-3 text-[11px] text-muted-foreground space-y-1.5">
          <p className="flex items-start gap-1.5">
            <Unlock className="w-3 h-3 mt-0.5 shrink-0 text-available" />
            <span>
              <strong className="text-foreground">Mở khoá</strong> khi bạn đến
              bãi để xe có thể vào chỗ đỗ.
            </span>
          </p>
          <p className="flex items-start gap-1.5">
            <Lock className="w-3 h-3 mt-0.5 shrink-0 text-reserved" />
            <span>
              <strong className="text-foreground">Khoá lại</strong> khi rời đi
              để bảo vệ chỗ đỗ trong thời gian đặt.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

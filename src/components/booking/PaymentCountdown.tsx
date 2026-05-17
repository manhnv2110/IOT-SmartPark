import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useServerTime } from "@/hooks/useServerTime";

const TOTAL_MS = 10 * 60 * 1000;
const WARN_MS = 2 * 60 * 1000;
const DANGER_MS = 30 * 1000;

interface PaymentCountdownProps {
  expiresAt: string | null | undefined;
}

/**
 * `PaymentCountdown` — bộ đếm ngược thời hạn giữ chỗ.
 *
 * Đặc tính (R8.4 + R22.4):
 * - SSR-safe: lần render đầu cố định (`--:--`) → tránh hydration mismatch.
 * - Đồng bộ `useServerTime()` để bất biến `displayed ≤ expiresAt - now_server`.
 * - Cảnh báo a11y:
 *   - ≤ 120s: vùng `aria-live=polite` đọc thông điệp "Còn dưới 2 phút".
 *   - ≤ 30s : vùng `aria-live=assertive` đọc khẩn.
 *   - hết hạn: thông báo cuối cùng.
 *
 * Mỗi tick 1s. Khi tab hidden, giá trị vẫn cập nhật khi quay lại
 * (do tính bằng `now()` mỗi tick, không drift theo setInterval).
 */
export function PaymentCountdown({ expiresAt }: PaymentCountdownProps) {
  const { now, ready } = useServerTime();
  const [, setTick] = useState(0);
  const announcedRef = useRef<{ warn: boolean; danger: boolean; expired: boolean }>(
    { warn: false, danger: false, expired: false },
  );

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const target = expiresAt ? new Date(expiresAt).getTime() : 0;
  // Trên server-render đầu tiên (chưa ready), hiển thị placeholder.
  const remain = ready && target > 0 ? Math.max(0, target - now()) : 0;
  const showPlaceholder = !ready || !expiresAt;

  const pct = Math.min(100, Math.max(0, (remain / TOTAL_MS) * 100));
  const mm = Math.floor(remain / 60000);
  const ss = Math.floor((remain % 60000) / 1000);
  const expired = !showPlaceholder && remain <= 0;
  const danger = !expired && remain > 0 && remain <= DANGER_MS;
  const warning = !expired && !danger && remain > 0 && remain <= WARN_MS;

  // Latch announcements (chỉ đọc 1 lần mỗi mức)
  useEffect(() => {
    if (warning && !announcedRef.current.warn) announcedRef.current.warn = true;
    if (danger && !announcedRef.current.danger) announcedRef.current.danger = true;
    if (expired && !announcedRef.current.expired)
      announcedRef.current.expired = true;
  }, [warning, danger, expired]);

  const fillCls = expired || danger
    ? "bg-destructive"
    : warning
      ? "bg-[var(--reserved)]"
      : "gradient-pay";

  const textCls = expired || danger
    ? "text-destructive"
    : warning
      ? "text-[var(--reserved)]"
      : "text-foreground";

  const label = showPlaceholder
    ? "Đang đồng bộ thời gian"
    : expired
      ? "Đã hết hạn giữ chỗ"
      : "Đơn sẽ tự huỷ sau";

  const display = showPlaceholder
    ? "--:--"
    : `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-1)]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-caption">{label}</span>
        <span
          className={cn(
            "text-2xl font-semibold tabular-nums tracking-tight",
            textCls,
          )}
          aria-live="off"
        >
          {display}
        </span>
      </div>

      <div
        className="h-1.5 rounded-full bg-muted/70 overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        aria-label="Thời gian còn lại để thanh toán"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-1000 ease-linear",
            fillCls,
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* aria-live polite cho cảnh báo còn dưới 2 phút */}
      <div className="sr-only" aria-live="polite">
        {warning ? "Còn dưới 2 phút để thanh toán." : ""}
      </div>
      {/* aria-live assertive cho cảnh báo khẩn (≤30s) hoặc hết hạn */}
      <div className="sr-only" aria-live="assertive">
        {danger
          ? "Còn dưới 30 giây — vui lòng hoàn tất chuyển khoản."
          : expired
            ? "Phiên thanh toán đã hết hạn."
            : ""}
      </div>
    </div>
  );
}

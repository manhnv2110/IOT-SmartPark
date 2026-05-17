import { AlertTriangle, Flag, RefreshCcw, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * `ErrorState` — Async_Surface `error` State_Variant primitive.
 *
 * Hiển thị một thông điệp lỗi tập trung với:
 * - Icon cảnh báo trong vòng tròn `bg-destructive/10 text-destructive`
 * - Tiêu đề + mô tả tiếng Việt (mặc định an toàn nếu props bị bỏ trống)
 * - Mã lỗi rút gọn (vd. `NET-500`, `TIMEOUT`) hiển thị bằng Badge `font-mono`
 * - Hàng action: "Thử lại" (primary) / "Quay lại" (outline) / "Báo cáo lỗi" (ghost)
 *
 * Tailwind v4 token only (không hardcode HEX), respect dark mode qua các token
 * `destructive`, `muted-foreground`, `border-border`, `card`. Tất cả nút có
 * `aria-label` rõ ràng và `min-h-11` (44px) để đạt WCAG 2.2 AA target chạm.
 *
 * Mọi text user-facing hardcode tiếng Việt — task i18n catalog 3.x sẽ refactor sau.
 *
 * _Requirements: 3.4, 17.7, 19.6_
 */

export interface ErrorStateProps {
  /** Tiêu đề chính. Mặc định "Đã có lỗi xảy ra". */
  title?: string;
  /** Mô tả chi tiết. Mặc định một câu tiếng Việt thân thiện. */
  description?: string;
  /** Mã lỗi rút gọn để hỗ trợ debug, vd `NET-500`, `TIMEOUT`. */
  errorCode?: string;
  /** Callback khi nhấn "Thử lại". Nếu không truyền, nút không hiện. */
  onRetry?: () => void;
  /** Callback khi nhấn "Quay lại". Nếu không truyền, nút không hiện. */
  onBack?: () => void;
  /** Bật nút "Báo cáo lỗi". Mặc định `false`. */
  reportable?: boolean;
  /**
   * Callback khi nhấn "Báo cáo lỗi". Khi `reportable=true` và không truyền,
   * sẽ gọi một no-op (telemetry sink sẽ được wire ở task A.x — Observability).
   */
  onReport?: () => void;
  /** Class bổ sung cho container ngoài. */
  className?: string;
}

const DEFAULT_TITLE = "Đã có lỗi xảy ra";
const DEFAULT_DESCRIPTION =
  "Chúng tôi không thể tải nội dung này. Vui lòng thử lại sau ít phút.";

/** No-op fallback cho `onReport` — sẽ được nối vào telemetry sink sau. */
function defaultReportHandler(): void {
  if (import.meta.env?.DEV) {
    // eslint-disable-next-line no-console
    console.info(
      "[ErrorState] Báo cáo lỗi được nhấn — telemetry sink chưa được wire.",
    );
  }
}

export function ErrorState({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  errorCode,
  onRetry,
  onBack,
  reportable = false,
  onReport,
  className,
}: ErrorStateProps) {
  const handleReport = onReport ?? defaultReportHandler;
  const hasAnyAction = Boolean(onRetry || onBack || reportable);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center text-center px-6 py-12 rounded-2xl glass border border-border",
        className,
      )}
      data-state="error"
    >
      <div
        aria-hidden="true"
        className="size-16 rounded-2xl grid place-items-center mb-4 bg-destructive/10 text-destructive"
      >
        <AlertTriangle className="size-8" strokeWidth={1.75} />
      </div>

      <h3 className="text-lg font-medium text-foreground text-balance">
        {title}
      </h3>

      {description ? (
        <p className="mt-1.5 text-sm text-muted-foreground max-w-sm text-pretty">
          {description}
        </p>
      ) : null}

      {errorCode ? (
        <Badge
          variant="outline"
          className="mt-3 font-mono text-xs tracking-wide"
          aria-label={`Mã lỗi ${errorCode}`}
        >
          {errorCode}
        </Badge>
      ) : null}

      {hasAnyAction ? (
        <div className="mt-5 flex w-full max-w-sm flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-center">
          {onRetry ? (
            <Button
              type="button"
              variant="default"
              onClick={onRetry}
              aria-label="Thử lại tải nội dung"
              className="min-h-11"
            >
              <RefreshCcw aria-hidden="true" />
              Thử lại
            </Button>
          ) : null}

          {onBack ? (
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              aria-label="Quay lại trang trước"
              className="min-h-11"
            >
              <ArrowLeft aria-hidden="true" />
              Quay lại
            </Button>
          ) : null}

          {reportable ? (
            <Button
              type="button"
              variant="ghost"
              onClick={handleReport}
              aria-label="Báo cáo lỗi này cho đội ngũ"
              className="min-h-11"
            >
              <Flag aria-hidden="true" />
              Báo cáo lỗi
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

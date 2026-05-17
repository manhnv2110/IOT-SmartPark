import { type ReactNode, useEffect, useState } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { ErrorState } from "@/components/ui/error-state";

/**
 * `<AsyncSurface>` — Async_Surface State_Variant guard.
 *
 * Render đúng MỘT trong bốn variant tại mỗi thời điểm:
 *   `data` | `skeleton` | `empty` | `error`
 *
 * Logic chọn variant:
 *   isLoading || (no data + isFetching) → skeleton
 *   isError                              → error
 *   isEmpty(data)                        → empty
 *   default                              → data(data)
 *
 * Bất biến (R3.1): tại mỗi thời điểm component này render duy nhất một
 * trong bốn nhánh — điều này được bảo đảm bằng cấu trúc `if/else`,
 * không có khả năng overlap.
 *
 * Skeleton timeout (R3.2): nếu trạng thái `skeleton` kéo dài quá
 * `skeletonTimeoutMs` (mặc định 8000), chuyển sang `error` với thông điệp
 * "Đang tải lâu hơn dự kiến" và nút "Thử lại" gọi `refetch()`.
 *
 * Cách dùng:
 *
 *   <AsyncSurface
 *     query={query}
 *     skeleton={<LotCardSkeleton count={6} />}
 *     empty={<EmptyState title="Chưa có bãi nào" />}
 *     isEmpty={(d) => d.length === 0}
 *   >
 *     {(data) => <LotGrid lots={data} />}
 *   </AsyncSurface>
 */
export interface AsyncSurfaceProps<T> {
  query: UseQueryResult<T, unknown>;
  /** Skeleton hiển thị khi đang load lần đầu. */
  skeleton: ReactNode;
  /** Render khi `isEmpty(data) === true`. */
  empty?: ReactNode;
  /**
   * Tuỳ biến error UI. Nếu không truyền, dùng `<ErrorState>` mặc định.
   * Nhận `(err, retry)`.
   */
  error?: (err: unknown, retry: () => void) => ReactNode;
  /** Predicate xác định data rỗng. Mặc định: `false`. */
  isEmpty?: (data: T) => boolean;
  /** Render data. */
  children: (data: T) => ReactNode;
  /** Skeleton timeout, ms. Mặc định 8000. */
  skeletonTimeoutMs?: number;
  /** Tuỳ chỉnh thông điệp lỗi mặc định. */
  errorTitle?: string;
}

export function AsyncSurface<T>({
  query,
  skeleton,
  empty,
  error,
  isEmpty,
  children,
  skeletonTimeoutMs = 8000,
  errorTitle = "Đã có lỗi xảy ra",
}: AsyncSurfaceProps<T>): ReactNode {
  const { data, isLoading, isError, error: queryError, refetch, isFetching } = query;

  // R3.2: skeleton timeout
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (!isLoading) {
      setTimedOut(false);
      return;
    }
    const t = setTimeout(() => setTimedOut(true), skeletonTimeoutMs);
    return () => clearTimeout(t);
  }, [isLoading, skeletonTimeoutMs]);

  const retry = () => {
    setTimedOut(false);
    refetch();
  };

  // ── 1. error
  if (isError || (timedOut && isLoading)) {
    if (error) return error(queryError, retry);
    const msg =
      timedOut && isLoading
        ? "Đang tải lâu hơn dự kiến — vui lòng thử lại."
        : queryError instanceof Error
          ? queryError.message
          : undefined;
    return (
      <ErrorState title={errorTitle} description={msg} onRetry={retry} />
    );
  }

  // ── 2. skeleton (loading lần đầu, hoặc đang fetch mà chưa có data)
  if (isLoading || (data === undefined && isFetching)) {
    return skeleton;
  }

  if (data === undefined) {
    // safety fallback — không nên xảy ra
    return skeleton;
  }

  // ── 3. empty
  if (empty && isEmpty?.(data)) {
    return empty;
  }

  // ── 4. data
  return children(data);
}

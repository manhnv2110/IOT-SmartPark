/**
 * Typed wrapper trên `sonner` — Toast_Service.
 *
 * Mục tiêu: thống nhất tone tiếng Việt + tự kèm nút "Thử lại" cho lỗi
 * có thể retry. Mọi nơi gọi qua `toast` từ module này, không gọi trực tiếp
 * `sonner` để dễ đổi sink sau này.
 */

import { toast as sonner } from "sonner";

interface BaseOpts {
  description?: string;
  duration?: number;
}

interface ErrorOpts extends BaseOpts {
  /** Khi truyền, hiển thị nút "Thử lại" gọi callback. */
  onRetry?: () => void;
}

function success(message: string, opts?: BaseOpts) {
  return sonner.success(message, opts);
}

function error(message: string, opts?: ErrorOpts) {
  return sonner.error(message, {
    description: opts?.description,
    duration: opts?.duration,
    action: opts?.onRetry
      ? { label: "Thử lại", onClick: opts.onRetry }
      : undefined,
  });
}

function info(message: string, opts?: BaseOpts) {
  return sonner.info(message, opts);
}

function warning(message: string, opts?: BaseOpts) {
  return sonner.warning(message, opts);
}

function loading(message: string) {
  return sonner.loading(message);
}

function dismiss(id?: string | number) {
  return sonner.dismiss(id);
}

/** Re-export để legacy `import { toast } from "sonner"` di cư dần dần. */
export const toast = {
  success,
  error,
  info,
  warning,
  loading,
  dismiss,
  message: sonner.message,
};

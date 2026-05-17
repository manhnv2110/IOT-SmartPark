/**
 * Lightweight i18n / format helpers — vi-VN by default.
 *
 * MVP scope: chỉ wrap `Intl` + `date-fns` để mọi nơi dùng cùng một
 * format số / tiền / ngày. Không tải catalog text — task i18n đầy đủ
 * thuộc Phase A.3 sẽ làm sau.
 */

import { formatDistanceToNow as fdn, format as dfFormat } from "date-fns";
import { vi } from "date-fns/locale";

const VND = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const NUM = new Intl.NumberFormat("vi-VN");

export function formatVND(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return VND.format(Math.round(n));
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return NUM.format(n);
}

export function formatDateTime(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return dfFormat(date, "HH:mm · dd/MM/yyyy", { locale: vi });
}

export function formatTime(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return dfFormat(date, "HH:mm:ss", { locale: vi });
}

export function formatRelative(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return fdn(date, { addSuffix: true, locale: vi });
}

export function formatPercent(rate: number | null | undefined): string {
  if (rate == null || !Number.isFinite(rate)) return "—";
  return `${Math.round(rate * 100)}%`;
}

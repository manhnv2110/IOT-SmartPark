/**
 * SePay configuration & QR helpers (client-safe).
 * Tài khoản nhận tiền: Vietinbank — Nguyen Van Manh — 198852588888
 */
export const SEPAY_CONFIG = {
  bank: "Vietinbank" as const,
  accountNumber: "198852588888",
  accountHolder: "NGUYEN VAN MANH",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidBookingId(id: unknown): id is string {
  return typeof id === "string" && UUID_RE.test(id);
}

/** Mã giao dịch (memo chuyển khoản) cho 1 booking. Throw nếu id sai. */
export function bookingPaymentRef(bookingId: string): string {
  if (!isValidBookingId(bookingId)) {
    throw new Error("Mã đơn không hợp lệ");
  }
  return "BK" + bookingId.replace(/-/g, "").slice(0, 10).toUpperCase();
}

/** Tạo URL ảnh QR VietQR động qua SePay (không cần API key) */
export function sepayQrUrl(opts: { amount: number; bookingId: string }): string {
  if (!isValidBookingId(opts.bookingId)) throw new Error("Mã đơn không hợp lệ");
  if (!Number.isFinite(opts.amount) || opts.amount <= 0) {
    throw new Error("Số tiền không hợp lệ");
  }
  const params = new URLSearchParams({
    acc: SEPAY_CONFIG.accountNumber,
    bank: SEPAY_CONFIG.bank,
    amount: String(Math.round(opts.amount)),
    des: bookingPaymentRef(opts.bookingId),
    template: "compact",
  });
  return `https://qr.sepay.vn/img?${params.toString()}`;
}

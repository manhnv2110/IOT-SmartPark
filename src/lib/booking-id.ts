/**
 * Booking ID validation — client-safe.
 * Tách ra khỏi payment provider để UI không phụ thuộc lib provider cụ thể.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidBookingId(id: unknown): id is string {
  return typeof id === "string" && UUID_RE.test(id);
}

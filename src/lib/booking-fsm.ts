/**
 * Booking finite-state machine — pure module.
 *
 * States:
 *   pending → paid | expired | cancelled
 *   paid → active | cancelled
 *   active → completed
 *   expired / cancelled / completed are terminal.
 *
 * Used by: BookingStepper to derive `currentStep`, server fns to gate transitions.
 */

export type BookingStatus =
  | "pending"
  | "paid"
  | "active"
  | "checked_in"
  | "completed"
  | "expired"
  | "cancelled";

export type BookingStep = "new" | "pay" | "ticket";

const ALLOWED: Record<BookingStatus, BookingStatus[]> = {
  pending: ["paid", "expired", "cancelled"],
  paid: ["active", "checked_in", "cancelled", "completed"],
  active: ["completed", "checked_in"],
  checked_in: ["completed"],
  completed: [],
  expired: [],
  cancelled: [],
};

const TERMINAL: ReadonlySet<BookingStatus> = new Set([
  "completed",
  "expired",
  "cancelled",
]);

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  if (from === to) return true;
  return ALLOWED[from]?.includes(to) ?? false;
}

export function isTerminal(s: BookingStatus): boolean {
  return TERMINAL.has(s);
}

export function isPaidLike(s: BookingStatus): boolean {
  return s === "paid" || s === "active" || s === "checked_in" || s === "completed";
}

/**
 * Derive booking step from server state.
 * Used by BookingStepper instead of URL.
 *
 * - `pending`                              → "pay"
 * - `paid` / `active` / `checked_in` / `completed` → "ticket"
 * - `expired` / `cancelled`                → "pay" (last reached step before failure)
 */
export function statusToStep(s: BookingStatus | null | undefined): BookingStep {
  if (!s) return "new";
  if (s === "pending") return "pay";
  if (isPaidLike(s)) return "ticket";
  return "pay";
}

/**
 * `true` nếu trạng thái này là kết thúc thất bại (huỷ / hết hạn) —
 * UI có thể dùng để hiển thị stepper ở trạng thái error.
 */
export function isFailedTerminal(s: BookingStatus | null | undefined): boolean {
  return s === "cancelled" || s === "expired";
}

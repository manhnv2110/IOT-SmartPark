/**
 * Server function: đếm số booking đã thanh toán nhưng xe chưa vào bãi
 * (status = 'paid'), group by lot_device_id.
 *
 * Dùng để trừ khỏi số chỗ trống hiển thị trên UI — vì cảm biến IoT
 * chỉ biết xe đã vào (is_occupied), không biết có ai đã đặt chỗ đang
 * trên đường tới.
 *
 * Ví dụ: bãi có 10 slot, sensor nói 7 occupied → available = 3.
 * Nhưng có 2 booking "paid" chưa check-in → UI hiển thị available = 1.
 *
 * Chỉ đếm booking:
 * - status = 'paid' (đã thanh toán, chưa check-in)
 * - end_at > now() (chưa hết hạn)
 *
 * KHÔNG filter theo start_at — bất kỳ booking đã paid mà chưa check-in
 * đều phải trừ slot, kể cả đặt cho tương lai (vì user đã giữ chỗ).
 *
 * Không đếm:
 * - 'pending' (chưa thanh toán, có thể expire)
 * - 'active' / 'checked_in' (xe đã vào → sensor đã đếm rồi)
 * - 'completed' / 'cancelled' / 'expired' (terminal)
 *
 * IMPORTANT: Phải dùng supabaseAdmin (service_role) để bypass RLS.
 * RLS policy chỉ cho user xem booking của chính họ — nếu dùng anon
 * client thì query sẽ trả về 0 booking (gây bug số chỗ trống không đổi).
 */
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface BookingCountsResult {
  /** Map: lot_device_id → số booking "paid" chưa check-in. */
  counts: Record<string, number>;
  fetchedAt: string;
}

export const getActiveBookingCounts = createServerFn({ method: "GET" }).handler(
  async (): Promise<BookingCountsResult> => {
    const now = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("bookings")
      .select("lot_device_id")
      .eq("status", "paid")
      .gt("end_at", now);

    if (error) {
      console.error("[booking-counts] query error:", error.message);
      return { counts: {}, fetchedAt: now };
    }

    // Group by lot_device_id
    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      const id = row.lot_device_id;
      if (id) counts[id] = (counts[id] ?? 0) + 1;
    }

    return { counts, fetchedAt: now };
  },
);

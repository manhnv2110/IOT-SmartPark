import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { bookingPaymentRef } from "@/lib/sepay";

const HOLD_MINUTES = 10;

/** Giá / giờ (VND) */
const PRICE = { car: 15000, motorbike: 5000 } as const;

const CreateInput = z.object({
  lotDeviceId: z.string().min(1).max(120),
  lotName: z.string().min(1).max(200).optional(),
  slotIndex: z.number().int().nonnegative().optional(),
  plate: z.string().trim().min(2).max(20).regex(/^[A-Za-z0-9.\-\s]+$/),
  vehicleType: z.enum(["car", "motorbike"]),
  startAt: z.string(), // ISO
  endAt: z.string(),
});

function calcAmount(vt: "car" | "motorbike", startAt: string, endAt: string) {
  const ms = new Date(endAt).getTime() - new Date(startAt).getTime();
  const hours = Math.max(1, Math.ceil(ms / 3_600_000));
  return hours * PRICE[vt];
}

export const createBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => CreateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const startAt = new Date(data.startAt);
    const endAt = new Date(data.endAt);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      throw new Error("Thời gian không hợp lệ");
    }
    // Allow ±2 minutes clock skew
    if (startAt.getTime() < Date.now() - 2 * 60_000) {
      throw new Error("Giờ vào không được nằm trong quá khứ");
    }
    if (endAt.getTime() - startAt.getTime() < 30 * 60_000) {
      throw new Error("Thời gian gửi tối thiểu 30 phút");
    }

    const amount = calcAmount(data.vehicleType, data.startAt, data.endAt);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Không tính được số tiền");
    }
    const holdExpiresAt = new Date(Date.now() + HOLD_MINUTES * 60_000).toISOString();

    const { data: booking, error } = await supabase
      .from("bookings")
      .insert({
        user_id: userId,
        lot_device_id: data.lotDeviceId,
        lot_name: data.lotName ?? null,
        slot_index: data.slotIndex ?? null,
        plate: data.plate.toUpperCase(),
        vehicle_type: data.vehicleType,
        start_at: data.startAt,
        end_at: data.endAt,
        amount,
        status: "pending",
        hold_expires_at: holdExpiresAt,
      })
      .select("id, amount, hold_expires_at, status")
      .single();

    if (error || !booking) {
      throw new Error(error?.message ?? "Không thể tạo đơn đặt chỗ");
    }
    if (!booking.id || typeof booking.id !== "string") {
      throw new Error("Server không trả mã đơn hợp lệ");
    }

    if (data.slotIndex != null) {
      // Best-effort hold
      await supabase.from("slot_holds").insert({
        lot_device_id: data.lotDeviceId,
        slot_index: data.slotIndex,
        booking_id: booking.id,
        expires_at: holdExpiresAt,
      });
    }

    return {
      bookingId: booking.id as string,
      amount: booking.amount as number,
      paymentRef: bookingPaymentRef(booking.id),
      holdExpiresAt: booking.hold_expires_at as string,
    };
  });

const IdInput = z.object({ id: z.string().uuid({ message: "Mã đơn không hợp lệ" }) });

export const getBooking = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => IdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: booking, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!booking) throw new Error("Không tìm thấy đơn");
    return booking;
  });

export const cancelBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => IdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: updated, error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", data.id)
      .eq("user_id", userId)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!updated) {
      throw new Error(
        "Không thể huỷ — đơn đã được thanh toán hoặc đã ở trạng thái khác.",
      );
    }
    await supabase.from("slot_holds").delete().eq("booking_id", data.id);
    return { ok: true };
  });

export const listMyBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

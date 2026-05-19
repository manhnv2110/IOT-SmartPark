import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
      .select("id, lot_device_id, slot_index")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!updated) {
      throw new Error(
        "Không thể huỷ — đơn đã được thanh toán hoặc đã ở trạng thái khác.",
      );
    }
    await supabase.from("slot_holds").delete().eq("booking_id", data.id);

    // Lock the slot back when booking is cancelled (best-effort)
    if (updated.lot_device_id && updated.slot_index != null) {
      try {
        const { iotClient } = await import("@/lib/iot-api");
        const iotToken = process.env.IOT_ADMIN_TOKEN;
        if (iotToken) {
          const sensorData = await iotClient.getLatestValues(iotToken, updated.lot_device_id);
          const slot = sensorData[updated.slot_index];
          const slotNumber = slot?.slot_number ?? `A${updated.slot_index + 1}`;
          await iotClient.sendLockCommand(updated.lot_device_id, {
            slot_number: slotNumber,
            locked: true,
          });
        }
      } catch {
        // Non-blocking
      }
    }

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

/**
 * Toggle lock/unlock for a user's paid/active booking slot.
 * Only the booking owner can control the lock, and only for paid/active bookings.
 */
const ToggleLockInput = z.object({
  bookingId: z.string().uuid(),
  locked: z.boolean(),
});

export const toggleSlotLock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookingId: string; locked: boolean }) =>
    ToggleLockInput.parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Verify booking ownership and status
    const { data: booking, error } = await supabase
      .from("bookings")
      .select("id, lot_device_id, slot_index, status, start_at, end_at")
      .eq("id", data.bookingId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!booking) throw new Error("Không tìm thấy đơn đặt chỗ");

    // Only allow lock control for paid/active bookings
    if (booking.status !== "paid" && booking.status !== "active") {
      throw new Error("Chỉ có thể điều khiển khoá khi đơn đã thanh toán hoặc đang hoạt động");
    }

    // Check booking hasn't expired
    if (new Date(booking.end_at).getTime() < Date.now()) {
      throw new Error("Đơn đã hết hạn — không thể điều khiển khoá");
    }

    if (!booking.lot_device_id) {
      throw new Error("Đơn không có thông tin bãi đỗ");
    }

    // 2. Resolve slot_index → slot_number
    const { iotClient } = await import("@/lib/iot-api");
    const iotToken = process.env.IOT_ADMIN_TOKEN;
    if (!iotToken) throw new Error("Hệ thống IoT chưa được cấu hình");

    let slotNumber: string;
    try {
      const sensorData = await iotClient.getLatestValues(iotToken, booking.lot_device_id);
      if (booking.slot_index != null && sensorData[booking.slot_index]) {
        slotNumber = sensorData[booking.slot_index].slot_number;
      } else if (booking.slot_index != null) {
        slotNumber = `A${booking.slot_index + 1}`;
      } else {
        // No specific slot — use first available slot from sensor data
        slotNumber = sensorData[0]?.slot_number ?? "A1";
      }
    } catch {
      // Fallback to computed slot number
      slotNumber = booking.slot_index != null ? `A${booking.slot_index + 1}` : "A1";
    }

    // 3. Send lock command to IoT device
    try {
      await iotClient.sendLockCommand(booking.lot_device_id, {
        slot_number: slotNumber,
        locked: data.locked,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định";
      throw new Error(`Không thể gửi lệnh ${data.locked ? "khoá" : "mở khoá"}: ${msg}`);
    }

    // 4. Verify: read back sensor data to confirm device executed the command
    let confirmed = false;
    try {
      // Small delay to let the device process the command
      await new Promise((r) => setTimeout(r, 800));
      const verifyData = await iotClient.getLatestValues(iotToken, booking.lot_device_id);
      const targetSlot = verifyData.find((s) => s.slot_number === slotNumber);
      if (targetSlot && targetSlot.locked === data.locked) {
        confirmed = true;
      }
    } catch {
      // Verification failed but command was sent — report as unconfirmed
    }

    return {
      ok: true,
      locked: data.locked,
      confirmed,
      slotNumber,
      deviceId: booking.lot_device_id,
    };
  });

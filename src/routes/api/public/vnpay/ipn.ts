import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyVnpaySignature, VNPAY_RESPONSE_CODE } from "@/lib/vnpay";

/**
 * VNPay IPN (Instant Payment Notification).
 *
 * VNPay gọi GET tới endpoint này sau khi user thanh toán xong (kể cả nếu user
 * tắt browser trước khi return). Đây là source-of-truth để confirm booking.
 *
 * Đăng ký URL trong dashboard sandbox: https://sandbox.vnpayment.vn/merchantv2/
 *
 * Response format VNPay yêu cầu (PHẢI là JSON):
 *   { RspCode: "00", Message: "Confirm Success" }
 *   { RspCode: "01", Message: "Order not found" }
 *   { RspCode: "02", Message: "Order already confirmed" }
 *   { RspCode: "04", Message: "Invalid amount" }
 *   { RspCode: "97", Message: "Invalid signature" }
 *   { RspCode: "99", Message: "Unknown error" }
 */

function ticket6(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function handle(query: Record<string, string>) {
  // 1. Verify HMAC.
  const { valid, data } = await verifyVnpaySignature(query);
  if (!valid) {
    return { RspCode: "97", Message: "Invalid signature" };
  }

  const txnRef = data.vnp_TxnRef;
  const responseCode = data.vnp_ResponseCode;
  const transactionStatus = data.vnp_TransactionStatus;
  const amountStr = data.vnp_Amount;
  const vnpTransactionNo = data.vnp_TransactionNo;

  if (!txnRef) {
    return { RspCode: "01", Message: "Missing TxnRef" };
  }

  // 2. Lookup payment.
  const { data: payment } = await supabaseAdmin
    .from("payments")
    .select("id, booking_id, amount, provider, raw_payload")
    .eq("id", txnRef)
    .eq("provider", "vnpay")
    .maybeSingle();

  if (!payment) {
    return { RspCode: "01", Message: "Order not found" };
  }

  // 3. Verify amount (VNPay nhân 100).
  const expectedAmount = payment.amount * 100;
  if (Number(amountStr) !== expectedAmount) {
    return { RspCode: "04", Message: "Invalid amount" };
  }

  // 4. Lookup booking.
  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("id, status, ticket_code, amount")
    .eq("id", payment.booking_id)
    .maybeSingle();
  if (!booking) {
    return { RspCode: "01", Message: "Booking not found" };
  }

  // 5. Idempotent: nếu booking đã paid → 02.
  if (booking.status === "paid" || booking.status === "active") {
    // Vẫn lưu raw_payload nếu chưa có để audit IPN trùng.
    if (!payment.raw_payload) {
      await supabaseAdmin
        .from("payments")
        .update({ raw_payload: data as Record<string, string> })
        .eq("id", payment.id);
    }
    return { RspCode: "02", Message: "Order already confirmed" };
  }

  // 6. Chỉ confirm khi cả responseCode=00 và transactionStatus=00.
  const success =
    responseCode === VNPAY_RESPONSE_CODE.SUCCESS &&
    transactionStatus === VNPAY_RESPONSE_CODE.SUCCESS;

  if (!success) {
    // Lưu raw để audit, không update booking.
    await supabaseAdmin
      .from("payments")
      .update({
        raw_payload: data as Record<string, string>,
        provider_tx_id: vnpTransactionNo || payment.id,
      })
      .eq("id", payment.id);
    return { RspCode: "00", Message: "Confirm Success" }; // VNPay vẫn cần 00 để không retry
  }

  // 7. Update booking → paid (chỉ khi đang pending).
  const code = ticket6();
  const { data: updated, error: updErr } = await supabaseAdmin
    .from("bookings")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      ticket_code: code,
    })
    .eq("id", booking.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (updErr) {
    return { RspCode: "99", Message: "Update booking failed" };
  }

  // 8. Update payment record (idempotent).
  await supabaseAdmin
    .from("payments")
    .update({
      raw_payload: data as Record<string, string>,
      provider_tx_id: vnpTransactionNo || payment.id,
      received_at: new Date().toISOString(),
    })
    .eq("id", payment.id);

  // 9. Cleanup hold.
  await supabaseAdmin.from("slot_holds").delete().eq("booking_id", booking.id);

  return {
    RspCode: "00",
    Message: updated ? "Confirm Success" : "Order already confirmed",
  };
}

export const Route = createFileRoute("/api/public/vnpay/ipn")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const query: Record<string, string> = {};
        for (const [k, v] of url.searchParams.entries()) query[k] = v;

        try {
          const body = await handle(query);
          return Response.json(body);
        } catch (err) {
          console.error("[vnpay-ipn] error", err);
          return Response.json({ RspCode: "99", Message: "Unknown error" });
        }
      },
      // Một số setup VNPay POST URL-encoded body — support luôn.
      POST: async ({ request }) => {
        const text = await request.text();
        const params = new URLSearchParams(text);
        const query: Record<string, string> = {};
        for (const [k, v] of params.entries()) query[k] = v;
        try {
          const body = await handle(query);
          return Response.json(body);
        } catch (err) {
          console.error("[vnpay-ipn] error", err);
          return Response.json({ RspCode: "99", Message: "Unknown error" });
        }
      },
    },
  },
});

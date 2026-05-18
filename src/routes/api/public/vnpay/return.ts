import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyVnpaySignature, VNPAY_RESPONSE_CODE } from "@/lib/vnpay";

/**
 * VNPay Return URL — endpoint browser được redirect về sau khi thanh toán.
 *
 * KHÔNG phải nguồn xác nhận chính (đó là IPN). Endpoint này chỉ:
 *   1. Verify HMAC để chống user tự gõ URL fake.
 *   2. Lookup booking + redirect về trang `/booking/$id/pay` hoặc `/ticket`.
 *
 * UI ở `/booking/$id/pay` đã polling booking status, nên IPN confirm xong là
 * trang sẽ tự nhảy sang ticket.
 */

export const Route = createFileRoute("/api/public/vnpay/return")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const query: Record<string, string> = {};
        for (const [k, v] of url.searchParams.entries()) query[k] = v;

        const { valid, data } = await verifyVnpaySignature(query);
        const txnRef = data.vnp_TxnRef ?? "";
        const code = data.vnp_ResponseCode ?? "";

        if (!valid) {
          // Redirect về trang lots với thông báo lỗi.
          throw redirect({
            to: "/lots",
            search: { vnp_error: "invalid_signature" } as never,
          });
        }

        if (!txnRef) {
          throw redirect({ to: "/lots" });
        }

        // Lookup payment → booking.
        const { data: payment } = await supabaseAdmin
          .from("payments")
          .select("booking_id")
          .eq("id", txnRef)
          .maybeSingle();

        if (!payment?.booking_id) {
          throw redirect({ to: "/lots" });
        }

        // Redirect về trang pay, polling sẽ tự update khi IPN xong.
        // Truyền `vnp_code` để UI có thể hiển thị toast nếu cần.
        const status =
          code === VNPAY_RESPONSE_CODE.SUCCESS ? "success" : "failed";

        const target = `/booking/${payment.booking_id}/pay?vnp_status=${status}&vnp_code=${code}`;
        return new Response(null, {
          status: 302,
          headers: { Location: target },
        });
      },
    },
  },
});

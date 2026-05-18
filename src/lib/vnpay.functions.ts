/**
 * VNPay server functions (gọi từ client qua TanStack Start RPC).
 *
 * Chỉ tạo payment URL — verify chạy ở route /api/public/vnpay/{ipn,return}.
 */

import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { buildPaymentUrl } from "@/lib/vnpay";

const Input = z.object({
  bookingId: z.string().uuid(),
  /** Optional bank code: NCB, VNBANK, INTCARD, ... — để rỗng cho VNPay tự show */
  bankCode: z.string().optional(),
  /** "vn" | "en" */
  locale: z.enum(["vn", "en"]).optional(),
});

/** Lấy IP client từ header (Cloudflare Workers / proxy / dev). */
function clientIp(): string {
  try {
    const req = getRequest();
    const h = req?.headers;
    if (!h) return "127.0.0.1";
    const cf = h.get("cf-connecting-ip");
    if (cf) return cf;
    const xff = h.get("x-forwarded-for");
    if (xff) return xff.split(",")[0].trim();
    const real = h.get("x-real-ip");
    if (real) return real;
    return "127.0.0.1";
  } catch {
    return "127.0.0.1";
  }
}

/**
 * Lấy origin (scheme + host) từ request hiện tại để build returnUrl chuẩn xác.
 * Thứ tự ưu tiên:
 *   1. Header `origin` / `referer` (browser thường có).
 *   2. `x-forwarded-host` + `x-forwarded-proto` (proxy / Cloudflare).
 *   3. URL của request (cuối cùng).
 *   4. Env VNPAY_RETURN_URL nếu set.
 */
function deriveOrigin(): string | null {
  try {
    const req = getRequest();
    if (!req) return null;
    const h = req.headers;

    const origin = h.get("origin");
    if (origin && /^https?:\/\//.test(origin)) return origin;

    const referer = h.get("referer");
    if (referer) {
      try {
        const u = new URL(referer);
        return `${u.protocol}//${u.host}`;
      } catch {
        // ignore
      }
    }

    const xfHost = h.get("x-forwarded-host");
    const xfProto = h.get("x-forwarded-proto");
    if (xfHost) {
      const proto = xfProto ?? "https";
      return `${proto}://${xfHost}`;
    }

    const host = h.get("host");
    if (host) {
      const proto = host.includes("localhost") || host.startsWith("127.")
        ? "http"
        : "https";
      return `${proto}://${host}`;
    }

    if (req.url) {
      const u = new URL(req.url);
      return `${u.protocol}//${u.host}`;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Tạo URL redirect VNPay cho 1 booking đang pending.
 *
 * Đồng thời insert (hoặc upsert) 1 row `payments` với:
 *   - id = vnp_TxnRef (uuid mới)
 *   - provider = 'vnpay'
 *   - provider_tx_id = id (cùng giá trị, để IPN match nhanh)
 *   - amount = booking.amount
 *
 * IPN verify sau đó sẽ update payment & booking.
 */
export const createVnpayPaymentUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (i: { bookingId: string; bankCode?: string; locale?: "vn" | "en" }) => Input.parse(i),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // 1. Lấy booking + check ownership.
    const { data: booking, error: bErr } = await supabaseAdmin
      .from("bookings")
      .select("id, amount, status, user_id, hold_expires_at, lot_name")
      .eq("id", data.bookingId)
      .eq("user_id", userId)
      .maybeSingle();

    if (bErr) throw new Error(bErr.message);
    if (!booking) throw new Error("Không tìm thấy đơn");
    if (booking.status !== "pending") {
      throw new Error("Đơn không ở trạng thái chờ thanh toán");
    }
    if (
      booking.hold_expires_at &&
      new Date(booking.hold_expires_at).getTime() < Date.now()
    ) {
      throw new Error("Đơn đã hết hạn giữ chỗ");
    }
    if (!booking.amount || booking.amount <= 0) {
      throw new Error("Số tiền không hợp lệ");
    }

    // 2. Reuse payment row đang chờ confirm (nếu user click "Thanh toán ngay"
    //    nhiều lần) để khỏi insert nhiều row rác. Một payment row chỉ được
    //    coi là "đang chờ" khi raw_payload còn null (chưa có IPN nào về).
    let txnRef: string;
    const { data: existing } = await supabaseAdmin
      .from("payments")
      .select("id")
      .eq("booking_id", booking.id)
      .eq("provider", "vnpay")
      .is("raw_payload", null)
      .order("received_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      txnRef = existing.id;
    } else {
      const { data: payment, error: pErr } = await supabaseAdmin
        .from("payments")
        .insert({
          booking_id: booking.id,
          amount: booking.amount,
          provider: "vnpay",
        })
        .select("id")
        .single();
      if (pErr || !payment) {
        throw new Error(pErr?.message ?? "Không tạo được payment record");
      }
      txnRef = payment.id;

      // Set provider_tx_id = payment.id (cùng giá trị) để vẫn UNIQUE.
      await supabaseAdmin
        .from("payments")
        .update({ provider_tx_id: payment.id })
        .eq("id", payment.id);
    }

    // 3. Build URL VNPay.
    //    Derive returnUrl từ origin của request hiện tại — quan trọng cho
    //    Cloudflare Workers / multi-env (local / staging / prod) để khỏi cần
    //    đổi env mỗi lần deploy.
    const origin = deriveOrigin();
    const returnUrl = origin
      ? `${origin}/api/public/vnpay/return`
      : process.env.VNPAY_RETURN_URL || undefined;

    const orderInfo = `Thanh toan ${booking.lot_name ?? "bai do"} - ${booking.id.slice(0, 8)}`;
    const paymentUrl = await buildPaymentUrl({
      txnRef,
      amount: booking.amount,
      orderInfo,
      orderType: "other",
      ipAddr: clientIp(),
      bankCode: data.bankCode,
      locale: data.locale ?? "vn",
      returnUrl,
    });

    return { paymentUrl, txnRef };
  });

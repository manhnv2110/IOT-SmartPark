import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createHmac } from "crypto";
import { z } from "zod";

/**
 * Webhook nhận thông báo chuyển khoản từ SePay.
 * Header: Authorization: Apikey <SEPAY_WEBHOOK_KEY>
 * Hoặc HMAC: X-SePay-Signature + X-SePay-Timestamp với cùng secret.
 * Body mẫu: https://docs.sepay.vn/tich-hop-webhooks.html
 */
const PayloadSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  gateway: z.string().optional(),
  transactionDate: z.union([z.string(), z.number()]).optional(),
  accountNumber: z.union([z.string(), z.number()]).optional(),
  subAccount: z.union([z.string(), z.number()]).nullable().optional(),
  code: z.union([z.string(), z.number()]).nullable().optional(),
  content: z.union([z.string(), z.number()]).optional().default(""),
  transferType: z.preprocess(
    (value) => String(value ?? "in").toLowerCase(),
    z.enum(["in", "out"]),
  ),
  description: z.union([z.string(), z.number()]).optional(),
  transferAmount: z.coerce.number().int().positive(),
  referenceCode: z.string().optional(),
});

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let res = 0;
  for (let i = 0; i < a.length; i++) res |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return res === 0;
}

function isAuthorized(request: Request, rawBody: string, secret: string) {
  const auth = request.headers.get("authorization") ?? "";
  const presented = auth.replace(/^Apikey\s+/i, "").trim();
  if (presented && timingSafeEqual(presented, secret)) return true;

  const signature = request.headers.get("x-sepay-signature") ?? "";
  const timestamp = request.headers.get("x-sepay-timestamp") ?? "";
  const unix = Number(timestamp);
  if (!signature || !timestamp || !Number.isFinite(unix)) return false;
  if (Math.abs(Date.now() / 1000 - unix) > 5 * 60) return false;

  const expected =
    "sha256=" + createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  return timingSafeEqual(signature, expected);
}

function extractRef(value: unknown): string | null {
  // Tìm pattern BK + 10 ký tự hex (mã booking ngắn)
  const text = String(value ?? "").toUpperCase().replace(/\s+/g, "");
  const m = text.match(/BK[0-9A-F]{10}/);
  return m ? m[0] : null;
}

function ticket6(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const Route = createFileRoute("/api/public/sepay/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.SEPAY_WEBHOOK_KEY;
        if (!apiKey) {
          return new Response(JSON.stringify({ success: false, error: "Missing SEPAY_WEBHOOK_KEY" }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
        const rawBody = await request.text();
        if (!isAuthorized(request, rawBody, apiKey)) {
          return new Response("Unauthorized", { status: 401 });
        }

        let payload: z.infer<typeof PayloadSchema>;
        try {
          const json = JSON.parse(rawBody);
          payload = PayloadSchema.parse(json);
        } catch (e) {
          // Trả 200 để SePay không retry vô hạn với payload hỏng
          return Response.json({ success: false, error: "Invalid payload" });
        }

        if (payload.transferType !== "in") {
          return Response.json({ success: true, ignored: "not inbound" });
        }

        // Idempotent
        const { data: existing } = await supabaseAdmin
          .from("payments")
          .select("id")
          .eq("sepay_tx_id", payload.id)
          .maybeSingle();
        if (existing) {
          return Response.json({ success: true, duplicate: true });
        }

        const ref =
          extractRef(payload.code) ||
          extractRef(payload.content) ||
          extractRef(payload.description);

        if (!ref) {
          // Vẫn lưu payment để đối soát thủ công
          await supabaseAdmin.from("payments").insert({
            booking_id: "00000000-0000-0000-0000-000000000000",
            amount: payload.transferAmount,
            sepay_tx_id: payload.id,
            raw_payload: payload as any,
          }).select().maybeSingle();
          return Response.json({ success: false, error: "No booking ref found" });
        }

        const refHex = ref.slice(2).toLowerCase();
        // Ghép lại UUID prefix → tìm booking pending
        const { data: candidates, error: qErr } = await supabaseAdmin
          .from("bookings")
          .select("id, amount, status, user_id")
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(200);
        if (qErr) {
          return Response.json({ success: false, error: qErr.message });
        }

        const booking = (candidates ?? []).find(
          (b) => b.id.replace(/-/g, "").slice(0, 10).toLowerCase() === refHex,
        );
        if (!booking) {
          return Response.json({ success: false, error: "Booking not found for ref " + ref });
        }

        if (payload.transferAmount < booking.amount) {
          await supabaseAdmin.from("payments").insert({
            booking_id: booking.id,
            amount: payload.transferAmount,
            sepay_tx_id: payload.id,
            raw_payload: payload as any,
          });
          return Response.json({ success: false, error: "Amount insufficient" });
        }

        // Sinh ticket_code 6 số (cố gắng unique, không dùng constraint)
        const code = ticket6();
        const { error: updErr } = await supabaseAdmin
          .from("bookings")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            ticket_code: code,
          })
          .eq("id", booking.id);
        if (updErr) {
          return Response.json({ success: false, error: updErr.message });
        }

        await supabaseAdmin.from("payments").insert({
          booking_id: booking.id,
          amount: payload.transferAmount,
          sepay_tx_id: payload.id,
          raw_payload: payload as any,
        });
        await supabaseAdmin.from("slot_holds").delete().eq("booking_id", booking.id);

        return Response.json({ success: true, bookingId: booking.id });
      },
    },
  },
});

/**
 * VNPay sandbox helpers — server only (uses Web Crypto, OK trên Cloudflare Workers).
 *
 * Docs: https://sandbox.vnpayment.vn/apis/docs/
 *
 * Flow:
 *   1. App tạo `vnp_TxnRef` duy nhất (= payments.id).
 *   2. Build URL → user redirect sang VNPay sandbox cổng.
 *   3. User chọn ngân hàng demo → thanh toán xong:
 *      - VNPay POST IPN → /api/public/vnpay/ipn  (xác nhận booking → paid)
 *      - VNPay redirect Return URL → /api/public/vnpay/return  (chỉ hiển thị)
 *   4. Cả 2 endpoint phải verify HMAC-SHA512 với `vnp_HashSecret`.
 *
 * ENV cần set (sandbox demo của VNPay):
 *   VNPAY_TMN_CODE      = "TMN code" lấy ở merchant.vnpay.vn (sandbox)
 *   VNPAY_HASH_SECRET   = secret HMAC-SHA512
 *   VNPAY_PAYMENT_URL   = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
 *   VNPAY_RETURN_URL    = "<APP_URL>/api/public/vnpay/return"  (full URL public-accessible)
 *   VNPAY_IPN_URL       = "<APP_URL>/api/public/vnpay/ipn"     (đăng ký trong dashboard)
 */

const VERSION = "2.1.0";
const COMMAND = "pay";
const CURR_CODE = "VND";
const LOCALE = "vn";

export interface VnpayConfig {
  tmnCode: string;
  hashSecret: string;
  paymentUrl: string;
  /** Return URL fallback nếu không derive được từ request. Có thể rỗng khi đã derive. */
  returnUrl: string;
}

export function getVnpayConfig(): VnpayConfig {
  const tmnCode = process.env.VNPAY_TMN_CODE ?? "";
  const hashSecret = process.env.VNPAY_HASH_SECRET ?? "";
  const paymentUrl =
    process.env.VNPAY_PAYMENT_URL ??
    "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
  const returnUrl = process.env.VNPAY_RETURN_URL ?? "";

  if (!tmnCode) throw new Error("VNPAY_TMN_CODE chưa cấu hình");
  if (!hashSecret) throw new Error("VNPAY_HASH_SECRET chưa cấu hình");
  // returnUrl không bắt buộc nữa — server fn sẽ derive từ request origin.

  return { tmnCode, hashSecret, paymentUrl, returnUrl };
}

/** YYYYMMDDHHmmss theo Asia/Ho_Chi_Minh (UTC+7). */
export function vnpayDate(d: Date = new Date()): string {
  const t = new Date(d.getTime() + 7 * 3600 * 1000);
  const yyyy = t.getUTCFullYear();
  const mm = String(t.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(t.getUTCDate()).padStart(2, "0");
  const HH = String(t.getUTCHours()).padStart(2, "0");
  const MM = String(t.getUTCMinutes()).padStart(2, "0");
  const SS = String(t.getUTCSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}${HH}${MM}${SS}`;
}

/**
 * Build query trong format VNPay yêu cầu:
 *  - Sort key alphabetically.
 *  - URL-encode value, KHÔNG encode key.
 *  - Khoảng trắng → "+" (querystring style, KHÔNG phải %20).
 *  - Bỏ field rỗng.
 */
function buildSignedQuery(params: Record<string, string | number>): {
  signData: string;
  query: string;
  sortedEntries: [string, string][];
} {
  const sorted = Object.entries(params)
    .filter(([, v]) => v !== "" && v !== null && v !== undefined)
    .map(([k, v]) => [k, String(v)] as [string, string])
    .sort(([a], [b]) => a.localeCompare(b));

  const encoded = sorted
    .map(([k, v]) => `${k}=${encodeURIComponent(v).replace(/%20/g, "+")}`)
    .join("&");

  return { signData: encoded, query: encoded, sortedEntries: sorted };
}

/** HMAC-SHA512 hex (Web Crypto). */
async function hmacSha512Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface BuildPaymentUrlInput {
  /** Mã ref ngắn, duy nhất ≤ 100 ký tự. Dùng payments.id (uuid). */
  txnRef: string;
  /** VND, integer. */
  amount: number;
  /** Hiển thị trên cổng VNPay. */
  orderInfo: string;
  /** "billpayment" | "topup" | "fashion" ... — dùng "other" cho parking. */
  orderType?: string;
  /** IP người dùng (lấy từ header server). Sandbox cho phép "127.0.0.1". */
  ipAddr: string;
  /** Override returnUrl (option). */
  returnUrl?: string;
  /** Tham số bankCode (rỗng để VNPay tự hiển thị danh sách). */
  bankCode?: string;
  /** Locale "vn" / "en". Mặc định "vn". */
  locale?: string;
}

/** Build full URL redirect sang VNPay sandbox. */
export async function buildPaymentUrl(input: BuildPaymentUrlInput): Promise<string> {
  const cfg = getVnpayConfig();
  const returnUrl = input.returnUrl ?? cfg.returnUrl;
  if (!returnUrl) {
    throw new Error("returnUrl không có — truyền vào hoặc set VNPAY_RETURN_URL");
  }
  const params: Record<string, string | number> = {
    vnp_Version: VERSION,
    vnp_Command: COMMAND,
    vnp_TmnCode: cfg.tmnCode,
    vnp_Locale: input.locale ?? LOCALE,
    vnp_CurrCode: CURR_CODE,
    vnp_TxnRef: input.txnRef,
    vnp_OrderInfo: input.orderInfo,
    vnp_OrderType: input.orderType ?? "other",
    // VNPay yêu cầu amount × 100.
    vnp_Amount: Math.round(input.amount) * 100,
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: input.ipAddr || "127.0.0.1",
    vnp_CreateDate: vnpayDate(),
  };
  if (input.bankCode) params.vnp_BankCode = input.bankCode;

  const { signData, query } = buildSignedQuery(params);
  const secureHash = await hmacSha512Hex(cfg.hashSecret, signData);

  return `${cfg.paymentUrl}?${query}&vnp_SecureHashType=HmacSHA512&vnp_SecureHash=${secureHash}`;
}

/**
 * Verify HMAC trên params VNPay gửi về (Return URL hoặc IPN).
 * Loại bỏ `vnp_SecureHash` & `vnp_SecureHashType` trước khi sign.
 */
export async function verifyVnpaySignature(
  query: Record<string, string>,
): Promise<{ valid: boolean; data: Record<string, string> }> {
  const cfg = getVnpayConfig();
  const presented = query["vnp_SecureHash"] ?? "";
  if (!presented) return { valid: false, data: query };

  const filtered: Record<string, string> = {};
  for (const [k, v] of Object.entries(query)) {
    if (k === "vnp_SecureHash" || k === "vnp_SecureHashType") continue;
    if (v === undefined || v === null || v === "") continue;
    filtered[k] = v;
  }

  const { signData } = buildSignedQuery(filtered);
  const computed = await hmacSha512Hex(cfg.hashSecret, signData);

  // Timing-safe compare
  if (presented.length !== computed.length) return { valid: false, data: filtered };
  let diff = 0;
  for (let i = 0; i < presented.length; i++) {
    diff |=
      presented.toLowerCase().charCodeAt(i) ^ computed.charCodeAt(i);
  }
  return { valid: diff === 0, data: filtered };
}

/**
 * Mã response của VNPay. "00" = thành công.
 * Tham khảo: https://sandbox.vnpayment.vn/apis/docs/loi/
 */
export const VNPAY_RESPONSE_CODE = {
  SUCCESS: "00",
  PENDING: "07",
  CARD_NOT_ENROLLED: "09",
  AUTH_FAIL: "10",
  EXPIRED: "11",
  CARD_LOCKED: "12",
  WRONG_OTP: "13",
  USER_CANCELLED: "24",
  NOT_ENOUGH_FUND: "51",
  EXCEEDED_LIMIT: "65",
  BANK_MAINTENANCE: "75",
  WRONG_PIN_TOO_MANY: "79",
  OTHER: "99",
} as const;

export function describeVnpayCode(code: string): string {
  const map: Record<string, string> = {
    "00": "Giao dịch thành công",
    "07": "Trừ tiền thành công, giao dịch nghi ngờ",
    "09": "Thẻ chưa đăng ký InternetBanking",
    "10": "Xác thực thẻ sai quá 3 lần",
    "11": "Hết hạn chờ thanh toán",
    "12": "Thẻ bị khoá",
    "13": "Sai mật khẩu OTP",
    "24": "Khách huỷ giao dịch",
    "51": "Không đủ số dư",
    "65": "Vượt hạn mức giao dịch",
    "75": "Ngân hàng đang bảo trì",
    "79": "Nhập sai mật khẩu quá số lần cho phép",
    "99": "Lỗi khác",
  };
  return map[code] ?? `Lỗi không xác định (${code})`;
}

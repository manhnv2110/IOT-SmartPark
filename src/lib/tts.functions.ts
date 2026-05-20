/**
 * FPT.AI Text-to-Speech v5 — Vietnamese voice guidance.
 *
 * Vì sao FPT.AI thay vì Web Speech API hoặc Gemini TTS:
 * - Phát âm tiếng Việt CHUẨN (đúng dấu, ngữ điệu tự nhiên), nhiều giọng
 *   miền Bắc/Nam/Trung để chọn.
 * - Free tier ~5000 ký tự/ngày, đủ dùng cho turn-by-turn navigation.
 * - REST API đơn giản, key đặt trong env.
 *
 * API quirk:
 * - FPT trả về URL mp3 ASYNC: file chưa tồn tại ngay sau response, cần
 *   poll khoảng 1-10s tuỳ độ dài text.
 * - Server function này encapsulate flow: POST → poll → fetch mp3 →
 *   trả base64 cho client (tránh CORS khi <audio> load mp3 từ fpt.ai).
 *
 * Trade-off đã chấp nhận: latency 1-3s lần đầu/câu. Bù lại bằng cache
 * client-side (Map<text, blobUrl>) — câu lặp như "Bạn đã lệch đường"
 * chỉ tốn 1 round trip lần đầu.
 *
 * Voice options (xem docs FPT):
 * - leminh (nam, miền Bắc) — chọn mặc định, rõ ràng, hợp dẫn đường
 * - banmai (nữ, miền Bắc)
 * - lannhi (nữ, miền Nam)
 * - ngoclam (nữ, miền Trung)
 * - minhquang, giahuy, thuminh, myan, ...
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  text: z.string().min(1).max(5000),
  voice: z.string().default("leminh"),
  /** Tốc độ -3..3, mặc định 0 (chuẩn). */
  speed: z.number().int().min(-3).max(3).default(0),
});

export interface SpeechResponse {
  /** Base64-encoded mp3 audio. */
  audioBase64: string;
  /** "audio/mpeg" — FPT.AI luôn trả mp3. */
  mimeType: string;
}

const FPT_TTS_URL = "https://api.fpt.ai/hmi/tts/v5";
const POLL_DELAYS_MS = [800, 1200, 1500, 2000, 2500, 3000, 3500, 4000];

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Poll URL mp3 cho tới khi GET trả 200. Trả về Buffer của mp3 hoặc
 * throw nếu vượt timeout.
 */
async function fetchMp3WithPolling(url: string): Promise<ArrayBuffer> {
  for (const delay of POLL_DELAYS_MS) {
    await sleep(delay);
    try {
      const res = await fetch(url);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        // FPT đôi khi trả 200 với body nhỏ "Not found" giai đoạn đầu —
        // mp3 hợp lệ phải > 1KB.
        if (buf.byteLength > 1024) return buf;
      }
    } catch {
      // network blip — tiếp tục poll
    }
  }
  throw new Error("FPT.AI TTS: file mp3 không sẵn sàng sau khi poll");
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  // Tránh "Maximum call stack" với chunk lớn.
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  // Node side (server function chạy ở Node/edge) — Buffer.from nhanh hơn,
  // nhưng để portable dùng btoa fallback.
  if (typeof Buffer !== "undefined") {
    return Buffer.from(buf).toString("base64");
  }
  return btoa(bin);
}

export const synthesizeSpeech = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { text: string; voice?: string; speed?: number }) => Input.parse(input),
  )
  .handler(async ({ data }): Promise<SpeechResponse> => {
    const apiKey = process.env.FPT_AI_API_KEY;
    if (!apiKey) {
      throw new Error("Chưa cấu hình FPT_AI_API_KEY");
    }
    const voice = data.voice || process.env.FPT_AI_TTS_VOICE || "leminh";
    const speed = data.speed ?? Number(process.env.FPT_AI_TTS_SPEED ?? 0);

    // Step 1: POST text → nhận async URL
    const post = await fetch(FPT_TTS_URL, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        voice,
        speed: String(speed),
        // FPT yêu cầu Content-Type là plain text/raw bytes, không JSON.
        "Content-Type": "text/plain; charset=utf-8",
      },
      body: data.text,
    });

    if (!post.ok) {
      const txt = await post.text().catch(() => "");
      throw new Error(`FPT.AI TTS ${post.status}: ${txt.slice(0, 200)}`);
    }

    const json = (await post.json().catch(() => null)) as {
      error?: number;
      message?: string;
      async?: string;
    } | null;

    if (!json || json.error !== 0 || !json.async) {
      throw new Error(
        `FPT.AI TTS phản hồi không hợp lệ: ${json?.message ?? "missing async URL"}`,
      );
    }

    // Step 2: poll mp3 URL cho tới khi sẵn sàng
    const mp3Buf = await fetchMp3WithPolling(json.async);

    return {
      audioBase64: arrayBufferToBase64(mp3Buf),
      mimeType: "audio/mpeg",
    };
  });

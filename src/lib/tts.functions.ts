/**
 * FPT.AI Text-to-Speech v5 — Vietnamese voice guidance + chat.
 *
 * Vì sao FPT.AI:
 * - Phát âm tiếng Việt CHUẨN (đúng dấu, ngữ điệu tự nhiên).
 * - REST API đơn giản, key đặt trong env.
 *
 * API quirk:
 * - FPT trả về URL mp3 ASYNC: file chưa tồn tại ngay sau response, cần
 *   poll khoảng 1-15s tuỳ độ dài text. Câu chat dài (300+ ký tự) cần
 *   thời gian poll lâu hơn câu chỉ đường ngắn (50 ký tự).
 * - Server function này encapsulate flow: POST → poll → fetch mp3 →
 *   trả base64 cho client (tránh CORS khi <audio> load mp3 từ fpt.ai).
 *
 * Polling strategy:
 * - Tổng thời gian: tối đa 35 giây (đủ cho text 500+ ký tự).
 * - Delay tăng dần kiểu exponential-ish: bắt đầu 600ms, tăng dần.
 * - Validate file size > 1KB để loại trừ "Not found" body giai đoạn đầu.
 *
 * Trade-off đã chấp nhận: latency 1-3s cho câu ngắn, 3-10s cho câu
 * dài. Bù bằng cache client-side — câu lặp chỉ tốn 1 lần.
 *
 * Voice options (xem docs FPT):
 * - leminh (nam, miền Bắc) — chọn mặc định, rõ ràng, hợp dẫn đường + chat
 * - banmai (nữ, miền Bắc), lannhi (nữ, miền Nam), ngoclam (nữ, miền Trung)
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

/**
 * Sinh mảng delay (ms) phù hợp với độ dài text. Câu càng dài, FPT cần
 * càng nhiều thời gian render mp3. Tổng thời gian tối đa ~35s.
 */
function buildPollDelays(textLength: number): number[] {
  // Câu ngắn (< 100 ký tự) thường xong trong 1-3s
  if (textLength < 100) {
    return [600, 800, 1000, 1500, 2000, 2500, 3000];
  }
  // Câu vừa (100-300 ký tự)
  if (textLength < 300) {
    return [800, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500];
  }
  // Câu dài (300+ ký tự) — chat assistant
  return [1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000];
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchMp3WithPolling(url: string, textLength: number): Promise<ArrayBuffer> {
  const delays = buildPollDelays(textLength);
  let lastError: string | null = null;

  for (const delay of delays) {
    await sleep(delay);
    try {
      const res = await fetch(url);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        // FPT đôi khi trả 200 với body nhỏ "Not found" giai đoạn đầu —
        // mp3 hợp lệ luôn > 1KB.
        if (buf.byteLength > 1024) return buf;
      } else {
        lastError = `HTTP ${res.status}`;
      }
    } catch (e) {
      lastError = (e as Error)?.message ?? "fetch failed";
    }
  }
  throw new Error(
    `FPT.AI TTS: file mp3 không sẵn sàng sau ${delays.length} lần poll${lastError ? ` (${lastError})` : ""}`,
  );
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(buf).toString("base64");
  }
  const bytes = new Uint8Array(buf);
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
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
        "Content-Type": "text/plain; charset=utf-8",
      },
      body: data.text,
    });

    if (!post.ok) {
      const txt = await post.text().catch(() => "");
      throw new Error(`FPT.AI TTS POST ${post.status}: ${txt.slice(0, 200)}`);
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

    // Step 2: poll mp3 URL — scale theo độ dài text
    const mp3Buf = await fetchMp3WithPolling(json.async, data.text.length);

    return {
      audioBase64: arrayBufferToBase64(mp3Buf),
      mimeType: "audio/mpeg",
    };
  });

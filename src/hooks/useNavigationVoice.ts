import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { synthesizeSpeech } from "@/lib/tts.functions";

const STORAGE_KEY = "smartpark-voice-enabled";

/**
 * 0.1s silent mp3 — dùng để "unlock" Audio element trên Chrome.
 * Browser yêu cầu user gesture trước khi play. Nếu gọi play() async
 * sau gesture quá lâu (>5s), browser sẽ block với NotAllowedError.
 *
 * Trick: ngay khi user click → set src = silent → play() (vẫn còn
 * trong gesture window) → từ đó về sau audio element này được "unlock"
 * và có thể play() async bất kỳ lúc nào.
 */
const SILENT_MP3 =
  "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAACAAACvAA0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDRoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaP////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAQKAAAAAAAAAr8aBKfdAAAAAAAAAAAAAAAAAAAA//tQwAAACyAGTfgAACEpAQ4PAUAAJAAAQATEgvgGZsAAhk4qAEiYjwBkSDwBoT0aAvwAGRBgAfwAGSAQAfwAGSwOAfwAGShWAfwAGSpdAfwAGSt2AfwAGSt2AfwAGStmAhwBmRBwBowBmRBwBowBmRBwBowBmRBwBowBmRBwBowBmRBwBowAAQAAQAAA//tCxAOACjAFXfwAAAjVgKx/g6gAAAAAQEAA";

/**
 * Voice guidance hook — FPT.AI Text-to-Speech only, KHÔNG fallback Web
 * Speech để đảm bảo giọng đọc nhất quán "leminh".
 *
 * Audio unlock strategy:
 * - Caller phải gọi `unlock()` ngay trong user gesture (click submit,
 *   click mic, click chỉ đường) để prime Audio element.
 * - Sau unlock, `play()` async vẫn chạy được dù bao lâu sau gesture.
 *
 * Long text strategy:
 * - Split text dài (>200 ký tự) thành chunks theo dấu câu.
 * - Synth tuần tự (1 chunk ahead) để tránh rate limit FPT.
 * - Phát đan xen synth — chunk N play, chunk N+1 đang synth.
 *
 * Cache: Map<chunkText, blobUrl> — câu lặp chỉ tốn quota 1 lần.
 */
export interface NavigationVoice {
  available: boolean;
  enabled: boolean;
  engine: "cloud" | "none";
  speaking: boolean;
  loading: boolean;
  error: string | null;
  setEnabled: (v: boolean) => void;
  toggle: () => void;
  /** Phát text qua FPT.AI. Caller NÊN gọi `unlock()` trước trong gesture. */
  speak: (text: string, opts?: { force?: boolean; interrupt?: boolean }) => void;
  /**
   * Gọi NGAY trong user gesture (button click) để prime Audio element.
   * Idempotent — gọi nhiều lần cũng OK.
   */
  unlock: () => void;
  cancel: () => void;
}

function readInitialEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return true;
    return raw === "1";
  } catch {
    return true;
  }
}

function base64ToBlob(b64: string, mimeType: string): Blob {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

/**
 * Split text dài thành chunks ngắn theo dấu câu Việt + Anh.
 */
function splitIntoChunks(text: string, maxLen = 200): string[] {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return [trimmed];

  const sentences = trimmed
    .split(/(?<=[.!?;:…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let buf = "";
  for (const s of sentences) {
    if (s.length > maxLen) {
      if (buf) {
        chunks.push(buf);
        buf = "";
      }
      const sub = s.split(/(?<=,)\s+/).map((x) => x.trim()).filter(Boolean);
      let subBuf = "";
      for (const piece of sub) {
        if ((subBuf + " " + piece).trim().length > maxLen && subBuf) {
          chunks.push(subBuf);
          subBuf = piece;
        } else {
          subBuf = subBuf ? `${subBuf} ${piece}` : piece;
        }
      }
      if (subBuf) chunks.push(subBuf);
      continue;
    }

    if ((buf + " " + s).trim().length > maxLen && buf) {
      chunks.push(buf);
      buf = s;
    } else {
      buf = buf ? `${buf} ${s}` : s;
    }
  }
  if (buf) chunks.push(buf);
  return chunks;
}

export function useNavigationVoice(): NavigationVoice {
  const [enabled, setEnabledState] = useState<boolean>(readInitialEnabled);
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastTextRef = useRef<string>("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const unlockedRef = useRef(false);
  const cacheRef = useRef<Map<string, string>>(new Map());
  const playTokenRef = useRef(0);

  const synthesizeFn = useServerFn(synthesizeSpeech);

  const engine: NavigationVoice["engine"] = enabled ? "cloud" : "none";
  const available = engine !== "none";

  /**
   * Prime Audio element ngay trong user gesture. Sau đó element này
   * có thể play() async bao lâu cũng được, không bị autoplay block.
   */
  const unlock = useCallback(() => {
    if (unlockedRef.current) return;
    if (typeof window === "undefined") return;
    try {
      if (!audioRef.current) audioRef.current = new Audio();
      const audio = audioRef.current;
      audio.muted = true;
      audio.src = SILENT_MP3;
      const p = audio.play();
      if (p && typeof p.then === "function") {
        p.then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.muted = false;
          unlockedRef.current = true;
        }).catch((e) => {
          console.warn("[voice] unlock failed:", e);
        });
      } else {
        unlockedRef.current = true;
      }
    } catch (e) {
      console.warn("[voice] unlock threw:", e);
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setSpeaking(false);
  }, []);

  const cancel = useCallback(() => {
    playTokenRef.current += 1;
    stopAudio();
    lastTextRef.current = "";
    setLoading(false);
  }, [stopAudio]);

  const setEnabled = useCallback(
    (v: boolean) => {
      setEnabledState(v);
      try {
        localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
      } catch {
        // ignore
      }
      if (!v) cancel();
      else unlock(); // user vừa toggle on = gesture, unlock luôn
    },
    [cancel, unlock],
  );

  const toggle = useCallback(() => setEnabled(!enabled), [enabled, setEnabled]);

  /** Synth 1 chunk → blob URL. Cache theo text chunk. */
  const synthChunk = useCallback(
    async (chunkText: string): Promise<string> => {
      const cached = cacheRef.current.get(chunkText);
      if (cached) return cached;
      const res = await synthesizeFn({
        data: { text: chunkText, voice: "leminh", speed: 0 },
      });
      const blob = base64ToBlob(res.audioBase64, res.mimeType);
      const url = URL.createObjectURL(blob);
      cacheRef.current.set(chunkText, url);
      return url;
    },
    [synthesizeFn],
  );

  /** Phát 1 blob URL, đợi onended. */
  const playUrl = useCallback((url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const audio = audioRef.current ?? new Audio();
      audioRef.current = audio;
      // Reset handlers cũ trước khi gán mới (tránh leak từ play trước)
      audio.onplaying = null;
      audio.onended = null;
      audio.onerror = null;

      audio.src = url;
      audio.muted = false;
      audio.volume = 1;

      audio.onplaying = () => setSpeaking(true);
      audio.onended = () => {
        setSpeaking(false);
        resolve();
      };
      audio.onerror = (e) => {
        setSpeaking(false);
        const errMsg =
          audio.error?.message ?? `Audio play failed: ${String(e)}`;
        reject(new Error(errMsg));
      };

      const p = audio.play();
      if (p && typeof p.catch === "function") {
        p.catch((e) => {
          setSpeaking(false);
          reject(
            new Error(
              `Audio.play() rejected (${(e as Error)?.name ?? "Error"}): ${(e as Error)?.message ?? String(e)}`,
            ),
          );
        });
      }
    });
  }, []);

  /**
   * Cloud (FPT.AI) — synth tuần tự (concurrency 1 ahead):
   * - Synth chunk[0], play.
   * - Trong lúc play[i], synth chunk[i+1] (1 ahead).
   * - Tránh rate limit khi nhiều chunks song song.
   */
  const speakCloud = useCallback(
    async (text: string, interrupt: boolean) => {
      const token = ++playTokenRef.current;
      if (interrupt) stopAudio();

      if (!unlockedRef.current) {
        console.warn(
          "[voice] speak() called before unlock(). Audio may be blocked by browser autoplay policy. " +
            "Caller phải gọi voice.unlock() trong user gesture trước.",
        );
      }

      const chunks = splitIntoChunks(text);
      try {
        setError(null);
        setLoading(true);

        // Synth chunk đầu
        const firstUrl = await synthChunk(chunks[0]);
        if (token !== playTokenRef.current) return;
        setLoading(false);

        // Bắt đầu prefetch chunk[1] song song với play chunk[0]
        let nextPromise: Promise<string> | null =
          chunks.length > 1
            ? synthChunk(chunks[1]).catch((e) => Promise.reject(e))
            : null;

        await playUrl(firstUrl);
        if (token !== playTokenRef.current) return;

        // Lần lượt: chờ next, play, prefetch next+1
        for (let i = 1; i < chunks.length; i++) {
          if (token !== playTokenRef.current) return;
          if (!nextPromise) break;
          let url: string;
          try {
            url = await nextPromise;
          } catch (e) {
            console.error("[voice] chunk synth failed:", e);
            setError((e as Error)?.message ?? "Lỗi tổng hợp giọng");
            break;
          }
          if (token !== playTokenRef.current) return;

          // Bắt đầu prefetch chunk kế tiếp trước khi play chunk hiện tại
          nextPromise =
            i + 1 < chunks.length
              ? synthChunk(chunks[i + 1]).catch((e) => Promise.reject(e))
              : null;

          try {
            await playUrl(url);
          } catch (e) {
            console.error("[voice] chunk play failed:", e);
            setError((e as Error)?.message ?? "Lỗi phát giọng");
            break;
          }
        }
      } catch (e) {
        console.error("[voice] FPT.AI TTS failed:", e);
        setError((e as Error)?.message ?? "Không gọi được FPT.AI TTS");
      } finally {
        setLoading(false);
      }
    },
    [stopAudio, synthChunk, playUrl],
  );

  const speak = useCallback(
    (text: string, opts?: { force?: boolean; interrupt?: boolean }) => {
      if (!enabled) return;
      const trimmed = text.trim();
      if (!trimmed) return;
      if (!opts?.force && trimmed === lastTextRef.current) return;
      lastTextRef.current = trimmed;
      const interrupt = opts?.interrupt !== false;
      void speakCloud(trimmed, interrupt);
    },
    [enabled, speakCloud],
  );

  // Cleanup blob URLs khi unmount
  useEffect(() => {
    const cache = cacheRef.current;
    return () => {
      for (const url of cache.values()) URL.revokeObjectURL(url);
      cache.clear();
    };
  }, []);

  return {
    available,
    enabled,
    engine,
    speaking,
    loading,
    error,
    setEnabled,
    toggle,
    speak,
    unlock,
    cancel,
  };
}

/**
 * Format khoảng cách thành câu nói tự nhiên.
 */
export function formatDistanceForSpeech(meters: number): string {
  if (meters < 50) return "ngay phía trước";
  if (meters < 1000) return `khoảng ${Math.round(meters / 10) * 10} mét`;
  const km = meters / 1000;
  return `khoảng ${km.toFixed(km < 10 ? 1 : 0)} ki lô mét`;
}

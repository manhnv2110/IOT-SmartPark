import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { synthesizeSpeech } from "@/lib/tts.functions";

const STORAGE_KEY = "smartpark-voice-enabled";

/**
 * Voice guidance hook với hai engine:
 *
 *  1. CLOUD (mặc định): FPT.AI TTS v5 qua server function. Phát âm
 *     tiếng Việt chuẩn (đúng dấu, ngữ điệu tự nhiên), giọng leminh.
 *  2. LOCAL fallback: Web Speech API. Dùng khi cloud lỗi (mất mạng /
 *     quota / API key sai).
 *
 * Cache client-side: Map<text, audioBlobUrl>. Câu lặp như "Bạn đã lệch
 * đường" chỉ gọi cloud TTS 1 lần, các lần sau phát từ blob URL local.
 *
 * Engine đang dùng được expose qua `engine` để UI hiển thị badge.
 */
export interface NavigationVoice {
  available: boolean;
  enabled: boolean;
  engine: "cloud" | "local" | "none";
  /** Đang phát một utterance. */
  speaking: boolean;
  /** Đang gọi cloud TTS (chưa phát). */
  loading: boolean;
  setEnabled: (v: boolean) => void;
  toggle: () => void;
  speak: (text: string, opts?: { force?: boolean; interrupt?: boolean }) => void;
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

/**
 * Convert base64 → Blob (mp3). Dùng để wrap response từ FPT.AI thành
 * URL phát được qua <audio>.
 */
function base64ToBlob(b64: string, mimeType: string): Blob {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

/* ─── Local fallback (Web Speech) ─────────────────────────────────── */
function pickVietnameseVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const named = voices.find(
    (v) =>
      /vi[-_]vn/i.test(v.lang) ||
      /vietnam/i.test(v.name) ||
      /HoaiMy|An|Linh/i.test(v.name),
  );
  if (named) return named;
  return voices.find((v) => v.lang.toLowerCase().startsWith("vi")) ?? null;
}

export function useNavigationVoice(): NavigationVoice {
  const speechAvailable =
    typeof window !== "undefined" && "speechSynthesis" in window;
  const [enabled, setEnabledState] = useState<boolean>(readInitialEnabled);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cloudFailed, setCloudFailed] = useState(false);

  const lastTextRef = useRef<string>("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  /** Cache: text → blob URL của mp3 đã synth. */
  const cacheRef = useRef<Map<string, string>>(new Map());
  /** Token huỷ play khi user gọi cancel/speak mới giữa lúc đang fetch. */
  const playTokenRef = useRef(0);

  const synthesizeFn = useServerFn(synthesizeSpeech);

  // Web Speech voices (fallback)
  useEffect(() => {
    if (!speechAvailable) return;
    const synth = window.speechSynthesis;
    const refresh = () => setVoices(synth.getVoices());
    refresh();
    synth.addEventListener("voiceschanged", refresh);
    return () => synth.removeEventListener("voiceschanged", refresh);
  }, [speechAvailable]);

  const viVoice = useMemo(() => pickVietnameseVoice(voices), [voices]);

  const engine: NavigationVoice["engine"] = !enabled
    ? "none"
    : cloudFailed
      ? speechAvailable
        ? "local"
        : "none"
      : "cloud";
  const available = engine !== "none";

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (speechAvailable) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [speechAvailable]);

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
    },
    [cancel],
  );

  const toggle = useCallback(() => setEnabled(!enabled), [enabled, setEnabled]);

  /** Local fallback: Web Speech API. */
  const speakLocal = useCallback(
    (text: string, interrupt: boolean) => {
      if (!speechAvailable) return;
      const synth = window.speechSynthesis;
      if (interrupt) synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      if (viVoice) {
        u.voice = viVoice;
        u.lang = viVoice.lang;
      } else {
        u.lang = "vi-VN";
      }
      u.rate = 1;
      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      synth.speak(u);
    },
    [speechAvailable, viVoice],
  );

  /** Cloud (FPT.AI): synth + cache + play. */
  const speakCloud = useCallback(
    async (text: string, interrupt: boolean) => {
      const token = ++playTokenRef.current;
      if (interrupt) stopAudio();

      try {
        let url = cacheRef.current.get(text);
        if (!url) {
          setLoading(true);
          const res = await synthesizeFn({
            data: { text, voice: "leminh", speed: 0 },
          });
          if (token !== playTokenRef.current) return; // user huỷ
          const blob = base64ToBlob(res.audioBase64, res.mimeType);
          url = URL.createObjectURL(blob);
          cacheRef.current.set(text, url);
        }
        if (token !== playTokenRef.current) return;

        const audio = audioRef.current ?? new Audio();
        audioRef.current = audio;
        audio.src = url;
        audio.onplaying = () => setSpeaking(true);
        audio.onended = () => setSpeaking(false);
        audio.onerror = () => setSpeaking(false);
        await audio.play();
      } catch (e) {
        console.warn("FPT.AI TTS failed, fallback Web Speech:", e);
        setCloudFailed(true);
        if (token === playTokenRef.current) speakLocal(text, interrupt);
      } finally {
        setLoading(false);
      }
    },
    [stopAudio, synthesizeFn, speakLocal],
  );

  const speak = useCallback(
    (text: string, opts?: { force?: boolean; interrupt?: boolean }) => {
      if (!enabled) return;
      const trimmed = text.trim();
      if (!trimmed) return;
      if (!opts?.force && trimmed === lastTextRef.current) return;
      lastTextRef.current = trimmed;
      const interrupt = opts?.interrupt !== false;

      if (cloudFailed) {
        speakLocal(trimmed, interrupt);
        return;
      }
      void speakCloud(trimmed, interrupt);
    },
    [enabled, cloudFailed, speakCloud, speakLocal],
  );

  // Cleanup blob URLs khi unmount
  useEffect(() => {
    const cache = cacheRef.current;
    return () => {
      for (const url of cache.values()) URL.revokeObjectURL(url);
      cache.clear();
      if (speechAvailable) window.speechSynthesis.cancel();
    };
  }, [speechAvailable]);

  return {
    available,
    enabled,
    engine,
    speaking,
    loading,
    setEnabled,
    toggle,
    speak,
    cancel,
  };
}

/**
 * Format khoảng cách thành câu nói tự nhiên. FPT.AI đọc tốt cả "850
 * mét" và "ki lô mét", giữ format này để dùng chung 2 engine.
 */
export function formatDistanceForSpeech(meters: number): string {
  if (meters < 50) return "ngay phía trước";
  if (meters < 1000) return `khoảng ${Math.round(meters / 10) * 10} mét`;
  const km = meters / 1000;
  return `khoảng ${km.toFixed(km < 10 ? 1 : 0)} ki lô mét`;
}

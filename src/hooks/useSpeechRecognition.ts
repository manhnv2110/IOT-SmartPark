import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Web Speech API Speech Recognition (STT) wrapper, tiếng Việt.
 *
 * Dùng cho input thoại trong AI Assistant — user bấm mic, nói câu mô
 * tả, hook trả text qua callback `onResult`. Hỗ trợ trên Chrome/Edge
 * (webkitSpeechRecognition), Firefox không có nên hook tự ẩn UI.
 *
 * Vì sao Web Speech thay vì cloud STT (Whisper / FPT STT):
 * - Streaming realtime không cần buffer audio trước khi gửi.
 * - Không tốn quota / API key.
 * - Tiếng Việt: Chrome dùng Google STT engine, độ chính xác đủ cho câu
 *   ngắn ("gần Highland Cầu Giấy"). Câu dài/ồn → user vẫn có thể gõ.
 *
 * Trade-off: cần permission mic + Chrome/Edge. Trên trình duyệt không
 * hỗ trợ, `available=false` để UI ẩn nút mic.
 */

// Web Speech API types không có sẵn trong lib.dom — khai báo tối thiểu.
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  isFinal: boolean;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

interface SpeechRecognitionCtor {
  new (): SpeechRecognitionInstance;
}

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface UseSpeechRecognitionOptions {
  /** Gọi khi có transcript final (không phải interim). */
  onResult?: (transcript: string) => void;
  /** Hiển thị transcript đang nói (interim) — UX tốt hơn. */
  onInterim?: (interim: string) => void;
  /** Mặc định "vi-VN". */
  lang?: string;
}

export interface UseSpeechRecognitionApi {
  /** Browser hỗ trợ Web Speech API STT. */
  available: boolean;
  /** Đang ghi âm. */
  listening: boolean;
  /** Lỗi gần nhất (nếu có). */
  error: string | null;
  start: () => void;
  stop: () => void;
  /** Toggle nhanh start/stop. */
  toggle: () => void;
}

export function useSpeechRecognition(
  opts: UseSpeechRecognitionOptions = {},
): UseSpeechRecognitionApi {
  const { onResult, onInterim, lang = "vi-VN" } = opts;
  const [available] = useState(() => getCtor() !== null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionInstance | null>(null);

  // Stable refs cho callback để tránh re-init khi parent re-render.
  const onResultRef = useRef(onResult);
  const onInterimRef = useRef(onInterim);
  useEffect(() => {
    onResultRef.current = onResult;
    onInterimRef.current = onInterim;
  }, [onResult, onInterim]);

  // Khởi tạo instance một lần khi mount (nếu hỗ trợ).
  useEffect(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      setListening(true);
      setError(null);
    };
    rec.onend = () => setListening(false);
    rec.onerror = (e) => {
      // "no-speech" / "aborted" / "audio-capture" / "not-allowed"
      if (e.error === "no-speech") {
        setError("Không nhận được giọng nói, thử lại nhé.");
      } else if (e.error === "not-allowed") {
        setError("Trình duyệt chưa cấp quyền micro.");
      } else if (e.error !== "aborted") {
        setError(`Lỗi nhận giọng nói: ${e.error}`);
      }
      setListening(false);
    };
    rec.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        const text = r[0]?.transcript ?? "";
        if (r.isFinal) final += text;
        else interim += text;
      }
      if (interim) onInterimRef.current?.(interim);
      if (final) onResultRef.current?.(final.trim());
    };

    recRef.current = rec;
    return () => {
      rec.onstart = null;
      rec.onend = null;
      rec.onerror = null;
      rec.onresult = null;
      try {
        rec.abort();
      } catch {
        // ignore
      }
      recRef.current = null;
    };
  }, [lang]);

  const start = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    setError(null);
    try {
      rec.start();
    } catch {
      // start() throws nếu đang chạy — ignore
    }
  }, []);

  const stop = useCallback(() => {
    recRef.current?.stop();
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  return { available, listening, error, start, stop, toggle };
}

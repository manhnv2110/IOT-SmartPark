/**
 * Trợ lý tìm bãi đỗ AI — UX conversation-first.
 *
 * Layout 3 lớp:
 *  - HEADER: badge engine + voice toggle + nút "Mới"
 *  - THREAD: cuộn được, chứa welcome state hoặc messages (user/AI bubble)
 *  - COMPOSER: ô nhập + mic + send, cố định dưới đáy
 *
 * Khác bản cũ:
 *  - Result không phải "blob bên dưới input" nữa mà là tin nhắn trong
 *    thread → user thấy ngữ cảnh hỏi-đáp như chat, đúng metaphor "trợ lý".
 *  - Mic to hơn, tách khỏi input box, có ring animation khi nghe — tối ưu
 *    cho hands-free khi lái xe.
 *  - Voice toggle có label engine ("FPT.AI · leminh") hiển thị rõ thay vì
 *    chỉ icon ẩn meaning.
 *  - Welcome state có hero icon + 4 prompt chip để hint capability cho
 *    user mới (cold start).
 */

import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Sparkles,
  Send,
  Loader2,
  Navigation,
  ArrowRight,
  AlertCircle,
  ParkingCircle,
  Star,
  Crosshair,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RotateCcw,
  Plus,
  User,
  Bot,
} from "lucide-react";
import { askParkingAi, type AiParkingResponse } from "@/lib/ai-parking.functions";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useNavigationVoice } from "@/hooks/useNavigationVoice";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  { label: "Gần Highland Coffee Cầu Giấy", emoji: "☕" },
  { label: "Tiện đi ra Lăng Bác", emoji: "🏛️" },
  { label: "Gần Hồ Hoàn Kiếm, còn nhiều chỗ", emoji: "🌊" },
  { label: "Khu Tây Hồ, giá rẻ", emoji: "💰" },
];

export interface AiParkingAssistantProps {
  onSelectLot?: (lotId: string) => void;
  onRouteLot?: (lotId: string, lotName: string) => void;
  /** Compact = nhúng trong sidebar map, ẩn tiêu đề lớn để tiết kiệm chỗ. */
  compact?: boolean;
  className?: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  /** AI message có kèm recommendations card. */
  result?: AiParkingResponse;
}

function buildSpeechSummary(result: AiParkingResponse): string {
  const lines: string[] = [];
  if (result.explanation) lines.push(result.explanation);
  const top = result.recommendations[0];
  if (top) lines.push(`Đề xuất hàng đầu là ${top.lotName}. ${top.reason}`);
  return lines.join(". ");
}

export function AiParkingAssistant({
  onSelectLot,
  onRouteLot,
  compact = false,
  className,
}: AiParkingAssistantProps = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [interim, setInterim] = useState("");
  const [autoSpeak, setAutoSpeak] = useState(true);

  const threadRef = useRef<HTMLDivElement>(null);
  const voice = useNavigationVoice();
  const stt = useSpeechRecognition({
    onInterim: (t) => setInterim(t),
    onResult: (transcript) => {
      setInterim("");
      setDraft(transcript);
      if (transcript.trim().length >= 2) submit(transcript.trim());
    },
  });

  const doAsk = useServerFn(askParkingAi);
  const mutation = useMutation({
    mutationFn: (q: string) => doAsk({ data: { query: q } }),
    onSuccess: (data, q) => {
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "ai",
        text: data.explanation,
        result: data,
      };
      setMessages((prev) => [...prev, aiMsg]);
      if (autoSpeak && voice.enabled) {
        voice.speak(buildSpeechSummary(data), { interrupt: true });
      }
      // q là param do mutate truyền vào — tránh unused warning
      void q;
    },
    onError: (err) => {
      const aiMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "ai",
        text:
          (err as Error)?.message ??
          "Mình không xử lý được yêu cầu, bạn thử lại nhé.",
      };
      setMessages((prev) => [...prev, aiMsg]);
    },
  });

  const submit = (text: string) => {
    if (!text || mutation.isPending) return;
    // Prime audio element ngay trong gesture — bắt buộc với Chrome
    // autoplay policy. Nếu không call ở đây, sau khi AI trả lời ~5-10s
    // sau gesture, audio.play() sẽ bị block với NotAllowedError.
    voice.unlock();
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", text },
    ]);
    setDraft("");
    setInterim("");
    mutation.mutate(text);
  };

  // Auto scroll to bottom khi có message mới hoặc đang nghe interim
  useEffect(() => {
    if (!threadRef.current) return;
    threadRef.current.scrollTo({
      top: threadRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length, mutation.isPending]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit(draft.trim());
  };

  const reset = () => {
    setMessages([]);
    setDraft("");
    setInterim("");
    voice.cancel();
  };

  const replayMessage = (msg: ChatMessage) => {
    voice.unlock();
    if (!msg.result) {
      voice.speak(msg.text, { force: true, interrupt: true });
      return;
    }
    voice.speak(buildSpeechSummary(msg.result), { force: true, interrupt: true });
  };

  const hasMessages = messages.length > 0;

  return (
    <section
      className={cn(
        "relative flex flex-col min-h-0 overflow-hidden",
        compact ? "bg-transparent" : "rounded-2xl glass-strong",
        className,
      )}
    >
      {/* HEADER */}
      <header
        className={cn(
          "shrink-0 flex items-center justify-between gap-2 px-4",
          compact ? "py-2" : "py-3 border-b border-border/50",
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          {!compact && (
            <span className="size-8 rounded-xl bg-gradient-to-br from-emerald-500/25 to-teal-500/25 grid place-items-center shrink-0">
              <Sparkles className="size-4 text-emerald-600" />
            </span>
          )}
          <div className="min-w-0">
            {!compact && (
              <h2 className="font-semibold text-sm text-foreground leading-tight">
                Trợ lý AI
              </h2>
            )}
            <VoiceEngineLabel
              autoSpeak={autoSpeak}
              voiceEnabled={voice.enabled}
              engine={voice.engine}
              error={voice.error}
            />
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {hasMessages && (
            <button
              type="button"
              onClick={reset}
              title="Bắt đầu cuộc hội thoại mới"
              aria-label="Cuộc hội thoại mới"
              className="size-8 grid place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <Plus className="size-4" />
            </button>
          )}
          <VoiceToggle
            autoSpeak={autoSpeak}
            voiceEnabled={voice.enabled}
            speaking={voice.speaking}
            loading={voice.loading}
            onToggle={() => {
              const next = !autoSpeak;
              setAutoSpeak(next);
              if (!next) voice.cancel();
              else if (!voice.enabled) voice.setEnabled(true);
            }}
          />
        </div>
      </header>

      {/* THREAD */}
      <div
        ref={threadRef}
        className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-4 py-3 space-y-3"
      >
        {!hasMessages && !mutation.isPending && (
          <WelcomeState onPick={(s) => submit(s)} listening={stt.listening} />
        )}

        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            msg={m}
            voiceEnabled={voice.enabled && autoSpeak}
            voiceLoading={voice.loading}
            voiceSpeaking={voice.speaking}
            onReplay={() => replayMessage(m)}
            onSelectLot={onSelectLot}
            onRouteLot={onRouteLot}
          />
        ))}

        {mutation.isPending && <ThinkingBubble />}

        {/* STT interim — bubble user "đang nói" để feedback realtime */}
        {stt.listening && interim && (
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-br-md border-2 border-emerald-500/40 border-dashed bg-emerald-500/5 px-3.5 py-2 text-sm text-foreground/80 italic">
              {interim}
              <span className="inline-block w-1.5 h-3 ml-1 bg-emerald-500 animate-pulse rounded-sm" />
            </div>
          </div>
        )}
      </div>

      {/* COMPOSER */}
      <div
        className={cn(
          "shrink-0 px-3 pb-3",
          compact ? "pt-2" : "pt-3 border-t border-border/50 bg-card/40",
        )}
      >
        {stt.error && (
          <div className="mb-2 flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-400 px-2">
            <AlertCircle className="size-3" />
            {stt.error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <div
            className={cn(
              "flex-1 flex items-center rounded-2xl border bg-card/80 backdrop-blur transition-all px-3 min-h-[44px]",
              stt.listening
                ? "border-emerald-500/60 ring-2 ring-emerald-500/15 shadow-[0_0_0_4px_rgba(16,185,129,0.08)]"
                : "border-border/60 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15",
            )}
          >
            <input
              value={interim || draft}
              onChange={(e) => {
                setInterim("");
                setDraft(e.target.value);
              }}
              placeholder={
                stt.listening
                  ? "Đang lắng nghe..."
                  : hasMessages
                    ? "Hỏi tiếp..."
                    : "Mô tả nơi bạn muốn đến"
              }
              disabled={mutation.isPending}
              className="flex-1 bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground/80 disabled:opacity-60"
            />
          </div>

          {/* Mic button — nổi bật, tròn, là CTA chính khi rảnh tay */}
          {stt.available && (
            <MicButton
              listening={stt.listening}
              disabled={mutation.isPending}
              onToggle={stt.toggle}
            />
          )}

          {/* Send chỉ hiện khi user gõ tay */}
          <button
            type="submit"
            disabled={!draft.trim() || mutation.isPending || stt.listening}
            aria-label="Gửi"
            className={cn(
              "size-11 grid place-items-center rounded-full shrink-0 transition-all",
              draft.trim() && !mutation.isPending && !stt.listening
                ? "bg-primary text-primary-foreground shadow-[var(--shadow-1)] hover:scale-105"
                : "bg-muted text-muted-foreground cursor-not-allowed",
            )}
          >
            {mutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </button>
        </form>
      </div>
    </section>
  );
}

/* ─── Welcome state (cold start) ─────────────────────────────────── */
function WelcomeState({
  onPick,
  listening,
}: {
  onPick: (q: string) => void;
  listening: boolean;
}) {
  return (
    <div className="text-center pt-6 pb-2 space-y-5">
      {/* Hero orb */}
      <div className="relative mx-auto size-16">
        <div
          className={cn(
            "absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 grid place-items-center text-white shadow-[0_8px_28px_-8px_rgba(16,185,129,0.6)]",
            listening && "animate-pulse",
          )}
        >
          <Sparkles className="size-7" />
        </div>
        {listening && (
          <>
            <span className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping" />
            <span
              className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping"
              style={{ animationDelay: "0.5s" }}
            />
          </>
        )}
      </div>
      <div className="space-y-1.5">
        <h3 className="text-base font-semibold text-foreground">
          Bạn muốn đỗ ở đâu?
        </h3>
        <p className="text-xs text-muted-foreground max-w-[280px] mx-auto leading-relaxed">
          Mô tả địa điểm bằng giọng nói hoặc gõ. Mình sẽ gợi ý bãi phù hợp và đọc
          đáp án bằng tiếng Việt.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-1.5 text-left max-w-md mx-auto">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => onPick(s.label)}
            className="group flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-border/50 bg-card/60 hover:bg-card hover:border-primary/30 hover:shadow-[var(--shadow-1)] transition-all"
          >
            <span className="text-base shrink-0" aria-hidden>
              {s.emoji}
            </span>
            <span className="text-xs text-foreground flex-1 truncate">
              {s.label}
            </span>
            <ArrowRight className="size-3 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Message bubble (user / AI) ─────────────────────────────────── */
function MessageBubble({
  msg,
  voiceEnabled,
  voiceLoading,
  voiceSpeaking,
  onReplay,
  onSelectLot,
  onRouteLot,
}: {
  msg: ChatMessage;
  voiceEnabled: boolean;
  voiceLoading: boolean;
  voiceSpeaking: boolean;
  onReplay: () => void;
  onSelectLot?: (lotId: string) => void;
  onRouteLot?: (lotId: string, lotName: string) => void;
}) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end gap-2">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary text-primary-foreground px-3.5 py-2 text-sm leading-relaxed shadow-[var(--shadow-1)]">
          {msg.text}
        </div>
        <span className="size-7 rounded-full bg-muted grid place-items-center shrink-0 mt-auto">
          <User className="size-3.5 text-muted-foreground" />
        </span>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <span className="size-7 rounded-full bg-gradient-to-br from-emerald-500/25 to-teal-500/25 grid place-items-center shrink-0 mt-0.5">
        <Bot className="size-3.5 text-emerald-600" />
      </span>
      <div className="flex-1 min-w-0 space-y-2">
        <div className="rounded-2xl rounded-tl-md bg-card border border-border/50 px-3.5 py-2.5 text-sm leading-relaxed text-foreground/90">
          <div className="flex items-start gap-2">
            <p className="flex-1 min-w-0">{msg.text}</p>
            {voiceEnabled && (
              <button
                type="button"
                onClick={onReplay}
                title="Phát lại"
                aria-label="Phát lại bằng giọng FPT.AI"
                className="size-6 grid place-items-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition shrink-0 -mr-1 -mt-0.5"
              >
                {voiceLoading ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : voiceSpeaking ? (
                  <Volume2 className="size-3 text-emerald-600 animate-pulse" />
                ) : (
                  <RotateCcw className="size-3" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Recommendation cards (chỉ AI message có result) */}
        {msg.result && msg.result.recommendations.length > 0 && (
          <div className="space-y-1.5">
            {msg.result.recommendations.map((rec, i) => (
              <RecommendationCard
                key={rec.lotId}
                rec={rec}
                rank={i + 1}
                onSelectLot={onSelectLot}
                onRouteLot={onRouteLot}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex gap-2">
      <span className="size-7 rounded-full bg-gradient-to-br from-emerald-500/25 to-teal-500/25 grid place-items-center shrink-0 mt-0.5">
        <Bot className="size-3.5 text-emerald-600" />
      </span>
      <div className="rounded-2xl rounded-tl-md bg-card border border-border/50 px-4 py-3 inline-flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-emerald-500 animate-bounce" />
        <span
          className="size-1.5 rounded-full bg-emerald-500 animate-bounce"
          style={{ animationDelay: "0.15s" }}
        />
        <span
          className="size-1.5 rounded-full bg-emerald-500 animate-bounce"
          style={{ animationDelay: "0.3s" }}
        />
      </div>
    </div>
  );
}

/* ─── Mic button (CTA chính cho hands-free) ──────────────────────── */
function MicButton({
  listening,
  disabled,
  onToggle,
}: {
  listening: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-label={listening ? "Dừng ghi âm" : "Bắt đầu ghi âm"}
      aria-pressed={listening}
      className={cn(
        "relative size-11 grid place-items-center rounded-full shrink-0 transition-all",
        listening
          ? "bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-[0_8px_24px_-6px_rgba(16,185,129,0.55)]"
          : "bg-card border border-border/60 text-foreground/80 hover:border-emerald-500/40 hover:text-emerald-600 hover:shadow-[var(--shadow-1)]",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      {listening ? (
        <MicOff className="size-4" />
      ) : (
        <Mic className="size-4" />
      )}
      {listening && (
        <>
          <span className="absolute inset-0 rounded-full border-2 border-emerald-400/50 animate-ping" />
          <span
            className="absolute inset-0 rounded-full border-2 border-emerald-400/50 animate-ping"
            style={{ animationDelay: "0.5s" }}
          />
        </>
      )}
    </button>
  );
}

/* ─── Voice header bits ──────────────────────────────────────────── */
function VoiceEngineLabel({
  autoSpeak,
  voiceEnabled,
  engine,
  error,
}: {
  autoSpeak: boolean;
  voiceEnabled: boolean;
  engine: "cloud" | "none";
  error: string | null;
}) {
  if (!autoSpeak || !voiceEnabled) {
    return (
      <p className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
        <span className="size-1 rounded-full bg-muted-foreground/40" />
        Giọng đọc đang tắt
      </p>
    );
  }
  if (error) {
    return (
      <p className="text-[10px] text-amber-600 inline-flex items-center gap-1">
        <span className="size-1 rounded-full bg-amber-500" />
        Lỗi FPT.AI — bấm phát lại
      </p>
    );
  }
  if (engine === "cloud") {
    return (
      <p className="text-[10px] text-primary inline-flex items-center gap-1 font-medium">
        <span className="size-1 rounded-full bg-primary animate-pulse" />
        FPT.AI · leminh
      </p>
    );
  }
  return (
    <p className="text-[10px] text-muted-foreground">Giọng đọc không hỗ trợ</p>
  );
}

function VoiceToggle({
  autoSpeak,
  voiceEnabled,
  speaking,
  loading,
  onToggle,
}: {
  autoSpeak: boolean;
  voiceEnabled: boolean;
  speaking: boolean;
  loading: boolean;
  onToggle: () => void;
}) {
  const active = autoSpeak && voiceEnabled;
  return (
    <button
      type="button"
      onClick={onToggle}
      title={
        active ? "Tắt đọc câu trả lời" : "Bật đọc câu trả lời (FPT.AI)"
      }
      aria-label={active ? "Tắt giọng đọc" : "Bật giọng đọc"}
      aria-pressed={active}
      className={cn(
        "relative size-8 grid place-items-center rounded-lg transition-colors shrink-0",
        active
          ? "bg-primary/15 text-primary hover:bg-primary/25"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : active ? (
        <Volume2 className="size-4" />
      ) : (
        <VolumeX className="size-4" />
      )}
      {speaking && !loading && (
        <span
          className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-primary animate-pulse"
          aria-hidden
        />
      )}
    </button>
  );
}

/* ─── Recommendation card (giữ nguyên hành vi cũ) ─────────────────── */
function RecommendationCard({
  rec,
  rank,
  onSelectLot,
  onRouteLot,
}: {
  rec: { lotId: string; lotName: string; reason: string; score: number };
  rank: number;
  onSelectLot?: (lotId: string) => void;
  onRouteLot?: (lotId: string, lotName: string) => void;
}) {
  const isMock = rec.lotId.startsWith("mock-");
  const embedded = !!(onSelectLot || onRouteLot);

  return (
    <div
      className={cn(
        "rounded-xl border p-3 transition-all hover:shadow-[var(--shadow-1)]",
        rank === 1
          ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/8 to-teal-500/4"
          : "border-border/50 bg-card/60",
      )}
    >
      <div className="flex items-start gap-2.5">
        <div
          className={cn(
            "size-8 rounded-lg grid place-items-center shrink-0 text-xs font-bold",
            rank === 1
              ? "bg-emerald-500 text-white shadow-[0_4px_12px_-4px_rgba(16,185,129,0.5)]"
              : rank === 2
                ? "bg-teal-500/15 text-teal-600 dark:text-teal-400"
                : "bg-muted text-muted-foreground",
          )}
        >
          {rank === 1 ? <Star className="size-3.5 fill-white" /> : `#${rank}`}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm text-foreground truncate">
              {rec.lotName}
            </p>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold tabular-nums shrink-0">
              {rec.score}/10
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
            {rec.reason}
          </p>

          <div className="flex flex-wrap items-center gap-1 mt-2">
            {onSelectLot && (
              <button
                type="button"
                onClick={() => onSelectLot(rec.lotId)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border border-border/60 text-foreground bg-card hover:bg-muted/60 transition-colors"
              >
                <Crosshair className="size-3" />
                Map
              </button>
            )}
            {onRouteLot ? (
              <button
                type="button"
                onClick={() => onRouteLot(rec.lotId, rec.lotName)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                <Navigation className="size-3" />
                Chỉ đường
              </button>
            ) : (
              <Link
                to="/map"
                search={{ route: rec.lotId } as never}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                <Navigation className="size-3" />
                Chỉ đường
              </Link>
            )}
            {!isMock && !embedded && (
              <Link
                to="/lots/$deviceId"
                params={{ deviceId: rec.lotId }}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border border-border/60 text-foreground hover:bg-muted/60 transition-colors"
              >
                <ParkingCircle className="size-3" />
                Chi tiết
              </Link>
            )}
            {!isMock && (
              <Link
                to="/booking/new"
                search={{ lot: rec.lotId, name: rec.lotName }}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
              >
                Đặt
                <ArrowRight className="size-3" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

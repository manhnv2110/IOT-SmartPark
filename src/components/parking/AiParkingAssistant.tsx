import { useState } from "react";
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
} from "lucide-react";
import { askParkingAi, type AiParkingResponse } from "@/lib/ai-parking.functions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Gần Highland Coffee Cầu Giấy",
  "Tiện đi ra Lăng Bác",
  "Gần Hồ Hoàn Kiếm, còn nhiều chỗ",
  "Khu vực Tây Hồ, giá rẻ",
];

export interface AiParkingAssistantProps {
  /**
   * Khi cung cấp, button "Chọn trên bản đồ" sẽ gọi callback này thay vì
   * điều hướng `/map?select=...`. Dùng khi assistant đang được nhúng
   * trong trang `/map`.
   */
  onSelectLot?: (lotId: string) => void;
  /**
   * Khi cung cấp, button "Chỉ đường" sẽ gọi callback này thay vì điều
   * hướng. Dùng khi assistant đang được nhúng trong trang `/map`.
   */
  onRouteLot?: (lotId: string, lotName: string) => void;
  /**
   * Bật chế độ compact: padding nhỏ hơn, ẩn header lớn — phù hợp khi
   * nhúng trong sidebar bản đồ.
   */
  compact?: boolean;
  /** Tuỳ biến className container ngoài cùng. */
  className?: string;
}

export function AiParkingAssistant({
  onSelectLot,
  onRouteLot,
  compact = false,
  className,
}: AiParkingAssistantProps = {}) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<AiParkingResponse | null>(null);

  const doAsk = useServerFn(askParkingAi);
  const mutation = useMutation({
    mutationFn: (q: string) => doAsk({ data: { query: q } }),
    onSuccess: (data) => setResult(data),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || mutation.isPending) return;
    mutation.mutate(query.trim());
  };

  const handleSuggestion = (s: string) => {
    setQuery(s);
    mutation.mutate(s);
  };

  return (
    <section
      className={cn(
        "rounded-2xl overflow-hidden flex flex-col min-h-0",
        compact ? "bg-transparent" : "glass-strong",
        className,
      )}
    >
      {!compact && (
        <div className="px-5 py-4 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 grid place-items-center">
              <Sparkles className="size-4 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-foreground">
                Trợ lý tìm bãi đỗ AI
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Mô tả nơi bạn muốn đến — AI sẽ gợi ý bãi phù hợp
              </p>
            </div>
          </div>
        </div>
      )}

      <div
        className={cn(
          "flex-1 min-h-0 overflow-y-auto scrollbar-thin space-y-4",
          compact ? "p-4" : "p-5",
        )}
      >
        {/* Input */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1 relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Mô tả nơi bạn muốn đến..."
              className="w-full h-10 pl-3.5 pr-3.5 rounded-xl bg-muted/50 border border-border/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
              disabled={mutation.isPending}
            />
          </div>
          <Button
            type="submit"
            size="icon"
            disabled={!query.trim() || mutation.isPending}
            className="h-10 w-10 rounded-xl shrink-0"
          >
            {mutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </form>

        {/* Quick suggestions */}
        {!result && !mutation.isPending && (
          <div>
            <p className="text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground mb-2">
              Gợi ý nhanh
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSuggestion(s)}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] bg-muted/60 border border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted hover:border-primary/30 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading state */}
        {mutation.isPending && (
          <div className="flex items-center gap-3 py-4">
            <div className="size-9 rounded-xl bg-primary/10 grid place-items-center">
              <Loader2 className="size-4 text-primary animate-spin" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Đang phân tích...</p>
              <p className="text-xs text-muted-foreground">
                AI đang tìm bãi đỗ phù hợp với yêu cầu
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {mutation.isError && (
          <div className="flex items-start gap-2.5 rounded-xl bg-red-500/8 border border-red-500/20 px-3.5 py-3">
            <AlertCircle className="size-4 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-red-600">
                Không thể phân tích yêu cầu
              </p>
              <p className="text-[11px] text-red-500/80 mt-0.5">
                {(mutation.error as Error)?.message ?? "Vui lòng thử lại"}
              </p>
            </div>
          </div>
        )}

        {/* Results */}
        {result && !mutation.isPending && (
          <div className="space-y-3">
            {/* AI explanation */}
            <div className="flex items-start gap-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15 px-3.5 py-2.5">
              <Sparkles className="size-4 text-emerald-500 shrink-0 mt-0.5" />
              <p className="text-xs text-foreground leading-relaxed">
                {result.explanation}
              </p>
            </div>

            {/* Recommendation cards */}
            <div className="space-y-2">
              {result.recommendations.map((rec, i) => (
                <RecommendationCard
                  key={rec.lotId}
                  rec={rec}
                  rank={i + 1}
                  onSelectLot={onSelectLot}
                  onRouteLot={onRouteLot}
                />
              ))}
            </div>

            {/* Reset */}
            <button
              onClick={() => {
                setResult(null);
                setQuery("");
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Tìm kiếm mới
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

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
        "rounded-xl border p-3.5 transition-all hover:shadow-[var(--shadow-1)]",
        rank === 1
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-border/50 bg-card/60",
      )}
    >
      <div className="flex items-start gap-3">
        {/* Rank badge */}
        <div
          className={cn(
            "size-8 rounded-lg grid place-items-center shrink-0 text-xs font-bold",
            rank === 1
              ? "bg-emerald-500 text-white"
              : rank === 2
                ? "bg-teal-500/15 text-teal-600 dark:text-teal-400"
                : "bg-muted text-muted-foreground",
          )}
        >
          {rank === 1 ? <Star className="size-3.5 fill-white" /> : `#${rank}`}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm text-foreground truncate">
              {rec.lotName}
            </p>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold tabular-nums shrink-0">
              {rec.score}/10
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {rec.reason}
          </p>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            {/* Chọn trên bản đồ (chỉ khi embedded) */}
            {onSelectLot && (
              <button
                type="button"
                onClick={() => onSelectLot(rec.lotId)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-border/60 text-foreground bg-card hover:bg-muted/60 transition-colors"
              >
                <Crosshair className="size-3" />
                Xem trên map
              </button>
            )}

            {/* Chỉ đường */}
            {onRouteLot ? (
              <button
                type="button"
                onClick={() => onRouteLot(rec.lotId, rec.lotName)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                <Navigation className="size-3" />
                Chỉ đường
              </button>
            ) : (
              <Link
                to="/map"
                search={{ route: rec.lotId } as never}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                <Navigation className="size-3" />
                Chỉ đường
              </Link>
            )}

            {/* Chi tiết — chỉ với bãi thật */}
            {!isMock && !embedded && (
              <Link
                to="/lots/$deviceId"
                params={{ deviceId: rec.lotId }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-border/60 text-foreground hover:bg-muted/60 transition-colors"
              >
                <ParkingCircle className="size-3" />
                Chi tiết
              </Link>
            )}

            {/* Đặt chỗ — chỉ với bãi thật */}
            {!isMock && (
              <Link
                to="/booking/new"
                search={{ lot: rec.lotId, name: rec.lotName }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
              >
                Đặt chỗ
                <ArrowRight className="size-3" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Sparkles,
  Send,
  Loader2,
  MapPin,
  Navigation,
  ArrowRight,
  AlertCircle,
  ParkingCircle,
  Star,
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

export function AiParkingAssistant() {
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
    <section className="rounded-2xl glass-strong overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 grid place-items-center">
            <Sparkles className="w-4.5 h-4.5 text-emerald-600" />
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

      <div className="p-5 space-y-4">
        {/* Input */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1 relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="VD: Gần quán cafe Highland Cầu Giấy..."
              className="w-full h-11 pl-4 pr-4 rounded-xl bg-muted/50 border border-border/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
              disabled={mutation.isPending}
            />
          </div>
          <Button
            type="submit"
            size="icon"
            disabled={!query.trim() || mutation.isPending}
            className="h-11 w-11 rounded-xl shrink-0"
          >
            {mutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>

        {/* Quick suggestions */}
        {!result && !mutation.isPending && (
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => handleSuggestion(s)}
                className="px-3 py-1.5 rounded-lg text-xs bg-muted/50 border border-border/30 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Loading state */}
        {mutation.isPending && (
          <div className="flex items-center gap-3 py-4">
            <div className="w-8 h-8 rounded-lg bg-primary/10 grid place-items-center">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Đang phân tích...
              </p>
              <p className="text-xs text-muted-foreground">
                AI đang tìm bãi đỗ phù hợp với yêu cầu của bạn
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {mutation.isError && (
          <div className="flex items-start gap-2.5 rounded-xl bg-red-500/8 border border-red-500/20 px-4 py-3">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
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
            <div className="flex items-start gap-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15 px-4 py-3">
              <Sparkles className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <p className="text-xs text-foreground leading-relaxed">
                {result.explanation}
              </p>
            </div>

            {/* Recommendation cards */}
            <div className="space-y-2">
              {result.recommendations.map((rec, i) => (
                <RecommendationCard key={rec.lotId} rec={rec} rank={i + 1} />
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
}: {
  rec: { lotId: string; lotName: string; reason: string; score: number };
  rank: number;
}) {
  const isMock = rec.lotId.startsWith("mock-");

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-all hover:shadow-[var(--shadow-1)]",
        rank === 1
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-border/50 bg-card/50"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Rank badge */}
        <div
          className={cn(
            "w-8 h-8 rounded-lg grid place-items-center shrink-0 text-xs font-bold",
            rank === 1
              ? "bg-emerald-500 text-white"
              : rank === 2
                ? "bg-teal-500/15 text-teal-600"
                : "bg-muted text-muted-foreground"
          )}
        >
          {rank === 1 ? <Star className="w-3.5 h-3.5" /> : `#${rank}`}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm text-foreground truncate">
              {rec.lotName}
            </p>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium shrink-0">
              {rec.score}/10
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {rec.reason}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-2.5">
            <Link
              to="/map"
              search={{ select: rec.lotId }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-border/50 text-foreground hover:bg-muted/50 transition-colors"
            >
              <Navigation className="w-3 h-3" />
              Chỉ đường
            </Link>
            {!isMock && (
              <Link
                to="/lots/$deviceId"
                params={{ deviceId: rec.lotId }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                <ParkingCircle className="w-3 h-3" />
                Xem chi tiết
              </Link>
            )}
            {!isMock && (
              <Link
                to="/booking/new"
                search={{ lot: rec.lotId, name: rec.lotName }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
              >
                Đặt chỗ
                <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

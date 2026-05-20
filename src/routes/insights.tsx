/**
 * /insights — "Mẹo tìm bãi đỗ thông minh".
 *
 * Trang này KHÔNG phải dashboard kỹ thuật. Nó là người trợ lý trả lời 3
 * câu hỏi người dùng thực sự quan tâm:
 *
 *   1. "Tình hình giao thông bãi đỗ thế nào?"
 *      → Pulse card: tóm tắt 1 dòng + 4 con số chính.
 *
 *   2. "Bãi nào tốt nhất ngay bây giờ?"
 *      → Top 5 cards với badge "Lý do được chọn" (giải thích plain
 *        text thay vì breakdown tỉ lệ phần trăm).
 *
 *   3. "Khi nào nên đi để dễ tìm chỗ?"
 *      → Insight cards: "Giờ vàng hôm nay", "Dự báo 1 giờ tới", "Giá rẻ nhất
 *        khi nào". Mỗi câu là một insight cụ thể, kèm visual hỗ trợ.
 *
 * Khác phiên bản cũ: bỏ section header "01/02/03", bỏ stacked breakdown
 * bar, bỏ công thức kỹ thuật, bỏ table. Layout cards/banners — quen
 * thuộc với người dùng app thông thường.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  CalendarRange,
  MapPin,
  Clock,
  RefreshCw,
  Navigation,
  Lightbulb,
  Wallet,
  Star,
  Zap,
  Sun,
  Moon,
  Coffee,
} from "lucide-react";
import { useGeolocation } from "@/hooks/useGeolocation";
import {
  getRecommendations,
  getLotForecast,
  getLotHeatmap,
  getDynamicPrice,
} from "@/lib/intelligence.functions";
import { DEFAULT_WEIGHTS } from "@/lib/intelligence/recommender";
import { Sparkline } from "@/components/intelligence/Sparkline";
import { Heatmap7x24 } from "@/components/intelligence/Heatmap7x24";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/insights")({
  component: InsightsPage,
  head: () => ({
    meta: [
      { title: "Mẹo tìm bãi — SmartPark" },
      {
        name: "description",
        content:
          "Tìm bãi đỗ tốt nhất ngay bây giờ, biết giờ vàng để đi và dự báo lấp đầy theo thời gian thực.",
      },
    ],
  }),
});

const DEMO_LOTS: { id: string; name: string; area: string }[] = [
  { id: "mock-hoankiem", name: "Hoàn Kiếm", area: "Quận Hoàn Kiếm" },
  { id: "mock-bahung", name: "Ba Đình", area: "Quận Ba Đình" },
  { id: "mock-caugiay", name: "Cầu Giấy", area: "Quận Cầu Giấy" },
  { id: "mock-thanhxuan", name: "Thanh Xuân", area: "Quận Thanh Xuân" },
  { id: "mock-tayho", name: "Tây Hồ", area: "Quận Tây Hồ" },
];

function InsightsPage() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-8 lg:space-y-10">
      <PulseHeader now={now} />
      <TopRecommendationsBlock />
      <TimingInsightsBlock />
    </div>
  );
}

/* =====================================================================
 *  PULSE HEADER — câu trả lời 1 dòng cho "Tình hình giờ thế nào?"
 * ===================================================================== */

function PulseHeader({ now }: { now: Date }) {
  const geo = useGeolocation();
  const pos = geo.pos ?? { lat: 21.0285, lng: 105.8542 };
  const fn = useServerFn(getRecommendations);
  const q = useQuery({
    queryKey: ["pulse", pos.lat, pos.lng],
    queryFn: () =>
      fn({
        data: {
          userLat: pos.lat,
          userLng: pos.lng,
          vehicleType: "car",
          weights: DEFAULT_WEIGHTS,
          topN: 20,
        },
      }),
    retry: 1,
    staleTime: 30_000,
  });

  const stats = useMemo(() => {
    const recs = q.data?.recommendations ?? [];
    if (!recs.length) return null;
    const totalSpots = recs.reduce((s, r) => s + r.total, 0);
    const totalAvail = recs.reduce((s, r) => s + r.available, 0);
    const avgOcc = totalSpots ? 1 - totalAvail / totalSpots : 0;
    const congested = recs.filter((r) => 1 - r.available / r.total > 0.85).length;
    const empty = recs.filter((r) => r.available === 0).length;
    return { avgOcc, totalAvail, totalSpots, lotCount: recs.length, congested, empty };
  }, [q.data]);

  const hour = now.getHours();
  const greeting =
    hour < 5 ? "Khuya rồi" : hour < 11 ? "Chào buổi sáng" : hour < 14 ? "Chào buổi trưa" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";

  // Tóm tắt 1 dòng theo trạng thái thực tế
  const summary = useMemo(() => {
    if (!stats)
      return {
        line: "Đang xem tình hình bãi đỗ quanh bạn",
        tone: "default" as const,
      };
    if (stats.avgOcc > 0.85)
      return {
        line: `Đang cao điểm — chỉ còn ${stats.totalAvail} chỗ trống`,
        tone: "warn" as const,
      };
    if (stats.avgOcc < 0.5)
      return {
        line: `Đường thoáng — ${stats.totalAvail} chỗ trống đang chờ bạn`,
        tone: "good" as const,
      };
    return {
      line: `Bình thường — ${stats.totalAvail} chỗ trống ở ${stats.lotCount} bãi`,
      tone: "primary" as const,
    };
  }, [stats]);

  const summaryStyle =
    summary.tone === "warn"
      ? "from-amber-500/15 via-amber-500/5 to-transparent"
      : summary.tone === "good"
        ? "from-emerald-500/15 via-emerald-500/5 to-transparent"
        : "from-primary/12 via-mint/6 to-transparent";

  return (
    <header
      className={cn(
        "relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br p-6 sm:p-8",
        summaryStyle,
      )}
    >
      <div
        className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-primary/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-10 size-64 rounded-full bg-mint/10 blur-3xl"
        aria-hidden
      />

      <div className="relative space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {greeting} ·{" "}
              <span className="tabular-nums">
                {now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </p>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground max-w-2xl">
              {summary.line}
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/map"
              className="inline-flex items-center gap-1.5 px-3.5 h-10 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition shadow-[var(--shadow-1)]"
            >
              <Navigation className="size-4" />
              Mở bản đồ
            </Link>
            <Link
              to="/map"
              className="inline-flex items-center gap-1.5 px-3.5 h-10 rounded-full bg-card border border-border/60 text-foreground text-sm font-semibold hover:bg-muted transition"
            >
              <Sparkles className="size-4 text-primary" />
              Hỏi AI
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <PulseStat
            icon={MapPin}
            label="Bãi gần bạn"
            value={stats ? String(stats.lotCount) : "—"}
            loading={q.isLoading}
          />
          <PulseStat
            icon={Star}
            label="Chỗ trống"
            value={stats ? String(stats.totalAvail) : "—"}
            tone="good"
            loading={q.isLoading}
          />
          <PulseStat
            icon={TrendingUp}
            label="Bãi cao điểm"
            value={stats ? String(stats.congested) : "—"}
            tone={stats && stats.congested > 0 ? "warn" : "default"}
            loading={q.isLoading}
          />
          <PulseStat
            icon={Zap}
            label="Lấp đầy TB"
            value={stats ? `${Math.round(stats.avgOcc * 100)}%` : "—"}
            progress={stats?.avgOcc}
            loading={q.isLoading}
          />
        </div>
      </div>
    </header>
  );
}

function PulseStat({
  icon: Icon,
  label,
  value,
  tone = "default",
  progress,
  loading,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
  tone?: "default" | "good" | "warn";
  progress?: number;
  loading?: boolean;
}) {
  const toneCfg = {
    default: { ic: "text-foreground/70", bar: "bg-foreground/40" },
    good: { ic: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500" },
    warn: { ic: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500" },
  }[tone];
  return (
    <div className="rounded-2xl bg-card/70 backdrop-blur border border-border/60 p-3.5">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium">
        <Icon className={cn("size-3.5", toneCfg.ic)} />
        {label}
      </div>
      <p className="mt-1 text-xl font-semibold tabular-nums text-foreground leading-tight">
        {loading ? <span className="inline-block h-6 w-12 rounded bg-muted animate-pulse" /> : value}
      </p>
      {progress !== undefined && !loading && (
        <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", toneCfg.bar)}
            style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
          />
        </div>
      )}
    </div>
  );
}

/* =====================================================================
 *  TOP RECOMMENDATIONS — bãi nào tốt nhất ngay bây giờ
 * ===================================================================== */

function TopRecommendationsBlock() {
  const geo = useGeolocation();
  const pos = geo.pos ?? { lat: 21.0285, lng: 105.8542 };
  const fn = useServerFn(getRecommendations);
  const q = useQuery({
    queryKey: ["top-recs", pos.lat, pos.lng],
    queryFn: () =>
      fn({
        data: {
          userLat: pos.lat,
          userLng: pos.lng,
          vehicleType: "car",
          weights: DEFAULT_WEIGHTS,
          topN: 5,
        },
      }),
    retry: 1,
    staleTime: 30_000,
  });

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground inline-flex items-center gap-2">
            <Star className="size-5 text-primary fill-primary/20" />
            Gợi ý tốt nhất ngay bây giờ
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Top 5 bãi quanh bạn, chọn theo gần — còn chỗ — đáng tin cậy.
          </p>
        </div>
        <button
          onClick={() => q.refetch()}
          className="size-9 grid place-items-center rounded-xl border border-border/60 bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition shrink-0"
          aria-label="Làm mới"
        >
          <RefreshCw className={cn("size-4", q.isFetching && "animate-spin")} />
        </button>
      </div>

      {q.isLoading && <RecSkeletons />}
      {q.isError && (
        <div className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur p-8 text-center">
          <p className="text-sm text-muted-foreground">Không tải được dữ liệu.</p>
          <button
            onClick={() => q.refetch()}
            className="mt-2 text-sm text-primary hover:underline font-medium"
          >
            Thử lại
          </button>
        </div>
      )}
      {!q.isLoading && !q.isError && q.data?.recommendations.length === 0 && (
        <div className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur p-8 text-center">
          <p className="text-sm text-muted-foreground">Chưa có bãi nào trong khu vực.</p>
        </div>
      )}
      {!!q.data?.recommendations.length && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {q.data.recommendations.map((r, idx) => (
            <RecommendationCard key={r.id} rank={idx + 1} rec={r} />
          ))}
        </div>
      )}
    </section>
  );
}

function RecommendationCard({
  rank,
  rec,
}: {
  rank: number;
  rec: {
    id: string;
    name: string;
    score: number;
    distanceKm: number;
    available: number;
    total: number;
    etaMin: number;
    raw: { distance: number; availability: number; price: number; reliability: number; predicted: number };
  };
}) {
  const isTop = rank === 1;
  const occRate = rec.total > 0 ? 1 - rec.available / rec.total : 0;

  // Translate breakdown thành reason plain-text — chọn 2 yếu tố mạnh nhất
  const reason = useMemo(() => {
    const factors: { label: string; value: number; emoji: string }[] = [
      { label: "rất gần", value: rec.raw.distance, emoji: "📍" },
      { label: "còn nhiều chỗ", value: rec.raw.availability, emoji: "✨" },
      { label: "giá tốt", value: rec.raw.price, emoji: "💰" },
      { label: "đáng tin cậy", value: rec.raw.reliability, emoji: "✓" },
      { label: "dự báo còn chỗ khi tới", value: rec.raw.predicted, emoji: "🎯" },
    ];
    const top2 = [...factors].sort((a, b) => b.value - a.value).slice(0, 2);
    return top2;
  }, [rec.raw]);

  return (
    <article
      className={cn(
        "group relative rounded-2xl border bg-card/70 backdrop-blur overflow-hidden transition-all hover:shadow-[var(--shadow-2)] hover:-translate-y-0.5",
        isTop ? "border-primary/40 ring-1 ring-primary/20" : "border-border/60",
      )}
    >
      {isTop && (
        <div className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold shadow-[var(--shadow-1)]">
          <Star className="size-2.5 fill-current" />
          Top 1
        </div>
      )}
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "size-10 rounded-xl grid place-items-center shrink-0 font-bold tabular-nums",
              isTop
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {rank}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground truncate">{rec.name}</h3>
            <p className="text-[11px] text-muted-foreground tabular-nums">
              {rec.distanceKm.toFixed(1)} km · ~{Math.round(rec.etaMin)} phút
            </p>
          </div>
        </div>

        {/* Slot bar visual — thay cho stacked criteria */}
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-muted-foreground">Chỗ trống</span>
            <span className="tabular-nums font-semibold text-foreground">
              {rec.available}
              <span className="text-muted-foreground font-normal">/{rec.total}</span>
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                occRate > 0.85
                  ? "bg-amber-500"
                  : occRate > 0.5
                    ? "bg-primary"
                    : "bg-emerald-500",
              )}
              style={{ width: `${Math.min(100, Math.max(0, (1 - occRate) * 100))}%` }}
            />
          </div>
        </div>

        {/* Reason chips — plain text "vì sao bãi này" */}
        <div className="flex flex-wrap gap-1.5">
          {reason.map((r) => (
            <span
              key={r.label}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/60 text-[11px] text-foreground/80"
            >
              <span aria-hidden>{r.emoji}</span>
              {r.label}
            </span>
          ))}
        </div>

        <Link
          to="/map"
          search={{ route: rec.id } as never}
          className={cn(
            "w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-semibold transition",
            isTop
              ? "bg-primary text-primary-foreground hover:opacity-90 shadow-[var(--shadow-1)]"
              : "bg-card border border-border/60 text-foreground hover:bg-muted hover:border-primary/30",
          )}
        >
          <Navigation className="size-3.5" />
          Đi đến bãi này
        </Link>
      </div>
    </article>
  );
}

function RecSkeletons() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="h-48 rounded-2xl bg-muted/40 animate-pulse"
          style={{ animationDelay: `${i * 60}ms` }}
        />
      ))}
    </div>
  );
}

/* =====================================================================
 *  TIMING INSIGHTS — khi nào nên đi
 * ===================================================================== */

function TimingInsightsBlock() {
  const [lotId, setLotId] = useState(DEMO_LOTS[0].id);
  const lot = DEMO_LOTS.find((l) => l.id === lotId) ?? DEMO_LOTS[0];

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground inline-flex items-center gap-2">
          <Lightbulb className="size-5 text-amber-500" />
          Khi nào nên đi để dễ tìm chỗ?
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Chọn một bãi để xem xu hướng theo thời gian và mẹo đi chỗ nhỏ.
        </p>
      </div>

      <LotChips current={lotId} onChange={setLotId} />

      <div className="grid lg:grid-cols-3 gap-3">
        <NextHourCard lotId={lotId} className="lg:col-span-2" />
        <BestPriceCard lotId={lotId} />
      </div>

      <GoldenHoursCard lotId={lotId} area={lot.area} />
    </section>
  );
}

function LotChips({
  current,
  onChange,
}: {
  current: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-thin py-0.5 -mx-1 px-1">
      {DEMO_LOTS.map((l) => {
        const active = l.id === current;
        return (
          <button
            key={l.id}
            onClick={() => onChange(l.id)}
            className={cn(
              "shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border",
              active
                ? "bg-primary text-primary-foreground border-primary shadow-[var(--shadow-1)]"
                : "bg-card border-border/60 text-foreground/80 hover:bg-muted hover:border-primary/30",
            )}
          >
            <MapPin className="size-3" />
            {l.name}
          </button>
        );
      })}
    </div>
  );
}

/* ---- Next 1 hour forecast — câu trả lời rõ ràng ---- */
function NextHourCard({
  lotId,
  className,
}: {
  lotId: string;
  className?: string;
}) {
  const fn = useServerFn(getLotForecast);
  const q = useQuery({
    queryKey: ["fc", lotId],
    queryFn: () => fn({ data: { lotDeviceId: lotId } }),
  });

  // Sinh "verdict" — câu kết luận thay vì để user tự đoán
  const verdict = useMemo(() => {
    if (!q.data) return null;
    const cur = q.data.currentRate;
    const next = q.data.next30.predicted;
    const delta = next - cur;
    if (delta > 0.1)
      return {
        text: "Sẽ đông lên trong 30 phút tới — nên đi sớm",
        emoji: "⚡",
        tone: "warn" as const,
      };
    if (delta < -0.1)
      return {
        text: "Đang vơi dần — đi muộn vài phút sẽ dễ hơn",
        emoji: "🌿",
        tone: "good" as const,
      };
    if (cur > 0.85)
      return {
        text: "Đang rất đông — cân nhắc bãi khác",
        emoji: "🚨",
        tone: "warn" as const,
      };
    return {
      text: "Tình hình ổn định — đi lúc nào cũng được",
      emoji: "👌",
      tone: "default" as const,
    };
  }, [q.data]);

  const verdictCls =
    verdict?.tone === "warn"
      ? "border-amber-500/30 bg-amber-500/5"
      : verdict?.tone === "good"
        ? "border-emerald-500/30 bg-emerald-500/5"
        : "border-border/60 bg-muted/30";

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-card/70 backdrop-blur overflow-hidden",
        className,
      )}
    >
      <header className="flex items-center gap-3 px-5 py-3 border-b border-border/60">
        <span className="size-9 rounded-xl bg-primary/15 text-primary grid place-items-center shrink-0">
          <TrendingUp className="size-4" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Trong 1 giờ tới</h3>
          <p className="text-[11px] text-muted-foreground">Dự báo dựa trên xu hướng 4 tuần</p>
        </div>
      </header>

      <div className="p-5 space-y-4">
        {q.isLoading || !q.data ? (
          <>
            <div className="h-16 rounded-xl bg-muted/40 animate-pulse" />
            <div className="h-20 rounded-xl bg-muted/40 animate-pulse" />
          </>
        ) : (
          <>
            {verdict && (
              <div
                className={cn(
                  "rounded-xl border px-3 py-2.5 flex items-center gap-2.5",
                  verdictCls,
                )}
              >
                <span className="text-xl shrink-0" aria-hidden>
                  {verdict.emoji}
                </span>
                <p className="text-sm font-medium text-foreground">{verdict.text}</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <TimePoint label="Bây giờ" pct={q.data.currentRate} />
              <TimePoint
                label="+30 phút"
                pct={q.data.next30.predicted}
                delta={q.data.next30.predicted - q.data.currentRate}
              />
              <TimePoint
                label="+60 phút"
                pct={q.data.next60.predicted}
                delta={q.data.next60.predicted - q.data.currentRate}
              />
            </div>

            {q.data.sparkline.length >= 2 && (
              <div className="rounded-xl bg-muted/20 border border-border/60 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground">
                    2 giờ vừa qua
                  </p>
                  <p className="text-[10px] text-muted-foreground tabular-nums">
                    {q.data.sparkline.length} điểm
                  </p>
                </div>
                <Sparkline data={q.data.sparkline} width={600} height={48} className="w-full" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TimePoint({
  label,
  pct,
  delta,
}: {
  label: string;
  pct: number;
  delta?: number;
}) {
  const deltaPct = delta !== undefined ? Math.round(delta * 100) : undefined;
  const isUp = deltaPct !== undefined && deltaPct > 0;
  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
      <p className="text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground truncate">
        {label}
      </p>
      <div className="mt-1 flex items-baseline gap-1.5 flex-wrap">
        <p className="text-xl font-semibold tabular-nums">{Math.round(pct * 100)}%</p>
        {deltaPct !== undefined && deltaPct !== 0 && (
          <span
            className={cn(
              "text-[10px] font-semibold tabular-nums inline-flex items-center gap-0.5",
              isUp
                ? "text-amber-600 dark:text-amber-400"
                : "text-emerald-600 dark:text-emerald-400",
            )}
          >
            {isUp ? <TrendingUp className="size-2.5" /> : <TrendingDown className="size-2.5" />}
            {Math.abs(deltaPct)}%
          </span>
        )}
      </div>
      <div className="mt-1.5 h-1 rounded-full bg-card overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            pct > 0.85 ? "bg-amber-500" : pct > 0.5 ? "bg-primary" : "bg-emerald-500",
          )}
          style={{ width: `${Math.min(100, Math.max(0, pct * 100))}%` }}
        />
      </div>
    </div>
  );
}

/* ---- Best price suggestion ---- */
function BestPriceCard({ lotId }: { lotId: string }) {
  const basePrice = 15000;
  const fn = useServerFn(getDynamicPrice);
  const q = useQuery({
    queryKey: ["dp-current", lotId],
    queryFn: () => fn({ data: { lotDeviceId: lotId, basePrice } }),
  });

  const verdict = useMemo(() => {
    if (!q.data) return null;
    const m = q.data.multiplier;
    if (m < 0.95)
      return {
        text: `Đang giảm ${Math.round((1 - m) * 100)}% so với bình thường`,
        emoji: "🎉",
        tone: "good" as const,
      };
    if (m > 1.1)
      return {
        text: `Đang tăng ${Math.round((m - 1) * 100)}% — chờ vắng hơn sẽ rẻ`,
        emoji: "💸",
        tone: "warn" as const,
      };
    return {
      text: "Giá đang ở mức bình thường",
      emoji: "⚖️",
      tone: "default" as const,
    };
  }, [q.data]);

  return (
    <div className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur overflow-hidden flex flex-col">
      <header className="flex items-center gap-3 px-5 py-3 border-b border-border/60">
        <span className="size-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 grid place-items-center shrink-0">
          <Wallet className="size-4" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Giá hiện tại</h3>
          <p className="text-[11px] text-muted-foreground">So với giá gốc</p>
        </div>
      </header>

      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
        {q.isLoading || !q.data ? (
          <div className="h-32 rounded-xl bg-muted/40 animate-pulse" />
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-3xl font-semibold tabular-nums bg-gradient-to-r from-primary to-mint bg-clip-text text-transparent">
                  {q.data.finalPrice.toLocaleString("vi-VN")}đ
                </span>
                <span className="text-[11px] text-muted-foreground">/ giờ</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Giá gốc{" "}
                <span className="line-through tabular-nums">
                  {basePrice.toLocaleString("vi-VN")}đ
                </span>
              </p>
            </div>
            {verdict && (
              <div
                className={cn(
                  "rounded-xl border px-3 py-2.5 flex items-center gap-2.5",
                  verdict.tone === "warn"
                    ? "border-amber-500/30 bg-amber-500/5"
                    : verdict.tone === "good"
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-border/60 bg-muted/30",
                )}
              >
                <span className="text-lg shrink-0" aria-hidden>
                  {verdict.emoji}
                </span>
                <p className="text-xs font-medium text-foreground leading-snug">{verdict.text}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ---- Golden hours from heatmap — curated answer thay heatmap raw ---- */
const DAYS_VI = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function GoldenHoursCard({ lotId, area }: { lotId: string; area: string }) {
  const fn = useServerFn(getLotHeatmap);
  const q = useQuery({
    queryKey: ["hm", lotId],
    queryFn: () => fn({ data: { lotDeviceId: lotId } }),
  });

  // Tính 3 giờ vắng nhất trong tuần (đoán "giờ vàng" theo period sáng/trưa/tối)
  const goldenHours = useMemo(() => {
    if (!q.data) return null;
    const buckets: { period: "morning" | "noon" | "evening"; hour: number; dow: number; v: number }[] = [];
    for (let dow = 0; dow < 7; dow++) {
      const row = q.data.heatmap[dow] ?? [];
      for (let h = 0; h < 24; h++) {
        const v = row[h] ?? 0;
        const period =
          h >= 6 && h < 11 ? "morning" : h >= 11 && h < 17 ? "noon" : h >= 17 && h < 23 ? "evening" : null;
        if (!period) continue;
        buckets.push({ period, hour: h, dow, v });
      }
    }
    const cheapest = (period: "morning" | "noon" | "evening") => {
      const filtered = buckets.filter((b) => b.period === period);
      if (!filtered.length) return null;
      filtered.sort((a, b) => a.v - b.v);
      return filtered[0];
    };
    return {
      morning: cheapest("morning"),
      noon: cheapest("noon"),
      evening: cheapest("evening"),
    };
  }, [q.data]);

  return (
    <div className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur overflow-hidden">
      <header className="flex items-center gap-3 px-5 py-3 border-b border-border/60">
        <span className="size-9 rounded-xl bg-mint/20 text-primary grid place-items-center shrink-0">
          <CalendarRange className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">Giờ vàng để đi</h3>
          <p className="text-[11px] text-muted-foreground truncate">
            Lúc bãi {area} thường vắng nhất trong tuần
          </p>
        </div>
      </header>

      <div className="p-5 space-y-4">
        {q.isLoading || !q.data ? (
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : (
          goldenHours && (
            <div className="grid grid-cols-3 gap-3">
              <GoldenSlot
                icon={Coffee}
                label="Sáng"
                bucket={goldenHours.morning}
              />
              <GoldenSlot icon={Sun} label="Trưa-chiều" bucket={goldenHours.noon} />
              <GoldenSlot icon={Moon} label="Tối" bucket={goldenHours.evening} />
            </div>
          )
        )}

        {q.data && (
          <details className="group">
            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition list-none inline-flex items-center gap-1.5">
              <Clock className="size-3" />
              <span>Xem chi tiết theo từng giờ trong tuần</span>
              <span className="text-muted-foreground/60 group-open:rotate-180 transition-transform inline-block">
                ▾
              </span>
            </summary>
            <div className="mt-3 pt-3 border-t border-border/60 space-y-2">
              <Heatmap7x24 data={q.data.heatmap} />
              <p className="text-[11px] text-muted-foreground">
                Ô càng đậm là lúc càng đông — tránh các khung giờ này nếu muốn dễ tìm chỗ.
              </p>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

function GoldenSlot({
  icon: Icon,
  label,
  bucket,
}: {
  icon: typeof Sun;
  label: string;
  bucket: { hour: number; dow: number; v: number } | null;
}) {
  if (!bucket) {
    return (
      <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-center">
        <Icon className="size-4 text-muted-foreground mx-auto" />
        <p className="text-[10px] text-muted-foreground mt-1">Chưa đủ dữ liệu</p>
      </div>
    );
  }
  const occPct = Math.round(bucket.v * 100);
  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground">
        <Icon className="size-3 text-emerald-600 dark:text-emerald-400" />
        {label}
      </div>
      <p className="mt-1.5 text-lg font-semibold tabular-nums text-foreground leading-none">
        {String(bucket.hour).padStart(2, "0")}:00
      </p>
      <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
        {DAYS_VI[bucket.dow]} · chỉ {occPct}% đầy
      </p>
    </div>
  );
}

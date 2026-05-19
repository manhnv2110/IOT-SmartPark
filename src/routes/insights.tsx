/**
 * /insights — Trung tâm phân tích dữ liệu IoT của SmartPark.
 *
 * Trang này được tổ chức theo 3 lớp logic, đi từ macro → micro:
 *
 *   1. SECTION 1 — TỔNG QUAN MẠNG LƯỚI (network-wide metrics)
 *      KPIs về toàn bộ mạng lưới: lấp đầy trung bình, số bãi online,
 *      slot trống tổng, trạng thái cảnh báo.
 *
 *   2. SECTION 2 — BẢNG XẾP HẠNG MINH BẠCH (explainable ranking)
 *      Bảng xếp hạng các bãi gần user, hiển thị breakdown từng tiêu
 *      chí (5-criteria scoring). Khác với AI Assistant (đã chuyển sang
 *      /map): ở đây user thấy CÔNG THỨC chấm điểm và có thể chỉnh
 *      trọng số. Đây là góc nhìn "white-box" bổ sung cho góc nhìn
 *      "black-box" của AI Assistant.
 *
 *   3. SECTION 3 — PHÂN TÍCH CHI TIẾT THEO BÃI (per-lot deep-dive)
 *      User chọn 1 bãi, xem ĐỒNG THỜI 3 view (forecast, heatmap,
 *      pricing) thay vì tabs ẩn 2 view kia. 3 view này bổ sung cho
 *      nhau (forecast = ngắn hạn, heatmap = chu kỳ tuần, pricing =
 *      tác động kinh tế).
 *
 * Lý do bỏ "Gợi ý dành cho bạn" tab cũ: chức năng đó đã có ở /map
 * dưới dạng AI Assistant với UX tốt hơn (tích hợp routing). Trang
 * /insights tập trung vào PHÂN TÍCH thay vì RA QUYẾT ĐỊNH.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Brain,
  Sparkles,
  TrendingUp,
  TrendingDown,
  CalendarRange,
  Coins,
  MapPin,
  Activity,
  Clock,
  ChevronDown,
  RefreshCw,
  SlidersHorizontal,
  Gauge,
  Zap,
  ArrowUpRight,
  Navigation,
  Info,
  Trophy,
} from "lucide-react";
import { useGeolocation } from "@/hooks/useGeolocation";
import {
  getRecommendations,
  getLotForecast,
  getLotHeatmap,
  getDynamicPrice,
} from "@/lib/intelligence.functions";
import { DEFAULT_WEIGHTS, type RecommenderWeights } from "@/lib/intelligence/recommender";
import { WeightSliders } from "@/components/intelligence/WeightSliders";
import { Sparkline } from "@/components/intelligence/Sparkline";
import { Heatmap7x24 } from "@/components/intelligence/Heatmap7x24";
import { SurgeBadge } from "@/components/intelligence/SurgeBadge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/insights")({
  component: InsightsPage,
  head: () => ({
    meta: [
      { title: "Insights — SmartPark" },
      {
        name: "description",
        content:
          "Trung tâm phân tích dữ liệu IoT SmartPark: tổng quan mạng lưới, bảng xếp hạng minh bạch và phân tích chi tiết theo từng bãi.",
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
    <div className="space-y-10 lg:space-y-12">
      <PageHeader now={now} />

      {/* SECTION 1 — Tổng quan mạng lưới */}
      <Section
        index="01"
        title="Tổng quan mạng lưới"
        description="Chỉ số tức thời của toàn bộ bãi đỗ trong hệ thống IoT — cập nhật mỗi 30 giây."
      >
        <NetworkOverview />
      </Section>

      {/* SECTION 2 — Bảng xếp hạng minh bạch */}
      <Section
        index="02"
        title="Bảng xếp hạng minh bạch"
        description="Xếp hạng các bãi gần bạn theo công thức 5 tiêu chí, cho phép tự chỉnh trọng số. Khác AI Assistant: ở đây bạn thấy mọi con số."
      >
        <ExplainableRanking />
      </Section>

      {/* SECTION 3 — Phân tích chi tiết theo bãi */}
      <Section
        index="03"
        title="Phân tích chi tiết theo bãi"
        description="Chọn một bãi và xem cùng lúc ba góc nhìn: dự báo ngắn hạn, chu kỳ tuần, và tác động giá động."
      >
        <PerLotAnalytics />
      </Section>
    </div>
  );
}

/* =====================================================================
 *  SHARED — section header + page header
 * ===================================================================== */

function PageHeader({ now }: { now: Date }) {
  const timeStr = now.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateStr = now.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  });
  return (
    <header className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 via-mint/5 to-transparent p-6 sm:p-8">
      <div
        className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-primary/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-10 size-64 rounded-full bg-mint/10 blur-3xl"
        aria-hidden
      />

      <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card/70 backdrop-blur border border-border/60 text-primary text-[11px] font-semibold tracking-wide">
            <Brain className="size-3.5" />
            SMARTPARK · TRUNG TÂM PHÂN TÍCH
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
            Insights{" "}
            <span className="bg-gradient-to-r from-primary to-mint bg-clip-text text-transparent">
              dữ liệu IoT
            </span>
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Tổng quan mạng lưới, công thức chấm điểm minh bạch và phân tích chu kỳ — tổng hợp
            từ cảm biến IoT thời gian thực.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/map"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition shadow-[var(--shadow-1)]"
          >
            <Sparkles className="size-3.5" />
            Trợ lý AI trên bản đồ
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-card/80 backdrop-blur border border-border/60 text-xs">
            <span className="relative inline-flex">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75" />
            </span>
            <span className="font-semibold text-foreground">Live</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-card/80 backdrop-blur border border-border/60 text-xs text-muted-foreground tabular-nums">
            <Clock className="size-3.5 text-primary" />
            {timeStr}
            <span className="text-border">·</span>
            <span className="capitalize">{dateStr}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

function Section({
  index,
  title,
  description,
  children,
}: {
  index: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl font-semibold tabular-nums text-muted-foreground/40 tracking-tight shrink-0 w-12">
          {index}
        </span>
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{description}</p>
        </div>
      </div>
      <div className="pl-0 sm:pl-15">{children}</div>
    </section>
  );
}

/* =====================================================================
 *  SECTION 1 — NETWORK OVERVIEW
 * ===================================================================== */

function NetworkOverview() {
  const geo = useGeolocation();
  const pos = geo.pos ?? { lat: 21.0285, lng: 105.8542 };
  const fn = useServerFn(getRecommendations);
  const q = useQuery({
    queryKey: ["overview", pos.lat, pos.lng],
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
    return {
      avgOcc,
      totalAvail,
      totalSpots,
      lotCount: recs.length,
      congested,
      empty,
    };
  }, [q.data]);

  const congestionLevel =
    !stats || stats.avgOcc < 0.5
      ? { label: "Thông thoáng", tone: "good" as const }
      : stats.avgOcc < 0.85
        ? { label: "Bình thường", tone: "default" as const }
        : { label: "Cao điểm", tone: "warn" as const };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
      <KpiCard
        icon={Gauge}
        label="Lấp đầy mạng lưới"
        value={stats ? `${Math.round(stats.avgOcc * 100)}%` : "—"}
        hint={stats ? `${stats.totalAvail}/${stats.totalSpots} chỗ trống` : "Đang tải dữ liệu"}
        loading={q.isLoading}
        tone={
          stats && stats.avgOcc > 0.85 ? "warn" : stats && stats.avgOcc < 0.5 ? "good" : "primary"
        }
        progress={stats?.avgOcc}
      />
      <KpiCard
        icon={MapPin}
        label="Bãi trong khu vực"
        value={stats ? String(stats.lotCount) : "—"}
        hint="Bán kính ~5 km quanh bạn"
        loading={q.isLoading}
      />
      <KpiCard
        icon={TrendingUp}
        label="Bãi đang cao điểm"
        value={stats ? String(stats.congested) : "—"}
        hint={stats ? `${stats.empty} bãi đã hết chỗ` : "Đang phân tích"}
        loading={q.isLoading}
        tone={stats && stats.congested > 0 ? "warn" : "default"}
      />
      <KpiCard
        icon={Zap}
        label="Trạng thái hệ thống"
        value={congestionLevel.label}
        hint={
          congestionLevel.tone === "good"
            ? "Dễ tìm chỗ ở hầu hết khu vực"
            : congestionLevel.tone === "warn"
              ? "Khuyến nghị đặt chỗ trước"
              : "Hoạt động ổn định"
        }
        tone={congestionLevel.tone === "default" ? "primary" : congestionLevel.tone}
      />
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
  loading,
  progress,
}: {
  icon: typeof Brain;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "good" | "warn" | "primary";
  loading?: boolean;
  progress?: number;
}) {
  const toneCfg = {
    default: {
      icon: "bg-muted text-foreground",
      bar: "bg-foreground/40",
      value: "text-foreground",
    },
    primary: {
      icon: "bg-primary/15 text-primary",
      bar: "bg-primary",
      value: "text-foreground",
    },
    good: {
      icon: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
      bar: "bg-emerald-500",
      value: "text-emerald-600 dark:text-emerald-400",
    },
    warn: {
      icon: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
      bar: "bg-amber-500",
      value: "text-amber-600 dark:text-amber-400",
    },
  }[tone];

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 backdrop-blur p-4 sm:p-5 transition-all hover:border-primary/30 hover:shadow-[var(--shadow-2)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </p>
        <span
          className={cn(
            "size-9 rounded-xl grid place-items-center transition-transform group-hover:scale-110",
            toneCfg.icon,
          )}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <p
        className={cn(
          "mt-3 text-2xl sm:text-[1.65rem] font-semibold tabular-nums truncate leading-tight",
          toneCfg.value,
        )}
      >
        {loading ? <span className="inline-block h-7 w-20 rounded bg-muted animate-pulse" /> : value}
      </p>
      {hint && (
        <p className="text-[11px] text-muted-foreground mt-1 truncate">
          {loading ? <span className="inline-block h-3 w-32 rounded bg-muted animate-pulse" /> : hint}
        </p>
      )}
      {progress !== undefined && !loading && (
        <div className="mt-3 h-1 rounded-full bg-muted overflow-hidden">
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
 *  SECTION 2 — EXPLAINABLE RANKING (replaces old "Recommendations")
 * ===================================================================== */

function ExplainableRanking() {
  const [weights, setWeights] = useState<RecommenderWeights>(DEFAULT_WEIGHTS);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const geo = useGeolocation();
  const pos = geo.pos ?? { lat: 21.0285, lng: 105.8542 };

  const fn = useServerFn(getRecommendations);
  const q = useQuery({
    queryKey: ["ranking", pos.lat, pos.lng, weights],
    queryFn: () =>
      fn({
        data: {
          userLat: pos.lat,
          userLng: pos.lng,
          vehicleType: "car",
          weights,
          topN: 5,
        },
      }),
    retry: 1,
    staleTime: 30_000,
  });

  return (
    <div className="rounded-3xl border border-border/60 bg-card/70 backdrop-blur overflow-hidden">
      <header className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-border/60 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="min-w-0 flex items-center gap-3">
          <span className="size-10 rounded-xl bg-primary/15 text-primary grid place-items-center shrink-0">
            <Trophy className="size-5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-foreground">Top 5 bãi gần bạn</h3>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              Công thức:{" "}
              <code className="font-mono text-foreground/80">score = Σ wᵢ · feature_i</code>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => q.refetch()}
            className="size-9 grid place-items-center rounded-xl border border-border/60 bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition"
            aria-label="Làm mới"
          >
            <RefreshCw className={cn("size-4", q.isFetching && "animate-spin")} />
          </button>
          <button
            onClick={() => setCustomizeOpen((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-medium border transition",
              customizeOpen
                ? "bg-primary text-primary-foreground border-primary shadow-[var(--shadow-1)]"
                : "bg-card border-border/60 text-foreground/80 hover:bg-muted",
            )}
          >
            <SlidersHorizontal className="size-3.5" />
            <span className="hidden sm:inline">Trọng số</span>
            <ChevronDown className={cn("size-3 transition", customizeOpen && "rotate-180")} />
          </button>
        </div>
      </header>

      {customizeOpen && (
        <div className="px-5 sm:px-6 py-4 border-b border-border/60 bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-foreground inline-flex items-center gap-1.5">
              <Info className="size-3.5 text-muted-foreground" />
              Điều chỉnh trọng số (tổng tự chuẩn hoá về 100%)
            </p>
            <button
              onClick={() => setWeights(DEFAULT_WEIGHTS)}
              className="text-[11px] text-primary hover:underline font-medium"
            >
              ↺ Mặc định
            </button>
          </div>
          <WeightSliders value={weights} onChange={setWeights} />
        </div>
      )}

      <div className="p-3 sm:p-4">
        {q.isLoading && <RankSkeletons />}
        {q.isError && (
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">Không tải được dữ liệu xếp hạng.</p>
            <button
              onClick={() => q.refetch()}
              className="text-sm text-primary hover:underline font-medium"
            >
              Thử lại
            </button>
          </div>
        )}
        {!q.isLoading && !q.isError && q.data?.recommendations.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-12">
            Chưa có bãi nào trong khu vực.
          </p>
        )}
        {!!q.data?.recommendations.length && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground">
                  <th className="text-left px-3 py-2 w-12">#</th>
                  <th className="text-left px-3 py-2">Bãi đỗ</th>
                  <th className="text-right px-3 py-2 hidden sm:table-cell">K.cách</th>
                  <th className="text-right px-3 py-2 hidden md:table-cell">Còn chỗ</th>
                  <th className="text-left px-3 py-2 min-w-[180px] hidden lg:table-cell">
                    Đóng góp tiêu chí
                  </th>
                  <th className="text-right px-3 py-2">Điểm</th>
                  <th className="text-right px-3 py-2 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {q.data.recommendations.map((r, idx) => (
                  <RankRow key={r.id} rank={idx + 1} rec={r} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function RankRow({
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
    breakdown: { distance: number; availability: number; price: number; reliability: number; predicted: number };
    raw: { distance: number; availability: number; price: number; reliability: number; predicted: number };
  };
}) {
  const scorePct = Math.round(rec.score * 100);
  const isTop = rank === 1;
  return (
    <tr
      className={cn(
        "border-t border-border/40 hover:bg-muted/30 transition-colors",
        isTop && "bg-primary/5",
      )}
    >
      <td className="px-3 py-3 align-middle">
        <span
          className={cn(
            "inline-grid place-items-center size-7 rounded-lg text-xs font-bold tabular-nums",
            isTop
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {rank}
        </span>
      </td>
      <td className="px-3 py-3 align-middle min-w-0">
        <div className="font-semibold text-foreground truncate">{rec.name}</div>
        <div className="text-[11px] text-muted-foreground sm:hidden tabular-nums">
          {rec.distanceKm.toFixed(1)} km · {rec.available}/{rec.total} trống
        </div>
      </td>
      <td className="px-3 py-3 align-middle text-right hidden sm:table-cell tabular-nums text-muted-foreground">
        {rec.distanceKm.toFixed(1)} km
      </td>
      <td className="px-3 py-3 align-middle text-right hidden md:table-cell tabular-nums">
        <span className="font-medium text-foreground">{rec.available}</span>
        <span className="text-muted-foreground">/{rec.total}</span>
      </td>
      <td className="px-3 py-3 align-middle hidden lg:table-cell">
        <BreakdownBar breakdown={rec.breakdown} totalScore={rec.score} />
      </td>
      <td className="px-3 py-3 align-middle text-right">
        <div
          className={cn(
            "inline-flex items-baseline gap-0.5 font-semibold tabular-nums",
            isTop ? "text-primary text-lg" : "text-foreground",
          )}
        >
          {scorePct}
          <span className="text-[10px] text-muted-foreground">/100</span>
        </div>
      </td>
      <td className="px-3 py-3 align-middle text-right">
        <Link
          to="/map"
          search={{ route: rec.id } as never}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-[11px] font-semibold transition"
        >
          <Navigation className="size-3" />
          <span className="hidden xl:inline">Đi</span>
        </Link>
      </td>
    </tr>
  );
}

/**
 * Stacked bar showing weighted contribution of each criterion to the
 * total score. Width = breakdown[i] / score so total fills 100%.
 */
function BreakdownBar({
  breakdown,
  totalScore,
}: {
  breakdown: { distance: number; availability: number; price: number; reliability: number; predicted: number };
  totalScore: number;
}) {
  const segs = [
    { key: "predicted", label: "Dự báo", value: breakdown.predicted, color: "bg-primary" },
    { key: "distance", label: "K.cách", value: breakdown.distance, color: "bg-mint/80" },
    { key: "availability", label: "Còn chỗ", value: breakdown.availability, color: "bg-emerald-500" },
    { key: "price", label: "Giá", value: breakdown.price, color: "bg-amber-400" },
    { key: "reliability", label: "Tin cậy", value: breakdown.reliability, color: "bg-violet-400" },
  ];
  const sum = totalScore || 1;
  return (
    <div className="space-y-1">
      <div className="h-2 rounded-full bg-muted overflow-hidden flex">
        {segs.map((s) => (
          <div
            key={s.key}
            className={cn("h-full transition-all", s.color)}
            style={{ width: `${(s.value / sum) * 100}%` }}
            title={`${s.label}: ${Math.round((s.value / sum) * 100)}%`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] text-muted-foreground">
        {segs.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1">
            <span className={cn("size-1.5 rounded-full", s.color)} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function RankSkeletons() {
  return (
    <div className="space-y-2 px-1 py-2">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="h-14 rounded-xl bg-muted/40 animate-pulse"
          style={{ animationDelay: `${i * 60}ms` }}
        />
      ))}
    </div>
  );
}

/* =====================================================================
 *  SECTION 3 — PER-LOT ANALYTICS (forecast + heatmap + pricing simultaneously)
 * ===================================================================== */

function PerLotAnalytics() {
  const [lotId, setLotId] = useState(DEMO_LOTS[0].id);
  const lot = DEMO_LOTS.find((l) => l.id === lotId) ?? DEMO_LOTS[0];

  return (
    <div className="space-y-4">
      {/* Lot picker dạng chips */}
      <div className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-2 px-1">
          Chọn bãi để phân tích
        </p>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-0.5">
          {DEMO_LOTS.map((l) => {
            const active = l.id === lotId;
            return (
              <button
                key={l.id}
                onClick={() => setLotId(l.id)}
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
      </div>

      {/* 3 panels grid - desktop: forecast wide-left, pricing top-right, heatmap full bottom */}
      <div className="grid lg:grid-cols-2 gap-4">
        <AnalyticsCard
          icon={TrendingUp}
          title="Dự báo ngắn hạn"
          subtitle="Xu hướng lấp đầy 30 và 60 phút tới"
          tone="primary"
        >
          <ForecastView lotId={lotId} />
        </AnalyticsCard>

        <AnalyticsCard
          icon={Coins}
          title="Giá động"
          subtitle="Tác động của tỉ lệ lấp đầy lên giá"
          tone="warn"
        >
          <PricingView lotId={lotId} />
        </AnalyticsCard>

        <AnalyticsCard
          icon={CalendarRange}
          title="Heatmap chu kỳ tuần"
          subtitle={`Trung bình lấp đầy 7×24 — ${lot.area}`}
          tone="mint"
          className="lg:col-span-2"
        >
          <HeatmapView lotId={lotId} />
        </AnalyticsCard>
      </div>
    </div>
  );
}

function AnalyticsCard({
  icon: Icon,
  title,
  subtitle,
  tone,
  children,
  className,
}: {
  icon: typeof Brain;
  title: string;
  subtitle: string;
  tone: "primary" | "warn" | "mint";
  children: React.ReactNode;
  className?: string;
}) {
  const toneCfg = {
    primary: { icon: "bg-primary/15 text-primary", border: "from-primary/5" },
    warn: { icon: "bg-amber-500/15 text-amber-600 dark:text-amber-400", border: "from-amber-500/5" },
    mint: { icon: "bg-mint/15 text-primary", border: "from-mint/5" },
  }[tone];

  return (
    <div
      className={cn(
        "rounded-3xl border border-border/60 bg-card/70 backdrop-blur overflow-hidden flex flex-col",
        className,
      )}
    >
      <header
        className={cn(
          "flex items-center gap-3 px-5 py-4 border-b border-border/60 bg-gradient-to-r to-transparent",
          toneCfg.border,
        )}
      >
        <span
          className={cn(
            "size-10 rounded-xl grid place-items-center shrink-0",
            toneCfg.icon,
          )}
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
        </div>
      </header>
      <div className="p-5 flex-1">{children}</div>
    </div>
  );
}

/* ---- Forecast ---- */
function ForecastView({ lotId }: { lotId: string }) {
  const fn = useServerFn(getLotForecast);
  const q = useQuery({
    queryKey: ["fc", lotId],
    queryFn: () => fn({ data: { lotDeviceId: lotId } }),
  });

  if (q.isLoading || !q.data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-muted/40 animate-pulse" />
          ))}
        </div>
        <div className="h-20 rounded-2xl bg-muted/40 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Hiện tại" pct={q.data.currentRate} />
        <Stat
          label="+30 phút"
          pct={q.data.next30.predicted}
          confidence={q.data.next30.confidence}
          delta={q.data.next30.predicted - q.data.currentRate}
        />
        <Stat
          label="+60 phút"
          pct={q.data.next60.predicted}
          confidence={q.data.next60.confidence}
          delta={q.data.next60.predicted - q.data.currentRate}
        />
      </div>
      {q.data.sparkline.length >= 2 && (
        <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground">
              2 giờ gần nhất
            </p>
            <p className="text-[10px] text-muted-foreground tabular-nums">
              {q.data.sparkline.length} điểm
            </p>
          </div>
          <Sparkline data={q.data.sparkline} width={600} height={56} className="w-full" />
        </div>
      )}
      <p className="text-[11px] text-muted-foreground border-t border-border/60 pt-3 leading-relaxed">
        <span className="font-medium text-foreground">Mô hình:</span> EMA (drift) kết hợp seasonal
        average của cùng giờ, cùng thứ trong 4 tuần gần nhất.
      </p>
    </div>
  );
}

function Stat({
  label,
  pct,
  confidence,
  delta,
}: {
  label: string;
  pct: number;
  confidence?: number;
  delta?: number;
}) {
  const deltaPct = delta !== undefined ? Math.round(delta * 100) : undefined;
  const isUp = deltaPct !== undefined && deltaPct > 0;
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-1">
        <p className="text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground truncate">
          {label}
        </p>
        {deltaPct !== undefined && deltaPct !== 0 && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[10px] tabular-nums font-semibold px-1.5 py-0.5 rounded-md shrink-0",
              isUp
                ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
            )}
          >
            {isUp ? <ArrowUpRight className="size-3" /> : <TrendingDown className="size-3" />}
            {Math.abs(deltaPct)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-semibold tabular-nums mt-1">{Math.round(pct * 100)}%</p>
      <div className="text-[10px] text-muted-foreground mt-0.5">
        {confidence !== undefined ? `tin cậy ${Math.round(confidence * 100)}%` : "lấp đầy hiện tại"}
      </div>
      <div className="mt-2 h-1 rounded-full bg-card overflow-hidden">
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

/* ---- Heatmap ---- */
function HeatmapView({ lotId }: { lotId: string }) {
  const fn = useServerFn(getLotHeatmap);
  const q = useQuery({
    queryKey: ["hm", lotId],
    queryFn: () => fn({ data: { lotDeviceId: lotId } }),
  });

  if (q.isLoading || !q.data) {
    return <div className="h-56 rounded-2xl bg-muted/40 animate-pulse" />;
  }
  return (
    <div className="space-y-3">
      <Heatmap7x24 data={q.data.heatmap} />
      <p className="text-[11px] text-muted-foreground border-t border-border/60 pt-3 leading-relaxed">
        <span className="font-medium text-foreground">Đọc biểu đồ:</span> trung bình lấp đầy theo
        từng giờ trong tuần — ô càng đậm càng khó tìm chỗ. Dùng để chọn khung giờ đến phù hợp.
      </p>
    </div>
  );
}

/* ---- Pricing ---- */
function PricingView({ lotId }: { lotId: string }) {
  const [occ, setOcc] = useState(0.8);
  const basePrice = 15000;
  const fn = useServerFn(getDynamicPrice);
  const q = useQuery({
    queryKey: ["dp", lotId, occ],
    queryFn: () => fn({ data: { lotDeviceId: lotId, basePrice, currentOccRate: occ } }),
  });

  return (
    <div className="space-y-4">
      {q.data ? (
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/8 via-primary/5 to-mint/8 p-4">
          <div
            className="pointer-events-none absolute -top-12 -right-8 size-40 rounded-full bg-amber-500/10 blur-3xl"
            aria-hidden
          />
          <div className="relative">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Giá đề xuất / giờ
            </p>
            <div className="mt-1 flex items-baseline gap-2 flex-wrap">
              <span className="text-3xl font-semibold tabular-nums bg-gradient-to-r from-primary to-mint bg-clip-text text-transparent">
                {q.data.finalPrice.toLocaleString("vi-VN")}đ
              </span>
              <span className="text-[11px] text-muted-foreground line-through">
                {basePrice.toLocaleString("vi-VN")}đ
              </span>
              <SurgeBadge multiplier={q.data.multiplier} className="ml-auto" />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">{q.data.reason}</p>
          </div>
        </div>
      ) : (
        <div className="h-24 rounded-2xl bg-muted/40 animate-pulse" />
      )}

      <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-muted-foreground font-medium">Mô phỏng tỉ lệ lấp đầy</span>
          <span className="tabular-nums font-semibold text-foreground">
            {Math.round(occ * 100)}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={occ}
          onChange={(e) => setOcc(parseFloat(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5 font-medium">
          <span>Trống</span>
          <span>Cân bằng</span>
          <span>Đầy</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-[11px]">
        <RuleChip label=">85% lấp đầy" value="+30%" tone="warn" />
        <RuleChip label="≤30%" value="−15%" tone="good" />
        <RuleChip label="Dự báo tăng" value="+5%" tone="primary" />
      </div>
    </div>
  );
}

function RuleChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "good" | "warn" | "primary";
}) {
  const cls = {
    good: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    warn: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    primary: "bg-primary/10 text-primary border-primary/20",
  }[tone];
  return (
    <div className={cn("rounded-xl border px-2.5 py-2 text-center", cls)}>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="font-semibold tabular-nums mt-0.5">{value}</p>
    </div>
  );
}

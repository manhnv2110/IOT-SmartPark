import { createFileRoute } from "@tanstack/react-router";
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
import { RecommendationCard } from "@/components/intelligence/RecommendationCard";
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
          "Bảng điều khiển thông minh SmartPark: gợi ý bãi tối ưu, dự báo lấp đầy, heatmap nhu cầu và giá động theo thời gian thực.",
      },
    ],
  }),
});

const DEMO_LOTS = [
  { id: "mock-hoankiem", name: "Hoàn Kiếm", area: "Quận Hoàn Kiếm" },
  { id: "mock-bahung", name: "Ba Đình", area: "Quận Ba Đình" },
  { id: "mock-caugiay", name: "Cầu Giấy", area: "Quận Cầu Giấy" },
  { id: "mock-thanhxuan", name: "Thanh Xuân", area: "Quận Thanh Xuân" },
  { id: "mock-tayho", name: "Tây Hồ", area: "Quận Tây Hồ" },
];

type AnalyticsTab = "forecast" | "heatmap" | "pricing";

function InsightsPage() {
  const [selectedLot, setSelectedLot] = useState(DEMO_LOTS[0].id);
  const [tab, setTab] = useState<AnalyticsTab>("forecast");
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader now={now} />
      <KpiStrip />

      <div className="grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-5 lg:gap-6">
        <RecommenderPanel />
        <AnalyticsPanel
          lotId={selectedLot}
          onLotChange={setSelectedLot}
          tab={tab}
          onTabChange={setTab}
        />
      </div>
    </div>
  );
}

// ============ Header ============
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
      {/* decorative blobs */}
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
            SMARTPARK · BỘ NÃO IOT
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
            Bảng điều khiển{" "}
            <span className="bg-gradient-to-r from-primary to-mint bg-clip-text text-transparent">
              thông minh
            </span>
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Gợi ý bãi đỗ phù hợp, dự báo lấp đầy và giá động theo thời gian thực — tổng hợp từ
            cảm biến IoT trên toàn mạng lưới.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/80 backdrop-blur border border-border/60 text-xs">
            <span className="relative inline-flex">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75" />
            </span>
            <span className="font-semibold text-foreground">Live</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/80 backdrop-blur border border-border/60 text-xs text-muted-foreground tabular-nums">
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

// ============ KPI strip ============
function KpiStrip() {
  const geo = useGeolocation();
  const pos = geo.pos ?? { lat: 21.0285, lng: 105.8542 };
  const fn = useServerFn(getRecommendations);
  const q = useQuery({
    queryKey: ["kpi-rec", pos.lat, pos.lng],
    queryFn: () =>
      fn({
        data: {
          userLat: pos.lat,
          userLng: pos.lng,
          vehicleType: "car",
          weights: DEFAULT_WEIGHTS,
          topN: 10,
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
    const best = recs[0];
    return {
      avgOcc,
      totalAvail,
      totalSpots,
      bestName: best.name,
      bestDist: best.distanceKm,
      lotCount: recs.length,
    };
  }, [q.data]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
      <KpiCard
        icon={Gauge}
        label="Lấp đầy mạng lưới"
        value={stats ? `${Math.round(stats.avgOcc * 100)}%` : "—"}
        hint={stats ? `${stats.totalAvail}/${stats.totalSpots} chỗ trống` : "Đang tải dữ liệu"}
        loading={q.isLoading}
        tone={
          stats && stats.avgOcc > 0.85 ? "warn" : stats && stats.avgOcc < 0.5 ? "good" : "default"
        }
        progress={stats?.avgOcc}
      />
      <KpiCard
        icon={Sparkles}
        label="Đề xuất số 1"
        value={stats?.bestName ?? "—"}
        hint={stats ? `Cách bạn ${stats.bestDist.toFixed(1)} km` : "Đang chấm điểm"}
        loading={q.isLoading}
        tone="primary"
      />
      <KpiCard
        icon={MapPin}
        label="Bãi trong khu vực"
        value={stats ? String(stats.lotCount) : "—"}
        hint="Bán kính ~5 km quanh bạn"
        loading={q.isLoading}
      />
      <KpiCard
        icon={Zap}
        label="Trạng thái hệ thống"
        value="Bình thường"
        hint="Chưa có cảnh báo cao điểm"
        tone="good"
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

// ============ Recommender panel (primary) ============
function RecommenderPanel() {
  const [weights, setWeights] = useState<RecommenderWeights>(DEFAULT_WEIGHTS);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const geo = useGeolocation();
  const pos = geo.pos ?? { lat: 21.0285, lng: 105.8542 };

  const fn = useServerFn(getRecommendations);
  const q = useQuery({
    queryKey: ["rec", pos.lat, pos.lng, weights],
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
    <section className="rounded-3xl border border-border/60 bg-card/70 backdrop-blur overflow-hidden flex flex-col">
      <header className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-border/60 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="min-w-0 flex items-center gap-3">
          <span className="size-10 rounded-xl bg-primary/15 text-primary grid place-items-center shrink-0">
            <Sparkles className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">Gợi ý dành cho bạn</h2>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              Xếp hạng theo khoảng cách, tỉ lệ trống, giá và độ tin cậy
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
            <span className="hidden sm:inline">Tuỳ chỉnh</span>
            <ChevronDown className={cn("size-3 transition", customizeOpen && "rotate-180")} />
          </button>
        </div>
      </header>

      {customizeOpen && (
        <div className="px-5 sm:px-6 py-4 border-b border-border/60 bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-foreground">Trọng số chấm điểm</p>
            <button
              onClick={() => setWeights(DEFAULT_WEIGHTS)}
              className="text-[11px] text-primary hover:underline font-medium"
            >
              ↺ Mặc định
            </button>
          </div>
          <WeightSliders value={weights} onChange={setWeights} />
          <p className="mt-3 text-[10px] text-muted-foreground font-mono">
            score = Σ wᵢ · feature_i · chuẩn hoá min-max trong tập ứng viên
          </p>
        </div>
      )}

      <div className="p-5 sm:p-6 space-y-3">
        {q.isLoading && <RecSkeletons />}
        {q.isError && (
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">Không tải được gợi ý.</p>
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
            Chưa có bãi nào phù hợp.
          </p>
        )}
        {q.data?.recommendations.map((r, idx) => (
          <RecommendationCard
            key={r.id}
            rank={idx + 1}
            id={r.id}
            name={r.name}
            score={r.score}
            distanceKm={r.distanceKm}
            etaMin={r.etaMin}
            available={r.available}
            total={r.total}
            predictedAvailable={r.predictedAvailable}
            predictionConfidence={r.predictionConfidence}
            bars={[
              { label: "Du doan", value: r.breakdown.predicted, rawPct: r.raw.predicted * 100 },
              { label: "Khoảng cách", value: r.breakdown.distance, rawPct: r.raw.distance * 100 },
              {
                label: "Còn chỗ",
                value: r.breakdown.availability,
                rawPct: r.raw.availability * 100,
              },
              { label: "Giá thấp", value: r.breakdown.price, rawPct: r.raw.price * 100 },
              { label: "Tin cậy", value: r.breakdown.reliability, rawPct: r.raw.reliability * 100 },
            ]}
          />
        ))}
      </div>
    </section>
  );
}

function RecSkeletons() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-32 rounded-2xl bg-muted/40 animate-pulse"
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </>
  );
}

// ============ Analytics panel (tabs share one lot) ============
function AnalyticsPanel({
  lotId,
  onLotChange,
  tab,
  onTabChange,
}: {
  lotId: string;
  onLotChange: (id: string) => void;
  tab: AnalyticsTab;
  onTabChange: (t: AnalyticsTab) => void;
}) {
  const lot = DEMO_LOTS.find((l) => l.id === lotId) ?? DEMO_LOTS[0];
  return (
    <section className="rounded-3xl border border-border/60 bg-card/70 backdrop-blur overflow-hidden flex flex-col">
      <header className="px-5 sm:px-6 py-4 border-b border-border/60 bg-gradient-to-r from-mint/5 to-transparent">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="size-10 rounded-xl bg-mint/15 text-primary grid place-items-center shrink-0">
              <Activity className="size-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">Phân tích bãi đỗ</h2>
              <p className="text-xs text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                <MapPin className="size-3" />
                {lot.area}
              </p>
            </div>
          </div>
          <LotSelect value={lotId} onChange={onLotChange} />
        </div>
      </header>

      <div className="px-3 sm:px-4 pt-3 pb-0 border-b border-border/60">
        <TabsBar tab={tab} onChange={onTabChange} />
      </div>

      <div className="p-5 sm:p-6">
        {tab === "forecast" && <ForecastView lotId={lotId} />}
        {tab === "heatmap" && <HeatmapView lotId={lotId} />}
        {tab === "pricing" && <PricingView lotId={lotId} />}
      </div>
    </section>
  );
}

function TabsBar({ tab, onChange }: { tab: AnalyticsTab; onChange: (t: AnalyticsTab) => void }) {
  const items: { id: AnalyticsTab; label: string; icon: typeof Brain }[] = [
    { id: "forecast", label: "Dự báo", icon: TrendingUp },
    { id: "heatmap", label: "Heatmap", icon: CalendarRange },
    { id: "pricing", label: "Giá động", icon: Coins },
  ];
  return (
    <div className="inline-flex gap-1 p-1 rounded-xl bg-muted/60">
      {items.map((it) => {
        const active = tab === it.id;
        const Icon = it.icon;
        return (
          <button
            key={it.id}
            onClick={() => onChange(it.id)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold transition-all",
              active
                ? "bg-card text-foreground shadow-[var(--shadow-1)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

function LotSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative shrink-0">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none pl-3 pr-9 h-9 rounded-xl bg-card text-xs font-medium text-foreground border border-border/60 hover:border-primary/40 focus:outline-none focus:border-primary cursor-pointer transition"
      >
        {DEMO_LOTS.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
      <ChevronDown className="size-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
    </div>
  );
}

// ---- Forecast view ----
function ForecastView({ lotId }: { lotId: string }) {
  const fn = useServerFn(getLotForecast);
  const q = useQuery({
    queryKey: ["fc", lotId],
    queryFn: () => fn({ data: { lotDeviceId: lotId } }),
  });

  if (q.isLoading || !q.data) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-muted/40 animate-pulse" />
          ))}
        </div>
        <div className="h-24 rounded-2xl bg-muted/40 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
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
        <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground">
              2 giờ gần nhất
            </p>
            <p className="text-[10px] text-muted-foreground tabular-nums">
              {q.data.sparkline.length} điểm dữ liệu
            </p>
          </div>
          <Sparkline data={q.data.sparkline} width={600} height={64} className="w-full" />
        </div>
      )}
      <p className="text-[11px] text-muted-foreground border-t border-border/60 pt-3 leading-relaxed">
        <span className="font-medium text-foreground">Mô hình:</span> EMA (drift) kết hợp seasonal
        average của cùng giờ, cùng thứ trong 4 tuần.
      </p>
    </div>
  );
}

// ---- Heatmap view ----
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
        từng giờ trong tuần — ô càng đậm càng khó tìm chỗ.
      </p>
    </div>
  );
}

// ---- Pricing view ----
function PricingView({ lotId }: { lotId: string }) {
  const [occ, setOcc] = useState(0.8);
  const basePrice = 15000;
  const fn = useServerFn(getDynamicPrice);
  const q = useQuery({
    queryKey: ["dp", lotId, occ],
    queryFn: () => fn({ data: { lotDeviceId: lotId, basePrice, currentOccRate: occ } }),
  });

  return (
    <div className="space-y-5">
      {q.data ? (
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/12 via-primary/5 to-mint/10 p-5">
          <div
            className="pointer-events-none absolute -top-12 -right-8 size-40 rounded-full bg-primary/15 blur-3xl"
            aria-hidden
          />
          <div className="relative">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Giá đề xuất
            </p>
            <div className="mt-1 flex items-baseline gap-2 flex-wrap">
              <span className="text-4xl font-semibold tabular-nums bg-gradient-to-r from-primary to-mint bg-clip-text text-transparent">
                {q.data.finalPrice.toLocaleString("vi-VN")}đ
              </span>
              <span className="text-xs text-muted-foreground">/ giờ</span>
              <SurgeBadge multiplier={q.data.multiplier} className="ml-auto" />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Giá gốc {basePrice.toLocaleString("vi-VN")}đ · {q.data.reason}
            </p>
          </div>
        </div>
      ) : (
        <div className="h-28 rounded-2xl bg-muted/40 animate-pulse" />
      )}

      <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
        <div className="flex items-center justify-between text-xs mb-3">
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
        <div className="flex justify-between text-[10px] text-muted-foreground mt-2 font-medium">
          <span>Trống</span>
          <span>Cân bằng</span>
          <span>Đầy</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-[11px]">
        <RuleChip label=">85% lấp đầy" value="+30%" tone="warn" />
        <RuleChip label="≤30% lấp đầy" value="−15%" tone="good" />
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
  const isDown = deltaPct !== undefined && deltaPct < 0;
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/30 p-3 sm:p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground">
          {label}
        </p>
        {deltaPct !== undefined && deltaPct !== 0 && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[10px] tabular-nums font-semibold px-1.5 py-0.5 rounded-md",
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
      <p className="text-2xl font-semibold tabular-nums mt-1.5">{Math.round(pct * 100)}%</p>
      <div className="text-[10px] text-muted-foreground mt-0.5">
        {confidence !== undefined ? (
          <>tin cậy {Math.round(confidence * 100)}%</>
        ) : (
          <>lấp đầy hiện tại</>
        )}
      </div>
      {/* progress bar */}
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

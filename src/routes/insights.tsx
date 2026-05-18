import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Brain,
  Sparkles,
  TrendingUp,
  CalendarRange,
  Coins,
  MapPin,
  Activity,
  Clock,
  ChevronDown,
  RefreshCw,
  SlidersHorizontal,
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
import { AppCard } from "@/components/ui/app-card";
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
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
      <PageHeader now={now} />
      <KpiStrip />

      <div className="grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-6">
        <RecommenderPanel />
        <AnalyticsPanel
          lotId={selectedLot}
          onLotChange={setSelectedLot}
          tab={tab}
          onTabChange={setTab}
        />
      </div>
    </main>
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
    <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
      <div className="space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-medium">
          <Brain className="size-3" />
          Bộ não SmartPark
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          Bảng điều khiển thông minh
        </h1>
        <p className="text-sm text-muted-foreground">
          Gợi ý bãi đỗ phù hợp, dự báo lấp đầy và giá động — cập nhật theo thời gian thực.
        </p>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-3.5" />
          {timeStr} · {dateStr}
        </span>
      </div>
    </header>
  );
}

// ============ KPI strip ============
function KpiStrip() {
  // lightweight derived stats from recommendations call (one request shared)
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
    };
  }, [q.data]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard
        icon={Activity}
        label="Lấp đầy trung bình"
        value={stats ? `${Math.round(stats.avgOcc * 100)}%` : "—"}
        hint={stats ? `${stats.totalAvail}/${stats.totalSpots} chỗ trống` : "Đang tải"}
        tone={
          stats && stats.avgOcc > 0.85 ? "warn" : stats && stats.avgOcc < 0.5 ? "good" : "default"
        }
      />
      <KpiCard
        icon={Sparkles}
        label="Đề xuất hàng đầu"
        value={stats?.bestName ?? "—"}
        hint={stats ? `Cách ${stats.bestDist.toFixed(1)} km` : "Đang chấm điểm"}
      />
      <KpiCard
        icon={MapPin}
        label="Bãi trong khu vực"
        value={stats ? String(q.data?.recommendations.length ?? 0) : "—"}
        hint="Bán kính ~5 km"
      />
      <KpiCard
        icon={TrendingUp}
        label="Trạng thái"
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
}: {
  icon: typeof Brain;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "good" | "warn";
}) {
  const toneCls =
    tone === "good"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : "text-foreground";
  return (
    <AppCard className="p-4">
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <Icon className={cn("size-4", toneCls)} />
      </div>
      <p className={cn("mt-2 text-xl font-semibold tabular-nums truncate", toneCls)}>{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{hint}</p>}
    </AppCard>
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
    <AppCard className="p-0 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-border/60">
        <div className="min-w-0">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            Gợi ý dành cho bạn
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            Xếp hạng theo khoảng cách, tỉ lệ trống, giá và độ tin cậy.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => q.refetch()}
            className="size-8 grid place-items-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
            aria-label="Làm mới"
          >
            <RefreshCw className={cn("size-3.5", q.isFetching && "animate-spin")} />
          </button>
          <button
            onClick={() => setCustomizeOpen((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg text-xs font-medium transition",
              customizeOpen
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground/80 hover:bg-muted/70",
            )}
          >
            <SlidersHorizontal className="size-3.5" />
            Tuỳ chỉnh
            <ChevronDown className={cn("size-3 transition", customizeOpen && "rotate-180")} />
          </button>
        </div>
      </div>

      {customizeOpen && (
        <div className="px-5 py-4 border-b border-border/60 bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-foreground">Trọng số chấm điểm</p>
            <button
              onClick={() => setWeights(DEFAULT_WEIGHTS)}
              className="text-[11px] text-primary hover:underline"
            >
              ↺ Mặc định
            </button>
          </div>
          <WeightSliders value={weights} onChange={setWeights} />
          <p className="mt-3 text-[10px] text-muted-foreground">
            <code className="font-mono">score = Σ wᵢ · feature_i</code> · chuẩn hoá min-max trong
            tập ứng viên.
          </p>
        </div>
      )}

      <div className="p-5 space-y-3">
        {q.isLoading && <RecSkeletons />}
        {q.isError && (
          <div className="text-center py-8 space-y-3">
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
          <p className="text-sm text-muted-foreground text-center py-8">Chưa có bãi nào phù hợp.</p>
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
    </AppCard>
  );
}

function RecSkeletons() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-28 rounded-xl bg-muted/40 animate-pulse"
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
    <AppCard className="p-0 overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-border/60">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            Phân tích bãi đỗ
          </h2>
          <LotSelect value={lotId} onChange={onLotChange} />
        </div>
        <p className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1">
          <MapPin className="size-3" />
          {lot.area}
        </p>
      </div>

      <div className="px-5 pt-3 border-b border-border/60">
        <TabsBar tab={tab} onChange={onTabChange} />
      </div>

      <div className="p-5">
        {tab === "forecast" && <ForecastView lotId={lotId} />}
        {tab === "heatmap" && <HeatmapView lotId={lotId} />}
        {tab === "pricing" && <PricingView lotId={lotId} />}
      </div>
    </AppCard>
  );
}

function TabsBar({ tab, onChange }: { tab: AnalyticsTab; onChange: (t: AnalyticsTab) => void }) {
  const items: { id: AnalyticsTab; label: string; icon: typeof Brain }[] = [
    { id: "forecast", label: "Dự báo", icon: TrendingUp },
    { id: "heatmap", label: "Heatmap", icon: CalendarRange },
    { id: "pricing", label: "Giá động", icon: Coins },
  ];
  return (
    <div className="flex gap-1 -mb-px">
      {items.map((it) => {
        const active = tab === it.id;
        const Icon = it.icon;
        return (
          <button
            key={it.id}
            onClick={() => onChange(it.id)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition",
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
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
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none pl-3 pr-8 h-8 rounded-lg bg-muted text-xs font-medium text-foreground border border-transparent hover:border-border focus:outline-none focus:border-primary cursor-pointer"
      >
        {DEMO_LOTS.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
      <ChevronDown className="size-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
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
    return <div className="h-40 rounded-xl bg-muted/40 animate-pulse" />;
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
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              2 giờ gần nhất
            </p>
            <p className="text-[10px] text-muted-foreground">{q.data.sparkline.length} điểm</p>
          </div>
          <Sparkline data={q.data.sparkline} width={600} height={64} className="w-full" />
        </div>
      )}
      <p className="text-[11px] text-muted-foreground border-t border-border/60 pt-3">
        Mô hình: EMA (drift) kết hợp seasonal average của cùng giờ, cùng thứ trong 4 tuần.
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
    return <div className="h-48 rounded-xl bg-muted/40 animate-pulse" />;
  }
  return (
    <div className="space-y-3">
      <Heatmap7x24 data={q.data.heatmap} />
      <p className="text-[11px] text-muted-foreground border-t border-border/60 pt-3">
        Trung bình lấp đầy theo từng giờ trong tuần — tối càng đậm càng khó tìm chỗ.
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
        <div className="rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-4">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-3xl font-semibold tabular-nums">
              {q.data.finalPrice.toLocaleString("vi-VN")}đ
            </span>
            <span className="text-xs text-muted-foreground">
              / giờ · gốc {basePrice.toLocaleString("vi-VN")}đ
            </span>
            <SurgeBadge multiplier={q.data.multiplier} className="ml-auto" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">{q.data.reason}</p>
        </div>
      ) : (
        <div className="h-20 rounded-xl bg-muted/40 animate-pulse" />
      )}

      <div>
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-muted-foreground">Mô phỏng tỉ lệ lấp đầy</span>
          <span className="tabular-nums font-medium">{Math.round(occ * 100)}%</span>
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
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          <span>Trống</span>
          <span>Cân bằng</span>
          <span>Đầy</span>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground border-t border-border/60 pt-3">
        Quy tắc: {">"}85% lấp đầy → +30% · ≤30% → −15% · dự báo tăng nhanh → +5%.
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
  return (
    <div className="rounded-xl bg-muted/40 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tabular-nums mt-1">{Math.round(pct * 100)}%</p>
      <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
        {deltaPct !== undefined && deltaPct !== 0 && (
          <span
            className={cn(
              "tabular-nums font-medium",
              deltaPct > 0
                ? "text-amber-600 dark:text-amber-400"
                : "text-emerald-600 dark:text-emerald-400",
            )}
          >
            {deltaPct > 0 ? "+" : ""}
            {deltaPct}%
          </span>
        )}
        {confidence !== undefined && <span>tin cậy {Math.round(confidence * 100)}%</span>}
        {deltaPct === undefined && confidence === undefined && <span>lấp đầy</span>}
      </div>
    </div>
  );
}

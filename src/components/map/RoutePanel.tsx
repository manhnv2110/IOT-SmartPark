import {
  Apple,
  ArrowLeft,
  Bike,
  Car,
  ExternalLink,
  Footprints,
  Loader2,
  Navigation,
  Share2,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import type { RoutingApi } from "@/hooks/useRouting";
import { appleMapsLink, googleMapsLink, formatEta } from "@/lib/routing";
import { RouteSteps } from "./RouteSteps";
import { cn } from "@/lib/utils";

export interface RoutePanelProps {
  routing: RoutingApi;
  /** "sidebar" trên desktop (dock cạnh map), "drawer" trên mobile (bottom sheet). */
  variant: "sidebar" | "drawer";
  /** Hiện nút "Quay lại danh sách" — chỉ dùng ở sidebar. */
  onBackToList?: () => void;
  className?: string;
}

const PROFILES: Array<{
  key: "driving" | "cycling" | "foot";
  label: string;
  Icon: typeof Car;
}> = [
  { key: "driving", label: "Ô tô", Icon: Car },
  { key: "cycling", label: "Xe máy", Icon: Bike },
  { key: "foot", label: "Đi bộ", Icon: Footprints },
];

/**
 * Panel chỉ đường có 3 vùng:
 * 1. Header: tên đích + nút đóng / quay lại danh sách.
 * 2. Tổng quan: 3 KPI (khoảng cách, thời gian, đến lúc) + chọn profile.
 * 3. Body: danh sách bước rẽ.
 * 4. Footer: deep-link Google/Apple Maps + share + auto-reroute toggle.
 *
 * Không định vị tuyệt đối. Container cha quyết định vị trí (sidebar dock
 * trên desktop, vaul drawer trên mobile).
 */
export function RoutePanel({
  routing,
  variant,
  onBackToList,
  className,
}: RoutePanelProps) {
  const {
    route,
    profile,
    setProfile,
    autoReroute,
    setAutoReroute,
    clearRoute,
    share,
    voice,
    replayCurrentStep,
  } = routing;

  if (!route) return null;

  const close = () => {
    clearRoute();
    onBackToList?.();
  };

  return (
    <div
      role="region"
      aria-label="Chỉ đường"
      className={cn(
        "flex flex-col min-h-0 h-full bg-card",
        variant === "drawer" && "rounded-t-2xl",
        className,
      )}
    >
      {/* Header */}
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border">
        {variant === "sidebar" && onBackToList ? (
          <button
            onClick={close}
            className="size-9 grid place-items-center rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"
            aria-label="Quay lại danh sách bãi"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
          </button>
        ) : (
          <Navigation className="size-4 text-primary shrink-0" aria-hidden="true" />
        )}

        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Đang chỉ đường tới
          </p>
          <h2 className="font-semibold text-sm truncate text-foreground">
            {route.name}
          </h2>
        </div>

        {/* Voice toggle: Gemini Cloud TTS đọc tiếng Việt chuẩn, fallback
            Web Speech API khi cloud lỗi. */}
        {(voice.available || !voice.enabled) && (
          <button
            onClick={voice.toggle}
            title={
              voice.enabled
                ? "Tắt giọng đọc (đang dùng FPT.AI · leminh)"
                : "Bật giọng đọc tiếng Việt"
            }
            aria-label={voice.enabled ? "Tắt giọng đọc" : "Bật giọng đọc"}
            aria-pressed={voice.enabled}
            className={cn(
              "relative size-9 grid place-items-center rounded-lg transition-colors",
              voice.enabled
                ? "bg-primary/15 text-primary hover:bg-primary/25"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {voice.loading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : voice.enabled ? (
              <Volume2 className="size-4" aria-hidden="true" />
            ) : (
              <VolumeX className="size-4" aria-hidden="true" />
            )}
            {voice.speaking && !voice.loading && (
              <span
                className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-primary animate-pulse"
                aria-hidden="true"
              />
            )}
          </button>
        )}

        <button
          onClick={close}
          className="size-9 grid place-items-center rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"
          aria-label="Đóng chỉ đường"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </header>

      {/* KPIs + profile */}
      <div className="px-4 py-3 border-b border-border space-y-3 shrink-0">
        <dl className="grid grid-cols-3 gap-2 text-sm">
          <Kpi label="Khoảng cách" value={`${route.distanceKm.toFixed(1)} km`} />
          <Kpi label="Thời gian" value={`${Math.round(route.durationMin)} phút`} />
          <Kpi label="Đến lúc" value={formatEta(route.durationMin)} />
        </dl>

        <div
          role="radiogroup"
          aria-label="Chế độ di chuyển"
          className="flex items-center gap-1 p-1 rounded-xl bg-muted"
        >
          {PROFILES.map(({ key, label, Icon }) => {
            const active = profile === key;
            return (
              <button
                key={key}
                role="radio"
                aria-checked={active}
                onClick={() => setProfile(key)}
                className={cn(
                  "flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-medium transition-colors",
                  active
                    ? "bg-card text-foreground shadow-[var(--shadow-xs)]"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Steps */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-3 py-3">
        <RouteSteps steps={route.steps} activeIndex={routing.activeStep} />
      </div>

      {/* Voice engine indicator: FPT.AI · leminh hoặc lỗi. */}
      {voice.available && voice.enabled && (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-lg bg-muted/50 border border-border px-3 py-1.5 text-[11px]">
          {voice.error ? (
            <>
              <Volume2 className="size-3 text-amber-600" aria-hidden="true" />
              <span className="text-amber-700 dark:text-amber-400 truncate">
                {voice.error}
              </span>
            </>
          ) : (
            <>
              <Sparkles className="size-3 text-primary" aria-hidden="true" />
              <span className="text-foreground/80">
                Giọng đọc <span className="font-semibold text-primary">FPT.AI · leminh</span> · tiếng Việt chuẩn
              </span>
            </>
          )}
        </div>
      )}

      {/* Footer actions */}
      <footer className="px-4 py-3 border-t border-border space-y-2 shrink-0">
        {voice.available && voice.enabled && (
          <button
            type="button"
            onClick={replayCurrentStep}
            className="w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-xs font-medium transition-colors"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Phát lại hướng dẫn hiện tại
          </button>
        )}

        <div className="grid grid-cols-3 gap-2">
          <a
            href={googleMapsLink(
              { lat: route.lat, lng: route.lng },
              profile,
            )}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground text-xs font-medium transition-colors"
          >
            <ExternalLink className="size-3.5" aria-hidden="true" />
            Google
          </a>
          <a
            href={appleMapsLink({ lat: route.lat, lng: route.lng })}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border border-border hover:bg-accent text-xs font-medium"
          >
            <Apple className="size-3.5" aria-hidden="true" />
            Apple
          </a>
          <button
            onClick={share}
            className="inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border border-border hover:bg-accent text-xs font-medium"
          >
            <Share2 className="size-3.5" aria-hidden="true" />
            Chia sẻ
          </button>
        </div>

        <label className="flex items-center justify-between text-[11px] text-muted-foreground cursor-pointer">
          <span>Tự đổi lộ trình khi lệch đường</span>
          <input
            type="checkbox"
            checked={autoReroute}
            onChange={(e) => setAutoReroute(e.target.checked)}
            className="accent-primary size-4"
          />
        </label>
      </footer>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="font-mono font-bold text-primary text-sm tabular-nums">
        {value}
      </dd>
    </div>
  );
}

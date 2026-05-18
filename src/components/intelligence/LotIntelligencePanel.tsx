import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TrendingUp, Calendar, Brain } from "lucide-react";
import {
  getLotForecast,
  getLotHeatmap,
} from "@/lib/intelligence.functions";
import { Sparkline } from "./Sparkline";
import { Heatmap7x24 } from "./Heatmap7x24";
import { AppCard } from "@/components/ui/app-card";

export function LotIntelligencePanel({
  lotDeviceId,
}: {
  lotDeviceId: string;
}) {
  const fc = useServerFn(getLotForecast);
  const hm = useServerFn(getLotHeatmap);

  const forecast = useQuery({
    queryKey: ["fc", lotDeviceId],
    queryFn: () => fc({ data: { lotDeviceId } }),
  });
  const heatmap = useQuery({
    queryKey: ["hm", lotDeviceId],
    queryFn: () => hm({ data: { lotDeviceId } }),
  });

  const empty =
    (forecast.data?.sampleCount ?? 0) === 0 &&
    (heatmap.data?.sampleCount ?? 0) === 0;

  if (empty && !forecast.isLoading) {
    return (
      <AppCard className="p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-primary mb-1">
          <Brain className="size-4" /> Phân tích thông minh
        </div>
        <p className="text-xs text-muted-foreground">
          Chưa có đủ lịch sử IoT cho bãi này — quay lại sau khi hệ thống ghi
          nhận vài giờ dữ liệu.
        </p>
      </AppCard>
    );
  }

  return (
    <AppCard className="p-5 space-y-5">
      <div>
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Brain className="size-4" /> Phân tích thông minh
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Forecast EMA + seasonal · Heatmap 7×24 trên dữ liệu IoT lịch sử.
        </p>
      </div>

      {forecast.data && (
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Hiện tại" pct={forecast.data.currentRate} />
          <Stat
            label="+30 phút"
            pct={forecast.data.next30.predicted}
            confidence={forecast.data.next30.confidence}
          />
          <Stat
            label="+60 phút"
            pct={forecast.data.next60.predicted}
            confidence={forecast.data.next60.confidence}
          />
        </div>
      )}

      {forecast.data && forecast.data.sparkline.length >= 2 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 inline-flex items-center gap-1">
            <TrendingUp className="size-3" /> Xu hướng 2 giờ qua
          </p>
          <Sparkline
            data={forecast.data.sparkline}
            width={520}
            height={48}
            className="w-full"
          />
        </div>
      )}

      {heatmap.data && heatmap.data.sampleCount > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 inline-flex items-center gap-1">
            <Calendar className="size-3" /> Nhu cầu theo giờ trong tuần
          </p>
          <Heatmap7x24 data={heatmap.data.heatmap} />
        </div>
      )}
    </AppCard>
  );
}

function Stat({
  label,
  pct,
  confidence,
}: {
  label: string;
  pct: number;
  confidence?: number;
}) {
  return (
    <div className="rounded-xl bg-muted/40 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="text-xl font-semibold tabular-nums mt-0.5">
        {Math.round(pct * 100)}%
      </p>
      {confidence !== undefined && (
        <p className="text-[10px] text-muted-foreground mt-0.5">
          tin cậy {Math.round(confidence * 100)}%
        </p>
      )}
    </div>
  );
}

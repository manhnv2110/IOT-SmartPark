import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  fetchRoute,
  findNearestStep,
  offRouteMeters,
  pushRouteHistory,
  type RouteProfile,
  type RouteResult,
} from "@/lib/routing";
import type { GeoPos } from "@/hooks/useGeolocation";
import {
  useNavigationVoice,
  formatDistanceForSpeech,
  type NavigationVoice,
} from "@/hooks/useNavigationVoice";

/**
 * Mục tiêu chỉ đường: toạ độ + tên + id (để lưu vào history và ?route=...).
 */
export interface RouteTarget {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export type ActiveRoute = RouteResult & RouteTarget;

export interface RoutingApi {
  /** Lộ trình hiện tại (null nếu chưa có). */
  route: ActiveRoute | null;
  /** Đang gọi OSRM. */
  loading: boolean;
  profile: RouteProfile;
  setProfile: (p: RouteProfile) => void;
  autoReroute: boolean;
  setAutoReroute: (v: boolean) => void;
  /** Bước hiện tại (theo vị trí gần nhất với maneuver). */
  activeStep: number;
  /** Yêu cầu chỉ đường tới target. Nếu chưa có pos → requestPos(). */
  routeTo: (target: RouteTarget) => Promise<void>;
  /** Đóng / huỷ lộ trình. */
  clearRoute: () => void;
  /** Copy link chia sẻ chuyến đi vào clipboard. */
  share: () => void;
  /** Voice guidance API (bật/tắt loa, replay). */
  voice: NavigationVoice;
  /** Đọc lại bước hiện tại bằng giọng tiếng Việt. */
  replayCurrentStep: () => void;
}

/**
 * `useRouting` — quản lý state của một lộ trình OSRM:
 * - `routeTo(target)` gọi OSRM, set `route`, push history.
 * - Auto re-route khi đổi `profile` (nếu đang có route).
 * - Track `activeStep` theo `pos` + cảnh báo lệch lộ trình > 60m trong > 10s.
 * - Voice guidance: đọc intro khi bắt đầu chuyến, đọc instruction
 *   mỗi khi `activeStep` thay đổi (Vietnamese TTS qua Web Speech API).
 *
 * Trạng thái này được lift lên cấp page (`/map`) thay vì sống trong
 * `ParkingMap` để panel chỉ đường có thể render NGOÀI map (sidebar
 * desktop / bottom sheet mobile) thay vì nổi đè lên bản đồ.
 */
export function useRouting(
  pos: GeoPos | null,
  requestPos: () => void,
): RoutingApi {
  const [route, setRoute] = useState<ActiveRoute | null>(null);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<RouteProfile>("driving");
  const [autoReroute, setAutoReroute] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const offRouteSinceRef = useRef<number | null>(null);
  const lastRouteAtRef = useRef(0);
  const lastSpokenStepRef = useRef<{ routeId: string; index: number } | null>(null);

  const voice = useNavigationVoice();

  const routeTo = useCallback(
    async (target: RouteTarget) => {
      if (!pos) {
        requestPos();
        toast.info("Đang chờ vị trí của bạn…");
        return;
      }
      setLoading(true);
      try {
        const r = await fetchRoute(
          pos,
          { lat: target.lat, lng: target.lng },
          profile,
        );
        if (r) {
          setRoute({ ...r, ...target });
          setActiveStep(0);
          lastRouteAtRef.current = Date.now();
          lastSpokenStepRef.current = null;
          pushRouteHistory(target);

          // Voice intro — đọc tổng quan chuyến đi
          voice.speak(
            `Bắt đầu chỉ đường tới ${target.name}. Tổng quãng đường ${r.distanceKm.toFixed(1)} ki-lô-mét, dự kiến ${Math.round(r.durationMin)} phút.`,
            { interrupt: true },
          );
        } else {
          toast.error("Không tìm thấy đường đi phù hợp.");
        }
      } catch (e) {
        console.error("Routing failed", e);
        toast.error("Lỗi gọi dịch vụ chỉ đường (OSRM).");
      } finally {
        setLoading(false);
      }
    },
    [pos, profile, requestPos, voice],
  );

  // Re-route khi đổi profile (giữa chuyến)
  useEffect(() => {
    if (!route) return;
    routeTo({ id: route.id, name: route.name, lat: route.lat, lng: route.lng });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  // Track active step + detect off-route
  useEffect(() => {
    if (!route || !pos) return;
    setActiveStep(findNearestStep(pos, route.steps));
    const off = offRouteMeters(pos, route.coords);
    const now = Date.now();
    if (off > 60) {
      if (offRouteSinceRef.current == null) {
        offRouteSinceRef.current = now;
      } else if (
        autoReroute &&
        now - offRouteSinceRef.current > 10_000 &&
        now - lastRouteAtRef.current > 15_000
      ) {
        offRouteSinceRef.current = null;
        toast.info("Bạn đã lệch đường — đang tính lại lộ trình…");
        voice.speak("Bạn đã lệch đường, đang tính lại lộ trình.", { interrupt: true });
        routeTo({
          id: route.id,
          name: route.name,
          lat: route.lat,
          lng: route.lng,
        });
      }
    } else {
      offRouteSinceRef.current = null;
    }
  }, [pos, route, autoReroute, routeTo, voice]);

  // Voice guidance: đọc instruction mỗi khi activeStep đổi (và khác lần
  // đọc trước cho cùng route). Lưu cặp routeId+index để tránh đọc lại
  // khi re-render hoặc khi đổi route.
  useEffect(() => {
    if (!route || !voice.enabled) return;
    const step = route.steps[activeStep];
    if (!step) return;
    const last = lastSpokenStepRef.current;
    if (last && last.routeId === route.id && last.index === activeStep) return;
    lastSpokenStepRef.current = { routeId: route.id, index: activeStep };

    // Bỏ qua step "depart" vì đã được intro phát rồi
    if (step.type === "depart" && activeStep === 0) return;

    const distance =
      step.distance > 30 ? `Sau ${formatDistanceForSpeech(step.distance)}, ` : "";
    voice.speak(`${distance}${step.text}.`, { interrupt: false });
  }, [activeStep, route, voice]);

  const clearRoute = useCallback(() => {
    setRoute(null);
    setActiveStep(0);
    offRouteSinceRef.current = null;
    lastSpokenStepRef.current = null;
    voice.cancel();
  }, [voice]);

  const replayCurrentStep = useCallback(() => {
    if (!route) return;
    const step = route.steps[activeStep];
    if (!step) return;
    voice.speak(step.text, { force: true, interrupt: true });
  }, [route, activeStep, voice]);

  const share = useCallback(() => {
    if (!route) return;
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/map?route=${encodeURIComponent(route.id)}`;
    navigator.clipboard?.writeText(url);
    toast.success("Đã copy link chuyến đi");
  }, [route]);

  return {
    route,
    loading,
    profile,
    setProfile,
    autoReroute,
    setAutoReroute,
    activeStep,
    routeTo,
    clearRoute,
    share,
    voice,
    replayCurrentStep,
  };
}

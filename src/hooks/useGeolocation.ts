import { useCallback, useEffect, useRef, useState } from "react";

export interface GeoPos {
  lat: number;
  lng: number;
  accuracy?: number;
}

const HANOI_CENTER: GeoPos = { lat: 21.0285, lng: 105.8542 };

export function haversineKm(a: GeoPos, b: GeoPos): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

/**
 * Geolocation hook with optional continuous watch.
 *
 * Fix: khi user từ chối hoặc browser không hỗ trợ, KHÔNG set `pos`
 * thành tâm Hà Nội — giữ `pos = null` để các component biết "chưa có
 * vị trí thật" (tránh hiển thị marker user sai chỗ trên ParkingMap).
 * Caller cần fallback có thể dùng giá trị `fallback` được trả về.
 */
export function useGeolocation(opts?: { watch?: boolean }) {
  const watch = opts?.watch ?? false;
  const [pos, setPos] = useState<GeoPos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [denied, setDenied] = useState(false);
  const lastRef = useRef<GeoPos | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const commit = useCallback((next: GeoPos) => {
    const last = lastRef.current;
    if (last) {
      const moved = haversineKm(last, next) * 1000; // meters
      const accImproved =
        last.accuracy && next.accuracy && next.accuracy < last.accuracy * 0.7;
      if (moved < 10 && !accImproved) return;
    }
    lastRef.current = next;
    setPos(next);
  }, []);

  const request = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setError("Trình duyệt không hỗ trợ định vị");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const next: GeoPos = {
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: p.coords.accuracy,
        };
        lastRef.current = next;
        setPos(next);
        setError(null);
        setDenied(false);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        // PERMISSION_DENIED = 1
        if (err.code === 1) setDenied(true);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
    );
  }, []);

  useEffect(() => {
    request();
  }, [request]);

  useEffect(() => {
    if (!watch || typeof window === "undefined" || !("geolocation" in navigator))
      return;
    const id = navigator.geolocation.watchPosition(
      (p) => {
        commit({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: p.coords.accuracy,
        });
      },
      (err) => setError(err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    watchIdRef.current = id;
    return () => {
      if (watchIdRef.current != null)
        navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [watch, commit]);

  return { pos, error, loading, denied, request, fallback: HANOI_CENTER };
}

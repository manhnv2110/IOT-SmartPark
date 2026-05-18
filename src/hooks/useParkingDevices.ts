import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchDevices } from "@/lib/parking.functions";
import type { Device } from "@/lib/parking.types";

export const PARKING_QUERY_KEY = ["parking", "devices"] as const;

const FAST = 3000;
const SLOW = 8000;

/**
 * Realtime polling with adaptive backoff:
 * - Pauses when tab is hidden (RQ disables refetchInterval automatically when window blurred via focus, but we also detect visibility).
 * - When 5 consecutive polls return identical data, slow down to 8s.
 * - Any change instantly resets to 3s.
 */
export function useParkingDevices() {
  const [interval, setInterval_] = useState(FAST);
  const lastHashRef = useRef<string>("");
  const stableCountRef = useRef(0);

  const query = useQuery({
    queryKey: PARKING_QUERY_KEY,
    queryFn: () => fetchDevices(),
    refetchInterval: () => (typeof document !== "undefined" && document.hidden ? false : interval),
    refetchOnWindowFocus: true,
    staleTime: 0,
    structuralSharing: true,
  });

  useEffect(() => {
    const data = query.data;
    if (!data?.devices) return;
    // Cheap hash: per-device available counts + online flags
    const hash = data.devices
      .map((d: Device) => {
        const occ = d.sensor_data.reduce((a, s) => a + (s.is_occupied ? 1 : 0), 0);
        return `${d.name}:${occ}/${d.sensor_data.length}:${d.is_online ? 1 : 0}`;
      })
      .join("|");
    if (hash === lastHashRef.current) {
      stableCountRef.current += 1;
      if (stableCountRef.current >= 5 && interval !== SLOW) setInterval_(SLOW);
    } else {
      lastHashRef.current = hash;
      stableCountRef.current = 0;
      if (interval !== FAST) setInterval_(FAST);
    }
  }, [query.data, interval]);

  return query;
}

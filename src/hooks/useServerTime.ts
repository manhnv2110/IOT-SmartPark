/**
 * `useServerTime` — đồng bộ thời gian client với server.
 *
 * MVP cách triển khai:
 * 1. Client mount → đo round-trip qua `/api/public/health`.
 * 2. `offset = serverTs - (clientTs + rtt/2)` cache trong session.
 * 3. `now()` trả `Date.now() + offset`.
 *
 * Dùng cho `PaymentCountdown` để giữ bất biến
 * `displayedSeconds ≤ expiresAt - serverNow`.
 *
 * Nếu healthcheck fail → fallback `offset = 0` (không phá UX).
 */

import { useEffect, useRef, useState } from "react";

interface ServerTime {
  /** Lệch giữa server và client, tính bằng ms. `serverTs - clientTs`. */
  offsetMs: number;
  /** Trả về timestamp ms theo "đồng hồ server" suy luận. */
  now: () => number;
  /** `true` khi đã sync ít nhất một lần (hoặc fallback). */
  ready: boolean;
}

const SESSION_KEY = "smartpark.server_time_offset_v1";

function readCachedOffset(): number | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function writeCachedOffset(offset: number): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_KEY, String(Math.round(offset)));
  } catch {
    // ignore
  }
}

export function useServerTime(): ServerTime {
  const [offsetMs, setOffsetMs] = useState<number>(() => readCachedOffset() ?? 0);
  const [ready, setReady] = useState<boolean>(() => readCachedOffset() != null);
  const offsetRef = useRef(offsetMs);
  offsetRef.current = offsetMs;

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    const t0 = Date.now();
    fetch("/api/public/health", { method: "GET", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { ts?: string | number }) => {
        if (cancelled) return;
        const t1 = Date.now();
        const rtt = t1 - t0;
        const serverTs =
          typeof j.ts === "string" ? new Date(j.ts).getTime() : Number(j.ts);
        if (!Number.isFinite(serverTs)) {
          setReady(true);
          return;
        }
        const computed = serverTs - (t0 + rtt / 2);
        // Bỏ qua sai lệch quá lớn (> 12h) — có thể là server lỗi giờ.
        if (Math.abs(computed) > 12 * 3_600_000) {
          setReady(true);
          return;
        }
        setOffsetMs(computed);
        writeCachedOffset(computed);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true); // fallback offset=0
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    offsetMs,
    ready,
    now: () => Date.now() + offsetRef.current,
  };
}

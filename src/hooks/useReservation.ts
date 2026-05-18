import { useEffect, useState, useCallback } from "react";

const KEY = "parking-reservation";
const DURATION_MS = 10 * 60 * 1000;

export interface Reservation {
  deviceId: string;
  deviceName: string;
  slotId: string;
  slotNumber: string;
  floor: string;
  expiresAt: number;
}

export function useReservation() {
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const r = JSON.parse(raw) as Reservation;
        if (r.expiresAt > Date.now()) setReservation(r);
        else localStorage.removeItem(KEY);
      }
    } catch {
      // ignore
    }
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (reservation && reservation.expiresAt <= now) {
      setReservation(null);
      try {
        localStorage.removeItem(KEY);
      } catch {
        // ignore
      }
    }
  }, [now, reservation]);

  const reserve = useCallback(
    (input: Omit<Reservation, "expiresAt">) => {
      const r: Reservation = { ...input, expiresAt: Date.now() + DURATION_MS };
      setReservation(r);
      try {
        localStorage.setItem(KEY, JSON.stringify(r));
      } catch {
        // ignore
      }
    },
    []
  );

  const cancel = useCallback(() => {
    setReservation(null);
    try {
      localStorage.removeItem(KEY);
    } catch {
      // ignore
    }
  }, []);

  const remainingMs = reservation ? Math.max(0, reservation.expiresAt - now) : 0;

  return { reservation, reserve, cancel, remainingMs };
}

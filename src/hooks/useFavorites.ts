import { useEffect, useState, useCallback } from "react";

const KEY = "parking-favorites";

/**
 * MVP favorites store — localStorage only.
 *
 * Đảm bảo:
 * - `toggle(id)` dùng functional setter để chống race khi click nhanh.
 * - Persist best-effort, không throw khi quota fail.
 */
export function useFavorites() {
  const [favs, setFavs] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setFavs(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const persist = useCallback((next: string[]) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // ignore quota / private mode
    }
  }, []);

  const toggle = useCallback(
    (id: string) => {
      setFavs((prev) => {
        const next = prev.includes(id)
          ? prev.filter((x) => x !== id)
          : [...prev, id];
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const isFav = useCallback((id: string) => favs.includes(id), [favs]);

  return { favs, toggle, isFav };
}

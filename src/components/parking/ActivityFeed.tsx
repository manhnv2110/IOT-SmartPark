import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { Device } from "@/lib/parking.types";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

interface Event {
  id: string;
  slot: string;
  floor: string;
  occupied: boolean;
  at: number;
}

export function ActivityFeed({ device }: { device: Device }) {
  const [events, setEvents] = useState<Event[]>([]);
  const prev = useRef<Map<string, boolean>>(new Map());

  useEffect(() => {
    const next = new Map<string, boolean>();
    const fresh: Event[] = [];
    for (const s of device.sensor_data) {
      const occupied = s.is_occupied ?? false;
      next.set(s.id, occupied);
      const before = prev.current.get(s.id);
      if (before !== undefined && before !== occupied) {
        fresh.push({
          id: `${s.id}-${Date.now()}`,
          slot: s.slot_number,
          floor: s.floor,
          occupied,
          at: Date.now(),
        });
      }
    }
    if (fresh.length > 0) {
      setEvents((cur) => [...fresh, ...cur].slice(0, 12));
    }
    prev.current = next;
  }, [device.sensor_data]);

  return (
    <div className="rounded-2xl glass p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold tracking-tight">Hoạt động trực tiếp</h3>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Realtime
        </span>
      </div>
      {events.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Đang chờ sự kiện đầu tiên...
        </p>
      ) : (
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {events.map((e) => (
              <motion.li
                key={e.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3 text-sm"
              >
                <span
                  className={`size-7 rounded-full grid place-items-center ${
                    e.occupied
                      ? "bg-[var(--occupied)]/15 text-[var(--occupied)]"
                      : "bg-[var(--available)]/15 text-[var(--available)]"
                  }`}
                >
                  {e.occupied ? (
                    <ArrowDownLeft className="size-3.5" />
                  ) : (
                    <ArrowUpRight className="size-3.5" />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="truncate">
                    Slot{" "}
                    <span className="font-mono font-semibold">{e.slot}</span>{" "}
                    <span className="text-muted-foreground">({e.floor})</span>{" "}
                    {e.occupied ? "vừa có xe vào" : "vừa trống"}
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {formatDistanceToNow(e.at, { addSuffix: true, locale: vi })}
                </span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}

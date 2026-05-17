import { X, Clock } from "lucide-react";
import { useReservation } from "@/hooks/useReservation";
import { Link } from "@tanstack/react-router";

export function ReservationBanner() {
  const { reservation, cancel, remainingMs } = useReservation();
  if (!reservation) return null;

  const m = Math.floor(remainingMs / 60000);
  const s = Math.floor((remainingMs % 60000) / 1000);

  return (
    <div className="sticky top-16 z-40 mx-auto max-w-7xl px-4 sm:px-6 mt-3">
      <div className="flex items-center gap-3 rounded-xl glass border-[var(--reserved)]/40 px-4 py-2.5 text-sm">
        <Clock className="size-4 text-[var(--reserved)]" />
        <div className="flex-1 min-w-0">
          <p className="truncate">
            Bạn đang giữ chỗ{" "}
            <span className="font-mono font-semibold text-[var(--reserved)]">
              {reservation.slotNumber}
            </span>{" "}
            tại{" "}
            <Link
              to="/lots/$deviceId"
              params={{ deviceId: reservation.deviceId }}
              className="underline hover:text-primary"
            >
              {reservation.deviceName}
            </Link>
          </p>
        </div>
        <span className="font-mono text-sm text-[var(--reserved)]">
          {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
        </span>
        <button
          onClick={cancel}
          className="p-1.5 rounded-md hover:bg-accent/60 text-muted-foreground"
          aria-label="Huỷ giữ chỗ"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

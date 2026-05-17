import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type BookingStatus,
  type BookingStep,
  isFailedTerminal,
  statusToStep,
} from "@/lib/booking-fsm";

const STEPS: { key: BookingStep; label: string }[] = [
  { key: "new", label: "Đặt chỗ" },
  { key: "pay", label: "Thanh toán" },
  { key: "ticket", label: "Vé" },
];

interface BookingStepperProps {
  /**
   * Truyền `status` thật từ server để derive step (R22.1).
   * Nếu không có server status, có thể fallback `current` từ URL (legacy).
   */
  status?: BookingStatus | null;
  /** Fallback khi chưa có status từ server. */
  current?: BookingStep;
}

export function BookingStepper({ status, current }: BookingStepperProps) {
  const step: BookingStep =
    status != null ? statusToStep(status) : (current ?? "new");
  const idx = STEPS.findIndex((s) => s.key === step);
  const failed = isFailedTerminal(status);

  return (
    <ol
      className="flex items-center gap-2 text-xs sm:text-sm"
      aria-label={`Tiến trình đặt chỗ — bước ${idx + 1} trên ${STEPS.length}${
        failed ? " (đã dừng)" : ""
      }`}
    >
      {STEPS.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        const isFailedActive = active && failed;
        return (
          <li
            key={s.key}
            className="flex items-center gap-2 min-w-0"
            aria-current={active && !failed ? "step" : undefined}
          >
            <div
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1.5 transition border",
                isFailedActive &&
                  "bg-destructive/10 border-destructive/40 text-foreground",
                active &&
                  !failed &&
                  "bg-primary/10 border-primary/40 text-foreground",
                done && "bg-available/10 border-available/40 text-foreground",
                !active && !done && "border-border text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "grid place-items-center w-5 h-5 rounded-full text-[11px] font-semibold",
                  isFailedActive && "bg-destructive text-destructive-foreground",
                  active && !failed && "bg-primary text-primary-foreground",
                  done && "bg-available text-white",
                  !active && !done && "bg-muted text-muted-foreground",
                )}
                aria-hidden
              >
                {isFailedActive ? (
                  <X className="w-3 h-3" />
                ) : done ? (
                  <Check className="w-3 h-3" />
                ) : (
                  i + 1
                )}
              </span>
              <span className="font-medium truncate">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-px w-4 sm:w-8",
                  done ? "bg-available/50" : "bg-border",
                )}
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

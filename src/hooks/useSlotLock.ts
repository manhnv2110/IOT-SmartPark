import { useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toggleSlotLock } from "@/lib/booking.functions";

interface UseSlotLockOptions {
  bookingId: string;
  /** Initial lock state (from sensor data or default to false after payment) */
  initialLocked?: boolean;
}

interface UseSlotLockReturn {
  /** Current lock state (optimistic, then confirmed) */
  locked: boolean;
  /** Whether a lock/unlock command is in progress */
  loading: boolean;
  /** Last error message, if any */
  error: string | null;
  /** Whether the last command was confirmed by the IoT device */
  confirmed: boolean | null;
  /** Toggle the lock state */
  toggle: () => Promise<void>;
  /** Explicitly set lock state */
  setLocked: (locked: boolean) => Promise<void>;
}

/**
 * Hook to control the lock/unlock state of a parking slot
 * associated with a paid/active booking.
 */
export function useSlotLock({
  bookingId,
  initialLocked = false,
}: UseSlotLockOptions): UseSlotLockReturn {
  const [locked, setLockedState] = useState(initialLocked);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<boolean | null>(null);

  const doToggleLock = useServerFn(toggleSlotLock);

  const setLocked = useCallback(
    async (newLocked: boolean) => {
      setLoading(true);
      setError(null);
      setConfirmed(null);

      // Optimistic update
      const prevLocked = locked;
      setLockedState(newLocked);

      try {
        const result = await doToggleLock({ data: { bookingId, locked: newLocked } });
        setConfirmed(result.confirmed);

        if (!result.confirmed) {
          // Command sent but not confirmed — keep the optimistic state
          // but show a warning
          setError("Lệnh đã gửi nhưng chưa xác nhận được từ thiết bị. Thử lại sau vài giây.");
        }
      } catch (err) {
        // Revert on failure
        setLockedState(prevLocked);
        setConfirmed(false);
        const msg = err instanceof Error ? err.message : "Lỗi không xác định";
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [bookingId, locked, doToggleLock]
  );

  const toggle = useCallback(() => {
    return setLocked(!locked);
  }, [locked, setLocked]);

  return { locked, loading, error, confirmed, toggle, setLocked };
}

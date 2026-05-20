/**
 * Hook: fetch active booking counts (paid, chưa check-in) và cung cấp
 * helper `adjustAvailable(deviceId, sensorAvailable)` để trừ đi.
 *
 * Polling mỗi 15s — nhẹ hơn sensor polling (3s) vì booking ít thay đổi.
 */
import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getActiveBookingCounts } from "@/lib/booking-counts.functions";

export const BOOKING_COUNTS_KEY = ["booking", "active-counts"] as const;

export function useBookingCounts() {
  const fn = useServerFn(getActiveBookingCounts);

  const query = useQuery({
    queryKey: BOOKING_COUNTS_KEY,
    queryFn: () => fn(),
    refetchInterval: 15_000,
    staleTime: 10_000,
  });

  const counts = query.data?.counts ?? {};

  /**
   * Trả số chỗ trống đã trừ booking "paid" chưa check-in.
   * Đảm bảo không trả số âm.
   */
  const adjustAvailable = useCallback(
    (lotDeviceId: string, sensorAvailable: number): number => {
      const booked = counts[lotDeviceId] ?? 0;
      return Math.max(0, sensorAvailable - booked);
    },
    [counts],
  );

  /**
   * Lấy số booking đang giữ chỗ cho 1 bãi cụ thể.
   */
  const getBookedCount = useCallback(
    (lotDeviceId: string): number => {
      return counts[lotDeviceId] ?? 0;
    },
    [counts],
  );

  return {
    counts,
    adjustAvailable,
    getBookedCount,
    isLoading: query.isLoading,
  };
}

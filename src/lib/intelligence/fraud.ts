/**
 * No-show / fraud scoring for users. Higher score = higher risk.
 *
 *   score = (noShows / max(1,totalBookings)) · 100 + 10 · noShows_last_7d
 *
 *   0–19  → green  (no deposit gate)
 *   20–49 → amber  (recommend 50% deposit)
 *   ≥50   → red    (require 100% deposit)
 */

export type FraudBand = "green" | "amber" | "red";

export interface FraudProfile {
  score: number;
  band: FraudBand;
  noShows: number;
  noShowsLast7d: number;
  totalBookings: number;
  requiredDepositPct: number; // 0..1
  message: string;
}

export function computeFraud(input: {
  noShows: number;
  noShowsLast7d: number;
  totalBookings: number;
}): FraudProfile {
  const { noShows, noShowsLast7d, totalBookings } = input;
  const rawScore =
    (noShows / Math.max(1, totalBookings)) * 100 + 10 * noShowsLast7d;
  const score = Math.round(rawScore);
  let band: FraudBand = "green";
  let requiredDepositPct = 0;
  let message = "Tài khoản uy tín — không yêu cầu đặt cọc.";
  if (score >= 50) {
    band = "red";
    requiredDepositPct = 1;
    message = "Lịch sử huỷ/không thanh toán cao — yêu cầu đặt cọc 100%.";
  } else if (score >= 20) {
    band = "amber";
    requiredDepositPct = 0.5;
    message = "Có vài lần không hoàn tất thanh toán — đề nghị đặt cọc 50%.";
  }
  return {
    score,
    band,
    noShows,
    noShowsLast7d,
    totalBookings,
    requiredDepositPct,
    message,
  };
}

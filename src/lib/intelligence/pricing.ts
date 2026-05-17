/**
 * Dynamic pricing — supply/demand surge with off-peak discount.
 * Pure & deterministic given inputs.
 */

export interface DynamicPriceResult {
  basePrice: number;
  finalPrice: number;
  multiplier: number;
  tier: "off_peak" | "normal" | "rising" | "high" | "extreme";
  reason: string;
}

export function dynamicPrice(
  basePrice: number,
  occRate: number,
  forecastRate?: number,
): DynamicPriceResult {
  let multiplier = 1;
  let tier: DynamicPriceResult["tier"] = "normal";
  let reason = "Giá thường — cung-cầu cân bằng.";

  if (occRate >= 0.85) {
    multiplier = 1.3;
    tier = "extreme";
    reason = "Bãi gần đầy (≥85%) — giá tăng 30%.";
  } else if (occRate >= 0.7) {
    multiplier = 1.15;
    tier = "high";
    reason = "Bãi đông (≥70%) — giá tăng 15%.";
  } else if (occRate <= 0.3) {
    multiplier = 0.85;
    tier = "off_peak";
    reason = "Bãi vắng (≤30%) — giảm 15% khuyến khích đặt.";
  }

  if (forecastRate !== undefined && forecastRate - occRate >= 0.1) {
    multiplier += 0.05;
    if (tier === "normal" || tier === "off_peak") tier = "rising";
    reason += " Dự báo lấp đầy tăng ≥10% trong 30 phút → +5%.";
  }

  const finalPrice = Math.round((basePrice * multiplier) / 1000) * 1000;
  return { basePrice, finalPrice, multiplier, tier, reason };
}

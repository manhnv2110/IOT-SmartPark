/**
 * Lightweight time-series forecasting for parking occupancy.
 * All inputs are occupancy rates in [0,1]. Returns clamped [0,1] outputs.
 */

export interface Snapshot {
  bucket_ts: string; // ISO
  occupancy_rate: number;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/**
 * Exponential moving average with linear drift forecast.
 * Series MUST be in chronological order (oldest first).
 */
export function emaForecast(
  series: number[],
  alpha = 0.3,
  horizonSteps = 6, // each step ≈ 5 minutes if snapshots are every 5min
): { predicted: number; ema: number; drift: number } {
  if (series.length === 0) return { predicted: 0, ema: 0, drift: 0 };
  let ema = series[0];
  for (let i = 1; i < series.length; i++) {
    ema = alpha * series[i] + (1 - alpha) * ema;
  }
  // drift = average delta over last min(6, n-1) points
  const tail = series.slice(-7);
  let drift = 0;
  for (let i = 1; i < tail.length; i++) drift += tail[i] - tail[i - 1];
  drift = tail.length > 1 ? drift / (tail.length - 1) : 0;
  return { predicted: clamp01(ema + drift * horizonSteps), ema, drift };
}

/**
 * Seasonal forecast — average occupancy at the same (day-of-week, hour)
 * across the available history. Acts as a Holt-Winters-lite seasonal term.
 */
export function seasonalForecast(
  history: Snapshot[],
  targetDow: number, // 0..6
  targetHour: number, // 0..23
): { predicted: number; samples: number } {
  let sum = 0;
  let n = 0;
  for (const s of history) {
    const d = new Date(s.bucket_ts);
    if (d.getDay() === targetDow && d.getHours() === targetHour) {
      sum += s.occupancy_rate;
      n++;
    }
  }
  return { predicted: n > 0 ? clamp01(sum / n) : 0, samples: n };
}

/**
 * Hybrid: 0.6 · seasonal + 0.4 · EMA. Confidence rises with sample count.
 */
export function hybridForecast(
  history: Snapshot[],
  horizonMinutes = 30,
  stepMinutes = 5,
): { predicted: number; confidence: number; ema: number; seasonal: number } {
  const target = new Date(Date.now() + horizonMinutes * 60_000);
  const series = history.map((s) => s.occupancy_rate);
  const horizonSteps = Math.max(1, Math.round(horizonMinutes / stepMinutes));
  const { predicted: emaPred } = emaForecast(series, 0.3, horizonSteps);
  const { predicted: seasonalPred, samples } = seasonalForecast(
    history,
    target.getDay(),
    target.getHours(),
  );
  const hasSeason = samples >= 2;
  const predicted = hasSeason
    ? clamp01(0.6 * seasonalPred + 0.4 * emaPred)
    : emaPred;
  const confidence = clamp01(
    0.4 + 0.1 * Math.min(history.length, 50) / 50 + (hasSeason ? 0.2 : 0),
  );
  return { predicted, confidence, ema: emaPred, seasonal: seasonalPred };
}

/**
 * Build a sparkline series of N most-recent points (rate in [0,1]).
 */
export function sparkline(history: Snapshot[], n = 24): number[] {
  return history.slice(-n).map((s) => s.occupancy_rate);
}

/**
 * Build a 7×24 heatmap (dow rows, hour cols) of average occupancy.
 */
export function buildHeatmap(history: Snapshot[]): number[][] {
  const grid: number[][] = Array.from({ length: 7 }, () =>
    new Array(24).fill(0),
  );
  const cnt: number[][] = Array.from({ length: 7 }, () =>
    new Array(24).fill(0),
  );
  for (const s of history) {
    const d = new Date(s.bucket_ts);
    const dow = d.getDay();
    const h = d.getHours();
    grid[dow][h] += s.occupancy_rate;
    cnt[dow][h] += 1;
  }
  for (let i = 0; i < 7; i++)
    for (let j = 0; j < 24; j++)
      grid[i][j] = cnt[i][j] > 0 ? grid[i][j] / cnt[i][j] : 0;
  return grid;
}

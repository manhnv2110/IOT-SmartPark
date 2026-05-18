/** Haversine distance in km between two lat/lng pairs. */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Naive ETA in minutes assuming average city speed (km/h). */
export function etaMinutes(distanceKm: number, avgSpeedKmh = 22): number {
  if (distanceKm <= 0) return 0;
  return Math.round((distanceKm / avgSpeedKmh) * 60);
}

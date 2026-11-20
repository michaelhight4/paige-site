/**
 * WGS84 ellipsoidal geodesic distance (Karney), via geographiclib-geodesic
 * 2.2.0, MIT. Used for pin-to-pin and path lengths so displayed distance
 * matches the ground, not a spherical approximation.
 */
import geodesic from "geographiclib-geodesic";

export const GEODESIC_LIB = "geographiclib-geodesic@2.2.0";

const geod = geodesic.Geodesic.WGS84;

/** Inverse WGS84 geodesic distance in meters. */
export function geodesicMeters(a, b) {
  if (!a || !b) return 0;
  const lat1 = Number(a.lat);
  const lon1 = Number(a.lon);
  const lat2 = Number(b.lat);
  const lon2 = Number(b.lon);
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return 0;
  if (lat1 === lat2 && lon1 === lon2) return 0;
  const r = geod.Inverse(lat1, lon1, lat2, lon2);
  const m = Number(r && r.s12);
  return Number.isFinite(m) ? m : 0;
}

/** Direct WGS84 geodesic: from a point, go `meters` along `azimuthDeg`. */
export function geodesicDirect(a, azimuthDeg, meters) {
  const lat1 = Number(a && a.lat);
  const lon1 = Number(a && a.lon);
  const azi = Number(azimuthDeg);
  const s = Number(meters);
  if (![lat1, lon1, azi, s].every(Number.isFinite)) return { lat: lat1, lon: lon1 };
  const r = geod.Direct(lat1, lon1, azi, s);
  return { lat: r.lat2, lon: r.lon2, azi: r.azi2 };
}

/**
 * Sum of geodesic lengths of every consecutive segment. The path is not
 * simplified or resampled before measuring.
 */
export function geodesicPathLength(coords) {
  const list = coords || [];
  let sum = 0;
  for (let i = 1; i < list.length; i++) {
    sum += geodesicMeters(list[i - 1], list[i]);
  }
  return sum;
}

/** Point `metersFromA` along the geodesic from a toward b. */
export function geodesicInterpolate(a, b, metersFromA) {
  const d = geodesicMeters(a, b);
  if (!(d > 0) || !a) return { lat: Number(a && a.lat), lon: Number(a && a.lon) };
  const r = geod.Inverse(Number(a.lat), Number(a.lon), Number(b.lat), Number(b.lon));
  const go = Math.max(0, Math.min(d, Number(metersFromA) || 0));
  const d2 = geod.Direct(Number(a.lat), Number(a.lon), r.azi1, go);
  return { lat: d2.lat2, lon: d2.lon2 };
}

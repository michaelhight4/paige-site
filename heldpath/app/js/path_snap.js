/**
 * Optional post-run cleanup: pull recorded points onto a nearby OpenStreetMap
 * path. Off by default, runs only on this phone, and never changes the raw
 * export track. The network request (Overpass) is made only when the user
 * turns this on and finishes a session.
 */
import { geodesicMeters } from "./geodesic.js";

export const PATH_SNAP_NOTE = "After a walk or run, Heldpath can tidy the displayed route by snapping it to nearby mapped paths. This is off until you turn it on. It runs on this phone only, after you stop, and it does not change the raw GPX or FIT export.";

/** Project point P onto segment AB; return the closest point and distance. */
export function projectOnSegment(p, a, b) {
  const ax = a.lon;
  const ay = a.lat;
  const dx = b.lon - ax;
  const dy = b.lat - ay;
  const len2 = dx * dx + dy * dy;
  let t = 0;
  if (len2 > 0) {
    t = ((p.lon - ax) * dx + (p.lat - ay) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
  }
  const q = { lat: ay + t * dy, lon: ax + t * dx };
  return { point: q, meters: geodesicMeters(p, q), t };
}

/**
 * Snap each track point to the nearest vertex/segment of `path` when that
 * is closer than `maxM` (default 25 m). Path is an array of {lat,lon}.
 */
export function snapTrackToPath(track, path, { maxM = 25 } = {}) {
  const line = (path || []).filter((p) => p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon)));
  const pts = (track || []).filter((p) => p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon)));
  if (line.length < 2) return pts.map((p) => ({ ...p, snapped: false }));
  return pts.map((p) => {
    let best = null;
    for (let i = 1; i < line.length; i++) {
      const hit = projectOnSegment(p, line[i - 1], line[i]);
      if (!best || hit.meters < best.meters) best = hit;
    }
    if (best && best.meters <= maxM) {
      return { ...p, lat: best.point.lat, lon: best.point.lon, snapped: true, snapM: best.meters };
    }
    return { ...p, snapped: false };
  });
}

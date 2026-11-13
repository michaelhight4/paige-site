// Trail wild-level scaling (Coder, Oct 23 2026). Gary 11:48 AM CT: "well we need to have them be level scaling the
// closer to town you get". On trail maps (internal ids route*), a wild creature's level inside its slot range follows how
// far along the trail the player is: low end at the entry from the earlier (home-side) town, high end toward the next town.
// Axis data: data/trail_axes.json, built by tools/build_trail_axes.mjs from map exits/warps (+ data/trail_axes_overrides.json).
// level = round(lerp(slot min, slot max, t)) + jitter (-1 / 0 / +1 at 25 / 50 / 25 %), clamped to the slot range and to
// the zone cap (zone.cap.level). Never below the slot min, so tables that respect evolution levels stay respected
// (Trail 1 is first-stage only anyway). Maps without an axis (towns, caves, fields) keep the uniform roll.
export const TRAIL_AXES_URL = 'data/trail_axes.json';

/** Cell a map exit/warp sits on: edge exits use the middle of their span on that edge. -> [x, y] */
export function exitPoint(map, e) {
  const w = map.width, h = map.height, mid = ((e.start ?? 0) + (e.end ?? e.start ?? 0)) / 2;
  if (e.edge === 'north') return [mid, 0];
  if (e.edge === 'south') return [mid, h - 1];
  if (e.edge === 'west') return [0, mid];
  if (e.edge === 'east') return [w - 1, mid];
  return [e.x ?? 0, e.y ?? 0];
}

/** Raw projection of (x, y) onto a -> b (0 at a, 1 at b), unclamped. */
export function project(a, b, x, y) {
  const dx = b[0] - a[0], dy = b[1] - a[1], d2 = dx * dx + dy * dy;
  return d2 ? ((x - a[0]) * dx + (y - a[1]) * dy) / d2 : 0;
}

/** Axis entry for a map (variants like route1_storm fall back to their base map). -> axis | null */
export function axisFor(axes, mapName) {
  const m = axes?.maps || {};
  return m[mapName] || (mapName && m[mapName.replace(/_storm$/, '')]) || null;
}

/** Progress 0..1 along the trail for tile (x, y): projection normalised to the axis span (the first and last encounter
 * cells along the axis), clamped. -> number | null (no axis) */
export function trailT(axis, x, y) {
  if (!axis?.a || !axis?.b) return null;
  const p = project(axis.a, axis.b, x, y), [s0, s1] = axis.span || [0, 1];
  const t = s1 > s0 ? (p - s0) / (s1 - s0) : p;
  return Math.max(0, Math.min(1, t));
}

/** Scaled level for slot range [lo, hi] at progress t. rng() in [0,1) (one call). cap: [min, max] zone cap or null. */
export function scaledLevel(lo, hi, t, rng = Math.random, cap = null) {
  const base = Math.round(lo + (hi - lo) * Math.max(0, Math.min(1, t)));
  const r = rng(), jitter = r < 0.25 ? -1 : r >= 0.75 ? 1 : 0;
  let min = lo, max = hi;
  if (Array.isArray(cap) && cap.length === 2) { min = Math.max(min, cap[0]); max = Math.min(max, cap[1]); }
  if (min > max) min = max; // slot entirely outside the cap: pin to the cap edge
  return Math.max(min, Math.min(max, base + jitter));
}

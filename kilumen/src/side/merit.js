// Merit points entry point for side activities (Coder, Oct 30 2026).
// The real merit shop is being built on dev/merit-shop. Until it lands this is a STUB with the same call shape:
// addMeritPoints(scene, n, reason) -> new total. If scene.systems.merit.addMeritPoints exists (merit shop attached), it is
// used; otherwise the points sit in scene.counters.merit_points (saved with the other counters) so nothing is lost and the
// merit shop can read them when it merges.
export const MERIT_STUB = true;
export function meritTotal(scene) {
  const m = scene?.systems?.merit;
  if (typeof m?.total === 'function') return m.total();
  return Number(scene?.counters?.merit_points) || 0;
}
export function addMeritPoints(scene, n, reason = '') {
  n = Math.max(0, Math.floor(Number(n) || 0));
  const m = scene?.systems?.merit;
  if (typeof m?.addMeritPoints === 'function') return m.addMeritPoints(n, reason);
  if (!scene) return n;
  scene.counters ||= {};
  scene.counters.merit_points = (Number(scene.counters.merit_points) || 0) + n;
  scene.log?.push?.({ tick: scene.tick, type: 'merit', n, reason, stub: true });
  scene._dirty = true;
  return scene.counters.merit_points;
}

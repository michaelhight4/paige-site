// Merit points entry point for side activities (Coder, Oct 30 2026).
// addMeritPoints(scene, n, reason) -> new total. Order:
//  1. scene.systems.merit.addMeritPoints (a merit system attached to the scene), if present;
//  2. the real merit system from dev/merit-shop (src/sports/merit.js): points live in the sports state, sports.merit
//     {points, earned, spent, log} (saved with the systems state). Its addMeritPoints is used if it exports one,
//     else its meritState(); the module is loaded lazily so this branch still works before dev/merit-shop is merged;
//  3. fallback (merit shop not merged yet): the same sports.merit shape is written here, so the merit shop reads
//     the points as-is when it lands.
// The old stub counter scene.counters.merit_points is migrated into sports.merit.points once, then removed.
export const MERIT_STUB = false;
export const MERIT_MAX = 9999; // same cap as src/sports/merit.js (dev/merit-shop)
let REAL = null;
export const realMerit = import('../sports/merit.js?v=v0.2.102-alpha').then((m) => (REAL = m)).catch(() => null);
export const _setRealMerit = (m) => { REAL = m; }; // tests

const localState = (sstate) => {
  const m = (sstate.merit ||= {});
  m.points = Math.max(0, Math.floor(Number(m.points) || 0)); m.earned ??= 0; m.spent ??= 0; m.log ||= [];
  return m;
};
/** sports state (sports.merit lives here), same lookup as src/sports/index.js. */
export function sportsOf(scene) {
  const st = scene.systems?.state || (scene._sportsState ||= {});
  return (st.sports ||= {});
}
/** sports.merit for this scene, with the old counters.merit_points stub total moved in (once). */
export function meritOf(scene) {
  const s = sportsOf(scene), m = typeof REAL?.meritState === 'function' ? REAL.meritState(s) : localState(s);
  const old = Number(scene.counters?.merit_points) || 0;
  if (scene.counters && 'merit_points' in scene.counters) {
    if (old > 0) { const add = Math.min(old, MERIT_MAX - m.points); m.points += add; m.earned += add; m.log = [...m.log, { kind: 'side_stub', pts: add }].slice(-20); }
    delete scene.counters.merit_points; scene._dirty = true;
  }
  return m;
}
export function meritTotal(scene) {
  const sm = scene?.systems?.merit;
  if (typeof sm?.total === 'function') return sm.total();
  return scene ? meritOf(scene).points : 0;
}
export function addMeritPoints(scene, n, reason = '') {
  n = Math.max(0, Math.floor(Number(n) || 0));
  const sm = scene?.systems?.merit;
  if (typeof sm?.addMeritPoints === 'function') return sm.addMeritPoints(n, reason);
  if (!scene) return n;
  const m = meritOf(scene);
  if (typeof REAL?.addMeritPoints === 'function') { REAL.addMeritPoints(sportsOf(scene), n, reason); scene._dirty = true; return meritOf(scene).points; }
  const add = Math.min(n, MERIT_MAX - m.points);
  if (add > 0) { m.points += add; m.earned += add; m.log = [...m.log, { kind: 'side', reason, pts: add }].slice(-20); }
  scene.log?.push?.({ tick: scene.tick, type: 'merit', n: add, reason });
  scene._dirty = true;
  return m.points;
}

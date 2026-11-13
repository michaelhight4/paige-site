// Creature idle + walk motion (v0.2.36, Oct 28 2026; ON by default, ?cidle=0 = off, reduced motion = off). Code-driven from existing art:
//  - battle: 128px forms swap the still battle PNG for the species' existing 4-frame idle GIF (anim/<id>_<side>_idle_2x.gif); 160px forms keep the still
//  - overworld follower: idle = facing frame 0 + a 4-step breathe (feet planted, 1 art px rise, slight squash);
//    walk = the sheet's own walk columns + a 2-step bob/squash per tile.
// alpha.js strips the query string early, so it sets globalThis.KILUMEN_CIDLE_OFF for ?cidle=0; the local check covers the dev tree.
const offQ = new URLSearchParams((globalThis.location && globalThis.location.search) || '').get('cidle') === '0';
export const cidleOn = () => !(offQ || globalThis.KILUMEN_CIDLE_OFF);
export const reducedMotion = () => !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const IDLE = [[0, 1], [-1, 0.97], [-1, 0.95], [0, 0.97]]; // [lift art px (neg = up), scaleY], held steps (pixel feel)
const IDLE_MS = 450;
/** Motion for a 64px creature actor. ms: scene clock; walking + t (0..1 progress through the tile). */
export function creatureMotion(ms, walking, t = 0) {
  if (reducedMotion()) return { lift: 0, sy: 1, sx: 1 };
  if (walking) return Math.floor(t * 4) % 2 ? { lift: 2, sy: 1.03, sx: 0.98 } : { lift: 0, sy: 0.93, sx: 1.05 };
  const [lift, sy] = IDLE[Math.floor(ms / IDLE_MS) % IDLE.length];
  return { lift: -lift, sy, sx: 1 + (1 - sy) * 0.5 };
}

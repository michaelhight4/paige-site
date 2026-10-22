import { fmtMoney } from './fmt.js';
// Seeded RNG (mulberry32). All functions take an object with a numeric `rs` field
// (the game state, or {rs: seed} for replays) so the generator state is saved with the game.
export function rnd(o) {
  let t = (o.rs = (o.rs + 0x6D2B79F5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const rint = (o, a, b) => a + Math.floor(rnd(o) * (b - a + 1));
export const pick = (o, arr) => arr[Math.floor(rnd(o) * arr.length)];
export const chance = (o, p) => rnd(o) < p;
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export function gauss(o) {
  const u = Math.max(1e-9, rnd(o)), v = rnd(o);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
export function wpick(o, items, wf) {
  const ws = items.map(wf), tot = ws.reduce((a, b) => a + b, 0);
  if (tot <= 0) return null;
  let r = rnd(o) * tot;
  for (let i = 0; i < items.length; i++) { r -= ws[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}
export const money = (n) => fmtMoney(n);

// Saltmere Harbour Haul: tug of war (dev/sports-major, Oct 29 2026). Pure logic, no DOM; same event interface as town_events.js
// (create/step/score/bars/unit/time) so the town cup framework (town_cup.js) and the Aurelith Games can run it unchanged.
// Team event: three creatures on the rope. Team strength = mean of (0.6 power + 0.4 stamina) over the three.
// Tap A to heave (tap ON the pulse for a big heave). Mashing tires the grip. The rival crew "digs in" with telegraphed
// surges: hold ▼ (brace) through a surge to halve it. Each member has a personality (role + quirk) for reactions.
import { rngFor } from './rng.js?v=v0.2.101-alpha';

const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
export const ROLES = ['front', 'middle', 'anchor'];
export const QUIRKS = ['grunter', 'showoff', 'steady', 'nervous']; // TS.tug_q_<quirk> reaction lines
const strOf = (st) => cl((0.6 * (st?.power ?? 50) + 0.4 * (st?.stamina ?? 50)) / 100, 0, 1);
export const teamStrength = (teamStats = []) => { const t = (teamStats.length ? teamStats : [{}]).slice(0, 3); return t.reduce((s, x) => s + strOf(x), 0) / t.length; };
export const quirkFor = (species = '', i = 0) => QUIRKS[[...String(species)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, i * 7) % QUIRKS.length];

export const tug = {
  id: 'tug_of_war', town: 'saltmere', region: 2, unit: 'pts', time: 30, bars: [100, 62, 48], team: true,
  // stats: lead creature athletics; n: party size; teamStats: up to 3 athletics objects (strongest first); rival 0..1 crew strength
  create(seed, stats, n = 1, teamStats = null, rival = 0.55) {
    const r = rngFor(seed), ts = teamStats && teamStats.length ? teamStats.slice(0, 3) : [stats || {}];
    return { r, t: 0, left: this.time, p: 0.5, v: 0, pull: 0.45, S: teamStrength(ts), R: cl(rival, 0.2, 0.95), grip: 1, pulse: 0, period: 0.62,
      surge: null, nextSurge: 2.5 + r() * 2, brace: false, heaves: 0, perfects: 0, slips: 0, braced: 0, fx: null, won: false, lost: false, done: false, score: 0,
      crew: ts.map((_, i) => ({ role: ROLES[Math.min(i, 2)] })), last: null };
  },
  step(s, dt, inp) {
    if (s.done) return; s.t += dt; s.left -= dt; s.pulse = (s.pulse + dt / s.period) % 1;
    s.brace = !!(inp.hold?.down || inp.down);
    if (s.fx && (s.fx.t -= dt) <= 0) s.fx = null;
    if (inp.tap || inp.up) { // heave: adds to the team's pull; on the pulse it is a big heave, mashing off the pulse drains grip
      const onBeat = s.pulse > 0.8 || s.pulse < 0.1, q = onBeat ? 'perfect' : 'good';
      s.pull += (onBeat ? 0.55 : 0.12) * s.grip * (0.7 + 0.9 * s.S); s.grip = Math.max(0.15, s.grip - (onBeat ? 0.02 : 0.2)); s.pull = Math.min(s.pull, 0.55 + 0.45 * s.S);
      s.heaves++; if (onBeat) s.perfects++; s.fx = { k: q, t: 0.35 }; s.last = q;
    }
    s.grip = Math.min(1, s.grip + dt * 0.25); s.pull *= Math.exp(-1.2 * dt);
    // rival crew: steady pull + telegraphed surges ("they dig in!") every 3-5 s; brace (hold down) halves a surge
    s.nextSurge -= dt;
    if (!s.surge && s.nextSurge <= 0) s.surge = { warn: 0.7, t: 0.9, hit: false };
    let rv = 0.18 + 0.4 * s.R;
    if (s.surge) {
      if (s.surge.warn > 0) s.surge.warn -= dt;
      else { s.surge.t -= dt; rv += 0.45 * (s.brace ? 0.35 : 1);
        if (!s.surge.hit) { s.surge.hit = true; if (s.brace) { s.braced++; s.fx = { k: 'brace', t: 0.5 }; } else { s.slips++; s.fx = { k: 'slip', t: 0.5 }; } }
        if (s.surge.t <= 0) { s.surge = null; s.nextSurge = 3 + s.r() * 2 - Math.min(1, s.t / 30); } }
    }
    s.v = s.pull - rv; s.p = cl(s.p + s.v * dt * 0.3, 0, 1);
    if (s.p >= 0.85) { s.won = true; s.done = true; } else if (s.p <= 0.15) { s.lost = true; s.done = true; } else if (s.left <= 0) s.done = true;
    s.score = this.score(s);
  },
  // won: 100 + 3/s left; otherwise how far you held the rope (0.15 -> 0, 0.85 -> 99)
  score(s) { return s.won ? 100 + Math.round(Math.max(0, s.left) * 3) : Math.round(cl((s.p - 0.15) / 0.7, 0, 1) * 99); },
};

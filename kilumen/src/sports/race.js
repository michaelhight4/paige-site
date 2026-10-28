// Kilumen sports: Dash Race simulation (pure, no DOM). 100 m straight, 4 lanes, ~20-26 s. Dev test, Oct 28 2026.
// Outcome = stats + traits + light seeded noise + 3 timed inputs (start tap, mid push, final sprint). The inputs are worth
// a few percent of race time; a stat gap between species is worth much more, so taps help but do not override stats.
import { rngFor } from './rng.js?v=v0.2.37-alpha';

export const DIST = 100, PUSH_AT = 45, SPRINT_AT = 78, WINDOW_S = 1.5;
export const TUNING = {
  vBase: 3.3, vPerSpeed: 0.024, sprinterMul: 1.03,
  accBase: 1.0, accPer: 0.028,
  reactBase: 0.38, reactPerAgi: 0.0022, fastStarterCut: 0.07, falseStartPenalty: 0.5,
  poolBase: 40, poolPerSta: 0.9, drainK: 4.6, steadyMul: 0.8, tiredBelow: 0.3, tiredFloor: 0.8,
  pushBase: 0.08, pushPerQ: 0.14, ironMul: 1.3, pushBoostS: 1.2, pushBoost: 0.03,
  sprintBase: 0.015, sprintPerQ: 0.05, clutchMul: 1.35, sprintDrain: 1.8,
  noise: 0.035,
};

/** racers: [{ key, name, species, stats:{speed,power,stamina,agility,focus}, traits:[], isPlayer }] */
export function createRace(racers, seed = 'race', T = TUNING) {
  const rng = rngFor('dash:' + seed);
  const rs = racers.map((r, lane) => {
    const s = r.stats, has = (t) => r.traits?.includes(t);
    const pool = T.poolBase + s.stamina * T.poolPerSta;
    // AI input quality: focus-driven, with spread
    const aiQ = () => Math.max(0, Math.min(1, s.focus / 100 * 0.75 + 0.15 + (rng() - 0.5) * 0.5));
    return {
      ...r, lane, x: 0, v: 0, t: 0, done: false, finish: null, pool, energy: pool,
      vTop: (T.vBase + s.speed * T.vPerSpeed) * (has('sprinter') ? T.sprinterMul : 1),
      acc: T.accBase + ((s.power + s.agility) / 2) * T.accPer,
      react: Math.max(0.08, T.reactBase - s.agility * T.reactPerAgi - (has('fast_starter') ? T.fastStarterCut : 0)),
      drainMul: has('steady_pacer') ? T.steadyMul : 1, pushMul: has('iron_lungs') ? T.ironMul : 1, clutchMul: has('clutch_finisher') ? T.clutchMul : 1,
      noiseAmp: T.noise * (1 - s.focus / 160), noisePh: rng() * 6.28, noiseF: 0.5 + rng() * 0.6,
      inputs: { start: null, push: null, sprint: null }, boostUntil: 0, sprintMul: 1,
      ai: r.isPlayer ? null : { start: aiQ(), push: aiQ(), sprint: aiQ(), falseStart: rng() < 0.04 },
    };
  });
  const race = { racers: rs, clock: 0, finished: false, order: [], T, events: [] };
  for (const r of rs) if (r.ai) applyStart(race, r, r.ai.falseStart ? -1 : r.ai.start);
  return race;
}

/** Start tap. q: 0..1 quality, or -1 for a false start. */
export function applyStart(race, r, q) {
  if (r.inputs.start !== null) return;
  r.inputs.start = q;
  const T = race.T;
  r.react = q < 0 ? r.react + T.falseStartPenalty : r.react * (1.35 - 0.6 * q);
}
export function applyPush(race, r, q) {
  if (r.inputs.push !== null) return;
  r.inputs.push = q;
  const T = race.T;
  r.energy = Math.min(r.pool, r.energy + r.pool * (T.pushBase + T.pushPerQ * q) * r.pushMul);
  r.boostUntil = r.t + T.pushBoostS * q;
}
export function applySprint(race, r, q) {
  if (r.inputs.sprint !== null) return;
  r.inputs.sprint = q;
  const T = race.T;
  r.sprintMul = 1 + (T.sprintBase + T.sprintPerQ * q) * (0.5 + r.stats.power / 100) * r.clutchMul;
}
export const playerOf = (race) => race.racers.find((r) => r.isPlayer);

/** Advance by dt seconds (race clock starts at GO = 0). Returns events this step: {type:'push'|'sprint'|'finish', key}. */
export function stepRace(race, dt) {
  const T = race.T, ev = [];
  race.clock += dt;
  for (const r of race.racers) {
    if (r.done) continue;
    r.t = race.clock;
    if (!r.ai && r.inputs.start === null) continue; // player waits for the start tap (UI auto-applies 0 after 1 s)
    if (r.t < r.react) continue;
    // timed windows: AI applies on arrival; player gets an event and WINDOW_S to answer (no answer = 0)
    if (r.x >= PUSH_AT && r.inputs.push === null) {
      if (r.ai) applyPush(race, r, r.ai.push);
      else if (r.pushOpen == null) { r.pushOpen = r.t; ev.push({ type: 'push', key: r.key }); }
      else if (r.t - r.pushOpen > WINDOW_S) applyPush(race, r, 0);
    }
    if (r.x >= SPRINT_AT && r.inputs.sprint === null) {
      if (r.ai) applySprint(race, r, r.ai.sprint);
      else if (r.sprintOpen == null) { r.sprintOpen = r.t; ev.push({ type: 'sprint', key: r.key }); }
      else if (r.t - r.sprintOpen > WINDOW_S) applySprint(race, r, 0);
    }
    const fe = r.energy / r.pool;
    const tired = fe >= T.tiredBelow ? 1 : T.tiredFloor + (1 - T.tiredFloor) * (fe / T.tiredBelow);
    const boost = r.t < r.boostUntil ? 1 + T.pushBoost : 1;
    const noise = 1 + r.noiseAmp * Math.sin(r.noisePh + r.t * r.noiseF * 2.1) * Math.sin(r.noisePh * 1.7 + r.t * r.noiseF);
    const target = r.vTop * tired * boost * noise * (r.x >= SPRINT_AT ? r.sprintMul : 1);
    r.v = r.v < target ? Math.min(target, r.v + r.acc * dt) : Math.max(target, r.v - 1.5 * dt);
    const drain = T.drainK * (r.v / r.vTop) ** 2 * r.drainMul * (r.x >= SPRINT_AT && r.sprintMul > 1 ? T.sprintDrain : 1);
    r.energy = Math.max(0, r.energy - drain * dt);
    r.x += r.v * dt;
    if (r.x >= DIST) {
      const over = (r.x - DIST) / Math.max(0.01, r.v);
      r.finish = Math.round((race.clock - over) * 100) / 100; r.x = DIST; r.done = true; r.v = 0;
      race.order.push(r); ev.push({ type: 'finish', key: r.key });
    }
  }
  if (race.racers.every((r) => r.done)) { race.finished = true; race.order.sort((a, b) => a.finish - b.finish); }
  return ev;
}

/** Run to the end with fixed player input qualities (for tests / balancing). */
export function simulate(racers, seed, playerQ = { start: 0.7, push: 0.7, sprint: 0.7 }, dt = 1 / 60) {
  const race = createRace(racers, seed);
  const p = playerOf(race);
  if (p) applyStart(race, p, playerQ.start);
  let guard = 0;
  while (!race.finished && guard++ < 60 * 120) {
    const ev = stepRace(race, dt);
    for (const e of ev) { if (e.type === 'push' && p) applyPush(race, p, playerQ.push); if (e.type === 'sprint' && p) applySprint(race, p, playerQ.sprint); }
  }
  return race;
}

/** Quality of a tap on a moving marker: pos/centre/half in 0..1 units; inside the zone 0.6..1, outside falls to 0. */
export function markerQuality(pos, centre, half) {
  const d = Math.abs(pos - centre);
  return d <= half ? Math.round((1 - 0.4 * (d / half)) * 100) / 100 : Math.max(0, Math.round((0.6 - (d - half) * 3) * 100) / 100);
}
/** Start tap quality from seconds after GO (negative = false start -> -1). */
export const startQuality = (dt) => (dt < 0 ? -1 : Math.max(0, Math.min(1, 1 - (dt - 0.12) / 0.45)));

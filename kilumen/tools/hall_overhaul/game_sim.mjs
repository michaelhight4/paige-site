// Headless hall walk on the REAL game code (Coder, Oct 30 2026; tester: "the solver paths fail in the game").
// The old solver walked a separate puzzle model (no trainer sight, trainers never move), so its paths broke the moment a
// trainer spotted you and walked up (Tidewater: Wendell steps into the corridor the path used; Cindervale: the arrows
// then slide you somewhere else). This drives Overworld.prototype.step / interact / talk / worldApi, GridMover, GameMap,
// NpcSystem (walkTo, idle looks), SightSystem (spot -> walk up -> battle) and attachHallV2 (arrows, ice, plates, gates,
// warps, seat-back, trade places) at 60 ticks/s, with key holds like a player: a token = hold the key ~190 ms (11 ticks)
// then let go and wait until you stand still and no talk is running. 'A' = press F once. Timers (hall_v2 seat-back uses
// setInterval) run on the tick clock, so a walk is deterministic.
import fs from 'node:fs';
const ROOT = new URL('../../', import.meta.url);
const V = /\?v=([\w.-]+)/.exec(fs.readFileSync(new URL('src/overworld/overworld.js', ROOT), 'utf8'))[1];
const imp = (p) => import(new URL(`${p}?v=${V}`, ROOT).href);
const J = (p) => JSON.parse(fs.readFileSync(new URL(p, ROOT), 'utf8'));
globalThis.KILUMEN_HALLANIM ??= true; // dev builds (the tester's dev warp) run the hall animations
const [{ Overworld }, { GameMap }, { GridMover }, { NpcSystem }, { SightSystem }, HV, { TICK_MS }] = await Promise.all([
  imp('src/overworld/overworld.js'), imp('src/overworld/map.js'), imp('src/overworld/movement.js'), imp('src/overworld/npcs.js'),
  imp('src/overnight/sight.js'), imp('src/progression/hall_v2.js'), imp('src/overworld/constants.js')]);
let BY_ID = null;
const tiles = () => { if (!BY_ID) { BY_ID = new Map(); for (const f of ['tileset.json', 'tileset_ix2.json', 'tileset_hallanim.json', 'tileset_hallart.json']) for (const t of J(`art/world/overworld/${f}`).tiles) BY_ID.set(t.id, t); } return BY_ID; };
let LINES = null;
export const HOLD_TICKS = 11, GAP_TICKS = 7; // 190 ms hold, ~120 ms between keys

/** Tick-clock timers (installed only while the sim runs a tick, so node's own timers are untouched). */
function fakeClock() {
  const q = []; let now = 0, id = 1;
  const add = (fn, ms, rep) => { const t = { id: id++, at: now + Math.max(1, ms | 0), fn, ms: Math.max(1, ms | 0), rep }; q.push(t); return t.id; };
  const del = (i) => { const k = q.findIndex((t) => t.id === i); if (k >= 0) q.splice(k, 1); };
  const api = { setTimeout: (fn, ms) => add(fn, ms, false), setInterval: (fn, ms) => add(fn, ms, true), clearTimeout: del, clearInterval: del };
  return {
    api, advance(ms) {
      now += ms;
      for (;;) { q.sort((a, b) => a.at - b.at || a.id - b.id); const t = q[0]; if (!t || t.at > now) break;
        if (t.rep) t.at += t.ms; else q.shift(); try { t.fn(); } catch (e) { console.error(e); } }
    },
  };
}

export async function createHallSim(mapName, { holdTicks = HOLD_TICKS, gapTicks = GAP_TICKS, beatTicks = 90, flags = [], seen = {} } = {}) {
  LINES ||= J('text/overworld_lines.json');
  const j = structuredClone(J(`art/world/overworld/maps/${mapName}.json`));
  const lm = LINES.maps?.[mapName];
  const s = Object.create(Overworld.prototype);
  Object.assign(s, {
    config: { pixelDir: '', start: { x: 0, y: 0 } }, opts: {}, lines: LINES, flags: new Set(flags), counters: {}, seen: { ...seen }, seenDay: {},
    clock: { min: 600, day: 1 }, party: [{ species: 'sunderhoof', hp: null }], timescale: 0, tick: 0, log: [], hooks: {}, busy: false,
    dialog: null, intro: null, systems: null, follower: null, fade: null, spots: [], standCells: new Set(), rustles: new Map(),
    decals: [], mapCache: new Map(), _saveLocks: new Map(), saveGuards: [], _sinceSave: 0, stillSince: 0, _stillKey: '',
    life: { tick() {}, enter() {} }, toasts: [],
  });
  s.player = new GridMover({ x: j.hall_v2.arrival[0], y: j.hall_v2.arrival[1], facing: 'up' });
  s.toast = function (text) { this.toasts.push(text); this.log.push({ tick: this.tick, type: 'toast', text }); };
  s.saveNow = () => {}; s.checkpoint = () => {}; s.lockSave = () => () => {};
  s.fill = (p, v = {}) => (Array.isArray(p) ? p : p ? [String(p)] : []).map((t) => String(t).replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m)));
  s.ask = async () => 1;
  s.battles = [];
  s.hooks.onBattle = async (who) => { s.battles.push(who.id); return true; };
  if (lm) {
    j.npcs = [...(j.npcs || []), ...(j.npcs_pending_text || []).filter((d) => s._entryFor(mapName, d))];
    const tp = j.text_pending || {}, ids = new Set(j.npcs.map((d) => d.id));
    j.npcs = [...j.npcs, ...(tp.npcs || []).filter((d) => !ids.has(d.id) && s._entryFor(mapName, d))];
  }
  j.npcs = (j.npcs || []).filter((d) => d.kind !== 'spawn');
  s.map = new GameMap(j); s.map.attachTileset(tiles());
  s.npcs = new NpcSystem(s);
  const sight = new SightSystem(s);
  s._enterMap = async function () { const m = this.map; m.applyGates(this.flags); this.npcs.build(m, null, this.phase); sight.onEnter(m); };
  const pg = { store: { masters: {}, puzzles: {} } };
  const clk = fakeClock(); const real = {};
  const withClock = (fn) => { for (const k in clk.api) { real[k] = globalThis[k]; globalThis[k] = clk.api[k]; } try { return fn(); } finally { Object.assign(globalThis, real); } };
  let hv; withClock(() => { hv = HV.attachHallV2(s, null, pg); });
  await withClock(() => s._enterMap());
  const flush = async () => { for (let i = 0; i < 40; i++) await null; };
  const step = s.step.bind(s);
  async function tick(snap) {
    for (const k in clk.api) { real[k] = globalThis[k]; globalThis[k] = clk.api[k]; }
    try { step(snap); sight.tick(); await flush(); clk.advance(TICK_MS); await flush(); } finally { Object.assign(globalThis, real); }
  }
  const idle = () => !s.player.moving && s.player.state === 'idle' && !s.busy && !s.fade && !s.player.locked;
  const EMPTY = { dir: null, a: false, b: false };
  const DIRN = { U: 'up', D: 'down', L: 'left', R: 'right' };
  /** One token like a player: U/D/L/R = hold ~190 ms then release; A = press F. Then wait for stand-still (max 30 s). */
  async function press(tok) {
    if (tok === 'A') { await tick({ ...EMPTY, a: true }); }
    else { const dir = DIRN[tok]; for (let i = 0; i < holdTicks; i++) await tick({ ...EMPTY, dir }); }
    for (let i = 0; i < gapTicks; i++) await tick(EMPTY);
    for (let i = 0; i < 1800 && !idle(); i++) await tick(EMPTY);
    for (let i = 0; i < 1800 && s.npcs.list.some((n) => n.mover.moving || n.goal || n.script.length) && idle(); i++) { if (i > beatTicks) break; await tick(EMPTY); } // short beat for a walk-back
  }
  async function wait(ticks) { for (let i = 0; i < ticks; i++) await tick(EMPTY); }
  const state = () => ({ x: s.player.x, y: s.player.y, facing: s.player.facing, bits: hv.cur?.bits ?? 0, battles: s.battles.slice(),
    npcs: s.npcs.list.map((n) => [n.id, n.x, n.y]) });
  return { scene: s, hv, sight, press, wait, tick, state, idle, map: s.map, json: j };
}

/** Replay a token string on the real game code -> {end, battles, trace, sim}. */
export async function walkHall(mapName, tokens, opts = {}) {
  const sim = await createHallSim(mapName, opts), trace = [];
  for (const t of tokens) { await sim.press(t); const st = sim.state(); trace.push([t, st.x, st.y, st.facing, st.battles.length]); }
  const st = sim.state();
  return { end: [st.x, st.y], facing: st.facing, battles: st.battles, trace, sim };
}

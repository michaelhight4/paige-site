// Kilumen: story auto-walk (Gary, Oct 23 2026: "when theres a story flag can we force the players movements into the
// conversation same as pokemon so they dont get lost doing guess work"). DEV.
// One reusable helper for story beats, always run INSIDE scene.script() so the save lock already holds:
//   script() checkpoints right before (the pre-beat state is what a close mid-walk reloads), input is frozen (busy),
//   saveNow() is refused until the script ends, then a normal save runs.
// Flow: spark over the NPC (the trainer-sight crystal spark, sight.js: house rule is never a '!') + a short pause ->
//   the PLAYER walks to the NPC (A* over the collision grid, pathing.js / easystar, tile by tile with the normal walk
//   step and animation) -> else the NPC walks to the player (npcs.walkTo) -> else a short fade and the player is set
//   down next to the NPC -> both face each other -> the caller starts the conversation.
// Switch: ?automove=0 (or scene.opts.automove === false) turns every auto-walk off: beats then wait for a normal talk.
import { Col, DELTA } from './constants.js?v=v0.2.86-alpha';
import { walkGrid, findPath, pathToDirs } from './pathing.js?v=v0.2.86-alpha';

export const AUTOMOVE = {
  sparkTicks: 36,     // same length as the trainer-sight spark
  pauseMs: 450,       // the beat after the spark, before anyone moves
  stepMs: 1500,       // one tile may take this long (a step is ~250 ms) before it counts as blocked
  npcMs: 6000,        // an NPC walk-up gives up after this
  replans: 3,         // player blocked mid-route (a wanderer stepped in): plan again this many times
  maxSteps: 60,       // longer routes are not a "walk over": fade instead
  fadeMs: 220,        // fallback fade out / in
};

const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };

/** On unless ?automove=0|off|false or scene.opts.automove === false. */
export function automoveOn(scene, query = null) {
  if (scene?.opts?.automove === false || scene?.opts?.automove === 0) return false;
  let q = query;
  if (!q) { try { q = new URLSearchParams(globalThis.location?.search || ''); } catch { q = null; } }
  const v = q?.get?.('automove');
  return !(v != null && /^(0|off|false|no)$/i.test(v));
}

/** Direction from a toward b (a cell next to it). */
export function faceTo(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  if (!dx && !dy) return null;
  return Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
}

/** Cell the player may stand on during an auto-walk: plain floor, no NPC, no warp / plate / grass (nothing fires). */
export function playerFree(map, x, y, self = null) {
  if (!map.inBounds(x, y) || map.code(x, y) !== Col.WALK) return false;
  const who = map.npcAt(x, y);
  if (who && who !== self) return false;
  if (map.warpAt?.(x, y)) return false;
  return !map.encounter?.(x, y);
}

/** The 4 cells next to `t`, the one it faces first (Pokemon: you walk up to the front of a person). */
export function sideCells(t, facing = 'down') {
  const order = [facing, ...['down', 'left', 'right', 'up'].filter((d) => d !== facing)];
  return order.map((d) => ({ x: t.x + DELTA[d].x, y: t.y + DELTA[d].y, side: d }));
}

/**
 * Pure: shortest route for the player from `from` to any free cell next to `target` (the NPC's facing side wins ties).
 * Returns { cell, dirs } (dirs = [] when already next to it) or null when no route exists.
 */
export function planPlayerRoute(map, from, target, { facing = 'down', maxSteps = AUTOMOVE.maxSteps, self = null } = {}) {
  if (Math.abs(from.x - target.x) + Math.abs(from.y - target.y) === 1) return { cell: { x: from.x, y: from.y }, dirs: [] };
  const grid = walkGrid(map, (x, y) => !playerFree(map, x, y, self), [from]);
  let best = null;
  for (const c of sideCells(target, facing)) {
    if (!playerFree(map, c.x, c.y)) continue;
    const path = findPath(grid, from, c);
    if (!path) continue;
    const dirs = pathToDirs(path);
    if (dirs.length <= maxSteps && (!best || dirs.length < best.dirs.length)) best = { cell: { x: c.x, y: c.y }, dirs };
  }
  return best;
}

/** Ticks of the scene's own loop are not awaited here: poll on a timer (same as intro.js _until). */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(pred, ms) { const t0 = Date.now(); while (!pred() && Date.now() - t0 < ms) await sleep(16); return !!pred(); }

/**
 * Walk up to an NPC for a story beat. MUST run inside scene.script() (save lock + frozen input).
 * opts.mover: 'player' (default: the player walks over) or 'npc' (the NPC comes to the player first).
 * Returns { how: 'adjacent'|'walk'|'npc'|'fade'|'none', steps } and logs { type:'automove', ... } (not an intro step).
 */
export async function approach(scene, n, opts = {}) {
  const s = scene, p = s.player, o = { ...AUTOMOVE, ...opts }, mover = o.mover || 'player';
  const log = (how, extra = {}) => s.log?.push({ tick: s.tick, type: 'automove', npc: n?.id, how, beat: o.beat || null, ...extra });
  if (!n || !s.map) { log('none'); return { how: 'none', steps: 0 }; }
  const saveLocked = () => !!s.saveLockReason?.();
  o.onStart?.({ locked: saveLocked(), busy: !!s.busy });
  n.talking = true; n.script = []; n.goal = null; // stop wandering for the beat
  n.faceToward(p.x, p.y);
  // 1) spark + short pause (the sight spark is drawn by src/overnight/sight.js; no sight system = pause only)
  const sight = s.overnight?.sight;
  if (o.spark !== false && sight) sight.spark = { id: n.id, t: o.sparkTicks };
  log('spark');
  await sleep(o.pauseMs);
  if (Math.abs(p.x - n.x) + Math.abs(p.y - n.y) === 1) return done('adjacent', 0);
  // 2) the player walks over (tile by tile, real steps), replanning when something steps into the way
  let steps = 0;
  if (mover === 'player') {
    for (let tries = 0; tries <= o.replans; tries++) {
      const r = planPlayerRoute(s.map, p, n, { facing: n.def?.facing || n.mover?.facing, maxSteps: o.maxSteps - steps });
      if (!r) break;
      let blocked = false;
      for (const dir of r.dirs) {
        await until(() => !p.moving, o.stepMs);
        const before = p.x + ',' + p.y;
        p.facing = dir; p._attempt(dir, s.worldApi(), []);
        o.onStep?.({ dir, locked: saveLocked(), busy: !!s.busy, x: p.x, y: p.y });
        await until(() => !p.moving && p.state !== 'bump', o.stepMs);
        if (p.x + ',' + p.y === before) { blocked = true; break; }
        steps++;
      }
      if (!blocked && Math.abs(p.x - n.x) + Math.abs(p.y - n.y) === 1) return done('walk', steps);
    }
  }
  // 3) the NPC walks to the player (its own A* rules: never onto warps / stand cells)
  for (const c of sideCells(p, p.facing)) {
    if (!(s.map.inBounds(c.x, c.y) && (s.map.code(c.x, c.y) === Col.WALK || s.map.code(c.x, c.y) === Col.PLATE))) continue;
    if (s.map.npcAt(c.x, c.y) && s.map.npcAt(c.x, c.y) !== n) continue;
    n.talking = false; // NpcSystem only follows a goal while not talking
    const dirs = s.npcs?.walkTo?.(n.id, c.x, c.y, { stay: false });
    if (!dirs) { n.talking = true; continue; }
    await until(() => !n.goal && !n.script.length && !n.mover.moving, o.npcMs);
    n.talking = true;
    if (Math.abs(p.x - n.x) + Math.abs(p.y - n.y) === 1) return done('npc', steps);
    break;
  }
  // 4) fallback: fade out, set the player down next to the NPC, fade in
  const spot = sideCells(n, n.mover?.facing || 'down').find((c) => playerFree(s.map, c.x, c.y)) || null;
  if (spot) {
    await fadeTo(s, 1, o.fadeMs);
    p.place(spot.x, spot.y, OPP[spot.side]);
    await fadeTo(s, 0, o.fadeMs);
    return done('fade', steps);
  }
  log('none', { steps });
  n.talking = false;
  return { how: 'none', steps };

  function done(how, k) {
    p.facing = faceTo(p, n) || p.facing;
    n.faceToward(p.x, p.y);
    n.talking = false; // the caller's beginTalk / endTalk owns it from here
    log(how, { steps: k, x: p.x, y: p.y });
    return { how, steps: k };
  }
}

/** Fallback fade without a map reload: a custom fade phase that _stepFade ignores; fadeAlpha() = 1 - t/len. */
async function fadeTo(s, target, ms) {
  const len = 100;
  if (target === 1) {
    s.fade = { phase: 'automove', t: len, len };
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { s.fade.t = Math.round(len * (1 - (Date.now() - t0) / ms)); await sleep(16); }
    s.fade.t = 0;
  } else {
    s.fade = { phase: 'in', t: 0, len: Math.max(1, Math.round(ms / 16.67)) }; // the scene's own fade-in clears it
    await until(() => !s.fade, ms + 600);
    if (s.fade?.phase === 'in') s.fade = null; // headless / paused loop: never leave the screen black
  }
}


// Kilumen: story escort, a single-file line (Gary, Oct 23 2026, 2:35-2:36 PM CT: "instead of teleporting to the lab do a
// forced scene where you follow your boss and room mate to it" / "its actual input not prerecorded" / "youre 3rd in line
// behind your boss and room mate just like when he stops you from leaving town early").
// This generalises intro.js ronCatch's walk-back (Ron walks ahead, the player follows with real p._attempt steps) to N
// leaders: leader 0 paths to the goal at runtime (pathing.js / easystar), every follower steps into the tile the one ahead
// just left, and the player is last. The player moves through the normal controller (p._attempt + p.tick: same speed,
// collision, door warps, camera, follower); his own input is ignored because this runs inside scene.script() (input frozen,
// saves refused, checkpoint save right before). NPCs step through NpcSystem scripts like any live NPC. Doors are real
// warps (map.warps), so every landing comes from the current (padded) map files; nothing here holds a coordinate.
import { Npc, OPPOSITE } from './npcs.js?v=v0.2.90-alpha';
import { DELTA, Col } from './constants.js?v=v0.2.90-alpha';
import { walkGrid, findPath } from './pathing.js?v=v0.2.90-alpha';

export const ESCORT = { stuckMs: 5000, legMs: 60000, doorMs: 8000, bossId: 'trip_boss' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(pred, ms) { const t0 = Date.now(); while (!pred() && Date.now() - t0 < ms) await sleep(16); return !!pred(); }
const same = (a, b) => a && b && a.x === b.x && a.y === b.y;
export function dirTo(a, b) {
  for (const [d, v] of Object.entries(DELTA)) if (a.x + v.x === b.x && a.y + v.y === b.y) return d;
  return null;
}

/**
 * Scripted walk: everyone not in the line (map NPCs, wanderers) stands still and gives up its cells, so the line walks
 * through them like ghosts and is never blocked (Gary 3:56 PM CT Oct 23 2026, live v0.2.4 soft-lock: the fisher wandered
 * into the 1-cell lane between RT Supply and the river, the boss waited behind him and the walk ended in the 5 s stuck
 * fallback). Returns restore(): bystanders take their cells back (where free) and wander again shortly after.
 */
export function ghostBystanders(s, line) {
  const m = s.map, occ = m?._npcAt, held = [];
  if (!m || !occ) return () => {};
  for (const n of s.npcs?.list || []) {
    if (line.includes(n)) continue;
    held.push({ n, paused: n.paused });
    n.script = []; n.goal = null; n.paused = 1e9;
  }
  const isHeld = (r) => held.some((h) => h.n === r);
  for (const [k, r] of [...occ]) if (isHeld(r)) occ.delete(k);
  let done = false;
  return () => {
    if (done) return; done = true;
    for (const h of held) {
      h.n.paused = Math.max(30, h.paused || 0);
      if (s.npcs?.list.includes(h.n) && !m.npcAt(h.n.x, h.n.y)) m.occupy(h.n.x, h.n.y, h.n);
    }
  };
}

/** Shortest route (cells, both ends included) over plain floor, never across a warp; `avoid` cells blocked. */
export function routeCells(map, from, to, avoid = []) {
  const grid = walkGrid(map, (x, y) => avoid.some((c) => c.x === x && c.y === y) || !!map.warpAt?.(x, y), [from, to]);
  return findPath(grid, from, to);
}

/** The door on `map` leading to `to` (closest to `near`) and the floor cell in front of it ({x,y,into}). */
export function doorTo(map, to, near) {
  const ws = (map.warps || []).filter((w) => w.to === to);
  ws.sort((a, b) => Math.abs(a.x - near.x) + Math.abs(a.y - near.y) - (Math.abs(b.x - near.x) + Math.abs(b.y - near.y)));
  for (const w of ws) {
    for (const d of ['down', 'up', 'left', 'right']) {
      const x = w.x + DELTA[d].x, y = w.y + DELTA[d].y;
      if (map.inBounds(x, y) && map.code(x, y) === Col.WALK && !map.warpAt?.(x, y)) return { warp: w, front: { x, y, into: OPPOSITE[d] } };
    }
  }
  return null;
}

/**
 * Single-file walk: leaders[0] heads for `goal`, then leaders[1], ..., then the player, each into the tile the one ahead left.
 * Leaders wait when the one behind falls back (a follower only moves into a free cell; the head only steps when the next in
 * line is no more than `gap` cells of trail behind). Returns { ok, why }.
 */
export async function conga(s, leaders, goal, o = {}) {
  const p = s.player, m = s.map, n = leaders.length + 1, gap = o.gap ?? 2;
  const pos = (i) => (i < leaders.length ? { x: leaders[i].x, y: leaders[i].y } : { x: p.x, y: p.y });
  const moving = (i) => (i < leaders.length ? leaders[i].mover.moving || leaders[i].script.length > 0 : p.moving || p.state !== 'idle');
  const others = (i) => [...Array(n).keys()].filter((j) => j !== i).map(pos);
  const head = routeCells(m, pos(0), goal, others(0)) || routeCells(m, pos(0), goal);
  if (!head) return { ok: false, why: 'noroute' };
  const q = [head.slice(1)];
  for (let i = 1; i < n; i++) {
    const ahead = pos(i - 1), r = routeCells(m, pos(i), ahead, others(i).filter((c) => !same(c, ahead))) || routeCells(m, pos(i), ahead);
    if (!r) return { ok: false, why: 'noform' };
    q.push(r.slice(1));
  }
  for (const l of leaders) { l.talking = false; l.goal = null; l.script = []; l.paused = 0; }
  const last = [...Array(n).keys()].map(pos);
  let t0 = Date.now(), prog = Date.now();
  // o.mid = { at: 0..1 of the head's route, run: async () => {} }: once, when everyone stands still past that point (a story
  // beat on the way; the walk waits for it)
  const headLen = q[0].length, mid = o.mid && typeof o.mid.run === 'function' ? { at: Math.max(1, Math.round(headLen * (o.mid.at ?? 0.5))), run: o.mid.run } : null;
  let midDone = !mid;
  s.log?.push({ tick: s.tick, type: 'escort', step: 'start', map: m.name, goal: { x: goal.x, y: goal.y }, line: last.map((c) => `${c.x},${c.y}`) });
  while (true) {
    if (s.map !== m) return { ok: false, why: 'mapChanged' };
    for (let i = 0; i < n; i++) {
      const c = pos(i);
      if (!moving(i) && !same(c, last[i])) { last[i] = c; prog = Date.now(); if (i + 1 < n) q[i + 1].push(c); }
    }
    // done: head on the goal, everyone still, each follower right behind (its trail holds at most the cell the one ahead stands on)
    if (same(pos(0), goal) && q.every((x, i) => x.every((e) => i > 0 && same(e, pos(i - 1)))) && [...Array(n).keys()].every((i) => !moving(i))) break;
    if (!midDone && headLen - q[0].length >= mid.at && [...Array(n).keys()].every((i) => !moving(i))) {
      midDone = true;
      s.log?.push({ tick: s.tick, type: 'escort', step: 'mid', map: m.name });
      const tb = Date.now();
      try { await mid.run(); } catch (e) { console.error('escort beat:', e); }
      prog = Date.now(); t0 += prog - tb; // talk time is not walk time
      if (s.map !== m) return { ok: false, why: 'mapChanged' };
    }
    for (let i = 0; i < n; i++) {
      const qq = q[i], c = pos(i);
      let k = -1; qq.forEach((e, j) => { if (same(e, c)) k = j; });
      if (k >= 0) qq.splice(0, k + 1); // trail loops back past this member: skip the loop
      if (!qq.length || moving(i)) continue;
      if (i + 1 < n && q[i + 1].length > gap) continue; // the one behind fell back: wait for them
      const nx = qq[0], dir = dirTo(c, nx);
      if (!dir) { const r = routeCells(m, c, nx); if (r && r.length > 1) qq.unshift(...r.slice(1, -1)); else qq.shift(); continue; }
      if (m.npcAt(nx.x, nx.y) || (i < leaders.length && same(nx, pos(n - 1)))) continue; // still occupied: next tick
      if (i < leaders.length) { leaders[i].mover.facing = dir; leaders[i].script = [dir]; } else { p.facing = dir; p._attempt(dir, s.worldApi(), []); }
    }
    if (Date.now() - prog > (o.stuckMs ?? ESCORT.stuckMs) || Date.now() - t0 > (o.legMs ?? ESCORT.legMs)) {
      s.log?.push({ tick: s.tick, type: 'escort', step: 'stuck', map: m.name, line: [...Array(n).keys()].map((i) => `${pos(i).x},${pos(i).y}`) });
      return { ok: false, why: 'stuck' };
    }
    await sleep(16);
  }
  s.log?.push({ tick: s.tick, type: 'escort', step: 'arrived', map: m.name, line: [...Array(n).keys()].map((i) => `${pos(i).x},${pos(i).y}`) });
  return { ok: true };
}

/** Everyone in line goes through the door at `door.front`: each leader steps up, faces in and goes in (removed), then the
 *  player takes the door with a real step (a normal warp, landing from the map data). Resolves once the new map is in. */
export async function throughDoor(s, leaders, door, remove) {
  const p = s.player, m = s.map, f = door.front;
  const fail = (why, me) => { s.log?.push({ tick: s.tick, type: 'escort', step: 'doorFail', why, map: m.name, who: me?.id || 'player', x: me?.x, y: me?.y }); return false; };
  for (let i = 0; i <= leaders.length; i++) {
    const me = i < leaders.length ? leaders[i] : p;
    // walk up to the door front along the trail just vacated (runtime route; a step at a time, real movement)
    for (let guard = 0; !same(me, f) && guard < 12; guard++) {
      const r = routeCells(m, me, f), nx = r && r[1], dir = nx && dirTo(me, nx);
      if (!dir) return fail('noRoute', me);
      await until(() => !s.map.npcAt(nx.x, nx.y), 3000);
      if (me === p) { await until(() => !p.moving && p.state === 'idle', 1500); p.facing = dir; p._attempt(dir, s.worldApi(), []); await until(() => !p.moving && p.state === 'idle', 2000); }
      else { me.talking = false; me.script = [dir]; await until(() => same(me, nx) && !me.mover.moving, 3000); }
      if (!same(me, nx)) return fail('blocked', me);
    }
    if (!same(me, f)) return fail('far', me);
    if (me === p) {
      p.facing = f.into; p._attempt(f.into, s.worldApi(), []); // onto the door cell: Overworld's own door warp
      const ok = await until(() => s.map !== m && !s.fade, ESCORT.doorMs);
      s.log?.push({ tick: s.tick, type: 'escort', step: 'door', from: m.name, to: s.map?.name, ok });
      return ok;
    }
    me.mover.facing = f.into;
    await sleep(140);
    remove(me);
  }
  return false;
}

/** Leaders already through the door, standing along the way ahead of the player (route-ordered, nearest = last in line). */
export function spawnAhead(s, specs, target, { aside = false } = {}) {
  const m = s.map, p = s.player, out = [];
  const route = (target && routeCells(m, p, target)) || [];
  const taken = [{ x: p.x, y: p.y }];
  const free = (c) => c && m.inBounds(c.x, c.y) && m.code(c.x, c.y) === Col.WALK && !m.npcAt(c.x, c.y) && !m.warpAt?.(c.x, c.y) && !taken.some((t) => same(t, c));
  const cand = [];
  for (const c of route.slice(1)) {
    if (aside) for (const d of ['left', 'right', 'up', 'down']) cand.push({ x: c.x + DELTA[d].x, y: c.y + DELTA[d].y });
    else cand.push(c);
  }
  for (let r = 1; r <= 4; r++) for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) if (Math.abs(dx) + Math.abs(dy) === r) cand.push({ x: p.x + dx, y: p.y + dy });
  // nearest spec (last in line before the player) takes the first free cell
  for (const sp of [...specs].reverse()) {
    const c = cand.find((x) => free(x) && !(aside && route.some((r) => same(r, x))));
    if (!c) continue;
    taken.push(c);
    const n = new Npc({ id: sp.id, kind: 'object', x: c.x, y: c.y, facing: p.facing, story: true }, m.name, sp.sprite || null, false);
    n.behaviour = 'static';
    s.npcs.list.push(n); m.occupy?.(n.x, n.y, n);
    sp.load?.(n);
    out.unshift(n);
    s.log?.push({ tick: s.tick, type: 'escort', step: 'spawn', id: sp.id, map: m.name, x: c.x, y: c.y });
  }
  return out;
}

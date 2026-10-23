// Kilumen: overworld NPC actors (villagers wander, trainers look around, everyone else stands still).
// Sprites come from art/characters/pixel/npcs/npc_sprite_map.json (key "<map>.<npc id>", 64x96 sheets with the
// same layout as Cal's: rows down/left/right/up, cols stand + walk0-3). NPCs move on the same 60 Hz GridMover as
// the player, so they share pixel-exact stepping. Occupancy: an NPC holds its cell AND the cell it is stepping
// into (GameMap.occupy), so the player can never walk into one mid-step.
import { DELTA, DIRS, Col } from './constants.js?v=v0.2.7-alpha';
import { GridMover } from './movement.js?v=v0.2.7-alpha';
import { npcForPhase, isActive } from './props.js?v=v0.2.7-alpha';
import { walkGrid, findPath, pathToDirs } from './pathing.js?v=v0.2.7-alpha';

const WANDER = new Set(['villager', 'villager_hooded', 'villager_elder', 'kid']);
const LOOK = new Set(['trainer', 'trainer_hooded']);
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };
const REPLAN_TICKS = 45; // walkTo: blocked this long (0.75 s) -> plan a new route around the obstacle

/** Deterministic per-NPC random stream (mulberry32) so shots and tests are reproducible. */
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hash = (s) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);

export class Npc {
  constructor(def, mapName, sprite, gateNpc) {
    this.def = def; this.id = def.id; this.kind = def.kind || 'villager'; this.mapName = mapName;
    this.sprite = sprite || null; // npc_sprite_map entry or null (objects, unmapped)
    this.mover = new GridMover({ x: def.x, y: def.y, facing: def.facing || 'down' });
    this.home = { x: def.x, y: def.y, facing: def.facing || 'down' };
    this.behaviour = gateNpc || this.kind === 'object' ? 'static' : WANDER.has(this.kind) ? 'wander' : LOOK.has(this.kind) ? 'look' : 'static';
    this.rand = rng(hash(mapName + '.' + this.id));
    this.wait = 60 + Math.floor(this.rand() * 120);
    this.hold = null;     // direction held for the current step
    this.script = [];     // scripted directions (npcWalk)
    this.goal = null;     // walkTo target {x, y, stay} (pathing.js); replanned when blocked
    this.paused = 0;      // ticks to stand still (after a talk)
    this.talking = false;
  }

  get x() { return this.mover.x; }
  get y() { return this.mover.y; }

  faceToward(px, py) {
    const dx = px - this.x, dy = py - this.y;
    this.mover.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  }
}

export class NpcSystem {
  /**
   * @param {object} scene  Overworld (map, player, spot stand cells)
   */
  constructor(scene) { this.scene = scene; this.list = []; }

  /** Build NPC actors for a map (call after the map instance exists; map.npcs already holds merged pending NPCs). */
  build(map, spriteMap, phase) {
    const gateIds = new Set(map.storyGates.filter((g) => g.npc).map((g) => g.npc.id));
    this.list = map.npcs.map((d) => npcForPhase(d, phase)).filter((d) => Number.isInteger(d.x) && d.kind !== 'spawn' && isActive(d, this.scene?.flags)) // by_phase / active_when: props.js
      .map((d) => new Npc(d, map.name, spriteMap?.[map.name + '.' + d.id], gateIds.has(d.id)));
    map.resetOccupancy(this.list.map((n) => ({ x: n.x, y: n.y, ref: n })));
    return this.list;
  }

  byId(id) { return this.list.find((n) => n.id === id) || null; }

  /** Cells NPCs must never wander onto: doors/plates, every interact stand cell, the player and its target. */
  _forbidden(x, y) {
    const s = this.scene, p = s.player, m = s.map;
    if ((p.x === x && p.y === y) || (p.tx === x && p.ty === y)) return true;
    if (s.follower && s.follower.x === x && s.follower.y === y) return true;
    if (m.warpAt(x, y)) return true;
    return (s.standCells || new Set()).has(x + ',' + y);
  }

  _canStep(n, dir, scripted) {
    const d = DELTA[dir], nx = n.x + d.x, ny = n.y + d.y, m = this.scene.map;
    if (!m.inBounds(nx, ny) || m.npcAt(nx, ny) || this._forbidden(nx, ny)) return false;
    if (scripted) return m.code(nx, ny) === Col.WALK || m.code(nx, ny) === Col.PLATE;
    if (m.code(nx, ny) !== Col.WALK) return false;
    return Math.abs(nx - n.home.x) <= 1 && Math.abs(ny - n.home.y) <= 1;
  }

  _world(n) {
    const m = this.scene.map;
    return {
      query: (x, y, dir) => {
        const d = DELTA[dir];
        return this._canStep(n, dir, true) ? { type: 'walk', x: x + d.x, y: y + d.y } : { type: 'block', code: m.code(x + d.x, y + d.y) };
      },
      onStepStart: (x, y) => { m.occupy(x, y, n); this.scene.onNpcStep?.(n, x, y); },
      onArrive: () => { n.hold = null; return 'stop'; }, // one step per decision
    };
  }

  tick(frozen) {
    const m = this.scene.map;
    for (const n of this.list) {
      const mv = n.mover, wasX = mv.x, wasY = mv.y;
      if (!mv.moving && mv.state === 'idle') {
        if (n.script.length && !frozen) {
          const dir = n.script[0];
          if (this._canStep(n, dir, true)) { n.script.shift(); n.hold = dir; mv.facing = dir; n.blockedTicks = 0; }
          else {
            n.blockedTicks = (n.blockedTicks || 0) + 1;
            if (n.goal && n.blockedTicks % REPLAN_TICKS === 0 && n.blockedTicks <= 240) this._plan(n, true); // route around
            if (n.blockedTicks > 240) { n.script = []; n.blockedTicks = 0; n.goal = null; }
          }
        } else if (n.goal && !frozen && !n.talking && !n.paused) {
          if (n.x === n.goal.x && n.y === n.goal.y) { if (n.goal.stay) n.home = { x: n.x, y: n.y, facing: mv.facing }; n.goal = null; n.wait = 90; }
          else if (!this._plan(n, true)) n.goal = null; // pushed off the route with no way back: give up
        } else if (n.paused > 0 || n.talking || frozen) {
          n.paused = Math.max(0, n.paused - 1);
        } else if (--n.wait <= 0) {
          n.wait = 90 + Math.floor(n.rand() * 150);
          if (n.behaviour === 'look') mv.facing = DIRS[Math.floor(n.rand() * 4)];
          else if (n.behaviour === 'wander') {
            const dir = DIRS[Math.floor(n.rand() * 4)];
            if (this._canStep(n, dir, false)) { n.hold = dir; mv.facing = dir; } else mv.facing = dir;
          }
        }
      }
      mv.tick({ dir: n.hold }, this._world(n));
      if (!mv.moving && (mv.x !== wasX || mv.y !== wasY)) { m.vacate(wasX, wasY, n); n.hold = null; }
    }
  }

  /** Talk start: face the player and stop wandering until the dialogue ends. */
  beginTalk(n) { n.talking = true; n.faceToward(this.scene.player.x, this.scene.player.y); }
  endTalk(n) { n.talking = false; n.paused = 90; }

  /** Scripted walk for cutscenes / shots: ['left','left','up'] (stops early if blocked for 4 s). */
  walk(id, dirs) { const n = this.byId(id); if (n) n.script.push(...dirs); return !!n; }

  /**
   * Walk an NPC to a cell along the shortest path over existing collision (easystar A*, pathing.js). Uses the same
   * rules as a scripted step: WALK/PLATE only, never onto warps, interact stand cells, the player or the follower.
   * Other NPCs count as walls when planning; if one steps into the way later, the NPC waits, then replans every
   * REPLAN_TICKS, and gives up after 4 s blocked (same as walk()). On arrival a wanderer adopts the goal as its new
   * home (stay: true, default) so it keeps wandering there. Returns the planned directions, or null if unreachable.
   */
  walkTo(id, x, y, { stay = true } = {}) {
    const n = this.byId(id);
    if (!n || !this.scene.map?.inBounds(x, y)) return null;
    n.goal = { x, y, stay };
    const dirs = this._plan(n, true);
    if (!dirs) n.goal = null;
    return dirs;
  }

  /** (Re)plan n.script toward n.goal. avoidActors: treat other NPCs, player and follower as walls. */
  _plan(n, avoidActors) {
    const m = this.scene.map, g = n.goal;
    const blocked = (x, y) => (avoidActors && ((m.npcAt(x, y) && m.npcAt(x, y) !== n) || this._forbidden(x, y)))
      || m.warpAt(x, y) || (this.scene.standCells || new Set()).has(x + ',' + y);
    const path = findPath(walkGrid(m, blocked, [{ x: n.x, y: n.y }]), { x: n.x, y: n.y }, g);
    if (!path) return null;
    n.script = pathToDirs(path); n.blockedTicks = 0;
    return [...n.script];
  }
}

export { OPPOSITE };

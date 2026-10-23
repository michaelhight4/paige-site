// Kilumen overworld: grid mover (pure, no DOM). Tile-to-tile stepping driven by fixed 60 Hz ticks.
// Feel targets (mechanics only): tap = turn in place, hold = walk, walking into a wall = bump in place,
// south into a ledge = hop over it, direction changes while walking happen without the turn pause.
import {
  TILE, DELTA, MoveMode, BASE_TICKS_PER_TILE, TURN_TICKS, BUMP_TICKS, HOP_TICKS, HOP_HEIGHT,
} from './constants.js';

/**
 * @typedef {{dir: ('up'|'down'|'left'|'right'|null)}} MoveInput   the direction currently held (latest press wins)
 * @typedef {object} MoveWorld
 * @property {(x:number,y:number,dir:string)=>object} query        GameMap.query
 * @property {(x:number,y:number,mover:GridMover,how:'step'|'hop')=>('stop'|void)} [onArrive]  return 'stop' to hand control to the scene (warp)
 * @property {(exit:object|null,x:number,y:number,dir:string,mover:GridMover)=>('stop'|void)} [onEdge]  return 'stop' if the scene takes the exit; otherwise it is a bump
 * @property {(x:number,y:number,dir:string,mover:GridMover)=>void} [onBump]
 * @property {(x:number,y:number,mover:GridMover)=>void} [onStepStart]  fires with the TARGET tile (grass rustle etc.)
 */

export class GridMover {
  constructor({ x = 0, y = 0, facing = 'down' } = {}) {
    this.place(x, y, facing);
    /** Movement mode hook for running shoes / bike. Only WALK is used until MOVEMENT.md lands. */
    this.mode = MoveMode.WALK;
    /** Speed hook: >1 is faster. Ticks per tile = round(base / multiplier); keep it dividing 64 for whole-px steps. */
    this.speedMultiplier = 1;
    /** When true the mover finishes any step in progress but takes no new input (fades, dialogue, cutscenes). */
    this.locked = false;
    this.parity = 0;
  }

  place(x, y, facing = this.facing) {
    this.x = x; this.y = y; this.facing = facing;
    this.state = 'idle'; this.t = 0; this.dur = 0; this.tx = x; this.ty = y;
  }

  ticksPerTile() {
    const base = BASE_TICKS_PER_TILE[this.mode] ?? BASE_TICKS_PER_TILE.walk;
    return Math.max(1, Math.round(base / (this.speedMultiplier || 1)));
  }

  get moving() { return this.state === 'step' || this.state === 'hop'; }

  /** Advance one 60 Hz tick. Returns the list of events that happened (for tests, audio and debug). */
  tick(input, world) {
    const ev = [];
    const dir = this.locked ? null : input?.dir || null;
    switch (this.state) {
      case 'step':
      case 'hop': {
        this.t++;
        if (this.t < this.dur) return ev;
        const how = this.state;
        this.x = this.tx; this.y = this.ty; this.state = 'idle'; this.t = 0; this.parity ^= 1;
        ev.push({ type: how === 'hop' ? 'land' : 'stepEnd', x: this.x, y: this.y });
        if (world.onArrive?.(this.x, this.y, this, how) === 'stop') { ev.push({ type: 'stopped' }); return ev; }
        this._decide(dir, true, world, ev); // keep walking without the turn pause
        return ev;
      }
      case 'turn': {
        this.t++;
        if (!dir) { this.state = 'idle'; this.t = 0; return ev; }      // tap: turned in place only
        if (dir !== this.facing) { this.facing = dir; this.t = 0; ev.push({ type: 'turn', dir }); return ev; }
        if (this.t >= TURN_TICKS) { this.state = 'idle'; this.t = 0; this._attempt(dir, world, ev); }
        return ev;
      }
      case 'bump': {
        this.t++;
        if (this.t < this.dur) return ev;
        this.state = 'idle'; this.t = 0; this.parity ^= 1;
        this._decide(dir, true, world, ev);
        return ev;
      }
      default:
        this._decide(dir, false, world, ev);
        return ev;
    }
  }

  _decide(dir, continuing, world, ev) {
    if (!dir) return;
    if (dir !== this.facing && !continuing) {
      this.facing = dir; this.state = 'turn'; this.t = 0;
      ev.push({ type: 'turn', dir });
      return;
    }
    this.facing = dir;
    this._attempt(dir, world, ev);
  }

  _attempt(dir, world, ev) {
    const q = world.query(this.x, this.y, dir);
    if (q.type === 'walk') {
      this.state = 'step'; this.t = 0; this.dur = this.ticksPerTile(); this.tx = q.x; this.ty = q.y;
      ev.push({ type: 'stepStart', x: q.x, y: q.y, dir });
      world.onStepStart?.(q.x, q.y, this);
      return;
    }
    if (q.type === 'ledge') {
      this.state = 'hop'; this.t = 0; this.tx = q.x; this.ty = q.y;
      this.dur = Math.max(2, Math.round((HOP_TICKS * this.ticksPerTile()) / BASE_TICKS_PER_TILE.walk));
      ev.push({ type: 'hop', x: q.x, y: q.y, dir });
      world.onStepStart?.(q.x, q.y, this);
      return;
    }
    if (q.type === 'edge' && world.onEdge?.(q.exit, this.x, this.y, dir, this) === 'stop') {
      ev.push({ type: 'exit', exit: q.exit, dir });
      return;
    }
    this.state = 'bump'; this.t = 0; this.dur = BUMP_TICKS;
    ev.push({ type: 'bump', dir, code: q.code });
    world.onBump?.(this.x, this.y, dir, this);
  }

  /** Native-pixel position of the tile the actor occupies visually (integer). lift = hop arc height. */
  pixel() {
    let px = this.x * TILE, py = this.y * TILE, lift = 0;
    if (this.moving && this.dur > 0) {
      const f = this.t / this.dur;
      const d = { x: this.tx - this.x, y: this.ty - this.y };
      px += Math.round(d.x * TILE * f);
      py += Math.round(d.y * TILE * f);
      if (this.state === 'hop') lift = Math.round(Math.sin(Math.PI * f) * HOP_HEIGHT);
    }
    return { px, py, lift };
  }

  /** Sheet column: 0 = stand, 1..4 = walk0..walk3. Two walk frames per step, alternating feet each step. */
  frameCol() {
    if (this.state === 'idle') return 0;
    if (this.state === 'turn') return 1 + this.parity * 2;
    const half = this.dur > 0 && this.t >= this.dur / 2 ? 1 : 0;
    return 1 + this.parity * 2 + half;
  }
}

export { DELTA };

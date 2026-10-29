// Kilumen overworld: grid mover (pure, no DOM). Tile-to-tile stepping driven by fixed 60 Hz ticks.
// Feel targets (mechanics only): tap = turn in place, hold = walk, walking into a wall = bump in place,
// south into a ledge = hop over it, direction changes while walking happen without the turn pause.
import {
  TILE, DELTA, MoveMode, BASE_TICKS_PER_TILE, TURN_TICKS, BUMP_TICKS, HOP_TICKS, HOP_HEIGHT, RAMP_HEIGHT, ANIM,
} from './constants.js?v=v0.2.65-alpha';

/**
 * @typedef {{dir: ('up'|'down'|'left'|'right'|null)}} MoveInput   the direction currently held (latest press wins)
 * @typedef {object} MoveWorld
 * @property {(x:number,y:number,dir:string,mode:string)=>object} query  GameMap.query (mode = MoveMode)
 * @property {(x:number,y:number,mover:GridMover,how:'step'|'hop')=>('stop'|void)} [onArrive]  return 'stop' to hand control to the scene (warp)
 * @property {(exit:object|null,x:number,y:number,dir:string,mover:GridMover)=>('stop'|void)} [onEdge]  return 'stop' if the scene takes the exit; otherwise it is a bump
 * @property {(x:number,y:number,dir:string,mover:GridMover)=>void} [onBump]
 * @property {(x:number,y:number,mover:GridMover)=>void} [onStepStart]  fires with the TARGET tile (grass rustle etc.)
 */

export class GridMover {
  constructor({ x = 0, y = 0, facing = 'down' } = {}) {
    this.place(x, y, facing);
    /** Movement mode (MOVEMENT.md): the scene sets it each tick; a step in progress keeps its stepMode. */
    this.mode = MoveMode.WALK;
    this.stepMode = MoveMode.WALK;
    /** Speed hook: >1 is faster. Ticks per tile = base / multiplier; fractional values alternate step lengths. */
    this.speedMultiplier = 1;
    this.phase = 0;      // step-length accumulator for fractional ticks per tile (run = 7.5)
    this.dist = 0;       // native px travelled since the player last stood still (frame advance)
    this.distBase = 0;
    this.hopKind = null; // 'ledge' | 'ramp' while hopping
    /** When true the mover finishes any step in progress but takes no new input (fades, dialogue, cutscenes). */
    this.locked = false;
    this.parity = 0;
  }

  place(x, y, facing = this.facing) {
    this.x = x; this.y = y; this.facing = facing;
    this.state = 'idle'; this.t = 0; this.dur = 0; this.tx = x; this.ty = y;
    this.dist = 0; this.distBase = 0; this.hopKind = null;
  }

  /** Ticks per tile for the current mode and multiplier (may be fractional, e.g. run = 7.5). */
  ticksPerTile() {
    const base = BASE_TICKS_PER_TILE[this.mode] ?? BASE_TICKS_PER_TILE.walk;
    return Math.max(1, base / (this.speedMultiplier || 1));
  }

  /** Whole-tick length of the next `tiles`-tile move; fractional rates alternate (8,7,8,7 = 7.5 avg). */
  _nextDur(tiles = 1) {
    const span = this.ticksPerTile() * tiles;
    const d = Math.max(1, Math.round(this.phase + span) - Math.round(this.phase));
    this.phase = (this.phase + span) % 1e6;
    return d;
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
        this.dist = this.distBase + this._moved();
        if (this.t < this.dur) return ev;
        const how = this.state;
        this.distBase += (Math.abs(this.tx - this.x) + Math.abs(this.ty - this.y)) * TILE; this.dist = this.distBase;
        this.x = this.tx; this.y = this.ty; this.state = 'idle'; this.t = 0; this.parity ^= 1; this.hopKind = null;
        ev.push({ type: how === 'hop' ? 'land' : 'stepEnd', x: this.x, y: this.y });
        if (world.onArrive?.(this.x, this.y, this, how) === 'stop') { this._stopAnim(); ev.push({ type: 'stopped' }); return ev; }
        this._decide(dir, true, world, ev); // keep walking without the turn pause
        if (!this.moving) this._stopAnim();
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

  _stopAnim() { this.dist = 0; this.distBase = 0; }

  /** Native px moved so far in the current step/hop (whole px, matches pixel()). */
  _moved() {
    if (!this.moving || !this.dur) return 0;
    const tiles = Math.abs(this.tx - this.x) + Math.abs(this.ty - this.y);
    return Math.round(tiles * TILE * Math.min(1, this.t / this.dur));
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
    const q = world.query(this.x, this.y, dir, this.mode);
    this.stepMode = this.mode;
    if (q.type === 'walk') {
      this.state = 'step'; this.t = 0; this.dur = this._nextDur(1); this.tx = q.x; this.ty = q.y;
      ev.push({ type: 'stepStart', x: q.x, y: q.y, dir });
      world.onStepStart?.(q.x, q.y, this);
      return;
    }
    if (q.type === 'ledge' || q.type === 'ramp') {
      this.state = 'hop'; this.hopKind = q.type; this.t = 0; this.tx = q.x; this.ty = q.y;
      this.dur = q.type === 'ramp'
        ? this._nextDur(2) // MOVEMENT.md 5.6: 2 tiles in about 2 x 83 ms on the bike
        : Math.max(2, Math.round((HOP_TICKS * this.ticksPerTile()) / BASE_TICKS_PER_TILE.walk));
      ev.push({ type: 'hop', kind: q.type, x: q.x, y: q.y, dir });
      world.onStepStart?.(q.x, q.y, this);
      return;
    }
    if (q.type === 'edge' && world.onEdge?.(q.exit, this.x, this.y, dir, this) === 'stop') {
      ev.push({ type: 'exit', exit: q.exit, dir });
      return;
    }
    this.state = 'bump'; this.t = 0; this.dur = BUMP_TICKS;
    ev.push({ type: 'bump', dir, code: q.code, gate: q.gate?.id });
    world.onBump?.(this.x, this.y, dir, this, q);
  }

  /** Native-pixel position of the tile the actor occupies visually (integer). lift = hop arc height. */
  pixel() {
    let px = this.x * TILE, py = this.y * TILE, lift = 0;
    if (this.moving && this.dur > 0) {
      const f = this.t / this.dur;
      const d = { x: this.tx - this.x, y: this.ty - this.y };
      px += Math.round(d.x * TILE * f);
      py += Math.round(d.y * TILE * f);
      if (this.state === 'hop') lift = Math.round(Math.sin(Math.PI * f) * (this.hopKind === 'ramp' ? RAMP_HEIGHT : HOP_HEIGHT));
    }
    return { px, py, lift };
  }

  /**
   * Which sheet and column to draw (MOVEMENT.md 1/3). Frames advance by distance, not time:
   * frame = floor(dist / px_per_frame) % frames, with dist reset only when the player stops.
   *  walk sheet: col 0 = stand, 1..4 = walk0..3      run sheet: cols 0..5 = run0..5 (idle uses walk stand)
   *  bike sheet: col 0 = bike_stand, 1..4 = bike0..3 (ramp hop holds bike1)
   */
  frame() {
    const mode = this.moving ? this.stepMode : this.mode;
    if (mode === MoveMode.BIKE) {
      if (!this.moving) return { anim: 'bike', col: 0 };
      if (this.hopKind === 'ramp') return { anim: 'bike', col: 2 };
      return { anim: 'bike', col: 1 + (Math.floor(this.dist / ANIM.bike.pxPerFrame) % ANIM.bike.frames) };
    }
    if (mode === MoveMode.RUN && this.moving) return { anim: 'run', col: Math.floor(this.dist / ANIM.run.pxPerFrame) % ANIM.run.frames };
    if (this.state === 'idle') return { anim: 'walk', col: 0 };
    if (this.state === 'turn' || this.state === 'bump') return { anim: 'walk', col: 1 + this.parity * 2 };
    return { anim: 'walk', col: 1 + (Math.floor(this.dist / ANIM.walk.pxPerFrame) % ANIM.walk.frames) };
  }

  frameCol() { return this.frame().col; }
}

export { DELTA };

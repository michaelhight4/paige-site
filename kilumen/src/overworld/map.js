// Kilumen overworld: map model (pure, no DOM). Loads the World Design map JSON format
// (art/world/overworld/OVERWORLD_README.md sections 6-7) and answers collision / warp / exit queries.
import { Col, WALKABLE, DELTA, EDGE_FOR_DIR } from './constants.js?v=v0.2.63-alpha';
import { DEV } from '../dev/runtime.js?v=v0.2.63-alpha';

export const LAYER_ORDER = ['ground', 'decoration', 'overlay']; // overlay is y-sorted with characters (see renderer)
const GRID_LAYERS = ['ground', 'decoration', 'overlay', 'collision', 'encounter', 'fog']; // fog: mirefen_bog, drawn last

/** True when an exit or warp target is not built yet (README: "TO COME" links). */
export function isToCome(link) {
  return /^\s*TO COME/i.test(link?.note || '');
}

export class GameMap {
  /** @param {object} json parsed maps/<name>.json */
  constructor(json) {
    for (const k of ['name', 'width', 'height', 'layers']) if (json[k] == null) throw new Error(`map missing "${k}"`);
    this.json = json;
    this.name = json.name;
    this.title = json.title || json.name;
    this.width = json.width;
    this.height = json.height;
    this.tileSize = json.tile_size || 64;
    this.tilesetRef = json.tileset || '../tileset.json';
    this.layers = {};
    for (const k of GRID_LAYERS) {
      const g = json.layers[k];
      if (!g) { this.layers[k] = null; continue; }
      if (g.length !== this.height || g.some((row) => row.length !== this.width))
        throw new Error(`${this.name}: layer "${k}" is not ${this.width}x${this.height}`);
      this.layers[k] = g;
    }
    if (!this.layers.collision) throw new Error(`${this.name}: no collision layer`);
    this.warps = json.warps || [];
    this.exits = json.exits || [];
    this.npcs = json.npcs || [];
    this.signs = json.signs || [];
    this.items = json.items || [];
    this.puzzle = json.puzzle || null;
    this._warpAt = new Map(this.warps.map((w) => [w.x + ',' + w.y, w]));
    // MOVEMENT.md 2/5: per-map movement block (read it, never infer from the map name).
    this.movement = { run: json.movement?.run !== false, bike: json.movement?.bike === true };
    this.bike = json.bike || null;
    this._noDismount = new Set((json.bike?.no_dismount_cells || []).map(([x, y]) => x + ',' + y));
    this.storyGates = json.story_gates || [];
    this._gateAt = new Map();
    for (const g of this.storyGates) for (const c of g.cells || []) this._gateAt.set(c.x + ',' + c.y, g);
    this._lockedAt = new Map(); for (const w of json.locked_warps || []) this._lockedAt.set(w.x + ',' + w.y, w); // locked staff doors (dev master key only)
    this._appliedGates = new Set();
    this._npcAt = new Map(this.npcs.filter((n) => Number.isInteger(n.x)).map((n) => [n.x + ',' + n.y, n]));
    this._rampDir = new Map();
  }

  /**
   * Hook the tileset in (pure: pass indexTileset().byId). Reads ramp directions from tile names
   * (MOVEMENT.md 5.1: ramp_e = +x, ramp_s = +y) and the name -> tile lookup used by story gates.
   */
  attachTileset(byId) {
    this._byId = byId;
    this._byName = new Map([...byId.values()].map((t) => [t.name, t]));
    this._rampDir.clear();
    for (let y = 0; y < this.height; y++) for (let x = 0; x < this.width; x++) {
      if (this.code(x, y) !== Col.RAMP) continue;
      for (const layer of ['decoration', 'ground', 'overlay']) {
        const m = /^ramp_([nsew])$/.exec(byId.get(this.tile(layer, x, y))?.name || '');
        if (m) { this._rampDir.set(x + ',' + y, { e: 'right', w: 'left', s: 'down', n: 'up' }[m[1]]); break; }
      }
    }
    return this;
  }

  rampDir(x, y) { return this._rampDir.get(x + ',' + y) || null; }
  noDismount(x, y) { return this._noDismount.has(x + ',' + y); }
  npcAt(x, y) { return this._npcAt.get(x + ',' + y) || null; }

  /** Replace the NPC occupancy with live actors [{x, y, ref}] (NpcSystem). */
  resetOccupancy(list) { this._npcAt = new Map(list.map((o) => [o.x + ',' + o.y, o.ref])); }
  /** An actor claims a cell (its step target) / releases one (the cell it left). */
  occupy(x, y, ref) { this._npcAt.set(x + ',' + y, ref); }
  vacate(x, y, ref) { if (this._npcAt.get(x + ',' + y) === ref) this._npcAt.delete(x + ',' + y); }

  /** Swap one decoration-style cell to a tile (by name or id), taking its collision; used by stateful props. */
  setTile(layer, x, y, tile) {
    if (!this.inBounds(x, y) || !this.layers[layer]) return false;
    const t = typeof tile === 'number' ? this._byId?.get(tile) : this._byName?.get(tile);
    if (tile && !t) throw new Error(`${this.name}: tile "${tile}" not in tileset`);
    this.layers[layer][y][x] = t ? t.id : 0;
    return true;
  }
  tileByName(name) { return this._byName?.get(name) || null; }
  gateAt(x, y) { return this._gateAt.get(x + ',' + y) || null; }
  gateCleared(gate) { return this._appliedGates.has(gate.id); }

  /**
   * CRITICAL_PATH.md 3: the map ships in the BLOCKED state. For every gate whose flag is set, swap each
   * cell's decoration to cleared_tile (null = remove) and take that tile's collision (or 0). Idempotent;
   * flags only ever get set, so a cleared gate never re-blocks. Returns the ids applied this call.
   */
  applyGates(flags) {
    const done = [];
    for (const g of this.storyGates) {
      if (this._appliedGates.has(g.id) || !flags?.has(g.flag)) continue;
      for (const c of g.cells || []) {
        if (!this.inBounds(c.x, c.y)) continue;
        const t = c.cleared_tile ? this._byName?.get(c.cleared_tile) : null;
        if (c.cleared_tile && !t) throw new Error(`${this.name}: gate ${g.id} cleared_tile "${c.cleared_tile}" not in tileset`);
        if (this.layers.decoration) this.layers.decoration[c.y][c.x] = t ? t.id : 0;
        this.layers.collision[c.y][c.x] = t ? (t.collision_code ?? 0) : 0;
      }
      this._appliedGates.add(g.id); done.push(g.id);
    }
    return done;
  }

  inBounds(x, y) { return x >= 0 && y >= 0 && x < this.width && y < this.height; }
  code(x, y) { return this.inBounds(x, y) ? this.layers.collision[y][x] : Col.BLOCK; }
  tile(layer, x, y) { const g = this.layers[layer]; return g && this.inBounds(x, y) ? g[y][x] : 0; }
  encounter(x, y) { return this.tile('encounter', x, y); }
  warpAt(x, y) { return this._warpAt.get(x + ',' + y) || null; }
  isWalkable(x, y) { return this.inBounds(x, y) && WALKABLE.has(this.code(x, y)); }

  /** Map-edge exit used when stepping off the map from (x,y) in `dir`, or null. */
  exitFor(x, y, dir) {
    const edge = EDGE_FOR_DIR[dir];
    const onEdge = (edge === 'north' && y === 0) || (edge === 'south' && y === this.height - 1)
      || (edge === 'west' && x === 0) || (edge === 'east' && x === this.width - 1);
    if (!onEdge) return null;
    const along = edge === 'north' || edge === 'south' ? x : y;
    return this.exits.find((e) => e.edge === edge && along >= e.start && along <= e.end) || null;
  }

  /**
   * What happens when an actor on (x,y) tries to move in `dir`.
   * `mode` is the MoveMode ('walk' | 'run' | 'bike'); only the bike changes collision (MOVEMENT.md 2).
   * @returns {{type:'walk',x,y}|{type:'ledge'|'ramp',x,y,overX,overY}|{type:'block',code,gate?}|{type:'edge',exit}}
   */
  query(x, y, dir, mode = 'walk') {
    const d = DELTA[dir];
    const nx = x + d.x, ny = y + d.y;
    if (!this.inBounds(nx, ny)) return { type: 'edge', exit: this.exitFor(x, y, dir) };
    const c = this.code(nx, ny);
    const bike = mode === 'bike';
    if (this.passable(nx, ny, mode)) return { type: 'walk', x: nx, y: ny };
    if (c === Col.LEDGE_S && dir === 'down') {
      const lx = nx, ly = ny + 1; // land on the tile below the ledge (every mode)
      if (this.passable(lx, ly, mode)) return { type: 'ledge', x: lx, y: ly, overX: nx, overY: ny };
    }
    if (c === Col.RAMP && bike && this.rampDir(nx, ny) === dir) {
      const lx = nx + d.x, ly = ny + d.y; // one-way hop: the ramp plus the landing tile
      if (this.passable(lx, ly, mode)) return { type: 'ramp', x: lx, y: ly, overX: nx, overY: ny };
    }
    const npc = this.npcAt(nx, ny);
    if (npc) return { type: 'block', code: c, npc };
    const gate = this.gateAt(nx, ny);
    return gate && !this.gateCleared(gate) ? { type: 'block', code: c, gate } : { type: 'block', code: c };
  }

  /** Can an actor in `mode` stand on (x,y)? Walk/run: codes 0,4,7. Bike adds bike_only (8). NPCs are solid. */
  passable(x, y, mode = 'walk') {
    if (!this.inBounds(x, y) || this._npcAt.has(x + ',' + y)) return false;
    if (DEV.masterKey) { const k = x + ',' + y, g = this._gateAt.get(k); if ((g && !this.gateCleared(g)) || this._lockedAt.has(k)) return true; } // dev master key: runtime override, never saved
    const c = this.code(x, y);
    return WALKABLE.has(c) || (mode === 'bike' && c === Col.BIKE_ONLY);
  }
}

/**
 * Where an edge exit lands on the target map (README 7: offset shifts the coordinate along the edge).
 * North exit -> target's south row facing up, etc.
 */
export function exitSpawn(exit, fromX, fromY, target) {
  const off = exit.offset || 0;
  switch (exit.edge) {
    case 'north': return { x: fromX + off, y: target.height - 1, facing: 'up' };
    case 'south': return { x: fromX + off, y: 0, facing: 'down' };
    case 'west': return { x: target.width - 1, y: fromY + off, facing: 'left' };
    case 'east': return { x: 0, y: fromY + off, facing: 'right' };
    default: throw new Error('bad exit edge ' + exit.edge);
  }
}

/**
 * Resolve a door/mat/stairs warp to {map,x,y,facing}. `$return` goes back to the last door used,
 * one tile below it, facing down (README 7). Returns null if `$return` has no stored door.
 */
export function warpSpawn(warp, lastDoor) {
  if (warp.to === '$return') {
    if (!lastDoor) return null;
    return { map: lastDoor.map, x: lastDoor.x, y: lastDoor.y + 1, facing: 'down' };
  }
  return { map: warp.to, x: warp.tx, y: warp.ty, facing: warp.facing || 'down' };
}

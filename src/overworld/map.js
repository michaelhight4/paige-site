// Kilumen overworld: map model (pure, no DOM). Loads the World Design map JSON format
// (art/world/overworld/OVERWORLD_README.md sections 6-7) and answers collision / warp / exit queries.
import { Col, WALKABLE, DELTA, EDGE_FOR_DIR } from './constants.js';

export const LAYER_ORDER = ['ground', 'decoration', 'overlay']; // overlay is y-sorted with characters (see renderer)
const GRID_LAYERS = ['ground', 'decoration', 'overlay', 'collision', 'encounter'];

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
   * @returns {{type:'walk',x,y}|{type:'ledge',x,y,overX,overY}|{type:'block',code}|{type:'edge',exit}}
   */
  query(x, y, dir) {
    const d = DELTA[dir];
    const nx = x + d.x, ny = y + d.y;
    if (!this.inBounds(nx, ny)) return { type: 'edge', exit: this.exitFor(x, y, dir) };
    const c = this.code(nx, ny);
    if (WALKABLE.has(c)) return { type: 'walk', x: nx, y: ny };
    if (c === Col.LEDGE_S && dir === 'down') {
      const lx = nx, ly = ny + 1; // land on the tile below the ledge
      if (this.isWalkable(lx, ly)) return { type: 'ledge', x: lx, y: ly, overX: nx, overY: ny };
    }
    // Col.BIKE_ONLY / Col.RAMP: blocked for every mode until MOVEMENT.md defines bike rules (hook: query gets dir only).
    return { type: 'block', code: c };
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

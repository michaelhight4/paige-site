// Kilumen: grid pathfinding for NPC walk-to-target (libs pass, Oct 22, 2026). A* from easystar.js (MIT,
// src/vendor/easystar), run synchronously: maps are small (largest ~60x60) and a path is planned once per order
// plus a replan when blocked, so there is no per-frame cost. Walkable = the same cells a scripted NPC step allows
// (npcs.js _canStep: Col.WALK or Col.PLATE), minus cells the caller blocks (warps, stand cells, actors).
import EasyStar from '../vendor/easystar/easystar.esm.js?v=v0.2.106-alpha';
import { Col } from './constants.js?v=v0.2.106-alpha';

const STEP = { '0,-1': 'up', '0,1': 'down', '-1,0': 'left', '1,0': 'right' };

/** 0 = walkable, 1 = blocked. `blocked(x, y)` adds caller rules; the start and goal cells are always open. */
export function walkGrid(map, blocked = () => false, open = []) {
  const keep = new Set(open.map((c) => c.x + ',' + c.y));
  const grid = [];
  for (let y = 0; y < map.height; y++) {
    const row = new Array(map.width);
    for (let x = 0; x < map.width; x++) {
      const c = map.code(x, y);
      row[x] = keep.has(x + ',' + y) || ((c === Col.WALK || c === Col.PLATE) && !blocked(x, y)) ? 0 : 1;
    }
    grid.push(row);
  }
  return grid;
}

/** Shortest 4-way path [{x,y}, ...] from `from` to `to` (both included), or null. Synchronous. */
export function findPath(grid, from, to) {
  if (!grid[to.y] || grid[to.y][to.x] == null) return null;
  const es = new EasyStar.js();
  es.setGrid(grid);
  es.setAcceptableTiles([0]);
  es.enableSync();
  es.setIterationsPerCalculation(1e6);
  let out = null;
  es.findPath(from.x, from.y, to.x, to.y, (p) => { out = p; });
  es.calculate();
  return out;
}

/** [{x,y}, ...] -> ['left', 'up', ...] */
export function pathToDirs(path) {
  const dirs = [];
  for (let i = 1; i < (path?.length || 0); i++) dirs.push(STEP[`${path[i].x - path[i - 1].x},${path[i].y - path[i - 1].y}`]);
  return dirs;
}

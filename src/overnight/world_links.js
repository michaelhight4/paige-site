// Overnight systems (Oct 23, 2026): generic map registry + warp / map-link validation. Pure (no DOM), Node-safe.
// New World Design maps plug in from data only: a map is "registered" when it is in world_layout.json maps_built
// (World Design's list) or in an extra registry entry {name: url} (staged maps, src/overnight/flags.js stagedMaps).
// The overworld resolves map URLs through mapUrlFor() and treats every registered name as a known link target.
import { GameMap, isToCome } from '../overworld/map.js';

/** Registry: {names:Set, urls:{name:url}}. layout = world_layout.json, extra = {name: url} (overrides mapsDir). */
export function buildRegistry(layout, mapsDir, extra = {}) {
  const names = new Set(layout?.maps_built || []);
  const urls = {};
  for (const n of names) urls[n] = mapsDir + n + '.json';
  for (const [n, u] of Object.entries(extra || {})) { names.add(n); urls[n] = u; }
  return { names, urls };
}

export function mapUrlFor(reg, mapsDir, name) { return reg?.urls?.[name] || mapsDir + name + '.json'; }

const WALKISH = new Set([0, 4, 7, 10]); // walk, door, plate, ice: a spawn cell must be one of these

/**
 * Check every link of the loaded maps. maps: {name: json}. Returns {problems:[str], closed:[str], links:n}.
 * problems = a warp/exit that should work but does not (missing target, spawn out of bounds or on a wall).
 * closed   = links that are closed on purpose (note "TO COME", or the target is not built yet): the game shows
 *            closedPathText for those, so they are reported, not failed.
 */
export function validateLinks(maps, names = new Set(Object.keys(maps))) {
  const problems = [], closed = []; let links = 0;
  for (const [name, j] of Object.entries(maps)) {
    try { new GameMap(structuredClone(j)); } catch (e) { problems.push(`${name}: does not load (${e.message})`); continue; }
    for (const w of j.warps || []) {
      links++;
      const at = `${name} warp (${w.x},${w.y})`;
      if (w.to === '$return') continue;
      if (isToCome(w)) { closed.push(`${at} -> ${w.to} (TO COME)`); continue; }
      if (!names.has(w.to)) { problems.push(`${at} -> ${w.to}: target map not registered`); continue; }
      const t = maps[w.to];
      if (!t) { problems.push(`${at} -> ${w.to}: target not loaded`); continue; }
      if (!(w.tx >= 0 && w.ty >= 0 && w.tx < t.width && w.ty < t.height)) { problems.push(`${at} -> ${w.to} (${w.tx},${w.ty}): spawn out of bounds`); continue; }
      const c = t.layers.collision[w.ty][w.tx];
      if (!WALKISH.has(c)) problems.push(`${at} -> ${w.to} (${w.tx},${w.ty}): spawn on collision ${c}`);
    }
    for (const e of j.exits || []) {
      links++;
      const at = `${name} exit ${e.edge} ${e.start}-${e.end}`;
      if (isToCome(e) || !names.has(e.to)) { closed.push(`${at} -> ${e.to}${isToCome(e) ? ' (TO COME)' : ' (not built)'}`); continue; }
      if (!maps[e.to]) problems.push(`${at} -> ${e.to}: target not loaded`);
    }
  }
  return { problems, closed, links };
}

/** Maps that link to `name` (for hooking a newly landed map in: which stubs now open). */
export function inboundLinks(maps, name) {
  const out = [];
  for (const [n, j] of Object.entries(maps)) {
    for (const w of j.warps || []) if (w.to === name) out.push({ from: n, kind: 'warp', x: w.x, y: w.y, toCome: isToCome(w) });
    for (const e of j.exits || []) if (e.to === name) out.push({ from: n, kind: 'exit', edge: e.edge, toCome: isToCome(e) });
  }
  return out;
}

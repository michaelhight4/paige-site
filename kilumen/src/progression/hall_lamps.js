// Batch 3 wiring (Oct 23 2026, Coder): Mirefen hall darkness in the overworld. The map (World Design) carries
// tint {kind:'darkness', grade:'night', lights:{tile_unlit, tile_lit, cells}}; the puzzle def (data/hall_puzzles/mirefen.json)
// carries darkness.lamps + order. Both describe the same 4 reed lamps: lit lamps = def.order.slice(0, st.p) (halls.js
// litLamps), so the map cell of each lit lamp shows tile_lit (2068) and the rest tile_unlit (2067). Runtime only: the
// map file is never edited. Solved (st.p >= order.length or def.solved_flag set): every lamp lit and the tint clears
// (= halls.js lightAt returns full light), so the hall goes back to the indoor grade.
import { litLamps } from './halls.js?v=v0.2.82-alpha';

/** Lamp id -> map cell [x, y] (def.darkness.lamps are already mirefen_hall_int map cells). */
export const lampMapCells = (def) => Object.entries(def?.darkness?.lamps || {}).map(([id, c]) => ({ id, x: c[0], y: c[1] }));

export function hallSolved(def, saved, flags = null) {
  return !!(saved?.solved || (saved?.st?.p || 0) >= (def?.order?.length || Infinity) || (def?.solved_flag && flags?.has?.(def.solved_flag)));
}

/** Lit lamp ids for the saved puzzle state (all of them when solved). */
export function litIds(def, saved, flags = null) {
  return hallSolved(def, saved, flags) ? [...def.order] : litLamps(def, saved?.st || null);
}

/** Tint to draw with: the map's tint until the hall is solved, then null (indoor rule). */
export function activeTint(map, def, saved, flags = null) {
  const t = map?.json?.tint; if (!t) return null;
  return def && hallSolved(def, saved, flags) ? null : t;
}

/** Swap each lamp cell's decoration tile to lit / unlit. Returns [{id, x, y, lit}]. */
export function applyLamps(map, def, saved, flags = null) {
  const L = map?.json?.tint?.lights; if (!L || !def) return [];
  const lit = new Set(litIds(def, saved, flags)), out = [];
  for (const c of lampMapCells(def)) {
    const on = lit.has(c.id);
    map.setTile('decoration', c.x, c.y, on ? L.tile_lit : L.tile_unlit);
    out.push({ ...c, lit: on });
  }
  return out;
}

/** Map tint cells and puzzle lamps describe the same cells (test + dev check). */
export function lampsAgree(map, def) {
  const a = (map?.json?.tint?.lights?.cells || map?.tint?.lights?.cells || []).map((c) => c.join(',')).sort();
  const b = lampMapCells(def).map((c) => c.x + ',' + c.y).sort();
  return a.length > 0 && a.join('|') === b.join('|');
}

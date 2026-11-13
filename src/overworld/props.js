// Kilumen overworld: flag/phase-driven map data (pure, no DOM). Oct 22, 2026 (club_int, art/world/overworld/qa/club/README.md).
//  - flag_swaps: per cell, entries apply IN FILE ORDER as a chain. An entry fires when its `flag` is set, its optional
//    `requires` flag is set, and its `before` is the cell's current tile (or "any"). So the club flyer wall goes
//    club_note_slot -> club_note (tier flag) -> club_note_tick (camp_restored_*, requires the tier flag), and the
//    post-game banner ("before": "any", listed last) wins over every other swap. The start tile is the map's own tile
//    (cells are always resolved from it, so clearing a dev flag rolls the cell back too).
//  - active_when (spots, npcs): a flag name or a list of flag names; the thing exists only when all are set.
//  - by_phase (npcs): {dawn|day|dusk|night: {x, y, facing}} overrides the def's position for that outdoor phase.
const asList = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

/** True when every active_when flag is set (no active_when = always active). */
export function isActive(def, flags) { return asList(def?.active_when).every((f) => flags?.has(f)); }

const cellKey = (fs) => `${fs.layer || 'decoration'}|${fs.x}|${fs.y}`;

/**
 * Resolve flag_swaps to the tile each cell should show. `baseOf(layer, x, y)` gives the map's original tile name
 * for the cell (null if empty / unknown). Returns [{layer, x, y, tile}] for every cell that has entries; `tile`
 * is null when the cell keeps its base and the base is unknown (caller leaves it alone).
 */
export function resolveFlagSwaps(swaps, flags, baseOf) {
  const cells = new Map();
  for (const fs of swaps || []) {
    const k = cellKey(fs);
    if (!cells.has(k)) cells.set(k, { layer: fs.layer || 'decoration', x: fs.x, y: fs.y, list: [] });
    cells.get(k).list.push(fs);
  }
  const out = [];
  for (const c of cells.values()) {
    let tile = baseOf ? baseOf(c.layer, c.x, c.y) : null;
    if (tile == null) tile = c.list.find((fs) => fs.before && fs.before !== 'any')?.before ?? null;
    for (const fs of c.list) {
      if (!flags?.has(fs.flag) || (fs.requires && !asList(fs.requires).every((f) => flags.has(f)))) continue;
      if (fs.before === 'any' || fs.before == null || fs.before === tile) tile = fs.after;
    }
    out.push({ layer: c.layer, x: c.x, y: c.y, tile });
  }
  return out;
}

/** An NPC def as placed for `phase`: by_phase[phase] x/y/facing over the def (the def itself is not changed). */
export function npcForPhase(def, phase) {
  const p = def?.by_phase?.[phase];
  if (!p) return def;
  const o = { ...def };
  for (const k of ['x', 'y', 'facing']) if (p[k] != null) o[k] = p[k];
  return o;
}

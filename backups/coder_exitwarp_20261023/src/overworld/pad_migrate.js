// Old-save position migration for the padded maps (Gary, Oct 23 2026, 10:25 AM CT: keep the padded maps; old saves must
// load the player on a walkable tile, shifted by the map's padding offset). Pure: takes a GameMap (or anything with
// json/inBounds/isWalkable/warpAt/npcAt) and a saved {map, x, y, facing}.
export const padOffset = (json) => ({ dx: json?.padding?.dx || 0, dy: json?.padding?.dy || 0 });

/** Nearest cell (ring search, then by distance) that is walkable, not a warp and not an NPC; null if none. */
export function nearestWalkable(map, x, y, maxR = 40) {
  const ok = (cx, cy) => map.inBounds(cx, cy) && map.isWalkable(cx, cy) && !map.warpAt?.(cx, cy) && !map.npcAt?.(cx, cy);
  if (ok(x, y)) return { x, y };
  for (let r = 1; r <= maxR; r++) {
    let best = null, bd = Infinity;
    for (let cy = y - r; cy <= y + r; cy++) for (let cx = x - r; cx <= x + r; cx++) {
      if (Math.max(Math.abs(cx - x), Math.abs(cy - y)) !== r || !ok(cx, cy)) continue;
      const d = (cx - x) ** 2 + (cy - y) ** 2; if (d < bd) { bd = d; best = { x: cx, y: cy }; }
    }
    if (best) return best;
  }
  return null;
}

/** Saved position written before padding -> same spot on the padded map, snapped to the nearest walkable tile. */
export function migratePos(map, pos) {
  const { dx, dy } = padOffset(map.json);
  const x = pos.x + dx, y = pos.y + dy;
  const c = nearestWalkable(map, x, y) || { x, y };
  return { ...pos, x: c.x, y: c.y };
}

/** lastDoor ($return) written before padding: shift onto the padded map (door cells are warps, so no snapping). */
export function migrateDoor(json, door) {
  const { dx, dy } = padOffset(json);
  return { ...door, x: door.x + dx, y: door.y + dy };
}

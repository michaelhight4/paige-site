// Dev Travel landing spot (moved out of console.js so it can be tested headlessly).
// Playtest fix Oct 30 2026: Travel to mirefen_bog landed at 32,18, a one-cell pocket between the sunken hatch warp (33,18)
// and its sealed gate (31,18). Every candidate now has to open onto a real walkable area (OPEN cells reachable on foot).
const OPEN = 12;
const DIRS = [[0, 1, 'down'], [0, -1, 'up'], [-1, 0, 'left'], [1, 0, 'right']];

export function devLandingSpot(m, layout, name) {
  const at = (x, y) => m.inBounds(x, y) && m.isWalkable(x, y) && !m.npcAt?.(x, y);
  const cache = new Map();
  const open = (x, y) => { // flood fill (walkable cells, NPCs ignored) until OPEN cells are found
    const k = `${x},${y}`; if (cache.has(k)) return cache.get(k);
    const seen = new Set([k]), q = [[x, y]];
    while (q.length && seen.size < OPEN) {
      const [cx, cy] = q.shift();
      for (const [dx, dy] of DIRS) { const nx = cx + dx, ny = cy + dy, nk = `${nx},${ny}`; if (!seen.has(nk) && m.inBounds(nx, ny) && m.isWalkable(nx, ny)) { seen.add(nk); q.push([nx, ny]); } }
    }
    const ok = seen.size >= OPEN; cache.set(k, ok); return ok;
  };
  const ok = (x, y) => at(x, y) && open(x, y);
  const fp = m.json?.fly_point || layout?.fly?.destinations?.[name]?.fly_point;
  if (fp && ok(fp.x, fp.y)) return { x: fp.x, y: fp.y, facing: fp.facing || 'down' };
  // Oct 30 2026 tester (r9_cairnfold -> the heal interior): landing right on a door's step, facing it, meant the next Up tap
  // walked you inside. Land two tiles out from the first warp with both tiles clear, facing away; never on a warp's neighbour.
  const ws = m.json?.warps || [], nearWarp = (x, y) => ws.some((w) => Math.abs(w.x - x) + Math.abs(w.y - y) <= 1);
  for (const w of ws) for (const [dx, dy, f] of DIRS) if (at(w.x + dx, w.y + dy) && ok(w.x + 2 * dx, w.y + 2 * dy) && !nearWarp(w.x + 2 * dx, w.y + 2 * dy)) return { x: w.x + 2 * dx, y: w.y + 2 * dy, facing: f };
  for (const w of ws) for (const [dx, dy, f] of DIRS) if (ok(w.x + dx, w.y + dy)) return { x: w.x + dx, y: w.y + dy, facing: f };
  const cx = Math.floor(m.width / 2), cy = Math.floor(m.height / 2), R = Math.max(m.width, m.height);
  for (let pass = 0; pass < 2; pass++) // pass 1 = open area only; pass 2 = any walkable cell (tiny interiors)
    for (let r = 0; r < R; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === r && (pass ? at : ok)(cx + dx, cy + dy)) return { x: cx + dx, y: cy + dy, facing: 'down' };
  return null;
}

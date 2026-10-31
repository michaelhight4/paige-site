// Scheduled merchant ship (Gary, Oct 31 2026): a big ship sails into a harbour at `arrive` (07:00 game time), stays berthed
// all day and sails out at `depart` (17:00); the berth is empty overnight. Map config: json.ambient.merchant_ship
// {tiles, w, h, berth:{x,y}, lane_exit_y, arrive, depart, sail_min}. Purely visual and drawn under characters; the berth
// and its straight southward lane are plain water cells (collision 1), so it never covers a walkable or surfable tile.

const ease = (t) => t * t * (3 - 2 * t);

/** Ship top-left in cells ({x, y, moving, phase}) for a minute of the day, or null when the berth is empty. */
export function merchantShipPos(minOfDay, cfg) {
  if (!cfg) return null;
  const m = ((minOfDay % 1440) + 1440) % 1440, a = cfg.arrive * 60, d = cfg.depart * 60, s = cfg.sail_min || 20;
  const bx = cfg.berth.x, by = cfg.berth.y, ey = cfg.lane_exit_y;
  if (m < a || m >= d + s) return null;
  if (m < a + s) return { x: bx, y: ey + (by - ey) * ease((m - a) / s), moving: true, phase: 'arriving' };
  if (m < d) return { x: bx, y: by, moving: false, phase: 'berthed' };
  return { x: bx, y: by + (ey - by) * ease((m - d) / s), moving: true, phase: 'departing' };
}

/** Every cell the ship covers on its whole path (berth + lane to the map edge), for tests and audits. */
export function merchantShipCells(cfg, height) {
  const out = [];
  for (let y = cfg.berth.y; y < Math.min(height, cfg.lane_exit_y + cfg.h); y++) for (let x = cfg.berth.x; x < cfg.berth.x + cfg.w; x++) out.push({ x, y });
  return out;
}

/** Draw for the living-world under() pass (life = Living instance, TILE = cell px). */
export function drawMerchantShip(ctx, v, life, TILE) {
  const m = life.map, cfg = m?.json?.ambient?.merchant_ship;
  const p = merchantShipPos(life.scene.clock.min, cfg);
  life.merchantShip = p;
  if (!p) return;
  const ts = v.tileset, z = v.zoom, wx0 = p.x * TILE, wy0 = p.y * TILE;
  ctx.save();
  ctx.beginPath(); ctx.rect(-v.cam.x * z, -v.cam.y * z, m.width * TILE * z, m.height * TILE * z); ctx.clip(); // no hull off the map
  if (p.moving) { // wake: the kit's water ripple behind the stern
    const rid = m.tileByName?.(m.json.ambient?.ripple_tile || 'fish_ripple')?.id, rt = rid && ts.byId.get(rid), a = rt?.animation;
    if (a) { const fr = a.frames[Math.floor(life.scene.ms / (a.frame_ms || 120)) % a.frames.length]; for (let c = 0; c < cfg.w; c++) life._tileAt(ctx, v, rid, fr, wx0 + c * TILE, wy0 + (p.phase === 'arriving' ? cfg.h : -1) * TILE, false); }
  }
  for (let r = 0; r < cfg.h; r++) for (let c = 0; c < cfg.w; c++) {
    const id = m.tileByName?.(`${cfg.tiles}_${c}_${r}`)?.id, t = id && ts.byId.get(id);
    if (t && life._visible(v, wx0 + c * TILE, wy0 + r * TILE)) life._tileAt(ctx, v, id, t.index, wx0 + c * TILE, wy0 + r * TILE, false);
  }
  ctx.restore();
}

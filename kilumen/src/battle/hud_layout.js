// Battle HUD layout solver (Oct 30 2026, Gary: "why is the health bar covering the sprite"). The HUD stays where the classic
// monster-battle screens put it (foe card top-left, your card bottom-right just above the message/command panel); this moves
// the creatures so no card, the message box or the command box ever covers either creature (or the ground it stands on).
//  - Painted backdrops (platforms.js art: true): the creatures stand on spots painted into the 1280x720 frame, so instead of
//    lifting a creature off its pad the backdrop itself is zoomed / shifted (still covering the screen) until both pads land in
//    the clear area. If no zoom up to maxZoom works, the creatures are nudged off their pads the least they can (over the zooms).
//  - Drawn platforms (grass): the platform rides with the creature, so the creature is nudged only if it would be covered.
// Pure geometry (no DOM): ui_sd.js feeds it measured rects; tests/battle_hud_layout.test.mjs feeds it the HUD model below.
// Rects are { l, t, r, b } in the battle screen's px. Sprite: { w, h, feet, box: [x0, y0, x1, y1] } (fractions of the image box,
// the visible pixels; feet = feet line fraction; the container is centred on x, its bottom edge is the feet line).
export const overlaps = (a, c, gap = 0) => !!(a && c) && a.l < c.r + gap && c.l < a.r + gap && a.t < c.b + gap && c.t < a.b + gap;
export function spriteRect(sp, x, y, below = 0) {
  const [x0, y0, x1, y1] = sp.box || [0, 0, 1, sp.feet ?? 1], top = y - (sp.feet ?? 1) * sp.h, left = x - sp.w / 2;
  return { l: left + x0 * sp.w, r: left + x1 * sp.w, t: top + y0 * sp.h, b: Math.max(top + y1 * sp.h, y + below) };
}
// below = how far the ground (painted pad / drawn platform) reaches under the feet line, px
function fits(view, obstacles, rects, gap, edge) {
  for (const r of rects) { if (r.l < -edge || r.r > view.w + edge || r.t < 0 || r.b > view.h) return false; for (const o of obstacles) if (overlaps(r, o, gap)) return false; }
  return rects.length < 2 || !overlaps(rects[0], rects[1], 0);
}
const order = (lo, hi, def, step) => { const out = []; if (hi < lo) return [def]; def = Math.min(hi, Math.max(lo, def)); out.push(def);
  for (let d = step; def - d >= lo || def + d <= hi; d += step) { if (def - d >= lo) out.push(def - d); if (def + d <= hi) out.push(def + d); } if (!out.includes(lo)) out.push(lo); if (!out.includes(hi)) out.push(hi); return out; };
// least nudge for one creature (rings of growing radius, upward / inward first)
function nudge(view, obstacles, sp, x, y, below, other, gap, edge) {
  const ok = (dx, dy) => { const r = spriteRect(sp, x + dx, y + dy, below); return fits(view, obstacles, other ? [r, other] : [r], gap, edge) ? r : null; };
  if (ok(0, 0)) return [0, 0];
  for (let rad = 4; rad < Math.max(view.w, view.h); rad += 4) for (let a = 0; a < 64; a++) { const t = (a / 64) * 2 * Math.PI, dx = Math.round(Math.cos(t) * rad), dy = Math.round(-Math.abs(Math.sin(t)) * rad * (a < 32 ? 1 : -1));
    if (ok(dx, dy)) return [dx, dy]; }
  return null;
}
/**
 * @param o.view {w,h}; o.obstacles rects (cards, party chip, the whole message+command row); o.sprites {near, far}
 * @param o.art { iw, ih, ax, ay, spots: {near:[fx,fy], far:[fx,fy]}, padBelow: {near, far} (fractions of the frame height) }
 * @param o.feet {near:[x,y], far:[x,y]} default feet points (drawn platforms); o.below {near, far} px under the feet line
 * @returns { feet: {near:[x,y], far:[x,y]}, rects: {near, far}, bg: {x,y,w,h}|null, zoom, ok }
 */
export function solveBattleLayout(o) {
  const { view, obstacles = [], sprites, gap = 6, edge = 0, maxZoom = 1.8 } = o;
  const done = (feet, below, bg, zoom) => { const rects = { near: spriteRect(sprites.near, ...feet.near, below.near), far: spriteRect(sprites.far, ...feet.far, below.far) };
    return { feet, rects, bg, zoom, ok: fits(view, obstacles, [rects.near, rects.far], gap, edge) }; };
  if (o.art) {
    const { iw = 1280, ih = 720, ax = 0.5, ay = 0.5, spots, padBelow = { near: 0.03, far: 0.025 } } = o.art, s0 = Math.max(view.w / iw, view.h / ih);
    const at = (s, ox, oy) => { const W = iw * s, H = ih * s, below = { near: padBelow.near * H, far: padBelow.far * H };
      return { feet: { near: [ox + spots.near[0] * W, oy + spots.near[1] * H], far: [ox + spots.far[0] * W, oy + spots.far[1] * H] }, below, bg: { x: ox, y: oy, w: W, h: H } }; };
    for (let z = 1; z <= maxZoom + 1e-9; z += 0.02) {
      const s = s0 * z, W = iw * s, H = ih * s;
      // y and x decouple except for the creature-vs-creature check; try y first with the default x, then x, then both
      for (const oy of order(view.h - H, 0, (view.h - H) * ay, 3)) {
        const c0 = at(s, (view.w - W) * ax, oy), rn = spriteRect(sprites.near, ...c0.feet.near, c0.below.near), rf = spriteRect(sprites.far, ...c0.feet.far, c0.below.far);
        if (rn.t < 0 || rf.t < 0 || rn.b > view.h || rf.b > view.h) continue;
        for (const ox of order(view.w - W, 0, (view.w - W) * ax, 4)) { const c = at(s, ox, oy); const r = done(c.feet, c.below, c.bg, z); if (r.ok) return r; }
      }
    }
    // no zoom puts both pads in the clear: take the zoom (centred like the cover-fit) needing the least creature nudge
    let best = null;
    for (let z = 1; z <= maxZoom + 1e-9; z += 0.1) {
      const s = s0 * z, c = at(s, (view.w - iw * s) * ax, (view.h - ih * s) * ay), feet = { near: [...c.feet.near], far: [...c.feet.far] };
      const df = nudge(view, obstacles, sprites.far, ...feet.far, c.below.far, null, gap, edge); if (!df) continue; feet.far[0] += df[0]; feet.far[1] += df[1];
      const dn = nudge(view, obstacles, sprites.near, ...feet.near, c.below.near, spriteRect(sprites.far, ...feet.far, c.below.far), gap, edge); if (!dn) continue; feet.near[0] += dn[0]; feet.near[1] += dn[1];
      const cost = Math.hypot(...df) + Math.hypot(...dn) + (z - 1) * 100; if (!best || cost < best.cost) best = { cost, feet, c, z };
    }
    if (best) return done(best.feet, best.c.below, best.c.bg, best.z);
    const c = at(s0, (view.w - iw * s0) * ax, (view.h - ih * s0) * ay);
    return done(c.feet, c.below, c.bg, 1);
  }
  const below = o.below || { near: 0, far: 0 }, feet = { near: [...o.feet.near], far: [...o.feet.far] };
  const df = nudge(view, obstacles, sprites.far, ...feet.far, below.far, null, gap, edge); if (df) { feet.far[0] += df[0]; feet.far[1] += df[1]; }
  const dn = nudge(view, obstacles, sprites.near, ...feet.near, below.near, spriteRect(sprites.far, ...feet.far, below.far), gap, edge); if (dn) { feet.near[0] += dn[0]; feet.near[1] += dn[1]; }
  return done(feet, below, null, 1);
}

// Gullhaven derby FX player (Coder, dev/seaport, Oct 30 2026). Sheets + json: art/fx/derby/ (Art Bot draft, README.md there).
// Nearest-neighbour sub-rect blits only (1-bit alpha, no tint / rotation); the json emissive_hint is ignored on purpose.
// Frames are native px (16 art px per 64 px square, x4). draw(ctx, name, i, x, y, s, flip) puts the json anchor at (x, y), scaled by s.
export const FX_DIR = 'art/fx/derby/';
export const ANIMS = ['crystal_cast', 'bobber_idle', 'bobber_nibble', 'bobber_bite', 'bite_exclaim', 'line_tension', 'reel_spray', 'fish_breach',
  'catch_flash', 'scale_needle', 'readout_pop', 'weight_glyphs', 'new_record_burst'];
export const GLYPH = Object.freeze({ '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '.': 10, kg: 11 });
export const ADVANCE = Object.freeze({ digit: 48, '.': 32, kg: 56 }); // native px
export const BREACH_SWAP_FRAME = 6;   // README: from frame 6 the hooked creature's sprite replaces the generic fish
export const NEEDLE_PIVOT = Object.freeze({ x: 64, y: 80 }); // scale_needle: art (16,20) x4
export const READOUT_GLYPH_FRAME = 3; // glyphs start on readout_pop frame 3

/** kg -> glyph ids ("12.4" -> [1,2,10,4,11]). One decimal, as rollWeight gives. */
export function weightGlyphs(kg) {
  const s = (Math.round(Number(kg) * 10) / 10).toFixed(1);
  return [...s].map((c) => GLYPH[c]).filter((g) => g != null).concat(GLYPH.kg);
}
export const glyphAdvance = (g) => (g === GLYPH.kg ? ADVANCE.kg : g === GLYPH['.'] ? ADVANCE['.'] : ADVANCE.digit);
/** Needle angle (radians from straight up) for a weight fraction 0..1: -80deg (empty) .. +80deg (top of the species range). */
export const needleAngle = (frac) => ((-80 + 160 * Math.min(1, Math.max(0, Number(frac) || 0))) * Math.PI) / 180;

/** Frame index at elapsed ms for an anim json. loop wraps; one-shot holds the last frame. */
export function frameAt(meta, ms) {
  const d = meta?.ms_per_frame; if (!d?.length) return 0;
  const total = meta.total_ms || d.reduce((a, b) => a + b, 0);
  let t = Math.max(0, ms); if (meta.playback === 'loop') t %= total; else if (t >= total) return d.length - 1;
  for (let i = 0; i < d.length; i++) { if (t < d[i]) return i; t -= d[i]; }
  return d.length - 1;
}
export const done = (meta, ms) => meta?.playback !== 'loop' && ms >= (meta?.total_ms || 0);

export function createDerbyFx({ base = '', loadImage = null, fetchJson = (u) => fetch(u).then((r) => (r.ok ? r.json() : null)) } = {}) {
  const meta = {}, img = {}, spr = {};
  const li = loadImage || ((u) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = u; }));
  const ready = Promise.all(ANIMS.map(async (n) => {
    try { meta[n] = await fetchJson(base + FX_DIR + n + '.json'); img[n] = await li(base + FX_DIR + (meta[n]?.sheet || n + '_sheet.png')); } catch { delete meta[n]; }
  }));
  const fx = {
    ready, meta, has: (n) => !!(meta[n] && img[n]),
    frameAt: (n, ms) => frameAt(meta[n], ms), done: (n, ms) => done(meta[n], ms),
    draw(ctx, n, i, x, y, s = 1, flip = false) {
      const m = meta[n], im = img[n]; if (!m || !im) return false;
      const f = m.frames?.[Math.min(i, m.frames.length - 1)]; if (!f) return false;
      const w = f.w * s, h = f.h * s, ax = m.anchor?.x || 0, ay = m.anchor?.y || 0;
      ctx.save(); ctx.imageSmoothingEnabled = false;
      if (flip) { ctx.translate(Math.round(x), 0); ctx.scale(-1, 1); ctx.drawImage(im, f.x, f.y, f.w, f.h, Math.round(-ax * s), Math.round(y - ay * s), Math.round(w), Math.round(h)); }
      else ctx.drawImage(im, f.x, f.y, f.w, f.h, Math.round(x - ax * s), Math.round(y - ay * s), Math.round(w), Math.round(h));
      ctx.restore(); return true;
    },
    /** Glyph string left-to-right from (x, y) top-left, s scale. Returns drawn width. */
    glyphs(ctx, ids, x, y, s = 1) {
      let cx = x; for (const g of ids) { fx.draw(ctx, 'weight_glyphs', g, cx, y, s); cx += glyphAdvance(g) * s; } return cx - x;
    },
    glyphsWidth: (ids, s = 1) => ids.reduce((a, g) => a + glyphAdvance(g) * s, 0),
    /** Hooked creature sprite (overworld sheet, first 64x64 cell) for the breach swap. */
    creature(species, pixelDir = 'art/characters/pixel/') {
      if (!species) return null; if (spr[species] !== undefined) return spr[species];
      spr[species] = null; li(base + `${pixelDir}creatures/${species}/overworld/${species}_ow_sheet.png`).then((i) => { spr[species] = i; }).catch(() => {});
      return null;
    },
  };
  return fx;
}

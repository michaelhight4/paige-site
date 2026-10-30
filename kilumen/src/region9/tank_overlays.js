// Wellspire lab tank particle overlays (Animator, built on Director's lean art 0e49765a; wired by Coder Oct 30 2026).
// Assets: art/world/overworld/fx/lab_tank_overlays/<ovl>/ (README.md there). Layer decoration_fx: renderer.js calls
// draw() right after the decoration tiles, before the y-sorted characters, so Ondravel (summit_fx draw) stays above his tank.
// One instance per anchor tile on the map's decoration layer; vats: every slice tile is its own instance (sheet row = slice).
// One shared clock (v.ms); frame = (floor(ms / frameMs) + phase_offsets_frames[(7*x0 + 3*y0) % 6]) % frames.
// Phones (coarse pointer): the native _art1x sheets drawn x2 nearest (the 64-px Ondravel tank sheet is ~20 MB of texture).
const T = 64, BASE = 'art/world/overworld/fx/lab_tank_overlays/';
export const TANK_ANCHORS = {
  12248: { ovl: 'ovl_tank_cyan' }, 12250: { ovl: 'ovl_tank_amber' }, 12252: { ovl: 'ovl_tank_green' },
  12256: { ovl: 'ovl_bigtank_cyan' }, 12262: { ovl: 'ovl_bigtank_green' },
  12306: { ovl: 'ovl_ondravel_tank' }, 12362: { ovl: 'ovl_ondravel_tank_broken' }, // broken: flag_swaps on fin_released swap the tile
};
['nw', 'n', 'ne', 'w', 'c', 'e', 'sw', 's', 'se'].forEach((s, i) => { TANK_ANCHORS[12268 + i] = { ovl: 'ovl_vat_green', slice: s }; });
export const phaseIndex = (x0, y0) => (7 * x0 + 3 * y0) % 6;
export function frameFor(meta, ms, x0, y0) {
  const step = meta.ms[0] || 100;
  return (Math.floor(ms / step) + meta.phase_offsets_frames[phaseIndex(x0, y0)]) % meta.frames;
}
export function srcRect(meta, frame, slice, art) {
  const k = art ? 1 / (meta.art_px_scale || 2) : 1, fw = meta.frame_w * k, fh = meta.frame_h * k;
  if (slice != null) return [frame * fw, meta.slice_rows[slice] * fh, fw, fh];
  return [(frame % meta.cols) * fw, Math.floor(frame / meta.cols) * fh, fw, fh];
}
export function makeTankOverlays({ phone } = {}) {
  const isPhone = phone ?? (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches);
  const cache = new Map();
  const get = (name) => {
    let e = cache.get(name); if (e) return e;
    e = { meta: null, img: null }; cache.set(name, e);
    if (typeof fetch === 'undefined' || typeof Image === 'undefined') return e;
    fetch(`${BASE}${name}/${name}.json`).then((r) => r.json()).then((j) => {
      e.meta = j; const im = new Image(); im.src = `${BASE}${name}/${isPhone ? j.art_sheet : j.sheet}`; e.img = im;
    }).catch(() => {});
    return e;
  };
  const scan = (m) => { // anchors on the decoration layer (re-scanned per frame; cheap, lab maps are 16x13)
    const out = []; if (!m?.layers?.decoration) return out;
    for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) {
      const a = TANK_ANCHORS[m.tile('decoration', x, y)]; if (a) out.push({ x, y, ...a });
    }
    return out;
  };
  const draw = (ctx, v) => {
    const m = v.map; if (!m || !/^fin_past_wlab_/.test(m.name || m.json?.name || '')) return;
    const list = scan(m); if (!list.length) return;
    const z = v.zoom, ms = v.ms || 0; ctx.save(); ctx.imageSmoothingEnabled = false;
    for (const it of list) {
      const e = get(it.ovl); if (!e.meta || !e.img?.complete || !e.img.naturalWidth) continue;
      const f = frameFor(e.meta, ms, it.x, it.y), [sx, sy, sw, sh] = srcRect(e.meta, f, it.slice, isPhone);
      ctx.drawImage(e.img, sx, sy, sw, sh, Math.round((it.x * T - v.cam.x) * z), Math.round((it.y * T - v.cam.y) * z), e.meta.frame_w * z, e.meta.frame_h * z);
    }
    ctx.restore();
  };
  return { draw, scan, isPhone };
}

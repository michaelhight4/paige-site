// Kilumen: draw-time palette work on native (1x) images, cached. Browser only (canvas).
//  - Time-of-day grade (time_of_day/grades.json): exact palette.hex swap via grade.map; the one translucent
//    SHADOW colour (alpha 96) uses grade.shadow.dst; anything off-palette goes through the 16^3 LUT
//    (lut_<grade>.png, blue slice k at tile (k%4, k//4), red = x, green = y, step 17, NEAREST). day = identity.
//    Tiles are graded with NO lights; only pixels inside the sheet's emissive mask (time_of_day/emissive/*.png, generated
//    from time_of_day.py EMISSIVE) use the lit grade (grade.lit / lut_<grade>_lit.png). Glow is never decided by colour.
//  - Crystal Warmth (art/characters/pixel/warmth/warmth_tints.json): exact #rrggbb swap ONLY where the crystal
//    mask is non-zero; alpha unchanged; stage 0 = identity (the source image is returned untouched).
// Results are canvases at the same native size; the renderer scales them by the integer zoom (nearest), which is
// pixel-identical to the pre-scaled 2x/3x sheets (those are nearest copies of 1x).

const hexInt = (h) => parseInt(String(h).replace('#', ''), 16);

function pixels(img) {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth || img.width; c.height = img.naturalHeight || img.height;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.imageSmoothingEnabled = false;
  x.drawImage(img, 0, 0);
  return { c, x, d: x.getImageData(0, 0, c.width, c.height) };
}

/** Prepared grade: {name, identity, map: Map<int,int>, litMap, shadowSrc, shadowDst, lut, litLut: Uint8ClampedArray|null} */
export function prepareGrade(name, def, lutImg, spriteLutImg, litLutImg) {
  const map = new Map();
  let identity = true;
  for (const [k, v] of Object.entries(def.map || {})) { map.set(hexInt(k), hexInt(v)); if (k.toLowerCase() !== String(v).toLowerCase()) identity = false; }
  const ss = def.shadow?.src || [26, 18, 38, 96], sd = def.shadow?.dst || ss;
  if (ss.join() !== sd.join()) identity = false;
  const lut = lutImg ? pixels(lutImg).d.data : null;
  // sprites (NPCs, player, creatures) use the no-lights grade: pale skin / blond hair must not glow like lamps at night
  const spriteLut = spriteLutImg ? pixels(spriteLutImg).d.data : null;
  const ssd = def.sprite?.shadow?.dst || sd;
  // lit grade: used only on emissive-mask pixels (lamp heads, lit windows, crystals). Missing -> base grade (nothing glows).
  const litMap = new Map();
  for (const [k, v] of Object.entries(def.lit?.map || def.map || {})) litMap.set(hexInt(k), hexInt(v));
  const litLut = litLutImg ? pixels(litLutImg).d.data : lut;
  return { name, identity: identity && name === 'day', map, litMap, shadowSrc: ss, shadowDst: sd, spriteShadowDst: ssd, lut, litLut, spriteLut, cache: new WeakMap() };
}

function lutLookup(lut, r, g, b) {
  const r4 = Math.round(r / 17), g4 = Math.round(g / 17), b4 = Math.round(b / 17);
  const px = (b4 % 4) * 16 + r4, py = Math.floor(b4 / 4) * 16 + g4, i = (py * 64 + px) * 4;
  return (lut[i] << 16) | (lut[i + 1] << 8) | lut[i + 2];
}

const maskCache = new WeakMap();
function maskData(mask) {
  if (!mask) return null;
  let m = maskCache.get(mask);
  if (!m) { const p = pixels(mask); m = { w: p.c.width, h: p.c.height, a: p.d.data }; maskCache.set(mask, m); }
  return m;
}

/**
 * Graded copy of a native image. mode 'map' (tiles: palette map first, no-lights LUT for the rest; pixels where the
 * same-size emissive `mask` is non-zero use the lit map / lit LUT instead) or 'lut' (sprites/UI: the no-lights sprite LUT,
 * lut_<grade>_sprite.png). Returns the source untouched for the identity grade.
 */
export function gradeImage(img, grade, mode = 'map', mask = null) {
  if (!img || !grade || grade.identity) return img;
  const ck = mode + (mode === 'map' && mask ? ':lit' : '');
  const key = grade.cache.get(img)?.[ck];
  if (key) return key;
  const { c, x, d } = pixels(img), a = d.data, memo = new Map(), litMemo = new Map();
  const sprite = mode === 'lut', lut = sprite ? (grade.spriteLut || grade.lut) : grade.lut;
  const md = mode === 'map' ? maskData(mask) : null, W = c.width;
  const [sr, sg, sb, sa] = grade.shadowSrc, [dr, dg, db] = sprite ? grade.spriteShadowDst : grade.shadowDst;
  for (let i = 0; i < a.length; i += 4) {
    const al = a[i + 3];
    if (!al) continue;
    const r = a[i], g = a[i + 1], b = a[i + 2];
    if (al === sa && r === sr && g === sg && b === sb) { a[i] = dr; a[i + 1] = dg; a[i + 2] = db; continue; }
    const k = (r << 16) | (g << 8) | b;
    let o;
    const p = i >> 2, px = p % W, py = (p - px) / W;
    if (md && px < md.w && py < md.h && md.a[(py * md.w + px) * 4]) {
      o = litMemo.get(k);
      if (o === undefined) {
        const lm = grade.litMap || grade.map, ll = grade.litLut || lut;
        o = lm.has(k) ? lm.get(k) : ll ? lutLookup(ll, r, g, b) : k;
        litMemo.set(k, o);
      }
    } else {
      o = memo.get(k);
      if (o === undefined) {
        o = mode === 'map' && grade.map.has(k) ? grade.map.get(k) : lut ? lutLookup(lut, r, g, b) : (grade.map.get(k) ?? k);
        memo.set(k, o);
      }
    }
    a[i] = o >> 16; a[i + 1] = (o >> 8) & 255; a[i + 2] = o & 255;
  }
  x.putImageData(d, 0, 0);
  const entry = grade.cache.get(img) || {};
  entry[ck] = c; grade.cache.set(img, entry);
  return c;
}

/** Warmth stage from a 0-100 value (warmth_tints.json how_to_apply). */
export function warmthStage(w) { return w < 25 ? 0 : w < 50 ? 1 : w < 75 ? 2 : 3; }

const tintCache = new Map();

/**
 * Crystal Warmth tint: swap exact colours inside the mask only. `swaps` = stages[stage] ({"#3a1e60":"#24522e",...}).
 * cacheKey identifies creature + sprite path + stage. Stage 0 returns the source image.
 */
export function tintImage(img, mask, swaps, stage, cacheKey) {
  if (!img || !stage || !swaps || !mask) return img;
  if (tintCache.has(cacheKey)) return tintCache.get(cacheKey);
  const { c, x, d } = pixels(img), a = d.data, m = pixels(mask).d;
  const W = d.width, H = d.height, mw = m.width, mh = m.height, md = m.data;
  const sw = new Map(Object.entries(swaps).map(([k, v]) => [hexInt(k), hexInt(v)]));
  for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) {
    const i = (y * W + xx) * 4;
    if (!a[i + 3]) continue;
    const mi = (Math.floor((y * mh) / H) * mw + Math.floor((xx * mw) / W)) * 4; // nearest (mask may be native)
    if (!md[mi]) continue; // greyscale mask loaded as RGBA: R = L
    const o = sw.get((a[i] << 16) | (a[i + 1] << 8) | a[i + 2]);
    if (o === undefined) continue;
    a[i] = o >> 16; a[i + 1] = (o >> 8) & 255; a[i + 2] = o & 255; // alpha unchanged
  }
  x.putImageData(d, 0, 0);
  tintCache.set(cacheKey, c);
  return c;
}

export const _tintCacheSize = () => tintCache.size;

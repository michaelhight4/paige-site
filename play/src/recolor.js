// Seeded recolor system: one base asset -> many tasteful variants. Pure functions, deterministic from (assetDef.id, seed).
// Data lives in data/palettes.json (see tools/build_palettes.py). Format doc: ASSET_FORMAT.md.
import { rnd, wpick } from './rng.js';
import { D } from './data.js';

// ---------- color math ----------
export function hexToRgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export function rgbToHex(r, g, b) { return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0;
  if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
  return [h, s, l];
}
export function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360; if (s === 0) { const v = l * 255; return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q, f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}
export const hexToHsl = h => rgbToHsl(...hexToRgb(h));
export const hslToHex = (h, s, l) => rgbToHex(...hslToRgb(h, s, l));
const hueDist = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
export function hashSeed(str) { let h = 2166136261; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h | 0; }

// ---------- palette access ----------
const PAL = (o) => (o && o.palettes) || D.palettes;
export function categoryOf(P, name) {
  if (P.categories[name]) return name;
  for (const k in P.categories) if ((P.categories[k].aliases || []).includes(name)) return k;
  return null;
}
const entry = (P, pid) => (P.palettes[pid] || []).map(e => ({ ...e, hsl: hexToHsl(e.hex) }));
const isNeutral = (P, e) => e.hsl[1] < P.rules.neutralSat;
const rmult = (P, e) => e.mult != null ? e.mult : (P.rarityMult[e.rarity] || 1);
const rrank = (P, r) => P.rarityOrder.indexOf(r);
const lum = hex => { const [r, g, b] = hexToRgb(hex).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export const contrast = (a, b) => Math.abs(lum(a) - lum(b)) ** 0.5; // perceptual-ish 0..1 lightness gap

export function clashes(P, hexA, hexB) {
  const a = hexToHsl(hexA), b = hexToHsl(hexB), R = P.rules;
  if (a[1] < R.clashMinSat || b[1] < R.clashMinSat) return false;
  const d = hueDist(a[0], b[0]); return d >= R.clashHue[0] && d <= R.clashHue[1];
}

// ---------- picking ----------
function wp(P, o, list) { return wpick(o, list, e => P.rarityWeight[e.rarity] ?? 1); }
function schemeOk(P, scheme, primary, e) {
  const R = P.rules, d = hueDist(primary.hsl[0], e.hsl[0]);
  switch (scheme) {
    case 'neutral': return isNeutral(P, e);
    case 'monochrome': return d <= 15 && Math.abs(primary.hsl[2] - e.hsl[2]) >= 0.12 && !isNeutral(P, e);
    case 'analogous': return !isNeutral(P, e) && d > 10 && d <= R.analogousMax;
    case 'complementary': return !isNeutral(P, e) && Math.abs(d - 180) <= R.complementaryTol;
  }
  return true;
}

function pickOnce(P, cat, o) {
  const R = P.rules, slots = cat.slots, pick = {}, sch = wpick(o, Object.keys(cat.schemes), k => cat.schemes[k]);
  let primaryId = null;
  for (const [sl, def] of Object.entries(slots)) if (def.role === 'primary') { primaryId = sl; break; }
  const prim = primaryId ? wp(P, o, entry(P, slots[primaryId].palette)) : null;
  if (primaryId) pick[primaryId] = prim;
  for (const [sl, def] of Object.entries(slots)) {
    if (sl === primaryId) continue;
    const list = def.palette ? entry(P, def.palette) : [];
    if (def.role === 'fixed') continue;
    if (def.optional != null && rnd(o) < def.optional) continue; // slot left at default
    if (def.role === 'neutral') {
      const c = prim ? list.filter(e => isNeutral(P, e) && contrast(e.hex, prim.hex) >= R.minNeutralContrast) : list;
      pick[sl] = wp(P, o, c.length ? c : list);
    } else if (def.role === 'accent' || def.role === 'secondary') {
      let c = prim ? list.filter(e => schemeOk(P, def.role === 'accent' ? sch : (sch === 'monochrome' ? 'analogous' : sch), prim, e) && !clashes(P, prim.hex, e.hex)) : list;
      if (!c.length && prim) c = list.filter(e => !clashes(P, prim.hex, e.hex));
      if (!c.length) c = list;
      pick[sl] = wp(P, o, c);
    } else if (def.role === 'metal' || def.role === 'jewel_metal') {
      pick[sl] = wp(P, o, list);
    }
  }
  // jewelry: gem follows metal pairing
  if (cat.gemPairs) {
    const metalSlot = Object.keys(slots).find(k => slots[k].role === 'jewel_metal'), metal = pick[metalSlot];
    const gemSlots = Object.keys(slots).filter(k => slots[k].role === 'gem');
    let main = null;
    for (const gs of gemSlots) {
      const list = entry(P, slots[gs].palette);
      if (slots[gs].follow) { const m = pick[slots[gs].follow]; const alt = list.filter(e => e.id === m.id || (hueDist(e.hsl[0], m.hsl[0]) < 25 && Math.abs(e.hsl[2] - m.hsl[2]) < 0.3) || e.id === 'diamond'); pick[gs] = alt.length && rnd(o) < 0.8 ? wp(P, o, alt) : m; continue; }
      const c = list.filter(e => (cat.gemPairs[e.id] || []).includes(metal.id));
      main = pick[gs] = wp(P, o, c.length ? c : list);
    }
  }
  return { pick, scheme: sch };
}

export function validate(P, catName, colors, picks) {
  const cat = P.categories[catName], R = P.rules, bad = [];
  for (const [a, b, min] of cat.contrast || []) if (colors[a] && colors[b] && contrast(colors[a], colors[b]) < min) bad.push(`contrast ${a}/${b}`);
  const ns = (cat.noClash || []).filter(k => colors[k]);
  for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++) if (clashes(P, colors[ns[i]], colors[ns[j]])) bad.push(`clash ${ns[i]}/${ns[j]}`);
  if (cat.gemPairs && picks) {
    const ms = Object.keys(cat.slots).find(k => cat.slots[k].role === 'jewel_metal'), gs = Object.keys(cat.slots).filter(k => cat.slots[k].role === 'gem' && !cat.slots[k].follow);
    for (const g of gs) if (picks[g] && picks[ms] && !(cat.gemPairs[picks[g].id] || []).includes(picks[ms].id)) bad.push(`gem/metal ${picks[g].id}/${picks[ms].id}`);
  }
  return bad;
}

function valueOf(P, cat, picks) {
  let m = 1;
  for (const [sl, w] of Object.entries(cat.valued || {})) if (picks[sl]) m *= 1 + w * (rmult(P, picks[sl]) - 1);
  return Math.round(Math.max(P.rules.valueMin, Math.min(P.rules.valueMax, m)) * 1000) / 1000;
}

// ---------- SVG render ----------
export function renderSvg(svg, colors, defaults = {}, slotVar = '--slot-') {
  const vars = Object.entries(colors).map(([k, v]) => `${slotVar}${k}:${v}`).join(';');
  // 1) per-element replace of the baked default (works when the SVG is used as <img>/data URI)
  let out = svg.replace(/<[^>]*data-slot="([a-z0-9_-]+)"[^>]*>/gi, (tag, slot) => {
    const nv = colors[slot], dv = defaults[slot]; if (!nv || !dv) return tag;
    return tag.split(new RegExp(dv.replace('#', '#?'), 'gi')).join(nv).replace(new RegExp(`(var\\(${slotVar}${slot},)[^)]*\\)`, 'g'), `$1${nv})`);
  });
  // 2) root CSS vars (works when inlined; lets the UI re-tint live)
  out = out.replace(/<svg\b([^>]*)>/i, (m, attrs) => /style="/.test(attrs) ? `<svg${attrs.replace(/style="/, `style="${vars};`)}>` : `<svg${attrs} style="${vars}">`);
  return out;
}

// ---------- raster render (pure pixel core + canvas wrapper) ----------
// base/target are [h,s,l]. strength 0..1 scales the effect (mask weight multiplies it).
export function recolorPixels(img, mask, base, target, opts = {}) {
  const px = img.data, mk = mask && mask.data, ch = opts.channel || 'luma', st = opts.strength ?? 1, sel = opts.select;
  const dh = target[0] - base[0], sr = base[1] > 0.02 ? target[1] / base[1] : 1, dl = target[2] - base[2];
  for (let i = 0; i < px.length; i += 4) {
    if (!px[i + 3]) continue;
    let w = 1;
    if (mk) { const k = ch === 'r' ? mk[i] : ch === 'g' ? mk[i + 1] : ch === 'b' ? mk[i + 2] : ch === 'a' ? mk[i + 3] : (mk[i] * .3 + mk[i + 1] * .59 + mk[i + 2] * .11); w = k / 255; }
    const [h, s, l] = rgbToHsl(px[i], px[i + 1], px[i + 2]);
    if (sel) { if (s < (sel.minSat ?? 0.25) || l < (sel.minL ?? 0.08) || l > (sel.maxL ?? 0.95)) continue; const [a, b] = sel.hue; const inR = a <= b ? (h >= a && h <= b) : (h >= a || h <= b); if (!inR) continue; }
    if (w <= 0) continue; w *= st;
    const nh = h + dh * w, ns = Math.max(0, Math.min(1, s * (1 + (sr - 1) * w))), nl = Math.max(0, Math.min(1, l + dl * 0.6 * w * (1 - Math.abs(l - 0.5))));
    const [r, g, b2] = hslToRgb(nh, ns, nl); px[i] = r; px[i + 1] = g; px[i + 2] = b2;
  }
  return img;
}
// Browser only: image = HTMLImageElement/ImageBitmap, masks = {slot: image}. Returns a canvas.
export function renderRaster(image, rasterDef, colors, masks = {}, doc = (typeof document !== 'undefined' ? document : null)) {
  if (!doc) throw new Error('renderRaster needs a DOM canvas');
  const cv = doc.createElement('canvas'); cv.width = image.width; cv.height = image.height; const ctx = cv.getContext('2d'); ctx.drawImage(image, 0, 0);
  let id = ctx.getImageData(0, 0, cv.width, cv.height);
  for (const [slot, sd] of Object.entries(rasterDef.slots || {})) {
    if (!colors[slot]) continue; let md = null;
    if (masks[slot]) { const mc = doc.createElement('canvas'); mc.width = cv.width; mc.height = cv.height; const mx = mc.getContext('2d'); mx.drawImage(masks[slot], 0, 0, cv.width, cv.height); md = mx.getImageData(0, 0, cv.width, cv.height); }
    recolorPixels(id, md, hexToHsl(sd.base), hexToHsl(colors[slot]), { channel: sd.channel, select: sd.select, strength: sd.strength });
  }
  ctx.putImageData(id, 0, 0); return cv;
}

// ---------- main API ----------
// assetDef: manifest entry {id, category, slots[], defaults{}, rarity?, name?, raster?}
export function recolor(assetDef, seed, opts = {}) {
  const P = PAL(opts), catName = categoryOf(P, assetDef.category), defaults = { ...P.slotDefaults, ...(assetDef.defaults || {}) };
  const slotsOf = assetDef.slots || Object.keys(defaults);
  const o = { rs: hashSeed(assetDef.id + ':' + seed) };
  let colors = { ...defaults }, picks = {}, names = {}, scheme = 'default', valueMult = 1, rarity = 'common', ok = true;
  if (catName) {
    const cat = P.categories[catName]; let r = null;
    for (let t = 0; t < P.rules.maxTries; t++) {
      const x = pickOnce(P, cat, o), c = {}; for (const k in x.pick) c[k] = x.pick[k].hex;
      if (!validate(P, catName, { ...defaults, ...c }, x.pick).length) { r = x; break; }
    }
    if (r) {
      picks = r.pick; scheme = r.scheme;
      for (const k in picks) if (slotsOf.includes(k)) { colors[k] = picks[k].hex; names[k] = picks[k].name; }
      const used = {}; for (const k in picks) if (slotsOf.includes(k)) used[k] = picks[k];
      valueMult = valueOf(P, cat, used);
      for (const k in used) if (rrank(P, used[k].rarity) > rrank(P, rarity)) rarity = used[k].rarity;
    } else ok = false; // fell back to the base colors
    for (const k of P.neverRecolor) if (slotsOf.includes(k) || defaults[k]) colors[k] = defaults[k];
  }
  for (const k of Object.keys(colors)) if (!slotsOf.includes(k)) delete colors[k];
  const id = `${assetDef.id}~${(hashSeed(JSON.stringify(colors)) >>> 0).toString(36)}`;
  const lead = names.body || names.fabric || names.stone || names.metal || '';
  const v = {
    id, assetId: assetDef.id, seed, category: catName || assetDef.category, scheme, colors, names, rarity, valueMult, fallback: !ok,
    label: [lead, assetDef.name].filter(Boolean).join(' ') || assetDef.id,
    render(svg) { return renderSvg(svg, colors, defaults); },
    renderRaster(image, masks, doc) { return renderRaster(image, assetDef.raster || {}, colors, masks, doc); },
    toJSON() { return { assetId: assetDef.id, seed }; }, // saves only need (assetId, seed): variants regenerate identically
  };
  return v;
}
// n distinct variants for listing generation. rng is a game-state-like {rs}; seeds drawn from it.
export function listingVariants(assetDef, o, n, opts = {}) {
  const out = [], seen = new Set();
  for (let t = 0; out.length < n && t < n * 6; t++) { const v = recolor(assetDef, Math.floor(rnd(o) * 1e9), opts); if (seen.has(v.id)) continue; seen.add(v.id); out.push(v); }
  return out;
}
// Price of a listing with a variant: base price x rarity multiplier.
export const variantPrice = (basePrice, v) => Math.round(basePrice * (v ? v.valueMult : 1));

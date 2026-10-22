// Layered character system. A character is a small list of parts + colors (saved in s.char); the picture is composed from
// recolorable 128x128 pixel layers (assets/art/characters/<age>/<build|all>/<layerId>.svg, schema in data/character_layers.json).
// Buying clothing/jewelry unlocks layers (derived from owned slice assets, nothing extra to save). No engine RNG is consumed here.
import { D } from './data.js';

const CL = () => D.charLayers;
export const ageGroup = (age) => { const a = Math.floor(age); return (CL().ages.find((g) => a >= g.min && a <= g.max) || CL().ages[3]).id; };
const hash = (...xs) => { let h = 2166136261 >>> 0; for (const x of xs) for (const ch of String(x)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995) >>> 0; return (h ^ (h >>> 15)) >>> 0; };
const pickH = (arr, ...k) => arr[hash(...k) % arr.length];
export const layerDef = (slot, id) => ((CL().layers[slot] || []).find((l) => l.id === id)) || null;
export const SLOT_LABELS = { hair: 'Hair', eyes: 'Eyes', facial: 'Facial hair', glasses: 'Glasses', top: 'Top', bottom: 'Bottoms', shoes: 'Shoes', hat: 'Hat', neck: 'Necklace', ears: 'Earrings', wrist: 'Wrist', hand: 'Ring' };
export const EDIT_SLOTS = ['hair', 'facial', 'glasses', 'top', 'bottom', 'shoes', 'hat', 'neck', 'ears', 'wrist', 'hand'];
export const COLOR_KEY = { hair: 'hair', facial: 'hair', glasses: 'metal', top: 'fabric', bottom: 'fabric', shoes: 'fabric', hat: 'fabric', neck: 'metal', ears: 'metal', wrist: 'metal', hand: 'gem' };
// A part: {id, c: {slot: hex}}. newChar builds a random-but-deterministic one from a seed key.
export function newChar(key, opts = {}) {
  const L = CL(), p = {};
  const mk = (slot, id, c) => { p[slot] = id ? { id, c: c || {} } : null; };
  mk('hair', pickH(['buzz', 'short', 'side_part', 'spiky', 'long', 'bob', 'ponytail', 'curly', 'bun', 'afro', 'braids', 'short', 'short'], key, 'hs'), { hair: opts.hair || pickH(L.hairColors, key, 'hc') });
  mk('top', L.defaults.top, { fabric: pickH(L.clothColors, key, 'tc'), trim: '#f3efe4' }); mk('bottom', L.defaults.bottom, { fabric: pickH(['#4a6fa5', '#222233', '#777788'], key, 'bc'), trim: '#f3efe4' }); mk('shoes', L.defaults.shoes, { fabric: pickH(L.clothColors, key, 'sc'), trim: '#f3efe4' });
  for (const s of ['facial', 'glasses', 'hat', 'neck', 'ears', 'wrist', 'hand']) p[s] = null;
  return { v: 1, skin: opts.skin || pickH(L.skins, key, 'sk'), eye: opts.eye || pickH(L.eyeColors, key, 'ey'), build: opts.build || pickH(L.builds, key, 'bd'), parts: p };
}
// Character creation: build a look from player choices {skin, eye, build, hair (layer id), hairColor, facial (layer id|null)}. Invalid values fall back to the seeded defaults.
export function createChar(key, o = {}) {
  const L = CL(), c = newChar(key, { skin: L.skins.includes(o.skin) ? o.skin : undefined, eye: L.eyeColors.includes(o.eye) ? o.eye : undefined, build: L.builds.includes(o.build) ? o.build : undefined, hair: L.hairColors.includes(o.hairColor) ? o.hairColor : undefined });
  const hc = c.parts.hair.c.hair;
  if (o.hair && layerDef('hair', o.hair)) c.parts.hair = { id: o.hair, c: { hair: hc } };
  else if (o.hair === null || o.hair === 'none') c.parts.hair = null;
  if (o.facial && layerDef('facial', o.facial)) c.parts.facial = { id: o.facial, c: { hair: hc } };
  return c;
}
// Children inherit hair/eye color from either parent and a skin tone between theirs.
export function inherit(key, parents) {
  const L = CL(), ps = parents.filter(Boolean); if (!ps.length) return newChar(key);
  const a = ps[hash(key, 'pa') % ps.length], b = ps[hash(key, 'pb') % ps.length];
  const sa = L.skins.indexOf(a.skin), sb = L.skins.indexOf(b.skin), si = Math.max(0, Math.min(L.skins.length - 1, Math.round((sa + sb) / 2 + (hash(key, 'sj') % 3) - 1)));
  const hc = (hash(key, 'hh') % 2 ? a : b).parts.hair?.c?.hair || undefined, ec = (hash(key, 'ee') % 2 ? a : b).eye;
  return newChar(key, { skin: L.skins[si], hair: hc, eye: ec });
}
// Layers the player may use: free ones + those unlocked by owned clothing/jewelry (s.sl.assets) + purchased pieces.
export function unlockedIds(s) {
  const L = CL(), ids = new Set(L.free), sl = s.sl && s.sl.assets;
  if (sl) { for (const a of sl.clothing || []) { const m = L.clothingMap[a.tpl]; if (m) ids.add(m); } for (const a of sl.jewelry || []) { const m = L.jewelryMap[a.tpl]; if (m) ids.add(m); } }
  for (const slot of Object.keys(L.layers)) for (const l of L.layers[slot]) if (l.free) ids.add(l.id);
  return ids;
}
// Colors from the owned item that unlocked a layer (so a bought red blazer starts out red).
export function ownedColors(s, layerId) {
  const L = CL(), sl = s.sl && s.sl.assets; if (!sl) return null;
  for (const cat of ['clothing', 'jewelry']) for (const a of sl[cat] || []) { const m = (cat === 'clothing' ? L.clothingMap : L.jewelryMap)[a.tpl]; if (m === layerId && a.art && a.vseed != null) return { art: a.art, vseed: a.vseed }; }
  return null;
}
export function ensure(s) { if (!s.char) s.char = newChar('me' + s.rs + s.name); return s.char; }
export function equip(s, slot, id, colors) {
  const c = ensure(s), age = Math.floor(s.age);
  if (!EDIT_SLOTS.includes(slot)) return { ok: false, msg: 'Unknown slot.' };
  if (id == null) { c.parts[slot] = null; return { ok: true, msg: 'Removed.' }; }
  const def = layerDef(slot, id); if (!def) return { ok: false, msg: 'Unknown layer.' };
  if (!unlockedIds(s).has(id)) return { ok: false, msg: 'Buy this item first.' };
  if (age < def.minAge) return { ok: false, msg: `Unlocks at age ${def.minAge}.` };
  const prev = c.parts[slot], cols = { ...Object.fromEntries(def.slots.map((k) => [k, (colors && colors[k]) || (prev && prev.c && prev.c[k]) || def.defaults[k]])) };
  c.parts[slot] = { id, c: cols }; return { ok: true, msg: 'Changed.' };
}
export function recolor(s, slot, key, hex) {
  const c = ensure(s); if (key === 'skin') { if (!CL().skins.includes(hex)) return { ok: false, msg: 'Bad color.' }; c.skin = hex; return { ok: true }; }
  if (key === 'eye') { c.eye = hex; return { ok: true }; } if (key === 'build') { if (!CL().builds.includes(hex)) return { ok: false, msg: 'Bad build.' }; c.build = hex; return { ok: true }; }
  const p = c.parts[slot]; if (!p) return { ok: false, msg: 'Nothing equipped.' }; p.c[key] = hex; return { ok: true };
}
// ---- composition (pure; getSvg(path) returns SVG text or null) ----
const grey = (hex, t) => { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255, m = (r + g + b) / 3 * 0.4 + 150 * 0.6 + 20; const f = (x) => Math.round(x + (m - x) * t).toString(16).padStart(2, '0'); return '#' + f(r) + f(g) + f(b); };
export function layerPaths(char, age) {
  const L = CL(), ag = ageGroup(age), out = [];
  for (const slot of L.order) {
    let id = null, cols = {};
    if (slot === 'body') { id = 'base'; cols = { skin: char.skin }; } else if (slot === 'eyes') { id = 'eyes'; cols = { eye: char.eye }; }
    else { const p = char.parts[slot]; if (!p) continue; const def = layerDef(slot, p.id); if (!def || age < def.minAge) continue; id = p.id; cols = { ...p.c }; if (slot === 'hair' || slot === 'facial') { if (age >= 55 && cols.hair) cols.hair = grey(cols.hair, Math.min(1, (age - 55) / 20)); } }
    const def = layerDef(slot, id); if (!def) continue;
    out.push({ slot, id, cols, path: def.file.replace('{age}', ag).replace('{build}', def.perBuild ? char.build : 'all') });
  }
  return out;
}
export function compose(char, age, getSvg, opts = {}) {
  const parts = layerPaths(char, age).map((l) => { const t = getSvg(l.path); if (!t) return ''; const inner = t.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, ''); const st = Object.entries(l.cols).map(([k, v]) => `--slot-${k}:${v}`).join(';'); return `<g data-layer="${l.slot}:${l.id}" style="${st}">${inner}</g>`; });
  const sh = '<ellipse cx="64" cy="125" rx="26" ry="3" fill="#000" fill-opacity=".18"/>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${opts.crop === 'head' ? `28 ${{ baby: 52, child: 24, teen: 2, adult: 0, elder: 0 }[ageGroup(age)]} 72 72` : '0 0 128 128'}" width="${opts.size || 128}" height="${opts.size || 128}" shape-rendering="crispEdges" class="char">${opts.noShadow ? '' : sh}${parts.join('')}</svg>`;
}
// Shop thumbnail: one layer worn on a neutral adult body (defaults fill the other garment slots). Pure; returns a composeSprite spec.
export function previewSpec(slot, id, cols) {
  const N = { fabric: '#8e97a8', trim: '#f3efe4' }, parts = { top: { id: 'tshirt', c: { ...N } }, bottom: { id: 'jeans', c: { fabric: '#4a6fa5', trim: '#f3efe4' } }, shoes: { id: 'sneakers', c: { ...N } } };
  if (slot === 'hat' || slot === 'ears') parts.hair = { id: 'short', c: { hair: '#5a3a22' } };
  parts[slot] = { id, c: { ...cols } };
  const char = { v: 1, skin: '#e8b98d', eye: '#3b6fb0', build: 'avg', parts };
  return { char, age: 30, layers: layerPaths(char, 30), base: CL().base, crop: ['hat', 'ears', 'neck'].includes(slot) ? 'head' : ['shoes', 'bottom'].includes(slot) ? 'legs' : ['wrist', 'hand'].includes(slot) ? 'torso' : null };
}
export const saveSize = (char) => JSON.stringify(char).length;

// Look of any person (stored on first use, small). Children inherit from the player and the other parent.
export function lookOf(s, p) {
  if (p === 'me' || p === s) return ensure(s);
  if (!p.look) {
    if (p.rel === 'child') { const other = s.people.find((q) => q.id === p.otherParent); p.look = inherit('p' + p.id + s.rs, [ensure(s), other && other.look]); }
    else p.look = newChar('p' + p.id + s.rs, {});
    p.look.parts.hat = null;
  }
  return p.look;
}
export function appearance(s) {
  const c = ensure(s), age = Math.floor(s.age), L = CL(), own = unlockedIds(s);
  return { age, group: ageGroup(age), char: c, layers: layerPaths(c, age), base: CL().base, skins: L.skins, eyeColors: L.eyeColors, hairColors: L.hairColors, clothColors: L.clothColors, builds: L.builds, slots: EDIT_SLOTS.map((slot) => ({ slot, label: SLOT_LABELS[slot], colorKey: COLOR_KEY[slot], current: c.parts[slot] ? c.parts[slot].id : null, colors: c.parts[slot] ? c.parts[slot].c : null,
    options: (L.layers[slot] || []).map((l) => ({ id: l.id, name: l.name, owned: own.has(l.id), minAge: l.minAge, locked: !own.has(l.id) || age < l.minAge, reason: !own.has(l.id) ? 'Buy it in a shop (Clothing / Jewelry) to unlock' : age < l.minAge ? `Unlocks at age ${l.minAge}` : '' })) })) };
}

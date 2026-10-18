// Bridge between lifesim state and Game dev's careers/assets/shopping slice (src/slice/*, data/slice/*).
// The slice keeps its own JSON state in s.sl (saved with the game). Before every slice call we PULL shared fields
// (cash, debt, age, stats, education) from lifesim into s.sl, and afterwards PUSH them back. See MERGE.md.
import * as H from './slice/index.js';
import { D } from './data.js';
import { log } from './core.js';
import * as R from './recolor.js';
import { voice } from './voice.js';

let DATA = null;
export function sliceData() {
  if (DATA) return DATA;
  DATA = { terms: D.sTerms, occ: D.sOcc, assets: D.sAssets, hostEconomy: true };
  DATA.decorate = (a, st) => { // called by slice makeAsset: pick art + a deterministic recolor variant + rare-color value multiplier
    const art = artFor(a); if (!art) return;
    const def = artDef(art); if (!def) return;
    a.art = art; a.vseed = Math.floor(H.rand(st) * 1e9);
    a.cmult = R.recolor(def, a.vseed).valueMult;
  };
  return DATA;
}
const AM = () => D.artMap, MAN = () => D.artManifest;
let defIdx = null;
export function artDef(id) { if (!defIdx || defIdx.n !== MAN().assets.length) { defIdx = { n: MAN().assets.length, m: Object.fromEntries(MAN().assets.map((a) => [a.id, a])) }; } return defIdx.m[id]; }
export function artFor(a) {
  const m = AM(); if (!m || !m.artCategory[a.cat]) return null;
  const wreck = /^wreck_/.test(a.tpl) || a.wreck, key = a.tpl.replace(/^wreck_/, '');
  let id = (m.map[a.cat] || {})[key] || m.default[a.cat];
  if (wreck && a.cat === 'car') id = m.wreckArt[id] || m.wreckArt.default;
  return artDef(id) ? id : m.default[a.cat];
}
export const variantOf = (a) => (a.art && a.vseed != null ? R.recolor(artDef(a.art), a.vseed) : null);
// SVG text cache (browser): fetched lazily; render() shows swatches until it arrives.
const svgCache = {};
export function svgFor(a) {
  const v = variantOf(a); if (!v) return null; const def = artDef(a.art);
  if (svgCache[a.art]) return typeof svgCache[a.art] === 'string' ? v.render(svgCache[a.art]) : null;
  if (typeof fetch === 'function' && typeof window !== 'undefined') { svgCache[a.art] = 0; fetch(new URL('../assets/art/' + def.file, import.meta.url)).then((r) => r.text()).then((t) => { svgCache[a.art] = t; }).catch(() => {}); }
  return null;
}

const EDU_RANK = ['none', 'high_school', 'community_college', 'university', 'graduate_school'];
export function slice(s) {
  if (!s.sl) { const d = sliceData(); s.sl = H.newState(d, { seed: (s.rs ^ 0x51ce) | 0, age: Math.floor(s.age), name: s.name }); s.sl.stats = { health: s.stats.health, happiness: s.stats.happiness, smarts: s.stats.smarts, looks: s.stats.looks }; }
  if (!s.sl.assets.clothing) s.sl.assets.clothing = [];
  return s.sl;
}
export function pull(s) {
  const sl = slice(s);
  sl.cash = s.cash; sl.debt = s.debt; sl.age = Math.floor(s.age); sl.name = s.name; sl.gender = s.gender;
  for (const k of ['health', 'happiness', 'smarts', 'looks']) sl.stats[k] = s.stats[k];
  const want = s.edu >= 3 ? 'graduate_school' : s.edu >= 2 ? 'university' : s.edu >= 1 ? 'high_school' : 'none';
  if (EDU_RANK.indexOf(sl.edu.level) < EDU_RANK.indexOf(want)) sl.edu.level = want;
  if (!s.job && sl.job && (sl.job.mirrored)) sl.job = null; // fired/laid off/quit on the lifesim side
  return sl;
}
export function push(s) {
  const sl = s.sl; s.cash = sl.cash; s.debt = sl.debt;
  for (const k of ['health', 'happiness', 'smarts', 'looks']) s.stats[k] = Math.max(0, Math.min(100, sl.stats[k]));
  if (sl.edu.level === 'university') s.edu = Math.max(s.edu, 2);
  if (Object.keys(sl.edu.degrees).some((k) => /school|graduate/.test(k))) s.edu = Math.max(s.edu, 3);
  mirrorJob(s);
}
// the slice job becomes a one-level synthetic career in D.careers so pay/promotions/obits keep working
export function mirrorJob(s) {
  const sl = s.sl; if (!sl) return;
  if (sl.job) {
    const id = 'sl:' + sl.job.id; let c = D.careers.find((x) => x.id === id);
    if (!c) { c = { id, name: sl.job.title, sector: null, levels: [[sl.job.title, sl.job.wage]], slice: true }; D.careers.push(c); }
    c.name = sl.job.title; c.levels[0] = [sl.job.title, sl.job.wage];
    if (!s.job || s.job.id !== id) s.job = { id, level: 0, perf: 60, yrs: 0, lvlYrs: 0 };
    sl.job.mirrored = true;
  } else if (s.job && String(s.job.id).startsWith('sl:')) s.job = null;
}
// call after load/new game so D.careers has the synthetic career before the UI renders
export function ensure(s) { if (s.sl) mirrorJob(s); }
export function call(s, fn) { const sl = pull(s), r = fn(sliceData(), sl); push(s); return r; }
// per-tick: restoration projects progress monthly
export function tick(s, dt) { if (!s.sl) return; const sl = pull(s), out = []; H.progressProjects(sliceData(), sl, 12 * dt, out); push(s); for (const m of out) log(s, voice(m), 'asset'); }
// yearly: salary is paid by lifesim's own tick, so the slice's wage credit is reversed; the rest (part-time, school, upkeep, markets) stays
export function yearTick(s) {
  if (!s.sl) return; const sl = pull(s), d = sliceData(), wage = sl.job ? sl.job.wage : 0, out = [];
  out.push(...H.occupationYear(d, sl)); sl.cash -= wage; H.assetsYear(d, sl, out); push(s);
  for (const m of out) log(s, voice(m), 'asset');
}
const lc = (m) => String(m).replace(/^([A-Z])/, (x) => x.toLowerCase()).replace(/!$/, '.');
// wealth the slice holds beyond cash: assets + investments + zoo - loans
export function wealth(s) { if (!s.sl) return 0; const f = H.financesCard(sliceData(), pull(s)); return f.net_worth - f.cash + f.debt; }
export const assetCount = (s) => (s.sl ? Object.values(s.sl.assets).reduce((a, l) => a + l.length, 0) : 0);
export const jobTitle = (s) => (s.sl && s.sl.job ? s.sl.job.title : null);
export { H };

// Grant an owned asset directly (premium rewards): template id from the slice catalog, scaled so its market value is ~target.
export function grantAsset(s, tplId, target) {
  const sl = pull(s), d = sliceData(), cat = Object.keys(d.assets.catalogs).find((c) => d.assets.catalogs[c].some((t) => t.id === tplId)) || 'property';
  const t = d.assets.catalogs[cat].find((x) => x.id === tplId), pc = cat === 'property' ? 'property' : cat;
  const a = { uid: 'a' + sl.nextId++, cat: pc, tpl: t.id, name: t.name, base: t.base, age: 0, cond: 100, rarity: 1, classic: false, wreck: false, kind: t.kind, beds: t.beds, baths: t.baths, sqft: t.sqft, acres: t.acres, amenities: [], upkeep_mult: 1, tune: 0, loan: null, paid: 0, premium: true };
  if (pc === 'property') a.address = `1 Windfall Lane, ${s.city}`;
  d.decorate(a, sl); a.cmult = 1;
  let v = H.assetValue(d, a); if (v > 0 && target) { a.base = Math.round(a.base * target / v); }
  for (const k of Object.keys(a)) if (a[k] === undefined) delete a[k];
  sl.assets[pc].push(a); push(s); return a;
}

// ---- inheritance: owned objects move as-is (tpl/art/vseed/cond/age), loans travel with the asset ----
export function inventory(s) {
  if (!s.sl) return []; const d = sliceData(), out = [];
  for (const cat of Object.keys(s.sl.assets)) for (const a of s.sl.assets[cat]) out.push({ a, cat, value: Math.max(0, H.assetValue(d, a) - (a.loan ? Math.round(a.loan.balance) : 0)) });
  return out;
}
export function grant(s, items) { // items: slice asset objects; gets fresh uids in the new owner's slice
  const sl = slice(s); const out = [];
  for (const a of items) { const c = JSON.parse(JSON.stringify(a)); c.uid = 'a' + sl.nextUid++; c.inherited = (c.inherited || 0) + 1; c.restoring = c.restoring || null; (sl.assets[c.cat] = sl.assets[c.cat] || []).push(c); out.push(c); }
  return out;
}

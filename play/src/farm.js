// Farms and ranches: land bought by the acre (price scales with acres and location), buildings with quality and +4/+8/+16/+30 upgrade steps, crops or animals chosen at setup,
// seasons / weather / disease risk, hired workers, selling to distribution companies (price offers and contracts) and itemised yearly finances. State: s.farm.
import { rnd, chance, clamp, gauss } from './rng.js';
import { log, earn, spend } from './core.js';

const R = Math.round, age = (s) => Math.floor(s.age);
const money = (n) => '$' + R(n).toLocaleString('en-US');
const hashStr = (str) => { let h = 2166136261; for (const c of String(str)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const lcg = (seed) => { let t = seed >>> 0; return () => { t += 0x6d2b79f5; let x = Math.imul(t ^ (t >>> 15), 1 | t); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; };
export const MIN_AGE = 18, MIN_ACRES = 10, MAX_ACRES = 5000;
export const SEASONS = [{ id: 'spring', name: 'Spring', icon: '🌱', job: 'Planting' }, { id: 'summer', name: 'Summer', icon: '☀️', job: 'Growing' }, { id: 'fall', name: 'Fall', icon: '🍂', job: 'Harvest' }, { id: 'winter', name: 'Winter', icon: '❄️', job: 'Repairs & rest' }];
// location: price per acre, soil, weather odds (relative), disease multiplier, livestock/crop affinity
export const LOCATIONS = [
  { id: 'plains', name: 'Heartland Plains', icon: '🌾', ppa: 4200, soil: 1.0, live: 1.0, drought: 1, flood: 0.6, frost: 0.8, hail: 1.3, disease: 1, blurb: 'Flat, fertile and well connected.' },
  { id: 'valley', name: 'River Valley', icon: '🏞️', ppa: 9500, soil: 1.2, live: 1.05, drought: 0.4, flood: 1.6, frost: 0.8, hail: 0.6, disease: 1.1, blurb: 'Rich bottomland that sometimes floods.' },
  { id: 'coast', name: 'Coastal Bluffs', icon: '🌊', ppa: 14500, soil: 1.05, live: 0.95, drought: 0.4, flood: 1.0, frost: 0.4, hail: 0.8, disease: 1.2, blurb: 'Mild climate, storms and the priciest land.' },
  { id: 'mountain', name: 'Mountain Pasture', icon: '⛰️', ppa: 2400, soil: 0.8, live: 1.1, drought: 0.8, flood: 0.5, frost: 1.6, hail: 1, disease: 0.8, blurb: 'Cheap, cold, good grazing.' },
  { id: 'desert', name: 'Desert Irrigated', icon: '🏜️', ppa: 3000, soil: 0.9, live: 0.85, drought: 2, flood: 0.2, frost: 0.4, hail: 0.5, disease: 0.7, blurb: 'Sun and irrigation; drought bites.' },
  { id: 'orchard', name: 'Orchard Country', icon: '🍎', ppa: 11000, soil: 1.1, live: 0.9, drought: 0.8, flood: 0.7, frost: 1.2, hail: 1.1, disease: 1.1, blurb: 'Famous for fruit and vegetables.' },
  { id: 'range', name: 'High Plains Ranch Country', icon: '🤠', ppa: 1900, soil: 0.7, live: 1.15, drought: 1.5, flood: 0.3, frost: 1, hail: 1, disease: 0.9, blurb: 'Wide open range for cattle and sheep.' },
];
// products: crops (yield units/acre) or animals (head sold per acre). price = base spot per unit; cost = seed/feed per acre; workers per 100 acres; risk = disease base
// seed/feed cost per acre is derived so a sound operation earns roughly a 15-25% margin after labour, fuel, upkeep and land tax
const P = (id, name, icon, kind, unit, yld, price, _c, wk, risk, fit, setup, wth) => ({ id, name, icon, kind, unit, yld, price, cost: Math.max(R(yld * price * 0.2), R(yld * price * 0.72 - (wk * 340 + 75 + 17))), wk, risk, fit, setup, wth });
export const PRODUCTS = [
  P('corn', 'Corn', '🌽', 'crop', 'bushels', 160, 4.8, 540, 0.8, 0.07, { plains: 1.15, valley: 1.1 }, 180, { drought: 1.3, flood: 0.7, frost: 0.5, hail: 1 }),
  P('wheat', 'Wheat', '🌾', 'crop', 'bushels', 58, 7.2, 260, 0.7, 0.06, { plains: 1.15, mountain: 1.05 }, 120, { drought: 1.1, flood: 0.6, frost: 0.8, hail: 1 }),
  P('soy', 'Soybeans', '🫘', 'crop', 'bushels', 52, 12.5, 330, 0.7, 0.07, { plains: 1.1, valley: 1.1 }, 140, { drought: 1.1, flood: 0.8, frost: 0.4, hail: 0.9 }),
  P('cotton', 'Cotton', '☁️', 'crop', 'bales', 1.7, 380, 430, 0.9, 0.09, { desert: 1.2, plains: 1 }, 220, { drought: 0.8, flood: 0.8, frost: 1, hail: 1.1 }),
  P('veg', 'Vegetables', '🥕', 'crop', 'tons', 9, 520, 2900, 4, 0.1, { orchard: 1.2, valley: 1.15, coast: 1.1 }, 900, { drought: 0.9, flood: 1, frost: 1.2, hail: 1.1 }),
  P('fruit', 'Orchard fruit', '🍎', 'crop', 'tons', 8, 880, 4300, 3.2, 0.1, { orchard: 1.3, coast: 1.1 }, 1500, { drought: 0.7, flood: 0.7, frost: 1.6, hail: 1.3 }),
  P('beef', 'Beef cattle', '🐄', 'animal', 'head', 0.34, 1650, 690, 0.6, 0.08, { range: 1.3, mountain: 1.15, plains: 1.05 }, 800, { drought: 1.2, flood: 0.3, frost: 0.7, hail: 0.2 }),
  P('dairy', 'Dairy cows', '🥛', 'animal', 'cans of milk', 1100, 38, 25000, 5, 0.1, { valley: 1.2, mountain: 1.1, plains: 1.05 }, 2600, { drought: 0.7, flood: 0.5, frost: 0.6, hail: 0.2 }),
  P('hogs', 'Hogs', '🐖', 'animal', 'head', 4.5, 230, 700, 1.4, 0.12, { plains: 1.15, valley: 1.05 }, 600, { drought: 0.5, flood: 0.4, frost: 0.4, hail: 0.1 }),
  P('poultry', 'Poultry & eggs', '🐔', 'animal', 'crates', 600, 52, 24000, 3.2, 0.13, { valley: 1.1, plains: 1.1, coast: 1.05 }, 1300, { drought: 0.3, flood: 0.4, frost: 0.4, hail: 0.1 }),
  P('sheep', 'Sheep & wool', '🐑', 'animal', 'head', 1.6, 210, 120, 0.5, 0.08, { mountain: 1.25, range: 1.2 }, 220, { drought: 1, flood: 0.3, frost: 0.9, hail: 0.1 }),
];
export const productDef = (id) => PRODUCTS.find((x) => x.id === id);
export const locDef = (id) => LOCATIONS.find((x) => x.id === id);
export const BUYERS = [
  { id: 'greenfield', name: 'Greenfield Foods', icon: '🏭', takes: ['corn', 'wheat', 'soy', 'cotton'], mult: 1.0 }, { id: 'harvest', name: 'Harvest Moon Distribution', icon: '🚚', takes: ['corn', 'wheat', 'soy', 'veg', 'fruit'], mult: 1.04 },
  { id: 'prairie', name: 'Prairie Grain Co-op', icon: '🌾', takes: ['corn', 'wheat', 'soy'], mult: 0.97 }, { id: 'meatworks', name: 'Ironwood Meatworks', icon: '🥩', takes: ['beef', 'hogs', 'sheep'], mult: 1.02 },
  { id: 'dairycrest', name: 'Dairy Crest Cooperative', icon: '🧈', takes: ['dairy', 'poultry'], mult: 1.0 }, { id: 'freshroute', name: 'FreshRoute Grocers', icon: '🛒', takes: ['veg', 'fruit', 'poultry', 'dairy'], mult: 1.08 },
  { id: 'fibermill', name: 'Silverline Fibre Mills', icon: '🧵', takes: ['cotton', 'sheep'], mult: 1.05 }, { id: 'exporter', name: 'Blue Anchor Exporters', icon: '🚢', takes: ['corn', 'wheat', 'soy', 'beef', 'cotton'], mult: 1.1 },
];
export const buyerDef = (id) => BUYERS.find((x) => x.id === id);
export const ROLES = [{ id: 'hand', name: 'Farm hand', icon: '🧑‍🌾', base: 34000, acres: 120 }, { id: 'foreman', name: 'Foreman', icon: '🧢', base: 52000 }, { id: 'mechanic', name: 'Mechanic', icon: '🔧', base: 46000 }, { id: 'specialist', name: 'Agronomist / vet', icon: '🩺', base: 58000 }];
export const STEPS = [{ pts: 4, mult: 1 }, { pts: 8, mult: 3 }, { pts: 16, mult: 8 }, { pts: 30, mult: 22 }];
export const FARM_NAMES = ['Willow Creek Farm', 'Red Barn Acres', 'Sunrise Ridge Ranch', 'Cedar Hollow Farm', 'Golden Furrow Farm', 'Lone Star Ranch', 'Meadowbrook Farm'];

export const need = (s) => s.farm || null;
const unit = (f) => 6000 + f.acres * 25;
export const upgradeCost = (f, pts) => R(unit(f) * (STEPS.find((x) => x.pts === pts) || STEPS[0]).mult);
export function landPrice(locId, acres, year = 0) { const l = locDef(locId); if (!l) return 0; const ppa = l.ppa * (acres < 40 ? 1.15 : acres > 640 ? 0.9 : 1) * landIndex(locId, year); return R(ppa * acres); }
const landIndex = (locId, year) => { let v = 1; for (let y = 0; y < Math.max(0, Math.min(60, year)); y++) v *= 1 + (lcg(hashStr('land|' + locId + '|' + y))() - 0.45) * 0.08; return v; };
const ppaNow = (s, f) => { const l = locDef(f.loc); return l.ppa * landIndex(f.loc, age(s) - 18); };
export function quote(s, o = {}) { const f = { acres: clamp(R(o.acres || 100), MIN_ACRES, MAX_ACRES) }, loc = o.loc || 'plains', pr = productDef(o.product) || PRODUCTS[0], y = age(s) - 18; const land = landPrice(loc, f.acres, y), build = R(15000 + f.acres * 30), setup = R(pr.setup * f.acres * 0.35 + 8000); return { acres: f.acres, ppa: R(land / f.acres), land, buildings: build, setup, total: land + build + setup }; }
export function found(s, o = {}) {
  if (s.farm) return { ok: false, msg: 'You already run a farm or ranch.' }; if (age(s) < MIN_AGE) return { ok: false, msg: `Farming starts at ${MIN_AGE}.` }; if (s.prison) return { ok: false, msg: 'Not from prison.' };
  const l = locDef(o.loc), pr = productDef(o.product); if (!l) return { ok: false, msg: 'Pick a location.' }; if (!pr) return { ok: false, msg: 'Pick crops or animals.' }; const acres = R(Number(o.acres)); if (!(acres >= MIN_ACRES && acres <= MAX_ACRES)) return { ok: false, msg: `Buy between ${MIN_ACRES} and ${MAX_ACRES} acres.` };
  const q = quote(s, { ...o, acres }); if (s.cash < q.total) return { ok: false, msg: `Needs ${money(q.total)} (land ${money(q.land)} for ${acres} acres at ${money(q.ppa)}/acre, buildings ${money(q.buildings)}, setup ${money(q.setup)}).` };
  spend(s, q.total); const name = String(o.name || FARM_NAMES[R(rnd(s) * (FARM_NAMES.length - 1))]).trim().slice(0, 32) || FARM_NAMES[0];
  s.farm = { name, loc: l.id, acres, paid: q.land, bq: 20, ops: [{ id: pr.id, acres }], staff: [], stock: {}, contracts: [], hist: [], year: age(s), founded: age(s), last: null, weather: [], insured: false, autoSell: true, acct: blankAcct(), totals: { revenue: 0, profit: 0 }, disease: 0 };
  log(s, `I bought ${acres} acres in ${l.name} and started ${pr.name.toLowerCase()} farming.`, 'biz'); return { ok: true, msg: `${name}: ${acres} acres of ${l.name}.` };
}
const blankAcct = () => ({ revenue: { spot: 0, contract: 0 }, costs: { seed: 0, repairs: 0, vet: 0, penalties: 0 } });
const used = (f) => f.ops.reduce((a, o) => a + o.acres, 0);
// ---- acreage and operations ----
export function buyAcres(s, n) { const f = need(s); if (!f) return { ok: false, msg: 'No farm.' }; n = R(Number(n)); if (!(n >= 1)) return { ok: false, msg: 'Enter acres.' }; if (f.acres + n > MAX_ACRES) return { ok: false, msg: `Max ${MAX_ACRES} acres.` }; const cost = R(ppaNow(s, f) * n * (n < 40 ? 1.15 : 1)); if (s.cash < cost) return { ok: false, msg: `Needs ${money(cost)} for ${n} acres.` }; spend(s, cost); f.acres += n; f.paid += cost; return { ok: true, msg: `Bought ${n} acres for ${money(cost)}.` }; }
export function sellAcres(s, n) { const f = need(s); if (!f) return { ok: false, msg: 'No farm.' }; n = R(Number(n)); if (!(n >= 1) || f.acres - n < MIN_ACRES) return { ok: false, msg: `Keep at least ${MIN_ACRES} acres.` }; if (f.acres - n < used(f)) return { ok: false, msg: 'Free up acreage from an operation first.' }; const v = R(ppaNow(s, f) * n * 0.95); earn(s, v); f.acres -= n; return { ok: true, msg: `Sold ${n} acres for ${money(v)}.` }; }
export const freeAcres = (f) => f.acres - used(f);
export function addOp(s, id, acres) { const f = need(s), pr = productDef(id); if (!f) return { ok: false, msg: 'No farm.' }; if (!pr) return { ok: false, msg: 'Unknown crop or animal.' }; acres = R(Number(acres)); if (f.ops.some((o) => o.id === id)) return { ok: false, msg: 'Already running that.' }; if (!(acres >= 1) || acres > freeAcres(f)) return { ok: false, msg: `Only ${freeAcres(f)} free acres.` }; const cost = R(pr.setup * acres * 0.35 + 3000); if (s.cash < cost) return { ok: false, msg: `Needs ${money(cost)} to set up.` }; spend(s, cost); f.ops.push({ id, acres }); return { ok: true, msg: `${pr.name} started on ${acres} acres.` }; }
export function setOpAcres(s, id, acres) { const f = need(s), o = f && f.ops.find((x) => x.id === id); if (!o) return { ok: false, msg: 'Not running that.' }; acres = R(Number(acres)); const room = freeAcres(f) + o.acres; if (!(acres >= 1) || acres > room) return { ok: false, msg: `Between 1 and ${room} acres.` }; o.acres = acres; return { ok: true, msg: 'Acreage updated.' }; }
export function dropOp(s, id) { const f = need(s); if (!f || !f.ops.some((o) => o.id === id)) return { ok: false, msg: 'Not running that.' }; if (f.ops.length <= 1) return { ok: false, msg: 'Keep at least one operation.' }; f.ops = f.ops.filter((o) => o.id !== id); return { ok: true, msg: 'Operation closed.' }; }
// ---- buildings ----
export function upgrade(s, pts) { const f = need(s); if (!f) return { ok: false, msg: 'No farm.' }; if (!STEPS.find((x) => x.pts === pts)) return { ok: false, msg: 'Steps are +4, +8, +16 or +30.' }; if (f.bq >= 100) return { ok: false, msg: 'Buildings are already top quality.' }; const c = upgradeCost(f, pts); if (s.cash < c) return { ok: false, msg: `Needs ${money(c)}.` }; spend(s, c); f.bq = Math.min(100, f.bq + pts); f.acct.costs.repairs += c; return { ok: true, msg: `Buildings quality +${pts} (now ${f.bq}).` }; }
export function setInsurance(s, on) { const f = need(s); if (!f) return { ok: false, msg: 'No farm.' }; f.insured = !!on; return { ok: true, msg: on ? 'Crop and livestock insurance on.' : 'Insurance off.' }; }
export function setAutoSell(s, on) { const f = need(s); if (!f) return { ok: false, msg: 'No farm.' }; f.autoSell = !!on; return { ok: true, msg: on ? 'Unsold stock sells to the best offer each year.' : 'Stock is kept (it spoils slowly).' }; }
// ---- workers ----
export function staffMarket(s, role) { const f = need(s), rd = ROLES.find((x) => x.id === role); if (!rd) return []; const r = lcg(hashStr(`${s.name}|${s.birthYear}|farmstaff|${role}|${age(s)}`)), out = []; for (let i = 0; i < 3; i++) { const skill = clamp(R(30 + (r() - 0.4) * 50 + (f ? Math.min(15, f.bq / 8) : 0)), 10, 95); out.push({ id: `${role}:${age(s)}:${i}`, role, name: ['Sam', 'Lou', 'Ruth', 'Cal', 'Dot', 'Abe', 'Ida'][R(r() * 6)] + ' ' + ['Boone', 'Hale', 'Ostrander', 'Voss', 'Pike', 'Marsh'][R(r() * 5)], skill, wage: R(rd.base * (0.75 + skill / 100 * 0.7) / 500) * 500 }); } return out; }
export function hire(s, role, candId) { const f = need(s); if (!f) return { ok: false, msg: 'No farm.' }; const rd = ROLES.find((x) => x.id === role); if (!rd) return { ok: false, msg: 'Unknown role.' }; if (role !== 'hand' && f.staff.some((x) => x.role === role)) return { ok: false, msg: 'That role is filled.' }; if (f.staff.filter((x) => x.role === 'hand').length >= 40 && role === 'hand') return { ok: false, msg: 'Enough hands.' }; const c = staffMarket(s, role).find((x) => x.id === candId) || staffMarket(s, role)[0]; if (f.staff.some((x) => x.id === c.id)) return { ok: false, msg: 'Already hired.' }; f.staff.push({ id: c.id, role, name: c.name, skill: c.skill, wage: c.wage }); return { ok: true, msg: `Hired ${c.name} as ${rd.name.toLowerCase()} (${money(c.wage)}/yr).` }; }
export function fire(s, id) { const f = need(s); if (!f || !f.staff.some((x) => x.id === id)) return { ok: false, msg: 'Nobody there.' }; f.staff = f.staff.filter((x) => x.id !== id); return { ok: true, msg: 'Let go.' }; }
export function workersNeeded(f) { return Math.max(1, Math.ceil(f.ops.reduce((a, o) => a + (o.acres / 100) * productDef(o.id).wk, 0))); }
const handsHave = (f) => f.staff.filter((x) => x.role === 'hand').length + (f.staff.some((x) => x.role === 'foreman') ? 0.5 : 0);
export const staffing = (f) => clamp(handsHave(f) / workersNeeded(f), 0, 1.2);
const skillOf = (f, role) => { const x = f.staff.find((y) => y.role === role); return x ? x.skill : 0; };
// ---- markets (pure) ----
export function spotPrice(id, year) { const p = productDef(id); if (!p) return 0; let v = 1; for (let y = Math.max(0, year - 8); y <= year; y++) v = v * 0.7 + 0.3 * (0.7 + lcg(hashStr(`spot|${id}|${y}`))() * 0.65); return R(p.price * (0.65 + v * 0.55) * 100) / 100; }
export function offers(s, productId) { const f = need(s), y = age(s), spot = spotPrice(productId, y); return BUYERS.filter((b) => b.takes.includes(productId)).map((b) => { const r = lcg(hashStr(`offer|${b.id}|${productId}|${y}`)), price = R(spot * b.mult * (0.86 + r() * 0.28) * 100) / 100; return { buyer: b.id, name: b.name, icon: b.icon, price, spot, vs: R((price / spot - 1) * 100) }; }).sort((a, b) => b.price - a.price); }
export function sellStock(s, productId, buyerId, qty) { const f = need(s); if (!f) return { ok: false, msg: 'No farm.' }; const have = f.stock[productId] || 0; if (have <= 0) return { ok: false, msg: 'Nothing in storage.' }; const o = offers(s, productId).find((x) => x.buyer === buyerId); if (!o) return { ok: false, msg: 'That company does not buy this.' }; qty = qty == null || qty === 'all' ? have : Math.min(have, R(Number(qty))); if (!(qty > 0)) return { ok: false, msg: 'Enter an amount.' }; const v = R(qty * o.price); earn(s, v); f.stock[productId] = have - qty; if (f.stock[productId] <= 0) delete f.stock[productId]; f.acct.revenue.spot += v; return { ok: true, msg: `Sold ${R(qty).toLocaleString('en-US')} ${productDef(productId).unit} to ${o.name} for ${money(v)}.` }; }
export function signContract(s, productId, buyerId, years, pct) { const f = need(s); if (!f) return { ok: false, msg: 'No farm.' }; if (!f.ops.some((o) => o.id === productId)) return { ok: false, msg: 'You do not produce that.' }; years = clamp(R(years || 2), 1, 3); pct = [25, 50, 75].includes(R(pct)) ? R(pct) : 50; const o = offers(s, productId).find((x) => x.buyer === buyerId); if (!o) return { ok: false, msg: 'That company does not buy this.' }; if (f.contracts.some((c) => c.product === productId && c.left > 0)) return { ok: false, msg: 'You already have a contract for that.' }; if (f.contracts.filter((c) => c.left > 0).length >= 3) return { ok: false, msg: 'Max 3 contracts.' };
  f.contracts.push({ id: 'k' + age(s) + productId, product: productId, buyer: buyerId, name: o.name, price: R(o.price * 0.96 * 100) / 100, pct, left: years, years }); return { ok: true, msg: `${o.name}: ${pct}% of your ${productDef(productId).name.toLowerCase()} for ${years} year${years > 1 ? 's' : ''} at ${money(o.price * 0.96)}/${productDef(productId).unit.replace(/s$/, '')}.` }; }
export function cancelContract(s, id) { const f = need(s), c = f && f.contracts.find((x) => x.id === id && x.left > 0); if (!c) return { ok: false, msg: 'No such contract.' }; const pen = R(c.price * 200 * c.pct / 25); if (s.cash < pen) return { ok: false, msg: `Cancelling costs ${money(pen)}.` }; spend(s, pen); f.acct.costs.penalties += pen; c.left = 0; return { ok: true, msg: `Contract ended early (${money(pen)} fee).` }; }
// ---- year: weather, disease, harvest, deliveries, costs ----
function weatherYear(s, f) {
  const l = locDef(f.loc), out = []; const kinds = [['drought', l.drought * 0.1], ['flood', l.flood * 0.07], ['frost', l.frost * 0.08], ['hail', l.hail * 0.07]]; const bump = chance(s, 0.12);
  const ev = {}; for (const [k, p] of kinds) if (chance(s, clamp(p, 0, 0.4))) { ev[k] = 0.1 + rnd(s) * 0.3; out.push({ kind: k, severity: R(ev[k] * 100) }); }
  if (bump && !out.length) out.push({ kind: 'bumper', severity: R((0.06 + rnd(s) * 0.12) * 100) });
  return { ev, bump: bump && !out.some((x) => x.kind !== 'bumper'), list: out, season: ['spring', 'summer', 'fall', 'winter'][0] };
}
export function yearTick(s) {
  const f = need(s); if (!f) return; if (s.prison) return; const A = f.acct, y = age(s), l = locDef(f.loc), W = weatherYear(s, f), ins = f.insured ? 0.5 : 1, spec = skillOf(f, 'specialist'), mech = skillOf(f, 'mechanic'), fore = skillOf(f, 'foreman');
  const stf = Math.pow(staffing(f) >= 1 ? 1 : Math.max(0.2, staffing(f)), 0.7) * (1 + fore / 800), bq = 0.9 + f.bq / 500, ops = [], wxNotes = [];
  let seedCost = 0, vet = 0;
  for (const o of f.ops) {
    const pr = productDef(o.id), fit = (pr.fit[f.loc] || 1) * (pr.kind === 'animal' ? l.live : l.soil); let wx = 1; for (const [k, v] of Object.entries(W.ev)) wx *= 1 - v * (pr.wth[k] || 1) * ins; if (W.bump) wx *= 1.12;
    let dis = 0, disNote = ''; const pd = clamp(pr.risk * l.disease * (1 - f.bq / 220) * (1 - spec / 260) * 1.4, 0, 0.5); if (chance(s, pd)) { dis = (0.15 + rnd(s) * 0.4) * ins; f.disease++; disNote = pr.kind === 'animal' ? 'disease outbreak' : 'blight / pests'; vet += R(o.acres * 40 * (1 - spec / 200)); }
    const out = R(o.acres * pr.yld * fit * wx * (1 - dis) * stf * bq * (0.92 + rnd(s) * 0.16)), cost = R(o.acres * pr.cost * (1 - mech / 800)); seedCost += cost; f.stock[o.id] = R((f.stock[o.id] || 0) + out);
    ops.push({ id: o.id, name: pr.name, icon: pr.icon, acres: o.acres, produced: out, unit: pr.unit, cost, weather: R(wx * 100), disease: disNote }); }
  for (const w of W.list) wxNotes.push(w.kind === 'bumper' ? `Bumper year (+${w.severity}%)` : `${w.kind[0].toUpperCase() + w.kind.slice(1)} (-${w.severity}%)`);
  // contracts deliver first at the locked price
  let cRev = 0, pen = 0; const cnotes = [];
  for (const c of f.contracts) { if (c.left <= 0) continue; const o = ops.find((x) => x.id === c.product), want = o ? R(o.produced * c.pct / 100) : 0, have = f.stock[c.product] || 0, give = Math.min(want, have); if (give > 0) { cRev += give * c.price; f.stock[c.product] = have - give; } if (give < want) { pen += R((want - give) * c.price * 0.25); cnotes.push(`${c.name}: short ${R(want - give)}`); } c.left--; if (c.left === 0) cnotes.push(`${c.name} contract ended`); }
  f.contracts = f.contracts.filter((c) => c.left > 0 || c.ended === undefined).filter((c) => c.left > 0);
  earn(s, cRev); A.revenue.contract += cRev;
  // storage spoilage, then optional auto sale at the best offer
  const spoil = clamp(0.1 - f.bq / 1200, 0.02, 0.1); let autoRev = 0; for (const id of Object.keys(f.stock)) { if (f.autoSell) { const of = offers(s, id)[0]; if (of) { const v = R(f.stock[id] * of.price * 0.97); autoRev += v; delete f.stock[id]; } } else { f.stock[id] = R(f.stock[id] * (1 - spoil)); if (f.stock[id] <= 0) delete f.stock[id]; } }
  earn(s, autoRev); A.revenue.spot += autoRev;
  const wages = f.staff.reduce((a, x) => a + x.wage, 0), landVal = R(ppaNow(s, f) * f.acres), tax = R(landVal * 0.004), fuel = R(f.acres * 38 * (1 - mech / 600)), insCost = f.insured ? R(seedCost * 0.07 + landVal * 0.001) : 0, upkeep = R(8000 + f.acres * 12 + (f.bq > 60 ? f.bq * 40 : 0)), costs = { seed: seedCost, wages, fuel, tax, insurance: insCost, upkeep, vet, penalties: pen + A.costs.penalties, repairs: A.costs.repairs };
  spend(s, wages + fuel + tax + insCost + upkeep + vet + seedCost + pen);
  const rev = { spot: R(A.revenue.spot), contract: R(A.revenue.contract) }, totalRev = rev.spot + rev.contract, totalCost = R(Object.values(costs).reduce((a, v) => a + v, 0)), rec = { year: y, ops, weather: wxNotes, contracts: cnotes, revenue: { ...rev, total: totalRev }, costs: Object.fromEntries(Object.entries(costs).map(([k, v]) => [k, R(v)])), totalCosts: totalCost, profit: totalRev - totalCost, staffing: R(staffing(f) * 100) };
  f.hist.unshift(rec); if (f.hist.length > 12) f.hist.pop(); f.last = rec; f.totals.revenue += totalRev; f.totals.profit += rec.profit; f.bq = Math.max(5, f.bq - 3 - (W.list.some((w) => w.kind === 'hail' || w.kind === 'flood') ? 2 : 0));
  f.weather = wxNotes; f.acct = blankAcct(); f.year = y;
  log(s, `${f.name}: ${rec.profit >= 0 ? 'profit' : 'loss'} ${money(Math.abs(rec.profit))} (${wxNotes.join(', ') || 'a normal year'}).`, 'biz');
}
export function value(s) { const f = need(s); if (!f) return 0; const stock = Object.entries(f.stock).reduce((a, [id, q]) => a + q * spotPrice(id, age(s)) * 0.8, 0); return R(ppaNow(s, f) * f.acres + f.bq * (500 + f.acres * 8) + stock); }
export function sell(s) { const f = need(s); if (!f) return { ok: false, msg: 'No farm.' }; const v = R(value(s) * 0.92); earn(s, v); s.farm = null; log(s, `I sold the farm for ${money(v)}.`, 'biz'); return { ok: true, msg: `Sold for ${money(v)}.` }; }
export function ownedRecords(s) { const f = need(s); if (!f) return []; const pr = f.ops.map((o) => productDef(o.id).name).join(', '); return [{ id: 'farm_ranch', farm: true, name: f.name, type: 'farm_ranch', typeName: `${f.acres} acres · ${pr}`, kind: 'farm', icon: f.ops.some((o) => productDef(o.id).kind === 'animal') ? '🐄' : '🌾', rep: R(f.bq), staff: f.staff.length, profit: f.last ? f.last.profit : 0, valuation: value(s) }]; }
export function status(s) {
  const f = need(s), a = age(s), base = { age: a, locked: a < MIN_AGE, minAge: MIN_AGE, cash: R(s.cash), minAcres: MIN_ACRES, maxAcres: MAX_ACRES, locations: LOCATIONS.map((l) => ({ ...l })), products: PRODUCTS.map((p) => ({ id: p.id, name: p.name, icon: p.icon, kind: p.kind, unit: p.unit, setup: p.setup, spot: spotPrice(p.id, a), perAcre: R(p.yld * p.price), costPerAcre: p.cost })), roles: ROLES, steps: STEPS, buyers: BUYERS, seasons: SEASONS };
  if (!f) return { ...base, farm: null };
  const l = locDef(f.loc), market = f.ops.map((o) => { const pr = productDef(o.id); return { id: o.id, name: pr.name, icon: pr.icon, unit: pr.unit, stock: f.stock[o.id] || 0, spot: spotPrice(o.id, a), offers: offers(s, o.id), contract: f.contracts.find((c) => c.product === o.id && c.left > 0) || null }; });
  const wages = f.staff.reduce((x, y) => x + y.wage, 0), landVal = R(ppaNow(s, f) * f.acres);
  return { ...base, farm: { name: f.name, loc: f.loc, locName: l.name, locIcon: l.icon, acres: f.acres, free: freeAcres(f), ppa: R(ppaNow(s, f)), landValue: landVal, bq: R(f.bq), ops: f.ops.map((o) => { const pr = productDef(o.id); return { ...o, name: pr.name, icon: pr.icon, kind: pr.kind, unit: pr.unit, expect: R(o.acres * pr.yld * (pr.fit[f.loc] || 1) * (pr.kind === 'animal' ? l.live : l.soil)), spot: spotPrice(o.id, a), risk: R(clamp(pr.risk * l.disease * (1 - f.bq / 220) * (1 - skillOf(f, 'specialist') / 260) * 1.4, 0, 0.5) * 100) }; }),
    staff: f.staff, needed: workersNeeded(f), staffing: R(staffing(f) * 100), market, contracts: f.contracts.filter((c) => c.left > 0), stock: f.stock, insured: f.insured, autoSell: f.autoSell, weather: f.weather, hist: f.hist, last: f.last, acct: { revenue: { ...f.acct.revenue }, costs: { ...f.acct.costs } }, fixed: { wages, tax: R(landVal * 0.004), upkeep: R(8000 + f.acres * 12) }, upgrades: STEPS.map((x) => ({ pts: x.pts, cost: upgradeCost(f, x.pts) })), value: value(s), sellValue: R(value(s) * 0.92), years: a - f.founded, totals: f.totals, disease: f.disease, risks: { drought: l.drought, flood: l.flood, frost: l.frost, hail: l.hail, disease: l.disease } } };
}

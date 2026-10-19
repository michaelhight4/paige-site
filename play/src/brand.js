// Clothing brand you launch: price range, quality range, target audience, 14 product lines, seasonal collections (hits and flops), models/ambassadors,
// retail / online / wholesale channels, staff, brand investments (+4/+8/+16/+30 steps) and itemised yearly finances. State: s.brand. All money moves through your cash.
import { rnd, chance, clamp, gauss } from './rng.js';
import { log, earn, spend } from './core.js';
import { logoSvg, normLogo, autoLogo, cleanName } from './franchise.js';

const R = Math.round, age = (s) => Math.floor(s.age);
const money = (n) => '$' + R(n).toLocaleString('en-US');
const hashStr = (str) => { let h = 2166136261; for (const c of String(str)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const lcg = (seed) => { let t = seed >>> 0; return () => { t += 0x6d2b79f5; let x = Math.imul(t ^ (t >>> 15), 1 | t); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; };
export const MIN_AGE = 18;
export const SEASONS = [{ id: 'spring', name: 'Spring', icon: '🌸' }, { id: 'summer', name: 'Summer', icon: '☀️' }, { id: 'fall', name: 'Fall', icon: '🍂' }, { id: 'winter', name: 'Winter', icon: '❄️' }];
export const PRICE_BANDS = [{ id: 0, name: 'Budget', price: 14, cost: 5.2, elastic: 1.5 }, { id: 1, name: 'Value', price: 28, cost: 9, elastic: 1.2 }, { id: 2, name: 'Mid-range', price: 55, cost: 17, elastic: 1 }, { id: 3, name: 'Premium', price: 120, cost: 36, elastic: 0.7 }, { id: 4, name: 'Luxury', price: 320, cost: 92, elastic: 0.45 }];
export const QUALITY = [{ id: 0, name: 'Basic', mult: 0.75, score: 0 }, { id: 1, name: 'Standard', mult: 1, score: 6 }, { id: 2, name: 'Good', mult: 1.35, score: 12 }, { id: 3, name: 'Fine', mult: 1.9, score: 19 }, { id: 4, name: 'Exceptional', mult: 2.1, score: 27 }];
export const AUDIENCES = [{ id: 'kids', name: 'Kids & families', icon: '🧒', size: 1.1 }, { id: 'teens', name: 'Teens', icon: '🎧', size: 1.15 }, { id: 'young', name: 'Young adults', icon: '🕺', size: 1.2 }, { id: 'adults', name: 'Adults', icon: '🧑', size: 1.1 }, { id: 'seniors', name: 'Seniors', icon: '🧓', size: 0.8 }, { id: 'athletes', name: 'Athletes', icon: '🏃', size: 0.9 }, { id: 'fashion', name: 'Fashion-forward', icon: '💃', size: 0.85 }, { id: 'pros', name: 'Professionals', icon: '💼', size: 0.95 }];
// 14 product lines. aud = audience affinity (default 0.9), sea = season weights, dev = launch cost, pm/cm = price/cost multipliers
const L = (id, name, icon, dev, pm, cm, sea, aud, extra = {}) => ({ id, name, icon, dev, pm, cm, sea, aud, minAge: 0, ...extra });
export const LINES = [
  L('comfort', 'Comfort & basics', '🧦', 0, 0.8, 0.8, [1, 1, 1.1, 1.2], { seniors: 1.3, kids: 1.2, adults: 1.1 }, { free: true }),
  L('swim', 'Swimwear & bathing suits', '🩱', 12000, 0.9, 0.9, [1.1, 2.2, 0.35, 0.2], { teens: 1.2, young: 1.3, athletes: 1.1 }),
  L('formal', 'Formal wear', '🤵', 22000, 2.2, 2, [1, 0.7, 1.2, 1.3], { pros: 1.3, adults: 1.1, fashion: 1.1 }),
  L('semi', 'Semi-formal', '👔', 14000, 1.3, 1.2, [1.1, 0.9, 1.1, 1.0], { pros: 1.3, adults: 1.2, young: 1.1 }),
  L('athletic', 'Athletic wear', '🏋️', 16000, 1.1, 1.0, [1.1, 1.1, 1, 0.9], { athletes: 1.4, young: 1.2, teens: 1.1 }),
  L('street', 'Streetwear', '🧢', 14000, 1.2, 1.0, [1, 1, 1.1, 1.1], { teens: 1.4, young: 1.3, fashion: 1.2 }),
  L('kids', 'Kids', '🧸', 10000, 0.7, 0.8, [1, 1, 1.4, 1.2], { kids: 1.5 }),
  L('outer', 'Outerwear', '🧥', 20000, 1.7, 1.6, [0.5, 0.2, 1.6, 2.4], { adults: 1.1, athletes: 1.1, pros: 1 }),
  L('foot', 'Footwear', '👟', 26000, 1.5, 1.4, [1, 1, 1.1, 1], { teens: 1.2, athletes: 1.2, young: 1.1 }),
  L('acc', 'Accessories', '👜', 9000, 0.6, 0.5, [1, 1, 1.1, 1.3], { fashion: 1.3, young: 1.1 }),
  L('work', 'Workwear', '🦺', 13000, 1.0, 1.0, [1, 1, 1.1, 1.1], { adults: 1.2, pros: 1.1 }),
  L('luxury', 'Luxury line', '💎', 60000, 3.5, 3.0, [1, 1, 1.1, 1.1], { fashion: 1.5, pros: 1.2 }, { minRep: 25 }),
  L('eco', 'Sustainable line', '🌿', 30000, 1.5, 1.7, [1, 1, 1, 1], { young: 1.2, fashion: 1.1, adults: 1.1 }),
  L('intimates', 'Lingerie & intimates (18+ customers)', '🩲', 18000, 1.2, 1.0, [1, 1.1, 1, 1.2], { young: 1.2, adults: 1.2, fashion: 1.2 }, { adultsOnly: true }),
];
export const lineDef = (id) => LINES.find((x) => x.id === id);
export const ROLES = [{ id: 'designer', name: 'Head designer', icon: '✏️', base: 52000 }, { id: 'marketer', name: 'Marketing lead', icon: '📣', base: 48000 }, { id: 'production', name: 'Production manager', icon: '🏭', base: 50000 }, { id: 'sales', name: 'Sales & wholesale manager', icon: '🤝', base: 54000 }];
export const STEPS = [{ pts: 4, cost: 25000 }, { pts: 8, cost: 70000 }, { pts: 16, cost: 180000 }, { pts: 30, cost: 480000 }];
export const STATS = [{ id: 'design', name: 'Design studio', icon: '🎨' }, { id: 'quality', name: 'Quality lab', icon: '🧪' }, { id: 'marketing', name: 'Marketing', icon: '📢' }, { id: 'logistics', name: 'Logistics', icon: '🚚' }];
export const SPENDS = [{ id: 0, name: 'No extra design budget', cost: 0, score: 0 }, { id: 1, name: 'Studio sketches', cost: 20000, score: 4 }, { id: 2, name: 'Full design team', cost: 60000, score: 9 }, { id: 3, name: 'Runway-grade design', cost: 150000, score: 15 }];
export const MARKETS = [{ id: 0, name: 'Word of mouth', cost: 0, score: 0, reach: 1 }, { id: 1, name: 'Social campaign', cost: 15000, score: 4, reach: 1.1 }, { id: 2, name: 'Ad campaign', cost: 50000, score: 8, reach: 1.25 }, { id: 3, name: 'Major launch event', cost: 150000, score: 13, reach: 1.45 }];
export const VOLUMES = [{ id: 'low', name: 'Small run', mult: 0.6 }, { id: 'std', name: 'Standard run', mult: 1 }, { id: 'high', name: 'Big run', mult: 1.5 }];
const CH = { store: { cost: 120000, rent: 60000, cap: 5000, share: 0.4, fee: 0 }, online: { cost: 40000, perLevel: 5000, share: 0.4, fee: 0.12, upgrade: 45000 }, wholesale: { cost: 8000, per: 2200, share: 0.2, price: 0.55, max: 6 } };
const MODEL_NAMES = ['Ari Vale', 'Mika Sol', 'Jules Ford', 'Noor Hale', 'Dane Okoro', 'Lena Park', 'Rio Castell', 'Tess Moreau', 'Kai Brennan', 'Sana Idris', 'Remy Ortega', 'Vera Lind'];
const BRAND_NAMES = ['Northline', 'Velvet Row', 'Kinfolk Co', 'Loomwell', 'Hemline', 'Stitch & Stone', 'Riverbend Wear', 'Atelier Nine'];

export const ensure = (s) => { if (!s.brand) s.brand = null; return s.brand; };
export const need = (s) => s.brand || null;
const yearOf = (s) => age(s);
const staff = (b, role) => b.staff.find((x) => x.role === role);
const sk = (b, role) => (staff(b, role) ? staff(b, role).skill : 0);

// ---- market (pure: local seeded generators so reads never move the game RNG) ----
export function staffMarket(s, role) {
  const b = need(s), rd = ROLES.find((x) => x.id === role); if (!rd) return []; const r = lcg(hashStr(`${s.name}|${s.birthYear}|brandstaff|${role}|${yearOf(s)}`)), rep = b ? b.rep : 10, out = [];
  for (let i = 0; i < 3; i++) { const skill = clamp(R(28 + rep * 0.35 + (r() - 0.5) * 36), 10, 95), wage = R(rd.base * (0.7 + skill / 100 * 0.9) / 1000) * 1000; out.push({ id: `${role}:${yearOf(s)}:${i}`, role, name: ['Ana', 'Ben', 'Cleo', 'Dev', 'Eli', 'Faye', 'Gus', 'Hana'][R(r() * 7)] + ' ' + ['Moss', 'Reyes', 'Tan', 'Bishop', 'Kaur', 'Lund', 'Pryce'][R(r() * 6)], skill, wage }); }
  return out;
}
export function modelMarket(s) {
  const b = need(s), r = lcg(hashStr(`${s.name}|${s.birthYear}|models|${yearOf(s)}`)), out = [];
  for (let i = 0; i < 4; i++) { const fame = clamp(R(10 + (b ? b.rep * 0.5 : 0) + r() * 55), 5, 95), aud = AUDIENCES[R(r() * (AUDIENCES.length - 1))].id; out.push({ id: `m:${yearOf(s)}:${i}`, name: MODEL_NAMES[(R(r() * 100) + i * 3) % MODEL_NAMES.length], fame, audience: aud, fee: R((8000 + fame * fame * 14) / 1000) * 1000 }); }
  return out;
}
const heat = (line, year, season) => lcg(hashStr(`trend|${line}|${year}|${season}`))();

// ---- founding ----
export const foundCost = () => 60000;
export function quote(s, o = {}) { const lines = new Set(['comfort', ...(o.lines || [])]); const dev = [...lines].reduce((a, id) => a + (lineDef(id) ? lineDef(id).dev : 0), 0); return { fee: foundCost(), lines: dev, online: CH.online.cost, total: foundCost() + dev + CH.online.cost }; }
export function found(s, o = {}) {
  if (s.brand) return { ok: false, msg: 'You already run a clothing brand.' }; if (age(s) < MIN_AGE) return { ok: false, msg: `Launching a brand needs age ${MIN_AGE}.` }; if (s.prison) return { ok: false, msg: 'Not from prison.' };
  const name = cleanName ? cleanName(o.name || BRAND_NAMES[R(rnd(s) * BRAND_NAMES.length)]) : String(o.name || 'My Brand').trim(); if (!name || name.length < 2) return { ok: false, msg: 'Give the brand a name (2+ letters).' };
  const pr = [clamp(R(o.price ? o.price[0] : 1), 0, 4), clamp(R(o.price ? o.price[1] : 2), 0, 4)].sort((a, b) => a - b), qu = [clamp(R(o.quality ? o.quality[0] : 1), 0, 4), clamp(R(o.quality ? o.quality[1] : 2), 0, 4)].sort((a, b) => a - b);
  const aud = AUDIENCES.find((x) => x.id === o.audience) ? o.audience : 'young'; const lines = ['comfort', ...(o.lines || []).filter((id) => lineDef(id) && id !== 'comfort' && !lineDef(id).minRep && !(lineDef(id).adultsOnly && age(s) < 18))].filter((x, i, a) => a.indexOf(x) === i);
  const q = quote(s, { lines }); if (s.cash < q.total) return { ok: false, msg: `Needs ${money(q.total)} (${money(q.fee)} startup + ${money(q.lines)} product lines + ${money(q.online)} online store).` };
  spend(s, q.total); const logo = normLogo(o.logo || autoLogo(name));
  s.brand = { name, founded: age(s), logo, price: pr, quality: qu, audience: aud, lines, rep: 12, fame: 0, stats: { design: 10, quality: 10, marketing: 10, logistics: 10 }, staff: [], models: [], channels: { stores: 0, online: 1, wholesale: 0 }, plan: {}, done: {}, year: yearOf(s), collections: [], hist: [], totals: { revenue: 0, profit: 0 }, policy: { auto: true, spend: 0, market: 0, volume: 'std' }, flops: 0, hits: 0, last: null, acct: blankAcct() };
  log(s, `I launched my clothing brand, ${name}.`, 'biz'); return { ok: true, msg: `${name} is open for business.` };
}
const blankAcct = () => ({ revenue: { store: 0, online: 0, wholesale: 0, markdown: 0 }, costs: { cogs: 0, design: 0, marketing: 0, fees: 0 } });
export function setPositioning(s, o = {}) { const b = need(s); if (!b) return { ok: false, msg: 'No brand.' }; if (o.price) b.price = [clamp(R(o.price[0]), 0, 4), clamp(R(o.price[1]), 0, 4)].sort((x, y) => x - y); if (o.quality) b.quality = [clamp(R(o.quality[0]), 0, 4), clamp(R(o.quality[1]), 0, 4)].sort((x, y) => x - y); if (o.audience && AUDIENCES.find((x) => x.id === o.audience)) b.audience = o.audience; return { ok: true, msg: 'Positioning updated.' }; }
export function addLine(s, id) { const b = need(s), d = lineDef(id); if (!b) return { ok: false, msg: 'No brand.' }; if (!d) return { ok: false, msg: 'Unknown line.' }; if (b.lines.includes(id)) return { ok: false, msg: 'Already in your range.' }; if (d.adultsOnly && age(s) < 18) return { ok: false, msg: 'Adults only.' }; if (d.minRep && b.rep < d.minRep) return { ok: false, msg: `Needs brand reputation ${d.minRep}.` }; if (s.cash < d.dev) return { ok: false, msg: `Needs ${money(d.dev)} to develop it.` }; spend(s, d.dev); b.lines.push(id); b.acct.costs.design += d.dev; return { ok: true, msg: `${d.name} added.` }; }
export function dropLine(s, id) { const b = need(s); if (!b || id === 'comfort' || !b.lines.includes(id)) return { ok: false, msg: 'Cannot drop that line.' }; b.lines = b.lines.filter((x) => x !== id); for (const k of Object.keys(b.plan)) if (b.plan[k]) b.plan[k].lines = b.plan[k].lines.filter((x) => x !== id); return { ok: true, msg: 'Line dropped.' }; }
// ---- staff, models, channels, investments ----
export function hire(s, role, candId) { const b = need(s); if (!b) return { ok: false, msg: 'No brand.' }; if (staff(b, role)) return { ok: false, msg: 'That role is filled.' }; const c = staffMarket(s, role).find((x) => x.id === candId) || staffMarket(s, role)[0]; if (!c) return { ok: false, msg: 'Unknown role.' }; b.staff.push({ id: c.id, role, name: c.name, skill: c.skill, wage: c.wage }); return { ok: true, msg: `Hired ${c.name} (skill ${c.skill}, ${money(c.wage)}/yr).` }; }
export function fire(s, role) { const b = need(s); if (!b || !staff(b, role)) return { ok: false, msg: 'Nobody there.' }; b.staff = b.staff.filter((x) => x.role !== role); return { ok: true, msg: 'Let go.' }; }
export function signModel(s, id) { const b = need(s); if (!b) return { ok: false, msg: 'No brand.' }; if (b.models.length >= 3) return { ok: false, msg: 'Max 3 models / ambassadors.' }; const m = modelMarket(s).find((x) => x.id === id); if (!m) return { ok: false, msg: 'Not available.' }; if (b.models.some((x) => x.id === id)) return { ok: false, msg: 'Already signed.' }; if (s.cash < m.fee) return { ok: false, msg: `Needs the ${money(m.fee)} signing fee.` }; spend(s, m.fee); b.acct.costs.marketing += m.fee; b.models.push({ ...m, years: 0 }); return { ok: true, msg: `${m.name} is your brand ambassador.` }; }
export function dropModel(s, id) { const b = need(s); if (!b || !b.models.some((x) => x.id === id)) return { ok: false, msg: 'No such ambassador.' }; b.models = b.models.filter((x) => x.id !== id); return { ok: true, msg: 'Contract ended.' }; }
export function channelCost(s, kind) { const b = need(s); if (!b) return 0; return kind === 'store' ? CH.store.cost : kind === 'online' ? CH.online.upgrade * (b.channels.online + 1) : CH.wholesale.cost; }
export function addChannel(s, kind) { const b = need(s); if (!b) return { ok: false, msg: 'No brand.' }; const c = b.channels; if (kind === 'store' && c.stores >= 5) return { ok: false, msg: 'Max 5 stores.' }; if (kind === 'online' && c.online >= 3) return { ok: false, msg: 'Online store is maxed.' }; if (kind === 'wholesale' && c.wholesale >= CH.wholesale.max) return { ok: false, msg: 'Max wholesale accounts.' }; if (!['store', 'online', 'wholesale'].includes(kind)) return { ok: false, msg: 'Unknown channel.' }; const cost = channelCost(s, kind); if (s.cash < cost) return { ok: false, msg: `Needs ${money(cost)}.` };
  spend(s, cost); if (kind === 'store') c.stores++; else if (kind === 'online') c.online++; else c.wholesale++; return { ok: true, msg: kind === 'store' ? 'New retail store opened.' : kind === 'online' ? 'Online store upgraded.' : 'Wholesale account signed.' }; }
export function closeChannel(s, kind) { const b = need(s); if (!b) return { ok: false, msg: 'No brand.' }; const c = b.channels; const k = kind === 'store' ? 'stores' : kind; if (!(k in c) || c[k] <= (k === 'online' ? 1 : 0)) return { ok: false, msg: 'Nothing to close.' }; c[k]--; return { ok: true, msg: 'Closed.' }; }
export function invest(s, stat, step) { const b = need(s); if (!b) return { ok: false, msg: 'No brand.' }; if (!STATS.find((x) => x.id === stat)) return { ok: false, msg: 'Unknown investment.' }; const st = STEPS.find((x) => x.pts === step); if (!st) return { ok: false, msg: 'Steps are +4, +8, +16 or +30.' }; if (b.stats[stat] >= 100) return { ok: false, msg: 'Already maxed.' }; if (s.cash < st.cost) return { ok: false, msg: `Needs ${money(st.cost)}.` }; spend(s, st.cost); b.stats[stat] = Math.min(100, b.stats[stat] + st.pts); b.acct.costs.design += st.cost; return { ok: true, msg: `${STATS.find((x) => x.id === stat).name} +${st.pts}.` }; }
export function setPolicy(s, patch) { const b = need(s); if (!b) return { ok: false, msg: 'No brand.' }; const p = b.policy; if (patch.auto != null) p.auto = !!patch.auto; if (patch.spend != null) p.spend = clamp(R(patch.spend), 0, 3); if (patch.market != null) p.market = clamp(R(patch.market), 0, 3); if (patch.volume && VOLUMES.find((v) => v.id === patch.volume)) p.volume = patch.volume; return { ok: true, msg: 'Policy saved.' }; }
export function setLogo(s, l) { const b = need(s); if (!b) return { ok: false, msg: 'No brand.' }; b.logo = normLogo(l); return { ok: true, msg: 'Logo updated.' }; }
export const logoSvgOf = (l) => logoSvg(normLogo(l));

// ---- collections ----
export function planCollection(s, season, o = {}) {
  const b = need(s); if (!b) return { ok: false, msg: 'No brand.' }; if (!SEASONS.find((x) => x.id === season)) return { ok: false, msg: 'Unknown season.' }; if (b.done[season]) return { ok: false, msg: 'That season has already launched this year.' };
  const lines = (o.lines || b.lines).filter((id) => b.lines.includes(id)).slice(0, 6); if (!lines.length) return { ok: false, msg: 'Pick at least one product line you sell.' };
  b.plan[season] = { lines, spend: clamp(R(o.spend ?? b.policy.spend), 0, 3), market: clamp(R(o.market ?? b.policy.market), 0, 3), volume: VOLUMES.find((v) => v.id === o.volume) ? o.volume : b.policy.volume }; return { ok: true, msg: `${SEASONS.find((x) => x.id === season).name} collection planned.` };
}
export function estimate(s, season, plan) {
  const b = need(s); const p = plan || b.plan[season]; if (!b || !p) return null; const sd = SPENDS[p.spend], mk = MARKETS[p.market], vol = VOLUMES.find((v) => v.id === p.volume) || VOLUMES[1];
  const pAvg = (b.price[0] + b.price[1]) / 2, qAvg = (b.quality[0] + b.quality[1]) / 2, band = PRICE_BANDS[R(pAvg)], q = QUALITY[R(qAvg)], y = yearOf(s), aud = AUDIENCES.find((x) => x.id === b.audience), base = baseDemand(b);
  const lineRows = p.lines.map((id) => { const d = lineDef(id), sea = d.sea[SEASONS.findIndex((x) => x.id === season)], fit = d.aud[b.audience] || 0.9, unitPrice = band.price * d.pm * (1 + (pAvg - R(pAvg)) * 0.3), unitCost = band.cost * d.cm * q.mult * (1 - sk(b, 'production') / 400), demandBase = base * sea * fit * aud.size * Math.pow(band.elastic, 0.8), produced = R(demandBase * vol.mult);
    return { id, name: d.name, icon: d.icon, sea, fit, demandBase, unitPrice: R(unitPrice * 100) / 100, unitCost: R(unitCost * 100) / 100, produced, cost: R(produced * unitCost), trend: heat(id, y, season) }; });
  const cap = caps(b), capTot = cap.store + cap.online + cap.wholesale, prodTot = lineRows.reduce((a, x) => a + x.produced, 0); if (prodTot > capTot * 1.1 && prodTot > 0) { const k = (capTot * 1.1) / prodTot; for (const x of lineRows) { x.produced = R(x.produced * k); x.cost = R(x.produced * x.unitCost); x.demandBase = x.demandBase * Math.min(1, k * 1.2); } }
  return { season, plan: p, lines: lineRows, designCost: sd.cost, marketCost: mk.cost, productionCost: lineRows.reduce((a, x) => a + x.cost, 0), units: lineRows.reduce((a, x) => a + x.produced, 0), channelCap: caps(b) };
}
const baseDemand = (b) => (500 + b.rep * 34 + b.fame * 55) * (1 + b.stats.marketing / 250);
const caps = (b) => { const c = b.channels, lg = 0.6 + b.stats.logistics / 100 * 0.8; return { store: R(c.stores * CH.store.cap * lg), online: R(c.online * CH.online.perLevel * lg), wholesale: R(c.wholesale * CH.wholesale.per * (1 + sk(b, 'sales') / 200)) }; };
export function launch(s, season) {
  const b = need(s); if (!b) return { ok: false, msg: 'No brand.' }; if (b.done[season]) return { ok: false, msg: 'Already launched this season.' }; if (!b.plan[season]) { const r = planCollection(s, season, {}); if (!r.ok) return r; }
  const e = estimate(s, season), upfront = e.designCost + e.marketCost + e.productionCost; if (s.cash < upfront) return { ok: false, msg: `Needs ${money(upfront)} up front (design ${money(e.designCost)}, marketing ${money(e.marketCost)}, production ${money(e.productionCost)}).` };
  const p = e.plan, sd = SPENDS[p.spend], mk = MARKETS[p.market], pAvg = (b.price[0] + b.price[1]) / 2, qAvg = (b.quality[0] + b.quality[1]) / 2, y = yearOf(s), ch = caps(b), c = b.channels;
  const amb = b.models.reduce((a, m) => a + m.fame * 0.12 * (m.audience === b.audience ? 1.4 : 0.6), 0), vfm = (qAvg - pAvg) * 4;
  spend(s, upfront); const A = b.acct; A.costs.design += e.designCost; A.costs.marketing += e.marketCost; A.costs.cogs += e.productionCost;
  let units = 0, sold = 0, rev = 0, unsold = 0, markdown = 0; const rows = [], channelsRev = { store: 0, online: 0, wholesale: 0 }, total = { prod: 0 };
  const shareSum = (c.stores ? CH.store.share : 0) + (c.online ? CH.online.share : 0) + (c.wholesale ? CH.wholesale.share : 0) || 1;
  // line-by-line scores: one noise draw per line (hits and flops differ by line)
  const lineScores = [];
  for (const L0 of e.lines) {
    const score = clamp(34 + QUALITY[R(qAvg)].score + b.stats.design * 0.22 + b.stats.quality * 0.1 + sk(b, 'designer') * 0.18 + sd.score + L0.trend * 14 + (L0.fit - 1) * 22 + vfm + b.rep * 0.1 + amb + mk.score + sk(b, 'marketer') * 0.08 + (b.hype || 0) + gauss(s) * 9, 0, 100);
    const demand = L0.demandBase * clamp((score - 20) / 45, 0.12, 2.2) * mk.reach * (1 + (b.hype || 0) / 100); const lsold = Math.min(L0.produced, demand);
    // channel limits (shared across lines pro-rata)
    lineScores.push({ L0, score, demand, lsold });
  }
  const totDemand = lineScores.reduce((a, x) => a + x.lsold, 0) || 1, chanSold = {};
  for (const k of ['store', 'online', 'wholesale']) { const have = k === 'store' ? c.stores : k === 'online' ? c.online : c.wholesale; chanSold[k] = have ? Math.min(ch[k], totDemand * (CH[k].share / shareSum)) : 0; }
  const reachable = chanSold.store + chanSold.online + chanSold.wholesale, scale = Math.min(1, reachable / totDemand);
  for (const x of lineScores) {
    const ls = x.lsold * scale, share = (k) => (reachable ? chanSold[k] / reachable : 0); let lrev = 0;
    for (const k of ['store', 'online', 'wholesale']) { const u = ls * share(k), price = x.L0.unitPrice * (k === 'wholesale' ? CH.wholesale.price : 1), r1 = u * price * (k === 'online' ? 1 - CH.online.fee : 1); channelsRev[k] += r1; lrev += r1; if (k === 'online') A.costs.fees += u * price * CH.online.fee; }
    const left = Math.max(0, x.L0.produced - ls), md = left * x.L0.unitPrice * 0.3; lrev += md; markdown += md; unsold += left; sold += ls; units += x.L0.produced; rev += lrev;
    const lab = x.score >= 88 ? 'viral hit' : x.score >= 72 ? 'hit' : x.score >= 50 ? 'solid' : x.score >= 32 ? 'flop' : 'disaster';
    rows.push({ id: x.L0.id, name: x.L0.name, icon: x.L0.icon, score: R(x.score), label: lab, produced: x.L0.produced, sold: R(ls), unsold: R(left), revenue: R(lrev), cost: x.L0.cost });
  }
  earn(s, rev); A.revenue.store += channelsRev.store; A.revenue.online += channelsRev.online; A.revenue.wholesale += channelsRev.wholesale; A.revenue.markdown += markdown;
  const avg = rows.reduce((a, x) => a + x.score, 0) / rows.length, best = rows.slice().sort((a, b2) => b2.score - a.score)[0], worst = rows.slice().sort((a, b2) => a.score - b2.score)[0];
  const label = avg >= 88 ? 'viral hit' : avg >= 72 ? 'hit' : avg >= 50 ? 'solid' : avg >= 32 ? 'flop' : 'disaster', sn = SEASONS.find((q) => q.id === season);
  const d = { rep: label === 'viral hit' ? 6 : label === 'hit' ? 3 : label === 'solid' ? 0.5 : label === 'flop' ? -4 : -8, fame: label === 'viral hit' ? 3 : label === 'hit' ? 1 : label === 'flop' ? -1 : label === 'disaster' ? -2 : 0 };
  b.rep = clamp(b.rep + d.rep, 0, 100); b.fame = clamp(b.fame + d.fame, 0, 100); b.hype = label === 'viral hit' ? 18 : label === 'hit' ? 8 : 0; if (label === 'hit' || label === 'viral hit') b.hits++; if (label === 'flop' || label === 'disaster') b.flops++;
  const name = `${sn.name} '${String(y).slice(-2)}: ${best.name}`, spent = upfront, profit = rev - spent;
  const col = { id: `${y}:${season}`, season, year: y, name, label, score: R(avg), revenue: R(rev), spent: R(spent), profit: R(profit), units: R(units), sold: R(sold), unsold: R(unsold), markdown: R(markdown), best: best.name, worst: worst.name, lines: rows, channels: { store: R(channelsRev.store), online: R(channelsRev.online), wholesale: R(channelsRev.wholesale) } };
  b.collections.unshift(col); if (b.collections.length > 24) b.collections.pop(); b.done[season] = col.id; b.plan[season] = null; b.totals.revenue += rev; b.totals.profit += profit; b.last = col;
  log(s, `My ${b.name} ${name} collection was a ${label}: ${money(rev)} in sales.`, 'biz'); return { ok: true, msg: `${name}: ${label} (score ${col.score}), ${money(rev)} sales on ${money(spent)} spent.`, collection: col };
}
export function launchAll(s) { const b = need(s); if (!b) return { ok: false, msg: 'No brand.' }; let n = 0, last = null, why = ''; for (const sn of SEASONS) { if (b.done[sn.id]) continue; const r = launch(s, sn.id); if (r.ok) { n++; last = r; } else { why = r.msg; break; } } return n ? { ok: true, msg: `${n} collection${n > 1 ? 's' : ''} launched.`, collection: last.collection } : { ok: false, msg: why || 'All four seasons are done this year.' }; }
// ---- yearly ----
export const payroll = (b) => b.staff.reduce((a, x) => a + x.wage, 0) + b.models.reduce((a, m) => a + R(m.fee * 0.25), 0);
export const fixedCosts = (b) => ({ wages: b.staff.reduce((a, x) => a + x.wage, 0), ambassadors: b.models.reduce((a, m) => a + R(m.fee * 0.25), 0), rent: 24000 + b.channels.stores * CH.store.rent, overhead: 18000 + b.lines.length * 2500 });
export function yearTick(s) {
  const b = need(s); if (!b) return; if (s.prison) { b.done = {}; return; }
  // seasons the player left unplanned run on the standing policy when auto is on
  if (b.policy.auto) for (const sn of SEASONS) { if (b.done[sn.id]) continue; if (!b.plan[sn.id]) planCollection(s, sn.id, {}); const r = launch(s, sn.id); if (!r.ok) break; }
  const f = fixedCosts(b), fixed = f.wages + f.ambassadors + f.rent + f.overhead; spend(s, fixed);
  const cols = b.collections.filter((c) => c.year === yearOf(s)), rev = cols.reduce((a, c) => a + c.revenue, 0), A = b.acct, spent = A.costs.cogs + A.costs.design + A.costs.marketing;
  const rec = { year: yearOf(s), revenue: { ...A.revenue, total: R(A.revenue.store + A.revenue.online + A.revenue.wholesale + A.revenue.markdown) }, costs: { ...A.costs, wages: f.wages, ambassadors: f.ambassadors, rent: f.rent, overhead: f.overhead }, collections: cols.length, hits: cols.filter((c) => /hit/.test(c.label)).length, flops: cols.filter((c) => /flop|disaster/.test(c.label)).length };
  for (const k of Object.keys(rec.revenue)) rec.revenue[k] = R(rec.revenue[k]); for (const k of Object.keys(rec.costs)) rec.costs[k] = R(rec.costs[k]);
  rec.totalCosts = R(Object.values(rec.costs).reduce((a, v) => a + v, 0)); rec.profit = rec.revenue.total - rec.totalCosts; rec.spent = R(spent); b.hist.unshift(rec); if (b.hist.length > 12) b.hist.pop();
  b.totals.profit -= fixed;
  for (const m of b.models) { m.years++; if (chance(s, 0.04)) { b.rep = clamp(b.rep - 4, 0, 100); log(s, `${m.name} caused a scandal for ${b.name}.`, 'biz'); } }
  b.models = b.models.filter((m) => m.years < 3 || chance(s, 0.5)); b.fame = Math.max(0, b.fame - 1); b.hype = 0; for (const k of Object.keys(b.stats)) b.stats[k] = Math.max(5, b.stats[k] - 2);
  b.acct = blankAcct(); b.done = {}; b.year = yearOf(s); b.plan = {};
  log(s, `${b.name}: year ${rec.profit >= 0 ? 'profit' : 'loss'} ${money(Math.abs(rec.profit))} on ${money(rec.revenue.total)} revenue.`, 'biz');
}
export const value = (s) => { const b = need(s); if (!b) return 0; const last = b.hist[0], pr = last ? Math.max(0, last.profit) : 0; return R(pr * 3 + b.rep * 12000 + b.fame * 20000 + b.channels.stores * 80000 + b.lines.length * 15000); };
export function sell(s) { const b = need(s); if (!b) return { ok: false, msg: 'No brand.' }; const v = R(value(s) * 0.7); earn(s, v); s.brand = null; log(s, `I sold my clothing brand for ${money(v)}.`, 'biz'); return { ok: true, msg: `Sold for ${money(v)}.` }; }
export function ownedRecords(s) { const b = need(s); if (!b) return []; const last = b.hist[0]; return [{ id: 'clothing_brand', brand: true, name: b.name, type: 'clothing_brand', typeName: 'Clothing brand', kind: 'brand', icon: '👗', rep: R(b.rep), staff: b.staff.length, profit: last ? last.profit : 0, revenue: last ? last.revenue.total : 0, valuation: value(s) }]; }
export function status(s) {
  const b = need(s), a = age(s), base = { age: a, locked: a < MIN_AGE, minAge: MIN_AGE, cash: R(s.cash), priceBands: PRICE_BANDS, qualities: QUALITY, audiences: AUDIENCES, seasons: SEASONS, spends: SPENDS, markets: MARKETS, volumes: VOLUMES, steps: STEPS, statDefs: STATS, roles: ROLES, lineDefs: LINES.map((l) => ({ id: l.id, name: l.name, icon: l.icon, dev: l.dev, minRep: l.minRep || 0, adultsOnly: !!l.adultsOnly, free: !!l.free })) };
  if (!b) return { ...base, brand: null, quote: quote(s, {}) };
  const f = fixedCosts(b), plans = SEASONS.map((sn) => ({ id: sn.id, name: sn.name, icon: sn.icon, done: b.done[sn.id] ? b.collections.find((c) => c.id === b.done[sn.id]) || null : null, plan: b.plan[sn.id], estimate: b.plan[sn.id] ? estimate(s, sn.id) : null }));
  return { ...base, brand: { name: b.name, logo: b.logo, founded: b.founded, years: a - b.founded, rep: R(b.rep), fame: R(b.fame), price: b.price, quality: b.quality, audience: b.audience, lines: b.lines, stats: b.stats, staff: b.staff, models: b.models, channels: b.channels, caps: caps(b), policy: b.policy, plans, collections: b.collections, hist: b.hist, last: b.last, fixed: f, fixedTotal: f.wages + f.ambassadors + f.rent + f.overhead, value: value(s), sellValue: R(value(s) * 0.7), hype: b.hype || 0, hits: b.hits, flops: b.flops, acct: { revenue: Object.fromEntries(Object.entries(b.acct.revenue).map(([k, v]) => [k, R(v)])), costs: Object.fromEntries(Object.entries(b.acct.costs).map(([k, v]) => [k, R(v)])) }, canSeason: SEASONS.filter((sn) => !b.done[sn.id]).length } };
}

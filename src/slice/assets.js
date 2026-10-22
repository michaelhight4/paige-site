// assets.js - pricing, shops, inventory, restoration, investments, luxury, zoo, race garage, casino, auctions, finances.
import { clamp, rand, randRange, randInt, randNorm, pick, ok, fail, log, spend } from './core.js';

const A = data => data.assets;
const CP = (data, cat) => A(data).pricing.categories[cat];

// ---- pricing -----------------------------------------------------------
export function conditionFactor(data, cond) {
  const pts = A(data).pricing.condition_curve, c = clamp(cond, 0, 100);
  for (let i = 1; i < pts.length; i++) if (c <= pts[i][0]) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * (c - x0) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
}
function ageFactor(data, asset) {
  const P = A(data).pricing, cp = CP(data, asset.cat);
  if (asset.cat === 'property') return 1;                         // property value is carried in asset.base (appreciates yearly)
  if (asset.cat === 'luxury') return 1;
  const baseF = Math.pow(1 - (cp.depr || 0), Math.min(asset.age, cp.depr_cap_years || 15));
  if (asset.classic && asset.age >= P.classic.min_age) {
    const gain = 1 + P.classic.appr_per_year * Math.min(asset.age - P.classic.min_age, P.classic.max_age_gain);
    return Math.max(P.classic.floor, baseF) * gain;
  }
  return baseF;
}
function rarityPremium(data, asset, cond) {
  const r = asset.rarity || 1; if (r <= 1) return 1;
  const rp = A(data).pricing.rarity_premium;
  return 1 + (r - 1) * Math.pow(clamp((cond - rp.cond_floor) / (100 - rp.cond_floor), 0, 1), rp.exponent);
}
// assetValue(data, asset[, overrides{cond,rarity}]) -> number (current market value)
export function assetValue(data, asset, ov = {}) {
  const cond = ov.cond ?? asset.cond;
  const cp = CP(data, asset.cat);
  let v = asset.base * conditionFactor(data, cond) * ageFactor(data, asset) * rarityPremium(data, ov.rarity ? { ...asset, rarity: ov.rarity } : asset, cond);
  if (asset.cat === 'property') {
    const up = (asset.amenities || []).reduce((s, a) => s + a.uplift, 0);
    v *= (1 + up / 100) * (asset.value_mult || 1);
  }
  v *= asset.cmult || 1; // lifesim merge: rare-color multiplier
  if (asset.fake) v *= A(data).shops.find(s => s.fake)?.fake_price_mult ?? 0.04;
  return Math.max(asset.cat === 'car' && cond <= 0 ? cp.scrap_value : 1, Math.round(v));
}
// refValue: value at condition 80 with no rarity premium (basis for restoration costs)
export const refValue = (data, asset) => assetValue(data, { ...asset, rarity: 1 }, { cond: 80 });

function uid(state) { return 'a' + state.nextUid++; }
function makeAsset(data, state, cat, tpl, ov = {}) {
  const a = {
    uid: uid(state), cat, tpl: tpl.id, name: tpl.name, base: tpl.base,
    age: ov.age ?? randInt(state, ...(tpl.age || [0, 5])), cond: ov.cond ?? randInt(state, ...(tpl.cond || [50, 100])),
    rarity: tpl.rarity || 1, classic: !!tpl.classic, perf: tpl.perf, wreck: !!tpl.wreck, kind: tpl.kind, carats: tpl.carats,
    haunted: !!tpl.haunted, value_mult: tpl.value_mult, beds: tpl.beds, baths: tpl.baths, sqft: tpl.sqft, acres: tpl.acres,
    amenities: [], upkeep_mult: 1, tune: 0, loan: null,
  };
  if (cat === 'property') {
    const n = A(data).names;
    a.address = `${randInt(state, 10, 9899)} ${pick(state, n.streets)} ${pick(state, n.suffixes)}, ${pick(state, n.cities)}`;
    if (a.haunted) a.haunt = randInt(state, 30, 90);
  }
  if (data.decorate) data.decorate(a, state); // lifesim merge: recolor variant (art, vseed, cmult)
  for (const k of Object.keys(a)) if (a[k] === undefined) delete a[k];
  return a;
}

// ---- shops / listings ---------------------------------------------------
export const listShops = (data) => A(data).shops.map(s => ({ id: s.id, name: s.name, category: s.category, kind: s.kind, blurb: s.blurb, count: s.count, fake: !!s.fake }));
export function generateListings(data, state, shopId) {
  const shop = A(data).shops.find(s => s.id === shopId); if (!shop) return [];
  let pool = A(data).catalogs[shop.catalog].filter(t => !shop.pick || shop.pick.includes(t.id));
  pool = pool.slice(); const out = [];
  for (let i = 0; i < shop.count; i++) {
    if (!pool.length) pool = A(data).catalogs[shop.catalog].filter(t => !shop.pick || shop.pick.includes(t.id));
    const t = pool.splice(Math.floor(rand(state) * pool.length), 1)[0];
    const ov = {};
    if (shop.age) ov.age = randInt(state, ...shop.age);
    if (shop.cond) ov.cond = randInt(state, ...shop.cond);
    const a = makeAsset(data, state, shop.category, t, ov);
    if (shop.fake) { a.fake = true; a.name += ' (Costume)'; }
    a.price = Math.max(1, Math.round(assetValue(data, a) * randRange(state, ...shop.markup)));
    a.shopId = shopId; out.push(a);
  }
  return out.sort((x, y) => x.price - y.price);
}
export function ensureShop(data, state, shopId) {
  if (!state.shops[shopId]) state.shops[shopId] = generateListings(data, state, shopId);
  return state.shops[shopId];
}
// listListings: current listings for a shop (generated on first visit)
export const listListings = (data, state, shopId) => ensureShop(data, state, shopId).map(a => ({ ...a, value: assetValue(data, a), condition: a.cond }));
// refreshInventory: FREE (no ad). shopId or 'all'
export function refreshInventory(data, state, shopId = 'all') {
  const ids = shopId === 'all' ? A(data).shops.map(s => s.id) : [shopId];
  for (const id of ids) state.shops[id] = generateListings(data, state, id);
  return ok('Inventory refreshed.');
}

// ---- buying / selling ---------------------------------------------------
export function checkBuy(data, state, cat) {
  const cp = CP(data, cat), reasons = [];
  if (cp.min_age && state.age < cp.min_age) reasons.push('Must be ' + cp.min_age + '+');
  if (cp.license && !state.licenses.includes(cp.license)) reasons.push('Needs ' + A(data).licenses.find(l => l.id === cp.license).name);
  if (state.assets[cat].length >= cp.max_owned) reasons.push('Owned limit reached (' + cp.max_owned + ')');
  return reasons;
}
// buyAsset(data,state,shopId,uid,{financing:'cash'|'loan'})
export function buyAsset(data, state, shopId, listingUid, opts = {}) {
  const list = ensureShop(data, state, shopId), i = list.findIndex(a => a.uid === listingUid);
  if (i < 0) return fail('Listing no longer available');
  const a = list[i], reasons = checkBuy(data, state, a.cat);
  if (reasons.length) return fail(reasons.join(', '), { reasons });
  const price = a.price; let down = price, loan = null;
  if (opts.financing === 'loan') {
    const L = A(data).pricing.loans[a.cat]; if (!L) return fail('No financing for this item');
    down = Math.round(price * L.down_pct); loan = { balance: price - down, rate: L.rate, term_left: L.term };
  }
  if (state.cash < down) return fail('Not enough cash (need ' + down + ')', { need: down });
  state.cash -= down;
  const owned = { ...a }; delete owned.price; delete owned.shopId; owned.paid = price; owned.bought_age = state.age; owned.loan = loan;
  state.assets[a.cat].push(owned); list.splice(i, 1);
  log(state, `Bought ${a.address || a.name} for ${price}`);
  return ok(`Bought ${a.address || a.name}.`, { asset: owned, paid: down, price });
}
export function findAsset(state, auid) {
  for (const cat of Object.keys(state.assets)) { const a = state.assets[cat].find(x => x.uid === auid); if (a) return a; }
  return null;
}
export function sellQuote(data, state, auid) {
  const a = findAsset(state, auid); if (!a) return null;
  const v = assetValue(data, a), cp = CP(data, a.cat);
  const gross = Math.round(v * cp.sell_factor), loan = a.loan ? Math.round(a.loan.balance) : 0;
  return { value: v, gross, loan, net: gross - loan, fraud: !!a.fake };
}
export function sellAsset(data, state, auid, opts = {}) {
  const a = findAsset(state, auid); if (!a) return fail('Not found');
  if (a.restoring) return fail('Being restored - wait for the project to finish');
  const q = sellQuote(data, state, auid);
  state.assets[a.cat] = state.assets[a.cat].filter(x => x.uid !== auid);
  state.raceGarage = state.raceGarage.filter(x => x !== auid);
  state.cash += q.net; if (q.net < 0) { state.debt += -q.net; state.cash -= -q.net; state.cash = Math.max(0, state.cash); }
  let msg = `Sold ${a.address || a.name} for ${q.gross}${q.loan ? ' (loan payoff ' + q.loan + ')' : ''}.`;
  if (q.fraud && !opts.disclose) { state.flags.fraud++; state.stats.happiness = clamp(state.stats.happiness - 8, 0, 100); msg += ' Selling fakes as real is FRAUD (flag raised).'; }
  log(state, msg); return ok(msg, { net: q.net, fraud: q.fraud && !opts.disclose });
}
export function listInventory(data, state, cat) {
  const cats = cat ? [cat] : Object.keys(state.assets);
  const out = [];
  for (const c of cats) for (const a of state.assets[c]) out.push({ ...a, value: assetValue(data, a), annual_upkeep: annualUpkeep(data, a), loan_balance: a.loan ? Math.round(a.loan.balance) : 0, restoring: a.restoring || null });
  return out;
}
export function annualUpkeep(data, a) {
  const cp = CP(data, a.cat); if (!cp.upkeep_pct) return 0;
  return Math.round(assetValue(data, a) * (cp.upkeep_pct + (cp.upkeep_age_pct || 0) * (a.age || 0)) * (a.upkeep_mult || 1));
}
export function addAmenity(data, state, auid, amenityId) {
  const a = findAsset(state, auid); if (!a || a.cat !== 'property') return fail('Properties only');
  const am = A(data).pricing.amenities.find(x => x.name === amenityId); if (!am) return fail('Unknown amenity');
  if (a.amenities.some(x => x.name === am.name)) return fail('Already installed');
  const cost = Math.round((am.price_min + am.price_max) / 2);
  if (state.cash < cost) return fail('Not enough cash'); state.cash -= cost;
  a.amenities.push({ name: am.name, uplift: am.value_uplift_pct }); return ok(`Installed ${am.name} (+${am.value_uplift_pct}% value).`, { cost });
}
export function playInstrument(data, state, auid) {
  const a = findAsset(state, auid); if (!a || a.cat !== 'instrument') return fail('Not an instrument');
  a.cond = clamp(a.cond - randInt(state, 1, 3), 0, 100); state.stats.happiness = clamp(state.stats.happiness + 3, 0, 100);
  return ok(`You play the ${a.name}. Condition ${a.cond}.`);
}
export function getLicense(data, state, id) {
  const l = A(data).licenses.find(x => x.id === id); if (!l) return fail('Unknown license');
  if (state.licenses.includes(id)) return fail('Already licensed');
  if (state.cash < l.cost) return fail('Need ' + l.cost); state.cash -= l.cost; state.licenses.push(id); return ok('You earned: ' + l.name);
}

// ---- restoration (cars; same condition system for properties/boats/etc) --
export function listPlans(data, cat) { return A(data).restoration.plans[cat] || []; }
export function restoreQuote(data, state, auid, planId, opts = {}) {
  const a = findAsset(state, auid); if (!a) return null;
  const plan = listPlans(data, a.cat).find(p => p.id === planId); if (!plan) return null;
  const R = A(data).restoration, ref = refValue(data, a);
  const target = Math.min(100, a.cond + plan.cond_gain, 100);
  const gain = target - a.cond;
  const scale = plan.cond_gain >= 100 ? clamp(gain / 100, 0.2, 1) : gain / plan.cond_gain;   // partial gains cost proportionally
  let parts = Math.round(ref * plan.parts_pct * scale), labor = Math.round(ref * plan.labor_pct * scale), months = plan.months;
  if (opts.diy) { labor = Math.round(labor * R.diy.labor_mult); months = Math.ceil(months * R.diy.months_mult); }
  if (opts.rush) { parts = Math.round(parts * R.rush.cost_mult); labor = Math.round(labor * R.rush.cost_mult); months = Math.max(1, Math.ceil(months * R.rush.months_mult)); }
  const after = assetValue(data, a, { cond: Math.max(target, plan.min_cond_after || 0) > 100 ? 100 : (plan.min_cond_after && gain > 0 ? Math.max(target, plan.min_cond_after) : target) });
  const before = assetValue(data, a);
  return { plan, parts, labor, total: parts + labor, months, target, gain, value_before: before, value_after: after, profit: after - before - parts - labor, ref };
}
export function startRestoration(data, state, auid, planId, opts = {}) {
  const a = findAsset(state, auid); if (!a) return fail('Not found');
  if (a.restoring) return fail('Already being restored');
  if (state.projects.length >= A(data).restoration.max_projects) return fail('Garage full (max ' + A(data).restoration.max_projects + ' projects)');
  const q = restoreQuote(data, state, auid, planId, opts); if (!q) return fail('Unknown plan');
  if (q.gain <= 0) return fail('Already in perfect condition');
  if (state.cash < q.total) return fail('Need ' + q.total + ' for parts + labor', { need: q.total });
  state.cash -= q.total;
  a.restoring = { plan: planId, monthsLeft: q.months, monthsTotal: q.months, target: q.target, diy: !!opts.diy, cost: q.total };
  state.projects.push(auid); state.raceGarage = state.raceGarage.filter(x => x !== auid);
  log(state, `Started ${q.plan.name} on ${a.name}`);
  return ok(`${q.plan.name} started: ${q.months} month(s), cost ${q.total}.`, { quote: q });
}
export const restoreCar = (data, state, auid, planId, opts) => {
  const a = findAsset(state, auid); if (!a || a.cat !== 'car') return fail('Not a car');
  return startRestoration(data, state, auid, planId, opts);
};
export const renovateProperty = (data, state, auid, planId, opts) => {
  const a = findAsset(state, auid); if (!a || a.cat !== 'property') return fail('Not a property');
  return startRestoration(data, state, auid, planId, opts);
};
export function listProjects(data, state) {
  return state.projects.map(id => findAsset(state, id)).filter(Boolean).map(a => ({ uid: a.uid, name: a.name, cat: a.cat, cond: a.cond, ...a.restoring, value: assetValue(data, a) }));
}
function progressProjects(data, state, months, out) {
  for (const id of [...state.projects]) {
    const a = findAsset(state, id); if (!a || !a.restoring) { state.projects = state.projects.filter(x => x !== id); continue; }
    a.restoring.monthsLeft -= months;
    if (a.restoring.monthsLeft <= 0) {
      const plan = listPlans(data, a.cat).find(p => p.id === a.restoring.plan);
      if (a.restoring.diy && rand(state) < A(data).restoration.diy.fail_chance) {
        const keep = A(data).restoration.diy.fail_loss_pct; const lost = Math.round((a.restoring.target - a.cond) * keep);
        a.cond = Math.min(100, a.cond + (a.restoring.target - a.cond) - lost); out.push(`DIY mishap on ${a.name}: only partly restored (cond ${a.cond}).`);
      } else a.cond = Math.max(a.restoring.target, plan && plan.min_cond_after && a.restoring.target >= 100 ? plan.min_cond_after : 0, Math.min(100, a.restoring.target));
      if (plan && plan.upkeep_add) a.upkeep_mult = (a.upkeep_mult || 1) + plan.upkeep_add;
      out.push(`${a.name}: ${plan ? plan.name : 'restoration'} complete! Condition ${a.cond}, worth ${assetValue(data, a)}.`);
      a.restoring = null; state.projects = state.projects.filter(x => x !== id);
    }
  }
}

// ---- investments --------------------------------------------------------
export const investmentItems = data => A(data).investments.items;
export function listInvestments(data, state, type) {
  return A(data).investments.items.filter(i => !type || i.type === type).map(i => {
    const h = state.invest[i.id] || { units: 0, cost: 0 }, price = state.market[i.id] ?? i.price, value = h.units * price;
    return { ...i, price, units: h.units, value, cost: h.cost, pnl: value - h.cost };
  });
}
export function buyInvestment(data, state, id, amount) {
  const it = A(data).investments.items.find(i => i.id === id); if (!it) return fail('Unknown');
  const price = state.market[id], dec = it.decimals ?? (it.type === 'stock' || it.type === 'fund' ? 2 : 0), f = Math.pow(10, dec);
  const units = Math.floor(amount / price * f) / f;
  if (units < it.min) return fail(`Minimum purchase: ${it.min} units (~${Math.ceil(it.min * price)})`);
  const cost = units * price; if (cost > state.cash + 1e-6) return fail('Not enough cash');
  state.cash -= cost; const h = state.invest[id] || (state.invest[id] = { units: 0, cost: 0 }); h.units += units; h.cost += cost;
  return ok(`Bought ${units} ${it.name}.`, { units, cost });
}
export function maxBuy(data, state, id) { const it = A(data).investments.items.find(i => i.id === id); if (!it) return null; const price = state.market[id] ?? it.price, dec = it.decimals ?? (it.type === 'stock' || it.type === 'fund' ? 2 : 0), f = Math.pow(10, dec); const units = Math.floor(Math.max(0, state.cash) / price * f) / f; return { units, cost: units * price, price, ok: units >= it.min }; }
export function sellInvestment(data, state, id, units = 'all') {
  const h = state.invest[id]; if (!h || h.units <= 0) return fail('You do not own this');
  const u = units === 'all' ? h.units : Math.min(units, h.units), price = state.market[id], proceeds = u * price;
  h.cost *= (h.units - u) / h.units; h.units -= u; state.cash += proceeds; if (h.units <= 1e-9) delete state.invest[id];
  return ok(`Sold ${u} units for ${Math.round(proceeds)}.`, { proceeds });
}
// sectors for news (headlines move whole sectors or single names)
export const INV_SECTOR = { stk_nimbus: 'tech', stk_orchard: 'tech', stk_ironworks: 'industry', stk_greenleaf: 'food', stk_voltix: 'auto', stk_atlas: 'banks', fund_index: 'market', fund_growth: 'tech', fund_reit: 'property', fund_bond: 'rates', bond_treasury: 'rates', bond_corp: 'rates', bond_muni: 'rates', pny_lumo: 'mining', pny_zing: 'food', pny_quark: 'biotech', pny_dusty: 'energy', cry_bitcell: 'crypto', cry_ethos: 'crypto', cry_dogewood: 'crypto', cry_stablex: 'stable' };
const NEWS_T = {
  up: { sector: ['{S} sector braces for a boom year as orders pile up', 'Analysts upgrade the whole {S} sector', '{S} demand surges ahead of the holidays'], name: ['{N} posts record earnings', '{N} wins a huge government contract', 'Insiders are quietly buying {N}'], crypto: ['Crypto hype returns: {N} trends worldwide', 'Big funds start buying {N}'], rates: ['Central bank hints at rate cuts', 'Inflation cools faster than expected'] },
  down: { sector: ['{S} faces new regulations and a slow year', 'Warning signs pile up across {S}', '{S} sector hit by supply shortages'], name: ['{N} under investigation over its accounts', '{N} recalls its flagship product', '{N} CEO resigns in a scandal'], crypto: ['Exchange hack rattles {N} holders', 'Regulators circle {N}'], rates: ['Central bank signals more rate hikes', 'Bond markets brace for inflation'] },
};
const SECTOR_NAME = { tech: 'Tech', industry: 'Heavy industry', food: 'Food', auto: 'Auto', banks: 'Banking', market: 'The broad market', property: 'Real estate', rates: 'Bond', mining: 'Mining', biotech: 'Biotech', energy: 'Energy', crypto: 'Crypto', stable: 'Stablecoin' };
// news for the coming year: 4 headlines, each a hint (up/down) that is right about 75% of the time; the real move is applied in investmentYear
function makeNews(data, state) {
  const items = A(data).investments.items.filter((i) => INV_SECTOR[i.id] !== 'stable'), out = [], used = new Set();
  for (let k = 0; k < 4 && items.length; k++) {
    const it = items[Math.floor(rand(state) * items.length)]; const sec = INV_SECTOR[it.id] || 'market'; if (used.has(sec)) continue; used.add(sec);
    const dir = rand(state) < 0.5 ? 'up' : 'down', real = rand(state) < 0.75; const T = NEWS_T[dir]; const pool = sec === 'crypto' ? T.crypto : sec === 'rates' ? T.rates : rand(state) < 0.5 ? T.sector : T.name;
    const text = pool[Math.floor(rand(state) * pool.length)].replace('{S}', SECTOR_NAME[sec] || sec).replace('{N}', it.name);
    out.push({ id: it.id, sector: sec, scope: /\{N\}/.test(pool[0]) || sec === 'crypto' ? 'name' : 'sector', dir, real, text });
  }
  state.news = { age: (state.age | 0) + 1, items: out };
}
// effect of last year's headlines on this year's drift (true hints push the way they said, misleading ones push the other way, a bit weaker)
function newsShift(state, it) {
  const n = state.news; if (!n || !n.items) return 0; let sh = 0;
  for (const x of n.items) { const hit = x.scope === 'name' ? x.id === it.id : INV_SECTOR[it.id] === x.sector; if (!hit) continue; const s = (x.dir === 'up' ? 1 : -1) * (x.real ? 1 : -0.6); sh += s * Math.max(0.06, (it.sigma || 0.1) * 0.8); }
  return sh;
}
// price history per asset (backfilled once so charts have a past), yearly snapshots per holding and for the whole portfolio
function ensureHist(data, state) {
  state.priceHist = state.priceHist || {}; const age = state.age | 0;
  for (const it of A(data).investments.items) {
    if (state.priceHist[it.id] && state.priceHist[it.id].length) continue;
    const p0 = state.market[it.id] ?? it.price, arr = []; let p = p0; const r = (k) => { const x = Math.sin((k + 1) * 9301 + it.id.length * 49297) * 233280; return x - Math.floor(x); };
    for (let k = 0; k < 12; k++) { arr.unshift({ age: age - k, price: Math.round(p * 10000) / 10000 }); const z = (r(k) + r(k + 7) + r(k + 13) - 1.5) * 2; p = Math.max(0.01, p / Math.exp((it.mu || 0) + (it.sigma || 0.05) * z)); }
    state.priceHist[it.id] = arr;
  }
}
export const __marketYear = (data, state, out) => investmentYear(data, state, out); // test hook
export function investHistory(data, state) { ensureHist(data, state); return { prices: state.priceHist, holdings: state.invHist || {}, portfolio: state.portHist || [], news: state.news || null }; }
function investmentYear(data, state, out) {
  ensureHist(data, state); state.invHist = state.invHist || {}; state.portHist = state.portHist || [];
  let pStart = 0, pEnd = 0; const start = {};
  for (const it of A(data).investments.items) { const h = state.invest[it.id]; if (h && h.units > 0) { start[it.id] = { v: h.units * state.market[it.id], cost: h.cost, units: h.units }; pStart += start[it.id].v; } }
  for (const it of A(data).investments.items) {
    let p = state.market[it.id], sig = it.sigma, mu = it.mu + newsShift(state, it);
    p *= Math.exp(mu - 0.5 * sig * sig + sig * randNorm(state));
    if (it.bust && rand(state) < it.bust) { p *= 0.05; const h = state.invest[it.id]; if (h) out.push(`${it.name} collapsed!`); }
    else if (it.moon && rand(state) < it.moon) { p *= 5; const h = state.invest[it.id]; if (h) out.push(`${it.name} skyrocketed!`); }
    state.market[it.id] = Math.max(0.01, Math.round(p * 10000) / 10000);
    const ph = state.priceHist[it.id]; ph.push({ age: (state.age | 0) + 1, price: state.market[it.id] }); if (ph.length > 60) ph.shift();
    const h = state.invest[it.id];
    if (h && it.yield) { const c = h.units * it.price * it.yield; state.cash += c; }
    if (start[it.id] && h) { const end = h.units * state.market[it.id]; pEnd += end; (state.invHist[it.id] = state.invHist[it.id] || []).push({ age: (state.age | 0) + 1, start: Math.round(start[it.id].v), end: Math.round(end), cost: Math.round(h.cost), pct: start[it.id].v ? Math.round((end / start[it.id].v - 1) * 1000) / 10 : 0 }); }
  }
  if (pStart > 0) state.portHist.push({ age: (state.age | 0) + 1, start: Math.round(pStart), end: Math.round(pEnd), pct: Math.round((pEnd / pStart - 1) * 1000) / 10 });
  makeNews(data, state);
}

// ---- luxury -------------------------------------------------------------
export const listLuxury = data => A(data).luxury;
export function buyLuxury(data, state, id) {
  const L = A(data).luxury, e = L.experiences.find(x => x.id === id), g = L.goods.find(x => x.id === id);
  const it = e || g; if (!it) return fail('Unknown item');
  if (state.age < 18) return fail('Must be 18+');
  if (state.cash < it.cost) return fail('Not enough cash');
  state.cash -= it.cost;
  for (const [k, v] of Object.entries(it.effects || {})) state.stats[k] = clamp(state.stats[k] + v, 0, 100);
  if (g) { const a = makeAsset(data, state, 'luxury', { id: g.id, name: g.name, base: g.base, rarity: g.rarity }, { age: 0, cond: 100 }); a.appreciates = g.appreciates || 0; a.paid = g.cost; state.assets.luxury.push(a); }
  return ok(`Purchased ${it.name}.`, { effects: it.effects });
}

// ---- zoo ----------------------------------------------------------------
export function zooStatus(data, state) {
  const Z = A(data).zoo, z = state.zoo;
  if (!z) return { open: false, setup_cost: Z.setup_cost };
  const animals = Object.entries(z.animals).filter(([, n]) => n > 0).map(([id, n]) => ({ ...Z.species.find(s => s.id === id), count: n }));
  const count = animals.reduce((s, a) => s + a.count, 0), capacity = z.enclosures * Z.enclosure_capacity;
  const visitors = animals.reduce((s, a) => s + a.count * a.visitors, 0);
  const income = Math.round(visitors * Z.ticket), costs = animals.reduce((s, a) => s + a.count * (a.upkeep + Z.staff_per_animal), 0);
  return { open: true, name: z.name, enclosures: z.enclosures, capacity, count, animals, visitors, income, costs, profit: income - costs };
}
export function openZoo(data, state, name = 'Wildlife Park') {
  const Z = A(data).zoo; if (state.zoo) return fail('Zoo already open'); if (state.age < 18) return fail('Must be 18+');
  if (state.cash < Z.setup_cost) return fail('Need ' + Z.setup_cost);
  state.cash -= Z.setup_cost; state.zoo = { name, enclosures: 1, animals: {} }; return ok('Your zoo opens its gates!');
}
export function buildEnclosure(data, state) {
  const Z = A(data).zoo; if (!state.zoo) return fail('Open a zoo first'); if (state.cash < Z.enclosure_cost) return fail('Need ' + Z.enclosure_cost);
  state.cash -= Z.enclosure_cost; state.zoo.enclosures++; return ok('Enclosure built (+' + Z.enclosure_capacity + ' capacity).');
}
export function buyAnimal(data, state, speciesId) {
  const Z = A(data).zoo, sp = Z.species.find(s => s.id === speciesId), st = zooStatus(data, state);
  if (!st.open) return fail('Open a zoo first'); if (!sp) return fail('Unknown animal');
  if (st.count >= st.capacity) return fail('No free enclosure space'); if (state.cash < sp.price) return fail('Need ' + sp.price);
  state.cash -= sp.price; state.zoo.animals[speciesId] = (state.zoo.animals[speciesId] || 0) + 1; return ok(`Added a ${sp.name}.`);
}
export function sellAnimal(data, state, speciesId) {
  const Z = A(data).zoo, sp = Z.species.find(s => s.id === speciesId);
  if (!state.zoo || !(state.zoo.animals[speciesId] > 0)) return fail('None to sell');
  state.zoo.animals[speciesId]--; state.cash += Math.round(sp.price * Z.sell_factor); return ok(`Sold a ${sp.name}.`);
}

// ---- race garage --------------------------------------------------------
export function carPerf(data, a) { return Math.round((a.perf || 30) + (a.tune || 0)); }
export function raceGarage(data, state) {
  const cars = state.raceGarage.map(id => findAsset(state, id)).filter(Boolean);
  return { slots: A(data).race.garage_slots, cars: cars.map(a => ({ ...a, perf: carPerf(data, a), value: assetValue(data, a) })), races: A(data).race.races, tuning: A(data).race.tuning };
}
export function addToGarage(data, state, auid) {
  const a = findAsset(state, auid); if (!a || a.cat !== 'car') return fail('Cars only');
  if (a.restoring) return fail('Car is under restoration'); if (state.raceGarage.includes(auid)) return fail('Already in garage');
  if (state.raceGarage.length >= A(data).race.garage_slots) return fail('Garage full'); state.raceGarage.push(auid); return ok(`${a.name} moved to the race garage.`);
}
export function removeFromGarage(data, state, auid) { state.raceGarage = state.raceGarage.filter(x => x !== auid); return ok('Removed.'); }
export function tuneCar(data, state, auid) {
  const R = A(data).race, a = findAsset(state, auid); if (!a || !state.raceGarage.includes(auid)) return fail('Car must be in the garage');
  const t = R.tuning[a.tune_stage || 0]; if (!t) return fail('Fully tuned');
  const cost = Math.round(refValue(data, a) * t.cost_pct); if (state.cash < cost) return fail('Need ' + cost);
  state.cash -= cost; a.tune = (a.tune || 0) + t.perf_gain; a.tune_stage = (a.tune_stage || 0) + 1; return ok(`${t.name} installed (+${t.perf_gain} perf).`, { cost });
}
export function enterRace(data, state, auid, raceId) {
  const R = A(data).race, race = R.races.find(r => r.id === raceId), a = findAsset(state, auid);
  if (!race) return fail('Unknown race'); if (!a || !state.raceGarage.includes(auid)) return fail('Move the car to your race garage first');
  if (a.restoring) return fail('Car is under restoration');
  if (race.classic_only && !a.classic) return fail('Classics only');
  if (a.cond < race.min_cond) return fail(`Condition ${race.min_cond}+ required`);
  if (state.cash < race.entry) return fail('Entry fee ' + race.entry);
  state.cash -= race.entry;
  const mine = carPerf(data, a) * (0.5 + a.cond / 200) * randRange(state, 0.85, 1.15) + state.stats.smarts / 50;
  let pos = 1;
  for (let i = 0; i < R.field_size - 1; i++) if (randRange(state, ...race.field_perf) * randRange(state, 0.85, 1.15) > mine) pos++;
  const prize = race.purse[pos - 1] || 0; state.cash += prize;
  a.cond = clamp(a.cond - randInt(state, ...race.wear), 0, 100);
  let msg = `Finished ${pos}${['st', 'nd', 'rd'][pos - 1] || 'th'} in ${race.name}${prize ? ', won ' + prize : ''}.`, crashed = false;
  if (rand(state) < race.crash) { crashed = true; a.cond = clamp(a.cond - randInt(state, ...R.crash_loss), 0, 100); msg += ' You crashed - big damage!'; }
  return ok(msg, { position: pos, prize, crashed, cond: a.cond });
}

// ---- casino ---------------------------------------------------------------
export const listCasino = data => A(data).casino;
export function playTable(data, state, tableId, bet) {
  const C = A(data).casino, t = C.tables.find(x => x.id === tableId);
  if (!t) return fail('Unknown table'); if (state.age < C.min_age) return fail('Must be ' + C.min_age + '+');
  if (!(bet >= t.min_bet)) return fail('Minimum bet ' + t.min_bet); if (bet > t.max_bet) return fail('Maximum bet ' + t.max_bet);
  if (bet > state.cash) return fail('Not enough cash');
  let p = t.win_p + (t.skill_stat ? (state.stats[t.skill_stat] - 50) * C.smarts_bonus : 0);
  state.cash -= bet; const r = rand(state);
  if (t.jackpot_p && r < t.jackpot_p) { const w = bet * t.jackpot; state.cash += w; state.casino.net += w - bet; return ok(`JACKPOT! +${w}`, { win: true, jackpot: true, delta: w - bet }); }
  if (rand(state) < p) { const w = Math.round(bet * (1 + t.payout)); state.cash += w; state.casino.net += w - bet; state.casino.losses = 0; return ok(`${t.merchant}: you win ${w - bet}!`, { win: true, delta: w - bet }); }
  state.casino.net -= bet; state.casino.losses++; state.stats.happiness = clamp(state.stats.happiness - 1, 0, 100);
  return ok(`${t.merchant}: you lose ${bet}.`, { win: false, delta: -bet });
}

// ---- auctions -------------------------------------------------------------
export function generateAuction(data, state, houseId) {
  const H = A(data).auctions.houses.find(h => h.id === houseId); if (!H) return [];
  const lots = [];
  for (const [cat, n] of H.lots) {
    const shopLike = cat === 'car' ? A(data).catalogs.car_wrecks.concat(A(data).catalogs.car.filter(t => t.classic)) : A(data).catalogs[cat];
    let pool = shopLike.slice();
    for (let i = 0; i < n; i++) {
      if (!pool.length) pool = shopLike.slice();
      let t = pool.splice(Math.floor(rand(state) * pool.length), 1)[0];
      const a = makeAsset(data, state, cat, t);
      const val = assetValue(data, a);
      a.lot = lots.length + 1; a.houseId = houseId;
      a.estimate = [Math.round(val * 0.8), Math.round(val * 1.2)];
      a.reserve = Math.round(val * randRange(state, ...H.reserve_pct));
      a.rival = Math.round(val * randRange(state, ...H.rival_range));
      a.closed = false; lots.push(a);
    }
  }
  return lots;
}
export function listAuctions(data, state, houseId) {
  if (!houseId) return A(data).auctions.houses.map(h => ({ id: h.id, name: h.name, blurb: h.blurb, lots: h.lots.reduce((s, l) => s + l[1], 0) }));
  if (!state.auctions[houseId]) state.auctions[houseId] = generateAuction(data, state, houseId);
  // rival/reserve are hidden from the UI list
  return state.auctions[houseId].map(({ rival, reserve, ...pub }) => ({ ...pub, value: assetValue(data, pub) }));
}
export function bidAuction(data, state, houseId, lot, amount, opts = {}) {
  listAuctions(data, state, houseId);
  const L = state.auctions[houseId].find(l => l.lot === lot); if (!L) return fail('No such lot'); if (L.closed) return fail('Lot closed');
  const AU = A(data).auctions, cats = checkBuy(data, state, L.cat); if (cats.length) return fail(cats.join(', '));
  if (amount < L.estimate[0] * 0.3) return fail('Bid too low to register');
  const total = Math.round(amount * (1 + AU.buyers_premium)); if (state.cash < total) return fail(`Need ${total} (bid + ${Math.round(AU.buyers_premium * 100)}% premium)`);
  L.rounds = (L.rounds || 0) + 1;
  if (opts.live && !(amount >= L.reserve && amount >= L.rival) && L.rounds < 3) { // lifesim merge: live bidding - rival raises, lot stays open for up to 3 rounds
    L.rival = Math.round(L.rival * 1.04); const need = Math.max(L.reserve, L.rival);
    return ok(amount < L.reserve ? `The reserve has not been met. The auctioneer wants at least ${Math.round(need)}.` : `A rival bidder is at ${L.rival}. Raise?`, { won: false, open: true, rival: L.rival, need: Math.round(need), rounds: L.rounds });
  }
  L.closed = true;
  if (amount >= L.reserve && amount >= L.rival) {
    state.cash -= total; const a = { ...L }; for (const k of ['lot', 'houseId', 'estimate', 'reserve', 'rival', 'closed', 'rounds']) delete a[k];
    a.paid = total; a.bought_age = state.age; state.assets[a.cat].push(a);
    return ok(`SOLD! You won lot ${lot} (${a.address || a.name}) for ${total} incl. premium.`, { won: true, paid: total, asset: a });
  }
  return ok(amount < L.reserve ? 'Reserve not met. Lot passed.' : 'You were outbid by a rival bidder.', { won: false });
}
export function consignAuction(data, state, auid, houseId) {
  const a = findAsset(state, auid); if (!a) return fail('Not found'); if (a.restoring) return fail('Being restored');
  const AU = A(data).auctions, v = assetValue(data, a);
  const hammer = Math.round(v * randRange(state, ...AU.consign_range) * (a.rarity > 1 ? 1 + (a.rarity - 1) * 0.05 : 1));
  const net = Math.round(hammer * (1 - AU.sellers_fee)) - (a.loan ? Math.round(a.loan.balance) : 0);
  state.assets[a.cat] = state.assets[a.cat].filter(x => x.uid !== auid); state.raceGarage = state.raceGarage.filter(x => x !== auid);
  state.cash += net; return ok(`Auction hammer ${hammer}; after ${Math.round(AU.sellers_fee * 100)}% fee you receive ${net}.`, { hammer, net });
}

// ---- finances card & yearly tick -------------------------------------------
export function financesCard(data, state) {
  const byCat = {}; let assetsTotal = 0, loans = 0, upkeep = 0, loanPay = 0;
  for (const cat of Object.keys(state.assets)) {
    byCat[cat] = 0;
    for (const a of state.assets[cat]) { const v = assetValue(data, a); byCat[cat] += v; assetsTotal += v; upkeep += annualUpkeep(data, a); if (a.loan) { loans += a.loan.balance; loanPay += loanPayment(a.loan); } }
  }
  const inv = listInvestments(data, state).reduce((s, i) => s + i.value, 0), z = zooStatus(data, state);
  const zooValue = z.open ? Math.round(A(data).zoo.setup_cost * 0.7 + z.enclosures * A(data).zoo.enclosure_cost * 0.7 + z.animals.reduce((s, a) => s + a.count * a.price * 0.6, 0)) : 0;
  const salary = (state.job ? state.job.wage : 0) + (state.partTime ? state.partTime.weekly_wage * 52 : 0);
  const bondYield = listInvestments(data, state, 'bond').reduce((s, i) => s + i.units * i.price * i.yield, 0);
  const income = salary + Math.round(bondYield) + Math.max(0, z.open ? z.profit : 0);
  const expenses = A(data).living.annual_cost + Math.round(upkeep) + Math.round(loanPay) + (z.open && z.profit < 0 ? -z.profit : 0);
  return { cash: Math.round(state.cash), debt: Math.round(state.debt), loans: Math.round(loans), assets: Math.round(assetsTotal), by_category: byCat, investments: Math.round(inv), zoo: zooValue,
    net_worth: Math.round(state.cash + assetsTotal + inv + zooValue - state.debt - loans), income, expenses, cashflow: income - expenses,
    breakdown: { salary, bond_yield: Math.round(bondYield), zoo: z.open ? z.profit : 0, living: A(data).living.annual_cost, upkeep: Math.round(upkeep), loan_payments: Math.round(loanPay) } };
}
function loanPayment(l) { return l.balance * l.rate + l.balance / Math.max(1, l.term_left); }
export const netWorth = (data, state) => financesCard(data, state).net_worth;

export function assetsYear(data, state, out) {
  state.age += 0; // age handled by sim
  for (const cat of Object.keys(state.assets)) {
    const cp = CP(data, cat);
    for (const a of [...state.assets[cat]]) {
      a.age++;
      if (!a.restoring || true) a.cond = clamp(a.cond - randInt(state, ...cp.cond_decay), 0, 100);
      if (cat === 'property') a.base = Math.round(a.base * (1 + cp.appreciation + 0.01 * (a.cond - 50) / 50 + randNorm(state) * 0.015));
      if (cat === 'luxury' && a.appreciates) a.base = Math.round(a.base * (1 + a.appreciates));
      const up = annualUpkeep(data, a); spend(state, up);
      if (a.loan) { const pay = Math.min(loanPayment(a.loan), a.loan.balance * (1 + a.loan.rate)); a.loan.balance = Math.max(0, a.loan.balance * (1 + a.loan.rate) - pay); a.loan.term_left--; spend(state, pay); if (a.loan.balance < 1 || a.loan.term_left <= 0) { if (a.loan.balance >= 1) spend(state, a.loan.balance); a.loan = null; } }
      if (cat === 'car' && a.cond <= 0 && !a.restoring) { out.push(`${a.name} broke down for good and was scrapped (+${cp.scrap_value}).`); state.cash += cp.scrap_value; state.assets.car = state.assets.car.filter(x => x.uid !== a.uid); state.raceGarage = state.raceGarage.filter(x => x !== a.uid); }
    }
  }
  const z = zooStatus(data, state); if (z.open) { state.cash += z.income; spend(state, z.costs); if (z.profit) out.push(`Zoo profit this year: ${z.profit}`); }
  investmentYear(data, state, out);
  state.auctions = {};
  if (data.hostEconomy) return; // lifesim merge: the host charges living costs/debt interest itself
  spend(state, A(data).living.annual_cost);
  if (state.debt > 0 && state.cash > 0) { const pay = Math.min(state.cash * 0.25, state.debt); state.cash -= pay; state.debt -= pay; }
  if (state.debt > 0) state.debt *= 1.07;
}
export { progressProjects };

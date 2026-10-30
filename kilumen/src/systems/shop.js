// Kilumen shop + money: regional prices, stock by Master coins, staff/board discount, buy/sell, trainer money.
// systems-gd pass, Oct 22, 2026. Money lives in save.coins (save.js v2). NOTE: the text var {coins} is the
// Masters' coin count (lines.js coinCount); money text uses {total}/{fee}/{amount}/{price}.
import { fmtMoney } from './config.js?v=v0.2.94-alpha';
import { CRYSTAL_GRADES, crystalRank } from './data/crystal_grades.js?v=v0.2.94-alpha'; // board-gated crystal grades (Oct 23, 2026)

// src/systems/data/shops.json is loaded once (fetch in the browser, fs in node) before the shop is used;
// no JSON import attributes so older Safari/Firefox still run the zero-build game.
let DATA = null;
export function setShopsData(d) { DATA = d; return d; }
export function getShops() { if (!DATA) throw new Error('shops.json not loaded: await loadShopsData()'); return DATA; }
export async function loadShopsData(url = new URL('./data/shops.json', import.meta.url)) {
  if (DATA) return DATA;
  if (url.protocol === 'file:') { const fs = await import('node:fs/promises'); return setShopsData(JSON.parse(await fs.readFile(url, 'utf8'))); }
  const r = await fetch(url);
  if (!r.ok) throw new Error(`shops.json: HTTP ${r.status}`);
  return setShopsData(await r.json());
}
export const regionOf = (zone, shops = getShops()) => shops.regions[zone] || shops.regions[shops.zoneAlias?.[zone]] || shops.regions._default; // zoneAlias: Sunmeadow -> Tidewater Coast row (Oct 29 2026)

export class Wallet {
  constructor(n = 0) { this.n = Math.max(0, Math.floor(Number(n) || 0)); }
  get coins() { return this.n; }
  add(n) { n = Math.max(0, Math.floor(Number(n) || 0)); this.n += n; return n; }
  /** Take n if affordable. */
  spend(n) { n = Math.max(0, Math.floor(n)); if (n > this.n) return false; this.n -= n; return true; }
  /** Take up to n; returns what was taken (blackout copay). */
  take(n) { const t = Math.min(this.n, Math.max(0, Math.floor(n))); this.n -= t; return t; }
}

/**
 * Discount 0..cap: staff (Company ID level >= discount.idLevel) + Benefits Board store-discount node.
 * company.board is the save.js / docs/systems_open_source_eval.md §8 shape: { nodeId: rank } (integer ranks, e.g.
 * { walk: 2, travel_land: 1 }), NOT a fraction. The node id and its rank -> fraction table live in shops.json
 * discount.boardNode / boardTiers (spec §7.3 Store discount I-III = 3/6/10%). Stacks with staff, capped (Gary: 65%).
 * Fixed in the systems merge, Oct 22, 2026 (was company.board.shopDiscount, a shape the company code never writes).
 */
export function discountFor(company = {}, shops = getShops()) {
  const d = shops.discount;
  const staff = (company?.idLevel || 1) >= d.idLevel ? d.staff : 0;
  const tiers = d.boardTiers || [0], rank = Math.max(0, Math.floor(Number(company?.board?.[d.boardNode || 'store_discount']) || 0));
  const board = tiers[Math.min(rank, tiers.length - 1)] || 0;
  return Math.min(d.cap, staff + board);
}

export function basePrice(id, zone, shops = getShops()) {
  return regionOf(zone, shops).prices?.[id] ?? shops.basePrices[id] ?? null;
}
/** Buy price after discount (whole money, never below 1). */
export function priceOf(id, zone, discount = 0, shops = getShops()) {
  const b = basePrice(id, zone, shops);
  return b == null ? null : Math.max(1, Math.round(b * (1 - discount)));
}
/** Sell price: half the undiscounted base price (key items and unpriced items can't be sold -> null). */
export function sellPriceOf(id, zone, bag, shops = getShops()) {
  if (bag?.isKey(id)) return null;
  const b = shops.basePrices[id] ?? null;
  return b == null ? null : Math.max(1, Math.floor(b * shops.sellRate));
}

/** Stock list for a zone with `badgeCoins` Masters' coins (stock grows with coins). `company` ({board}) gates crystal grades. */
export function stockFor(zone, badgeCoins = 0, cfg = {}, shops = getShops(), company = null) {
  const out = [];
  for (const tier of regionOf(zone, shops).stock) if (badgeCoins >= tier.coins) for (const id of tier.items) if (!out.includes(id)) out.push(id);
  return boardCrystals(zone, company, out).filter((id) => id !== 'energy_tonic' || cfg.stockEnergyTonic || (cfg.potionsVsRest && cfg.potionsVsRest !== 'rest_only'));
}
/**
 * Benefits Board crystal grades (Gary 12:17 PM CT Oct 23, 2026: "you can get more powerful crystal from the board nodes";
 * data: src/systems/data/crystal_grades.js). A grade with rank > 0 is stocked only once company.board[node] >= rank, and
 * then in every board zone (priced by shops.json). Region 1 zones (hiddenInZones) and zone-less shops get no board stock; their
 * existing coin tiers stay as they were (legacyStockIn keeps Prime Crystal there).
 */
export function boardCrystals(zone, company, list) {
  const C = CRYSTAL_GRADES, hidden = !zone || C.hiddenInZones.includes(zone), rank = crystalRank(company);
  const out = list.filter((id) => { const g = C.grades.find((r) => r.item === id); return !g || g.rank <= 0 || (g.legacyStockIn || []).includes(zone) || (!hidden && rank >= g.rank); });
  if (!hidden) for (const g of C.grades) if (g.rank > 0 && rank >= g.rank && !out.includes(g.item)) out.push(g.item);
  return out;
}
/** True when the last coin unlocked a stock tier (system_shop.new_stock). */
export const newStockAt = (zone, badgeCoins, shops = getShops()) => regionOf(zone, shops).stock.some((t) => t.coins > 0 && t.coins === badgeCoins);

export class Shop {
  /** ctx: {wallet, bag, zone, company, badgeCoins, cfg, lastQty ({id: n}, saved)} */
  constructor(ctx) { Object.assign(this, { company: {}, badgeCoins: 0, cfg: {}, lastQty: {}, shops: getShops() }, ctx); }
  get discount() { return discountFor(this.company, this.shops); }
  stock() {
    return stockFor(this.zone, this.badgeCoins, this.cfg, this.shops, this.company).map((id) => ({ id, price: priceOf(id, this.zone, this.discount, this.shops), base: basePrice(id, this.zone, this.shops) }));
  }
  sellable() {
    return Object.entries(this.bag.counts).map(([id, n]) => ({ id, n, price: sellPriceOf(id, this.zone, this.bag, this.shops) }));
  }
  maxBuy(id) { const p = priceOf(id, this.zone, this.discount, this.shops); return p ? Math.max(0, Math.min(99, Math.floor(this.wallet.coins / p))) : 0; }
  /** -> {ok, total, reason?:'short'|'bag_full'|'not_stocked', short?} */
  buy(id, n = 1) {
    n = Math.max(1, Math.floor(n));
    if (!stockFor(this.zone, this.badgeCoins, this.cfg, this.shops, this.company).includes(id)) return { ok: false, reason: 'not_stocked' };
    const total = priceOf(id, this.zone, this.discount, this.shops) * n;
    if (total > this.wallet.coins) return { ok: false, reason: 'short', total, short: total - this.wallet.coins };
    const r = this.bag.add(id, n);
    if (!r.ok) { if (r.added) this.bag.remove(id, r.added); return { ok: false, reason: 'bag_full', total }; }
    this.wallet.spend(total); this.lastQty[id] = n;
    return { ok: true, total };
  }
  sell(id, n = 1) {
    n = Math.max(1, Math.floor(n));
    const p = sellPriceOf(id, this.zone, this.bag, this.shops);
    if (p == null) return { ok: false, reason: 'cant_sell' };
    if (!this.bag.remove(id, n)) return { ok: false, reason: 'none' };
    const total = p * n; this.wallet.add(total);
    return { ok: true, total };
  }
}

// ---- trainer money ----------------------------------------------------------------------------------------
const holdsGoldCoin = (party = [], cfg = {}) => party.some((c) => c?.held && c.held === (cfg.goldCoinItem || 'gold_coin'));

/**
 * Prize money for a won trainer battle: baseAmount x level (x cfg.goldCoinMult when a party creature holds the
 * gold coin). Adds it to the wallet and returns the amount (0 for bad input).
 * ctx: {wallet, party, cfg}
 */
export function awardPrize({ trainerId = null, baseAmount, level } = {}, { wallet, party = [], cfg = {} } = {}) {
  const base = Math.max(0, Math.floor(Number(baseAmount) || 0)), L = Math.max(1, Math.floor(Number(level) || 1));
  let amount = base * L;
  const coin = amount > 0 && holdsGoldCoin(party, cfg);
  if (coin) amount = Math.floor(amount * (cfg.goldCoinMult || 1.5));
  // Tally Purse (held items P2, Oct 29 2026): +10%, stacks with nothing (a gold coin on the team wins)
  const purse = amount > 0 && !coin && party.some((c) => c?.held === 'tally_purse');
  if (purse) amount = Math.floor(amount * (cfg.tallyPurseMult || 1.1));
  wallet?.add(amount);
  awardPrize.last = { trainerId, amount, coin, purse };
  return amount;
}

/**
 * trainer: {id, name?, class?, baseAmount?, level?, team?:[{level}]} -> {amount, coin, textKey, pages, vars}
 * base = trainer.baseAmount ?? shops.trainerMoney.classes[class] ?? default; level = trainer.level ?? highest team level.
 */
export function awardBattleMoney(trainer = {}, ctx = {}, shops = getShops()) {
  const tm = shops.trainerMoney;
  const baseAmount = trainer.baseAmount ?? tm.classes[trainer.class] ?? tm.default;
  const level = trainer.level ?? Math.max(1, ...(trainer.team || []).map((c) => c?.level || 1));
  const amount = awardPrize({ trainerId: trainer.id, baseAmount: Math.max(1, Math.round(baseAmount * (ctx.mult ?? 1))), level }, ctx); // ctx.mult: difficulty pay (Easy 0.6 / Hard 1.15)
  const coin = awardPrize.last.coin, key = coin ? 'payout_coin' : 'payout';
  const pages = ctx.lines?.system_trainers?.[key]?.pages || ['{trainer} hands over {total}.'];
  return { amount, coin, textKey: `system_trainers.${key}`, pages, vars: { trainer: trainer.name || trainer.id || '', total: fmtMoney(amount) } };
}

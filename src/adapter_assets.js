// Asset-side methods of the UI adapter, on the careers/assets slice (src/slice) via slice_bridge. Surfaces zoo, race garage, casino tables,
// luxury, live auctions, amenities, instruments, investments, restoration and shopping.
import { fmtMoney, fmtPrice } from './fmt.js';
import * as Bk from './bankruptcy.js';
import { D } from './data.js';
import * as B from './slice_bridge.js';
import * as Legacy from './legacy.js';
import * as Ads from './ads.js';
import { log } from './core.js';
import { voice } from './voice.js';
import * as R from './recolor.js';
import * as Char from './character.js';
import { LIVING_COST } from './engine.js';

const H = B.H;
const UI_TYPE = { car: 'car', property: 'house', boat: 'boat', aircraft: 'aircraft', jewelry: 'jewelry', instrument: 'instrument', luxury: 'luxury', clothing: 'clothing', gear: 'gear' };
const CATS = ['car', 'boat', 'aircraft', 'jewelry', 'instrument', 'luxury', 'clothing', 'gear'];

// clothing/jewelry template -> worn-sprite preview (layer on a neutral body) for shop/owned thumbnails
function wearOf(a, v) {
  const L = D.charLayers, id = a.cat === 'clothing' ? L.clothingMap[a.tpl] : a.cat === 'jewelry' ? L.jewelryMap[a.tpl] : null; if (!id) return null;
  const slot = Object.keys(L.layers).find((k) => L.layers[k].some((l) => l.id === id)), def = slot && L.layers[slot].find((l) => l.id === id); if (!def) return null;
  const c = (v && v.colors) || {}, cols = {};
  for (const k of def.slots) cols[k] = k === 'gem' ? (c.stone || c.accent || def.defaults.gem) : (c[k] || (k === 'fabric' ? c.body : null) || def.defaults[k]);
  return Char.previewSpec(slot, id, cols);
}
// fallback icon per auction category (never blank when no art exists)
const LOT_ICON = { property: '🏠', car: '🚗', boat: '🛥️', aircraft: '✈️', instrument: '🎻', jewelry: '💍', art: '🖼️', watch: '⌚', antique: '🏺', collectible: '🏆', clothing: '👗', gear: '🎒', luxury: '💎' };
export const assets = {
  // asset -> UI Asset (with art + recolor variant)
  asset(a, ctx = {}) {
    const d = B.sliceData(), sl = this.s.sl, v = B.variantOf(a), value = H.assetValue(d, a);
    const actions = [{ id: 'sell', label: `Sell (${fmtMoney(H.sellQuote(d, sl, a.uid)?.net ?? value)})` }];
    if (H.listPlans(d, a.cat).length && !a.restoring) actions.push({ id: 'restore', label: 'Restore' });
    if (a.cat === 'property') actions.push({ id: 'amenity', label: 'Add amenity' });
    if (a.cat === 'car') actions.push({ id: 'garage', label: sl.raceGarage.includes(a.uid) ? 'Remove from race garage' : 'Move to race garage' }, { id: 'tune', label: 'Tune (race garage)' });
    if (a.cat === 'instrument') actions.push({ id: 'play', label: 'Play it' });
    if (a.cat === 'clothing') actions.push({ id: 'recolor', label: 'Dye / recolor ($25)' });
    actions.push({ id: 'consign', label: 'Consign at auction' });
    const flags = []; if (a.classic) flags.push('classic'); if (a.haunted) flags.push('haunted'); if (a.fake) flags.push('fake'); if (a.restoring) flags.push('restoring'); if (a.premium) flags.push('gift');
    return { id: a.uid, type: UI_TYPE[a.cat] || a.cat, name: a.name, subtitle: a.address || [a.beds && a.beds + ' bd', a.baths && a.baths + ' ba', a.sqft && a.sqft + ' sqft', a.carats && a.carats + ' ct'].filter(Boolean).join(' · ') || (a.rarity > 1 ? 'Rare' : ''), value, purchasePrice: a.paid ?? a.price ?? 0, condition: a.cond, ageYears: a.age, upkeep: H.annualUpkeep(d, a),
      flags, mortgage: a.loan ? Math.round(a.loan.balance) : undefined, hauntedness: a.haunt, actions, art: a.art || null, artUrl: a.art && B.artDef(a.art) ? 'assets/art/' + B.artDef(a.art).file : null, svg: a.art ? B.svgFor(a) : null, variant: v ? { label: v.label, colors: v.colors, rarity: v.rarity, mult: v.valueMult, names: v.names } : null, wear: wearOf(a, v), restoring: a.restoring ? { monthsLeft: a.restoring.monthsLeft, monthsTotal: a.restoring.monthsTotal } : null, ...ctx };
  },
  owned(cat) { const sl = B.pull(this.s); return Object.values(sl.assets).flat().filter((a) => !cat || a.cat === cat); },
  getAssetsMenu() { const n = this.owned().length, sl = this.s.sl; return [...this.cfg.assetsMenu, { id: 'businesses', label: 'Businesses & Studios', sub: 'Companies, studios, sports teams, fleets', icon: '🏢', section: 'Business' }].map((m) => ({ ...m, badge: m.id === 'belongings' ? String(n) : m.id === 'zoo' && sl && sl.zoo ? 'Open' : m.id === 'garage' && sl ? String(sl.raceGarage.length) : undefined })); },
  getFinances() {
    const s = this.s, sl = B.pull(s), d = B.sliceData(), f = H.financesCard(d, sl), st = this.getState(), tax = s.job ? Math.round((st.job ? st.job.salary : 0)) : 0;
    const mort = this.owned().filter((a) => a.loan).map((a) => ({ assetId: a.uid, label: a.name, balance: Math.round(a.loan.balance) }));
    return { cash: Math.round(s.cash), netWorth: st.netWorth, investmentsValue: f.investments, assetsValue: f.assets + f.zoo, debts: s.debt > 1 ? [{ id: 'debt', label: 'Debt & loans', balance: Math.round(s.debt), rate: 7 }] : [], mortgages: mort,
      income: [...(st.job ? [{ label: 'Salary (after tax)', amount: Math.round(st.job.salary * (0.78)) }] : []), ...(st.partTime ? [{ label: 'Part-time', amount: st.partTime.weeklyPay * 52 }] : []), ...(f.breakdown.bond_yield ? [{ label: 'Bond yield', amount: f.breakdown.bond_yield }] : []), ...((this.s.pensions || []).length ? [{ label: 'Pensions', amount: Math.round((this.s.pensions || []).reduce((a, p) => a + (p.amount || 0), 0)) }] : []), ...(f.breakdown.dividends ? [{ label: 'Dividends (last year)', amount: f.breakdown.dividends }] : []), ...(f.breakdown.zoo > 0 ? [{ label: 'Zoo profit', amount: f.breakdown.zoo }] : [])],
      expenses: [...(s.age >= 18 ? [{ label: 'Living costs', amount: LIVING_COST }] : []), ...(f.breakdown.upkeep ? [{ label: 'Asset upkeep', amount: f.breakdown.upkeep }] : []), ...(f.breakdown.loan_payments ? [{ label: 'Loan payments', amount: f.breakdown.loan_payments }] : [])], headline: '' };
  },
  payDebt(id, amt) { const s = this.s, n0 = this.mark(), a = Math.min(amt, s.debt, s.cash); if (a <= 0) return this.res(false, 'Nothing to pay.', n0); s.cash -= a; s.debt -= a; log(s, `I paid ${fmtMoney(Math.round(a))} toward my debt.`, 'money'); return this.res(true, `Paid ${Math.round(a)}.`, n0); },
  takeLoan(amt) { const s = this.s, n0 = this.mark(); if (s.age < 18) return this.res(false, 'Adults only.', n0); if (Bk.creditBad(s)) return this.res(false, `Your credit is ruined after bankruptcy. No loans until age ${s.bk.until}.`, n0); if (s.debt + amt > Bk.loanCap(s)) return this.res(false, 'The bank says no.', n0); s.cash += amt; s.debt += amt; log(s, `I took out a ${fmtMoney(amt)} loan.`, 'money'); return this.res(true, 'Loan approved.', n0); },
  getInvestments() {
    const sl = B.pull(this.s), d = B.sliceData(), items = H.listInvestments(d, sl), risk = (i) => (i.sigma < 0.05 ? 'Very low' : i.sigma < 0.12 ? 'Low' : i.sigma < 0.25 ? 'Medium' : i.sigma < 0.6 ? 'High' : 'Very high');
    const hist = H.investHistory(d, sl), icon = (i) => (i.type === 'bond' ? '📜' : i.type === 'crypto' ? '🪙' : i.type === 'fund' ? '🧺' : i.type === 'penny' ? '🎲' : '📈');
    const chg = (id) => { const a = hist.prices[id] || []; if (a.length < 2) return 0; const x = a[a.length - 2].price, y = a[a.length - 1].price; return x ? Math.round((y / x - 1) * 1000) / 10 : 0; };
    const holdings = items.filter((i) => i.units > 0).map((i) => { const hh = (hist.holdings[i.id] || []).slice(-15); return { id: i.id, productId: i.id, label: i.name, icon: icon(i), type: i.type, units: i.units, price: i.price, value: Math.round(i.value), costBasis: Math.round(i.cost), pnl: Math.round(i.value - i.cost), pnlPct: i.cost ? (i.value - i.cost) / i.cost * 100 : 0, changePct: chg(i.id), lastYearPct: hh.length ? hh[hh.length - 1].pct : chg(i.id), history: hh, basisFlag: false, divMode: H.DIV_TYPES.includes(i.type) ? ((sl.invest[i.id] && sl.invest[i.id].divMode) || 'reinvest') : null }; });
    const tv = holdings.reduce((a, x) => a + x.value, 0), tc = holdings.reduce((a, x) => a + x.costBasis, 0);
    const L = H.invLife(sl), life = L.realized + L.income + (tv - tc);
    return { cash: Math.round(this.s.cash), total: { value: tv, cost: tc, pnl: tv - tc, pnlPct: tc ? (tv - tc) / tc * 100 : 0, dividendBalance: Math.round((sl.divBal || 0) * 100) / 100, lifetime: { pnl: Math.round(life), pct: L.bought > 0 ? (life / L.bought) * 100 : 0, realized: Math.round(L.realized), income: Math.round(L.income), unrealized: Math.round(tv - tc), bought: Math.round(L.bought) } }, portfolioHistory: hist.portfolio.slice(-15), news: hist.news,
      products: items.map((i) => ({ id: i.id, label: i.name, type: i.type, sector: H.INV_SECTOR[i.id] || 'market', icon: icon(i), risk: risk(i), price: i.price, decimals: i.decimals ?? (i.type === 'stock' || i.type === 'fund' ? 2 : 0), min: i.min, units: i.units, changePct: chg(i.id), sub: i.type + (i.yield ? ` · ${Math.round(i.yield * 1000) / 10}% yield` : '') + (H.DIV_TYPES.includes(i.type) ? ' · pays 25% of yearly gain' : '') + ` · ${fmtPrice(i.price)}/unit`, history: hist.prices[i.id] || [] })), holdings };
  },
  invest(id, amt) { return this.sl((d, sl) => H.buyInvestment(d, sl, id, amt), 'money'); },
  divest(id, amt) { return this.sl((d, sl) => { const it = H.listInvestments(d, sl).find((i) => i.id === id); return H.sellInvestment(d, sl, id, it && amt >= it.value ? 'all' : Math.max(1, Math.floor(amt / it.price))); }, 'money'); },
  investQuoteMax(id) { const sl = B.pull(this.s), q = H.maxBuy(B.sliceData(), sl, id); return q ? { units: q.units, cost: Math.min(sl.cash, Math.round(q.cost * 100) / 100), price: q.price, ok: q.ok } : null; },
  investBuyMax(id) { const q = this.investQuoteMax(id); if (!q || !q.ok) return this.res(false, 'Not enough cash for even the minimum.', this.mark()); return this.sl((d, sl) => H.buyInvestment(d, sl, id, sl.cash), 'money'); },
  investDivMode(id, mode) { return this.sl((d, sl) => H.setDivMode(d, sl, id, mode), 'money'); },
  investCollectDividends() { return this.sl((d, sl) => H.collectDividends(d, sl), 'money'); },
  investReinvestDividends() { return this.sl((d, sl) => H.reinvestDividends(d, sl), 'money'); },
  investSellUnits(id, units) { return this.sl((d, sl) => H.sellInvestment(d, sl, id, units === 'all' ? 'all' : Number(units)), 'money'); },
  getLuxury() { const sl = B.pull(this.s), d = B.sliceData(), L = d.assets.luxury; return { cash: Math.round(this.s.cash), owned: this.owned('luxury').map((a) => this.asset(a)), forSale: [...L.experiences, ...L.goods].map((x) => ({ id: x.id, name: x.name, price: x.cost })) }; },
  buy({ shopId, itemId, payment }) {
    if (shopId === 'luxury') return this.sl((d, sl) => H.buyLuxury(d, sl, itemId), 'asset');
    return this.sl((d, sl) => H.buyAsset(d, sl, shopId, itemId, { financing: payment === 'mortgage' ? 'loan' : 'cash' }), 'asset');
  },
  // ---- auctions (live bidding: a rival raises, you may re-bid up to 3 rounds) ----
  getAuctionHouses() {
    const sl = B.pull(this.s), d = B.sliceData(), ic = { au_vance: '🏛️', au_concours: '🏎️', au_gavel: '🔨' };
    return { cash: Math.round(this.s.cash), houses: H.listAuctions(d, sl).map((h) => ({ id: h.id, name: h.name, icon: ic[h.id] || '🔨', blurb: h.blurb, lots: H.listAuctions(d, sl, h.id).map((l) => { const aid = (l.art && B.artDef(l.art)) ? l.art : B.artFor(l), def = aid && B.artDef(aid); return { id: h.id + '|' + l.lot, name: l.address || l.name, cat: l.cat, rarity: l.rarity || 1, estimate: Math.round((l.estimate[0] + l.estimate[1]) / 2), sold: !!l.closed, art: aid || null, svg: l.art && l.vseed != null ? B.svgFor(l) : null, artUrl: def ? 'assets/art/' + def.file : null, icon: LOT_ICON[l.cat] || '🏺', rounds: l.rounds || 0 }; }) })) };
  },
  bid(lotId, amount) { const [h, lot] = lotId.split('|'); return this.sl((d, sl) => H.bidAuction(d, sl, h, Number(lot), amount, { live: true }), 'asset'); },
  // ---- casino: tables with merchants; blackjack and roulette are real hands/spins, the rest use the table odds ----
  getCasino() {
    const sl = B.pull(this.s), c = B.sliceData().assets.casino, ic = { slots: '🎰', blackjack: '🃏', roulette: '🎡', horses: '🐎', lottery: '🎟️' };
    return { cash: Math.round(this.s.cash), minAge: c.min_age, locked: this.s.age < c.min_age, name: c.name, lifetimeNet: Math.round(sl.casino.net), games: c.tables.map((t) => ({ id: t.id, label: t.name, icon: ic[t.id] || '🎲', sub: `${t.merchant}: ${t.blurb}`, merchant: t.merchant, minBet: t.min_bet, maxBet: t.max_bet, winOdds: Math.round(t.win_p * 100), choices: t.id === 'roulette' ? ['red', 'black', 'green'] : null, interactive: t.id === 'blackjack' })) };
  },
  gamble(id, bet, choice) {
    const s = this.s, n0 = this.mark(), sl = B.pull(s), d = B.sliceData(), t = d.assets.casino.tables.find((x) => x.id === id);
    if (!t) return this.res(false, 'No such table.', n0); if (id === 'blackjack') return this.blackjackStart(bet);
    let r;
    if (id === 'roulette') {
      const rr = Math.floor(H.rand(sl) * 37), col = rr === 0 ? 'green' : rr % 2 ? 'red' : 'black', pick = choice || 'red', win = col === pick;
      if (bet < t.min_bet || bet > t.max_bet) r = { ok: false, msg: `Bets are ${t.min_bet}-${t.max_bet}.` }; else if (s.cash < bet) r = { ok: false, msg: 'Not enough cash.' };
      else { const delta = win ? Math.round(bet * (pick === 'green' ? 35 : 1)) : -bet; sl.cash = s.cash + delta; sl.casino.net += delta; r = { ok: true, win, delta, msg: `${t.merchant}: the ball lands on ${rr} ${col}. ${win ? 'You win ' + delta : 'You lose ' + bet}.`, detail: `🎡 ${rr} ${col}` }; B.push(s); }
    } else { r = B.call(s, (dd, ss) => H.playTable(dd, ss, id, bet)); if (id === 'slots' && r.ok) { const sym = ['🍒', '🍋', '🔔', '⭐', '7️⃣'], pk = () => sym[Math.floor(Math.random() * sym.length)], w = pk(); r.detail = r.win ? `${w} ${w} ${w}` : (() => { let a = pk(), b = pk(), c = pk(); if (a === b && b === c) c = sym[(sym.indexOf(c) + 1) % sym.length]; return `${a} ${b} ${c}`; })(); } }
    if (r.ok) log(s, voice(r.win ? `I won ${fmtMoney(Math.abs(r.delta))} at the ${t.name.toLowerCase()}.` : `I lost ${fmtMoney(Math.abs(r.delta))} at the ${t.name.toLowerCase()}.`), 'money');
    return { ...this.res(!!r.ok, r.msg, n0), win: !!r.win, delta: r.delta || 0, detail: r.detail };
  },
  // blackjack: sl.bj = {bet, you:[], dealer:[]}; hit/stand via blackjackAction
  cardV(c) { return c > 10 ? 10 : c === 1 ? 11 : c; },
  total(h) { let t = h.reduce((a, c) => a + this.cardV(c), 0), aces = h.filter((c) => c === 1).length; while (t > 21 && aces--) t -= 10; return t; },
  bjView(bj, over) { const nm = (c) => ({ 1: 'A', 11: 'J', 12: 'Q', 13: 'K' }[c] || String(c)); return { you: bj.you.map(nm), dealer: over ? bj.dealer.map(nm) : [nm(bj.dealer[0]), '?'], youTotal: this.total(bj.you), dealerTotal: over ? this.total(bj.dealer) : null, bet: bj.bet }; },
  blackjackStart(bet) {
    const s = this.s, n0 = this.mark(), sl = B.pull(s), t = B.sliceData().assets.casino.tables.find((x) => x.id === 'blackjack'), dr = () => 1 + Math.floor(H.rand(sl) * 13);
    if (bet < t.min_bet || bet > t.max_bet) return this.res(false, `Bets are ${t.min_bet}-${t.max_bet}.`, n0); if (s.cash < bet) return this.res(false, 'Not enough cash.', n0);
    sl.bj = { bet, you: [dr(), dr()], dealer: [dr(), dr()] }; B.push(s); if (this.total(sl.bj.you) === 21) return this.blackjackAction('stand');
    return { ...this.res(true, 'Cards dealt.', n0), interactive: true, hand: this.bjView(sl.bj, false) };
  },
  blackjackAction(act) {
    const s = this.s, n0 = this.mark(), sl = B.pull(s), bj = sl.bj; if (!bj) return this.res(false, 'No hand in play.', n0); const dr = () => 1 + Math.floor(H.rand(sl) * 13);
    if (act === 'hit') { bj.you.push(dr()); if (this.total(bj.you) <= 21) { B.push(s); return { ...this.res(true, 'Hit.', n0), interactive: true, hand: this.bjView(bj, false) }; } }
    while (this.total(bj.dealer) < 17 && this.total(bj.you) <= 21) bj.dealer.push(dr());
    const y = this.total(bj.you), dl = this.total(bj.dealer), nat = bj.you.length === 2 && y === 21; let delta = 0, msg;
    if (y > 21) { delta = -bj.bet; msg = 'Bust! You lose.'; } else if (dl > 21 || y > dl) { delta = Math.round(bj.bet * (nat ? 1.5 : 1)); msg = dl > 21 ? 'Dealer busts. You win!' : 'You beat the dealer!'; } else if (y === dl) msg = 'Push.'; else { delta = -bj.bet; msg = 'Dealer wins.'; }
    sl.cash = s.cash + delta; sl.casino.net += delta; const hand = this.bjView(bj, true); sl.bj = null; B.push(s);
    log(s, delta > 0 ? `I won ${fmtMoney(delta)} at blackjack.` : delta < 0 ? `I lost ${fmtMoney((-delta))} at blackjack.` : 'I pushed at blackjack and felt nothing.', 'money');
    return { ...this.res(true, msg, n0), interactive: false, win: delta > 0, delta, hand, detail: `🃏 ${hand.you.join(' ')} (${hand.youTotal}) vs ${hand.dealer.join(' ')} (${hand.dealerTotal})` };
  },
  // ---- race garage ----
  getGarage() {
    const sl = B.pull(this.s), d = B.sliceData(), g = H.raceGarage(d, sl), R = d.assets.race;
    return { cash: Math.round(this.s.cash), slots: R.garage_slots, cars: g.cars.map((a) => ({ id: a.uid, model: a.name, rating: Math.min(100, Math.round(a.perf)), upgrades: R.tuning.slice(0, a.tune_stage || 0).map((t, i) => 'stage' + i), wins: a.rwins || 0, races: a.races || 0, condition: a.cond })),
      upgrades: R.tuning.map((t, i) => ({ id: 'stage' + i, label: t.name, icon: '🔧', cost: Math.round(t.cost_pct * 100) + '% of value' })),
      catalog: this.owned('car').filter((a) => !sl.raceGarage.includes(a.uid) && !a.restoring).map((a) => ({ id: a.uid, model: a.name, base: H.assetValue(d, a) })), races: R.races.map((r) => ({ id: r.id, label: r.name, purse: r.purse[0], minRating: 0, entry: r.entry, minCond: r.min_cond })) };
  },
  buyRaceCar(uid) { return this.sl((d, sl) => H.addToGarage(d, sl, uid), 'asset'); },
  upgradeRaceCar(uid) { return this.sl((d, sl) => H.tuneCar(d, sl, uid), 'asset'); },
  race(uid, raceId) { const r = this.sl((d, sl) => { const out = H.enterRace(d, sl, uid, raceId); const a = H.findAsset(sl, uid); if (a && out.ok) { a.races = (a.races || 0) + 1; if (out.position === 1) a.rwins = (a.rwins || 0) + 1; } return out; }, 'money'); r.win = !!(r.data && r.data.position === 1); return r; },
  // ---- zoo ----
  getZoo() {
    const sl = B.pull(this.s), d = B.sliceData(), Z = d.assets.zoo, z = H.zooStatus(d, sl); const animals = [];
    if (z.open) for (const a of z.animals) for (let i = 0; i < a.count; i++) animals.push({ id: a.id, species: a.id, label: a.name, icon: a.icon, health: 85, happy: Math.min(100, 60 + Math.round(z.enclosures * 6)), value: Math.round(a.price * Z.sell_factor) });
    return { owned: z.open, buyPrice: Z.setup_cost, cash: Math.round(this.s.cash), name: z.name, enclosures: z.enclosures || 0, capacity: z.capacity || 0, enclosureCost: Z.enclosure_cost, catalog: Z.species.map((a) => ({ id: a.id, label: a.name, icon: a.icon, price: a.price })), animals, yearlyIncome: z.income || 0, yearlyUpkeep: z.costs || 0, visitors: z.visitors || 0, rating: z.open ? Math.min(100, Math.round(30 + z.count * 5 + z.enclosures * 4)) : 0 };
  },
  buyZoo() { return this.sl((d, sl) => H.openZoo(d, sl), 'asset'); },
  buildEnclosure() { return this.sl((d, sl) => H.buildEnclosure(d, sl), 'asset'); },
  buyAnimal(id) { return this.sl((d, sl) => H.buyAnimal(d, sl, id), 'asset'); },
  sellAnimal(id) { return this.sl((d, sl) => H.sellAnimal(d, sl, id), 'asset'); },
  // ---- belongings / properties ----
  getBelongings({ category } = {}) {
    const labels = { car: ['Cars', '🚗'], boat: ['Boats', '⛵'], aircraft: ['Aircraft', '✈️'], jewelry: ['Jewelry', '💍'], instrument: ['Instruments', '🎸'], luxury: ['Luxury', '💎'], clothing: ['Wardrobe', '👕'], gear: ['Creator gear', '🎥'] };
    const cats = CATS.filter((c) => !category || c === category).map((c) => ({ id: c, label: labels[c][0], icon: labels[c][1], items: this.owned(c).map((a) => this.asset(a)) }));
    return { categories: cats, total: cats.reduce((n, c) => n + c.items.length, 0) };
  },
  getProperties() { const d = B.sliceData(); return { properties: this.owned('property').map((a) => this.asset(a)), amenities: d.assets.pricing.amenities.map((a) => ({ name: a.name, upliftPct: a.value_uplift_pct, priceMin: a.price_min, priceMax: a.price_max })) }; },
  // ---- shopping ----
  getShops() { const d = B.sliceData(), K = this.cfg.shopKinds; return H.listShops(d).map((x) => ({ id: x.id, name: x.name, type: UI_TYPE[x.category] || x.category, section: (K[x.kind] || {}).section || 'Shops', icon: (K[x.kind] || {}).icon || '🛍️', sub: x.blurb })); },
  getShopInventory(shopId) {
    const s = this.s, sl = B.pull(s), d = B.sliceData(), shop = H.listShops(d).find((x) => x.id === shopId); if (!shop) return { shop: null, items: [], locked: true, lockReason: 'No such shop' };
    const why = H.checkBuy(d, sl, shop.category), age = why.find((r) => /Must be/.test(r)), lic = why.find((r) => /Needs/.test(r)), loans = d.assets.pricing.loans;
    const items = H.listListings(d, sl, shopId).map((a) => this.asset(a, { id: a.uid, price: a.price, canMortgage: !!loans[a.cat], canAfford: s.cash >= a.price, kind: a.kind, value: a.value }));
    return { shop: shop.name, cash: Math.round(s.cash), minAge: 0, locked: !!age, lockReason: age || '', notice: lic || (why.length ? why.join(' · ') : ''), refreshesLeft: 99, items };
  },
  async refreshInventory(shopId) { await Ads.gate('refresh_inventory'); return this.sl((d, sl) => H.refreshInventory(d, sl, shopId), 'asset'); },
  sellAsset(uid) { return this.sl((d, sl) => H.sellAsset(d, sl, uid), 'money'); },
  assetAction(uid, act) {
    const n0 = this.mark();
    if (act === 'sell') return this.sellAsset(uid);
    if (act === 'garage') return this.sl((d, sl) => (sl.raceGarage.includes(uid) ? H.removeFromGarage(d, sl, uid) : H.addToGarage(d, sl, uid)), 'asset');
    if (act === 'tune') return this.upgradeRaceCar(uid);
    if (act === 'recolor') return this.recolorOwned(uid);
    if (act === 'play') return this.sl((d, sl) => H.playInstrument(d, sl, uid), 'asset');
    if (act === 'consign') return this.sl((d, sl) => H.consignAuction(d, sl, uid, 'au_concours'), 'money');
    if (act.startsWith('amenity:')) return this.sl((d, sl) => H.addAmenity(d, sl, uid, act.slice(8)), 'asset');
    return this.res(false, 'Unknown action.', n0);
  },
  // ---- clothing: recolorable outfits (variant = (art, vseed); a listing can be re-dyed before buying, an owned item for $25) ----
  listingColors(shopId, itemId) {
    const sl = B.pull(this.s), a = (sl.shops[shopId] || []).find((x) => x.uid === itemId), def = a && a.art && B.artDef(a.art); if (!def) return [];
    return [a.vseed, ...Array.from({ length: 7 }, (_, i) => Math.abs(((a.vseed || 1) * 2654435761 + (i + 1) * 40503) % 1e9) | 0)].map((seed) => { const v = R.recolor(def, seed); return { seed, label: v.label, colors: v.colors, rarity: v.rarity, mult: v.valueMult }; });
  },
  setListingColor(shopId, itemId, seed) {
    const n0 = this.mark(), sl = B.pull(this.s), d = B.sliceData(), a = (sl.shops[shopId] || []).find((x) => x.uid === itemId); if (!a) return this.res(false, 'Not found.', n0);
    const v = R.recolor(B.artDef(a.art), seed); const old = a.cmult || 1; a.vseed = seed; a.cmult = v.valueMult; a.price = Math.max(1, Math.round(a.price / old * v.valueMult)); B.push(this.s); return this.res(true, v.label, n0);
  },
  recolorOwned(uid) {
    const n0 = this.mark(), s = this.s, sl = B.pull(s), a = H.findAsset(sl, uid); if (!a || a.cat !== 'clothing') return this.res(false, 'Not clothing.', n0); if (s.cash < 25) return this.res(false, 'Dye costs $25.', n0);
    s.cash -= 25; const seed = Math.floor(H.rand(sl) * 1e9), v = R.recolor(B.artDef(a.art), seed); a.vseed = seed; a.cmult = 1; B.push(s); log(s, `I dyed my ${a.name.toLowerCase()} ${v.label.toLowerCase()}.`, 'asset'); return this.res(true, `Now ${v.label}.`, n0);
  },
  getRestorationProjects() {
    const sl = B.pull(this.s), d = B.sliceData();
    return { cash: Math.round(this.s.cash), projects: this.owned().filter((a) => H.listPlans(d, a.cat).length && ['car', 'boat', 'aircraft'].includes(a.cat)).map((a) => ({ assetId: a.uid, name: a.name, subtitle: a.restoring ? `Restoring: ${a.restoring.monthsLeft} month(s) left` : (a.address || a.cat), condition: a.cond, value: H.assetValue(d, a), estimatedValueAfter: H.assetValue(d, a, { cond: 100 }), classic: !!a.classic, restorable: true, cat: a.cat, restoring: !!a.restoring,
      stages: H.listPlans(d, a.cat).map((p) => { const q = H.restoreQuote(d, sl, a.uid, p.id); return { id: p.id, label: p.name, icon: '🛠️', cost: q ? q.total : 0, gain: p.cond_gain, months: p.months, done: a.cond >= 100 || !!a.restoring }; }) })) };
  },
  restoreCar(uid, planId) { return this.sl((d, sl) => H.startRestoration(d, sl, uid, planId), 'asset'); },
};

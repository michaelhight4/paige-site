// Bankruptcy: when a year's bills (rent, upkeep, wages, interest, debt payments...) cannot be paid from cash, the shortfall is NOT silently turned into a loan.
// core.spend() records it in s.shortfall; at the end of the turn a popup (pending kind 'bankruptcy') asks: take a loan, sell things to cover it, or go bankrupt.
// Real bankruptcy: remaining owned things are seized and sold, most of the debt is wiped, credit is wrecked for 7 years (no loans), happiness and fame drop.
// Autopilot: pending popups pause it (safety stop); preference `bankruptcy` (pause default | loan | sell) lets it answer for you under the same rules.
import * as Biz from './business.js';
import * as Fm from './farm.js';
import * as Br from './brand.js';
import * as Fr from './franchise.js';
import * as Rc from './racing.js';
import * as Prod from './prodco.js';
import * as Ad from './advisor.js';
import * as B from './slice_bridge.js';
import { log, addStat, earn } from './core.js';

import { fmtMoney } from './fmt.js';
const R = Math.round, money = (n) => fmtMoney(n);
export const LOAN_CAP = 250000, CREDIT_YEARS = 7;
export const creditBad = (s) => !!(s.bk && s.bk.until && s.age < s.bk.until);
export const loanRoom = (s) => (creditBad(s) ? 0 : Math.max(0, LOAN_CAP - (s.debt || 0)));
// everything the player owns that can be sold, cheapest-hassle first, with what it would bring in after loans/fees
export function sellables(s) {
  const out = [];
  for (const a of s.assets || []) out.push({ id: 'asset:' + a.uid, kind: 'Home / vehicle', name: a.name, value: R(a.value * 0.95), sell: () => { const i = s.assets.findIndex((x) => x.uid === a.uid); if (i >= 0) { earn(s, a.value * 0.95); s.assets.splice(i, 1); } } });
  if (s.sl) { const d = B.sliceData(); for (const [cat, list] of Object.entries(s.sl.assets || {})) for (const a of list) { if (a.restoring) continue; let q = null; try { q = B.H.sellQuote(d, B.pull(s), a.uid); } catch (e) { q = null; } if (q && q.net > 0) out.push({ id: 'sl:' + a.uid, kind: cat, name: a.address || a.name || cat, value: q.net, sell: () => { B.call(s, (dd, sl) => B.H.sellAsset(dd, sl, a.uid, { disclose: true })); } }); } }
  for (const b of s.biz || []) { if (b.kind === 'sports' && b.teamIdx == null) continue; out.push({ id: 'biz:' + b.id, kind: 'Business', name: b.name, value: R(Biz.valuation(s, b) * 0.9), sell: () => { Biz.sell(s, b); } }); }
  if (s.farm) out.push({ id: 'farm', kind: 'Farm / ranch', name: s.farm.name, value: R(Fm.value(s) * 0.92), sell: () => { Fm.sell(s); } });
  if (s.brand) out.push({ id: 'brand', kind: 'Clothing brand', name: s.brand.name, value: R(Br.value(s) * 0.7), sell: () => { Br.sell(s); } });
  if (s.rc && s.rc.team) out.push({ id: 'rc', kind: 'Racing team', name: s.rc.team.name, value: R(Rc.value(s) * 0.85), sell: () => { Rc.sell(s); } });
  if (s.fr && s.fr.team) out.push({ id: 'fr', kind: 'Team', name: s.fr.team.name, value: R(Fr.value(s) * 0.9 / Math.max(1, (s.fr.teams || [1]).length)), sell: () => { Fr.sell(s); } });
  if (s.prod) for (const [m, co] of Object.entries(s.prod.cos || {})) out.push({ id: 'prod:' + m, kind: 'Production company', name: co.name, value: R(Prod.value(s) / Math.max(1, Object.keys(s.prod.cos).length)), sell: () => { Prod.sellCo(s, m); } });
  if (s.advisor && Ad.balance(s.advisor) > 0) out.push({ id: 'invest', kind: 'Investments', name: 'Managed portfolio', value: R(Ad.balance(s.advisor) * 0.99), sell: () => { Ad.cashOut(s, 'all', 'both'); } });
  return out.sort((a, b) => b.value - a.value);
}
export const saleTotal = (s) => sellables(s).reduce((a, x) => a + x.value, 0);
export function ensure(s) { if (!s.bk) s.bk = { times: 0, until: 0, history: [] }; return s.bk; }
// end of every turn: queue the popup when bills could not be paid
export function check(s) {
  if (!s.alive || !(s.shortfall > 1)) { if (s.shortfall && s.shortfall <= 1) s.shortfall = 0; return false; }
  if (s.pending.some((p) => p.kind === 'bankruptcy')) return true;
  s.pending.push({ kind: 'bankruptcy', owed: R(s.shortfall), year: Math.floor(s.age) }); return true;
}
export function card(s) {
  const p = s.pending[0], owed = R(s.shortfall || p.owed), room = loanRoom(s), sale = saleTotal(s);
  const choices = [{ label: room >= owed ? `Take a ${money(owed)} loan` : room > 0 ? `Loan not big enough (bank offers ${money(room)})` : 'No bank will lend to you', disabled: room < owed }, { label: sale > 0 ? `Sell my things (worth about ${money(sale)})` : 'Nothing left to sell', disabled: sale <= 0 }, { label: 'Declare bankruptcy' }];
  return { kind: 'bankruptcy', id: 'bankruptcy', title: '🏦 You cannot pay your bills', text: `Your yearly bills left you ${money(owed)} short and you are out of cash. Choose: borrow it (debt interest keeps running), sell what you own to cover it (${sale > 0 ? 'houses, cars, businesses, teams, farms, brands, investments and items count' : 'you own nothing sellable'}), or declare bankruptcy (assets seized, credit ruined for ${CREDIT_YEARS} years).`, choices };
}
export function resolve(s, i) {
  const p = s.pending[0]; if (!p || p.kind !== 'bankruptcy') return null; const owed = R(s.shortfall || p.owed), c = card(s).choices[i]; if (!c) return { ok: false, msg: 'Pick one.' }; if (c.disabled) return { ok: false, msg: c.label };
  if (i === 0) { s.debt += owed; s.shortfall = 0; s.pending.shift(); log(s, `I took a ${money(owed)} loan to cover my bills.`, 'money'); return { ok: true, msg: `Loan of ${money(owed)} approved.` }; }
  if (i === 1) { // sell biggest items first until the bills are covered
    let got = 0, n = 0; for (const x of sellables(s)) { if (got >= owed) break; const before = s.cash; x.sell(); got += Math.max(0, s.cash - before); n++; }
    const pay = Math.min(owed, s.cash); s.cash -= pay; s.shortfall = Math.max(0, owed - pay); log(s, `I sold ${n} thing${n === 1 ? '' : 's'} to pay my bills (${money(got)}).`, 'money');
    if (s.shortfall <= 1) { s.shortfall = 0; s.pending.shift(); return { ok: true, msg: `Sold ${n} item${n === 1 ? '' : 's'}, bills paid.` }; }
    p.owed = R(s.shortfall); return { ok: true, msg: `Sold ${n} item${n === 1 ? '' : 's'} but you are still ${money(s.shortfall)} short. Choose again.` };
  }
  return declare(s);
}
export function declare(s) {
  const bk = ensure(s); let seized = 0, n = 0; for (const x of sellables(s)) { const before = s.cash; x.sell(); seized += Math.max(0, s.cash - before); n++; }
  const owedAll = (s.debt || 0) + (s.shortfall || 0), pay = Math.min(s.cash, seized); s.cash = Math.max(0, s.cash - pay); // creditors take everything seized
  const wiped = Math.max(0, owedAll - pay); s.debt = Math.round(Math.max(0, owedAll - pay) * 0.1); s.shortfall = 0; s.pending = s.pending.filter((p) => p.kind !== 'bankruptcy');
  bk.times++; bk.until = Math.floor(s.age) + CREDIT_YEARS; bk.history.push({ age: Math.floor(s.age), seized: R(seized), items: n, wiped: R(wiped * 0.9) }); s.flags.bankrupt = (s.flags.bankrupt || 0) + 1;
  addStat(s, 'happiness', -25); addStat(s, 'fame', -4); addStat(s, 'stress', 10); log(s, `I declared bankruptcy. ${n} thing${n === 1 ? ' was' : 's were'} seized and sold (${money(seized)}). My credit is ruined for ${CREDIT_YEARS} years.`, 'money');
  return { ok: true, msg: `Bankruptcy declared. ${money(seized)} seized, most debt wiped. No loans until age ${bk.until}.`, bankrupt: true };
}
// Autopilot answers the popup per preference (default: pause = leave it to the player)
export function autoAnswer(s, pref) { const p = s.pending[0]; if (!p || p.kind !== 'bankruptcy') return null; if (pref === 'loan' && loanRoom(s) >= (s.shortfall || p.owed)) return resolve(s, 0); if (pref === 'sell') { const r = resolve(s, 1); return r; } return null; }

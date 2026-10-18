// Businesses: shops (capacity/demand model), studios (game/film), sports team. Data-driven by D.bizTypes.
import { D } from './data.js';
import { rnd, rint, pick, gauss, clamp } from './rng.js';
import { log, earn, spend } from './core.js';
import { sectorMult, listPlayerStudio } from './market.js';
import * as Studio from './studio.js';
import * as Sports from './sports.js';
import * as Plus from './bizplus.js';

export const TIERS = [{ id: 'junior', name: 'Junior', skill: 25, pay: 0.8 }, { id: 'mid', name: 'Mid-level', skill: 50, pay: 1.15 }, { id: 'senior', name: 'Senior', skill: 75, pay: 1.7 }];
export const rolesOf = (b) => { const t = D.bizTypes[b.type]; return t.kind === 'studio' ? Studio.profile(t.medium, b.draft && b.draft.format).roles : t.roles || []; };
const rolesOfType = (t) => (t.kind === 'studio' ? D.studio.mediaTypes[t.medium].roles : t.roles);
const equipOf = (b) => D.bizTypes[b.type].equip || [];
export const equipValue = (b) => equipOf(b).reduce((a, e) => a + (b.equip[e.id] || 0) * e.cost, 0);

function mkStaff(s, role, tier) {
  const skill = clamp(Math.round(tier.skill + gauss(s) * 6), 5, 95);
  return { id: Math.floor(rnd(s) * 1e9), role: role.id, name: pick(s, D.firstNames) + ' ' + pick(s, D.lastNames), skill, salary: Math.round(role.base * (0.7 + skill / 100 * 1.3) / 500) * 500 };
}
function blank(s, type, name) {
  const t = D.bizTypes[type];
  return { id: s.nextId++, type, kind: t.kind, name, rep: 40, equip: {}, staff: [], project: null, tail: 0, released: [], lastRelease: null, lastProfit: 0, profitAvg: 0, valuation: 0, founded: s.age, tkr: null, teamIdx: null, fame: 0, specialists: [], draft: null, shows: [], sensations: 0 };
}

// Annualized finance snapshot (no randomness) - used for previews, valuation, and ticks.
export function annualFinance(s, b) {
  const t = D.bizTypes[b.type], sm = sectorMult(s, t.sector);
  if (b.kind === 'sports') return Sports.bizFinance(s, b);
  const wages = b.staff.reduce((a, p) => a + p.salary, 0) + Studio.specialistWages(b), upkeep = equipValue(b) * 0.06;
  if (b.kind === 'studio') {
    const revenue = b.staff.length * t.contractPerStaff * sm * (0.5 + b.rep / 100) * Studio.fameTier(b).dealMult;
    return { revenue, wages, rent: t.rent, cogs: 0, upkeep, profit: revenue - wages - t.rent - upkeep, units: 0, demand: 0, cap: 0 };
  }
  if (t.x) return Plus.finance(s, b, t, sm, wages, upkeep);
  const demand = t.baseDemand * (0.4 + 1.2 * b.rep / 100) * sm;
  const eqCap = equipOf(b).reduce((a, e) => a + (b.equip[e.id] || 0) * e.cap, 0);
  const stCap = b.staff.reduce((a, p) => a + t.roles.find((r) => r.id === p.role).cap * (0.6 + 0.8 * p.skill / 100), 0);
  const cap = Math.min(eqCap, stCap), units = Math.min(demand, cap), revenue = units * t.ticket, cogs = revenue * t.cogs;
  return { revenue, wages, rent: t.rent, cogs, upkeep, profit: revenue - cogs - wages - t.rent - upkeep, units, demand, cap, eqCap, stCap };
}
export function valuation(s, b) {
  const f = annualFinance(s, b);
  if (b.kind === 'sports') return Math.max(10e6, Sports.teamPrice(s, s.league.teams[b.teamIdx]) * 0.9 + Math.max(0, b.profitAvg) * 2);
  return Math.max(0, 3 * Math.max(0, (b.profitAvg + f.profit) / 2)) + equipValue(b) * 0.5 + Plus.extraValue(b, D.bizTypes[b.type]) + b.tail * 0.9 + (b.kind === 'studio' ? b.staff.length * 5000 + (b.fame || 0) * 20000 : 0);
}

export function found(s, type, name) {
  const t = D.bizTypes[type]; if (!t || t.kind === 'sports') return { ok: false, err: 'Cannot found this type' };
  const b = blank(s, type, name || pick(s, D.bizNames[type]));
  let cost = t.fee;
  for (const e of t.equip) if (e.starter) { b.equip[e.id] = e.starter; cost += e.starter * e.cost; }
  if (cost > s.cash) return { ok: false, err: `Need ${Math.round(cost)} (LLC fee + starter equipment)` };
  s.cash -= cost;
  for (const r of rolesOfType(t)) { const n = t.kind === 'studio' ? (t.starters[r.id] || 0) : r.starter; for (let i = 0; i < n; i++) b.staff.push(mkStaff(s, r, TIERS[0])); }
  s.biz.push(b); b.valuation = valuation(s, b);
  if (t.kind === 'studio') listPlayerStudio(s, b);
  log(s, `Founded ${b.name} LLC (${t.name}) for ${Math.round(cost).toLocaleString()}.`, 'biz');
  return { ok: true, biz: b };
}

// Offers: running businesses for sale.
export function refreshOffers(s) {
  s.offers = [];
  for (const type of Object.keys(D.bizTypes)) {
    const t = D.bizTypes[type];
    if (t.kind === 'sports') {
      s.league.teams.forEach((tm, i) => { if (i !== s.league.my) s.offers.push({ type, teamIdx: i, name: tm.name, price: Sports.teamPrice(s, tm), desc: `${tm.w}-${tm.l}, strength ${Sports.strength(tm).toFixed(0)}` }); });
      continue;
    }
    if (t.x && !['coffee', 'tech', 'grocery'].includes(type) && rnd(s) > 0.2) continue; // extended types: only a handful of listings per year
    const b = blank(s, type, pick(s, D.bizNames[type]) + ' (established)');
    for (const e of t.equip) b.equip[e.id] = (e.starter || 0) + rint(s, 0, 1);
    for (const r of rolesOfType(t)) {
      const n = t.kind === 'studio' ? rint(s, 1, 2) : (r.starter || 0) + rint(s, 0, 2);
      for (let i = 0; i < n; i++) b.staff.push(mkStaff(s, r, pick(s, TIERS)));
    }
    if (t.kind === 'studio') for (const e of t.equip) b.equip[e.id] = Math.ceil(b.staff.length / e.seats);
    b.rep = rint(s, 30, 70); b.id = -1; Plus.ensure(s, b);
    const f = annualFinance(s, b); b.profitAvg = f.profit; b.lastProfit = f.profit;
    if (t.kind === 'studio') { b.tail = rint(s, 0, 600000) * (type === 'game' ? 1 : 3); b.fame = rint(s, 0, 25); }
    s.offers.push({ type, biz: b, price: Math.round(Math.max(30000, valuation(s, b) * (1.1 + rnd(s) * 0.3)) / 1000) * 1000, desc: `rep ${b.rep}, ${b.staff.length} staff, profit/yr ${Math.round(f.profit).toLocaleString()}` });
  }
}
export function buyOffer(s, i) {
  const o = s.offers[i]; if (!o) return { ok: false, err: 'Gone' };
  if (o.price > s.cash) return { ok: false, err: 'Not enough cash' };
  s.cash -= o.price;
  let b;
  if (o.type === 'sports') {
    b = blank(s, 'sports', o.name); b.teamIdx = o.teamIdx; s.league.my = o.teamIdx; b.rep = 45;
  } else { b = o.biz; b.id = s.nextId++; b.founded = s.age; }
  s.biz.push(b); s.offers.splice(i, 1); b.valuation = valuation(s, b);
  if (D.bizTypes[b.type].kind === 'studio') listPlayerStudio(s, b);
  log(s, `Bought ${b.name} for ${Math.round(o.price).toLocaleString()}.`, 'biz');
  return { ok: true, biz: b };
}
export function hire(s, b, roleId, tierId) {
  const role = rolesOf(b).find((r) => r.id === roleId), tier = TIERS.find((x) => x.id === tierId);
  if (!role || !tier) return { ok: false, err: 'Bad role' };
  const p = mkStaff(s, role, tier), signing = p.salary * 0.1;
  if (signing > s.cash) return { ok: false, err: 'Cannot afford signing bonus' };
  s.cash -= signing; b.staff.push(p); return { ok: true, person: p };
}
export function fire(s, b, id) { const i = b.staff.findIndex((p) => p.id === id); if (i < 0) return false; spend(s, b.staff[i].salary * 0.15); b.staff.splice(i, 1); return true; }
export function buyEquip(s, b, id) {
  const e = equipOf(b).find((x) => x.id === id); if (!e || e.cost > s.cash) return false;
  s.cash -= e.cost; b.equip[id] = (b.equip[id] || 0) + 1; return true;
}
export function advertise(s, b) {
  const cost = Math.max(2000, annualFinance(s, b).revenue * 0.04); if (cost > s.cash) return false;
  s.cash -= cost; b.rep = clamp(b.rep + 4, 0, 100); return true;
}
export function sell(s, b) {
  const v = valuation(s, b) * 0.9; earn(s, v);
  if (b.kind === 'sports') s.league.my = -1;
  if (b.tkr) s.market.cos = s.market.cos.filter((c) => c.bizId !== b.id);
  s.biz = s.biz.filter((x) => x !== b); log(s, `Sold ${b.name} for ${Math.round(v).toLocaleString()}.`, 'biz'); return v;
}

export function tickBiz(s, b, dt) {
  const f = annualFinance(s, b), noise = 1 + gauss(s) * 0.04;
  let profit = (f.profit * dt) * (f.profit > 0 ? noise : 1);
  if (b.trust && profit > 0) profit *= 0.6; // trustee fee while the owner is a minor
  if (b.tail > 0) { const pay = b.tail * (1 - Math.exp(-1.2 * dt)); b.tail -= pay; profit += pay; }
  let rel = null;
  if (b.kind === 'studio') rel = Studio.tickProject(s, b, dt);
  const net = profit > 0 ? profit * 0.8 : profit; // 20% tax on gains
  if (net >= 0) earn(s, net); else spend(s, -net);
  b.lastProfit = f.profit; b.profitAvg = b.profitAvg * 0.6 + (net / dt) * 0.4;
  // reputation drift toward service quality
  if (b.kind === 'shop') {
    const t = D.bizTypes[b.type], avgSk = b.staff.length ? b.staff.reduce((a, p) => a + p.skill, 0) / b.staff.length : 0;
    const tgt = 30 + 0.45 * avgSk + Math.min(15, b.staff.length * 3) + (f.cap >= f.demand ? 8 : -8);
    b.rep = clamp(b.rep + (tgt - b.rep) * 0.2 * dt, 0, 100);
  } else if (b.kind === 'studio') b.rep = clamp(b.rep - 0.5 * dt, 0, 100);
  b.valuation = valuation(s, b);
  s.report.push(`${b.name}: ${net >= 0 ? '+' : ''}${Math.round(net).toLocaleString()} ${net >= 0 ? 'profit (after tax)' : 'loss'}${rel ? ` | released "${rel.name}" ${rel.score}/10` : ''}`);
  return rel;
}

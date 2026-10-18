// Extended, data-driven business types (data/businesses.json): requirements, risks, upgrades, fleets. Layered on business.js (cyclic import is function-level only).
import * as Social from './social.js';
import { D } from './data.js';
import { rnd, gauss, clamp } from './rng.js';
import { log, spend } from './core.js';
import * as Biz from './business.js';

const R = (n) => Math.round(n);
export const Legacy_minOwnerAge = () => (D.life.estate && D.life.estate.minOwnerAge) || 18;
export const isX = (t) => !!(t && t.x);
export const startVehicles = (t) => (t.fleet ? t.fleet.start * t.fleet.vehicle.cost : 0);
export const startCost = (s, type) => { const t = D.bizTypes[type]; return t.fee + (t.equip || []).reduce((a, e) => a + (e.starter || 0) * e.cost, 0) + startVehicles(t); };
const lic = (s) => (s.sl && s.sl.licenses) || [];
const clean = (s) => !(s.record && s.record.sentences > 0);

// Merge data/businesses.json into D.bizTypes / D.bizNames (called by data.js after load).
export function mergeData(bd) {
  if (!bd) return;
  for (const [id, t] of Object.entries(bd.types || {})) { D.bizTypes[id] = t; D.bizNames[id] = t.names || [t.name]; }
  for (const [id, p] of Object.entries(bd.patch || {})) { if (D.bizTypes[id]) { Object.assign(D.bizTypes[id], p); D.bizNames[id] = p.names || D.bizNames[id]; } }
}
// Reasons you cannot found/buy this type right now ('' = fine).
export function requirement(s, type) {
  const t = D.bizTypes[type]; if (!t) return 'Unknown type.'; const q = t.req || {};
  if (Math.floor(s.age) < (t.minAge || 18)) return `Must be ${t.minAge || 18}+`;
  if (s.prison) return 'Not from prison.';
  if (q.edu && s.edu < q.edu) return `Needs a ${['', 'high school diploma', 'college degree', 'graduate degree'][q.edu]}`;
  if (q.clean && !clean(s)) return `Needs a clean record (${q.license || 'license'})`;
  if (q.followers && Social.totalFollowers(s) < q.followers) return `Needs ${Social.fmt(q.followers)} social media followers`;
  if (q.drivers && !lic(s).includes('drivers')) return "Needs a driver's license";
  return '';
}
export function canFound(s, type) {
  const t = D.bizTypes[type]; if (!t || t.kind === 'sports') return 'Cannot found this type.';
  const why = requirement(s, type); if (why) return why;
  if (startCost(s, type) > s.cash) return `Needs ${R(startCost(s, type)).toLocaleString('en-US')} startup cash`;
  return '';
}

// ---- modifiers from upgrades ----
export function mods(b, t) {
  const m = { demand: 0, margin: 0, cap: 0, mitigate: 0 };
  for (const u of t.upgrades || []) if (b.upg && b.upg[u.id]) for (const k of Object.keys(m)) m[k] += (u.effect && u.effect[k]) || 0;
  m.mitigate = Math.min(0.75, m.mitigate); return m;
}
export const fuelIdx = (s) => s.fuel || 1;
export const vehCap = (b, t) => t.fleet.maxBase + t.fleet.perDepot * Math.max(0, (b.equip.depot || 1) - 1);
export const drivers = (b) => b.staff.filter((p) => p.role === 'driver');
export const insurance = (b, t) => (t.fleet && b.fleet ? b.fleet.n * t.fleet.vehicle.ins : 0);

// Replacement for the shop branch of annualFinance (also fleets). sm = sector multiplier.
export function finance(s, b, t, sm, wages, upkeep) {
  ensure(s, b); const m = mods(b, t), susp = b.susp > 0 ? 0 : 1;
  if (t.fleet) {
    const F = b.fleet, V = t.fleet.vehicle, dr = drivers(b), sk = dr.length ? dr.reduce((a, p) => a + p.skill, 0) / dr.length : 0;
    const prod = Math.min(F.n, dr.length), use = prod * (0.85 + 0.3 * sk / 100);
    const revenue = use * V.rev * sm * (0.5 + b.rep / 100) * (1 + m.demand) * susp;
    const fuel = prod * V.fuel * fuelIdx(s), ins = F.n * V.ins, maint = F.n * V.maint * (1 + (100 - F.cond) / 100);
    const demand = F.n, cap = prod;
    return { revenue, wages, rent: t.rent, cogs: fuel + ins + maint, fuel, ins, maint, upkeep, profit: revenue - fuel - ins - maint - wages - t.rent - upkeep, units: prod, demand, cap };
  }
  const demand = t.baseDemand * (0.4 + 1.2 * b.rep / 100) * sm * (1 + m.demand);
  const eqCap = t.equip.reduce((a, e) => a + (b.equip[e.id] || 0) * e.cap, 0) * (1 + m.cap);
  const stCap = b.staff.reduce((a, p) => { const r = t.roles.find((x) => x.id === p.role); return a + (r ? r.cap : 0) * (0.6 + 0.8 * p.skill / 100); }, 0) * (1 + m.cap);
  const cap = Math.min(eqCap, stCap), units = Math.min(demand, cap) * susp, revenue = units * t.ticket, cogs = revenue * Math.max(0.02, t.cogs - m.margin);
  return { revenue, wages, rent: t.rent, cogs, upkeep, profit: revenue - cogs - wages - t.rent - upkeep, units, demand, cap, eqCap, stCap };
}
export const extraValue = (b, t) => (t.fleet && b.fleet ? b.fleet.n * t.fleet.vehicle.cost * (0.3 + 0.5 * b.fleet.cond / 100) : 0);

// ---- founding ----
export function found(s, type, name) {
  const t = D.bizTypes[type];
  if (t && t.fleet) {
    const veh = startVehicles(t), fee = startCost(s, type);
    if (fee > s.cash) return { ok: false, err: `Need ${R(fee)} (fee + depot + ${t.fleet.start} vehicles)` };
    const r = Biz.found(s, type, name); if (!r.ok) return r; // charges fee + depot; vehicles are charged below
    s.cash -= veh; r.biz.fleet = { n: t.fleet.start, cond: 90, accidents: 0 }; r.biz.valuation = Biz.valuation(s, r.biz); return r;
  }
  const r = Biz.found(s, type, name); if (r.ok) ensure(s, r.biz); return r;
}
// Established offers / inherited businesses need fleet state too.
export function ensure(s, b) {
  const t = D.bizTypes[b.type]; if (t && t.fleet && !b.fleet) b.fleet = { n: t.fleet.start, cond: 70, accidents: 0 };
  if (t && t.x && !b.upg) b.upg = {};
}
export const hire = (s, b, role, tier) => Biz.hire(s, b, role, tier);

export function buyUpgrade(s, b, id) {
  const t = D.bizTypes[b.type], u = (t.upgrades || []).find((x) => x.id === id); if (!u) return { ok: false, err: 'No such upgrade.' };
  ensure(s, b); if (b.upg[id]) return { ok: false, err: 'Already installed.' }; if (u.cost > s.cash) return { ok: false, err: 'Not enough cash.' };
  s.cash -= u.cost; b.upg[id] = 1; log(s, `${b.name}: installed ${u.name}.`, 'biz'); return { ok: true, msg: `Installed ${u.name}.` };
}
export function fleetAction(s, b, act, arg) {
  const t = D.bizTypes[b.type]; if (!t.fleet) return { ok: false, err: 'Not a fleet business.' }; ensure(s, b); const F = b.fleet, V = t.fleet.vehicle;
  if (act === 'buy') { if (F.n >= vehCap(b, t)) return { ok: false, err: 'Depot is full. Buy another depot bay block under Equipment.' }; if (V.cost > s.cash) return { ok: false, err: 'Not enough cash.' }; s.cash -= V.cost; F.cond = Math.round((F.cond * F.n + 100) / (F.n + 1)); F.n++; return { ok: true, msg: `Bought a ${V.name}.` }; }
  if (act === 'sell') { if (F.n <= 0) return { ok: false, err: 'No vehicles.' }; const v = R(V.cost * (0.3 + 0.5 * F.cond / 100)); s.cash += v; F.n--; return { ok: true, msg: `Sold a ${V.name} for ${v.toLocaleString('en-US')}.` }; }
  if (act === 'driver') return (() => { const r = Biz.hire(s, b, 'driver', arg || 'junior'); return r.ok ? { ok: true, msg: `Hired driver ${r.person.name}.` } : r; })();
  if (act === 'service') { const c = R(F.n * V.maint * 0.5); if (!F.n) return { ok: false, err: 'No vehicles.' }; if (c > s.cash) return { ok: false, err: `Servicing costs ${c.toLocaleString('en-US')}.` }; s.cash -= c; F.cond = 95; return { ok: true, msg: `Fleet serviced for ${c.toLocaleString('en-US')}.` }; }
  return { ok: false, err: 'Unknown fleet action.' };
}

export function detail(s, b) {
  const t = D.bizTypes[b.type]; if (!t || !t.x) return { upgrades: [], risks: [], fleet: null };
  ensure(s, b); const m = mods(b, t), f = Biz.annualFinance(s, b), out = {};
  out.upgrades = (t.upgrades || []).map((u) => ({ id: u.id, name: u.name, desc: u.desc, cost: u.cost, owned: !!b.upg[u.id] }));
  out.risks = (t.risks || []).map((r) => ({ label: r.label, pct: R(r.p * 100 * (1 - m.mitigate * 0.5)) }));
  if (t.req && (t.req.license || t.req.clean)) out.risks.unshift({ label: `Needs ${t.req.license || 'license'}${t.req.clean ? ' and a clean record' : ''}`, pct: 0 });
  out.fleet = null; out.extraCosts = [];
  if (t.fleet) {
    const F = b.fleet, V = t.fleet.vehicle;
    out.fleet = { vehicles: F.n, maxVehicles: vehCap(b, t), drivers: drivers(b).length, fuel: R(f.fuel || 0), accidents: F.accidents, insurance: R(f.ins || 0), condition: R(F.cond), vehicleName: V.name, vehicleCost: V.cost, fuelIndex: Math.round(fuelIdx(s) * 100) };
    out.extraCosts = [{ label: 'Fuel', amount: R(f.fuel || 0) }, { label: 'Vehicle insurance', amount: R(f.ins || 0) }, { label: 'Maintenance', amount: R(f.maint || 0) }];
  }
  out.suspended = b.susp > 0 ? b.susp : 0; out.trustNote = b.trust ? 'Held in trust until you reach adulthood: the trustee takes 40% of profit.' : '';
  return out;
}

// ---- yearly: fuel index, vehicle wear, risks, accidents, license checks ----
export function yearTick(s) {
  s.fuel = clamp((s.fuel || 1) * (1 + gauss(s) * 0.12) + (1 - (s.fuel || 1)) * 0.2, 0.6, 1.8);
  for (const b of s.biz) {
    const t = D.bizTypes[b.type]; if (!t || !t.x) continue; ensure(s, b);
    if (b.susp > 0) b.susp--;
    const m = mods(b, t), f = Biz.annualFinance(s, b), rev = Math.max(f.revenue || 0, t.fleet ? t.fleet.vehicle.rev : 0, t.ticket * (t.baseDemand || 1) * 0.4);
    if (t.req && t.req.clean && s.record.sentences > (b.cleanAt == null ? (b.cleanAt = 0) : b.cleanAt)) { b.cleanAt = s.record.sentences; b.susp = 2; b.rep = clamp(b.rep - 20, 0, 100); log(s, `${b.name}: ${t.req.license} suspended after your conviction. Closed for 2 years.`, 'biz'); s.report.push(`${b.name}: license suspended (conviction).`); }
    for (const r of t.risks || []) {
      if (rnd(s) < r.p * (1 - m.mitigate * 0.5)) {
        const loss = R(r.cost * rev * (1 - m.mitigate) * (0.6 + rnd(s) * 0.8)); spend(s, loss); b.rep = clamp(b.rep + (r.rep || 0), 0, 100);
        if (r.id === 'revoked') b.susp = Math.max(b.susp, 1);
        log(s, `${b.name}: ${r.label}. Cost ${loss.toLocaleString('en-US')}.`, 'biz'); s.report.push(`${b.name}: ${r.label} (-${loss.toLocaleString('en-US')}).`);
      }
    }
    if (t.fleet) {
      const F = b.fleet, V = t.fleet.vehicle; let acc = 0;
      const dr = drivers(b), sk = dr.length ? dr.reduce((a, p) => a + p.skill, 0) / dr.length : 40;
      const p = V.acc * (1 + (100 - F.cond) / 150) * (1.3 - sk / 150) * (1 - m.mitigate * 0.4);
      const n0 = Math.min(F.n, Math.max(dr.length, 0));
      for (let i = 0; i < n0; i++) if (rnd(s) < p) { acc++; const cost = R(V.accCost * (0.4 + rnd(s) * 1.2) * (1 - m.mitigate * 0.3)); spend(s, cost); if (rnd(s) < 0.2 && F.n > 0) { F.n--; log(s, `${b.name}: a ${V.name} was totaled (${cost.toLocaleString('en-US')} in damages).`, 'biz'); } else log(s, `${b.name}: ${V.name} accident (${cost.toLocaleString('en-US')}).`, 'biz'); }
      F.accidents += acc; if (acc) { b.rep = clamp(b.rep - 3 * acc, 0, 100); s.report.push(`${b.name}: ${acc} vehicle accident${acc > 1 ? 's' : ''}.`); }
      F.cond = clamp(F.cond - 12, 20, 100);
    }
  }
}

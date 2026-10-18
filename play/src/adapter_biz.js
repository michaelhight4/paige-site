// Business-side adapter methods (hub "Businesses & Studios"): list/found/buy/manage/sell any business type from D.bizTypes
// (shops, extended types from data/businesses.json via bizplus.js, studios and sports teams). Mixed into EngineAdapter.
import { D } from './data.js';
import * as E from './engine.js';
import * as Biz from './business.js';
import * as Plus from './bizplus.js';
import * as Prod from './prodco.js';
import * as Fr from './franchise.js';
import { log } from './core.js';
import { Legacy_minOwnerAge } from './bizplus.js';

const R0 = (n) => Math.round(n);
export const bizApi = {
  bizSummary(b) {
    const t = D.bizTypes[b.type], f = Biz.annualFinance(this.s, b);
    return { id: b.id, name: b.name, type: b.type, typeName: t.name, kind: b.kind, icon: t.icon || (b.kind === 'studio' ? '🎬' : b.kind === 'sports' ? '🏟️' : '🏪'), rep: R0(b.rep), staff: b.staff.length, profit: R0(f.profit), revenue: R0(f.revenue || 0), valuation: R0(b.valuation || Biz.valuation(this.s, b)), trust: !!b.trust, fleet: !!t.fleet, editor: b.kind === 'studio' || b.kind === 'sports' };
  },
  getBusinesses() {
    const s = this.s, age = Math.floor(s.age);
    const types = Object.entries(D.bizTypes).filter(([, t]) => t.kind !== 'sports').map(([id, t]) => { const why = Plus.canFound(s, id); return { id, name: t.name, icon: t.icon || (t.kind === 'studio' ? '🎬' : '🏪'), group: t.group || (t.kind === 'studio' ? 'Studios' : 'Retail & services'), fee: R0(Plus.startCost(s, id)), minAge: t.minAge || 18, blurb: t.blurb || '', locked: !!why, reason: why || '', license: t.license || null, risk: t.risk || null }; });
    return { cash: R0(s.cash), age, owned: [...s.biz.map((b) => this.bizSummary(b)), ...Prod.ownedRecords(s), ...Fr.ownedRecords(s)], types, offers: s.offers.map((o, i) => ({ idx: i, type: o.type, name: o.name || (o.biz && o.biz.name), price: o.price, desc: o.desc, typeName: D.bizTypes[o.type].name, icon: D.bizTypes[o.type].icon || (o.type === 'sports' ? '🏟️' : '🏪') })), minOwnerAge: Legacy_minOwnerAge(s) };
  },
  getBusiness(id) {
    const s = this.s, b = s.biz.find((x) => x.id === id); if (!b) return null; const t = D.bizTypes[b.type], f = Biz.annualFinance(s, b), roles = Biz.rolesOf(b);
    return { ...this.bizSummary(b), finance: Object.fromEntries(Object.entries(f).map(([k, v]) => [k, R0(v)])), unit: t.unit || '', founded: R0(b.founded), roles: roles.map((r) => ({ id: r.id, name: r.name, base: r.base, count: b.staff.filter((p) => p.role === r.id).length })), tiers: Biz.TIERS.map((x) => ({ id: x.id, name: x.name })),
      staffList: b.staff.map((p) => ({ id: p.id, name: p.name, role: (roles.find((r) => r.id === p.role) || {}).name || p.role, skill: p.skill, salary: p.salary })), equip: (t.equip || []).map((e) => ({ id: e.id, name: e.name, cost: e.cost, count: b.equip[e.id] || 0 })),
      ...Plus.detail(s, b), cash: R0(s.cash), adCost: R0(Math.max(2000, (f.revenue || 0) * 0.04)), sellValue: R0(Biz.valuation(s, b) * 0.9), blurb: t.blurb || '' };
  },
  foundBusiness({ type, name }) { const n0 = this.mark(), why = Plus.canFound(this.s, type); if (why) return this.res(false, why, n0); const r = Plus.found(this.s, type, name); return this.res(!!r.ok, r.ok ? `Founded ${r.biz.name}.` : r.err, n0, r.ok ? { id: r.biz.id } : {}); },
  buyBusinessOffer(idx) { const n0 = this.mark(); const o = this.s.offers[idx]; if (o && o.type !== 'sports') { const why = Plus.canFound(this.s, o.type); if (why) return this.res(false, why, n0); } const r = Biz.buyOffer(this.s, idx); return this.res(!!r.ok, r.ok ? `Bought ${r.biz.name}.` : r.err, n0, r.ok ? { id: r.biz.id } : {}); },
  hireStaff(id, roleId, tierId) { const n0 = this.mark(), b = this.s.biz.find((x) => x.id === id); if (!b) return this.res(false, 'No such business.', n0); const r = Plus.hire(this.s, b, roleId, tierId); if (r.ok) log(this.s, `I hired ${r.person.name} at ${b.name}.`, 'biz'); return this.res(!!r.ok, r.ok ? `Hired ${r.person.name}.` : r.err, n0); },
  fireStaff(id, staffId) { const n0 = this.mark(), b = this.s.biz.find((x) => x.id === id); if (!b) return this.res(false, 'No such business.', n0); const ok = Biz.fire(this.s, b, staffId); return this.res(ok, ok ? 'Let go (severance paid).' : 'No such employee.', n0); },
  buyBusinessEquip(id, equipId) { const n0 = this.mark(), b = this.s.biz.find((x) => x.id === id); if (!b) return this.res(false, 'No such business.', n0); const ok = Biz.buyEquip(this.s, b, equipId); return this.res(ok, ok ? 'Bought.' : 'Cannot afford that.', n0); },
  advertiseBusiness(id) { const n0 = this.mark(), b = this.s.biz.find((x) => x.id === id); if (!b) return this.res(false, 'No such business.', n0); const ok = Biz.advertise(this.s, b); return this.res(ok, ok ? 'Campaign launched (+rep).' : 'Cannot afford ads.', n0); },
  businessUpgrade(id, upId) { const n0 = this.mark(), b = this.s.biz.find((x) => x.id === id); if (!b) return this.res(false, 'No such business.', n0); const r = Plus.buyUpgrade(this.s, b, upId); return this.res(!!r.ok, r.ok ? r.msg : r.err, n0); },
  fleetAction(id, act, arg) { const n0 = this.mark(), b = this.s.biz.find((x) => x.id === id); if (!b) return this.res(false, 'No such business.', n0); const r = Plus.fleetAction(this.s, b, act, arg); return this.res(!!r.ok, r.ok ? r.msg : r.err, n0); },
  sellBusiness(id) { const n0 = this.mark(), b = this.s.biz.find((x) => x.id === id); if (!b) return this.res(false, 'No such business.', n0); const v = Biz.sell(this.s, b); return this.res(true, `Sold for ${R0(v).toLocaleString('en-US')}.`, n0); },
  // the full studio/sports editor still lives in classic.html; the hub embeds it, so flush before and reload after
  prepareEditor() { this.save(); return { ok: true, url: 'classic.html' + (this.opts && this.opts.noSave ? '' : '') }; },
  reloadFromSave() { if (this.opts.noSave) return { ok: true }; const g = E.load(); if (g && g.v === 2) this.s = g; return { ok: true }; },
};

// ---- unlock badges ("New") and first-life tips: seen-state lives in the save (s.seen) ----
import { readUnlocks } from './unlocks.js';
export const unlockApi = {
  ensureSeen() { const s = this.s; if (!s.seen) s.seen = Object.fromEntries(readUnlocks().filter((u) => Math.floor(s.age) >= u.minAge).map((u) => [u.id, 1])); return s.seen; },
  getUnlocks() { const seen = this.ensureSeen(), age = Math.floor(this.s.age); return readUnlocks().filter((u) => age >= u.minAge).map((u) => ({ ...u, isNew: !seen[u.id] })); },
  markSeen(ids) { const seen = this.ensureSeen(); for (const i of [].concat(ids)) seen[i] = 1; return { ok: true }; },
};

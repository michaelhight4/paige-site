// Global "Hire all" (7c): fill every open staff / crew / roster spot across every owned company and team at one tier.
// Plan first (summary + per-company breakdown + skip reasons), then run. Same costs as hiring by hand.
import * as Fr from './franchise.js';
import * as Biz from './business.js';
import * as Br from './brand.js';
import * as Fm from './farm.js';
import * as Rc from './racing.js';
export const TIERS = Fr.HIRE_TIERS; // budget / standard / skilled / elite
const TI = (id) => Math.max(0, TIERS.findIndex((t) => t.id === id));
const pickByTier = (list, tier) => { if (!list.length) return null; const srt = [...list].sort((a, b) => (a.skill || 0) - (b.skill || 0)); return srt[Math.min(srt.length - 1, Math.round(TI(tier) / 3 * (srt.length - 1)))]; };
const BIZ_TIER = { budget: 'junior', standard: 'mid', skilled: 'mid', elite: 'senior' };
function entities(s, tier) {
  const out = [];
  Fr.each(s, (t) => { const q = Fr.autoHire(s, { what: 'all', tier, dry: true }), p = q.plan; out.push({ key: 'team:' + t.id, name: t.name, kind: t.esports ? 'Esports team' : 'Sports team', hires: p.staff.length + p.players.length, cost: p.fee, payroll: p.salary, why: !p.staff.length && !p.players.length ? (p.noScout ? 'needs a scout first' : 'fully staffed') : null, run: () => { Fr.switchTeam(s, t.id); return Fr.autoHire(s, { what: 'all', tier }); } }); });
  for (const b of s.biz || []) { const roles = Biz.rolesOf ? Biz.rolesOf(b) : []; const open = roles.filter((r) => !b.staff.some((p) => p.role === r.id)); const tid = BIZ_TIER[tier]; const est = open.map((r) => (r.salary || r.base || 40000) * (Biz.TIERS.find((x) => x.id === tid) || { pay: 1 }).pay);
    out.push({ key: 'biz:' + b.id, name: b.name, kind: 'Business', hires: open.length, cost: est.reduce((a, x) => a + x * 0.1, 0), payroll: est.reduce((a, x) => a + x, 0), why: open.length ? null : 'fully staffed', run: () => { let n = 0; for (const r of open) if (Biz.hire(s, b, r.id, tid).ok) n++; return { ok: n > 0, n }; } }); }
  if (s.brand) { const b = s.brand, open = Br.ROLES.filter((r) => !b.staff.some((x) => x.role === r.id)), picks = open.map((r) => pickByTier(Br.staffMarket(s, r.id), tier)).filter(Boolean);
    out.push({ key: 'brand', name: b.name || 'Clothing brand', kind: 'Brand', hires: picks.length, cost: 0, payroll: picks.reduce((a, c) => a + (c.wage || 0), 0), why: picks.length ? null : 'fully staffed', run: () => { let n = 0; for (const c of picks) if (Br.hire(s, c.role, c.id).ok) n++; return { ok: n > 0, n }; } }); }
  if (s.farm) { const f = s.farm, open = Fm.ROLES.filter((r) => r.id !== 'hand' && !f.staff.some((x) => x.role === r.id)).map((r) => r.id); const hands = Math.max(0, Math.min(40, Math.ceil((f.acres || 0) / 120)) - f.staff.filter((x) => x.role === 'hand').length); for (let i = 0; i < hands; i++) open.push('hand');
    const picks = open.map((rid) => pickByTier(Fm.staffMarket(s, rid), tier)).filter(Boolean);
    out.push({ key: 'farm', name: f.name || 'Farm', kind: 'Farm', hires: picks.length, cost: 0, payroll: picks.reduce((a, c) => a + (c.wage || 0), 0), why: picks.length ? null : 'fully staffed', run: () => { let n = 0; for (const c of picks) if (Fm.hire(s, c.role, c.id).ok) n++; return { ok: n > 0, n }; } }); }
  const rt = s.rc && s.rc.team; if (rt) { const open = (Rc.TROLES || []).filter((r) => !rt.staff.some((x) => x.role === r.id)), picks = open.map((r) => pickByTier(Rc.staffMarket(s, r.id), tier)).filter(Boolean), fee = picks.reduce((a, c) => a + (c.fee || 0), 0);
    out.push({ key: 'racing', name: rt.name, kind: 'Racing team', hires: picks.length, cost: fee, payroll: picks.reduce((a, c) => a + (c.salary || 0), 0), why: !picks.length ? 'fully staffed' : rt.cash < fee && s.cash < fee ? `needs ${Math.round(fee).toLocaleString('en-US')} in team cash` : null, run: () => { let n = 0; for (const c of picks) { if (rt.cash < c.fee && s.cash >= c.fee) { s.cash -= c.fee; rt.cash += c.fee; } if (Rc.hire(s, c.role || c.id.split(':')[0], c.id).ok) n++; } return { ok: n > 0, n }; } }); }
  if (s.prod && Object.keys(s.prod).length) out.push({ key: 'prod', name: 'Production companies', kind: 'Studio', hires: 0, cost: 0, payroll: 0, why: 'crews are hired per production on the studio page' });
  return out;
}
export function plan(s, tier = 'standard') {
  const ents = entities(s, tier); let budget = s.cash; const rows = ents.map((e) => { let why = e.why; if (!why && e.cost > budget) why = 'not enough cash for the signing costs'; if (!why) budget -= e.cost; return { key: e.key, name: e.name, kind: e.kind, hires: why ? 0 : e.hires, cost: why ? 0 : Math.round(e.cost), payroll: why ? 0 : Math.round(e.payroll), skip: why }; });
  const go = rows.filter((r) => !r.skip);
  return { tier: (TIERS.find((t) => t.id === tier) || TIERS[1]).name, hires: go.reduce((a, r) => a + r.hires, 0), companies: go.length, cost: go.reduce((a, r) => a + r.cost, 0), payroll: go.reduce((a, r) => a + r.payroll, 0), rows };
}
export function run(s, tier = 'standard') {
  const p = plan(s, tier), ents = entities(s, tier); let hired = 0;
  for (const r of p.rows) { if (r.skip) continue; const e = ents.find((x) => x.key === r.key); try { const x = e.run(); hired += x && x.plan ? x.plan.staff.length + x.plan.players.length : (x && x.n) || 0; } catch (err) { /* skip */ } }
  return { ok: hired > 0, msg: hired ? `Hired ${hired} people across ${p.companies} ${p.companies === 1 ? 'company' : 'companies'} (${p.tier}).` : 'Nothing to fill.', hired };
}
export function setKeep(s, tier) { s.auto = s.auto || {}; s.auto.hireAllTier = tier || null; s.auto.routines = s.auto.routines || []; if (tier && !s.auto.routines.includes('hire_all')) s.auto.routines.push('hire_all'); if (!tier) s.auto.routines = s.auto.routines.filter((x) => x !== 'hire_all'); return { ok: true, msg: tier ? `Autopilot keeps every spot filled at ${tier}.` : 'Keep-all-filled is off.' }; }

// Every owned business: quality upgrade (+4/+8/+16/+30 steps) and swap an employee (fire + hire a chosen replacement) through one API.
// kinds: biz (CEO companies, ref = business id) | prod (production company, ref = medium) | brand | farm | team (sports + esports, ref = team id) | racing (ref = team id)
// The swap uses each domain's own fire() and hire() so severance, signing costs and role limits are identical to doing it by hand.
import * as Fr from './franchise.js';
import * as Rc from './racing.js';
import * as Fm from './farm.js';
import * as Br from './brand.js';
import * as Prod from './prodco.js';
import * as Biz from './business.js';
import * as Plus from './bizplus.js';
import { D } from './data.js';
import { log } from './core.js';
export const STEPS = [4, 8, 16, 30];
const R = Math.round;
const costPer = (v) => Math.max(2500, R(v * 0.008));
function withTeam(s, kind, ref, fn) { // switch the active team, run, switch back
  const P = kind === 'racing' ? null : s.fr; if (kind === 'team' && P && ref != null && P.team && P.team.id !== ref) { const keep = P.team.id; Fr.switchTeam(s, ref); try { return fn(); } finally { Fr.switchTeam(s, keep); } } return fn();
}
export const boApi = {
  // quality: { has, q, label, steps:[{pts,cost,afford}] }; teams, farm, brand and racing report their existing upgrade track
  getBizQuality(kind, ref) {
    const s = this.s; let q = null, label = 'Quality', val = 0, base = 0, note = '';
    if (kind === 'biz') { const b = s.biz.find((x) => x.id === ref); if (!b) return { has: false }; b.q = b.q == null ? 40 : b.q; val = b.q; base = costPer(Biz.valuation(s, b)); label = 'Business quality'; note = 'Raises reputation, which lifts customers and revenue.'; }
    else if (kind === 'prod') { const co = s.prod && s.prod.cos[ref]; if (!co) return { has: false }; co.q = co.q || 0; val = co.q; base = Math.max(20000, R((co.rep || 20) * 1500)); label = 'Studio quality'; note = 'Adds to your crew quality when titles are scored.'; }
    else if (kind === 'brand') { const b = s.brand; if (!b) return { has: false }; val = b.studio ? Object.values(b.studio).reduce((a, x) => a + x, 0) / Math.max(1, Object.keys(b.studio).length) : 0; return { has: true, native: true, q: R(val), label: 'Studio investments', note: 'Use Studio investments (+4/+8/+16/+30) on the brand screen.', steps: [] }; }
    else if (kind === 'farm') { const f = s.farm; if (!f) return { has: false }; return { has: true, native: true, q: R(f.bq), label: 'Buildings quality', note: 'Use Buildings & quality (+4/+8/+16/+30).', steps: [] }; }
    else return { has: true, native: true, q: 0, label: 'Facilities', note: 'Use the Facilities tab for upgrades.', steps: [] };
    return { has: true, native: false, q: R(val), label, note, steps: STEPS.map((p) => ({ pts: Math.min(p, 100 - R(val)), cost: base * Math.min(p, 100 - R(val)), afford: s.cash >= base * Math.min(p, 100 - R(val)) && val < 100 })), max: val >= 100 };
  },
  bizQualityUp(kind, ref, pts) {
    const s = this.s, n0 = this.mark(); if (!STEPS.includes(pts)) return this.res(false, 'Pick +4, +8, +16 or +30.', n0);
    const v = this.getBizQuality(kind, ref); if (!v.has || v.native) return this.res(false, 'Not available here.', n0); if (v.max) return this.res(false, 'Already at the top quality.', n0);
    const st = v.steps[STEPS.indexOf(pts)]; if (!st.afford) return this.res(false, `Costs $${R(st.cost).toLocaleString('en-US')}.`, n0);
    s.cash -= st.cost; if (kind === 'biz') { const b = s.biz.find((x) => x.id === ref); b.q = Math.min(100, b.q + st.pts); log(s, `I invested in the quality of ${b.name}.`, 'biz'); } else { const co = s.prod.cos[ref]; co.q = Math.min(100, co.q + st.pts); log(s, 'I invested in the quality of the studio.', 'biz'); }
    return this.res(true, `Quality +${st.pts} for $${R(st.cost).toLocaleString('en-US')}.`, n0);
  },
  // people you can swap and the replacements available right now
  getSwapMembers(kind, ref) {
    const s = this.s;
    if (kind === 'biz') { const b = s.biz.find((x) => x.id === ref); const roles = b ? Biz.rolesOf(b) : []; return b ? b.staff.map((p) => ({ id: p.id, name: p.name, role: (roles.find((r) => r.id === p.role) || {}).name || p.role, skill: p.skill, pay: p.salary })) : []; }
    if (kind === 'prod') { const co = s.prod && s.prod.cos[ref]; return co ? co.crew.map((c) => ({ id: c.id, name: c.name, role: c.roleName || c.role, skill: c.skill, pay: c.wage })) : []; }
    if (kind === 'brand') return s.brand ? s.brand.staff.map((m) => ({ id: m.role, name: m.name, role: m.role, skill: m.skill, pay: m.wage })) : [];
    if (kind === 'farm') return s.farm ? s.farm.staff.map((m) => ({ id: m.id, name: m.name, role: m.role, skill: m.skill, pay: m.wage })) : [];
    if (kind === 'team') { const P = s.fr; const t = P && ((P.teams || []).find((x) => x.id === ref) || P.team); return t ? t.staff.map((m) => ({ id: m.id, name: m.name, role: m.role, skill: m.skill, pay: m.salary })) : []; }
    if (kind === 'racing') { const t = s.rc && s.rc.team; return t ? t.staff.map((m) => ({ id: m.id, name: m.name, role: m.role, skill: m.skill, pay: m.salary })) : []; }
    return [];
  },
  getSwapCandidates(kind, ref, memberId) {
    const s = this.s, m = this.getSwapMembers(kind, ref).find((x) => String(x.id) === String(memberId)); if (!m) return [];
    const cands = this._swapCands(kind, ref, m, memberId); return cands.filter((c) => c.name !== m.name);
  },
  _swapCands(kind, ref, m, memberId) {
    const s = this.s;
    if (kind === 'biz') { const b = s.biz.find((x) => x.id === ref), roles = Biz.rolesOf(b), role = roles.find((r) => r.name === m.role || r.id === m.role); return role ? Biz.TIERS.map((t) => ({ id: t.id, name: `${t.name} ${role.name}`, skill: t.skill, pay: R(role.base * (0.7 + t.skill / 100 * 1.3) / 500) * 500, fee: R(role.base * (0.7 + t.skill / 100 * 1.3) * 0.1), roleId: role.id })) : []; }
    if (kind === 'prod') { const co = s.prod.cos[ref]; return (co.market.crew || []).filter((c) => c.role === (co.crew.find((x) => x.id === memberId) || {}).role).map((c) => ({ id: c.id, name: c.name, skill: c.skill, pay: c.wage })); }
    if (kind === 'brand') return Br.staffMarket(s, m.id).map((c) => ({ id: c.id, name: c.name, skill: c.skill, pay: c.wage }));
    if (kind === 'farm') return Fm.staffMarket(s, m.role).map((c) => ({ id: c.id, name: c.name, skill: c.skill, pay: c.wage }));
    if (kind === 'team') return withTeam(s, kind, ref, () => Fr.staffMarket(s, m.role).map((c) => ({ id: c.id, name: c.name, skill: c.skill, pay: c.salary || c.fee || c.wage })));
    if (kind === 'racing') return Rc.staffMarket(s, m.role).map((c) => ({ id: c.id, name: c.name, skill: c.skill, pay: c.salary || c.fee || c.wage }));
    return [];
  },
  swapStaff(kind, ref, memberId, candId) {
    const s = this.s, n0 = this.mark(); if (!s.alive) return this.res(false, 'Not available.', n0);
    const m = this.getSwapMembers(kind, ref).find((x) => String(x.id) === String(memberId)); if (!m) return this.res(false, 'No such employee.', n0);
    const c = this.getSwapCandidates(kind, ref, memberId).find((x) => String(x.id) === String(candId)); if (!c) return this.res(false, 'That candidate is gone.', n0);
    const cash0 = s.cash; let r;
    try {
      if (kind === 'biz') { const b = s.biz.find((x) => x.id === ref); if (s.cash < m.pay * 0.15 + c.fee) return this.res(false, 'Cannot afford severance and signing bonus.', n0); Biz.fire(s, b, m.id); const h = Plus.hire(s, b, c.roleId, c.id); r = { ok: !!h.ok, msg: h.ok ? 'Swapped.' : h.err }; }
      else if (kind === 'prod') { const co = s.prod.cos[ref]; if (co.crew.length <= 2) { const h = Prod.hire(s, ref, c.id); r = h.ok ? Prod.fire(s, ref, m.id) : h; } else { const f = Prod.fire(s, ref, m.id); r = f.ok ? Prod.hire(s, ref, c.id) : f; } }
      else if (kind === 'brand') { const f = Br.fire(s, m.id); r = f.ok ? Br.hire(s, m.id, c.id) : f; }
      else if (kind === 'farm') { const f = Fm.fire(s, m.id); r = f.ok ? Fm.hire(s, m.role, c.id) : f; }
      else if (kind === 'team') r = withTeam(s, kind, ref, () => { const f = Fr.fire(s, m.id); return f.ok ? Fr.hire(s, m.role, c.id) : f; });
      else if (kind === 'racing') { const f = Rc.fire(s, m.id); r = f.ok ? Rc.hire(s, m.role, c.id) : f; }
    } catch (e) { r = { ok: false, msg: 'Could not swap.' }; }
    if (r && r.ok) log(s, `I replaced ${m.name} (${m.role}) with ${c.name}.`, 'biz');
    return this.res(!!(r && r.ok), r && r.ok ? `${m.name} replaced by ${c.name}. Net cash ${R(s.cash - cash0).toLocaleString('en-US')}.` : (r && (r.msg || r.err)) || 'Could not swap.', n0);
  },
};

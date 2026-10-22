// Time budget & stress adapter methods + commitment gates (a new job/business/team/etc. is refused when the weekly hours would not fit).
import { fmtMoney } from './fmt.js';
import * as TB from './timebudget.js';
import { D } from './data.js';
export const tbApi = {
  getTimeBudget() { return { ...TB.status(this.s), mgmtTiers: TB.MGMT_TIERS, mgmtGroups: TB.groups(this.s) }; },
  getMgmtGroups() { return TB.groups(this.s); },
  setManagement(id, tier) { const n0 = this.mark(); const r = TB.setMgmt(this.s, id, tier); return this.res(r.ok, r.msg, n0); },
  timeAction(id) { const n0 = this.mark(); if (!this.s.alive) return this.res(false, 'Not available.', n0); const r = TB.relief(this.s, id); return this.res(!!r.ok, r.msg, n0); },
  listSecondJobs() { const s = this.s, E = this.E || null; return { current: s.job2 ? { id: s.job2.id, name: (D.careers.find((c) => c.id === s.job2.id) || {}).name, perf: Math.round(s.job2.perf) } : null, hours: 20, jobs: D.careers.filter((c) => s.age >= Math.max(16, c.minAge) && s.edu >= c.edu && s.stats.smarts >= c.smarts && c.minAge <= 21 && (!s.job || s.job.id !== c.id)).slice(0, 12).map((c) => ({ id: c.id, name: c.name, pay: Math.round(c.levels[0][1] * 0.6), title: c.levels[0][0] })) }; },
  hireSecondJob(id) { const s = this.s, n0 = this.mark(); if (!s.alive) return this.res(false, 'Not available.', n0); if (s.age < 16) return this.res(false, 'Second jobs start at 16.', n0); if (s.job2) return this.res(false, 'You already have a second job. Quit it first.', n0); const c = D.careers.find((x) => x.id === id), ok = this.listSecondJobs().jobs.find((x) => x.id === id); if (!c || !ok) return this.res(false, 'You do not qualify for that job.', n0); const g = TB.canAdd(s, 22); if (g) return this.res(false, g, n0); s.job2 = { id, perf: 50, yrs: 0 }; return this.res(true, `You took a second job as ${c.levels[0][0].toLowerCase()} (20h/week, about ${fmtMoney(Math.round(c.levels[0][1] * 0.6))}/yr).`, n0); },
  quitSecondJob() { const s = this.s, n0 = this.mark(); if (!s.job2) return this.res(false, 'No second job.', n0); s.job2 = null; return this.res(true, 'You quit your second job.', n0); },
};
// wrap existing adapter methods with an hours gate
export function installGates(proto) {
  const wrap = (name, hoursFn) => { const orig = proto[name]; if (!orig) return; proto[name] = function (...a) { const h = hoursFn.apply(this, a); if (h) { const m = TB.canAdd(this.s, h); if (m) return this.res(false, m, this.mark()); } return orig.apply(this, a); }; };
  const hasJob = (s) => !!(s.job || (s.sl && s.sl.job));
  wrap('applyJob', function () { return hasJob(this.s) ? 0 : 45; });
  wrap('applyPartTime', function () { return this.s.sl && this.s.sl.partTime ? 0 : 17; });
  wrap('foundBusiness', () => 6); wrap('buyBusiness', () => 6);
  wrap('frAction', (a) => (a === 'buy' || a === 'create' ? 6 : 0));
  wrap('prodAction', (m, a) => (a === 'found' ? 5 : 0));
  wrap('rcAction', (a, a1) => (a === 'create' ? 8 : a === 'join' ? 25 : 0));
  wrap('streamerAction', function (a) { return a === 'start' && !(this.s.stream && this.s.stream.active) ? 20 : 0; });
  wrap('esAction', (a) => (a === 'buy' || a === 'create' ? 6 : 0));
}

// Job panel adapter (coworkers, boss, promotion readiness).
import * as JP from './jobpanel.js';
export const jobApi = {
  getJobPanel() { return JP.view(this.s); },
  jobCoworker(id, act) { const n0 = this.mark(); const r = JP.coworker(this.s, id, act); return this.res(r.ok, r.msg, n0); },
  jobBoss(act) { const n0 = this.mark(); const r = JP.boss(this.s, act); return this.res(r.ok, r.msg, n0); },
};

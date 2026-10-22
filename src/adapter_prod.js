// Production company adapter methods (mixed into EngineAdapter). Logic: src/prodco.js, data: data/prodco.json.
import * as Prod from './prodco.js';
import * as Hw from './hardware.js';
export const prodApi = {
  getConsoleMakers() { return Hw.list(this.s); },
  getProdCos() { return Prod.status(this.s); },
  // action: found(name) fund(amt) withdraw(amt) sell hire(id) fire(id) train(id) sign(id) drop(id) policy(patch) greenlight(opts) invest(pitchId, amt)
  setMediaPlan(medium, id) { const n0 = this.mark(); if (!this.s.alive) return this.res(false, 'Not available.', n0); const r = Prod.chooseStrategy(this.s, medium, id); return this.res(!!r.ok, r.msg, n0); },
  prodAction(medium, action, a1, a2) {
    const s = this.s, n0 = this.mark(); if (!s.alive) return this.res(false, 'Not available.', n0);
    const f = { found: () => Prod.found(s, medium, a1), fund: () => Prod.fundCo(s, medium, a1), withdraw: () => Prod.withdraw(s, medium, a1), sell: () => Prod.sellCo(s, medium), hire: () => Prod.hire(s, medium, a1), fire: () => Prod.fire(s, medium, a1), train: () => Prod.train(s, medium, a1), sign: () => Prod.sign(s, medium, a1), drop: () => Prod.drop(s, medium, a1), deal: () => Prod.dealAccept(s, medium, a1, a2 !== false), policy: () => Prod.setPolicy(s, medium, a1), greenlight: () => Prod.greenlight(s, medium, a1 || {}), invest: () => Prod.invest(s, medium, a1, a2) }[action];
    if (!f) return this.res(false, 'Unknown action.', n0); const r = f(); return this.res(!!r.ok, r.msg, n0, { project: r.project });
  },
};

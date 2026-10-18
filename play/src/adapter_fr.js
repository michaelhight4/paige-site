// Team ownership adapter methods (mixed into EngineAdapter). Logic: src/franchise.js, data: data/franchise.json.
import * as Fr from './franchise.js';
export const frApi = {
  getFranchise() { return Fr.status(this.s); },
  getFranchiseTeams(sport, type) { return Fr.catalog(this.s, sport, type); },
  getFranchiseQuote(o) { return Fr.quote(this.s, o); },
  getFranchiseStaff(role) { return Fr.staffMarket(this.s, role); },
  getFranchiseProspects() { return Fr.prospects(this.s); },
  // action: buy(opts) weights(w) focus(statId) style(id) policy(patch) hire(role, id) fire(id) recruit(id) release(id) upgrade('size'|'tier'|'repair') fund(amt) withdraw(amt) sell
  frAction(action, a1, a2) {
    const s = this.s, n0 = this.mark(); if (!s.alive) return this.res(false, 'Not available.', n0);
    const f = { buy: () => Fr.buy(s, a1 || {}), weights: () => Fr.setWeights(s, a1), focus: () => Fr.setFocus(s, a1), style: () => Fr.setStyle(s, a1), policy: () => Fr.setPolicy(s, a1), hire: () => Fr.hire(s, a1, a2), fire: () => Fr.fire(s, a1), recruit: () => Fr.recruit(s, a1), release: () => Fr.release(s, a1), upgrade: () => Fr.upgradeStadium(s, a1), fund: () => Fr.fund(s, a1), withdraw: () => Fr.withdraw(s, a1), sell: () => Fr.sell(s) }[action];
    if (!f) return this.res(false, 'Unknown action.', n0); const r = f(); return this.res(!!r.ok, r.msg, n0);
  },
};

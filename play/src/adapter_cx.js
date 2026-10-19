// Clothing brand, farm/ranch and investment advisor adapter methods. Logic: src/brand.js, src/farm.js, src/advisor.js.
import * as Br from './brand.js';
import * as Fm from './farm.js';
import * as Ad from './advisor.js';

const wrap = (self, fn, extra) => { const s = self.s, n0 = self.mark(); if (!s.alive) return self.res(false, 'Not available.', n0); const r = fn(s); return self.res(!!r.ok, r.msg, n0, extra ? extra(r) : undefined); };
export const cxApi = {
  // brand
  getBrand() { return Br.status(this.s); },
  getBrandQuote(o) { return Br.quote(this.s, o || {}); },
  getBrandStaff(role) { return Br.staffMarket(this.s, role); },
  getBrandModels() { return Br.modelMarket(this.s); },
  getBrandLogo(l) { return Br.logoSvgOf(l); },
  getBrandEstimate(season, plan) { return Br.estimate(this.s, season, plan); },
  brandAction(a, x, y, z) {
    const f = { found: (s) => Br.found(s, x || {}), positioning: (s) => Br.setPositioning(s, x || {}), addLine: (s) => Br.addLine(s, x), dropLine: (s) => Br.dropLine(s, x), hire: (s) => Br.hire(s, x, y), fire: (s) => Br.fire(s, x), signModel: (s) => Br.signModel(s, x), dropModel: (s) => Br.dropModel(s, x), addChannel: (s) => Br.addChannel(s, x), closeChannel: (s) => Br.closeChannel(s, x), invest: (s) => Br.invest(s, x, y), policy: (s) => Br.setPolicy(s, x || {}), logo: (s) => Br.setLogo(s, x), plan: (s) => Br.planCollection(s, x, y || {}), launch: (s) => Br.launch(s, x), launchAll: (s) => Br.launchAll(s), sell: (s) => Br.sell(s) }[a];
    if (!f) return this.res(false, 'Unknown action.', this.mark()); return wrap(this, f, (r) => ({ collection: r.collection }));
  },
  // farm
  getFarm() { return Fm.status(this.s); },
  getFarmQuote(o) { return Fm.quote(this.s, o || {}); },
  getFarmStaff(role) { return Fm.staffMarket(this.s, role); },
  getFarmOffers(product) { return Fm.offers(this.s, product); },
  farmAction(a, x, y, z, w) {
    const f = { found: (s) => Fm.found(s, x || {}), buyAcres: (s) => Fm.buyAcres(s, x), sellAcres: (s) => Fm.sellAcres(s, x), addOp: (s) => Fm.addOp(s, x, y), setOp: (s) => Fm.setOpAcres(s, x, y), dropOp: (s) => Fm.dropOp(s, x), upgrade: (s) => Fm.upgrade(s, x), insurance: (s) => Fm.setInsurance(s, !!x), autoSell: (s) => Fm.setAutoSell(s, !!x), hire: (s) => Fm.hire(s, x, y), fire: (s) => Fm.fire(s, x), sell: (s) => Fm.sellStock(s, x, y, z), contract: (s) => Fm.signContract(s, x, y, z, w), cancel: (s) => Fm.cancelContract(s, x), sellFarm: (s) => Fm.sell(s) }[a];
    if (!f) return this.res(false, 'Unknown action.', this.mark()); return wrap(this, f);
  },
  // advisor
  getAdvisor() { return Ad.status(this.s); },
  advisorAction(a, x, y) {
    const f = { hire: (s) => Ad.hire(s, x), dismiss: (s) => Ad.dismiss(s), plan: (s) => Ad.setPlan(s, x || {}), clearPlan: (s) => Ad.clearPlan(s), invest: (s) => Ad.invest(s, x, y), cashOut: (s) => Ad.cashOut(s, x, y) }[a];
    if (!f) return this.res(false, 'Unknown action.', this.mark()); return wrap(this, f);
  },
};

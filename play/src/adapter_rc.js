// Racing adapter methods (mixed into EngineAdapter). Logic: src/racing.js.
import * as Rc from './racing.js';
export const rcApi = {
  getRacing() { return Rc.status(this.s); },
  getRacingCatalog(type, tier) { return Rc.catalog(this.s, type, tier); },
  getRacingQuote(o) { return Rc.quote(this.s, o); },
  getRacingStaff(role) { return Rc.staffMarket(this.s, role); },
  getRacingDrivers() { return Rc.driverMarket(this.s); },
  getRacingLogo(logo) { return Rc.logoSvgOf(logo); },
  getRacingFrames(which) { return Rc.framesFor(this.s, which); },
  // career: join(role,type) quit license train(stat) race(all) moveUp | team: buy create hire fire sign release upgrade strategy sponsor drop teamRace(all) fund withdraw sell logo
  rcAction(action, a1, a2) {
    const s = this.s, n0 = this.mark(); if (!s.alive) return this.res(false, 'Not available.', n0);
    const f = { join: () => Rc.join(s, a1, a2), quit: () => Rc.quit(s), license: () => Rc.getLicense(s), train: () => Rc.train(s, a1), race: () => Rc.careerRace(s, !!a1), moveUp: () => Rc.moveUp(s),
      buy: () => Rc.buy(s, a1 || {}), create: () => Rc.create(s, a1 || {}), hire: () => Rc.hire(s, a1, a2), fire: () => Rc.fire(s, a1), sign: () => Rc.signDriver(s, a1), release: () => Rc.releaseDriver(s, a1), upgrade: () => Rc.upgrade(s, a1), strategy: () => Rc.setStrategy(s, a1), sponsor: () => Rc.acceptSponsor(s, a1), drop: () => Rc.dropSponsor(s, a1), teamRace: () => Rc.teamRace(s, !!a1), fund: () => Rc.fund(s, a1), withdraw: () => Rc.withdraw(s, a1), sell: () => Rc.sell(s), logo: () => Rc.setLogo(s, a1) }[action];
    if (!f) return this.res(false, 'Unknown action.', n0); const r = f(); return this.res(!!r.ok, r.msg, n0, { race: r.race });
  },
};

// Coaching adapter methods (mixed into EngineAdapter). Logic: src/coaching.js; data: data/coaching.json.
import * as Coach from './coaching.js';
export const coachApi = {
  getCoaching() { return Coach.status(this.s); },
  getMatchFrames() { const m = this.s.coach && this.s.coach.match; return m ? { match: m, frames: Coach.frames(m, Math.min(6, 11), 6) } : null; },
  // action: take(sportId) quit promote plan(style, training) mode('auto'|'interactive') buy(id) sell(id) upgrade('stadium'|'gear') donate(amt) quarter(style)
  coachAction(action, a1, a2) {
    const s = this.s, n0 = this.mark(); if (!s.alive) return this.res(false, 'Not available.', n0);
    const f = { take: () => Coach.take(s, a1), quit: () => Coach.quit(s), promote: () => Coach.promote(s), plan: () => Coach.setPlan(s, a1, a2), mode: () => Coach.setMode(s, a1), buy: () => Coach.buy(s, a1), sell: () => Coach.sell(s, a1), upgrade: () => Coach.upgrade(s, a1), donate: () => Coach.donate(s, a1), quarter: () => Coach.playQuarter(s, a1, a2), half: () => Coach.playHalf(s, a1) }[action];
    if (!f) return this.res(false, 'Unknown action.', n0); const r = f(); return this.res(!!r.ok, r.msg, n0, { match: r.match, half: r.half });
  },
};

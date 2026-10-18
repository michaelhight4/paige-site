// Politics + royalty adapter methods (mixed into EngineAdapter). Logic: src/politics.js, data: data/politics.json.
import * as Pol from './politics.js';
export const politicsApi = {
  getPolitics() { return Pol.status(this.s); },
  getRoyalty() { return Pol.royalStatus(this.s); },
  // action: start(slot) platform(id) budget(amt) donor(i) answer(i) shady(kind) spin withdraw launch apply(slot) govern(how) favor(i, grant) rule(i) resign war warBudget(lvl) peace duty(id)
  politicsAction(action, a1, a2) {
    const s = this.s, n0 = this.mark(); if (!s.alive) return this.res(false, 'Not available.', n0);
    const f = { start: () => Pol.startCampaign(s, a1), platform: () => Pol.setPlatform(s, a1), budget: () => Pol.addBudget(s, a1), donor: () => Pol.takeDonor(s, a1), answer: () => Pol.answer(s, a1), shady: () => Pol.shady(s, a1), spin: () => Pol.spin(s), withdraw: () => Pol.withdraw(s), launch: () => Pol.launch(s),
      apply: () => Pol.applyJudge(s, a1), govern: () => Pol.govern(s, a1), favor: () => Pol.grantFavor(s, a1, !!a2), rule: () => Pol.rule(s, a1), resign: () => Pol.resign(s), war: () => Pol.declareWar(s), warBudget: () => Pol.warBudget(s, a1), peace: () => Pol.makePeace(s), duty: () => Pol.royalDuty(s, a1) }[action];
    if (!f) return this.res(false, 'Unknown action.', n0); const r = f(); return this.res(!!r.ok, r.msg, n0, { won: r.won, result: r.result, press: r.press });
  },
};

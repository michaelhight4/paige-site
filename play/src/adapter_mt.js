// My Team adapter methods. Logic: src/myteam.js
import * as MT from './myteam.js';
const go = (self, fn) => { const s = self.s, n0 = self.mark(); if (!s.alive) return self.res(false, 'Not available.', n0); const r = fn(s); return self.res(!!r.ok, r.msg, n0, r); };
export const mtApi = {
  getMyTeam() { return MT.view(this.s); },
  mtTrain(skill) { return go(this, (s) => MT.trainSkill(s, skill)); },
  mtTrainLowest() { return go(this, (s) => MT.trainLowest(s)); },
  mtStyle(id) { return go(this, (s) => MT.setStyle(s, id)); },
  mtOffer(id, verb) { return go(this, () => MT.respond(this, id, verb)); },
};

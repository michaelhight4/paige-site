// My Team adapter methods. Logic: src/myteam.js
import * as MT from './myteam.js';
import * as Hon from './honors.js';
const go = (self, fn) => { const s = self.s, n0 = self.mark(); if (!s.alive) return self.res(false, 'Not available.', n0); const r = fn(s); return self.res(!!r.ok, r.msg, n0, r); };
export const mtApi = {
  getMyTeam() { const v = MT.view(this.s); if (v.onTeam) v.security = MT.rosterSecurity(this.s); return v; },
  getKeyGame() { return MT.keyGame(this.s); },
  mtKeyGame(id) { return go(this, (s) => MT.keyGameCall(s, id)); },
  mtTrain(skill) { return go(this, (s) => MT.trainSkill(s, skill)); },
  mtTrainLowest() { return go(this, (s) => MT.trainLowest(s)); },
  mtStyle(id) { return go(this, (s) => MT.setStyle(s, id)); },
  getTeammates() { return MT.matesView(this.s); },
  mtMate(id, act) { return go(this, (s) => MT.mateAct(s, id, act)); },
  getTrophyCase() { return Hon.trophyCase(this.s); },
  getBrandDeals() { return Hon.view(this.s); },
  brandAccept(id, swap) { return go(this, (s) => Hon.accept(s, id, swap)); },
  brandDrop(id) { return go(this, (s) => Hon.drop(s, id)); },
  mtOffer(id, verb) { return go(this, () => MT.respond(this, id, verb)); },
};

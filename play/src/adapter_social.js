// Social media adapter methods (mixed into EngineAdapter). Logic: src/social.js, data: data/social.json.
import * as Social from './social.js';
import { D } from './data.js';
export const socialApi = {
  getSocial() { return Social.status(this.s); },
  getPlatform(pid) { return Social.platformStatus(this.s, pid); },
  // action: open delete reply boost(pack) collab break post(type) accept(id) decline(id) verify ambassador endAmbassador plan(n,type)
  socialAction(pid, action, a1, a2) {
    const s = this.s, n0 = this.mark(); if (!s.alive) return this.res(false, 'Not available.', n0);
    const f = { open: () => Social.openAccount(s, pid), delete: () => Social.deleteAccount(s, pid), reply: () => Social.reply(s, pid), boost: () => Social.buyBoost(s, pid, a1), collab: () => Social.collab(s, pid), break: () => Social.takeBreak(s, pid), post: () => Social.post(s, pid, a1),
      accept: () => Social.acceptOffer(s, pid, a1), decline: () => Social.declineOffer(s, pid, a1), verify: () => Social.applyVerify(s, pid), ambassador: () => Social.ambassador(s, pid), endAmbassador: () => Social.endAmbassador(s), plan: () => Social.setPlan(s, pid, a1, a2) }[action];
    if (!f) return this.res(false, 'Unknown action.', n0); const r = f(); return this.res(!!r.ok, r.msg, n0, { won: r.won, post: r.type ? r : undefined });
  },
  socialPrompt(i) { const n0 = this.mark(), r = Social.resolvePrompt(this.s, i); return this.res(!!r.ok, r.msg, n0); },
  socialTeam(action, role) { const n0 = this.mark(), r = action === 'hire' ? Social.hire(this.s, role) : Social.fireTeam(this.s, role); return this.res(!!r.ok, r.msg, n0); },
  socialBusiness(type) { const n0 = this.mark(); const why = Social.canMerch(this.s, type); if (why) return this.res(false, why, n0); return this.foundBusiness({ type }); },
};
export const socialData = () => D.social;

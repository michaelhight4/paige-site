// Streamer + influencer adapter methods (mixed into EngineAdapter). Logic: src/online.js, data: data/online.json.
import * as Online from './online.js';
import * as Social from './social.js';

export const onlineApi = {
  getStreamer() { return { ...Online.streamStatus(this.s), chat: Social.chatScene(this.s), chatLeft: this.s.stream ? 3 - (this.s.stream.chatYear === Math.floor(this.s.age) ? this.s.stream.chatDone || 0 : 0) : 3 }; },
  getInfluencer() { return Online.influencerStatus(this.s); },
  // action: start(topic) quit topic(id) schedule(id) upgrade(item) sponsor dropSponsor(i) rest marathon
  setStreamPlan(id) { const n0 = this.mark(); if (!this.s.alive) return this.res(false, 'Not available.', n0); const r = Online.chooseStreamPlan(this.s, id); return this.res(!!r.ok, r.msg, n0); },
  streamerAction(action, arg) {
    const s = this.s, n0 = this.mark(); const f = { start: Online.startStream, quit: Online.quitStream, topic: Online.setTopic, schedule: Online.setSchedule, upgrade: Online.upgradeSetup, sponsor: Online.seekSponsor, swapSponsor: (s) => Online.seekSponsor(s, true), dropSponsor: Online.dropSponsor, rest: Online.takeBreak, marathon: Online.marathon, chatStart: Social.chatStart, chatChoose: Social.chatChoose }[action];
    if (!f) return this.res(false, 'Unknown action.', n0); if (!s.alive) return this.res(false, 'Not available.', n0); const r = f(s, arg); return this.res(!!r.ok, r.msg, n0, { won: r.won });
  },
  // action: start(niche) quit niche(id) style(id) posting(id) accept(id) decline(id) big pr rest
  influencerAction(action, arg) {
    const s = this.s, n0 = this.mark(); const f = { start: Online.startInfluencer, quit: Online.quitInfluencer, niche: Online.setNiche, style: Online.setStyle, posting: Online.setPosting, accept: Online.acceptDeal, swapDeal: (s, id) => Online.acceptDeal(s, id, true), dropDeal: Online.dropDeal, decline: Online.declineDeal, big: Online.postBig, pr: Online.pr, rest: Online.logOff }[action];
    if (!f) return this.res(false, 'Unknown action.', n0); if (!s.alive) return this.res(false, 'Not available.', n0); const r = f(s, arg); return this.res(!!r.ok, r.msg, n0, { won: r.won });
  },
};

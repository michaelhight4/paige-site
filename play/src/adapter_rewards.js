// Rewarded-ad options (mixed into EngineAdapter). Policy lives in src/ads.js, the ad itself behind src/adapter_ads.js.
// Every method checks that the action is valid BEFORE the ad starts, then grants the reward only if Ads.authorize() confirms the full duration was watched.
import * as E from './engine.js';
import { D } from './data.js';
import * as Ads from './ads.js';
import * as Ev from './events.js';
import * as P from './people.js';
import { log, addStat } from './core.js';

const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
// ---- rare choice on event cards ----
const baseChoices = (s) => { const p = s.pending[0]; return p && p.kind === 'event' ? Ev.eventById(p.id).choices.length : -1; };
export function rareFor(s) {
  const p = s.pending[0]; if (!p || p.kind !== 'event') return null;
  if (p.adRare === undefined) {
    p.adRare = null; const e = Ev.eventById(p.id);
    if (Ads.access('rare').ok && e && e.choices.length >= 2 && Ads.chance() < D.adsCfg.rareChoiceChance) { const pool = D.adChoices.byCategory[e.cat] || D.adChoices.fallback; p.adRare = pool[Math.floor(Ads.chance() * pool.length)]; }
  }
  return p.adRare;
}
export function resolveRare(s) {
  const p = s.pending[0], rare = p && p.adRare, A = Ads.ensure(s), tok = A.unlockedRare;
  if (!rare || !tok || tok.id !== p.id || tok.turn !== s.turns) return { ok: false, msg: 'Watch the ad to unlock this option.' };
  const e = Ev.eventById(p.id); Ev.applyFx(s, rare.fx, 1);
  if (rare.raise && s.job) s.job.raise = (s.job.raise || 0) + 0.1; if (s.prison && rare.prisonbehavior) s.prison.beh += rare.prisonbehavior;
  s.pending.shift(); A.unlockedRare = null; if (e.once) s.flags['once_' + e.id] = 1; s.evLast[e.id] = s.age; s.tally.events++;
  log(s, rare.journal, 'event'); return { ok: true, msg: rare.journal, title: e.title, success: true, rare: true };
}
export { baseChoices };

export const rewardsApi = {
  getRewards() {
    const s = this.s, r = Ads.rules();
    return { platform: Ads.platform(), showsAds: Ads.showsAds(), subscriber: Ads.steamSubscribed(), perDay: r.rewardLimit === 'perOptionPerDay' ? r.perDay : null, requiredMs: Ads.requiredMs(), options: Ads.options(), cash: Math.round(s.cash), played: Ads.ensure(s).played, nextPromptAt: Ads.ensure(s).next, promptsEnabled: Ads.promptsEnabled(),
      steamNote: r.subscribersOnly ? 'Steam: no ads are shown. Subscribers get each reward option once per real-life day.' : '' };
  },
  async claimReward(key) {
    const s = this.s, n0 = this.mark(); if (!s.alive) return this.res(false, 'Not available.', n0);
    const R = D.adsCfg.rewards; let kind, stat;
    if (key === 'cash') kind = 'cash'; else if (String(key).startsWith('stat:') && R.stats.includes(key.slice(5))) { kind = 'stat'; stat = key.slice(5); } else return this.res(false, 'Unknown reward.', n0);
    const a = await Ads.authorize(key); if (!a.ok) return this.res(false, a.reason, n0, { auth: a });
    if (kind === 'cash') { s.cash += R.cash; log(s, `A sponsor sent ${money(R.cash)} my way.`, 'money'); return this.res(true, `+${money(R.cash)}`, n0, { auth: a, granted: { cash: R.cash } }); }
    const before = s.stats[stat]; addStat(s, stat, R.statPoints); const gain = Math.round(s.stats[stat] - before);
    log(s, `A sponsored boost raised my ${stat} by ${gain}.`, 'act'); return this.res(true, `+${gain} ${stat}`, n0, { auth: a, granted: { stat, gain } });
  },
  async joinClubWithAd(id) {
    const s = this.s, n0 = this.mark(), why = E.Scholar.joinBlock(s, id, true); if (why) return this.res(false, why, n0);
    const a = await Ads.authorize('club'); if (!a.ok) return this.res(false, a.reason, n0, { auth: a });
    const r = E.Scholar.joinClub(s, id, { force: true }); return this.res(!!r.ok, r.msg, n0, { auth: a });
  },
  async startRomanceWithAd() {
    const s = this.s, n0 = this.mark(); if (P.partnerOf(s)) return this.res(false, 'You already have a partner.', n0); if (s.age < D.life.dating.minAge) return this.res(false, `Dating starts at age ${D.life.dating.minAge}.`, n0);
    if (!s.cand.length) P.refreshCandidates(s); if (!s.cand.length) return this.res(false, 'Nobody around.', n0);
    const a = await Ads.authorize('romance'); if (!a.ok) return this.res(false, a.reason, n0, { auth: a });
    const r = P.dateCandidate(s, 0, { force: true }); return this.res(!!r.ok, r.msg, n0, { auth: a });
  },
  async unlockRareChoice() {
    const s = this.s, n0 = this.mark(), rare = rareFor(s); if (!rare) return this.res(false, 'No rare option here.', n0);
    const A = Ads.ensure(s), p = s.pending[0]; if (A.unlockedRare && A.unlockedRare.id === p.id && A.unlockedRare.turn === s.turns) return this.res(true, 'Already unlocked.', n0);
    const a = await Ads.authorize('rare'); if (!a.ok) return this.res(false, a.reason, n0, { auth: a });
    A.unlockedRare = { id: p.id, turn: s.turns }; return this.res(true, 'Rare option unlocked.', n0, { auth: a });
  },
  getAdPrompt() {
    const s = this.s, A = Ads.ensure(s); if (!A.due || !Ads.promptsEnabled()) return null;
    const key = A.offer || 'cash', R = D.adsCfg.rewards; return { key, label: key === 'cash' ? `+${money(R.cash)} cash` : `+${R.statPoints}% ${key.slice(5)}`, requiredMs: Ads.requiredMs(), played: A.played };
  },
  async answerAdPrompt(accept) {
    const s = this.s, n0 = this.mark(), pr = this.getAdPrompt(); if (!pr) return this.res(false, 'No offer right now.', n0);
    let r = null; if (accept) r = await this.claimReward(pr.key);
    Ads.dismissPrompt(s); return r ? { ...r, prompt: pr } : this.res(true, 'No thanks.', n0);
  },
};

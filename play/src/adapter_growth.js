// Skills / passions / scholarships adapter methods (mixed into EngineAdapter).
import * as E from './engine.js';
import { D } from './data.js';
import { log } from './core.js';
import * as Creator from './creator.js';
import * as Char from './character.js';

export const growth = {
  getAppearance() { return Char.appearance(this.s); },
  setLookPart(slot, id, colors) { const n0 = this.mark(), r = Char.equip(this.s, slot, id, colors); return this.res(r.ok, r.msg, n0); },
  setLookColor(slot, key, hex) { const n0 = this.mark(), r = Char.recolor(this.s, slot, key, hex); return this.res(r.ok, r.msg || 'Changed.', n0); },
  getLookOf(personId) { const s = this.s, p = personId === 'me' || personId == null ? 'me' : s.people.find((x) => x.id === personId); if (!p) return null; const char = Char.lookOf(s, p), age = p === 'me' ? Math.floor(s.age) : Math.floor(p.age); return { char, age, layers: Char.layerPaths(char, age), base: D.charLayers.base }; },
  getCreator() { const s = this.s; return { unlocked: Creator.unlocked(), used: !!s.creatorUsed, rankingEligible: Creator.eligibleForRanking(s), selfStats: Creator.SELF_STATS.map(([id, name]) => ({ id, name })), otherStats: Creator.OTHER_STATS.map(([id, name]) => ({ id, name })), people: Creator.unlocked() ? Creator.list(s) : [] }; },
  creatorEdit(id, patch) { const n0 = this.mark(), r = Creator.edit(this.s, id, patch || {}); return this.res(r.ok, r.msg, n0); },
  getSkills() {
    const s = this.s, S = E.Skills; S.ensure(s); const P = D.passionsData.passions, act = [...(s.passions?.active || []), ...(s.passions?.mastered || [])].map((a) => a.id);
    return { categories: S.cats().map((c) => ({ id: c.id, name: c.name, icon: c.icon, avg: Math.round(S.avg(s, c.id)), skills: S.defs().filter((d) => d.cat === c.id).map((d) => ({ id: d.id, name: d.name, value: Math.round(s.skills[d.id] * 10) / 10, boosted: S.passionMult(s, d.id) > 1, trainedBy: P.filter((p) => (p.skills[d.id] || 0) >= 0.4).map((p) => p.name) })) })), active: act, heritage: s.heritage || [] };
  },
  getPassions() { const st = E.Passions.status(this.s); return { ...st, rules: [D.passionsData.switchPenalty, `Up to ${st.slots} passions at once; a full meter (${st.benchmark}) makes a permanent mastery (max ${st.masteryCap} per life) and frees the slot.`], heritage: this.s.heritage || [] }; },
  pickPassion(id, replaceId) { const n0 = this.mark(), r = E.Passions.pick(this.s, id, replaceId); return this.res(r.ok, r.msg, n0, { needReplace: !!r.needReplace }); },
  dropPassion(id) { const n0 = this.mark(), r = E.Passions.drop(this.s, id); return this.res(r.ok, r.msg, n0); },
  practicePassion(id) { const n0 = this.mark(), r = E.Passions.practice(this.s, id); return this.res(r.ok, r.msg, n0); },
  getScholarships() { return E.Scholar.status(this.s); },
  applyScholarship(id) { const n0 = this.mark(), r = E.Scholar.apply(this.s, id); return this.res(r.ok, r.msg, n0, { won: !!r.won }); },
  joinClub(id) { const n0 = this.mark(), r = E.Scholar.joinClub(this.s, id); return this.res(r.ok, r.msg, n0); },
  volunteerHours() { const n0 = this.mark(), r = E.Scholar.volunteer(this.s); return this.res(r.ok, r.msg, n0); },
};

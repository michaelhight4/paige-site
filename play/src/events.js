import * as Bk from './bankruptcy.js';
import * as MT from './myteam.js';
import * as Hon from './honors.js';
// Data-driven life events (data/events.json): weighted, age-gated, condition-filtered, once-per-life flags, follow-up chains.
import { D } from './data.js';
import { rnd, rint, pick, chance, clamp, wpick, money } from './rng.js';
import { log, earn, spend, addStat, fill, STAT_ALIAS } from './core.js';
import * as P from './people.js';
import * as Crime from './crime.js';
import * as SS from './schoolsports.js';
import * as Carry from './schoolcarry.js';
import * as Legacy from './legacy.js';
import * as Health from './health.js';
import * as Skills from './skills.js';
import * as Passions from './passions.js';
import * as Online from './online.js';
import * as Social from './social.js';
import * as Politics from './politics.js';
import * as Coach from './coaching.js';
import * as Prod from './prodco.js';

const REL_T = { rel_mother: ['mother'], rel_father: ['father'], rel_parent: ['mother', 'father'], rel_sibling: ['sibling'], rel_family: ['mother', 'father', 'sibling'], rel_friend: ['friend'],
  rel_partner: ['partner', 'spouse'], rel_child: ['child'], rel_coworker: ['coworker'] };
const STAT_KEYS = ['health', 'happy', 'happiness', 'smarts', 'looks', 'fame', 'karma', 'crazy', 'stress'];
export const eventById = (id) => D.events.find((e) => e.id === id);
export function matches(s, e) {
  const c = e.if || {}, age = Math.floor(s.age);
  if (age < e.ages[0] || age > e.ages[1]) return false;
  if (c.prison ? !s.prison : s.prison) return false;
  if (e.once && s.flags['once_' + e.id]) return false;
  if (s.evLast[e.id] != null && s.age - s.evLast[e.id] < (e.cool ?? 4)) return false;
  const par = P.living(s).filter((p) => p.rel === 'mother' || p.rel === 'father');
  if (c.job && !s.job) return false; if (c.biz && !s.biz.length) return false;
  if (c.single && P.partnerOf(s)) return false; if (c.partner && !P.partnerOf(s)) return false;
  if (c.engaged && !s.flags.engaged) return false; if (c.pregnantPartner && !s.flags.pregnant) return false;
  if (c.friends && P.friends(s).length < c.friends) return false; if (c.maxFriends != null && P.friends(s).length > c.maxFriends) return false;
  if (c.parent === 'any' && !par.length) return false; if (c.parent === 'both' && par.length < 2) return false; if ((c.parent === 'mother' || c.parent === 'father') && !par.some((p) => p.rel === c.parent)) return false;
  if (c.sibling && !P.living(s, 'sibling').length) return false; if (c.kids && !P.children(s).length) return false;
  if (c.school === 'any' ? !s.school : c.school && s.school !== c.school) return false;
  if (c.minCash != null && s.cash < c.minCash) return false;
  if (c.flag && !s.flags[c.flag]) return false; if (c.noflag && s.flags[c.noflag]) return false;
  if (c.anyCar && !s.assets.some((a) => a.kind === 'car')) return false;
  if (c.minLooks != null && s.stats.looks < c.minLooks) return false; if (c.minFame != null && s.stats.fame < c.minFame) return false;
  if (c.sport && !s.sport) return false; if (c.nosport && s.sport) return false;
  if (c.warRisk && P.country(s).war <= 0) return false;
  if (c.passion && !Passions.has(s, c.passion)) return false;
  if (c.sportsOwner && !s.biz.some((b) => b.kind === 'sports')) return false;
  return true;
}
export function eligible(s) { return D.events.filter((e) => !e.chainOnly && e.w > 0 && matches(s, e)); }
const wOf = (s, e) => e.w * (e.if?.warRisk ? P.country(s).war * 2 : 1);
function ctxFor(s) {
  const fr = P.friends(s), par = P.living(s).filter((p) => p.rel === 'mother' || p.rel === 'father');
  return { friend: fr.length ? pick(s, fr).first : 'a friend', place: pick(s, D.life.places), parent: par.length ? pick(s, par).first : 'my parent', boss: 'my boss', partner: P.partnerOf(s)?.first || 'my partner', partnerWord: P.partnerOf(s) ? 'my ' + P.relWord(P.partnerOf(s)).toLowerCase() : 'my partner' };
}
export function queue(s, id, ctx) { if (s.pending.some((p) => p.kind === 'event' && p.id === id)) return; ctx = ctx || ctxFor(s); if (id === 'job_offer' && s.job) ctx = { ...ctx, offer: makeOffer(s) }; s.pending.push({ kind: 'event', id, ctx }); }
// Competitive offers (7c): priced off what you earn now in your sector, 90-155%; lowballs are flagged.
const SECTOR_TAG = { tech: 'tech company', medicine: 'hospital group', health: 'hospital group', law: 'law firm', finance: 'bank', business: 'corporation', education: 'school district', arts: 'studio', media: 'media group', trades: 'contractor', service: 'chain', science: 'research lab', government: 'agency', engineering: 'engineering firm' };
export const curPay = (s) => { if (!s.job) return 0; const c = D.careers.find((x) => x.id === s.job.id); if (!c) return 0; return Math.round(c.levels[s.job.level][1] * (0.9 + 0.2 * s.job.perf / 100) * (1 + (s.job.raise || 0))); };
export function makeOffer(s) { const cur = curPay(s), c = D.careers.find((x) => x.id === s.job.id) || {}, low = chance(s, 0.2); const pct = low ? 0.9 + rnd(s) * 0.09 : 1.05 + rnd(s) * 0.5; const key = String(c.sector || c.id || '').toLowerCase(); const tag = SECTOR_TAG[key] || Object.entries(SECTOR_TAG).find(([k]) => key.includes(k))?.[1] || (c.name ? c.name.toLowerCase() + ' employer' : 'competitor'); return { cur, pay: Math.round(cur * pct / 500) * 500, pct: Math.round((pct - 1) * 100), low, tag }; }
const sgn = (n) => (n >= 0 ? '+' : '') + n + '%';
function offerCard(e, o) { const vs = `vs your current ${sgn(o.pct)}`; return { text: `A recruiter from a rival ${o.tag} offers you ${money(o.pay)}/yr (${vs}).${o.low ? ' ⚠️ That is a lowball: less than you make now.' : ''}`, choices: e.choices.map((c) => c.switchjob ? { ...c, label: `Accept ${money(o.pay)}/yr (${sgn(o.pct)})${o.low ? ' · lowball' : ''}` } : c) }; }
export function draw(s, dt) {
  // follow-up chains first
  const due = s.chain.filter((c) => c.due <= s.age); s.chain = s.chain.filter((c) => c.due > s.age);
  for (const c of due) { const e = eventById(c.id); if (e && s.pending.length < 2 && (e.ages[0] <= s.age) && !s.prison) queue(s, c.id); }
  if (s.pending.length) return;
  // Quiet years: only MAJOR events (crime, illness, job/business/money news, old age, fame, prison) interrupt often; minor flavour events are rare popups.
  const R = rates(); const pass = (isMajor, p) => {
    if (!chance(s, p * dt)) return; const el = eligible(s).filter((e) => majorEv(e) === isMajor && !s.pending.some((q) => q.id === e.id));
    const e = wpick(s, el, (x) => wOf(s, x) * passionBoost(s, x)); if (e) queue(s, e.id);
  };
  const young = s.age < 13 ? R.youngMinorMult : 1;
  pass(true, R.major); if (!s.pending.length) pass(false, R.minor * young + passionRate(s));
  if (s.prison && !s.pending.length && chance(s, 0.6 * dt)) { const el = eligible(s); const e = wpick(s, el, (x) => x.w); if (e) queue(s, e.id); }
}
export const MAJOR_CATS = ['crime', 'health', 'work', 'business', 'money', 'oldage', 'prison', 'fame'];
export const majorEv = (e) => (e.major != null ? !!e.major : MAJOR_CATS.includes(e.cat));
export const rates = () => ({ major: 0.34, minor: 0.1, youngMinorMult: 1.6, ...((D.life && D.life.eventRates) || {}) });
// passions hook (set by passions.js): extra weight/rate for events tied to the active passion
const passionBoost = (s, e) => Passions.boost(s, e), passionRate = (s) => Passions.rate(s);
export function pendingCard(s) {
  const p = s.pending[0]; if (!p) return null;
  if (p.kind === 'bankruptcy') return Bk.card(s);
  if (p.kind === 'released') return MT.releaseCard(s);
  if (p.kind === 'passion_mastered') return Passions.masteredCard(s);
  if (p.kind === 'hof') return Hon.hofCard(s);
  if (p.kind === 'event') { const e = eventById(p.id); const base = { ...e, kind: 'event', text: fill(e.prompt, p.ctx || {}), choices: e.choices.map((c) => ({ ...c, label: fill(c.label, p.ctx || {}) })) }; return p.ctx && p.ctx.offer && s.job ? { ...base, ...offerCard(base, p.ctx.offer), offer: p.ctx.offer } : base; }
  if (p.kind === 'college') return { kind: 'college', title: 'College?', text: 'You finished high school. Go to college? Tuition is $20,000/yr (student loan), 4 years, boosts smarts and unlocks top careers.',
    choices: [{ label: 'Enroll (student loan)' }, ...(Carry.carrySport(s) && Carry.carrySport(s).skill >= D.life.sports.draft.scholarshipSkill ? [{ label: 'Enroll on an athletic scholarship' }] : []), { label: 'Skip college, start working' }] };
  return null;
}
export function applyFx(s, fx = {}, scale = 1) {
  for (const k of Object.keys(fx)) {
    const v = fx[k];
    if (STAT_KEYS.includes(k)) addStat(s, STAT_ALIAS[k] || k, v * scale);
    else if (k === 'money') v > 0 ? earn(s, v) : spend(s, -v);
    else if (k === 'pm') { const id = s._evPassion; if (id) Passions.gain(s, id, v); else for (const a of [...Passions.ensure(s).active]) Passions.gain(s, a.id, v / 2); }
    else if (k.startsWith('sk_')) Skills.use(s, k.slice(3), v)
    else if (k === 'award') { Passions.ensure(s); s.awards.push({ id: v, age: Math.floor(s.age), text: 'Award: ' + v }); }
    else if (k === 'stream' || k === 'infl') Online.eventFx(s, k, v)
    else if (k === 'social') Social.eventFx(s, v)
    else if (k === 'pol') Politics.eventFx(s, v)
    else if (k === 'coach') Coach.eventFx(s, v)
    else if (k === 'prod') Prod.eventFx(s, v)
    else if (k === 'bizrep') { if (s.biz.length) { const b = pick(s, s.biz); b.rep = clamp(b.rep + v, 0, 100); } }
    else if (k === 'perf') { if (s.job) s.job.perf = clamp(s.job.perf + v, 0, 100); }
    else if (k === 'doctor') { for (const d of s.diseases) d.dx = true; }
    else if (k === 'kill') Legacy.die(s, k === 'kill' && v === 'war' ? 'war' : v === 'lightning' ? 'lightning' : 'accident', v === 'war' ? 'war' : v === 'lightning' ? 'lightning' : v, v);
    else if (REL_T[k]) {
      const pool = P.living(s).filter((p) => REL_T[k].includes(p.rel)); if (!pool.length) continue;
      const tgt = k === 'rel_family' ? pool : [pick(s, pool)]; for (const p of tgt) P.adjustBar(p, v);
    }
  }
}
const lines = (j) => (Array.isArray(j) ? j : [j]);
export function resolveCard(s, i) {
  const p = s.pending[0]; if (!p) return null; let res = '';
  if (p.kind === 'bankruptcy') return Bk.resolve(s, i);
  if (p.kind === 'released') return MT.releaseResolve(s, i);
  if (p.kind === 'passion_mastered') return Passions.masteredResolve(s, i);
  if (p.kind === 'hof') return Hon.hofResolve(s, i);
  if (p.kind === 'college') {
    if (i < pendingCard(s).choices.length - 1) { s.school = 'college'; s.college = { yrs: 0 }; s.job = null; Carry.enter(s, 'college'); if (s.sport && s.sport.skill >= D.life.sports.draft.scholarshipSkill) s.sport.scholarship = true; res = 'I enrolled in college.'; }
    else { s.school = null; res = 'I headed into the workforce.'; Carry.drop(s); if (s.sport) SS.quit(s, 'graduated'); }
    s.pending.shift(); log(s, res, 'school'); return { ok: true, msg: res };
  }
  const e = eventById(p.id), c = e.choices[i], scale = D.life.eventScale; s._evPassion = e.if && e.if.passion || null;
  if (c.req && s.cash < c.req) return { ok: false, msg: 'Cannot afford that' };
  const ok = c.p == null || chance(s, c.p), ctx = { ...(p.ctx || {}) };
  if (c.newperson) { const f = P.makeFriend(s); ctx.newfriend = f.name; }
  const hasWin = !!c.win;
  if (hasWin) { applyFx(s, c.fx, scale); if (ok) applyFx(s, c.win, 1); }
  else if (ok) applyFx(s, c.fx, scale); else if (c.fail?.fx) applyFx(s, c.fail.fx, scale);
  const src = ok ? c.journal : (c.fail?.journal || c.journal);
  res = fill(pick(s, lines(src)), ctx);
  if (ok && c.flag) s.flags[c.flag] = 1; if (c.unflag) delete s.flags[c.unflag];
  if (ok && c.chain) { s.chain.push({ id: c.chain.id, due: s.age + rint(s, c.chain.in[0], c.chain.in[1]) }); }
  if (c.perf && s.job) s.job.perf = clamp(s.job.perf + c.perf, 0, 100);
  if (ok && c.retire) { s.job = null; s.retired = true; P.newCoworkers(s); }
  if (c.quit && s.job) { s.job = null; P.newCoworkers(s); }
  if (ok && c.raise && s.job) { s.job.raise = (s.job.raise || 0) + 0.1; Skills.outcome(s, 'raise'); }
  if (c.switchjob && s.job) { const o = ctx && ctx.offer; if (o && o.cur > 0) s.job.raise = (1 + (s.job.raise || 0)) * (o.pay / o.cur) - 1; else s.job.raise = (s.job.raise || 0) + 0.15; P.newCoworkers(s); }
  if (c.joinsport && (c.p == null || ok) && !s.sport) SS.join(s, null, true);
  if (c.sportxp && s.sport && ok) s.sport.skill = clamp(s.sport.skill + c.sportxp, 0, 100);
  if (c.quitsport && s.sport) SS.quit(s, 'left');
  if (s.prison) { if (c.prisonbehavior) s.prison.beh += c.prisonbehavior; if (c.addyears) s.prison.left += c.addyears; }
  s.pending.shift(); s._evPassion = null;
  if (c.crime && s.alive) Crime.fromEvent(s, c.crime, c.p != null ? !ok : null);
  if (ok && e.cat === 'crime' && c.label.startsWith('Hire')) { /* none */ }
  if (e.once) s.flags['once_' + e.id] = 1; s.evLast[e.id] = s.age; s.tally.events++;
  log(s, res, 'event');
  return { ok: true, msg: res, title: e.title, success: ok };
}

// Life-side methods of the UI adapter (ui/ADAPTER contract) implemented on the real engine. Mixed into EngineAdapter (engine_adapter.js).
import * as Pol from './politics.js';
import * as Coach from './coaching.js';
import * as E from './engine.js';
import { D } from './data.js';
import { rnd, rint, pick, chance, clamp, wpick } from './rng.js';
import { log, addStat } from './core.js';
import * as P from './people.js';
import * as Ev from './events.js';
import * as Health from './health.js';
import * as Legacy from './legacy.js';
import * as Crime from './crime.js';
import * as SS from './schoolsports.js';
import * as Sports from './sports.js';
import * as B from './slice_bridge.js';
import * as Premium from './premium.js';
import * as PFx from './premium_fx.js';
import { voice, firstPerson } from './voice.js';
import * as Auto from './autopilot.js';
import * as Ads from './ads.js';
import * as Online from './online.js';
import { rareFor, resolveRare, baseChoices } from './adapter_rewards.js';

const H = B.H;
export const slug = (t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const KIND = { yearly: 'age', school: 'edu', career: 'work', rel: 'relationship', act: 'activity', asset: 'money', biz: 'money', money: 'money', health: 'event', crime: 'event', sport: 'sport', event: 'event', life: 'info', fame: 'event', fight: 'fight', love: 'love', family: 'family' };
export const stageOf = (a) => (a < 2 ? 'Baby' : a < 5 ? 'Toddler' : a < 13 ? 'Child' : a < 18 ? 'Teen' : a < 30 ? 'Young adult' : a < 65 ? 'Adult' : 'Senior');
const G = (g) => (g === 'm' ? 'M' : 'F');
const REL = { mother: 'Mother', father: 'Father', sibling: 'Sibling', friend: 'Friend', spouse: 'Spouse', partner: 'Partner', child: 'Child', ex: 'Ex', coworker: 'Coworker' };
const relLabel = (p) => (p.rel === 'sibling' ? (p.gender === 'm' ? 'Brother' : 'Sister') : p.rel === 'child' ? (p.gender === 'm' ? 'Son' : 'Daughter') : p.rel === 'ex' && p.wasSpouse ? 'Ex-spouse' : REL[p.rel] || p.rel);
const eduLabel = (s) => D.life.educations[s.edu] || 'None';

const GO_MAP = [[/^Accessories/, 'shopping'], [/^Gamble/, 'casino'], [/^Exotic pets/, 'zoo'], [/^Part-time job/, 'parttime'], [/freelance$/i, 'freelance']];
export const life = {
  // ---------- helpers ----------
  entriesSince(n0) {
    const s = this.s, k = Math.min(s.log.length, (s.logSeq || 0) - n0); if (k <= 0) return [];
    return s.log.slice(-k).map((e, i) => ({ id: 'l' + (s.logSeq - k + i), age: Math.floor(e.age), text: e.text, kind: KIND[e.kind] || 'info' }));
  },
  res(ok, message, n0, extra = {}) { return { ok, message: message || '', entries: this.entriesSince(n0), ...extra }; },
  mark() { return this.s.logSeq || 0; },
  // run a slice action: sync state, log the first-person line on success
  sl(fn, kind = 'asset') {
    const n0 = this.mark(), r = B.call(this.s, fn);
    if (r && r.ok && r.msg) log(this.s, voice(r.msg), kind);
    return this.res(!!(r && r.ok), r && r.msg, n0, r && r.ok ? { data: r } : { data: r });
  },
  card() {
    const s = this.s, c = Ev.pendingCard(s); if (!c) return null; const choices = c.choices.map((x) => ({ label: x.label }));
    const rare = c.kind === 'event' ? rareFor(s) : null, A = Ads.ensure(s);
    if (rare) { const p = s.pending[0]; choices.push({ label: rare.label, rare: true, ad: true, locked: !(A.unlockedRare && A.unlockedRare.id === p.id && A.unlockedRare.turn === s.turns), access: Ads.access('rare') }); }
    return { id: c.id || c.kind, title: c.title, prompt: c.text, category: c.cat, choices };
  },
  nextEvent() { const s = this.s; while (s.pending.length && !Ev.pendingCard(s)) s.pending.shift(); return this.card(); },

  // ---------- core ----------
  getState() {
    const s = this.s, sl = s.sl, j = s.job && D.careers.find((c) => c.id === s.job.id), age = Math.floor(s.age);
    const st = s.stats, nw = Legacy.netWorthOf(s);
    const job = j ? { id: s.job.id, title: j.levels[s.job.level][0], employer: sl && sl.job ? (D.sOcc.job_sectors?.find?.((x) => x.id === sl.job.sector)?.name || sl.job.sector || 'Self') : 'Employer', salary: Math.round(E.salaryNow(s)), years: Math.floor(s.job.yrs) } : null;
    const pt = sl && sl.partTime ? { id: sl.partTime.id, title: sl.partTime.title, hourly: sl.partTime.hourly, weeklyHours: sl.partTime.weekly_hours, weeklyPay: sl.partTime.weekly_wage } : null;
    const inS = s.school === 'primary' ? { levelId: 'primary_school', label: 'Primary school', inSchool: true, year: Math.max(1, age - 4), years: 7 } : s.school === 'high' ? { levelId: 'high_school', label: 'High school', inSchool: true, year: Math.max(1, age - 11), years: 6 } : s.school === 'college' ? { levelId: 'university', label: 'University', inSchool: true, year: Math.floor(s.college.yrs) + 1, years: 4 } : sl && sl.edu.inSchool ? { levelId: sl.edu.inSchool.id, label: D.sOcc.education.names[sl.edu.inSchool.id] || sl.edu.inSchool.id, inSchool: true, year: 1, years: sl.edu.inSchool.yearsLeft } : null;
    const education = { ...(inS || { levelId: ['none', 'high_school', 'university', 'graduate_school'][Math.min(3, s.edu)], label: eduLabel(s), inSchool: false, year: 0, years: 0 }), major: sl && sl.edu.inSchool ? sl.edu.inSchool.majorName || null : null };
    const headline = s.prison ? 'Inmate' : job ? job.title : pt ? pt.title : s.pro ? 'Pro athlete' : Pol.headline(s) ? Pol.headline(s) : Coach.headline(s) ? Coach.headline(s) : Online.headline(s) && !s.school ? Online.headline(s) : s.retired ? 'Retired' : s.school ? 'Student' : age < 5 ? stageOf(age) : 'Unemployed';
    return { id: String(s.rs), name: s.name, gender: G(s.gender), age, stage: stageOf(age), alive: s.alive, country: P.country(s).name, city: s.city, stats: { happy: Math.round(st.happiness), health: Math.round(st.health), smarts: Math.round(st.smarts), looks: Math.round(st.looks), fame: Math.round(st.fame) },
      hidden: { karma: Math.round(st.karma), craziness: Math.round(st.crazy), stress: Math.round(st.stress) }, cash: Math.round(s.cash), netWorth: Math.round(nw.total), job, partTime: pt, education, headline, year: s.birthYear + age, prison: !!s.prison, avatar: { pid: 'me', seed: s.rs, gender: G(s.gender).toLowerCase(), age, ...(s.school ? { outfit: 'student' } : s.job ? { outfit: ({ doctor: 'surgeon', teacher: 'teacher', police: 'police', chef: 'chef', lawyer: 'lawyer', pilot: 'pilot', scientist: 'scientist', actor: 'actor', artist: 'artist' })[s.job.id] } : {}) },
      auto: Auto.unlocked() && !!(s.auto && s.auto.on), premium: { subscribed: Premium.subscribed(), unlocked: Premium.passes().filter((p) => Premium.isUnlocked(p.id)).map((p) => p.id) } };
  },
  getJournal() { return this.entriesSince(0 - 1e9).map((e) => e); },
  async age(opts = {}) {
    const s = this.s; if (!s.alive) return { state: this.getState(), entries: [], event: null, died: true, death: this.getDeathSummary() };
    const n0 = this.mark(); let pre = null, auto = null;
    if (!s.pending.length) {
      // Autopilot (premium): routines run first, with the same costs/effects as manual actions, then the year passes
      const A = Auto.ensure(s), useAuto = Auto.unlocked() && (opts.routines || (A.on && !opts.noAuto));
      if (useAuto) pre = await Auto.playYear(this, { routines: opts.routines, floor: opts.floor });
      s.step = 1;
      if (s.league.finals && !s.league.finals.done) Sports.finalsAuto(s);
      E.takeTurn(s); if (s.alive) Ads.yearPassed(s);
      if (pre) { auto = Auto.summarize(s, pre, null, pre.floor); A.last = auto; log(s, auto.line + (auto.spent ? ` Spent ${'$' + auto.spent.toLocaleString('en-US')}.` : ''), 'act'); }
    }
    const event = s.alive ? this.nextEvent() : null;
    return { state: this.getState(), entries: this.entriesSince(n0), event, died: !s.alive, death: s.alive ? undefined : this.getDeathSummary(), blocked: !!(s.pending.length && !event), auto, adPrompt: opts.skip ? null : (s.alive && !event ? this.getAdPrompt() : null) };
  },
  resolveEvent(eventId, i) {
    const s = this.s, n0 = this.mark(); if (!s.pending.length) return { ok: false, state: this.getState(), entries: [], event: null, message: 'Nothing pending.' };
    const p0 = s.pending[0], r = p0 && p0.adRare && i === baseChoices(s) ? resolveRare(s) : Ev.resolveCard(s, i);
    return { ok: !!(r && r.ok), state: this.getState(), entries: this.entriesSince(n0), event: s.alive ? this.nextEvent() : null, message: r ? r.msg : '', died: !s.alive, death: s.alive ? undefined : this.getDeathSummary() };
  },
  newLife(o = {}) { this.s = E.newGame({ name: o.name || null, seed: o.seed }); this.ensureSeen(); if (o.gender) { /* gender is generated with the name pool */ } return this.getState(); },
  getDeathSummary() { const s = this.s, e = s.ending; if (!e) return null; return { name: s.name, age: e.age, cause: e.cause, netWorth: Math.round(e.netWorth.total), headline: e.job === 'none' ? 'None' : e.job, ribbon: e.ribbon ? e.ribbon.name : null, obituary: e.obituary, epitaph: e.tombstone && e.tombstone.epitaph, born: e.tombstone && e.tombstone.born, died: e.tombstone && e.tombstone.died, ribbonIcon: e.ribbon && e.ribbon.icon, canContinue: Legacy.canContinue(s), creatorUsed: !!e.creatorUsed, gender: G(s.gender), heirs: (e.heirs || []).map((h) => ({ id: h.id, name: h.name, age: Math.floor(h.age) })) }; },

  // ---------- occupation ----------
  getOccupationMenu() { const age = Math.floor(this.s.age); return this.cfg.occupationMenu.map((m) => ({ ...m, locked: age < m.minAge, lockReason: age < m.minAge ? `Unlocks at age ${m.minAge}` : '' })); },
  getEducation() {
    const s = this.s, sl = B.pull(s), d = B.sliceData(), cur = this.getState().education, done = [];
    if (s.edu >= 1) done.push('high_school'); for (const k of Object.keys(sl.edu.degrees)) done.push(k);
    const sch = H.listSchools(d, sl), prem = Premium.isUnlocked('einstein');
    return { current: { ...cur, gpa: (clamp(s.stats.smarts, 0, 100) / 25).toFixed(1) }, completed: done, stage: stageOf(Math.floor(s.age)), einstein: prem, majors: d.occ.education.majors.map((m) => m.name),
      options: sch.map((o) => ({ id: o.id, label: o.name, years: o.years, notes: o.desc, eligible: !!o.eligible && !o.inProgress && !o.done, reason: o.done ? 'Already completed' : o.inProgress ? 'In progress' : (o.reasons || []).join(' · '), needsMajor: !!o.major, premiumInstant: { pass: 'einstein', unlocked: prem } })) };
  },
  enroll({ levelId, major }) {
    const mj = major ? D.sOcc.education.majors.find((m) => m.name === major) : null; const r = this.sl((d, sl) => H.enroll(d, sl, levelId, mj ? mj.id : undefined), 'school'); if (r.ok) { const sc = D.sOcc.education.schools.find((x) => x.id === levelId); const c = sc && E.Scholar.creditSlice(this.s, levelId, sc.tuition); if (c) { r.message += ` Scholarships refunded ${c.toLocaleString('en-US')}.`; } } return r;
  },
  instantDegree({ levelId, major }) { const n0 = this.mark(), r = PFx.instantDegree(this.s, levelId, major); return this.res(r.ok, r.msg, n0); },
  dropOut() { return this.sl((d, sl) => H.dropOut(d, sl), 'school'); },
  getJobs({ group = 'jobs', sector } = {}) {
    const s = this.s, sl = B.pull(s), d = B.sliceData(), cur = this.getState().job, age = Math.floor(s.age), occ = d.occ;
    const labels = this.cfg.sectorLabels || {}, mk = (x) => { const jd = occ.jobs[x.id]; return { id: x.id, title: x.title, sector: x.sector, salary: x.wage, educationReq: jd && jd.req ? jd.req.edu : 'none', promotesTo: jd && jd.next && occ.jobs[jd.next] ? occ.jobs[jd.next].title : null, eligible: !!x.eligible, reason: (x.reasons || []).join(' · ') }; };
    if (group === 'jobs') {
      const secs = H.listCareers(d, sl).filter((x) => !sector || x.id === sector);
      const groups = secs.map((x) => ({ id: x.id, label: labels[x.id] || x.name, jobs: H.listCareers(d, sl, { sector: x.id }).filter((j) => sector || j.level === 0 || j.current).map(mk) }));
      return { current: cur, age, groups };
    }
    if (group === 'military') {
      const groups = H.listMilitary(d, sl).map((b) => ({ id: b.id, label: b.name, jobs: [{ id: 'mil:' + b.id, title: 'Enlist: ' + b.name, sector: 'military', salary: b.ranks[0].wage, educationReq: b.req.edu, promotesTo: b.ranks[1] && b.ranks[1].title, eligible: b.eligible !== false, reason: (b.reasons || []).join(' · ') || b.desc }, ...b.ranks.slice(1).map((r) => ({ id: 'rank:' + b.id + r.title, title: r.title, sector: 'military', salary: r.wage, educationReq: '-', promotesTo: null, eligible: false, reason: 'Earned by promotion' }))] })).filter((g) => !sector || g.id === sector);
      return { current: cur, age, groups };
    }
    const groups = H.listSpecial(d, sl).map((x) => ({ id: x.id, label: x.name, jobs: x.steps.map((st, i) => ({ id: i === 0 ? 'sp:' + x.id : 'step:' + st.id, title: st.title, sector: 'special', salary: st.wage, educationReq: '-', promotesTo: x.steps[i + 1] && x.steps[i + 1].title, eligible: i === 0 && x.eligible !== false, reason: i === 0 ? (x.reasons || []).join(' · ') || x.desc : 'Earned by promotion' })) })).filter((g) => !sector || g.id === sector);
    return { current: cur, age, groups };
  },
  applyJob(id) {
    if (id.startsWith('mil:')) return this.sl((d, sl) => H.enlist(d, sl, id.slice(4)), 'career');
    if (id.startsWith('sp:')) return this.sl((d, sl) => H.joinSpecial(d, sl, id.slice(3)), 'career');
    { const s = this.s, n0 = this.mark(), p = Math.min(0.97, 0.78 + E.Skills.interviewBonus(s)); E.Skills.outcome(s, 'interview');
      if (!chance(s, p) && !this.opts.noInterview) { log(s, 'I interviewed for a job but did not get it.', 'career'); return this.res(false, 'The interview did not go well. Try again or build your people skills.', n0); } }
    return this.sl((d, sl) => H.applyJob(d, sl, id), 'career');
  },
  quitJob() { return this.sl((d, sl) => H.quitJob(d, sl), 'career'); },
  getFreelanceGigs() { const sl = B.pull(this.s); return { gigs: H.listFreelance(B.sliceData(), sl).map((g) => ({ id: g.id, label: g.title, minAge: g.min_age, minHourly: g.min_hourly, maxHourly: g.max_hourly, maxPerYear: g.max_per_year, doneThisYear: g.done, eligible: !!g.eligible, reason: (g.reasons || []).join(' · ') })) }; },
  doGig(id) { return this.sl((d, sl) => H.doGig(d, sl, id), 'money'); },
  getPartTimeJobs() { const sl = B.pull(this.s), st = this.getState(); return { current: st.partTime, jobs: H.listPartTime(B.sliceData(), sl).map((j) => ({ id: j.id, title: j.title, hourly: j.hourly, weeklyHours: j.weekly_hours, weeklyPay: j.weekly_wage, minAge: j.min_age, eligible: !!j.eligible, reason: (j.reasons || []).join(' · ') })) }; },
  applyPartTime(id) { return this.sl((d, sl) => H.applyPartTime(d, sl, id), 'career'); },
  quitPartTime() { return this.sl((d, sl) => H.quitPartTime(d, sl), 'career'); },
  getFight() { const s = this.s, age = Math.floor(s.age), r = s.fightRec || { wins: 0, losses: 0 }; return { record: r, health: Math.round(s.stats.health), rivals: this.cfg.fightRivals.map((x) => ({ ...x, eligible: age >= x.minAge && !s.prison, reason: age < x.minAge ? `Unlocks at age ${x.minAge}` : s.prison ? 'In prison' : '' })) }; },
  fight(id) {
    const s = this.s, n0 = this.mark(), r = this.cfg.fightRivals.find((x) => x.id === id); if (!r) return this.res(false, 'Unknown rival', n0);
    s.fightRec = s.fightRec || { wins: 0, losses: 0 }; const p = clamp(0.55 + (s.stats.health - 50) / 200 + (s.fit || 0) * 0.03 - r.level * 0.09, 0.08, 0.9), won = chance(s, p);
    if (won) { s.fightRec.wins++; addStat(s, 'happiness', 4); addStat(s, 'fame', r.level); addStat(s, 'karma', -2); log(s, `I fought the ${r.name.toLowerCase()} and won. My knuckles had notes.`, 'fight'); }
    else { s.fightRec.losses++; addStat(s, 'health', -4 * r.level); addStat(s, 'happiness', -4); log(s, `I fought the ${r.name.toLowerCase()} and lost. The ground was very honest with me.`, 'fight'); }
    s.tally.fights = (s.tally.fights || 0) + 1; return this.res(true, won ? 'You won the fight!' : 'You lost the fight.', n0, { won });
  },
  getCareerCollections() {
    const sl = B.pull(this.s), d = B.sliceData(), rows = H.listCollection(d, sl);
    return { collectedCount: rows.collectedCount, collections: rows.map((r) => ({ career: r.name, educationReq: r.edu_text, otherReqs: r.other || '', requiredYears: r.years, yearsWorked: r.progress, collected: r.collected, collectible: false })) };
  },
  collectCareer() { return { ok: false, message: 'Careers are collected automatically after the required years.', entries: [] }; },

  // ---------- sports career ----------
  getSportsCareer() {
    const s = this.s, age = Math.floor(s.age), cfg = this.cfg.sports, cur = s.pro ? 'pro' : s.sport ? (s.sport.level === 'college' ? 'college' : 'school') : null;
    const defs = D.life.sports.list; const eligibleSports = cfg.schoolSports.filter((x) => defs.some((d) => d.id === x.id)).map((x) => { const ok = SS.canJoin(s) && age >= x.minAge; return { ...x, eligible: ok, reason: ok ? '' : age < x.minAge ? `Unlocks at age ${x.minAge}` : 'Not available right now' }; });
    let current = null;
    if (s.sport || s.pro) {
      const sp = s.sport, def = SS.sportDef(sp ? sp.id : 'basketball'), pl = SS.proPlayer(s), prow = pl ? SS.proSeasonLine(s) : null;
      const seasons = (sp ? sp.seasons : s.pro.seasons || []).map((x) => ({ year: s.birthYear + x.age, label: SS.levelLabel(x.level), wins: x.w, losses: x.l, team: x.team }));
      const actions = [];
      if (s.pro) { actions.push({ id: 'negotiate', label: 'Negotiate contract', sub: 'Ask for a raise' }, { id: 'retire', label: 'Retire', sub: 'Hang up the jersey' }); }
      else { actions.push({ id: 'train', label: 'Train hard', sub: '+skill this season' }); if (sp.level === 'high' && age >= 16) actions.push({ id: 'apply_college', label: 'Apply to college teams', sub: 'Scouts watch' }); if (sp.level === 'college' && SS.sportDef(sp.id).pro && sp.skill >= D.life.sports.draft.minSkill) actions.push({ id: 'declare_draft', label: 'Declare for the draft', sub: 'Go pro early' }); actions.push({ id: 'retire', label: 'Quit the team', sub: '' }); }
      if (!s.pro) actions.push({ id: 'baller_draft', label: 'Instant draft pick', sub: Premium.isUnlocked('baller') ? 'Baller pass: skip to the pros' : 'Premium: Baller pass', premium: 'baller', locked: !Premium.isUnlocked('baller') });
      current = { sportId: def.id, label: def.name, icon: def.icon, position: sp ? sp.position || '' : 'Pro', stage: cur, team: sp ? sp.team : prow ? prow.team : '', skill: Math.round(sp ? sp.skill : prow ? prow.ovr : 50), fitness: Math.round(clamp((s.fit || 0) * 20 + s.stats.health / 2, 0, 100)), seasons, offers: sp && sp.offered ? ['College scouts are interested'] : [], carried: sp && sp.carried ? 'Moved up with you from your last school. No tryout needed.' : '', draft: s.pro ? { round: s.pro.round, pick: s.pro.pick, team: s.league.teams[s.pro.team].name } : null, proLeague: 'Pro League', salary: prow ? prow.salary : 0, actions };
    } else if (age >= 14) { current = null; }
    const out = { age, eligibleSports, stages: cfg.stages, current };
    if (!current) out.premiumActions = [{ id: 'baller_draft', label: 'Instant draft pick', premium: 'baller', locked: !Premium.isUnlocked('baller') }];
    return out;
  },
  joinSport({ sportId, position }) { const n0 = this.mark(), ok = SS.join(this.s, sportId); if (ok && this.s.sport) this.s.sport.position = position; return this.res(ok, ok ? 'You joined the team.' : 'Not available.', n0); },
  sportsAction(id) {
    const s = this.s, n0 = this.mark();
    if (id === 'baller_draft') { const r = PFx.ballerDraft(s); return this.res(r.ok, r.msg, n0); }
    if (id === 'train') { if (!s.sport || s.acted.sporttrain) return this.res(false, 'Already trained this year.', n0); s.acted.sporttrain = 1; s.sport.skill = clamp(s.sport.skill + rint(s, 2, 5), 0, 100); s.fit = Math.min(5, (s.fit || 0) + 1); log(s, 'I trained until my legs filed a complaint.', 'sport'); return this.res(true, 'Skill improved.', n0); }
    if (id === 'apply_college') { if (!s.sport) return this.res(false, '', n0); s.sport.offered = true; log(s, 'I sent tapes to college coaches. A few of them replied.', 'sport'); return this.res(true, 'Scouts are interested.', n0); }
    if (id === 'declare_draft') { if (!s.sport) return this.res(false, '', n0); const r = SS.draft(s); if (r) { s.sport = null; return this.res(true, 'You were drafted!', n0); } return this.res(false, 'Nobody wanted to draft you.', n0); }
    if (id === 'negotiate') { const p = SS.proPlayer(s); if (!p || s.acted.negotiate) return this.res(false, 'Already negotiated this year.', n0); s.acted.negotiate = 1; const ok = chance(s, 0.55); if (ok) { p.sal = Math.round(p.sal * 1.12); log(s, 'I negotiated a raise with a very small speech.', 'sport'); } else log(s, 'I asked for a raise. The front office laughed politely.', 'sport'); return this.res(ok, ok ? 'Raise granted.' : 'They said no.', n0); }
    if (id === 'retire') { if (s.pro) { const t = s.league.teams[s.pro.team], i = t ? t.roster.findIndex((p) => p.id === s.pro.pid) : -1; if (i >= 0) t.roster.splice(i, 1); s.pro = null; s.flags.ex_pro = 1; log(s, 'I retired from pro sports. My knees sent a thank-you card.', 'sport'); } else SS.quit(s, 'left'); return this.res(true, 'Retired.', n0); }
    return this.res(false, 'Unknown action.', n0);
  },

  // ---------- relationships ----------
  person(p, extra = {}) {
    const group = p.rel === 'mother' || p.rel === 'father' || p.rel === 'sibling' ? 'family' : p.rel === 'spouse' || p.rel === 'partner' ? 'partner' : p.rel === 'child' ? 'child' : p.rel === 'ex' ? 'ex' : 'friend';
    return { id: p.id, name: p.name, relation: relLabel(p), gender: G(p.gender), age: Math.floor(p.age), alive: p.alive, group, bars: { relationship: Math.round(p.bar), health: Math.round(p.health ?? 70) }, deathAge: p.alive ? undefined : Math.floor(p.diedAt ?? p.age), deathYear: p.alive ? undefined : this.s.birthYear + Math.floor(p.diedAt ?? p.age), cause: p.cause, avatar: { pid: p.id, seed: p.id, gender: G(p.gender).toLowerCase(), age: Math.floor(p.age) }, ...extra };
  },
  getRelationships() {
    const s = this.s, L = P.living(s), pr = (x) => this.person(x), rel = (r) => L.filter((p) => p.rel === r);
    return { family: [...rel('mother'), ...rel('father'), ...rel('sibling')].map(pr), partner: [...rel('spouse'), ...rel('partner')].map(pr)[0] || null, children: rel('child').map(pr), friends: [...rel('friend'), ...rel('coworker')].map(pr), exes: rel('ex').map(pr), late: s.people.filter((p) => !p.alive).map(pr),
      canHaveChild: s.age >= 16 && (!!P.partnerOf(s) || Premium.isUnlocked('rabbit')), premium: { rabbit: Premium.isUnlocked('rabbit') } };
  },
  getRelationshipActions(pid) {
    const s = this.s, p = P.byId(s, pid), out = p && p.alive ? P.interactionsFor(s, p).map((a) => ({ id: a.id, label: a.label + (a.cost ? ` ($${a.cost})` : '') })) : [];
    if (p && p.alive) out.push({ id: 'premium_kill', label: 'Kill (Golden Gun)', premium: 'golden_gun', locked: !Premium.isUnlocked('golden_gun') });
    return out;
  },
  interact(pid, aid) {
    const n0 = this.mark();
    if (aid === 'premium_kill') { const r = PFx.kill(this.s, pid); return this.res(r.ok, r.msg, n0); }
    const r = P.interact(this.s, pid, aid); if (r.ok) E.Skills.use(this.s, 'empathy', 0.6), E.Skills.use(this.s, 'people', 0.6); return this.res(!!r.ok, r.msg, n0);
  },
  findPartner() {
    const s = this.s, n0 = this.mark(); if (P.partnerOf(s)) return this.res(false, 'You already have a partner.', n0); if (s.age < D.life.dating.minAge) return this.res(false, `Dating starts at age ${D.life.dating.minAge}.`, n0);
    if (!s.cand.length) P.refreshCandidates(s); if (!s.cand.length) return this.res(false, 'Nobody around.', n0);
    const r = P.dateCandidate(s, 0); return this.res(!!r.ok, r.msg, n0);
  },
  haveChild() {
    const s = this.s, n0 = this.mark();
    if (Premium.isUnlocked('rabbit')) { const r = PFx.rabbitChildren(s); return this.res(true, r.msg, n0); }
    const pr = P.partnerOf(s); if (!pr) return this.res(false, 'You need a partner first.', n0);
    const a = P.interactionsFor(s, pr).find((x) => x.special === 'baby'); if (!a) return this.res(false, 'Not possible right now.', n0);
    const r = P.interact(s, pr.id, a.id); return this.res(!!r.ok, r.msg, n0);
  },

  // ---------- activities / will / surrender ----------
  worldActs() { return D.worldActs.categories; },
  getActivities() {
    const s = this.s, age = Math.floor(s.age), menus = [], icons = this.cfg.activityIcons || {};
    const prem = Premium.isUnlocked('golden_gun');
    if (s.prison) menus.push({ id: 'prison', label: 'Prison', icon: '⛓️', items: [['behave', 'Behave'], ['parole', 'Ask for parole'], ['escape', 'Attempt escape'], ['appeal', 'File an appeal']].map(([id, label]) => ({ id: 'prison:' + id, label, minAge: 0, tag: '', locked: false, special: null })) });
    const seen = new Set();
    for (const c of this.worldActs()) {
      const items = c.activities.map((a) => { seen.add(a.name.toLowerCase()); return { id: 'w:' + a.id, label: a.name, minAge: a.minAge || 0, tag: '', locked: age < (a.minAge || 0) || (a.needsJob && !s.job), reason: age < (a.minAge || 0) ? `Unlocks at age ${a.minAge}` : a.needsJob && !s.job ? 'Needs a job' : '', special: null, hasChoices: true, sub: a.sub }; });
      menus.push({ id: c.id, label: c.name, icon: c.icon, items });
    }
    menus.push({ id: 'crime', label: 'Crime', icon: '🔪', items: [...Crime.available(s).map((c) => ({ id: 'crime:' + c.id, label: c.name, minAge: c.minAge, tag: '', locked: false })), { id: 'premium:stranger', label: 'Kill a stranger (Golden Gun)', minAge: 0, tag: '', locked: !prem, reason: 'Premium: Golden Gun', premium: 'golden_gun' }] });
    const lic = B.sliceData().assets.licenses || [];
    if (lic.length) menus.push({ id: 'licenses', label: 'Licenses', icon: '🪪', items: lic.map((l) => ({ id: 'license:' + l.id, label: l.name, minAge: l.min_age || 16, tag: '', locked: age < (l.min_age || 16), reason: `Unlocks at age ${l.min_age || 16}` })) });
    const more = {}, skip = /^(Crime|Hire hitman|Buy assets|Doctor|Emergency|Driver)/;
    for (const r of this.research) { const top = r.menu.split('/')[0], sp = /^Will/.test(r.activity) ? 'will' : /^Surrender/.test(r.activity) ? 'surrender' : null; if (skip.test(r.activity) && !sp) continue; if (seen.has(r.activity.toLowerCase())) continue; (more[top] = more[top] || []).push({ id: 'r:' + slug(r.activity), label: r.activity, minAge: r.min_age, tag: '', locked: age < r.min_age, reason: age < r.min_age ? `Unlocks at age ${r.min_age}` : '', special: sp, go: GO_MAP.find(([re]) => re.test(r.activity))?.[1] || null }); }
    const mic = this.cfg.activityMenus; for (const k of Object.keys(more)) menus.push({ id: slug(k), label: k, icon: (icons[k] || '✨'), items: more[k] });
    void mic; return { age, menus };
  },
  getActivityChoices(id) { const a = this.findWorld(id.replace(/^w:/, '')); if (!a) return null; return { title: a.name, choices: a.choices.map((c) => ({ label: c.label, cost: c.cost || 0, affordable: this.s.cash >= (c.cost || 0) })) }; },
  findWorld(id) { for (const c of this.worldActs()) { const a = c.activities.find((x) => x.id === id); if (a) return a; } return null; },
  doActivity(id, choice = 0) {
    const s = this.s, n0 = this.mark(), age = Math.floor(s.age); { const lab = (this.findWorld(id.replace(/^w:/, '')) || {}).name || (this.research.find((x) => 'r:' + slug(x.activity) === id) || {}).activity || id.replace(/^\w+:/, ''); if (!id.startsWith('prison:')) E.Skills.fromActivity(s, lab); }
    if (id.startsWith('w:')) {
      const a = this.findWorld(id.slice(2)); if (!a) return this.res(false, 'Unknown activity.', n0);
      if (s.acted[id]) return this.res(false, 'Already did that this year.', n0); if (age < (a.minAge || 0) || s.prison) return this.res(false, 'Not available.', n0); if (a.needsJob && !s.job) return this.res(false, 'Needs a job.', n0);
      const c = a.choices[choice] || a.choices[0]; if (c.cost && s.cash < c.cost) return this.res(false, 'Cannot afford that.', n0);
      if (c.cost) s.cash -= c.cost; s.acted[id] = 1;
      if (a.id === 'doctor' && choice === 0) { const r = Health.doctorVisit(s); return this.res(!!r.ok, r.msg, n0); }
      const o = wpick(s, c.outcomes, (x) => x.w); this.applyWorldFx(o);
      const line = firstPerson(o.text); log(s, line, 'act'); return this.res(true, line, n0);
    }
    if (id.startsWith('crime:')) { const r = Crime.commit(s, id.slice(6)); return this.res(!!(r && r.ok !== false), r && r.msg || 'Done.', n0); }
    if (id === 'premium:stranger') { const r = PFx.killStranger(s); return this.res(r.ok, r.msg, n0); }
    if (id.startsWith('prison:')) { const f = Crime[id.slice(7)], r = f ? f(s) : null; return this.res(!!(r && r.ok !== false), r && r.msg || 'Done.', n0); }
    if (id.startsWith('license:')) return this.sl((d, sl) => H.getLicense(d, sl, id.slice(8)), 'money');
    if (id.startsWith('r:')) {
      const r = this.research.find((x) => 'r:' + slug(x.activity) === id); if (!r) return this.res(false, 'Unknown activity.', n0); if (age < r.min_age) return this.res(false, `Unlocks at age ${r.min_age}.`, n0);
      if (s.acted[id]) return this.res(false, 'Already did that this year.', n0); s.acted[id] = 1;
      const fx = this.cfg.activityEffects[r.menu.split('/')[0]] || {}; for (const [k, v] of Object.entries(fx)) addStat(s, k === 'happy' ? 'happiness' : k, v);
      const line = `I spent some time on this: ${r.activity.toLowerCase()}.`; log(s, line, 'act'); return this.res(true, line, n0);
    }
    return this.res(false, 'Unknown activity.', n0);
  },
  applyWorldFx(o) {
    const s = this.s, fx = o.fx || {};
    for (const [k, v] of Object.entries(fx)) { if (k === 'money') s.cash += v; else addStat(s, k, v); }
    if (o.rel) { const targets = P.living(s).filter((p) => p.rel !== 'ex'); const d = o.rel.all ?? o.rel.random ?? 0; if (o.rel.all != null) targets.forEach((p) => P.adjustBar(p, d)); else if (targets.length) P.adjustBar(pick(s, targets), d); }
    if (o.flag) s.flags[o.flag] = 1;
  },
  getWill() {
    const s = this.s, w = s.will || {}, sh = w.shares || null, age = Math.floor(s.age), kin = P.living(s).filter((p) => Legacy.KIN.has(p.rel));
    const dh = Legacy.defaultHeirs(s); const dflt = (p) => (sh ? sh[p.id] || 0 : dh.includes(p) ? Math.floor(100 / dh.length) : 0);
    return { estateValue: Math.round(Legacy.netWorthOf(s).total), locked: age < 18, minAge: 18, executed: !s.alive, charityId: w.charityId || null, charityPct: w.charityPct || 0, charities: D.worldLegacy.charities, taxRate: Premium.isUnlocked('tax_evasion') ? 0 : D.life.estate.rate, beneficiaries: kin.map((p) => ({ personId: p.id, name: p.name, relation: relLabel(p), percent: dflt(p), kid: p.rel === 'child' })) };
  },
  saveWill(list, charity) {
    const n0 = this.mark(), tot = list.reduce((a, x) => a + (x.percent || 0), 0), ch = charity && charity.pct ? charity.pct : 0;
    if (tot + ch > 100) return this.res(false, 'The shares add up to more than 100%.', n0);
    Legacy.setWill(this.s, 'shares', null, Object.fromEntries(list.filter((x) => x.percent > 0).map((x) => [x.personId, x.percent])), charity && charity.id ? { id: charity.id, pct: ch } : null);
    log(this.s, 'I wrote my will and hid it somewhere dramatic.', 'life'); return this.res(true, 'Will saved. Unallocated shares go to the state/charity.', n0);
  },
  surrender() { const n0 = this.mark(); Legacy.surrender(this.s); return { ...this.res(true, 'You surrendered.', n0), died: true, death: this.getDeathSummary(), state: this.getState() }; },

  // ---------- profile / legacy / cemetery ----------
  getProfile() {
    const s = this.s, st = this.getState(), prof = P.myProfile(s), partner = P.partnerOf(s), meta = Legacy.metaGet(), earned = new Set(Object.keys(meta.ribbons || {}));
    const sl = s.sl; if (s.ending && s.ending.ribbon) earned.add(s.ending.ribbon.id);
    return { ...st, born: s.birthYear, edu: eduLabel(s), traits: [], addictions: [], diseases: s.diseases.map((d) => (Health.diseaseDef(d.id) || {}).name || d.id), license: !!(sl && sl.licenses.includes('drivers')) || !!(sl && sl.licenses.length), partner: partner ? partner.name : null,
      childrenCount: prof.children, assetsCount: s.assets.length + B.assetCount(s), ribbons: D.ribbons.map((r) => ({ ribbon: r.name, id: r.id, icon: r.icon, condition: r.desc, earned: earned.has(r.id), locked: !!r.locked })), lifetimeGambling: sl ? sl.casino.net : 0, careersCollected: sl ? sl.collected.length : 0,
      sport: s.pro ? 'Pro' : s.sport ? s.sport.id : null, avatar: { seed: s.rs, gender: G(s.gender).toLowerCase(), age: st.age }, country: P.country(s).name, hiddenStats: st.hidden };
  },
  getLegacy() {
    const s = this.s, sum = Legacy.legacySummary(s), heirs = s.alive ? [] : Legacy.heirsOf(s);
    return { surname: s.last, creatorUsed: sum.creatorUsed, rankingEligible: sum.rankingEligible, totalWealth: sum.wealth, canContinue: Legacy.canContinue(s), livingHeirs: heirs.map((h) => ({ id: h.id, name: h.name, age: Math.floor(h.age), relation: relLabel(h) })), over: sum.over, years: sum.years,
      generations: sum.gens.map((g) => ({ gen: g.gen, name: g.name, born: g.born, died: g.current ? null : g.died, cause: g.cause, netWorth: g.nw, job: g.job, ribbon: g.ribbonName || null, creator: !!g.creator, current: !!g.current, gender: G(g.gender || 'm') })),
      estate: s.alive ? null : (() => { const p = Legacy.computeEstate(s); return { gross: p.gross, tax: p.tax, net: p.net, heirs: p.heirs.map((h) => ({ id: h.id, name: h.name, age: h.age, relation: h.rel, cash: Math.round(h.cash), assets: h.assets.length, biz: h.biz.length, auctioned: Math.round(h.auctioned), trust: h.trust })) }; })() };
  },
  getFamilyTree() {
    const s = this.s, people = {}, unions = [], me = 'me';
    const add = (id, p, label) => { people[id] = { name: p.name, gender: G(p.gender).toLowerCase(), age: Math.floor(p.age), alive: p.alive !== false, label, avatar: { pid: p.id || 0, seed: p.id || 0, gender: G(p.gender).toLowerCase(), age: Math.floor(p.age) } }; };
    add(me, { name: s.name, gender: s.gender, age: s.age, alive: s.alive, id: s.rs }, 'You');
    const mo = s.people.find((p) => p.rel === 'mother'), fa = s.people.find((p) => p.rel === 'father'); if (mo) add('p' + mo.id, mo, 'Mother'); if (fa) add('p' + fa.id, fa, 'Father');
    const sibs = s.people.filter((p) => p.rel === 'sibling'); sibs.forEach((p) => add('p' + p.id, p, relLabel(p)));
    if (mo || fa) unions.push({ partners: [fa && 'p' + fa.id, mo && 'p' + mo.id].filter(Boolean), children: [me, ...sibs.map((p) => 'p' + p.id)] });
    const sp = P.partnerOf(s) || s.people.find((p) => p.rel === 'ex' && p.wasSpouse); if (sp) add('p' + sp.id, sp, relLabel(sp));
    const kids = s.people.filter((p) => p.rel === 'child'); kids.forEach((p) => add('p' + p.id, p, relLabel(p)));
    if (kids.length || sp) unions.push({ partners: [me, sp && 'p' + sp.id].filter(Boolean), children: kids.map((p) => 'p' + p.id) });
    return { people, unions, root: mo || fa ? ('p' + (fa || mo).id) : me };
  },
  continueAsHeir(pid) { const n0 = this.mark(), ok = Legacy.continueAs(this.s, pid); return this.res(ok, ok ? 'You continue the family line.' : 'Cannot continue.', n0, { reload: false }); },
  getCemetery() { const m = Legacy.metaGet(); return { graves: m.graves.map((g) => ({ name: g.name, born: g.born, died: g.died, age: g.age, cause: g.cause, ribbon: (D.ribbons.find((r) => r.id === g.ribbon) || {}).name, nw: g.nw, gen: g.gen, creator: !!g.creator, style: ['classic', 'round', 'cross', 'obelisk'][(g.gen || 0) % 4] })), lives: m.lives, bestNW: m.bestNW, longest: m.longest }; },
};

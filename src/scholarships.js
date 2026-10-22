// Scholarships (data/scholarships.json): apply near the end of high school (college) and before grad school. Requirements come from grades (GPA),
// clubs/teams, service hours, awards, talent and skills; kinds: academic / athletic / arts / need / service / talent. A passion unlocks extra awards.
// Tuition effect: college tuition is scaled by (1 - pct); slice schools (community college, university, graduate schools) are refunded pct of tuition.
import { fmtMoney } from './fmt.js';
import { D } from './data.js';
import { clamp, chance, rint, gauss, pick as rpick } from './rng.js';
import { log, addStat } from './core.js';
import * as Skills from './skills.js';
import * as Passions from './passions.js';
import * as P from './people.js';

const SD = () => D.scholarData;
export const ensure = (s) => { if (!s.sch) s.sch = { clubs: [], clubYears: {}, service: 0, gpa: [], active: [], applied: {}, serviceYear: -1 }; if (!s.sch.renewed) s.sch.renewed = {}; if (!s.awards) s.awards = []; return s.sch; };
export function gpa(s) { const h = ensure(s).gpa.slice(-4); return Math.round((h.length ? h.reduce((a, b) => a + b, 0) / h.length : clamp(s.stats.smarts / 25, 0, 4)) * 100) / 100; }
export const clubCount = (s) => ensure(s).clubs.length;
const isGrad = (id) => { const sc = D.sOcc.education.schools.find((x) => x.id === id); return !!sc && sc.requires === 'university'; };
// level of the school you are enrolled in right now ('college' | 'grad' | null). While enrolled you apply for NEW awards each year and renew the ones you hold.
export function enrolled(s) {
  if (s.prison) return null; if (s.school === 'college') return 'college';
  const sl = s.sl && s.sl.edu && s.sl.edu.inSchool; return sl ? (isGrad(sl.id) ? 'grad' : 'college') : null;
}
export const studyYearsLeft = (s) => { if (s.school === 'college' && s.college) return Math.max(1, 4 - Math.floor(s.college.yrs + 1e-9)); const sl = s.sl && s.sl.edu && s.sl.edu.inSchool; return sl ? Math.max(1, sl.yearsLeft || 1) : 0; };
export function window(s) {
  const age = Math.floor(s.age), W = SD().windows, inSlice = s.sl && s.sl.edu && s.sl.edu.inSchool;
  if (s.school === 'college' || inSlice || s.prison) return null;
  if ((s.school === 'high' && age >= W.high.minAge) || (s.school === null && s.edu === 1 && age <= W.high.maxAge + 2 && !s.sl?.edu?.degrees?.university && !s.collegeDone)) return 'college';
  if (s.edu >= 2 && age >= W.grad.minAge) return 'grad';
  return null;
}
function unmet(s, t) {
  const r = t.req, out = [], sch = ensure(s);
  if (r.gpa && gpa(s) < r.gpa) out.push(`GPA ${r.gpa} (you ${gpa(s)})`);
  if (r.clubs && sch.clubs.length < r.clubs) out.push(`${r.clubs} club(s)`);
  if (r.anyClub && !sch.clubs.some((c) => r.anyClub.includes(c))) out.push('a club: ' + r.anyClub.join('/'));
  if (r.service && sch.service < r.service) out.push(`${r.service} service hours (you ${Math.round(sch.service)})`);
  if (r.awards && s.awards.length < r.awards) out.push(`${r.awards} award(s) (you ${s.awards.length})`);
  if (r.sportSkill && !(s.sport && s.sport.skill >= r.sportSkill) && !(s.pro)) out.push(`sport skill ${r.sportSkill}`);
  for (const [k, v] of Object.entries(r.skill || {})) if (Skills.get(s, k) < v) out.push(`${k.replace('_', ' ')} ${v} (you ${Math.round(Skills.get(s, k))})`);
  for (const [k, v] of Object.entries(r.passionMeter || {})) { const a = Passions.ensure(s).active.find((x) => x.id === k); if (!(a && a.meter >= v) && !Passions.isMastered(s, k)) out.push(`${k} passion meter ${v}`); }
  if (r.need && s.cash > SD().needCash) out.push(`savings under ${SD().needCash.toLocaleString('en-US')}`);
  return out;
}
// ---- odds: grades, skills, sports and family finances (each part is reported so the UI can show why) ----
export function familyScore(s) { // 0 (struggling) .. 1 (wealthy): parents' savings + country wealth
  const par = P.living(s).filter((p) => p.rel === 'mother' || p.rel === 'father'), cash = par.length ? par.reduce((a, p) => a + (p.cash || 0), 0) / par.length : 0, w = P.country(s).wealth ?? 0.5;
  return clamp(0.5 * clamp(cash / 150000, 0, 1) + 0.5 * clamp(w, 0, 1), 0, 1);
}
export function odds(s, t, { renew = false } = {}) {
  const g = gpa(s), sportSk = s.pro ? 85 : s.sport ? s.sport.skill : 0, fam = familyScore(s);
  const parts = { grades: (g - 3) * 0.08, skills: Skills.interviewBonus(s) * 0.5 + (Skills.avg(s) - 30) / 500, sports: t.kind === 'athletic' ? clamp((sportSk - 55) / 200, -0.15, 0.18) : (s.sport ? 0.02 : 0), family: t.kind === 'need' ? (0.5 - fam) * 0.4 : 0 };
  const base = renew ? 0.74 : 0.62, passion = t.passion ? 0.1 : 0, p = clamp(base + parts.grades + parts.skills + parts.sports + parts.family + passion, renew ? 0.4 : 0.35, 0.93);
  return { p, parts: { grades: Math.round(parts.grades * 100), skills: Math.round(parts.skills * 100), sports: Math.round(parts.sports * 100), family: Math.round(parts.family * 100), passion: Math.round(passion * 100) } };
}
export function list(s) {
  const w = window(s) || enrolled(s), en = !window(s) && !!enrolled(s), sch = ensure(s), P0 = Passions.ensure(s);
  return SD().types.filter((t) => w && (t.level === 'both' || t.level === w)).map((t) => {
    const locked = !!t.passion && !Passions.has(s, t.passion) && !Passions.isMastered(s, t.passion) && !(s.heritage || []).includes(t.passion);
    const miss = unmet(s, t), held = sch.active.some((a) => a.id === t.id), tried = sch.applied[t.id] === Math.floor(s.age), o = odds(s, t);
    return { id: t.id, name: t.name, kind: t.kind, pct: t.pct, years: t.years, desc: t.desc, extra: !!t.passion, passionLocked: locked, passion: t.passion || null, missing: miss, eligible: !locked && !miss.length && !held && !tried, held, tried, odds: Math.round(o.p * 100), oddsParts: o.parts, worth: Math.round(t.pct * SD().collegeTuition), enrolled: en };
  });
}
export function apply(s, id) {
  const sch = ensure(s), t = SD().types.find((x) => x.id === id), w = window(s) || enrolled(s), en = !window(s) && !!enrolled(s); if (!t || !w) return { ok: false, msg: 'No application window open right now.' };
  const row = list(s).find((x) => x.id === id); if (!row) return { ok: false, msg: 'Not offered at this stage.' };
  if (row.held) return { ok: false, msg: 'You already hold this.' }; if (row.tried) return { ok: false, msg: 'You already applied this year.' };
  if (row.passionLocked) return { ok: false, msg: `Needs the ${t.passion} passion.` }; if (row.missing.length) return { ok: false, msg: 'Requirements missing: ' + row.missing.join(', ') };
  const cap = SD().maxActive + (en ? 1 : 0); // enrolled students get one extra slot for yearly awards
  if (sch.active.length >= cap) return { ok: false, msg: `You can hold ${cap} awards at once.` };
  sch.applied[id] = Math.floor(s.age); const p = odds(s, t).p;
  Skills.outcome(s, 'interview');
  if (!chance(s, p)) { log(s, `I applied for the ${t.name} and was turned down.`, 'school'); return { ok: true, won: false, msg: 'Application declined. You may try another.' }; }
  const total = sch.active.reduce((a, x) => a + x.pct, 0), pct = Math.min(t.pct, 1 - total); if (pct <= 0.01) return { ok: false, msg: 'Your tuition is already fully covered.' };
  const yrs = en ? Math.min(t.years, studyYearsLeft(s)) : t.years;
  sch.active.push({ id, name: t.name, pct, basePct: pct, yearsLeft: yrs, level: w, awardedAt: Math.floor(s.age), kind: t.kind, renewals: 0, probation: 0 });
  addStat(s, 'happiness', 8); s.awards.push({ id: 'sch_' + id, age: Math.floor(s.age), text: t.name }); log(s, `I won the ${t.name}: ${Math.round(pct * 100)}% of tuition covered.`, 'school');
  if (w === 'college' && s.debt > 0) { const g = Math.round(pct * 2000); s.debt = Math.max(0, s.debt - g); }
  return { ok: true, won: true, msg: `You won the ${t.name} (${Math.round(pct * 100)}% of tuition)!` };
}
// ---- renewal while enrolled: depends on keeping your grades / performance; a successful renewal pays more and adds a year ----
const RAISE = 0.1, RAISE_CAP = 0.25;
export function renewReq(a) {
  const t = SD().types.find((x) => x.id === a.id); if (!t) return { gpa: 2.0 };
  const r = t.req || {}, out = { gpa: Math.max(2.0, (r.gpa || (a.kind === 'academic' ? 3.0 : 2.3)) - 0.2) };
  if (r.sportSkill) out.sportSkill = Math.max(40, r.sportSkill - 5); if (r.skill) out.skill = Object.fromEntries(Object.entries(r.skill).map(([k, v]) => [k, Math.max(10, v - 5)]));
  if (r.need) out.need = true; if (r.passionMeter) out.passionMeter = r.passionMeter; if (r.anyClub) out.anyClub = r.anyClub; if (r.clubs) out.clubs = r.clubs;
  return out;
}
export function renewStatus(s, a) {
  const t = SD().types.find((x) => x.id === a.id); if (!t) return { eligible: false, missing: ['unknown award'], odds: 0 };
  const lvl = enrolled(s), miss = lvl === a.level ? unmet(s, { req: renewReq(a) }) : ['be enrolled at this level'];
  const sch = ensure(s), done = sch.renewed[a.id] === Math.floor(s.age), cap = Math.min(1, (a.basePct || t.pct) + RAISE_CAP), room = Math.max(0, 1 - sch.active.reduce((x, y) => x + y.pct, 0) + a.pct), newPct = Math.min(cap, room, a.pct + RAISE);
  const o = odds(s, t, { renew: true });
  return { eligible: !miss.length && !done && (newPct > a.pct + 0.001 || a.yearsLeft < studyYearsLeft(s)) && a.yearsLeft > 0, missing: miss, odds: Math.round(o.p * 100), oddsParts: o.parts, done, raiseTo: newPct, atCap: newPct <= a.pct + 0.001, extendOk: a.yearsLeft < studyYearsLeft(s), req: renewReq(a) };
}
export function renew(s, id) {
  const sch = ensure(s), a = sch.active.find((x) => x.id === id); if (!a) return { ok: false, msg: 'You do not hold that award.' };
  const st = renewStatus(s, a), t = SD().types.find((x) => x.id === id);
  if (sch.renewed[id] === Math.floor(s.age)) return { ok: false, msg: 'You already asked for a renewal this year.' };
  if (st.missing.length) return { ok: false, msg: 'Renewal requirements not met: ' + st.missing.join(', ') };
  if (st.atCap && !st.extendOk) return { ok: false, msg: 'Nothing more to renew: it already covers the maximum and your remaining years.' };
  sch.renewed[id] = Math.floor(s.age); Skills.outcome(s, 'interview');
  if (!chance(s, st.odds / 100)) { log(s, `My ${t.name} renewal review did not go my way this year.`, 'school'); return { ok: true, won: false, msg: 'Renewal declined this year. Your award continues until it ends; keep your grades up and try again.' }; }
  const before = a.pct; a.pct = st.raiseTo; a.renewals = (a.renewals || 0) + 1; a.probation = 0; if (a.yearsLeft < studyYearsLeft(s)) a.yearsLeft = Math.min(studyYearsLeft(s), a.yearsLeft + 1);
  const gain = Math.round((a.pct - before) * SD().collegeTuition); if (a.level === 'college' && s.debt > 0 && gain > 0) s.debt = Math.max(0, s.debt - gain);
  addStat(s, 'happiness', 4); log(s, `My ${t.name} was renewed for more: now ${Math.round(a.pct * 100)}% of tuition.`, 'school');
  return { ok: true, won: true, msg: `Renewed! ${t.name} now covers ${Math.round(a.pct * 100)}% of tuition (+${fmtMoney(gain)}/yr).` };
}
// yearly review while enrolled: slipping grades / lost team put an award on probation, then take it away
function reviewAwards(s) {
  const sch = ensure(s), lvl = enrolled(s); if (!lvl) return;
  for (const a of sch.active) {
    if (a.level !== lvl) continue; const t = SD().types.find((x) => x.id === a.id); if (!t) continue; const miss = unmet(s, { req: renewReq(a) }).filter((m) => !/^savings/.test(m) || a.kind !== 'need');
    const dropped = a.kind === 'athletic' && !s.sport && !s.pro;
    if (miss.length || dropped) { a.probation = (a.probation || 0) + 1; if (a.probation >= 2 || dropped) { a.yearsLeft = 0; log(s, `I lost my ${t.name}: ${dropped ? 'I was no longer on the team' : 'my grades slipped'}.`, 'school'); } else log(s, `My ${t.name} is on probation. I need to bring my grades up.`, 'school'); }
    else if (a.probation) a.probation = 0;
  }
}
export const coverage = (s, level) => clamp(ensure(s).active.filter((a) => a.level === level && a.yearsLeft > 0).reduce((t, a) => t + a.pct, 0), 0, 1);
export const tuitionFactor = (s) => 1 - coverage(s, 'college');
// refund part of a slice school's tuition (call after enrolling, and yearly while enrolled)
export function creditSlice(s, schoolId, tuition) {
  const lvl = isGrad(schoolId) ? 'grad' : 'college', c = coverage(s, lvl); if (!c) return 0; const refund = Math.round(c * tuition), use = Math.min(s.debt, refund); s.debt -= use; s.cash += refund - use; return refund;
}
// why a club can't be joined the normal way ('' = can join). opts.force (rewarded ad) skips the age window and the club cap, but never the student/exists/already-in checks.
export function joinBlock(s, id, force = false) {
  const sch = ensure(s), c = SD().clubs.find((x) => x.id === id), age = Math.floor(s.age); if (!c) return 'No such club.';
  if (!s.school) return 'Clubs are for students.'; if (sch.clubs.includes(id)) return 'You are already in this club.';
  if (force) return '';
  if (age < c.minAge || age > c.maxAge) return `${c.name} is for ages ${c.minAge}-${c.maxAge}.`; if (sch.clubs.length >= SD().maxClubs) return `Max ${SD().maxClubs} clubs.`;
  return '';
}
export function joinClub(s, id, opts = {}) {
  const sch = ensure(s), c = SD().clubs.find((x) => x.id === id); if (!c) return { ok: false, msg: 'No such club.' };
  if (sch.clubs.includes(id) && !opts.force) { sch.clubs = sch.clubs.filter((x) => x !== id); return { ok: true, msg: `Left ${c.name}.` }; }
  const why = joinBlock(s, id, !!opts.force); if (why) return { ok: false, msg: why };
  sch.clubs.push(id); log(s, opts.force ? `I got into the ${c.name.toLowerCase()} through a sponsor's invitation.` : `I joined the ${c.name.toLowerCase()}.`, 'school'); return { ok: true, msg: `Joined ${c.name}.` };
}
export function volunteer(s) {
  const sch = ensure(s), age = Math.floor(s.age); if (age < 10) return { ok: false, msg: 'Service starts at 10.' }; if (s.acted.volunteer_hrs) return { ok: false, msg: 'Already volunteered this year.' };
  s.acted.volunteer_hrs = 1; const h = rint(s, ...SD().serviceHoursPerAct); sch.service += h; Skills.useMap(s, { empathy: 2, maturity: 1 }); addStat(s, 'karma', 2); addStat(s, 'happiness', 2);
  log(s, `I volunteered for ${h} hours.`, 'act'); return { ok: true, msg: `+${h} service hours.` };
}
export function yearTick(s) {
  const sch = ensure(s), age = Math.floor(s.age);
  if (s.school === 'high' || s.school === 'college' || s.school === 'primary' && age >= 11) {
    const g = clamp(1.15 + s.stats.smarts / 38 + (Skills.get(s, 'discipline') + Skills.get(s, 'focus')) / 130 + gauss(s) * 0.25 + (Passions.perk(s, 'smarts') ? 0.1 : 0), 0, 4); sch.gpa.push(Math.round(g * 100) / 100); if (sch.gpa.length > 8) sch.gpa.shift();
  }
  for (const id of [...sch.clubs]) { const c = SD().clubs.find((x) => x.id === id); if (!c || age > c.maxAge || !s.school) { sch.clubs = sch.clubs.filter((x) => x !== id); continue; } Skills.useMap(s, c.skills, 1); sch.clubYears[id] = (sch.clubYears[id] || 0) + 1; sch.service += 8; }
  // consume years while enrolled; expire unused awards after 4 years
  const slice = s.sl && s.sl.edu && s.sl.edu.inSchool;
  reviewAwards(s);
  for (const a of sch.active) {
    if (s.school === 'college' && a.level === 'college') a.yearsLeft--;
    else if (slice) { if (a.level === (isGrad(slice.id) ? 'grad' : 'college')) a.yearsLeft--; }
    else if (age - a.awardedAt > 4) a.yearsLeft = 0;
  }
  if (slice) creditSlice(s, slice.id, slice.tuition);
  sch.active = sch.active.filter((a) => a.yearsLeft > 0);
  if (s.sport && s.sport.scholarship) { /* athletic ride from sport path stays as is */ }
}
export function status(s) {
  const sch = ensure(s), en = enrolled(s);
  return { window: window(s), enrolled: en, studyYearsLeft: en ? studyYearsLeft(s) : 0, tuition: SD().collegeTuition, yearlyWorth: Math.round(sch.active.filter((a) => a.level === en).reduce((t, a) => t + a.pct, 0) * SD().collegeTuition), familyScore: Math.round(familyScore(s) * 100), gpa: gpa(s), gpaYears: sch.gpa.length, clubs: sch.clubs.map((id) => SD().clubs.find((c) => c.id === id)), service: Math.round(sch.service), awards: s.awards.length, awardList: s.awards.map((a) => a.text), active: sch.active.map((a) => ({ ...a, worth: Math.round(a.pct * SD().collegeTuition), renew: en && a.level === en ? renewStatus(s, a) : null })), clubsAvail: SD().clubs.map((c) => ({ ...c, joined: sch.clubs.includes(c.id), years: sch.clubYears[c.id] || 0, blocked: sch.clubs.includes(c.id) ? '' : joinBlock(s, c.id, false), adBlocked: sch.clubs.includes(c.id) ? 'member' : joinBlock(s, c.id, true) })), maxClubs: SD().maxClubs, list: list(s), tuitionFactor: tuitionFactor(s) };
}

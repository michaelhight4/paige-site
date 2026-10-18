// Scholarships (data/scholarships.json): apply near the end of high school (college) and before grad school. Requirements come from grades (GPA),
// clubs/teams, service hours, awards, talent and skills; kinds: academic / athletic / arts / need / service / talent. A passion unlocks extra awards.
// Tuition effect: college tuition is scaled by (1 - pct); slice schools (community college, university, graduate schools) are refunded pct of tuition.
import { D } from './data.js';
import { clamp, chance, rint, gauss, pick as rpick } from './rng.js';
import { log, addStat } from './core.js';
import * as Skills from './skills.js';
import * as Passions from './passions.js';

const SD = () => D.scholarData;
export const ensure = (s) => { if (!s.sch) s.sch = { clubs: [], clubYears: {}, service: 0, gpa: [], active: [], applied: {}, serviceYear: -1 }; if (!s.awards) s.awards = []; return s.sch; };
export function gpa(s) { const h = ensure(s).gpa.slice(-4); return Math.round((h.length ? h.reduce((a, b) => a + b, 0) / h.length : clamp(s.stats.smarts / 25, 0, 4)) * 100) / 100; }
export const clubCount = (s) => ensure(s).clubs.length;
const isGrad = (id) => { const sc = D.sOcc.education.schools.find((x) => x.id === id); return !!sc && sc.requires === 'university'; };
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
export function list(s) {
  const w = window(s), sch = ensure(s), P = Passions.ensure(s);
  return SD().types.filter((t) => w && (t.level === 'both' || t.level === w)).map((t) => {
    const locked = !!t.passion && !Passions.has(s, t.passion) && !Passions.isMastered(s, t.passion) && !(s.heritage || []).includes(t.passion);
    const miss = unmet(s, t), held = sch.active.some((a) => a.id === t.id), tried = sch.applied[t.id] === Math.floor(s.age);
    return { id: t.id, name: t.name, kind: t.kind, pct: t.pct, years: t.years, desc: t.desc, extra: !!t.passion, passionLocked: locked, passion: t.passion || null, missing: miss, eligible: !locked && !miss.length && !held && !tried, held, tried };
  });
}
export function apply(s, id) {
  const sch = ensure(s), t = SD().types.find((x) => x.id === id), w = window(s); if (!t || !w) return { ok: false, msg: 'No application window open right now.' };
  const row = list(s).find((x) => x.id === id); if (!row) return { ok: false, msg: 'Not offered at this stage.' };
  if (row.held) return { ok: false, msg: 'You already hold this.' }; if (row.tried) return { ok: false, msg: 'You already applied this year.' };
  if (row.passionLocked) return { ok: false, msg: `Needs the ${t.passion} passion.` }; if (row.missing.length) return { ok: false, msg: 'Requirements missing: ' + row.missing.join(', ') };
  if (sch.active.length >= SD().maxActive) return { ok: false, msg: `You can hold ${SD().maxActive} awards at once.` };
  sch.applied[id] = Math.floor(s.age); const p = clamp(0.62 + (gpa(s) - 3) * 0.08 + Skills.interviewBonus(s) * 0.5 + (t.passion ? 0.1 : 0), 0.35, 0.93);
  Skills.outcome(s, 'interview');
  if (!chance(s, p)) { log(s, `I applied for the ${t.name} and was turned down.`, 'school'); return { ok: true, won: false, msg: 'Application declined. You may try another.' }; }
  const total = sch.active.reduce((a, x) => a + x.pct, 0), pct = Math.min(t.pct, 1 - total); if (pct <= 0.01) return { ok: false, msg: 'Your tuition is already fully covered.' };
  sch.active.push({ id, name: t.name, pct, yearsLeft: t.years, level: w, awardedAt: Math.floor(s.age), kind: t.kind });
  addStat(s, 'happiness', 8); s.awards.push({ id: 'sch_' + id, age: Math.floor(s.age), text: t.name }); log(s, `I won the ${t.name}: ${Math.round(pct * 100)}% of tuition covered.`, 'school');
  if (w === 'college' && s.debt > 0) { const g = Math.round(pct * 2000); s.debt = Math.max(0, s.debt - g); }
  return { ok: true, won: true, msg: `You won the ${t.name} (${Math.round(pct * 100)}% of tuition)!` };
}
export const coverage = (s, level) => clamp(ensure(s).active.filter((a) => a.level === level && a.yearsLeft > 0).reduce((t, a) => t + a.pct, 0), 0, 1);
export const tuitionFactor = (s) => 1 - coverage(s, 'college');
// refund part of a slice school's tuition (call after enrolling, and yearly while enrolled)
export function creditSlice(s, schoolId, tuition) {
  const lvl = isGrad(schoolId) ? 'grad' : 'college', c = coverage(s, lvl); if (!c) return 0; const refund = Math.round(c * tuition), use = Math.min(s.debt, refund); s.debt -= use; s.cash += refund - use; return refund;
}
export function joinClub(s, id) {
  const sch = ensure(s), c = SD().clubs.find((x) => x.id === id), age = Math.floor(s.age); if (!c) return { ok: false, msg: 'No such club.' };
  if (sch.clubs.includes(id)) { sch.clubs = sch.clubs.filter((x) => x !== id); return { ok: true, msg: `Left ${c.name}.` }; }
  if (age < c.minAge || age > c.maxAge) return { ok: false, msg: `${c.name} is for ages ${c.minAge}-${c.maxAge}.` }; if (!s.school) return { ok: false, msg: 'Clubs are for students.' };
  if (sch.clubs.length >= SD().maxClubs) return { ok: false, msg: `Max ${SD().maxClubs} clubs.` };
  sch.clubs.push(id); log(s, `I joined the ${c.name.toLowerCase()}.`, 'school'); return { ok: true, msg: `Joined ${c.name}.` };
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
  const sch = ensure(s);
  return { window: window(s), gpa: gpa(s), gpaYears: sch.gpa.length, clubs: sch.clubs.map((id) => SD().clubs.find((c) => c.id === id)), service: Math.round(sch.service), awards: s.awards.length, awardList: s.awards.map((a) => a.text), active: sch.active, clubsAvail: SD().clubs.map((c) => ({ ...c, joined: sch.clubs.includes(c.id), years: sch.clubYears[c.id] || 0 })), maxClubs: SD().maxClubs, list: list(s), tuitionFactor: tuitionFactor(s) };
}

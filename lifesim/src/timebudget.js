// Weekly time budget + stress. Every commitment (job, side job, school, businesses, teams, hobbies, streaming...) costs weekly hours out of 168.
// Basic needs: sleep 56h + rest/meals/chores 28h. Committed hours beyond the 84 free hours eat rest first, then sleep; stress rises, and high stress
// hurts health, mood, job performance, study and team strength. Hard cap: committed <= CAP (168 minus the minimum sleep 35 and rest 14).
import { fmtMoney } from './fmt.js';
import { clamp, rnd } from './rng.js';
import { spend } from './core.js';
export const WEEK = 168, SLEEP = 56, REST = 28, MIN_SLEEP = 35, MIN_REST = 14, CAP = WEEK - MIN_SLEEP - MIN_REST;
export const LEVELS = [{ id: 'calm', at: 0, name: 'Calm', icon: '😌' }, { id: 'busy', at: 45, name: 'Busy', icon: '🙂' }, { id: 'strained', at: 60, name: 'Strained', icon: '😬' }, { id: 'high', at: 75, name: 'High stress', icon: '😰' }, { id: 'burnout', at: 90, name: 'Burnout', icon: '🔥' }];
export const levelOf = (st) => [...LEVELS].reverse().find((l) => st >= l.at);
const num = (x, d = 0) => (Number.isFinite(+x) ? +x : d);
// a job counts only its own schedule: 8h x 5 days = 40/wk, or the job's listed hours when higher (no commute, advisors take 0h)
export const jobHrs = (j) => Math.max(40, num(j && (j.hours || j.hrs), 40));
const ent = (s) => { if (!s.tb) s.tb = { year: -1, rest: 0, therapy: 0, vac: 0, burnouts: 0 }; return s.tb; };
const len = (o) => (o ? Object.keys(o).length : 0);
// ---- all weekly commitments
export function lines(s) {
  const L = [], add = (id, label, hours, cat, icon) => { if (hours > 0) L.push({ id, label, hours: Math.round(hours * 10) / 10, cat, icon }); };
  const age = Math.floor(s.age);
  if (s.school === 'primary') { add('school', 'School', 30, 'school', '🏫'); }
  else if (s.school === 'high') { add('school', 'High school', 35, 'school', '🏫'); }
  else if (s.school === 'college') { add('school', 'College classes', 20, 'school', '🎓'); }
  if (s.postgrad) add('postgrad', 'Postgraduate study', 20, 'school', '🎓');
  const sl = s.sl || {};
  if (s.job) { add('job', `Main job (${jobHrs(s.job)}h schedule)`, jobHrs(s.job), 'work', '💼'); }
  else if (sl.job) { add('job', `Main job (${jobHrs(sl.job)}h schedule)`, jobHrs(sl.job), 'work', '💼'); }
  if (s.job2) { add('job2', 'Second job', 20, 'work', '🛠️'); }
  if (sl.partTime) { add('parttime', 'Part-time job', num(sl.partTime.hours, 15), 'work', '🕒'); }
  if (s.biz && s.biz.length) add('biz', `Businesses (${s.biz.length})`, 6 * s.biz.length, 'work', '🏪');
  if (s.prod && len(s.prod.cos)) add('prod', `Production companies (${len(s.prod.cos)})`, 5 * len(s.prod.cos), 'work', '🎬');
  if (s.brand) add('brand', 'Clothing brand', 10, 'work', '👕'); if (s.farm) add('farm', 'Farm / ranch', 12, 'work', '🚜');
  const nT = (s.fr && s.fr.teams ? s.fr.teams.length : s.fr && s.fr.team ? 1 : 0) + (s.es && s.es.teams ? s.es.teams.length : 0); if (nT) add('teams', `Sports / esports teams (${nT})`, 6 * nT, 'teams', '🏟️');
  if (s.rc && s.rc.team) add('racing_team', 'Racing team', 8, 'teams', '🏁'); if (s.rc && s.rc.career) add('racing_career', 'Racing career', 25, 'teams', '🏎️');
  if (s.coach && s.coach.active) add('coach', 'Coaching', s.coach.role === 'head' ? 25 : 18, 'teams', '🏆');
  if (s.sport) add('sport', 'Playing sports', 8, 'hobby', '⚽');
  if (s.esc && s.esc.active) add('esports_career', 'Esports career', 30, 'teams', '🎮');
  if (s.stream && s.stream.active) { const h = { casual: 10, regular: 20, grind: 35, marathon: 50 }[s.stream.schedule]; add('stream', 'Live streaming', num(h, 20), 'hobby', '🎥'); }
  if (s.infl && s.infl.active) add('infl', 'Influencer work', 10, 'hobby', '📸');
  if (s.social && len(s.social.accounts)) add('social', `Social accounts (${len(s.social.accounts)})`, 1.5 * len(s.social.accounts), 'hobby', '📱');
  if (s.pol && s.pol.office) add('politics', 'Political office', 30, 'work', '🏛️');
  return managed(s, L);
}
// ---- management firms: corporate firms (companies, teams) and talent firms (social, streaming). They ONLY cut the time load:
// hours become 25% / 20% / 15% of unmanaged (stress follows, since it comes from hours). No actions, no decisions, no events; just a yearly fee.
export const MGMT_TIERS = [{ id: 'budget', name: 'Budget', pct: 0.25, fee: 15000 }, { id: 'standard', name: 'Standard', pct: 0.20, fee: 40000 }, { id: 'elite', name: 'Elite', pct: 0.15, fee: 100000 }];
export const MANAGEABLE = { biz: 'corporate', prod: 'corporate', brand: 'corporate', farm: 'corporate', teams: 'corporate', racing_team: 'corporate', stream: 'talent', infl: 'talent', social: 'talent' };
const units = (x) => { const m = /\((\d+)\)/.exec(x.label); return m ? +m[1] : 1; };
function managed(s, L) { const M = s.mgmt || {}; for (const x of L) { if (!MANAGEABLE[x.id]) continue; x.manageable = MANAGEABLE[x.id]; const tr = MGMT_TIERS.find((q) => q.id === M[x.id]); if (!tr) continue; x.was = x.hours; x.hours = Math.round(x.was * tr.pct * 10) / 10; x.mgmt = tr.id; x.fee = tr.fee * units(x); x.label += ` · Managed: ${x.hours}h/wk (was ${x.was}h)`; } for (const k of Object.keys(M)) if (!L.some((x) => x.id === k)) delete M[k]; return L; }
export function mgmtFees(s) { return lines(s).reduce((a, x) => a + (x.fee || 0), 0); }
export function setMgmt(s, id, tier) {
  if (!MANAGEABLE[id]) return { ok: false, msg: 'Nothing to manage there.' }; s.mgmt = s.mgmt || {};
  if (!tier) { if (!s.mgmt[id]) return { ok: false, msg: 'No firm hired.' }; delete s.mgmt[id]; return { ok: true, msg: 'Fired the management firm. Those hours are back on you.' }; }
  const tr = MGMT_TIERS.find((q) => q.id === tier); if (!tr) return { ok: false, msg: 'Unknown tier.' }; if (!lines(s).some((x) => x.id === id)) return { ok: false, msg: 'You have nothing there to manage.' };
  s.mgmt[id] = tr.id; return { ok: true, msg: `Hired a ${tr.name} ${MANAGEABLE[id]} management firm.` };
}
export function budget(s) {
  const L = lines(s), committed = Math.round(L.reduce((a, x) => a + x.hours, 0) * 10) / 10, by = (c) => Math.round(L.filter((x) => x.cat === c).reduce((a, x) => a + x.hours, 0) * 10) / 10;
  let free = WEEK - SLEEP - REST - committed, sleep = SLEEP, rest = REST;
  if (free < 0) { const d = -free; free = 0; const dr = Math.min(d, REST - MIN_REST); rest -= dr; sleep -= Math.min(d - dr, SLEEP - MIN_SLEEP); }
  const strain = clamp((committed - 60) / (CAP - 60), 0, 1), sleepDebt = (SLEEP - sleep) / (SLEEP - MIN_SLEEP);
  const st = Math.round(num(s.stats && s.stats.stress, 20));
  return { lines: L, committed, free: Math.round(free * 10) / 10, sleep, rest, cap: CAP, week: WEEK, work: by('work'), school: by('school'), teams: by('teams'), hobby: by('hobby'), stressAdd: Math.round(strain * 38 + sleepDebt * 15), stress: st, level: levelOf(st), over: committed > CAP, room: Math.max(0, Math.round((CAP - committed) * 10) / 10) };
}
export const stressAdd = (s) => budget(s).stressAdd;
export const canAdd = (s, hours) => { const b = budget(s); return b.committed + hours <= CAP ? null : `Not enough time: this needs ${hours}h/week but only ${b.room}h are left (${b.committed}/${CAP}h committed; sleep and rest need the rest of the 168h week). Drop a commitment first.`; };
// performance multiplier for teams/athletes under stress (1.0 below 60 stress, down to 0.88 at 100)
export const perfMult = (s) => 1 - clamp((num(s.stats && s.stats.stress, 20) - 60) / 40, 0, 1) * 0.12;
// ---- yearly toll (called from the engine's work section)
export function yearTick(s, dt = 1) {
  const st = num(s.stats.stress, 20), t = ent(s), y = Math.floor(s.age); if (t.year !== y) { t.year = y; t.rest = 0; t.therapy = 0; t.vac = 0; }
  { const fee = mgmtFees(s) * dt; if (fee > 0) spend(s, fee); }
  if (st <= 60) return null; const over = st - 60, out = { stress: st, notes: [] };
  s.stats.health = clamp(s.stats.health - over * 0.05 * dt, 0, 100); s.stats.happiness = clamp(s.stats.happiness - over * 0.08 * dt, 0, 100);
  if (s.job) s.job.perf = clamp(s.job.perf - over * 0.10 * dt, 0, 100); if (s.job2) s.job2.perf = clamp(s.job2.perf - over * 0.10 * dt, 0, 100);
  if (s.school) s.stats.smarts = clamp(s.stats.smarts - over * 0.04 * dt, 0, 100);
  if (st >= 90) { t.burnouts++; s.stats.health = clamp(s.stats.health - 4, 0, 100); s.stats.happiness = clamp(s.stats.happiness - 6, 0, 100); s.stats.crazy = clamp((s.stats.crazy || 0) + 2, 0, 100); if (s.job) s.job.perf = clamp(s.job.perf - 8, 0, 100); out.notes.push('burnout'); }
  return out;
}
// ---- second job (20h/week, entry level, 60% of the entry salary, no promotions)
export function secondJobPay(D, s) { const c = D.careers.find((x) => x.id === s.job2.id); return c ? c.levels[0][1] * 0.6 * (0.9 + 0.2 * s.job2.perf / 100) : 0; }
// ---- relief actions
export const RELIEF = [
  { id: 'rest', icon: '🛋️', name: 'Mental health day', cost: 0, relief: 8, per: 1, key: 'rest', desc: 'Free. Once a year.' },
  { id: 'therapy', icon: '🛋️', name: 'Therapy session', cost: 400, relief: 10, per: 3, key: 'therapy', desc: 'Up to 3 a year.' },
  { id: 'vacation', icon: '🏖️', name: 'Vacation week', cost: 4000, relief: 25, per: 1, key: 'vac', desc: 'Once a year. Also lifts mood and health.' },
];
export function relief(s, id) {
  const d = RELIEF.find((x) => x.id === id); if (!d) return { ok: false, msg: 'Unknown action.' }; const t = ent(s), y = Math.floor(s.age); if (t.year !== y) { t.year = y; t.rest = 0; t.therapy = 0; t.vac = 0; }
  if (t[d.key] >= d.per) return { ok: false, msg: `${d.name}: already used this year.` }; if (d.cost > s.cash) return { ok: false, msg: `${d.name} costs ${fmtMoney(d.cost)}.` };
  s.cash -= d.cost; t[d.key]++; s.stats.stress = clamp(s.stats.stress - d.relief, 0, 100); s.stats.happiness = clamp(s.stats.happiness + (id === 'vacation' ? 6 : 2), 0, 100); if (id === 'vacation') s.stats.health = clamp(s.stats.health + 2, 0, 100);
  return { ok: true, msg: `${d.name}: stress −${d.relief}.` };
}
export function status(s) { const b = budget(s), t = ent(s), y = Math.floor(s.age), same = t.year === y; return { ...b, burnouts: t.burnouts, relief: RELIEF.map((d) => ({ id: d.id, icon: d.icon, name: d.name, cost: d.cost, relief: d.relief, desc: d.desc, left: Math.max(0, d.per - (same ? t[d.key] : 0)), afford: d.cost <= s.cash })), levels: LEVELS, secondJob: s.job2 ? { id: s.job2.id, perf: Math.round(s.job2.perf) } : null }; }

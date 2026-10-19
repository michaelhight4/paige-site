// My Team: one persistent sports career layer over school sports (s.sport), draft/pro (s.pro), the Pro Athlete job and racing drivers.
// - one per-sport skill set (6 skills) that survives school -> college -> pro; training is capped at 3 skills a year at every level
// - a simulated league (rival players with stats, teams with records) re-rolled every season; ranks, titles and awards compare you to the rivals
// - play styles with trade-offs, contract/trade/draft offers (accept / decline / negotiate), Hall of Fame
// State lives in s.mt (created lazily by ensure(), so old saves migrate on first use).
import { D } from './data.js';
import { rnd, rint, chance, clamp, gauss } from './rng.js';
import { log, addStat } from './core.js';
import * as SS from './schoolsports.js';
import * as B from './slice_bridge.js';

const R = Math.round, age = (s) => Math.floor(s.age);
export const TRAIN_CAP = 3;
const FIRST = ['Alex', 'Jordan', 'Marcus', 'Tyler', 'Devon', 'Sam', 'Riley', 'Jamal', 'Chris', 'Mateo', 'Luca', 'Kai', 'Noah', 'Owen', 'Eli', 'Diego', 'Theo', 'Reese', 'Quinn', 'Avery', 'Jules', 'Nico', 'Zane', 'Cole', 'Drew', 'Remy', 'Tariq', 'Ivan', 'Hugo', 'Anders'];
const LAST = ['Ward', 'Brooks', 'Santos', 'Kim', 'Hayes', 'Price', 'Lopez', 'Morgan', 'Diaz', 'Bell', 'Cruz', 'Fox', 'Grant', 'Holt', 'Ivers', 'Jensen', 'Knox', 'Lane', 'Moss', 'Nash', 'Pike', 'Quarry', 'Rhodes', 'Stone', 'Tate', 'Vega', 'West', 'York', 'Zimmer', 'Okoye'];
const CITY = ['Harbor', 'Summit', 'Lakeside', 'Riverton', 'Ironvale', 'Cedar Falls', 'Redwood', 'Brightwater', 'Stonebridge', 'Maple Grove', 'Foxhill', 'Eastport', 'Northfield', 'Sunset Bay', 'Granite', 'Prairie'];
const MASCOT = ['Hawks', 'Comets', 'Stallions', 'Rangers', 'Storm', 'Titans', 'Vipers', 'Mariners', 'Blaze', 'Wolves', 'Giants', 'Pilots', 'Bulls', 'Thunder', 'Foxes', 'Knights'];
export const SPORTS = {
  basketball: { name: 'Basketball', icon: '🏀', skills: ['Shooting', 'Passing', 'Defense', 'Rebounding', 'Athleticism', 'Court IQ'], off: ['Shooting', 'Passing'], def: ['Defense', 'Rebounding'], statOff: 'ppg', statDef: 'rpg', title: 'Scoring title', defTitle: 'Rebounding title' },
  football: { name: 'Football', icon: '🏈', skills: ['Throwing', 'Catching', 'Blocking', 'Tackling', 'Speed', 'Vision'], off: ['Throwing', 'Catching'], def: ['Tackling', 'Blocking'], statOff: 'yards', statDef: 'tackles', title: 'Yardage title', defTitle: 'Tackles title' },
  baseball: { name: 'Baseball', icon: '⚾', skills: ['Hitting', 'Power', 'Pitching', 'Fielding', 'Base running', 'Game sense'], off: ['Hitting', 'Power'], def: ['Fielding', 'Pitching'], statOff: 'hr', statDef: 'rbi', title: 'Home run title', defTitle: 'RBI title' },
  soccer: { name: 'Soccer', icon: '⚽', skills: ['Shooting', 'Passing', 'Dribbling', 'Defending', 'Stamina', 'Vision'], off: ['Shooting', 'Dribbling'], def: ['Defending', 'Stamina'], statOff: 'goals', statDef: 'saves', title: 'Golden boot', defTitle: 'Golden glove' },
  track: { name: 'Track', icon: '🏃', skills: ['Sprinting', 'Endurance', 'Technique', 'Strength', 'Start', 'Mental'], off: ['Sprinting', 'Start'], def: ['Endurance', 'Technique'], statOff: 'medals', statDef: 'medals', title: 'Medal table title', defTitle: 'Medal table title' },
  swimming: { name: 'Swimming', icon: '🏊', skills: ['Freestyle', 'Stroke work', 'Turns', 'Starts', 'Endurance', 'Mental'], off: ['Freestyle', 'Starts'], def: ['Endurance', 'Turns'], statOff: 'medals', statDef: 'medals', title: 'Medal table title', defTitle: 'Medal table title' },
  racing: { name: 'Racing', icon: '🏁', skills: ['Pace', 'Racecraft', 'Consistency', 'Fitness', 'Technical'], keys: ['pace', 'racecraft', 'consistency', 'fitness', 'technical'], off: ['Pace', 'Racecraft'], def: ['Consistency', 'Technical'], statOff: 'wins', statDef: 'podiums', title: 'Most wins', defTitle: 'Most podiums' },
};
const RACING_DEF = { id: 'racing', name: 'Racing', stats: ['pts', 'wins', 'podiums'], base: { pts: 120, wins: 2, podiums: 5 } };
export const STAT_LABEL = { ppg: 'Points / game', rpg: 'Rebounds / game', apg: 'Assists / game', goals: 'Goals', assists: 'Assists', saves: 'Saves', yards: 'Yards', tds: 'Touchdowns', tackles: 'Tackles', avg: 'Batting avg', hr: 'Home runs', rbi: 'RBI', best100: 'Best 100 (s)', medals: 'Medals', pts: 'Points', wins: 'Wins', podiums: 'Podiums' };
export const LEVELS = { school: { label: 'School', mean: 42, sd: 10, teams: 8, league: 'State Conference', games: 16, rivals: 24 }, college: { label: 'College', mean: 57, sd: 9, teams: 10, league: 'Collegiate Conference', games: 16, rivals: 30 }, minor: { label: 'Minor league', mean: 60, sd: 9, teams: 10, league: 'Development League', games: 16, rivals: 30 }, pro: { label: 'Pro', mean: 71, sd: 8, teams: 12, league: 'Premier League', games: 16, rivals: 36 } };
export const STYLES = [
  { id: 'balanced', name: 'Balanced', note: 'No change. Steady results.', off: 1, def: 1, team: 0, inj: 1, fame: 0, mood: 0 },
  { id: 'spotlight', name: 'Star on offense', note: 'Offense stats +15%, defense −8%, team strength −2, more fame, more injury risk.', off: 1.15, def: 0.92, team: -2, inj: 1.3, fame: 2, mood: 0 },
  { id: 'team', name: 'Team player', note: 'Team strength +3, your stats −8%, less fame, happier.', off: 0.92, def: 0.96, team: 3, inj: 0.9, fame: -1, mood: 2 },
  { id: 'defense', name: 'Defensive specialist', note: 'Defense stats +15%, offense −8%, lower injury risk.', off: 0.92, def: 1.15, team: 1, inj: 0.7, fame: 0, mood: 0 },
  { id: 'aggressive', name: 'All-out aggressive', note: 'All stats +10%, team −1, injury risk +60%.', off: 1.1, def: 1.1, team: -1, inj: 1.6, fame: 1, mood: -1 },
];
export const styleDef = (id) => STYLES.find((x) => x.id === id) || STYLES[0];
export const AWARD_PTS = { mvp: 10, score: 5, defense: 5, roty: 3, allstar: 3, champion: 6, hof: 0 };
export const AWARD_LABEL = { mvp: 'League MVP', score: 'Scoring / offensive title', defense: 'Defensive title', roty: 'Rookie of the Year', allstar: 'All-Star', champion: 'League champion', hof: 'Hall of Fame' };

const hash = (...xs) => { let h = 2166136261 >>> 0; for (const x of xs) for (const ch of String(x)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
const lcg = (seed) => { let t = seed >>> 0; return () => { t += 0x6d2b79f5; let x = Math.imul(t ^ (t >>> 15), 1 | t); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; };

export const ensure = (s) => {
  if (!s.mt) s.mt = { skills: {}, tr: { year: -1, list: [] }, style: 'balanced', styleYear: -1, league: null, seasons: [], awards: [], offers: [], career: { pts: 0, hof: false }, jobSport: null, limbo: null, last: null, contract: null };
  return s.mt;
};
const jobIsAthlete = (s) => !!(s.job && s.job.kind === 'special' && s.job.special === 'athlete') || !!(s.sl && s.sl.job && s.sl.job.special === 'athlete');
const slJob = (s) => (s.sl && s.sl.job && s.sl.job.special === 'athlete' ? s.sl.job : null);
export const defOf = (sportId) => (sportId === 'racing' ? RACING_DEF : SS.sportDef(sportId));
const pickJobSport = (s, m) => { if (!m.jobSport) { const ids = ['basketball', 'football', 'baseball', 'soccer', 'track', 'swimming']; m.jobSport = ids[hash(s.rs, 'pro') % ids.length]; } return m.jobSport; };

// ---- who is on a team, and where ----
export function membership(s) {
  const m = ensure(s);
  if (s.sport) { const lv = s.sport.level === 'college' ? 'college' : 'school'; return { kind: lv, level: lv, sportId: s.sport.id, team: s.sport.team, position: s.sport.position || '' }; }
  if (s.pro) { const sid = s.pro.sport || m.proSport || 'basketball'; const t = s.league && s.league.teams[s.pro.team]; return { kind: 'pro', level: 'pro', sportId: sid, team: m.contract && m.contract.team ? m.contract.team : t ? t.name : 'Pro team', position: 'Pro' }; }
  if (jobIsAthlete(s)) { const j = slJob(s) || s.job, step = j.step || 0, sid = pickJobSport(s, m); const lv = step >= 2 ? 'pro' : step === 1 ? 'minor' : 'minor'; return { kind: lv, level: lv, sportId: sid, team: (m.contract && m.contract.team) || m.jobTeam || (m.jobTeam = teamNameFor(s, sid, lv)), position: j.title || 'Pro', job: true }; }
  if (s.rc && s.rc.career && s.rc.career.role === 'driver') { const c = s.rc.career, lv = c.tier >= 2 ? 'pro' : c.tier === 1 ? 'minor' : 'school'; return { kind: lv === 'school' ? 'minor' : lv, level: lv === 'school' ? 'minor' : lv, sportId: 'racing', team: c.team || c.teamName || 'Privateer entry', position: 'Driver', racing: true }; }
  if (m.limbo) return { kind: 'draft', level: 'draft', sportId: m.limbo.sport, team: 'Draft class', position: 'Draft prospect', limbo: true };
  return null;
}
export const teamNameFor = (s, sid, lv) => `${CITY[hash(s.rs, sid, lv, 'c') % CITY.length]} ${MASCOT[hash(s.rs, sid, lv, 'm') % MASCOT.length]}`;
const leagueName = (sid, lv) => { const L = LEVELS[lv] || LEVELS.pro; return sid === 'racing' ? ['Grassroots Series', 'Regional Series', 'Premier Series'][lv === 'pro' ? 2 : lv === 'minor' ? 1 : 0] : `${SPORTS[sid].name} ${L.league}`; };

// ---- skills (one persistent set per sport) ----
export function skillsOf(s, sid) {
  const m = ensure(s), sp = SPORTS[sid]; if (!sp) return {};
  if (sid === 'racing' && s.rc && s.rc.stats) { const o = {}; sp.skills.forEach((n, i) => { o[n] = R(s.rc.stats[sp.keys[i]]); }); m.skills.racing = o; return o; }
  if (!m.skills[sid]) {
    const base = s.sport && s.sport.id === sid ? s.sport.skill : s.pro ? 60 : jobIsAthlete(s) ? ((slJob(s) || s.job).step >= 2 ? 64 : 54) : 40, o = {};
    sp.skills.forEach((n) => { o[n] = clamp(R(base + gauss(s) * 4), 5, 99); }); m.skills[sid] = o;
  }
  return m.skills[sid];
}
export const overall = (s, sid) => { const v = Object.values(skillsOf(s, sid)); return v.length ? R(v.reduce((a, b) => a + b, 0) / v.length) : 0; };
const setSkill = (s, sid, name, v) => { const m = ensure(s), sp = SPORTS[sid]; v = clamp(v, 5, 99); if (sid === 'racing' && s.rc && s.rc.stats) { s.rc.stats[sp.keys[sp.skills.indexOf(name)]] = v; return; } skillsOf(s, sid)[name] = v; };
export function trainState(s) { const m = ensure(s), y = age(s); if (m.tr.year !== y) m.tr = { year: y, list: [] }; return m.tr; }
export const trainCost = (s, mem) => (mem.sportId === 'racing' && s.rc && s.rc.career ? 2000 * (1 + s.rc.license) * (1 + s.rc.career.tier * 2) : 0);
export function trainSkill(s, name) {
  const mem = membership(s); if (!mem || mem.limbo) return { ok: false, msg: 'You are not on a team.' };
  const sid = mem.sportId, sp = SPORTS[sid], tr = trainState(s); if (!sp.skills.includes(name)) return { ok: false, msg: 'Pick one of your skills.' };
  if (tr.list.includes(name)) return { ok: false, msg: `${name} is already trained this year.` };
  if (tr.list.length >= TRAIN_CAP) return { ok: false, msg: `You can train ${TRAIN_CAP} skills a year (${tr.list.length}/${TRAIN_CAP} used).` };
  const cost = trainCost(s, mem); if (s.cash < cost) return { ok: false, msg: `Training costs $${R(cost).toLocaleString('en-US')}.` };
  const sk = skillsOf(s, sid), cur = sk[name], gain = sid === 'racing' ? Math.max(1, R((7 - cur / 20) * (0.8 + rnd(s) * 0.5))) : rint(s, 2, 5);
  s.cash -= cost; setSkill(s, sid, name, cur + gain); tr.list.push(name); if (!s.acted.sporttrain) { s.acted.sporttrain = 1; s.fit = Math.min(5, (s.fit || 0) + 1); }
  if (s.sport && s.sport.id === sid) s.sport.skill = overall(s, sid);
  log(s, `I drilled my ${name.toLowerCase()} until it stopped being embarrassing (+${gain}).`, 'sport');
  return { ok: true, msg: `${name} +${gain} (${tr.list.length}/${TRAIN_CAP} this year).`, gain, cost };
}
export const lowestSkills = (s, n = TRAIN_CAP) => { const sk = skillsOf(s, (membership(s) || {}).sportId), tr = trainState(s); return Object.entries(sk).filter(([k]) => !tr.list.includes(k)).sort((a, b) => a[1] - b[1]).slice(0, n).map(([k]) => k); };
export function trainLowest(s) {
  const mem = membership(s); if (!mem || mem.limbo) return { ok: false, msg: 'You are not on a team.' }; const tr = trainState(s); let n = 0, last = null;
  for (const k of lowestSkills(s, TRAIN_CAP - tr.list.length)) { const r = trainSkill(s, k); if (!r.ok) { last = r; break; } n++; last = r; }
  return n ? { ok: true, msg: `Trained ${n} skill${n > 1 ? 's' : ''} (${trainState(s).list.join(', ')}).`, n } : last || { ok: false, msg: 'Nothing left to train this year.' };
}
export function setStyle(s, id) { const m = ensure(s); if (!STYLES.some((x) => x.id === id)) return { ok: false, msg: 'Unknown style.' }; if (!membership(s)) return { ok: false, msg: 'You are not on a team.' }; m.style = id; m.styleYear = age(s); return { ok: true, msg: `Play style for this season: ${styleDef(id).name}.` }; }

// ---- league ----
function statsFor(s, sid, skill, level, mult = 1) {
  const lvl = level === 'school' ? 'high' : 'college';
  if (sid === 'racing') { const k = skill / 100; return { pts: Math.max(0, R(Math.pow(k, 1.6) * 330 * (1 + gauss(s) * 0.12))), wins: Math.max(0, R(Math.pow(k, 2) * 7 * (1 + gauss(s) * 0.3))), podiums: Math.max(0, R(Math.pow(k, 1.6) * 11 * (1 + gauss(s) * 0.2))) }; }
  return SS.seasonStats(s, defOf(sid), skill, lvl);
}
const composite = (sid, st) => { const d = defOf(sid); let t = 0; for (const k of d.stats) { const b = d.base[k] || 1; t += k === 'best100' ? b / Math.max(1, st[k]) : (st[k] || 0) / b; } return t / d.stats.length; };
const higherBetter = (k) => k !== 'best100';
function newRival(s, lv, sid, i, young) { const L = LEVELS[lv], a = young ? rint(s, 18, 21) : rint(s, 20, 33); return { id: 'r' + i + '_' + rint(s, 100, 999), name: FIRST[rint(s, 0, FIRST.length - 1)] + ' ' + LAST[rint(s, 0, LAST.length - 1)], skill: clamp(R(L.mean + gauss(s) * L.sd), 12, 97), age: a, rookie: !!young }; }
function buildLeague(s, mem) {
  const m = ensure(s), L = LEVELS[mem.level], sid = mem.sportId, teams = [], names = new Set([mem.team]);
  for (let i = 0; i < L.teams; i++) { let nm; if (i === 0) nm = mem.team; else { let g = 0; do nm = `${CITY[rint(s, 0, CITY.length - 1)]} ${MASCOT[rint(s, 0, MASCOT.length - 1)]}`; while (names.has(nm) && ++g < 40); names.add(nm); } teams.push({ name: nm, mine: i === 0 }); }
  const rivals = []; for (let i = 0; i < L.rivals; i++) { const r = newRival(s, mem.level, sid, i, i % 5 === 0); r.team = teams[1 + (i % (L.teams - 1))].name; rivals.push(r); }
  m.league = { sid, level: mem.level, name: leagueName(sid, mem.level), season: 0, teams, rivals }; return m.league;
}
function leagueFor(s, mem) { const m = ensure(s); if (!m.league || m.league.sid !== mem.sportId || m.league.level !== mem.level) buildLeague(s, mem); const lg = m.league; if (lg.teams[0].name !== mem.team) lg.teams[0].name = mem.team; return lg; }
const teamStr = (lg, mineSkill, name, mine) => { const rs = lg.rivals.filter((r) => r.team === name).map((r) => r.skill); const base = rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : LEVELS[lg.level].mean; return mine ? (base * 2 + mineSkill) / 3 : base; };
function strengths(s, lg, mineSkill, styleTeam = 0) { return lg.teams.map((x) => (x.mine ? teamStrMine(lg, mineSkill, styleTeam) : teamStr(lg, 0, x.name, false))); }
const teamStrMine = (lg, mineSkill, styleTeam) => { const mates = lg.rivals.filter((r) => r.mate).map((r) => r.skill); const base = mates.length ? mates.reduce((a, b) => a + b, 0) / mates.length : LEVELS[lg.level].mean; return (base * 2 + mineSkill) / 3 + styleTeam; };
function ensureMates(s, lg) { // two named teammates on your team, taken out of the rival pool so they are not double counted
  if (lg.rivals.some((r) => r.mate)) return; const pool = lg.rivals.filter((r) => r.team !== lg.teams[0].name).slice(0, 2); pool.forEach((r) => { r.team = lg.teams[0].name; r.mate = true; });
}
export function titleChance(s) {
  const mem = membership(s); if (!mem || mem.limbo) return null; const m = ensure(s), lg = leagueFor(s, mem); ensureMates(s, lg); const st = styleDef(m.style), sk = overall(s, mem.sportId), str = strengths(s, lg, sk, st.team), rnd2 = lcg(hash(s.rs, age(s), mem.sportId, 'tc')), N = 300; let win = 0, play = 0;
  for (let n = 0; n < N; n++) { const mean = str.reduce((a, b) => a + b, 0) / str.length, rec = str.map((x, i) => ({ i, w: bin(rnd2, LEVELS[lg.level].games, clamp(0.5 + (x - mean) / 55, 0.05, 0.95)) + rnd2() * 0.1 })).sort((a, b) => b.w - a.w).slice(0, 4); if (rec.some((r) => r.i === 0)) play++; const ch = bracket(rec.map((r) => r.i), str, rnd2); if (ch === 0) win++; }
  return { champion: R(100 * win / N), playoffs: R(100 * play / N) };
}
const bin = (rf, n, p) => { let w = 0; for (let i = 0; i < n; i++) if (rf() < p) w++; return w; };
const win2 = (a, b, str, rf) => (rf() < 1 / (1 + Math.exp(-(str[a] - str[b]) / 8)) ? a : b);
const bracket = (top, str, rf) => { const a = win2(top[0], top[3], str, rf), b = win2(top[1], top[2], str, rf); return win2(a, b, str, rf); };

// ---- one season ----
export function simSeason(s, mem) {
  const m = ensure(s), lg = leagueFor(s, mem), sid = mem.sportId, L = LEVELS[mem.level], st = styleDef(m.style), a = age(s); ensureMates(s, lg);
  const skill = overall(s, sid), sp = SPORTS[sid], d = defOf(sid), mineStat = statsFor(s, sid, skill, mem.level);
  let injured = chance(s, clamp(0.05 * st.inj * (1.2 - (s.stats.health || 50) / 150), 0.01, 0.4)); const injMul = injured ? 0.6 : 1;
  for (const k of d.stats) { const f = k === sp.statOff ? st.off : k === sp.statDef ? st.def : (st.off + st.def) / 2; if (higherBetter(k)) mineStat[k] = k === 'avg' ? clamp(mineStat[k] * f * (0.7 + 0.3 * injMul), 0.1, 0.5) : (Number.isInteger(mineStat[k]) ? Math.max(0, R(mineStat[k] * f * injMul)) : Math.round(mineStat[k] * f * injMul * 10) / 10); }
  const stress = s.stats.stress || 0, strMine = teamStrMine(lg, skill - (stress > 75 ? (stress - 75) / 5 : 0), st.team);
  const str = lg.teams.map((t) => (t.mine ? strMine : teamStr(lg, 0, t.name, false))), mean = str.reduce((x, y) => x + y, 0) / str.length;
  const recs = lg.teams.map((t, i) => { const w = bin(() => rnd(s), L.games, clamp(0.5 + (str[i] - mean) / 55, 0.05, 0.95)); return { i, name: t.name, mine: !!t.mine, w, l: L.games - w, str: str[i] }; }).sort((x, y) => y.w - x.w || y.str - x.str);
  recs.forEach((r, i) => { r.rank = i + 1; });
  const top = recs.slice(0, 4).map((r) => r.i), champI = (() => { const rf = () => rnd(s); return bracket(top, str, rf); })(), champion = champI === 0 || lg.teams[champI].mine;
  const me = recs.find((r) => r.mine);
  // rivals' season lines (same generator) and the player's rank in every stat
  const field = [{ id: 'me', name: s.name || 'You', team: mem.team, me: true, stats: mineStat, rookie: (m.career.yrs || 0) < 1 && (mem.level === 'pro') }].concat(lg.rivals.map((r) => ({ id: r.id, name: r.name, team: r.team, skill: r.skill, rookie: r.rookie, stats: statsFor(s, sid, r.skill, mem.level) })));
  field.forEach((p) => { p.comp = composite(sid, p.stats); }); field.sort((x, y) => y.comp - x.comp); field.forEach((p, i) => { p.rank = i + 1; });
  const rankIn = (k) => { const arr = [...field].sort((x, y) => (higherBetter(k) ? y.stats[k] - x.stats[k] : x.stats[k] - y.stats[k])); return arr.findIndex((p) => p.me) + 1; };
  const ranks = Object.fromEntries(d.stats.map((k) => [k, rankIn(k)])), meF = field.find((p) => p.me), awards = [];
  const leader = (k) => [...field].sort((x, y) => (higherBetter(k) ? y.stats[k] - x.stats[k] : x.stats[k] - y.stats[k]))[0];
  if (!injured && meF.rank === 1 && me.rank <= Math.ceil(L.teams * 0.6)) awards.push('mvp');
  if (!injured && leader(sp.statOff).me) awards.push('score'); if (sp.statDef !== sp.statOff && leader(sp.statDef).me) awards.push('defense');
  if (meF.rookie && field.filter((p) => p.rookie).sort((x, y) => y.comp - x.comp)[0].me && mem.level === 'pro') awards.push('roty');
  if (meF.rank <= Math.max(3, Math.round(field.length * 0.1)) && !injured) awards.push('allstar'); if (champion) awards.push('champion');
  const leaders = [...field].slice(0, 5).map((p) => ({ name: p.name, team: p.team, me: !!p.me, stat: p.stats[sp.statOff], comp: Math.round(p.comp * 100) / 100 }));
  const rec = { age: a, year: s.birthYear + a, sid, level: mem.level, league: lg.name, team: mem.team, w: me.w, l: me.l, rank: me.rank, teams: L.teams, champion, playoffs: me.rank <= 4, stats: mineStat, ranks, rankOverall: meF.rank, fieldSize: field.length, awards, injured, style: m.style, leaders, skill, standings: recs.slice(0, 6).map((r) => ({ name: r.name, w: r.w, l: r.l, mine: r.mine })) };
  lg.field = field.filter((p, i) => i < 10 || p.me).map((p) => ({ name: p.name, team: p.team, me: !!p.me, rank: p.rank, stats: p.stats }));
  return rec;
}
// preYear (before SS.yearTick): sim the season and let the school code use the lines. postYear: growth sync, offers, aging of rivals.
export function preYear(s) {
  const mem = membership(s); const m = ensure(s); m.last = null; if (!mem || mem.limbo) return; if (mem.level === 'school' && s.sport && s.sport.level === 'elementary') return;
  const sid = mem.sportId; if (!SPORTS[sid]) return; skillsOf(s, sid);
  const rec = simSeason(s, mem); m.last = rec; m.career.yrs = (m.career.yrs || 0) + 1; m.mark = m.mark || {}; m.mark.sp = s.sport ? s.sport.skill : null;
  m.seasons.push(rec); if (m.seasons.length > 40) m.seasons.shift();
  const st = styleDef(m.style); addStat(s, 'fame', st.fame * 0.5); addStat(s, 'happiness', st.mood);
  if (rec.injured) { addStat(s, 'health', -8); log(s, `An injury cut my ${SPORTS[sid].name.toLowerCase()} season short.`, 'health'); }
  for (const id of rec.awards) { const label = AWARD_LABEL[id]; m.awards.push({ id, label, age: rec.age, year: rec.year, sid, level: mem.level }); m.career.pts += AWARD_PTS[id] || 0; if (id === 'mvp') (s.awards = s.awards || []).push({ id: 'mvp', age: rec.age, text: 'League MVP' }); addStat(s, 'fame', id === 'champion' ? 3 : id === 'mvp' ? 5 : 2); addStat(s, 'happiness', 3); }
  if (mem.level !== 'school' || !s.sport) log(s, `${mem.team} (${rec.league}): ${rec.w}-${rec.l}, ranked ${rec.rank}/${rec.teams}${rec.champion ? ', league champions' : ''}. ${rec.awards.length ? 'Honours: ' + rec.awards.map((x) => AWARD_LABEL[x]).join(', ') + '.' : ''}`, 'sport');
}
export const seasonFor = (s) => (s.mt && s.mt.last) || null;
export function postYear(s) {
  const m = ensure(s), mem = membership(s), a = age(s);
  // rivals age, retire and are replaced
  if (m.league) { const lg = m.league; lg.rivals.forEach((r, i) => { r.age++; r.rookie = false; r.skill = clamp(R(r.skill + (r.age < 25 ? 2 : r.age < 31 ? 0.5 : -1.5) + gauss(s) * 2), 10, 97); if (r.age > 36 || (r.age > 31 && chance(s, 0.15))) Object.assign(r, newRival(s, lg.level, lg.sid, i, true), { team: r.team, mate: r.mate }); }); }
  if (mem && mem.sportId) {
    const sid = mem.sportId, sk = skillsOf(s, sid);
    if (mem.level !== 'draft' && SPORTS[sid]) { // natural growth / decline for pro, minor and racing; school growth already happened in SS.yearTick (synced below)
      if (s.sport && s.sport.id === sid && m.mark && m.mark.sp != null) { const dlt = s.sport.skill - m.mark.sp; for (const k of Object.keys(sk)) setSkill(s, sid, k, sk[k] + dlt + gauss(s) * 0.6); s.sport.skill = overall(s, sid); }
      else if (!mem.racing) { const dv = a < 27 ? 1.4 : a < 31 ? 0.3 : -1.6 - (a - 31) * 0.15; for (const k of Object.keys(sk)) setSkill(s, sid, k, sk[k] + dv * (0.6 + (s.stats.health || 50) / 100) + gauss(s) * 0.8); }
    }
    if (mem.level === 'pro' || mem.level === 'minor') makeOffers(s, mem);
  }
  const l = m.limbo; if (l && a > l.age) expireLimbo(s);
  if (!mem || mem.limbo) hofCheck(s);
  m.trainReset = a; m.mark = {};
}
function hofCheck(s) { const m = ensure(s); if (m.career.hof || age(s) < 35) return; if (m.career.pts >= 30 || m.awards.filter((x) => x.id === 'champion').length >= 4) { m.career.hof = true; m.awards.push({ id: 'hof', label: AWARD_LABEL.hof, age: age(s), year: s.birthYear + age(s), sid: (m.last || {}).sid, level: 'pro' }); addStat(s, 'fame', 10); addStat(s, 'happiness', 12); log(s, 'I was inducted into the Hall of Fame. I gave a speech and nobody had to be told to clap.', 'sport'); } }
export function retireCheck(s) { hofCheck(s); }

// ---- offers: contract, extension, trade, draft ----
const salaryBase = (s, mem) => { const j = slJob(s) || s.job; const w = j && j.wage ? j.wage : s.pro ? 600000 : 0; const lvl = { school: 0, college: 0, minor: 40000, pro: 600000 }[mem.level] || 0; return Math.max(w, lvl); };
const draftSalary = (round, level) => R((level === 'hs' ? 0.5 : 1) * ({ 1: 2.4e6, 2: 1.1e6, 3: 5.5e5 }[round] || 4e5));
const newId = (m) => (m.nextOffer = (m.nextOffer || 0) + 1);
function addOffer(s, o) { const m = ensure(s); o.id = newId(m); o.age = age(s); m.offers.push(o); return o; }
function makeOffers(s, mem) {
  const m = ensure(s); m.offers = m.offers.filter((o) => o.kind === 'draft' && o.exp >= age(s)); const lg = leagueFor(s, mem), skill = overall(s, mem.sportId);
  if (mem.level === 'pro' || mem.level === 'minor') {
    const base = salaryBase(s, mem), c = m.contract; const lastYr = !c || c.until <= age(s) + 1;
    const others = lg.teams.filter((t) => !t.mine);
    if (lastYr || chance(s, 0.4)) addOffer(s, { kind: lastYr && c ? 'extension' : 'contract', team: lastYr && c ? mem.team : others[rint(s, 0, others.length - 1)].name, salary: R(base * (0.85 + (skill - 50) / 100 + rnd(s) * 0.35)), years: rint(s, 1, 4), role: skill > 75 ? 'Starter' : 'Rotation' });
    if (chance(s, 0.35) && skill >= 50) { const t = others[rint(s, 0, others.length - 1)]; addOffer(s, { kind: 'trade', team: t.name, salary: R(base * (1.0 + rnd(s) * 0.3)), years: rint(s, 1, 3), role: 'Starter', note: `${t.name} want to trade for you. Your current team will let you decide.` }); }
  }
}
export function makeDraftOffers(s, sid, phase) {
  const m = ensure(s), sk = overall(s, sid), d = D.life.sports.draft; m.offers = m.offers.filter((o) => o.kind !== 'draft');
  const minSkill = phase === 'hs' ? 72 : d.minSkill; if (sk < minSkill) return [];
  const round = phase === 'hs' ? (sk >= 82 ? 1 : 2) : SS.draftRound(sk) || 3, n = sk >= d.round1 ? 3 : 2, out = [], used = new Set();
  for (let i = 0; i < n; i++) { let nm, g = 0; do nm = `${CITY[rint(s, 0, CITY.length - 1)]} ${MASCOT[rint(s, 0, MASCOT.length - 1)]}`; while (used.has(nm) && ++g < 30); used.add(nm); out.push(addOffer(s, { kind: 'draft', phase, team: nm, round: Math.min(3, round + (i > 1 ? 1 : 0)), pick: rint(s, round === 1 ? 1 : 12, round === 1 ? 14 : 40), salary: draftSalary(Math.min(3, round + (i > 1 ? 1 : 0)), phase), years: 3, role: 'Prospect', exp: age(s) + 1, sid })); }
  return out;
}
export function onGraduate(s, phase) { // phase 'hs' (stashed team) or 'college' (s.sport still set)
  const m = ensure(s), sid = phase === 'hs' ? (s.carry && s.carry.sport && s.carry.sport.id) : s.sport && s.sport.id; if (!sid || !SPORTS[sid]) return false;
  if (phase === 'hs' && s.carry && s.carry.sport) { const sk = skillsOf(s, sid); const sp = s.carry.sport; if (sp.skill) { const dlt = sp.skill - overall(s, sid); for (const k of Object.keys(sk)) sk[k] = clamp(R(sk[k] + dlt), 5, 99); } }
  if (phase === 'college') { if (s.sport) { const sk = skillsOf(s, sid), dlt = s.sport.skill - overall(s, sid); for (const k of Object.keys(sk)) sk[k] = clamp(R(sk[k] + dlt), 5, 99); } }
  const offs = makeDraftOffers(s, sid, phase); m.limbo = offs.length ? { sport: sid, phase, age: age(s) } : null;
  if (offs.length) log(s, `${offs.length} teams want to draft me. I read all of the offers twice.`, 'sport'); return offs.length > 0;
}
function expireLimbo(s) { const m = ensure(s), l = m.limbo; if (!l) return; const offs = m.offers.filter((o) => o.kind === 'draft'); m.limbo = null; m.offers = m.offers.filter((o) => o.kind !== 'draft'); if (offs.length) log(s, 'The draft came and went. I did not answer in time.', 'sport'); }
// act on an offer. ad = EngineAdapter (needed to put the player into the Pro Athlete job). verb: accept | decline | negotiate
export function respond(ad, offerId, verb) {
  const s = ad.s, m = ensure(s), o = m.offers.find((x) => x.id === offerId); if (!o) return { ok: false, msg: 'That offer is gone.' };
  const drop = () => { m.offers = m.offers.filter((x) => x.id !== o.id); };
  if (verb === 'decline') { drop(); if (o.kind === 'draft' && !m.offers.some((x) => x.kind === 'draft')) { m.limbo = null; log(s, 'I turned down every draft offer and the whole room went quiet.', 'sport'); } if (o.kind === 'trade') addStat(s, 'happiness', 1); return { ok: true, msg: 'Offer declined.' }; }
  if (verb === 'negotiate') { if (o.negotiated) return { ok: false, msg: 'You already pushed once. Take it or leave it.' }; o.negotiated = true; const p = clamp(0.35 + (overall(s, (membership(s) || {}).sportId || o.sid) - 55) / 100 + (s.stats.fame || 0) / 400, 0.15, 0.8);
    if (chance(s, p)) { o.salary = R(o.salary * 1.18); return { ok: true, msg: `They agreed to $${o.salary.toLocaleString('en-US')} a year.`, countered: true }; } if (chance(s, 0.3)) { drop(); return { ok: true, msg: 'They walked away from the table.', withdrawn: true }; } return { ok: true, msg: 'They would not move.', stuck: true }; }
  if (verb !== 'accept') return { ok: false, msg: 'Unknown choice.' };
  if (o.kind === 'draft') { const r = turnPro(ad, o); if (!r.ok) return r; m.offers = m.offers.filter((x) => x.kind !== 'draft'); m.limbo = null; return r; }
  const mem = membership(s); drop(); m.contract = { team: o.team, salary: o.salary, until: age(s) + o.years, years: o.years }; m.jobTeam = o.team; if (mem && mem.level !== 'draft') leagueFor(s, { ...mem, team: o.team });
  applyPay(s, o.salary); log(s, o.kind === 'trade' ? `I was traded to the ${o.team}.` : `I signed with the ${o.team}: $${o.salary.toLocaleString('en-US')} for ${o.years} year${o.years > 1 ? 's' : ''}.`, 'sport'); return { ok: true, msg: o.kind === 'trade' ? `Traded to the ${o.team}.` : `Signed with the ${o.team}.` };
}
function applyPay(s, salary) { const j = slJob(s); if (j) { j.wage = salary; if (s.job) { const c = D.careers.find((x) => x.id === s.job.id); if (c) c.levels[0][1] = salary; } } else if (s.pro) { const t = s.league && s.league.teams[s.pro.team], p = t && t.roster.find((x) => x.id === s.pro.pid); if (p) p.sal = salary; } }
function turnPro(ad, o) {
  const s = ad.s, m = ensure(s), sid = o.sid; const sd = D.sOcc.special.find((x) => x.id === 'athlete'); if (!sd) return { ok: false, msg: 'Pro careers are not available.' };
  if (s.school === 'college') return { ok: false, msg: 'Finish or leave college first.' };
  const step = o.phase === 'hs' ? 1 : 2, st = sd.steps[step]; const sl = B.pull(s);
  sl.job = { kind: 'special', special: 'athlete', id: st.id, title: st.title, wage: o.salary, years: 0, yearsInLevel: 0, step, sector: 'special' }; B.push(s);
  m.jobSport = sid; m.proSport = sid; m.contract = { team: o.team, salary: o.salary, until: age(s) + o.years, years: o.years }; m.jobTeam = o.team; m.league = null; s.sport = null; s.carry = null; s.pending = (s.pending || []).filter((p) => p.kind !== 'college');
  log(s, `I was drafted by the ${o.team} (round ${o.round}, pick ${o.pick}) and signed for $${o.salary.toLocaleString('en-US')}. I cried on live television.`, 'sport'); addStat(s, 'fame', 8); addStat(s, 'happiness', 14);
  return { ok: true, msg: `Drafted by the ${o.team}.` };
}

// ---- views ----
const fmtStat = (k, v) => (k === 'avg' ? v.toFixed(3).slice(1) : typeof v === 'number' && !Number.isInteger(v) ? v.toFixed(1) : String(v));
export function career(s, sid) { const m = ensure(s), rows = m.seasons.filter((x) => x.sid === sid), d = defOf(sid), tot = {}; if (!rows.length) return null; for (const k of d.stats) { const v = rows.map((r) => r.stats[k]); tot[k] = k === 'avg' || k === 'ppg' || k === 'rpg' || k === 'apg' ? v.reduce((a, b) => a + b, 0) / v.length : k === 'best100' ? Math.min(...v) : v.reduce((a, b) => a + b, 0); }
  return { seasons: rows.length, w: rows.reduce((a, r) => a + r.w, 0), l: rows.reduce((a, r) => a + r.l, 0), titles: rows.filter((r) => r.champion).length, totals: tot }; }
export function view(s) {
  const m = ensure(s), mem = membership(s); if (!mem) return { onTeam: false, awards: m.awards, hof: m.career.hof };
  const sid = mem.sportId, sp = SPORTS[sid], d = defOf(sid), sk = skillsOf(s, sid), tr = trainState(s), last = [...m.seasons].reverse().find((x) => x.sid === sid) || null, lg = m.league && m.league.sid === sid ? m.league : null, tc = mem.limbo ? null : titleChance(s);
  const cost = trainCost(s, mem), ca = career(s, sid), stLabel = (k) => STAT_LABEL[k] || k;
  const line = (r) => r ? d.stats.map((k) => ({ key: k, label: stLabel(k), value: fmtStat(k, r.stats[k]), rank: r.ranks ? r.ranks[k] : null })) : [];
  const tot = ca ? d.stats.map((k) => ({ key: k, label: stLabel(k), value: fmtStat(k, ca.totals[k]) })) : [];
  return { onTeam: true, kind: mem.kind, level: mem.level, levelLabel: mem.limbo ? 'Draft prospect' : (LEVELS[mem.level] || {}).label, sportId: sid, sport: sp.name, icon: sp.icon, team: mem.team, position: mem.position, league: mem.limbo ? '' : leagueName(sid, mem.level), limbo: !!mem.limbo, overall: overall(s, sid),
    skills: sp.skills.map((n) => ({ name: n, value: R(sk[n]), trained: tr.list.includes(n), offense: sp.off.includes(n), defense: sp.def.includes(n) })), train: { used: tr.list.length, cap: TRAIN_CAP, list: [...tr.list], cost, lowest: lowestSkills(s) },
    style: m.style, styles: STYLES.map((x) => ({ id: x.id, name: x.name, note: x.note })), styleChosen: m.styleYear === age(s), titleChance: tc, last, lastLine: line(last), career: ca, careerLine: tot, careerPts: m.career.pts, hof: m.career.hof, awards: [...m.awards].reverse(), contract: m.contract ? { ...m.contract } : null, salary: salaryBase(s, mem), history: [...m.seasons].filter((x) => x.sid === sid).reverse().slice(0, 12), field: lg && lg.field ? lg.field : [], offers: m.offers.map((o) => ({ ...o })), cash: R(s.cash), stress: s.stats.stress || 0 };
}
export const headline = (s) => { const v = ensure(s); return v; };

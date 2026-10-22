// Sports coaching & management: study sports/coaching, then coach a team you do not own (assistant -> head). Transfers, stadium & gear,
// style & training, season review, and a quarterly interactive mode with a top-down match you can watch or skip.
import * as MT from './myteam.js';
import { D } from './data.js';
import { rnd, rint, pick, chance, clamp, gauss } from './rng.js';
import { log, earn } from './core.js';
import * as Ev from './events.js';

const C = () => D.coaching;
const age = (s) => Math.floor(s.age);
const rr = (a, b) => a + Math.floor(Math.random() * 0) + 0 * b; // (unused placeholder to keep tree-shaking quiet)
void rr;
export function ensure(s) { if (!s.coach) s.coach = { active: false, role: null, sportId: null, years: 0, headYears: 0, style: 'balanced', training: 'tactics', stadium: 0, gear: 0, budget: 0, conf: 60, team: null, league: [], market: [], season: null, mode: 'auto', hist: [], reviews: [], titles: 0, last: null, match: null, wins: 0, losses: 0, draws: 0 }; return s.coach; }
const degrees = (s) => (s.sl && s.sl.edu && s.sl.edu.degrees) || {};
export const hasDegree = (s) => Object.values(degrees(s)).some((d) => d && (d.major === 'Sports Science' || d.major === 'Coaching'));
export const exPlayer = (s) => { const y = MT.playingYears(s); return !!(y.pro > 0 || y.college > 0 || (s.flags && (s.flags.ex_pro || s.flags.ex_college)) || (s.sport && s.sport.seasons && s.sport.seasons.length >= 2)); };
const proExp = (s) => MT.playingYears(s).pro > 0 || !!(s.flags && s.flags.ex_pro);
export function expLabel(s) { const y = MT.playingYears(s); if (y.pro) return `Yes (${y.pro} yr${y.pro > 1 ? 's' : ''} pro${y.active ? ', still playing' : ''})`; if (y.college) return `Yes (${y.college} yr${y.college > 1 ? 's' : ''} college)`; return exPlayer(s) ? 'Yes' : 'No'; }
const needYears = (s) => Math.max(1, 3 - (hasDegree(s) ? 1 : 0) - (proExp(s) ? 1 : 0));

export function eligible(s) {
  const c = ensure(s); if (c.active) return 'You already coach a team.'; if (age(s) < 21) return 'Coaches must be 21+.'; if (s.prison) return 'Not from prison.'; if (s.pro || MT.jobIsAthlete(s)) return 'You are still playing. Retire & start coaching below.'; if (s.school && s.edu < 3) return 'Finish school first.';
  if (!hasDegree(s) && !exPlayer(s)) return 'Study Sports Science or Coaching (Education), or play school, college or pro sports first.'; return '';
}
// ---------- teams ----------
const ovrOf = (p) => p.ovr;
const lineN = (c) => C().sports[c.sportId].lineup;
// Per-sport position groups (data/coaching.json sports[id].positions, in on-field order). Older saves used GK/DF/MF/FW for every sport.
export const positionsOf = (sportId) => (C().sports[sportId] && C().sports[sportId].positions) || [{ id: 'ALL', name: 'Players', w: 1 }];
function pickPos(s, sportId) { const ps = positionsOf(sportId), tot = ps.reduce((a, p) => a + p.w, 0); let r = rnd(s) * tot; for (const p of ps) { r -= p.w; if (r < 0) return p.id; } return ps[ps.length - 1].id; }
const LEGACY = { GK: 0, DF: 1, MF: 2, FW: 3 };
export function normPos(sportId, pos) { const ps = positionsOf(sportId); if (ps.some((p) => p.id === pos)) return pos; const i = LEGACY[pos]; if (i == null) return ps[ps.length - 1].id; if (sportId === 'soccer') return ps[i].id; const map = { basketball: ['C', 'F', 'G', 'F'], football: ['K', 'DB', 'OL', 'OFF'], baseball: ['C', 'IF', 'P', 'OF'], hockey: ['G', 'D', 'F', 'F'] }[sportId]; return (map && map[i]) || ps[Math.min(i, ps.length - 1)].id; }
export function migratePositions(s) { const c = s.coach; if (!c || !c.sportId) return; for (const t of c.league || []) for (const p of t.players || []) p.pos = normPos(c.sportId, p.pos); for (const p of c.market || []) p.pos = normPos(c.sportId, p.pos); }
// Squad grouped by position (on-field order), best rated first within each group.
export function groupSquad(sportId, players) { return positionsOf(sportId).map((g) => { const ps = players.filter((p) => normPos(sportId, p.pos) === g.id).sort((a, b) => b.ovr - a.ovr || a.age - b.age); return { id: g.id, name: g.name, count: ps.length, avg: ps.length ? Math.round(ps.reduce((a, p) => a + p.ovr, 0) / ps.length) : 0, players: ps }; }); }
export function genPlayer(s, base, young) { const a = young ? rint(s, 18, 22) : rint(s, 20, 34); const o = clamp(Math.round(base + gauss(s) * 7), 30, 97); return { id: Math.floor(rnd(s) * 1e9), name: pick(s, D.firstNames) + ' ' + pick(s, D.lastNames), pos: pickPos(s, (s.coach && s.coach.sportId) || 'soccer'), age: a, ovr: o, pot: clamp(o + (a < 26 ? rint(s, 0, 12) : 0), 30, 99), morale: 60 }; }
const price = (p) => Math.round((Math.pow(Math.max(0, p.ovr - 35), 2) * 900 + 20000) * (p.age < 25 ? 1.2 : p.age > 31 ? 0.6 : 1));
const strOf = (t, n) => { const top = [...t.players].sort((a, b) => b.ovr - a.ovr).slice(0, n); return top.reduce((a, p) => a + p.ovr, 0) / Math.max(1, top.length); };
function mkTeam(s, id, name, base, n) { const players = []; for (let i = 0; i < 16; i++) players.push(genPlayer(s, base, i > 11)); return { id, name, players, str: 0 }; }
function teamName(s, used) { for (let g = 0; g < 30; g++) { const n = pick(s, C().cities) + ' ' + pick(s, C().mascots); if (!used.has(n)) { used.add(n); return n; } } return 'Team ' + used.size; }
function refreshMarket(s) { const c = ensure(s); const base = strOf(c.league[0] || { players: [{ ovr: 55 }] }, 8); c.market = []; for (let i = 0; i < 6; i++) { const p = genPlayer(s, base + rint(s, -8, 12), chance(s, 0.4)); p.price = price(p); c.market.push(p); } }
function newSeason(s) { const c = ensure(s); const n = c.league.length; c.season = { y: age(s), q: 0, w: 0, l: 0, d: 0, gf: 0, ga: 0, results: [], table: c.league.map((t) => ({ id: t.id, name: t.name, pts: 0, gd: 0, w: 0 })), opp: pickOpp(s) }; void n; }
const pickOpp = (s) => { const c = ensure(s); return 1 + Math.floor(rnd(s) * (c.league.length - 1)); };
export const myStrength = (s) => { const c = ensure(s); if (!c.team) return 0; const g = C().gear[c.gear].b; return strOf(c.team, lineN(c)) + g + (c.role === 'head' ? 1.5 : 0.5) + (hasDegree(s) ? 2 : 0) + (c.training === 'fitness' ? 0.5 : 0) + (c.team.players.reduce((a, p) => a + p.morale, 0) / c.team.players.length - 60) / 15; };

export function take(s, sportId, opts = {}) {
  if (opts.retire && (s.pro || MT.jobIsAthlete(s))) { if (age(s) < 21) return { ok: false, msg: 'Coaches must be 21+.' }; MT.retirePlayer(s); }
  const c = ensure(s), why = eligible(s); if (why) return { ok: false, msg: why }; const sp = C().sports[sportId]; if (!sp) return { ok: false, msg: 'Pick a sport.' };
  const head = proExp(s) && chance(s, Math.min(0.6, 0.35 + MT.playingYears(s).pro * 0.01 + (s.stats.fame || 0) / 400)) ? 'head' : 'assistant'; // famous ex-pros sometimes land the top job
  c.sportId = sportId; const used = new Set(); const league = []; const mine = mkTeam(s, 0, teamName(s, used), 50 + rint(s, -4, 6)); league.push(mine); for (let i = 1; i < 8; i++) league.push(mkTeam(s, i, teamName(s, used), 48 + rint(s, 0, 16)));
  Object.assign(c, { active: true, role: head, sportId, years: 0, headYears: 0, style: 'balanced', training: 'tactics', stadium: 0, gear: 0, budget: 900000, conf: 60, team: mine, league, mode: 'auto', last: null }); c.league.forEach((t) => (t.str = Math.round(strOf(t, sp.lineup))));
  refreshMarket(s); newSeason(s); log(s, `I took a job as ${C().roles[head].name} of the ${mine.name} (${sp.name}).`, 'job'); return { ok: true, msg: `You are now ${C().roles[head].name} of the ${mine.name}.` };
}
export function quit(s) { const c = ensure(s); if (!c.active) return { ok: false, msg: 'No team.' }; log(s, `I left the ${c.team.name} after ${c.years} year(s) as ${C().roles[c.role].name}.`, 'job'); c.hist.push({ team: c.team.name, role: c.role, years: c.years, titles: c.titles }); c.active = false; c.role = null; c.team = null; c.season = null; return { ok: true, msg: 'You left the club.' }; }
export function promote(s) { const c = ensure(s); if (!c.active || c.role !== 'assistant') return { ok: false, msg: 'Not available.' }; if (c.years < needYears(s)) return { ok: false, msg: `Needs ${needYears(s)} years as assistant (${c.years} so far).` }; if (c.conf < 40) return { ok: false, msg: 'The board does not trust you yet.' }; c.role = 'head'; c.conf = Math.max(c.conf, 60); log(s, `I was promoted to Head Coach of the ${c.team.name}.`, 'job'); return { ok: true, msg: 'You are the Head Coach.' }; }
const headOnly = (c) => (c.active && c.role === 'head' ? '' : 'Only the head coach decides that.');
export function setPlan(s, style, training) { const c = ensure(s), w = headOnly(c); if (w) return { ok: false, msg: w }; if (style) { if (!C().styles.some((x) => x.id === style)) return { ok: false, msg: 'Unknown style.' }; c.style = style; } if (training) { if (!C().training.some((x) => x.id === training)) return { ok: false, msg: 'Unknown training.' }; c.training = training; } return { ok: true, msg: 'Plan set.' }; }
export function setMode(s, mode) { const c = ensure(s), w = headOnly(c); if (w) return { ok: false, msg: w }; c.mode = mode === 'interactive' ? 'interactive' : 'auto'; return { ok: true, msg: c.mode === 'interactive' ? 'Interactive: you play each quarter.' : 'Auto: seasons run when you age up.' }; }
// ---------- transfers, stadium, gear ----------
export function buy(s, id) { const c = ensure(s), w = headOnly(c); if (w) return { ok: false, msg: w }; const i = c.market.findIndex((p) => p.id === id); if (i < 0) return { ok: false, msg: 'Gone.' }; const p = c.market[i]; if (c.team.players.length >= 20) return { ok: false, msg: 'Squad is full (20).' }; if (c.budget < p.price) return { ok: false, msg: 'Club budget too low.' }; c.budget -= p.price; c.market.splice(i, 1); delete p.price; p.morale = 70; c.team.players.push(p); return { ok: true, msg: `Signed ${p.name} (${p.ovr}).` }; }
export function sell(s, id) { const c = ensure(s), w = headOnly(c); if (w) return { ok: false, msg: w }; if (c.team.players.length <= 12) return { ok: false, msg: 'Keep at least 12 players.' }; const i = c.team.players.findIndex((p) => p.id === id); if (i < 0) return { ok: false, msg: 'No such player.' }; const p = c.team.players.splice(i, 1)[0]; const v = Math.round(price(p) * 0.8); c.budget += v; return { ok: true, msg: `Sold ${p.name} for ${v.toLocaleString('en-US')}.` }; }
export function upgrade(s, what) { const c = ensure(s), w = headOnly(c); if (w) return { ok: false, msg: w }; const list = what === 'stadium' ? C().stadium : what === 'gear' ? C().gear : null; if (!list) return { ok: false, msg: 'Unknown.' }; const n = what === 'stadium' ? c.stadium : c.gear; if (n + 1 >= list.length) return { ok: false, msg: 'Already the best.' }; const it = list[n + 1]; if (c.budget < it.cost) return { ok: false, msg: 'Club budget too low.' }; c.budget -= it.cost; c[what] = n + 1; return { ok: true, msg: `${it.name} built.` }; }
export function donate(s, amt) { const c = ensure(s); if (!c.active) return { ok: false, msg: 'No team.' }; amt = Math.floor(amt); if (!(amt > 0) || s.cash < amt) return { ok: false, msg: 'Not enough cash.' }; s.cash -= amt; c.budget += amt; c.conf = clamp(c.conf + 2, 0, 100); return { ok: true, msg: 'You added to the club budget from your own pocket.' }; }
// ---------- matches ----------
const poisson = (s, l) => { let k = 0, p = Math.exp(-l), x = p, u = rnd(s); while (u > x && k < 14) { k++; p *= l / k; x += p; } return k; };
function halfLambdas(s, oppIdx, styleId) {
  const c = ensure(s), sp = C().sports[c.sportId], st = C().styles.find((x) => x.id === styleId) || C().styles[1], opp = c.league[oppIdx], me = myStrength(s), op = opp.str + 1;
  const diff = (me - op) / 40, base = 1.35 * sp.goalScale, tac = c.training === 'tactics' ? 1.06 : 1, counter = styleId === 'counter' && op > me ? 1.15 : 1;
  return { me, op, lm: clamp(base * Math.exp(diff * 0.7) * st.atk * tac * counter, 0.15, 9 * sp.goalScale) / 2, lo: clamp(base * Math.exp(-diff * 0.7) / (st.def * tac), 0.15, 9 * sp.goalScale) / 2 };
}
// one half of a match: goals as {t, side} with t in 2..48 (first half) or 52..98 (second half)
export function simHalf(s, oppIdx, styleId, half) {
  const L = halfLambdas(s, oppIdx, styleId), a = poisson(s, L.lm), b = poisson(s, L.lo), lo = half === 1 ? 2 : 52, hi = half === 1 ? 48 : 98, goals = [];
  for (let i = 0; i < a; i++) goals.push({ t: rint(s, lo, hi), side: 0 }); for (let i = 0; i < b; i++) goals.push({ t: rint(s, lo, hi), side: 1 });
  return { a, b, goals: goals.sort((x, y) => x.t - y.t), me: L.me, op: L.op };
}
// full match: first half with `styleId`, second half with `htStyle` (halftime change; defaults to the same style). `pre` = an already-played first half.
export function simMatch(s, oppIdx, styleId, htStyle = null, pre = null) {
  const c = ensure(s), opp = c.league[oppIdx], h1 = pre || simHalf(s, oppIdx, styleId, 1), st2 = htStyle || styleId, h2 = simHalf(s, oppIdx, st2, 2), seed = Math.floor(rnd(s) * 1e9), a = h1.a + h2.a, b = h1.b + h2.b;
  return { opp: oppIdx, oppName: opp.name, a, b, seed, goals: [...h1.goals, ...h2.goals], style: styleId, style2: st2, ht: { a: h1.a, b: h1.b, style: styleId, changed: st2 !== styleId }, me: Math.round(h1.me), op: Math.round(h1.op), result: a > b ? 'W' : a < b ? 'L' : 'D' };
}
function aiGame(s, i, j) { const c = ensure(s), sp = C().sports[c.sportId], d = (c.league[i].str - c.league[j].str) / 40, base = 1.35 * sp.goalScale; return [poisson(s, base * Math.exp(d * 0.7)), poisson(s, base * Math.exp(-d * 0.7))]; }
function record(c, i, a, b) { const r = c.season.table.find((t) => t.id === i); r.gd += a - b; r.pts += a > b ? 3 : a === b ? 1 : 0; if (a > b) r.w++; }
function playRound(s, mine) { // one league round: my game (given) + 3 AI games
  const c = ensure(s), S = c.season, others = c.league.map((t) => t.id).filter((i) => i !== 0 && i !== mine.opp); const ai = others.slice().sort(() => rnd(s) - 0.5);
  record(c, 0, mine.a, mine.b); record(c, mine.opp, mine.b, mine.a);
  for (let k = 0; k + 1 < ai.length; k += 2) { const [a, b] = aiGame(s, ai[k], ai[k + 1]); record(c, ai[k], a, b); record(c, ai[k + 1], b, a); }
  S.gf += mine.a; S.ga += mine.b; if (mine.a > mine.b) S.w++; else if (mine.a < mine.b) S.l++; else S.d++; S.results.push({ q: S.q, opp: mine.oppName, a: mine.a, b: mine.b, r: mine.result });
}
export function playQuarter(s, styleId, htStyle = null) { // 3 games: the quarter's major game + 2 regular games, all with the chosen style
  const c = ensure(s); if (!c.active) return { ok: false, msg: 'No team.' }; if (!c.season) newSeason(s); const S = c.season; if (S.q >= 4) return { ok: false, msg: 'The season is over. Age up for the next one.' };
  if (styleId && c.role === 'head') c.style = styleId; const st = c.role === 'head' ? c.style : 'balanced'; const q = S.q, games = [];
  for (let g = 0; g < 3; g++) { const oi = g === 0 && S.opp ? S.opp : pickOpp(s); const pend = g === 0 && c.half && c.half.opp === oi ? c.half : null; const m = pend ? simMatch(s, oi, pend.style, htStyle || pend.style, pend) : simMatch(s, oi, st, g === 0 ? htStyle : null); m.opp = oi; games.push(m); playRound(s, m); }
  c.half = null;
  S.q++; S.opp = pickOpp(s); c.match = games[0]; c.last = { q, games: games.map((g) => ({ opp: g.oppName, a: g.a, b: g.b, r: g.result })) };
  const w = games.filter((g) => g.result === 'W').length; c.team.players.forEach((p) => (p.morale = clamp(p.morale + (w >= 2 ? 3 : w === 0 ? -4 : 0) + (c.training === 'rest' ? 2 : 0), 20, 100))); c.conf = clamp(c.conf + (w - 1.2) * 3, 0, 100);
  return { ok: true, msg: `${C().quarters[q]}: ${w} win${w === 1 ? '' : 's'} from 3. Major game: ${games[0].a}-${games[0].b} vs ${games[0].oppName}.`, match: c.match };
}
// Interactive: play only the first half of this quarter's major game, see the halftime score, then call playQuarter(s, style1, secondHalfStyle).
export function playHalf(s, styleId) {
  const c = ensure(s); if (!c.active) return { ok: false, msg: 'No team.' }; if (c.role !== 'head') return { ok: false, msg: 'Only the head coach picks tactics.' }; if (!c.season) newSeason(s); const S = c.season; if (S.q >= 4) return { ok: false, msg: 'The season is over.' }; if (c.half) return { ok: false, msg: 'First half already played. Pick the second-half tactic.' };
  if (!C().styles.some((x) => x.id === styleId)) return { ok: false, msg: 'Unknown style.' }; c.style = styleId; const h = simHalf(s, S.opp, styleId, 1); c.half = { opp: S.opp, style: styleId, ...h }; const opp = c.league[S.opp];
  return { ok: true, msg: `Halftime: ${h.a}-${h.b} vs ${opp.name}. Choose your second-half tactic.`, half: { a: h.a, b: h.b, oppName: opp.name, style: styleId } };
}
// ---------- watchable top-down match (render-only, never touches the game RNG) ----------
const lr = (seed) => { let t = seed >>> 0; return () => { t += 0x6d2b79f5; let x = Math.imul(t ^ (t >>> 15), 1 | t); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; };
export function frames(match, nMe = 6, nOp = 6) { // [{t, ball:[x,y], me:[[x,y]], op:[[x,y]], score:[a,b], goal:side|null}] on a 0..1 pitch, my team attacks right
  const r = lr(match.seed), out = [], base = (n, side) => Array.from({ length: n }, (_, i) => [side === 0 ? 0.18 + 0.5 * (i % 3) / 2 : 0.82 - 0.5 * (i % 3) / 2, (i + 1) / (n + 1)]); const me = base(nMe, 0), op = base(nOp, 1);
  let ball = [0.5, 0.5], sc = [0, 0], gi = 0, held = 0;
  for (let t = 0; t <= 100; t++) {
    const g = match.goals[gi]; let goal = null;
    if (g && t >= g.t) { goal = g.side; gi++; sc[g.side]++; ball = g.side === 0 ? [0.985, 0.5] : [0.015, 0.5]; held = 5; }
    else if (held > 0) { held--; if (held === 0) ball = [0.5, 0.5]; }
    else { const next = match.goals[gi], tx = next ? (next.side === 0 ? 0.85 : 0.15) : 0.5 + (r() - 0.5) * 0.5; ball = [clamp(ball[0] + (tx - ball[0]) * 0.18 + (r() - 0.5) * 0.12, 0.03, 0.97), clamp(ball[1] + (r() - 0.5) * 0.2, 0.05, 0.95)]; }
    const move = (arr, side) => arr.map(([x, y], i) => { const hx = side === 0 ? 0.18 + 0.5 * (i % 3) / 2 : 0.82 - 0.5 * (i % 3) / 2, hy = (i + 1) / ((side === 0 ? nMe : nOp) + 1); return [clamp(hx + (ball[0] - 0.5) * 0.5 + (r() - 0.5) * 0.05, 0.03, 0.97), clamp(hy + (ball[1] - 0.5) * 0.25 + (r() - 0.5) * 0.05, 0.04, 0.96)]; });
    out.push({ t, ball: ball.slice(), me: move(me, 0), op: move(op, 1), score: sc.slice(), goal, ht: t === 50 });
  }
  return out;
}
// ---------- the year ----------
function review(s) {
  const c = ensure(s), S = c.season; if (!S) return null; const table = S.table.slice().sort((a, b) => b.pts - a.pts || b.gd - a.gd), pos = table.findIndex((t) => t.id === 0) + 1, champ = pos === 1;
  const best = c.team.players.slice().sort((a, b) => b.ovr - a.ovr)[0], pay = Math.round(C().roles[c.role].pay * (1 + 0.0 * c.years)) + (c.role === 'head' ? Math.max(0, S.w - 6) * 15000 : 0) + (champ ? 100000 : 0);
  const gate = Math.round(C().stadium[c.stadium].gate * (500000 + S.w * 60000 + (champ ? 300000 : 0)) * (1 + s.stats.fame / 200)), sponsors = Math.round(200000 + c.conf * 4000);
  const rev = { gate, sponsors, salary: pay }; c.budget += gate + sponsors - Math.round(c.team.players.reduce((a, p) => a + p.ovr * 2500, 0) * 0.4);
  earn(s, pay); if (champ) { c.titles++; s.stats.fame = clamp(s.stats.fame + 6, 0, 100); } c.wins += S.w; c.losses += S.l; c.draws += S.d; c.conf = clamp(c.conf + (champ ? 15 : pos <= 3 ? 5 : pos >= 7 ? -14 : -3), 0, 100); s.stats.fame = clamp(s.stats.fame + (pos <= 3 ? 1 : 0), 0, 100);
  const rep = { year: S.y, age: age(s), team: c.team.name, role: c.role, w: S.w, l: S.l, d: S.d, gf: S.gf, ga: S.ga, pos, champion: champ, best: best ? { name: best.name, ovr: best.ovr } : null, revenue: rev, conf: Math.round(c.conf), notes: [champ ? 'League champions!' : pos <= 3 ? 'A podium finish.' : pos >= 7 ? 'A season to forget.' : 'A mid-table season.', S.gf - S.ga >= 10 ? 'The attack was brilliant.' : S.ga - S.gf >= 10 ? 'The defence leaked.' : 'A balanced team.'] };
  c.reviews.push(rep); if (c.reviews.length > 12) c.reviews.shift(); c.last = null; return rep;
}
export function yearTick(s) {
  const c = s.coach; if (!c || !c.active) return; const sp = C().sports[c.sportId];
  if (!c.season) newSeason(s); while (c.season.q < 4) playQuarter(s, c.role === 'head' ? c.style : 'balanced'); // unfinished (or auto) seasons finish themselves
  const rep = review(s); c.years++; if (c.role === 'head') c.headYears++;
  // player development / ageing; AI teams drift
  const dev = c.training === 'skills' ? 1.4 : 1; for (const p of c.team.players) { p.age++; const grow = p.age < 27 ? (p.pot - p.ovr) * 0.25 * dev + 0.5 : p.age > 31 ? -rnd(s) * 3.5 : 0; p.ovr = clamp(Math.round(p.ovr + grow + gauss(s)), 30, 99); p.morale = clamp(p.morale + (c.training === 'rest' ? 6 : 0) - 2, 20, 100); if (p.age > 36 && chance(s, 0.5)) p.retire = true; }
  c.team.players = c.team.players.filter((p) => !p.retire); while (c.team.players.length < 13) c.team.players.push(genPlayer(s, 48 + rint(s, 0, 10), true));
  for (const t of c.league) { if (t.id === 0) continue; for (const p of t.players) { p.age++; p.ovr = clamp(Math.round(p.ovr + (p.age < 27 ? 1.5 : p.age > 31 ? -2 : 0) + gauss(s) * 2), 30, 99); } t.players = t.players.filter((p) => p.age < 36); while (t.players.length < 14) t.players.push(genPlayer(s, 50 + rint(s, 0, 12), true)); t.str = Math.round(strOf(t, sp.lineup)); }
  c.league[0].str = Math.round(strOf(c.league[0], sp.lineup)); refreshMarket(s); newSeason(s);
  if (c.role === 'assistant' && c.years >= needYears(s) && c.conf >= 50) { log(s, 'The board hinted that the head coach job could be mine. (Work > Coaching > Promote)', 'job'); }
  log(s, `Season review (${rep.team}): ${rep.w}W-${rep.l}L-${rep.d}D, finished #${rep.pos}${rep.champion ? ' and won the league' : ''}.`, 'job');
  if (c.active && chance(s, 0.14)) Ev.queue(s, 'coach_feud'); else if (c.active && c.role === 'head' && chance(s, 0.07)) Ev.queue(s, 'coach_poach');
  if (c.conf < 15 && chance(s, 0.7)) { log(s, `The ${c.team.name} board fired me after a poor run.`, 'job'); c.hist.push({ team: c.team.name, role: c.role, years: c.years, titles: c.titles, fired: true }); c.active = false; c.role = null; c.team = null; c.season = null; }
}
export function eventFx(s, v) { const c = ensure(s); if (!c.active) return; if (v.conf) c.conf = clamp(c.conf + v.conf, 0, 100); if (v.budget) c.budget += v.budget; if (v.morale) c.team.players.forEach((p) => (p.morale = clamp(p.morale + v.morale, 20, 100))); if (v.fame) s.stats.fame = clamp(s.stats.fame + v.fame, 0, 100); }
export const headline = (s) => (s.coach && s.coach.active ? C().roles[s.coach.role].name : null);
export function status(s) {
  const c = ensure(s), why = eligible(s), sp = c.sportId && C().sports[c.sportId], S = c.season; if (c.active) migratePositions(s);
  const base = { eligible: !why, why, hasDegree: hasDegree(s), exPlayer: exPlayer(s), expLabel: expLabel(s), stillPlaying: !!(s.pro || MT.jobIsAthlete(s)), canRetireCoach: !!(s.pro || MT.jobIsAthlete(s)) && age(s) >= 21 && !c.active, sports: Object.entries(C().sports).map(([id, x]) => ({ id, name: x.name, icon: x.icon })), styles: C().styles, training: C().training, hist: c.hist, titles: c.titles, active: c.active };
  if (!c.active) return { ...base, reviews: c.reviews.slice(-5) };
  const table = S ? S.table.slice().sort((a, b) => b.pts - a.pts || b.gd - a.gd) : [];
  return { ...base, role: c.role, roleName: C().roles[c.role].name, sport: { id: c.sportId, name: sp.name, icon: sp.icon, formations: sp.formations, positions: positionsOf(c.sportId).map((p) => ({ id: p.id, name: p.name })) }, team: { name: c.team.name, strength: Math.round(myStrength(s)), players: c.team.players.slice().sort((a, b) => b.ovr - a.ovr).map((p) => ({ id: p.id, name: p.name, pos: p.pos, age: p.age, ovr: p.ovr, pot: p.pot, morale: Math.round(p.morale), value: price(p) })), groups: groupSquad(c.sportId, c.team.players).map((g) => ({ ...g, players: g.players.map((p) => ({ id: p.id, name: p.name, pos: p.pos, age: p.age, ovr: p.ovr, pot: p.pot, morale: Math.round(p.morale), value: price(p) })) })) }, years: c.years, needYears: needYears(s), canPromote: c.role === 'assistant' && c.years >= needYears(s), style: c.style, trainingId: c.training, mode: c.mode, budget: Math.round(c.budget), conf: Math.round(c.conf), stadium: { ...C().stadium[c.stadium], level: c.stadium, next: C().stadium[c.stadium + 1] || null }, gear: { ...C().gear[c.gear], level: c.gear, next: C().gear[c.gear + 1] || null },
    market: c.market.map((p) => ({ id: p.id, name: p.name, pos: p.pos, age: p.age, ovr: p.ovr, pot: p.pot, price: p.price })), season: S ? { q: S.q, quarters: C().quarters, w: S.w, l: S.l, d: S.d, gf: S.gf, ga: S.ga, nextOpp: S.q < 4 ? c.league[S.opp].name : null, nextOppStr: S.q < 4 ? c.league[S.opp].str : null, results: S.results, done: S.q >= 4 } : null, table: table.map((t, i) => ({ pos: i + 1, name: c.league[t.id].name, pts: t.pts, gd: t.gd, me: t.id === 0 })), last: c.last, half: c.half ? { a: c.half.a, b: c.half.b, oppName: c.league[c.half.opp].name, style: c.half.style } : null, match: c.match ? { ...c.match } : null, reviews: c.reviews.slice(-5), wins: c.wins, losses: c.losses, draws: c.draws, league: c.league.map((t) => ({ name: t.name, str: t.str })) };
}

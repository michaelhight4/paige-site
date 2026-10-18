// Abstract basketball-like league: rosters, season sim, trades, replay frames, interactive finals.
import { D } from './data.js';
import { rnd, rint, pick, gauss, chance, clamp, wpick } from './rng.js';
import { log, earn } from './core.js';
import { sectorMult } from './market.js';

export const ROUNDS = 14, POSS = 40;
const POS = ['PG', 'SG', 'SF', 'PF', 'C'];
const RK = ['sh', 'pa', 'de', 're', 'at', 'iq'];
export const RNAME = { sh: 'Shooting', pa: 'Passing', de: 'Defense', re: 'Rebound', at: 'Athletic', iq: 'IQ' };
const W = { PG: { pa: .3, sh: .25, iq: .2, at: .15, de: .1 }, SG: { sh: .35, at: .2, pa: .15, iq: .15, de: .15 }, SF: { sh: .25, at: .25, de: .2, iq: .15, re: .15 },
  PF: { re: .25, de: .2, at: .2, sh: .2, iq: .15 }, C: { re: .3, de: .25, at: .2, iq: .15, sh: .1 } };
const BIAS = { PG: { pa: 8, sh: 2, re: -8, de: -2 }, SG: { sh: 8, re: -6, pa: 0 }, SF: {}, PF: { re: 6, sh: -4, pa: -4 }, C: { re: 10, de: 6, sh: -10, pa: -6 } };

const WA = Object.fromEntries(Object.entries(W).map(([pos, w]) => [pos, Object.entries(w)]));
export const ovr = (p) => { let a = 0; for (const [k, w] of WA[p.pos]) a += w * p.r[k]; return Math.round(a); };
export function genPlayer(s, tier, pos, young) {
  const age = young ? rint(s, 19, 22) : rint(s, 20, 33), r = {};
  for (const k of RK) r[k] = clamp(Math.round(tier + (BIAS[pos][k] || 0) + gauss(s) * 7), 25, 99);
  const p = { id: Math.floor(rnd(s) * 1e9), name: pick(s, D.firstNames) + ' ' + pick(s, D.lastNames), pos, age, r, pot: 0, sal: 0 };
  p.pot = clamp(ovr(p) + (age < 26 ? rint(s, 0, 14) : 0), 30, 99);
  p.sal = salaryOf(p); return p;
}
export const salaryOf = (p) => Math.round(Math.pow(Math.max(0, ovr(p) - 40), 2) * 2500 + 300000);
export function tradeValue(p) {
  const o = ovr(p), ageF = p.age > 30 ? Math.max(0.3, 1 - 0.09 * (p.age - 30)) : 1, potF = p.age < 26 ? 1 + (p.pot - o) / 60 : 1;
  return (o * o * o) / 5000 * ageF * potF;
}
function genRoster(s, tier) { const ps = []; for (let i = 0; i < 9; i++) ps.push(genPlayer(s, tier, POS[i % 5], false)); return ps; }
export const starters = (t) => [...t.roster].sort((a, b) => ovr(b) - ovr(a)).slice(0, 5);
export const strength = (t) => { const st = starters(t), bench = t.roster.filter((p) => !st.includes(p)); return st.reduce((a, p) => a + ovr(p), 0) / 5 * 0.85 + (bench.length ? bench.reduce((a, p) => a + ovr(p), 0) / bench.length : 40) * 0.15; };

export function initLeague(s) {
  const teams = D.teamNames.map((name, i) => ({ id: i, name, roster: genRoster(s, 52 + rint(s, 0, 14)), w: 0, l: 0, pf: 0, pa: 0, titles: 0 }));
  s.league = { teams, season: 1, round: 0, prog: 0, my: -1, games: [], history: [], fa: [], finals: null, champ: null };
  genSchedule(s); refreshFA(s);
}
function genSchedule(s) { // circle method, double round robin (14 rounds)
  const n = 8, ids = [...Array(n).keys()], rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs = [];
    for (let i = 0; i < n / 2; i++) { const a = ids[i], b = ids[n - 1 - i]; pairs.push(r % 2 ? [b, a] : [a, b]); }
    rounds.push(pairs); ids.splice(1, 0, ids.pop());
  }
  s.league.schedule = [...rounds, ...rounds.map((rd) => rd.map(([a, b]) => [b, a]))];
}
export function refreshFA(s) {
  s.league.fa = []; for (let i = 0; i < 6; i++) s.league.fa.push(genPlayer(s, 40 + rint(s, 0, 15), pick(s, POS), chance(s, 0.4)));
}

// ---- game simulation ----
function pickShooter(s, st) { return wpick(s, st.map((p, i) => i), (i) => Math.pow(ovr(st[i]), 2)); }
const offS = (st) => st.reduce((a, p) => a + p.r.sh * .4 + p.r.pa * .2 + p.r.iq * .2 + p.r.at * .2, 0) / 5;
const defS = (st) => st.reduce((a, p) => a + p.r.de * .5 + p.r.re * .2 + p.r.at * .15 + p.r.iq * .15, 0) / 5;
export function possession(s, off, def, so = starters(off), sd = starters(def)) { // standard auto possession -> {k, sh, pts}
  const O = offS(so), Dd = defS(sd);
  if (chance(s, clamp(0.13 + (Dd - O) / 400, 0.05, 0.3))) return { k: chance(s, 0.5) ? 'st' : 'to', sh: pickShooter(s, so), pts: 0 };
  const sh = pickShooter(s, so), three = chance(s, 0.28 + (so[sh].r.sh - 60) / 300);
  const pm = (three ? 0.36 : 0.5) + (so[sh].r.sh - 60) / 250 + (O - Dd) / 250;
  const made = chance(s, clamp(pm, 0.15, 0.8));
  if (!made && chance(s, clamp(0.25 + (offReb(so) - offReb(sd)) / 400, 0.1, 0.45))) return { k: three ? 'm3' : 'm2', sh, pts: 0, oreb: true, more: true };
  return { k: (made ? '' : 'm') + (three ? '3' : '2'), sh, pts: made ? (three ? 3 : 2) : 0 };
}
const offReb = (st) => st.reduce((a, p) => a + p.r.re, 0) / 5;
function snapRoster(t) { // starters first (by OVR), then bench: the shape the event log needs
  const st = starters(t), bench = t.roster.filter((p) => !st.includes(p));
  return [...st, ...bench].map((p) => ({ id: 'p' + p.id, name: p.name, pos: p.pos, ovr: ovr(p) }));
}
export function simGame(s, h, a, record) {
  const sc = [0, 0], poss = [], box = [{}, {}], teams = [h, a], sts = [starters(h), starters(a)];
  const one = (o) => {
    let again = true;
    while (again) {
      const r = possession(s, teams[o], teams[1 - o], sts[o], sts[1 - o]); again = !!r.more;
      sc[o] += r.pts; const nm = sts[o][r.sh]?.name; if (r.pts) box[o][nm] = (box[o][nm] || 0) + r.pts;
      if (record) poss.push({ o, k: r.k, sh: r.sh, pts: r.pts, oreb: !!r.more, seed: Math.floor(rnd(s) * 2147483647) });
    }
  };
  for (let i = 0; i < POSS; i++) for (const o of [0, 1]) one(o);
  let ot = 0; while (sc[0] === sc[1] && ot++ < 12) for (const o of [0, 1]) one(o); // overtime pairs are recorded too, so replay score == sim score
  if (sc[0] === sc[1]) { sc[0]++; if (record) poss.push({ o: 0, k: 'ft', sh: 0, pts: 1, seed: 1 }); }
  return { hs: sc[0], as: sc[1], poss, box, ros: record ? [snapRoster(h), snapRoster(a)] : null };
}
function playRound(s) {
  const L = s.league, pairs = L.schedule[L.round];
  for (const [hi, ai] of pairs) {
    const h = L.teams[hi], a = L.teams[ai], mine = hi === L.my || ai === L.my;
    const g = simGame(s, h, a, mine);
    h.pf += g.hs; h.pa += g.as; a.pf += g.as; a.pa += g.hs;
    if (g.hs > g.as) { h.w++; a.l++; } else { a.w++; h.l++; }
    if (mine) {
      L.games.push({ kind: 'game', season: L.season, round: L.round + 1, home: h.name, away: a.name, hi, ai, hs: g.hs, as: g.as, poss: g.poss, box: g.box, ros: g.ros, mineHome: hi === L.my });
      if (L.games.length > 4) L.games.shift();
    }
  }
  L.round++;
}
export const standings = (s) => [...s.league.teams].sort((a, b) => b.w - a.w || (b.pf - b.pa) - (a.pf - a.pa));

export function tickLeague(s, dt) {
  const L = s.league; L.prog += dt * ROUNDS;
  while (L.round < Math.floor(L.prog + 1e-9) && L.round < ROUNDS) playRound(s);
  if (L.round >= ROUNDS && !L.finals) endRegularSeason(s);
}
function endRegularSeason(s) {
  const L = s.league, st = standings(s), top = st.slice(0, 4);
  const play = (x, y) => { const g = simGame(s, x, y, false); return g.hs > g.as ? x : y; };
  const w1 = play(top[0], top[3]), w2 = play(top[1], top[2]);
  const [a, b] = [w1, w2].sort((x, y) => st.indexOf(x) - st.indexOf(y));
  const mine = L.my >= 0 && (a.id === L.my || b.id === L.my);
  L.finals = { a: a.id, b: b.id, mine, sc: [0, 0], n: 0, log: [], opts: null, done: false, poss: [], ros: null };
  if (mine) { const me = L.teams[L.my], opp = L.teams[a.id === L.my ? b.id : a.id]; L.finals.ros = [snapRoster(me), snapRoster(opp)]; log(s, 'Your team reached the finals! Choose the play calls.', 'sports'); newOpts(s); }
  else finishFinals(s, autoWinner(s, a, b));
}
function autoWinner(s, a, b) { const g = simGame(s, a, b, false); return g.hs > g.as ? a.id : b.id; }

// ---- interactive finals (live event log: each player possession is preceded by a play_call) ----
export const PLAYS = D.plays;
const avg = (arr, k) => arr.reduce((a, p) => a + p.r[k], 0) / arr.length;
function newOpts(s) { const f = s.league.finals, ids = Object.keys(PLAYS), n = rint(s, 3, 4); f.opts = []; while (f.opts.length < n) { const k = pick(s, ids); if (!f.opts.includes(k)) f.opts.push(k); } }
function myPossession(s, playId, so, sd) {
  const P = PLAYS[playId], statV = P.max ? Math.max(...so.map((x) => x.r[P.stats[0]])) : P.stats.reduce((a, k) => a + avg(so, k), 0) / P.stats.length;
  const p = clamp(P.base + (statV - defS(sd)) / P.div, 0.15, 0.85);
  const sh = P.shooter ? so.reduce((bi, x, i) => (x.r[P.shooter] > so[bi].r[P.shooter] ? i : bi), 0) : pickShooter(s, so), seed = Math.floor(rnd(s) * 2147483647);
  if (chance(s, P.to)) return { o: 0, k: 'to', sh, pts: 0, seed, play: playId };
  const made = chance(s, p);
  return { o: 0, k: (made ? '' : 'm') + (P.pts === 3 ? '3' : '2'), sh, pts: made ? P.pts : 0, seed, play: playId };
}
export function finalsPlay(s, playId) {
  const L = s.league, f = L.finals; if (!f || f.done || !f.mine || !f.opts.includes(playId)) return null;
  const me = L.teams[L.my], opp = L.teams[f.a === L.my ? f.b : f.a], so = starters(me), sd = starters(opp);
  const mine = myPossession(s, playId, so, sd); mine.call = { options: [...f.opts], chosen: playId };
  const r = possession(s, opp, me, sd, so), theirs = { o: 1, k: r.k, sh: r.sh, pts: r.pts, oreb: !!r.more, seed: Math.floor(rnd(s) * 2147483647) };
  f.sc[0] += mine.pts; f.sc[1] += theirs.pts; f.poss.push(mine, theirs); f.n++;
  f.log.push(`${PLAYS[playId].name}: ${mine.k === 'to' ? 'turnover!' : mine.pts ? 'SCORE +' + mine.pts : 'missed.'} | ${theirs.pts ? 'Opp +' + theirs.pts : 'Opp stopped'}`);
  if (f.n >= 20 && f.sc[0] !== f.sc[1]) { finishFinals(s, f.sc[0] > f.sc[1] ? L.my : (f.a === L.my ? f.b : f.a)); return f.log.at(-1); }
  if (f.n >= 32) { const ft = { o: f.sc[0] <= f.sc[1] ? 0 : 1, k: 'ft', sh: 0, pts: 1, seed: 1 }; f.sc[ft.o]++; f.poss.push(ft); finishFinals(s, f.sc[0] > f.sc[1] ? L.my : (f.a === L.my ? f.b : f.a)); return f.log.at(-1); }
  newOpts(s); return f.log.at(-1);
}
export function finalsAuto(s) { const f = s.league.finals; while (f && !f.done) { if (!f.mine) break; finalsPlay(s, f.opts[0]); } }
function finishFinals(s, champId) {
  const L = s.league, f = L.finals, champ = L.teams[champId];
  champ.titles++; f.done = true; L.champ = champ.name;
  L.history.push({ season: L.season, champion: champ.name, finalists: [L.teams[f.a].name, L.teams[f.b].name] });
  log(s, `Season ${L.season} champions: ${champ.name}.`, 'sports');
  const biz = s.biz.find((b) => b.kind === 'sports');
  if (biz) {
    const rec = L.teams[L.my];
    biz.rep = clamp(biz.rep + (champId === L.my ? 12 : f.mine ? 4 : rec.w > rec.l ? 1 : -2), 0, 100);
    if (champId === L.my) { earn(s, 5e6); biz.fame = clamp((biz.fame || 0) + 6, 0, 100); (s.fx ||= []).push({ biz: biz.id, title: true }); log(s, 'Your team won the title! +$5M prize and rep.', 'sports'); }
  }
  L.lastFinals = f.mine ? { poss: f.poss, ros: f.ros, mine: true, season: L.season, home: L.teams[L.my].name, away: L.teams[f.a === L.my ? f.b : f.a].name, hs: f.sc[0], as: f.sc[1] } : null;
  newSeason(s);
}
function newSeason(s) {
  const L = s.league; L.season++; L.round = 0; L.prog = 0; L.finals = null;
  for (const t of L.teams) {
    t.w = t.l = t.pf = t.pa = 0;
    for (const p of t.roster) { // development
      p.age++; const d = p.age < 25 ? rint(s, 0, 3) : p.age <= 30 ? rint(s, -1, 1) : -rint(s, 0, 3);
      for (const k of RK) p.r[k] = clamp(p.r[k] + d + (chance(s, 0.3) ? rint(s, -1, 1) : 0), 25, 99);
      p.sal = salaryOf(p);
    }
    t.roster = t.roster.filter((p) => !(p.age > 35 && ovr(p) < 62));
    while (t.roster.length < 9) t.roster.push(genPlayer(s, 45 + rint(s, 0, 14), POS[t.roster.length % 5], true));
  }
  genSchedule(s); refreshFA(s);
}

// ---- trades / signings ----
export function proposeTrade(s, giveIds, teamIdx, getIds) {
  const L = s.league, me = L.teams[L.my], th = L.teams[teamIdx];
  const give = me.roster.filter((p) => giveIds.includes(p.id) && !p.you), get = th.roster.filter((p) => getIds.includes(p.id));
  if (!give.length || !get.length) return { ok: false, msg: 'Pick players on both sides.' };
  const vg = give.reduce((a, p) => a + tradeValue(p), 0), vt = get.reduce((a, p) => a + tradeValue(p), 0);
  if (me.roster.length - give.length + get.length < 7) return { ok: false, msg: 'Roster too small.' };
  if (vg < vt * 1.05) return { ok: false, msg: `Rejected (they value your offer ${vg.toFixed(1)} vs ${vt.toFixed(1)}).` };
  me.roster = me.roster.filter((p) => !give.includes(p)).concat(get); th.roster = th.roster.filter((p) => !get.includes(p)).concat(give);
  while (th.roster.length < 7) th.roster.push(genPlayer(s, 45, POS[th.roster.length % 5], true));
  return { ok: true, msg: 'Trade accepted.' };
}
export function signFA(s, id) {
  const L = s.league, me = L.teams[L.my], i = L.fa.findIndex((p) => p.id === id);
  if (i < 0 || me.roster.length >= 12) return false; me.roster.push(L.fa.splice(i, 1)[0]); return true;
}
export function releasePlayer(s, id) { const me = s.league.teams[s.league.my]; if (me.roster.length <= 7 || me.roster.find((p) => p.id === id)?.you) return false; me.roster = me.roster.filter((p) => p.id !== id); return true; }

// ---- business hooks ----
export const teamPrice = (s, t) => Math.round(25e6 + (strength(t) - 55) * 1.2e6 + t.titles * 3e6);
export function bizFinance(s, biz) {
  const t = s.league.teams[biz.teamIdx], gp = Math.max(1, t.w + t.l), wp = t.w + t.l ? t.w / gp : 0.5;
  const sm = sectorMult(s, 'media'), repM = 0.7 + 0.6 * biz.rep / 100;
  const revenue = (20e6 + 30e6 * wp) * repM * sm, wages = t.roster.reduce((a, p) => a + p.sal, 0), rent = 14e6;
  return { revenue, wages, rent, cogs: 0, upkeep: 0, profit: revenue - wages - rent, units: 0 };
}

// ---- event-log v1 emitter (see lifesim_replay/SPEC.md). Generated on demand from compact possession records + their seeds. ----
const SPOTS = [[0.62, 0.5], [0.6, 0.22], [0.6, 0.78], [0.74, 0.32], [0.78, 0.62]]; // formation (attack right)
const LANE_Y = [0.5, 0.25, 0.75, 0.36, 0.64];
const shortOf = (n) => n.split(' ').pop().slice(0, 3).toUpperCase();
export function buildEventLog(g, opts = {}) {
  const T = [0, 1].map((i) => ({ name: i ? g.away : g.home }));
  const N = g.poss.length, Q = opts.duration || 2880, slot = Q / Math.max(N, 1), ev = [];
  const colors = [D.teamColors[(g.hi ?? 0) % 8], D.teamColors[(g.ai ?? 1) % 8]];
  if (colors[0][0] === colors[1][0]) colors[1] = D.teamColors[(((g.ai ?? 1) + 3) % 8)];
  const ids = g.ros.map((r) => r.map((p) => p.id));
  const meta = { title: opts.title || `${g.home} vs ${g.away}`, sport: 'basketball', field: { w: 28, h: 15, unit: 'm' }, duration: Q, default_rate: opts.rate || 30, periods: 4, finals: !!g.finals,
    teams: [0, 1].map((i) => ({ id: i ? 'away' : 'home', name: T[i].name, short: shortOf(T[i].name), color: colors[i][0], color2: colors[i][1], attack: i ? 'left' : 'right',
      roster: g.ros[i].map((p, k) => ({ id: p.id, num: k + 4 + (k % 3) * 3, pos: p.pos, name: p.name.split(' ').pop(), x: k < 5 ? SPOTS[k][0] : 0.5, y: k < 5 ? SPOTS[k][1] : 0.95, bench: k >= 5 })) })) };
  const tm = (o) => (o ? 'away' : 'home'), dirOf = (o) => (o === 0 ? 1 : -1), hoop = (o) => (o === 0 ? 0.93 : 0.07);
  let ball = [0.5, 0.5];
  g.poss.forEach((r, i) => {
    const R = { rs: r.seed }, jit = (a = 0.02) => (rnd(R) - 0.5) * 2 * a, t0 = i * slot, at = (f) => +(t0 + f * slot).toFixed(2);
    const o = r.o, d = dirOf(o), off = ids[o], de = ids[1 - o], hx = hoop(o), team = tm(o), other = tm(1 - o);
    const spot = (k, depth = 0.22) => [clamp(hx - d * depth + jit(), 0.04, 0.96), clamp(LANE_Y[k] + jit(0.03), 0.05, 0.95)];
    if (i > 0 && i % Math.max(1, Math.round(N / 4)) === 0 && i / Math.round(N / 4) <= 3) ev.push({ t: +(t0 - 0.01).toFixed(2), type: 'period_end', team, period: i / Math.round(N / 4), text: `End of quarter ${i / Math.round(N / 4)}` });
    if (r.call) { // finals: play call overlay before the user's possession; routes resolved to player ids
      const mk = (id) => { const P = PLAYS[id]; return { id, name: P.name, desc: P.desc, routes: P.routes.map((ro) => ({ player: off[ro.slot], kind: ro.kind, pts: ro.pts })), arrows: P.arrows || [] }; };
      ev.push({ t: at(0), type: 'play_call', team, dur: slot * 0.9, text: 'Play call', call: { chosen: r.call.chosen, options: r.call.options.map(mk) } });
    }
    const dr = (k) => off[k];
    // ball enters from the end of the last event; walk up court, circulate, shoot, resolve
    const start = [clamp(ball[0] + d * 0.12, 0.05, 0.95), clamp(ball[1], 0.2, 0.8)], hand = (r.sh + 1) % 5, mid = (r.sh + 2) % 5;
    ev.push({ t: at(0.04), type: i === 0 ? 'kickoff' : 'dribble', team, actor: dr(hand), x: start[0], y: start[1], text: i === 0 ? 'Tip-off' : undefined });
    const frontStart = d * (start[0] - 0.5) > 0.12;
    if (!frontStart) ev.push({ t: at(0.2), type: 'dribble', team, actor: dr(hand), x: 0.5 + d * 0.04, y: 0.5 + jit(0.08) });
    if (r.k === 'to' || r.k === 'st') {
      const loc = [clamp(0.5 + d * (0.05 + rnd(R) * 0.2), 0.1, 0.9), 0.5 + jit(0.2)];
      ev.push({ t: at(0.5), type: 'dribble', team, actor: dr(hand), x: loc[0], y: loc[1] });
      ev.push({ t: at(0.7), type: r.k === 'st' ? 'steal' : 'turnover', team: other, actor: de[r.sh % 5], x: loc[0] + d * 0.02, y: loc[1], text: r.k === 'st' ? 'Stolen!' : 'Turnover' });
      ball = [loc[0], loc[1]]; return;
    }
    const p1 = spot(hand, 0.28), p2 = spot(mid, 0.25), ps = spot(r.sh, r.k.endsWith('3') ? 0.22 : 0.1);
    ev.push({ t: at(0.4), type: 'pass', team, actor: dr(hand), target: dr(mid), x: p1[0], y: p1[1] });
    ev.push({ t: at(0.56), type: 'pass', team, actor: dr(mid), target: dr(r.sh), x: p2[0], y: p2[1] });
    const made = !r.k.startsWith('m') && r.k !== 'ft';
    ev.push({ t: at(0.74), type: 'shot', team, actor: dr(r.sh), x: ps[0], y: ps[1], outcome: made ? 'made' : 'missed', text: `${made ? '' : 'Missed '}${r.k.endsWith('3') ? 'three' : 'two'}-pointer` });
    if (r.pts > 0) { ev.push({ t: at(0.82), type: 'goal', team, actor: dr(r.sh), target: dr(mid), x: hx, y: 0.5, points: r.pts, text: r.k === 'ft' ? 'Free throw' : `${r.pts} points!` }); ball = [hx, 0.5]; }
    else { // miss: rebound by defence (or by the offence when oreb)
      const rb = [hx - d * 0.05 + jit(), 0.5 + jit(0.15)], tmr = r.oreb ? team : other, who = r.oreb ? off[(r.sh + 3) % 5] : de[(r.sh + 4) % 5];
      ev.push({ t: at(0.84), type: 'rebound', team: tmr, actor: who, x: rb[0], y: rb[1], text: r.oreb ? 'Offensive rebound' : 'Defensive rebound' }); ball = rb;
    }
  });
  const last = ev.at(-1); ev.push({ t: Math.max(Q, last ? last.t + 1 : Q), type: 'period_end', team: 'home', period: 4, text: 'Final' });
  meta.duration = ev.at(-1).t;
  return { version: 1, meta, events: ev };
}
// Finals log: past possessions + a pending play_call (options only) while the user must choose.
export function finalsLog(s) {
  const L = s.league, f = L.finals, g = f && !f.done ? f : null, src = g || L.lastFinals; if (!src) return null;
  const me = L.teams[L.my]?.name, a = g ? me : src.home, b = g ? L.teams[f.a === L.my ? f.b : f.a].name : src.away;
  const game = { kind: 'finals', finals: true, home: a, away: b, hi: L.my, ai: g ? (f.a === L.my ? f.b : f.a) : 0, ros: src.ros, poss: src.poss.slice() };
  const pendingOpts = g ? f.opts : null;
  const log = buildEventLog(game, { title: `FINALS - ${a} vs ${b}`, rate: 15, duration: Math.max(1200, (game.poss.length + (pendingOpts ? 2 : 0)) * 30) });
  if (pendingOpts) { // append the pending call just after the last event
    const last = log.events.filter((e) => e.type !== 'period_end').at(-1), t = (last ? last.t : 0) + 3, off = src.ros[0].map((p) => p.id);
    const mk = (id) => { const P = PLAYS[id]; return { id, name: P.name, desc: P.desc, routes: P.routes.map((ro) => ({ player: off[ro.slot], kind: ro.kind, pts: ro.pts })), arrows: P.arrows || [] }; };
    log.events = log.events.filter((e) => !(e.type === 'period_end' && e.t >= t - 1));
    log.events.push({ t, type: 'play_call', team: 'home', dur: 20, text: 'Your play call', call: { chosen: pendingOpts[0], options: pendingOpts.map(mk) } });
    log.meta.duration = t + 12; log.events.push({ t: t + 12, type: 'period_end', team: 'home', period: 4, text: '...' });
  }
  return log;
}

// ---- school-sports draft: a college player enters the existing pro league (see schoolsports.js) ----
export function addDraftee(s, o) { // o: {name, ovr, round}
  const L = s.league, st = standings(s), worst = [...st].reverse();
  const team = o.round === 1 ? wpick(s, worst, (t) => 1 + (worst.length - worst.indexOf(t)) * 0.5) : pick(s, L.teams);
  const pos = pick(s, POS), r = {};
  for (const k of RK) r[k] = clamp(Math.round(o.ovr + (BIAS[pos][k] || 0) + gauss(s) * 4), 25, 99);
  const p = { id: Math.floor(rnd(s) * 1e9), name: o.name, pos, age: 21, r, pot: 0, sal: 0, you: true };
  p.pot = clamp(ovr(p) + rint(s, 0, 8), 30, 99); p.sal = Math.round(salaryOf(p) * (o.round === 1 ? 1.4 : 0.8));
  const worstP = [...team.roster].filter((x) => !x.you).sort((a, b) => ovr(a) - ovr(b))[0];
  if (worstP) { team.roster = team.roster.filter((x) => x !== worstP); L.fa.push(worstP); }
  team.roster.push(p);
  return { team: L.teams.indexOf(team), teamName: team.name, player: p, pick: 1 + worst.indexOf(team) + (o.round - 1) * L.teams.length };
}

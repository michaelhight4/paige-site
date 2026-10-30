// Aurelith Games (dev/sports-major, Oct 29 2026): the major. Pure logic, no DOM. Built on town_cup.js rules:
// unlocks after winning the cup in 4 of the 6 towns; held every 9 in-game days; 500 gold to enter; one entry per Games.
// 3 rounds, each a random town event (seeded per Games, all different). Three strong rivals post a score per round.
// Points per round 10 / 6 / 4 / 2; most points after 3 rounds wins 3000 gold (x difficulty money) and the Aurelith badge.
// Ties go to the rivals (same as the cups: you have to beat them).
import { EVENTS, eventById } from './town_events.js?v=v0.2.100-alpha';
import { tug } from './tug.js?v=v0.2.100-alpha';
import { cupState, RIVAL_SPECIES, RIVAL_TRAINERS } from './town_cup.js?v=v0.2.100-alpha';
import { rollRivalAthletics } from './athletics.js?v=v0.2.100-alpha';
import { rngFor } from './rng.js?v=v0.2.100-alpha';
import { awardMerit } from './merit.js?v=v0.2.100-alpha';

export const MAJOR = { fee: 500, prize: 3000, everyDays: 9, offset: 4, rounds: 3, needTowns: 4, rivals: 3, points: [10, 6, 4, 2] };
export const MAJOR_POOL = [...EVENTS, tug];
const d0 = (day) => Math.max(0, day | 0);
export const isMajorDay = (day) => d0(day) % MAJOR.everyDays === MAJOR.offset;
export const majorDaysUntil = (day) => (MAJOR.offset - (d0(day) % MAJOR.everyDays) + MAJOR.everyDays) % MAJOR.everyDays;
export const majorWindow = (day) => Math.floor((d0(day) + MAJOR.everyDays - MAJOR.offset) / MAJOR.everyDays);
export const townsWon = (sstate) => EVENTS.filter((ev) => (sstate?.town?.[ev.id]?.cups || 0) > 0).length;
export const majorUnlocked = (sstate) => townsWon(sstate) >= MAJOR.needTowns;
export function majorState(sstate) { const m = (sstate.major ||= {}); m.wins ??= 0; m.entries ??= 0; m.window ??= -1; return m; }

/** -> {ok:true} | {ok:false, reason:'locked'|'not_today'|'entered'|'gold', days, towns} */
export function canEnterMajor({ day, coins, sstate }) {
  const m = majorState(sstate), towns = townsWon(sstate);
  if (towns < MAJOR.needTowns) return { ok: false, reason: 'locked', towns, days: majorDaysUntil(day) };
  if (!isMajorDay(day)) return { ok: false, reason: 'not_today', days: majorDaysUntil(day), towns };
  if (m.window === majorWindow(day)) return { ok: false, reason: 'entered', days: MAJOR.everyDays, towns };
  if ((coins ?? 0) < MAJOR.fee) return { ok: false, reason: 'gold', days: 0, towns };
  return { ok: true, towns };
}
export function payMajor({ day, wallet, sstate }) {
  if (!canEnterMajor({ day, coins: wallet?.coins, sstate }).ok || !wallet.spend(MAJOR.fee)) return false;
  const m = majorState(sstate); m.window = majorWindow(day); m.entries++; return true;
}
/** the three events for this Games (distinct, seeded by the Games window) */
export function roundsFor(day) {
  const r = rngFor(`major:rounds:${majorWindow(day)}`), pool = [...MAJOR_POOL], out = [];
  while (out.length < MAJOR.rounds && pool.length) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0].id);
  return out;
}
const evOf = (id) => (id === tug.id ? tug : eventById(id));
const KEY = { garden_hop: ['agility', 'focus'], tide_run: ['agility', 'speed'], signal_relay: ['focus', 'stamina'], ice_slide: ['agility', 'focus'], lantern_catch: ['agility', 'speed'], forge_push: ['power', 'stamina'], tug_of_war: ['power', 'stamina'] };
/** three strong rivals with one score per round (a major field sits higher between the bronze and gold bars than a cup field) */
export function majorField(day, rounds = roundsFor(day)) {
  const w = majorWindow(day), r = rngFor(`major:field:${w}`), used = new Set(), out = [];
  for (let i = 0; i < MAJOR.rivals; i++) {
    let sp; do { sp = RIVAL_SPECIES[Math.floor(r() * RIVAL_SPECIES.length)]; } while (used.has(sp)); used.add(sp);
    const a = rollRivalAthletics(sp, `major:${w}:${i}`);
    const scores = rounds.map((id) => { const ev = evOf(id), [g, , b] = ev.bars, k = KEY[id], q = k.reduce((s, x) => s + (a.q[x] ?? 0.5), 0) / k.length;
      return Math.max(0, Math.round(b + (g - b) * (0.3 + 0.8 * q) + (r() - 0.5) * (g - b) * 0.3)); });
    out.push({ trainer: RIVAL_TRAINERS[(Math.floor(r() * RIVAL_TRAINERS.length) + i) % RIVAL_TRAINERS.length], species: sp, scores, rival: 0.45 + 0.4 * (a.q.power ?? 0.5) });
  }
  return out;
}
/** ranks one round; returns [{me, idx, score, pts}] best first (ties go to rivals) */
export function scoreRound(round, myScore, field) {
  const rows = [...field.map((x, idx) => ({ me: false, idx, score: x.scores[round] })), { me: true, idx: -1, score: myScore }]
    .sort((a, b) => b.score - a.score || (a.me ? 1 : -1));
  rows.forEach((x, i) => (x.pts = MAJOR.points[i] ?? 0)); return rows;
}
/** standings after the rounds played so far: myScores[] (one per played round) -> [{me, idx, pts}] best first */
export function standings(myScores, field) {
  const tot = new Map([[-1, 0], ...field.map((_, i) => [i, 0])]);
  myScores.forEach((sc, round) => scoreRound(round, sc, field).forEach((x) => tot.set(x.idx, tot.get(x.idx) + x.pts)));
  return [...tot].map(([idx, pts]) => ({ me: idx === -1, idx, pts })).sort((a, b) => b.pts - a.pts || (a.me ? 1 : -1));
}
export function settleMajor({ myScores, field, wallet, sstate, mult = 1 }) {
  const table = standings(myScores, field), place = table.findIndex((x) => x.me) + 1, m = majorState(sstate);
  let prize = 0; if (place === 1) { m.wins++; prize = wallet ? wallet.add(Math.round(MAJOR.prize * mult)) : 0; }
  const merit = awardMerit(sstate, 'major', place); // merit points by place (src/sports/merit.js)
  return { place, table, prize, wins: m.wins, merit };
}
export { evOf as majorEvent, cupState };

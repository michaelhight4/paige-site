// Kilumen Olympics (dev/olympics, Coder Oct 30 2026; Gary pt2571u + scope change). Pure logic, no DOM.
// A competition = THREE events in a row. Before it starts each entrant assigns one different Kilu to each event (the
// player taps; AI rivals use autoAssign). Event score = weighted athletic stats (athletics.js) + a little level + a small
// seeded random (deterministic per venue/day/entrant/event). Each event is ranked: 1st 3 pts, 2nd 2, 3rd 1, 4th 0.
// TIES: equal scores (to 0.1) inside an event share the better place's points. Final standings: most points; then most
//   event wins; then highest summed event score; then the rival is placed ahead of the player (house rule, as in the cups).
// DOORS: a town's Olympics opens once that town's Battle Hall is won once (cupHallFlag, the hotfix rule). Aurelith (the
//   major, no hall) opens once every town's Olympics has been won once. Coins (all_badges) never gate the Olympics:
//   the 8-coin gate is only the Aurelith Arena (elite fighters). One entry per venue per in-game day, free entry.
// REWARDS (small): 1st = gold (town 300, Aurelith 1500, x difficulty money) + merit by place (MERIT_PTS.oly / oly_major)
//   + a first-win story flag oly_won_<venue> (set by the UI through scene.setFlag).
import { rollRivalAthletics, speciesAthletics } from './athletics.js?v=v0.2.107-alpha';
import { STATS } from './rules.js?v=v0.2.107-alpha';
import { rngFor } from './rng.js?v=v0.2.107-alpha';
import { awardMerit } from './merit.js?v=v0.2.107-alpha';
import { CUP_HALL, cupHallFlag } from './town_cup.js?v=v0.2.107-alpha';
import { RIVAL_SPECIES, RIVAL_TRAINERS } from './town_cup.js?v=v0.2.107-alpha';

export const OLY = { points: [3, 2, 1, 0], rivals: 3, rivalTeam: 4, prize: { town: 300, aurelith: 1500 }, lvW: 0.3, luck: 6 };
/** event id -> stat weights (sum 1). Signature events first in each town mix. */
export const OLY_EVENTS = {
  sprint: { w: { speed: 0.7, stamina: 0.3 } }, hurdles: { w: { agility: 0.6, speed: 0.4 } }, lift: { w: { power: 0.8, stamina: 0.2 } },
  marathon: { w: { stamina: 0.8, focus: 0.2 } }, archery: { w: { focus: 0.8, agility: 0.2 } }, swim: { w: { stamina: 0.5, speed: 0.5 } },
  hop: { w: { agility: 0.6, focus: 0.4 } }, haul: { w: { power: 0.7, stamina: 0.3 } }, relay: { w: { focus: 0.6, stamina: 0.4 } },
  slide: { w: { agility: 0.5, speed: 0.5 } }, catch: { w: { agility: 0.5, focus: 0.5 } }, push: { w: { power: 0.6, stamina: 0.4 } },
};
export const VENUES = {
  fernwick: ['hop', 'sprint', 'archery'], saltmere: ['haul', 'swim', 'sprint'], revival_heights: ['relay', 'archery', 'hurdles'],
  frostspire: ['slide', 'marathon', 'lift'], mirefen: ['sprint', 'hurdles', 'marathon'], tidewater: ['swim', 'haul', 'archery'], lanternport: ['catch', 'swim', 'marathon'], cindervale: ['push', 'lift', 'hurdles'],
  aurelith: ['sprint', 'lift', 'marathon'],
};
// launch-content (Gary 1:47 AM Oct 31): every region's tournament town hosts an Olympics; its first event is its own
// signature event and no two towns share one. Mirefen (R5) and Tidewater (R6) join via an Olympics host NPC.
export const OLY_HALL = { ...CUP_HALL, mirefen: 'mirefen', tidewater: 'tidewater' };
export const TOWN_VENUES = Object.keys(OLY_HALL);
export const SIGNATURE = Object.fromEntries(TOWN_VENUES.map((v) => [v, VENUES[v][0]]));
export const wonFlag = (venue) => `oly_won_${venue}`;
const has = (flags, f) => !!flags && (typeof flags.has === 'function' ? flags.has(f) : !!flags[f]);
export const doorFlags = (venue) => (venue === 'aurelith' ? TOWN_VENUES.map(wonFlag) : [`beat_master_${OLY_HALL[venue]}`]);
export const doorOpen = (venue, flags) => !!VENUES[venue] && doorFlags(venue).every((f) => has(flags, f));
export function olyState(sstate, venue) { const o = ((sstate.oly ||= {})[venue] ||= {}); o.wins ??= 0; o.entries ??= 0; o.day ??= -1; return o; }
/** -> {ok:true} | {ok:false, reason:'locked'|'team'|'entered', need:[flags], missing:n} */
export function canEnterOly({ venue, flags, teamSize, day, sstate }) {
  if (!doorOpen(venue, flags)) { const need = doorFlags(venue); return { ok: false, reason: 'locked', need, missing: need.filter((f) => !has(flags, f)).length }; }
  if ((teamSize | 0) < 3) return { ok: false, reason: 'team' };
  if (olyState(sstate, venue).day === (day | 0)) return { ok: false, reason: 'entered' };
  return { ok: true };
}
/** score of a Kilu (stats {speed..}, level) in event id; seed string -> deterministic */
export function eventScore(id, stats, level, seed) {
  const w = OLY_EVENTS[id].w, base = Object.entries(w).reduce((s, [k, x]) => s + x * (stats?.[k] ?? 50), 0);
  return Math.round((base + OLY.lvW * (level || 1) + rngFor(`oly:${seed}:${id}`)() * OLY.luck) * 10) / 10;
}
const fit = (id, stats) => Object.entries(OLY_EVENTS[id].w).reduce((s, [k, x]) => s + x * (stats?.[k] ?? 50), 0);
/** AI / default assignment: events in order, each takes the best still-free Kilu for it. kilu: [{stats}] -> [index per event] */
export function autoAssign(events, kilu) {
  const used = new Set();
  return events.map((id) => { let best = -1, bv = -Infinity; kilu.forEach((k, i) => { if (!used.has(i) && fit(id, k.stats) > bv) { bv = fit(id, k.stats); best = i; } }); used.add(best); return best; });
}
/** an assignment is valid when it names 3 different, existing Kilu */
export const validAssign = (a, n) => Array.isArray(a) && a.length === 3 && new Set(a).size === 3 && a.every((i) => Number.isInteger(i) && i >= 0 && i < n);
/** tap rule helper: put Kilu k into event slot e; if k sat in another slot, the two swap. */
export function assignTap(a, e, k) { const out = [...a], j = out.indexOf(k); if (j >= 0 && j !== e) out[j] = out[e]; out[e] = k; return out; }
const statsFrom = (sp, q) => { const R = speciesAthletics(sp).ranges, o = {}; for (const s of STATS) { const [lo, hi] = R[s]; o[s] = Math.round(lo + q[s] * (hi - lo)); } return o; };
/** rivals for venue+day: [{trainer, kilu:[{species, level, stats}], assign}] (deterministic) */
export function olyRivals(venue, day, level) {
  const r = rngFor(`oly:rivals:${venue}:${day | 0}`), major = venue === 'aurelith', out = [], tr = new Set();
  for (let i = 0; i < OLY.rivals; i++) {
    let name; do { name = RIVAL_TRAINERS[Math.floor(r() * RIVAL_TRAINERS.length)]; } while (tr.has(name)); tr.add(name);
    const pool = [...RIVAL_SPECIES], kilu = [];
    for (let k = 0; k < OLY.rivalTeam; k++) { const sp = pool.splice(Math.floor(r() * pool.length), 1)[0];
      const a = rollRivalAthletics(sp, `oly:${venue}:${day | 0}:${i}:${k}`, major ? 0.65 : 0.3); kilu.push({ species: sp, level: Math.max(1, Math.round(level) + (major ? 3 : 0)), stats: statsFrom(sp, a.q) }); }
    out.push({ trainer: name, kilu, assign: autoAssign(VENUES[venue], kilu) });
  }
  return out;
}
/** rank one event. rows [{who, score}] -> same rows + {place, pts}, best first; equal score shares the better place */
export function rankEvent(rows) {
  const s = [...rows].sort((a, b) => b.score - a.score || (a.who === 'me') - (b.who === 'me'));
  let place = 1; return s.map((x, i) => { if (i > 0 && x.score !== s[i - 1].score) place = i + 1; return { ...x, place, pts: OLY.points[place - 1] ?? 0 }; });
}
/** entrants [{who, name, kilu:[{species,level,stats,...}], assign}] -> {events:[{id, rows}], table} */
export function runOlympics({ venue, day, entrants }) {
  const ids = VENUES[venue], tot = new Map(entrants.map((e) => [e.who, { who: e.who, name: e.name, pts: 0, firsts: 0, sum: 0 }]));
  const events = ids.map((id, ei) => {
    const rows = rankEvent(entrants.map((e) => { const k = e.kilu[e.assign[ei]]; return { who: e.who, name: e.name, kilu: k, score: eventScore(id, k.stats, k.level, `${venue}:${day | 0}:${e.who}:${ei}`) }; }));
    for (const x of rows) { const t = tot.get(x.who); t.pts += x.pts; t.sum += x.score; if (x.place === 1) t.firsts++; }
    return { id, rows, table: standingsOf([...tot.values()]) };
  });
  return { events, table: events[events.length - 1].table };
}
export const standingsOf = (list) => list.map((x) => ({ ...x, sum: Math.round(x.sum * 10) / 10 }))
  .sort((a, b) => b.pts - a.pts || b.firsts - a.firsts || b.sum - a.sum || (a.who === 'me') - (b.who === 'me'));
/** settle: place, gold (1st only), merit by place, first-win info. Marks today's entry. */
export function settleOlympics({ venue, day, table, wallet, sstate, mult = 1 }) {
  const o = olyState(sstate, venue), place = table.findIndex((x) => x.who === 'me') + 1, first = place === 1 && o.wins === 0;
  o.entries++; o.day = day | 0; let prize = 0;
  if (place === 1) { o.wins++; prize = wallet ? wallet.add(Math.round((venue === 'aurelith' ? OLY.prize.aurelith : OLY.prize.town) * mult)) : 0; }
  const merit = awardMerit(sstate, venue === 'aurelith' ? 'oly_major' : 'oly', place);
  return { place, prize, merit, firstWin: first, flag: place === 1 ? wonFlag(venue) : null, wins: o.wins };
}

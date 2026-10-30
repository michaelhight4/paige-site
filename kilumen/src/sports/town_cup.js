// Town cups (Oct 29 2026, dev/sports-events): each town's signature event gets a small LOCAL competition on a schedule,
// like the Brookhollow Dash tournament (tournament.js). Pure logic, no DOM. Reuses the Dash rules: every 3 in-game days,
// one entry per window, entry fee + prize through the wallet, rivals rolled with rollRivalAthletics (above-average field).
// Towns are staggered (offset = region % 3) so on any in-game day some town is holding its cup.
// Rivals post a score from their stats against the event's grade bars; the player plays the real event and must beat all three.
import { rollRivalAthletics, speciesAthletics } from './athletics.js?v=v0.2.100-alpha';
import { STATS } from './rules.js?v=v0.2.100-alpha';
import { rngFor } from './rng.js?v=v0.2.100-alpha';
import { awardMerit } from './merit.js?v=v0.2.100-alpha';

export const CUP = { fee: 100, prize: 600, everyDays: 3, rivals: 3 };
export const RIVAL_SPECIES = ['brimtoad', 'hushowl', 'ledgedove', 'capling', 'glintmoth', 'frondlet', 'aurorel', 'frostlop'];
export const RIVAL_TRAINERS = ['Juno', 'Pell', 'Marisol', 'Teo', 'Bram', 'Kit', 'Ada', 'Rook'];

const off = (ev) => (ev.region || 0) % CUP.everyDays;
const d0 = (day) => Math.max(0, day | 0);
export const cupWindow = (ev, day) => Math.floor((d0(day) + CUP.everyDays - off(ev)) / CUP.everyDays);
export const isCupDay = (ev, day) => (d0(day) % CUP.everyDays) === off(ev);
export const cupDaysUntil = (ev, day) => (off(ev) - (d0(day) % CUP.everyDays) + CUP.everyDays) % CUP.everyDays;

export function cupState(sstate, ev) {
  const tw = (sstate.town ||= {}), r = (tw[ev.id] ||= { best: 0, plays: 0, golds: 0 });
  r.cups ??= 0; r.cupEntries ??= 0; r.cupWindow ??= -1;
  return r;
}

/** -> {ok:true} | {ok:false, reason:'not_today'|'entered'|'gold', days} */
export function canEnterCup({ ev, day, coins, sstate }) {
  const r = cupState(sstate, ev);
  if (!isCupDay(ev, day)) return { ok: false, reason: 'not_today', days: cupDaysUntil(ev, day) };
  if (r.cupWindow === cupWindow(ev, day)) return { ok: false, reason: 'entered', days: CUP.everyDays };
  if ((coins ?? 0) < CUP.fee) return { ok: false, reason: 'gold', days: 0 };
  return { ok: true };
}
export function payCup({ ev, day, wallet, sstate }) {
  if (!canEnterCup({ ev, day, coins: wallet?.coins, sstate }).ok) return false;
  if (!wallet.spend(CUP.fee)) return false;
  const r = cupState(sstate, ev); r.cupWindow = cupWindow(ev, day); r.cupEntries++;
  return true;
}

/** Rival score: event-relevant stat mean (0..1) mapped between the bronze and gold bars (+ a little luck). */
const KEYSTAT = { garden_hop: ['agility', 'focus'], tide_run: ['agility', 'speed'], signal_relay: ['focus', 'stamina'], ice_slide: ['agility', 'focus'], lantern_catch: ['agility', 'speed'], forge_push: ['power', 'stamina'], tug_of_war: ['power', 'stamina'] };
export function rivalsFor(ev, day, n = CUP.rivals) {
  const r = rngFor(`cup:${ev.id}:${cupWindow(ev, day)}`), out = [], used = new Set();
  for (let i = 0; i < n; i++) {
    let sp; do { sp = RIVAL_SPECIES[Math.floor(r() * RIVAL_SPECIES.length)]; } while (used.has(sp) && used.size < RIVAL_SPECIES.length); used.add(sp);
    const a = rollRivalAthletics(sp, `${ev.id}:${day}:${i}`), R = speciesAthletics(sp).ranges, keys = KEYSTAT[ev.id] || STATS;
    const q = keys.reduce((s, k) => s + (a.q[k] ?? 0.5), 0) / keys.length;
    const [g, , b] = ev.bars, score = Math.max(0, Math.round(b + (g - b) * (0.15 + 0.85 * q) + (r() - 0.5) * (g - b) * 0.25));
    out.push({ trainer: RIVAL_TRAINERS[Math.floor(r() * RIVAL_TRAINERS.length)], species: sp, score, traits: a.traits, stats: Object.fromEntries(STATS.map((s) => [s, Math.round(R[s][0] + a.q[s] * (R[s][1] - R[s][0]))])) });
  }
  return out;
}

/** Ranks the player's score against the rivals (ties go to the rival: you have to beat them). Pays the prize on a win. */
export function settleCup({ ev, score, rivals, wallet, sstate, mult = 1 }) {
  const field = [...rivals.map((x) => ({ ...x, me: false })), { me: true, score }].sort((a, b) => b.score - a.score || (a.me ? 1 : -1));
  const place = field.findIndex((x) => x.me) + 1, r = cupState(sstate, ev);
  let prize = 0;
  if (place === 1) { r.cups++; prize = wallet ? wallet.add(Math.round(CUP.prize * mult)) : 0; }
  const merit = awardMerit(sstate, 'cup', place); // merit points by place (src/sports/merit.js)
  return { place, field, prize, cups: r.cups, merit };
}

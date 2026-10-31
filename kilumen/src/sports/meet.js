// Kilumen sports: a small meet (2 heats of 4 -> final of 4) with brackets-manager for structure + heat standings.
// Entrants are generic so team events fit later:
//   entrant = { id, name, kind: 'single' | 'team', teamId: string|null, members: [racer...], isPlayer }
//   racer   = { key, name, species, stats, traits, isPlayer }
// Events are pluggable: EVENTS[id] = { name, run(entrants, ctx) -> Promise<[{ entrantId, time }]>, better: 'low'|'high' }.
// A relay later = an event whose run() races each member's leg and sums the times per entrant; nothing else changes.
import { BracketsManager, InMemoryDatabase } from '../vendor/brackets/brackets.js?v=v0.2.103-alpha';
import { POINTS, MEET } from './rules.js?v=v0.2.103-alpha';

export const EVENTS = {};
export function registerEvent(id, def) { EVENTS[id] = { better: 'low', ...def, id }; return EVENTS[id]; }

/** Ranks results (ties keep entry order) and adds placing + points. */
export function placeResults(results, better = 'low') {
  const sorted = [...results].sort((a, b) => (better === 'low' ? a.time - b.time : b.time - a.time));
  return sorted.map((r, i) => ({ ...r, place: i + 1, points: POINTS[i + 1] || 0 }));
}

/** Writes a heat's finishing order into brackets-manager as the 6 head-to-head matches of its round-robin group. */
async function recordHeat(manager, stageId, groupId, placed, idOfParticipant) {
  const data = await manager.get.stageData(stageId);
  const rank = new Map(placed.map((r) => [r.entrantId, r]));
  for (const m of data.match.filter((x) => x.group_id === groupId)) {
    const a = rank.get(idOfParticipant(m.opponent1.id)), b = rank.get(idOfParticipant(m.opponent2.id));
    const aWins = a.place < b.place;
    // score = centiseconds ahead, so standings tiebreak on margin
    const margin = Math.round(Math.abs(a.time - b.time) * 100);
    await manager.update.match({ id: m.id, opponent1: { score: aWins ? margin : 0, result: aWins ? 'win' : 'loss' }, opponent2: { score: aWins ? 0 : margin, result: aWins ? 'loss' : 'win' } });
  }
}

/**
 * Runs a meet. runHeat(eventId, entrants, label) -> results (the UI makes the player's heats interactive and simulates the rest).
 * Returns { heats: [{label, placed}], qualified: [entrant], final: placed, standings }.
 */
export async function runMeet(eventId, entrants, runHeat, opts = {}) {
  const ev = EVENTS[eventId];
  if (!ev) throw new Error('unknown event ' + eventId);
  const { heats = MEET.heats, heatSize = MEET.heatSize, qualifyPerHeat = MEET.qualifyPerHeat } = opts;
  if (entrants.length !== heats * heatSize) throw new Error(`meet needs ${heats * heatSize} entrants`);
  const manager = new BracketsManager(new InMemoryDatabase());
  await manager.create.stage({ tournamentId: 0, name: ev.name + ' heats', type: 'round_robin', seeding: entrants.map((e) => e.id), settings: { groupCount: heats } });
  const data = await manager.get.stageData(0);
  const pName = new Map(data.participant.map((p) => [p.id, p.name])); // participant name = our entrant id
  const byId = new Map(entrants.map((e) => [e.id, e]));
  const out = { heats: [], qualified: [], final: null, standings: null };
  for (const g of data.group) {
    const pids = new Set();
    for (const m of data.match.filter((x) => x.group_id === g.id)) { pids.add(m.opponent1.id); pids.add(m.opponent2.id); }
    const field = [...pids].map((pid) => byId.get(pName.get(pid)));
    const label = `heat${g.number}`;
    const placed = placeResults(await runHeat(eventId, field, label), ev.better).map((r) => ({ ...r, points: 0 }));
    await recordHeat(manager, 0, g.id, placed, (pid) => pName.get(pid));
    out.heats.push({ label, placed });
  }
  const st = await manager.get.finalStandings(0, { rankingFormula: (i) => 3 * i.wins, maxQualifiedParticipantsPerGroup: qualifyPerHeat });
  out.standings = st.map((s) => ({ entrantId: s.name, group: s.groupId, rank: s.rank, wins: s.wins, points: s.points, margin: s.scoreDifference }));
  out.qualified = st.map((s) => byId.get(s.name));
  out.final = placeResults(await runHeat(eventId, out.qualified, 'final'), ev.better);
  return out;
}

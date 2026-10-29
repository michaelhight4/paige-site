// Kilumen sports: the Dash event (registers with meet.js) + rival picking. Dev test, Oct 28 2026.
import { SPECIES } from '../ui/data.js?v=v0.2.68-alpha';
import { speciesAthletics, athleticStats, ensureAthletics, rollRivalAthletics } from './athletics.js?v=v0.2.68-alpha';
import { STATS } from './rules.js?v=v0.2.68-alpha';
import { registerEvent } from './meet.js?v=v0.2.68-alpha';
import { simulate } from './race.js?v=v0.2.68-alpha';
import { rngFor } from './rng.js?v=v0.2.68-alpha';

// How much each stat matters for a dash (also used to match rival difficulty)
export const DASH_WEIGHT = { speed: 0.45, power: 0.15, stamina: 0.2, agility: 0.12, focus: 0.08 };
export const dashScore = (stats) => STATS.reduce((n, s) => n + stats[s] * DASH_WEIGHT[s], 0);
const centreStats = (sp) => Object.fromEntries(STATS.map((s) => { const [lo, hi] = speciesAthletics(sp).ranges[s]; return [s, (lo + hi) / 2]; }));
const nameOf = (sp) => SPECIES.find((x) => x.id === sp)?.name || sp;

export function racerFromCreature(c, isPlayer = false) {
  return { key: c.uid || c.id, name: c.nickname || nameOf(c.species), species: c.species, stats: athleticStats(c), traits: ensureAthletics(c).traits.slice(), isPlayer };
}
export const singleEntrant = (racer) => ({ id: racer.key, name: racer.name, kind: 'single', teamId: null, members: [racer], isPlayer: !!racer.isPlayer });

/** n rivals whose species sit at or a bit above the player's species for a dash (band -3..+9 points), seeded. */
export function pickRivals(playerCreature, n, seed) {
  const rng = rngFor('rivals:' + seed);
  const target = dashScore(centreStats(playerCreature.species));
  let pool = SPECIES.filter((s) => s.id !== playerCreature.species && !(s.el || []).some((e) => ['legendary', 'god'].includes(e)));
  let band = pool.filter((s) => { const d = dashScore(centreStats(s.id)) - target; return d >= -3 && d <= 9; });
  if (band.length < n) band = pool.sort((a, b) => Math.abs(dashScore(centreStats(a.id)) - target) - Math.abs(dashScore(centreStats(b.id)) - target)).slice(0, n * 3);
  const out = [];
  while (out.length < n && band.length) {
    const sp = band.splice(Math.floor(rng() * band.length), 1)[0];
    const key = `rival-${seed}-${out.length}`;
    const ath = rollRivalAthletics(sp.id, key);
    const c = { uid: key, species: sp.id, ath };
    out.push({ key, name: sp.name, species: sp.id, stats: athleticStats(c), traits: ath.traits.slice(), isPlayer: false });
  }
  return out;
}

export const DASH = registerEvent('dash', {
  name: 'Dash',
  better: 'low',
  /** Simulated run (no player input = AI-style 0.6 taps for the player). The UI overrides this for the player's heat. */
  async run(entrants, ctx = {}) {
    const racers = entrants.map((e) => e.members[0]);
    const race = simulate(racers, ctx.seed || 'dash', ctx.playerQ || { start: 0.6, push: 0.6, sprint: 0.6 });
    return race.racers.map((r) => ({ entrantId: entrants.find((e) => e.members[0].key === r.key).id, time: r.finish, racer: r }));
  },
});

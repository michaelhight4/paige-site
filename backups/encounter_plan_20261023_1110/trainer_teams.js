// Authored trainer teams (Oct 23 2026, coder; DRAFT levels for Gary). Data only: keyed "<map>.<npc id>" = the `who`
// the overworld passes to hooks.onBattle({map, id}). Ron is keyed by the player's starter (Ron counter-picks, as in
// World Design's later Ron teams). Levels follow the first-half curve the engine actually gives
// (starters are flat 45s; XP from Route 1 wild L2-6 is slow): trainers L3-6, Ron 1 L5-6, Fernwick hall helpers L8-9,
// Master of Fernwick L9/L10 with a L10 evolved ace. A starter + one Route 1 catch that fought ~12 wild battles and the
// Route 1 trainers arrives at ~L8-10 and wins (tools/playcheck_master1.mjs). Kilumen species only. Thornwood is a guess
// (L11-13), not play-checked. Master 2 / Saltmere: not authored (masters.json / World Design teams apply).
// ui_sd.js uses an entry here before any injected team; trainers not listed keep the old placeholder fallback.
export const TRAINER_TEAMS = {
  'route1.trainer_r1_a': [{ species: 'sailquill', level: 3 }, { species: 'burlbeetle', level: 4 }],
  'route1.trainer_r1_b': [{ species: 'dewmite', level: 4 }, { species: 'peeplark', level: 5 }],
  'route1.trainer_r1_c': [{ species: 'gloamtick', level: 5 }, { species: 'nibbin', level: 5 }, { species: 'cloverkin', level: 6 }],
  'fernwick.ron_rival_1': {
    byStarter: {
      tumbloam: [{ species: 'peeplark', level: 5 }, { species: 'cindrip', level: 6 }],
      cindrip: [{ species: 'peeplark', level: 5 }, { species: 'rillop', level: 6 }],
      rillop: [{ species: 'peeplark', level: 5 }, { species: 'tumbloam', level: 6 }],
    },
  },
  'fernwick_hall_int.helper_1': [{ species: 'nibbin', level: 8 }, { species: 'peeplark', level: 8 }],
  'fernwick_hall_int.helper_2': [{ species: 'pebblant', level: 9 }, { species: 'dewmite', level: 9 }],
  'fernwick_hall_int.master_fernwick': [{ species: 'nibbin', level: 9 }, { species: 'pebblant', level: 10 }, { species: 'gnawford', level: 10 }],
  'thornwood.trainer_tw_bug': [{ species: 'thornpod', level: 11 }, { species: 'gloamtick', level: 11 }],
  'thornwood.trainer_tw_b': [{ species: 'briarlet', level: 12 }, { species: 'burlbeetle', level: 12 }, { species: 'bramblehog', level: 13 }],
};

const STARTERS = ['tumbloam', 'cindrip', 'rillop'];
/** The authored team for `who` ({map, id}) or null. `party` picks Ron's counter team from the player's starter. */
export function authoredTeam(who, party = []) {
  if (!who?.map || !who?.id) return null;
  const e = TRAINER_TEAMS[`${who.map}.${who.id}`];
  if (!e) return null;
  if (Array.isArray(e)) return e.map((f) => ({ ...f }));
  const starter = party.find((c) => c.origin?.how === 'starter')?.species || party.find((c) => STARTERS.includes(c.species))?.species || 'tumbloam';
  return (e.byStarter[starter] || e.byStarter.tumbloam).map((f) => ({ ...f }));
}

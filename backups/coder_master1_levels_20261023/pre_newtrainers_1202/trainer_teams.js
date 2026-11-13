// Authored trainer teams (Oct 23 2026, coder; DRAFT levels for Gary). Data only: keyed "<map>.<npc id>" = the `who`
// the overworld passes to hooks.onBattle({map, id}). Ron is keyed by the player's starter (Ron counter-picks, as in
// World Design's later Ron teams). Levels (Oct 23 2026, Gary 11:49 AM CT: "first master should have level 12-15 team"):
// Trail 1 trainers L4-7, Ron 1 L7/8, Fernwick hall helpers L10-11, Master of Fernwick L12-13 (pebblant, pondkin, nibbin:
// earth/mud, all first-stage; every region 1 line evolves at 16, so nothing is below its evolution level). With Trail 1
// wilds at L2-4 and XP rules xpDivisor 6 / xpTrainerMult 2, a normal player (~14 wild fights + the trainers) arrives at
// ~L12-13 and beats the Master 90-95% of the time (tools/playcheck_master1.mjs). Kilumen species only. Thornwood
// (region 2) is a guess (L11-13), not play-checked, now no higher than Master 1; its bramblehog L13 is below its
// evolution level 16 (flagged to Gary). Master 2 / Saltmere: not authored (masters.json / World Design teams apply).
// ui_sd.js uses an entry here before any injected team; trainers not listed keep the old placeholder fallback.
export const TRAINER_TEAMS = {
  'route1.trainer_r1_a': [{ species: 'sailquill', level: 4 }, { species: 'burlbeetle', level: 4 }],
  'route1.trainer_r1_b': [{ species: 'dewmite', level: 5 }, { species: 'peeplark', level: 6 }],
  'route1.trainer_r1_c': [{ species: 'gloamtick', level: 6 }, { species: 'nibbin', level: 7 }, { species: 'cloverkin', level: 7 }],
  'fernwick.ron_rival_1': {
    byStarter: {
      tumbloam: [{ species: 'peeplark', level: 7 }, { species: 'cindrip', level: 8 }],
      cindrip: [{ species: 'peeplark', level: 7 }, { species: 'rillop', level: 8 }],
      rillop: [{ species: 'peeplark', level: 7 }, { species: 'tumbloam', level: 8 }],
    },
  },
  'fernwick_hall_int.helper_1': [{ species: 'nibbin', level: 10 }, { species: 'peeplark', level: 11 }],
  'fernwick_hall_int.helper_2': [{ species: 'pebblant', level: 11 }, { species: 'dewmite', level: 11 }],
  'fernwick_hall_int.master_fernwick': [{ species: 'pebblant', level: 12 }, { species: 'pondkin', level: 12 }, { species: 'nibbin', level: 13 }],
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

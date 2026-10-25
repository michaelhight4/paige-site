// Authored trainer teams (Oct 23 2026, coder; DRAFT levels for Gary). Data only: keyed "<map>.<npc id>" = the `who`
// the overworld passes to hooks.onBattle({map, id}). Ron is keyed by the player's starter (Ron counter-picks, as in
// World Design's later Ron teams). Levels (Gary 11:49 AM CT: "first master should have level 12-15 team"):
// Trail 1 trainers L3-8 (first-stage only), Ron 1 L7/8, hall-approach trainer L9/10, Fernwick hall helpers L10-11,
// Master of Fernwick L12-13 (pebblant, pondkin, tumbloam: earth/mud, all first-stage; every region 1 line evolves at 16).
// Nibbin swap (Oct 23 2026, coder; Gary: Tumbloam "looks a lot like Cindrip"): Nibbin -> Gnawford is the earth STARTER now and
// starter-only (src/battle/data/starters.js STARTER_ONLY), so the old Nibbin slots on ordinary trainers became Tumbloam (same
// level, earth, first stage, evolves at 16). Ron's byStarter: `nibbin` added (= the old earth branch, Ron takes Cindrip), the
// rillop branch now fields Nibbin / Gnawford; `tumbloam` kept for v0.2.0-alpha saves that picked Tumbloam.
// XP rules stay xpDivisor 7 / xpTrainerMult 1.5 (Gary 12:00: "No, keep the old XP and find another way"; 12:01: "the
// point of the game is to grind in the grass and log more kilumen"): trainers do NOT carry the player to L12-13, grass
// grinding does (tools/playcheck_master1.mjs models it). r1_d/e/f + fw_a are world-feel trainers (Gary 12:02: "trainers
// are still important to make the world feel full and alive"), levels between the local wilds and Master 1, rising north.
// Kilumen species only. Thornwood (region 2) is a guess (L11-13), not play-checked, no higher than Master 1; its
// bramblehog L13 is below its evolution level 16 (flagged to Gary). Master 2 / Saltmere: not authored.
// ui_sd.js uses an entry here before any injected team; trainers not listed keep the old placeholder fallback.
import { STARTERS, partyStarter, starterKeys } from './starters.js?v=v0.2.17-alpha';

export const TRAINER_TEAMS = {
  'route1.trainer_r1_d': [{ species: 'glintfly', level: 3 }, { species: 'thistlepup', level: 4 }], // Lumen Lab intern, Brookhollow end
  'route1.trainer_r1_a': [{ species: 'sailquill', level: 4 }, { species: 'burlbeetle', level: 4 }],
  'route1.trainer_r1_e': [{ species: 'burlbeetle', level: 5 }, { species: 'gloamtick', level: 5 }], // beetle keeper, below the ledges
  'route1.trainer_r1_b': [{ species: 'dewmite', level: 5 }, { species: 'peeplark', level: 6 }],
  'route1.trainer_r1_c': [{ species: 'gloamtick', level: 6 }, { species: 'tumbloam', level: 7 }, { species: 'cloverkin', level: 7 }],
  'route1.trainer_r1_f': [{ species: 'pebblant', level: 7 }, { species: 'glintfly', level: 8 }], // rock collector, boardwalk end (Fernwick side)
  // Generic class-named trainers (Gary 12:23 PM CT: "also we can add some that are just named young or old trainer or expert
  // trianer or new trainer"). All OPTIONAL side fights (sight 0, talk-only); first-stage species from the Trail 1 table.
  'route1.trainer_r1_new': [{ species: 'peeplark', level: 3 }], // New Trainer, Brookhollow end
  'route1.trainer_r1_young': [{ species: 'tumbloam', level: 5 }, { species: 'sailquill', level: 5 }], // Young Trainer, mid trail
  'route1.trainer_r1_expert': [{ species: 'hushowl', level: 8 }, { species: 'pebblant', level: 8 }, { species: 'thistlepup', level: 8 }], // Expert Trainer, Fernwick end (Trail 1 cap L8)
  'fernwick.ron_rival_1': {
    byStarter: {
      nibbin: [{ species: 'peeplark', level: 7 }, { species: 'cindrip', level: 8 }],
      cindrip: [{ species: 'peeplark', level: 7 }, { species: 'rillop', level: 8 }],
      rillop: [{ species: 'peeplark', level: 7 }, { species: 'nibbin', level: 8 }],
      tumbloam: [{ species: 'peeplark', level: 7 }, { species: 'cindrip', level: 8 }], // legacy: v0.2.0-alpha Tumbloam saves
    },
  },
  'fernwick.trainer_fw_a': [{ species: 'thistlepup', level: 8 }, { species: 'hushowl', level: 9 }], // hall hopeful, path to the Master's Hall
  'fernwick.trainer_fw_young': [{ species: 'glintfly', level: 6 }, { species: 'gloamtick', level: 7 }], // Young Trainer (generic), town square
  'fernwick.trainer_fw_old': [{ species: 'burlbeetle', level: 7 }, { species: 'dewmite', level: 8 }], // Old Trainer (generic), by the heal centre
  'fernwick_hall_int.helper_1': [{ species: 'tumbloam', level: 10 }, { species: 'peeplark', level: 11 }],
  'fernwick_hall_int.helper_2': [{ species: 'pebblant', level: 11 }, { species: 'dewmite', level: 11 }],
  'fernwick_hall_int.master_fernwick': [{ species: 'pebblant', level: 12 }, { species: 'pondkin', level: 12 }, { species: 'tumbloam', level: 13 }],
  'thornwood.trainer_tw_bug': [{ species: 'thornpod', level: 11 }, { species: 'gloamtick', level: 11 }],
  'thornwood.trainer_tw_b': [{ species: 'briarlet', level: 12 }, { species: 'burlbeetle', level: 12 }, { species: 'bramblehog', level: 13 }],
};

/** The authored team for `who` ({map, id}) or null. `party` picks Ron's counter team from the player's starter (any stage:
 *  an evolved starter still counts, starters.js partyStarter; a legacy Tumbloam save uses the `tumbloam` branch). */
export function authoredTeam(who, party = []) {
  if (!who?.map || !who?.id) return null;
  const e = TRAINER_TEAMS[`${who.map}.${who.id}`];
  if (!e) return null;
  if (Array.isArray(e)) return e.map((f) => ({ ...f }));
  const starter = partyStarter(party) || STARTERS[0];
  const key = starterKeys(starter).find((k) => e.byStarter[k]) || Object.keys(e.byStarter)[0];
  return e.byStarter[key].map((f) => ({ ...f }));
}

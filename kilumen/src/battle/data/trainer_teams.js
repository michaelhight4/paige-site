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
// Kilumen species only.
// REGION 2 (coder, Oct 23 2026; Gary 2:11 PM CT "start on region 2"): East Road, Salt Road, Ron 2 (byStarter), Saltmere
// hall h1-h3 and Master 2 (Nerys Bryde, raised to L19-21 hall / L20-23 Master over the staged 17-21) promoted from data/region2/trainer_teams_region2.json
// (source tools/region2/region2_spec.mjs; names/classes/why there). Thornwood raised from the L11-13 guess to region 2
// levels L13-16 (it is the post-Master-1 side forest; bramblehog now L16 = its evolution level, no trainer creature sits
// below its evolution level: tests/region2.test.mjs). Play-check: tools/playcheck_master2.mjs; plan: data/region2/PLAN.md.
// ui_sd.js uses an entry here before any injected team; trainers not listed keep the old placeholder fallback.
import { STARTERS, partyStarter, starterKeys } from './starters.js?v=v0.2.32-alpha';

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
  // ---- region 2: Thornwood (side forest west of Fernwick; raised to region 2, Oct 23 2026) ----
  'thornwood.trainer_tw_bug': [{ species: 'thornpod', level: 13 }, { species: 'gloamtick', level: 13 }],
  'thornwood.trainer_tw_b': [{ species: 'burlbeetle', level: 14 }, { species: 'bramblehog', level: 16 }], // bramblehog = its evo level 16
  'thornwood.thornwood_c_gardener': [{ species: 'cobblepup', level: 13 }, { species: 'briarlet', level: 14 }], // optional
  'thornwood.thornwood_d_kid': [{ species: 'gloamtick', level: 13 }], // optional
  'thornwood.thornwood_e_researcher': [{ species: 'thornpod', level: 14 }, { species: 'burlbeetle', level: 15 }], // optional
  // ---- region 2: East Road -> Salt Road -> Saltmere (data/region2/trainer_teams_region2.json) ----
  'route_east.route_east_trainer_1': [{ species: 'sailquill', level: 12 }, { species: 'flockpup', level: 13 }], // Penrose courier
  'route_east.route_east_trainer_2': [{ species: 'ditchsnap', level: 13 }, { species: 'pondkin', level: 14 }, { species: 'puddlenip', level: 15 }], // Rue angler
  'route_east.route_east_trainer_3': [{ species: 'burlbeetle', level: 13 }, { species: 'gloamtick', level: 14 }], // Bram kid
  'route_east.route_east_trainer_4': [{ species: 'millwhirl', level: 14 }, { species: 'sailquill', level: 14 }], // Tilly skater
  'route_east.route_east_trainer_5': [{ species: 'bleatling', level: 16 }, { species: 'loamworm', level: 16 }], // Cass worker
  'route_east.route_east_trainer_6': [{ species: 'sailquill', level: 15 }, { species: 'crowkin', level: 16 }], // Juno birder, optional
  'route_aurelith_saltmere.route_aurelith_saltmere_trainer_1': [{ species: 'pinchkin', level: 16 }, { species: 'brinepipit', level: 17 }], // Dunstan harbour_hand
  'route_aurelith_saltmere.route_aurelith_saltmere_trainer_2': [{ species: 'sailquill', level: 16 }, { species: 'brinepipit', level: 16 }], // Gil birder
  'route_aurelith_saltmere.route_aurelith_saltmere_trainer_3': [{ species: 'blubbet', level: 17 }, { species: 'sandstarlet', level: 17 }], // Hana angler
  'route_aurelith_saltmere.route_aurelith_saltmere_trainer_4': [{ species: 'burlbeetle', level: 16 }, { species: 'moatling', level: 16 }, { species: 'grainling', level: 18 }], // Iska camper
  'route_aurelith_saltmere.route_aurelith_saltmere_trainer_5': [{ species: 'tinderwren', level: 15 }, { species: 'sailquill', level: 15 }], // Jem courier
  'route_aurelith_saltmere.route_aurelith_saltmere_trainer_6': [{ species: 'whelkin', level: 19 }, { species: 'sandstarlet', level: 19 }], // Kerr veteran, optional
  'saltmere.saltmere_ron_2': { // Ron rival
    byStarter: {
      nibbin: [{ species: 'sailquill', level: 17 }, { species: 'grainling', level: 17 }, { species: 'emberlunx', level: 19 }],
      cindrip: [{ species: 'sailquill', level: 18 }, { species: 'bramblehog', level: 19 }, { species: 'brookhorn', level: 20 }],
      rillop: [{ species: 'sailquill', level: 18 }, { species: 'larkspar', level: 18 }, { species: 'gnawford', level: 20 }],
      tumbloam: [{ species: 'sailquill', level: 17 }, { species: 'grainling', level: 17 }, { species: 'emberlunx', level: 19 }], // legacy saves
    },
  },
  'saltmere_hall_int.saltmere_hall_int_h1': [{ species: 'sandstarlet', level: 19 }, { species: 'blubbet', level: 19 }], // Lorna hall_helper
  'saltmere_hall_int.saltmere_hall_int_h2': [{ species: 'medulet', level: 20 }, { species: 'whelkin', level: 20 }], // Ivo hall_helper
  'saltmere_hall_int.saltmere_hall_int_h3': [{ species: 'finnip', level: 20 }, { species: 'ribboneel', level: 21 }], // Sully hall_helper
  'saltmere_hall_int.saltmere_hall_int_master': [{ species: 'quaymouser', level: 20 }, { species: 'polypip', level: 21 }, { species: 'spratwyrm', level: 23 }], // Nerys Bryde master
  // ---- region 3 early access (coder, Oct 24 2026; Gary: "a bit above region 2", wild L22-27, trainers L22-26, Master 3 L27-30) ----
  'route_revival_saltmere.route_revival_saltmere_trainer_1': [{ species: 'slagrook', level: 23 }, { species: 'shalekin', level: 24 }], // Garrick worker
  'route_revival_saltmere.route_revival_saltmere_trainer_2': [{ species: 'sailquill', level: 24 }, { species: 'kindlepup', level: 24 }], // Una courier
  'route_revival_saltmere.route_revival_saltmere_trainer_3': [{ species: 'spiralith', level: 24 }, { species: 'bulwarkrab', level: 25 }], // Vale harbour hand
  'route_revival_saltmere.route_revival_saltmere_trainer_4': [{ species: 'prismite', level: 25 }, { species: 'scutadillo', level: 26 }], // Wynn veteran
  'route_revival.route_revival_trainer_1': [{ species: 'scutadillo', level: 22 }, { species: 'topiarix', level: 23 }], // Lark ranger
  'route_revival.route_revival_trainer_2': [{ species: 'halovy', level: 22 }, { species: 'prismwing', level: 23 }], // Mabry researcher
  'route_revival.route_revival_trainer_3': [{ species: 'burlbeetle', level: 22 }, { species: 'chiselbug', level: 23 }, { species: 'prismwing', level: 23 }], // Nico
  'route_revival.route_revival_trainer_4': [{ species: 'slagrook', level: 23 }, { species: 'moatling', level: 23 }], // Orla rail worker
  'route_revival.route_revival_trainer_5': [{ species: 'sailquill', level: 23 }, { species: 'kindlepup', level: 24 }], // Penn courier
  'route_revival.route_revival_trainer_6': [{ species: 'reverion', level: 24 }, { species: 'cogwhisk', level: 25 }], // Ambrose scholar
  'route_revival.route_revival_trainer_7': [{ species: 'ankerling', level: 24 }, { species: 'brinecube', level: 25 }], // Rhea worker
  'revival_heights.revival_heights_trainer_1': [{ species: 'halovy', level: 25 }, { species: 'prismite', level: 26 }], // Lyle researcher
  'revival_heights.revival_heights_ron_3': { // Ron rival 3
    byStarter: {
      nibbin: [{ species: 'sailquill', level: 24 }, { species: 'glassvine', level: 25 }, { species: 'mirrorkin', level: 25 }, { species: 'emberlunx', level: 27 }],
      cindrip: [{ species: 'sailquill', level: 24 }, { species: 'topiarix', level: 25 }, { species: 'reverion', level: 25 }, { species: 'brookhorn', level: 27 }],
      rillop: [{ species: 'sailquill', level: 24 }, { species: 'sproutwyrm', level: 25 }, { species: 'cogwhisk', level: 25 }, { species: 'burrowmane', level: 27 }],
      tumbloam: [{ species: 'sailquill', level: 24 }, { species: 'glassvine', level: 25 }, { species: 'mirrorkin', level: 25 }, { species: 'emberlunx', level: 27 }], // legacy saves
    },
  },
  'revival_hall_int.revival_hall_int_h1': [{ species: 'halovy', level: 25 }, { species: 'glarekit', level: 25 }], // Mags
  'revival_hall_int.revival_hall_int_h2': [{ species: 'prismwing', level: 25 }, { species: 'glimmerlamb', level: 25 }], // Dov
  'revival_hall_int.revival_hall_int_h3': [{ species: 'tollkin', level: 26 }, { species: 'dawnfin', level: 26 }], // Fen
  'revival_hall_int.revival_hall_int_h4': [{ species: 'candlewren', level: 26 }, { species: 'halovy', level: 26 }], // Corwin
  'revival_hall_int.revival_hall_int_master': [{ species: 'halovy', level: 27 }, { species: 'gildfinch', level: 28 }, { species: 'fleecelight', level: 28 }, { species: 'lampwick', level: 30 }], // Cassia Lume, Master 3
  // ---- region 4 early access (coder, Oct 24 2026; wild L28-33, trainers L28-32, hall L31-33, Master 4 L33-35) ----
  'frostspire_pass.frostspire_pass_trainer_1': [{ species: 'ledgebex', level: 28 }, { species: 'talusmouse', level: 29 }],
  'frostspire_pass.frostspire_pass_trainer_2': [{ species: 'shagmount', level: 29 }, { species: 'snowcairn', level: 29 }],
  'frostspire_pass.frostspire_pass_trainer_3': [{ species: 'snowgrouse', level: 29 }, { species: 'signalwren', level: 30 }],
  'frostspire_pass.frostspire_pass_trainer_4': [{ species: 'frostlop', level: 30 }, { species: 'delvelet', level: 30 }],
  'frostspire_pass.frostspire_pass_trainer_5': [{ species: 'ledgebex', level: 30 }, { species: 'gloamtick', level: 30 }, { species: 'snowcairn', level: 31 }],
  'frostspire.frostspire_trainer_1': [{ species: 'tundrarch', level: 32 }, { species: 'ledgebex', level: 31 }],
  'frostspire.frostspire_trainer_2': [{ species: 'frostlop', level: 31 }, { species: 'skyrender', level: 31 }],
  'frostspire.frostspire_trainer_3': [{ species: 'halovy', level: 31 }, { species: 'signalwren', level: 32 }],
  'frostspire.frostspire_trainer_4': [{ species: 'tundrarch', level: 32 }, { species: 'burlbeetle', level: 32 }],
  'frostspire_pass.frostspire_pass_ron_4': { // Ron rival 4
    byStarter: {
      nibbin: [{ species: 'sailquill', level: 30 }, { species: 'glassvine', level: 30 }, { species: 'mirrorkin', level: 31 }, { species: 'emberlunx', level: 32 }],
      cindrip: [{ species: 'sailquill', level: 30 }, { species: 'topiarix', level: 30 }, { species: 'reverion', level: 31 }, { species: 'brookhorn', level: 32 }],
      rillop: [{ species: 'sailquill', level: 30 }, { species: 'sproutwyrm', level: 30 }, { species: 'cogwhisk', level: 31 }, { species: 'burrowmane', level: 32 }],
      tumbloam: [{ species: 'sailquill', level: 30 }, { species: 'glassvine', level: 30 }, { species: 'mirrorkin', level: 31 }, { species: 'emberlunx', level: 32 }], // legacy saves
    },
  },
  'frostspire_hall_int.frostspire_hall_int_h1': [{ species: 'sailquill', level: 31 }, { species: 'snowgrouse', level: 31 }], // Rue
  'frostspire_hall_int.frostspire_hall_int_h2': [{ species: 'highkite', level: 32 }, { species: 'signalwren', level: 32 }], // Bram
  'frostspire_hall_int.frostspire_hall_int_h3': [{ species: 'spraytern', level: 33 }, { species: 'sailquill', level: 33 }], // Tilly
  'frostspire_hall_int.frostspire_hall_int_master': [{ species: 'sailquill', level: 33 }, { species: 'highkite', level: 34 }, { species: 'pouchbill', level: 34 }, { species: 'gildfinch', level: 35 }], // Hale Corrie, Master 4
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

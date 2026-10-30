// Authored trainer teams (Oct 23 2026, coder; DRAFT levels for Gary). Data only: keyed "<map>.<npc id>" = the `who`
// the overworld passes to hooks.onBattle({map, id}). Ron is keyed by the player's starter (Ron counter-picks, as in
// World Design's later Ron teams). Levels (Gary 11:49 AM CT: "first master should have level 12-15 team"):
// Trail 1 trainers L3-8 (first-stage only), Ron 1 L7/8, hall-approach trainer L9/10, Fernwick hall helpers L10-11,
// Master of Fernwick L12-13 (pebblant, pondkin, tumbloam: earth/mud, all first-stage; every region 1 line evolves at 16).
// Nibbin swap (Oct 23 2026, coder; Gary: Tumbloam "looks a lot like Cindrip"): Nibbin -> Gnawford is the earth STARTER now and
// starter-only (src/battle/data/starters.js STARTER_ONLY), so the old Nibbin slots on ordinary trainers became Tumbloam (same
// level, earth, first stage, evolves at 16). Ron's byStarter: `nibbin` added (= the old earth branch, Ron takes Cindrip), the
// rillop branch now fields Nibbin / Gnawford; `tumbloam` kept for v0.2.89-alpha saves that picked Tumbloam.
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
import { STARTERS, partyStarter, starterKeys } from './starters.js?v=v0.2.92-alpha';
import { applyHeldPicks } from './trainer_held.js?v=v0.2.92-alpha';
import { RON_KEYS, ronTeam } from './ron_team.js?v=v0.2.92-alpha';
import { ARENA_TEAMS } from '../../region78/arena.js?v=v0.2.92-alpha'; // Aurelith Arena fighters (8, back to back)

const RON_TIDEWATER = {"nibbin": [{species: "sailquill", level: 39}, {species: "glassvine", level: 39}, {species: "mirrorkin", level: 39}, {species: "runeskein", level: 39, held: "runestitch_charm"}, {species: "bramblehog", level: 39}, {species: "forgeharrow", level: 41}], "cindrip": [{species: "sailquill", level: 40}, {species: "pearlisk", level: 40, held: "runestitch_charm"}, {species: "tidemarrow", level: 40, held: "sprig_charm"}, {species: "nudiblume", level: 40, held: "tidebell_charm", skills: ["brinelash", "undertow", "rippleshot", "pebbletoss"]}, {species: "brineseal", level: 39, held: "droplet_charm"}, {species: "tidemarrow", level: 41, held: "tidebell_charm", skills: ["brinelash", "undertow", "rippleshot", "pebbletoss"]}], "rillop": [{species: "sailquill", level: 40}, {species: "glassvine", level: 40}, {species: "gearwarden", level: 40}, {species: "bramblehog", level: 41}, {species: "seraphawk", level: 40}, {species: "gnawford", level: 41}], "tumbloam": [{species: "sailquill", level: 39}, {species: "glassvine", level: 39}, {species: "mirrorkin", level: 39}, {species: "runeskein", level: 39, held: "runestitch_charm"}, {species: "bramblehog", level: 39}, {species: "forgeharrow", level: 41}]};
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
      tumbloam: [{ species: 'peeplark', level: 7 }, { species: 'cindrip', level: 8 }], // legacy: v0.2.89-alpha Tumbloam saves
    },
  },
  'fernwick.trainer_fw_a': [{ species: 'thistlepup', level: 8 }, { species: 'hushowl', level: 9 }], // hall hopeful, path to the Master's Hall
  'fernwick.trainer_fw_young': [{ species: 'glintfly', level: 6 }, { species: 'gloamtick', level: 7 }], // Young Trainer (generic), town square
  'fernwick.trainer_fw_old': [{ species: 'burlbeetle', level: 7 }, { species: 'dewmite', level: 8 }], // Old Trainer (generic), by the heal centre
  'fernwick_hall_int.helper_1': [{ species: 'tumbloam', level: 10 }, { species: 'peeplark', level: 11 }],
  'fernwick_hall_int.helper_2': [{ species: 'pebblant', level: 11 }, { species: 'dewmite', level: 11 }],
  'fernwick_hall_int.fernwick_hall_int_h3': [{ species: 'cobblepup', level: 9 }, { species: 'lintmouse', level: 9 }], // Tamsin (hall trainers v1, Oct 29 2026)
  'fernwick_hall_int.master_fernwick': [{ species: 'pebblant', level: 12 }, { species: 'pondkin', level: 12 }, { species: 'tumbloam', level: 13 }],
  // ---- region 2: Thornwood (side forest west of Fernwick; raised to region 2, Oct 23 2026) ----
  'thornwood.trainer_tw_bug': [{ species: 'thornpod', level: 13 }, { species: 'gloamtick', level: 13 }],
  'thornwood.trainer_tw_b': [{ species: 'burlbeetle', level: 13 }, { species: 'bramblehog', level: 16 }], // bramblehog = its evo level 16
  'thornwood.thornwood_c_gardener': [{ species: 'cobblepup', level: 13 }, { species: 'briarlet', level: 13 }], // optional
  'thornwood.thornwood_d_kid': [{ species: 'gloamtick', level: 13 }], // optional
  'thornwood.thornwood_e_researcher': [{ species: 'thornpod', level: 13 }, { species: 'burlbeetle', level: 14 }], // optional
  // ---- region 2: East Road -> Salt Road -> Saltmere (data/region2/trainer_teams_region2.json) ----
  'route_east.route_east_trainer_1': [{ species: 'sailquill', level: 12 }, { species: 'flockpup', level: 13 }], // Penrose courier
  'route_east.route_east_trainer_2': [{ species: 'ditchsnap', level: 13 }, { species: 'pondkin', level: 13 }, { species: 'puddlenip', level: 14 }], // Rue angler
  'route_east.route_east_trainer_3': [{ species: 'burlbeetle', level: 13 }, { species: 'gloamtick', level: 13 }], // Bram kid
  'route_east.route_east_trainer_4': [{ species: 'millwhirl', level: 13 }, { species: 'sailquill', level: 13 }], // Tilly skater
  'route_east.route_east_trainer_5': [{ species: 'bleatling', level: 14 }, { species: 'loamworm', level: 14 }], // Cass worker
  'route_east.route_east_trainer_6': [{ species: 'sailquill', level: 14 }, { species: 'crowkin', level: 14 }], // Juno birder, optional
  'route_aurelith_saltmere.route_aurelith_saltmere_trainer_1': [{ species: 'pinchkin', level: 14 }, { species: 'brinepipit', level: 15 }], // Dunstan harbour_hand
  'route_aurelith_saltmere.route_aurelith_saltmere_trainer_2': [{ species: 'sailquill', level: 14 }, { species: 'brinepipit', level: 14 }], // Gil birder
  'route_aurelith_saltmere.route_aurelith_saltmere_trainer_3': [{ species: 'blubbet', level: 15 }, { species: 'sandstarlet', level: 15 }], // Hana angler
  'route_aurelith_saltmere.route_aurelith_saltmere_trainer_4': [{ species: 'burlbeetle', level: 14 }, { species: 'moatling', level: 14 }, { species: 'grainling', level: 15 }], // Iska camper
  'route_aurelith_saltmere.route_aurelith_saltmere_trainer_5': [{ species: 'tinderwren', level: 14 }, { species: 'sailquill', level: 14 }], // Jem courier
  'route_aurelith_saltmere.route_aurelith_saltmere_trainer_6': [{ species: 'whelkin', level: 16 }, { species: 'sandstarlet', level: 16 }], // Kerr veteran, optional
  'saltmere.saltmere_ron_2': { // Ron rival
    byStarter: {
      nibbin: [{ species: 'sailquill', level: 15 }, { species: 'grainling', level: 15 }, { species: 'emberlunx', level: 16 }],
      cindrip: [{ species: 'sailquill', level: 15 }, { species: 'bramblehog', level: 16 }, { species: 'brookhorn', level: 16 }],
      rillop: [{ species: 'sailquill', level: 15 }, { species: 'larkspar', level: 16 }, { species: 'gnawford', level: 16 }],
      tumbloam: [{ species: 'sailquill', level: 15 }, { species: 'grainling', level: 15 }, { species: 'emberlunx', level: 16 }], // legacy saves
    },
  },
  'saltmere_hall_int.saltmere_hall_int_h1': [{ species: 'sandstarlet', level: 16 }, { species: 'blubbet', level: 16 }], // Lorna hall_helper
  'saltmere_hall_int.saltmere_hall_int_h2': [{ species: 'medulet', level: 16 }, { species: 'whelkin', level: 16 }], // Ivo hall_helper
  'saltmere_hall_int.saltmere_hall_int_h3': [{ species: 'finnip', level: 16 }, { species: 'ribboneel', level: 17 }], // Sully hall_helper
  'saltmere_hall_int.saltmere_hall_int_h4': [{ species: 'sandstarlet', level: 12 }, { species: 'blubbet', level: 12 }], // Odile (hall trainers v1, Oct 29 2026)
  'saltmere_hall_int.saltmere_hall_int_master': [{ species: 'quaymouser', level: 15 }, { species: 'polypip', level: 16 }, { species: 'spratwyrm', level: 18 }], // Nerys Bryde master
  // ---- region 3 early access (coder, Oct 24 2026; Gary: "a bit above region 2", wild L22-27, trainers L22-26, Master 3 L27-30) ----
  'route_revival_saltmere.route_revival_saltmere_trainer_1': [{ species: 'slagrook', level: 19 }, { species: 'shalekin', level: 21 }], // Garrick worker
  'route_revival_saltmere.route_revival_saltmere_trainer_2': [{ species: 'sailquill', level: 21 }, { species: 'kindlepup', level: 21 }], // Una courier
  'route_revival_saltmere.route_revival_saltmere_trainer_3': [{ species: 'spiralith', level: 21 }, { species: 'bulwarkrab', level: 22 }], // Vale harbour hand
  'route_revival_saltmere.route_revival_saltmere_trainer_4': [{ species: 'prismite', level: 22 }, { species: 'scutadillo', level: 23 }], // Wynn veteran
  'route_revival.route_revival_trainer_1': [{ species: 'scutadillo', level: 18 }, { species: 'topiarix', level: 19 }], // Lark ranger
  'route_revival.route_revival_trainer_2': [{ species: 'halovy', level: 18 }, { species: 'prismwing', level: 19 }], // Mabry researcher
  'route_revival.route_revival_trainer_3': [{ species: 'burlbeetle', level: 18 }, { species: 'chiselbug', level: 19 }, { species: 'prismwing', level: 19 }], // Nico
  'route_revival.route_revival_trainer_4': [{ species: 'slagrook', level: 19 }, { species: 'moatling', level: 19 }], // Orla rail worker
  'route_revival.route_revival_trainer_5': [{ species: 'sailquill', level: 19 }, { species: 'kindlepup', level: 21 }], // Penn courier
  'route_revival.route_revival_trainer_6': [{ species: 'reverion', level: 21 }, { species: 'cogwhisk', level: 22 }], // Ambrose scholar
  'route_revival.route_revival_trainer_7': [{ species: 'ankerling', level: 21 }, { species: 'brinecube', level: 22 }], // Rhea worker
  'revival_heights.revival_heights_trainer_1': [{ species: 'halovy', level: 22 }, { species: 'prismite', level: 23 }], // Lyle researcher
  'revival_heights.revival_heights_ron_3': { // Ron rival 3
    byStarter: {
      nibbin: [{ species: 'sailquill', level: 21 }, { species: 'glassvine', level: 22 }, { species: 'mirrorkin', level: 22 }, { species: 'emberlunx', level: 23 }],
      cindrip: [{ species: 'sailquill', level: 21 }, { species: 'topiarix', level: 22 }, { species: 'reverion', level: 22 }, { species: 'brookhorn', level: 23 }],
      rillop: [{ species: 'sailquill', level: 21 }, { species: 'sproutwyrm', level: 22 }, { species: 'cogwhisk', level: 22 }, { species: 'burrowmane', level: 23 }],
      tumbloam: [{ species: 'sailquill', level: 21 }, { species: 'glassvine', level: 22 }, { species: 'mirrorkin', level: 22 }, { species: 'emberlunx', level: 23 }], // legacy saves
    },
  },
  'revival_hall_int.revival_hall_int_h1': [{ species: 'halovy', level: 22 }, { species: 'glarekit', level: 22 }], // Mags
  'revival_hall_int.revival_hall_int_h2': [{ species: 'prismwing', level: 22 }, { species: 'glimmerlamb', level: 22 }], // Dov
  'revival_hall_int.revival_hall_int_h3': [{ species: 'tollkin', level: 23 }, { species: 'dawnfin', level: 23 }], // Fen
  'revival_hall_int.revival_hall_int_h4': [{ species: 'candlewren', level: 23 }, { species: 'halovy', level: 23 }], // Corwin
  'revival_hall_int.revival_hall_int_h5': [{ species: 'halovy', level: 19 }, { species: 'gildfinch', level: 19 }], // Seren (hall trainers v1, Oct 29 2026)
  'revival_hall_int.revival_hall_int_master': [{ species: 'halovy', level: 22 }, { species: 'gildfinch', level: 23 }, { species: 'fleecelight', level: 23 }, { species: 'lampwick', level: 24 }], // Cassia Lume, Master 3
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
  'frostspire_hall_int.frostspire_hall_int_h4': [{ species: 'spraytern', level: 30 }, { species: 'signalwren', level: 30 }], // Halvard (hall trainers v1, Oct 29 2026)
  'frostspire_hall_int.frostspire_hall_int_h5': [{ species: 'sailquill', level: 31 }, { species: 'highkite', level: 31 }], // Isolde (hall trainers v1, Oct 29 2026)
  'frostspire_hall_int.frostspire_hall_int_h6': [{ species: 'pouchbill', level: 31 }, { species: 'snowgrouse', level: 31 }, { species: 'belfrydove', level: 32 }], // Kestrel (hall trainers v1, Oct 29 2026)
  'frostspire_hall_int.frostspire_hall_int_master': [{ species: 'sailquill', level: 33 }, { species: 'highkite', level: 34 }, { species: 'pouchbill', level: 34 }, { species: 'gildfinch', level: 35 }], // Hale Corrie, Master 4
  // r56 (Oct 29 2026): Ron at Tidewater (GD 'ron_6' id rival_ron_tidewater, optional, story.js RON_RIVALS 5). design/regions56_gd/
  // balance.json ron_6; stand-ins: stampedor -> bramblehog, driftknot -> tidemarrow, deluvane -> brineseal. seraphawk restored (r78 wired, Oct 29 2026).
  'tidewater_coast.tidewater_coast_ron_5': { byStarter: RON_TIDEWATER },
  'tidewater_coast.tidewater_coast_ron_5_slip': { byStarter: RON_TIDEWATER },
  ...ARENA_TEAMS, // aurelith_arena_room_N.arena_fighter_N (src/region78/arena.js)
};

// Held items for Masters and Ron: per-creature picks per fight in src/battle/data/trainer_held.js (Oct 29 2026, P2-P5).
// TRAINER_HELD: authored fight key -> pick key. Other trainers hold nothing. battle.js toSet passes `held` in.
export const TRAINER_HELD = {
  'fernwick.ron_rival_1': 'ron_1',
  'fernwick_hall_int.master_fernwick': 'master_fernwick',
  'saltmere.saltmere_ron_2': 'ron_2',
  'saltmere_hall_int.saltmere_hall_int_master': 'master_saltmere',
  'revival_heights.revival_heights_ron_3': 'ron_3',
  'revival_hall_int.revival_hall_int_master': 'master_revival_heights',
  'frostspire_pass.frostspire_pass_ron_4': 'ron_4',
  'frostspire_hall_int.frostspire_hall_int_master': 'master_frostspire',
};
const withHeld = (key, team) => applyHeldPicks(TRAINER_HELD[key], team);

/** The authored team for `who` ({map, id}) or null. `party` picks Ron's counter team from the player's starter (any stage:
 *  an evolved starter still counts, starters.js partyStarter; a legacy Tumbloam save uses the `tumbloam` branch). */
export function authoredTeam(who, party = []) {
  if (!who?.map || !who?.id) return null;
  const key = `${who.map}.${who.id}`;
  if (RON_KEYS[key]) return withHeld(key, ronTeam(RON_KEYS[key], partyStarter(party) || STARTERS[0])); // Ron: base 3 + per-save roll (ron_team.js)
  const e = TRAINER_TEAMS[key];
  if (!e) return null;
  if (Array.isArray(e)) return withHeld(key, e.map((f) => ({ ...f })));
  const starter = partyStarter(party) || STARTERS[0];
  const sk = starterKeys(starter).find((k) => e.byStarter[k]) || Object.keys(e.byStarter)[0];
  return withHeld(key, e.byStarter[sk].map((f) => ({ ...f })));
}

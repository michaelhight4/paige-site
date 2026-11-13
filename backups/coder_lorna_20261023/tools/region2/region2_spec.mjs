// Region 2 (Brookhollow east gate -> Saltmere -> Master 2) STAGED content spec. Oct 23 2026, coder (region-2 groundwork).
// Hand-authored choices live here; tools/region2/build_region2.mjs turns them into data/region2/*.json and validates them.
// NOT LIVE: nothing in src/ or art/world/overworld/ reads these files. Wiring happens after region 1 ships (see data/region2/README.md).
// Structure follows the usual monster-catcher layout (tiers, trainer ladders, hall + master); all names/species/levels are Kilumen's own.

// ---- encounter zones -------------------------------------------------------------------------------------------
// Tier weights are fixed (common 30 / uncommon 15 / rare 5 / very rare 1); tier comes from data/creature_inventory.json.
// level: band unless overridden; the builder raises lo to the species' legal minimum (max of game evoLevel and DEX evo level).
// time: optional phases. Water zones are staged for the Tideglide revisit (encounters.js skips /^water/ until then).
export const ZONES = {
  route_east_grass: {
    map: 'route_east', method: 'grass', rate: 0.0833, band: [12, 16], gd: 'encounters_route_brookhollow_aurelith.json re_grass',
    note: 'Main East Road grass (5 rects). First wild zone after Master 1; player arrives ~L10-11.',
    slots: [
      { species: 'sailquill' }, { species: 'spinelet', level: [12, 15] }, { species: 'flockpup' }, { species: 'bleatling' },
      { species: 'grainling' }, { species: 'millwhirl', time: ['dawn', 'day', 'dusk'] }, { species: 'crowkin', time: ['dusk', 'night'] },
      { species: 'gloamtick', level: [13, 16], time: ['dusk', 'night'] }, { species: 'foalgust', level: [12, 15] }, { species: 'glimmerlamb' },
      { species: 'halovy', level: [15, 16], time: ['dawn'] },
    ],
    pending_art: ['dashhare', 'strawhaunt', 'milestoner'],
  },
  route_east_reeds: {
    map: 'route_east', method: 'grass', rate: 0.0833, band: [12, 16], gd: 'encounters_route_brookhollow_aurelith.json re_grass (reed strip)',
    note: 'Forced reed strip (46,19)-(48,20) by the river. Own table now (was a copy of route_east_grass): wet-ground species.',
    slots: [
      { species: 'ditchsnap', level: [12, 16] }, { species: 'loamworm' }, { species: 'sailquill' }, { species: 'tinderwren', time: ['dawn', 'day'] },
      { species: 'burlbeetle', level: [12, 15] }, { species: 'gloamtick', level: [13, 16], time: ['dusk', 'night'] },
      { species: 'foalgust', level: [12, 15] }, { species: 'halovy', level: [15, 16], time: ['dawn'] },
    ],
    pending_art: ['dashhare'],
  },
  route_aurelith_saltmere_grass: {
    map: 'route_aurelith_saltmere', method: 'grass', rate: 0.0833, band: [15, 18], gd: 'encounters_route_saltmere_aurelith.json sa_dune_grass',
    note: 'Salt Road dune grass (6 rects). Coast/town species; gauzewing (game evo 32) left out.',
    slots: [
      { species: 'sailquill' }, { species: 'medulet', level: [15, 17], time: ['dusk', 'night'] }, { species: 'ankerling' }, { species: 'railmite' },
      { species: 'pennantail', time: ['dawn', 'day'] }, { species: 'brinepipit' }, { species: 'pouchbill' }, { species: 'lampwick', time: ['dusk', 'night'] },
      { species: 'gloamtick', level: [16, 18], time: ['dusk', 'night'] }, { species: 'larkspar' }, { species: 'huskling' },
      { species: 'gildfinch', time: ['dawn', 'day'] }, { species: 'cogwhisk' }, { species: 'tollkin', time: ['night'] }, { species: 'moatling' },
      { species: 'halovy', level: [17, 18], time: ['dawn'] }, { species: 'frondhart' },
    ],
    pending_art: ['rafterat', 'gildcub'],
  },
  thornwood_grass: {
    map: 'thornwood', method: 'grass', rate: 0.0833, band: [9, 13], gd: 'encounters_thornwood.json',
    border: true,
    note: 'BORDER MAP (reachable from Fernwick before Master 2; map is region-1 territory, not touched). Live table has burrowmane 9-13 '
      + '(below evo 16); this staged table drops it. Lancebeetle (game evo 32) and bramblehog (16/17) also left out.',
    slots: [
      { species: 'briarlet' }, { species: 'burlbeetle' }, { species: 'spinelet' }, { species: 'sailquill', time: ['dawn', 'day'] },
      { species: 'gloamtick', level: [10, 13], time: ['dusk', 'night'] }, { species: 'thornpod' }, { species: 'tumbloam', level: [9, 12] },
    ],
    pending_art: ['nettlegrub', 'acornip', 'pipistrix', 'mossloth', 'tappeck', 'ivyadder', 'twigling', 'thornfinch', 'knothaunt', 'oakenward',
      'shadevix', 'silkwick', 'gleamcap', 'sigilmoth', 'imprick'],
  },
  // ---- Tideglide revisit (not rollable until a water-travel runtime exists) ----
  route_east_water: {
    map: 'route_east', method: 'water (Tideglide)', rate: 0.0667, band: [25, 32], gd: 'encounters_route_brookhollow_aurelith.json re_river', revisit: true,
    note: 'River on East Road. route_east has no water rect yet (map gap).',
    slots: [{ species: 'musselin', level: [28, 32] }, { species: 'ditchsnap', level: [25, 30] }, { species: 'streambarb', level: [25, 30] }, { species: 'snapmoor', level: [30, 32] }],
    pending_art: [],
  },
  route_aurelith_saltmere_water: {
    map: 'route_aurelith_saltmere', method: 'water (Tideglide)', rate: 0.0667, band: [28, 34], gd: 'encounters_route_saltmere_aurelith.json', revisit: true,
    note: 'Salt Road cove water. No water rect on the map yet (map gap).',
    slots: [{ species: 'whelkin' }, { species: 'medulet' }, { species: 'ankerling' }, { species: 'plashcrown' }, { species: 'ribboneel', level: [30, 34] },
      { species: 'streambarb' }, { species: 'rakefin', level: [28, 33] }, { species: 'eftwarden', time: ['dusk', 'night'] }],
    pending_art: ['fountling'],
  },
  saltmere_water: {
    map: 'saltmere', method: 'water (Tideglide)', rate: 0.0667, band: [28, 35], gd: 'encounters_saltmere.json sm_harbour', revisit: true,
    note: 'Harbour rect (14,30)-(43,30) exists on the map.',
    slots: [{ species: 'pinchkin' }, { species: 'sandstarlet' }, { species: 'brinecube' }, { species: 'quaymouser' }, { species: 'polypip' }, { species: 'whelkin' },
      { species: 'bulwarkrab', level: [30, 34] }, { species: 'spraytern', level: [32, 35] }, { species: 'blubbet' }, { species: 'finnip' },
      { species: 'brineseal', level: [28, 30] }, { species: 'dawnfin', time: ['dawn'] }, { species: 'spratwyrm', time: ['dusk', 'night'] }],
    pending_art: ['inkmantle', 'kelpwyrm', 'lanternbell', 'inklet', 'reefcrown'],
  },
  thornwood_pond: {
    map: 'thornwood', method: 'water (Tideglide)', rate: 0.0667, band: [24, 30], gd: 'encounters_thornwood.json (gd_draft pond)', revisit: true, border: true,
    note: 'Border map, gd_draft only (no pond zone in the live tables).',
    slots: [{ species: 'puddlenip', level: [26, 30] }, { species: 'streambarb', level: [25, 30] }, { species: 'reedmoot' }],
    pending_art: [],
  },
};

// ---- trainers ---------------------------------------------------------------------------------------------------
// Keys use the runtime shape of src/battle/data/trainer_teams.js: "<map>.<npc id>" -> [{species, level}] or {byStarter}.
// Start point = World Design overnight GD teams (design/overnight_gd/trainers_*.json, data/masters.json); changed only where a
// rule broke (below-evo level, game/DEX evo conflict) or the play-check said so. Every change carries a `why`.
export const TRAINERS = [
  // East Road (route_east) — after Master 1
  { key: 'route_east.route_east_trainer_1', gd: 'tr_route_brookhollow_aurelith_a', cls: 'courier', name: 'Penrose', team: [['sailquill', 12], ['flockpup', 13]], why: 'GD 13/13. Lowered the bird lead: first trainer after Master 1 (player ~L10-11, earth/grass starters lose to wind). Play-check.' },
  { key: 'route_east.route_east_trainer_2', gd: 'tr_route_brookhollow_aurelith_b', cls: 'angler', name: 'Rue', team: [['ditchsnap', 13], ['pondkin', 14], ['puddlenip', 15]] },
  { key: 'route_east.route_east_trainer_3', gd: 'tr_route_brookhollow_aurelith_c', cls: 'kid', name: 'Bram', team: [['burlbeetle', 13], ['gloamtick', 14]], why: 'GD 14/14. Play-check: 3/10 first-try wins for tumbloam.' },
  { key: 'route_east.route_east_trainer_4', gd: 'tr_route_brookhollow_aurelith_d', cls: 'skater', name: 'Tilly', team: [['millwhirl', 14], ['sailquill', 14]], why: 'GD 15/16. Play-check: 0-3/10 first-try wins (two wind types vs earth/grass parties).' },
  { key: 'route_east.route_east_trainer_5', gd: 'tr_route_brookhollow_aurelith_e', cls: 'worker', name: 'Cass', team: [['bleatling', 16], ['loamworm', 16]] },
  { key: 'route_east.route_east_trainer_6', gd: 'tr_route_brookhollow_aurelith_f', cls: 'birder', name: 'Juno', optional: true, team: [['sailquill', 15], ['crowkin', 16]], why: 'GD 15/17 (optional). Ace one level lower; play-check.' },
  // Salt Road (route_aurelith_saltmere)
  { key: 'route_aurelith_saltmere.route_aurelith_saltmere_trainer_1', gd: 'tr_route_saltmere_aurelith_a', cls: 'harbour_hand', name: 'Dunstan', team: [['pinchkin', 16], ['brinepipit', 17]] },
  { key: 'route_aurelith_saltmere.route_aurelith_saltmere_trainer_2', gd: 'tr_route_saltmere_aurelith_b', cls: 'birder', name: 'Gil', team: [['sailquill', 16], ['brinepipit', 16]], why: 'GD 17/17. Play-check: 1-5/10 first-try wins.' },
  { key: 'route_aurelith_saltmere.route_aurelith_saltmere_trainer_3', gd: 'tr_route_saltmere_aurelith_c', cls: 'angler', name: 'Hana', team: [['blubbet', 17], ['sandstarlet', 17]] },
  { key: 'route_aurelith_saltmere.route_aurelith_saltmere_trainer_4', gd: 'tr_route_saltmere_aurelith_d', cls: 'camper', name: 'Iska', team: [['burlbeetle', 16], ['moatling', 16], ['grainling', 18]] },
  { key: 'route_aurelith_saltmere.route_aurelith_saltmere_trainer_5', gd: 'tr_route_saltmere_aurelith_e', cls: 'courier', name: 'Jem', team: [['tinderwren', 15], ['sailquill', 15]], why: 'GD 18/18. Play-check: 0-1/20 at 17/16 (fire+wind vs grass-heavy parties).' },
  { key: 'route_aurelith_saltmere.route_aurelith_saltmere_trainer_6', gd: 'tr_route_saltmere_aurelith_f', cls: 'veteran', name: 'Kerr', optional: true, team: [['whelkin', 19], ['sandstarlet', 19]] },
  // Ron 2 (Saltmere) — Ron's partner is the starter that beats the player's (as Ron 1). Ron 1 had peeplark, so Ron 2 has larkspar.
  { key: 'saltmere.saltmere_ron_2', gd: 'ron_rival_saltmere', cls: 'rival', name: 'Ron', byStarter: {
    nibbin: [['sailquill', 15], ['grainling', 15], ['emberlunx', 17]],
    cindrip: [['sailquill', 16], ['bramblehog', 17], ['brookhorn', 18]],
    rillop: [['sailquill', 16], ['larkspar', 16], ['gnawford', 18]], // Nibbin swap Oct 23 2026: Ron fields the earth STARTER line (was burrowmane)
    tumbloam: [['sailquill', 15], ['grainling', 15], ['emberlunx', 17]], // legacy v0.2.0-alpha saves that picked Tumbloam
  }, why: { all: 'map draft 17/18/20: play-check 0-4/10 (no retry; Ron can be lost). Lowered to 16/16-17/18 (evolved aces stay >= evo 16).', rillop: 'map draft had lancebeetle L18; game evo is 32 (thornpod->lancebeetle), DEX 12. Swapped for larkspar L18 (Ron 1 had peeplark).' } },
  // Saltmere hall helpers + Master 2 (data/masters.json halls[1])
  { key: 'saltmere_hall_int.saltmere_hall_int_h1', gd: 'tr_hall_saltmere_h1', cls: 'hall_helper', name: 'Nell', team: [['sandstarlet', 17], ['blubbet', 17]] },
  { key: 'saltmere_hall_int.saltmere_hall_int_h2', gd: 'tr_hall_saltmere_h2', cls: 'hall_helper', name: 'Ivo', team: [['medulet', 18], ['whelkin', 18]] },
  { key: 'saltmere_hall_int.saltmere_hall_int_h3', gd: 'tr_hall_saltmere_h3', cls: 'hall_helper', name: 'Sully', team: [['finnip', 19], ['ribboneel', 19]] },
  { key: 'saltmere_hall_int.saltmere_hall_int_master', gd: 'master_saltmere', cls: 'master', name: 'Nerys Bryde', master: true, team: [['quaymouser', 18], ['polypip', 19], ['spratwyrm', 21]] },
  // Thornwood (border map): GD trainers with text written but no NPC placed. Staged only.
  { key: 'thornwood.thornwood_c_gardener', gd: 'tr_thornwood_c', cls: 'gardener', name: 'Kit', border: true, unplaced: true, team: [['cobblepup', 10], ['briarlet', 12]] },
  { key: 'thornwood.thornwood_d_kid', gd: 'tr_thornwood_d', cls: 'kid', name: 'Lio', border: true, unplaced: true, team: [['gloamtick', 12]] },
  { key: 'thornwood.thornwood_e_researcher', gd: 'tr_thornwood_e', cls: 'researcher', name: 'Nell', border: true, unplaced: true, team: [['thornpod', 12], ['burlbeetle', 13]],
    why: 'GD had lancebeetle L12; game evo is 32 (DEX 12). Swapped for its pre-form thornpod L12. Name "Nell" clashes with Saltmere hall helper h1 Nell (flag for Text Bot).' },
];

// Crystal grades unlocked from the Benefits Board (Oct 23, 2026; Gary 12:17 PM CT: "you can get more powerful crystal
// from the board nodes"). THE one data file for crystal grades: every grade number, the board node, the rank each grade
// needs and where the board stock is hidden live here. Plain data, no imports (src/systems/items.js reads it
// synchronously, so it is a .js module, not .json).
//
// Read by:
//   src/systems/items.js  BATTLE_ITEMS: each grade's item gets kCrystalGrade = grade. The battle engine
//                         (vendor/battle-sim/sim/kilumen.ts runCrystal) and src/battle/capture.js already multiply the
//                         capture chance by the chosen crystal's kCrystalGrade; their formula is NOT changed here.
//   src/systems/shop.js   stockFor(): a gated grade (rank > 0) is stocked only once company.board[node] >= rank.
//                         Prices stay in src/systems/data/shops.json (basePrices / regions[*].prices). No real money.
//
// company.board = { nodeId: rank } (src/overworld/save.js, docs/systems_open_source_eval.md §7–8).
// Region 1 (Brookhollow, Fernwick, Sunmeadow Fields, Greystone) is HIDDEN: no board stock is added there and its shop lists stay exactly as before
// (Prime Crystal keeps its existing Master-coin tier there via `legacyStockIn`). The board itself is not in the game yet
// (no points, no UI), so today no save can own a crystal_grade rank.
// Every number is a PLACEHOLDER until Gary signs off. Player-facing names: fallbacks only; Text Bot owns the catalogue
// (request: data/textbot_requests_crystals.md).
export const CRYSTAL_GRADES = {
  node: 'crystal_grade', // Benefits Board node id (CRYSTAL LAB branch, docs §7.3). PROPOSAL id.
  // Region 1 zones (world_layout.json zone ids up to Master 1 + Greystone): board stock OFF, shop lists unchanged.
  // A shop with no zone (null) counts as hidden too. Remove a zone from this list to turn the board stock on there.
  hiddenInZones: ['brookhollow', 'fernwick', 'sunmeadow_fields', 'greystone_caverns'],
  grades: [
    // rank = crystal_grade rank needed to stock it (0 = no node needed). idLevel/cost = board purchase proposal (docs §7.3
    // tier gates ID 1 / 15 / 40); nothing enforces them until the board purchase code lands.
    { item: 'dominance_crystal', grade: 1, rank: 0, name: 'Dominance Crystal', num: 5 },
    { item: 'fine_crystal', grade: 1.25, rank: 1, idLevel: 1, cost: 1, name: 'Fine Crystal', num: 7 }, // name: Text Bot to confirm
    { item: 'dominance_crystal_plus', grade: 1.5, rank: 2, idLevel: 15, cost: 2, name: 'Prime Crystal', num: 6, legacyStockIn: ['brookhollow', 'fernwick'] },
    { item: 'apex_crystal', grade: 2, rank: 3, idLevel: 40, cost: 3, name: 'Apex Crystal', num: 8 }, // name: Text Bot to pick
  ],
};

/** grade row for an item id, or null */
export const gradeRow = (item) => CRYSTAL_GRADES.grades.find((g) => g.item === item) || null;
/** owned crystal_grade rank from a company save object ({ board: { nodeId: rank } }) */
export const crystalRank = (company) => Math.max(0, Math.floor(Number(company?.board?.[CRYSTAL_GRADES.node]) || 0));
/** item ids whose grade the rank has unlocked (rank 0 -> only the base crystal) */
export const unlockedCrystals = (company) => CRYSTAL_GRADES.grades.filter((g) => g.rank <= crystalRank(company)).map((g) => g.item);

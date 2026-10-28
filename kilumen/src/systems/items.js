// Kilumen items: the ONE item table (bag, field use, shop, pickups AND battle). systems merge, Oct 22, 2026
// (was src/systems/bag_items.js). Ids are game ids (text/overworld_lines.json system_item_catalogue + the World
// Design placeholder ids in art/world/overworld/items/ITEM_PLACEHOLDERS.json).
// `battle` rows are the battle-engine numbers: src/battle/data/rules.js buildItems() builds the engine's item
// table from BATTLE_ITEMS, so the field and the battle can never disagree. This module imports only plain data (no cycle;
// safe on a server). Effect amounts are PLACEHOLDER (design/MECHANICS_PARITY.md) until Gary signs them off.
import { CRYSTAL_GRADES } from './data/crystal_grades.js?v=v0.2.37-alpha'; // crystal grades + Benefits Board node (Oct 23, 2026)

/** pocket ids: text/overworld_lines.json comfort.bag_pockets */
export const POCKETS = ['care', 'feeds', 'gear', 'crystals', 'key', 'logs'];

/** Battle-usable items: engine num, engine name and the Kilumen effect fields read by the battle (k*). */
export const BATTLE_ITEMS = {
  tonic_small: { num: 1, name: 'Small Remedy', kHeal: 20 },
  tonic_large: { num: 2, name: 'Big Remedy', kHeal: 60 },
  energy_tonic: { num: 3, name: 'Pep Remedy', kEnergy: 5 }, // in battle too: Gary Oct 22 (flag config.js pepRemedyRestoresEnergyInBattle)
  calm_tea: { num: 4, name: 'Calm Tea', kCure: true },
  dominance_crystal: { num: 5, name: 'Dominance Crystal', kCrystalGrade: 1 },
  dominance_crystal_plus: { num: 6, name: 'Prime Crystal', kCrystalGrade: 1.5 },
};
// Crystal grades (Gary 12:17 PM CT Oct 23, 2026: "you can get more powerful crystal from the board nodes"): every grade
// number comes from src/systems/data/crystal_grades.js; new grades (Fine, top tier) are added here. The battle reads kCrystalGrade.
for (const g of CRYSTAL_GRADES.grades) BATTLE_ITEMS[g.item] = { ...(BATTLE_ITEMS[g.item] || { num: g.num, name: g.name }), kCrystalGrade: g.grade };

// Overworld fields: pocket, field effect, key, stack (overrides the key-item cap of 1), money (pickup coins), held.
const FIELD = {
  tonic_small: { pocket: 'care', field: 'heal' },
  tonic_large: { pocket: 'care', field: 'heal' },
  energy_tonic: { pocket: 'care', field: 'energy' }, // Gary Oct 22, 2026: energy potions restore energy but are expensive (config.potionsVsRest = potions_restore)
  calm_tea: { pocket: 'care', field: 'cure' },
  trail_mix: { pocket: 'feeds', field: null },        // Trail Buddy snack: Warmth system (later pass)
  feed_bag_small: { pocket: 'feeds', field: null },
  feed_bag: { pocket: 'feeds', field: null },
  vigor_seed: { pocket: 'feeds', field: null },
  crystal_dust: { pocket: 'crystals', field: null },
  dominance_crystal: { pocket: 'crystals', field: null },
  dominance_crystal_plus: { pocket: 'crystals', field: null },
  // The Missing Note: four records (fernwick, thornwood, route1 placed; Lanternport unplaced). Key pocket, but they
  // stack to 4 (a key-item cap of 1 made the second pickup "pocket full"). Each pickup sets the lowest unset
  // flg_record_N (src/systems/index.js pickup).
  old_record: { pocket: 'key', field: null, key: true, stack: 4 },
  coin_pouch_small: { pocket: null, money: 100 },     // PLACEHOLDER tuning: coins in a small purse
  gold_coin: { pocket: 'gear', field: null, held: true }, // PLACEHOLDER id (DESIGN gold coin: x1.5 trainer money)
};
for (const g of CRYSTAL_GRADES.grades) if (!FIELD[g.item]) FIELD[g.item] = { pocket: 'crystals', field: null }; // board crystal grades

/** Full table used by the bag: { id: {id, pocket, field, ..., heal, energy, cure, battle, name} } */
export const ITEMS = Object.fromEntries(Object.entries(FIELD).map(([id, d]) => {
  const e = BATTLE_ITEMS[id];
  return [id, { id, ...d, heal: e?.kHeal || 0, energy: e?.kEnergy || 0, cure: !!e?.kCure, battle: !!e, name: e?.name || null }];
}));

// Overworld item fields for the bag (pocket, field effect, sellable, pickup money). systems-gd pass, Oct 22, 2026.
// Ids are the SAME game ids as src/battle/data/rules.js buildItems() (+ the World Design placeholder ids in
// art/world/overworld/items/ITEM_PLACEHOLDERS.json). Coder owns the shared src/systems/items.js; when it lands,
// pass its table to createBag({ items }) and delete this file. Battle numbers (kHeal, kCure...) are read from
// buildItems() so the field and the battle never disagree.
import { buildItems } from '../battle/data/rules.js';

const engine = Object.fromEntries(Object.values(buildItems()).map((it) => [it.kGameId, it]));

/** pocket ids: text/overworld_lines.json comfort.bag_pockets */
export const POCKETS = ['care', 'feeds', 'gear', 'crystals', 'key', 'logs'];

const base = {
  tonic_small: { pocket: 'care', field: 'heal' },
  tonic_large: { pocket: 'care', field: 'heal' },
  energy_tonic: { pocket: 'care', field: 'energy' }, // Gary pending potions_vs_rest: config.potionsVsRest
  calm_tea: { pocket: 'care', field: 'cure' },
  trail_mix: { pocket: 'feeds', field: null },        // Trail Buddy snack: Warmth system (later pass)
  feed_bag_small: { pocket: 'feeds', field: null },
  feed_bag: { pocket: 'feeds', field: null },
  vigor_seed: { pocket: 'feeds', field: null },
  crystal_dust: { pocket: 'crystals', field: null },
  dominance_crystal: { pocket: 'crystals', field: null },
  dominance_crystal_plus: { pocket: 'crystals', field: null },
  old_record: { pocket: 'key', field: null, key: true },
  coin_pouch_small: { pocket: null, money: 100 },     // PLACEHOLDER tuning: coins in a small purse
  gold_coin: { pocket: 'gear', field: null, held: true }, // PLACEHOLDER id (DESIGN gold coin: x1.5 trainer money)
};

export const ITEMS = Object.fromEntries(Object.entries(base).map(([id, d]) => {
  const e = engine[id];
  return [id, { id, ...d, heal: e?.kHeal || 0, energy: e?.kEnergy || 0, cure: !!e?.kCure, battle: !!e, name: e?.name || null }];
}));

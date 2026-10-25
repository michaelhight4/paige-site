// Kilumen battle rules (constants + conditions + items + format). Numbers are PLACEHOLDERS taken
// from the proposals in design/MECHANICS_PARITY.md (row in brackets) until Gary signs them off.
import { BATTLE_ITEMS } from '../../systems/items.js?v=v0.2.17-alpha';
export const KILUMEN_RULES = {
  critStages: [0, 20, 8, 2, 1], // Clean Strike 1/20 base [B8]
  critMult: 1.4,                // [B8]
  affinity: 1.3,                // same-element bonus [B7]
  affinitySub: 1.3,             // PLACEHOLDER: sub-element affinity (DD unclear)
  strongMult: 1.5, weakMult: 0.6, // [B6]
  overuseDamage: 0.6, overuseAccuracy: 0.7, overuseSelfDamage: 1 / 8, // PLACEHOLDER [B12]
  warmthEndure: 200,            // PLACEHOLDER: Warmth needed for the once-per-battle endure
  retreatBase: 128, retreatPerAttempt: 30, // PLACEHOLDER [B16]
  catchStatus: { drowsy: 2, scorched: 1.5 }, catchShakes: 3, // [B17], multipliers PLACEHOLDER (catchShakes: legacy, unused since Oct 23)
  catchHpWeight: 29 / 30, catchHpCurve: 0.85, catchMin: 0.005, catchMax: 0.95, catchPulses: 4, // capture (Gary Oct 23 2026, retuned 12:16 PM CT: full HP ~2%): see src/battle/capture.js
  xpDivisor: 7, xpTrainerMult: 1.5, xpCurveMult: 0.8, maxLevel: 100, // PLACEHOLDER [B20]
  partyMax: 6,
};
// Variant stat multipliers [B27]; amounts PLACEHOLDER. Cosmic is cosmetic only.
export const VARIANT_MODS = {
  large: { hp: 1.1, def: 1.1 }, small: { spe: 1.1 }, enraged: { atk: 1.1 }, cosmic: {},
};

export function buildConditions() {
  return {
    // Scorched: chip damage at end of turn [B11]. Amount PLACEHOLDER (1/16).
    scorched: {
      name: 'Scorched', effectType: 'Status',
      onStart(target) { this.add('-status', target, 'scorched'); },
      onResidualOrder: 10,
      onResidual(creature) { this.damage(creature.baseMaxhp / 16); },
    },
    // Drowsy: skips turns [B11]. 1-3 turns PLACEHOLDER.
    drowsy: {
      name: 'Drowsy', effectType: 'Status',
      onStart(target) { this.add('-status', target, 'drowsy'); this.effectState.time = this.random(2, 5); },
      onBeforeMovePriority: 10,
      onBeforeMove(creature) {
        // carried-in Drowsy without a turn count (save data) gets the shortest duration
        creature.statusState.time = (Number.isFinite(creature.statusState.time) ? creature.statusState.time : 2) - 1;
        if (creature.statusState.time <= 0) { creature.cureStatus(); return; }
        this.add('cant', creature, 'drowsy');
        return false;
      },
    },
  };
}

// Bag items usable in battle. The numbers live in src/systems/items.js BATTLE_ITEMS (one item table for field and
// battle; systems merge Oct 22, 2026). Ids and names from text/overworld_lines.json system_item_catalogue.
export function buildItems() {
  // engine ids are the game ids without underscores (engine toID); kGameId maps back
  return Object.fromEntries(Object.entries(BATTLE_ITEMS).map(([id, it]) => [id.replace(/_/g, ''),
    { gen: 9, desc: '', shortDesc: '', ...it, kGameId: id, kKey: id.replace(/_/g, '') }]));
}

export function buildFormats() {
  return [
    { name: '[Kilumen] Single', mod: 'base', gameType: 'singles', ruleset: [], effectType: 'Format' },
  ];
}

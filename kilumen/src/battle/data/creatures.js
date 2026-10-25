// Kilumen creatures for the battle engine. Names/elements/lines from SPECIES in src/ui/data.js.
// PLACEHOLDER stats: no stat sheets exist yet (design/MECHANICS_PARITY.md B2/B3). Each stat uses one
// flat base by evolution stage so the engine has numbers; catchRate/baseXp are PLACEHOLDER too.
// Stat ids hp/atk/def/spa/spd/spe are internal; player-facing names are Vitality/Might/Guard/Focus/Resolve/Agility (B2).
import { SPECIES } from '../../ui/data.js?v=v0.2.12-alpha';
import { cap } from './elements.js?v=v0.2.12-alpha';

export const STAT_NAMES = { hp: 'Vitality', atk: 'Might', def: 'Guard', spa: 'Focus', spd: 'Resolve', spe: 'Agility' };
const STAGE_BASE = [45, 60, 80]; // PLACEHOLDER
const LONE_BASE = 60;           // PLACEHOLDER (species with no line yet)

export function buildCreatures() {
  const out = {};
  const lines = {};
  for (const s of SPECIES) if (s.line) (lines[s.line] = lines[s.line] || []).push(s.id);
  SPECIES.forEach((s, n) => {
    if (s.synced) { out[s.id] = syncedCreature(s, n); return; } // creature sync (Oct 23, 2026): generated PLACEHOLDER numbers
    const line = s.line ? lines[s.line] : null;
    const stage = line ? line.indexOf(s.id) : -1;
    const b = stage >= 0 ? STAGE_BASE[stage] : LONE_BASE;
    out[s.id] = {
      num: n + 1, name: s.name, types: s.el.map(cap),
      baseStats: { hp: b, atk: b, def: b, spa: b, spd: b, spe: b },
      abilities: { 0: 'No Ability' }, weightkg: 10, gender: 'N',
      prevo: stage > 0 ? SPECIES.find((x) => x.id === line[stage - 1]).name : undefined,
      evos: line && stage < line.length - 1 ? [SPECIES.find((x) => x.id === line[stage + 1]).name] : undefined,
      evoLevel: stage > 0 ? 16 * stage : undefined, // PLACEHOLDER
      catchRate: stage <= 0 ? 0.6 : stage === 1 ? 0.4 : 0.2, // PLACEHOLDER rarity term (B17)
      baseXp: 50 + 40 * Math.max(0, stage), // PLACEHOLDER
    };
  });
  return out;
}

// Synced species (tools/sync_creatures.mjs, src/ui/species_synced.gen.js): stats / catch rate / base XP are PLACEHOLDERS
// generated from DEX_450 type + rarity + stage (flag ph:1). prevo/evos only name species that are registered.
function syncedCreature(s, n) {
  const nameOf = (id) => SPECIES.find((x) => x.id === id)?.name;
  return {
    num: n + 1, name: s.name, types: s.el.map(cap), baseStats: { ...s.baseStats },
    abilities: { 0: 'No Ability' }, weightkg: 10, gender: 'N',
    prevo: s.prevo ? nameOf(s.prevo) : undefined, evos: s.evo ? [nameOf(s.evo)] : undefined,
    evoLevel: s.prevo ? s.evoLevel : undefined, catchRate: s.catchRate, baseXp: s.baseXp, placeholder: true,
  };
}

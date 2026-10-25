// Assembles the data object the vendored engine expects (vendor/battle-sim, installData()).
import { buildTypeChart } from './elements.js?v=v0.2.18-alpha';
import { buildSkills } from './skills.js?v=v0.2.18-alpha';
import { buildCreatures } from './creatures.js?v=v0.2.18-alpha';
import { KILUMEN_RULES, VARIANT_MODS, buildConditions, buildItems, buildFormats } from './rules.js?v=v0.2.18-alpha';

export { STAT_NAMES } from './creatures.js?v=v0.2.18-alpha';
export { skillIdsFor, toID } from './skills.js?v=v0.2.18-alpha';

export function buildData(overrides = {}) {
  const creatures = buildCreatures();
  return {
    CreatureDex: creatures,
    Moves: buildSkills(),
    Items: buildItems(),
    Abilities: { noability: { num: 0, name: 'No Ability', rating: 0, desc: '', shortDesc: '' } },
    Conditions: buildConditions(),
    TypeChart: buildTypeChart(overrides.chart),
    Natures: {},
    Rulesets: {},
    FormatsData: Object.fromEntries(Object.keys(creatures).map((id) => [id, { tier: 'Kilumen' }])),
    Learnsets: {},
    Aliases: {},
    Scripts: { gen: 9, kilumen: { ...KILUMEN_RULES, ...(overrides.rules || {}) }, variantMods: VARIANT_MODS, effectivenessCap: overrides.effectivenessCap ?? 1 },
    Formats: buildFormats(),
  };
}

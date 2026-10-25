// Kilumen skills for the battle engine, built from PLACEHOLDER_SKILLS in src/ui/data.js
// (names already in the game; owner Character models / SKR). Energy per slot 15/12/9/6 as skillsFor().
// Every effect, category, accuracy and priority below is a PLACEHOLDER for Gary; see PLACEHOLDERS in README.md.
import { PLACEHOLDER_SKILLS } from '../../ui/data.js?v=v0.2.16-alpha';
import { cap } from './elements.js?v=v0.2.16-alpha';

// PLACEHOLDER (creature sync): nearest existing skill pool for elements that have none (same table as tools/sync_creatures.mjs).
export const SKILL_POOL_ALIAS = { grass: 'earth', bug: 'earth', magma: 'fire', freshwater: 'water', sea: 'water', swamp: 'water', rain: 'water',
  bird: 'wind', angelic: 'light', god: 'light', ghost: 'dark', demon: 'dark', devil: 'dark', spirit: 'mystic', dragos: 'mystic', legendary: 'mystic' };
export const toID = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '');

// PLACEHOLDER: which elements use Focus/Resolve (special) instead of Might/Guard (physical).
const SPECIAL = new Set(['fire', 'water', 'light', 'angelic', 'dark', 'ghost', 'mystic', 'spirit', 'wind', 'bird', 'sea', 'magma']);

// PLACEHOLDER effects for skills that have no power, plus a few tags so priority/status can be tested.
const EXTRA = {
  burrowdown: { self: { boosts: { def: 1 } } },        // has power (25): hits the foe, then Guard +1
  tailwind: { boosts: { spe: 1 }, target: 'self' },
  dawnglow: { heal: [1, 4], target: 'self', flags: { heal: 1 } },
  fadeout: { boosts: { evasion: 1 }, target: 'self' },
  unravel: { heal: [1, 4], target: 'self', flags: { heal: 1 } },
  huff: { status: 'drowsy', accuracy: 75 },          // inflicts Drowsy
  sparksneeze: { secondary: { chance: 30, status: 'scorched' } }, // may Scorch
  coalcharge: { priority: -1, tags: ['heavy'] },
  swoop: { priority: 1, tags: ['swift'] },
  ferretdash: { priority: 1, tags: ['swift'] },
};

export function buildSkills() {
  const out = {};
  for (const list of Object.values(PLACEHOLDER_SKILLS)) {
    list.forEach(([name, el, power], i) => {
      const id = toID(name);
      if (out[id]) return;
      const x = EXTRA[id] || {};
      out[id] = {
        num: Object.keys(out).length + 1, name, type: cap(el), basePower: power,
        category: power ? (SPECIAL.has(el) ? 'Special' : 'Physical') : 'Status',
        accuracy: x.accuracy ?? (power ? 95 : true), pp: 15 - i * 3, priority: x.priority || 0,
        target: x.target || 'normal', flags: { protect: 1, ...(x.flags || {}) }, secondary: x.secondary || null,
        boosts: x.boosts, self: x.self, heal: x.heal, status: x.status, kTags: x.tags || [],
        shortDesc: '', desc: '',
      };
      if (out[id].target === 'self') out[id].flags = x.flags || {};
    });
  }
  // Fallback skill the engine uses only if a creature has no usable skill at all
  // (cannot happen in normal play because overuse keeps every skill selectable).
  out.struggle = { num: 0, name: '[PLACEHOLDER fallback skill]', type: 'Normal', basePower: 30, category: 'Physical', accuracy: true, pp: 1,
    noPPBoosts: true, priority: 0, target: 'randomNormal', flags: {}, struggleRecoil: true, secondary: null, shortDesc: '', desc: '' };
  return out;
}

/** skills a species knows, in slot order (same rule as skillsFor in src/ui/data.js) */
export function skillIdsFor(elements, pool = null) {
  // creature sync (Oct 23, 2026): synced species pass their skillPool; elements with no pool of their own use the nearest one
  const list = PLACEHOLDER_SKILLS[pool] || PLACEHOLDER_SKILLS[elements[0]] || PLACEHOLDER_SKILLS[SKILL_POOL_ALIAS[elements[0]]] || PLACEHOLDER_SKILLS.normal;
  return list.map(([name]) => toID(name));
}

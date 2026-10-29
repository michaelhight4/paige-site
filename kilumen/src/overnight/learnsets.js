// Overnight systems (Oct 23, 2026): B21 learnsets + the learn prompt. OVERNIGHT flag `learnsets` (default OFF).
// [PLACEHOLDER] No learnset data exists yet (Story Bot / SKR). learnsetFor() GENERATES one deterministically from the
// placeholder skill pools (src/ui/data.js PLACEHOLDER_SKILLS): the species' own 4 default skills at level 1, then skills
// from its second element, the normal pool and one hashed 'cousin' element at levels 8, 14, 20, 27, 34. Every entry is
// tagged placeholder:true. Replace with real data by passing {data: {species: [{level, skill}]}} (data wins).
import { PLACEHOLDER_SKILLS } from '../ui/data.js?v=v0.2.78-alpha';
import { toID } from '../battle/data/skills.js?v=v0.2.78-alpha';
import { maxEnergy } from '../systems/creature.js?v=v0.2.78-alpha';

export const PLACEHOLDER_LEVELS = [8, 14, 20, 27, 34];

function hash(s) { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

/** [{level, skill, placeholder}] sorted by level. els = species elements, defaults = its default skill ids. */
export function learnsetFor(species, els, defaults, data = null) {
  if (data?.[species]) return data[species].map((e) => ({ ...e, placeholder: false }));
  const out = defaults.map((skill) => ({ level: 1, skill, placeholder: true }));
  const have = new Set(defaults);
  const keys = Object.keys(PLACEHOLDER_SKILLS).sort();
  const cousin = keys[hash(species) % keys.length];
  const pools = [els[1], 'normal', cousin, els[0]].filter(Boolean);
  const cand = [];
  for (const p of pools) for (const [name] of PLACEHOLDER_SKILLS[p] || []) { const id = toID(name); if (!have.has(id) && !cand.includes(id)) cand.push(id); }
  PLACEHOLDER_LEVELS.forEach((level, i) => { if (cand[i]) out.push({ level, skill: cand[i], placeholder: true }); });
  return out;
}

/** Skills learned on the way from level a (exclusive) to b (inclusive) that the creature does not already know. */
export function learnsBetween(set, a, b, known = []) {
  return set.filter((e) => e.level > a && e.level <= b && !known.includes(e.skill)).map((e) => e.skill);
}

/** Pure: apply a learn. slot = index to replace when full (null = keep all four). -> {result, old} */
export function applyLearn(c, skill, slot = null) {
  c.skills ||= [];
  if (c.skills.includes(skill)) return { result: 'known' };
  if (c.skills.length < 4) { c.skills.push(skill); fillEnergy(c, c.skills.length - 1); return { result: 'learned' }; }
  if (slot == null || slot < 0 || slot > 3) return { result: 'kept' };
  const old = c.skills[slot]; c.skills[slot] = skill;
  fillEnergy(c, slot); // the new skill starts with a full energy bar (PLACEHOLDER rule; Gary to confirm)
  return { result: 'swapped', old };
}

function fillEnergy(c, i) {
  if (!Array.isArray(c.energy)) return; // null = every bar full
  try { c.energy[i] = maxEnergy(c)[i]; } catch { c.energy = null; }
}

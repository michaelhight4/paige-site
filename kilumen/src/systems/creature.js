// Kilumen creature records: factory, derived stats, serialise / deserialise. systems-gd pass, Oct 22, 2026.
// Shape agreed with Coder (battle pass). Stored, never derived:
//   { uid, species, nickname, level, xp (total), hp (current, 0 = fainted), energy ([per skill] or null = full),
//     status ('' or engine condition id), warmth 0-100, variant ('' | 'large' | 'small' | 'enraged' | 'cosmic'),
//     lineage, rt, skills [ids], held, locked, origin {map, how, day} }
// maxHp / maxEnergy / stats are DERIVED (statsOf) from the battle data, never saved. `uid` is the save key
// (save.js names it uid); `id` is accepted on input as an alias.
import { buildCreatures } from '../battle/data/creatures.js?v=v0.2.77-alpha';
import { buildSkills, skillIdsFor } from '../battle/data/skills.js?v=v0.2.77-alpha';
import { KILUMEN_RULES, VARIANT_MODS } from '../battle/data/rules.js?v=v0.2.77-alpha';
import { SPECIES } from '../ui/data.js?v=v0.2.77-alpha';

let _creatures = null, _skills = null;
const creatures = () => (_creatures ||= buildCreatures());
const skillsData = () => (_skills ||= buildSkills());

/** Total XP to be at `level` (same curve as battle.js xpForLevel; PLACEHOLDER [B20]). */
export const xpForLevel = (level, rules = KILUMEN_RULES) => Math.floor(rules.xpCurveMult * level ** 3);
export function levelForXp(xp, rules = KILUMEN_RULES) {
  let L = 1;
  while (L < rules.maxLevel && xpForLevel(L + 1, rules) <= xp) L++;
  return L;
}

export const speciesInfo = (sp) => SPECIES.find((s) => s.id === sp) || null;
export const speciesName = (sp) => speciesInfo(sp)?.name || (sp ? sp[0].toUpperCase() + sp.slice(1) : '?');
export const VARIANT_MARK = '✦'; // variant creatures (c.variant set) show this right after the name
export const baseName = (c) => (c?.nickname || speciesName(c?.species));
export const displayName = (c) => baseName(c) + (c?.variant ? ' ' + VARIANT_MARK : '');
export const defaultSkills = (sp) => skillIdsFor(speciesInfo(sp)?.el || ['normal'], speciesInfo(sp)?.skillPool);
export const idOf = (c) => c?.uid || c?.id || null;

/**
 * Default stats provider. Matches the engine exactly (checked 512/512 against KilumenBattle maxhp,
 * tests/systems_gd.test.mjs): maxHp = floor(2*base*L/100) + L + 10, then the variant hp multiplier.
 * Energy per skill = that skill's pp. Swap the provider with setStatsProvider() if the engine formula moves.
 */
export function engineStats(c) {
  const L = Math.max(1, c.level || 1);
  const base = creatures()[c.species]?.baseStats?.hp ?? 60;
  let hp = Math.floor((2 * base * L) / 100) + L + 10;
  const mod = VARIANT_MODS[c.variant]?.hp;
  if (mod) hp = Math.floor(hp * mod);
  const sk = skillsData();
  const energy = (c.skills?.length ? c.skills : defaultSkills(c.species)).map((id) => sk[id]?.pp ?? 10);
  return { maxHp: hp, maxEnergy: energy };
}
/** v0.2.11 party screen: the five battle stats (same base-stat formula as HP, neutral; variant multipliers applied). */
export function battleStats(c) {
  const L = Math.max(1, c.level || 1), b = creatures()[c.species]?.baseStats || {}, out = {};
  for (const k of ['atk', 'def', 'spa', 'spd', 'spe']) { let v = Math.floor((2 * (b[k] ?? 60) * L) / 100) + 5; const m = VARIANT_MODS[c.variant]?.[k]; if (m) v = Math.floor(v * m); out[k] = v; }
  return out;
}
let provider = engineStats;
export function setStatsProvider(fn) { provider = fn || engineStats; }
export const statsOf = (c) => provider(c);

let uidSeq = 0;
export function newUid(prefix = 'c') {
  const b = new Uint32Array(1);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(b); else b[0] = Math.random() * 2 ** 32;
  return `${prefix}-${b[0].toString(36)}${(uidSeq++).toString(36)}`;
}

/** New creature at full health. opts: {species (required), level, nickname, variant, warmth, rt, lineage, skills, origin, uid} */
export function createCreature(opts) {
  if (!opts || typeof opts.species !== 'string' || !opts.species) throw new Error('createCreature: species required');
  const level = Math.max(1, Math.min(KILUMEN_RULES.maxLevel, Math.floor(opts.level || 5)));
  const c = {
    uid: opts.uid || opts.id || newUid(), species: opts.species, nickname: opts.nickname || null,
    level, xp: xpForLevel(level), hp: 0, energy: null, status: '',
    warmth: clampWarmth(opts.warmth), variant: opts.variant || '', lineage: opts.lineage ?? null, rt: opts.rt ?? null,
    skills: (opts.skills?.length ? opts.skills : defaultSkills(opts.species)).slice(0, 4),
    held: opts.held || null, locked: false, origin: opts.origin || null,
  };
  return healFull(c);
}

export function clampWarmth(w) { return Math.max(0, Math.min(100, Math.round(Number(w) || 0))); }
export const maxHp = (c) => statsOf(c).maxHp;
export const maxEnergy = (c) => statsOf(c).maxEnergy;
export const isFainted = (c) => c.hp === 0;
/** Current energy per skill (null in the save = full). */
export const energyOf = (c) => { const mx = maxEnergy(c); return mx.map((m, i) => Math.max(0, Math.min(m, Array.isArray(c.energy) ? c.energy[i] ?? m : m))); };

/** Carer rest: full HP, energy and status. Warmth is never touched (DESIGN: resting never costs bond). */
export function healFull(c) {
  c.hp = maxHp(c); c.energy = maxEnergy(c).slice(); c.status = '';
  return c;
}
export const needsHeal = (c) => c.hp < maxHp(c) || !!c.status || energyOf(c).some((e, i) => e < maxEnergy(c)[i]);

/** Plain JSON for the save (no derived fields). Accepts `id` as an alias for `uid`. */
export function serialise(c) {
  const o = {
    uid: idOf(c), species: c.species, nickname: c.nickname || null, level: c.level, xp: c.xp, hp: c.hp,
    energy: Array.isArray(c.energy) ? c.energy.slice() : null, status: c.status || '', warmth: clampWarmth(c.warmth),
    variant: c.variant || '', lineage: c.lineage ?? null, rt: c.rt ?? null, skills: (c.skills || []).slice(),
    held: c.held || null, locked: !!c.locked, origin: c.origin || null,
  };
  if (c.ath && typeof c.ath === 'object' && c.ath.q) o.ath = JSON.parse(JSON.stringify(c.ath)); // sports athletics roll (src/sports/athletics.js; re-rolls from uid if absent)
  return o;
}

/**
 * Save / old-save / engine object -> full creature. Missing level -> 5 (soul-pass saves had none),
 * missing hp -> full (old saves), hp clamped to max, xp raised to the level's floor.
 */
export function deserialise(o, { fallbackLevel = 5 } = {}) {
  if (!o || typeof o.species !== 'string') return null;
  const level = Number.isInteger(o.level) && o.level > 0 ? Math.min(o.level, KILUMEN_RULES.maxLevel) : fallbackLevel;
  const c = {
    uid: idOf(o) || newUid(), species: o.species, nickname: o.nickname || null, level,
    xp: Math.max(xpForLevel(level), Math.floor(Number(o.xp) || 0)), hp: 0, energy: null,
    status: typeof o.status === 'string' ? o.status : '', warmth: clampWarmth(o.warmth), variant: typeof o.variant === 'string' ? o.variant : '',
    lineage: o.lineage ?? null, rt: o.rt ?? null,
    skills: Array.isArray(o.skills) && o.skills.length ? o.skills.filter((s) => typeof s === 'string').slice(0, 4) : defaultSkills(o.species),
    held: typeof o.held === 'string' ? o.held : null, locked: o.locked === true, origin: o.origin ?? (o.caughtAt ? { at: o.caughtAt } : null),
  };
  if (o.ath && typeof o.ath === 'object' && o.ath.q && typeof o.ath.q === 'object') c.ath = JSON.parse(JSON.stringify(o.ath)); // sports roll (optional)
  const mx = maxHp(c);
  c.hp = Number.isFinite(o.hp) ? Math.max(0, Math.min(mx, Math.floor(o.hp))) : mx;
  c.energy = Array.isArray(o.energy) ? energyOf({ ...c, energy: o.energy }) : maxEnergy(c).slice();
  return c;
}

/** Fold a KilumenBattle.result().team back into the party (matched by uid; level/xp/hp/energy/status). */
export function applyBattleTeam(party, team = []) {
  for (const t of team) {
    const c = party.find((p) => idOf(p) && idOf(p) === idOf(t));
    if (!c) continue;
    if (Number.isInteger(t.level)) c.level = t.level;
    if (Number.isFinite(t.xp)) c.xp = t.xp;
    if (Number.isFinite(t.hp)) c.hp = Math.max(0, Math.min(maxHp(c), t.hp));
    if (Array.isArray(t.energy)) c.energy = t.energy.slice();
    if (typeof t.status === 'string') c.status = t.status;
  }
  return party;
}

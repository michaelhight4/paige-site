// QoL batch C pure logic (no DOM). UI wiring: ./index.js. Tests: tests/qol_batch_c.test.mjs.
import { checkText } from '../online/filter.js?v=v0.2.98-alpha';
import { battleStats, statsOf } from '../systems/creature.js?v=v0.2.98-alpha';
import { buildCreatures } from '../battle/data/creatures.js?v=v0.2.98-alpha';
import { VARIANT_MODS } from '../battle/data/rules.js?v=v0.2.98-alpha';
import { QOLC_CFG } from './flags.js?v=v0.2.98-alpha';

// Player-facing word gate (project rule). Shared by the rename check and the tests.
export const BANNED_RE = /pok[eé]mon|\bPP\b|shiny|super[\s-]*effective|pok[eé]dex|pok[eé][\s-]*ball|gotcha|\bnurse\b|\bweed\b|\broutes?\b|\bthrow/i;

// ---- #15 quick save --------------------------------------------------------------------------------------------
/** Why a quick save may not run now (null = OK). Uses the scene's own save lock (battle / talk / cutscene / script). */
export function quickSaveBlock(scene, ui = null) {
  if (!scene) return 'no_scene';
  if (ui?.stack?.some?.((s) => s.scr === 'battle')) return 'battle';
  if (scene.dialog?.active) return 'dialogue';
  if (scene.busy || scene.fade) return 'script';
  return scene.saveLockReason?.() || null;
}
export function quickSave(scene, ui = null) {
  const why = quickSaveBlock(scene, ui);
  if (why) return { ok: false, reason: why };
  return scene.saveNow() ? { ok: true } : { ok: false, reason: scene.saveLockReason?.() || 'write_failed' };
}

// ---- #10 storage anywhere ----------------------------------------------------------------------------------------
export function storageAvailable(scene, cfg = QOLC_CFG) {
  if (!scene?.systems?.archive || !scene.systems.party) return false;
  return !cfg.storageFlag || !!scene.flags?.has?.(cfg.storageFlag);
}

// ---- #8 stats & growth -------------------------------------------------------------------------------------------
export const STAT_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
let _cr = null;
const cr = () => (_cr ||= buildCreatures());
/** Growth grade from the species base stat (Kilumen has no hidden per-creature stats yet). 0..4 */
export const growthGrade = (base) => (base >= 110 ? 4 : base >= 90 ? 3 : base >= 70 ? 2 : base >= 50 ? 1 : 0);
export function statRows(c) {
  const b = cr()[c.species]?.baseStats || {}, now = { hp: statsOf(c).maxHp, ...battleStats(c) };
  return STAT_KEYS.map((k) => {
    const base = b[k] ?? 60, mod = VARIANT_MODS[c.variant]?.[k] || 1;
    return { key: k, value: now[k], base, grade: growthGrade(base), frac: Math.max(0.04, Math.min(1, base / 160)), boosted: mod > 1 };
  });
}

// ---- #16 rename anywhere -----------------------------------------------------------------------------------------
/** -> {ok, name|null (null = species name), reason} ; '' clears the nickname. */
export function checkName(raw, max = QOLC_CFG.nameMax) {
  const s = String(raw ?? '').replace(/[<>\u0000-\u001f]/g, '').trim();
  if (!s) return { ok: true, name: null, reason: null };
  if (s.length > max) return { ok: false, name: null, reason: 'too_long' };
  if (BANNED_RE.test(s)) return { ok: false, name: null, reason: 'blocked' };
  const r = checkText(s, { maxLen: max });
  return r.ok ? { ok: true, name: r.text, reason: null } : { ok: false, name: null, reason: r.reason === 'too_long' ? 'too_long' : 'blocked' };
}
export function renameCreature(c, raw) {
  const r = checkName(raw);
  if (r.ok && c) c.nickname = r.name;
  return r;
}

// ---- #12 encounter blocker + auto renew --------------------------------------------------------------------------
/** state lives in systems.state.qolc.blocker = {item, steps}. */
export class Blocker {
  constructor(state, cfg = QOLC_CFG) { this.st = state; this.cfg = cfg; }
  get active() { return (this.st.steps || 0) > 0; }
  start(item, bag) {
    const steps = this.cfg.blockerItems[item];
    if (!steps || !bag?.has?.(item)) return false;
    bag.remove(item, 1); this.st.item = item; this.st.steps = steps; return true;
  }
  /** One step on an encounter cell. -> {blocked, ranOut} */
  step() {
    if (!this.active) return { blocked: false, ranOut: false };
    this.st.steps -= 1;
    return { blocked: true, ranOut: this.st.steps === 0 };
  }
  /** After running out: offer another only if the bag still has one. */
  canRenew(bag) { return !!this.st.item && !this.active && !!bag?.has?.(this.st.item); }
}

// ---- #17 variant chain counter (structure only) ------------------------------------------------------------------
/** state: systems.state.qolc.chain = {species, count, best}. Same species in a row grows the chain; another resets it. */
export class ChainCounter {
  constructor(state) { this.st = state; this.st.count ||= 0; this.st.best ||= 0; this.st.species ||= null; }
  record(species) {
    if (!species) return this.st.count;
    if (species === this.st.species) this.st.count += 1; else { this.st.species = species; this.st.count = 1; }
    this.st.best = Math.max(this.st.best, this.st.count);
    return this.st.count;
  }
  reset() { this.st.species = null; this.st.count = 0; }
  /** PLACEHOLDER odds shape (Gary to set numbers): 1 in base, improving in steps. Not used by any roller yet. */
  static odds(count, base = 4096) { const step = count >= 40 ? 4 : count >= 30 ? 3 : count >= 20 ? 2 : count >= 10 ? 1 : 0; return { oneIn: Math.round(base / (1 + step)), step }; }
}

/** systems.state.qolc block (saved with the systems save block, no save.js change). */
export function qolcState(sys) {
  const s = (sys.state.qolc ||= {});
  s.blocker ||= { item: null, steps: 0 }; s.chain ||= { species: null, count: 0, best: 0 };
  return s;
}

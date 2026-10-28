// Kilumen battle glue: runs the vendored engine (src/battle/engine.js) with Kilumen data and turns
// overworld party/bag entries into engine sets and back. Pure and deterministic for a given seed:
// no DOM, no timers, so the same module can run on a server for PvP (see docs/battle_engine_eval.md).
import { Battle, installData, PRNG, teamState } from './engine.js?v=v0.2.30-alpha';
import { buildData, skillIdsFor } from './data/index.js?v=v0.2.30-alpha';
import { KILUMEN_RULES } from './data/rules.js?v=v0.2.30-alpha';

/** total XP needed to be at `level` (same curve as the engine; PLACEHOLDER [B20]) */
export const xpForLevel = (level, rules = KILUMEN_RULES) => Math.floor(rules.xpCurveMult * level ** 3);
import { SPECIES } from '../ui/data.js?v=v0.2.30-alpha';

let installed = false;
export function ensureData(overrides) {
  if (!installed || overrides) { installData(buildData(overrides)); installed = !overrides; }
}

const engineId = (id) => String(id).toLowerCase().replace(/[^a-z0-9]+/g, '');
const bagIn = (bag = {}) => Object.fromEntries(Object.entries(bag).map(([k, v]) => [engineId(k), v]));
const bagOut = (bag, orig = {}) => Object.fromEntries(Object.keys(orig).map((k) => [k, bag[engineId(k)] ?? orig[k]]));
const elementsOf = (sp) => (SPECIES.find((s) => s.id === sp) || { el: ['normal'] }).el;

/** overworld party entry -> engine set. Fields not in the save yet fall back to PLACEHOLDERS. */
export function toSet(c, fallbackLevel = 5) {
  return {
    name: (c.nickname || c.name || (SPECIES.find((s) => s.id === c.species) || { name: c.species }).name) + (c.variant ? ' ✦' : ''),
    species: c.species, item: '', ability: 'No Ability', nature: '', gender: '', evs: {}, ivs: {},
    moves: c.skills || skillIdsFor(elementsOf(c.species), SPECIES.find((s) => s.id === c.species)?.skillPool),
    level: c.level || fallbackLevel, xp: c.xp, hp: c.hp, energy: c.energy, status: c.status,
    warmth: c.warmth || 0, variant: c.variant || '', lineage: c.lineage, rt: c.rt,
  };
}

/**
 * opts: { party, foes, wild, bag, seed, foeName, rules?, chart? }
 * party/foes: arrays of party entries ({species, level, ...}); fainted entries (hp === 0) are skipped.
 */
export class KilumenBattle {
  constructor(opts) {
    ensureData(opts.rules || opts.chart ? { rules: opts.rules, chart: opts.chart, effectivenessCap: opts.effectivenessCap } : undefined);
    // array of 4 ints (gen5 PRNG); a generated seed comes back as "gen5,hex" so normalise it for the foe-AI stream
    this.seed = opts.seed || [0, 0, 0, 0].map(() => Math.floor(Math.random() * 0x10000));
    this.wild = !!opts.wild;
    this.partyIn = opts.party.filter((c) => c.hp !== 0);
    this.ai = new PRNG(this.seed.slice().reverse());
    this.battle = new Battle({
      formatid: 'kilumensingle', seed: this.seed, wild: this.wild,
      // tests only: force every chance roll (accuracy, crits, secondaries, catch) to succeed or fail
      ...(typeof opts.forceChance === 'boolean' ? { debug: true, forceRandomChance: opts.forceChance } : {}),
      p1: { name: opts.playerName || 'You', team: this.partyIn.map((c) => toSet(c)), bag: bagIn(opts.bag), gainsXp: true, xpBoost: opts.xpBoost || 1 },
      p2: { name: opts.foeName || (this.wild ? 'Wild' : 'Trainer'), team: opts.foes.map((c) => toSet(c)) },
    });
    this.bagIn = { ...(opts.bag || {}) };
    this.cursor = 0;
  }
  get ended() { return this.battle.ended; }
  get p1() { return this.battle.sides[0]; }
  get p2() { return this.battle.sides[1]; }
  /** new protocol lines since the last call, without timestamps / split duplicates */
  drain() {
    const lines = this.battle.log.slice(this.cursor);
    this.cursor = this.battle.log.length;
    const out = [];
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (l.startsWith('|t:|') || l === '|') continue;
      if (l.startsWith('|split|')) { out.push(lines[i + 1]); i += 2; continue; } // keep the exact-HP (owner) line
      out.push(l);
    }
    return out.map((l) => l.split('|').slice(1));
  }
  /** foe AI tier 1 (random enabled skill; parity B26), deterministic from the seed */
  foeChoice() {
    const side = this.p2;
    if (side.requestState === 'switch') {
      const i = side.creature.findIndex((c, n) => n >= side.active.length && !c.fainted);
      return i >= 0 ? `switch ${i + 1}` : 'pass';
    }
    if (side.requestState !== 'move') return '';
    const req = side.activeRequest?.active?.[0];
    const usable = (req?.moves || []).map((m, n) => ({ m, n })).filter(({ m }) => !m.disabled);
    if (!usable.length) return 'move 1';
    return `move ${usable[this.ai.random(usable.length)].n + 1}`;
  }
  /** player choice: "move N", "switch N", "item ID [slot]", "crystal ID", "retreat" */
  choose(choice) {
    const b = this.battle;
    choice = choice.replace(/^(item|crystal) (\S+)/, (m, k, id) => `${k} ${engineId(id)}`);
    if (b.ended) return false;
    const p1Needs = this.p1.requestState, p2Needs = this.p2.requestState;
    const ok = this.p1.choose(p1Needs ? choice : '');
    if (!ok) return { error: this.p1.choice.error };
    if (p2Needs) this.p2.choose(this.foeChoice());
    if (b.allChoicesDone()) b.commitChoices();
    // a lone forced switch on the foe side
    while (!b.ended && !this.p1.requestState && this.p2.requestState) { this.p2.choose(this.foeChoice()); if (b.allChoicesDone()) b.commitChoices(); }
    return true;
  }
  /** what the UI may do now */
  request() {
    const r = this.p1.activeRequest;
    return { state: this.p1.requestState, moves: r?.active?.[0]?.moves || [], team: this.p1.creature, bag: bagOut(this.p1.kBag, this.bagIn), wild: this.wild };
  }
  result() {
    const b = this.battle;
    const outcome = b.kEndReason || (b.winner === this.p1.name ? 'win' : b.winner ? 'lose' : b.ended ? 'tie' : 'ongoing');
    const team = teamState(this.p1).map((s, i) => ({ ...this.partyIn[i], ...s, species: this.partyIn[i].species }));
    const caught = b.kCaught ? { species: b.kCaught.species.id, level: b.kCaught.level, hp: b.kCaught.hp, variant: b.kCaught.set.variant || '' } : null;
    return { outcome, team, bag: bagOut(this.p1.kBag, this.bagIn), caught, turns: b.turn, seed: this.seed, inputLog: b.inputLog.slice() };
  }
}

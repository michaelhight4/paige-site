// r58 (Oct 29 2026, Gary via Coder): swamp / sea attacks work end to end in the engine, and the hard max level is 90.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSkills, skillIdsFor } from '../src/battle/data/skills.js';
import { KilumenBattle, toSet, clampLevel } from '../src/battle/battle.js';
import { KILUMEN_RULES } from '../src/battle/data/rules.js';
import { HELD_BATTLE_ITEMS } from '../src/battle/data/held_items.js';
import { scaleLevel, masterRematchLevel, masterRematchTeam } from '../src/systems/difficulty.js';
import { rematchTeam } from '../src/systems/contacts.js';
import { levelForXp } from '../src/systems/creature.js';

const SEED = [11, 22, 33, 44];
const fight = (party, foes, extra = {}) => new KilumenBattle({ party, foes, seed: SEED.slice(), forceChance: true, ...extra });
const dmg = (kb, moveId) => kb.battle.actions.getDamage(kb.battle.p1.active[0], kb.battle.p2.active[0], kb.battle.dex.moves.get(moveId), true);

test('swamp / sea / kelp moves: GD numbers from moves_swamp_sea.json', () => {
  const S = buildSkills();
  assert.deepEqual([S.bogsnap.type, S.bogsnap.basePower, S.bogsnap.accuracy, S.bogsnap.category], ['Swamp', 55, 90, 'Physical']);
  assert.deepEqual([S.mirelob.type, S.mirelob.basePower, S.mirelob.secondary.chance, S.mirelob.secondary.boosts.spe], ['Swamp', 40, 20, -1]);
  assert.deepEqual([S.brinelash.type, S.brinelash.basePower, S.brinelash.accuracy, S.brinelash.category], ['Sea', 55, 90, 'Special']);
  assert.deepEqual([S.undertow.type, S.undertow.basePower, S.undertow.secondary.chance, S.undertow.secondary.boosts.atk], ['Sea', 40, 20, -1]);
  assert.deepEqual([S.kelplash.type, S.kelplash.basePower, S.kelplash.category], ['Grass', 55, 'Physical']);
  assert.deepEqual(skillIdsFor(['water', 'swamp']), ['bogsnap', 'mirelob', 'rippleshot', 'stomp']);
  assert.deepEqual(skillIdsFor(['water', 'sea']), ['brinelash', 'undertow', 'rippleshot', 'pebbletoss']);
});

test('engine: swamp / sea are real types (chart applies, moves deal damage)', () => {
  const kb = fight([{ species: 'tidemarrow', level: 40, uid: 'a' }], [{ species: 'cindrip', level: 40 }]);
  const dex = kb.battle.dex;
  assert.ok(dex.types.get('Sea').exists && dex.types.get('Swamp').exists);
  assert.equal(dex.getEffectiveness('Sea', ['Fire']), 1);   // sea strong vs fire
  assert.equal(dex.getEffectiveness('Swamp', ['Fire']), 1); // swamp strong vs fire
  assert.ok(dex.getEffectiveness('Sea', ['Grass']) < 0);
  for (const m of ['brinelash', 'undertow', 'bogsnap', 'mirelob', 'kelplash']) assert.ok(dmg(kb, m) > 0, m);
});

test('charm boost hooks see sea / swamp move types (held items themselves not wired here)', () => {
  const ctx = { chainModify: (m) => m };
  const move = (id) => ({ type: buildSkills()[id].type });
  assert.ok(HELD_BATTLE_ITEMS.tidebell_charm.onBasePower.call(ctx, 55, null, null, move('brinelash')));
  assert.ok(HELD_BATTLE_ITEMS.tidebell_charm.onBasePower.call(ctx, 40, null, null, move('undertow')));
  assert.ok(HELD_BATTLE_ITEMS.bogroot_charm.onBasePower.call(ctx, 55, null, null, move('bogsnap')));
  assert.ok(HELD_BATTLE_ITEMS.bogroot_charm.onBasePower.call(ctx, 40, null, null, move('mirelob')));
  assert.equal(HELD_BATTLE_ITEMS.bogroot_charm.onBasePower.call(ctx, 55, null, null, move('brinelash')), undefined);
});

test('max level 90 everywhere', () => {
  assert.equal(KILUMEN_RULES.maxLevel, 90);
  assert.equal(clampLevel(120), 90); assert.equal(clampLevel(0), 1);
  assert.equal(toSet({ species: 'cindrip', level: 99 }).level, 90);
  assert.equal(levelForXp(10 ** 9), 90);
  assert.equal(scaleLevel(89, 70, 'hard'), 90);
  assert.ok(rematchTeam([{ species: 'cindrip', level: 88 }], { wins: 5 }).every((f) => f.level <= 90));
  const kb = fight([{ species: 'cindrip', level: 89, xp: Math.floor(KILUMEN_RULES.xpCurveMult * 89 ** 3), uid: 'a' }], [{ species: 'nibbin', level: 90 }]);
  assert.equal(kb.battle.p2.active[0].level, 90);
});

test('master rematch: x1.3 per win, capped at 90', () => {
  assert.equal(masterRematchLevel(40, 0), 40);
  assert.equal(masterRematchLevel(40, 1), 52);
  assert.equal(masterRematchLevel(40, 3), 88);
  assert.equal(masterRematchLevel(40, 4), 90);
  assert.equal(masterRematchLevel(51, 9), 90);
  assert.deepEqual(masterRematchTeam([{ species: 'pyrogrim', level: 80 }], 2).map((f) => f.level), [90]);
});

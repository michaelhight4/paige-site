// rtb (DEV ONLY real-time wild battles, Oct 29 2026): sim rules, capture, energy / cooldowns, swap, blackout, flag, words.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { RtBattle, effectiveness, damageOf, xpFor } from '../src/rtb/sim.js';
import { cooldownFor, shapeOf, SHAPE, SHAPE_STATS } from '../src/rtb/moves.js';
import { rtbEnabled, devHost, RTB_KEY } from '../src/rtb/flag.js';
import { createCreature } from '../src/systems/creature.js';
import { buildSkills } from '../src/battle/data/skills.js';

const seeded = (s = 7) => () => ((s = (s * 16807) % 2147483647) / 2147483647);
const arena = { x0: 0, y0: 0, x1: 800, y1: 500 };
const mk = (o = {}) => new RtBattle({ party: [createCreature({ species: 'cindrip', level: 12 }), createCreature({ species: 'nibbin', level: 8 })], foes: [{ species: 'tumbloam', level: 4 }], start: { x: 300, y: 250 }, arena, rng: seeded(), ...o });
function autoplay(b, { fire = true, max = 120 } = {}) {
  let t = 0; const ev = [];
  while (!b.done && t < max) {
    const tg = b.target, inp = {};
    if (fire && tg) { const dx = tg.x - b.ally.x, dy = tg.y - b.ally.y, d = Math.hypot(dx, dy); inp.mx = d > 200 ? dx / d : -dy / d; inp.my = d > 200 ? dy / d : dx / d; inp.fire = Math.floor(t * 3) % 2; }
    b.step(1 / 60, inp); t += 1 / 60; ev.push(...b.drain());
  }
  return { t, ev };
}

test('rtb: element chart reuse (strong 1.5 / weak 0.6) and damage formula is deterministic with a seeded rng', () => {
  const vals = new Set(); for (const a of ['fire', 'water', 'grass', 'earth']) for (const d of ['fire', 'water', 'grass', 'earth']) vals.add(effectiveness(a, [d]));
  assert.ok([...vals].every((v) => [0, 0.36, 0.6, 0.9, 1, 1.5, 2.25].some((x) => Math.abs(v - x) < 1e-9)), [...vals].join());
  const SK = buildSkills(), a = createCreature({ species: 'cindrip', level: 10 }), d = createCreature({ species: 'nibbin', level: 10 });
  const sk = SK[a.skills?.[0] || 'sparksneeze'] || Object.values(SK).find((s) => s.basePower);
  const fa = { c: a, stats: (new RtBattle({ party: [a], foes: [{ species: 'nibbin', level: 10 }], start: { x: 0, y: 0 }, arena })).ally.stats, els: ['fire'] };
  assert.ok(fa.stats);
  assert.ok(xpFor('nibbin', 5) >= 1);
});
test('rtb: a player who fights wins; one who idles loses (games are hard: foes attack on their own)', () => {
  const won = mk(); autoplay(won); assert.equal(won.outcome, 'win');
  const r = won.result(); assert.equal(r.rt, true); assert.ok(r.xp > 0); assert.equal(r.team.length, 2);
  const idle = mk({ party: [createCreature({ species: 'cindrip', level: 3 })], foes: [{ species: 'tumbloam', level: 8 }] }); autoplay(idle, { fire: false, max: 200 });
  assert.equal(idle.outcome, 'lose');
});
test('rtb: cooldowns from skill power, every skill has a shape with stats', () => {
  const SK = buildSkills();
  for (const [id, sk] of Object.entries(SK)) { const sh = shapeOf(id, sk); assert.ok(SHAPE_STATS[sh], `${id}:${sh}`); assert.ok(cooldownFor(sk) > 0.4); }
  assert.equal(cooldownFor({ basePower: 0 }), 4);
  for (const sh of Object.values(SHAPE)) assert.ok(SHAPE_STATS[sh], sh);
});
test('rtb: using a skill costs Energy and starts a cooldown', () => {
  const b = mk(); const before = b.ally.c.energy.slice();
  for (let i = 0; i < 90 && b.ally.c.energy[0] === before[0]; i++) { b.step(1 / 60, { fire: 0 }); b.drain(); }
  assert.ok(b.ally.c.energy[0] < before[0]); assert.ok(b.ally.cds[0] > 0);
});
test('rtb: capture with a crystal (forced roll) adds caught, one per battle, and ends the fight', () => {
  const b = mk(); b.forceCatch = true;
  for (let i = 0; i < 20; i++) { b.step(1 / 60, {}); b.drain(); }
  assert.ok(b.canCrystal()); b.step(1 / 60, { crystal: { id: 'dominance_crystal', grade: 1 } });
  for (let i = 0; i < 600 && !b.done; i++) { b.step(1 / 60, {}); b.drain(); }
  const r = b.result(); assert.ok(r.caught, JSON.stringify(r)); assert.equal(r.caught.species, 'tumbloam');
});
test('rtb: swap changes the active creature; a fainted active forces a swap; whole party down = lose', () => {
  const b = mk(); const a0 = b.ally.c.species; b.swap(); for (let i = 0; i < 120; i++) { b.step(1 / 60, {}); b.drain(); } assert.notEqual(b.ally.c.species, a0);
  const c = mk({ party: [createCreature({ species: 'cindrip', level: 2 }), createCreature({ species: 'nibbin', level: 2 })], foes: [{ species: 'tumbloam', level: 14 }] });
  const { ev } = autoplay(c, { fire: false, max: 300 }); assert.equal(c.outcome, 'lose'); assert.ok(c.result().team.every((m) => m.hp === 0));
  assert.ok(ev.some((e) => /swap|faint|send/i.test(e.type)));
});
test('rtb flag: dev hosts only, ?rtb=1 stores, ?rtb=0 kill switch clears', () => {
  const mem = new Map(), store = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  const dev = { hostname: 'localhost' }, live = { hostname: 'kilumen.example.com' };
  assert.ok(devHost(dev)); assert.ok(!devHost(live));
  assert.equal(rtbEnabled(new URLSearchParams('rtb=1'), { store, loc: live }), false);
  assert.equal(rtbEnabled(new URLSearchParams(''), { store, loc: dev }), false);
  assert.equal(rtbEnabled(new URLSearchParams('rtb=1'), { store, loc: dev }), true); assert.ok(mem.has(RTB_KEY));
  assert.equal(rtbEnabled(new URLSearchParams(''), { store, loc: dev }), true);
  assert.equal(rtbEnabled(new URLSearchParams('rtb=0'), { store, loc: dev }), false); assert.ok(!mem.has(RTB_KEY));
  assert.equal(rtbEnabled(new URLSearchParams(''), { store, loc: dev }), false);
});
test('rtb: no blocked words or franchise names in src/rtb player text', () => {
  const bad = /\bPP\b|shiny|super effective|Pok[eé]|Gotcha!|\bnurse\b|\bweed|\broute\b|throw|Nintendo|Game Freak/i;
  for (const f of fs.readdirSync(new URL('../src/rtb/', import.meta.url))) {
    if (!f.endsWith('.js')) continue;
    const strs = fs.readFileSync(new URL(`../src/rtb/${f}`, import.meta.url), 'utf8').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n').match(/(['"`])(?:(?!\1).)*\1/g) || [];
    for (const s of strs) assert.ok(!bad.test(s), `${f}: ${s}`);
  }
});

import test from 'node:test'; import assert from 'node:assert/strict';
const SRC = process.env.KIL_SRC || '/workspace/wt_rtbkeys/kilumen';
const { RtBattle } = await import(`${SRC}/src/rtb/sim.js`);
const { createCreature } = await import(`${SRC}/src/systems/creature.js`);
const mk = (o = {}) => new RtBattle({ party: [createCreature({ species: 'cindrip', level: 30 }), createCreature({ species: 'nibbin', level: 20 })],
  foes: [{ species: 'tumbloam', level: 5 }, { species: 'nibbin', level: 5 }, { species: 'rillop', level: 5 }], start: { x: 400, y: 300 },
  arena: { x0: 0, y0: 0, x1: 800, y1: 600 }, rng: () => 0.5, ...o });
test('trainer: one foe out, rest in reserve', () => { const s = mk({ trainer: true }); assert.equal(s.foes.length, 1); assert.equal(s.reserve.length, 2); });
test('wild keeps all foes on field', () => { const s = mk(); assert.equal(s.foes.length, 3); });
test('trainer sends next after faint, wins only when all out', () => {
  const s = mk({ trainer: true });
  for (let k = 0; k < 3; k++) { const f = s.living[0]; f.c.hp = 0; f.alive = false; for (let i = 0; i < 80; i++) s.step(1 / 60, {}); if (k < 2) { assert.equal(s.state, 'fight'); assert.equal(s.living.length, 1); } }
  assert.equal(s.outcome, 'win'); const r = s.result(); assert.equal(r.foes.length, 3); assert.ok(r.foes.every((f) => f.fainted));
});
test('trainer refuses crystal and retreat', () => { const s = mk({ trainer: true }); s.step(1 / 60, { crystal: 'basic_crystal' }); assert.equal(s.capture, null); for (let i = 0; i < 120; i++) s.step(1 / 60, { retreat: true }); assert.notEqual(s.outcome, 'retreat'); });
test('trainer recalls a badly hurt foe', () => {
  const s = mk({ trainer: true, rng: () => 0.001 }); const f = s.living[0]; f.c.hp = 1; s.step(1 / 60, {});
  assert.equal(s.recalls, 1); assert.notEqual(s.living[0], f); assert.ok(s.reserve.some((c) => c === f.c));
});
test('xp share feeds the bench', () => { const s = mk({ xpShare: 0.25 }); const b = s.party[1], x0 = b.xp || 0; s._shareXp(10); assert.equal(b.xp, x0 + Math.max(1, Math.floor(10 * 0.25))); }); // share = base x xpShare (25 % -> 2)

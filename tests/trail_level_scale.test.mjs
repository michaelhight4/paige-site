// Trail wild-level scaling (Coder, Oct 23 2026; Gary 11:48 AM CT: "well we need to have them be level scaling the closer
// to town you get"). Brookhollow end of Trail 1 (route1) rolls low, the far end high; always inside slot range + zone cap;
// deterministic with a seeded rng; data/trail_axes.json matches tools/build_trail_axes.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scaledLevel, trailT, axisFor, project } from '../src/battle/level_scale.js';
import { EncounterRoller, pickSlot } from '../src/battle/encounters.js';
import { buildAxes } from '../tools/build_trail_axes.mjs';

const J = (p) => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const axes = J('data/trail_axes.json'), wired = J('data/encounters_wired.json');
const route1 = J('art/world/overworld/maps/route1.json');
const seeded = (s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const rects = route1.encounter_zones.filter((r) => r.table === 'sunmeadow_grass');
const cells = rects.flatMap((r) => Array.from({ length: (r.x1 - r.x0 + 1) * (r.y1 - r.y0 + 1) }, (_, i) => [r.x0 + (i % (r.x1 - r.x0 + 1)), r.y0 + Math.floor(i / (r.x1 - r.x0 + 1))]));
const ax = axisFor(axes, 'route1');
const byT = [...cells].sort((p, q) => trailT(ax, ...p) - trailT(ax, ...q));
const near = byT[0], far = byT[byT.length - 1];

function roll(x, y, n = 400, seed = 7) {
  const ro = new EncounterRoller(wired, { rng: seeded(seed), rate: 1, graceSteps: 0, axes });
  const out = [];
  for (let i = 0; i < n; i++) { const h = ro.step('route1', route1.encounter_zones, x, y, 1, { phase: 'day', weather: 'clear' }); if (h) out.push(h); }
  return out;
}
const mean = (a) => a.reduce((s, h) => s + h.level, 0) / a.length;

test('trail_axes.json is up to date with the map data (node tools/build_trail_axes.mjs)', () => {
  assert.deepEqual(axes, JSON.parse(JSON.stringify(buildAxes())));
});

test('Trail 1 axis runs Brookhollow (south) -> Fernwick (north); storm variant shares it', () => {
  assert.equal(ax.from, 'brookhollow'); assert.equal(ax.to, 'fernwick');
  assert.ok(axisFor(axes, 'route1_storm')); assert.equal(axisFor(axes, 'brookhollow'), null);
  assert.ok(trailT(ax, ...near) < 0.01); assert.ok(trailT(ax, ...far) > 0.99);
  assert.ok(near[1] > far[1], 'Brookhollow end is the south (high y) side');
});

test('Brookhollow end rolls low, far end rolls high, all inside 2-4', () => {
  const lo = roll(...near), hi = roll(...far);
  assert.ok(lo.length > 100 && hi.length > 100);
  for (const h of [...lo, ...hi]) assert.ok(h.level >= 2 && h.level <= 4, `${h.species} L${h.level}`);
  assert.ok(mean(lo) <= 2.6, `near mean ${mean(lo)}`); assert.ok(mean(hi) >= 3.6, `far mean ${mean(hi)}`);
  assert.ok(lo.filter((h) => h.level === 4).length === 0, 'no L4 at the Brookhollow end');
  assert.ok(hi.filter((h) => h.level === 2).length === 0, 'no L2 at the far end');
});

test('deterministic with a seeded rng', () => {
  assert.deepEqual(roll(...near, 200, 42), roll(...near, 200, 42));
  assert.deepEqual(roll(...far, 200, 99), roll(...far, 200, 99));
});

test('scaledLevel: lerp + jitter, clamped to slot range and zone cap', () => {
  const r = (v) => () => v;
  assert.equal(scaledLevel(2, 4, 0, r(0.5)), 2); assert.equal(scaledLevel(2, 4, 1, r(0.5)), 4); assert.equal(scaledLevel(2, 4, 0.5, r(0.5)), 3);
  assert.equal(scaledLevel(2, 4, 0, r(0.0)), 2, 'jitter -1 clamps to slot min');
  assert.equal(scaledLevel(2, 4, 1, r(0.9)), 4, 'jitter +1 clamps to slot max');
  assert.equal(scaledLevel(2, 4, 0.5, r(0.9)), 4); assert.equal(scaledLevel(2, 4, 0.5, r(0.1)), 2);
  assert.equal(scaledLevel(2, 6, 1, r(0.5), [2, 4]), 4, 'zone cap wins over slot max');
  assert.equal(scaledLevel(1, 4, 0, r(0.1), [2, 4]), 2, 'zone cap floor');
  assert.equal(scaledLevel(5, 6, 0, r(0.1), [2, 4]), 4, 'slot fully above cap pins to cap max');
  for (let t = 0; t <= 1; t += 0.05) for (let v = 0; v < 1; v += 0.05) { const l = scaledLevel(3, 7, t, r(v)); assert.ok(l >= 3 && l <= 7); }
});

test('no axis (town / cave / unknown map) keeps the uniform roll', () => {
  const zone = { slots: [{ species: 'x', level: [2, 4], weight: 1 }] };
  const ro = new EncounterRoller({ zones: { z: zone } }, { rng: seeded(3), rate: 1, graceSteps: 0, axes });
  const seen = new Set();
  for (let i = 0; i < 300; i++) { const h = ro.step('brookhollow', [{ x0: 0, y0: 0, x1: 9, y1: 9, table: 'z' }], 5, 5, 1); seen.add(h.level); assert.equal(h.t, null); }
  assert.deepEqual([...seen].sort(), [2, 3, 4]);
  assert.ok(pickSlot(zone, {}, seeded(1)));
});

test('every trail map in the axes has a forward direction and a sane span', () => {
  for (const [name, a] of Object.entries(axes.maps)) {
    assert.match(name, /^route/); assert.ok(a.from && a.to && a.from !== a.to, name);
    assert.ok(a.span[1] > a.span[0], name); assert.equal(project(a.a, a.b, ...a.a) + 0, 0);
  }
});

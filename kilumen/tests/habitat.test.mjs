// Habitat rules (Gary, Oct 29 2026): surf = water-type species only; caves = only Kilumen you could find in a cave.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const E = await import(path.join(root, 'src/battle/encounters.js'));
const D = await import(path.join(root, 'src/ui/data.js'));
const el = (id) => D.speciesById(id).el, found = (id) => D.speciesById(id).found;
const FILES = ['data/encounters_wired.json', 'art/world/overworld/encounters/encounters.json'];
const tables = FILES.map((f) => [f, JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'))]);

test('every surf table holds water-type species only, and none is empty', () => {
  let n = 0;
  for (const [f, d] of tables) for (const [zid, z] of Object.entries(d.zones)) if (E.isSurf(z.method)) {
    n++; assert.ok(z.slots.length, `${f} ${zid} empty`);
    for (const s of z.slots) assert.ok(el(s.species).includes('water'), `${f} ${zid}: ${s.species} is ${el(s.species)}`);
  }
  assert.ok(n >= 20, `only ${n} surf tables found`);
});

test('every cave table holds cave dwellers only, and none is empty', () => {
  let n = 0;
  for (const [f, d] of tables) for (const [zid, z] of Object.entries(d.zones)) if (E.isCave(z.method)) {
    n++; assert.ok(z.slots.length, `${f} ${zid} empty`);
    for (const s of z.slots) assert.ok(E.habitatOk(z.method, s.species, el, found), `${f} ${zid}: ${s.species}`);
  }
  assert.ok(n >= 8, `only ${n} cave tables found`);
  for (const id of ['seaglint', 'squallwhirl', 'pharolith', 'forgeharrow', 'spraytern']) for (const [, d] of tables)
    for (const z of Object.values(d.zones)) if (E.isCave(z.method) || E.isSurf(z.method)) assert.ok(!z.slots.some((s) => s.species === id), id);
});

test('runtime habitat filter: surf never rolls a non-water species, caves never roll a non-cave species', () => {
  const elx = (id) => ({ fishy: ['water'], birdy: ['wind'], rocky: ['earth'], torch: ['fire'], olm: ['water'] })[id];
  const foundx = (id) => (id === 'olm' ? 'Greystone Caverns' : '');
  const data = { zones: {
    surf: { method: 'water (Tideglide)', slots: [{ species: 'birdy', weight: 1000, level: [5, 5] }, { species: 'fishy', weight: 1, level: [5, 5] }] },
    cave: { method: 'cave', slots: [{ species: 'torch', weight: 1000, level: [5, 5] }, { species: 'rocky', weight: 1, level: [5, 5] }, { species: 'olm', weight: 1, level: [5, 5] }] },
    grass: { method: 'grass', slots: [{ species: 'torch', weight: 1, level: [5, 5] }] },
    odd: { method: 'water (Tideglide)', slots: [{ species: 'mystery', weight: 1, level: [5, 5] }] } } };
  const h = E.filterHabitat(data, elx, foundx);
  assert.deepEqual(h.removed, { surf: ['birdy'], cave: ['torch'], odd: ['mystery'] }); // unknown species fails closed
  for (const r of [0, 0.3, 0.7, 0.99]) {
    assert.equal(E.pickSlot(h.data.zones.surf, {}, () => r).species, 'fishy');
    assert.notEqual(E.pickSlot(h.data.zones.cave, {}, () => r).species, 'torch');
  }
  assert.equal(h.data.zones.grass, data.zones.grass); // grass untouched
  assert.equal(E.pickSlot(h.data.zones.odd, {}, () => 0.5), null);
});

test('habitat_filter.mjs --check passes on the shipped tables', () => {
  const r = spawnSync(process.execPath, [path.join(root, 'tools/encounters/habitat_filter.mjs'), '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

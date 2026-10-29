// Painted battle backdrops (Oct 29 2026): every area maps to a wired biome and every biome's phase art is on disk.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import { biomeFor } from '../src/battle/encounters.js';
import { PLATFORM_BIOMES } from '../src/battle/data/platforms.js';
const root = new URL('../', import.meta.url);
test('areas map to the right biome', () => {
  assert.equal(biomeFor('water (Tideglide)', 'route_east'), 'water');
  assert.equal(biomeFor('fishing (rod, later)'), 'water');
  assert.equal(biomeFor('cave', 'frostspire'), 'cave');
  assert.equal(biomeFor('cave_fern', 'greystone_entrance'), 'cave');
  assert.equal(biomeFor('', 'greystone_b1'), 'cave');
  assert.equal(biomeFor('grass', 'frostspire'), 'snow');
  assert.equal(biomeFor('grass (deep snow)'), 'snow');
  assert.equal(biomeFor('grass (snow-fern, forced band)'), 'snow');
  assert.equal(biomeFor('grass', 'frostspire_pass'), 'mountain');
  assert.equal(biomeFor('grass', 'route_cindervale'), 'mountain');
  assert.equal(biomeFor('grass', 'route1'), 'grass');
  assert.equal(biomeFor('', 'frostspire_hall_int'), 'grass');
});
test('painted biomes have all phase stills + life layers', () => {
  for (const b of ['water', 'cave', 'mountain', 'snow']) {
    const e = PLATFORM_BIOMES[b]; assert.ok(e.art && e.spots.near && e.spots.far, b);
    for (const p of ['dawn', 'day', 'dusk', 'night']) for (const f of [e.bgFor(p), e.life(p)]) assert.ok(fs.existsSync(new URL(f, root)), f);
  }
  assert.deepEqual(PLATFORM_BIOMES.mountain.spots, { near: [0.3, 0.81], far: [0.73, 0.735] });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { PLATFORM_BIOMES } from '../src/battle/data/platforms.js';
import { biomeFor, R56_MAP_BIOMES } from '../src/battle/encounters.js';
import { SKILL_FX, ELEMENT_FX } from '../src/ui/data.js';
import { fxStem } from '../src/ui/hit_fx.js';

const R = (p) => new URL('../' + p, import.meta.url);
const B56 = ['bog', 'bog_deep', 'causeway', 'coast', 'hall_mirefen', 'hall_tidewater', 'lab_mirefen', 'lab_seacave', 'meadow', 'reef_surf', 'sea_cave'];

test('r56 backdrops: 4 phases + life layer on disk, spots from index.json', () => {
  for (const b of B56) {
    const e = PLATFORM_BIOMES[b]; assert.ok(e?.art, b);
    for (const p of ['dawn', 'day', 'dusk', 'night']) { assert.ok(existsSync(R(e.bgFor(p))), e.bgFor(p)); assert.ok(existsSync(R(e.life(p)))); }
    const ix = JSON.parse(readFileSync(R(`art/world/battle_biomes/${b}/index.json`)));
    assert.deepEqual(e.spots, ix.spots_frac);
  }
});

test('r56 maps pick their backdrop; water there uses reef_surf / bog_deep', () => {
  for (const [m, b] of Object.entries(R56_MAP_BIOMES)) { assert.equal(biomeFor('', m), b); assert.ok(PLATFORM_BIOMES[biomeFor('surf', m)]); }
  assert.equal(biomeFor('fishing', 'route_coast'), 'reef_surf');
  assert.equal(biomeFor('', 'route_coast_storm'), 'coast');
  assert.equal(biomeFor('grass', 'brookhollow'), 'grass');
});

test('per-skill fx ids resolve to files', () => {
  for (const id of Object.values(SKILL_FX)) {
    assert.equal(ELEMENT_FX[id], id);
    for (const a of ['impact', 'travel_p2f', 'travel_f2p']) { const s = fxStem(id, a); assert.ok(existsSync(R(s + '.gif')) && existsSync(R(s + '.json')), s); }
  }
});

test('tideglide sheet wired', async () => {
  const { CONFIG } = await import('../src/config.js').catch(() => ({}));
  const src = readFileSync(R('src/config.js'), 'utf8'); assert.match(src, /tideglide:/);
  for (const k of ['', '_2x', '_3x']) assert.ok(existsSync(R(`art/characters/pixel/humans/cal/tideglide/cal_tideglide_sheet${k}.png`)));
  void CONFIG;
});

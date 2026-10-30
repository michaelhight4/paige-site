// Water rules (Gary, Oct 30 2026 11:10 AM CT: shallow water removed): every water cell is deep / ride-only, fishable
// from land only, drawn in one deep colour; riding rolls water encounters per step (map water table, else fishing table).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as W from '../src/overworld/water_depth.js';
import * as L from '../src/fishing/logic.js';
import { EncounterRoller, fishZoneFor } from '../src/battle/encounters.js';

const mk = (rows) => { const g = rows.map((r) => [...r].map((c) => (c === '~' ? 3 : c === '=' ? 11 : 0))); return { width: g[0].length, height: g.length, code: (x, y) => g[y][x], inBounds: (x, y) => x >= 0 && y >= 0 && x < g[0].length && y < g.length }; };

test('classes: every water cell (3 and 11) is deep; land is 0; no edge band', () => {
  const m = mk(['.~~=~~', '~~~~~~']);
  assert.equal(W.waterClass(m, 0, 0), 0);
  for (const [x, y] of [[1, 0], [1, 1], [3, 0], [5, 1]]) { assert.equal(W.waterClass(m, x, y), W.DEEP); assert.ok(W.isFishable(m, x, y)); }
  assert.equal(W.SHALLOW, undefined);
  assert.equal(W.edgeMask(m, 1, 1, W.DEEP), 0);
});

test('fishing: any faced water cell from land; never while riding or standing on water', () => {
  const m = mk(['~~~~~', '~~~~~', '~~.~~', '~~=~~', '~~~~~']);
  assert.deepEqual(L.facedWater(m, 2, 2, 'up'), { x: 2, y: 1 });
  assert.deepEqual(L.facedWater(m, 2, 2, 'down'), { x: 2, y: 3 }); // code 11 too
  assert.equal(L.facedWater(m, 2, 2, 'up', { riding: true }), null);
  assert.equal(L.facedWater(m, 2, 1, 'up'), null); // on water = riding
});

test('recolour: one deep colour, binary alpha kept, palette colours only (no shallow row)', () => {
  const S = 64, a = new Uint8ClampedArray(S * S * 4);
  for (let i = 0; i < a.length; i += 4) { a[i] = 0x46; a[i + 1] = 0x92; a[i + 2] = 0xce; a[i + 3] = 255; }
  W.recolour(a, S, 'sea', W.DEEP, 15);
  for (const i of [0, 4, 5 * S * 4, (32 * S + 32) * 4]) assert.deepEqual([...a.slice(i, i + 4)], [0x2c, 0x64, 0xa8, 255]); // uniform, no fade at edges
  const hex = '#000000 #191210 #1a1226 #1e4078 #30488c #2c64a8 #4a70ba #4692ce #7ac2e8 #c6ecfa #18382c #244e34'.split(' ').map((h) => parseInt(h.slice(1), 16));
  for (const fam of Object.values(W.REMAP)) { assert.deepEqual(Object.keys(fam), [String(W.DEEP)]); for (const v of fam[W.DEEP].values()) assert.ok(hex.includes(v), v.toString(16)); }
});

test('riding encounters: per step on water; map water table first, else the fishing table', () => {
  const surf = { zones: { sea_surf: { method: 'water (Tideglide)', rate: 0.5, maps: ['seamap'], slots: [{ species: 'tidemarrow', level: [10, 10], weight: 1 }] } } };
  const fishing = JSON.parse(readFileSync(new URL('../data/fishing_tables.json', import.meta.url), 'utf8'));
  const fmap = Object.keys(fishing.maps).find((k) => fishing.maps[k].basic?.slots?.length);
  let r = 0; const rng = () => (r++ % 2 ? 0.0 : 0.01); // always under the rate
  const ro = new EncounterRoller(surf, { rng, graceSteps: 0 }); ro.fishing = fishing;
  const a = ro.stepWater('seamap', 1, 1); assert.equal(a.species, 'tidemarrow');
  const b = ro.stepWater(fmap, 1, 1); assert.ok(b, 'fishing-table fallback rolls');
  assert.ok(fishing.maps[fmap].basic.slots.some((s) => s.species === b.species));
  assert.equal(ro.stepWater('no_such_map', 1, 1), null);
  assert.equal(fishZoneFor(fishing, fmap, () => false), null); // art filter applies
  let n = 0; const ro2 = new EncounterRoller(surf, { rng: () => 0.99, graceSteps: 0 }); ro2.fishing = fishing; // never under the rate: no hit, still a roll per step
  for (let i = 0; i < 20; i++) if (ro2.stepWater('seamap', i, 1)) n++;
  assert.equal(n, 0);
});

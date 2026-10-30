// Shallow (fishable) vs deep water: src/overworld/water_depth.js + fishing facedWater (Oct 30 2026, Gary).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import * as W from '../src/overworld/water_depth.js';
import * as L from '../src/fishing/logic.js';

const mk = (rows) => { const g = rows.map((r) => [...r].map((c) => (c === '~' ? 3 : 0))); return { width: g[0].length, height: g.length, code: (x, y) => g[y][x], inBounds: (x, y) => x >= 0 && y >= 0 && x < g[0].length && y < g.length }; };

test('classes: water touching any non-water (8-neighbour) is shallow, open water deep, off-map counts as water', () => {
  const m = mk(['.~~~~~', '~~~~~~', '~~~~~~', '~~~~~~']);
  assert.equal(W.waterClass(m, 0, 0), 0);
  assert.equal(W.waterClass(m, 1, 1), W.SHALLOW); // diagonal to land
  assert.equal(W.waterClass(m, 1, 0), W.SHALLOW);
  assert.equal(W.waterClass(m, 3, 2), W.DEEP);
  assert.equal(W.waterClass(m, 5, 3), W.DEEP); // map edge = open sea
});

test('fishing: only shallow cells can be cast into; a shore player always faces shallow water', () => {
  const m = mk(['~~~~~', '~~~~~', '~~.~~', '~~~~~', '~~~~~']);
  assert.deepEqual(L.facedWater(m, 2, 2, 'up'), { x: 2, y: 1 });
  assert.equal(L.facedWater(m, 2, 1, 'up'), null); // gliding at (2,1) facing open (2,0): deep, no cast
});

test('recolour: exact palette remap + edge band, binary alpha kept', () => {
  const S = 64, a = new Uint8ClampedArray(S * S * 4);
  for (let i = 0; i < a.length; i += 4) { a[i] = 0x46; a[i + 1] = 0x92; a[i + 2] = 0xce; a[i + 3] = 255; }
  W.recolour(a, S, 'sea', W.DEEP, 1);
  assert.deepEqual([...a.slice(0, 4)], [0x1a, 0x12, 0x26, 255]); // drop line on the N side
  const mid = (32 * S + 32) * 4; assert.deepEqual([...a.slice(mid, mid + 4)], [0x2c, 0x64, 0xa8, 255]);
  const pal = new Set(); for (const fam of Object.values(W.REMAP)) for (const cls of Object.values(fam)) for (const v of cls.values()) pal.add(v);
  const png = readFileSync(new URL('../art/world/overworld/palette.png', import.meta.url)); assert.ok(png.length > 0);
  const hex = '#000000 #191210 #1a1226 #1e4078 #30488c #2c64a8 #4a70ba #4692ce #7ac2e8 #c6ecfa #246e6c #3e9c92 #70cab8 #18382c #244e34'.split(' ').map((h) => parseInt(h.slice(1), 16));
  for (const v of pal) assert.ok(hex.includes(v), v.toString(16));
});

test('every outdoor water map has fishable shallow cells', () => {
  const dir = new URL('../art/world/overworld/maps/', import.meta.url);
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.json'))) {
    const d = JSON.parse(readFileSync(new URL(f, dir), 'utf8')), C = d.layers?.collision;
    if (!Array.isArray(C) || !C.some((r) => Array.isArray(r) && r.includes(3))) continue;
    const m = { width: d.width, height: d.height, code: (x, y) => C[y]?.[x] ?? 1 };
    const g = W.waterClasses(m); assert.ok(g.includes(W.SHALLOW), f);
  }
});

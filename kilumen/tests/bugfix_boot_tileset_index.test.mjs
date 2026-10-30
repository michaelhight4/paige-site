// Boot load fix (Oct 30, 2026): the map's tileset index (collision, ramps, gate tile names, ambient footprints) used to come
// from the 1x tileset.json (1.26 MB) downloaded at boot next to the 2x set. It is now built from the zoom set's own JSON
// (same fetch the renderer makes). Safe only while every scale's JSON carries the same index data: checked here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { indexTileset } from '../src/overworld/tileset.js';

const OW = new URL('../art/world/overworld/', import.meta.url);
const load = (f) => JSON.parse(readFileSync(new URL(f, OW), 'utf8'));
const SCALE_ONLY = new Set(['tile_size', 'scale', 'sheets']); // differ per scale, never read through the index
const strip = (ts) => { const idx = indexTileset(ts); return { codes: idx.codes, columns: idx.columns,
  meta: Object.fromEntries(Object.entries(ts).filter(([k]) => !SCALE_ONLY.has(k) && k !== 'tiles')),
  tiles: [...idx.byId.values()].map(({ sheet, ...t }) => t) }; };

test('1x / 2x / 3x tileset JSON give the same index (ids, names, collision, animation, meta)', () => {
  const base = strip(load('tileset.json'));
  for (const f of ['tileset_2x.json', 'tileset_3x.json']) assert.deepEqual(strip(load(f)), base, f);
});

test('the per-tile sheet differs only by scale folder', () => {
  const a = load('tileset.json').tiles, b = load('tileset_2x.json').tiles;
  assert.equal(a.length, b.length);
  a.forEach((t, i) => assert.equal(b[i].sheet.replace(/2x/g, '1x'), t.sheet, t.name));
});

test('overworld builds the index from the zoom set, not the 1x file', () => {
  const src = readFileSync(new URL('../src/overworld/overworld.js', import.meta.url), 'utf8');
  assert.match(src, /tilesetIndex\) \{ const u = resolveUrl\(tilesetFileForZoom\(m\.tilesetRef, this\.sheetScale\)/);
  assert.match(src, /indexTileset\(\{ \.\.\.ts, tiles: ts\.tiles\.map\(\(t\) => \(\{ \.\.\.t \}\)\) \}\)/);
});

// Shop fix (Oct 24, 2026, Gary: "can't buy crystals or potions"): shop_int text_pending holds 8 region line variants of the
// clerk (variant_of: 'clerk') on the clerk's own cell (2,3). loadMap placed them as NPCs, the last one (Cindervale) owned the
// cell, its id was not 'clerk', so talking never opened RT Supply. Variants are lines, not people.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
const root = new URL('..', import.meta.url);
const read = (p) => fs.readFileSync(new URL(p, root), 'utf8');
test('loadMap skips variant_of NPCs from text_pending', () => {
  assert.match(read('src/overworld/overworld.js'), /extra\.filter\(\(d\) => !d\.variant_of && !ids\.has\(d\.id\)/);
  const m = JSON.parse(read('art/world/overworld/maps/shop_int.json'));
  const placed = [...m.npcs, ...(m.text_pending?.npcs || []).filter((d) => !d.variant_of)].filter((d) => d.x === 2 && d.y === 3);
  assert.deepEqual(placed.map((d) => d.id), ['clerk']);
});
test('shop_int clerk talk (or a clerk variant) opens the shop', () => {
  assert.match(read('src/systems/index.js'), /mapName === 'shop_int' && \(def\.id === 'clerk' \|\| def\.variant_of === 'clerk'\)/);
});

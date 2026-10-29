// World wind (src/overworld/wind.js): whole-pixel offsets in range, base rows fixed, foliage kinds, kill switch.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const W = await import(path.join(root, 'src/overworld/wind.js'));

test('offsets are whole pixels within the small amplitude, and calm with k=0', () => {
  for (let s = 0; s < 20; s += 0.37) for (let x = 0; x < 30; x += 3) for (let y = 0; y < 30; y += 5) {
    const c = W.canopyOffset(x, y, s, 2.2), g = W.tallOffset(x, y, s, 2.2), f = W.flowerBob(x, y, s);
    assert.ok(Number.isInteger(c) && Math.abs(c) <= 2); assert.ok(Number.isInteger(g) && g >= -1 && g <= 2); assert.ok(f === 0 || f === 1);
    assert.equal(W.canopyOffset(x, y, s, 0) | 0, 0);
  }
});
test('foliage kinds: canopies sway, trunks / bushes never do', () => {
  assert.equal(W.windKind({ name: 'tree_top' }), 1); assert.equal(W.windKind({ name: 'tree_base' }), 0);
  assert.equal(W.windKind({ name: 'tall_grass_front_0001_v0' }), 2); assert.equal(W.windKind({ name: 'flowers_warm' }), 3);
  assert.equal(W.windKind({ name: 'grass_dark_2' }), 4); assert.equal(W.windKind({ name: 'bush' }), 0);
});
test('canopy bottom band (trunk join) is drawn unshifted; ?wind=0 / reduced motion / indoors turn it off', () => {
  const calls = [], ctx = { drawImage: (...a) => calls.push(a) };
  const ts = { byId: new Map([[546, { name: 'tree_top' }]]) };
  const w = new W.Wind({ reduced: () => false });
  let s = 0; while (!W.canopyOffset(3, 4, s)) s += 0.1;
  w.frame({ tileset: ts, ms: s * 1000, life: { outdoor: true, weather: 'fair' } });
  assert.equal(w.kind(546), 1);
  assert.ok(w.draw(ctx, {}, 0, 0, 64, 100, 100, 128, 2, 1, 3, 4));
  assert.equal(calls.at(-1)[5], 100); // last band dx = base x
  w.frame({ tileset: ts, ms: 0, life: { outdoor: false } }); assert.equal(w.kind(546), 0);
  globalThis.KILUMEN_WIND_OFF = true; w.frame({ tileset: ts, ms: 0, life: { outdoor: true } }); assert.equal(w.kind(546), 0); delete globalThis.KILUMEN_WIND_OFF;
  const r = new W.Wind({ reduced: () => true }); r.frame({ tileset: ts, ms: 0, life: { outdoor: true } }); assert.equal(r.kind(546), 0);
});
test('Options Wind toggle: default on, off via life.settings.wind, ?wind=0 always wins', () => {
  assert.equal(W.windEnabled({ settings: { clouds: true } }), true);
  assert.equal(W.windEnabled({ settings: { wind: false } }), false);
  const w = new W.Wind({ life: { outdoor: true, weather: 'fair', settings: { wind: false } } });
  const v = { ms: 1000, tileset: { byId: new Map([[1, { name: 'tree_top' }]]) } };
  assert.equal(w.frame(v), false); assert.equal(w.kind(1), 0); // rest pose: plain draw
  w.life.settings.wind = true; assert.equal(w.frame(v), true); assert.equal(w.kind(1), 1); // live, no reload
  globalThis.KILUMEN_WIND_OFF = true; try { assert.equal(W.windEnabled({ settings: { wind: true } }), false); assert.equal(w.frame(v), false); } finally { delete globalThis.KILUMEN_WIND_OFF; }
});

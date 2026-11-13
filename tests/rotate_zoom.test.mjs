// Rotate zoom fix (Gary, Oct 23, 2026 11:12 AM CT, iPhone, live alpha): after turning the phone from portrait (the "turn sideways"
// screen) to landscape the game came back hugely zoomed in and smeared: the canvas kept its portrait backing store (1170x1992,
// zoom 4) and CSS stretched it over the landscape box. These tests pin the three guards (overworld.js):
//   1. resize() after a turn gives exactly what a fresh landscape load gives (backing store = CSS box x dpr, same zoom);
//   2. _fitCheck() (every frame on mobile) re-sizes whenever the backing store and the CSS box disagree, even with no event;
//   3. ensureAssets(): a slow portrait (1x) load that lands after the landscape (2x) load can't put the 1x art back.
// Browser check (real page, rotate back and forth): TAG=after node tests/rotate_zoom_check.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Overworld } from '../src/overworld/overworld.js';
import { pickZoom } from '../src/overworld/camera.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MOBILE = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/platform/mobile.json'), 'utf8'));
const DPR = 3, PORTRAIT = { width: 390, height: 664 }, LAND = { width: 844, height: 390 };
// Mobile frame-rate fix (Oct 23, 2026): with display.nativeRender the store is the CSS box x dpr / table zoom Z, drawn at zoom 1.
const store = (r) => { const h = r.height * DPR, Z = pickZoom(h, MOBILE.zoom); return [Math.ceil(r.width * DPR / Z), Math.ceil(h / Z)]; };

function scene(rect) {
  const box = { ...rect }, s = Object.create(Overworld.prototype);
  let resets = 0;
  Object.assign(s, { canvas: { width: 0, height: 0, getBoundingClientRect: () => ({ ...box }) }, opts: { platform: { profile: MOBILE } },
    renderer: { resetContext() { resets++; } }, zoom: 0, map: null });
  globalThis.window = { devicePixelRatio: DPR, innerWidth: rect.width, innerHeight: rect.height };
  return { s, turn: (r) => Object.assign(box, r), resets: () => resets };
}

test('turning portrait -> landscape re-sizes to the same backing store and zoom as a fresh landscape load', () => {
  const fresh = scene(LAND); Overworld.prototype.resize.call(fresh.s);
  const { s, turn } = scene(PORTRAIT); s.resize();
  assert.deepEqual([s.canvas.width, s.canvas.height], store(PORTRAIT)); // 1170x1992 at zoom 4 -> 293x498 at zoom 1
  assert.equal(pickZoom(PORTRAIT.height * DPR, MOBILE.zoom), 4, 'portrait (behind the overlay) is zoom 4 on a dpr 3 phone');
  assert.equal(s.zoom, 1);
  for (let i = 0; i < 4; i++) { turn(LAND); s.resize(); turn(PORTRAIT); s.resize(); }
  turn(LAND); s.resize();
  assert.deepEqual([s.canvas.width, s.canvas.height], [fresh.s.canvas.width, fresh.s.canvas.height]);
  assert.equal(s.zoom, fresh.s.zoom);
  assert.equal(s.zoom, 1);
  assert.deepEqual([s.canvas.width, s.canvas.height], store(LAND));
});

test('_fitCheck re-sizes when the CSS box changed with no event (stale portrait store), and is a no-op otherwise', () => {
  const { s, turn, resets } = scene(PORTRAIT); s.resize();
  const n = resets();
  s._fitCheck();
  assert.equal(resets(), n, 'no resize while the store already matches the box');
  turn(LAND); // iOS: the box changed, no resize event reached the page
  s._fitCheck();
  assert.deepEqual([s.canvas.width, s.canvas.height], store(LAND)); // 2532x1170 at zoom 2 -> 1266x585 at zoom 1
  assert.equal(pickZoom(LAND.height * DPR, MOBILE.zoom), 2);
  assert.equal(s.zoom, 1);
  assert.equal(s.canvas.width / s.canvas.height, LAND.width / LAND.height, 'no CSS stretch: store aspect = box aspect');
});

test('mobile frame() runs the fit check (fitCanvas only) and the overlay hide re-measures', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/overworld/overworld.js'), 'utf8');
  const frame = src.slice(src.indexOf('  frame(now) {'), src.indexOf('  frame(now) {') + 300);
  assert.match(frame, /display\?\.fitCanvas\) this\._fitCheck\(\)/);
  assert.match(src, /matchMedia\?\.\('\(orientation: portrait\)'\)/, 'overlay hide (orientation media query) re-measures');
});

test('ensureAssets: a slow portrait (1x) load finishing after the landscape (2x) load does not win', async () => {
  const delay = (url) => (/_2x|2x\.png/.test(url) ? 5 : 60); // the 1x files are still downloading when the phone turns
  globalThis.location = { href: 'http://x/index.html' };
  globalThis.fetch = (url) => new Promise((r) => setTimeout(() => r({ ok: true, json: async () => ({ tile_size: /_2x/.test(url) ? 128 : 64, tiles: [{ id: 't', sheet: /_2x/.test(url) ? 's2x.png' : 's.png' }] }) }), delay(url)));
  globalThis.Image = class { set src(u) { this._src = u; setTimeout(() => this.onload(), delay(u)); } get src() { return this._src; } };
  const s = Object.create(Overworld.prototype);
  Object.assign(s, { map: { name: 'brookhollow', tilesetRef: '../tileset.json' }, mapUrl: () => 'http://x/maps/brookhollow.json', grades: null,
    config: { playerSheets: { walk: { 1: 'walk.png', 2: 'walk_2x.png', 3: 'walk_3x.png' } } }, _loadActorSprites: async () => {} });
  s.zoom = 4; const portrait = s.ensureAssets(); // loaded upright behind the overlay
  await new Promise((r) => setTimeout(r, 10));
  s.zoom = 2; const land = s.ensureAssets(); // turned sideways
  await Promise.all([portrait, land]);
  await new Promise((r) => setTimeout(r, 150));
  assert.equal(s.tileset.size, 128, 'tiles: the 2x set for zoom 2');
  assert.equal(s.playerScale, 2, 'player sheets: 2x');
  assert.equal(s.playerImgs.walk.src, 'walk_2x.png');
  assert.equal(s.sheetScale, s.playerScale, 'actor sheets match the zoom (no wrong source rects)');
});

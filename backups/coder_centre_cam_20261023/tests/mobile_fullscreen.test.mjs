// Mobile full screen pass (Oct 23, 2026; Gary: "make sure the mobile version uses the whole screen").
// On the mobile profile the canvas covers the whole viewport (backing store from its own 100dvh CSS box, and no black around
// short maps); the pc profile keeps the old path byte for byte. Screens: tests/mobile_fullscreen_shots.mjs.
// Run: node --test tests/mobile_fullscreen.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Overworld } from '../src/overworld/overworld.js';
import { Renderer } from '../src/overworld/renderer.js';
import { cameraFor, pickZoom } from '../src/overworld/camera.js';
import { TILE } from '../src/overworld/constants.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = (id) => JSON.parse(fs.readFileSync(path.join(ROOT, 'src/platform', id + '.json'), 'utf8'));
const PC = load('pc'), MOBILE = load('mobile');

// phone landscape panels: [css w, css h, dpr]  (2340x1080, 2400x1080, 2532x1170, 1600x720, 844x390 css)
const PHONES = [[780, 360, 3], [800, 360, 3], [844, 390, 3], [800, 360, 2], [844, 390, 2]];

test('profiles: only mobile has the display block (pc untouched)', () => {
  assert.equal(PC.display, undefined);
  assert.equal(MOBILE.display.fitCanvas, true);
  assert.equal(MOBILE.display.outsideMap, 'edge');
  assert.equal(MOBILE.display.fullscreenButton, true);
});

function fakeScene(profile, rect, win) {
  globalThis.window = win;
  return { canvas: { width: 0, height: 0, getBoundingClientRect: () => rect }, opts: { platform: { profile } }, renderer: { resetContext() {} }, zoom: 0, map: null };
}

test('mobile: canvas backing store = the canvas CSS box (100dvh), not innerHeight under a 100vh box', () => {
  for (const [w, h, dpr] of PHONES) {
    // browser bars showing: innerHeight lags behind; the dvh box is what is on screen
    const s = fakeScene(MOBILE, { width: w, height: h }, { devicePixelRatio: dpr, innerWidth: w, innerHeight: h - 50 });
    Overworld.prototype.resize.call(s);
    assert.deepEqual([s.canvas.width, s.canvas.height], [w * dpr, h * dpr], `${w}x${h}@${dpr}`);
    assert.equal(s.zoom, pickZoom(h * dpr, MOBILE.zoom)); // integer zoom, width widens the view (no stretch)
    assert.ok(Number.isInteger(s.zoom));
  }
});

test('pc: resize still reads innerWidth/innerHeight (unchanged path)', () => {
  const s = fakeScene(PC, { width: 10, height: 10 }, { devicePixelRatio: 1, innerWidth: 1920, innerHeight: 1080 });
  Overworld.prototype.resize.call(s);
  assert.deepEqual([s.canvas.width, s.canvas.height], [1920, 1080]);
});

// Coverage: draw a short interior (14x10, like heal_brookhollow) and check every canvas cell is painted by something other
// than the initial black clear.
function coverage(profile, W, H) {
  const z = pickZoom(H, profile.zoom), mw = 14, mh = 10;
  const painted = new Uint8Array(Math.ceil(W / z) * Math.ceil(H / z)), cw = Math.ceil(W / z);
  let clears = 0;
  const mark = (x, y, w, h) => {
    for (let yy = Math.max(0, Math.floor(y / z)); yy < Math.min(H, y + h) / z; yy++)
      for (let xx = Math.max(0, Math.floor(x / z)); xx < Math.min(W, x + w) / z; xx++) painted[yy * cw + xx] = 1;
  };
  const ctx = { set fillStyle(v) { this._f = v; }, get fillStyle() { return this._f; }, globalAlpha: 1,
    fillRect(x, y, w, h) { if (this._f === '#000' && clears++ === 0) return; mark(x, y, w, h); },
    drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh) { mark(dx, dy, dw, dh); } };
  const r = Object.create(Renderer.prototype); r.canvas = { width: W, height: H }; r.ctx = ctx;
  const map = { width: mw, height: mh, layers: {}, tile: (l, x, y) => (l === 'ground' && x >= 0 && y >= 0 && x < mw && y < mh ? 1 : 0) };
  const tileset = { size: TILE, columns: 1, byId: new Map([[1, { index: 0, sheet: 's' }]]), images: new Map([['s', {}]]) };
  const cam = cameraFor(7 * TILE, 8 * TILE, mw, mh, W / z, H / z, profile.camera, null, { indoor: true });
  r.draw({ map, tileset, zoom: z, cam, ms: 0, actors: [], fade: 0, outside: profile.display?.outsideMap, edgeShade: profile.display?.edgeShade });
  return painted.reduce((a, b) => a + b, 0) / painted.length;
}

test('mobile: no black around short maps on 19.5:9 / 20:9 phones (canvas fully covered)', () => {
  for (const [w, h, dpr] of PHONES) assert.equal(coverage(MOBILE, w * dpr, h * dpr), 1, `${w}x${h}@${dpr}`);
});

test('pc: a short map is still centred on black (behaviour unchanged)', () => {
  assert.ok(coverage(PC, 2340, 1080) < 1);
});

test('style.css: mobile canvas uses 100dvh; pc #world rule untouched', () => {
  const css = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');
  assert.match(css, /body\.platform-mobile #world \{[^}]*height: 100dvh/);
  assert.match(css, /#world \{ position: fixed; inset: 0; width: 100vw; height: 100vh; display: block;/);
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.match(html, /viewport-fit=cover/);
  const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.webmanifest'), 'utf8'));
  assert.ok(['fullscreen', 'standalone'].includes(man.display));
});

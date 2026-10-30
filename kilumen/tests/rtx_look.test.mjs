// RTX look (src/overworld/rtx.js): default Auto, URL override, tier picking for weak GPUs, watchdog, tile mask, shader text.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = await import(path.join(root, 'src/overworld/rtx.js'));
const { Col } = await import(path.join(root, 'src/overworld/constants.js'));

test('default is Auto and modes cycle Auto -> Full -> Lite -> Off -> Auto', () => {
  const r = new R.RtxLook({ opts: {} });
  assert.equal(r.mode, 'auto'); assert.equal(r.on, true); assert.equal(r.label(), 'Auto');
  const seen = []; for (let i = 0; i < 4; i++) seen.push(r.cycle());
  assert.deepEqual(seen, ['full', 'lite', 'off', 'auto']);
});
test('?rtx= overrides', () => {
  const q = (v) => new URLSearchParams('rtx=' + v);
  assert.equal(R.rtxFromUrl(q('0')), 'off'); assert.equal(R.rtxFromUrl(q('1')), 'auto'); assert.equal(R.rtxFromUrl(q('lite')), 'lite');
  assert.equal(R.rtxFromUrl(q('nope')), null); assert.equal(R.rtxFromUrl(new URLSearchParams('')), null);
  assert.equal(new R.RtxLook({ opts: {} }, { query: q('full') }).mode, 'full');
});
test('auto tier: lite on phones and weak / software GPUs, off without WebGL2, full on desktop GPUs', () => {
  assert.equal(R.pickTier({ webgl2: false }), 'off');
  assert.equal(R.pickTier({ renderer: 'ANGLE (NVIDIA GeForce RTX 3060)' }), 'full');
  assert.equal(R.pickTier({ renderer: 'Google SwiftShader' }), 'lite');
  assert.equal(R.pickTier({ renderer: 'Adreno (TM) 506' }), 'lite');
  assert.equal(R.pickTier({ renderer: 'Apple GPU', mobile: true }), 'lite');
  assert.equal(R.pickTier({ renderer: 'Mali-G52', mobile: true, memGB: 2, cores: 8 }), 'lite'); // low-end phone -> Lite
  assert.equal(R.pickTier({ renderer: 'Adreno (TM) 308', mobile: true, memGB: 2, cores: 4 }), 'off'); // weak GPU + low-end phone -> Off
  assert.equal(R.pickTier({ renderer: 'Mali-400', mobile: true, memGB: 1 }), 'off');
  assert.equal(R.pickTier({ renderer: 'ANGLE (NVIDIA)', memGB: 2, cores: 4 }), 'full'); // desktops are not 'low-end phones'
  assert.equal(R.TIER.lite.shadows, 0); assert.equal(R.TIER.lite.godRays, 0); assert.ok(R.TIER.lite.lights < R.TIER.full.lights);
});
test('watchdog only steps Auto down: full -> lite -> off', () => {
  assert.equal(R.stepDown('auto', 'full'), 'lite'); assert.equal(R.stepDown('auto', 'lite'), 'off'); assert.equal(R.stepDown('full', 'full'), 'full');
});
test('tile mask: solid casts shadow, water reflects, walkable outdoor ground can puddle', () => {
  const codes = [[Col.WALK, Col.BLOCK], [Col.WATER, Col.DOOR]];
  const map = { width: 2, height: 2, code: (x, y) => codes[y][x] };
  const a = R.buildMask(map, true), px = (x, y) => Array.from(a.slice((y * 2 + x) * 4, (y * 2 + x) * 4 + 3));
  assert.deepEqual(px(0, 0), [0, 0, 255]); assert.deepEqual(px(1, 0), [255, 0, 0]); assert.deepEqual(px(0, 1), [0, 255, 0]); assert.deepEqual(px(1, 1), [0, 0, 0]);
  assert.equal(R.buildMask(map, false)[2], 0); // indoors: no puddles
});
test('phase looks: lamps at night, no sun indoors', () => {
  assert.equal(R.phaseLook('night', true).lamps, 1); assert.equal(R.phaseLook('day', true).lamps, 0); assert.equal(R.phaseLook('day', false).sun, 0);
});
test('rain reads overcast: lower exposure, little bloom, no sun; indoors unaffected', () => {
  const dry = R.phaseLook('day', true), wet = R.phaseLook('day', true, true);
  assert.ok(wet.exposure < dry.exposure && wet.exposure <= 0.8); assert.ok(wet.bloom <= 0.3 && dry.bloom === 1);
  assert.equal(wet.sun, 0); assert.ok(wet.sat < dry.sat); assert.ok(Math.max(...wet.amb) < 1);
  assert.deepEqual(R.phaseLook('day', false, true), R.phaseLook('day', false));
  assert.match(R.FS_COMP_SRC, /uExposure/); assert.match(R.FS_COMP_SRC, /\*uBloom/);
});
test('world layer only: UI (markers, debug, fade) is drawn after the grade', () => {
  const ow = fs.readFileSync(path.join(root, 'src/overworld/overworld.js'), 'utf8');
  assert.match(ow, /this\.renderer\.draw\(v, \{ ui: false \}\); this\.rtx\.post\(v\); this\.renderer\.drawUi\(v\)/);
  const calls = []; const ctx = new Proxy({}, { get: (t, k) => k in t ? t[k] : (...a) => calls.push(k), set: (t, k, val) => { t[k] = val; return true; } });
  return import(path.join(root, 'src/overworld/renderer.js')).then(({ Renderer }) => {
    const rd = Object.create(Renderer.prototype); rd.ctx = ctx; rd.canvas = { width: 64, height: 64 };
    const marks = []; const v = { map: { width: 4, height: 4 }, tileset: {}, zoom: 1, cam: { x: 0, y: 0 }, fade: 0.5, markers: () => marks.push(1) };
    rd.drawUi(v); assert.equal(marks.length, 1); assert.ok(calls.includes('fillRect'));
  });
});
test('wired: Options row, render hook, credits', () => {
  assert.match(fs.readFileSync(path.join(root, 'src/ui/ui.js'), 'utf8'), /'RTX look', s\.rtx\.label\(\)/);
  assert.match(fs.readFileSync(path.join(root, 'src/overworld/overworld.js'), 'utf8'), /this\.rtx\.post\(v\)/);
  assert.match(fs.readFileSync(path.join(root, 'THIRD_PARTY_LICENSES'), 'utf8'), /Khronos PBR Neutral/);
});

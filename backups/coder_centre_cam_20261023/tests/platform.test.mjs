// Platform profiles (DRAFT, Oct 22, 2026): pc and mobile are independent. Run: node --test tests/platform.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { choosePlatform, zoomFromTable, dialogBottomFor, cssVarsFor, PLATFORM_IDS } from '../src/platform.js';
import { pickZoom, cameraFor, DEFAULT_CAMERA } from '../src/overworld/camera.js';
import { TILE } from '../src/overworld/constants.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = (id) => JSON.parse(fs.readFileSync(path.join(ROOT, 'src/platform', id + '.json'), 'utf8'));
const PC = load('pc'), MOBILE = load('mobile');
const oldPickZoom = (h) => (h < 600 ? 1 : Math.max(2, Math.floor(h / 480)));

test('selection: pc by default, mobile on coarse pointer or touch-capable', () => {
  assert.equal(choosePlatform({}).id, 'pc');
  assert.equal(choosePlatform({ coarse: true }).id, 'mobile');
  assert.equal(choosePlatform({ touchCapable: true }).id, 'mobile');
  assert.equal(choosePlatform({ coarse: true, touchCapable: true }).id, 'mobile');
});

test('overrides: ?platform wins; ?touch=1 aliases mobile, ?touch=0 aliases pc; junk is ignored', () => {
  assert.equal(choosePlatform({ search: '?platform=pc', coarse: true, touchCapable: true }).id, 'pc');
  assert.equal(choosePlatform({ search: '?platform=mobile' }).id, 'mobile');
  assert.equal(choosePlatform({ search: '?platform=MOBILE' }).id, 'mobile');
  assert.equal(choosePlatform({ search: '?touch=1' }).id, 'mobile');
  assert.equal(choosePlatform({ search: '?touch=0', coarse: true }).id, 'pc');
  assert.equal(choosePlatform({ search: '?platform=pc&touch=1' }).id, 'pc');
  assert.equal(choosePlatform({ search: '?platform=tv' }).id, 'pc');
  assert.equal(choosePlatform({ search: '?platform=tv', coarse: true }).id, 'mobile');
});

test('profiles: ids, independent objects, every section present', () => {
  assert.deepEqual(PLATFORM_IDS, ['pc', 'mobile']);
  assert.equal(PC.id, 'pc'); assert.equal(MOBILE.id, 'mobile');
  for (const p of [PC, MOBILE]) {
    assert.match(p._status, /DRAFT/);
    for (const k of ['zoom', 'camera', 'hud', 'controls']) assert.ok(p[k], `${p.id}.${k}`);
    for (const r of p.zoom.breakpoints) assert.ok(Number.isInteger(r.minHeight) && r.minHeight >= 0);
  }
  assert.equal(PC.controls.touch, false); assert.equal(MOBILE.controls.touch, true);
  assert.deepEqual(PC.controls.inputs, ['keyboard', 'mouse', 'controller']);
  assert.ok(PC.controls.prompts.keyboard && PC.controls.prompts.controller && PC.controls.prompts.mouse);
  assert.ok(MOBILE.controls.prompts.touch);
  assert.equal(PC.controls.orientation, 'any'); assert.equal(MOBILE.controls.orientation, 'landscape');
});

test('1440p = 3x on PC is ONE named value, and it drives the whole 1440 band', () => {
  assert.equal(PC.zoom.zoom1440p, 3);
  const rows = PC.zoom.breakpoints.filter((r) => r.zoom === 'zoom1440p');
  assert.equal(rows.length, 1); assert.equal(rows[0].minHeight, 1440);
  assert.equal(PC.zoom.breakpoints.filter((r) => r.zoom === 3).length, 0, 'no second literal 3 in the PC table');
  assert.equal(pickZoom(1440, PC.zoom), 3);
  const tuned = structuredClone(PC.zoom); tuned.zoom1440p = 2;
  assert.equal(pickZoom(1440, tuned), 2); assert.equal(pickZoom(1919, tuned), 2);
  assert.equal(pickZoom(1080, tuned), 2); assert.equal(pickZoom(2160, tuned), 4);
  assert.equal(pickZoom(1440, MOBILE.zoom), 3, 'tuning PC 1440p leaves mobile alone');
});

test('zoom tables start from today\'s pickZoom (1 under 600, else max(2, floor(h/480)))', () => {
  for (let h = 0; h <= 4320; h++) assert.equal(pickZoom(h, PC.zoom), oldPickZoom(h), `pc h=${h}`);
  for (let h = 0; h <= 3359; h++) assert.equal(pickZoom(h, MOBILE.zoom), oldPickZoom(h), `mobile h=${h}`);
  assert.deepEqual([720, 1080, 1440, 2160].map((h) => pickZoom(h, PC.zoom)), [2, 2, 3, 4]);
  // checklist phone sizes at dpr 2 (device px height): 390->780, 430->860, 360->720, tablet 768->1536
  assert.deepEqual([780, 860, 720, 1536].map((h) => pickZoom(h, MOBILE.zoom)), [2, 2, 2, 3]);
  assert.equal(pickZoom(1080), 2, 'no profile: legacy rule');
});

test('zoom tables are independent: editing one profile never changes the other', () => {
  const pc = structuredClone(PC), mob = structuredClone(MOBILE);
  mob.zoom.breakpoints[1].zoom = 3; mob.zoom.breakpoints[1].minHeight = 500;
  for (let h = 0; h <= 3000; h += 7) assert.equal(zoomFromTable(pc.zoom, h), zoomFromTable(PC.zoom, h));
  pc.zoom.breakpoints[1].minHeight = 700;
  for (let h = 0; h <= 3000; h += 7) assert.equal(zoomFromTable(MOBILE.zoom, h), oldPickZoom(h), `shipped mobile table untouched h=${h}`);
  assert.equal(zoomFromTable(mob.zoom, 550), 3); assert.equal(zoomFromTable(PC.zoom, 550), 1);
  assert.equal(zoomFromTable(pc.zoom, 650), 1); assert.equal(zoomFromTable(MOBILE.zoom, 650), 2);
  assert.throws(() => zoomFromTable({ breakpoints: [{ minHeight: 0, zoom: 'missing' }] }, 10));
  assert.throws(() => zoomFromTable({ breakpoints: [{ minHeight: 0, zoom: 1.5 }] }, 10));
});

test('dialogue bottom: pc 4vh everywhere; mobile 200px, 180px at max-height 340px', () => {
  assert.equal(dialogBottomFor(PC.hud, () => true), '4vh');
  assert.equal(dialogBottomFor(MOBILE.hud, () => false), 'calc(200px + var(--safe-bottom))');
  assert.equal(dialogBottomFor(MOBILE.hud, (m) => m === '(max-height: 340px)'), 'calc(180px + var(--safe-bottom))');
  // 200 = d-pad bottom + size + 8 (Text Bot's fix), so the lift follows the touch layout numbers
  const t = MOBILE.controls.touchLayout;
  assert.equal(t.dpad.bottom + t.dpad.size + 8, 200);
});

test('css vars: touch layout + safe areas only on mobile; pc has no touch vars', () => {
  const pc = cssVarsFor(PC), mob = cssVarsFor(MOBILE);
  assert.equal(pc['--dlg-bottom'], '4vh'); assert.equal(pc['--safe-bottom'], '0px');
  assert.equal(Object.keys(pc).some((k) => k.startsWith('--tp-')), false);
  assert.equal(mob['--tp-dpad-size'], '174px'); assert.equal(mob['--tp-dpad-cell'], '58px');
  assert.equal(mob['--tp-dpad-left'], '18px'); assert.equal(mob['--tp-dpad-bottom'], '18px');
  assert.equal(mob['--tp-ab-size'], '76px'); assert.equal(mob['--tp-btns-right'], '22px'); assert.equal(mob['--tp-btns-bottom'], '30px');
  assert.equal(mob['--tp-small-w'], '56px'); assert.equal(mob['--tp-small-h'], '36px');
  for (const s of ['top', 'right', 'bottom', 'left']) assert.equal(mob[`--safe-${s}`], `env(safe-area-inset-${s}, 0px)`);
});

test('camera rules: both profiles reproduce today\'s camera exactly', () => {
  for (const p of [PC, MOBILE]) {
    const { follow, deadzonePx, clampToMapEdges, smallMapAxis } = p.camera;
    assert.deepEqual({ follow, deadzonePx, clampToMapEdges, smallMapAxis }, { ...DEFAULT_CAMERA, deadzonePx: { ...DEFAULT_CAMERA.deadzonePx } });
    for (const [fx, fy, mw, mh, vw, vh] of [[100, 100, 40, 30, 300, 200], [5 * TILE, 3 * TILE, 8, 6, 640, 360], [2000, 1500, 40, 30, 1280 / 3, 720 / 3]])
      assert.deepEqual(cameraFor(fx, fy, mw, mh, vw, vh, p.camera), cameraFor(fx, fy, mw, mh, vw, vh));
  }
  // rules are honoured when tuned (deadzone holds the camera, short axis can pin to the start)
  const dz = { ...DEFAULT_CAMERA, deadzonePx: { x: 32, y: 0 } };
  assert.deepEqual(cameraFor(1020, 900, 40, 30, 400, 300, dz, { x: 800, y: 750 }), { x: 800, y: 750 });
  assert.equal(cameraFor(5 * TILE, 3 * TILE, 8, 6, 640, 360, { ...DEFAULT_CAMERA, smallMapAxis: 'start' }).x, 0);
});

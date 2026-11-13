// Night FX v1 (Oct 23, 2026): switches + light anchors + moon map + window schedule. node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GameMap } from '../src/overworld/map.js';
import { indexTileset } from '../src/overworld/tileset.js';
import { CONFIG } from '../src/config.js';
import {
  NIGHTFX_KEYS, resolveNightFx, anyOn, parsePalette, buildMoonMap, buildRimMap, MOON,
  windowSchedule, windowLit, lampLevel, flicker, findAnchors, pool, ditherLevel, LEVELS, NIGHT_CLOUD_LEVEL,
} from '../src/overworld/nightfx.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KIT = path.join(ROOT, 'art/world/overworld');
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const A = readJson(path.join(ROOT, CONFIG.nightFxAnchors));
const PAL = parsePalette(fs.readFileSync(path.join(ROOT, CONFIG.paletteHex), 'utf8'));
const TS = indexTileset(readJson(path.join(KIT, 'tileset.json')));
const loadMap = (n) => new GameMap(readJson(path.join(KIT, 'maps', n + '.json'))).attachTileset(TS.byId);
const anchorsOf = (m) => findAnchors(m, (L, x, y) => TS.byId.get(m.tile(L, x, y))?.name || null, A);
const ALL_ON = { nightLights: true, moonlight: true, clouds: true };

test('config: nightFx flags all on (dev default), anchors + palette paths exist', () => {
  for (const k of NIGHTFX_KEYS) assert.equal(CONFIG.nightFx[k], true, k);
  assert.ok(fs.existsSync(path.join(ROOT, CONFIG.nightFxAnchors)));
  assert.equal(PAL.length, 64);
});

test('switches: dev default on, alpha forces off and ignores the URL', () => {
  const dev = resolveNightFx({ config: ALL_ON, profile: {}, query: '' });
  for (const k of NIGHTFX_KEYS) assert.equal(dev[k], true, k);
  assert.ok(anyOn(dev));
  const alpha = resolveNightFx({ config: ALL_ON, profile: {}, query: '?nightfx=1&clouds=1&moonlight=1', alpha: true });
  for (const k of NIGHTFX_KEYS) assert.equal(alpha[k], false, k);
  assert.equal(anyOn(alpha), false);
});

test('switches: ?nightfx=0|1 sets all, ?clouds / ?moonlight / ?nightlights set one, profile can veto', () => {
  const off = resolveNightFx({ config: ALL_ON, query: '?nightfx=0' });
  for (const k of NIGHTFX_KEYS) assert.equal(off[k], false, k);
  const on = resolveNightFx({ config: { nightLights: false, moonlight: false, clouds: false }, query: '?nightfx=1' });
  for (const k of NIGHTFX_KEYS) assert.equal(on[k], true, k);
  const c0 = resolveNightFx({ config: ALL_ON, query: '?clouds=0' });
  assert.deepEqual([c0.nightLights, c0.moonlight, c0.clouds], [true, true, false]);
  const c1 = resolveNightFx({ config: ALL_ON, query: '?nightfx=0&clouds=1' });
  assert.deepEqual([c1.nightLights, c1.moonlight, c1.clouds], [false, false, true]);
  const veto = resolveNightFx({ config: ALL_ON, profile: { clouds: false } });
  assert.equal(veto.clouds, false);
  assert.equal(resolveNightFx({ config: ALL_ON, query: '?lightcell=2' }).lightCell, 2);
  assert.equal(resolveNightFx({ config: {}, query: '' }).nightLights, false);
});

test('profiles: pc.json and mobile.json both carry a valid nightFx block', () => {
  for (const n of ['pc', 'mobile']) {
    const p = readJson(path.join(ROOT, 'src/platform', n + '.json')).nightFx;
    assert.ok(p, n);
    assert.ok(Number.isInteger(p.lightCell) && p.lightCell >= 1 && p.lightCell <= 16, n);
    assert.ok(p.windowsGoDark >= 0 && p.windowsGoDark <= 1, n);
    const s = resolveNightFx({ config: ALL_ON, profile: p });
    assert.equal(s.lightCell, p.lightCell);
    assert.equal(s.clouds, p.clouds !== false);
  }
  assert.ok(readJson(path.join(ROOT, 'src/platform/mobile.json')).nightFx.lightCell
    >= readJson(path.join(ROOT, 'src/platform/pc.json')).nightFx.lightCell, 'phone buffer no finer than PC');
});

test('anchors JSON: kinds valid, colours on the palette, every referenced kind exists', () => {
  const pal = new Set(PAL);
  for (const [k, v] of Object.entries(A.kinds)) {
    if (k.startsWith('_')) continue;
    assert.ok(v.r > 0 && v.r <= 128, k);
    assert.ok(pal.has(parseInt(v.colour, 16)), `${k} colour ${v.colour} off-palette`);
  }
  for (const [from, to] of Object.entries(A.glass || {})) if (!from.startsWith('_')) assert.ok(pal.has(parseInt(to, 16)), `glass ${from}->${to}`);
  const refs = [...Object.entries(A.buildings).filter(([k]) => !k.startsWith('_')).flatMap(([, b]) => b.lights || []), ...Object.entries(A.tiles).filter(([k]) => !k.startsWith('_')).flatMap(([, t]) => t)];
  for (const l of refs) assert.ok(A.kinds[l.kind], `unknown kind ${l.kind}`);
  for (const [b, d] of Object.entries(A.buildings)) if (!b.startsWith('_')) for (const w of d.windows || []) assert.equal(w.length, 4, b);
});

test('anchors on the real maps: Brookhollow + Fernwick have windows and lamps inside the map; indoor maps have none', () => {
  for (const n of ['brookhollow', 'fernwick']) {
    const m = loadMap(n), a = anchorsOf(m);
    assert.ok(a.windows.length >= 20, `${n} windows ${a.windows.length}`);
    assert.ok(a.lights.length >= 10, `${n} lights ${a.lights.length}`);
    assert.ok(a.lights.some((l) => l.flame), `${n} has a flame light`);
    const W = m.width * 64, H = m.height * 64;
    for (const l of a.lights) assert.ok(l.x >= 0 && l.y >= 0 && l.x < W && l.y < H, `${n} light ${l.key} outside`);
    for (const w of a.windows) assert.ok(w.x >= 0 && w.y >= 0 && w.x + w.w <= W && w.y + w.h <= H, `${n} window ${w.key}`);
    assert.equal(new Set(a.windows.map((w) => w.key)).size, a.windows.length, 'window keys unique');
  }
  for (const n of ['heal_brookhollow', 'lab_brookhollow', 'greystone_b1']) assert.equal(anchorsOf(loadMap(n)).windows.length, 0, n);
});

test('moon map: every palette colour maps onto the palette, cooler and never brighter than silver; rim never darker', () => {
  const pal = new Set(PAL), luma = (c) => 0.299 * (c >> 16) + 0.587 * ((c >> 8) & 255) + 0.114 * (c & 255);
  for (const o of [MOON.tiles, MOON.sprites]) {
    const m = buildMoonMap(PAL, o);
    assert.equal(m.size, 64);
    for (const [c, v] of m) assert.ok(pal.has(v), `${c.toString(16)} -> ${v.toString(16)} off-palette`);
    const rim = buildRimMap(m, PAL);
    for (const [v, r] of rim) { assert.ok(pal.has(r)); assert.ok(luma(r) >= luma(v)); }
  }
  // readable: the moon map keeps at least 10 distinct tones (11 at v1; not muddy)
  assert.ok(new Set(buildMoonMap(PAL, MOON.tiles).values()).size >= 10);
});

test('window schedule: seeded + deterministic, lights 17:00-19:30, some go dark late, all off by day', () => {
  const keys = Array.from({ length: 200 }, (_, i) => 'brookhollow|house_a@3,4#' + i);
  const s = keys.map((k) => windowSchedule(k, 0.4));
  assert.deepEqual(s, keys.map((k) => windowSchedule(k, 0.4)));
  for (const w of s) { assert.ok(w.on >= 1020 && w.on < 1170); assert.equal(windowLit(w, 12 * 60), false); assert.equal(windowLit(w, 21 * 60), true); }
  const darkAt2 = s.filter((w) => !windowLit(w, 2 * 60 + 30)).length;
  assert.ok(darkAt2 > 40 && darkAt2 < 120, `dark at 02:30: ${darkAt2}`);
  assert.equal(keys.map((k) => windowSchedule(k, 0)).filter((w) => !windowLit(w, 150)).length, 0);
});

test('lamp level + flicker: off by day, full at night, flicker stepped in 1/8 and 1 under reduced motion', () => {
  assert.equal(lampLevel(12 * 60), 0);
  assert.equal(lampLevel(22 * 60), 1);
  assert.equal(lampLevel(2 * 60), 1);
  assert.ok(lampLevel(17 * 60 + 45) > 0 && lampLevel(17 * 60 + 45) < 1);
  assert.equal(lampLevel(7 * 60), 0);
  const seen = new Set();
  for (let t = 0; t < 600; t++) { const f = flicker(1234, t); assert.equal(f * 8, Math.round(f * 8)); assert.ok(f >= 0.7 && f <= 1); seen.add(f); }
  assert.ok(seen.size >= 2);
  for (let t = 0; t < 100; t++) assert.equal(flicker(1234, t, false), 1);
  assert.equal(flicker(9, 3), flicker(9, 5), 'same step within a 7-tick window');
});

test('pool + dither: smooth falloff, stepped levels, night cloud level thin', () => {
  assert.equal(pool(64, 64), 0); assert.equal(pool(0, 64), 1); assert.ok(pool(16, 64) > pool(48, 64));
  for (const v of [0, 0.3, 0.5, 1]) for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const d = ditherLevel(v, x, y); assert.ok(Number.isInteger(d) && d >= 0 && d <= LEVELS);
  }
  assert.equal(ditherLevel(0, 1, 1), 0); assert.equal(ditherLevel(1, 2, 3), LEVELS);
  assert.ok(NIGHT_CLOUD_LEVEL > 0 && NIGHT_CLOUD_LEVEL < 0.5);
});

test('wiring: main.js gates on alpha, renderer draws windows + lights, alpha patch anchors untouched', () => {
  const main = fs.readFileSync(path.join(ROOT, 'src/main.js'), 'utf8');
  assert.match(main, /const ALPHA = typeof ALPHA_QUERY !== 'undefined'/);
  assert.match(main, /resolveNightFx\(\{[^}]*alpha: ALPHA/);
  assert.match(main, /const q = new URLSearchParams\(location\.search\);/);
  const r = fs.readFileSync(path.join(ROOT, 'src/overworld/renderer.js'), 'utf8');
  assert.match(r, /nightfx\?\.drawWindows/); assert.match(r, /nightfx\?\.drawLights/);
});

// v1.1 (Oct 23, 2026): every switch alone, flicker + duskmoon switches, dusk blend palette-true, wired into npm test
test('switches v1.1: each effect toggles alone; ?flicker / ?duskmoon; alpha ignores them all', async () => {
  const { moonGrade } = await import('../src/overworld/nightfx.js');
  for (const [k, qk] of [['moonlight', 'moonlight'], ['nightLights', 'nightlights'], ['clouds', 'clouds']]) {
    const only = resolveNightFx({ config: ALL_ON, query: `?nightfx=0&${qk}=1` });
    for (const j of NIGHTFX_KEYS) assert.equal(only[j], j === k, `${qk} alone: ${j}`);
    const without = resolveNightFx({ config: ALL_ON, query: `?${qk}=0` });
    for (const j of NIGHTFX_KEYS) assert.equal(without[j], j !== k, `${qk}=0: ${j}`);
  }
  assert.equal(resolveNightFx({ config: ALL_ON }).duskMoon, false, 'dusk keeps WD dusk by default');
  assert.equal(resolveNightFx({ config: ALL_ON, query: '?duskmoon=1' }).duskMoon, true);
  assert.equal(resolveNightFx({ config: ALL_ON, profile: { flicker: true }, query: '?flicker=0' }).flicker, false);
  const a = resolveNightFx({ config: ALL_ON, query: '?nightfx=1&duskmoon=1&flicker=1', alpha: true });
  assert.equal(anyOn(a), false);
  // opt-in dusk blend lands on the 64-colour palette (map + LUT)
  const pal = new Set(PAL), base = { name: 'dusk', map: new Map(PAL.map((c) => [c, c])) };
  const g = moonGrade(base, PAL, 'dusk');
  for (const v of g.map.values()) assert.ok(pal.has(v), v.toString(16));
  for (let i = 0; i < g.lut.length; i += 4) assert.ok(pal.has((g.lut[i] << 16) | (g.lut[i + 1] << 8) | g.lut[i + 2]));
});

test('npm test runs this file', () => {
  assert.match(readJson(path.join(ROOT, 'package.json')).scripts.test, /tests\/nightfx\.test\.mjs/);
});

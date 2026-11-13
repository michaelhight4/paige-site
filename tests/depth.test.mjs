// Depth pass (Oct 22, 2026): depth.json + the pure helpers of src/overworld/depth.js, on the real maps. node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GameMap } from '../src/overworld/map.js';
import { indexTileset } from '../src/overworld/tileset.js';
import { CONFIG } from '../src/config.js';
import {
  normalizeDepth, profileFor, isCaster, isWallTile, findObjects, shapeCells, ditherOn, objectFoot, shadowBox,
  wallBaseCells, mapSignature, occupancyRects, tweakFor, DEFAULT_SHADOW_RGB,
} from '../src/overworld/depth.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KIT = path.join(ROOT, 'art/world/overworld');
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const RAW = readJson(path.join(ROOT, 'src/overworld/depth.json'));
const CFG = normalizeDepth(RAW);
const TS = indexTileset(readJson(path.join(KIT, 'tileset.json')));
const byName = new Map(TS.meta.tiles.map((t) => [t.name, t]));
const loadMap = (n) => new GameMap(readJson(path.join(KIT, 'maps', n + '.json'))).attachTileset(TS.byId);
const INDOOR = ['heal_brookhollow', 'lab_brookhollow', 'home_brookhollow_b', 'rt_branch_backroom'];

test('depth.json: enabled, debug key, indoor + outdoor profiles with valid patterns; config points at it', () => {
  assert.equal(CONFIG.depth, 'src/overworld/depth.json');
  assert.equal(CFG.enabled, true);
  assert.match(CFG.debugKey, /^Key[A-Z]$/);
  for (const k of ['indoor', 'outdoor']) {
    const p = CFG[k];
    assert.ok(p.shadows && p.alpha > 0 && p.alpha < 160, k + ' alpha is soft');
    assert.ok(p.offset[0] >= 0 && p.offset[1] >= 0, k + ' shadow falls down-right (light from the top-left)');
    assert.ok(p.actors.enabled && p.actors.w % 2 === 0 && p.actors.h % 2 === 0, k + ' actor shadow on the 2 px grid');
    assert.ok(p._cast.length && p._skip.length);
  }
  assert.equal(CFG.indoor.wall_base.enabled, true);
  assert.equal(CFG.outdoor.wall_base.enabled, false);
  assert.equal(DEFAULT_SHADOW_RGB.join(), '26,18,38');
});

test('profiles: interiors and caves use indoor (clock.js INDOOR_OR_CAVE), towns and routes outdoor', () => {
  for (const n of INDOOR) assert.equal(profileFor(CFG, n), CFG.indoor, n);
  for (const n of ['brookhollow', 'route1']) assert.equal(profileFor(CFG, n), CFG.outdoor, n);
});

test('casters: solid furniture and outdoor trees/houses/signs/lamps cast; rugs, mats, walkables and walls do not', () => {
  const I = CFG.indoor, O = CFG.outdoor;
  for (const n of ['tree_base', 'treed_base', 'sign', 'lamp', 'house_a_3_0']) if (byName.has(n)) assert.ok(isCaster(byName.get(n), O), n);
  assert.ok(!isCaster(byName.get('tree_top'), O), 'canopy overlay is not a caster');
  for (const t of TS.meta.tiles) {
    if (/rug|_mat|mat_|decal/.test(t.name)) { assert.ok(!isCaster(t, I) && !isCaster(t, O), t.name); }
    if (t.collision === 'walk') assert.ok(!isCaster(t, I) && !isCaster(t, O), t.name + ' is walkable');
    if (/^i_wall_/.test(t.name)) { assert.ok(!isCaster(t, I), t.name); assert.ok(isWallTile(t, I), t.name); }
  }
  const sofa = TS.meta.tiles.find((t) => /^i_sofa/.test(t.name) && t.collision === 'block');
  if (sofa) assert.ok(isCaster(sofa, I), sofa.name);
  assert.equal(tweakFor('tree_base', O).pad, 10);
  assert.equal(tweakFor('bush', O).pad, O.pad);
});

test('objects: multi-tile furniture groups into one object; every test interior has casters and wall base', () => {
  for (const n of INDOOR) {
    const m = loadMap(n), objs = findObjects(m, TS.byId, CFG.indoor);
    assert.ok(objs.length > 0, n + ' has casters');
    const cells = objs.reduce((s, o) => s + o.cells.length, 0);
    assert.ok(cells >= objs.length);
    for (const o of objs) {
      assert.ok(!/rug|_mat|mat_/.test(o.name), n + ' ' + o.name);
      const ys = o.cells.map((c) => c[1]), xs = o.cells.map((c) => c[0]);
      assert.ok(Math.max(...xs) - Math.min(...xs) < 8 && Math.max(...ys) - Math.min(...ys) < 6, n + ' ' + o.name + ' is one compact object');
    }
    const w = wallBaseCells(m, TS.byId, CFG.indoor);
    assert.ok(w.some((c) => c.top), n + ' has floor under walls');
    for (const c of w) {
      assert.ok(!isWallTile(TS.byId.get(m.tile('ground', c.x, c.y)), CFG.indoor), 'wall base sits on floor');
      if (c.top) assert.ok(isWallTile(TS.byId.get(m.tile('ground', c.x, c.y - 1)), CFG.indoor), 'top strip is directly under a wall');
      if (c.cornerL || c.cornerR) assert.ok(c.top);
    }
    assert.ok(w.some((c) => c.cornerL || c.cornerR), n + ' has an inner corner');
  }
  const town = loadMap('brookhollow'), objs = findObjects(town, TS.byId, CFG.outdoor);
  assert.deepEqual(wallBaseCells(town, TS.byId, CFG.outdoor), []);
  const trees = objs.filter((o) => o.name === 'tree_base');
  assert.ok(trees.length > 10 && trees.every((o) => o.cells.length === 1), 'one shadow per tree');
  const houses = objs.filter((o) => /^house_/.test(o.name));
  assert.ok(houses.length >= 1 && houses.every((o) => o.cells.length > 4), 'a house is one object');
});

test('shapes: pixel-crisp ovals/rects on the 2 px grid with a dithered rim, symmetric, inside their box', () => {
  for (const [w, h, shape] of [[17, 5, 'oval'], [15, 4, 'oval'], [60, 6, 'rect'], [4, 3, 'oval']]) {
    const { core, rim } = shapeCells(w, h, 1, shape);
    assert.ok(core.length > 0 || rim.length > 0);
    const cells = new Set(rim.map(([y, x]) => `${x},${y}`));
    for (const [y, a, b] of core) for (let x = a; x <= b; x++) { assert.ok(!cells.has(`${x},${y}`), 'core and rim are disjoint'); cells.add(`${x},${y}`); }
    for (const c of cells) { const [x, y] = c.split(',').map(Number); assert.ok(x >= 0 && x < w && y >= 0 && y < h); assert.ok(cells.has(`${w - 1 - x},${y}`), 'mirror symmetric'); }
    if (shape === 'rect') assert.ok(!cells.has('0,0') && !cells.has(`${w - 1},${h - 1}`), 'rect corners trimmed');
  }
  const flat = shapeCells(10, 4, 0, 'oval');
  assert.equal(flat.rim.length, 0, 'rim 0 = flat alpha');
  assert.ok(ditherOn(0, 0) && ditherOn(1, 1) && !ditherOn(2, 0) && ditherOn(2, 2), '2 px checker');
});

test('shadow box: under the object foot, nudged down-right, even-aligned; wide things get a rect', () => {
  const col = new Int16Array(64).fill(-1); for (let c = 20; c < 44; c++) col[c] = 60;
  const t = { id: 1 }, foot = objectFoot([[3, 2, t]], () => col, 8);
  assert.deepEqual(foot, { base: 2 * 64 + 60, x0: 3 * 64 + 20, x1: 3 * 64 + 43 });
  const p = { ...CFG.indoor }, b = shadowBox(foot, p);
  for (const k of ['x', 'y', 'w', 'h']) assert.equal(b[k] % 2, 0, k + ' even');
  assert.ok(b.x + b.w / 2 > (foot.x0 + foot.x1 + 1) / 2, 'shifted right');
  assert.ok(b.y + b.h / 2 > foot.base - 1, 'centred at or below the base line');
  assert.ok(b.y < foot.base && b.y + b.h > foot.base, 'straddles the contact line');
  assert.equal(b.shape, 'oval');
  assert.equal(shadowBox({ base: 60, x0: 0, x1: 191 }, p).shape, 'rect');
  assert.equal(objectFoot([[0, 0, t]], () => null, 8), null);
});

test('static layer bookkeeping: blit rects never overlap and cover every occupied block; signature tracks tile swaps', () => {
  const cw = 9, ch = 7, occ = new Uint8Array(cw * ch);
  [[1, 1], [2, 1], [1, 2], [2, 2], [5, 0], [5, 1], [6, 1], [8, 6], [0, 6]].forEach(([x, y]) => { occ[y * cw + x] = 1; });
  const rects = occupancyRects(occ, cw, ch, 16, 140, 100), hit = new Uint8Array(cw * ch);
  for (const [x0, y0, x1, y1] of rects) for (let y = y0; y < y1; y += 16) for (let x = x0; x < x1; x += 16) {
    const i = (y / 16) * cw + x / 16; assert.equal(hit[i], 0, 'no overlap'); assert.equal(occ[i], 1, 'only occupied'); hit[i] = 1;
  }
  assert.deepEqual([...hit], [...occ]);
  assert.ok(rects.every((r) => r[2] <= 140 && r[3] <= 100), 'clipped to the map');
  const m = loadMap('lab_brookhollow'), s0 = mapSignature(m, ['ground', 'decoration']);
  assert.equal(mapSignature(m, ['ground', 'decoration']), s0);
  const old = m.layers.decoration[3][3]; m.layers.decoration[3][3] = old + 1;
  assert.notEqual(mapSignature(m, ['ground', 'decoration']), s0);
  m.layers.decoration[3][3] = old;
});

test('wiring: renderer draws the pass after ground/decoration and before characters; ?depth and the key toggle it', () => {
  const r = fs.readFileSync(path.join(ROOT, 'src/overworld/renderer.js'), 'utf8');
  const iDeco = r.indexOf("for (const layer of ['ground', 'decoration'])"), iStatic = r.indexOf('v.depth?.drawStatic(ctx, v)');
  const iActors = r.indexOf('v.depth?.drawActors(ctx, v, v.actors)'), iSort = r.indexOf('const actors = [...v.actors].sort');
  assert.ok(iDeco > 0 && iStatic > iDeco && iActors > iStatic && iSort > iActors, 'order: ground/decoration -> static -> actor shadows -> characters');
  const main = fs.readFileSync(path.join(ROOT, 'src/main.js'), 'utf8');
  assert.match(main, /depth: q\.has\('depth'\)/);
  assert.match(main, /scene\.depth\.key/);
  const d = fs.readFileSync(path.join(ROOT, 'src/overworld/depth.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''); // code only
  assert.match(d, /shadowDst/, 'colour comes from the grade');
  assert.doesNotMatch(d, /EMISSIVE|emissive|litLut|INDOOR_OR_CAVE/, 'no night-glow or indoor-rule changes');
});

// ---- depth pass v2 (Oct 22, 2026): club_int / club_front casters, stripped-shadow coverage, strength options ----
test('club furniture casts indoors (counter/booth merged); club walls get wall-base; club_front is a building outdoors', () => {
  const m = loadMap('club_int'), prof = profileFor(CFG, 'club_int');
  assert.equal(prof, CFG.indoor, 'club_int stays an indoor depth profile');
  for (const n of ['club_counter_case', 'club_counter_fruit', 'club_stool', 'club_booth_l', 'club_booth_table', 'club_speaker', 'club_dj_desk', 'club_paint_counter'])
    assert.ok(isCaster(byName.get(n), prof), n);
  for (const n of ['club_dance_a', 'club_stage_back', 'club_note_slot', 'club_poster_names', 'club_banner_0', 'club_door_frame_b'])
    assert.equal(isCaster(byName.get(n), prof), false, n + ' (floor / wall-mounted) casts nothing');
  assert.ok(isWallTile(byName.get('club_wall_face'), prof) && isWallTile(byName.get('club_wall_upper'), prof));
  const objs = findObjects(m, TS.byId, prof);
  const counter = objs.filter((o) => /^club_counter_/.test(o.name));
  assert.equal(counter.length, 1, 'the 5-cell juice counter is one object');
  assert.equal(counter[0].cells.length, 5);
  assert.ok(wallBaseCells(m, TS.byId, prof).length > 0, 'club walls shade the floor under them');
  const out = CFG.outdoor;
  assert.ok(isCaster(byName.get('club_front_0_0'), out) && isCaster(byName.get('club_front_1_2'), out));
  assert.equal(isCaster(byName.get('club_front_1_1'), out), false, 'the club door is not solid');
  assert.equal(tweakFor('club_front_1_0', out).pad, 0, 'club front uses the building tweak');
  const f = findObjects(loadMap('fernwick'), TS.byId, out).filter((o) => /^club_front/.test(o.name));
  assert.equal(f.length, 1, 'the club front is one 3x2 object');
});

test('stripped baked shadows: handcar casts indoors; x_reeds (kept its baked shadow) does not cast (no double shadow)', () => {
  assert.ok(isCaster(byName.get('handcar_locked'), CFG.indoor), 'station_int handcar (1193) lost its baked shadow');
  assert.ok(isCaster(byName.get('handcar_new_padlock'), CFG.indoor));
  assert.equal(isCaster(byName.get('x_reeds'), CFG.outdoor), false);
  for (const n of ['camp_cold', 'camp_restored']) assert.ok(isCaster(byName.get(n), CFG.outdoor), n + ' (new thornwood camp, no baked shadow)');
});

test('shadow strength options: medium = the file values; light/strong scale every alpha; ?depthstrength overrides', () => {
  assert.deepEqual(Object.keys(RAW.depth.strengths), ['light', 'medium', 'strong']);
  assert.equal(RAW.depth.strengths.medium, 1);
  assert.equal(CFG.strength, RAW.depth.strength);
  const med = normalizeDepth(RAW, 'medium'), lo = normalizeDepth(RAW, 'light'), hi = normalizeDepth(RAW, 'strong');
  assert.equal(med.indoor.alpha, RAW.depth.indoor.alpha);
  assert.equal(med.outdoor.actors.alpha, RAW.depth.outdoor.actors.alpha);
  for (const k of ['indoor', 'outdoor']) {
    assert.ok(lo[k].alpha < med[k].alpha && med[k].alpha < hi[k].alpha, k);
    assert.ok(lo[k].actors.alpha < hi[k].actors.alpha, k + ' actors');
    assert.ok(hi[k].alpha <= 255);
  }
  assert.ok(lo.indoor.wall_base.corner_alpha < hi.indoor.wall_base.corner_alpha);
  assert.equal(normalizeDepth(RAW, 'nonsense').strength, RAW.depth.strength, 'unknown name -> file setting');
});

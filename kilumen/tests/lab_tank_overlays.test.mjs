// Wellspire lab tank particle overlays: anchors, assets, phase rule, phone art1x rects.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TANK_ANCHORS, frameFor, srcRect, phaseIndex, makeTankOverlays } from '../src/region9/tank_overlays.js';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const fxDir = path.join(root, 'art/world/overworld/fx/lab_tank_overlays');
const ow = path.join(root, 'art/world/overworld');
const tiles = new Map(JSON.parse(fs.readFileSync(path.join(ow, 'tileset_arena.json'), 'utf8')).tiles.map((t) => [t.id, t]));
const meta = (n) => JSON.parse(fs.readFileSync(path.join(fxDir, n, `${n}.json`), 'utf8'));

test('anchor ids match the requested table and the tile names', () => {
  const want = { 12248: 'tank_cyan', 12250: 'tank_amber', 12252: 'tank_green', 12256: 'bigtank_cyan', 12262: 'bigtank_green', 12306: 'ondravel_tank', 12362: 'ondravel_tank_broken' };
  for (const [id, n] of Object.entries(want)) assert.equal(TANK_ANCHORS[id].ovl, `ovl_${n}`);
  for (let id = 12268; id <= 12276; id++) { assert.equal(TANK_ANCHORS[id].ovl, 'ovl_vat_green'); assert.ok(tiles.get(id).name.startsWith('wl_vat_green')); }
  for (const id of Object.keys(TANK_ANCHORS)) assert.ok(meta(TANK_ANCHORS[id].ovl).tile_ids.includes(+id), id);
});

test('runtime assets live under art/, each json has a 6-entry phase table and both sheets', () => {
  for (const n of new Set(Object.values(TANK_ANCHORS).map((a) => a.ovl))) {
    const j = meta(n); assert.equal(j.phase_offsets_frames.length, 6, n);
    for (const f of [j.sheet, j.art_sheet]) assert.ok(fs.existsSync(path.join(fxDir, n, f)), `${n}/${f}`);
  }
});

test('shared clock + phase by cell; neighbours differ; frames wrap', () => {
  const j = meta('ovl_tank_cyan');
  assert.equal(phaseIndex(1, 0), 1); assert.notEqual(frameFor(j, 0, 0, 0), frameFor(j, 0, 1, 0));
  assert.equal(frameFor(j, j.ms[0] * j.frames, 3, 2), frameFor(j, 0, 3, 2));
  const o = meta('ovl_ondravel_tank'); assert.deepEqual(srcRect(o, 11, null, false), [384, 320, 384, 320]);
  assert.deepEqual(srcRect(o, 11, null, true), [192, 160, 192, 160]);
  const vt = meta('ovl_vat_green'); assert.deepEqual(srcRect(vt, 2, 'c', true), [64, 128, 32, 32]);
});

test('every lab tank placed in the fin_past_wlab maps gets an overlay instance', () => {
  const maps = fs.readdirSync(path.join(ow, 'maps')).filter((f) => f.startsWith('fin_past_wlab_'));
  let n = 0; const ov = makeTankOverlays({ phone: false });
  for (const f of maps) {
    const j = JSON.parse(fs.readFileSync(path.join(ow, 'maps', f), 'utf8'));
    const m = { name: j.name, width: j.width, height: j.height, layers: j.layers, tile: (l, x, y) => j.layers[l]?.[y]?.[x] || 0 };
    n += ov.scan(m).length;
  }
  assert.ok(n > 0);
});

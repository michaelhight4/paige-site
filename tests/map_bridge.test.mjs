// Kilumen: LDtk map bridge (Oct 22, 2026). tools/map_bridge/ exports World Design's maps to an LDtk 1.5.3 project and
// imports edited projects back to build/maps_from_editor/ (never into art/world/overworld/).
// Needs python3 + Pillow. Run: node --test tests/map_bridge.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLI = path.join(ROOT, 'tools/map_bridge/map_bridge.py');
const MAPS = path.join(ROOT, 'art/world/overworld/maps');
const bridge = (...args) => spawnSync('python3', [CLI, ...args], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kil_map_bridge_test_'));
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

test('round-trip: every World Design map exports to LDtk and imports back byte-identical', () => {
  const r = bridge('roundtrip', '--all');
  const n = fs.readdirSync(MAPS).filter((f) => f.endsWith('.json')).length;
  // live alpha ships minified map JSON, so there a semantic match is the bar; the dev tree must stay byte-identical
  const alpha = fs.existsSync(path.join(ROOT, 'src/alpha.js'));
  if (alpha) assert.doesNotMatch(r.stdout, /FAIL [^:]+: (?!semantic match, bytes differ)/);
  else { assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, new RegExp(`round-trip: ${n}/${n} byte-identical`)); }
});

test('exported Brookhollow project is valid against the LDtk 1.5.3 JSON schema and has the expected shape', () => {
  const out = path.join(tmp, 'bh.ldtk');
  let r = bridge('export', 'brookhollow', '--with-interiors', '--out', out);
  assert.equal(r.status, 0, r.stderr);
  r = bridge('validate', out);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const p = readJson(out);
  assert.equal(p.jsonVersion, '1.5.3');
  assert.equal(p.defaultGridSize, 64);
  assert.deepEqual(p.defs.layers.map((l) => l.identifier), ['Entities', 'Collision', 'Encounter', 'Fog', 'Overlay', 'Decoration', 'Ground']);
  const names = p.levels.map((l) => l.identifier);
  for (const n of ['brookhollow', 'house_1f', 'house_2f', 'lab_brookhollow', 'shop_int']) assert.ok(names.includes(n), n);
  const bh = p.levels.find((l) => l.identifier === 'brookhollow');
  const src = readJson(path.join(MAPS, 'brookhollow.json'));
  assert.equal(bh.pxWid, src.width * 64);
  const ents = bh.layerInstances.find((l) => l.__identifier === 'Entities').entityInstances;
  assert.equal(ents.filter((e) => e.__identifier === 'Warp').length, src.warps.length);
  assert.equal(ents.filter((e) => e.__identifier === 'Npc').length, (src.npcs || []).length + (src.npcs_pending_text || []).length);
});

test('edits made in the LDtk file come back exactly: move an NPC, paint a ground tile, change a collision cell', () => {
  const out = path.join(tmp, 'edit.ldtk');
  assert.equal(bridge('export', 'brookhollow', '--out', out).status, 0);
  const p = readJson(out);
  const src = readJson(path.join(MAPS, 'brookhollow.json'));
  const ts = readJson(path.join(ROOT, 'art/world/overworld/tileset.json'));
  const lv = p.levels[0];
  const L = (id) => lv.layerInstances.find((l) => l.__identifier === id);
  const expect = structuredClone(src);
  // 1) move the first NPC one cell sideways (LDtk stores px and __grid)
  const npc = L('Entities').entityInstances.find((e) => e.__identifier === 'Npc');
  const dx = npc.__grid[0] + 1 < src.width ? 1 : -1;
  npc.px[0] += 64 * dx; npc.__grid[0] += dx; npc.__worldX += 64 * dx;
  const moved = expect.npcs.find((o) => o.x === npc.__grid[0] - dx && o.y === npc.__grid[1]);
  assert.ok(moved, 'npc found in source');
  moved.x += dx;
  // 2) repaint one ground cell with a different named tile (atlas slot -> name via tileset customData)
  const slotName = new Map(p.defs.tilesets[0].customData.map((c) => [c.tileId, c.data]));
  const nameSlot = new Map([...slotName].map(([k, v]) => [v, k]));
  const gt = L('Ground').gridTiles[0];
  const cx = gt.px[0] / 64, cy = gt.px[1] / 64;
  const newTile = ts.tiles.find((t) => t.name !== slotName.get(gt.t) && nameSlot.has(t.name));
  gt.t = nameSlot.get(newTile.name);
  gt.src = [(gt.t % 64) * 64, Math.floor(gt.t / 64) * 64];
  expect.layers.ground[cy][cx] = newTile.id;
  // 3) block a walkable collision cell
  const col = L('Collision');
  const idx = col.intGridCsv.findIndex((v, i) => v === 0 && !src.warps.some((w) => w.x === i % src.width && w.y === Math.floor(i / src.width)));
  col.intGridCsv[idx] = 1;
  expect.layers.collision[Math.floor(idx / src.width)][idx % src.width] = 1;
  fs.writeFileSync(out, JSON.stringify(p));
  const dir = path.join(tmp, 'imported');
  const r = bridge('import', out, '--out', dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.deepEqual(readJson(path.join(dir, 'brookhollow.json')), expect);
  const d = bridge('diff', path.join(dir, 'brookhollow.json'));
  assert.equal(d.status, 0, d.stderr);
  assert.match(d.stdout, /collision/);
  assert.match(d.stdout, /ground/);
});

test('import refuses an entity placed in LDtk with its required fields left empty, and writes nothing', () => {
  const out = path.join(tmp, 'blank.ldtk');
  assert.equal(bridge('export', 'brookhollow', '--out', out).status, 0);
  const p = readJson(out);
  const ents = p.levels[0].layerInstances.find((l) => l.__identifier === 'Entities').entityInstances;
  const w = structuredClone(ents.find((e) => e.__identifier === 'Warp'));
  w.iid = '00000000-0000-4000-8000-000000000001';
  for (const f of w.fieldInstances) { f.__value = null; f.realEditorValues = []; }
  ents.push(w);
  fs.writeFileSync(out, JSON.stringify(p));
  const dir = path.join(tmp, 'blank_out');
  const r = bridge('import', out, '--out', dir);
  assert.notEqual(r.status, 0);
  assert.match(r.stdout + r.stderr, /missing to, tx, ty/);
  assert.equal(fs.existsSync(dir), false);
});

test('the bridge refuses to write into World Design\'s folder', () => {
  const out = path.join(tmp, 'safe.ldtk');
  assert.equal(bridge('export', 'brookhollow', '--out', out).status, 0);
  const target = path.join(ROOT, 'art/world/overworld/maps_from_editor_TEST');
  const r = bridge('import', out, '--out', target);
  assert.notEqual(r.status, 0);
  assert.match(r.stdout + r.stderr, /refusing to write inside World Design/);
  assert.equal(fs.existsSync(target), false);
  const r2 = bridge('export', 'brookhollow', '--out', path.join(ROOT, 'art/world/overworld/x.ldtk'));
  assert.notEqual(r2.status, 0);
  assert.equal(fs.existsSync(path.join(ROOT, 'art/world/overworld/x.ldtk')), false);
});

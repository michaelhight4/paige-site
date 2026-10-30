// integ9 playtest fixes on ead15744 (Coder, Oct 30 2026): clerk sprites, area banner '[object Object]', revival_heights
// road check, Gullhaven Tideglide water warp to gullhaven_sea, dev grantMerit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { spriteFor } from '../src/overworld/npcs.js';
import { Overworld } from '../src/overworld/overworld.js';
import { withPass2Fallback, addPass2Text, PASS2_FILE, PASS2_TEXT_FILES } from '../src/region9/textbot.js';
import { grantMerit, meritState } from '../src/sports/merit.js';

const R = (p) => new URL('../' + p, import.meta.url);
const J = (p) => JSON.parse(readFileSync(R(p), 'utf8'));
const DIR = 'art/world/overworld/maps/';
const NAMES = readdirSync(R(DIR)).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5));
const MAP = (n) => J(`${DIR}${n}.json`);
const SM = J('art/characters/pixel/npcs/npc_sprite_map.json').map;

test('every clerk NPC on every map resolves a sprite (shop_cairnfold, shop_lanternport, Merit Counter)', () => {
  let n = 0;
  for (const name of NAMES) for (const d of MAP(name).npcs || [])
    if (d.kind === 'clerk' || d.variant_of === 'clerk' || /clerk/.test(d.id)) { n++; assert.ok(spriteFor(SM, name, d), `${name}.${d.id}`); }
  assert.ok(n > 3);
});

test('area banner text is a plain string on every map (no [object Object])', () => {
  const fb = { maps: {} }, fin = { maps: {} };
  if (existsSync(R(PASS2_FILE))) fb.maps = J(PASS2_FILE).maps || {};
  for (const f of PASS2_TEXT_FILES) if (existsSync(R(f))) addPass2Text(J(f), fin);
  const lines = withPass2Fallback(J('text/overworld_lines.json'), fb, fin);
  const self = { lines, fill: (p) => p };
  for (const name of NAMES) {
    const t = Overworld.prototype.text.call(self, `maps.${name}.area_name`) || Overworld.prototype.text.call(self, `system_area_names.${name}`);
    if (t != null) { assert.equal(typeof t, 'string'); assert.ok(!t.includes('[object'), name); }
  }
  assert.ok(!String(Overworld.prototype.text.call(self, 'maps.aurelith_cave_e.area_name')).includes('[object'));
});

test('revival_heights: no road tile is blocked without visible decoration/overlay', () => {
  const L = MAP('revival_heights').layers;
  for (let y = 0; y < L.collision.length; y++) for (let x = 0; x < L.collision[y].length; x++)
    if (L.ground[y][x] > 10000 && L.collision[y][x] === 1) assert.ok(L.decoration?.[y]?.[x] || L.overlay?.[y]?.[x], `hidden blocker ${x},${y}`);
});

test('Tideglide water warps: gullhaven <-> gullhaven_sea sit on water and land on water', () => {
  for (const name of ['gullhaven', 'gullhaven_sea']) {
    const m = MAP(name), ws = (m.warps || []).filter((w) => w.water);
    assert.ok(ws.length >= 2, name);
    for (const w of ws) {
      assert.equal(m.layers.collision[w.y][w.x], 3, `${name} ${w.x},${w.y} on water`);
      assert.equal(MAP(w.to).layers.collision[w.ty][w.tx], 3, `${w.to} ${w.tx},${w.ty} lands on water`);
    }
  }
  assert.ok(MAP('gullhaven').warps.some((w) => w.water && w.to === 'gullhaven_sea'));
});

test('grantMerit adds points (dev helper)', () => {
  const s = {}; const before = meritState(s).points;
  const total = grantMerit(s, 250);
  assert.equal(total, before + 250); assert.equal(meritState(s).points, total);
});

test('Merit Counter clerk: Text Bot greeting (2 pages) is wired into overworld_lines and said before the shop', () => {
  const pages = J('text/overworld_lines.json').maps.aurelith_stadium_int.aurelith_merit_clerk.pages;
  assert.deepEqual(pages, J('data/textbot_merit_clerk.json').maps.aurelith_stadium_int.aurelith_merit_clerk.pages);
  assert.equal(pages.length, 2);
  assert.match(readFileSync(R('src/sports/town_ui.js'), 'utf8'), /\[MERIT_CLERK\]\?\.pages; if \(hi\?\.length\) await scene\.say/);
});

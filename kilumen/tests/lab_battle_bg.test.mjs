// Lab battle backdrop (Oct 30 2026): flashback lab tech battles (fin_past_wlab_*) and lab interiors use the pixel 'lab' biome.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import { biomeFor, isLabMap } from '../src/battle/encounters.js';
import { PLATFORM_BIOMES } from '../src/battle/data/platforms.js';
const root = new URL('../', import.meta.url);
test('every flashback lab map battles on the lab backdrop', () => {
  for (let i = 1; i <= 10; i++) { const n = String(i).padStart(2, '0'); assert.equal(biomeFor('', `fin_past_wlab_${n}`), 'lab'); assert.equal(biomeFor('', `fin_past_wlab_${n}_x`), 'lab'); }
  assert.equal(biomeFor('', 'fin_past_wlab_01_entry'), 'lab'); assert.equal(biomeFor('', 'fin_past_wlab_09_observation'), 'lab');
  assert.equal(biomeFor('', 'fin_lab_core'), 'lab'); assert.equal(biomeFor('', 'lab_brookhollow'), 'lab');
});
test('painted region 5-6 labs and non-lab maps are unchanged', () => {
  assert.equal(biomeFor('', 'lab_mirefen_sunken'), 'lab_mirefen'); assert.equal(biomeFor('', 'lab_tidewater_cave'), 'lab_seacave');
  assert.equal(biomeFor('grass', 'route1'), 'grass'); assert.equal(biomeFor('', 'fin_past_town'), 'grass'); assert.equal(isLabMap('slab_road'), false);
});
test('lab biome art is on disk in the painted-biome format', () => {
  const e = PLATFORM_BIOMES.lab; assert.ok(e.art && e.spots.near && e.spots.far);
  for (const p of ['dawn', 'day', 'dusk', 'night']) for (const f of [e.bgFor(p), e.life(p)]) assert.ok(fs.existsSync(new URL(f, root)), f);
  const idx = JSON.parse(fs.readFileSync(new URL('art/world/battle_biomes/lab/index.json', root)));
  assert.deepEqual(idx.spots_frac, e.spots);
});

test('HUD zoom keeps the lab monitors band on screen', async () => {
  const { solveBattleLayout } = await import('../src/battle/hud_layout.js');
  const { PLATFORM_BIOMES } = await import('../src/battle/data/platforms.js');
  const lab = PLATFORM_BIOMES.lab, sp = { w: 256, h: 256, feet: 0.94, box: [0.1, 0.1, 0.9, 0.94] };
  for (const view of [{ w: 1280, h: 800 }, { w: 844, h: 390 }]) {
    const obstacles = [{ l: 0, t: view.h * 0.58, r: view.w, b: view.h }];
    const sol = solveBattleLayout({ view, obstacles, sprites: { near: sp, far: sp }, art: { spots: lab.spots, keep: lab.keep } });
    assert.ok(sol.bg.y + lab.keep[0] * sol.bg.h >= -1 && sol.bg.y + lab.keep[1] * sol.bg.h <= view.h + 1, JSON.stringify(sol.bg));
  }
});

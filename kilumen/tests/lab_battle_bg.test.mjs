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

// measured battle HUD (Intake Clerk Mavis, Oct 30 2026): PC 1280x800 and phone 844x390
const LAB_HUD = [{"view":{"w":1280,"h":800},"obstacles":[{"l":834.4,"t":437.5,"r":1203.2,"b":554.6},{"l":76.8,"t":40,"r":445.6,"b":125.5},{"l":1156.2,"t":418.5,"r":1185.2,"b":443.5},{"l":94.8,"t":119.5,"r":256.1,"b":144.5},{"l":76.8,"t":576,"r":1203.2,"b":768}],"sprites":{"near":{"w":256,"h":256,"feet":1,"box":[0.1,0.1,0.9,1]},"far":{"w":256,"h":256,"feet":1,"box":[0,0.1,0.9,1]}}}, {"view":{"w":844,"h":390},"obstacles":[{"l":296,"t":205.3,"r":644,"b":258},{"l":10,"t":6,"r":328,"b":45.1},{"l":599,"t":189.3,"r":626,"b":211.3},{"l":28,"t":39.1,"r":162.2,"b":61.1},{"l":10,"t":258,"r":644,"b":384}],"sprites":{"near":{"w":128,"h":128,"feet":1,"box":[0.1,0.1,0.9,1]},"far":{"w":128,"h":128,"feet":1,"box":[0,0.1,0.9,1]}}}];
test('lab: both creatures stand exactly on their painted pads, monitors kept, nothing covers them', async () => {
  const { solveBattleLayout } = await import('../src/battle/hud_layout.js');
  const lab = PLATFORM_BIOMES.lab;
  for (const d of LAB_HUD) {
    const sol = solveBattleLayout({ ...d, art: { spots: lab.spots, keep: lab.keep } });
    assert.ok(sol.ok, 'clear of the HUD at ' + d.view.w);
    for (const k of ['near', 'far']) { const fx = (sol.feet[k][0] - sol.bg.x) / sol.bg.w, fy = (sol.feet[k][1] - sol.bg.y) / sol.bg.h;
      assert.ok(Math.abs(fx - lab.spots[k][0]) < 1e-3 && Math.abs(fy - lab.spots[k][1]) < 1e-3, k + ' on its pad at ' + d.view.w); }
    assert.ok(sol.bg.y + lab.keep[0] * sol.bg.h >= -1 && sol.bg.y + lab.keep[1] * sol.bg.h <= d.view.h + 1);
  }
});

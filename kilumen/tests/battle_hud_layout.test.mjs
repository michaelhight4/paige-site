// Battle HUD layout (Oct 30 2026, Gary: "why is the health bar covering the sprite"): on every battle backdrop, at PC 1280x800 and
// phone landscape 844x390, neither HP card, the party chip, nor the message/command panel may cover either creature (or its pad).
// HUD model = rects measured in a real battle (Playwright, Oct 30 2026) relative to the battle screen; sprites = worst case: a big
// foe (ingotitan-size) whose visible pixels fill the whole image box. ui_sd.js feeds hud_layout.js the same measurements live.
import test from 'node:test'; import assert from 'node:assert/strict';
import { solveBattleLayout, overlaps, spriteRect } from '../src/battle/hud_layout.js';
import { PLATFORM_BIOMES } from '../src/battle/data/platforms.js';
const R = (l, t, r, b) => ({ l, t, r, b });
const PROFILES = {
  pc: { view: { w: 1280, h: 800 }, field: R(77, 40, 1203, 576), sprite: 256, ay: 0.5, grassSprite: 256,
    hud: { allyPlate: R(834, 437, 1203, 555), foePlate: R(77, 40, 446, 126), party: R(1156, 418, 1185, 443), panel: R(77, 576, 1203, 768) } },
  phone: { view: { w: 844, h: 390 }, field: R(10, 6, 644, 258), sprite: 128, ay: 1, grassSprite: 128,
    hud: { allyPlate: R(296, 205, 644, 258), foePlate: R(10, 6, 328, 45), party: R(599, 189, 626, 211), panel: R(10, 258, 644, 384) } },
};
const big = (s) => ({ w: s, h: s, feet: 0.984, box: [0, 0, 1, 0.984] }); // whole box is visible pixels: the worst case
for (const [prof, P] of Object.entries(PROFILES)) for (const [biome, e] of Object.entries(PLATFORM_BIOMES)) {
  test(`${biome} @ ${prof} ${P.view.w}x${P.view.h}: no HUD element covers either creature`, () => {
    const obstacles = Object.values(P.hud), sprites = { near: big(e.art ? P.sprite : P.grassSprite), far: big(e.art ? P.sprite : P.grassSprite) };
    let sol;
    if (e.art) sol = solveBattleLayout({ view: P.view, obstacles, sprites, art: { ax: 0.5, ay: P.ay, spots: e.spots } });
    else { const f = P.field, fw = f.r - f.l, fh = f.b - f.t, s = sprites.near.w; // drawn platforms: the CSS default spots (ui.css .b-foe/.b-ally)
      const feet = prof === 'pc' ? { far: [f.r - 0.09 * fw - s / 2, f.b - 0.325 * fh], near: [f.l + 0.06 * fw + s / 2, f.b - 0.135 * fh] }
        : { far: [f.r - 0.01 * fw - s / 2, f.b - 0.38 * fh], near: [f.l + 0.03 * fw + s / 2, f.b - 32] };
      sol = solveBattleLayout({ view: P.view, obstacles, sprites, feet, below: { near: 8, far: 8 } }); }
    assert.ok(sol.ok, `${biome} ${prof}: solver found no clear layout`);
    for (const k of ['near', 'far']) { const r = sol.rects[k];
      for (const [name, o] of Object.entries(P.hud)) assert.ok(!overlaps(r, o), `${biome} ${prof}: ${name} covers the ${k === 'near' ? 'ally' : 'foe'} (${JSON.stringify(r)})`);
      assert.ok(r.l >= 0 && r.r <= P.view.w && r.t >= 0 && r.b <= P.view.h, `${biome} ${prof}: ${k} off screen`); }
    assert.ok(!overlaps(sol.rects.near, sol.rects.far), `${biome} ${prof}: creatures overlap`);
    if (sol.bg) { const b = sol.bg; assert.ok(b.x <= 0.5 && b.y <= 0.5 && b.x + b.w >= P.view.w - 0.5 && b.y + b.h >= P.view.h - 0.5, `${biome} ${prof}: backdrop no longer covers the screen`);
      assert.ok(sol.zoom <= 1.8 + 1e-9, 'zoom capped'); }
  });
}
test('foe card top-left, ally card right above the command panel (classic layout kept)', () => {
  for (const P of Object.values(PROFILES)) { const h = P.hud; assert.ok(h.foePlate.l < P.view.w / 2 && h.foePlate.t < P.view.h / 4);
    assert.ok(h.allyPlate.r > P.view.w / 2 && h.allyPlate.b <= h.panel.t + 1); }
});
test('spriteRect / overlaps basics', () => {
  const r = spriteRect({ w: 100, h: 100, feet: 1, box: [0.1, 0.2, 0.9, 1] }, 50, 100, 5); assert.deepEqual(r, { l: 10, r: 90, t: 20, b: 105 });
  assert.ok(overlaps(R(0, 0, 10, 10), R(9, 9, 20, 20))); assert.ok(!overlaps(R(0, 0, 10, 10), R(11, 0, 20, 10))); assert.ok(overlaps(R(0, 0, 10, 10), R(11, 0, 20, 10), 2));
});

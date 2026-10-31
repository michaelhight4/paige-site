// Summit v2 (Gary, Oct 30 2026: "a towering figure that splits the clouds", no crystal wall): the summit is an open peak edge
// over a cloud sea; Ondravel towers beyond the edge in open space (summit_peak.js), no small idle sprite, no crystal ring.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeSummitFx } from '../src/region9/summit_fx.js';
const map = JSON.parse(fs.readFileSync(new URL('../art/world/overworld/maps/fin_lab1_now.json', import.meta.url)));
const scene = (flags = []) => ({ map: { name: 'fin_lab1_now', json: map }, flags: new Set(flags) });
const W = map.width, L = map.layers;

test('no crystal wall: no crystal ring / plinth / crystal / violet moss / mystic floor tiles left on the summit', () => {
  const bad = new Set([496, 510, 505, 905, 11960]);
  for (const k of ['ground', 'decoration', 'overlay']) for (const r of L[k]) for (const t of r) assert.ok(!bad.has(t), `${k} has ${t}`);
});

test('north is open: every cell above and around Ondravel is cloud, he stands beyond the edge', () => {
  const o = map.ondravel, dome = map.interact_spots.find((s) => s.id === 'fin_dome'), cloud = new Set(map.peak.cloud);
  assert.ok(o.giant); assert.deepEqual([o.x, o.y + 1], [dome.x, dome.y]);
  for (let y = 0; y <= o.y; y++) for (let x = o.x - 2; x <= o.x + 2; x++) assert.ok(cloud.has(y * W + x), `cell ${x},${y} is not cloud`);
  for (let y = 0; y < 4; y++) for (let x = 0; x < W; x++) assert.equal(L.collision[y][x], 1);
  assert.deepEqual(dome.stand, [12, 5]); assert.equal(L.collision[5][12], 0); // the player stands on the rock edge, looking up
});

test("art: the Animator's ondravel_summit_giant is no longer used by the summit; the giant lives in the View still", () => {
  for (const f of ['src/region9/summit_peak.js', 'src/region9/summit_fx.js', 'src/region9/index.js', 'src/region9/summit_view.js']) {
    const src = fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
    assert.ok(!/ondravel_summit_giant/.test(src), f);
  }
  const vj = JSON.parse(fs.readFileSync(new URL('../art/fx/wellspire/ondravel_view/ondravel_view.json', import.meta.url)));
  assert.deepEqual(vj.crop, [14, 8, 49, 62]); assert.match(vj.sprite, /ondravel_ow_sheet\.png$/);
});
test('summit is locked to the sunset grade in every phase', async () => {
  const { gradeFor } = await import('../src/overworld/clock.js');
  for (const ph of ['dawn', 'day', 'dusk', 'night']) assert.equal(gradeFor('fin_lab1_now', ph, map.tint), 'dusk');
});
test('staging cells: the cave exit and the View stand cell are walkable (the player walks out on their own)', () => {
  const st = map.staging; for (const k of ['cave', 'stop', 'speech']) assert.equal(L.collision[st[k][1]][st[k][0]], 0, k);
  assert.deepEqual(st.stop, st.speech); assert.equal(st.cave[0], st.stop[0]); assert.ok(st.cave[1] > st.stop[1]);
});
test('the small idle sprite no longer draws on the summit; the reveal centre is above the edge', () => {
  const fx = makeSummitFx(scene()); assert.equal(fx.idleNow(), false); assert.equal(fx.giant(), true);
  assert.ok(fx.centre().y < (map.ondravel.y + 1) * 64);
});

// Summit v2 (Gary, Oct 30 2026: "a towering figure that splits the clouds", no crystal wall): the summit is an open peak edge
// over a cloud sea; Ondravel towers beyond the edge in open space (summit_peak.js), no small idle sprite, no crystal ring.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeSummitFx } from '../src/region9/summit_fx.js';
import { giantLayout, GIANT_SRC, GIANT_OVERLAY, GIANT_DRAFT, normMeta, USE_ANIMATOR_GIANT } from '../src/region9/summit_peak.js';
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

test('giant layout: head near the top of PC 1280x800 and phone 844x390, feet lost in the clouds, rising from below', () => {
  for (const [Wp, H, edgeY] of [[1280, 800, 260], [844, 390, 120]]) {
    const g = giantLayout({ W: Wp, H, edgeY, cx: Wp / 2 });
    assert.ok(g.head <= H * 0.06 && g.head >= 0, `head ${g.head}`); assert.ok(g.feet > edgeY); assert.ok(g.h > H * 0.6);
    assert.ok(giantLayout({ W: Wp, H, edgeY, cx: 0, rise: 0.35 }).head > g.head + H * 0.3);
  }
});

test('art: Animator v4 sheets wired (DRAFT), placeholder gone; 4 x 448x704, 450 ms, bottom-centre anchor', () => {
  assert.equal(USE_ANIMATOR_GIANT, true); assert.equal(GIANT_DRAFT, true); assert.equal(GIANT_SRC.length, 1);
  assert.match(GIANT_SRC[0], /guardian\/ondravel_summit_giant\/ondravel_summit_giant_idle$/);
  assert.ok(!fs.existsSync(new URL('../art/fx/wellspire/ondravel_summit_giant_placeholder/', import.meta.url)));
  for (const base of [GIANT_SRC[0], GIANT_OVERLAY]) {
    const j = new URL(`../${base}.json`, import.meta.url); if (!fs.existsSync(j)) continue; // Animator's folder (not ours)
    const n = normMeta(JSON.parse(fs.readFileSync(j))); assert.ok(fs.existsSync(new URL(`../${base}.png`, import.meta.url)));
    assert.equal(n.frame_w, 448); assert.equal(n.frame_h, 704); assert.equal(n.frames, 4); assert.deepEqual(n.ms, [450, 450, 450, 450]);
    assert.deepEqual([n.anchor.x, n.anchor.y], [224, 703]);
  }
});
test('summit is locked to the sunset grade in every phase', async () => {
  const { gradeFor } = await import('../src/overworld/clock.js');
  for (const ph of ['dawn', 'day', 'dusk', 'night']) assert.equal(gradeFor('fin_lab1_now', ph, map.tint), 'dusk');
});
test('staging cells: Animator cave_exit / walk_stop / speech_start mapped onto the real map, all walkable', () => {
  const st = map.staging; for (const k of ['cave', 'stop', 'speech']) assert.equal(L.collision[st[k][1]][st[k][0]], 0, k);
  assert.deepEqual(st.stop, st.speech); assert.equal(st.cave[0], st.stop[0]); assert.ok(st.cave[1] > st.stop[1]);
});
test('the small idle sprite no longer draws on the summit; the reveal centre is above the edge', () => {
  const fx = makeSummitFx(scene()); assert.equal(fx.idleNow(), false); assert.equal(fx.giant(), true);
  assert.ok(fx.centre().y < (map.ondravel.y + 1) * 64);
});

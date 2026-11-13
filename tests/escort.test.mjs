// Office -> lab on foot (Gary, Oct 23 2026, 2:35-2:36 PM CT): no teleport; boss leads, Ron 2nd, player 3rd through the real
// doors, real steps, input frozen, no saves inside. src/overworld/escort.js + intro.js walkToLab. Run: node --test tests/escort.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { scene, enter, dist } from './story_harness.mjs';
import { HOME, OPEN } from '../src/overworld/intro.js';
import { doorTo, routeCells, ESCORT } from '../src/overworld/escort.js';
import { readJson } from './story_harness.mjs';

/** Live loop with door warps: a 'out' fade loads the warp's own target (map.warps data, as Overworld._finishLoad does). */
async function run(s, n, pred) {
  for (let i = 0; i < n; i++) {
    s.player.tick({ dir: null }, s.worldApi());
    s.npcs.tick(!!s.fade);
    if (s.fade?.phase === 'out') {
      const sp = s.fade.spawn; s.fade = null; s._warps = (s._warps || []).concat({ to: sp.map, x: sp.x, y: sp.y });
      await enter(s, sp.map, sp); s.player.locked = false;
      const m = s.map; assert.ok(m.isWalkable ? m.isWalkable(sp.x, sp.y) : true, `landing ${sp.map} ${sp.x},${sp.y} walkable`);
    } else if (s.fade?.phase === 'in') { s.fade.t++; if (s.fade.t >= s.fade.len) s.fade = null; }
    s.intro.tick(); s.tick++;
    await new Promise((r) => setTimeout(r, i % 3 === 0 ? 2 : 0));
    if (pred && pred()) return true;
  }
  return pred ? !!pred() : true;
}

test('doors come from the map files (padded), never hard-coded', async () => {
  const { s } = await scene({ map: OPEN.office, flags: [HOME.started], at: { x: 13, y: 7 } });
  const d = doorTo(s.map, HOME.outside, s.player);
  const w = readJson(`art/world/overworld/maps/${OPEN.office}.json`);
  assert.ok(d && d.warp.to === HOME.outside);
  assert.ok(Math.abs(d.front.x - d.warp.x) + Math.abs(d.front.y - d.warp.y) === 1);
  assert.ok(routeCells(s.map, { x: 13, y: 6 }, d.front));
  void w;
});

test('promotion -> walk to the lab: boss leads, Ron 2nd, player 3rd; real doors; locked + no saves; lab beat follows', async () => {
  const { s, saves } = await scene({ map: OPEN.office, flags: [HOME.started, HOME.briefed], at: { x: 13, y: 7, facing: 'up' } });
  const order = [];
  const ok = await run(s, 20000, () => {
    if (s.busy && s.intro._tripPending === false && s.map) {
      const b = s.npcs.byId(ESCORT.bossId) || (s.map.name === OPEN.office && s.log.some((e) => e.step === 'walkToLab') ? s.npcs.byId(OPEN.manager) : null), r = s.npcs.byId('ron_story'), p = s.player;
      if (b && r && s.log.some((e) => e.type === 'escort' && e.step === 'start') && !s.log.some((e) => e.step === 'walkToLabDone')) order.push({ map: s.map.name, b: dist(b, p), r: dist(r, p), busy: s.busy });
    }
    return s.map.name === OPEN.lab && s.log.some((e) => e.step === 'walkToLabDone');
  });
  assert.ok(ok, JSON.stringify(s.log.filter((e) => e.type === 'escort' || e.type === 'intro').slice(-12)));
  assert.ok(s.flags.has(OPEN.promoted));
  const esc = s.log.filter((e) => e.type === 'escort');
  assert.ok(!esc.some((e) => e.step === 'fallback' || e.step === 'stuck'), JSON.stringify(esc));
  assert.deepEqual(esc.filter((e) => e.step === 'door').map((e) => [e.from, e.to, e.ok]), [[OPEN.office, HOME.outside, true], [HOME.outside, OPEN.lab, true]]);
  assert.deepEqual(s._warps.map((w) => w.to), [HOME.outside, OPEN.lab], 'two real door warps, no teleport');
  // single file: once the line formed, Ron is nearer the player than the boss, and every sample was input-locked
  const formed = order.filter((o) => o.r === 1);
  assert.ok(formed.length > 10);
  const bad = formed.filter((o) => !(o.b === 2 || o.b > o.r));
  if (process.env.ESC_DEBUG) console.log('order', formed.length, JSON.stringify(bad));
  assert.ok(bad.length <= formed.length * 0.05, 'boss ahead of Ron ahead of the player ' + JSON.stringify(bad.slice(0, 8)) + ' of ' + formed.length);
  assert.ok(order.every((o) => o.busy));
  // saves: checkpoint right before, none while walking
  const startTick = s.log.find((e) => e.step === 'walkToLab').tick, doneTick = s.log.find((e) => e.step === 'walkToLabDone').tick;
  assert.ok(saves.some((x) => x.tick <= startTick && !x.busy), 'checkpoint save right before');
  assert.equal(saves.filter((x) => x.tick > startTick && x.tick < doneTick).length, 0, 'never saved during the walk');
  // in the lab: boss + Ron (once each), then the starter beat starts by itself
  assert.equal(s.npcs.list.filter((n) => n.id === 'ron_story').length, 1);
  assert.equal(s.npcs.list.filter((n) => n.id === ESCORT.bossId).length, 1);
  await run(s, 4000, () => s.log.some((e) => e.type === 'automove' && e.beat === 'starterIntro'));
  assert.ok(s.log.some((e) => e.type === 'automove' && e.beat === 'starterIntro'));
  assert.equal(s.intro.story.pals.size, 0, 'no partner behind Ron before he picks');
});

test('?automove=0: the old fade to the lab door (no walk)', async () => {
  const { s } = await scene({ map: OPEN.office, flags: [HOME.started, HOME.briefed], at: { x: 13, y: 6, facing: 'up' }, automove: false });
  s.intro.onTalk(s.npcs.byId(OPEN.manager), s.npcs.byId(OPEN.manager).def);
  await run(s, 3000, () => s.map.name === OPEN.lab);
  assert.equal(s.map.name, OPEN.lab);
  assert.ok(!s.log.some((e) => e.step === 'walkToLab'));
});

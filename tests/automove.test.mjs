// Story auto-walk (Gary Oct 23 2026: "force the players movements into the conversation same as pokemon so they dont get
// lost doing guess work"). src/overworld/automove.js (+ pathing.js / easystar). Run: node --test tests/automove.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { scene, pump, dist } from './story_harness.mjs';
import { HOME, OPEN } from '../src/overworld/intro.js';
import { approach, automoveOn, planPlayerRoute, playerFree, faceTo } from '../src/overworld/automove.js';

test('route: path found to the free cell in front of the NPC; blocked target -> null', async () => {
  const { s } = await scene({ map: OPEN.office, flags: [HOME.started], at: { x: 7, y: 10, facing: 'up' } });
  const mgr = s.npcs.byId('manager');
  const r = planPlayerRoute(s.map, s.player, mgr, { facing: 'down' });
  assert.ok(r && r.dirs.length > 0);
  assert.deepEqual(r.cell, { x: mgr.x, y: mgr.y + 1 }, 'front of the manager');
  assert.equal(planPlayerRoute(s.map, s.player, mgr, { maxSteps: 2 }), null, 'too far for the cap -> fallback');
  assert.deepEqual(planPlayerRoute(s.map, { x: mgr.x, y: mgr.y + 1 }, mgr).dirs, [], 'already adjacent');
  assert.equal(playerFree(s.map, 7, 11), false, 'never onto the door warp');
});

test('switch: ?automove=0 / opts.automove=false', () => {
  assert.equal(automoveOn({ opts: {} }, new URLSearchParams('automove=0')), false);
  assert.equal(automoveOn({ opts: {} }, new URLSearchParams('automove=off')), false);
  assert.equal(automoveOn({ opts: {} }, new URLSearchParams('')), true);
  assert.equal(automoveOn({ opts: { automove: false } }), false);
});

test('briefing: input locked + no save while walking, saved at the checkpoint and after; both face each other', async () => {
  const { s, saves } = await scene({ map: HOME.downstairs, flags: [HOME.started], at: { x: 7, y: 6, facing: 'right' } });
  await pump(s, 3000, () => s.flags.has(HOME.briefed) && !s.busy);
  assert.ok(s.flags.has(HOME.briefed));
  const walk = s.log.find((e) => e.type === 'automove' && e.how === 'walk');
  assert.ok(walk, 'the player walked over');
  assert.ok(walk.steps >= 1);
  assert.ok(saves.length >= 2, 'checkpoint + end save');
  assert.equal(saves.filter((x) => x.busy).length, 0, 'never saved while the beat ran');
});

test('approach: onStep sees busy + save lock on every step; fallback NPC walk, then fade when the player cannot path', async () => {
  const { s } = await scene({ map: OPEN.office, flags: [HOME.started, HOME.briefed, OPEN.promoted], at: { x: 7, y: 10, facing: 'up' } });
  const mgr = s.npcs.byId('manager');
  const seen = [];
  let res = null;
  s.script(async () => { res = await approach(s, mgr, { beat: 't', pauseMs: 10, onStep: (e) => seen.push(e) }); });
  await pump(s, 3000, () => !s.busy);
  assert.equal(res.how, 'walk');
  assert.ok(seen.length >= 3 && seen.every((e) => e.busy && e.locked), 'input frozen, save refused mid-walk');
  assert.equal(dist(s.player, mgr), 1);
  assert.equal(s.player.facing, faceTo(s.player, mgr));
  // no player route (cap 0 steps): the NPC comes over, or a fade sets the player down
  s.player.place(2, 10, 'up');
  s.script(async () => { res = await approach(s, mgr, { beat: 't2', pauseMs: 10, maxSteps: 0, npcMs: 3000, fadeMs: 30 }); });
  await pump(s, 4000, () => !s.busy);
  assert.ok(['npc', 'fade'].includes(res.how), res.how);
  assert.equal(dist(s.player, mgr), 1);
  assert.equal(s.fade, null, 'never left black');
  // a save attempt mid-beat is refused
  let refused = null;
  s.script(async () => { refused = s.saveNow(); });
  await pump(s, 50, () => !s.busy);
  assert.equal(refused, false);
});

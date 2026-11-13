// Story Ron (Gary Oct 23 2026, 2:21 PM CT "room mate is missing at work and the lab"; 2:22 PM CT "also need to show which
// one room mate chooses on the map behind him like our mc"). src/overworld/story_ron.js + hooks in intro.js.
// Run: node --test tests/story_ron.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { scene, enter, pump, idle, dist, text } from './story_harness.mjs';
import { HOME, OPEN } from '../src/overworld/intro.js';
import { STORY_RON, storyRonWhere, homeRonAway, isRonNpc, ronPalSpecies, ronCradleFor } from '../src/overworld/story_ron.js';
import { RON_COUNTER } from '../src/battle/data/starters.js';

const ron = (s) => s.npcs.byId(STORY_RON.id);
const OFFICE_DOOR = { x: 7, y: 10, facing: 'up' };

test('where: office between the briefing and the promotion; lab from promotion to job briefing, not during the run', () => {
  const F = (...f) => new Set([HOME.started, HOME.briefed, ...f]);
  assert.equal(storyRonWhere(F(), OPEN.office), 'office');
  assert.equal(storyRonWhere(F(OPEN.promoted), OPEN.office), null);
  assert.equal(storyRonWhere(F(), OPEN.lab), null, 'not in the lab before the promotion');
  assert.equal(storyRonWhere(F(OPEN.promoted), OPEN.lab), 'lab');
  assert.equal(storyRonWhere(F(OPEN.promoted, OPEN.starter, OPEN.runStarted), OPEN.lab), null, 'out on the test run');
  assert.equal(storyRonWhere(F(OPEN.promoted, OPEN.starter, OPEN.runStarted, OPEN.runDone), OPEN.lab), 'lab', 'back for the briefing');
  assert.equal(storyRonWhere(F(OPEN.promoted, OPEN.starter, OPEN.runStarted, OPEN.runDone, OPEN.briefed), OPEN.lab), null);
  assert.equal(storyRonWhere(new Set([HOME.briefed]), OPEN.office), null, 'old saves: never');
  assert.equal(homeRonAway(F(), HOME.downstairs), true);
  assert.equal(homeRonAway(F(OPEN.briefed), HOME.downstairs), false, 'home again after the job briefing');
  assert.equal(homeRonAway(new Set([HOME.started]), HOME.downstairs), false, 'before the briefing he is home');
});

test('office: Ron walks in with the player, stands next to them in front of the manager, faces the speaker', async () => {
  const { s, said } = await scene({ map: OPEN.office, flags: [HOME.started, HOME.briefed], at: OFFICE_DOOR, party: [] });
  await pump(s, 3); // spawn
  assert.ok(ron(s), 'story Ron spawned next to the player');
  assert.equal(dist(ron(s), s.player), 1);
  await pump(s, 4000, () => s.flags.has(OPEN.promoted) && !s.busy);
  assert.ok(s.flags.has(OPEN.promoted));
  const mgr = s.npcs.byId('manager');
  const lines = said.filter((x) => x.ronAt);
  assert.ok(lines.length >= 2, 'Ron on the map for the promotion lines');
  for (const l of lines) assert.equal(dist(l.ronAt, s.player), 1, 'Ron next to the player');
  const mgrLine = said.find((x) => x.sp?.name === 'Manager' && x.ronAt);
  assert.equal(mgrLine.ronAt.facing, (mgr.x > mgrLine.ronAt.x ? 'right' : mgr.x < mgrLine.ronAt.x ? 'left' : mgr.y < mgrLine.ronAt.y ? 'up' : 'down'), 'faces the manager');
  assert.ok(s.log.some((e) => e.type === 'storyRon' && e.step === 'join' && e.by === 'manager'));
  assert.ok(dist(s.player, mgr) === 1, 'player walked up');
});

test('office ?automove=0: Ron is still there, placed next to the player on talk', async () => {
  const { s, said } = await scene({ map: OPEN.office, flags: [HOME.started, HOME.briefed], at: { x: 13, y: 7, facing: 'up' }, automove: false });
  await pump(s, 3);
  assert.ok(ron(s));
  await pump(s, 200);
  assert.ok(!s.flags.has(OPEN.promoted), 'no auto beat with automove off');
  const mgr = s.npcs.byId('manager');
  s.player.place(13, 6, 'up');
  s.talk(mgr, mgr.def); await idle(s);
  assert.ok(s.flags.has(OPEN.promoted));
  assert.ok(said.some((x) => x.ronAt && dist(x.ronAt, s.player) === 1));
});

test('lab: Ron at the cradles, walks to his counter-pick, the case is taken, his creature follows; he walks out after "Race you"', async () => {
  for (const [cradle, mine] of [['cradle_1', 'nibbin'], ['cradle_2', 'cindrip'], ['cradle_3', 'rillop']]) {
    const { s, said } = await scene({ map: OPEN.lab, flags: [HOME.started, HOME.briefed, OPEN.promoted], at: { x: 7, y: 9, facing: 'up' }, answers: [0] });
    await pump(s, 3);
    assert.ok(ron(s), 'Ron in the lab');
    await pump(s, 4000, () => s.intro.picker?.active || (s.flags.has(OPEN.starterIntro) && !s.busy));
    assert.ok(s.flags.has(OPEN.starterIntro) || s.log.some((e) => e.step === 'starterIntro'));
    assert.ok(said.some((x) => x.ronAt && dist(x.ronAt, s.player) === 1), 'next to the player at the intro');
    // pick (cradle interaction path: Yes)
    const spot = s.map.json.text_pending.interact_spots.find((c) => c.id === cradle);
    s.intro.picker = null;
    s.player.place(spot.stand[0], spot.stand[1], 'up');
    s.opts.noPicker = true;
    assert.equal(s.intro.onInteract(spot.x, spot.y), true);
    await pump(s, 6000, () => !s.busy);
    const want = RON_COUNTER[mine], rk = ronCradleFor(s.systems.cfg.starterCradles, mine);
    assert.equal(s.systems.cfg.starterCradles[rk], want);
    const take = s.log.find((e) => e.type === 'storyRon' && e.step === 'take');
    assert.ok(take, `${mine}: Ron took a cradle`);
    assert.equal(take.cradle, rk); assert.equal(take.species, want);
    const rspot = s.map.json.text_pending.interact_spots.find((c) => c.id === rk);
    assert.deepEqual(take.at, { x: rspot.stand[0], y: rspot.stand[1] }, 'stood at his cradle');
    assert.ok(s.intro.story.taken.has(rk) && s.intro.story.taken.has(cradle), 'both cases shown taken');
    const after = said.find((x) => /take this one/.test(x.pages.join(' ')));
    assert.ok(after?.ronAt, 'Ron on the map for "Then I\'ll take this one"');
    assert.ok(s.log.some((e) => e.type === 'storyRon' && e.step === 'pal' && e.species), 'his creature came out');
    assert.ok(s.log.some((e) => e.type === 'storyRon' && e.step === 'walkOut'));
    assert.equal(ron(s), null, 'gone after Race you');
    assert.equal(s.intro.story.pals.size, 0, 'partner removed with him');
    assert.match(text(said), /Race you/);
    assert.equal(s.npcs.list.filter((n) => isRonNpc(n)).length, 0, 'never two Rons');
  }
});

test('lab return: Ron back next to the player for the job briefing, then walks out; house_1f Ron home again', async () => {
  const flags = [HOME.started, HOME.briefed, OPEN.promoted, OPEN.starter, OPEN.runStarted, OPEN.runDone];
  const { s, said } = await scene({ map: OPEN.lab, flags, at: { x: 7, y: 9, facing: 'up' }, party: ['nibbin'] });
  await pump(s, 3);
  assert.ok(ron(s));
  await pump(s, 4000, () => s.flags.has(OPEN.briefed) && !s.busy);
  assert.ok(s.flags.has(OPEN.briefed));
  assert.ok(said.some((x) => x.ronAt && dist(x.ronAt, s.player) === 1));
  assert.equal(ron(s), null, 'walked out after the briefing');
  assert.ok(s.intro.story.taken.has('cradle_1') && s.intro.story.taken.has(ronCradleFor(s.systems.cfg.starterCradles, 'nibbin')), 'cases still empty on a later visit');
  await enter(s, HOME.downstairs, { x: 5, y: 8, facing: 'up' }); await pump(s, 3);
  assert.ok(s.npcs.byId(HOME.ron), 'house_1f Ron home after job_briefed');
});

test('house_1f: after the briefing Ron walks out; while he is away (until job_briefed) he is not downstairs', async () => {
  const { s } = await scene({ map: HOME.downstairs, flags: [HOME.started, HOME.briefed, OPEN.promoted], at: { x: 5, y: 8, facing: 'up' } });
  await pump(s, 3);
  assert.equal(s.npcs.byId(HOME.ron), null, 'away');
  const t = await scene({ map: HOME.downstairs, flags: [HOME.started], at: { x: 7, y: 6, facing: 'right' } });
  await pump(t.s, 3);
  assert.ok(t.s.npcs.byId(HOME.ron), 'home before the briefing');
  await pump(t.s, 3000, () => t.s.flags.has(HOME.briefed) && !t.s.busy); // auto-walk briefing
  assert.ok(t.s.flags.has(HOME.briefed));
  assert.equal(t.s.npcs.byId(HOME.ron), null, 'left after "I\'ll be right behind you"');
  const out = t.s.log.find((e) => e.type === 'storyRon' && e.step === 'walkOut' && e.id === HOME.ron);
  const gone = t.s.log.find((e) => e.type === 'storyRon' && e.step === 'remove' && e.id === HOME.ron);
  assert.ok(out && gone && gone.tick > out.tick + 30, 'walked (several tiles), not popped');
});

test("Ron's partner: counter species, evolved when his team uses it, trails like the player's follower, removed with him", async () => {
  const { s } = await scene({ map: 'fernwick', flags: [HOME.started, HOME.briefed, OPEN.promoted, OPEN.starter, OPEN.runStarted, OPEN.runDone, OPEN.briefed], at: { x: 20, y: 20 }, party: ['cindrip'] });
  const r = s.npcs.list.find((n) => n.id === 'ron_rival_1') || s.npcs.list.find(isRonNpc);
  assert.ok(r, 'a Ron in fernwick');
  const sp = ronPalSpecies(s, r);
  assert.equal(sp.base, 'rillop');
  assert.ok(['rillop', 'brookhorn', 'tidemarrow'].includes(sp.species));
  for (const [mine, base] of Object.entries({ nibbin: 'cindrip', cindrip: 'rillop', rillop: 'nibbin' })) {
    s.systems.party.list = [{ species: mine }]; assert.equal(ronPalSpecies(s, null).base, base);
  }
  s.systems.party.list = [{ species: 'cindrip' }];
  await pump(s, 3);
  const pal = s.intro.story.pals.get(r);
  assert.ok(pal, 'partner placed behind him');
  assert.equal(dist(pal, r), 1);
  // he takes a step: the partner moves into the cell he left
  const from = { x: r.x, y: r.y };
  const dirs = ['left', 'right', 'up', 'down'].filter((d) => s.npcs._canStep?.(r, d, true));
  r.behaviour = 'static';
  if (dirs.length) {
    s.npcs.walk(r.id, [dirs[0]]);
    await pump(s, 40, () => !r.mover.moving && (r.x !== from.x || r.y !== from.y));
    assert.deepEqual({ x: pal.x, y: pal.y }, from, 'partner stepped into his old cell');
  }
  s.view = () => ({ grade: null, actors: [] }); s.intro.story._wrapped = false; s.intro.story._wrap();
  pal.sheet = { width: 320, height: 256 };
  const v = s.view();
  assert.ok(v.actors.some((a) => a.ronPal === r.id && a.w === 64 && a.follower === pal.species), 'drawn like the follower');
  s.intro.story.remove(r);
  assert.equal(s.intro.story.pals.size, 0);
});

test('no partner before got_starter, never on the pre-starter catch Ron', async () => {
  const { s } = await scene({ map: 'fernwick', flags: [HOME.started], at: { x: 20, y: 20 } });
  await pump(s, 3);
  assert.equal(s.intro.story.pals.size, 0);
  assert.equal(isRonNpc({ id: 'ron_catch', def: {} }), false);
});

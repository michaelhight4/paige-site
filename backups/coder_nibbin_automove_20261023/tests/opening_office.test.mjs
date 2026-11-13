// Opening v1 (Oct 23, 2026; Gary 9:22 AM CT, Text Bot OPENING_OFFICE_v1.md): office promotion (flg_promoted) -> lab
// starter (got_starter) -> test run with 5 crystals (test_run_started) -> 2 caught + logged (test_run_done) -> back in the
// lab: return + job briefing (job_briefed). Leaving brookhollow/route1 is refused until then. Old saves unchanged.
// Run: node --test tests/opening_office.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Overworld } from '../src/overworld/overworld.js';
import { GridMover } from '../src/overworld/movement.js';
import { NpcSystem } from '../src/overworld/npcs.js';
import { indexTileset } from '../src/overworld/tileset.js';
import { Col } from '../src/overworld/constants.js';
import { CONFIG } from '../src/config.js';
import { HomeStart, HOME, OPEN, objectiveFor, leaveBlocked, speakerRuns, stageFor } from '../src/overworld/intro.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const LINES = readJson(CONFIG.textLines);
const TS = indexTileset(readJson('art/world/overworld/tileset.json'));
const MAP = (n) => readJson(CONFIG.mapsDir + n + '.json');

globalThis.fetch = async (url) => {
  const p = path.join(ROOT, String(url).replace(/^https?:\/\/[^/]+\//, ''));
  return fs.existsSync(p) ? { ok: true, status: 200, json: async () => JSON.parse(fs.readFileSync(p, 'utf8')) } : { ok: false, status: 404 };
};

function fakeSystems() {
  const caught = {}, bag = {};
  const sys = {
    cfg: { starterCradles: { cradle_1: 'tumbloam', cradle_2: 'cindrip', cradle_3: 'rillop' } },
    party: { list: [], chooseStarter(sp) { this.list.unshift({ species: sp }); return { ok: true }; } },
    archive: { boxes: [[]] },
    bag: { add(id, n = 1) { bag[id] = (bag[id] || 0) + n; return { ok: true }; }, count: (id) => bag[id] || 0 },
    kilindex: { data: { caught }, markCaught(sp) { caught[sp] = (caught[sp] || 0) + 1; return true; } },
    catchWild(sp) { this.party.list.push({ species: sp }); this.kilindex.markCaught(sp); },
  };
  return sys;
}

async function scene({ map = 'office_int', flags = [HOME.started, HOME.briefed], answers = [] } = {}) {
  const s = Object.create(Overworld.prototype);
  const said = [], toasts = [], asked = [];
  Object.assign(s, {
    mapCache: new Map(), config: CONFIG, lines: LINES, tilesetIndex: TS, opts: { toast: (t) => toasts.push(t) }, input: {},
    flags: new Set(flags), party: [], seen: {}, seenDay: {}, counters: {}, clock: { day: 0, min: 480 }, log: [], tick: 0,
    busy: false, fade: null, store: null, systems: fakeSystems(), timescale: 0, zoom: 2, stillSince: 0, healedAt: null, layout: null,
    dialog: { active: false, say: async (pages, sp) => { said.push({ pages, sp }); }, ask: async (pages) => { asked.push(pages); return answers.length ? answers.shift() : 0; } },
  });
  s.npcs = new NpcSystem(s);
  s.map = await s.loadMap(map);
  s.player = new GridMover({ x: 0, y: 0, facing: 'down' });
  s.intro = new HomeStart(s, { newGame: true });
  return { s, said, toasts, asked };
}
const settle = () => new Promise((r) => setTimeout(r, 0));
async function idle(s) { for (let i = 0; i < 100 && s.busy; i++) await settle(); assert.equal(s.busy, false, 'script finished'); }
const text = (said) => said.flatMap((x) => x.pages).join('\n');
const def = (map, id) => MAP(map).npcs.find((n) => n.id === id);
async function enterLab(s) { s.map = await s.loadMap(OPEN.lab); s.fade = null; }
const cradle = (id) => MAP(OPEN.lab).text_pending.interact_spots.find((c) => c.id === id);

test('speaker tags: "MANAGER: / RON: / LAB TECH:" pages become named runs', () => {
  const r = speakerRuns(['MANAGER: a', 'MANAGER: b', 'RON: c', 'plain', { speaker: 'LAB TECH', text: 'd' }]);
  assert.deepEqual(r, [{ name: 'Manager', pages: ['a', 'b'] }, { name: 'Ron', pages: ['c'] }, { name: null, pages: ['plain'] }, { name: 'Lab Tech', pages: ['d'] }]);
});

test('office manager: scene_promotion sets flg_promoted, objective -> lab, fades into the lab inside its door', async () => {
  const { s, said, toasts } = await scene();
  assert.equal(objectiveFor(s.flags), 'Go to the Revival Tech office');
  s.talk(null, def('office_int', 'manager'));
  await idle(s);
  assert.ok(s.flags.has('flg_promoted'));
  assert.match(text(said), /Lab's next door\. Come on\./);
  assert.ok(said.some((x) => x.sp?.name === 'Ron') && said.some((x) => x.sp?.name === 'Manager'), 'Manager and Ron are named speakers');
  assert.ok(toasts.includes('New objective: Pick a partner at the lab'));
  assert.equal(s.fade?.spawn?.map, OPEN.lab);
  const lab = await s.loadMap(OPEN.lab);
  assert.equal(lab.code(s.fade.spawn.x, s.fade.spawn.y), Col.WALK, 'lab spawn is floor (found by the door warp, not hard-coded)');
});

test('old saves (no intro_new_game): office manager keeps the file lines, cradles keep the systems hook', async () => {
  const { s } = await scene({ flags: [] });
  assert.equal(s.intro._onOpeningTalk(null, def('office_int', 'manager')), false);
  await enterLab(s);
  const c = cradle('cradle_2');
  assert.equal(s.intro.onInteract(c.x, c.y), false);
});

test('lab cradles: not before the promotion (thought); after it starter_intro -> confirm -> got_starter -> test run + 5 crystals', async () => {
  const { s, said, asked, toasts } = await scene({ map: OPEN.lab, flags: [HOME.started, HOME.briefed] });
  const c = cradle('cradle_2');
  assert.equal(s.intro.onInteract(c.x, c.y), true);
  await idle(s);
  assert.equal(said.at(-1).sp.thought, true, 'not-yet line is a thought');
  assert.ok(!s.flags.has('got_starter'));
  s.flags.add('flg_promoted'); said.length = 0;
  assert.equal(s.intro.onInteract(c.x, c.y), true);
  await idle(s);
  assert.match(asked[0].join(' '), /Take Cindrip as your partner\?/);
  assert.ok(s.flags.has('got_starter') && s.flags.has('test_run_started'));
  assert.equal(s.systems.party.list[0].species, 'cindrip');
  assert.equal(s.systems.bag.count('dominance_crystal'), OPEN.crystals);
  assert.equal(OPEN.crystals, 5);
  assert.match(text(said), /I'm going by looks\.[\s\S]*It looked at me first[\s\S]*Cindrip seems to like you[\s\S]*It's a race\./);
  assert.equal(s.counters.test_run_base, 1, 'baseline counts the starter');
  assert.ok(toasts.some((t) => /Test run: catch and log 2 wild Kilumen \(0\/2\)/.test(t)));
});

test('cradle: saying No keeps the choice open', async () => {
  const { s } = await scene({ map: OPEN.lab, flags: [HOME.started, HOME.briefed, 'flg_promoted'], answers: [1] });
  const c = cradle('cradle_1');
  s.intro.onInteract(c.x, c.y); await idle(s);
  assert.ok(!s.flags.has('got_starter') && !s.flags.has('test_run_started'));
});

test('test run counter: 2 creatures caught AND logged -> thought + test_run_done; return in the lab -> job_briefed', async () => {
  const { s, said, toasts } = await scene({ map: 'route1', flags: [HOME.started, HOME.briefed, 'flg_promoted', 'got_starter', 'test_run_started'] });
  s.systems.party.list.push({ species: 'cindrip' }); s.systems.kilindex.markCaught('cindrip'); s.counters.test_run_base = 1;
  s.intro.tick(); assert.equal(s.counters.test_run_logged || 0, 0);
  s.systems.party.list.push({ species: 'unlogged_x' }); s.intro.tick();
  assert.equal(s.counters.test_run_logged || 0, 0, 'owned but not in the Kilindex does not count');
  s.systems.kilindex.markCaught('unlogged_x'); s.intro.tick();
  assert.equal(s.counters.test_run_logged, 1);
  assert.ok(toasts.some((t) => /1\/2/.test(t)));
  assert.equal(objectiveFor(s.flags, s.counters), 'Test run: catch and log 2 wild Kilumen (1/2)');
  s.systems.archive.boxes[0].push({ species: 'boxed' }); s.systems.kilindex.markCaught('boxed'); // full team: to the Archive still counts
  s.intro.tick(); await idle(s);
  assert.ok(s.flags.has('test_run_done'));
  assert.equal(said.at(-1).sp.thought, true);
  assert.match(text(said), /That's two in the Kilindex/);
  assert.equal(objectiveFor(s.flags, s.counters), 'Return to the lab');
  s.intro.tick(); await idle(s); assert.ok(!s.flags.has('job_briefed'), 'not on route1');
  await enterLab(s); said.length = 0;
  s.intro.tick(); await idle(s);
  assert.ok(s.flags.has('job_briefed'));
  assert.match(text(said), /Two logged\. Clean entries[\s\S]*Noted\. Ignored[\s\S]*So get to work\./);
  assert.equal(objectiveFor(s.flags, s.counters), null, 'free roam');
  said.length = 0; s.intro.tick(); await idle(s); assert.equal(said.length, 0, 'plays once');
});

test('office manager mid-run plays manager_test_run_repeat', async () => {
  const { s, said } = await scene({ flags: [HOME.started, HOME.briefed, 'flg_promoted', 'got_starter', 'test_run_started'] });
  s.talk(null, def('office_int', 'manager')); await idle(s);
  assert.match(text(said), /Two wild creatures, caught and logged/);
});

test('leave block: brookhollow edges closed before the run, route1 only during it, all open after job_briefed', () => {
  const F = (...f) => new Set([HOME.started, ...f]);
  const toR1 = { to: 'route1' }, toEast = { to: 'route_east' }, toFern = { to: 'fernwick' }, home = { to: 'brookhollow' };
  assert.equal(leaveBlocked(F(HOME.briefed), 'brookhollow', toR1), true);
  assert.equal(leaveBlocked(F('flg_promoted', 'got_starter', 'test_run_started'), 'brookhollow', toR1), false);
  assert.equal(leaveBlocked(F('test_run_started'), 'brookhollow', toEast), true);
  assert.equal(leaveBlocked(F('test_run_started'), 'route1', toFern), true);
  assert.equal(leaveBlocked(F('test_run_started'), 'route1', home), false);
  assert.equal(leaveBlocked(F('test_run_started', 'job_briefed'), 'route1', toFern), false);
  assert.equal(leaveBlocked(new Set(['flg_promoted']), 'route1', toFern), false, 'old saves / dev flags: never blocked');
  assert.equal(leaveBlocked(F(), 'fernwick', { to: 'route2' }), false, 'outside the starting area: no block');
  // real map data: brookhollow / route1 exits by `to` name
  assert.ok(MAP('brookhollow').exits.some((e) => e.to === 'route1') && MAP('route1').exits.some((e) => e.to === 'fernwick'));
});

test('leave block (has a starter, run on): leaving for route_east turns the player back with a thought', async () => {
  const { s, said } = await scene({ map: 'brookhollow', flags: [HOME.started, HOME.briefed, OPEN.promoted, OPEN.starter, OPEN.runStarted] });
  s.systems.party.list.push({ species: 'rillop' });
  s.player.facing = 'right';
  assert.equal(s.intro.onEdge({ to: 'route_east', edge: 'east' }), true);
  await idle(s);
  assert.equal(said.at(-1).sp.thought, true);
  assert.equal(s.player.facing, 'left');
  assert.equal(stageFor(s.flags), 'run');
  assert.ok(!s.log.some((e) => e.step === 'ronCatch'));
});

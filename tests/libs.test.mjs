// Kilumen: libs pass checks (Oct 22, 2026): audio helpers (howler/ZzFX wiring lives in src/audio/audio.js),
// easystar walk-to-target for NPCs (src/overworld/pathing.js, npcs.js walkTo) and the camp prompt_after_line flow.
// Run: node --test tests/libs.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { trackFor, musicTrackIds, synthTrack, wavBytes, blipCount, audioSettings, placeholderList, SFX, SFX_USES, AUDIO_DEFAULTS, AUDIO_LEVEL_NOTE } from '../src/audio/audio.js';
import { walkGrid, findPath, pathToDirs } from '../src/overworld/pathing.js';
import { NpcSystem } from '../src/overworld/npcs.js';
import { Col } from '../src/overworld/constants.js';
import { Overworld } from '../src/overworld/overworld.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const LAYOUT = readJson('art/world/overworld/world_layout.json');
const LINES = readJson('text/overworld_lines.json');

// ---- audio ----
test('trackFor: zone + time of day outdoors, fixed tracks indoors', () => {
  assert.equal(trackFor({ map: 'thornwood', zone: 'thornwood', phase: 'day' }), 'thornwood.day');
  assert.equal(trackFor({ map: 'thornwood', zone: 'thornwood', phase: 'dawn' }), 'thornwood.day');
  assert.equal(trackFor({ map: 'thornwood', zone: 'thornwood', phase: 'dusk' }), 'thornwood.night');
  assert.equal(trackFor({ map: 'route1', zone: null, phase: 'night' }), 'route.night');
  assert.equal(trackFor({ map: 'heal_fernwick', zone: 'fernwick', phase: 'day' }), 'heal_centre');
  assert.equal(trackFor({ map: 'greystone_b1', zone: 'greystone_caverns', phase: 'night' }), 'cave');
  assert.equal(trackFor({ map: 'home_lanternport_c_2f', zone: 'lanternport', phase: 'day' }), 'home');
  assert.equal(trackFor({ map: 'shop_int', zone: 'brookhollow', phase: 'day' }), 'interior');
  assert.equal(trackFor({}), null);
});

test('every built map resolves to a known track id', () => {
  const ids = new Set(musicTrackIds(LAYOUT));
  const maps = fs.readdirSync(path.join(ROOT, 'art/world/overworld/maps')).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5));
  const zoneOf = (m) => (LAYOUT.zones || []).find((z) => (z.maps || []).includes(m))?.id || null;
  for (const m of maps) for (const phase of ['dawn', 'day', 'dusk', 'night']) {
    const t = trackFor({ map: m, zone: zoneOf(m), phase });
    assert.ok(ids.has(t), `${m} ${phase} -> ${t}`);
  }
});

test('placeholder music: deterministic, in range, loopable WAV', () => {
  const a = synthTrack('thornwood.day', 8000), b = synthTrack('thornwood.day', 8000), c = synthTrack('thornwood.night', 8000);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.slice(0, 4000), c.slice(0, 4000));
  assert.ok(a.every((v) => Math.abs(v) <= 1));
  assert.equal(Math.abs(a[0]), 0); assert.equal(Math.abs(a[a.length - 1]), 0);
  const w = wavBytes(a, 8000);
  assert.equal(String.fromCharCode(...w.slice(0, 4)), 'RIFF');
  assert.equal(w.length, 44 + a.length * 2);
});

test('blips, settings and the placeholder list', () => {
  assert.equal(blipCount('', false), 0);
  assert.equal(blipCount('Hello there', false), 4); // 10 visible chars / 3
  assert.equal(blipCount('Hello there', false, 4), 3);
  assert.equal(blipCount('Hello there', true), 1);
  assert.equal(blipCount('x'.repeat(500), false), 24);
  const pc = readJson('src/platform/pc.json').audio, mobile = readJson('src/platform/mobile.json').audio;
  assert.ok(pc && mobile, 'each profile has its own audio section');
  assert.equal(audioSettings(pc).settings.music, pc.music);
  assert.equal(audioSettings(mobile).settings.music, mobile.music);
  assert.deepEqual(audioSettings(pc, { music: 2, sfx: -1, muted: true }).settings, { master: pc.master, music: 1, sfx: 0, muted: true });
  assert.equal(audioSettings(mobile).cfg.unlockOn[0], 'touchend');
  const list = placeholderList(LAYOUT);
  assert.ok(list.music.length >= 6 && list.sfx.length === Object.keys(SFX).length);
  for (const k of Object.keys(SFX)) assert.ok(SFX_USES[k], k);
});

// ---- easystar pathing + NPC walkTo ----
function stubScene(rows, { warps = [], player = { x: 0, y: 0 } } = {}) {
  const w = rows[0].length, h = rows.length, occ = new Map();
  const map = {
    name: 'stub', width: w, height: h, storyGates: [], npcs: [],
    inBounds: (x, y) => x >= 0 && y >= 0 && x < w && y < h,
    code: (x, y) => (x >= 0 && y >= 0 && x < w && y < h ? (rows[y][x] === '#' ? Col.BLOCK : Col.WALK) : Col.BLOCK),
    npcAt: (x, y) => occ.get(x + ',' + y) || null,
    warpAt: (x, y) => warps.some((c) => c.x === x && c.y === y) || null,
    resetOccupancy: (l) => { occ.clear(); for (const o of l) occ.set(o.x + ',' + o.y, o.ref); },
    occupy: (x, y, r) => occ.set(x + ',' + y, r),
    vacate: (x, y, r) => { if (occ.get(x + ',' + y) === r) occ.delete(x + ',' + y); },
  };
  return { map, player: { ...player, tx: player.x, ty: player.y }, standCells: new Set(), flags: new Set() };
}
const ROWS = [
  '..........',
  '.######...',
  '.#....#...',
  '.#.##.#...',
  '......#...',
];
const run = (sys, n, ticks) => { for (let i = 0; i < ticks; i++) sys.tick(false); return n; };

test('pathing: easystar finds the shortest 4-way path over the collision grid', () => {
  const s = stubScene(ROWS);
  const grid = walkGrid(s.map);
  const p = findPath(grid, { x: 0, y: 4 }, { x: 9, y: 4 });
  assert.ok(p);
  assert.equal(p.length - 1, 17); // up the left side, across the top, down the right (the inner room is a dead end)
  for (let i = 1; i < p.length; i++) assert.equal(Math.abs(p[i].x - p[i - 1].x) + Math.abs(p[i].y - p[i - 1].y), 1);
  assert.ok(p.every((c) => ROWS[c.y][c.x] === '.'));
  assert.equal(findPath(grid, { x: 0, y: 4 }, { x: 2, y: 1 }), null); // a wall
  assert.deepEqual(pathToDirs([{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 0 }]), ['right', 'up']);
});

test('walkTo: an NPC walks to the target, avoids warps and NPCs, then keeps wandering there', () => {
  const s = stubScene(ROWS, { warps: [{ x: 9, y: 0 }], player: { x: 9, y: 2 } });
  s.map.npcs = [
    { id: 'villager_a', x: 0, y: 4, kind: 'villager' },
    { id: 'statue', x: 7, y: 1, kind: 'object' }, // stands by the east corner: the route must go round it
  ];
  const sys = new NpcSystem(s);
  sys.build(s.map, {}, 'day');
  const n = sys.byId('villager_a');
  const dirs = sys.walkTo('villager_a', 8, 4);
  assert.ok(dirs, 'reachable');
  { let x = 0, y = 4; const D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    for (const d of dirs) { x += D[d][0]; y += D[d][1]; assert.ok(!(x === 7 && y === 1), 'not through the statue'); assert.equal(ROWS[y][x], '.'); } }
  run(sys, n, 60 * 40);
  assert.deepEqual([n.x, n.y], [8, 4]);
  assert.equal(n.goal, null);
  assert.deepEqual([n.home.x, n.home.y], [8, 4], 'adopts the target as home');
  assert.equal(n.behaviour, 'wander');
  run(sys, n, 60 * 30);
  assert.ok(Math.abs(n.x - 8) <= 1 && Math.abs(n.y - 4) <= 1, 'wanders near the new home');
  // unreachable (a wall cell / walled-in) -> null, no goal
  assert.equal(sys.walkTo('villager_a', 2, 1), null);
  assert.equal(n.goal, null);
  // never plans through the warp cell or onto the player
  const p = sys.walkTo('villager_a', 9, 1);
  assert.ok(p);
  let x = n.x, y = n.y;
  const D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  for (const d of p) { x += D[d][0]; y += D[d][1]; assert.ok(!(x === 9 && y === 0) && !(x === 9 && y === 2), `${x},${y}`); }
});

test('walkTo: an NPC that steps into the route makes the walker replan', () => {
  const rows = ['.....', '.....', '.....'];
  const s = stubScene(rows, { player: { x: 4, y: 2 } });
  s.map.npcs = [{ id: 'walker', x: 0, y: 1, kind: 'villager' }, { id: 'blocker', x: 4, y: 0, kind: 'object' }];
  const sys = new NpcSystem(s);
  sys.build(s.map, {}, 'day');
  const n = sys.byId('walker'), b = sys.byId('blocker');
  assert.deepEqual(sys.walkTo('walker', 4, 1), ['right', 'right', 'right', 'right']); // straight along row 1
  // something now stands on that route (planned before it was there)
  s.map.vacate(b.x, b.y, b); b.mover.x = 2; b.mover.y = 1; s.map.occupy(2, 1, b);
  let blockedSeen = false;
  for (let i = 0; i < 60 * 20 && n.goal; i++) { sys.tick(false); if (n.blockedTicks > 0) blockedSeen = true; }
  assert.ok(blockedSeen, 'it waited first');
  assert.equal(n.goal, null);
  assert.deepEqual([n.x, n.y], [4, 1], 'went round and arrived');
  assert.deepEqual([n.home.x, n.home.y], [4, 1]);
});

// ---- camps: prompt_after_line ----
function campScene(spot, { flags = [] } = {}) {
  const s = Object.create(Overworld.prototype);
  const said = [], asked = [];
  Object.assign(s, {
    flags: new Set(flags), seen: {}, seenDay: {}, counters: {}, clock: { day: 0, min: 600 }, log: [], tick: 0, party: [],
    map: null, player: { facing: 'up', mode: 'walk' }, stillSince: 0, healedAt: null, answer: 0,
    say: async (pages) => { said.push(pages); }, ask: async (pages) => { asked.push(pages); return s.answer; },
    zone: () => 'thornwood',
  });
  Object.defineProperty(s, 'phase', { value: 'day' });
  Object.defineProperty(s, 'hour', { value: 10 });
  Object.defineProperty(s, 'ms', { value: 0 });
  return { s, said, asked, sp: { ...spot, id: spot.key.split('.').pop() } };
}
const CAMPS = [['thornwood', 'camp_thornwood'], ['greystone_b1', 'camp_greystone']];

for (const [map, id] of CAMPS) {
  const entry = LINES.maps[map][id];
  const spot = { ...entry, key: `maps.${map}.${id}` };

  test(`camp ${id}: the prompt follows only the default line; Yes sets ${entry.sets_flag}`, async () => {
    assert.equal(entry.prompt_after_line, 'default');
    const { s, said, asked, sp } = campScene(spot);
    s.answer = 0;
    await s.runSpot(sp);
    assert.deepEqual(said[0], entry.lines.find((l) => l.id === 'default').pages);
    assert.equal(asked.length, 1);
    assert.deepEqual(asked[0], entry.prompt);
    assert.ok(s.flags.has(entry.sets_flag));
    assert.deepEqual(said[1], entry.use);

    // restored: camp_restored_first once, then camp_restored, never a prompt
    said.length = 0;
    await s.runSpot(sp); await s.runSpot(sp);
    assert.deepEqual(said, [entry.lines.find((l) => l.id === 'camp_restored_first').pages, entry.lines.find((l) => l.id === 'camp_restored').pages]);
    assert.equal(asked.length, 1, 'no prompt after a restored line');
  });

  test(`camp ${id}: No plays declined and sets nothing`, async () => {
    const { s, said, asked, sp } = campScene(spot);
    s.answer = 1;
    await s.runSpot(sp);
    assert.equal(asked.length, 1);
    assert.equal(s.flags.has(entry.sets_flag), false);
    assert.deepEqual(said.at(-1), entry.declined);
  });
}

// Oct 22, 2026: Gary found the draft audio "a little loud". Defaults lowered (music about -6 dB together with the
// -16 LUFS loop normalisation, effects about -3 dB); each platform keeps its own profile defaults and save key.
test('volume defaults: lowered from the Oct 22 levels, per platform, audio.js fallback matches pc', () => {
  const db = (a, b) => 20 * Math.log10(a / b);
  const prof = { pc: readJson('src/platform/pc.json').audio, mobile: readJson('src/platform/mobile.json').audio };
  for (const [p, before] of Object.entries(AUDIO_LEVEL_NOTE.before)) {
    const a = prof[p];
    assert.ok(db(a.sfx, before.sfx) <= -2.5 && db(a.sfx, before.sfx) >= -4, `${p} sfx ${before.sfx} -> ${a.sfx}`);
    assert.ok(db(a.music, before.music) < -1.5, `${p} music ${before.music} -> ${a.music} (plus -16 LUFS loops = about -6 dB)`);
    assert.equal(a.master, before.master, `${p} master unchanged`);
    for (const k of ['master', 'music', 'sfx']) assert.equal(audioSettings(a).settings[k], a[k], `${p} ${k} default applies`);
  }
  for (const k of ['master', 'music', 'sfx']) assert.equal(AUDIO_DEFAULTS[k], prof.pc[k], `audio.js fallback ${k} = pc.json`);
  assert.ok(AUDIO_LEVEL_NOTE.musicLufs <= -16 && AUDIO_LEVEL_NOTE.maxTruePeakDb <= -1);
  // a saved Options value wins over the (new) default, per platform
  assert.equal(audioSettings(prof.mobile, { music: 0.7 }).settings.music, 0.7);
  assert.equal(audioSettings(prof.pc, null).settings.music, prof.pc.music);
});

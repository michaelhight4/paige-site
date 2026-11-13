// Save lock (Gary, Oct 23 2026, 11:35 AM CT): "if someone starts a trainer interation then closes the game it shouldnt
// save the interaction at all, game can not save during battle or talking interactions or cut scenes ... they save right
// before instead". Every case: start the interaction, "close" mid-way (pagehide / autosave / manual save attempts),
// reload what is on disk -> the pre-interaction state. Then finish it -> the normal save lands.
// Run: node --test tests/save_lock.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Overworld } from '../src/overworld/overworld.js';
import { GridMover } from '../src/overworld/movement.js';
import { NpcSystem } from '../src/overworld/npcs.js';
import { indexTileset } from '../src/overworld/tileset.js';
import { CONFIG } from '../src/config.js';
import { HomeStart, HOME } from '../src/overworld/intro.js';
import { SaveStore, SAVE_KEY } from '../src/overworld/save.js';
import { SightSystem } from '../src/overnight/sight.js';
import { installWildEncounters } from '../src/battle/encounters.js';
import { createCreature } from '../src/systems/creature.js';
import { SaveStore as SaveStoreV1 } from './fixtures/save_v1.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const LINES = readJson(CONFIG.textLines);
const TS = indexTileset(readJson('art/world/overworld/tileset.json'));
globalThis.fetch = async (url) => {
  const p = path.join(ROOT, String(url).replace(/^https?:\/\/[^/]+\//, ''));
  return fs.existsSync(p) ? { ok: true, status: 200, json: async () => JSON.parse(fs.readFileSync(p, 'utf8')) } : { ok: false, status: 404 };
};
const memStorage = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const settle = () => new Promise((r) => setTimeout(r, 0));
const until = async (pred, what, n = 400) => { for (let i = 0; i < n && !pred(); i++) await settle(); assert.ok(pred(), what); };
/** "Close the game": what a pagehide / autosave / manual save would try, then what a reload would read from disk. */
function closeAndReload(s, storage) {
  assert.equal(s.saveNow(), false, 'pagehide / autosave refused while locked');
  assert.equal(s.checkpoint('again'), false, 'no second checkpoint inside the interaction');
  return new SaveStore(storage).load();
}
/** The step loop's autosave rule (overworld.js step): dirty + not busy + no fade -> saveNow. */
const autosaveTick = (s) => { if (s._dirty && !s.busy && !s.fade) s.saveNow(); };

/** Headless scene (same pattern as home_start.test.mjs) with a real SaveStore on a memory storage. */
async function scene({ map = 'house_1f', flags = [], newGame = false, party = [] } = {}) {
  const storage = memStorage(), s = Object.create(Overworld.prototype);
  let hold = null;
  const said = [];
  Object.assign(s, {
    mapCache: new Map(), config: CONFIG, lines: LINES, tilesetIndex: TS, opts: { toast: () => {} }, input: {}, hooks: {},
    flags: new Set(flags), party, seen: {}, seenDay: {}, counters: {}, clock: { day: 0, min: 480 }, log: [], tick: 0,
    busy: false, fade: null, store: new SaveStore(storage), systems: null, timescale: 0, zoom: 2, stillSince: 0, healedAt: null, layout: null,
    _dirty: false, _sinceSave: 0, _saveLocks: new Map(), saveGuards: [],
    dialog: { active: false, say: async (pages, sp) => { said.push({ pages, sp }); if (s._holdTalk) { s.dialog.active = true; await new Promise((r) => { hold = r; }); s.dialog.active = false; } }, ask: async () => 0 },
  });
  s.releaseTalk = () => { const r = hold; hold = null; s._holdTalk = false; r?.(); };
  s.npcs = new NpcSystem(s);
  s.map = await s.loadMap(map);
  s.player = new GridMover({ x: 0, y: 0, facing: 'down' });
  s.intro = new HomeStart(s, { newGame });
  return { s, storage, said };
}

test('trainer spotted -> close mid-battle: reload at the pre-approach spot, trainer NOT beaten, no flags / gift', async () => {
  const { s, storage } = await scene({ map: 'fernwick', party: [createCreature({ species: 'cindrip', level: 5 })] });
  s.player.place(10, 12, 'down');
  s.saveNow(); // an older save from earlier in the walk
  s.player.place(12, 12, 'left'); // walked on: the spot where the trainer sees you (not saved yet)
  const def = { id: 'ron_rival_1' };
  const entry = { name: 'Ron', pages: ['Battle me!'], battle_lost: ['You win.'], battle_won: ['I win.'], after: ['Good one.'] };
  const real = s._entryFor.bind(s);
  s._entryFor = (m, d) => (d?.id === def.id ? entry : real(m, d));
  const n = { id: def.id, def, x: 16, y: 12, talking: false, mover: { moving: false }, faceToward() {} };
  s.npcs = { byId: () => n, list: [n], walkTo: (id, x, y) => { n.x = x; n.y = y; return true; }, beginTalk() {}, endTalk() {} };
  const sight = new SightSystem(s);
  let finishBattle = null, inBattle = false;
  s.hooks.onBattle = () => new Promise((res) => { inBattle = true; s.party[0].hp = 1; s._dirty = true; finishBattle = res; }); // damage taken mid-fight
  const pump = setInterval(() => { sight.waiters = sight.waiters.filter((w) => !w()); if (sight.spark && --sight.spark.t <= 0) sight.spark = null; }, 0);
  try {
    const done = sight.trigger(n);
    await until(() => inBattle, 'battle opened after the walk-up');
    assert.equal(n.x, 13, 'trainer walked up');
    assert.equal(s.saveLockReason(), 'trainer_approach');
    const disk = closeAndReload(s, storage);
    assert.deepEqual(disk.pos, { map: 'fernwick', x: 12, y: 12, facing: 'left' }, 'checkpoint = the spot the trainer saw you, before the approach');
    assert.ok(!disk.seen['defeated:fernwick.ron_rival_1'], 'trainer not marked beaten');
    assert.ok(!disk.flags.includes('beat_rival_ron_1') && !disk.flags.includes('has_run_shoes'), 'no battle flags / gift flag');
    assert.notEqual(disk.party[0].hp, 1, 'mid-battle damage not on disk');
    finishBattle(true);
    await done;
    assert.equal(s.saveLocked, false, 'lock released once the talk + battle script ended');
    assert.equal(s._dirty, true, 'result queued for the normal save');
    autosaveTick(s);
    const after = new SaveStore(storage).load();
    assert.equal(after.seen['defeated:fernwick.ron_rival_1'], true, 'normal save after the battle: trainer beaten');
    assert.ok(after.flags.includes('beat_rival_ron_1'));
  } finally { clearInterval(pump); }
});

test('NPC dialogue -> close mid-talk: no flags set on disk; finishing it saves as normal', async () => {
  const { s, storage } = await scene({ map: 'house_1f', flags: [HOME.started] });
  s.player.place(3, 4, 'up'); s.saveNow();
  s._holdTalk = true;
  s.talk(null, { id: 'ron' });
  await until(() => s.dialog.active, 'dialogue open');
  assert.equal(s.saveLocked, true);
  const disk = closeAndReload(s, storage);
  assert.ok(!disk.flags.includes(HOME.briefed), 'briefing flag not saved mid-talk');
  assert.deepEqual(disk.pos, { map: 'house_1f', x: 3, y: 4, facing: 'up' });
  s.releaseTalk();
  await until(() => !s.busy, 'talk finished');
  assert.ok(new SaveStore(storage).load().flags.includes(HOME.briefed), 'saved right after the talk');
});

test('cutscene (new-game wake-up) -> close mid-scene: replays from the start on reload', async () => {
  const { s, storage } = await scene({ map: 'house_2f', newGame: true });
  s.player.place(4, 4, 'down');
  s.intro.begin();
  s._holdTalk = true;
  for (let i = 0; i < 600 && !s.dialog.active; i++) { s._stepFade(); s.intro.tick(); }
  await until(() => s.dialog.active, 'wake thought on screen');
  assert.equal(s.seen[HOME.wakeSeen], true, 'in memory: playing');
  const disk = closeAndReload(s, storage);
  assert.ok(disk, 'checkpoint written right before the scene');
  assert.ok(!disk.seen[HOME.wakeSeen], 'not marked seen on disk -> plays again');
  assert.ok(disk.flags.includes(HOME.started));
  s.releaseTalk();
  await until(() => !s.busy, 'scene done');
  assert.equal(new SaveStore(storage).load().seen[HOME.wakeSeen], true, 'saved as seen after it ended');
});

test('trigger-spot cutscene: seenDay is not checkpointed, so a close mid-scene replays it', async () => {
  const { s, storage } = await scene({ map: 'house_1f', flags: [HOME.started] });
  s.player.place(2, 2, 'down');
  s.spots = [{ kind: 'trigger', key: 'test.trigger', stand: [2, 2], pages: ['A scene.'] }];
  s.runSpot = async () => { s._holdTalk = true; await s.say(['A scene.']); };
  s._checkTriggers();
  await until(() => s.dialog.active, 'trigger scene playing');
  const disk = closeAndReload(s, storage);
  assert.ok(!disk.seenDay['trigger:test.trigger'], 'trigger not marked seen on disk');
  s.releaseTalk(); await until(() => !s.busy, 'done');
  assert.equal(new SaveStore(storage).load().seenDay['trigger:test.trigger'], 0);
});

test('wild battle -> close mid-battle: back before the encounter (no damage / catch on disk); after the battle saves', async () => {
  const party = [createCreature({ species: 'cindrip', level: 5 })];
  const { s, storage } = await scene({ map: 'route1', party });
  const fullHp = party[0].hp;
  s.player.place(6, 6, 'up');
  let finish = null;
  const st = installWildEncounters(s, () => new Promise((res) => { s.party[0].hp = 2; s.party.push(createCreature({ species: 'tumbloam', level: 3 })); s._dirty = true; finish = res; }));
  await st.ready;
  st.roller = { step: () => ({ species: 'tumbloam', level: 3, table: 't' }), resetGrace() {}, data: { zones: {} } };
  s.hooks.onEncounterTile(6, 6, 1);
  await until(() => !!finish, 'battle open');
  const disk = closeAndReload(s, storage);
  assert.deepEqual(disk.pos, { map: 'route1', x: 6, y: 6, facing: 'up' }, 'pre-encounter position');
  assert.equal(disk.party.length, 1, 'no catch on disk');
  assert.equal(disk.party[0].hp, fullHp, 'no battle damage on disk');
  finish();
  await until(() => !s.busy, 'battle closed');
  const after = new SaveStore(storage).load();
  assert.equal(after.party.length, 2); assert.equal(after.party[0].hp, 2, 'normal save after the battle');
});

test('locks: battle / evolution UI guards, explicit locks, dialog box; manual save hidden + refused in the menu', async () => {
  const { s, storage } = await scene({ map: 'house_1f' });
  s.player.place(3, 3, 'down');
  assert.equal(s.saveLocked, false); assert.equal(s.saveNow(), true);
  let open = 'battle'; s.saveGuards.push(() => open);
  assert.equal(s.saveLockReason(), 'battle'); assert.equal(s.saveNow(), false); assert.equal(s._dirty, true);
  open = null;
  const rel = s.lockSave('cutscene'); assert.equal(s.saveLockReason(), 'cutscene'); rel(); rel(); assert.equal(s.saveLocked, false, 'release is idempotent');
  s.dialog.active = true; assert.equal(s.saveLockReason(), 'dialogue'); s.dialog.active = false;
  s.intro.picker = { active: true }; assert.equal(s.saveLockReason(), 'starter_pick'); s.intro.picker = null;
  assert.equal(s.saveNow(), true);
  assert.ok(new SaveStore(storage).load());
  const ui = fs.readFileSync(path.join(ROOT, 'src/ui/ui.js'), 'utf8');
  assert.match(ui, /\.filter\(\(\[k\]\) => k !== 'save' \|\| !this\.scene\.saveLocked\)/, 'phone menu hides the save entry while locked');
  assert.match(ui, /scr_save\(\) \{\s*const run = async \(\) => \{\s*if \(this\.scene\.saveLocked\)/, 'save screen refuses while locked');
  assert.match(ui, /scene\.saveGuards\?\.push\(\(\) => \(ui\.stack\.some\(\(s\) => s\.scr === 'battle'\)/, 'battle screen guard');
  const ow = fs.readFileSync(path.join(ROOT, 'src/overworld/overworld.js'), 'utf8');
  assert.equal((ow.match(/this\.store\.save\(/g) || []).length, 1, 'one write path: saveNow');
  assert.match(ow, /async script\(fn\) \{\s*if \(this\.busy\) return;\s*this\.checkpoint\(/, 'checkpoint before every script');
});

test('old saves: a v1 save written by the old module still loads, and the checkpoint keeps the same save shape', async () => {
  const storage = memStorage();
  new SaveStoreV1(storage, SAVE_KEY).save({ flags: ['talked_ron_morning'], counters: {}, seen: {}, clock: { day: 2, min: 600 }, party: [], pos: { map: 'brookhollow', x: 5, y: 6, facing: 'down' } });
  const old = new SaveStore(storage).load();
  assert.ok(old.flags.includes('talked_ron_morning')); assert.equal(old.pos.map, 'brookhollow');
  const { s } = await scene({ map: 'house_1f' });
  s.player.place(3, 3, 'down');
  const keys = Object.keys(s.saveData()).sort();
  assert.equal(s.checkpoint('test'), true);
  assert.deepEqual(Object.keys(s.saveData()).sort(), keys, 'no new save fields');
});

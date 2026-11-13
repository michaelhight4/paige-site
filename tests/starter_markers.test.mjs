// Starter + markers + Ron catch (Oct 23, 2026; Gary 9:32-9:36 AM CT). Run: node --test tests/starter_markers.test.mjs
//  - a new game has an EMPTY party until got_starter; trainers never open a battle with an empty party (no free Rillop)
//  - Ron catch: no starter + a brookhollow edge exit -> Ron runs up, ron_too_dangerous (variant by flag), walks you back
//  - starter preview panel data (real SPECIES data), highlight moves; arrows: pose / reduced motion; cases from page 2
//  - quest markers: "quest item shows its marker, giver shows none"
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
import { freshSave } from '../src/overworld/save.js';
import { HomeStart, HOME, OPEN, FALLBACK_OFFICE, ronCatchApplies, ronCatchVariant, cradleSpots, INWARD } from '../src/overworld/intro.js';
import { starterCard, moveSel } from '../src/overworld/starter_pick.js';
import { markerPose, MARKER_CAP } from '../src/overworld/marker.js';
import { questItemSpots } from '../src/overworld/quest_markers.js';
import { QuestBook, QFLAG } from '../src/progression/quests.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const LINES = readJson(CONFIG.textLines);
const TS = indexTileset(readJson('art/world/overworld/tileset.json'));
const MAP = (n) => readJson(CONFIG.mapsDir + n + '.json');
globalThis.fetch = async (url) => {
  const p = path.join(ROOT, String(url).replace(/^https?:\/\/[^/]+\//, ''));
  return fs.existsSync(p) ? { ok: true, status: 200, json: async () => JSON.parse(fs.readFileSync(p, 'utf8')) } : { ok: false, status: 404 };
};

async function scene({ map = 'brookhollow', flags = [HOME.started, HOME.briefed], party = [] } = {}) {
  const s = Object.create(Overworld.prototype);
  const said = [], battles = [];
  Object.assign(s, {
    mapCache: new Map(), config: CONFIG, lines: LINES, tilesetIndex: TS, opts: {}, input: {}, hooks: { onBattle: async (w) => { battles.push(w); return true; } },
    flags: new Set(flags), party: [...party], seen: {}, seenDay: {}, counters: {}, clock: { day: 0, min: 480 }, log: [], tick: 0,
    busy: false, fade: null, store: null, systems: null, timescale: 0, zoom: 2, stillSince: 0, healedAt: null, layout: null,
    rustles: new Map(), audio: null, spriteMap: {}, canvas: { width: 1920, height: 1080 },
    dialog: { active: false, say: async (pages, sp) => { said.push({ pages, sp }); }, ask: async () => 0 },
  });
  s._onPlayerStep = () => {}; s._isRustleTile = () => false; s.saveNow = () => {};
  s.npcs = new NpcSystem(s);
  s.map = await s.loadMap(map);
  s.player = new GridMover({ x: 0, y: 0, facing: 'down' });
  s.intro = new HomeStart(s, { newGame: true });
  return { s, said, battles };
}
/** 60 Hz-ish world loop for scripted walks (npcs + player). */
function run(s) {
  const id = setInterval(() => { for (let i = 0; i < 4; i++) { s.tick++; s.npcs.tick(false); s.player.tick({ dir: null }, s.worldApi()); s.intro._tickCatchRon(); } }, 1);
  return () => clearInterval(id);
}
async function idle(s, ms = 15000) { const t0 = Date.now(); while (s.busy && Date.now() - t0 < ms) await new Promise((r) => setTimeout(r, 5)); assert.equal(s.busy, false, 'script finished'); }

/** The walkable tiles of an exit on its edge (by `to` name, padding-safe). */
function exitCells(m, to) {
  const e = m.exits.find((x) => x.to === to), out = [];
  for (let k = e.start; k <= e.end; k++) {
    const [x, y] = e.edge === 'north' ? [k, 0] : e.edge === 'south' ? [k, m.height - 1] : e.edge === 'west' ? [0, k] : [m.width - 1, k];
    if (m.code(x, y) === Col.WALK) out.push({ x, y, exit: e });
  }
  return out;
}

test('new game: the party is EMPTY (no free Kilumen) and nothing seeds a default lead', () => {
  assert.deepEqual(freshSave().party, []);
  for (const k of ['lead', 'startParty', 'starter', 'party']) assert.equal(CONFIG[k], undefined, `CONFIG.${k} must not seed a creature`);
});

test('no creature yet: a trainer never opens a battle (the battle screens would lend a placeholder Rillop)', async () => {
  const { s, said, battles } = await scene({ map: 'fernwick' });
  const d = MAP('fernwick').npcs.find((n) => n.id === 'ron_rival_1');
  s.talk(null, d);
  await idle(s);
  assert.equal(battles.length, 0);
  assert.ok(s.log.some((e) => e.type === 'battleRefused' && e.reason === 'no_party'));
  assert.equal(said.at(-1).sp.thought, true);
  // with a creature: Ron battle 1 is unchanged
  const t = await scene({ map: 'fernwick', party: [{ species: 'rillop' }] });
  t.s.talk(null, d); await idle(t.s);
  assert.equal(t.battles.length, 1);
});

test('Ron catch applies before the starter only, in brookhollow, on edge exits; variant by flag', () => {
  const F = (...f) => new Set(f);
  assert.equal(ronCatchApplies(F(), 'brookhollow', { to: 'route1' }, 0), true, 'every save without a creature (old alpha saves too)');
  assert.equal(ronCatchApplies(F(OPEN.starter), 'brookhollow', { to: 'route1' }, 0), false, 'never once got_starter');
  assert.equal(ronCatchApplies(F(), 'brookhollow', { to: 'route1' }, 1), false, 'never with a creature (dev ?lead=)');
  assert.equal(ronCatchApplies(F(), 'route1', { to: 'fernwick' }, 0), false);
  assert.equal(ronCatchVariant(F()), 'default');
  assert.equal(ronCatchVariant(F(OPEN.promoted)), 'promoted');
  assert.equal(ronCatchVariant(F(OPEN.promoted, OPEN.starter)), 'default');
});

for (const to of ['route1', 'route_east']) {
  test(`exit block before the starter: every ${to} exit tile -> Ron runs up, says ron_too_dangerous, walks the player back`, async () => {
    const m0 = (await scene()).s.map, cells = exitCells(m0, to);
    assert.ok(cells.length, `walkable ${to} exit tiles`);
    for (const c of cells) {
      for (const flags of [[HOME.started, HOME.briefed], [HOME.started, HOME.briefed, OPEN.promoted], []]) {
        const { s, said } = await scene({ flags });
        const inward = INWARD[c.exit.edge];
        s.player.place(c.x, c.y, { down: 'up', up: 'down', left: 'right', right: 'left' }[inward]);
        assert.equal(s.intro.onEdge(c.exit), true, 'refused');
        assert.equal(s.busy, true, 'input frozen (script)');
        const stop = run(s);
        try { await idle(s); } finally { stop(); }
        const v = ronCatchVariant(new Set(flags));
        assert.deepEqual(said[0].pages, FALLBACK_OFFICE.ron_too_dangerous[v]);
        assert.equal(said[0].sp.name, 'Ron');
        assert.ok(s.log.some((e) => e.step === 'ronCatch'));
        const moved = Math.abs(s.player.x - c.x) + Math.abs(s.player.y - c.y);
        assert.ok(moved >= 2, `walked back into town from ${c.x},${c.y} (moved ${moved})`);
        assert.equal(s.player.locked, false, 'never trapped: input comes back');
        assert.ok(!s.log.some((e) => e.type === 'warp'), 'did not leave town');
      }
    }
  });
}

test('starter panel data is the real SPECIES data; left / right move the highlight', () => {
  const c = starterCard('cindrip');
  assert.equal(c.name, 'Cindrip'); assert.deepEqual(c.el, ['fire']); assert.deepEqual(c.elLabels, ['Fire']);
  assert.match(c.idle, /cindrip_front_idle_2x\.gif$/); assert.ok(fs.existsSync(path.join(ROOT, c.idle)), 'idle GIF exists');
  assert.ok(fs.existsSync(path.join(ROOT, c.still)), 'still sprite exists');
  assert.equal(moveSel(0, 'right', 3), 1); assert.equal(moveSel(0, 'left', 3), 2); assert.equal(moveSel(2, 'right', 3), 0);
});

test('starter case arrows: from scene_starter_intro page 2 until got_starter; reduced motion = still', async () => {
  const { s, said } = await scene({ map: OPEN.lab, flags: [HOME.started, HOME.briefed, OPEN.promoted] });
  assert.equal(s.intro.markerSpots().length, 0, 'not before the intro');
  let atPage2 = null;
  s.dialog.say = async (pages, sp) => { said.push({ pages, sp }); if (atPage2 == null && /spinning/.test(pages.join(' '))) atPage2 = s.intro.markerSpots().length; };
  await s.intro.starterIntro();
  assert.equal(FALLBACK_OFFICE.scene_starter_intro.length, 4);
  assert.equal(atPage2, 3, 'arrows already on while page 2 is shown');
  const spots = s.intro.markerSpots();
  assert.deepEqual(spots.map((p) => p.id).sort(), ['cradle_1', 'cradle_2', 'cradle_3']);
  assert.deepEqual(cradleSpots(s.map, OPEN.cradles).length, 3);
  s.setFlag(OPEN.starter);
  assert.equal(s.intro.markerSpots().length, 0, 'hidden once got_starter');
  const a = markerPose(0, true), b = markerPose(700, true);
  assert.deepEqual(a, b); assert.equal(a.bob, 0);
  assert.notDeepEqual(markerPose(0), markerPose(350));
  assert.ok(MARKER_CAP >= 3);
});

test('quest item shows its marker, giver shows none', async () => {
  const qb = new QuestBook(readJson('data/quests.json'));
  const q = qb.quests.find((x) => x.id === 'sq_missing_note');
  const m = { name: 'route1', items: MAP('route1').items, npcs: MAP('route1').npcs };
  const flags = new Set();
  flags.add(QFLAG.on(q.id)); flags.add('flg_missing_note_started'); // the DJ (giver) gave it
  const st = qb.status(q, flags);
  assert.ok(['active', 'ready'].includes(st), `sq_missing_note open for the test (${st})`);
  const spots = questItemSpots(qb, flags, m);
  assert.ok(spots.some((p) => p.id && p.quest === 'sq_missing_note'), 'the quest item has a marker');
  const npcCells = new Set(m.npcs.map((n) => `${n.x},${n.y}`));
  assert.ok(spots.every((p) => !npcCells.has(`${p.x},${p.y}`)), 'no NPC (giver) cell has a marker');
  const club = { name: 'club_int', items: MAP('club_int').items || [], npcs: MAP('club_int').npcs };
  assert.equal(questItemSpots(qb, flags, club).length, 0, 'the giver map (club_int) shows nothing');
  const pickup = spots.find((p) => p.quest === 'sq_missing_note'), it = m.items.find((i) => i.id === pickup.id);
  flags.add(it.flag || `item_route1_${it.id}`);
  assert.ok(!questItemSpots(qb, flags, m).some((p) => p.id === pickup.id), 'gone once collected');
});

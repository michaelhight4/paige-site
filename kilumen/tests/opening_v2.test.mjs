// Opening v2 (Gary spec, v0.2.111-alpha): Ondravel identity, rain wake on route1, company-feed companion, bedroom, join at promotion.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { OPEN2, CUTE_R1, FALLBACK, openLines, rollCompanion, isNoQuest, cleanName, opening2On, arrivalBeat, identityConfig, OpeningV2, MODELS } from '../src/overworld/opening_v2.js';
import { ownedLogged } from '../src/overworld/intro.js';

const flagsOf = (...a) => { const f = new Set(a); return f; };
const fakeScene = (o = {}) => {
  const said = [];
  const s = { flags: flagsOf(), seen: {}, map: { name: OPEN2.map }, player: { x: 21, y: 34, facing: 'up', moving: false, _attempt(d) { s.attempt = d; } },
    log: [], tick: 0, lines: null, say: async (l) => { said.push(l); }, script: (fn) => { s.pending = fn(); }, worldApi: () => ({}), ...o };
  s.said = said; return s;
};

test('cute pool: region-1 sunmeadow grass weights, roll covers every species', () => {
  assert.deepEqual(CUTE_R1.map((c) => c.species), ['mossmote', 'drizzlebill', 'buoyling', 'pandember', 'gladlet', 'lumoris']);
  const total = CUTE_R1.reduce((a, c) => a + c.weight, 0);
  const got = new Set(); for (let i = 0; i < total; i++) got.add(rollCompanion(() => (i + 0.5) / total));
  assert.equal(got.size, CUTE_R1.length);
  assert.equal(rollCompanion(() => 0), 'mossmote');
  assert.equal(rollCompanion(() => 0.9999), 'lumoris');
});

test('arrivalBeat: north of the grass turns back; leaving grass unfed battles once', () => {
  assert.equal(arrivalBeat({ fed: false, wasGrass: true, grass: false, y: OPEN2.northCut }), 'north');
  assert.equal(arrivalBeat({ fed: true, wasGrass: false, grass: false, y: 30 }), 'north');
  assert.equal(arrivalBeat({ fed: false, wasGrass: true, grass: false, y: 39 }), 'battle');
  assert.equal(arrivalBeat({ fed: true, wasGrass: true, grass: false, y: 39 }), null);
  assert.equal(arrivalBeat({ fed: false, wasGrass: true, grass: true, y: 37 }), null);
});

test('cleanName / identityConfig / opening2On', () => {
  assert.equal(cleanName('  Pai   ge  '), 'Pai ge');
  assert.equal(cleanName('<b>{x}</b>'), 'bx/b');
  assert.equal(cleanName(''), 'Cal');
  assert.equal(cleanName('x'.repeat(40)).length, OPEN2.nameMax);
  const base = Object.freeze({ playerName: 'Cal', playerSheets: { walk: 'a.png', run: 'r.png' } });
  const f = identityConfig(base, 'Mira', 'female');
  assert.equal(f.playerName, 'Mira'); assert.match(JSON.stringify(f.playerSheets.walk), /vil_commuter_f/); assert.match(JSON.stringify(f.playerSheets.run), /vil_commuter_f_chibi_run/); assert.match(JSON.stringify(f.playerSheets.bike), /vil_commuter_f_chibi_bike/);
  assert.equal(identityConfig(base, 'Bo', 'male').playerSheets, base.playerSheets);
  assert.equal(opening2On(new URLSearchParams('opening=v1')), false);
  assert.equal(opening2On(new URLSearchParams('')), true);
});

test('strings: every fallback key lives in text/overworld_lines.json opening_v2, and openLines falls back', () => {
  const j = JSON.parse(readFileSync(new URL('../text/overworld_lines.json', import.meta.url), 'utf8'));
  for (const k of Object.keys(FALLBACK)) assert.ok(openLines(j, k)?.length, k);
  assert.deepEqual(openLines(j, 'turn_back'), ['I really need to get home and out of this rain.']);
  assert.deepEqual(openLines(null, 'turn_back'), FALLBACK.turn_back);
  assert.deepEqual(openLines({ opening_v2: { turn_back: ['X'] } }, 'turn_back'), ['X']);
});

test('companion is flagged noQuest and never counts toward the catch quest', () => {
  const comp = { species: 'mossmote', origin: { how: 'companion', noQuest: true } };
  assert.equal(isNoQuest(comp), true); assert.equal(isNoQuest({ species: 'nibbin' }), false);
  assert.equal(ownedLogged({ party: [comp, { species: 'nibbin' }] }), 1);
});

test('walking toward Fernwick: edge refused, line shown, player turned to face Brookhollow (south)', async () => {
  const s = fakeScene({ flags: flagsOf(OPEN2.active) });
  const o = new OpeningV2(s, { run: true });
  assert.equal(o.onEdge({ to: 'fernwick' }), true);
  await s.pending;
  assert.deepEqual(s.said[0], ['I really need to get home and out of this rain.']);
  assert.equal(s.player.facing, 'down'); assert.equal(s.attempt, 'down');
  assert.equal(o.onEdge({ to: OPEN2.home }), false, 'home before the feed: normal rules');
  s.flags.add(OPEN2.fed); assert.equal(o.onEdge({ to: OPEN2.home }), 'go');
  s.flags.add(OPEN2.done); assert.equal(o.onEdge({ to: 'fernwick' }), false, 'after the opening: not ours');
});

test('ghostLead: trails after the feed, static in the bedroom, gone once joined', () => {
  const s = fakeScene({ flags: flagsOf(OPEN2.active), seen: { [OPEN2.compKey]: { species: 'buoyling', level: 3 } } });
  const o = new OpeningV2(s, { run: true });
  assert.equal(o.ghostLead(), null, 'not fed yet');
  s.flags.add(OPEN2.fed); assert.deepEqual(o.ghostLead(), { species: 'buoyling', warmth: 0 });
  s.flags.add(OPEN2.done); s.map = { name: OPEN2.bedroom, json: { player_start: { x: 3, y: 3 } }, inBounds: () => true, code: () => 0 };
  const g = o.ghostLead(); assert.equal(g.static, true); assert.deepEqual([g.x, g.y], [5, 3]);
  s.map = { name: OPEN2.home }; assert.equal(o.ghostLead(), null, 'stays in the room');
  s.flags.add('flg_promoted'); assert.equal(o.joinDue(), true);
  s.flags.add(OPEN2.joined); assert.equal(o.ghostLead(), null); assert.equal(o.joinDue(), false);
});

test('model art: every card and sheet path exists', () => {
  for (const m of Object.values(MODELS)) {
    const paths = [m.card, ...Object.values(m.sheets || {}).flatMap((v) => Object.values(v))];
    for (const rel of paths) assert.ok(existsSync(new URL('../' + rel, import.meta.url)), rel);
  }
});

test('fix1: female run/bike/back art exists on Cal grids; route1 empty + tasks held in the opening', async () => {
  const fs = await import('node:fs'); const { MODELS } = await import('../src/overworld/opening_v2.js');
  const sz = (p) => { const b = fs.readFileSync(new URL('../' + p, import.meta.url)); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
  assert.deepEqual(sz(MODELS.female.sheets.run[1]), [384, 384]); assert.deepEqual(sz(MODELS.female.sheets.bike[1]), [320, 384]);
  assert.deepEqual(sz(MODELS.female.sheets.bike[3]), [960, 1152]);
  assert.deepEqual(sz('art/characters/pixel/npcs/vil_commuter_f/vil_commuter_f_back_battle.png'), [64, 96]);
  assert.match(fs.readFileSync(new URL('../src/overworld/feed_battle.js', import.meta.url), 'utf8'), /female: 'art\/characters\/pixel\/npcs\/vil_commuter_f\/vil_commuter_f_back_battle\.png'/);
  assert.match(fs.readFileSync(new URL('../src/progression/index.js', import.meta.url), 'utf8'), /scene\.opening2\?\.inSequence\) \{ hud\?\.update\(\); return; \}/);
  assert.match(fs.readFileSync(new URL('../src/overworld/npcs.js', import.meta.url), 'utf8'), /map\.name === 'route1' && this\.scene\?\.opening2\?\.inSequence/);
});

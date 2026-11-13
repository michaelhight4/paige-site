// Progression pass (Oct 23, 2026, overnight coder): Masters 1-8, hall puzzles 2-8, data-driven quests (src/progression/*).
import test from 'node:test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { progressionFlags, PROGRESSION_DEFAULTS } from '../src/progression/flags.js';
import { registerMasterResults, teamFor, findHallTrainer, coinsFromFlags, awardMaster, hallByZone } from '../src/progression/masters.js';
import { HallPuzzle, KINDS, solve, trivial } from '../src/progression/puzzles.js';
import { QuestBook, QFLAG } from '../src/progression/quests.js';
import { buildCreatures } from '../src/battle/data/creatures.js';
import { KilumenBattle } from '../src/battle/battle.js';
import { TRAINER_RESULTS, trainerOutcome } from '../src/battle/story.js';
import { coinCount } from '../src/overworld/lines.js';

const R = (p) => JSON.parse(readFileSync(new URL('../' + p, import.meta.url)));
const masters = R('data/masters.json'), quests = R('data/quests.json');
const engine = new Set(Object.keys(buildCreatures()));
const BANNED = [/\bPP\b/, /shiny/i, /super effective/i, /Pok[eé]dex/i, /Pok[eé] ?Ball/i, /Gotcha!/i, /\bnurse\b/i, /\b(beer|wine|whisk(e)?y|vodka|rum|ale|alcohol|drunk|cigar(ette)?s?|smok(e|ing)|drugs?)\b/i];
const words = (o) => JSON.stringify(o);

const PG_ALPHA = /ALPHA build: \?pg= ignored/.test(fs.readFileSync(new URL('../src/progression/flags.js', import.meta.url), 'utf8')); // live alpha ignores ?pg=

test('flags: half-done features default off, ?pg= toggles', () => {
  assert.equal(PROGRESSION_DEFAULTS.quests, false);
  assert.equal(PROGRESSION_DEFAULTS.hallPuzzles, false);
  assert.equal(PROGRESSION_DEFAULTS.masterGifts, false);
  assert.equal(PROGRESSION_DEFAULTS.masterTeamFernwick, false);
  const f = progressionFlags(new URLSearchParams('pg=quests,-masters'));
  if (PG_ALPHA) { assert.deepEqual(f, { ...PROGRESSION_DEFAULTS }); return; }
  assert.equal(f.quests, true); assert.equal(f.masters, false);
  assert.ok(Object.values(progressionFlags(new URLSearchParams('pg=all'))).every(Boolean));
});

test('masters: 8 halls in coin order, names read as-is from Game dev, teams playable by the engine', () => {
  assert.equal(masters.halls.length, 8);
  assert.deepEqual(masters.halls.map((h) => h.coin_number), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(hallByZone(masters, 'lanternport').master.name_placeholder, 'Delphine Orrin');
  assert.ok(!words(masters).includes('Isolde Vane'));
  for (const h of masters.halls) {
    assert.match(h.flag, /^beat_master_/);
    assert.ok(h.master.team.length >= 2, h.zone);
    for (const t of [h.master, ...h.trainers]) for (const m of t.team) {
      assert.ok(engine.has(m.battle_species), `${h.zone} ${t.id} ${m.battle_species}`);
      assert.ok(m.level >= 2 && m.level <= 100);
      assert.equal(m.stand_in, m.species !== m.battle_species);
    }
    assert.ok(h.master.ace_level >= Math.max(...h.trainers.flatMap((t) => t.team.map((m) => m.level))), h.zone);
  }
  const aces = masters.halls.map((h) => h.master.ace_level);
  assert.deepEqual(aces, aces.slice().sort((a, b) => a - b));
});

test('masters: results register for halls 2-8 without touching Fernwick, each win = one coin', () => {
  const res = { 'fernwick_hall_int.master_fernwick': { win: ['beat_master_fernwick'] } };
  const added = registerMasterResults(masters, res);
  assert.equal(added.length, 7);
  assert.deepEqual(res['fernwick_hall_int.master_fernwick'], { win: ['beat_master_fernwick'] });
  const flags = new Set();
  for (const h of masters.halls) {
    const r = res[`${h.hall_map}.${h.master.id}`];
    assert.deepEqual(r.win, [h.flag]);
    flags.add(h.flag);
    assert.equal(coinCount(flags), h.coin_number, h.zone);
  }
  assert.deepEqual(coinsFromFlags(masters, flags), [1, 2, 3, 4, 5, 6, 7, 8]);
  // live table: the same registration on story.js's object works with trainerOutcome
  registerMasterResults(masters, TRAINER_RESULTS);
  assert.deepEqual(trainerOutcome('saltmere_hall_int', 'master_saltmere', true).flags, ['beat_master_saltmere']);
  assert.deepEqual(trainerOutcome('saltmere_hall_int', 'master_saltmere', false).flags, []);
  assert.deepEqual(trainerOutcome('fernwick_hall_int', 'master_fernwick', true).flags, ['beat_master_fernwick']);
});

test('masters: battle teams + award (gift placeholder only when switched on and the item exists)', () => {
  assert.equal(teamFor(masters, 'fernwick_hall_int', 'master_fernwick'), null); // live Fernwick unchanged unless masterTeamFernwick
  assert.ok(teamFor(masters, 'fernwick_hall_int', 'master_fernwick', { fernwick: true }).foes.length >= 2);
  const t = teamFor(masters, 'cindervale_hall_int', 'master_cindervale');
  assert.equal(t.foeName, hallByZone(masters, 'cindervale').master.name_placeholder);
  assert.equal(findHallTrainer(masters, 'cindervale_hall_int', masters.halls[7].trainers[0].id).isMaster, false);
  const kb = new KilumenBattle({ party: [{ species: 'cindrip', level: 60 }], foes: t.foes, wild: false, seed: [1, 2, 3, 4], foeName: t.foeName });
  assert.ok(kb);
  const added = [], sys = { bag: { def: (id) => id === 'vigor_seed', add: (id, n) => { added.push([id, n]); return { ok: true }; } } };
  const rec = {};
  const off = awardMaster(hallByZone(masters, 'cindervale'), { sys, gifts: false, record: rec });
  assert.equal(off.giftStatus, 'off'); assert.deepEqual(rec.cindervale, { coin: 8, flag: 'beat_master_cindervale' });
  assert.equal(awardMaster(hallByZone(masters, 'cindervale'), { sys, gifts: true }).giftStatus, 'given');
  assert.deepEqual(added, [['vigor_seed', 3]]);
  assert.equal(awardMaster(hallByZone(masters, 'saltmere'), { sys, gifts: true }).giftStatus, 'placeholder_unknown_item');
});

const PUZ = readdirSync(new URL('../data/hall_puzzles/', import.meta.url)).filter((f) => f.endsWith('.json'));
test('hall puzzles: one per hall 2-8, all 7 kinds', () => {
  const zones = PUZ.map((f) => f.replace('.json', '')).sort();
  assert.deepEqual(zones, masters.halls.slice(1).map((h) => h.zone).sort());
  assert.deepEqual(PUZ.map((f) => R('data/hall_puzzles/' + f).kind).sort(), Object.keys(KINDS).sort());
});
for (const f of PUZ) test(`hall puzzle ${f}: solvable (BFS), not trivial, solution replays, solved state saves`, () => {
  const def = R('data/hall_puzzles/' + f);
  assert.match(def.solved_flag, /^puzzle_.+_hall_solved$/);
  assert.equal(trivial(def), false, 'goal reachable without using the puzzle');
  const r = solve(def); assert.ok(r, 'unsolvable');
  assert.equal(r.path.length, def.verified.length, 'layout changed: rerun the generator');
  const p = new HallPuzzle(def); let solvedNow = false;
  for (const a of r.path) { const o = p.act(a); assert.ok(o.ok, a); solvedNow ||= o.solvedNow; }
  assert.ok(solvedNow && p.solved);
  const back = new HallPuzzle(def, JSON.parse(JSON.stringify(p.toJSON())));
  assert.ok(back.solved); assert.equal(back.x, p.x);
});
test('hall puzzles: reset tile restores the start state (saltmere)', () => {
  const def = R('data/hall_puzzles/saltmere.json'), p = new HallPuzzle(def);
  p.act('L'); p.act('L'); p.act('U'); p.act('AL');
  assert.notDeepEqual(p.st, { h: def.heights });
  p.act('D'); for (let i = 0; i < 6; i++) p.act('R'); p.act('U'); // to the reset tile 'R' (9,5)
  assert.equal(p.g.at(p.x, p.y), 'R'); assert.deepEqual(p.st, { h: def.heights });
});

test('quests: 50 converted per SCHEMA.md (16 main, 34 side), valid and clean', () => {
  assert.equal(quests.quests.length, 50);
  assert.deepEqual(quests._meta.counts, { main: 16, side: 34 });
  const ids = new Set();
  for (const q of quests.quests) {
    assert.ok(!ids.has(q.id), q.id); ids.add(q.id);
    assert.ok(q.title && q.steps.length, q.id);
    assert.ok(['auto', 'npc'].includes(q.start) && ['auto', 'npc'].includes(q.turn_in), q.id);
    if (q.start === 'npc') assert.ok(q.giver?.npc && q.giver?.map, q.id);
    for (const s of q.steps) assert.ok(s.id && s.desc, q.id);
    for (const B of BANNED) assert.ok(!B.test(words(q)), `${q.id}: ${B}`);
  }
  for (const h of masters.halls) for (const B of BANNED) assert.ok(!B.test(words(h)), `${h.zone}: ${B}`);
});

test('quests: state machine (auto main, npc give / turn-in, flagless steps by visiting, rewards)', () => {
  const qb = new QuestBook(quests), flags = new Set();
  const run = (env) => { const acts = qb.update({ flags, ...env }); for (const a of acts) { if (a.type === 'start') flags.add(QFLAG.on(a.q.id)); if (a.type === 'set') flags.add(a.flag); if (a.type === 'complete') { flags.add(QFLAG.done(a.q.id)); flags.delete(QFLAG.on(a.q.id)); } } return acts; };
  const main = quests.quests.find((q) => q.type === 'main' && !q.prerequisites.length);
  assert.equal(qb.status(main, flags), 'available');
  assert.ok(run({ map: 'nowhere', x: 0, y: 0 }).some((a) => a.type === 'start' && a.q === main));
  assert.equal(qb.status(main, flags), 'active');
  const s1 = main.steps[0];
  if (!s1.flag && s1.map) { run({ map: s1.map, x: s1.at?.x ?? 0, y: s1.at?.y ?? 0 }); assert.ok(qb.stepDone(main, s1, flags)); }
  for (const s of qb.required(main)) if (s.flag) flags.add(s.flag);
  assert.ok(run({ map: 'nowhere', x: 0, y: 0 }).some((a) => a.type === 'complete' && a.q === main));
  assert.equal(qb.status(main, flags), 'done');
  assert.deepEqual(qb.rewards(main).items, []); // main quests: story-driven, no double items
  // npc side quest
  const side = quests.quests.find((q) => q.start === 'npc' && q.turn_in === 'npc' && q.prerequisites.every((f) => flags.has(f)) && qb.required(q).length >= 2) ||
    quests.quests.find((q) => q.start === 'npc' && q.turn_in === 'npc');
  for (const f of side.prerequisites) flags.add(f);
  assert.equal(qb.talkAction(side.giver.map, side.giver.npc, flags).type, 'give');
  assert.equal(qb.talkAction(side.giver.map, 'someone_else', flags), null);
  flags.add(QFLAG.on(side.id));
  for (const s of qb.required(side).slice(0, -1)) { if (s.flag) flags.add(s.flag); else (qb.state.steps[side.id] ||= []).push(s.id); }
  assert.equal(qb.status(side, flags), 'ready');
  assert.equal(qb.talkAction(side.giver.map, side.giver.npc, flags).type, 'turn_in');
  const rw = qb.rewards(side);
  assert.ok(rw.flags.every((f) => side.new_ids.includes(f)));
  // save round trip + tracker
  const qb2 = new QuestBook(quests, JSON.parse(JSON.stringify(qb.toJSON())));
  assert.equal(qb2.status(side, flags), 'ready');
  qb2.state.tracked = side.id; assert.equal(qb2.tracked(flags), side);
  assert.ok(qb2.log(flags).length >= 2);
});

// ---- Coder halls wiring (Oct 23, 2026): hall maps 2-8 built, triggers, text fallback, Mirefen darkness ----------------
import { existsSync } from 'node:fs';
import { hallNpc, registerHallNpcResults } from '../src/progression/masters.js';
import { hallEntry, lampCell, lightAt, litLamps } from '../src/progression/halls.js';
const MAPS = 'art/world/overworld/maps/';
const lines = R('text/overworld_lines.json');

test('halls: map_built matches the real hall maps (fernwick + 7 overnight halls)', () => {
  for (const h of masters.halls) assert.equal(h.map_built, existsSync(new URL(`../${MAPS}${h.hall_map}.json`, import.meta.url)), h.zone);
  assert.equal(masters.halls.filter((h) => h.map_built).length, 8);
  for (const z of ['tidewater_coast', 'mirefen']) assert.ok(hallByZone(masters, z).map_built, z);
});

test('halls: each town door warps into its hall and the hall warps back out', () => {
  for (const h of masters.halls) {
    const town = R(`${MAPS}${h.zone}.json`), hall = R(`${MAPS}${h.hall_map}.json`);
    const door = town.warps.find((w) => w.to === h.hall_map);
    assert.ok(door, `${h.zone} has a door to ${h.hall_map}`);
    assert.ok(door.tx >= 0 && door.tx < hall.width && door.ty >= 0 && door.ty < hall.height, `${h.zone} door lands inside`);
    assert.ok(hall.warps.some((w) => w.to === h.zone), `${h.hall_map} warps back to ${h.zone}`);
  }
});

test('halls: every placed hall NPC maps to a masters.json role; Master win sets the beat flag (= coin)', () => {
  const res = { ...TRAINER_RESULTS };
  registerMasterResults(masters, res); registerHallNpcResults(masters, res);
  for (const h of masters.halls.filter((x) => x.zone !== 'fernwick')) {
    const hall = R(`${MAPS}${h.hall_map}.json`), npcs = [...(hall.npcs || []), ...(hall.npcs_pending_text || [])];
    const roles = npcs.map((n) => hallNpc(masters, h.hall_map, n.id)?.role);
    assert.equal(roles.filter((r) => r === 'master').length, 1, h.zone);
    assert.equal(roles.filter((r) => r === 'trainer').length, h.trainers.length, h.zone);
    assert.ok(roles.includes('guide'), h.zone);
    const mid = `${h.hall_map}_master`;
    assert.deepEqual(res[`${h.hall_map}.${mid}`].win, [h.flag]);
    assert.ok(teamFor(masters, h.hall_map, mid).isMaster);
    assert.equal(teamFor(masters, h.hall_map, `${h.hall_map}_h1`).foes.length, h.trainers[0].team.length);
    const r = awardMaster(findHallTrainer(masters, h.hall_map, mid).hall, { record: {} });
    assert.equal(r.coinNumber, h.coin_number);
  }
  assert.equal(res['fernwick_hall_int.fernwick_hall_int_master'], undefined, 'live Fernwick ids unchanged');
});

test('halls: text goes through the normal lookup, with draft keys and a clean fallback', () => {
  const def = { id: 'mirefen_hall_int_master' };
  const fb = hallEntry(lines, masters, 'mirefen_hall_int', def, null);
  assert.ok(fb && Array.isArray(fb.battle_lost) && fb.pages.length, 'fallback is a trainer entry');
  assert.ok(!fb._coinLine, 'no coin_handover yet -> placeholder toast');
  const merged = { masters: { mirefen: { pages: ['a'], battle_lost: ['b'], battle_won: ['c'], coin_handover: ['d'] } } };
  const e = hallEntry(merged, masters, 'mirefen_hall_int', def, null);
  assert.deepEqual(e.battle_lost, ['b', 'd']); assert.deepEqual(e.battle_won, ['c']); assert.ok(e._coinLine);
  const live = { pages: ['live'], battle_lost: ['x'] };
  assert.deepEqual(hallEntry(lines, masters, 'mirefen_hall_int', def, live).battle_lost, live.battle_lost, 'maps.<hall>.<id> wins');
  assert.equal(hallEntry(lines, masters, 'mirefen_hall_int', { id: 'mirefen_hall_int_h1' }, live), live, 'trainer entry as is');
  assert.equal(hallEntry(lines, masters, 'fernwick_hall_int', { id: 'master_fernwick' }, null), null, 'Fernwick untouched');
  const tr = { trainers: { hall_saltmere: { h2: { pages: ['p'], battle_lost: ['q'] } } } };
  assert.deepEqual(hallEntry(tr, masters, 'saltmere_hall_int', { id: 'saltmere_hall_int_h2' }, null).pages, ['p']);
  for (const h of masters.halls) for (const id of ['_master', '_h1']) assert.doesNotMatch(words(hallEntry(lines, masters, h.hall_map, { id: h.hall_map + id }) || {}), BANNED[0]);
});

test('mirefen: darkness puzzle follows World Design spec (4 reed lamps, order 3,1,4,2, no fog)', () => {
  const d = R('data/hall_puzzles/mirefen.json'), spec = R('art/world/overworld/qa/autotile_port/integ/mirefen_hall_darkness.json');
  assert.deepEqual(d.darkness.lamps, spec.overlay.lamps);
  assert.deepEqual(d.order, ['3', '1', '4', '2']); assert.deepEqual(d.order, spec.overlay.order);
  assert.equal(d.darkness.kind, 'darkness');
  assert.doesNotMatch(words(d), /fog|haze|mist|smoke/i);
  assert.deepEqual(lampCell(d, '1'), [1, 5]); assert.deepEqual(lampCell(d, '4'), [9, 7]);
  const p = new HallPuzzle(d);
  for (const id of ['1', '2', '3', '4']) assert.equal(p.g.at(...lampCell(d, id)), id, `lamp ${id} cell matches grid`);
  const hall = R(`${MAPS}mirefen_hall_int.json`);
  for (const [x, y] of Object.values(d.darkness.lamps)) assert.ok(x < hall.width && y < hall.height);
  assert.ok(solve(d), 'still solvable'); assert.equal(trivial(d), false);
  // order: 3,1,4,2 lights; a wrong lamp puts them all out
  const touch = (rt, id) => { const [x, y] = lampCell(d, id); return KINDS.boardwalk.touch(d, rt.g, rt.st, x, y); };
  const rt = new HallPuzzle(d);
  rt.st = touch(rt, '3'); rt.st = touch(rt, '1'); assert.deepEqual(litLamps(d, rt.st), ['3', '1']);
  rt.st = touch(rt, '2'); assert.deepEqual(litLamps(d, rt.st), [], 'wrong lamp -> all out');
  for (const id of d.order) rt.st = touch(rt, id);
  assert.equal(rt.st.p, 4);
  assert.equal(lightAt(d, rt.st, 5, 1), 1, 'all lit: full light');
  // darkness: unlit far cell dark; lit lamp lights its run
  const s1 = { p: 1, t: 0 }; const [lx, ly] = lampCell(d, '3');
  assert.equal(lightAt(d, { p: 0, t: 0 }, 9, 1), 0);
  assert.ok(lightAt(d, s1, lx + 1, ly) > 0.5); assert.equal(lightAt(d, s1, 9, 1), 0);
  assert.equal(R('data/masters.json').halls.find((h) => h.zone === 'mirefen').map_built, true);
});

test('halls: hallPuzzles and quests stay off by default, masters on', () => {
  assert.equal(PROGRESSION_DEFAULTS.masters, true); assert.equal(PROGRESSION_DEFAULTS.hallPuzzles, false); assert.equal(PROGRESSION_DEFAULTS.quests, false);
  assert.equal(progressionFlags(new URLSearchParams('pg=hallPuzzles')).hallPuzzles, !PG_ALPHA);
});

// ---- Text Bot merge v0.4.11: six Master keys + Ron 2-6 opener links (Coder, Oct 23 2026) ----
import { masterEntry, withOpener, STORM_FLAG } from '../src/progression/halls.js';
const LINES = R('text/overworld_lines.json');

test('halls: merged Master text wires battle_won, coin_handover, gift, skill_learned, after_storm, horn', () => {
  for (const h of masters.halls.filter((x) => x.zone !== 'fernwick' && x.map_built)) {
    const id = `${h.hall_map}_master`, base = LINES.maps?.[h.hall_map]?.[id];
    const e = hallEntry(LINES, masters, h.hall_map, { id }, base);
    assert.ok(e && !e._fallback, `${id} uses merged text`);
    if (!base) continue;
    for (const k of ['coin_handover', 'gift', 'horn']) for (const p of base[k] || []) assert.ok(e.battle_lost.includes(p), `${id} ${k} on win`);
    assert.equal(e._coinLine, !!base.coin_handover?.length);
    assert.deepEqual(e.battle_won, base.battle_won);
    assert.ok(!BANNED.some((re) => re.test(words(e))), `${id} clean words`);
  }
  const mf = LINES.maps.mirefen_hall_int.mirefen_hall_int_master;
  const before = hallEntry(LINES, masters, 'mirefen_hall_int', { id: 'mirefen_hall_int_master' }, mf, new Set());
  assert.ok(!mf.skill_learned.some((p) => before.battle_lost.includes(p)), 'Tideglide is taught after the storm, not on the win');
  assert.deepEqual(before.after, mf.after);
  const storm = hallEntry(LINES, masters, 'mirefen_hall_int', { id: 'mirefen_hall_int_master' }, mf, new Set([STORM_FLAG]));
  assert.deepEqual(storm.after, [...mf.after_storm, ...mf.skill_learned]);
  const fs = LINES.maps.frostspire_hall_int?.frostspire_hall_int_master;
  if (fs?.skill_learned) assert.ok(fs.skill_learned.every((p) => masterEntry(fs).battle_lost.includes(p)));
  // clean fallback: no merged keys -> nothing invented, battle_won stays absent
  const bare = masterEntry({ pages: ['a'], battle_lost: ['b'] });
  assert.deepEqual(bare.battle_lost, ['b']); assert.equal(bare._coinLine, false); assert.equal(bare.battle_won, undefined);
});

test('Ron 2-6: intro on the spot, ron_battle_openers link plays first (Aurelith -> Cindervale opener)', () => {
  const spots = { saltmere: 'saltmere_ron_2', revival_heights: 'revival_heights_ron_3', frostspire_pass: 'frostspire_pass_ron_4', lanternport: 'lanternport_ron_5', aurelith: 'aurelith_ron_6' };
  for (const [map, id] of Object.entries(spots)) {
    const e = LINES.maps[map][id]; assert.match(e.opener, /^ron_battle_openers\./);
    const w = withOpener(LINES, e);
    const op = LINES.ron_battle_openers[e.opener.split('.')[1]][0].pages;
    assert.deepEqual(w.pages.slice(0, op.length), op); assert.deepEqual(w.lines.at(-1).pages.slice(op.length), e.lines.at(-1).pages);
    assert.equal(withOpener(LINES, w), w, 'opener is added once');
  }
  assert.equal(LINES.maps.aurelith.aurelith_ron_6.opener, 'ron_battle_openers.ron_rival_cindervale');
  const missing = { pages: ['x'], opener: 'ron_battle_openers.nope' };
  assert.equal(withOpener(LINES, missing), missing);
});

// ---- Ron 5 after_2 + Fernwick hall return spot (Coder, Oct 23 2026) ----
import { chainAfter } from '../src/progression/halls.js';
test('Ron 5: after_2 plays straight after `after` in the same sequence', () => {
  const e = LINES.maps.lanternport.lanternport_ron_5;
  assert.ok(e.after?.length && e.after_2?.length, 'after and after_2 merged (v0.4.11)');
  const c = chainAfter(withOpener(LINES, e));
  assert.deepEqual(c.after, [...e.after, ...e.after_2]);
  assert.equal(chainAfter(c), c, 'chained once');
  const plain = { after: ['a'] }; assert.equal(chainAfter(plain), plain);
});
import { pad } from './_pad.mjs';
test('hall return: leaving fernwick_hall_int puts the player at fernwick (23,19) facing down', () => {
  const m = R('art/world/overworld/maps/fernwick_hall_int.json');
  const out = m.warps.filter((w) => w.to === 'fernwick');
  assert.ok(out.length);
  for (const w of out) assert.deepEqual([w.tx, w.ty, w.facing], [...pad('fernwick', 23, 19), 'down']); // unpadded (23,19) + fernwick padding
});

// ---- Ron rival battles 2-6 (Gary, Oct 23, 2026, 9:05 AM CT): a loss blacks out to the last clinic AND Ron must be
// beaten to progress (beat_rival_ron_<n> on a win only; he stays re-challengeable). Ron 1 is unchanged (win or lose).
import { RON_RIVALS } from '../src/battle/story.js';
import { attachSystems } from '../src/systems/index.js';
import { createCreature, maxHp } from '../src/systems/creature.js';

const RON_IDS = [['saltmere', 'saltmere_ron_2', 2], ['revival_heights', 'revival_heights_ron_3', 3], ['frostspire_pass', 'frostspire_pass_ron_4', 4],
  ['lanternport', 'lanternport_ron_5', 5], ['aurelith', 'aurelith_ron_6', 6]];

test('ron 2-6: story results — flag on a win only, a loss blacks out and stays re-challengeable; Ron 1 unchanged', () => {
  assert.deepEqual(Object.values(RON_RIVALS), [2, 3, 4, 5, 6]);
  for (const [map, id, n] of RON_IDS) {
    assert.equal(RON_RIVALS[`${map}.${id}`], n);
    const npc = R(`art/world/overworld/maps/${map}.json`).npcs.find((d) => d.id === id);
    assert.ok(npc && npc.kind === 'rival' && npc.gd_id === `ron_${n}`, `${map}.${id} is placed`);
    assert.ok(lines.maps[map]?.[id]?.battle_lost?.length && lines.maps[map][id].battle_won?.length, `${id} has battle text`);
    assert.deepEqual(trainerOutcome(map, id, true), { flags: [`beat_rival_ron_${n}`], continueOnLoss: false, gift: null, done: true, blackoutOnLoss: true });
    assert.deepEqual(trainerOutcome(map, id, false), { flags: [], continueOnLoss: false, gift: null, done: false, blackoutOnLoss: true });
    // the quest chain's step for this battle waits on the win flag (the story gate)
    assert.ok(quests.quests.some((q) => q.steps.some((s) => s.flag === `beat_rival_ron_${n}`)), `quest step gated on beat_rival_ron_${n}`);
  }
  const r1 = trainerOutcome('fernwick', 'ron_rival_1', false);
  assert.equal(r1.continueOnLoss, true); assert.equal(r1.done, true); assert.equal(r1.blackoutOnLoss, undefined, 'Ron 1: no blackout');
  assert.deepEqual(r1.flags, ['has_run_shoes']);
});

async function ronScene(mapName) {
  const { Overworld } = await import('../src/overworld/overworld.js');
  const OW = Overworld.prototype;
  const sc = {
    flags: new Set(), party: [createCreature({ species: 'cindrip', level: 20 }), createCreature({ species: 'rillop', level: 20 })], counters: {}, seen: {}, hooks: {}, log: [],
    ms: 0, tick: 0, busy: false, lines, said: [], map: { name: mapName }, lastDoor: null, fade: null, config: {}, player: { facing: 'up' }, clock: { day: 1 }, seenDay: {},
    phase: 'day', hour: 12, stillSince: 0, textVars: () => ({ player: 'Sam' }), zone: () => mapName, say: async (pages) => { sc.said.push(...(pages || [])); }, fill: (p) => p,
    script: async (fn) => { if (sc.busy) return; sc.busy = true; try { await fn(); } finally { sc.busy = false; } },
    setFlag: (f, on = true) => (on ? sc.flags.add(f) : sc.flags.delete(f)), startWarp: (spawn, kind) => { sc.warps.push({ ...spawn, kind }); }, warps: [],
    talk: OW.talk, pick: OW.pick, speakerFor: OW.speakerFor, env: OW.env,
  };
  // same text lookup as src/progression/index.js wireHallText: Ron 2-6 opener first, after_2 chained after `after`
  sc._entryFor = (m, d) => chainAfter(withOpener(sc.lines, OW._entryFor.call(sc, m, d), sc.flags, {}));
  const sys = attachSystems(sc, { saveData: { coins: 5000 } }); await sys.ready;
  sc.run = async (id) => { sc.said.length = 0; sc.talk(null, { id }); for (let i = 0; i < 200 && sc.busy; i++) await new Promise((r) => setTimeout(r, 1)); assert.equal(sc.busy, false); };
  return { sc, sys };
}

for (const [map, id, n] of RON_IDS) {
  test(`ron ${n}: loss -> last clinic (even with a creature standing), no flag, rematch until won; win opens the gate`, async () => {
    const { sc, sys } = await ronScene(map);
    const e = sc._entryFor(map, { id });
    let battles = 0;
    // 1) wiped team: Ron's battle_won line, then the blackout warp; flag unset; not marked defeated
    sc.hooks.onBattle = async () => { battles++; for (const c of sc.party) c.hp = 0; return false; };
    const coins0 = sys.wallet.coins;
    await sc.run(id);
    assert.equal(sc.warps.length, 1); assert.equal(sc.warps[0].kind, 'blackout');
    assert.equal(sc.warps[0].map, sys.heal.lastHeal().map, 'warped to the last clinic');
    assert.ok(sys.wallet.coins < coins0, 'copay charged');
    assert.ok(sc.said.includes(e.battle_won[0]), "Ron's line on a loss");
    assert.ok(!sc.flags.has(`beat_rival_ron_${n}`)); assert.equal(sc.seen[`defeated:${map}.${id}`], undefined);
    assert.ok(sc.party.every((c) => c.hp === maxHp(c)), 'rested at the clinic');
    // 2) lost with a creature still standing (forfeit / engine edge): Ron 2-6 still black out
    sc.hooks.onBattle = async () => { battles++; sc.party[0].hp = 0; return false; };
    await sc.run(id);
    assert.equal(sc.warps.length, 2); assert.equal(sc.warps[1].kind, 'blackout');
    assert.ok(!sc.flags.has(`beat_rival_ron_${n}`));
    // 3) rematch: the pre-battle pages again (not `after`), and a win sets the flag with no warp
    sc.hooks.onBattle = async () => { battles++; return true; };
    await sc.run(id);
    assert.equal(battles, 3, 'rematched every time');
    assert.equal(sc.warps.length, 2, 'no warp on a win');
    assert.ok(sc.said.includes(e.battle_lost[0]));
    assert.ok(sc.flags.has(`beat_rival_ron_${n}`)); assert.equal(sc.seen[`defeated:${map}.${id}`], true);
    // 4) beaten: `after` (+ after_2), no more battles
    sc.hooks.onBattle = async () => { throw new Error('no rematch after a win'); };
    await sc.run(id);
    assert.deepEqual(sc.said, e.after);
  });
}

test('ron 1: still continues win or lose (no blackout, no rematch)', async () => {
  const { sc } = await ronScene('fernwick');
  sc.hooks.onBattle = async () => { for (const c of sc.party) c.hp = 0; return false; };
  await sc.run('ron_rival_1');
  assert.equal(sc.warps.length, 0);
  assert.equal(sc.seen['defeated:fernwick.ron_rival_1'], true);
  assert.ok(sc.flags.has('has_run_shoes')); assert.ok(!sc.flags.has('beat_rival_ron_1'));
});

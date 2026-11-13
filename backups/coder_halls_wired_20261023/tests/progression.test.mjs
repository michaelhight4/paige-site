// Progression pass (Oct 23, 2026, overnight coder): Masters 1-8, hall puzzles 2-8, data-driven quests (src/progression/*).
import test from 'node:test';
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

test('flags: half-done features default off, ?pg= toggles', () => {
  assert.equal(PROGRESSION_DEFAULTS.quests, false);
  assert.equal(PROGRESSION_DEFAULTS.hallPuzzles, false);
  assert.equal(PROGRESSION_DEFAULTS.masterGifts, false);
  assert.equal(PROGRESSION_DEFAULTS.masterTeamFernwick, false);
  const f = progressionFlags(new URLSearchParams('pg=quests,-masters'));
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

// Puzzle tells + rule-first hall hints (design/puzzle_hints_audit.md, Oct 30 2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const J = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const PT = await import(path.join(root, 'src/progression/puzzle_tells.js'));
const { HallV2, hallV2FromMap } = await import(path.join(root, 'src/progression/puzzles.js'));
const { PuzzleRuntime } = await import(pathToFileURL(path.join(root, 'src/systems/puzzles.js')).href + '?v=v0.2.99-alpha'); // same instance puzzle_tells patches
const MAPS = 'art/world/overworld/maps/';
const BANNED = /\b(gym|elite|route)\b|pok[eé]/i;

test('hints: rule first, answer on the second ask, reset line always last', () => {
  const a = PT.hintPages('frostspire', 0), b = PT.hintPages('frostspire', 1, { pages_again: ['ANSWER'] });
  assert.deepEqual(a, [...PT.RULE_FALLBACK.frostspire, ...PT.RESET_FALLBACK]);
  assert.deepEqual(b, ['ANSWER', ...PT.RESET_FALLBACK]);
  const d = { pages: ['R'], pages_again: ['A'], pages_3: ['S'] }, x = { pages: ['X'] };
  assert.deepEqual(PT.hintPages('cindervale', 0, d, x), ['R', 'X']);
  assert.deepEqual(PT.hintPages('cindervale', 1, d, x), ['A', 'X']);
  assert.deepEqual(PT.hintPages('cindervale', 3, d, x), ['S', 'X']);
  // Text Bot's real file: every hall has a rule tier, nothing banned, no unfilled town placeholder shipped
  const tb = JSON.parse(fs.readFileSync(path.join(root, 'data/textbot_puzzle_hints.json'), 'utf8'));
  const lines = JSON.parse(fs.readFileSync(path.join(root, 'text/overworld_lines.json'), 'utf8'));
  for (const z of Object.keys(PT.RULE_FALLBACK)) if (tb.system_halls['hint_' + z]) assert.deepEqual(lines.system_halls['hint_' + z].pages, tb.system_halls['hint_' + z].pages, z);
  assert.deepEqual(lines.system_halls.reset_note.pages, tb.system_halls.reset_note.pages);
  assert.ok(!JSON.stringify(lines.field_skills).includes('{skill_town}'));
  for (const v of Object.values(lines.system_halls)) for (const p of [...(v.pages || []), ...(v.pages_again || []), ...(v.pages_3 || [])]) assert.ok(!BANNED.test(p), p);
  for (const p of [...Object.values(PT.RULE_FALLBACK).flat(), ...PT.RESET_FALLBACK]) assert.ok(!BANNED.test(p), p);
});

test('hall tells: arrows on every push tile, matching pair glyphs, channel colours, ice pillars', () => {
  for (const f of fs.readdirSync(path.join(root, MAPS)).filter((f) => /_hall_int\.json$|lighthouse/.test(f))) {
    const m = J(MAPS + f), g = m.hall_v2?.grid; if (!g) continue;
    const t = PT.hallTells(g), cnt = (re) => g.join('').split('').filter((c) => re.test(c)).length;
    assert.equal(t.filter((o) => o.k === 'arrow').length, cnt(/[\^v<>]/), f);
    const pairs = t.filter((o) => o.k === 'pair');
    for (const id of new Set(pairs.map((p) => p.id))) assert.equal(new Set(pairs.filter((p) => p.id === id).map((p) => p.glyph + p.color)).size, 1, f);
    for (const gate of t.filter((o) => o.k === 'gate')) assert.equal(gate.color, PT.CHANNEL[/[ab]/.test(g[gate.y][gate.x]) ? 0 : 1]);
    if (cnt(/i/)) assert.ok(t.some((o) => o.k === 'pillar'), f + ' ice needs stop pillars');
  }
});

test('tutorial strips: Frostspire foyer ice patch and Mirefen foyer belt, hall still solvable', () => {
  const fr = J(MAPS + 'frostspire_hall_int.json'), mi = J(MAPS + 'mirefen_hall_int.json');
  assert.equal(fr.hall_v2.grid[17].slice(11, 15), 'iiii');
  assert.equal(mi.hall_v2.grid[20][12], '>'); assert.equal(mi.hall_v2.push['12,20'], 'right');
  for (const m of [fr, mi]) { const { hall } = hallV2FromMap(m); assert.ok(hall); }
});

test('field tells: gate lamps count plates on the channel', () => {
  const def = J('art/world/overworld/puzzles/fernwick_hall_int.runtime.json');
  const rt = new PuzzleRuntime(def); const ops = PT.fieldTells(def, (id) => rt.isOn(id));
  const gate = ops.find((o) => o.k === 'gate' && o.id === undefined);
  assert.ok(gate.lamps >= 1 && gate.lit <= gate.lamps);
  assert.ok(ops.some((o) => o.k === 'crystal'));
});

test('crystal ripple + gate pan through attachPuzzleTells', () => {
  const def = J('art/world/overworld/puzzles/fernwick_hall_int.runtime.json');
  const col = Array.from({ length: 30 }, () => Array(30).fill(6));
  const rt = new PuzzleRuntime(def), map = { name: 'x', json: {}, layers: { collision: col }, width: 30, height: 30, tile: () => 0, _byId: new Map() };
  const scene = { map, player: { x: 0, y: 0 }, ms: 0, systems: { puzzles: new Map([['x', rt]]) }, log: [] };
  const T = PT.attachPuzzleTells(scene);
  T.compute();
  const c = def.switches.find((s) => s.type === 'crystal'); rt.touch(c.x, c.y);
  assert.ok(T.fx.some((f) => f.k === 'ripple'));
  const g = def.gates[0]; col[g.y][g.x] = 0; scene.player = { x: 29, y: 29 };
  T.compute();
  assert.ok(scene.camFocus, 'pans to the opened gate');
  scene.ms = 5000; T.compute(); assert.equal(scene.camFocus, null);
});

test('brushbreak / stonebreak unlocks: quest turn-ins set the flag and teach; cant_use_yet names the town', () => {
  const Q = JSON.parse(fs.readFileSync(path.join(root, 'data/quests.json'), 'utf8')).quests;
  const lines = JSON.parse(fs.readFileSync(path.join(root, 'text/overworld_lines.json'), 'utf8'));
  for (const [qid, sk, npc, town] of [['sq_burlbeetle_count', 'brushbreak', 'trainer_tw_bug', 'Thornwood'], ['sq_cave_sketch', 'stonebreak', 'hiker', 'Greystone']]) {
    const q = Q.find((x) => x.id === qid), flag = 'has_' + sk;
    assert.ok(q.reward.flags.includes(flag) && q.new_ids.includes(flag), qid);
    const t = q.lines.filter((l) => l.context === 'turn_in');
    assert.equal(t.at(-1).teach, sk); assert.equal(t.at(-1).npc, npc); assert.ok(t.at(-1).text.length >= 4);
    const fs_ = lines.field_skills[sk];
    assert.equal(fs_.requires_flag, flag);
    assert.ok(fs_.cant_use_yet.join(' ').includes(town) && !fs_.cant_use_yet.join(' ').includes('{skill_town}'));
  }
  // placement rule: brush / cracked rock never on a main-quest step map (optional areas only)
  const main = new Set(Q.filter((q) => q.type === 'main').flatMap((q) => q.steps.map((s) => s.map)));
  for (const f of fs.readdirSync(path.join(root, MAPS)).filter((n) => n.endsWith('.json'))) {
    const s = fs.readFileSync(path.join(root, MAPS, f), 'utf8');
    if (/thick_brush|cracked_rock/.test(s)) assert.ok(!main.has(f.replace('.json', '')), `${f} is on the story path`);
  }
});

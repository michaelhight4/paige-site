// r78 wiring (Coder, Oct 29 2026): the 14 Gary-approved r78 creatures are real species (art, sprites, tables, learnsets,
// evolutions), no stand-ins left for them, and the final Ron sequence at the Aurelith tower (arena rooms 1-8 + lobby).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const J = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const { SPECIES } = await import('../src/ui/data.js');
const { evoTable } = await import('../src/systems/evolution.js');
const { learnsetFor } = await import('../src/overnight/learnsets.js');
const { speciesInfo, defaultSkills } = await import('../src/systems/creature.js');
const { authoredTeam } = await import('../src/battle/data/trainer_teams.js');
const { finalStage, RON_FINAL } = await import('../src/battle/data/ron_team.js');
const A = await import('../src/region78/arena.js');
const E = await import('../src/progression/ending.js');

export const R78 = ['chimelet', 'glyphmage', 'mantleox', 'mirejaw', 'peakbrute', 'reapmantis', 'reedcrane', 'rimewyrm', 'seraphawk', 'shardhart', 'snowroller', 'spirewing', 'sunbasilisk', 'sunderhoof'];
const CRE = 'art/characters/pixel/creatures';

test('r78: all 14 registered with full battle (front/back + idle anims) and overworld sprites', () => {
  const ids = new Set(SPECIES.map((s) => s.id));
  for (const id of R78) {
    assert.ok(ids.has(id), `${id} registered`);
    for (const f of [`battle/${id}_front_128.png`, `battle/${id}_back_128.png`, `battle/${id}_front_128_2x.png`, `battle/${id}_back_128_2x.png`,
      `anim/${id}_front_idle/${id}_front_idle_f0.png`, `anim/${id}_back_idle/${id}_back_idle_f0.png`, `overworld/${id}_ow_sheet.png`, `overworld/${id}_ow/${id}_ow_down_stand.png`])
      assert.ok(fs.existsSync(`${CRE}/${id}/${f}`), `${id}: ${f}`);
  }
});

test('r78: in region 7-8 wild tables (real species, no stand-ins wanting them)', () => {
  const enc = J('data/encounters_wired.json');
  const r78Zones = ['route_fernwick_lanternport_grass', 'route_fernwick_lanternport_water', 'lanternport_water', 'lanternport_grotto_cave', 'route_cindervale_grass', 'route_cindervale_cave', 'cindervale_caldera_cave'];
  const seen = new Set(r78Zones.flatMap((z) => enc.zones[z].slots.map((s) => s.species)));
  for (const id of R78) assert.ok(seen.has(id), `${id} in a region 7-8 table`);
  for (const f of ['data/encounters_wired.json', 'art/world/overworld/encounters/encounters.json']) {
    const t = fs.readFileSync(f, 'utf8');
    for (const id of R78) assert.doesNotMatch(t, new RegExp(`"wants": "${id}"`), `${f}: stand-in for ${id}`);
    for (const id of R78) assert.ok(!(J(f).species_without_art || []).includes(id), `${f}: ${id} still without art`);
  }
  const st = J('data/standins_overnight.json');
  for (const id of R78) assert.ok(!st.trainer_species[id], `trainer stand-in for ${id}`);
  const m = fs.readFileSync('data/masters.json', 'utf8');
  for (const id of R78) assert.doesNotMatch(m, new RegExp(`"species": "${id}",\\s*"level": \\d+,\\s*"battle_species": "(?!${id}")`), `master stand-in for ${id}`);
});

test('r78: learnsets reach L64-70; snowmuff evolves into peakbrute at L32', () => {
  for (const id of R78) {
    const set = learnsetFor(id, speciesInfo(id)?.el || ['normal'], defaultSkills(id));
    assert.ok(Math.max(...set.map((e) => e.level)) >= 64, `${id} learns to ${Math.max(...set.map((e) => e.level))}`);
  }
  assert.deepEqual({ to: evoTable().snowmuff?.to, level: evoTable().snowmuff?.level }, { to: 'peakbrute', level: 32 });
});

test('final Ron: key resolves to 6 final-stage Kilu, L67-69 (base 3 + 3 rolled)', () => {
  const t = authoredTeam({ map: A.RON7.battleMap, id: A.RON7.id }, [{ species: 'tumbloam' }]);
  assert.equal(t.length, 6);
  for (const c of t) { assert.ok(c.level >= 67 && c.level <= 69); assert.equal(finalStage(c.species) || c.species, c.species, `${c.species} final`); }
  assert.equal(RON_FINAL.key, `${A.RON7.battleMap}.${A.RON7.id}`);
});

const scene = (flags = []) => {
  const s = { flags: new Set(flags), lines: {}, seen: {}, said: [], log: [], ms: 0, tick: 0, healed: 0, battles: [], ended: 0,
    setFlag(f, on = true) { on ? this.flags.add(f) : this.flags.delete(f); },
    async say(p) { this.said.push(...(p || [])); },
    systems: { party: { list: [{}], healAll() { s.healed++; } }, async onTrainerWin() {}, async onTrainerLoss() { return null; }, async onPartyFainted() { s.blackout = true; } },
    hooks: { onBattle: async (b) => { s.battles.push(b); return s.win; } } };
  return s;
};

test('final Ron: floor 8 first clear -> top line, tower_done, full heal -> tower_healed (no Ron heal); ending not yet due', async () => {
  const s = scene(['arena_run']);
  await A.towerTop(s, (f) => s.setFlag(f));
  assert.ok(s.said.includes(A.RON7.fallback.top[0]));
  assert.ok(s.flags.has(E.ENDING.tower[0]) && s.flags.has(RON_FINAL.requires[1]));
  assert.equal(s.healed, 1);
  assert.equal(E.endingDue(s.flags), false);
  assert.equal(A.ron7State(s.flags), 'fight');
  assert.equal(A.ron7State(new Set()), 'absent');
});

test('final Ron: a win sets both Ron 7 flags and runs the ending; a loss blacks out and sets nothing', async () => {
  const lose = scene(RON_FINAL.requires); lose.win = false; lose.busy = true;
  assert.equal(await A.ron7Talk(lose, null), 'lost');
  assert.ok(lose.blackout); assert.ok(!lose.flags.has(RON_FINAL.winFlag));
  const s = scene(RON_FINAL.requires); s.win = true; s.busy = true; s._ending = true; // ending UI (credits) is covered in interim_ending.test
  assert.equal(await A.ron7Talk(s, null), 'won');
  assert.deepEqual(s.battles, [{ map: A.RON7.battleMap, id: A.RON7.id }]);
  for (const f of E.ENDING.tower) assert.ok(s.flags.has(f), f);
  assert.ok(s.said.includes(A.RON7.fallback.congrats[0]) && s.said.includes(A.RON7.fallback.lose[0]));
  assert.equal(E.endingDue(s.flags), true); 
  assert.equal(A.ron7State(s.flags), 'after');
});

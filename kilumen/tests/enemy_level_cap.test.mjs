// Level curve (Gary Oct 30 2026): player max 70; no enemy above 68 anywhere (map trainers, hall trainers + Masters, authored
// teams, Ron, Arena, Wellspire / flashback lab / Ondravel, wild + fishing + terrain tables) or after any scaling
// (difficulty scaleFoes, Master rematch scaleMasterTeam). Region caps R1-R6: 12 / 20 / 28 / 36 / 42 / 50 (Master aces).
import test from 'node:test'; import assert from 'node:assert'; import fs from 'node:fs';
import { KILUMEN_RULES } from '../src/battle/data/rules.js';
import { TRAINER_TEAMS } from '../src/battle/data/trainer_teams.js';
import { RON_FIGHTS } from '../src/battle/data/ron_team.js';
import { ARENA, arenaTeam } from '../src/region78/arena.js';
import { WELLSPIRE_TEAMS } from '../src/region9/teams.js';
import { scaleFoes, scaleLevel, ENEMY_MAX_LEVEL } from '../src/systems/difficulty.js';
import { scaleMasterTeam } from '../src/progression/hall_v2.js';
const CAP = 68, J = (p) => JSON.parse(fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
function levels(o, out = [], path = '') {
  if (Array.isArray(o)) o.forEach((v, i) => levels(v, out, `${path}[${i}]`));
  else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) {
    if (k === 'level' && typeof v === 'number') out.push([path, v]);
    else if (k === 'level' && Array.isArray(v) && v.every(Number.isFinite)) v.forEach((x) => out.push([path, x]));
    else levels(v, out, `${path}.${k}`);
  }
  return out;
}
test('rules: player max 70, enemy max 68', () => {
  assert.equal(KILUMEN_RULES.maxLevel, 70); assert.equal(KILUMEN_RULES.enemyMaxLevel, CAP); assert.equal(ENEMY_MAX_LEVEL, CAP);
});
test('every authored enemy level in data is <= 68', () => {
  const dir = new URL('../art/world/overworld/maps/', import.meta.url);
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) for (const n of J(`art/world/overworld/maps/${f}`).npcs || [])
    for (const [p, l] of levels(n.team || [])) assert.ok(l <= CAP, `${f} ${n.id}${p} L${l}`);
  for (const f of ['data/masters.json', 'data/encounters_wired.json', 'data/terrain_encounters.json', 'data/fishing_tables.json', 'art/world/overworld/encounters/encounters.json'])
    for (const [p, l] of levels(J(f))) assert.ok(l <= CAP, `${f}${p} L${l}`);
  for (const [k, t] of Object.entries({ ...TRAINER_TEAMS, ...WELLSPIRE_TEAMS })) for (const [p, l] of levels(t)) assert.ok(l <= CAP, `${k}${p} L${l}`);
  for (const [k, f] of Object.entries(RON_FIGHTS)) for (const l of f.levels) assert.ok(l <= CAP, `${k} L${l}`);
  for (const f of ARENA.fighters) for (const c of arenaTeam(f)) assert.ok(c.level <= CAP, `${f.id} L${c.level}`);
});
test('Master aces hit the region caps R1-R6 (12/20/28/36/42/50); R7-R8 hall trainers + Masters sit in 60-68', () => {
  const caps = { fernwick: 12, saltmere: 20, revival_heights: 28, frostspire: 36, mirefen: 42, tidewater_coast: 50 };
  for (const h of J('data/masters.json').halls) {
    const ace = Math.max(...h.master.team.map((m) => m.level)), all = [...h.trainers.flatMap((t) => t.team), ...h.master.team].map((m) => m.level);
    if (caps[h.zone]) assert.ok(ace <= caps[h.zone] && Math.max(...all) <= caps[h.zone], `${h.zone} ace ${ace} > ${caps[h.zone]}`);
    else for (const l of all) assert.ok(l >= 60 && l <= CAP, `${h.zone} L${l}`);
  }
});
test('scaling never lifts an enemy past 68 (every difficulty, Master rematch at any win count)', () => {
  for (const mode of ['easy', 'normal', 'hard']) for (const lv of [5, 50, 66, 68, 70, 90]) for (const lead of [1, 40, 70]) {
    assert.ok(scaleLevel(lv, lead, mode) <= CAP, `${mode} ${lv} ${lead}`);
    assert.ok(scaleFoes([{ species: 'x', level: lv }], lead, mode)[0].level <= CAP);
  }
  for (const w of [0, 1, 2, 5, 20]) for (const c of scaleMasterTeam([{ species: 'x', level: 50 }, { species: 'y', level: 68 }], w)) assert.ok(c.level <= CAP, `wins ${w}`);
});

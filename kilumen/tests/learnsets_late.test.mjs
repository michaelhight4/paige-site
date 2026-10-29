// Late learnsets (Oct 29 2026): generated sets stopped at L34 (reefshell's at L28); regions 5-8 run L40-70.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { learnsetFor, LATE_LEVELS } from '../src/overnight/learnsets.js';
import { speciesInfo, defaultSkills } from '../src/systems/creature.js';
import { buildSkills } from '../src/battle/data/skills.js';
import { SPECIES } from '../src/ui/data.js';

const J = (p) => JSON.parse(fs.readFileSync(new URL(`../${p}`, import.meta.url)));
const REGIONS = { // same as tests/regions_5_8.test.mjs (copied: importing a test file re-runs its tests)
  5: ['sunmeadow_fields', 'route_revival_sunmeadow', 'route_sunmeadow_mirefen', 'route_saltmere_mirefen', 'mirefen', 'mirefen_bog', 'mirefen_hall_int'],
  6: ['route_coast', 'tidewater_coast', 'tidewater_hall_int', 'tidewater_cave_int'],
  7: ['route_fernwick_lanternport', 'lanternport', 'lanternport_hall_int'],
  8: ['route_cindervale', 'cindervale', 'cindervale_hall_int'],
};
const maps = new Set(Object.values(REGIONS).flat());
const used = new Set();
const grab = (o) => { if (Array.isArray(o)) o.forEach(grab); else if (o && typeof o === 'object') { if (typeof o.species === 'string') used.add(o.species); if (typeof o.battle_species === 'string') used.add(o.battle_species); Object.values(o).forEach(grab); } };
for (const z of Object.values(J('data/encounters_wired.json').zones)) if ((z.maps || []).some((m) => maps.has(m))) grab(z.slots);
for (const z of Object.values(J('art/world/overworld/encounters/encounters.json').zones)) if ((z.maps || []).some((m) => maps.has(m))) grab(z.slots);
for (const [m, t] of Object.entries(J('data/fishing_tables.json').maps)) if (maps.has(m)) grab(t);
for (const m of maps) grab(J(`art/world/overworld/maps/${m}.json`).npcs || []);
grab(J('data/masters.json').halls.slice(4, 8));
const reg = new Set(SPECIES.map((s) => s.id));
const setOf = (sp) => learnsetFor(sp, speciesInfo(sp)?.el || ['normal'], defaultSkills(sp));

test('every species used in regions 5-8 learns a move at or after L40', () => {
  const sp = [...used].filter((s) => reg.has(s));
  assert.ok(sp.length > 50, `only ${sp.length} species found`);
  const short = sp.filter((s) => !setOf(s).some((e) => e.level >= 40));
  assert.deepEqual(short, []);
});

test('late moves exist, are not repeats, and stop at L70', () => {
  const S = buildSkills();
  for (const s of SPECIES) {
    const set = setOf(s.id), ids = set.map((e) => e.skill);
    assert.equal(new Set(ids).size, ids.length, s.id);
    for (const e of set) { assert.ok(S[e.skill], `${s.id} ${e.skill}`); assert.ok(e.level <= 70, `${s.id} ${e.level}`); }
  }
  assert.equal(Math.max(...LATE_LEVELS), 70);
  assert.ok(setOf('reefshell').some((e) => e.level >= 40));
});

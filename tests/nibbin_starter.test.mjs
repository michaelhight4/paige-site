// Earth starter swap (Gary, Oct 23 2026: Tumbloam "looks a lot like Cindrip" -> Nibbin -> Gnawford, pure earth, evolves at 16).
// Run: node --test tests/nibbin_starter.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readJson } from './story_harness.mjs';
import { SYSTEMS_CONFIG as cfg } from '../src/systems/config.js';
import { STARTERS, STARTER_ONLY, RON_COUNTER, STARTER_LINES, partyStarter, starterKeys, starterOf } from '../src/battle/data/starters.js';
import { TRAINER_TEAMS, authoredTeam } from '../src/battle/data/trainer_teams.js';
import { OPEN } from '../src/overworld/intro.js';
import { generate } from '../tools/gen_encounters.mjs';


test('starter cradles: Nibbin / Cindrip / Rillop (Tumbloam no longer a starter)', () => {
  const c = cfg.starterCradles || OPEN.cradles;
  assert.deepEqual(Object.values(c), ['nibbin', 'cindrip', 'rillop']);
  assert.deepEqual(STARTERS, ['nibbin', 'cindrip', 'rillop']);
  assert.ok(!Object.values(c).includes('tumbloam'));
  assert.deepEqual(STARTER_LINES.nibbin, ['nibbin', 'gnawford']);
  assert.deepEqual(STARTER_ONLY, ['nibbin', 'gnawford']);
});

test("Ron's counter-pick per starter (earth > water > fire > earth), legacy Tumbloam saves keep a team", () => {
  assert.deepEqual(RON_COUNTER, { nibbin: 'cindrip', cindrip: 'rillop', rillop: 'nibbin', tumbloam: 'cindrip' });
  for (const key of ['fernwick.ron_rival_1', 'saltmere.saltmere_ron_2']) {
    const [map, id] = key.split('.');
    for (const mine of [...STARTERS, 'tumbloam']) {
      const team = authoredTeam({ map, id }, [{ species: mine, origin: { how: 'starter' } }]);
      assert.ok(team?.length, `${key} ${mine}`);
      const ace = team.map((f) => starterOf(f.species)).filter(Boolean);
      assert.deepEqual(ace, [RON_COUNTER[mine]], `${key}: Ron's starter line counters ${mine}`);
    }
  }
  assert.equal(partyStarter([{ species: 'gnawford', origin: { how: 'starter' } }]), 'nibbin');
  assert.deepEqual(starterKeys('nibbin'), ['nibbin', 'tumbloam']);
});

test('Nibbin / Gnawford are starter-only: absent from every wild table and every non-rival trainer team', () => {
  const wired = readJson('data/encounters_wired.json');
  for (const [zid, z] of Object.entries(wired.zones)) {
    for (const s of z.slots || []) assert.ok(!STARTER_ONLY.includes(s.species), `wired ${zid}: ${s.species}`);
    for (const v of Object.values(z.variants || {})) for (const s of v?.slots || []) assert.ok(!STARTER_ONLY.includes(s.species), `wired ${zid} variant: ${s.species}`);
  }
  for (const [zid, z] of Object.entries(readJson('data/encounters_generated.json').zones || {})) for (const s of z.slots || []) assert.ok(!STARTER_ONLY.includes(s.species), `generated ${zid}`);
  for (const [zid, z] of Object.entries(generate({ regions: [1, 2, 3, 4, 5, 6, 7, 8] }).zones || {})) for (const s of z.slots) assert.ok(!STARTER_ONLY.includes(s.species), `gen_encounters ${zid}`);
  for (const [key, e] of Object.entries(TRAINER_TEAMS)) {
    if (!Array.isArray(e)) continue; // byStarter = Ron (rival)
    for (const f of e) assert.ok(!STARTER_ONLY.includes(f.species), `${key}: ${f.species}`);
  }
  // route1 grass stays first-stage L2-4 (zone cap) with the replacement earth creature
  const r1 = Object.entries(wired.zones).filter(([id]) => /^route1/.test(id));
  for (const [, z] of r1) for (const s of z.slots || []) assert.ok(s.level[0] >= 2 && s.level[1] <= 4, `${s.species} ${s.level}`);
});

test('Tumbloam stays an ordinary wild creature', () => {
  const wired = readJson('data/encounters_wired.json');
  const all = Object.values(wired.zones).flatMap((z) => (z.slots || []).map((s) => s.species));
  assert.ok(all.includes('tumbloam'));
});

test('sample party / picker data use Nibbin', async () => {
  const ui = await import('../src/ui/data.js');
  const flat = JSON.stringify(ui);
  assert.match(flat, /"nibbin"/);
});

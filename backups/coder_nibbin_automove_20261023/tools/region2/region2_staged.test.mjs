// Standalone test for the STAGED region-2 data (not in package.json; run: node --test tools/region2/region2_staged.test.mjs). Oct 23 2026, coder.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { buildCreatures } from '../../src/battle/data/creatures.js';
import { loadDex, minLevelOf } from '../creature_plan/plan_lib.mjs';

const rd = (p) => JSON.parse(readFileSync(new URL('../../' + p, import.meta.url)));
const C = buildCreatures(), dex = loadDex();
const ART = new Set(rd('art/world/overworld/encounters/encounters.json').species_with_art);
const legal = (id) => Math.max(C[id].prevo ? C[id].evoLevel || 1 : 1, minLevelOf(dex, id));
const enc = rd('data/region2/encounters_region2.json');
const tt = rd('data/region2/trainer_teams_region2.json');

test('build --check is green', () => {
  execFileSync('node', [new URL('./build_region2.mjs', import.meta.url).pathname, '--check'], { stdio: 'pipe' });
});

test('encounter zones: game species with art, no slot below evolution level, staged', () => {
  for (const [zid, z] of Object.entries(enc.zones)) {
    assert.equal(z.staged, true, zid);
    for (const s of z.slots) {
      assert.ok(C[s.species] && ART.has(s.species), `${zid} ${s.species}`);
      assert.ok(s.level[0] >= legal(s.species), `${zid} ${s.species} L${s.level[0]} < ${legal(s.species)}`);
      assert.ok([30, 15, 5, 1].includes(s.weight), `${zid} ${s.species} weight ${s.weight}`);
    }
  }
});

test('trainer teams: runtime shape, legal levels, inside band', () => {
  const [lo, hi] = tt.trainer_band;
  for (const [key, team] of Object.entries(tt.teams)) {
    assert.match(key, /^[a-z0-9_]+\.[a-z0-9_]+$/);
    const lists = Array.isArray(team) ? [team] : Object.values(team.byStarter);
    if (!Array.isArray(team)) assert.deepEqual(Object.keys(team.byStarter).sort(), ['cindrip', 'rillop', 'tumbloam']);
    for (const l of lists) for (const m of l) {
      assert.ok(C[m.species] && ART.has(m.species), `${key} ${m.species}`);
      assert.ok(m.level >= legal(m.species), `${key} ${m.species} L${m.level}`);
      if (!key.startsWith('thornwood.')) assert.ok(m.level >= lo && m.level <= hi, `${key} ${m.species} L${m.level} outside ${lo}-${hi}`);
    }
  }
});

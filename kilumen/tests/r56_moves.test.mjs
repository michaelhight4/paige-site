import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildSkills, skillIdsFor } from '../src/battle/data/skills.js';
import { R56_LEARNSETS, R56_TUTOR } from '../src/battle/data/learnsets_r56.js';
import { learnsetFor } from '../src/overnight/learnsets.js';
import { mapTeamFor } from '../src/overnight/trainer_teams.js';
import { TRAINER_TEAMS } from '../src/battle/data/trainer_teams.js';
import { SPECIES } from '../src/ui/data.js';
import { tutorSkillsFor, tutorTeach, ronArena } from '../src/region56/tutor.js';
import { Bag } from '../src/systems/bag.js';

const J = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const maps = '../art/world/overworld/maps/';

test('swamp/sea moves exist with GD numbers', () => {
  const S = buildSkills();
  assert.equal(S.bogsnap.type.toLowerCase(), 'swamp'); assert.equal(S.bogsnap.basePower, 55); assert.equal(S.bogsnap.accuracy, 90);
  assert.equal(S.brinelash.basePower, 55); assert.equal(S.brinelash.type.toLowerCase(), 'sea');
  assert.equal(S.mirelob.secondary.chance, 20); assert.equal(S.undertow.secondary.chance, 20);
  assert.equal(S.kelplash.basePower, 55); assert.equal(S.kelplash.accuracy, 95);
  assert.ok(skillIdsFor(['water', 'swamp']).includes('bogsnap'));
  assert.ok(skillIdsFor(['water', 'sea']).includes('brinelash'));
});

test('learnsets and tutor', () => {
  const some = Object.keys(R56_LEARNSETS)[0]; assert.ok(some);
  assert.ok(learnsetFor(some, [], []).some((e) => e.skill));
  assert.deepEqual(R56_TUTOR.brinelash, ['lurelamp', 'pearlisk', 'driftknot']);
  const c = { species: 'pearlisk', skills: ['rippleshot'] };
  assert.deepEqual(tutorSkillsFor(c), ['brinelash']);
  assert.equal(tutorTeach(c, 'brinelash').result, 'learned');
  assert.equal(tutorTeach({ species: 'cindrip', skills: [] }, 'brinelash').result, 'cannot');
});

test('gnawford BST 480', () => {
  const g = SPECIES.find((s) => s.id === 'gnawford' || s.name?.toLowerCase() === 'gnawford');
  assert.ok(g); const b = g.baseStats; assert.equal(b.hp + b.atk + b.def + b.spa + b.spd + b.spe, 480);
});

test('M5/M6 and Ron 6 teams wired', () => {
  const m = J('../data/masters.json').halls;
  const all = JSON.stringify(m);
  assert.ok(all.includes('bogroot_charm') || all.includes('tidebell_charm'));
  assert.ok(TRAINER_TEAMS['tidewater_coast.tidewater_coast_ron_5'].byStarter);
});

test('route_coast: Coast Road, tr_route_coast_a-f, teams keep held/skills', () => {
  for (const f of ['route_coast.json', 'variants/route_coast_storm.json']) {
    const r = J(maps + f); assert.equal(r.title, 'Coast Road');
    const ids = r.npcs.filter((n) => n.gd_id).map((n) => n.gd_id);
    assert.deepEqual(ids, ['a', 'b', 'c', 'd', 'e', 'f'].map((x) => 'tr_route_coast_' + x));
    const d = r.npcs.find((n) => n.gd_id === 'tr_route_coast_d');
    const t = mapTeamFor(d).foes; assert.equal(t[0].held, 'tidebell_charm'); assert.ok(t[0].skills.includes('brinelash'));
  }
  assert.equal(J(maps + 'route_coast.json').variants[0].active_when, 'storm_season');
});

test('lab gates match key cards', () => {
  const g = (m, id) => (J(maps + m + '.json').story_gates || []).find((x) => x.id === id);
  const a = g('mirefen_bog', 'gate_mirefen_sunken_hatch'), b = g('tidewater_cave_int', 'gate_tidewater_cave_lab');
  assert.equal(a.flag, 'rt_keycard_r5'); assert.deepEqual([a.cells[0].x, a.cells[0].y], [31, 18]);
  assert.equal(b.flag, 'rt_keycard_r6'); assert.deepEqual([b.cells[0].x, b.cells[0].y], [20, 6]);
  assert.ok(ronArena(J(maps + 'tidewater_coast.json')).ron);
});

test('tonic_large shows Large Salve, map qty honoured', () => {
  assert.equal(new Bag({}).nameOf('tonic_large'), 'Large Salve');
});

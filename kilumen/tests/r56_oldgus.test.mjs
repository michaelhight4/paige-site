import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { runOldGus, tutorPick, oldGusHook, TUTOR_NPC } from '../src/region56/tutor.js';
import { R56_TUTOR } from '../src/battle/data/learnsets_r56.js';

const [skill, list] = Object.entries(R56_TUTOR)[0];
const sp = list[0];
const fake = (choice) => { const log = []; return { log, lines: { system_story_r56: { old_gus_offer: { pages: ['Teach {creature}?'], choices: ['Teach it', 'Not today'] }, old_gus_taught: { pages: ['{creature} learned it.'] }, old_gus_none: { pages: ['none'] }, old_gus_known: { pages: ['known'] } } },
  say: async (p) => log.push(['say', p]), ask: async (p, c) => { log.push(['ask', p, c]); return Array.isArray(choice) ? choice.shift() : choice; } }; };

test('Old Gus placed on a walkable tidewater_coast cell', () => {
  const m = JSON.parse(fs.readFileSync(new URL('../art/world/overworld/maps/tidewater_coast.json', import.meta.url)));
  const n = m.npcs.find((d) => d.gd_id === TUTOR_NPC);
  assert.ok(n); assert.equal(m.layers.collision[n.y][n.x], 0);
  assert.ok(oldGusHook({}).match('tidewater_coast', n)); assert.ok(!oldGusHook({}).match('mirefen', n));
});
test('offer shows Teach it / Not today, then teaches', async () => {
  const s = fake(0), c = { species: sp, skills: ['a'] };
  const r = await runOldGus(s, { party: [c] });
  assert.deepEqual(s.log[0][2], ['Teach it', 'Not today']); assert.equal(s.log[0][1][0], `Teach ${sp}?`);
  assert.equal(r.result, 'learned'); assert.ok(c.skills.includes(skill)); assert.equal(s.log[1][0], 'say');
});
test('Not today keeps skills; full party asks which to forget', async () => {
  const c = { species: sp, skills: ['a'] }; assert.equal((await runOldGus(fake(1), { party: [c] })).result, 'declined'); assert.ok(!c.skills.includes(skill));
  const f = { species: sp, skills: ['a', 'b', 'c', 'd'] }; const r = await runOldGus(fake([0, 2]), { party: [f] });
  assert.equal(r.result, 'swapped'); assert.equal(f.skills[2], skill);
});
test('none / known states', async () => {
  assert.equal(tutorPick([{ species: 'nobody_xx' }]).state, 'none');
  assert.equal((await runOldGus(fake(0), { party: [{ species: sp, skills: Object.keys(R56_TUTOR).filter((k) => R56_TUTOR[k].includes(sp)) }] })).result, 'known');
});

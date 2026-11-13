// Data-table schema checks (Ajv). Free tools pass, Oct 23, 2026. Schemas: tools/schemas/*.schema.json.
// Core tables (data/quests.json, data/masters.json, encounters.json) must stay clean. The design/overnight_gd drafts
// are warn-only: problems are printed, not failed. KILUMEN_DATA_STRICT=1 makes drafts fail too.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkAll, makeAjv, ROOT } from '../tools/schemas/check_data.mjs';

const results = checkAll();

test('data schemas: every schema compiles in Ajv strict mode', () => {
  const ajv = makeAjv();
  for (const id of ['kilumen:quests', 'kilumen:masters', 'kilumen:encounters', 'kilumen:trainers']) assert.ok(ajv.getSchema(id), id);
});

test('data schemas: core tables (quests, masters, encounters) are valid', () => {
  const core = results.filter((r) => r.core);
  assert.ok(core.length >= 3, 'core tables found');
  for (const r of core) assert.deepEqual(r.problems, [], r.file);
});

test('data schemas: design drafts (warn-only)', () => {
  const bad = results.filter((r) => !r.core && r.problems.length);
  for (const r of bad) console.warn(`[data_schemas] WARN ${r.file}: ${r.problems.join('; ')}`);
  if (process.env.KILUMEN_DATA_STRICT === '1') assert.deepEqual(bad.map((r) => r.file), []);
});

test('data schemas: a broken table is caught (bad level, unknown phase, missing step id, trainer with no team)', () => {
  const ajv = makeAjv();
  const enc = JSON.parse(readFileSync(join(ROOT, 'art/world/overworld/encounters/encounters.json'), 'utf8'));
  const z = Object.values(enc.zones)[0];
  z.slots[0].level = [0, 5];
  z.slots[0].time = ['noon'];
  assert.equal(ajv.getSchema('kilumen:encounters')(enc), false);
  const q = JSON.parse(readFileSync(join(ROOT, 'data/quests.json'), 'utf8'));
  delete q.quests[0].steps[0].id;
  assert.equal(ajv.getSchema('kilumen:quests')(q), false);
  const t = { map: 'route1', trainers: [{ id: 'tr_x', class: 'ranger', base: 50 }] }; // no team at all
  assert.equal(ajv.getSchema('kilumen:trainers')(t), false);
});

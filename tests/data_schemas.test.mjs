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
  // #62 (Coder, Oct 23 2026): species with no creature art are no longer a data error. The load-time art filter
  // (src/battle/encounters.js filterEncounters, wired in ui.js, ?encart=0 off) drops them, so the check moves to the filtered table.
  const noArt = /^species "([^"]+)" is not in species_with_art/;
  for (const r of core) assert.deepEqual(r.problems.filter((p) => !noArt.test(p.replace(/^.*?(species ")/, '$1'))), [], r.file);
});

test('data schemas: #62 encounters filtered by the battle art lookup only roll species that have art', async () => {
  const { filterEncounters } = await import('../src/battle/encounters.js');
  const { SPECIES } = await import('../src/ui/data.js');
  const art = new Set(SPECIES.map((s) => s.id));
  for (const f of ['art/world/overworld/encounters/encounters.json', 'data/encounters_wired.json']) {
    const raw = JSON.parse(readFileSync(join(ROOT, f), 'utf8'));
    const { data } = filterEncounters(raw, (id) => art.has(id));
    const left = Object.values(data.zones).flatMap((z) => z.slots).filter((s) => !art.has(s.species)).map((s) => s.species);
    assert.deepEqual(left, [], f);
  }
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

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fallbackText, loadTextbot, ITEM_NAMES, withTextbotItemNames, TEXTBOT_FILES } from '../src/region9/textbot.js';
import { BATTLE_ITEMS } from '../src/systems/items.js';
const rd = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const J = JSON.parse(rd('data/textbot_r9_fill_items.json'));
const keys = Object.keys(J).filter((k) => !k.startsWith('_') && Array.isArray(J[k]));
const load = () => loadTextbot(async (u) => ({ ok: true, json: async () => JSON.parse(rd(u)) }));
test('textbot_r9_fill_items: wired, 6 fill keys resolve to Text Bot text', async () => {
  assert.ok(TEXTBOT_FILES.includes('data/textbot_r9_fill_items.json'));
  assert.equal(keys.length, 6);
  await load();
  for (const k of keys) { assert.ok(k.startsWith('r9.fill.'), k); assert.deepEqual(fallbackText(k), J[k], k); }
  assert.deepEqual(ITEM_NAMES, { tonic_small: 'Small Salve', tonic_large: 'Large Salve', energy_tonic: 'Energy Balm' });
});
test('textbot_r9_fill_items: no "tonic" in player text or item display names', async () => {
  await load();
  const lines = withTextbotItemNames(JSON.parse(rd('text/overworld_lines.json')));
  for (const [id, n] of Object.entries(ITEM_NAMES)) assert.equal(lines.system_item_catalogue[id].name, n);
  const bad = [];
  const walk = (o, path) => {
    if (typeof o === 'string') { if (/^[a-z0-9_.:]+$/.test(o)) return; /* ids, not text */ if (/tonic/i.test(o) || /(Small|Big|Pep) Remed/.test(o)) bad.push(path + ': ' + o); return; }
    if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) if (!k.startsWith('_') && k !== 'note') walk(v, path + '.' + k);
  };
  walk(lines, 'lines');
  for (const f of ['data/quests.json', 'data/region4/region4.json']) walk(JSON.parse(rd(f)), f);
  for (const k of keys) walk(J[k], k);
  for (const [id, it] of Object.entries(BATTLE_ITEMS)) walk(it.name, 'items.' + id);
  assert.deepEqual(bad, []);
});

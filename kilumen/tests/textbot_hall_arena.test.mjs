// Text Bot DRAFT lines (data/textbot_hall_arena.json) reach the game word for word, and the code fallbacks match them.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import { withDrafts, DRAFT_URLS } from '../src/systems/textbot_drafts.js';
import { ARENA_KEYS, ARENA_FALLBACK } from '../src/region78/arena.js';
import { WIP_KEY, WIP_TEXT } from '../src/systems/wip_notice.js';
const D = JSON.parse(fs.readFileSync(new URL('../data/textbot_hall_arena.json', import.meta.url)));
const L = JSON.parse(fs.readFileSync(new URL('../text/overworld_lines.json', import.meta.url)));
const get = (o, k) => k.split('.').reduce((a, p) => a?.[p], o);
const SRC = fs.readFileSync(new URL('../src/progression/hall_v2.js', import.meta.url), 'utf8').replace(/", "/g, '","');

test('draft file is the one the game loads', () => { assert.ok(DRAFT_URLS.includes('data/textbot_hall_arena.json')); });

test('every draft key wins over text/overworld_lines.json, word for word, and nothing else changes', () => {
  const m = withDrafts(structuredClone(L), D);
  for (const k of ['system_halls.gate_hint_plate', 'system_halls.gate_hint_crystal', 'system_halls.master_locked', 'system.wip_after_master8',
    'system_arena.rest_point', 'system_arena.rest_point_used', 'system_arena.fighter_second_first', 'maps.aurelith_arena.arena_second_7'])
    assert.deepEqual(get(m, k), get(D, k), k);
  assert.equal(Object.keys(m.maps).length, Object.keys(L.maps).length + (L.maps.aurelith_arena ? 0 : 1));
  assert.ok(!('_status' in m) || m._status === L._status);
});

test('code fallbacks are the draft pages', () => {
  assert.deepEqual(ARENA_FALLBACK.rest, get(D, ARENA_KEYS.rest).pages);
  assert.deepEqual(ARENA_FALLBACK.restUsed, get(D, ARENA_KEYS.restUsed).pages);
  assert.deepEqual(ARENA_FALLBACK.second, get(D, ARENA_KEYS.second).pages);
  assert.deepEqual(WIP_TEXT, get(D, WIP_KEY).pages);
  for (const k of ['gate_hint_plate', 'gate_hint_crystal', 'master_locked']) assert.ok(SRC.includes(JSON.stringify(D.system_halls[k].pages)), k);
});

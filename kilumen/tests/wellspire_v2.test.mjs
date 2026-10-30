// Wellspire v2 (Coder, Oct 29 2026): the climb maps exist with a puzzle each, every field research team trainer has a
// name + class, a team, and draft intro / after lines; the new text has no blocked words.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { FIELD_IDS, TALK } from '../src/region9/index.js';
import { FB2 } from '../src/region9/text_fallback_v2.js';
import { WELLSPIRE_TEAMS } from '../src/region9/teams.js';
const J = (m) => JSON.parse(fs.readFileSync(new URL(`../art/world/overworld/maps/${m}.json`, import.meta.url), 'utf8'));
const CLIMB = ['r9_cloudway', 'r9_echo_cave', 'r9_cloudline', 'r9_heart_cave'];
test('wellspire v2: the climb maps each have a puzzle and field team trainers', () => {
  for (const m of CLIMB) { const j = J(m); assert.ok(j.puzzle?.switches?.length && j.puzzle?.gates?.length, m); assert.ok(j.npcs.some((d) => d.kind === 'trainer'), m); }
  for (const m of ['fin_lab1_now', 'fin_past_enclosure']) assert.ok(J(m).ondravel, m);
});
test('wellspire v2: every field team trainer has a name, class, team and lines', () => {
  const maps = [...CLIMB, 'r9_old_riverbed', 'r9_skylift_upper', 'r9_switchbacks', 'r9_icefall'];
  const npcs = maps.flatMap((m) => J(m).npcs.map((d) => ({ m, d })));
  for (const id of FIELD_IDS) {
    const hit = npcs.find((q) => q.d.id === id); assert.ok(hit, id);
    assert.ok(hit.d.name && /^RT /.test(hit.d.trainer_class || ''), id);
    assert.ok(WELLSPIRE_TEAMS[`${hit.m}.${id}`]?.length, `team ${id}`);
    for (const k of [TALK[id].intro, TALK[id].after]) assert.ok(FB2[k]?.length, k);
  }
});
test('wellspire v2: no blocked words in the new text', () => {
  const s = JSON.stringify(FB2);
  for (const b of [/\bPP\b/, /shiny/i, /super effective/i, /Pok[eé]/i, /Gotcha/i, /nurse/i, /weed/i, /\broutes?\b/i, /berr(y|ies)/i, /elite/i, /\bgym/i, /throw/i, /tonic/i]) assert.ok(!b.test(s), String(b));
});

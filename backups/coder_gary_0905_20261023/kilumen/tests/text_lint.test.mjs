// Player-facing text lint (cspell, tools/text_lint). Free tools pass, Oct 23, 2026.
// Blocked words (flagWords): hits already listed in tools/text_lint/blocked_baseline.json warn; any NEW hit fails.
// Spelling is warn-only. Skips when tools/free_tools is not installed (CI runs only the root npm ci).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { available, spellcheck } from '../tools/text_lint/spellcheck.mjs';

const baseline = JSON.parse(readFileSync(new URL('../tools/text_lint/blocked_baseline.json', import.meta.url), 'utf8'));

const skip = available() ? false : 'cspell not installed (npm install in tools/free_tools)';

test('text lint: the blocked-word list catches IP and content words', { skip }, () => {
  const r = spellcheck({ stdin: 'The nurse healed your shiny partner. Grab a beer after.' });
  assert.deepEqual(r.forbidden.map((i) => i.word).sort(), ['beer', 'nurse', 'shiny']);
});

test('text lint: no new blocked words in player-facing text; spelling is warn-only', { skip }, () => {
  const r = spellcheck();
  for (const i of r.unknown) console.warn(`[text_lint] spelling? ${i.file}:${i.line} ${i.word}`);
  const counts = {};
  for (const i of r.forbidden) { const k = `${i.file}|${i.word.toLowerCase()}`; counts[k] = (counts[k] || 0) + 1; console.warn(`[text_lint] BLOCKED ${i.file}:${i.line} ${i.word}`); }
  const fresh = Object.entries(counts).filter(([k, n]) => n > (baseline[k] || 0)).map(([k, n]) => `${k} x${n} (baseline ${baseline[k] || 0})`);
  assert.deepEqual(fresh, [], 'new blocked words: fix the text (or, if Gary approves, update blocked_baseline.json)');
});

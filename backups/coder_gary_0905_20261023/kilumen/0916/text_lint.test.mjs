// Player-facing text lint (cspell, tools/text_lint). Free tools pass, Oct 23, 2026.
// Blocked words (flagWords): hits already listed in tools/text_lint/blocked_baseline.json warn; any NEW hit fails.
// Spelling is warn-only. Skips when tools/free_tools is not installed (CI runs only the root npm ci).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { available, spellcheck, phraseCheck } from '../tools/text_lint/spellcheck.mjs';

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

// Blocked phrases (Gary, Oct 23, 2026, 9:05 AM CT). Pure JS, so these run even without cspell installed.
test('text lint: blocked phrases (PP, super effective, Poke Ball, Gotcha!, tonic label) are caught', () => {
  const hits = phraseCheck({ stdin: "It's super effective! Gotcha! 10 PP left. Throw a Poké Ball. Buy a Tonic." }).map((h) => h.phrase);
  assert.deepEqual(hits, ['PP', 'super effective', 'Poké Ball', 'Gotcha!', 'tonic (label)']);
  assert.deepEqual(phraseCheck({ stdin: 'tonic_small is an id; happy apps; Super effort.' }), []);
});

test('text lint: no blocked phrases in player-facing text (design notes and ids are skipped)', () => {
  const hits = phraseCheck();
  assert.deepEqual(hits.map((h) => `${h.file} ${h.where} "${h.phrase}"`), []);
});

test('text lint: skip-heal label typo fixed and no shiny in player text (Oct 23, 2026)', () => {
  const L = JSON.parse(readFileSync(new URL('../text/overworld_lines.json', import.meta.url), 'utf8'));
  assert.equal(L.system_heal.choices.labels.skip_recal, 'Heal only, skip recall');
  assert.doesNotMatch(readFileSync(new URL('../src/systems/heal.js', import.meta.url), 'utf8'), /skip recal'/);
  assert.equal(baseline['text/overworld_lines.json|shiny'], undefined);
});

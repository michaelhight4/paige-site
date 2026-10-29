import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { rankMoves, countAt, shakeAt, themeOf, medalFor, gradePlace, TOWN_THEME, EVENT_TOWN } = await import('../src/sports/flair.js');
const { TS } = await import('../src/sports/town_strings.js');
test('rankMoves: up/down/new', () => { assert.deepEqual(rankMoves(null, ['a', 'b']), [null, null]); assert.deepEqual(rankMoves(['a', 'b', 'c'], ['c', 'a', 'b']), [2, -1, -1]); });
test('countAt eases and lands', () => { assert.equal(countAt(100, 0), 0); assert.equal(countAt(100, 1), 100); assert.ok(countAt(100, 0.5) > 50); assert.equal(countAt(10, 2, 4), 10); });
test('shakeAt off for reduced motion / tiny amp', () => { assert.deepEqual(shakeAt(5, 1, true), [0, 0]); assert.deepEqual(shakeAt(0, 1, false), [0, 0]); });
test('every event has a themed town; majors are Aurelith', () => { for (const t of Object.values(EVENT_TOWN)) assert.ok(TOWN_THEME[t]); assert.equal(themeOf('tide_run', true), 'aurelith'); });
test('medals', () => { assert.equal(medalFor(4), 0); assert.equal(gradePlace('gold'), 1); assert.equal(gradePlace('none'), 0); });
test('new text in placeholder keys, no blocked words', () => {
  assert.ok(TS.ui_go);
  const src = readFileSync(new URL('../src/sports/flair.js', import.meta.url), 'utf8') + TS.ui_go;
  for (const w of [/\bPP\b/, /shiny/i, /super effective/i, /Pok[eé]dex/i, /Pok[eé] Ball/i, /Gotcha!/, /\bnurse\b/i, /\bweed\b/i, /\broute\b/i, /\bberry\b/i]) assert.ok(!w.test(src), String(w));
});

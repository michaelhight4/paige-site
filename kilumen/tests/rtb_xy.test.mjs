// Real-time battle face buttons A / B / X / Y (Gary Oct 29 2026): each face fires a bindable skill (default skills 1-4), saved per creature.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = process.env.KIL_SRC || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const K = await import(path.join(ROOT, 'src/rtb/keys.js'));
test('A / B / X / Y default to skills 1-4 (fewer skills wrap)', () => {
  assert.deepEqual(K.faceSlots(null, 4), [0, 1, 2, 3]); assert.deepEqual(K.faceSlots(undefined, 2), [0, 1, 0, 1]); assert.deepEqual(K.faceSlots(null, 1), [0, 0, 0, 0]); });
test('saved binds kept when valid, reset when not', () => {
  assert.deepEqual(K.faceSlots([3, 2, 1, 0], 4), [3, 2, 1, 0]); assert.deepEqual(K.faceSlots([3, 2, 1, 0], 2), [0, 1, 0, 1]);
  assert.deepEqual(K.faceSlots([1, 1, 2, 3], 4), [0, 1, 2, 3]); assert.deepEqual(K.faceSlots([0, 1], 4), [0, 1, 2, 3]); });
test('binding a skill swaps with the face that held it', () => {
  assert.deepEqual(K.assignFace([0, 1, 2, 3], 'x', 0), [2, 1, 0, 3]); assert.deepEqual(K.assignFace([0, 1, 2, 3], 'a', 3), [3, 1, 2, 0]); assert.deepEqual(K.assignFace([0, 1, 2, 3], 'b', 1), [0, 1, 2, 3]); });
test('pad A 0 / B 1 / X 2 / Y 3 edges; dodge on R3; no clash with LB-RT skills', () => {
  const n = []; n[0] = n[3] = true; assert.deepEqual(K.padFaceEdges(n, []), ['a', 'y']); assert.deepEqual(K.padFaceEdges(n, n), []);
  for (const b of [0, 1, 2, 3, K.PAD_DODGE]) assert.ok(!K.PAD_SKILL_BUTTONS.includes(b)); assert.ok(![0, 1, 2, 3].includes(K.PAD_DODGE)); });
test('phone keeps a dodge control and shows all four faces', () => { const v = fs.readFileSync(path.join(ROOT, 'src/rtb/view.js'), 'utf8'), ix = fs.readFileSync(path.join(ROOT, 'src/rtb/index.js'), 'utf8');
  assert.match(v, /data-rtb="dodge"/); assert.match(v, /\['a', 'b', 'x', 'y'\]\.map/); assert.match(ix, /\[data-rtb="dodge"\]/); });
test('UI text avoids blocked words', () => { const v = fs.readFileSync(path.join(ROOT, 'src/rtb/view.js'), 'utf8') + fs.readFileSync(path.join(ROOT, 'src/rtb/index.js'), 'utf8');
  for (const s of v.match(/'[^'\n]*'|`[^`\n]*`|"[^"\n]*"/g)) assert.ok(!/\bPP\b|shiny|super effective|Pok[eé]dex|\bthrow\b/i.test(s), s); });

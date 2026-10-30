// Oct 30 2026: broken battle sprites (vaultpede / pricklon / geodurchin have no battle/ art yet). ui_sd.js falls back along the
// prevo chain; this checks every species reaches an existing front AND back battle PNG within 4 prevo steps, and that the
// fallback is wired (no bare img.src = front/back left).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { SPECIES, speciesById, battleSpriteRel } = await import(path.join(root, 'src/ui/data.js'));
const has = (id, side) => fs.existsSync(path.join(root, 'art/characters/pixel', battleSpriteRel(id, side)));

test('every species resolves to battle art (itself or a prevo within 4 steps), front and back', () => {
  const bad = [];
  for (const s of SPECIES) for (const side of ['front', 'back']) {
    let id = s.id, ok = false;
    for (let i = 0; id && i < 5 && !ok; i++) { ok = has(id, side); id = speciesById(id)?.prevo || null; }
    if (!ok) bad.push(`${s.id}:${side}`);
  }
  assert.deepEqual(bad, []);
});
test('battle UI sets creature sprites through the prevo fallback chain', () => {
  const src = fs.readFileSync(path.join(root, 'src/battle/ui_sd.js'), 'utf8');
  assert.match(src, /setMonSrc\(img, sp,/);
  assert.match(src, /img\.onerror = /);
  assert.doesNotMatch(src, /img\.src = cidleSrc\(s === 'p2' \? front\(sp\)/);
});

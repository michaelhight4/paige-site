// Jestrix line (Oct 29 2026): 5 species registered with art on disk, dex numbers unique, evolution chain by level,
// Dark/Devil stats rising per stage, Kilindex blurbs as Text Bot keys, no blocked player words.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SPECIES, iconRel, battleSpriteRel } from '../src/ui/data.js';
import { JESTRIX_LINE } from '../src/ui/species_jestrix.js';
import { buildCreatures } from '../src/battle/data/creatures.js';
import { evoTable, nextEvolution, evolveCreature } from '../src/systems/evolution.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PIX = path.join(ROOT, 'art/characters/pixel');
const IDS = ['jestrix', 'japkit', 'harlequop', 'mummerhop', 'maestrix'];

test('all five registered once, in dex order, unique dex numbers', () => {
  for (const id of IDS) assert.equal(SPECIES.filter((s) => s.id === id).length, 1, id);
  const dex = SPECIES.filter((s) => s.dex != null).map((s) => s.dex);
  assert.equal(new Set(dex).size, dex.length, 'duplicate dex number');
  assert.deepEqual(dex, [...dex].sort((a, b) => a - b));
  assert.deepEqual(JESTRIX_LINE.map((s) => s.dex), [274, 479, 480, 481, 482]);
});

test('art on disk: battle front/back, idles, 4-dir walks, icons', () => {
  for (const id of IDS) {
    const f = [battleSpriteRel(id, 'front'), battleSpriteRel(id, 'back'), battleSpriteRel(id, 'front', false), iconRel(id, 0), iconRel(id, 1)];
    for (const side of ['front', 'back']) for (let i = 0; i < 4; i++) f.push(`creatures/${id}/anim/${id}_${side}_idle/${id}_${side}_idle_f${i}.png`);
    for (const d of ['down', 'left', 'right', 'up']) { f.push(`creatures/${id}/overworld/${id}_ow/${id}_ow_${d}_stand.png`); for (let i = 0; i < 4; i++) f.push(`creatures/${id}/overworld/${id}_ow/${id}_ow_${d}_walk${i}.png`); }
    for (const p of f) assert.ok(fs.existsSync(path.join(PIX, p)), p);
  }
});

test('evolution chain 16 / 32 / 44 / 56 and evolve swaps species', () => {
  const t = evoTable(buildCreatures());
  assert.deepEqual(IDS.slice(0, 4).map((id) => [t[id].to, t[id].level]), [['japkit', 16], ['harlequop', 32], ['mummerhop', 44], ['maestrix', 56]]);
  assert.equal(t.maestrix, undefined);
  assert.equal(nextEvolution({ species: 'jestrix', level: 15 }, { table: t }), null);
  assert.equal(nextEvolution({ species: 'mummerhop', level: 56 }, { table: t }).to, 'maestrix');
  const c = { uid: 'u1', species: 'harlequop', level: 44, xp: 0, hp: 10 };
  evolveCreature(c, 'mummerhop');
  assert.equal(c.species, 'mummerhop');
});

test('Dark/Devil, stats and rewards rise each stage, catch rate falls', () => {
  const tot = (s) => Object.values(s.baseStats).reduce((a, b) => a + b, 0);
  JESTRIX_LINE.forEach((s, i) => {
    assert.deepEqual(s.el, ['dark', 'devil']);
    assert.equal(s.skillPool, 'dark');
    if (i) { const p = JESTRIX_LINE[i - 1]; assert.ok(tot(s) > tot(p) && s.baseXp > p.baseXp && s.catchRate < p.catchRate, s.id); }
  });
  assert.ok(tot(JESTRIX_LINE[4]) <= 540, 'final form stays near other finals');
});

test('Kilindex text is Text Bot keys only; no blocked words', () => {
  for (const s of JESTRIX_LINE) { assert.equal(s.blurbKey, `system_kilindex.entries.${s.id}.blurb`); assert.equal(s.blurb, ''); }
  const req = fs.readFileSync(path.join(ROOT, 'data/textbot_requests_jestrix.md'), 'utf8');
  for (const s of JESTRIX_LINE) assert.ok(req.includes(s.blurbKey));
  const shown = JSON.stringify(JESTRIX_LINE.map(({ name, found }) => [name, found]));
  for (const w of [/\bPP\b/, /shiny/i, /super effective/i, /Pok[eé]/i, /Gotcha/i, /nurse/i, /weed/i, /\broute\b/i, /berry/i, /throw/i]) assert.ok(!w.test(shown), String(w));
});

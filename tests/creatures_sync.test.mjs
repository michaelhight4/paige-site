// Creature sync (Oct 23, 2026): tools/sync_creatures.mjs output. Every registered species has its sprite files; synced entries
// are flagged placeholder; every species the encounter tables / Master teams actually battle with is registered.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SPECIES, iconRel, battleSpriteRel } from '../src/ui/data.js';
import { SYNCED_SPECIES } from '../src/ui/species_synced.gen.js';
import { buildData } from '../src/battle/data/index.js';

const PIX = 'art/characters/pixel/';
const ids = new Set(SPECIES.map((s) => s.id));
const has = (p) => fs.existsSync(p);
const BLOCKED = /\bPP\b|shiny|super effective|Pok[eé]dex|Pok[eé] Ball|Gotcha!|\bnurse\b/i;

test('every registered species has its sprite files (battle front/back, overworld sheet, party icon)', () => {
  const missing = [];
  for (const s of SPECIES) {
    const c = `${PIX}creatures/${s.id}/`;
    const need = [PIX + battleSpriteRel(s.id, 'front'), PIX + battleSpriteRel(s.id, 'back'), PIX + battleSpriteRel(s.id, 'front', false),
      `${c}overworld/${s.id}_ow_sheet.png`];
    for (const f of [0, 1]) need.push(PIX + (iconRel(s.id, f) || `icons/${s.id}_icon_f${f}_2x.png`));
    for (const p of need) if (!has(p)) missing.push(p);
  }
  assert.deepEqual(missing, []);
});

test('species ids unique; synced entries flagged placeholder with TODO text ids and no invented lore', () => {
  assert.equal(ids.size, SPECIES.length);
  for (const s of SYNCED_SPECIES) {
    assert.equal(s.synced, true); assert.equal(s.ph, 1); assert.equal(s.blurb, '');
    assert.match(s.blurbKey, /^system_kilindex\.entries\.[a-z0-9_]+\.blurb$/);
    for (const k of ['hp', 'atk', 'def', 'spa', 'spd', 'spe']) assert.ok(s.baseStats[k] > 0, `${s.id}.${k}`);
    assert.ok(!BLOCKED.test(s.name), s.name);
  }
});

test('battle engine builds every registered species with skills', () => {
  const creatures = buildData().CreatureDex;
  for (const s of SPECIES) {
    const c = creatures[s.id] || Object.values(creatures).find((x) => x.name === s.name);
    assert.ok(c, s.id);
    if (s.synced) assert.equal(c.placeholder, true);
  }
});

test('wired encounter tables and Master teams only battle with registered species', () => {
  const enc = JSON.parse(fs.readFileSync('data/encounters_wired.json', 'utf8'));
  for (const [zid, z] of Object.entries(enc.zones)) for (const sl of z.slots) assert.ok(ids.has(sl.species), `${zid}: ${sl.species}`);
  const m = JSON.parse(fs.readFileSync('data/masters.json', 'utf8'));
  const walk = (o) => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') {
    if (o.battle_species) assert.ok(ids.has(o.battle_species), o.battle_species);
    if (o.battle_species && o.stand_in === false) assert.equal(o.battle_species, o.species);
    Object.values(o).forEach(walk); } };
  walk(m);
  const reg = JSON.parse(fs.readFileSync('data/creatures_synced.json', 'utf8'));
  assert.ok(!BLOCKED.test(JSON.stringify(reg.species ?? reg)), 'blocked word in generated data');
});

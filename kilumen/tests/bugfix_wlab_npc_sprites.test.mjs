// Hotfix v0.2.102 (Oct 30 2026): Gary "npcs are invisible" in the Wellspire flashback lab (fin_past_wlab_01..10).
// The 16 lab-tech trainers had no npc_sprite_map entry and the runtime fallback only covers batch 3 (overnight) maps,
// so NpcSystem got sprite=null and drew nothing. Every lab NPC must resolve to a sheet that is shipped and precached.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spriteFor } from '../src/overworld/npcs.js';
import { withFallbacks } from '../src/overnight/npc_sprites.js';
import { WLAB_MAPS, WLAB_TRAINERS } from '../src/region9/index.js';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SM = JSON.parse(fs.readFileSync(path.join(ROOT, 'art/characters/pixel/npcs/npc_sprite_map.json'), 'utf8')).map;
const SW = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');

test('every flashback lab NPC has a sprite whose sheets ship (pngs are runtime-cached; the sprite map json is precached)', () => {
  let n = 0;
  WLAB_MAPS.forEach((name, i) => {
    const json = JSON.parse(fs.readFileSync(path.join(ROOT, `art/world/overworld/maps/${name}.json`), 'utf8'));
    const ids = (json.npcs || []).map((d) => d.id);
    for (const id of WLAB_TRAINERS[i]) assert.ok(ids.includes(id), `${name} places ${id}`);
    for (const d of json.npcs || []) {
      const e = spriteFor(withFallbacks({ name, json, npcs: json.npcs }, SM), name, d);
      assert.ok(e && e.overworld_sheet, `${name}.${d.id} has a sprite (else invisible)`); n++;
      for (const k of ['overworld_sheet', 'overworld_sheet_2x']) {
        const rel = 'art/characters/pixel/' + e[k];
        assert.ok(fs.existsSync(path.join(ROOT, rel)), `${rel} ships`);
      }
    }
  });
  assert.equal(n, WLAB_TRAINERS.flat().length);
  assert.ok(SW.includes('art/characters/pixel/npcs/npc_sprite_map.json'), 'sprite map is precached');
});

// Hotfix v0.2.102 part 2: 29 more NPCs (hall guides, saltmere hall master, cave/lab researchers, r9 pocket trainers,
// villagers) had no sprite either. Every visible NPC on every map must resolve to a sprite whose sheets exist.
// Allowlist = deliberate exceptions only, each with the reason.
const ALLOW = {
  // house_1f_v2.json is loaded under the name house_1f (Overworld.mapUrl, ix2), so Ron resolves via house_1f.ron;
  // he is also drawn by story_ron.js
  'house_1f_v2.ron': 'loaded as house_1f; story-drawn Ron',
};
const NOT_DRAWN = new Set(['object', 'spawn', 'sign', 'marker']);
test('every visible NPC on every map has a sprite with existing sheets', () => {
  const dir = path.join(ROOT, 'art/world/overworld/maps'), miss = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const name = f.slice(0, -5), json = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const sm = withFallbacks({ name, json, npcs: json.npcs || [] }, SM);
    for (const d of json.npcs || []) {
      if (!d?.id || NOT_DRAWN.has(d.kind) || ALLOW[`${name}.${d.id}`]) continue;
      const e = spriteFor(sm, name, d);
      if (!e?.overworld_sheet) { miss.push(`${name}.${d.id}`); continue; }
      if (!fs.existsSync(path.join(ROOT, 'art/characters/pixel', e.overworld_sheet))) miss.push(`${name}.${d.id} -> missing ${e.overworld_sheet}`);
    }
  }
  assert.deepEqual(miss, []);
});

// Bar NPCs (Oct 29, 2026, Gary "the bars npcs are invisible"): the Firefly (club_int, the game's only bar) placed its
// cast from text_pending.npcs (solid + talkable) but npc_sprite_map.json had no club_int.* keys, so Npc.sprite was null
// and _loadActorSprites skipped them: invisible people you bump into. Guard: every NPC the loader places in a bar map
// has a sprite entry whose 1x/2x/3x sheets exist. SITE=/path/to/tree checks another tree (e.g. the live clone).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.SITE || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const J = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const BAR_MAPS = fs.readdirSync(path.join(ROOT, 'art/world/overworld/maps')).map((f) => f.replace(/\.json$/, ''))
  .filter((n) => /^(club|bar|tavern|pub|inn|saloon|lounge)(_|$)/.test(n));
const lines = J('text/overworld_lines.json').maps || {};
const sprites = J('art/characters/pixel/npcs/npc_sprite_map.json').map;

/** Same rule as Overworld.loadMap: npcs + (npcs_pending_text, text_pending.npcs) that have lines, minus variants/spawns. */
function placed(name) {
  const m = J(`art/world/overworld/maps/${name}.json`), lm = lines[name], out = [...(m.npcs || [])];
  if (lm) {
    const ids = new Set(out.map((d) => d.id));
    for (const d of [...(m.npcs_pending_text || []), ...(m.text_pending?.npcs || [])]) {
      if (!d.variant_of && !ids.has(d.id) && lm[d.id]) { out.push(d); ids.add(d.id); }
    }
  }
  return out.filter((d) => d.kind !== 'spawn' && d.kind !== 'object' && Number.isInteger(d.x));
}

test('there is at least one bar interior (club_int, The Firefly)', () => assert.ok(BAR_MAPS.includes('club_int'), BAR_MAPS.join()));

for (const name of BAR_MAPS) {
  test(`${name}: every placed NPC has a sprite with real sheets`, () => {
    const cast = placed(name);
    assert.ok(cast.length >= 7, `${name} cast placed: ${cast.length}`);
    for (const d of cast) {
      const sp = sprites[`${name}.${d.id}`];
      assert.ok(sp?.overworld_sheet, `${name}.${d.id} has no npc_sprite_map entry (renders invisible)`);
      for (const k of ['overworld_sheet', 'overworld_sheet_2x', 'overworld_sheet_3x']) {
        assert.ok(fs.existsSync(path.join(ROOT, 'art/characters/pixel', sp[k])), `${name}.${d.id} ${k} missing: ${sp[k]}`);
      }
    }
  });
}

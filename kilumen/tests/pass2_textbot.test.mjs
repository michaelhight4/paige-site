// Text Bot's pass 2 lines (Oct 30 2026): every key resolves to a real pocket trainer / egg, trainers carry pages,
// battle_lost, battle_won and after, the loader prefers them over the DRAFT fallback, and no blocked words appear.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PASS2_TEXT_FILES, addPass2Text, withPass2Fallback } from '../src/region9/textbot.js';
const R = (p) => JSON.parse(fs.readFileSync(new URL('../' + p, import.meta.url)));
const SPEC = R('data/pass2_caves.json'), FB = R('data/pass2_caves_fallback.json');
const BLOCKED = /\bPP\b|shiny|super effective|pok[eé]dex|pok[eé] ?ball|gotcha!|\bnurse|\bweed|tonic|\broute\b|\belite\b|\bbeer|\bwine|whisk|vodka|\brum\b|liquor|\bale\b|drunk|cigar|smok|tobacco|\bdrug|\bpills?\b/i;
const strings = (o) => typeof o === 'string' ? [o] : Array.isArray(o) ? o.flatMap(strings) : o && typeof o === 'object' ? Object.values(o).flatMap(strings) : [];
for (const f of PASS2_TEXT_FILES) {
  test(`${f}: keys resolve, trainers have all four lines, no blocked words`, () => {
    const o = R(f);
    for (const [m, ids] of Object.entries(o.maps)) {
      const map = R(`art/world/overworld/maps/${m}.json`);
      for (const [id, e] of Object.entries(ids)) {
        const npc = map.npcs.find((n) => n.id === id), spot = (map.interact_spots || []).find((s) => s.id === id);
        assert.ok(npc || spot || id === 'area_name', `${m}.${id} resolves on the map`);
        assert.ok(FB.maps[m]?.[id], `${m}.${id} mirrors a pass 2 key`);
        if (npc) for (const k of ['pages', 'battle_lost', 'battle_won', 'after']) assert.ok(e[k]?.length && e[k].every((s) => typeof s === 'string' && s.trim()), `${m}.${id}.${k}`);
        else assert.ok(e.pages?.length, `${m}.${id}.pages`);
        for (const s of strings(e)) assert.ok(!BLOCKED.test(s), `${m}.${id}: blocked word in "${s}"`);
      }
    }
    // every pocket trainer / egg on a covered map has a Text Bot line
    for (const p of SPEC.pockets.filter((q) => o.maps[q.map])) for (const id of [p.trainer.id, p.egg.id]) assert.ok(o.maps[p.map][id], `${p.map}.${id} missing`);
    // loader: Text Bot text beats the DRAFT fallback, overworld_lines still beats both
    const fin = addPass2Text(o, { maps: {} });
    const [m, ids] = Object.entries(o.maps)[0]; const id = Object.keys(ids).find((k) => ids[k].battle_won);
    const out = withPass2Fallback({ maps: {} }, FB, fin);
    assert.deepEqual(out.maps[m][id].battle_won, ids[id].battle_won);
    assert.ok(!strings(out.maps[m][id]).some((s) => s.startsWith('DRAFT: ')));
    const keep = withPass2Fallback({ maps: { [m]: { [id]: { pages: ['x'] } } } }, FB, fin);
    assert.deepEqual(keep.maps[m][id].pages, ['x']);
  });
}

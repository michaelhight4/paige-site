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
test('PASS2_TEXT_FILES lists switchbacks and batch 2', () => {
  for (const f of ['data/textbot_pass2_switchbacks.json', 'data/textbot_pass2_batch2.json']) assert.ok(PASS2_TEXT_FILES.includes(f), f);
  const b2 = R('data/textbot_pass2_batch2.json');
  for (const m of ['r9_icefall', 'fin_summit_camp', 'r9_old_riverbed', 'r9_cairnfold']) assert.ok(b2.maps[m], m);
  assert.equal(b2.maps.fin_summit_camp.r9_fscp_lookout.name, 'Kesia');
  assert.equal(SPEC.pockets.flatMap((p) => [p.trainer]).find((t) => t.id === 'r9_fscp_lookout').name, 'Kesia');
  for (const c of ['r9_cairnfold_cave_w', 'r9_cairnfold_cave_e']) assert.ok(FB.maps[c]?.area_name, c + ' area_name');
  // batch 3: caldera, cindervale, grotto, lanternport, saltmere; area names keyed by the real cave ids; watcher Ilse -> Runa
  assert.ok(PASS2_TEXT_FILES.includes('data/textbot_pass2_batch3.json'));
  const b3 = R('data/textbot_pass2_batch3.json');
  for (const m of ['cindervale_caldera', 'cindervale', 'lanternport_grotto', 'lanternport', 'route_aurelith_saltmere']) assert.ok(b3.maps[m], m);
  const names = { cindervale_caldera_cave: 'Ash Vent', lanternport_grotto_cave: 'Lamp Loft', route_aurelith_saltmere_cave_w: 'Salt Cellar', route_aurelith_saltmere_cave_m: 'Gull Notch', route_aurelith_saltmere_cave_e: 'Tide Loft' };
  for (const [c, n] of Object.entries(names)) { assert.equal(b3.area_names[c], n, c); assert.equal(SPEC.pockets.find((p) => p.cave === c)?.cave_title, n, c + ' cave title'); }
  assert.equal(b3.maps.cindervale.r9_cvp_watcher.name, 'Runa');
  assert.equal(SPEC.pockets.find((p) => p.trainer.id === 'r9_cvp_watcher').trainer.name, 'Runa');
  assert.equal(FB.maps.cindervale.r9_cvp_watcher.name, 'Runa');
  assert.equal(b3.maps.route_aurelith_saltmere.r9_rasp_gullkeeper.name, 'Tarn'); // Pell is the Cairnfold digger
  assert.equal(SPEC.pockets.find((p) => p.trainer.id === 'r9_rasp_gullkeeper').trainer.name, 'Tarn');
  // batch 4: sunmeadow, aurelith, route_east, route_revival; 12 area names = cave titles; renames Pell -> Jory -> Algot, Wren -> Maja
  assert.ok(PASS2_TEXT_FILES.includes('data/textbot_pass2_batch4.json'));
  const b4 = R('data/textbot_pass2_batch4.json');
  for (const m of ['sunmeadow_fields', 'aurelith', 'route_east', 'route_revival']) assert.ok(b4.maps[m], m);
  assert.equal(Object.keys(b4.area_names).length, 12);
  for (const [c, n] of Object.entries(b4.area_names)) assert.equal(SPEC.pockets.find((p) => p.cave === c)?.cave_title, n, c + ' cave title');
  for (const [id, n] of [['r9_aurp_signaller', 'Algot'], ['r9_rrp_herbalist', 'Maja']]) assert.equal(SPEC.pockets.find((p) => p.trainer.id === id).trainer.name, n, id);
  assert.equal(b4.maps.aurelith.r9_aurp_signaller.name, 'Algot'); // Jory is Master Jory Swell
  // batch 5: revival_heights pockets; Ottilie -> Ebba (Ottilie is the Saltmere tide caller)
  assert.ok(PASS2_TEXT_FILES.includes('data/textbot_pass2_batch5.json'));
  const b5 = R('data/textbot_pass2_batch5.json');
  // GD Oct 30 2026: Archive Room -> route_revival_sunmeadow, Break Garden -> route_revival_saltmere (max 1 cave per town)
  assert.equal(Object.keys(b5.maps.revival_heights).length, 5); // 2 Server Nook keys + 3 stall keepers (stall_shop)
  for (const k of ['revival_heights_stall_baker', 'revival_heights_stall_florist', 'revival_heights_stall_grocer']) assert.ok(b5.maps.revival_heights[k]?.pages?.length, k);
  assert.equal(Object.keys(b5.maps.route_revival_sunmeadow).length, 2);
  assert.equal(Object.keys(b5.maps.route_revival_saltmere).length, 2);
  for (const [c, n] of Object.entries(b5.area_names)) assert.equal(SPEC.pockets.find((p) => p.cave === c)?.cave_title, n, c + ' cave title');
  // logger scene (Gary 11:10 AM CT): every new Revival Heights NPC has Text Bot pages and is no longer text_pending
  assert.ok(PASS2_TEXT_FILES.includes('data/textbot_logger_scene.json'));
  const ls = R('data/textbot_logger_scene.json').maps.revival_heights, RH = R('art/world/overworld/maps/revival_heights.json');
  for (const k of ['revival_heights_logger', 'revival_heights_tree_kilu', 'revival_heights_kid_hopscotch', 'revival_heights_kid_dog']) {
    assert.ok(ls[k]?.pages?.length, k); const n = RH.npcs.find((d) => d.id === k); assert.ok(n, k + ' placed'); assert.ok(!n.text_pending, k + ' text_pending'); }
  assert.ok(PASS2_TEXT_FILES.includes('data/textbot_revival_heights_park.json')); const pk = R('data/textbot_revival_heights_park.json').maps.revival_heights;
  for (const k of ['revival_heights_stall_crystal', 'revival_heights_stall_toys', 'revival_heights_stroller_park', 'revival_heights_stroller_walk']) {
    assert.ok(pk[k]?.pages?.length, k); const n = RH.npcs.find((d) => d.id === k); assert.ok(n, k + ' placed'); assert.ok(!n.text_pending, k + ' text_pending'); }
  for (const [id, n, mp] of [['r9_rhp_archivist', 'Ebba', 'route_revival_sunmeadow'], ['r9_rhp_technician', 'Sixten', 'revival_heights'], ['r9_rhp_gardener', 'Brita', 'route_revival_saltmere']]) { assert.equal(b5.maps[mp][id].name, n, id); assert.equal(SPEC.pockets.find((p) => p.trainer.id === id).trainer.name, n, id); assert.equal(FB.maps[mp][id].name, n, id + ' fallback'); }
});
for (const f of PASS2_TEXT_FILES) {
  test(`${f}: keys resolve, trainers have all four lines, no blocked words`, () => {
    const o = R(f);
    for (const [m, ids] of Object.entries(o.maps)) {
      const map = R(`art/world/overworld/maps/${m}.json`);
      for (const [id, e] of Object.entries(ids)) {
        const npc = map.npcs.find((n) => n.id === id), spot = (map.interact_spots || []).find((s) => s.id === id);
        assert.ok(npc || spot || id === 'area_name', `${m}.${id} resolves on the map`);
        const town = npc && !npc.team && !npc.pocket; // stall keepers / logger scene: town NPCs, not pocket keys
        if (!town) assert.ok(FB.maps[m]?.[id], `${m}.${id} mirrors a pass 2 key`);
        if (npc && !town) for (const k of ['pages', 'battle_lost', 'battle_won', 'after']) assert.ok(e[k]?.length && e[k].every((s) => typeof s === 'string' && s.trim()), `${m}.${id}.${k}`);
        else assert.ok(e.pages?.length, `${m}.${id}.pages`);
        for (const s of strings(e)) assert.ok(!BLOCKED.test(s), `${m}.${id}: blocked word in "${s}"`);
      }
    }
    // every pocket trainer / egg on a covered map has a Text Bot line
    const all = PASS2_TEXT_FILES.reduce((a, g) => addPass2Text(R(g), a), { maps: {} }); // a map may be split over files (logger scene)
    for (const p of SPEC.pockets.filter((q) => o.maps[q.map])) for (const id of [p.trainer.id, p.egg.id]) assert.ok(all.maps[p.map][id], `${p.map}.${id} missing`);
    // loader: Text Bot text beats the DRAFT fallback, overworld_lines still beats both
    const fin = addPass2Text(o, { maps: {} });
    const [m, ids] = Object.entries(o.maps)[0]; const id = Object.keys(ids).find((k) => ids[k].battle_won) || Object.keys(ids)[0];
    const out = withPass2Fallback({ maps: {} }, FB, fin);
    assert.deepEqual(out.maps[m][id].battle_won ?? out.maps[m][id].pages, ids[id].battle_won ?? ids[id].pages);
    assert.ok(!strings(out.maps[m][id]).some((s) => s.startsWith('DRAFT: ')));
    const keep = withPass2Fallback({ maps: { [m]: { [id]: { pages: ['x'] } } } }, FB, fin);
    assert.deepEqual(keep.maps[m][id].pages, ['x']);
  });
}
test('Sunmeadow strollers text is wired (GD Oct 30 2026)', () => {
  assert.ok(PASS2_TEXT_FILES.includes('data/textbot_sunmeadow_strollers.json'));
  const sm = R('data/textbot_sunmeadow_strollers.json').maps.sunmeadow_fields;
  const map = R('art/world/overworld/maps/sunmeadow_fields.json');
  for (const id of ['sunmeadow_fields_stroller_pond', 'sunmeadow_fields_stroller_green']) {
    assert.ok(sm[id]?.pages?.length, id); const n = map.npcs.find((x) => x.id === id);
    assert.ok(n && !n.text_pending && n.text_ref.startsWith('data/textbot_sunmeadow_strollers.json'), id);
  }
});
// Aurelith strollers test dropped in v0.2.108-alpha: Aurelith keeps its live layout (no GD strollers).

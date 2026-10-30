// dev/regions-5-8 (Oct 29 2026): regions 5-8 reachable, linked, populated with art-backed species, gated in coin order.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pageDue, idCapFlag78, promotions78, R78 } from '../src/region78/index.js';
import { TRIGGER, WIP_FLAG } from '../src/systems/wip_notice.js';
import { trainerOutcome } from '../src/battle/story.js';
import { RON_PUNCH_LIST } from '../src/overworld/ron_whereabouts.js';
const J = (p) => JSON.parse(fs.readFileSync(new URL(`../${p}`, import.meta.url)));
const MAP = (n) => J(`art/world/overworld/maps/${n}.json`);
const F = (...a) => new Set(a);
export const REGIONS = {
  5: ['sunmeadow_fields', 'route_revival_sunmeadow', 'route_sunmeadow_mirefen', 'route_saltmere_mirefen', 'mirefen', 'mirefen_bog', 'mirefen_hall_int'],
  6: ['route_coast', 'tidewater_coast', 'tidewater_hall_int', 'tidewater_cave_int'],
  7: ['route_fernwick_lanternport', 'lanternport', 'lanternport_hall_int'],
  8: ['route_cindervale', 'cindervale', 'cindervale_hall_int'],
};
const enc = J('data/encounters_wired.json'), art = new Set(enc.species_with_art);
const stand = J('data/standins_overnight.json').trainer_species || {};
const layout = J('art/world/overworld/world_layout.json');
const built = new Set(layout.maps_built || Object.keys(layout.maps || {}));

for (const [r, maps] of Object.entries(REGIONS)) {
  test(`region ${r}: maps exist and every warp / exit points at a map file`, () => {
    for (const m of maps) {
      const d = MAP(m);
      for (const w of d.warps || []) assert.ok(fs.existsSync(new URL(`../art/world/overworld/maps/${w.to}.json`, import.meta.url)), `${m} warp -> ${w.to}`);
      for (const e of d.exits || []) if (!/TO COME/.test(e.note || '')) assert.ok(fs.existsSync(new URL(`../art/world/overworld/maps/${e.to}.json`, import.meta.url)), `${m} exit -> ${e.to}`);
    }
  });
  test(`region ${r}: wild tables use species with art; trainer teams use art or a stand-in`, () => {
    for (const m of maps) {
      const d = MAP(m);
      for (const z of d.encounter_zones || []) {
        const t = enc.zones[z.table]; assert.ok(t, `${m}: table ${z.table}`);
        for (const s of t.slots || []) assert.ok(art.has(s.species), `${z.table}: ${s.species} has no art`);
      }
      for (const n of d.npcs || []) {
        if (!n.team) continue;
        const sp = Array.isArray(n.team) ? n.team.map((x) => x.species) : Object.values(n.team).flat().filter((x) => x && x.species).map((x) => x.species);
        for (const s of sp) assert.ok(art.has(s) || stand[s], `${m}.${n.id}: ${s}`);
      }
    }
  });
}
test('Masters 5-8 exist in coin order with built halls', () => {
  const ms = J('data/masters.json'); const halls = ms.halls || ms;
  const list = Array.isArray(halls) ? halls : Object.values(halls);
  for (const [coin, zone] of [[5, 'mirefen'], [6, 'tidewater_coast'], [7, 'lanternport'], [8, 'cindervale']]) {
    const h = list.find((x) => x.zone === zone); assert.ok(h, zone); assert.equal(Number(h.coin_number ?? h.coin ?? h.number ?? coin), coin);
  }
});
test('Benefits: region 7 / 8 caps, region flags, key card nodes', () => {
  const b = J('data/rt_benefits.json');
  assert.equal(b.regions['7'].maxIdLevel, 60); assert.equal(b.regions['8'].maxIdLevel, 60);
  assert.equal(b.regionFlags['7'], 'beat_master_tidewater'); assert.equal(b.regionFlags['8'], 'beat_master_lanternport');
  for (const [id, f, p] of [['rt_node_station_l', 'rt_keycard_r7', 'promoted_id18'], ['rt_node_station_c', 'rt_keycard_r8', 'promoted_id20']]) {
    const n = b.nodes.find((x) => x.id === id); assert.ok(n, id); assert.equal(n.grantFlag, f); assert.equal(n.requiresFlag, p);
  }
});
test('gates: Cindervale road opens with the Lanternport coin; coast road needs Tideglide', () => {
  const g = Object.fromEntries(layout.story_gates.live.map((x) => [x.id, x.flag]));
  assert.equal(g.gate_cindervale_giant, 'beat_master_lanternport'); assert.equal(g.gate_coast_road_flood, 'has_tideglide');
  assert.equal(g.gate_aurelith_arena, 'all_badges');
});
test('WIP notice moved to after Master 8', () => { assert.equal(TRIGGER, 'beat_master_cindervale'); assert.equal(WIP_FLAG, 'seen_wip_notice_r8'); });
test('Ron: Lanternport page hand-off once, after the Tidewater coin; Ron 6 stays the Aurelith finale', () => {
  assert.equal(pageDue(F(), 'lanternport'), false);
  assert.equal(pageDue(F('beat_master_tidewater'), 'lanternport'), true);
  assert.equal(pageDue(F('beat_master_tidewater', R78.pageFlag), 'lanternport'), false);
  assert.equal(pageDue(F('beat_master_tidewater'), 'cindervale'), false);
  assert.equal(RON_PUNCH_LIST.at(-1).flag, 'beat_rival_ron_6');
  assert.ok(!MAP('lanternport').npcs.some((n) => n.id === 'lanternport_ron_5')); // §L: catch-up removed, talk-only hand-off
  assert.ok(trainerOutcome('aurelith', 'aurelith_ron_6', false).blackoutOnLoss);
});
test('ID caps + promotions 18 / 20', () => {
  assert.equal(idCapFlag78(18), 'id_cap_r7'); assert.equal(idCapFlag78(20), 'id_cap_r8'); assert.equal(idCapFlag78(17), null);
  assert.deepEqual(promotions78(F('beat_master_lanternport'), 18), ['promoted_id18']);
  assert.deepEqual(promotions78(F('beat_master_lanternport'), 17), []);
  assert.deepEqual(promotions78(F('beat_master_lanternport', 'beat_master_cindervale'), 20), ['promoted_id18', 'promoted_id20']);
});
test('blocked words: none in the region 7-8 module or plan', () => {
  const bad = /\bPP\b|shiny|super effective|Pok[eé]dex|Pok[eé] Ball|Gotcha!|\bnurse\b|\bweed\b|\broutes?\b|\bberr(y|ies)\b|\bthrow/i;
  for (const p of ['src/region78/index.js', 'design/REGIONS_78_PLAN.md', 'data/textbot_requests_r78.md']) {
    const u = new URL(`../${p}`, import.meta.url); if (!fs.existsSync(u)) continue;
    const lines = fs.readFileSync(u, 'utf8').split('\n').filter((l) => bad.test(l) && !/blocked|route_|routes?\.|_route/i.test(l));
    assert.deepEqual(lines, [], p);
  }
});

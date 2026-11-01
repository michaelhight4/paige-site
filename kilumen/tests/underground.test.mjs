// Kilumen Underground + Guardian side stories (dev/underground, Oct 30 2026). Built by tools/underground/build_underground.py.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stateMatches } from '../src/overworld/lines.js';
import { dailyBump, UG_SEEN_PREFIX } from '../src/underground/index.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const J = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const map = (n) => J(`art/world/overworld/maps/${n}.json`);
const PASS = new Set([0, 2, 4, 7, 8, 9, 10, 3, 11]);
const NEW_MAPS = ['greystone_seam', 'revival_rt_annex'];
const quests = J('data/quests.json').quests.filter((q) => /^sq_(ug|gd)_/.test(q.id));
const linesTxt = fs.readFileSync(path.join(root, 'text/overworld_lines.json'), 'utf8');
// Reward ids: real items (items.js), held items (held_items.js), or a placeholder id an older quest already uses.
const itemsJs = ['src/systems/items.js', 'src/battle/data/held_items.js'].map((p) => fs.readFileSync(path.join(root, p), 'utf8')).join('\n')
  + JSON.stringify(J('data/quests.json').quests.filter((q) => !/^sq_(ug|gd)_/.test(q.id)).map((q) => q.reward));

function reach(m, seeds) {
  const col = m.layers.collision, H = col.length, W = col[0].length, seen = new Set(), st = seeds.slice();
  while (st.length) { const [x, y] = st.pop(), k = `${x},${y}`;
    if (seen.has(k) || x < 0 || y < 0 || x >= W || y >= H || !PASS.has(col[y][x])) continue; seen.add(k);
    st.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); }
  return seen;
}
const arrivalsInto = (name) => fs.readdirSync(path.join(root, 'art/world/overworld/maps')).filter((f) => f.endsWith('.json'))
  .flatMap((f) => (map(f.slice(0, -5)).warps || []).filter((w) => w.to === name).map((w) => [w.tx, w.ty]));

test('new maps are registered in a zone and have an arrival', () => {
  const wl = J('art/world/overworld/world_layout.json');
  const zoned = new Set((wl.zones || []).flatMap((z) => z.maps || []));
  for (const n of NEW_MAPS) assert.ok(zoned.has(n) || JSON.stringify(wl).includes(`"${n}"`), `${n} not in world_layout`);
  assert.ok(arrivalsInto('greystone_seam').length, 'no warp into greystone_seam');
  assert.ok(JSON.stringify(wl.interior_doors || {}).includes('revival_rt_annex') || arrivalsInto('revival_rt_annex').length, 'annex door missing');
});

test('every warp in and out of the new maps lands on a walkable cell', () => {
  for (const n of [...NEW_MAPS, 'greystone_b1', 'revival_heights']) for (const w of map(n).warps || []) {
    if (w.to === '$return' || !('tx' in w)) continue;
    const c = map(w.to).layers.collision[w.ty]?.[w.tx];
    assert.ok(PASS.has(c), `${n} -> ${w.to} (${w.tx},${w.ty}) code ${c}`);
  }
});

test('new maps: every warp, spot stand, NPC neighbour and item is reachable from the arrival', () => {
  for (const n of NEW_MAPS) {
    const m = map(n), seeds = arrivalsInto(n);
    for (const d of Object.values(J('art/world/overworld/world_layout.json').interior_doors || {}))
      if (d && d.map === n && 'x' in d) seeds.push([d.x, d.y]);
    for (const w of m.warps || []) if (w.to === '$return') seeds.push([w.x, w.y]);
    const R = reach(m, seeds);
    for (const w of m.warps || []) assert.ok(R.has(`${w.x},${w.y}`), `${n} warp (${w.x},${w.y}) unreachable`);
    for (const s of m.interact_spots || []) { const [x, y] = s.stand || [s.x, s.y]; assert.ok(R.has(`${x},${y}`), `${n} spot ${s.id} stand unreachable`); }
    for (const p of [...(m.npcs || []), ...(m.items || [])]) {
      const ok = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => R.has(`${p.x + dx},${p.y + dy}`));
      assert.ok(ok, `${n} ${p.id} at (${p.x},${p.y}) unreachable`);
    }
  }
});

test('18 underground/guardian quests; givers and step targets exist', () => {
  assert.equal(quests.length, 18);
  for (const q of quests) {
    const g = map(q.giver.map);
    assert.ok([...(g.npcs || []), ...(g.npcs_pending_text || []), ...(g.text_pending?.npcs || [])].some((n) => n.id === q.giver.npc), `${q.id}: giver ${q.giver.npc} not on ${q.giver.map}`);
    for (const s of q.steps.slice(0, -1))
      assert.ok(linesTxt.includes(`"sets": "${s.flag}"`) || linesTxt.includes(`"${s.flag}"`), `${q.id}: nothing sets ${s.flag}`);
    for (const s of q.steps) assert.doesNotThrow(() => map(s.map), `${q.id}: step map ${s.map}`);
    for (const it of q.reward.items_placeholder || []) assert.ok(itemsJs.includes(`${it.id}`) /* word match below */ && new RegExp(`\\b${it.id}\\b`).test(itemsJs), `${q.id}: reward item ${it.id} unknown`);
    for (const l of q.lines) assert.ok(l.key?.startsWith('underground_quests.') && l.text?.length, `${q.id}: line missing key/text`);
  }
});

test('lead_warmth_gte gates on the lead\'s Warmth', () => {
  assert.equal(stateMatches({ lead_warmth_gte: 50 }, { leadWarmth: 50 }), true);
  assert.equal(stateMatches({ lead_warmth_gte: 50 }, { leadWarmth: 49 }), false);
  assert.equal(stateMatches({ lead_warmth_gte: 0 }, { leadWarmth: null }), false);
  assert.equal(stateMatches({ lead_warmth_gte: 50 }, {}), false);
});

test('dailyBump counts once per game day and honours requires/stop', () => {
  const sp = { id: 'ug_two_pots', daily_counter: 'ug_pots_days', daily_requires: 'sq_x_start', daily_stop: 'sq_x_done' };
  const seen = {};
  assert.equal(dailyBump(sp, new Set(), seen, 1), false);
  assert.equal(dailyBump(sp, new Set(['sq_x_start']), seen, 1), true);
  seen[UG_SEEN_PREFIX + sp.id] = 1;
  assert.equal(dailyBump(sp, new Set(['sq_x_start']), seen, 1), false);
  assert.equal(dailyBump(sp, new Set(['sq_x_start']), seen, 2), true);
  assert.equal(dailyBump(sp, new Set(['sq_x_start', 'sq_x_done']), seen, 3), false);
  assert.equal(dailyBump({ id: 'a' }, new Set(), {}, 1), false);
});

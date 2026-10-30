// finish-a item 5: Gary's region caps, region-tied nodes for regions 1-8, research_clearance retired (refunded).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { regionCap, mapRegion, nodeState, RtBenefits } from '../src/systems/rt_benefits.js';
const data = JSON.parse(fs.readFileSync(new URL('../data/rt_benefits.json', import.meta.url)));
const lines = JSON.parse(fs.readFileSync(new URL('../text/overworld_lines.json', import.meta.url)));
const CAPS = { 1: 12, 2: 20, 3: 28, 4: 36, 5: 42, 6: 50, 7: 60, 8: 60 };
// tools/encounter_levels/check.py BANDS (wild hi per region, story order)
const BAND_HI = [12, 20, 28, 36, 44, 52, 66, 68];

test('region caps are the approved values, never above the wild band top, no placeholders', () => {
  for (const [r, c] of Object.entries(CAPS)) {
    assert.equal(regionCap(data, Number(r)), c);
    assert.ok(c <= BAND_HI[r - 1], `R${r} cap ${c} over band ${BAND_HI[r - 1]}`);
    assert.doesNotMatch(data.regions[r]._note, /PLACEHOLDER/);
  }
  const py = fs.readFileSync(new URL('../tools/encounter_levels/check.py', import.meta.url), 'utf8');
  const bands = JSON.parse(py.match(/^BANDS = (\[.*\])$/m)[1].replace(/\(/g, '[').replace(/\)/g, ']'));
  assert.deepEqual(bands.slice(0, 8).map((b) => b[1]), BAND_HI);
  for (let r = 2; r <= 8; r++) assert.ok(CAPS[r] >= CAPS[r - 1]);
});

test('one region-tied node per region 1-8, with text', () => {
  for (let r = 1; r <= 8; r++) {
    const ns = data.nodes.filter((n) => n.effect === 'money.region_payout' && n.region === r);
    assert.equal(ns.length, 1, `region ${r}`); const n = ns[0];
    assert.equal(n.unlockRegion, r); assert.ok(n.ranks.every((k) => k.minIdLevel <= CAPS[8]));
    assert.ok(n.ranks[0].minIdLevel <= CAPS[r], `R${r} rank 1 reachable under the cap`);
    assert.ok(data.branches.some((b) => b.id === n.branch));
    const t = lines.system_rt_benefits.nodes[n.id]; assert.ok(t?.name && t.desc && t.ranks['1'] && t.ranks['2']);
  }
  assert.equal(new Set(data.nodes.map((n) => n.id)).size, data.nodes.length);
});

test('research_clearance is off the board and refunds spent points', () => {
  assert.ok(!data.nodes.some((n) => n.id === 'research_clearance'));
  const sys = { company: { idLevel: 16, pointsFree: 0, board: { research_clearance: 2 }, xp: 0, xpClaims: {} } };
  const rt = new RtBenefits({ flags: new Set(), log: [] }, sys, data);
  assert.equal(rt.company.pointsFree, 2); assert.equal(rt.company.board.research_clearance, undefined);
  new RtBenefits({ flags: new Set(), log: [] }, sys, data); assert.equal(sys.company.pointsFree, 2); // once only
});

test('mapRegion + regionPayout: the bonus applies only in its own region', () => {
  assert.equal(mapRegion('route1'), 1); assert.equal(mapRegion('saltmere_hall_int'), 2); assert.equal(mapRegion('cindervale'), 8);
  assert.equal(mapRegion('fin_lab1_now'), null); assert.equal(mapRegion('aurelith_terminal_int'), null);
  const sys = { company: { idLevel: 30, pointsFree: 0, board: { field_allowance_r3: 2 }, xp: 0, xpClaims: {} } };
  const rt = new RtBenefits({ flags: new Set(), log: [] }, sys, data);
  assert.equal(rt.regionPayout(3), 0.3); assert.equal(rt.regionPayout(2), 0); assert.equal(rt.regionPayout(null), 0);
  const s = nodeState(data, sys.company, data.nodes.find((n) => n.id === 'field_allowance_r5'), 4, new Set());
  assert.equal(s.state, 'locked');
});

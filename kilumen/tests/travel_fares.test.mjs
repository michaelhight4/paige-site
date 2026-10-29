// Fast-travel fares + Commuter Benefit (Coder, Oct 29 2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { FARES, FARE_TEXT, baseFare, quote } from '../src/systems/travel_fares.js';
import * as RB from '../src/systems/rt_benefits.js';
import { RegionMap } from '../src/overnight/region_map.js';
const layout = JSON.parse(fs.readFileSync(new URL('../art/world/overworld/world_layout.json', import.meta.url)));
const data = JSON.parse(fs.readFileSync(new URL('../data/rt_benefits.json', import.meta.url)));

test('fares scale with distance and stay modest', () => {
  assert.equal(baseFare('skylift', 'brookhollow', 'fernwick', layout), 100);
  assert.equal(baseFare('skylift', 'brookhollow', 'frostspire', layout), Math.min(FARES.skylift.max, 60 + 40 * 7));
  assert.equal(baseFare('rail', 'saltmere', 'lanternport', layout), 70);
  assert.equal(baseFare('rail', 'saltmere', 'aurelith', layout), 130);
  assert.equal(baseFare('rail', null, 'aurelith', layout), 70, 'unknown origin = one hop');
  for (const k of ['skylift', 'rail']) assert.ok(FARES[k].max <= 400);
  assert.doesNotMatch(JSON.stringify(FARE_TEXT), /\b(PP|shiny|berry|berries|throw)\b/i);
});

test('commuter benefit is live and cuts fares 15/30/50%', () => {
  const n = data.nodes.find((x) => x.id === 'commuter_benefit'); assert.ok(!n.comingSoon);
  const base = baseFare('skylift', 'brookhollow', 'saltmere', layout); // 140
  for (const [v, want] of [[0, 140], [0.15, 119], [0.3, 98], [0.5, 70]]) assert.equal(quote('skylift', 'brookhollow', 'saltmere', layout, 999, (b) => RB.travelFare(b, () => v)).fare, want);
  assert.equal(base, 140);
});

test('never strands: short rail fare offers a free standby seat; short Skylift says walk', () => {
  const q = quote('rail', 'aurelith', 'saltmere', layout, 0);
  assert.equal(q.afford, false); assert.equal(q.standby, 'revival_heights');
  const q2 = quote('rail', 'saltmere', 'aurelith', layout, 0); assert.equal(q2.standby, 'lanternport');
  for (const from of layout.rail.stops) assert.ok(quote('rail', from, 'x', layout, 0).standby, from + ' has a standby stop');
  assert.equal(quote('skylift', 'brookhollow', 'fernwick', layout, 0).afford, false);
});

// RegionMap flow with a stub scene: pays on Yes, refuses when short, standby when broke on rail.
const mkScene = (coins, answers = []) => {
  const wallet = { n: coins, get coins() { return this.n; }, spend(k) { if (k > this.n) return false; this.n -= k; return true; } };
  const s = { layout, flags: new Set(['has_rail_pass', 'has_skylift', ...Object.keys(layout.fly.destinations).map((d) => 'visited_' + d)]), knownMaps: new Set(layout.rail.stops),
    party: [{ species: 'x' }], player: { x: 5, y: 5, mode: 'walk', place() {} }, log: [], tick: 0, lines: {}, said: [], warps: [],
    systems: { wallet, rtBenefits: { travelFare: (b) => RB.travelFare(b, () => 0.3) } },
    map: { name: 'saltmere', movement: { bike: true }, code: () => 0, noDismount: () => false },
    script: async (f) => f(), say: async (p) => { s.said.push(...p); }, ask: async (p) => { s.said.push(...p); return answers.shift() ?? 1; },
    fill: (a) => a, textVars: () => ({}), loadMap: async (id) => ({ name: id, warps: [{ to: 'station_int', x: 3, y: 3 }] }), startWarp: (sp, k) => s.warps.push([sp.map, k]) };
  return s;
};

test('Skylift: confirm shows the fare (with discount) and pays it', async () => {
  const s = mkScene(500, [0]); const r = new RegionMap(s, true);
  await r.travelTo('brookhollow'); // saltmere -> brookhollow, 2 apart: 140, -30% = 98
  assert.ok(s.said.some((l) => /98 coins \(140 before/.test(l)), s.said.join('|'));
  assert.equal(s.systems.wallet.coins, 402); assert.equal(s.warps.length, 1);
});

test('Skylift short of gold: no charge, no warp, walk message', async () => {
  const s = mkScene(10, [0]); const r = new RegionMap(s, true);
  await r.travelTo('brookhollow');
  assert.equal(s.warps.length, 0); assert.equal(s.systems.wallet.coins, 10); assert.ok(s.said.some((l) => /walk/.test(l)));
});

test('Rail: pays on Yes; broke gets a free standby seat to the next stop', async () => {
  const s = mkScene(200, [0]); const r = new RegionMap(s, true); r.lastTown = 'saltmere';
  await r.railTo('aurelith'); assert.equal(s.systems.wallet.coins, 200 - 91); assert.deepEqual(s.warps[0], ['aurelith', 'rail']);
  const b = mkScene(0, [0]); const r2 = new RegionMap(b, true);
  await r2.railTo('aurelith'); assert.equal(b.systems.wallet.coins, 0); assert.deepEqual(b.warps[0], ['lanternport', 'rail']);
  const n = mkScene(0, [1]); await new RegionMap(n, true).railTo('aurelith'); assert.equal(n.warps.length, 0, 'No = stay, nothing charged');
});

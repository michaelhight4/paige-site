// integ8 playtest fixes on cfc4b0e3 (Coder, Oct 30 2026): Tideglide flag end to end, Merit Counter clerk,
// shop_cairnfold region stock, shop_lanternport clerk, ?autocatch=1 kept + kilumenDev.autocatch toggle.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GameMap } from '../src/overworld/map.js';
import { pickLine } from '../src/overworld/lines.js';
import { FieldSystem } from '../src/overnight/field.js';
import { setShopsData, stockFor, regionOf, basePrice } from '../src/systems/shop.js';

const R = (p) => new URL('../' + p, import.meta.url);
const J = (p) => JSON.parse(readFileSync(R(p), 'utf8'));
const MAP = (n) => J(`art/world/overworld/maps/${n}.json`);
const LINES = J('text/overworld_lines.json');

test('Tideglide: the Mirefen giver sets has_tideglide, then facing gullhaven water at 16,23 asks Yes/No and rides', async () => {
  const flags = new Set();
  const giver = LINES.maps.mirefen.mirefen_tideglide_giver;
  assert.ok(MAP('mirefen').npcs.some((n) => n.id === 'mirefen_tideglide_giver' && n.x === 30 && n.y === 24));
  const line = pickLine(giver, flags, {}, 'maps.mirefen.mirefen_tideglide_giver');
  assert.deepEqual([].concat(line.sets || []), ['has_tideglide']);
  for (const f of [].concat(line.sets || [])) flags.add(f); // overworld.pick(): v2 `sets`
  assert.ok(flags.has('has_tideglide'));
  assert.ok(pickLine(giver, flags, {}, 'k').pages.length, 'later talks still have a line');

  const map = new GameMap(structuredClone(MAP('gullhaven')));
  const player = { x: 16, y: 23, facing: 'down' }, asked = [], said = [], jobs = [];
  const scene = { map, player, flags, party: [{ species: 'tidemarrow' }], log: [], tick: 0, lines: LINES,
    textVars: () => ({}), fill: (p) => p, text: (k) => k, script: (fn) => jobs.push(fn()),
    say: async (p) => { said.push(...p); }, ask: async (p, c) => { asked.push(c); return 0; } };
  const field = new FieldSystem(scene);
  assert.equal(field.interact(), true);
  await Promise.all(jobs);
  assert.equal(asked.length, 1, 'Yes/No prompt shown');
  assert.equal(field.gliding, true); assert.equal(player.gliding, true);
  assert.ok(!said.some((t) => /Only a Kilu/.test(t)), 'no refusal line once taught');

  // without the flag it still refuses (no prompt)
  const s2 = { ...scene, flags: new Set(), player: { x: 16, y: 23, facing: 'down' } }; asked.length = 0; jobs.length = 0;
  const f2 = new FieldSystem(s2); f2.interact(); await Promise.all(jobs);
  assert.equal(asked.length, 0); assert.equal(f2.gliding, false);
});

test('Merit Counter clerk stands in the stadium on walkable floor, reachable, and is hooked to the merit shop', () => {
  const j = MAP('aurelith_stadium_int'), m = new GameMap(structuredClone(j));
  const c = j.npcs.find((n) => n.id === 'aurelith_merit_clerk'); assert.ok(c);
  assert.equal(j.layers.collision[c.y][c.x], 0);
  assert.equal(j.layers.collision[c.y][c.x - 1], 0, 'talk spot left of the clerk');
  assert.ok(j.npcs.some((n) => n.id === 'aurelith_games_announcer'), 'announcer (Games entry) kept');
  const src = readFileSync(R('src/sports/town_ui.js'), 'utf8');
  assert.match(src, /MERIT_CLERK = 'aurelith_merit_clerk'/); assert.match(src, /ev === 'merit'\) \{ await openMerit\(\)/);
  assert.match(src, /merit\.announcer\.games/, 'announcer menu (Games / Merit Counter) kept');
  void m;
});

test('shop_cairnfold uses its region row (Cairnfold title, regional stock + prices), not _default', () => {
  const shops = setShopsData(J('src/systems/data/shops.json'));
  const j = MAP('shop_cairnfold'); assert.equal(j.region, 'wellspire');
  assert.equal(regionOf(j.region, shops).city, 'Cairnfold');
  const st = stockFor(j.region, 0, {}, shops); assert.ok(st.length > 6 && st.includes('tonic_large') && st.includes('dominance_crystal') && st.includes('deepgut_paste') && !st.includes('feed_bag_small'));
  assert.ok(basePrice('tonic_large', j.region, shops) > shops.basePrices.tonic_large, 'regional price scale');
  const src = readFileSync(R('src/systems/index.js'), 'utf8'); assert.match(src, /sc\.map\?\.json\?\.region/);
});

test('shop_lanternport clerk is placed behind the counter with a walkable talk spot', () => {
  const j = MAP('shop_lanternport'), c = j.npcs.find((n) => n.id === 'shop_lanternport_clerk'); assert.ok(c);
  assert.equal(c.variant_of, 'clerk'); assert.equal(j.interior_kind, 'mart');
  const col = j.layers.collision; assert.equal(col[c.y][c.x], 0); assert.equal(col[c.y + 1][c.x], 1, 'counter'); assert.equal(col[c.y + 2][c.x], 0, 'talk spot');
  assert.ok(LINES.maps.shop_lanternport.shop_lanternport_clerk.pages.length);
  assert.ok(!(j.text_pending?.npcs || []).some((n) => n.id === c.id));
});

test('?autocatch=1 survives the alpha URL strip; ?dev adds window.kilumenDev.autocatch', async () => {
  let url = null;
  globalThis.location = { search: '?dev=1&autocatch=1&reset=1', pathname: '/kilumen/', hash: '' };
  globalThis.history = { state: null, replaceState: (_s, _t, u) => { url = u; } };
  globalThis.sessionStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  const a = await import('../src/alpha.js?integ8');
  assert.equal(a.AUTOCATCH, true); assert.equal(globalThis.KILUMEN_AUTOCATCH, true);
  assert.equal(globalThis.kilumenDev?.autocatch, true);
  assert.equal(url, '/kilumen/?dev=1&autocatch=1');
  const fsrc = readFileSync(R('src/fishing/index.js'), 'utf8');
  assert.match(fsrc, /kilumenDev/); assert.match(fsrc, /KILUMEN_AUTOCATCH/);
  delete globalThis.location; delete globalThis.history; delete globalThis.sessionStorage; delete globalThis.kilumenDev; delete globalThis.KILUMEN_AUTOCATCH;
});

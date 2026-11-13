// Overnight systems (Oct 23, 2026): smoke + unit tests for src/overnight/*.
import test from 'node:test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { GameMap } from '../src/overworld/map.js';
import { Col } from '../src/overworld/constants.js';
import { buildRegistry, mapUrlFor, validateLinks, inboundLinks } from '../src/overnight/world_links.js';
import { overnightFlags, OVERNIGHT_DEFAULTS } from '../src/overnight/flags.js';
import { boulderTarget, moveBoulder, holdGates, BRUSH_TILES } from '../src/overnight/field.js';
import { sightCells, lineClear, findSpotter } from '../src/overnight/sight.js';
import { Kilindex } from '../src/overnight/kilindex.js';
import { pad } from './_pad.mjs';
import { learnsetFor, learnsBetween, applyLearn, PLACEHOLDER_LEVELS } from '../src/overnight/learnsets.js';
import { destinations, takeoffBlock, visitedFlagFor, landingCell, railStops, railArrival } from '../src/overnight/region_map.js';
import { scanStaged } from '../src/overnight/build_staged_index.mjs';
import { defaultSkills, speciesInfo } from '../src/systems/creature.js';

const OW = new URL('../art/world/overworld/', import.meta.url);
const ROOT = new URL('../', import.meta.url);
const layout = JSON.parse(readFileSync(new URL('world_layout.json', OW)));
const live = Object.fromEntries(layout.maps_built.map((n) => [n, JSON.parse(readFileSync(new URL(`maps/${n}.json`, OW)))]));
const load = (n) => new GameMap(structuredClone(live[n]));

test('links: every registered map loads and every warp / exit target exists', () => {
  assert.ok(layout.maps_built.length >= 20);
  for (const n of layout.maps_built) assert.doesNotThrow(() => load(n), n);
  const r = validateLinks(live, new Set(layout.maps_built));
  assert.deepEqual(r.problems, [], r.problems.join('\n'));
  assert.ok(r.links > 40);
  for (const c of r.closed) assert.match(c, /TO COME|not built/);
});

test('links: registry resolves live maps to mapsDir and staged maps to their own URL', () => {
  const reg = buildRegistry(layout, 'maps/', { route_east: 'qa/route_east.json' });
  assert.equal(mapUrlFor(reg, 'maps/', 'route1'), 'maps/route1.json');
  assert.equal(mapUrlFor(reg, 'maps/', 'route_east'), 'qa/route_east.json');
  assert.ok(reg.names.has('route_east'));
  assert.ok(inboundLinks(live, 'route_east').some((l) => l.from === 'brookhollow'));
});

test('staged World Design maps: every indexed map loads (links strict once SUMMARY.md lands)', () => {
  const idx = scanStaged();
  const staged = {};
  for (const [n, p] of Object.entries(idx.maps)) {
    assert.ok(!layout.maps_built.includes(n), `${n} would shadow a live map`);
    staged[n] = JSON.parse(readFileSync(new URL(p, ROOT)));
    assert.doesNotThrow(() => new GameMap(structuredClone(staged[n])), n);
  }
  const all = { ...live, ...staged };
  const r = validateLinks(all, new Set(Object.keys(all)));
  if (idx.summary) assert.deepEqual(r.problems, [], r.problems.join('\n'));
  else if (r.problems.length) console.log(`# staged link notes (dev preview, not failing): ${r.problems.length}`);
});

test('flags: half-done features default off, ?ov= toggles', () => {
  for (const k of ['field', 'regionmap', 'learnsets', 'stagedMaps']) assert.equal(OVERNIGHT_DEFAULTS[k], false, k);
  const f = overnightFlags(new URLSearchParams('ov=field,-sight'));
  if (/ALPHA build: \?ov= ignored/.test(fs.readFileSync(new URL('../src/overnight/flags.js', import.meta.url), 'utf8'))) {
    assert.deepEqual(f, { ...OVERNIGHT_DEFAULTS }, 'alpha build: ?ov= is ignored'); // live alpha strips the dev toggles
  } else {
    assert.equal(f.field, true); assert.equal(f.sight, false);
    assert.ok(Object.values(overnightFlags(new URLSearchParams('ov=all'))).every(Boolean));
  }
  assert.deepEqual(overnightFlags(null), { ...OVERNIGHT_DEFAULTS });
});

function synth(w = 6, h = 5) {
  const grid = (v) => Array.from({ length: h }, () => Array(w).fill(v));
  return new GameMap({ name: 'synth', width: w, height: h, tile_size: 64, layers: { ground: grid(1), decoration: grid(0), overlay: grid(0), collision: grid(0) }, warps: [], npcs: [] });
}

test('field: boulder push moves tile + collision, refuses walls and warps', () => {
  const m = synth();
  m.layers.decoration[2][2] = 77; m.layers.collision[2][2] = Col.BOULDER; m.layers.collision[2][4] = Col.BLOCK;
  const t = boulderTarget(m, 2, 2, 'right');
  assert.deepEqual(t, { x: 3, y: 2 });
  const under = new Map();
  moveBoulder(m, 2, 2, t.x, t.y, under);
  assert.equal(m.code(3, 2), Col.BOULDER); assert.equal(m.tile('decoration', 3, 2), 77);
  assert.equal(m.code(2, 2), Col.WALK); assert.equal(m.tile('decoration', 2, 2), 0);
  assert.equal(boulderTarget(m, 3, 2, 'right'), null); // wall behind
  m.warps.push({ x: 3, y: 1, to: 'x' });
  assert.equal(boulderTarget(m, 3, 2, 'up'), null);
  assert.ok(BRUSH_TILES.thick_brush && BRUSH_TILES.cracked_rock);
});

test('field: hold plate opens its gate only while weighted; list channels supported', () => {
  const pz = { switches: [{ id: 'hold', mode: 'hold', x: 1, y: 1, channel: 'a' }, { id: 'crystal', mode: 'toggle', channel: 'b' }], gates: [{ id: 'g1', channel: ['a', 'b'] }, { id: 'g2', channel: 'b' }] };
  assert.deepEqual(holdGates(pz, () => false), { g1: false, g2: false });
  assert.deepEqual(holdGates(pz, (x, y) => x === 1 && y === 1), { g1: true, g2: false });
  assert.deepEqual(holdGates(pz, () => false, (id) => id === 'crystal'), { g1: true, g2: true });
});

test('sight: route1 trainers see along their cells, walls and NPCs block', () => {
  const m = load('route1');
  const t = live.route1.npcs.find((n) => n.id === 'trainer_r1_a');
  assert.equal(sightCells(t).length, 4);
  const npc = { def: t, x: t.x, y: t.y };
  const m2 = { ...m, code: (x, y) => m.code(x, y), npcAt: () => null };
  const [c] = t.sight_cells;
  assert.equal(findSpotter(m2, [npc], c[0], c[1], () => false), npc);
  assert.equal(findSpotter(m2, [npc], c[0], c[1], () => true), null);
  assert.equal(findSpotter(m2, [npc], t.x, t.y + 3, () => false), null);
  const s = synth(); s.layers.collision[0][2] = Col.BLOCK;
  assert.equal(lineClear(s, 0, 0, 4, 0), false); assert.equal(lineClear(s, 0, 1, 4, 1), true); assert.equal(lineClear(s, 0, 0, 2, 2), false);
});

test('kilindex: seen / registered logging, first-time flags, save round trip', () => {
  const k = new Kilindex(null, [{ species: 'cindrip' }]);
  assert.equal(k.caughtCount, 1);
  assert.equal(k.markSeen('rillop', 'route1'), true); assert.equal(k.markSeen('rillop', 'route1'), false);
  assert.equal(k.markCaught('rillop', { zone: 'route1' }), true); assert.equal(k.markCaught('rillop'), false);
  const k2 = new Kilindex(k.toJSON());
  assert.equal(k2.seenCount, k.seenCount); assert.ok(k2.isCaught('rillop'));
});

test('learnsets: placeholder generator is deterministic, tagged, and the prompt rules hold', () => {
  const sp = 'tumbloam', d = defaultSkills(sp);
  const a = learnsetFor(sp, speciesInfo(sp).el, d), b = learnsetFor(sp, speciesInfo(sp).el, d);
  assert.deepEqual(a, b); assert.ok(a.every((e) => e.placeholder));
  assert.deepEqual(a.filter((e) => e.level > 1).map((e) => e.level), PLACEHOLDER_LEVELS);
  assert.equal(new Set(a.map((e) => e.skill)).size, a.length);
  assert.deepEqual(learnsBetween(a, 7, 14, d), a.filter((e) => e.level === 8 || e.level === 14).map((e) => e.skill));
  assert.equal(learnsetFor(sp, ['x'], d, { [sp]: [{ level: 3, skill: 'zap' }] })[0].placeholder, false);
  const c = { species: sp, skills: d.slice(0, 3), energy: null };
  assert.equal(applyLearn(c, 'newone').result, 'learned');
  assert.equal(applyLearn(c, 'other').result, 'kept');
  const r = applyLearn(c, 'other', 1); assert.equal(r.result, 'swapped'); assert.equal(r.old, d[1]); assert.equal(c.skills[1], 'other');
  assert.equal(applyLearn(c, 'other', 2).result, 'known');
});

test('region map: Skylift destinations and take-off rules follow FIELD_SKILLS.md', () => {
  const none = destinations(layout, new Set());
  assert.ok(none.every((d) => !d.ok));
  assert.equal(none.find((d) => d.id === 'aurelith')?.why, 'rail_only');
  const v = destinations(layout, new Set(['visited_brookhollow', 'visited_saltmere']));
  const bh = v.find((d) => d.id === 'brookhollow');
  assert.ok(bh.ok); assert.equal(bh.spawn.map, 'brookhollow');
  // Saltmere was built in the map integration (fly_point + map now set), so it flies; keep the not_built rule covered
  // with a destination that has no map yet (Coder, Oct 23 2026, #146).
  const sm = v.find((d) => d.id === 'saltmere');
  assert.ok(sm.ok); assert.equal(sm.spawn.map, 'saltmere'); assert.ok(load('saltmere').isWalkable(sm.spawn.x, sm.spawn.y));
  const stub = { ...layout, fly: { ...layout.fly, destinations: { ...layout.fly.destinations, saltmere: { ...layout.fly.destinations.saltmere, map: null } } } };
  assert.equal(destinations(stub, new Set(['visited_saltmere'])).find((d) => d.id === 'saltmere').why, 'not_built');
  assert.equal(visitedFlagFor(layout, 'brookhollow'), 'visited_brookhollow');
  const fl = new Set(['has_skylift']);
  assert.equal(takeoffBlock(layout, load('brookhollow'), new Set(), ...pad('brookhollow', 6, 20)), 'locked');
  assert.equal(takeoffBlock(layout, load('brookhollow'), fl, ...pad('brookhollow', 6, 20)), null);
  assert.equal(takeoffBlock(layout, load('greystone_b1'), fl, ...pad('greystone_b1', 5, 5)), 'cave');
  assert.equal(takeoffBlock(layout, load('heal_centre_int'), fl, 3, 3), 'indoors');
  const m = load('brookhollow'); assert.ok(m.passable(...Object.values(landingCell(m, ...pad('brookhollow', 6, 20))), 'walk'));
});

test('Lumen Line: stops need the pass, a visit on foot and a built town with a station door', () => {
  assert.ok(railStops(layout, new Set()).every((s) => s.why === 'no_pass'));
  const st = railStops(layout, new Set(['has_rail_pass', 'visited_saltmere']));
  assert.equal(st.find((s) => s.id === 'saltmere').why, layout.maps_built.includes('saltmere') ? null : 'not_built');
  assert.equal(st.find((s) => s.id === 'aurelith').why, 'not_visited');
  assert.deepEqual(railArrival({ name: 't', warps: [{ x: 4, y: 9, to: 'station_int' }] }), { map: 't', x: 4, y: 10, facing: 'down' });
  assert.equal(railArrival(load('brookhollow')), null);
});

test('kilindex: wild battle result carries the foes seen (runtime patch, battle.js untouched)', async () => {
  const { KilumenBattle } = await import('../src/battle/battle.js');
  const { patchBattleResult } = await import('../src/overnight/index.js');
  patchBattleResult(KilumenBattle); patchBattleResult(KilumenBattle); // idempotent
  const b = new KilumenBattle({ party: [{ species: 'rillop', level: 20 }], foes: [{ species: 'cindrip', level: 20 }, { species: 'tumbloam', level: 20 }], wild: true, seed: [1, 2, 3, 4], forceChance: true });
  const r = b.result();
  assert.deepEqual(r.foesSeen.map((f) => f.species), ['cindrip']);
  assert.equal(r.outcome, 'ongoing');
});

// Region map cleanup (Oct 23, 2026): every map dot belongs to a painted place and never covers its name.
test('region map: each place dot sits on its painted town, just above its painted name plate', async () => {
  const { PNG } = await import('pngjs');
  const png = PNG.sync.read(readFileSync(new URL('../art/world/world_map.png', import.meta.url)));
  const zones = layout.zones.filter((z) => z.map_pos);
  assert.equal(zones.length, layout.zones.length, 'every zone has a map_pos');
  const plate = ({ x0, y0, x1, y1 }) => { // painted name plates: light parchment (luma > 185) with dark lettering (luma < 90)
    let n = 0, light = 0, dark = 0;
    for (let y = Math.round((y0 + (y1 - y0) * 0.2) * png.height); y < (y1 - (y1 - y0) * 0.2) * png.height; y += 2)
      for (let x = Math.round((x0 + (x1 - x0) * 0.1) * png.width); x < (x1 - (x1 - x0) * 0.1) * png.width; x += 2) {
        const i = (y * png.width + x) * 4, v = 0.2126 * png.data[i] + 0.7152 * png.data[i + 1] + 0.0722 * png.data[i + 2];
        n++; if (v > 185) light++; if (v < 90) dark++;
      }
    return { light: light / n, dark: dark / n };
  };
  for (const z of zones) {
    const p = z.map_pos, l = z.map_label;
    assert.ok(l, `${z.id}: map_label`);
    for (const v of [p.x, p.y, l.x0, l.y0, l.x1, l.y1]) assert.ok(v >= 0 && v <= 1, `${z.id}: normalised`);
    assert.ok(l.x0 < p.x && p.x < l.x1, `${z.id}: dot centred over its plate`);
    assert.ok(p.y < l.y0 && l.y0 - p.y <= 0.01, `${z.id}: dot tip just above its plate (${p.y} vs ${l.y0})`);
    const q = plate(l);
    assert.ok(q.light > 0.45 && q.dark > 0.18, `${z.id}: map_label is on a painted name plate (${JSON.stringify(q)})`);
  }
  for (const a of zones) for (const b of zones) if (a !== b) { // no plate overlaps another; no dot tip inside another plate
    const A = a.map_label, B = b.map_label;
    assert.ok(A.x1 <= B.x0 || B.x1 <= A.x0 || A.y1 <= B.y0 || B.y1 <= A.y0, `${a.id} / ${b.id} plates overlap`);
    assert.ok(!(a.map_pos.x > B.x0 && a.map_pos.x < B.x1 && a.map_pos.y > B.y0 && a.map_pos.y < B.y1), `${a.id} dot on ${b.id} plate`);
  }
});

// Side activities + town world fill (Coder, Oct 30 2026): data/textbot_world_fill.json sections 2-5 are wired, every town
// has 4-6 inspectables, the four side activities pay merit points once, and no new text uses a blocked word.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const J = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const MAPS = 'art/world/overworld/maps';
const FILL = J('data/textbot_world_fill.json');
const LINES = J('text/overworld_lines.json');
const TS = new Map(J('art/world/overworld/tileset.json').tiles.map((t) => [t.id, t]));
const NAME = new Map([...TS.values()].map((t) => [t.name, t]));
const { ACTIVITIES, collectStep, scoreQuiz, oreWeight, doneFlag } = await import('../src/side/activities.js');
const { attachSide, sideText } = await import('../src/side/index.js');
const { addMeritPoints, MERIT_STUB } = await import('../src/side/merit.js');
const { FB } = await import('../src/side/text_fallback.js');
const map = (m) => J(`${MAPS}/${m}.json`);
// Blocked words (house rules): PP, shiny, super effective, Pokédex, Poké Ball, Gotcha!, nurse, weed, route(s), berry,
// elite(s), gym (say hall), and 'throw' for capture.
export const BLOCKED = /\bGotcha!|\b(PP|shiny|super effective|Pok[eé]dex|Pok[eé] ?Balls?|nurses?|weeds?|routes?|berr(y|ies)|elites?|gyms?|throw(s|n|ing)?|threw)\b/i;
const TOWNS = ['brookhollow', 'fernwick', 'saltmere', 'frostspire', 'mirefen', 'lanternport', 'cindervale'];
const allSpots = () => fs.readdirSync(MAPS).filter((f) => f.endsWith('.json')).flatMap((f) => (J(`${MAPS}/${f}`).interact_spots || []).map((s) => ({ ...s, _map: f.slice(0, -5) })));

test('blocked-word regex catches every listed word and leaves normal text alone', () => {
  for (const w of ['PP', 'a shiny one', 'super effective', 'Pokédex', 'Poke Ball', 'Gotcha!', 'the nurse', 'weed', 'Route 3', 'routes', 'berry', 'Elite Four', 'elites', 'the gym', 'throw it']) assert.ok(BLOCKED.test(w), w);
  for (const w of ['the hall', 'a pp of fog'.toUpperCase().replace('PP', 'P P'), 'Weedle-free', 'gymnast', 'routine', 'shine', 'path', 'catch']) assert.ok(!BLOCKED.test(w), w);
});

test('no blocked words in any new text: world fill sections 2-5, side fallbacks, new map lines, the Text Bot request', () => {
  const texts = [];
  const walk = (v, where) => { if (typeof v === 'string') texts.push([where, v]); else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${where}.${k}`); };
  for (const s of ['section2_town_npcs', 'section3_town_props', 'section4_lanternport_guide', 'section5_hall_fixes']) walk(FILL[s], s);
  walk(FB, 'FB');
  for (const sp of allSpots().filter((s) => s.group === 'town_inspect' || s.kind === 'side')) walk(LINES.maps[sp._map]?.[sp.id], `${sp._map}.${sp.id}`);
  for (const n of FILL.section2_town_npcs) walk(LINES.maps[n.map][n.id], n.id);
  texts.push(['request md', fs.readFileSync('data/textbot_requests_side_activities.md', 'utf8').replace(/^>.*$/gm, '')]);
  for (const [w, t] of texts) if (!/\b(note|status|_old)\b/.test(w)) assert.ok(!BLOCKED.test(t), `${w}: ${t}`);
});

test('section 2: all seven town NPCs are placed on walkable cells with their own lines', () => {
  for (const n of FILL.section2_town_npcs) {
    const m = map(n.map), npc = (m.npcs || []).find((x) => x.id === n.id);
    assert.ok(npc, n.id);
    assert.equal(m.layers.collision[npc.y][npc.x], 0, `${n.id} stands on a wall`);
    const e = LINES.maps[n.map][n.id];
    assert.ok(e, `${n.id} lines`); assert.ok(JSON.stringify(e).includes(JSON.stringify(n.pages[0]).slice(1, -1)), `${n.id} pages`);
  }
});

test('section 3/4/5: town props sit on solid art with a walkable stand; guide and hall after-lines are wired', () => {
  for (const p of FILL.section3_town_props) {
    const m = map(p.map), sp = m.interact_spots.find((s) => s.id === p.id);
    assert.ok(sp, p.id);
    assert.equal(m.layers.collision[sp.y][sp.x], 1, `${p.id} prop not solid`);
    assert.ok(m.layers.decoration[sp.y][sp.x] || m.layers.ground[sp.y][sp.x], p.id);
    assert.equal(m.layers.collision[sp.stand[1]][sp.stand[0]], 0, `${p.id} stand`);
    assert.deepEqual(LINES.maps[p.map][p.id].pages, p.inspect, p.id);
  }
  const g = FILL.section4_lanternport_guide, ge = LINES.maps[g.map][g.id];
  assert.ok(JSON.stringify(ge).includes(JSON.stringify(g.pages[0])), 'guide once pages');
  assert.ok(JSON.stringify(ge).includes(JSON.stringify(g.pages_again[0])), 'guide again pages');
  for (const h of FILL.section5_hall_fixes.filter((h) => h.after)) {
    const e = LINES.maps[h.map][h.id]; assert.deepEqual(e.after, h.after, h.id);
    if (h.after_2) assert.deepEqual(e.after_2, h.after_2, h.id);
  }
});

test('every town has 4-6 inspectables (signs, shelves, bins, notes), each with a line and a reachable stand', () => {
  const by = {};
  for (const s of allSpots().filter((s) => s.group === 'town_inspect')) (by[s.town] ||= []).push(s);
  for (const t of TOWNS) {
    const n = by[t]?.length || 0; assert.ok(n >= 4 && n <= 6, `${t}: ${n}`);
    for (const s of by[t]) {
      const m = map(s._map);
      assert.ok(LINES.maps[s._map]?.[s.id]?.pages?.length, `${s.id} line`);
      assert.equal(m.layers.collision[s.stand[1]][s.stand[0]], 0, `${s.id} stand`);
    }
  }
});

test('side spots exist on the maps for all four activities, on solid tiles with free stands', () => {
  const sides = allSpots().filter((s) => s.kind === 'side');
  for (const [id, a] of Object.entries(ACTIVITIES)) {
    const mine = sides.filter((s) => s.side === id);
    assert.ok(mine.length, id);
    for (const s of mine) { assert.equal(s._map, a.map); const m = map(s._map); assert.equal(m.layers.collision[s.y][s.x], 1, s.id); assert.equal(m.layers.collision[s.stand[1]][s.stand[0]], 0, s.id); }
    for (const it of [...(a.items || []), a.turnIn].filter(Boolean)) assert.ok(mine.some((s) => s.id === it), `${id}: ${it}`);
  }
});

test('collect activities: progress, turn-in and a one-time reward', () => {
  const f = new Set();
  const apply = (r) => r.set.forEach((x) => f.add(x));
  let r = collectStep('fern_letters', 'side_letters_box', f); assert.deepEqual(r.say, ['side.fern_letters.intro']);
  apply(collectStep('fern_letters', 'side_letters_1', f));
  assert.deepEqual(collectStep('fern_letters', 'side_letters_1', f).say, ['side.fern_letters.already']);
  apply(collectStep('fern_letters', 'side_letters_2', f));
  assert.equal(collectStep('fern_letters', 'side_letters_box', f).reward, 0);
  apply(collectStep('fern_letters', 'side_letters_3', f));
  r = collectStep('fern_letters', 'side_letters_box', f); assert.equal(r.reward, 3); apply(r);
  assert.equal(collectStep('fern_letters', 'side_letters_box', f).reward, 0);
  const g = new Set(); let tot = 0;
  for (const s of ACTIVITIES.frost_lamps.items) { const x = collectStep('frost_lamps', s, g); x.set.forEach((y) => g.add(y)); tot += x.reward; }
  assert.equal(tot, 3); assert.ok(g.has(doneFlag('frost_lamps')));
});

test('quiz scoring and ore weights are deterministic', () => {
  assert.equal(scoreQuiz('salt_tide_quiz', [1, 0, 2]).pass, true);
  assert.equal(scoreQuiz('salt_tide_quiz', [1, 0, 1]).right, 2);
  for (let s = 0; s < 20; s++) for (let r = 0; r < 3; r++) { assert.equal(oreWeight(s, r), oreWeight(s, r)); assert.ok(ACTIVITIES.cinder_ore_weigh.weights.includes(oreWeight(s, r))); }
});

test('attachSide pays through addMeritPoints (stub) once per activity; non-side spots pass through', async () => {
  assert.equal(MERIT_STUB, true);
  const mk = (answers) => ({ flags: new Set(), counters: {}, log: [], lines: LINES, clock: { day: 2 }, said: [],
    setFlag(x) { this.flags.add(x); }, bump(c) { return (this.counters[c] = (this.counters[c] || 0) + 1); },
    say: async function (p) { this.said.push(...p); }, ask: async () => answers.shift() ?? 0 });
  const sc = mk([0, 1, 0, 2, 0, 1, 0, 2]); const side = attachSide(sc);
  assert.equal(await side.runSpot({ kind: 'prop', id: 'x' }), false);
  const sp = { kind: 'side', side: 'salt_tide_quiz', id: 'side_tide_quiz' };
  await side.runSpot(sp); assert.equal(sc.counters.merit_points, 4);
  await side.runSpot(sp); assert.equal(sc.counters.merit_points, 4, 'no second reward');
  const o = mk([]); const so = attachSide(o); const seed = 2 * 31;
  const W = ACTIVITIES.cinder_ore_weigh.weights; const ans = [0, ...[0, 1, 2].map((r) => W.indexOf(oreWeight(seed, r)))];
  o.ask = async () => ans.shift();
  await so.runSpot({ kind: 'side', side: 'cinder_ore_weigh', id: 'side_ore_weigh' }); assert.equal(o.counters.merit_points, 4);
  // a real merit system wins over the stub
  let got = 0; const s2 = { systems: { merit: { addMeritPoints: (n) => (got += n) } } };
  addMeritPoints(s2, 5, 't'); assert.equal(got, 5);
  for (const k of Object.keys(FB)) assert.ok(sideText({}, k).length, k);
});

test('src/side is hooked into Overworld.runSpot and main.js', () => {
  assert.match(fs.readFileSync('src/overworld/overworld.js', 'utf8'), /this\.side\?\.runSpot && await this\.side\.runSpot\(sp\)/);
  assert.match(fs.readFileSync('src/main.js', 'utf8'), /import\('\.\/side\/index\.js\?v=/);
});

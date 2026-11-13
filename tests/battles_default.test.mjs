// Battles default v1 (Oct 23, 2026): the engine battle is the dev default (?battle=shell = old shell), wild encounters
// roll encounters.json from tall grass with a safety cap, and trainer wins set the CRITICAL_PATH story flags.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { zoneAt, slotOk, pickSlot, EncounterRoller, installWildEncounters, MAX_RATE, GRACE_STEPS } from '../src/battle/encounters.js';
import { trainerOutcome, TRAINER_RESULTS } from '../src/battle/story.js';
import { GameMap } from '../src/overworld/map.js';
import { indexTileset } from '../src/overworld/tileset.js';
import { attachSystems } from '../src/systems/index.js';
import { createCreature, maxHp } from '../src/systems/creature.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KIT = path.join(ROOT, 'art/world/overworld');
const rj = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const ENC = rj(path.join(KIT, 'encounters/encounters.json'));
const LINES = rj(path.join(ROOT, 'text/overworld_lines.json'));
const TS = indexTileset(rj(path.join(KIT, 'tileset.json')));
const loadMap = (n) => new GameMap(rj(path.join(KIT, 'maps', n + '.json'))).attachTileset(TS.byId);
const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };

// ---- default mode ------------------------------------------------------------------------------------------------
test('default mode: mountUI wires the engine battle unless ?battle=shell; the shell escape hatch stays', () => {
  const ui = fs.readFileSync(path.join(ROOT, 'src/ui/ui.js'), 'utf8');
  const mount = ui.slice(ui.indexOf('export function mountUI'));
  assert.match(mount, /const shell = q\.get\('battle'\) === 'shell';/);
  assert.match(mount, /if \(!shell\) \{[\s\S]*?import\('\.\.\/battle\/ui_sd\.js'\)[\s\S]*?scene\.hooks\.onBattle = /, 'engine battle is the default');
  assert.doesNotMatch(mount, /q\.get\('battle'\) === 'sd'/, 'no opt-in flag left');
  assert.match(mount, /q\.get\('battle'\) === 'shell'\) \{ scene\.hooks\.onBattle = [^\n]*ui\.open\('battle', \{ trainer: true \}\)/, '?battle=shell keeps the old shell');
  assert.match(mount, /if \(!shell\) wireWild\(ui, scene, q\)/, 'wild encounters wired by default');
  assert.match(fs.readFileSync(path.join(ROOT, 'src/battle/ui_sd.js'), 'utf8'), /opts\.foeLevel \|\|/, 'wild slot level reaches the engine battle');
});

// ---- encounter tables -------------------------------------------------------------------------------------------
test('encounters: route1 / thornwood / greystone cells map to their tables; water and table-less cave floor never roll', () => {
  const r1 = loadMap('route1');
  const rect = r1.json.encounter_zones[0];
  assert.equal(zoneAt(ENC, 'route1', r1.json.encounter_zones, rect.x0, rect.y0, 1).id, 'sunmeadow_grass');
  assert.equal(zoneAt(ENC, 'route1', [], 25, 7, 1).id, 'sunmeadow_grass', 'stray grass outside a rect: the map\'s table');
  assert.equal(zoneAt(ENC, 'route1', [], 25, 7, 2), null, 'cave floor outside a rect: no rate in the docs yet');
  const tw = loadMap('thornwood'), f = tw.json.encounter_zones.find((z) => z.forced);
  assert.deepEqual([zoneAt(ENC, 'thornwood', tw.json.encounter_zones, f.x0, f.y0, 1).id, zoneAt(ENC, 'thornwood', tw.json.encounter_zones, f.x0, f.y0, 1).forced], ['thornwood_grass', true]);
  const gs = loadMap('greystone_entrance'), g = gs.json.encounter_zones[0];
  assert.equal(zoneAt(ENC, 'greystone_entrance', gs.json.encounter_zones, g.x0, g.y0, 2).id, 'greystone_glowfern');
  const mf = rj(path.join(KIT, 'maps/mirefen_bog.json')).encounter_zones;
  assert.notEqual(zoneAt(ENC, 'mirefen_bog', mf, 10, 8, 1)?.id, 'mirefen_bog_surf', 'surf table skipped (no Tideglide yet)');
  // every grass cell on route1 + thornwood has a table
  for (const n of ['route1', 'thornwood']) {
    const m = loadMap(n);
    for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) if (m.encounter(x, y) === 1) assert.ok(zoneAt(ENC, n, m.json.encounter_zones, x, y, 1), `${n} ${x},${y}`);
  }
});

test('encounters: slot conditions (time / weather / flood), weighted pick, level inside the slot range', () => {
  const z = ENC.zones.sunmeadow_grass;
  const night = z.slots.filter((s) => slotOk(s, { phase: 'night' })).map((s) => s.species);
  assert.ok(!night.includes('sailquill') && night.includes('gloamtick') && !night.includes('rillop'));
  assert.ok(z.slots.filter((s) => slotOk(s, { phase: 'dawn', weather: 'storm', flood: true })).some((s) => s.species === 'rillop'));
  for (let i = 0; i < 300; i++) {
    const h = pickSlot(z, { phase: 'day' }, Math.random);
    assert.ok(slotOk(h.slot, { phase: 'day' }));
    assert.ok(h.level >= h.slot.level[0] && h.level <= h.slot.level[1], `${h.species} L${h.level}`);
    assert.ok(ENC.species_with_art.includes(h.species), 'only table species');
  }
  assert.equal(pickSlot({ slots: [{ species: 'a', level: [2, 2], weight: 1, time: ['night'] }] }, { phase: 'day' }), null);
});

test('encounters: safety cap — rate clamped to MAX_RATE, grace steps after every battle, dev override up to 1', () => {
  assert.ok(MAX_RATE <= 0.25 && GRACE_STEPS >= 2);
  const ro = new EncounterRoller({ zones: { t: { method: 'grass', rate: 0.9, maps: ['m'], slots: [{ species: 'tumbloam', level: [2, 5], weight: 1 }] } } }, { rng: seq(0.19, 0.0) });
  assert.equal(ro.rateFor(ro.data.zones.t), MAX_RATE, 'data rate 0.9 -> capped');
  for (let i = 0; i < GRACE_STEPS; i++) assert.equal(ro.step('m', [], 1, 1, 1), null, 'grace step');
  const hit = ro.step('m', [], 1, 1, 1);
  assert.equal(hit?.species, 'tumbloam');
  assert.equal(ro.grace, GRACE_STEPS, 'grace restarts after an encounter');
  const dev = new EncounterRoller(ENC, { rate: 1, rng: () => 0.5 }); dev.grace = 0;
  assert.ok(dev.step('route1', [], 25, 7, 1), '?encrate=1 always rolls');
  // the real tables at the real rate: ~1 battle per 12 grass steps, never back-to-back
  const real = new EncounterRoller(ENC); let n = 0, last = -99, minGap = 1e9;
  for (let i = 0; i < 20000; i++) if (real.step('route1', [], 25, 7, 1)) { n++; minGap = Math.min(minGap, i - last); last = i; }
  assert.ok(n > 900 && n < 1700, `encounters in 20000 steps: ${n}`);
  assert.ok(minGap > GRACE_STEPS, `min gap ${minGap}`);
});

test('encounters: the overworld hook opens a wild battle with the rolled foe; never while busy, fading, in a menu or with no team', async () => {
  const opened = [];
  let menu = false;
  const sc = { hooks: {}, map: { name: 'route1', json: { encounter_zones: [] } }, party: [{ species: 'cindrip' }], flags: new Set(), busy: false, fade: null, phase: 'day', log: [], tick: 0,
    script: async (fn) => { if (sc.busy) return; sc.busy = true; try { await fn(); } finally { sc.busy = false; } } };
  const savedFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => ENC });
  try {
    const st = installWildEncounters(sc, async (foe) => { opened.push(foe); }, { rate: 1, blocked: () => menu });
    await st.ready;
    const walk = async (k) => { for (let i = 0; i < k; i++) { sc.hooks.onEncounterTile(25, 7, 1); await new Promise((r) => setTimeout(r, 0)); } };
    await walk(GRACE_STEPS); assert.equal(opened.length, 0, 'free steps on entering the map');
    await walk(1); assert.equal(opened.length, 1);
    assert.ok(ENC.zones.sunmeadow_grass.slots.some((s) => s.species === opened[0].species), opened[0].species);
    assert.equal(opened[0].biome, 'grass');
    assert.equal(sc.log.at(-1).type, 'wild');
    st.roller.grace = 0; sc.party = []; await walk(3); assert.equal(opened.length, 1, 'no team: no encounter');
    sc.party = [{ species: 'cindrip' }]; menu = true; await walk(3); assert.equal(opened.length, 1, 'menu open');
    menu = false; sc.fade = {}; await walk(3); assert.equal(opened.length, 1, 'fading');
    sc.fade = null; sc.busy = true; await walk(3); assert.equal(opened.length, 1, 'script running');
    sc.busy = false; await walk(1); assert.equal(opened.length, 2);
  } finally { globalThis.fetch = savedFetch; }
});

// ---- trainer story flags -----------------------------------------------------------------------------------------
test('story: trainerOutcome — Master of Fernwick sets beat_master_fernwick on a win; Ron 1 gives the runners win or lose', () => {
  assert.deepEqual(trainerOutcome('fernwick_hall_int', 'master_fernwick', true).flags, ['beat_master_fernwick']);
  assert.deepEqual(trainerOutcome('fernwick_hall_int', 'master_fernwick', false), { flags: [], continueOnLoss: false, gift: null, done: false });
  assert.deepEqual(trainerOutcome('fernwick', 'ron_rival_1', true).flags.sort(), ['beat_rival_ron_1', 'has_run_shoes']);
  const lose = trainerOutcome('fernwick', 'ron_rival_1', false);
  assert.deepEqual([lose.flags, lose.continueOnLoss, lose.done], [['has_run_shoes'], true, true]);
  assert.deepEqual(trainerOutcome('route1', 'trainer_r1_a', true).flags, []);
  // every entry points at a real trainer + the gift at Text Bot's item entry
  for (const k of Object.keys(TRAINER_RESULTS)) { const [m, id] = k.split('.'); assert.ok(LINES.maps[m]?.[id]?.battle_lost, k); }
  assert.equal(LINES.items.running_shoes.flag, 'has_run_shoes');
});

async function talkScene(mapName) {
  const { Overworld } = await import('../src/overworld/overworld.js');
  const OW = Overworld.prototype;
  const sc = {
    flags: new Set(), party: [createCreature({ species: 'cindrip', level: 10 })], counters: {}, seen: {}, hooks: {}, log: [], ms: 0, tick: 0, busy: false, lines: LINES,
    said: [], map: { name: mapName }, lastDoor: null, fade: null, config: {}, player: { facing: 'up' }, clock: { day: 1 }, seenDay: {}, phase: 'day', hour: 12, stillSince: 0,
    textVars: () => ({ player: 'Sam' }), zone: () => 'fernwick', say: async (pages) => { sc.said.push(...(pages || [])); }, fill: (p) => p,
    script: async (fn) => { if (sc.busy) return; sc.busy = true; try { await fn(); } finally { sc.busy = false; } },
    setFlag: (f, on = true) => (on ? sc.flags.add(f) : sc.flags.delete(f)), startWarp: (spawn, kind) => { sc.warped = { ...spawn, kind }; },
    talk: OW.talk, pick: OW.pick, _entryFor: OW._entryFor, speakerFor: OW.speakerFor, env: OW.env,
  };
  const sys = attachSystems(sc, { saveData: { coins: 1000 } }); await sys.ready;
  sc.run = async (id) => { sc.said.length = 0; sc.talk(null, { id }); for (let i = 0; i < 100 && sc.busy; i++) await new Promise((r) => setTimeout(r, 1)); assert.equal(sc.busy, false); };
  return { sc, sys };
}

test('story: beating the Master of Fernwick sets beat_master_fernwick and the Brookhollow east gate opens; a loss sets nothing', async () => {
  const { sc } = await talkScene('fernwick_hall_int');
  sc.hooks.onBattle = async () => { sc.party[0].hp = 0; return false; };
  await sc.run('master_fernwick');
  assert.ok(!sc.flags.has('beat_master_fernwick'));
  assert.equal(sc.warped?.kind, 'blackout', 'a Master loss still blacks out');
  sc.warped = null; sc.party[0].hp = maxHp(sc.party[0]);
  sc.hooks.onBattle = async () => true;
  await sc.run('master_fernwick');
  assert.ok(sc.flags.has('beat_master_fernwick'));
  const bh = loadMap('brookhollow');
  const gate = bh.json.story_gates.find((g) => g.id === 'gate_brookhollow_east');
  assert.equal(gate.flag, 'beat_master_fernwick');
  const c = gate.cells[0];
  assert.notEqual(bh.code(c.x, c.y), 0, 'blocked before');
  bh.applyGates(sc.flags);
  assert.equal(bh.code(c.x, c.y), 0, 'gate open with the flag');
});

test('story: Ron 1 — a win sets beat_rival_ron_1 + has_run_shoes and he hands over the Trail Runners', async () => {
  const { sc } = await talkScene('fernwick');
  const it = LINES.items.running_shoes, ron = LINES.maps.fernwick.ron_rival_1;
  sc.hooks.onBattle = async () => true;
  await sc.run('ron_rival_1');
  assert.ok(sc.flags.has('beat_rival_ron_1') && sc.flags.has('has_run_shoes'));
  for (const t of [ron.battle_lost[0], it.giver_pages[0], it.received[0], it.tip[0]]) assert.ok(sc.said.includes(t), t);
  assert.ok(sc.said.indexOf(ron.battle_lost[0]) < sc.said.indexOf(it.giver_pages[0]));
  sc.hooks.onBattle = async () => { throw new Error('no rematch'); };
  await sc.run('ron_rival_1');
  assert.deepEqual(sc.said, ron.after);
});

test('story: Ron 1 — a loss does NOT black out; the team is patched up, the runners still change hands, no rematch', async () => {
  const { sc, sys } = await talkScene('fernwick');
  const it = LINES.items.running_shoes, ron = LINES.maps.fernwick.ron_rival_1;
  const coins = sys.wallet.coins;
  sc.hooks.onBattle = async () => { sc.party[0].hp = 0; sys.applyBattleResult({ outcome: 'lose', team: [{ uid: sc.party[0].uid, hp: 0 }], bag: {} }); return false; };
  await sc.run('ron_rival_1');
  assert.equal(sc.warped, undefined, 'no blackout warp');
  assert.equal(sys.wallet.coins, coins, 'no copay');
  assert.equal(sc.party[0].hp, maxHp(sc.party[0]), 'patched up');
  assert.ok(sc.flags.has('has_run_shoes') && !sc.flags.has('beat_rival_ron_1'));
  for (const t of [ron.battle_won[0], it.giver_pages[0], it.received[0]]) assert.ok(sc.said.includes(t), t);
  assert.ok(!sc.said.includes(ron.battle_lost[0]));
  assert.equal(sc.seen['defeated:fernwick.ron_rival_1'], true);
});

test('new player-facing code adds no blocked words', () => {
  const bad = /\bPP\b|shiny|super effective|Pok[eé]dex|Pok[eé] ?Ball|Gotcha!|\bnurse\b/i;
  for (const f of ['src/battle/encounters.js', 'src/battle/story.js']) assert.doesNotMatch(fs.readFileSync(path.join(ROOT, f), 'utf8'), bad, f);
  const it = LINES.items.running_shoes;
  for (const t of [...it.giver_pages, ...it.received, ...it.tip]) assert.doesNotMatch(t, bad);
});

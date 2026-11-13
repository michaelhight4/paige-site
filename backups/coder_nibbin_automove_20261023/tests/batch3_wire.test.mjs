// Batch 3 wiring (Oct 23 2026, Coder): the 28 overnight maps' NPCs / signs, hall trainer sight -> battle start,
// Mirefen hall tint + lamps (item 2), first-launch Continue (item 4), battle force-close (item 5).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { GameMap } from '../src/overworld/map.js';
import { indexTileset } from '../src/overworld/tileset.js';
import { gradeFor } from '../src/overworld/clock.js';
import { showContinue } from '../src/overworld/save.js';
import { SightSystem, findSpotter } from '../src/overnight/sight.js';
import { withFallbacks, isBatch3Map, pickSpriteId } from '../src/overnight/npc_sprites.js';
import { mapTeamFor, playerStarter } from '../src/overnight/trainer_teams.js';
import { teamFor } from '../src/progression/masters.js';
import { applyLamps, activeTint, lampsAgree, lampMapCells } from '../src/progression/hall_lamps.js';
import { SPECIES } from '../src/ui/data.js';

const ROOT = new URL('../', import.meta.url);
const OW = new URL('art/world/overworld/', ROOT);
const J = (u) => JSON.parse(readFileSync(u));
const LINES = J(new URL('text/overworld_lines.json', ROOT)).maps;
const SPRITES = J(new URL('art/characters/pixel/npcs/npc_sprite_map.json', ROOT)).map;
const MASTERS = J(new URL('data/masters.json', ROOT));
const STANDINS = J(new URL('data/standins_overnight.json', ROOT)).trainer_species || {};
const TILES = indexTileset(J(new URL('tileset.json', OW))).byId;
const ALL = Object.fromEntries(readdirSync(new URL('maps/', OW)).filter((f) => f.endsWith('.json')).map((f) => [f.slice(0, -5), J(new URL('maps/' + f, OW))]));
const B3 = Object.keys(ALL).filter((n) => /overnight/.test(String(ALL[n].source || ''))).sort();
const entry = (map, d) => LINES[map]?.[d.id] || null;
// same placement rule as Overworld.loadMap: npcs + *_pending_text + text_pending, an entry with lines is placed
function placed(name) {
  const j = ALL[name], tp = j.text_pending || {}, out = { npcs: [], signs: [] };
  for (const k of ['npcs', 'signs']) {
    const ids = new Set();
    for (const d of [...(j[k] || []), ...(j[k + '_pending_text'] || []), ...(tp[k] || [])]) if (!ids.has(d.id)) { ids.add(d.id); out[k].push(d); }
  }
  out.npcs = out.npcs.filter((d) => d.kind !== 'spawn');
  return out;
}
const loadMap = (name, extra = {}) => { const m = new GameMap({ ...structuredClone(ALL[name]), ...extra }); m.attachTileset(TILES); return m; };
const known = new Set(SPECIES.map((s) => s.id));

test('batch 3: 28 overnight maps, 148 NPCs + 102 signs, every one has its text entry', () => {
  assert.equal(B3.length, 28);
  let n = 0, s = 0; const missing = [];
  for (const m of B3) {
    const p = placed(m); n += p.npcs.length; s += p.signs.length;
    for (const d of [...p.npcs, ...p.signs]) { const e = entry(m, d); if (!e || !(e.pages?.length || e.lines?.length)) missing.push(m + '.' + d.id); }
  }
  assert.equal(n, 148); assert.equal(s, 102);
  assert.deepEqual(missing, []);
});

test('batch 3: every NPC draws (sprite map or fallback entry with a real sheet); other maps unchanged', () => {
  const bad = [];
  for (const name of B3) {
    const p = placed(name), map = { name, json: ALL[name], npcs: p.npcs }, sm = withFallbacks(map, SPRITES);
    for (const d of p.npcs) {
      const e = sm[name + '.' + d.id];
      if (!e || !existsSync(new URL('art/characters/pixel/' + e.overworld_sheet, ROOT))) bad.push(`${name}.${d.id} -> ${e?.overworld_sheet}`);
    }
  }
  assert.deepEqual(bad, []);
  const route1 = { name: 'route1', json: ALL.route1, npcs: ALL.route1.npcs };
  assert.equal(isBatch3Map(route1), false);
  assert.deepEqual(withFallbacks(route1, SPRITES), SPRITES);
  assert.equal(pickSpriteId('saltmere_hall_int', { id: 'saltmere_hall_int_master', kind: 'master' }), 'tr_master_saltmere_f');
});

test('batch 3: every trainer (battle_lost) has a team: masters.json or the map team (Ron by starter, stand-ins registered)', () => {
  let trainers = 0; const noTeam = [], unknown = [];
  for (const name of B3) for (const d of placed(name).npcs) {
    if (!entry(name, d)?.battle_lost) continue; trainers++;
    const t = teamFor(MASTERS, name, d.id) || mapTeamFor(d, { starter: 'rillop', standIns: STANDINS });
    if (!t?.foes?.length) noTeam.push(name + '.' + d.id);
    for (const f of t?.foes || []) if (!known.has(f.species)) unknown.push(`${name}.${d.id}:${f.species}`);
  }
  assert.ok(trainers >= 100, `trainers ${trainers}`);
  assert.deepEqual(noTeam, []); assert.deepEqual(unknown, []);
  assert.equal(known.has('sunderhoof'), false, 'sunderhoof stays out of the synced species (masters use a battle stand-in)');
  const ron = { kind: 'rival', team: { if_player_took_tumbloam: [{ species: 'cindrip', level: 9 }], if_player_took_rillop: [{ species: 'tumbloam', level: 9 }] } };
  assert.equal(mapTeamFor(ron, { starter: 'rillop' }).foes[0].species, 'tumbloam');
  assert.equal(mapTeamFor(ron, { starter: 'rillop' }).foeName, 'Ron');
  assert.equal(playerStarter([{ species: 'cindrip', origin: { how: 'starter' } }]), 'cindrip');
});

test('hall trainer sight: Mirefen h1 spots the player and starts a trainer battle with its team', async () => {
  const name = 'mirefen_hall_int', m = loadMap(name);
  const defs = placed(name).npcs, h1 = defs.find((d) => d.id === 'mirefen_hall_int_h1');
  const mk = (d) => ({ id: d.id, def: d, x: d.x, y: d.y, talking: false, mover: { moving: false, facing: d.facing }, faceToward() {} });
  const list = defs.map(mk), byId = (id) => list.find((n) => n.id === id);
  const [cx, cy] = h1.sight_cells[2];
  const battles = [];
  const scene = {
    map: Object.assign(m, { npcAt: () => null }), player: { x: cx, y: cy, moving: false, facing: 'up' }, busy: false, fade: false, seen: {}, log: [], tick: 0,
    npcs: { list, byId, walkTo(id, x, y) { const n = byId(id); n.x = x; n.y = y; return true; } },
    _entryFor: (map, d) => entry(map, d), lines: LINES.__none__ || {}, say: async () => {}, fill: (p) => p, textVars: () => ({}),
    script: async (fn) => { scene.busy = true; try { await fn(); } finally { scene.busy = false; } },
    talk: (n, d) => { if (entry(name, d)?.battle_lost) battles.push({ id: n.id, team: teamFor(MASTERS, name, n.id) }); },
  };
  assert.equal(findSpotter(scene.map, list, cx, cy, () => false)?.id, 'mirefen_hall_int_h1');
  const sight = new SightSystem(scene);
  sight.tick();
  for (let i = 0; i < 200 && !battles.length; i++) { await new Promise((r) => setImmediate(r)); sight.tick(); }
  assert.equal(battles.length, 1);
  assert.equal(battles[0].id, 'mirefen_hall_int_h1');
  assert.ok(battles[0].team?.foes?.length, 'hall trainer team from masters.json');
  assert.deepEqual([byId(h1.id).x, byId(h1.id).y], [cx - 1, cy], 'walked up next to the player');
  scene.seen['defeated:mirefen_hall_int.mirefen_hall_int_h1'] = true; sight.onEnter(); battles.length = 0;
  scene.player.x = cx; sight.tick(); for (let i = 0; i < 20; i++) { await new Promise((r) => setImmediate(r)); sight.tick(); }
  assert.ok(!battles.some((b) => b.id === h1.id), 'a beaten trainer never re-spots');
});

test('item 2: gradeFor uses map.tint.grade (listed phases only), else the indoor rule', () => {
  const tint = ALL.mirefen_hall_int.tint;
  for (const ph of ['dawn', 'day', 'dusk', 'night']) assert.equal(gradeFor('mirefen_hall_int', ph, tint), 'night');
  assert.equal(gradeFor('mirefen_hall_int', 'day', null), 'day');
  assert.equal(gradeFor('x_hall_int', 'day', { grade: 'night', phases: ['night'] }), 'day');
  assert.equal(gradeFor('x_hall_int', 'dusk', { grade: 'dusk' }), 'dusk');
  assert.equal(gradeFor('route1', 'night', null), 'night');
});

test('item 2: Mirefen tint agrees with def.darkness; lamps swap 2067 / 2068 at runtime; solved clears the tint', () => {
  const def = J(new URL('data/hall_puzzles/mirefen.json', ROOT)), m = loadMap('mirefen_hall_int');
  assert.ok(lampsAgree(m, def));
  assert.equal(m.json.tint.grade, 'night'); assert.equal(def.darkness.kind, m.json.tint.kind);
  const L = m.json.tint.lights;
  assert.equal(m.tileByName(L.tile_unlit).id, 2067); assert.equal(m.tileByName(L.tile_lit).id, 2068);
  const fresh = applyLamps(m, def, null);
  assert.equal(fresh.filter((l) => l.lit).length, 0);
  for (const c of lampMapCells(def)) assert.equal(m.tile('decoration', c.x, c.y), 2067);
  const one = applyLamps(m, def, { st: { p: 1 } });
  assert.deepEqual(one.filter((l) => l.lit).map((l) => [l.id, l.x, l.y]), [['3', 1, 10]]);
  assert.equal(m.tile('decoration', 1, 10), 2068); assert.equal(m.tile('decoration', 9, 10), 2067);
  assert.equal(activeTint(m, def, { st: { p: 1 } }), m.json.tint);
  applyLamps(m, def, { st: { p: 4 } });
  for (const c of lampMapCells(def)) assert.equal(m.tile('decoration', c.x, c.y), 2068);
  assert.equal(activeTint(m, def, { solved: true }), null);
  assert.equal(activeTint(m, def, null, new Set([def.solved_flag])), null);
  assert.equal(gradeFor(m.name, 'night', activeTint(m, def, { solved: true })), 'day');
});

test('item 4: Continue on first launch only with a boot save (an early autosave never counts)', () => {
  assert.equal(showContinue({ bootSave: null, played: false, stored: { v: 1 } }), false, 'boot autosave before the title');
  assert.equal(showContinue({ bootSave: { v: 1 } }), true);
  assert.equal(showContinue({ played: true, stored: { v: 1 } }), true, 'title reopened after playing');
  assert.equal(showContinue({ played: true, stored: null }), false);
  const ui = readFileSync(new URL('src/ui/ui.js', ROOT), 'utf8');
  assert.match(ui, /showContinue\(\{ bootSave: this\.scene\.opts\?\.saveData/);
  assert.match(ui, /ui\._bootTitle = true/);
});

// ---- item 5: a minimal DOM, enough for makeSdBattle (no browser in npm test)
function fakeDom() {
  const el = (tag = 'div') => {
    const kids = new Map(); const e = {
      tagName: tag, style: { setProperty() {} }, dataset: {}, hidden: false, textContent: '', parentElement: null, children: [],
      classList: { add() {}, remove() {}, contains: () => false, toggle() {} }, offsetWidth: 0, complete: false, naturalWidth: 0,
      set innerHTML(v) { this._html = v; for (const k of kids.values()) k._connected = false; kids.clear(); }, get innerHTML() { return this._html || ''; },
      get firstElementChild() { return this._first || (this._first = el()); },
      querySelector(s) { if (!kids.has(s)) kids.set(s, Object.assign(el(), { _connected: true })); return kids.get(s); },
      querySelectorAll() { return []; }, appendChild(c) { return c; }, remove() {}, setAttribute() {}, removeAttribute() {}, addEventListener() {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 10, height: 10 }), getContext: () => new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => ({ data: [] })), set: (t, k, v) => { t[k] = v; return true; } }), toDataURL: () => '', focus() {}, scrollIntoView() {},
    }; return e;
  };
  const layer = { _root: null, set innerHTML(v) { if (this._root) this._root.isConnected = false; this._root = v ? Object.assign(el(), { isConnected: true }) : null; },
    get firstElementChild() { return this._root; }, querySelector(s) { return this._root ? this._root.querySelector(s) : null; },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }) };
  return { el, layer };
}

test('item 5: force-closing a battle mid-playback throws nothing ("Cannot set properties of null" fixed)', async () => {
  const { el, layer } = fakeDom();
  const saved = { document: globalThis.document, fetch: globalThis.fetch };
  globalThis.document = { createElement: (t) => el(t) };
  globalThis.fetch = async () => ({ ok: false, json: async () => ({}) });
  const errors = []; const onErr = (e) => errors.push(e); process.on('unhandledRejection', onErr);
  try {
    const { makeSdBattle } = await import('../src/battle/ui_sd.js');
    let closes = 0; const ui = {
      layer, q: new URLSearchParams(''), demo: true, bag: {}, party: () => [{ species: 'rillop', level: 8 }],
      P: (k, fb) => fb, T: (k, d) => d, closeAll() { closes++; layer.innerHTML = ''; }, _markSel() {}, sparkle() {}, fx: null,
    };
    const sp = (id) => ({ id, el: ['water'], name: id });
    const scr = makeSdBattle(ui, { trainer: true, foes: [{ species: 'cindrip', level: 6 }], seed: [1, 2, 3, 4] }, {
      esc: (s) => String(s), front: () => '', back: () => '', fx: () => Promise.resolve(), wait: (ms) => new Promise((r) => setTimeout(r, Math.min(ms, 2))),
      lvlOf: () => 'good', speciesById: sp, SPECIES, ELEMENT_LABEL: {}, statsFor: () => ({ level: 8 }),
    });
    let done = null; scr.onDone = (r) => { done = r; };
    scr.mount(layer);
    await new Promise((r) => setTimeout(r, 15));
    ui.closeAll(); // force close (e.g. phone menu / blackout / dev reset) while the intro is still playing
    for (let i = 0; i < 80; i++) { await new Promise((r) => setTimeout(r, 10)); scr.onA?.(0); scr.handle?.({ a: true }); }
    assert.deepEqual(errors.map(String), []);
    assert.equal(scr.isClosed(), true);
    assert.equal(done, null, 'a force-closed battle reports no result (onBattle resolves as not won)');
    assert.equal(closes, 1, 'the battle never closes a later screen');
  } finally {
    process.off('unhandledRejection', onErr);
    globalThis.document = saved.document; globalThis.fetch = saved.fetch;
  }
});

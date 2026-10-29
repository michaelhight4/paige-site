// QoL batch C (Coder, Oct 29 2026; Gary approved 10:49 AM CT): items 8/10/12/15/16/17 of design/QOL_MODS_SHORTLIST.md.
// src/qol_c/{flags,logic,index}.js. Run: node --test tests/qol_batch_c.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Overworld } from '../src/overworld/overworld.js';
import { qolcFlags, QOLC_DEFAULTS } from '../src/qol_c/flags.js';
import { quickSave, quickSaveBlock, storageAvailable, statRows, checkName, renameCreature, Blocker, ChainCounter, qolcState, BANNED_RE, growthGrade } from '../src/qol_c/logic.js';
import { installQolC } from '../src/qol_c/index.js';
import { createCreature } from '../src/systems/creature.js';

const P = Overworld.prototype;
function scene(extra = {}) {
  const s = { busy: false, fade: null, dialog: null, intro: null, saveGuards: [], _saveLocks: new Map(), log: [], tick: 0, flags: new Set(), map: null, player: {},
    writes: 0, store: { save: () => { s.writes++; return true; } }, saveData: () => ({}), ...extra };
  s.saveLockReason = P.saveLockReason.bind(s); s.saveNow = P.saveNow.bind(s); s.lockSave = P.lockSave.bind(s);
  Object.defineProperty(s, 'saveLocked', { get: () => !!s.saveLockReason() });
  return s;
}

test('every feature has a kill switch; ?qolc= turns them off', () => {
  for (const k of ['storage', 'stats', 'renew', 'quicksave', 'rename', 'chain']) assert.ok(k in QOLC_DEFAULTS, k);
  assert.equal(QOLC_DEFAULTS.chain, false, 'chain is structure only: off by default');
  const off = qolcFlags(new URLSearchParams('qolc=0'));
  assert.ok(Object.values(off).every((v) => v === false));
  const f = qolcFlags(new URLSearchParams('qolc=-storage,chain'));
  assert.equal(f.storage, false); assert.equal(f.chain, true); assert.equal(f.stats, true);
});

test('quick save writes when free and is refused in battle, talk, cutscene/script and a held lock', () => {
  const s = scene();
  assert.deepEqual(quickSave(s), { ok: true }); assert.equal(s.writes, 1);
  s.busy = true; assert.equal(quickSave(s).reason, 'script'); s.busy = false;
  s.dialog = { active: true }; assert.equal(quickSave(s).reason, 'dialogue'); s.dialog = null;
  assert.equal(quickSave(s, { stack: [{ scr: 'battle' }] }).reason, 'battle');
  s.saveGuards.push(() => 'rtb'); assert.equal(quickSave(s).reason, 'rtb'); s.saveGuards.length = 0;
  const rel = s.lockSave('cutscene'); assert.equal(quickSaveBlock(s), 'cutscene'); rel();
  s.fade = { t: 0 }; assert.equal(quickSave(s).ok, false); s.fade = null;
  assert.equal(s.writes, 1, 'no write while blocked');
});

test('storage is available with systems; optional story flag gate', () => {
  const s = scene({ systems: { archive: {}, party: {} } });
  assert.equal(storageAvailable(s), true);
  assert.equal(storageAvailable(s, { storageFlag: 'has_link' }), false);
  s.flags.add('has_link'); assert.equal(storageAvailable(s, { storageFlag: 'has_link' }), true);
  assert.equal(storageAvailable(scene()), false);
});

test('stats rows: six stats, growth grades, variant boost marked', () => {
  const c = createCreature({ species: 'rillop', level: 20 });
  const r = statRows(c);
  assert.deepEqual(r.map((x) => x.key), ['hp', 'atk', 'def', 'spa', 'spd', 'spe']);
  for (const x of r) { assert.ok(x.value > 0); assert.ok(x.grade >= 0 && x.grade <= 4); assert.ok(x.frac > 0 && x.frac <= 1); }
  const big = statRows(createCreature({ species: 'rillop', level: 20, variant: 'large' }));
  assert.ok(big.find((x) => x.key === 'def').boosted);
  assert.equal(growthGrade(40), 0); assert.equal(growthGrade(120), 4);
});

test('rename: filter, length, empty clears, banned words', () => {
  const c = createCreature({ species: 'rillop', level: 5 });
  assert.equal(renameCreature(c, ' Bubbles ').ok, true); assert.equal(c.nickname, 'Bubbles');
  assert.equal(renameCreature(c, 'abcdefghijklmnop').reason, 'too_long'); assert.equal(c.nickname, 'Bubbles');
  assert.equal(renameCreature(c, 'shit').ok, false);
  assert.equal(checkName('Shiny').ok, false); assert.equal(checkName('weed').ok, false);
  assert.equal(renameCreature(c, '').ok, true); assert.equal(c.nickname, null);
});

test('blocker: counts steps, blocks, offers renew only with stock', () => {
  const counts = { calm_spray: 2 }; const bag = { has: (id) => (counts[id] || 0) > 0, remove: (id) => { counts[id]--; return true; } };
  const st = { item: null, steps: 0 }, b = new Blocker(st, { blockerItems: { calm_spray: 2 } });
  assert.equal(b.start('nope', bag), false);
  assert.equal(b.start('calm_spray', bag), true); assert.equal(counts.calm_spray, 1);
  assert.deepEqual(b.step(), { blocked: true, ranOut: false });
  assert.deepEqual(b.step(), { blocked: true, ranOut: true });
  assert.deepEqual(b.step(), { blocked: false, ranOut: false });
  assert.equal(b.canRenew(bag), true); b.start('calm_spray', bag); b.step(); b.step();
  assert.equal(b.canRenew(bag), false, 'none left');
});

test('chain counter: same kind in a row grows, another resets, odds are a placeholder shape', () => {
  const ch = new ChainCounter({});
  ch.record('a'); ch.record('a'); ch.record('a'); assert.equal(ch.st.count, 3);
  ch.record('b'); assert.equal(ch.st.count, 1); assert.equal(ch.st.best, 3);
  assert.ok(ChainCounter.odds(40).oneIn < ChainCounter.odds(0).oneIn);
});

test('state lives in systems.state.qolc (saved with the systems block)', () => {
  const sys = { state: {} }; const s = qolcState(sys);
  assert.deepEqual(Object.keys(s).sort(), ['blocker', 'chain']);
  assert.doesNotThrow(() => JSON.stringify(sys.state));
});

test('install: encounter hook blocks steps while a blocker runs and records the chain', () => {
  const s = scene({ hooks: {}, party: [{}] });
  let rolled = 0; s.hooks.onEncounterTile = () => { rolled++; s.log.push({ type: 'wild', species: 'rillop' }); };
  s.systems = { state: {}, bag: { has: () => false, count: () => 0, remove: () => true }, party: { list: [] }, archive: { box: () => [], boxCount: () => 8 } };
  const ui = { T: () => null, scr_phone() { return { count: () => 9, render: () => '<div><div class="ui-apps"></div></div>', onA() {} }; }, scr_summary() { return { handle() {}, hint() {} }; }, hintText: () => '', note() {}, party: () => [] };
  const api = installQolC(s, ui, { query: new URLSearchParams('qolc=chain') });
  s.systems.state.qolc.blocker.steps = 1; s.systems.state.qolc.blocker.item = 'x';
  s.hooks.onEncounterTile(0, 0, 1); assert.equal(rolled, 0, 'blocked');
  s.hooks.onEncounterTile(0, 0, 1); s.hooks.onEncounterTile(0, 0, 1); assert.equal(rolled, 2);
  assert.equal(api.chain.st.count, 2);
  const ph = ui.scr_phone(); assert.equal(ph.count(), 12); assert.match(ph.render(), /data-app="qolc_storage"/);
  const none = installQolC(scene({ hooks: {}, systems: s.systems }), { ...ui }, { query: new URLSearchParams('qolc=0') });
  assert.equal(none.flags.storage, false);
});

test('no banned player-facing words in batch C fallbacks', () => {
  const src = ['src/qol_c/index.js', 'src/qol_c/flags.js'].map((p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8')).join('\n');
  const strings = [...src.matchAll(/'([^'\\]*(?:\\.[^'\\]*)*)'/g)].map((m) => m[1]).filter((t) => /[a-z] [a-z]/i.test(t));
  for (const t of strings) assert.doesNotMatch(t, BANNED_RE, t);
});

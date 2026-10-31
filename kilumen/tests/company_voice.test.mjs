// Company voice (Oct 23 2026, coder; Gary 12:19-12:22 PM CT): src/systems/company_voice.js + data/company_voice.json,
// employee number src/systems/employee_id.js. Node only; browser shots: tests/company_voice_shots.mjs.
// Run: node --test tests/company_voice.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Overworld } from '../src/overworld/overworld.js';
import { SaveStore, freshSave, migrate, SAVE_KEY } from '../src/overworld/save.js';
import { CONFIG } from '../src/config.js';
import { CompanyVoice, attachCompanyVoice, companyVoiceEnabled, FALLBACK, ritaIdOf, TRAINER1_KEY, TRAINER1_INTRO } from '../src/systems/company_voice.js';
import { employeeIdFor, employeeIdOf, EMPLOYEE_ID_RE } from '../src/systems/employee_id.js';

const CFG = JSON.parse(fs.readFileSync(new URL('../data/company_voice.json', import.meta.url)));
const CFG_ALL = { ...CFG, maxRegion: null };
const CFG_R1 = { ...CFG, maxRegion: 1 }; // region 1 release scope (the live v0.2.0-alpha); data/company_voice.json is at maxRegion 2 since the region 2 build (Oct 23 2026) // whole-game scope (later regions) for the line-system tests
const memStorage = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const P = Overworld.prototype;

/** Scene stub with the REAL save-lock / save path (Overworld.prototype) and a real SaveStore. */
function stub({ flags = ['got_starter'], storage = memStorage() } = {}) {
  const store = new SaveStore(storage);
  const sys = { kilindex: { caughtCount: 1 }, company: { idLevel: 1, board: {} }, applyBattleResult: (r) => r };
  const s = {
    flags: new Set(flags), seen: { 'cv#trainer1': true }, log: [], busy: false, fade: null, dialog: { active: false }, tick: 0, ms: 0, store, systems: sys, lines: {},
    _saveLocks: new Map(), saveGuards: [], _dirty: false, saves: 0, map: null, player: {}, intro: null,
    textVars() { return { employee_id: employeeIdOf(this) }; },
    saveData() { return { flags: [...this.flags], seen: this.seen }; },
    step() { this.tick++; if (this._dirty && !this.busy && !this.fade) this.saveNow(); },
  };
  for (const k of ['saveLockReason', 'lockSave', 'checkpoint', 'saveNow']) s[k] = P[k].bind(s);
  Object.defineProperty(s, 'saveLocked', { get: () => !!s.saveLockReason() });
  const save = s.saveNow; s.saveNow = () => { const ok = save(); if (ok) s.saves++; return ok; };
  return { s, store, storage, sys };
}
async function voice(opts = {}) {
  const t = stub(opts);
  const cv = await attachCompanyVoice(t.s, { cfg: opts.cfg || CFG, query: new URLSearchParams(''), storage: opts.modeStorage ?? memStorage(), now: () => t.s.ms, doc: null, ui: () => opts.ui || null });
  return { ...t, cv };
}
/** Advance the game clock by ms in 100 ms ticks. */
const run = (s, ms, snap = {}) => { for (let t = 0; t < ms; t += 100) { s.ms += 100; s.step(snap); } };

test('flag: DEFAULT ON for the region 1 release (no flag -> on); ?cv=0 off (null, nothing wrapped)', async () => {
  // Gary 12:45 PM CT Oct 23 2026: "Yes, ship RITA in region 1"
  assert.equal(CFG.default_on, true);
  assert.equal(companyVoiceEnabled(new URLSearchParams('')), true);
  assert.equal(companyVoiceEnabled(new URLSearchParams('')), companyVoiceEnabled(new URLSearchParams(''), CFG));
  assert.equal(companyVoiceEnabled(new URLSearchParams('cv=1')), true);
  assert.equal(companyVoiceEnabled(new URLSearchParams('cv=0')), false);
  assert.equal(companyVoiceEnabled(new URLSearchParams('cv=0'), CFG), false);
  // no query flag: attached (cfg passed so nothing is fetched)
  const on = stub(); const cvOn = await attachCompanyVoice(on.s, { cfg: CFG, query: new URLSearchParams(''), storage: memStorage(), doc: null });
  assert.ok(cvOn instanceof CompanyVoice); assert.equal(on.s.companyVoice, cvOn); assert.equal(on.s.saveGuards.length, 1);
  // ?cv=0: null, nothing fetched or wrapped (with or without a cfg)
  for (const opts of [{}, { cfg: CFG }]) {
    const { s } = stub(); const step = s.step, push = s.log.push;
    assert.equal(await attachCompanyVoice(s, { ...opts, query: new URLSearchParams('cv=0') }), null);
    assert.equal(s.step, step); assert.equal(s.log.push, push); assert.equal(s.saveGuards.length, 0); assert.equal(s.companyVoice, undefined);
  }
  const main = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /if \(q\.get\('cv'\) !== '0'\) import\('\.\/systems\/company_voice\.js(\?v=[^']*)?'\)/); // same pattern as contacts: ?cv=0 = not even loaded
  assert.doesNotMatch(main, /q\.get\('cv'\) === '1'/);
});

test('employee ID: 6 digits, bare, stable across save / load; old saves get one on load', () => {
  const f = freshSave();
  assert.match(f.company.employeeId, EMPLOYEE_ID_RE);
  assert.equal(f.company.employeeId, employeeIdFor(f.saveId));
  assert.equal(employeeIdFor('k123'), employeeIdFor('k123'));
  assert.notEqual(employeeIdFor('k123'), employeeIdFor('k124'));
  for (let i = 0; i < 500; i++) { const id = employeeIdFor('k' + i); assert.match(id, /^\d{6}$/); assert.notEqual(id, '000000'); }
  // save -> load -> save -> load: same number
  const storage = memStorage(), a = new SaveStore(storage);
  assert.ok(a.save({ flags: ['got_starter'], party: [] }));
  const l1 = new SaveStore(storage).load(), b = new SaveStore(storage); b.load();
  assert.ok(b.save({ ...l1 }));
  const l2 = new SaveStore(storage).load();
  assert.match(l1.company.employeeId, /^\d{6}$/);
  assert.equal(l2.company.employeeId, l1.company.employeeId);
  assert.equal(l1.company.employeeId, employeeIdFor(l1.saveId));
  // an old save with no employeeId (company block from before this pass) gets the derived one, and keeps it
  const raw = JSON.parse(storage.getItem(SAVE_KEY)); delete raw.company.employeeId; storage.setItem(SAVE_KEY, JSON.stringify(raw));
  const old = new SaveStore(storage).load();
  assert.equal(old.company.employeeId, l1.company.employeeId);
  // a v1 save (migrated): deterministic id -> deterministic number
  const v1 = { v: 1, flags: ['x'], party: [], seen: {}, counters: {}, clock: { day: 0, min: 480 } };
  assert.equal(employeeIdFor(migrate(structuredClone(v1)).saveId), employeeIdFor(migrate(structuredClone(v1)).saveId));
});

test('{employee_id} text var on the real Overworld.textVars; Gary\'s model line renders the bare number', async () => {
  const { s, cv } = await voice();
  const vars = P.textVars.call({ party: [], config: CONFIG, flags: new Set(), lines: {}, opts: {}, input: null, promptVars: () => ({}), store: s.store, systems: s.systems });
  assert.match(vars.employee_id, /^\d{6}$/);
  assert.equal(vars.employee_id, s.store.extra.company.employeeId);
  assert.equal(FALLBACK.kilindex_new[0], 'Good job {employee_id}! New creatures help boost company asset value!');
  const id = ritaIdOf(s);
  assert.deepEqual(cv.pages('kilindex_new', { count: 2 }), [`Good job ${id}! New creatures help boost company asset value!`]);
  // Text Bot key wins over the fallback, still filled with the number
  s.lines = { system_company_voice: { first_catch: { pages: ['{employee_id}: asset logged.'] }, speaker: { labels: { name: 'Comms' } } } };
  assert.deepEqual(cv.pages('first_catch'), [`${id}: asset logged.`]);
  assert.equal(cv.speaker(), 'Comms');
  // every fallback line addresses the player by number and never by name
  for (const [k, pages] of Object.entries(FALLBACK)) if (k !== 'speaker' && pages.length) { /* rita_install: [] on purpose (strip = Trainer 1 intro alone) */ assert.match(pages[0], /\{employee_id\}/, k); assert.doesNotMatch(pages.join(' '), /\{player\}|\{nick\}/, k); }
});

test('an event fires once (once-per-save keys survive in scene.seen)', async () => {
  const { s, cv } = await voice();
  s.systems.applyBattleResult({ outcome: 'caught', caught: { species: 'rillop' } });
  run(s, 2000);
  assert.equal(cv.state().showing?.event, 'first_catch');
  assert.match(cv.state().showing.text, /^Good job Trainer 1! First asset acquired\.$/);
  run(s, 15000); assert.equal(cv.current, null);
  run(s, 30000);
  s.systems.applyBattleResult({ outcome: 'caught', caught: { species: 'peeplark' } });
  run(s, 30000);
  assert.deepEqual(cv.state().shown, ['first_catch']);
  assert.equal(s.seen['cv#first_catch'], true);
  // area: once per map, re-entering never repeats
  s.log.push({ type: 'areaSign', map: 'route1', title: 'Trail 1' }); run(s, 30000);
  s.log.push({ type: 'areaSign', map: 'route1', title: 'Trail 1' }); run(s, 60000);
  assert.deepEqual(cv.state().shown, ['first_catch', 'area_new']);
});

test('burst: max 1 per burst (highest priority wins); cooldown + queue between bursts', async () => {
  const { s, sys, cv } = await voice();
  run(s, 200); // baselines (Kilindex 1, ID level 1)
  // one catch = first catch + Kilindex entry #2 in the same moment -> one message
  sys.applyBattleResult({ outcome: 'caught', caught: { species: 'rillop' } }); sys.kilindex.caughtCount = 2;
  run(s, 2000);
  assert.equal(cv.state().showing.event, 'first_catch');
  assert.deepEqual(cv.state().queue, []);
  // a Master win while it is still up -> queued, waits for the global cooldown after the hide
  s.log.push({ type: 'flag', flag: 'beat_master_fernwick', on: true });
  run(s, 2000);
  assert.deepEqual(cv.state().queue, ['master_beaten']);
  cv.advance('a'); cv.advance('a'); assert.equal(cv.current, null);
  const hid = s.ms;
  run(s, CFG.timing.global_cooldown_ms - 500);
  assert.equal(cv.current, null, 'global cooldown holds the queue');
  run(s, 1000);
  assert.equal(cv.state().showing.event, 'master_beaten');
  assert.ok(s.ms - hid >= CFG.timing.global_cooldown_ms);
  assert.match(cv.state().showing.text, /^Trainer 1: Fernwick Master beaten\.$/);
  // Kilindex: entries 3,4 = "first few"; 5 = milestone (region 1: 5 / 10 / 15); 6..9 silent; 10 = milestone
  cv.hide(); run(s, 61000); // kilindex_new has its own 60 s cooldown (entry #2 fired with the first catch)
  sys.kilindex.caughtCount = 4; run(s, 30000);
  assert.deepEqual(cv.state().shown, ['first_catch', 'master_beaten', 'kilindex_new']); // 3 and 4 in one burst -> one message
  sys.kilindex.caughtCount = 9; run(s, 30000);
  assert.equal(cv.state().shown.at(-1), 'kilindex_milestone'); assert.equal(cv.shownLog.at(-1).pages[0].includes(' 5 '), true); // 5..9 in one burst: milestone 5 only
  sys.kilindex.caughtCount = 10; run(s, 30000);
  assert.equal(cv.state().shown.at(-1), 'kilindex_milestone'); assert.equal(cv.state().shown.length, 5);
  // ID level up + board node: both fire (diffs of the company block)
  run(s, 25000); sys.company.idLevel = 2; run(s, 30000);
  assert.equal(cv.state().shown.at(-1), 'id_level_up');
  sys.company.board = { store_discount: 1 }; run(s, 30000);
  assert.equal(cv.state().shown.at(-1), 'board_node');
});

test('never during battle / dialogue / script / phone UI; a message up hides at once if one starts', async () => {
  const ui = { active: false };
  const { s, cv } = await voice({ ui });
  s.busy = true; // a script (wild battle, trainer talk, cutscene)
  s.systems.applyBattleResult({ outcome: 'caught', caught: { species: 'rillop' } });
  run(s, 10000);
  assert.equal(cv.current, null, 'script running: nothing shows');
  s.busy = false; s.dialog.active = true; run(s, 5000);
  assert.equal(cv.current, null, 'dialogue open: nothing shows');
  s.dialog.active = false; ui.active = true; run(s, 5000);
  assert.equal(cv.current, null, 'battle screen / phone menu open: nothing shows');
  const release = s.lockSave('trainer_approach'); ui.active = false; run(s, 5000);
  assert.equal(cv.current, null, 'trainer walk-up: nothing shows'); release();
  run(s, 2000);
  assert.equal(cv.state().showing?.event, 'first_catch', 'shows once everything is clear');
  s.dialog.active = true; run(s, 100);
  assert.equal(cv.current, null); assert.equal(cv.lastHideWhy, 'interrupted:dialogue');
});

test('mode: Off silences everything; Milestones only drops flavour events; saved', async () => {
  const modeStorage = memStorage();
  const { s, cv } = await voice({ modeStorage });
  assert.equal(cv.mode, 'full');
  assert.equal(cv.cycleMode(), 'milestones'); assert.equal(cv.modeLabel(), 'Milestones only');
  s.log.push({ type: 'areaSign', map: 'route1', title: 'Trail 1' }); run(s, 30000);
  assert.equal(cv.state().shown.length, 0, 'area_new is a Full-mode event');
  s.log.push({ type: 'flag', flag: 'beat_master_fernwick', on: true }); run(s, 3000);
  assert.equal(cv.state().showing?.event, 'master_beaten');
  cv.setMode('off');
  assert.equal(cv.current, null, 'Off hides a message on screen');
  s.systems.applyBattleResult({ outcome: 'caught', caught: { species: 'rillop' } });
  s.log.push({ type: 'flag', flag: 'beat_master_saltmere', on: true });
  s.systems.company.idLevel = 3;
  run(s, 60000);
  assert.deepEqual(cv.state().shown, ['master_beaten']);
  assert.equal(s.seen['cv#first_catch'], undefined, 'Off does not burn once-events');
  const again = new CompanyVoice(s, CFG, { storage: modeStorage });
  assert.equal(again.mode, 'off', 'mode saved');
});

test('save rule: checkpoint right before, no save while a message is up, normal save after', async () => {
  const { s, cv, storage } = await voice();
  s.systems.applyBattleResult({ outcome: 'caught', caught: { species: 'rillop' } });
  let atShow = null; const show = cv.show.bind(cv);
  cv.show = (item) => { const n = s.saves; show(item); atShow = { before: n, after: s.saves }; };
  run(s, 1600);
  assert.ok(cv.current, 'showing');
  assert.equal(atShow.after, atShow.before + 1, 'checkpoint save right before it showed');
  const before = s.saves - 1;
  assert.equal(JSON.parse(storage.getItem(SAVE_KEY)).seen['cv#first_catch'], true, 'the checkpoint carries the once-marker');
  assert.equal(s.saveLockReason(), 'company_voice');
  s._dirty = true;
  assert.equal(s.saveNow(), false, 'autosave / pagehide refused mid-message');
  assert.equal(s.checkpoint('x'), false);
  run(s, 1000); assert.ok(cv.current); assert.equal(s.saves, before + 1, 'step loop autosave refused too');
  cv.advance('a'); cv.advance('a');
  assert.equal(cv.current, null);
  run(s, 100);
  assert.equal(s.saves, before + 2, 'normal save once it is gone');
  assert.equal(s.saveLockReason(), null);
});

test('input: A (F on PC) dismisses and is eaten (no talk); auto-hides without input', async () => {
  const { s, cv } = await voice();
  const seen = []; const inner = s.step; // the wrapped step passes the filtered snap to the original
  s.systems.applyBattleResult({ outcome: 'caught', caught: { species: 'rillop' } });
  run(s, 1600);
  assert.equal(cv.current.page, 0);
  const passed = cv.input({ a: true }); seen.push(passed.a);
  assert.equal(passed.a, false, 'A eaten');
  assert.equal(cv.current.page, 1, 'A -> next page');
  assert.equal(cv.input({ a: true }).a, false, 'held A still eaten');
  cv.input({ a: false }); cv.input({ a: true });
  assert.equal(cv.current, null, 'A on the last page dismisses');
  assert.equal(cv.input({ a: false }).a, false); assert.equal(cv.input({ a: true }).a, true, 'fresh A press goes to the game again');
  // auto-hide
  s.log.push({ type: 'flag', flag: 'beat_master_fernwick', on: true }); run(s, 25000);
  assert.ok(cv.state().shown.includes('master_beaten'));
  run(s, 15000);
  assert.equal(cv.current, null); assert.equal(cv.lastHideWhy, 'timer');
  void inner; void seen;
});

test('start gate: nothing before got_starter (the opening owns that stretch)', async () => {
  const { s, cv } = await voice({ flags: [] });
  s.log.push({ type: 'areaSign', map: 'brookhollow', title: 'Brookhollow' });
  run(s, 30000);
  assert.equal(cv.state().shown.length, 0);
});

test('data + text rules: every event has a fallback, tiers valid, no blocked player words', () => {
  const blocked = /\b(routes?|PP|shiny|super effective|pok[eé]dex|pok[eé] ?ball|gotcha|nurse|throw|weed|ADA|FICSIT)\b/i;
  for (const [name, ev] of Object.entries(CFG.events)) {
    assert.ok(FALLBACK[ev.line] || JSON.parse(fs.readFileSync(new URL('../text/overworld_lines.json', import.meta.url))).system_company_voice[ev.line], name); // region 5+ events are data-only (line text, no code default)
    assert.ok(['milestone', 'full'].includes(ev.tier), name);
    assert.ok(Number.isFinite(ev.priority), name);
  }
  for (const pages of Object.values(FALLBACK)) for (const p of [].concat(pages)) { assert.doesNotMatch(p, blocked, p); assert.ok(p.length <= 80, p); }
  // (dev-tree check against data/textbot_requests_company_voice.md removed: that brief is not in the repo)
});

// ---- line variants (Gary 12:29 / 12:30 PM CT: ~4 per message now, 10+ later) -------------------------------------
const REAL_LINES = JSON.parse(fs.readFileSync(new URL('../text/overworld_lines.json', import.meta.url)));
const seqRng = (xs) => { let i = 0; return () => xs[i++ % xs.length]; };
const cvWith = (L, rng = Math.random, seen = {}, cfg = CFG) => { const { s } = stub(); s.seen = seen; s.lines = { system_company_voice: L }; return { s, cv: new CompanyVoice(s, cfg, { rng, now: () => 0 }) }; };

test('variants: rotation picks among base + _2.._4 from the real JSON, every variant reachable', () => {
  const L = REAL_LINES.system_company_voice;
  const { cv } = cvWith(L);
  for (const ev of ['first_catch', 'area_new', 'kilindex_new', 'master_beaten', 'quest_done']) {
    const all = new Set([L[ev], L[ev + '_2'], L[ev + '_3'], L[ev + '_4']].map((v) => JSON.stringify(Array.isArray(v) ? v : v.pages)));
    assert.equal(all.size, 4, ev);
    const got = new Set(); for (let i = 0; i < 200; i++) got.add(JSON.stringify(cv.pickVariant(ev)));
    assert.deepEqual([...got].sort(), [...all].sort(), ev);
  }
});

test('variants: never the same variant twice in a row (stored per key in seen)', () => {
  const L = { area_new: ['a'], area_new_2: ['b'], area_new_3: ['c'] };
  const { cv, s } = cvWith(L, seqRng([0, 0, 0, 0, 0.99, 0.99, 0.5]));
  let prev = null;
  for (let i = 0; i < 30; i++) { const p = cv.pickVariant('area_new')[0]; assert.notEqual(p, prev); prev = p; }
  assert.equal(typeof s.seen['cv#last#area_new'], 'number');
});

test('variants: base-only falls back to the base line; nothing -> code FALLBACK', () => {
  const { cv } = cvWith({ first_catch: ['only {employee_id}'] }, () => 0.7);
  for (let i = 0; i < 5; i++) assert.match(cv.pages('first_catch')[0], /^only \d{6}$/);
  const { cv: cv2 } = cvWith({});
  assert.equal(cv2.pages('rival_beaten', { trainer: 'Ron' })[1], FALLBACK.rival_beaten[1]);
});

test('variants: milestone count keys are not variants; per-count keys rotate their own _2.._4', () => {
  const L = REAL_LINES.system_company_voice;
  assert.ok(L.kilindex_milestone_10_2, 'Text Bot per-count variant present');
  const { cv } = cvWith(L);
  const own = new Set(['', '_2', '_3', '_4'].map((x) => JSON.stringify((Array.isArray(L['kilindex_milestone_10' + x]) ? L['kilindex_milestone_10' + x] : L['kilindex_milestone_10' + x].pages).slice(0, CFG.timing.max_pages))));
  for (let i = 0; i < 60; i++) {
    const raw = cv.pickVariant('kilindex_milestone_10'); assert.ok(own.has(JSON.stringify(raw.slice(0, CFG.timing.max_pages))));
  }
  // generic base: the count keys (10, 25, ...) are excluded even when they look like a _<n> suffix
  const { cv: g } = cvWith({ kilindex_milestone: ['gen'], kilindex_milestone_2: ['gen2'], kilindex_milestone_10: ['TEN'], kilindex_milestone_25: ['TWENTYFIVE'] });
  const got = new Set(); for (let i = 0; i < 100; i++) got.add(g.pickVariant('kilindex_milestone', CFG.events.kilindex_milestone.counts)[0]);
  assert.deepEqual([...got].sort(), ['gen', 'gen2']);
  assert.equal(g.pages('kilindex_milestone', { count: 10 })[0], 'TEN'); // explicit count key
  const got50 = new Set(); for (let i = 0; i < 50; i++) got50.add(g.pages('kilindex_milestone', { count: 50 })[0]);
  assert.deepEqual([...got50].sort(), ['gen', 'gen2']); // no _50 key -> generic rotation, never TEN
});

test('variants: no cap, 12 variants all reachable without repeats', () => {
  const L = { quest_done: ['v1'] }; for (let n = 2; n <= 12; n++) L[`quest_done_${n}`] = [`v${n}`];
  const { cv } = cvWith(L);
  const got = new Set(); let prev;
  for (let i = 0; i < 600; i++) { const p = cv.pickVariant('quest_done')[0]; assert.notEqual(p, prev); prev = p; got.add(p); }
  assert.equal(got.size, 12); assert.ok(got.has('v10') && got.has('v12'));
});

test('variants: old save without cv#last loads and rotates; last index persists through save/load', () => {
  const old = freshSave(); delete old.seen; old.seen = { 'cv#first_catch': true };
  const m = migrate(JSON.parse(JSON.stringify(old)));
  assert.ok(m.seen['cv#first_catch']);
  const { cv, s } = cvWith({ area_new: ['a'], area_new_2: ['b'] }, () => 0, m.seen);
  const first = cv.pickVariant('area_new')[0];
  const back = migrate(JSON.parse(JSON.stringify({ ...m, seen: s.seen })));
  assert.equal(back.seen['cv#last#area_new'], first === 'a' ? 1 : 2);
  const { cv: cv2 } = cvWith({ area_new: ['a'], area_new_2: ['b'] }, () => 0, back.seen);
  assert.notEqual(cv2.pickVariant('area_new')[0], first);
});

// ---- specific keys (Oct 23 2026, coder): <event>_<town | ron_<n> | map id | quest id> -> generic -> FALLBACK -----------
const rawOf = (v) => (Array.isArray(v) ? v : v.pages);
const variantsOf = (L, k) => new Set(['', '_2', '_3', '_4'].filter((x) => L[k + x]).map((x) => JSON.stringify(rawOf(L[k + x]).slice(0, CFG.timing.max_pages))));

test('specific keys: the real JSON specific key wins over the generic (master / rival / area / quest)', () => {
  const L = REAL_LINES.system_company_voice;
  const cases = [
    ['master_beaten', { key: 'fernwick', master: 'Fernwick' }, 'master_beaten_fernwick'],
    ['rival_beaten', { key: '3', trainer: 'Ron' }, 'rival_beaten_ron_3'],
    ['area_new', { key: 'route1', area: 'Trail 1' }, 'area_new_route1'],
    ['quest_done', { key: 'mq_route1_benchmark', quest: 'X' }, 'quest_done_mq_route1_benchmark'],
  ];
  for (const [name, ctx, key] of cases) {
    assert.ok(L[key] && L[key + '_4'], `${key} + variants in the real JSON`);
    const { cv } = cvWith(L, Math.random, {}, CFG_ALL); // whole-game scope (ron_3 is region 3)
    const got = new Set();
    for (let i = 0; i < 80; i++) {
      const raw = cv.pickVariant(key); assert.ok(raw);
      got.add(JSON.stringify(raw.slice(0, CFG.timing.max_pages)));
    }
    assert.deepEqual([...got].sort(), [...variantsOf(L, key)].sort(), `${key} rotates its own _2.._4`);
    // pages() picked the specific key: the last stored rotation index is on the specific base, not the generic one
    const { cv: c2, s: s2 } = cvWith(L, Math.random, {}, CFG_ALL);
    c2.pages(name, ctx);
    assert.equal(typeof s2.seen[`cv#last#${key}`], 'number', key);
    assert.equal(s2.seen[`cv#last#${CFG.events[name].line}`], undefined, `${name} generic untouched`);
  }
  // every town / map / quest / ron key Text Bot listed resolves to its specific base
  const towns = ['fernwick', 'saltmere', 'revival', 'frostspire', 'mirefen', 'tidewater', 'lanternport', 'cindervale'];
  const maps = ['route1', 'fernwick', 'thornwood', 'greystone_entrance', 'aurelith', 'saltmere', 'revival_heights', 'frostspire_pass', 'frostspire', 'sunmeadow_fields', 'mirefen_bog', 'tidewater_coast', 'lanternport', 'cindervale'];
  for (const t of towns) assert.ok(L[`master_beaten_${t}`], t);
  for (const m of maps) assert.ok(L[`area_new_${m}`], m);
  for (let n = 1; n <= 6; n++) assert.ok(L[`rival_beaten_ron_${n}`], `ron ${n}`);
});

test('specific keys: missing specific key -> generic rotation -> FALLBACK', () => {
  const { cv, s } = cvWith({ quest_done: ['gen {quest}'], quest_done_2: ['gen2 {quest}'], quest_done_mq_other: ['OTHER'] });
  const got = new Set(); for (let i = 0; i < 40; i++) got.add(cv.pages('quest_done', { key: 'side_x', quest: 'Q' })[0]);
  assert.deepEqual([...got].sort(), ['gen Q', 'gen2 Q']);
  assert.equal(typeof s.seen['cv#last#quest_done'], 'number');
  const { cv: c2 } = cvWith({});
  assert.equal(c2.pages('master_beaten', { key: 'nowhere', master: 'Nowhere' })[1], FALLBACK.master_beaten[1]);
  // real JSON: an unlisted map falls back to the generic area_new family
  const L = REAL_LINES.system_company_voice, { cv: c3 } = cvWith(L);
  c3.pages('area_new', { key: 'house_2f', area: 'House' });
  assert.equal(typeof c3.scene.seen['cv#last#area_new'], 'number');
  assert.equal(c3.scene.seen['cv#last#area_new_house_2f'], undefined);
});

test('specific keys: rival_beaten_ron_<n> never collides with numeric variants', () => {
  const L = { rival_beaten: ['GEN'], rival_beaten_2: ['GEN2'], rival_beaten_ron_1: ['R1'], rival_beaten_ron_1_2: ['R1b'], rival_beaten_ron_2: ['R2'] };
  const { cv } = cvWith(L);
  const r1 = new Set(); for (let i = 0; i < 40; i++) r1.add(cv.pages('rival_beaten', { key: '1', trainer: 'Ron' })[0]);
  assert.deepEqual([...r1].sort(), ['R1', 'R1b']); // ron_1 + its own _2, never ron_2 or generic
  const r2 = new Set(); for (let i = 0; i < 20; i++) r2.add(cv.pages('rival_beaten', { key: '2', trainer: 'Ron' })[0]);
  assert.deepEqual([...r2], ['R2']); // NOT rival_beaten_2 (a generic variant)
  const r6 = new Set(); for (let i = 0; i < 40; i++) r6.add(cv.pages('rival_beaten', { key: '6', trainer: 'Ron' })[0]);
  assert.deepEqual([...r6].sort(), ['GEN', 'GEN2']); // no ron_6 key -> generic; ron_<n> keys are never generic variants
  // real JSON: the generic rival family excludes every ron key; flag -> ctx.key
  const RL = REAL_LINES.system_company_voice, { cv: rc } = cvWith(RL);
  const ronSet = new Set(); for (let n = 1; n <= 6; n++) for (const x of ['', '_2', '_3', '_4']) if (RL[`rival_beaten_ron_${n}${x}`]) ronSet.add(JSON.stringify(rawOf(RL[`rival_beaten_ron_${n}${x}`])));
  for (let i = 0; i < 60; i++) assert.ok(!ronSet.has(JSON.stringify(rc.pickVariant('rival_beaten'))));
  assert.equal(new RegExp(CFG.events.rival_beaten.flag_re).exec('beat_rival_ron_4')[1], '4');
});

test('milestones (whole-game scope): 200 / 300 / 400 configured and fire with their own keys', async () => {
  for (const c of [200, 300, 400]) assert.ok(CFG.events.kilindex_milestone.counts.includes(c));
  const L = REAL_LINES.system_company_voice;
  for (const c of [200, 300, 400]) assert.ok(L[`kilindex_milestone_${c}`], `real key ${c}`);
  // generic base never treats 200/300/400 as variants
  const { cv: g } = cvWith(L);
  const bad = new Set(); for (const c of [200, 300, 400]) for (const x of ['', '_2', '_3', '_4']) if (L[`kilindex_milestone_${c}${x}`]) bad.add(JSON.stringify(rawOf(L[`kilindex_milestone_${c}${x}`])));
  for (let i = 0; i < 60; i++) assert.ok(!bad.has(JSON.stringify(g.pickVariant('kilindex_milestone', CFG.events.kilindex_milestone.counts))));
  const { s, sys, cv } = await voice({ cfg: CFG_ALL });
  s.lines = REAL_LINES;
  run(s, 200);
  for (const c of [200, 300, 400]) {
    sys.kilindex.caughtCount = c - 1; cv._kiCount = c - 1; sys.kilindex.caughtCount = c; run(s, 2000); // baseline just below c
    assert.equal(cv.current.ctx.count, c);
    assert.equal(cv.state().showing?.event, 'kilindex_milestone', `count ${c}`);
    assert.equal(typeof s.seen[`cv#last#kilindex_milestone_${c}`], 'number', `count ${c} text from kilindex_milestone_${c}*`);
    assert.equal(s.seen[`cv#kilindex_milestone#${c}`], true);
    cv.hide(); run(s, CFG.timing.global_cooldown_ms + 500);
  }
});

test('brookhollow promotion: completes with the starter (before got_starter) -> fires once RITA is on', async () => {
  const { s, cv } = await voice({ flags: [] });
  run(s, 200);
  // same tick: the quest closes, then the starter flag lands
  s.log.push({ type: 'flag', flag: 'q_mq_brookhollow_promotion_done', on: true });
  s.log.push({ type: 'flag', flag: 'q_side_early_done', on: true }); // other pre-start events stay dropped
  assert.equal(cv.burst.length, 0);
  s.flags.add('got_starter'); s.log.push({ type: 'flag', flag: 'got_starter', on: true });
  run(s, 2000);
  assert.equal(cv.state().showing?.event, 'quest_done');
  assert.equal(s.seen['cv#quest_done#mq_brookhollow_promotion'], true);
  assert.equal(s.seen['cv#quest_done#side_early'], undefined);
  // with the real lines it uses the specific key
  const L = REAL_LINES.system_company_voice;
  const { cv: c2, s: s2 } = cvWith(L); c2.pages('quest_done', { key: 'mq_brookhollow_promotion', quest: 'Promoted' });
  assert.equal(typeof s2.seen['cv#last#quest_done_mq_brookhollow_promotion'], 'number');
  // main quest -> milestone tier: shows in Milestones-only mode too
  const m = await voice({ flags: [] }); m.cv.setMode('milestones'); run(m.s, 200);
  m.s.log.push({ type: 'flag', flag: 'q_mq_brookhollow_promotion_done', on: true }); m.s.flags.add('got_starter'); run(m.s, 2000);
  assert.equal(m.cv.state().showing?.event, 'quest_done');
});

test('brookhollow promotion: merges with first_catch / first Kilindex entry by priority (one message)', async () => {
  // first_catch (70) beats quest_done (45)
  const a = await voice({ flags: [] }); run(a.s, 200);
  a.s.log.push({ type: 'flag', flag: 'q_mq_brookhollow_promotion_done', on: true }); a.s.flags.add('got_starter');
  a.sys.applyBattleResult({ outcome: 'caught', caught: { species: 'rillop' } });
  run(a.s, 2000);
  assert.equal(a.cv.state().showing.event, 'first_catch'); assert.deepEqual(a.cv.state().queue, []);
  // quest_done (45) beats kilindex_new (30); the starter itself (count 1) is no Kilindex event
  const b = await voice({ flags: [] }); run(b.s, 200);
  b.s.log.push({ type: 'flag', flag: 'q_mq_brookhollow_promotion_done', on: true }); b.s.flags.add('got_starter'); b.sys.kilindex.caughtCount = 2;
  run(b.s, 2000);
  assert.equal(b.cv.state().showing.event, 'quest_done'); assert.deepEqual(b.cv.state().queue, []);
  assert.ok(CFG.events.first_catch.priority > CFG.events.quest_done.priority && CFG.events.quest_done.priority > CFG.events.kilindex_new.priority);
});

// ---- region 1 release scope (Gary 12:45 PM CT Oct 23 2026: "Yes, ship RITA in region 1") ------------------------------
const regionOf = (v) => CompanyVoice.lineRegion(v);

test('maxRegion 1 (region 1 scope; data is now 2): a line / specific key tagged above it is never used (generic region 1 family instead)', () => {
  assert.equal(CFG.maxRegion, 9); // Oct 31 2026: regions 1-8 + end-game assert.equal(CFG_R1.maxRegion, 1);
  const L = REAL_LINES.system_company_voice;
  // later-region specific keys fall back to the generic family (Thornwood is reachable from Fernwick before Master 1)
  const later = [['area_new', { key: 'thornwood', area: 'Thornwood' }, 'area_new_thornwood'], ['area_new', { key: 'saltmere', area: 'Saltmere' }, 'area_new_saltmere'],
    ['master_beaten', { key: 'saltmere', master: 'Saltmere' }, 'master_beaten_saltmere'], ['rival_beaten', { key: '2', trainer: 'Ron' }, 'rival_beaten_ron_2'],
    ['quest_done', { key: 'mq_thornwood_camp', quest: 'Ferns Over the Tent' }, 'quest_done_mq_thornwood_camp'], ['kilindex_milestone', { count: 50, key: 50 }, 'kilindex_milestone_50']];
  for (const [name, ctx, key] of later) {
    assert.ok(regionOf(L[key]) > 1, `${key} is tagged region ${regionOf(L[key])}`);
    const { cv, s } = cvWith(L, Math.random, {}, CFG_R1);
    const generic = variantsOf(L, CFG.events[name].line);
    for (let i = 0; i < 30; i++) assert.ok(generic.has(JSON.stringify(rawOf(cv.pickVariant(CFG.events[name].line, CFG.events[name].per_count_lines ? CFG.events[name].counts : [])).slice(0, CFG.timing.max_pages))));
    for (let i = 0; i < 30; i++) {
      const pages = cv.pages(name, ctx);
      for (const x of ['', '_2', '_3', '_4']) if (L[key + x]) assert.notEqual(pages[0], rawOf(L[key + x])[0].replace('{employee_id}', ritaIdOf(s)), `${key}${x} never used`);
    }
    assert.equal(s.seen[`cv#last#${key}`], undefined, key);
    assert.equal(typeof s.seen[`cv#last#${CFG.events[name].line}`], 'number', `${name}: generic family used`);
  }
  // region 1 specific keys are still used
  for (const [name, ctx, key] of [['area_new', { key: 'route1', area: 'Trail 1' }, 'area_new_route1'], ['area_new', { key: 'fernwick', area: 'Fernwick' }, 'area_new_fernwick'],
    ['master_beaten', { key: 'fernwick', master: 'Fernwick' }, 'master_beaten_fernwick'], ['rival_beaten', { key: '1', trainer: 'Ron' }, 'rival_beaten_ron_1'],
    ['quest_done', { key: 'mq_brookhollow_promotion', quest: 'Promoted (Apparently)' }, 'quest_done_mq_brookhollow_promotion'], ['kilindex_milestone', { count: 10, key: 10 }, 'kilindex_milestone_10']]) {
    assert.equal(regionOf(L[key]), 1, key);
    const { cv, s } = cvWith(L, Math.random, {}, CFG_R1); cv.pages(name, ctx);
    assert.equal(typeof s.seen[`cv#last#${key}`], 'number', `${key} used in region 1`);
  }
  // mixed tags inside one family: only the region <= maxRegion variants rotate; whole family above -> generic -> FALLBACK
  const M = { area_new_x: { pages: ['R1'], region: 1 }, area_new_x_2: { pages: ['R2'], region: 2 }, area_new_x_3: { pages: ['R1b'], region: 'region_1' } };
  const { cv: m } = cvWith(M, Math.random, {}, CFG_R1); const got = new Set(); for (let i = 0; i < 40; i++) got.add(m.pickVariant('area_new_x')[0]);
  assert.deepEqual([...got].sort(), ['R1', 'R1b']);
  const { cv: m2 } = cvWith({ area_new: { pages: ['late'], region: 3 } }, Math.random, {}, CFG_R1);
  assert.equal(m2.pages('area_new', { area: 'A' })[1], FALLBACK.area_new[1]);
  const { cv: m3 } = cvWith({ area_new: { pages: ['late'], region: 3 } }, Math.random, {}, CFG_ALL);
  assert.equal(m3.pages('area_new', { area: 'A' })[0], 'late'); // no maxRegion = whole game
});

test('maxRegion: nothing a region 1 player can trigger ever shows a line tagged region 2+ (real JSON)', () => {
  const L = REAL_LINES.system_company_voice;
  const late = new Set(Object.entries(L).filter(([k, v]) => k !== '_section' && regionOf(v) > 1).map(([, v]) => rawOf(v)[0]));
  assert.ok(late.size > 50);
  const { cv, s } = cvWith(L, Math.random, {}, CFG_R1);
  const id = ritaIdOf(s), unfill = (p) => p.split(id).join('{employee_id}');
  const ctxs = [['first_catch', {}], ['kilindex_new', { count: 3, key: 3 }], ['first_evolution', { creature: 'Rillop', new: 'Brookhorn' }], ['trainer_first_win', { trainer: 'X' }]];
  for (const m of ['brookhollow', 'route1', 'fernwick', 'thornwood', 'tidelock_road', 'greystone_entrance', 'aurelith']) ctxs.push(['area_new', { key: m, area: '{area}' }]);
  for (let n = 1; n <= 6; n++) ctxs.push(['rival_beaten', { key: String(n), trainer: '{trainer}' }]);
  for (const t of ['fernwick', 'saltmere', 'cindervale']) ctxs.push(['master_beaten', { key: t, master: '{master}' }]);
  for (const c of [5, 10, 15, 25, 50, 450]) ctxs.push(['kilindex_milestone', { key: c, count: '{count}' }]);
  for (const [name, ctx] of ctxs) for (let i = 0; i < 25; i++) { const p = unfill(cv.pages(name, ctx)[0]); assert.ok(!late.has(p), `${name} ${JSON.stringify(ctx)} -> late line: ${p}`); }
});

test('region 1 milestones: 5 / 10 / 15 fire, 25+ never (counts kept in data for later regions)', async () => {
  assert.deepEqual(CFG.events.kilindex_milestone.counts_by_region['1'], [5, 10, 15]);
  for (const c of [25, 50, 100, 150, 200, 250, 300, 350, 400, 450]) assert.ok(CFG.events.kilindex_milestone.counts.includes(c), `${c} kept for later`);
  const { s, sys, cv } = await voice({ cfg: CFG_R1 });
  assert.deepEqual(cv.milestoneCounts(), [5, 10, 15]);
  s.lines = REAL_LINES; run(s, 200);
  for (let c = 2; c <= 30; c++) { sys.kilindex.caughtCount = c; run(s, 31000); } // one new kind every 31 s (past cooldowns)
  const ms = cv.shownLog.filter((x) => x.name === 'kilindex_milestone');
  assert.equal(ms.length, 3);
  const id = ritaIdOf(s);
  ms.forEach((x, i) => assert.match(x.pages[0], [/\b5\b|\bFive\b/, /\b10\b|\bTen\b/, /\b15\b|\bFifteen\b/][i], x.pages[0])); // some versions spell the number out
  assert.equal(s.seen['cv#kilindex_milestone#25'], undefined);
  for (const c of [5, 10, 15]) assert.equal(s.seen[`cv#kilindex_milestone#${c}`], true);
  // 5 / 15: kilindex_milestone_<count> family when Text Bot has written it (region 1), else the generic family with {count} filled
  const fam = (b) => ['', '_2', '_3', '_4', '_5', '_6', '_7', '_8', '_9'].map((x) => REAL_LINES.system_company_voice[b + x]).filter((v) => v && !(CompanyVoice.lineRegion(v) > 1)).map((v) => rawOf(v)[0]);
  [[ms[0], 5], [ms[2], 15]].forEach(([x, c]) => {
    const own = fam(`kilindex_milestone_${c}`), txt = x.pages[0].split(id).join('{employee_id}');
    if (own.length) assert.ok(own.includes(txt), `${c}: per-count key expected: ${x.pages[0]}`);
    else assert.ok(fam('kilindex_milestone').includes(txt.replace(new RegExp(`\\b${c}\\b`), '{count}')), `${c}: generic expected: ${x.pages[0]}`);
  });
  assert.equal(typeof s.seen['cv#last#kilindex_milestone_10'], 'number');
  assert.ok(cv.shownLog.some((x) => x.name === 'kilindex_new')); // 2-4 = new-entry lines
  // whole-game scope still has 25
  const all = new CompanyVoice(stub().s, CFG_ALL, {}); assert.ok(all.milestoneCounts().includes(25) && all.milestoneCounts().includes(450));
  const r2 = new CompanyVoice(stub().s, { ...CFG, maxRegion: 2 }, {}); assert.deepEqual(r2.milestoneCounts(), [5, 10, 15, 25]); // region 2 build: 50 / 100 moved to region 3
});

test('region 1 quest scope: only the promotion task speaks; other quests stay silent', async () => {
  assert.deepEqual(CFG.events.quest_done.keys_by_region['1'], ['mq_brookhollow_promotion']);
  const { s, cv } = await voice({ cfg: CFG_R1 }); run(s, 200);
  for (const q of ['mq_route1_benchmark', 'mq_fernwick_hall', 'sq_bean_thief', 'mq_thornwood_camp']) { s.log.push({ type: 'flag', flag: `q_${q}_done`, on: true }); run(s, 31000); }
  assert.deepEqual(cv.state().shown, []);
  s.log.push({ type: 'flag', flag: 'q_mq_brookhollow_promotion_done', on: true }); run(s, 2000);
  assert.equal(cv.state().showing?.event, 'quest_done');
});

test('region 1 promotion line in a normal game: got_starter closes mq_brookhollow_promotion (quest prototype off)', async () => {
  assert.equal(CFG.events.quest_done.done_on_flag.got_starter, 'mq_brookhollow_promotion');
  const { s, cv } = await voice({ flags: [], cfg: CFG_R1 }); s.lines = REAL_LINES; run(s, 200);
  assert.equal(cv.started(), false);
  s.dialog.active = true; s.flags.add('got_starter'); s.log.push({ type: 'flag', flag: 'got_starter', on: true }); run(s, 5000);
  assert.equal(cv.state().showing, null); // starter scenes still talking: held
  s.dialog.active = false; run(s, 2000);
  assert.equal(cv.state().showing?.event, 'quest_done');
  assert.equal(cv.current.ctx.key, 'mq_brookhollow_promotion');
  const promo = new Set(['', '_2', '_3', '_4'].map((x) => rawOf(REAL_LINES.system_company_voice['quest_done_mq_brookhollow_promotion' + x])[0]));
  assert.ok(promo.has(cv.current.pages[0].split(ritaIdOf(s)).join('{employee_id}')), cv.current.pages[0]);
  // the prototype's own done flag later on never repeats it
  cv.hide('t'); run(s, 40000); s.log.push({ type: 'flag', flag: 'q_mq_brookhollow_promotion_done', on: true }); run(s, 3000);
  assert.equal(cv.shownLog.filter((x) => x.name === 'quest_done').length, 1);
});

test('milestone lookup: kilindex_milestone_<count> first (with its _2.._4), then the generic key; region tags respected', async () => {
  const { s, cv } = await voice(); const L = (pages, region = 1) => ({ pages, region });
  s.lines = { system_company_voice: { kilindex_milestone: L(['gen {count}']), kilindex_milestone_2: L(['gen2 {count}']), kilindex_milestone_5: L(['five a']), kilindex_milestone_5_2: L(['five b']), kilindex_milestone_15_2: L(['fifteen b']), kilindex_milestone_25: L(['tf'], 2) } };
  for (let i = 0; i < 12; i++) assert.match(cv.pages('kilindex_milestone', { key: 5, count: 5 })[0], /^five [ab]$/);
  for (let i = 0; i < 6; i++) assert.equal(cv.pages('kilindex_milestone', { key: 15, count: 15 })[0], 'fifteen b'); // only a _2 version written: still per-count
  for (let i = 0; i < 6; i++) assert.match(cv.pages('kilindex_milestone', { key: 10, count: 10 })[0], /^gen2? 10$/); // no _10 key: generic
  const r2 = new CompanyVoice(s, { ...CFG, maxRegion: 1 }, {}); for (let i = 0; i < 6; i++) assert.match(r2.pages('kilindex_milestone', { key: 25, count: 25 })[0], /^gen2? 25$/); // region 2 key skipped
});

test('real JSON: Kilindex 5 and 15 resolve to kilindex_milestone_5 / _15 (all 4 versions, region 1); 25 is region 2', async () => {
  const L = REAL_LINES.system_company_voice;
  for (const c of [5, 15]) {
    const fam = ['', '_2', '_3', '_4'].map((x) => L[`kilindex_milestone_${c}${x}`]);
    fam.forEach((v, i) => { assert.ok(v, `kilindex_milestone_${c}${['', '_2', '_3', '_4'][i]} exists`); assert.equal(CompanyVoice.lineRegion(v), 1); });
    const want = new Set(fam.map((v) => rawOf(v)[0]));
    const { s, cv } = await voice(); s.lines = REAL_LINES; const id = ritaIdOf(s), got = new Set();
    for (let i = 0; i < 40; i++) { const p = cv.pages('kilindex_milestone', { key: c, count: c })[0].split(id).join('{employee_id}'); assert.ok(want.has(p), `${c}: ${p}`); got.add(p); }
    assert.equal(got.size, 4, `${c}: all 4 versions rotate`);
  }
  assert.equal(CompanyVoice.lineRegion(L.kilindex_milestone_25), 2);
  const { s, cv } = await voice({ cfg: CFG_R1 }); s.lines = REAL_LINES;
  assert.ok(!cv.milestoneCounts().includes(25));
  for (let i = 0; i < 20; i++) assert.doesNotMatch(cv.pages('kilindex_milestone', { key: 25, count: 25 })[0], /cover page|officially noticeable|Accounting noticed|Asset value is climbing/); // never the region 2 text
});

test('RITA portrait: square face crop exists (Gary 1:41 PM CT: a woman, red dress, brown hair)', () => {
  const portrait = CFG.speaker.portrait;
  assert.match(portrait, /rita_face_128\.png$/);
  assert.ok(fs.existsSync(new URL('../' + portrait, import.meta.url)), portrait);
  assert.ok(fs.existsSync(new URL('../' + CFG.speaker.portrait_full, import.meta.url)), CFG.speaker.portrait_full);
});

// ---- music duck while RITA talks (Oct 23 2026, coder; Gary 1:41 PM CT: "music should turn down to let her talk") -------
import { mountAudio, createMusicDuck, musicTarget, DUCK_DEFAULTS } from '../src/audio/audio.js';

/** howler stand-in: records the music howls; fade() lands on its end value at once (enough for volume bookkeeping). */
function fakeHowler() {
  const howls = [];
  const ctx = { state: 'running', sampleRate: 44100, destination: {}, createBuffer: () => ({}), createBufferSource: () => ({ connect() {}, start() {} }), createGain: () => ({ gain: { value: 1 }, connect() {} }), resume: async () => {}, suspend: async () => {} };
  const Howler = { ctx, masterGain: {}, _v: 1, _m: false, autoSuspend: true, volume(v) { if (v === undefined) return this._v; this._v = v; return this; }, mute(m) { this._m = m; return this; } };
  class Howl { constructor(o) { this.o = o; this.v = o.volume ?? 1; this.fades = []; this.unloaded = false; if (o.loop) howls.push(this); }
    play() { return 1; } volume(v) { if (v === undefined) return this.v; this.v = v; return this; } fade(from, to, ms) { this.v = to; this.fades.push([from, to, ms]); return this; } unload() { this.unloaded = true; } }
  return { Howler, Howl, howls };
}
const fakeWin = () => ({ addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false }) });
const fakeDoc = () => ({ addEventListener() {}, querySelector: () => null, hidden: false });
async function audioRig({ music = 0.4, muted = false } = {}) {
  const hw = fakeHowler();
  const a = await mountAudio({ profile: { audio: { music, muted, master: 0.8, sfx: 0.55, crossfadeMs: 1200 } }, platformId: 'pc', storage: memStorage(), win: fakeWin(), doc: fakeDoc(), howler: hw });
  a.unlock(); a.music('route.day');
  return { a, hw, cur: () => hw.howls.at(-1) };
}
const near = (x, y) => assert.ok(Math.abs(x - y) < 1e-9, `${x} != ${y}`);

test('duck data: music 0.35, fade in 250 ms, out 600 ms, fallback 20 s (Gary 1:41 PM CT)', () => {
  assert.deepEqual({ music: CFG.duck.music, fadeInMs: CFG.duck.fadeInMs, fadeOutMs: CFG.duck.fadeOutMs, maxMs: CFG.duck.maxMs }, { music: 0.35, fadeInMs: 250, fadeOutMs: 600, maxMs: 20000 });
  assert.deepEqual(DUCK_DEFAULTS, { level: 0.35, fadeInMs: 250, fadeOutMs: 600, maxMs: 20000 });
  near(musicTarget({ music: 0.4 }, 0.35), 0.14); near(musicTarget({ music: 0.4 }), 0.4);
});

test('duck: reference counted, lowest level wins, music returns only when every holder lets go', () => {
  const calls = [], timers = [];
  const d = createMusicDuck({ onChange: (f, ms) => calls.push([f, ms]), setTimer: (fn, ms) => (timers.push({ fn, ms }), timers.length), clearTimer: () => {} });
  assert.equal(d.factor(), 1);
  assert.ok(d.duck('a', 0.5, 100)); assert.equal(d.factor(), 0.5);
  assert.ok(d.duck('b', 0.3, 100)); assert.equal(d.factor(), 0.3);
  assert.ok(d.duck('a', 0.5, 100)); // second hold on a
  d.unduck('b', 600); assert.equal(d.factor(), 0.5);
  d.unduck('a', 600); assert.equal(d.factor(), 0.5, 'a still held once');
  d.unduck('a', 600); assert.equal(d.factor(), 1);
  assert.equal(d.unduck('nobody'), 0); assert.equal(d.factor(), 1);
  assert.deepEqual(calls, [[0.5, 100], [0.3, 100], [0.5, 600], [1, 600]]); // no change = no fade
  // all = every hold of the id; clear() = safety drop of everything
  d.duck('a', 0.4); d.duck('a', 0.4); d.unduck('a', 600, true); assert.equal(d.factor(), 1);
  d.duck('a', 0.4); d.duck('b', 0.2); d.clear(); assert.equal(d.factor(), 1); assert.deepEqual(d.state().holds, {});
  // max-duration fallback releases a holder that never lets go
  d.duck('stuck', 0.2, 0, 5000); assert.equal(d.factor(), 0.2);
  const t = timers.at(-1); assert.equal(t.ms, 5000); t.fn(); assert.equal(d.factor(), 1);
});

test('audio.duck scales only the music, multiplies (never overwrites) the user volume, survives crossfade + volume change', async () => {
  const { a, hw, cur } = await audioRig();
  near(cur().v, 0.4);
  assert.ok(a.duck('company_voice', 0.35, 250));
  near(cur().v, 0.14); near(cur().fades.at(-1)[1], 0.14); assert.equal(cur().fades.at(-1)[2], 250);
  assert.equal(a.settings.music, 0.4, 'user setting untouched'); assert.equal(a.settings.sfx, 0.55); assert.equal(a.settings.master, 0.8); assert.equal(hw.Howler._v, 0.8);
  // the player moves the music slider while ducked: stays ducked relative to the new value
  a.setVolume('music', 0.6); near(cur().v, 0.6 * 0.35); assert.equal(a.settings.music, 0.6);
  // a track change while ducked: the new track crossfades in to the ducked level, the old one still fades to 0
  const old = cur(); a.music('home');
  assert.notEqual(cur(), old); near(cur().v, 0.21); assert.deepEqual(old.fades.at(-1).slice(1), [0, 1200]);
  // overlapping holder
  assert.ok(a.duck('other', 0.5, 0)); near(cur().v, 0.21);
  a.unduck('company_voice', 600); near(cur().v, 0.3);
  a.unduck('other', 600); near(cur().v, 0.6); assert.equal(a.duckFactor, 1);
  assert.deepEqual(a.state().duck, { factor: 1, holds: {} });
});

test('audio.duck is a no-op while muted, at music 0 or before unlock', async () => {
  const m = await audioRig({ muted: true });
  assert.equal(m.a.duck('company_voice', 0.35, 250), false); near(m.cur().v, 0.4); assert.equal(m.a.duckFactor, 1);
  const z = await audioRig({ music: 0 });
  assert.equal(z.a.duck('company_voice', 0.35, 250), false); assert.equal(z.a.duckFactor, 1);
  const hw = fakeHowler();
  const locked = await mountAudio({ profile: {}, platformId: 'pc', storage: memStorage(), win: fakeWin(), doc: fakeDoc(), howler: hw });
  assert.equal(locked.duck('company_voice'), false);
  // muted mid-duck: the release still works (never stuck once unmuted)
  const r = await audioRig(); r.a.duck('company_voice', 0.35, 0); r.a.setMuted(true); r.a.unduck('company_voice', 0); r.a.setMuted(false); near(r.cur().v, 0.4);
});

test('RITA strip ducks while up and restores the user volume on done / skip / interrupt / mode off / scene change / max', async () => {
  const rig = await audioRig();
  const show = async () => {
    const v = await voice(); v.s.audio = rig.a;
    v.sys.applyBattleResult({ outcome: 'caught', caught: { species: 'rillop' } }); run(v.s, 2000);
    assert.equal(v.cv.state().showing?.event, 'first_catch'); assert.equal(v.cv.state().ducked, true);
    near(rig.cur().v, 0.4 * 0.35);
    return v;
  };
  const restored = (v, why) => { assert.equal(v.cv.state().ducked, false, why); near(rig.cur().v, 0.4); assert.equal(rig.a.duckFactor, 1, why); assert.deepEqual(rig.a.state().duck.holds, {}, why); };
  // auto-hide on the timer (both pages), with the 600 ms fade out
  let v = await show(); run(v.s, 15000); assert.equal(v.cv.current, null); restored(v, 'timer'); assert.deepEqual(rig.cur().fades.at(-1).slice(1), [0.4, 600]);
  // page advance keeps the duck; skip (A) twice hides
  v = await show(); v.cv.advance('a'); assert.equal(v.cv.state().ducked, true); v.cv.advance('a'); restored(v, 'skip');
  // tap dismiss on the last page path is the same advance(); interrupted by dialogue / battle UI / a cutscene
  for (const block of [(s) => { s.dialog.active = true; }, (s) => { s.busy = true; }]) { v = await show(); block(v.s); run(v.s, 200); assert.match(v.cv.lastHideWhy, /^interrupted:/); restored(v, v.cv.lastHideWhy); }
  const ui = { active: false }; v = await voice({ ui }); v.s.audio = rig.a; v.sys.applyBattleResult({ outcome: 'caught', caught: { species: 'rillop' } }); run(v.s, 2000);
  assert.equal(v.cv.state().ducked, true); ui.active = true; run(v.s, 200); assert.equal(v.cv.lastHideWhy, 'interrupted:ui'); restored(v, 'battle ui');
  // dropped: mode off
  v = await show(); v.cv.setMode('off'); restored(v, 'mode off');
  // scene change (warpStart) releases at once even if the strip had not hidden yet
  v = await show(); v.s.log.push({ type: 'warpStart', kind: 'door', from: 'route1' }); restored(v, 'scene'); assert.equal(v.cv.lastUnduckWhy, 'scene');
  // max-duration fallback (game clock): a strip that somehow stays up never holds the music low past maxMs
  v = await show(); v.cv.current.pageEnd = Infinity; run(v.s, CFG.duck.maxMs + 200); assert.ok(v.cv.current); restored(v, 'max'); assert.equal(v.cv.lastUnduckWhy, 'max');
  // no audio mounted / ?audio=0: nothing breaks
  const n = await voice(); n.sys.applyBattleResult({ outcome: 'caught', caught: { species: 'rillop' } }); run(n.s, 2000); assert.equal(n.cv.state().ducked, false); run(n.s, 15000); assert.equal(n.cv.current, null);
});

test('RITA strip while muted: no duck, nothing held', async () => {
  const rig = await audioRig({ muted: true });
  const v = await voice(); v.s.audio = rig.a;
  v.sys.applyBattleResult({ outcome: 'caught', caught: { species: 'rillop' } }); run(v.s, 2000);
  assert.ok(v.cv.current); assert.equal(v.cv.state().ducked, false); near(rig.cur().v, 0.4); assert.equal(rig.a.duckFactor, 1);
  run(v.s, 15000); near(rig.cur().v, 0.4);
});

test('Trainer 1 (Gary 3:31 PM CT): very first RITA strip reads the number, renames, then the line; once only; saved after it closes', async () => {
  const { s, cv, storage } = await voice();
  s.seen = {}; // new save (or an old one that met RITA before the intro existed)
  const id = employeeIdOf(s);
  assert.equal(ritaIdOf(s), id);
  s.systems.applyBattleResult({ outcome: 'caught', caught: { species: 'rillop' } });
  run(s, 2000);
  assert.deepEqual(cv.current.pages.slice(0, 3), [`${id}...`, TRAINER1_INTRO[1], 'Good job Trainer 1! First asset acquired.']);
  assert.equal(cv.current.voice.key, 'rita_trainer1'); assert.equal(cv.current.voice.n, 2); assert.equal(cv.current.voice.vars.employee_id, id);
  assert.equal(JSON.parse(storage.getItem(SAVE_KEY) || '{"seen":{}}').seen?.[TRAINER1_KEY], undefined, 'no save while the strip is up');
  run(s, 40000); assert.equal(cv.current, null);
  assert.equal(JSON.parse(storage.getItem(SAVE_KEY)).seen[TRAINER1_KEY], true, 'flag saved after it closes');
  assert.equal(ritaIdOf(s), 'Trainer 1'); assert.equal(s.store.extra.company.employeeId || id, id, 'real number kept');
  s.systems.applyBattleResult({ outcome: 'caught', caught: { species: 'peeplark' } }); // later strips: no intro
  cv.emit('kilindex_new', { count: 2 }); run(s, 2000);
  if (cv.current) { assert.notEqual(cv.current.voice?.key, 'rita_trainer1'); assert.doesNotMatch(cv.current.pages.join(' '), new RegExp(id)); }
});

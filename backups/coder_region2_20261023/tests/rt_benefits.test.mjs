// RT Employee Benefits (company XP skill tree, phone tab; Oct 23 2026, coder; Gary 1:01-1:02 PM CT: "the job board is the skill
// tree ui for leveling up company xp", "RT Employee Benifits", "build into region one on the phone").
// src/systems/rt_benefits.js + data/rt_benefits.json, UI src/ui/rt_benefits_screen.js. Browser smoke: tests/rt_benefits_shots.mjs.
// Run: node --test tests/rt_benefits.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Overworld } from '../src/overworld/overworld.js';
import { SaveStore, freshSave, SAVE_VERSION, SAVE_KEY } from '../src/overworld/save.js';
import * as V1 from './fixtures/save_v1.mjs';
import { RtBenefits, attachRtBenefits, COMPANY_DEFAULTS, levelForXp, xpToReach, nodeState, regionCap } from '../src/systems/rt_benefits.js';
import { RTB_TEXT } from '../src/ui/rt_benefits_screen.js';

const DATA = JSON.parse(fs.readFileSync(new URL('../data/rt_benefits.json', import.meta.url)));
const memStorage = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const P = Overworld.prototype;

/** Scene stub with the REAL save lock / save path (Overworld.prototype) + a real SaveStore; saveData carries the systems blocks like overworld.saveData(). */
function stub({ storage = memStorage(), caught = 1, region } = {}) {
  const store = new SaveStore(storage);
  const loaded = store.load();
  const sys = {
    kilindex: { caughtCount: caught }, company: loaded?.company || { idLevel: 1, board: {} }, // as Systems: sv.company || {...}
    wallet: { coins: 0, add(n) { this.coins += n; } },
    applyBattleResult: (r) => r, awardBattleMoney: () => ({ amount: 100, vars: { total: '₭100' } }),
    saveBlocks() { return {}; },
  };
  const s = {
    flags: new Set(loaded?.flags || []), log: [], busy: false, fade: null, dialog: { active: false }, tick: 0, store, systems: sys,
    _saveLocks: new Map(), saveGuards: [], _dirty: false, saves: 0, map: null, player: {}, intro: null,
    saveData() { return { flags: [...this.flags], ...this.systems.saveBlocks() }; },
    step() { this.tick++; if (this._dirty && !this.busy && !this.fade) this.saveNow(); },
  };
  for (const k of ['saveLockReason', 'lockSave', 'checkpoint', 'saveNow']) s[k] = P[k].bind(s);
  Object.defineProperty(s, 'saveLocked', { get: () => !!s.saveLockReason() });
  const save = s.saveNow; s.saveNow = () => { const ok = save(); if (ok) s.saves++; return ok; };
  const rt = attachRtBenefits(s, sys, { data: DATA, region });
  return { s, sys, rt, store, storage };
}
const setFlag = (s, flag) => { s.flags.add(flag); s.log.push({ tick: s.tick, type: 'flag', flag, on: true }); };
const catchOne = (t) => { t.sys.applyBattleResult({ outcome: 'caught', caught: { species: 'x' } }); t.sys.kilindex.caughtCount++; t.s.step(); };

test('data: region 1, curve, sources, 4 branches, every node has ranks + names; no blocked words', () => {
  assert.equal(DATA.region, 1);
  assert.equal(regionCap(DATA, 1), 4);
  assert.deepEqual(DATA.branches.map((b) => b.id), ['field_logistics', 'supply_pay', 'crystal_lab', 'unit_performance']);
  for (const n of DATA.nodes) { assert.ok(n.ranks.length >= 1, n.id); assert.ok(RTB_TEXT.nodes[n.id]?.name, n.id); for (let r = 1; r <= n.ranks.length; r++) assert.ok(RTB_TEXT.nodes[n.id].ranks[r], `${n.id} ${r}`); }
  assert.equal(DATA.respec.supported, false);
  const all = JSON.stringify(DATA) + JSON.stringify(RTB_TEXT) + fs.readFileSync(new URL('../data/textbot_requests_rt_benefits.md', import.meta.url), 'utf8').split('\n').filter((l) => !l.startsWith('Blocked words:')).join('\n');
  for (const bad of [/\bPP\b/, /shiny/i, /super effective/i, /Pok[eé]dex/i, /Pok[eé] Ball/i, /Gotcha!/, /\bnurse/i, /\bweed/i, /\broutes?\b/i, /\bthrow/i, /Blue Bucks/i]) assert.doesNotMatch(all, bad);
  assert.equal(RTB_TEXT.labels.tab_title, 'RT Employee Benefits');
});

test('curve: levels from XP, region 1 cap at ID 4', () => {
  assert.equal(xpToReach(DATA, 1), 0); assert.equal(xpToReach(DATA, 2), 100); assert.equal(xpToReach(DATA, 4), 550);
  assert.equal(levelForXp(DATA, 0, 1), 1); assert.equal(levelForXp(DATA, 99, 1), 1); assert.equal(levelForXp(DATA, 100, 1), 2);
  assert.equal(levelForXp(DATA, 470, 1), 3); assert.equal(levelForXp(DATA, 99999, 1), 4);
  assert.ok(levelForXp(DATA, 99999, 2) > 4);
});

test('XP awards: each source once, from the same events RITA reads (flags, battle log, catch, Kilindex)', () => {
  const t = stub(); const co = t.rt.company;
  t.s.step(); assert.equal(co.xp, 0, 'first look = Kilindex baseline only');
  catchOne(t); assert.equal(co.xp, 30 + 10, 'first catch 30 + new log 10');
  catchOne(t); assert.equal(co.xp, 50, 'second catch: log only');
  setFlag(t.s, 'got_starter'); assert.equal(co.xp, 90, 'promotion (got_starter alias) 40');
  setFlag(t.s, 'q_mq_brookhollow_promotion_done'); assert.equal(co.xp, 90, 'same quest claim once');
  t.s.log.push({ tick: 1, type: 'battle', npc: 'trainer_a', won: true }); assert.equal(co.xp, 110, 'first trainer win 20');
  t.s.log.push({ tick: 2, type: 'battle', npc: 'trainer_b', won: true }); assert.equal(co.xp, 110, 'once');
  t.s.log.push({ tick: 3, type: 'battle', npc: 'trainer_c', won: false }); assert.equal(co.xp, 110);
  setFlag(t.s, 'beat_rival_ron_1'); assert.equal(co.xp, 150, 'Ron 1: 40');
  setFlag(t.s, 'beat_rival_ron_1'); assert.equal(co.xp, 150);
  setFlag(t.s, 'beat_master_fernwick'); assert.equal(co.xp, 230, 'Master Fernwick 80');
  // milestones at 5 Kilindex logs
  for (let i = 0; i < 2; i++) catchOne(t);
  assert.equal(t.sys.kilindex.caughtCount, 5); assert.equal(co.xp, 230 + 20 + 20, 'two logs + milestone 5');
  assert.ok(t.s.log.some((e) => e.type === 'companyXp' && e.src === 'master_beaten'));
  // creature XP data untouched
  const cfg = fs.readFileSync(new URL('../src/config.js', import.meta.url), 'utf8');
  if (/xpDivisor/.test(cfg)) { assert.match(cfg, /xpDivisor:\s*7\b/); assert.match(cfg, /xpTrainerMult:\s*1\.5\b/); }
});

test('expected normal region 1 run: 470 XP -> ID 3, 2 points; with all main quests 550 -> ID 4 (cap), 3 points', () => {
  const t = stub({ caught: 0 }); const co = t.rt.company; t.s.step(); // new game: Kilindex baseline 0 at the first step
  t.sys.kilindex.caughtCount++; setFlag(t.s, 'got_starter'); t.s.step(); // the starter is Kilindex log 1 (+10, no first-catch bonus)
  assert.equal(co.xp, 50);
  for (let i = 0; i < 16; i++) catchOne(t); // 16 wild catches -> 17 Kilindex logs
  t.s.log.push({ type: 'battle', npc: 'trainer_a', won: true });
  setFlag(t.s, 'beat_rival_ron_1'); setFlag(t.s, 'beat_master_fernwick');
  assert.equal(co.xp, 170 + 30 + 90 + 40 + 20 + 40 + 80);
  assert.equal(co.xp, 470); assert.equal(co.idLevel, 3); assert.equal(co.pointsFree, 2);
  setFlag(t.s, 'q_mq_route1_benchmark_done'); setFlag(t.s, 'q_mq_fernwick_hall_done');
  assert.equal(co.xp, 550); assert.equal(co.idLevel, 4); assert.equal(co.pointsFree, 3);
  setFlag(t.s, 'beat_rival_ron_2'); assert.equal(co.xp, 550, 'capped at the region 1 cap (ID 4)'); assert.equal(co.idLevel, 4);
  assert.equal(t.rt.progress().capped, true);
});

test('level ups: points per level, events fire, idLevel never drops', () => {
  const t = stub(); const ev = []; t.rt.on((e) => ev.push(e.type));
  t.rt.award('kilindex_new', 1, 0); assert.equal(t.rt.company.idLevel, 1);
  t.rt.award('main_quest', 'a', 100); assert.equal(t.rt.company.idLevel, 2); assert.equal(t.rt.company.pointsFree, 1);
  t.rt.award('main_quest', 'b', 450); assert.equal(t.rt.company.idLevel, 4); assert.equal(t.rt.company.pointsFree, 3);
  assert.ok(ev.includes('level') && ev.includes('xp'));
  t.rt.company.xp = 0; t.rt.syncLevel(); assert.equal(t.rt.company.idLevel, 4);
});

test('spending: buy deducts points, raises rank, needs ID + points, saves from the menu', () => {
  const t = stub(); const co = t.rt.company;
  assert.equal(t.rt.state('store_discount').state, 'locked'); assert.equal(t.rt.state('store_discount').reason, 'points');
  assert.deepEqual(t.rt.buy('store_discount'), { ok: false, reason: 'points' });
  t.rt.award('main_quest', 'x', 100); // ID 2, 1 point
  assert.equal(t.rt.state('store_discount').state, 'available');
  const saves = t.s.saves; const r = t.rt.buy('store_discount');
  assert.equal(r.ok, true); assert.equal(r.rank, 1); assert.equal(r.saved, true); assert.equal(t.s.saves, saves + 1);
  assert.equal(co.board.store_discount, 1); assert.equal(co.pointsFree, 0); assert.equal(t.rt.effect('store_discount'), 0.03);
  assert.equal(t.rt.state('store_discount').state, 'owned', 'rank 1 is the region 1 max');
  t.rt.award('main_quest', 'y', 200); // ID 3, 1 point
  assert.equal(t.rt.state('rt_payout').state, 'available');
  t.rt.buy('rt_payout'); assert.equal(t.rt.effect('rt_payout'), 0.10);
  assert.equal(t.rt.state('rt_payout').reason, 'points');
  t.rt.award('main_quest', 'z', 300); // ID 4
  assert.equal(t.rt.buy('rt_payout').rank, 2); assert.equal(t.rt.state('rt_payout').state, 'owned');
  assert.equal(t.rt.state('rt_payout').reason, 'region');
  // ID gate: a fresh save with a point but ID 1
  const u = stub(); u.rt.company.pointsFree = 1;
  assert.equal(u.rt.state('rt_payout').reason, 'id'); assert.equal(u.rt.buy('rt_payout').ok, false);
  assert.equal(t.rt.respec().ok, false);
});

test('region lock: copay / crystal / training are Region 2; region 2 opens them; save carries over', () => {
  const t = stub(); t.rt.company.pointsFree = 9; t.rt.company.idLevel = 4;
  for (const id of ['copay_coverage', 'crystal_grade', 'unit_training']) {
    const s = t.rt.state(id); assert.equal(s.state, 'locked', id); assert.equal(s.reason, 'region', id); assert.equal(s.unlockRegion, 2, id);
    assert.equal(t.rt.buy(id).ok, false);
  }
  const s2 = nodeState(DATA, { ...COMPANY_DEFAULTS(), idLevel: 15, pointsFree: 9, board: {} }, DATA.nodes.find((n) => n.id === 'crystal_grade'), 2);
  assert.equal(s2.state, 'available');
  const r2 = stub({ region: 2 }); r2.rt.company.idLevel = 5; r2.rt.company.pointsFree = 2;
  assert.equal(r2.rt.state('unit_training').state, 'available');
});

test('persistence: company XP / ranks ride in the save and load back', () => {
  const storage = memStorage(); const t = stub({ storage });
  t.rt.award('main_quest', 'x', 300); t.rt.buy('store_discount');
  const back = new SaveStore(storage).load();
  assert.equal(back.v, SAVE_VERSION); assert.equal(SAVE_VERSION, 2);
  assert.equal(back.company.xp, 300); assert.equal(back.company.board.store_discount, 1); assert.equal(back.company.idLevel, 3); assert.equal(back.company.pointsFree, 1);
  assert.match(back.company.employeeId, /^\d{6}$/, 'employee ID kept');
  const u = stub({ storage }); // reload: same object values, no double award
  assert.equal(u.rt.company.xp, 300); assert.equal(u.rt.company.board.store_discount, 1); assert.equal(u.rt.state('store_discount').state, 'owned');
});

test('old saves load with zeros: v1 fixture and a v2 save from before RT Employee Benefits', () => {
  const st1 = memStorage(); new V1.SaveStore(st1).save({ ...V1.freshSave(), flags: ['got_starter'] });
  const a = new SaveStore(st1).load();
  assert.equal(a.company.xp, 0); assert.deepEqual(a.company.xpClaims, {}); assert.equal(a.company.idLevel, 1); assert.equal(a.company.pointsFree, 0);
  const st2 = memStorage(); const f = freshSave(); delete f.company.xp; delete f.company.xpClaims;
  st2.setItem(SAVE_KEY, JSON.stringify({ ...f, flags: ['got_starter'], v: 2 }));
  const b = new SaveStore(st2).load();
  assert.equal(b.company.xp, 0); assert.deepEqual(b.company.xpClaims, {});
  // an old save that already holds Kilindex logs: no retro XP flood, no first-catch bonus later
  const t = stub({ storage: st2, caught: 9 }); t.s.step();
  assert.equal(t.rt.company.xp, 0); assert.equal(t.rt.company.xpClaims.first_catch, 1);
  catchOne(t); assert.equal(t.rt.company.xp, 10 + 30, 'log 10 + milestone 10');
});

test('no save mid battle / dialogue: XP and buys stay dirty while locked, saved once the lock lifts', () => {
  const storage = memStorage(); const t = stub({ storage }); t.s.step();
  let battle = true; t.s.saveGuards.push(() => (battle ? 'battle' : null));
  const writes = () => storage.getItem(SAVE_KEY);
  const before = writes();
  catchOne(t); // catch inside the battle
  assert.equal(t.rt.company.xp, 40); assert.equal(writes(), before, 'nothing written mid battle');
  assert.equal(t.s._dirty, true);
  t.rt.award('main_quest', 'x', 100);
  const r = t.rt.buy('store_discount'); assert.equal(r.ok, true); assert.equal(r.saved, false, 'buy refused to save while locked');
  assert.equal(writes(), before);
  t.s.dialog.active = true; battle = false; t.s.step(); assert.equal(writes(), before, 'dialogue also blocks');
  t.s.dialog.active = false; t.s.step();
  const back = new SaveStore(storage).load(); assert.equal(back.company.xp, 140); assert.equal(back.company.board.store_discount, 1);
});

test('payout effect: Field Bonus adds % to trainer prize money (shop / shops.json untouched)', () => {
  const t = stub(); assert.equal(t.sys.awardBattleMoney({}).amount, 100);
  t.rt.company.board.rt_payout = 1;
  const r = t.sys.awardBattleMoney({}); assert.equal(r.amount, 110); assert.equal(r.bonus, 10); assert.equal(t.sys.wallet.coins, 10); assert.match(r.vars.total, /110/);
});

test('flag / wiring: ?rtb=0 off; Node without data = null; systems index hooks it; phone tile appended last', () => {
  const s = { log: [], systems: {} }; s.systems.saveBlocks = () => ({});
  assert.equal(attachRtBenefits(s, s.systems, { data: DATA, config: new URLSearchParams('rtb=0') }), null);
  assert.equal(attachRtBenefits(s, s.systems, {}), null);
  assert.equal(s.systems.rtBenefits, undefined);
  assert.ok(new RtBenefits({}, { company: {} }, DATA).company.xpClaims);
  const idx = fs.readFileSync(new URL('../src/systems/index.js', import.meta.url), 'utf8'); assert.match(idx, /attachRtBenefits\(scene, sys/);
  const ui = fs.readFileSync(new URL('../src/ui/ui.js', import.meta.url), 'utf8');
  const apps = ui.slice(ui.indexOf('scr_phone()'), ui.indexOf('const COLS', ui.indexOf('scr_phone()')));
  const order = [...apps.matchAll(/\['(\w+)', L\./g)].map((m) => m[1]);
  assert.deepEqual(order.slice(-3), ['save', 'options', 'rt_benefits']);
});

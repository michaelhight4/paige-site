// Region 2 (Saltmere through Master 2), coder Oct 23 2026. Run: node --test tests/region2.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { authoredTeam, TRAINER_TEAMS } from '../src/battle/data/trainer_teams.js';
import { evoTable } from '../src/systems/evolution.js';
import { TRIGGER, wipDue, WIP_FLAG } from '../src/systems/wip_notice.js';
import { giftFor } from '../src/systems/npc_gifts.js';
import { regionForFlags, regionCap, levelForXp, regionMaxRank, nodeState, isHallTrainer, attachRtBenefits } from '../src/systems/rt_benefits.js';
import { copayFor, healPoint } from '../src/systems/heal.js';
import { loadShopsData, getShops, stockFor } from '../src/systems/shop.js';

const J = (p) => JSON.parse(fs.readFileSync(new URL('../' + p, import.meta.url)));
const RT = J('data/rt_benefits.json'), CV = J('data/company_voice.json'), MASTERS = J('data/masters.json');
const map = (n) => J(`art/world/overworld/maps/${n}.json`);
const S = (sp) => [{ species: sp, origin: { how: 'starter' } }];
await loadShopsData();

test('region 2: no trainer creature below its evolution level (every authored team)', () => {
  const evoAt = Object.fromEntries(Object.values(evoTable()).map((e) => [e.to, e.level]));
  for (const [k, e] of Object.entries(TRAINER_TEAMS)) for (const f of Array.isArray(e) ? e : Object.values(e.byStarter).flat())
    assert.ok(!(evoAt[f.species] > f.level), `${k}: ${f.species} L${f.level} < evo ${evoAt[f.species]}`);
});

test('Master 2: team matches masters.json, prize = base x ace, helpers below the ace', () => {
  const h = MASTERS.halls.find((x) => x.zone === 'saltmere');
  const m = authoredTeam({ map: 'saltmere_hall_int', id: 'saltmere_hall_int_master' }, S('nibbin'));
  assert.deepEqual(m.map((f) => [f.species, f.level]), h.master.team.map((f) => [f.species, f.level]));
  assert.equal(h.master.ace_level, Math.max(...m.map((f) => f.level)));
  assert.equal(h.master.prize_placeholder, h.master.base * h.master.ace_level);
  assert.equal(h.flag, TRIGGER);
  for (const id of ['h1', 'h2', 'h3']) assert.ok(authoredTeam({ map: 'saltmere_hall_int', id: `saltmere_hall_int_${id}` }, []).every((f) => f.level >= 19 && f.level <= h.master.ace_level - 2), id);
  for (const [st, want] of [['nibbin', 'emberlunx'], ['cindrip', 'brookhorn'], ['rillop', 'gnawford'], ['tumbloam', 'emberlunx']])
    assert.ok(authoredTeam({ map: 'saltmere', id: 'saltmere_ron_2' }, S(st)).some((f) => f.species === want), `Ron 2 vs ${st}`);
});

test('no region gating: only the story gates on region 2 maps', () => {
  const gates = ['brookhollow', 'route_east', 'aurelith', 'route_aurelith_saltmere', 'saltmere', 'saltmere_hall_int', 'thornwood', 'fernwick']
    .flatMap((n) => (map(n).story_gates || []).map((g) => `${g.id}:${g.flag}`)).sort();
  assert.deepEqual(gates, ['gate_aurelith_arena:all_badges', 'gate_brookhollow_east:beat_master_fernwick', 'gate_thornwood_east:beat_master_saltmere']);
  const sm = map('saltmere'); assert.ok(sm.warps.some((w) => w.to === 'saltmere_hall_int') && sm.warps.some((w) => w.to === 'saltmere_office_int'));
  for (const [m, ids] of [['station_int', ['station_clerk', 'station_traveller']], ['home_saltmere_a', ['home_saltmere_a_hobbyist']], ['thornwood', ['thornwood_c_gardener', 'thornwood_d_kid', 'thornwood_e_researcher']]]) {
    const d = map(m); for (const id of ids) assert.ok(d.npcs.some((n) => n.id === id), `${m}.${id} live`);
  }
});

test('RT Benefits region 2: region from flags, cap 6, unlocked nodes, region 1 unchanged', () => {
  assert.equal(regionForFlags(RT, new Set()), 1); assert.equal(regionForFlags(RT, new Set(['beat_master_fernwick'])), 2);
  assert.equal(regionCap(RT, 1), 4); assert.ok([6, 7].includes(regionCap(RT, 2)));
  assert.equal(levelForXp(RT, 470, 1), 3); assert.equal(levelForXp(RT, 550, 1), 4); assert.equal(levelForXp(RT, 5000, 1), 4);
  for (const id of ['copay_coverage', 'crystal_grade', 'unit_training', 'asset_logging_bonus', 'hall_hazard_pay']) {
    const n = RT.nodes.find((x) => x.id === id); assert.ok(n, id); assert.equal(regionMaxRank(n, 1), 0, id); assert.ok(regionMaxRank(n, 2) >= 1, id);
  }
  const n = RT.nodes.find((x) => x.id === 'hall_hazard_pay');
  assert.equal(nodeState(RT, { idLevel: 5, pointsFree: 3, board: {} }, n, 2).state, 'available');
  assert.equal(nodeState(RT, { idLevel: 5, pointsFree: 3, board: {} }, n, 1).state, 'locked');
  assert.ok(isHallTrainer({ id: 'saltmere_hall_int.saltmere_hall_int_h1' }) && isHallTrainer({ class: 'master' }) && !isHallTrainer({ id: 'route_east.route_east_trainer_1' }));
  const pt = healPoint({ id: 'heal_brookhollow', ...getShops().branches.heal_brookhollow });
  const full = copayFor(pt, 100000).fee; assert.ok(full > 0); assert.equal(copayFor(pt, 100000, getShops(), 0.25).fee, Math.round(full * 0.75));
  assert.ok(stockFor('saltmere', 2, {}, getShops(), { board: { crystal_grade: 1 } }).includes('fine_crystal'));
  assert.ok(!stockFor('brookhollow', 1, {}, getShops(), { board: { crystal_grade: 1 } }).includes('fine_crystal'));
});

test('RT Benefits region 2 live: Master 1 opens region 2, Ron 2 / Master 2 pay, log bonus + hall pay', () => {
  const flags = new Set(), log = [], sys = { kilindex: { caughtCount: 1 }, company: { idLevel: 1, board: {} }, wallet: { coins: 0, add(n) { this.coins += n; } },
    applyBattleResult: (r) => r, awardBattleMoney: () => ({ amount: 1000, vars: {} }), saveBlocks: () => ({}) };
  const s = { flags, log, systems: sys, tick: 0, step() { this.tick++; }, checkpoint() {}, saveNow() { return true; }, lockSave() { return () => {}; } };
  const rt = attachRtBenefits(s, sys, { data: RT }); s.step();
  const set = (f) => { flags.add(f); log.push({ type: 'flag', flag: f, on: true }); s.step(); };
  assert.equal(rt.region, 1); set('beat_master_fernwick'); assert.equal(rt.region, 2); assert.equal(rt.cap(), regionCap(RT, 2));
  const x0 = rt.company.xp; set('beat_rival_ron_2'); assert.equal(rt.company.xp - x0, 70); const x1 = rt.company.xp; set('beat_master_saltmere'); assert.ok(rt.company.xp - x1 >= 150);
  rt.company.idLevel = 5; rt.company.pointsFree = 5;
  assert.ok(rt.buy('asset_logging_bonus').ok !== false); assert.ok(rt.buy('hall_hazard_pay').ok !== false);
  const c0 = sys.wallet.coins; sys.kilindex.caughtCount++; s.step(); assert.equal(sys.wallet.coins - c0, 60);
  assert.equal(sys.awardBattleMoney({ class: 'master' }).amount, 1250);
});

test('RITA region 2: maxRegion 2, Kilindex 25, region 2 quest keys + aliases', () => {
  const e = CV.events; assert.equal(CV.maxRegion, 2);
  assert.deepEqual(e.kilindex_milestone.counts_by_region['2'], [25]);
  assert.deepEqual(e.quest_done.keys_by_region['2'], ['mq_saltmere_parcel', 'mq_thornwood_camp']);
  assert.equal(e.quest_done.done_on_flag.has_bike, 'mq_saltmere_parcel');
  assert.equal(e.quest_done.done_on_flag.beat_master_saltmere, undefined, 'master_beaten must still fire on Master 2');
  const L = J('text/overworld_lines.json').system_company_voice;
  for (const k of ['area_new_saltmere', 'master_beaten_saltmere', 'kilindex_milestone_25']) assert.ok(L[k], k);
});

test('WIP notice after Master 2 + office gift chain', () => {
  assert.equal(TRIGGER, 'beat_master_saltmere');
  assert.equal(wipDue({ flags: new Set(['beat_master_fernwick']) }), false);
  assert.equal(wipDue({ flags: new Set([TRIGGER]) }), true); assert.equal(wipDue({ flags: new Set([TRIGGER, WIP_FLAG]) }), false);
  assert.equal(giftFor('brookhollow', 'rt_guard_east', new Set()), null);
  assert.equal(giftFor('brookhollow', 'rt_guard_east', new Set(['beat_master_fernwick'])), 'parcel');
  assert.equal(giftFor('saltmere_office_int', 'saltmere_office_int_clerk', new Set()), 'no_parcel');
  assert.equal(giftFor('saltmere_office_int', 'saltmere_office_int_clerk', new Set(['has_survey_parcel'])), 'bike');
  assert.equal(giftFor('saltmere_office_int', 'saltmere_office_int_clerk', new Set(['has_survey_parcel', 'has_bike'])), null);
});

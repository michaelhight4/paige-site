// RT Benefits reset (respec) + board point tasks (events / Olympics) + tree bonuses (dev/rt-respec, Oct 31 2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RtBenefits } from '../src/systems/rt_benefits.js';
import { MilestoneBook, MILESTONES, creditBoardPoints } from '../src/progression/milestones.js';
import { EVENT_TASKS, EVENT_TREES, syncBoardTasks, treeStates } from '../src/systems/board_tasks.js';
import { TOWN_VENUES, SIGNATURE, wonFlag, noteGolds } from '../src/sports/olympics.js';

const DATA = JSON.parse(readFileSync(new URL('../data/rt_benefits.json', import.meta.url), 'utf8'));
const mk = (company = undefined, region = 8, flags = new Set()) => new RtBenefits({ log: [], flags, saveNow: () => true }, company ? { company } : {}, DATA, { region });
const total = (rt) => { const l = rt.ledger(); return l.free + l.spent; };
const spendAll = (rt) => { let go = true; while (go) { go = false; for (const n of rt.nodes) if (rt.state(n.id).state === 'available' && rt.buy(n.id).ok) go = true; } };

test('respec is supported and free in data', () => { assert.equal(DATA.respec.supported, true); assert.equal(DATA.respec.cost, 0); });

test('refund equals earned: points from ID levels and from tasks', () => {
  const rt = mk(); rt.company.xp = 1e9; rt.syncLevel();
  rt.grantPoints(1, 'ms:catch_total:2'); rt.grantPoints(2, 'ev:oly_aurelith'); rt.grantPoints(1, 'tree:ms_catch_total');
  const l0 = rt.ledger(); assert.ok(l0.fromLevels > 0); assert.equal(l0.fromTasks, 4); assert.equal(total(rt), l0.earned);
  spendAll(rt); assert.ok(rt.ledger().spent > 0); assert.equal(total(rt), l0.earned);
  const r = rt.respec(); assert.ok(r.ok);
  const l1 = rt.ledger(); assert.equal(l1.spent, l1.kept); assert.equal(l1.free + l1.kept, l0.earned);
  for (const n of rt.nodes) if (!n.grantFlag) assert.equal(rt.company.board[n.id] || 0, 0, n.id);
});

test('key-card nodes stay owned after a reset (story doors stay open)', () => {
  const flags = new Set(['promoted_id14', 'promoted_id16', 'promoted_id18', 'promoted_id20']);
  const rt = mk(undefined, 8, flags); rt.company.xp = 1e9; rt.syncLevel(); spendAll(rt);
  const keys = rt.nodes.filter((n) => n.grantFlag && rt.company.board[n.id]);
  const before = rt.ledger().earned; rt.respec();
  for (const n of keys) assert.ok(rt.company.board[n.id] > 0, n.id);
  assert.equal(total(rt), before);
});

test('repeated resets mint nothing', () => {
  const rt = mk(); rt.company.xp = 1e9; rt.syncLevel(); rt.grantPoints(3, 'ev:x');
  const earned = rt.ledger().earned;
  for (let i = 0; i < 5; i++) { spendAll(rt); rt.respec(); assert.equal(total(rt), earned); }
  const free = rt.company.pointsFree; assert.equal(rt.respec().ok, false); assert.equal(rt.company.pointsFree, free);
});

test('save compatibility: old company save without respecs loads, resets, and round-trips', () => {
  const old = { idLevel: 5, pointsFree: 1, board: { daily_bonus: 1, store_discount: 2 }, respecWeek: 0, xp: 99999, xpClaims: { 'pts:ms:levels:2': 1 } };
  const rt = mk(JSON.parse(JSON.stringify(old)));
  const before = total(rt); const r = rt.respec(); assert.ok(r.ok);
  assert.equal(rt.company.pointsFree, before); assert.equal(rt.company.respecs, 1);
  const rt2 = mk(JSON.parse(JSON.stringify(rt.company))); assert.equal(rt2.company.pointsFree, before);
});

test('event tasks: list, values, each awards exactly once', () => {
  assert.equal(EVENT_TASKS.length, 19);
  const flags = new Set([...TOWN_VENUES.map(wonFlag), wonFlag('aurelith')]);
  const sstate = { oly: Object.fromEntries([...TOWN_VENUES.map((v) => [v, { wins: 1, golds: { [SIGNATURE[v]]: 1 }, sweeps: 1 }]), ['aurelith', { wins: 1, sweeps: 1 }]]) };
  for (const t of EVENT_TASKS) {
    const rt = mk(undefined, 1); const c = { flags: new Set(), sstate: { oly: {} } };
    if (t.id.startsWith('oly_town_')) c.flags.add(wonFlag(t.venue));
    else if (t.id.startsWith('oly_gold_')) c.sstate.oly[t.venue] = { golds: { [t.event]: 1 } };
    else if (t.id === 'oly_aurelith') c.flags.add(wonFlag('aurelith'));
    else if (t.id === 'oly_sweep') c.sstate.oly.fernwick = { sweeps: 1 };
    else c.sstate.oly.aurelith = { sweeps: 1 };
    assert.equal(syncBoardTasks(rt, c), t.points, t.id);
    assert.equal(syncBoardTasks(rt, c), 0, t.id + ' twice');
  }
  const rt = mk(undefined, 1); const all = syncBoardTasks(rt, { flags, sstate });
  assert.equal(all, EVENT_TASKS.reduce((a, t) => a + t.points, 0) + EVENT_TREES.length);
  assert.equal(syncBoardTasks(rt, { flags, sstate }), 0);
  assert.equal(rt.ledger().fromTasks, all);
});

test('noteGolds records signature golds and sweeps', () => {
  const o = {}; const ev = (id, p) => ({ id, rows: [{ who: 'me', place: p }] });
  noteGolds(o, [ev('hop', 1), ev('x', 2), ev('y', 1)]); assert.equal(o.golds.hop, 1); assert.equal(o.sweeps || 0, 0);
  noteGolds(o, [ev('hop', 1), ev('x', 1), ev('y', 1)]); assert.equal(o.sweeps, 1); assert.equal(o.golds.hop, 2);
});

test('tree bonus: +1 once per maxed tree, retro on load for an old save with a complete tree', () => {
  const claimed = Object.fromEntries(MILESTONES.map((m) => [m.id, m.tiers.length]));
  const mb = new MilestoneBook({ claimed }); // old save: every card already maxed
  const rt = mk(undefined, 1); creditBoardPoints(mb, rt);
  const got = syncBoardTasks(rt, { flags: new Set(), sstate: {}, mb });
  assert.equal(got, MILESTONES.length);
  for (const m of MILESTONES) assert.equal(rt.company.xpClaims[`pts:tree:ms_${m.id}`], 1);
  assert.equal(syncBoardTasks(rt, { flags: new Set(), sstate: {}, mb }), 0);
  const partial = new MilestoneBook({ claimed: { catch_total: 3 } });
  assert.equal(treeStates({ mb: partial }).find((t) => t.id === 'ms_catch_total').maxed, false);
  const rt2 = mk(undefined, 1); assert.equal(syncBoardTasks(rt2, { mb: partial }), 0);
});

// Tasks screen (Oct 29 2026): quest log + milestones wired to real state; save round trip; banned player words.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { QuestBook, QFLAG } = await import(path.join(root, 'src/progression/quests.js'));
const { MilestoneBook, MILESTONES, deriveValues, TOTALS, CHARMS } = await import(path.join(root, 'src/progression/milestones.js'));
const P = await import(path.join(root, 'src/progression/index.js'));
const { PROGRESSION_DEFAULTS } = await import(path.join(root, 'src/progression/flags.js'));
const quests = JSON.parse(fs.readFileSync(path.join(root, 'data/quests.json'), 'utf8'));
const masters = JSON.parse(fs.readFileSync(path.join(root, 'data/masters.json'), 'utf8'));
const BANNED = /\b(PP|shiny|super effective|Pok[eé]dex|Pok[eé] Ball|Gotcha!|nurse|weed|routes?|throw\w*|berr(y|ies))\b|berr(y|ies)/i;

test('quests are on by default and data/quests.json ships (root cause of the placeholder Tasks screen)', () => {
  assert.equal(PROGRESSION_DEFAULTS.quests, true);
  assert.ok(quests.quests.length > 10);
});

test('mid region 1: pinned story goal on top, active tasks with step + place, completed collapsed', () => {
  const flags = new Set(['flg_promoted', 'got_starter', QFLAG.done('mq_brookhollow_promotion'), QFLAG.on('mq_route1_benchmark'), QFLAG.on('sq_first_five')]);
  const qb = new QuestBook(quests), mb = new MilestoneBook();
  const data = deriveValues({ kilindex: { caught: { emberkit: 1, mossling: 1 } }, creatures: [{ level: 9 }, { level: 7 }], areas: ['brookhollow', 'route1'] });
  const { rows, empty } = P.taskRows({ qb, mb, flags, masters, data });
  assert.equal(empty, false);
  assert.equal(rows[0].kind, 'goal');
  assert.equal(rows[0].master.zone, 'fernwick');
  assert.ok(rows.some((r) => r.kind === 'quest' && r.q.id === 'sq_first_five'));
  const tog = rows.find((r) => r.kind === 'done_toggle'); assert.equal(tog.n, 1); assert.equal(tog.open, false);
  assert.ok(!rows.some((r) => r.kind === 'quest' && r.status === 'done'), 'completed collapsed by default');
  const opened = P.taskRows({ qb, mb, flags, masters, data, open: true }).rows;
  assert.ok(opened.some((r) => r.kind === 'quest' && r.status === 'done'));
  assert.ok(rows.some((r) => r.kind === 'ms'), 'milestones section');
  qb.state.tracked = 'sq_first_five';
  assert.equal(qb.tracked(flags).id, 'sq_first_five');
});

test('milestones (approved design): Bronze-Platinum, % targets, gifts + retro credit, claim / claim all, round trip', async () => {
  const { ITEMS } = await import(path.join(root, 'src/systems/items.js'));
  const { sellPriceOf } = await import(path.join(root, 'src/systems/shop.js'));
  const mb = new MilestoneBook(), byId = (id) => mb.byId.get(id);
  assert.deepEqual([0, 1, 2, 3].map((t) => mb.target(byId('catch_total'), t)), [10, 50, 150, 400]);
  assert.deepEqual([0, 1, 2, 3].map((t) => mb.target(byId('dex_global'), t)), [10, Math.ceil(TOTALS.dex * 0.25), Math.ceil(TOTALS.dex * 0.6), TOTALS.dex]);
  assert.deepEqual([0, 1, 2, 3].map((t) => mb.target(byId('merchant'), t)), [1000, 10000, 50000, 200000]);
  assert.equal(mb.target(byId('explorer'), 3), TOTALS.areas);
  // an existing save with 12 caught (starter + a gift among them) gets retro credit at once
  const caught = { emberkit: 3, mossling: 3, tidepup: 2, pebblit: 2, zephling: 2 };
  const d = deriveValues({ kilindex: { caught }, creatures: [{ level: 21 }], areas: [] });
  assert.equal(d.catch_total, 12);
  const reached = mb.newlyReached(d).map((r) => r.m.id);
  assert.ok(reached.includes('catch_total') && reached.includes('levels'));
  assert.deepEqual(mb.newlyReached(d), [], 'a tier pops only once');
  const back = new MilestoneBook(JSON.parse(JSON.stringify(mb.toJSON())));
  const rw = back.claim('catch_total', d); assert.equal(rw.coins, 200);
  assert.equal(back.claim('catch_total', d), null, 'cannot claim the same tier twice');
  assert.equal(back.row(byId('catch_total'), d).target, 50);
  assert.ok(back.claimAll(d).length >= 1); assert.equal(back.readyCount(d), 0);
  back.floor('trainers', 4); back.floor('trainers', 2); assert.equal(back.state.counts.trainers, 4, 'retro floor never lowers');
  assert.equal(new MilestoneBook({ counts: null }).bump('merchant', 50), 50, 'bad saved block loads clean');
  // Platinum charms: key items, no sell price
  for (const c of CHARMS) { assert.ok(ITEMS[c]?.key, c); assert.equal(sellPriceOf(c, 'brookhollow', { isKey: (id) => !!ITEMS[id]?.key }, { basePrices: {}, sellRate: 0.5 }), null, c); }
  assert.ok(MILESTONES.every((m) => m.tiers.length === 4 && m.rewards.length === 4 && m.rule));
});

test('player text: no banned words in tasks data, milestones or place names', () => {
  const texts = [];
  for (const q of quests.quests) { texts.push(q.title, ...q.steps.map((s) => s.desc)); for (const l of q.lines || []) texts.push(...[].concat(l.text)); }
  for (const m of MILESTONES) texts.push(m.title, m.rule, ...m.rewards.map((r) => r.title || ''));
  for (const q of quests.quests) for (const s of q.steps) { texts.push(P.placeName(s.map)); assert.ok(!/\b[a-z0-9]+_[a-z0-9_]+\b/.test(P.cleanStep(s.desc)), 'dev id in step text: ' + P.cleanStep(s.desc)); }
  for (const t of texts) assert.ok(!BANNED.test(String(t || '')), `banned word in: ${t}`);
});

// Board points (Gary, Oct 29 2026): Gold + Platinum tiers pay RT Employee Benefits board points (company.pointsFree).
const MS = await import(path.join(root, 'src/progression/milestones.js'));
const { RtBenefits } = await import(path.join(root, 'src/systems/rt_benefits.js'));
const rtStub = () => new RtBenefits({ log: [], flags: new Set() }, {}, null, { region: 1 });

test('board points: one config table, Gold and Platinum only, shown on the reward', () => {
  assert.deepEqual(MS.BOARD_POINTS, [0, 0, 1, 1]);
  const mb = new MilestoneBook({ claimed: { trainers: 2 } });
  const r = mb.row(mb.byId.get('trainers'), {});
  assert.equal(r.reward.boardPoints, 1);
  assert.equal(new MilestoneBook().row(mb.byId.get('trainers'), {}).reward.boardPoints, undefined);
});

test('board points: claim credits pointsFree once; reload / re-credit never double-grants', () => {
  const mb = new MilestoneBook({ counts: { trainers: 400 } }), rt = rtStub(), d = {};
  const got = mb.claimAll(d).filter((rw) => rw.id === 'trainers');
  assert.equal(got.length, 4);
  for (const rw of got) if (rw.boardPoints) rt.grantPoints(rw.boardPoints, `ms:${rw.id}:${rw.tier}`);
  assert.equal(rt.company.pointsFree, 2);
  assert.equal(MS.creditBoardPoints(mb, rt), 0); // same keys: nothing more
  const rt2 = new RtBenefits({ log: [], flags: new Set() }, { company: JSON.parse(JSON.stringify(rt.company)) }, null, { region: 1 });
  assert.equal(MS.creditBoardPoints(new MilestoneBook(mb.toJSON()), rt2), 0); // reload
  assert.equal(rt2.company.pointsFree, 2);
});

test('board points: an old save with Gold / Platinum already claimed gets them once', () => {
  const rt = rtStub(), mb = new MilestoneBook({ claimed: { catch_total: 4, explorer: 3, trainers: 2 } });
  assert.equal(MS.creditBoardPoints(mb, rt), 3);
  assert.equal(MS.creditBoardPoints(mb, rt), 0);
  assert.equal(rt.company.pointsFree, 3);
});

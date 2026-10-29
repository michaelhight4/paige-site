// RT Employee Benefits: board fish/sports nodes, board-only skills, commuter benefit, key cards (Coder, Oct 29 2026).
// Run: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const J = (p) => JSON.parse(readFileSync(new URL('../' + p, import.meta.url)));
const RB = await import('../src/systems/rt_benefits.js');
const F = await import('../src/fishing/logic.js');
const FD = await import('../src/feeds/logic.js');
const BS = await import('../src/systems/board_skills.js');
const { buildSkills, skillIdsFor } = await import('../src/battle/data/skills.js');
const { PLACEHOLDER_SKILLS, SPECIES } = await import('../src/ui/data.js');
const { learnsetFor } = await import('../src/overnight/learnsets.js');
const { canTeachBoard } = await import('../src/qol/skills_menu.js');
const { applyLearn } = await import('../src/overnight/learnsets.js');
const CAP = await import('../src/battle/capture.js');
const { GameMap } = await import('../src/overworld/map.js');
const { RTB_TEXT } = await import('../src/ui/rt_benefits_screen.js');
const data = J('data/rt_benefits.json'), fish = J('data/fishing_tables.json');
const NEW = ['rod_quick_bite', 'rod_steady_grip', 'rod_deep_water', 'bait_allowance', 'bait_premium', 'grow_stipend', 'training_allowance',
  'wellness_days', 'light_lunch', 'commuter_benefit', 'rt_node_station_m', 'rt_node_station_t', 'keycard_r7', 'keycard_r8',
  'skill_tidal_audit', 'skill_overtime_blaze', 'skill_hostile_restructure', 'skill_team_huddle', 'skill_hostile_takeover'];
const BLOCKED = /\b(PP|shiny|berry|berries|throw)\b/i;
const stubScene = () => ({ flags: new Set(), log: [], tick: 0, saves: 0, saveNow() { this.saves++; return true; }, setFlag(f) { this.flags.add(f); } });
const mk = (company = {}, region = 4) => { const sc = stubScene(); const sys = { company }; return { sc, rt: new RB.RtBenefits(sc, sys, data, { region }) }; };
const seq = (...a) => { let i = 0; return () => a[i++ % a.length]; };

test('data: every new node is well formed, 1-3 ranks, cost 1-4, has text, region gated, no blocked words', () => {
  const ids = new Set(data.nodes.map((n) => n.id)); assert.equal(ids.size, data.nodes.length, 'unique ids');
  for (const id of NEW) {
    const n = data.nodes.find((x) => x.id === id); assert.ok(n, id);
    assert.ok(data.branches.some((b) => b.id === n.branch), id + ' branch');
    assert.ok(n.ranks.length >= 1 && n.ranks.length <= 3, id);
    for (const r of n.ranks) assert.ok(r.cost >= 1 && r.cost <= 4 && r.minIdLevel >= 1 && r.minIdLevel <= 16, id);
    const t = RTB_TEXT.nodes[id]; assert.ok(t?.name && t.desc, id + ' text');
    for (let k = 1; k <= n.ranks.length; k++) assert.ok(t.ranks[k], `${id} rank ${k} text`);
    assert.doesNotMatch(JSON.stringify(t), BLOCKED);
  }
  for (const b of data.branches) assert.ok(RTB_TEXT.branches[b.id], b.id);
  for (const s of Object.values(BS.BOARD_SKILLS)) assert.doesNotMatch(s.name + s.desc, BLOCKED);
  // region 1 only shows the cheap starters
  const r1 = NEW.filter((id) => RB.regionMaxRank(data.nodes.find((n) => n.id === id), 1) > 0);
  assert.deepEqual(r1.sort(), ['grow_stipend', 'rod_quick_bite', 'rod_steady_grip', 'wellness_days']);
});

test('balance: new nodes cost more than the points a region-4 player can ever have (choices matter)', () => {
  const cost = (ids) => data.nodes.filter((n) => ids.includes(n.id)).reduce((a, n) => a + n.ranks.reduce((b, r) => b + r.cost, 0), 0);
  const income = (data.regions['4'].maxIdLevel - 1) * data.pointsPerLevel; // 11 from ID levels (+ milestone points, parallel change)
  const buyableR4 = NEW.filter((id) => !data.nodes.find((n) => n.id === id).comingSoon && RB.unlockRegionOf(data.nodes.find((n) => n.id === id)) <= 4);
  assert.ok(cost(buyableR4) > income * 2, `new sink ${cost(buyableR4)} vs income ${income}`);
});

test('nodeState: comingSoon (commuter benefit, key cards) is shown locked and cannot be bought', () => {
  const { rt } = mk({ idLevel: 12, pointsFree: 30 }, 8);
  for (const id of ['commuter_benefit', 'rt_node_station_m']) { assert.equal(rt.state(id).reason, 'soon'); assert.equal(rt.buy(id).ok, false); }
});

test('buy + effect: rank, points, save, and perk bundles', () => {
  const { rt, sc } = mk({ idLevel: 12, pointsFree: 20 });
  assert.deepEqual(rt.fishingPerks(), { waitCut: 0, windowMs: 0, rareMult: 1, baitSave: 0, baitPower: 0 });
  assert.deepEqual(rt.feedPerks(), { grow: 1, gain: 1, digest: 1, fill: 1 });
  for (const id of ['rod_steady_grip', 'rod_steady_grip', 'bait_allowance', 'grow_stipend', 'wellness_days']) assert.equal(rt.buy(id).ok, true, id);
  assert.equal(sc.saves, 5);
  assert.equal(rt.fishingPerks().windowMs, 240); assert.equal(rt.fishingPerks().baitSave, 0.2);
  assert.equal(rt.feedPerks().grow, 0.85); assert.equal(rt.feedPerks().digest, 1.25);
  assert.equal(rt.company.pointsFree, 20 - 1 - 1 - 1 - 1 - 1);
});

test('fishing: wider window, shorter wait, rare mult, premium bait, bait saver', () => {
  const rod = F.bestRod({ fishing_rod: 1 }), r = () => 0.999999;
  const base = F.planCast(fish, 'route1', rod, seq(0.999, 0.0, 0.5, 0.5), null, null);
  const pk = F.planCast(fish, 'route1', rod, seq(0.999, 0.0, 0.5, 0.5), null, null, { waitCut: 1000, windowMs: 240 });
  assert.ok(pk.waitMs < base.waitMs && pk.waitMs >= F.TIMING.WAIT_MIN);
  assert.equal(F.windowFor(pk), F.TIMING.WINDOW + 240); assert.equal(F.windowFor(pk, true), F.TIMING.WINDOW_TOUCH + 240);
  const bitten = { bite: true, waitMs: 1000, winBonus: 240 };
  assert.equal(F.judgePress(bitten, 1000 + F.TIMING.WINDOW + 100, true), 'hooked');
  assert.equal(F.judgePress({ ...bitten, winBonus: 0 }, 1000 + F.TIMING.WINDOW + 100, true), 'late');
  assert.deepEqual(F.rareBait(null, 1.3), { rare: 1.3, uncommon: 1.15 });
  assert.equal(F.rareBait(null, 1), null);
  const b = { bite: 0.1, rare: 2, elementMult: 1.5 }, up = F.boostBait(b, 0.5);
  assert.deepEqual([up.bite, up.rare, up.elementMult], [0.15, 2.5, 1.75]);
  assert.equal(F.baitSaved({ baitSave: 0.35 }, () => 0.3), true); assert.equal(F.baitSaved({ baitSave: 0.35 }, () => 0.4), false);
  assert.equal(F.baitSaved(null, r), false);
  // rare weight goes up, water-only rule still holds
  const slot = { species: 'x', weight: 10, rarity: 'rare' };
  assert.equal(F.effectiveWeight(slot, F.rareBait(null, 1.3)), 13);
});

test('feeds: grow faster, more gain (cap +15 kept), fruit fills less, fullness clears faster', () => {
  const growBase = FD.growMs('dashfig');
  FD.setFeedPerks(() => ({ grow: 0.7, gain: 1.2, digest: 1.5, fill: 0.8 }));
  try {
    assert.equal(FD.growMs('dashfig'), growBase * 0.7);
    assert.equal(FD.drainAmount('practice'), 15); assert.equal(FD.drainAmount('battleWin'), 7.5);
    const pv = FD.previewFeed({ build: {}, full: 0, uid: 'u1', fruitId: 'dashfig' });
    assert.equal(pv.full <= 15 * 0.8 + 5, true);
    assert.equal(FD.statBonus({ legs: 60, lungs: 60, grip: 60, mind: 60 }).speed, FD.STAT_BONUS_CAP);
  } finally { FD.setFeedPerks(null); }
  assert.equal(FD.growMs('dashfig'), growBase); assert.equal(FD.drainAmount('practice'), FD.DRAIN.practice);
});

test('commuter benefit: travelFare discounts a fare (dormant until a paid fare exists)', () => {
  assert.equal(RB.travelFare(200), 200);
  assert.equal(RB.travelFare(200, () => 0.3), 140);
  assert.equal(RB.travelFare(200, () => 5), 20); // clamped to 90% off
});

test('board skills: engine rows exist, never in any pool / learnset / trainer team', () => {
  const sk = buildSkills();
  for (const id of BS.BOARD_SKILL_IDS) { assert.ok(sk[id]?.boardOnly, id); assert.ok(sk[id].pp > 0); }
  const pool = new Set(Object.values(PLACEHOLDER_SKILLS).flat().map(([n]) => n.toLowerCase().replace(/[^a-z0-9]+/g, '')));
  for (const id of BS.BOARD_SKILL_IDS) assert.ok(!pool.has(id), id);
  for (const sp of SPECIES) {
    for (const id of skillIdsFor(sp.el, sp.skillPool)) assert.ok(!BS.isBoardSkill(id), sp.id);
    for (const e of learnsetFor(sp.id, sp.el, skillIdsFor(sp.el, sp.skillPool))) assert.ok(!BS.isBoardSkill(e.skill), sp.id);
  }
  const tt = readFileSync(new URL('../src/battle/data/trainer_teams.js', import.meta.url), 'utf8');
  for (const id of BS.BOARD_SKILL_IDS) assert.ok(!tt.includes(id));
  assert.equal(new Set(Object.values(BS.BOARD_SKILLS).map((b) => b.el)).size, 5, '5 elements');
  // strong but not broken: no board attack above 90 power, no priority
  for (const id of BS.BOARD_SKILL_IDS) { assert.ok(sk[id].basePower <= 90); assert.equal(sk[id].priority, 0); }
});

test('board skills: bought node unlocks; teach to a compatible creature only', () => {
  const { rt } = mk({ idLevel: 12, pointsFree: 10 });
  assert.deepEqual(rt.boardSkills(), []);
  assert.equal(rt.buy('skill_tidal_audit').ok, true);
  const owned = rt.boardSkills(); assert.deepEqual(owned, ['boardtidalaudit']);
  const water = { species: 'rillop', skills: ['a', 'b'] }, fire = { species: 'cindrip', skills: [] };
  assert.equal(canTeachBoard(water, 'boardtidalaudit', owned), 'ok');
  assert.equal(canTeachBoard(fire, 'boardtidalaudit', owned), 'unfit');
  assert.equal(canTeachBoard(fire, 'boardovertimeblaze', owned), 'locked');
  assert.equal(applyLearn(water, 'boardtidalaudit').result, 'learned');
  assert.equal(canTeachBoard(water, 'boardtidalaudit', owned), 'known');
});

test('key cards: buying grants the flag; locked_warps with unlock_flag open; story_gates use the same flag', () => {
  const d2 = JSON.parse(JSON.stringify(data)); for (const n of d2.nodes) delete n.comingSoon;
  const sc = stubScene(), rt = new RB.RtBenefits(sc, { company: { idLevel: 16, pointsFree: 5 } }, d2, { region: 5 });
  assert.equal(rt.buy('rt_node_station_m').ok, true); assert.ok(sc.flags.has('rt_keycard_r5'));
  assert.equal(rt.state('rt_node_station_t').reason, 'region');
  const fake = { _lockedAt: new Map([['3,4', { x: 3, y: 4, to: 'lab', unlock_flag: 'rt_keycard_r5' }], ['5,5', { x: 5, y: 5, to: 'staff' }]]) };
  assert.equal(GameMap.prototype.keyDoorAt.call(fake, 3, 4, new Set()), null);
  assert.equal(GameMap.prototype.keyDoorAt.call(fake, 3, 4, sc.flags).to, 'lab');
  assert.equal(GameMap.prototype.keyDoorAt.call(fake, 5, 5, sc.flags), null, 'staff doors stay locked');
});

test('research species: capture rate x0.6 in rarityOf and the engine creature table', () => {
  const sp = { id: 'zz', catchRate: 0.5 };
  assert.equal(CAP.rarityOf(sp), 0.5);
  assert.equal(CAP.rarityOf({ ...sp, research: true }), 0.5 * CAP.RESEARCH_CATCH_MULT);
  CAP.RESEARCH_SPECIES.add('zz'); try { assert.equal(CAP.rarityOf(sp), 0.3); } finally { CAP.RESEARCH_SPECIES.delete('zz'); }
  assert.ok(CAP.captureChance({ rarity: CAP.rarityOf({ ...sp, research: true }), hp: 1, maxHp: 10 }) < CAP.captureChance({ rarity: 0.5, hp: 1, maxHp: 10 }));
});

test('save/load: old saves (no new ids) load untouched; new ranks round-trip through JSON', () => {
  const old = { idLevel: 6, pointsFree: 2, board: { rt_payout: 2, store_discount: 1 }, respecWeek: 0, xp: 3000, xpClaims: { first_catch: 1 } };
  const before = JSON.stringify(old);
  const { rt } = mk(old, 2);
  assert.equal(rt.effect('rt_payout') > 0, true);
  for (const id of NEW) assert.equal(rt.effect(id), 0, id);
  assert.deepEqual(rt.fishingPerks().windowMs, 0);
  assert.equal(JSON.stringify(rt.company.board), JSON.stringify(JSON.parse(before).board));
  rt.buy('rod_quick_bite');
  const back = JSON.parse(JSON.stringify(rt.company)), { rt: rt2 } = mk(back, 2);
  assert.equal(rt2.effect('rod_quick_bite'), 500); assert.equal(rt2.effect('rt_payout'), rt.effect('rt_payout'));
});

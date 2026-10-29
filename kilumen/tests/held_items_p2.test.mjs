// Held items build steps 2-5 (design/HELD_ITEMS.md P2-P5, Oct 29 2026): Clear Bell, Tamer's Thread, Lure Lantern /
// Hush Cloak, Tally Purse, Master + rival picks, rewards and hidden spots, shop rows, give / take / swap model, UI text.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { KilumenBattle } from '../src/battle/battle.js';
import { HELD_BATTLE_ITEMS } from '../src/battle/data/held_items.js';
import { HELD_PICKS, heldRoleFor, applyHeldPicks } from '../src/battle/data/trainer_held.js';
import { speciesInfo } from '../src/systems/creature.js';
import { ITEMS } from '../src/systems/items.js';
import { Bag } from '../src/systems/bag.js';
import { giveHeld, takeHeld, swapHeld, migrateHeld, leadEncounterMult, allOwned } from '../src/systems/held.js';
import { FLAG_REWARDS, HIDDEN_SPOTS, injectHiddenSpots, grantFlagRewards, gotFlag } from '../src/systems/held_rewards.js';
import { awardPrize } from '../src/systems/shop.js';
import { EncounterRoller, MAX_RATE } from '../src/battle/encounters.js';
import { captureChance } from '../src/battle/capture.js';
import { HELD_DESC, HELD_LINES } from '../src/systems/data/held_text.js';

const SEED = [1, 2, 3, 4];
const mk = (species, level, extra = {}) => ({ species, level, ...extra });
const SHOPS = JSON.parse(fs.readFileSync(new URL('../src/systems/data/shops.json', import.meta.url)));

test('Clear Bell blocks drowsy and confusion; no bell, it lands', () => {
  const h = HELD_BATTLE_ITEMS.clear_bell;
  assert.ok(h.kEarned && h.kPrice == null && typeof h.onSetStatus === 'function' && typeof h.onTryAddVolatile === 'function');
  const ctx = { add() {} };
  assert.equal(h.onSetStatus.call(ctx, { id: 'drowsy' }, {}, {}, { effectType: 'Move' }), false);
  assert.equal(h.onSetStatus.call(ctx, { id: 'scorched' }, {}, {}, { effectType: 'Move' }), undefined);
  assert.equal(h.onTryAddVolatile.call(ctx, { id: 'confusion' }, {}), null);
});

test("Tamer's Thread: catch chance x1.2 (field calc + engine hook)", () => {
  assert.equal(HELD_BATTLE_ITEMS.tamers_thread.kCatchMult, 1.2);
  const c = (heldMult) => captureChance({ rarity: 0.4, hp: 5, maxHp: 10, heldMult });
  assert.ok(Math.abs(c(1.2) / c(1) - 1.2) < 1e-9);
  const src = fs.readFileSync(new URL('../src/battle/engine.js', import.meta.url), 'utf8');
  assert.ok(src.includes('(a.kCrystalGrade??1)*(e.getItem?.()?.kCatchMult||1)'));
});

test('Lure Lantern / Hush Cloak scale the wild rate from the lead (first able creature)', () => {
  assert.equal(leadEncounterMult([{ hp: 10, held: 'lure_lantern' }]), 1.5);
  assert.equal(leadEncounterMult([{ hp: 0, held: 'lure_lantern' }, { hp: 5, held: 'hush_cloak' }]), 0.5);
  assert.equal(leadEncounterMult([{ hp: 5 }, { hp: 5, held: 'lure_lantern' }]), 1);
  const at = (k, rate) => new EncounterRoller({}, { rateMult: () => k }).rateFor({ rate });
  assert.equal(at(1, 0.1), 0.1);
  assert.ok(Math.abs(at(1.5, 0.1) - 0.15) < 1e-9);
  assert.ok(Math.abs(at(0.5, 0.1) - 0.05) < 1e-9);
  assert.ok(at(1.5, 0.5) > MAX_RATE && at(1, 0.5) === MAX_RATE); // helps at the cap too
  assert.equal(new EncounterRoller({}, { rate: 1, rateMult: () => 0.5 }).rateFor({}), 1); // dev override untouched
});

test('Tally Purse: +10% prize, a gold coin wins instead', () => {
  const w = () => ({ n: 0, add(a) { this.n += a; } });
  assert.equal(awardPrize({ baseAmount: 100, level: 10 }, { wallet: w(), party: [] }), 1000);
  assert.equal(awardPrize({ baseAmount: 100, level: 10 }, { wallet: w(), party: [{ held: 'tally_purse' }] }), 1100);
  assert.equal(awardPrize({ baseAmount: 100, level: 10 }, { wallet: w(), party: [{ held: 'tally_purse' }, { held: 'gold_coin' }] }), 1500);
});

test('Master and rival picks: real items, no repeats, Charms match an element on the creature', () => {
  for (const [role, picks] of Object.entries(HELD_PICKS)) {
    const ids = picks.filter(Boolean);
    assert.equal(new Set(ids).size, ids.length, role);
    for (const id of ids) assert.ok(HELD_BATTLE_ITEMS[id], role + ' ' + id);
  }
  assert.equal(heldRoleFor({ map: 'x', id: 'lanternport_ron_5' }), 'ron_5');
  assert.equal(heldRoleFor({ map: 'mirefen_hall_int', id: 'hall_helper' }), null);
  const team = [mk('rillop', 30), mk('cindrip', 30, { held: 'moss_wrap' })];
  const out = applyHeldPicks('master_fernwick', team);
  assert.equal(out[1].held, 'moss_wrap'); assert.equal(team[0].held, undefined); // copies, authored item kept
  // Charms in picks go on a creature of that element (checked on the authored teams where we can resolve species)
  const b = new KilumenBattle({ party: [mk('rillop', 30)], foes: applyHeldPicks('master_saltmere', [mk('rillop', 30), mk('rillop', 30), mk('rillop', 30)]), seed: SEED });
  assert.equal(b.p2.creature[2].item, 'dropletcharm');
});

test('rewards: flags give each item once; hidden spots on walkable free cells', () => {
  const flags = new Set(['beat_master_revival', 'beat_rival_ron_6']), bag = new Bag({});
  const got = grantFlagRewards({ flags, bag, setFlag: (f) => flags.add(f) });
  assert.deepEqual(got.map((g) => g.item).sort(), ['crownstone_charm', 'grit_buckle', 'wisp_charm']);
  assert.equal(grantFlagRewards({ flags, bag, setFlag: (f) => flags.add(f) }).length, 0);
  assert.ok(flags.has(gotFlag('wisp_charm')));
  for (const r of FLAG_REWARDS) for (const id of r.items) assert.ok(HELD_BATTLE_ITEMS[id]?.kEarned || ITEMS[id]?.key, id);
  for (const [map, spots] of Object.entries(HIDDEN_SPOTS)) {
    const d = JSON.parse(fs.readFileSync(new URL(`../art/world/overworld/maps/${map}.json`, import.meta.url)));
    const C = d.layers.collision, busy = new Set();
    for (const k of ['warps', 'npcs', 'signs', 'items', 'interact_spots']) for (const o of d[k] || []) if (o && 'x' in o) busy.add(`${o.x},${o.y}`);
    for (const s of spots) {
      assert.equal(C[s.y][s.x], 0, `${map} ${s.x},${s.y} walkable`);
      assert.ok(!busy.has(`${s.x},${s.y}`), `${map} ${s.x},${s.y} free`);
      assert.ok(ITEMS[s.item], s.item);
    }
    const m = { name: map, items: [] };
    injectHiddenSpots(m, new Set()); const n1 = m.items.length; injectHiddenSpots(m, new Set());
    assert.equal(m.items.length, n1); assert.ok(m.items.every((it) => it.hidden && it.flag.startsWith(`item_${map}_`)));
  }
});

test('shop rows: held prices match kPrice, earned-only items never stocked', () => {
  const stocked = new Set(Object.values(SHOPS.regions).flatMap((r) => r.stock.flatMap((t) => t.items)));
  for (const [id, h] of Object.entries(HELD_BATTLE_ITEMS)) {
    if (h.kEarned) assert.ok(!stocked.has(id), 'earned stocked: ' + id);
    else if (stocked.has(id)) assert.equal(SHOPS.basePrices[id], h.kPrice, id);
    if (h.kHeldKind === 'charm' && h.kPrice != null) assert.ok(h.kPrice >= 2000 && h.kPrice <= 3000, id);
  }
  assert.ok(stocked.has('remedy_pouch') && stocked.has('quick_tassel') && stocked.has('tally_purse'));
});

test('give / take / swap model: the copy moves, old item returns, migration once', () => {
  const bag = new Bag({ remedy_pouch: 2, moss_wrap: 1 }), a = { uid: 'a' }, b = { uid: 'b' };
  assert.ok(giveHeld(bag, a, 'remedy_pouch').ok); assert.equal(bag.count('remedy_pouch'), 1);
  assert.ok(giveHeld(bag, b, 'remedy_pouch').ok); assert.equal(bag.count('remedy_pouch'), 0);
  assert.equal(giveHeld(bag, a, 'remedy_pouch').reason, 'same');
  const r = giveHeld(bag, a, 'moss_wrap'); assert.ok(r.ok); assert.equal(r.old, 'remedy_pouch'); assert.equal(bag.count('remedy_pouch'), 1);
  assert.equal(giveHeld(bag, a, 'potion').ok, false);
  swapHeld(a, b); assert.equal(a.held, 'remedy_pouch'); assert.equal(b.held, 'moss_wrap');
  assert.ok(takeHeld(bag, b).ok); assert.equal(b.held, null); assert.equal(bag.count('moss_wrap'), 1);
  const bag2 = new Bag({ iron_brace: 1 }), st = {}, owned = allOwned([{ held: 'iron_brace' }], { boxes: [[{ held: 'iron_brace' }]] });
  assert.equal(migrateHeld(bag2, owned, st), 1); assert.equal(bag2.count('iron_brace'), 0); assert.equal(st.heldModel, 2);
  assert.equal(migrateHeld(bag2, owned, st), 0);
});

test('held text: every held item has a description, no blocked words', () => {
  for (const id of Object.keys(ITEMS)) if (ITEMS[id].held && !HELD_BATTLE_ITEMS[id]?.kHeldKind) assert.ok(HELD_DESC[id], 'desc ' + id);
  const all = [...Object.values(HELD_DESC), ...Object.values(HELD_LINES).flat(), ...Object.values(HELD_BATTLE_ITEMS).map((h) => h.name)].join('\n');
  for (const w of [/\bPP\b/, /shiny/i, /super effective/i, /pok[eé]/i, /gotcha/i, /\bnurse\b/i, /\bweed\b/i, /tonic/i, /\broute\b/i, /\bthrow/i, /alcohol|beer|wine|smok|drug/i]) assert.ok(!w.test(all), String(w));
});

// ---- Oct 29 2026 (1 PM follow-up): capture stays level-free, Sunmeadow -> Tidewater row, held icons on every slot ----
import { regionOf, stockFor } from '../src/systems/shop.js';
import { heldInfo, heldIconHtml, heldTip, heldIconSrc } from '../src/ui/held_icons.js';
import { existsSync, readFileSync } from 'node:fs';

test('capture chance is level-independent: same HP fraction + crystal = same odds at any level (shell + engine)', () => {
  for (const grade of [1, 1.5, 2]) {
    const a = captureChance({ rarity: 0.4, hp: 10, maxHp: 40, grade });
    const b = captureChance({ rarity: 0.4, hp: 50, maxHp: 200, grade });
    assert.equal(a, b);
    assert.equal(captureChance({ rarity: 0.4, hp: 10, maxHp: 40, grade, level: 5 }), captureChance({ rarity: 0.4, hp: 10, maxHp: 40, grade, level: 90 }));
  }
  assert.ok(captureChance({ rarity: 0.4, hp: 5, maxHp: 40 }) > captureChance({ rarity: 0.4, hp: 30, maxHp: 40 }), 'lower HP helps');
  assert.ok(captureChance({ rarity: 0.4, hp: 10, maxHp: 40, grade: 2 }) > captureChance({ rarity: 0.4, hp: 10, maxHp: 40 }), 'better crystal helps');
  // engine: no level term anywhere in the capture function
  const eng = fs.readFileSync(new URL('../src/battle/engine.js', import.meta.url), 'utf8');
  const m = eng.match(/kCrystalGrade\?\?1\)\*\(e\.getItem\?\.\(\)\?\.kCatchMult\|\|1\)[^;]*;/);
  assert.ok(m, 'engine capture expression found');
  assert.ok(!/level/i.test(m[0]), 'engine capture has no level term');
});

test('Sunmeadow uses the Tidewater Coast shop row (Steady Sight); other zones unchanged', () => {
  const shops = JSON.parse(fs.readFileSync(new URL('../src/systems/data/shops.json', import.meta.url), 'utf8'));
  assert.equal(regionOf('sunmeadow_fields', shops), shops.regions.tidewater_coast);
  assert.ok(stockFor('sunmeadow_fields', 8, {}, shops).includes('steady_sight'));
  assert.equal(regionOf('nowhere_zone', shops), shops.regions._default);
  assert.equal(regionOf('saltmere', shops), shops.regions.saltmere);
});

test('held icons: every holdable item has its own real sprite file + name + one-line effect; empty slot = socket', () => {
  const ids = [...new Set([...Object.keys(HELD_BATTLE_ITEMS), ...Object.entries(ITEMS).filter(([, d]) => d.held).map(([k]) => k)])];
  for (const id of ids) {
    const i = heldInfo(id); assert.ok(i, id);
    for (const suf of ['', '_2x', '_3x']) {
      const f = new URL(`../${heldIconSrc(id).replace(/\.png$/, suf + '.png')}`, import.meta.url);
      assert.ok(existsSync(f), `${id}${suf} sprite missing`);
      const b = readFileSync(f); assert.equal(b.toString('latin1', 1, 4), 'PNG', `${id}${suf} not a png`);
      assert.equal(b.readUInt32BE(16), 16 * (suf ? +suf[1] : 1), `${id}${suf} width`);
    }
    assert.equal(i.src, `art/items/held/${id}.png`);
    assert.ok(i.effect.length > 5 && !i.effect.includes('\n'), `${id} effect`);
    const h = heldIconHtml(id); assert.match(h, /class="held-ic/); assert.match(h, new RegExp(`<img class="held-spr" src="art/items/held/${id}\\.png"`)); assert.doesNotMatch(h, /<svg/); assert.match(h, /data-htip="[^"]+: /);
  }
  assert.equal(ids.length, new Set(ids.map(heldIconSrc)).size, 'one sprite per item');
  assert.match(heldIconHtml('ember_charm'), /data-el="fire"/);
  assert.match(heldIconHtml(null), /held-ic empty/); assert.doesNotMatch(heldIconHtml(null), /<svg|<img/);
  assert.equal(heldTip(''), 'Holding nothing');
  const banned = /\bPP\b|shiny|super effective|Pok[eé]|Gotcha|nurse|\bweed\b|tonic|\bRoute\b|\bthrow/i;
  for (const id of ids) assert.doesNotMatch(heldTip(id), banned, id);
  // all three places render it
  for (const f of ['../src/ui/systems_screens.js', '../src/battle/ui_sd.js', '../src/rtb/view.js']) assert.match(fs.readFileSync(new URL(f, import.meta.url), 'utf8'), /heldIconHtml\(/, f);
});

test('turn-based team list knows shell-only holders (Gold Coin) through the set', () => {
  const b = new KilumenBattle({ party: [mk('nibbin', 10, { held: 'gold_coin' }), mk('nibbin', 10, { held: 'iron_brace' })], foes: [mk('nibbin', 5)], seed: SEED });
  const t = b.request().team;
  assert.equal(t[0].set?.kHeld, 'gold_coin');
  assert.equal(t[1].item, 'ironbrace');
});

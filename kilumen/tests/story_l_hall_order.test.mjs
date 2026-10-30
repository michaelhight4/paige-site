// dev/regions-5-8 (Oct 29 2026): story_beats.md §L rev 2 (Lanternport page hand-off) + Gary's hall order rule (3:52 PM CT).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { R78, pageDue, binsKey, pageScript, coinCount, lanternportBlocked, attachRegion78 } from '../src/region78/index.js';
import { HALL_ORDER, hallLockFor } from '../src/systems/hall_order.js';
import { RON_RIVALS } from '../src/battle/story.js';
import { ITEMS } from '../src/systems/items.js';
const J = (p) => JSON.parse(fs.readFileSync(new URL(`../${p}`, import.meta.url)));
const F = (...a) => new Set(a);
const coins = (n) => ['fernwick', 'saltmere', 'revival', 'frostspire', 'mirefen', 'tidewater', 'lanternport'].slice(0, n).map((z) => `beat_master_${z}`);

test('§L: quest step 1 is the talk-only hand-off; no Ron 5 at Lanternport', () => {
  const q = J('data/quests.json'); let s1;
  JSON.stringify(q, (k, v) => { if (v && v.id === 'mq_lanternport_s1') s1 = v; return v; });
  assert.equal(s1.flag, 'ron_page_shared'); assert.ok(/talk only/i.test(s1.desc) && !/Ron 5/.test(s1.desc));
  assert.ok(!('lanternport.lanternport_ron_5' in RON_RIVALS));
  assert.ok(ITEMS.field_reading_sheet?.key);
});

test('§L: gated on the Tidewater coin, once, before or after the Lanternport hall', () => {
  assert.equal(pageDue(F(...coins(5)), 'lanternport'), false);
  assert.equal(pageDue(F(...coins(6)), 'lanternport'), true);
  assert.equal(pageDue(F(...coins(7)), 'lanternport'), true);
  assert.equal(pageDue(F(...coins(7), 'ron_page_shared'), 'lanternport'), false);
  assert.equal(pageDue(F(...coins(7), 'beat_master_cindervale'), 'lanternport'), false, 'All 8 coins (dev preset / finale): no page scene');
  assert.equal(pageDue(F(...coins(7), 'all_badges'), 'lanternport'), false);
  assert.equal(pageDue(F(), 'lanternport'), false, 'new game warp');
});

test('§L: bin line follows the coin count (6 -> bins6_flies, 7 -> bins7_flies)', () => {
  assert.equal(coinCount(F(...coins(6))), 6); assert.equal(binsKey(6), 'ron.lanternport.bins6_flies');
  assert.equal(coinCount(F(...coins(7))), 7); assert.equal(binsKey(7), 'ron.lanternport.bins7_flies');
  assert.ok(pageScript(6).includes('ron.lanternport.bins6_flies') && !pageScript(6).includes('ron.lanternport.bins7_flies'));
  assert.ok(pageScript(7).includes('ron.lanternport.bins7_flies'));
});

for (const n of [6, 7]) test(`§L: hand-off at ${n} coins plays bins${n}, sets flags, gives the sheet`, async () => {
  const flags = F(...coins(n)), said = [], bag = new Map();
  const L = J('text/overworld_lines.json'); const scene = { flags, lines: L, map: { name: 'lanternport' }, setFlag: (f) => flags.add(f),
    say: async (p) => { said.push(p.join(' ')); }, systems: { bag: { has: (i) => bag.has(i), add: (i) => bag.set(i, 1) } } };
  const api = attachRegion78(scene, {}); await api.pageHandoff(); api.stop();
  const other = n === 6 ? 7 : 6, txt = (m) => L.ron.lanternport[`bins${m}_flies`].pages.join(' ');
  assert.ok(said.includes(txt(n))); assert.ok(!said.includes(txt(other)));
  assert.ok(said.some((s) => s.startsWith(L.lore.lanternport.page.pages[0])));
  assert.ok(!said.some((s) => s.includes('PLACEHOLDER')));
  for (const f of ['ron_page_shared', 'read_log_lanternport', 'item_field_reading_sheet']) assert.ok(flags.has(f), f);
  assert.ok(bag.has('field_reading_sheet'));
});

test('Lanternport gate: one config flag, off (open) by Gary 3:51 PM CT', () => {
  assert.equal(R78.lanternportGate, null);
  assert.equal(lanternportBlocked('lanternport', F()), false);
  assert.equal(lanternportBlocked('lanternport', F(), 'beat_master_tidewater'), true);
  assert.equal(lanternportBlocked('lanternport', F('beat_master_tidewater'), 'beat_master_tidewater'), false);
});

test('hall order: hall N needs Master N-1; Fernwick always open', () => {
  assert.equal(HALL_ORDER.length, 8);
  assert.equal(hallLockFor('fernwick_hall_int', F()), null);
  HALL_ORDER.slice(1).forEach((z, i) => {
    const prev = `beat_master_${HALL_ORDER[i]}`;
    assert.equal(hallLockFor(`${z}_hall_int`, F()), prev, z);
    assert.equal(hallLockFor(`${z}_hall_int`, F(prev)), null, z);
    assert.ok(fs.existsSync(new URL(`../art/world/overworld/maps/${z}_hall_int.json`, import.meta.url)), z);
  });
  assert.equal(hallLockFor('lanternport', F()), null); // towns stay open
});

test('hall order: old saves are never locked out of halls they already beat (or passed)', () => {
  assert.equal(hallLockFor('mirefen_hall_int', F('beat_master_mirefen')), null);
  assert.equal(hallLockFor('saltmere_hall_int', F('beat_master_revival')), null); // skipped order on an old save
  const tl = J('text/overworld_lines.json').system_field?.hall_locked_prev;
  assert.ok(tl.pages.join(' ').includes('{master}')); // Text Bot key, filled with the previous town name
});

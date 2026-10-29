// Fruit feeds unit tests (node --test kilumen/tests/feeds.test.mjs). Coder, Oct 29 2026.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as L from '../src/feeds/logic.js';
import { FS } from '../src/feeds/strings.js';
import { feedsEnabled } from '../src/feeds/flags.js';
import { Bag } from '../src/systems/bag.js';
import { ITEMS } from '../src/systems/items.js';
import { athleticStats, setAthleticBonus } from '../src/sports/athletics.js';

const fresh = () => { const fs = L.feedsState({}); Object.defineProperty(fs, 'bag', { value: new Bag({}) }); return fs; };
const give = (fs, id, n = 50) => { fs.bag.add(L.fruitItem(id), n); };
const uidNeutral = (id) => { for (let i = 0; i < 500; i++) { const u = 'u' + i; if (L.reactionOf(u, id) === 'neutral') return u; } };

test('flag is off by default, ?feeds=1 turns it on', () => {
  assert.equal(feedsEnabled(new URLSearchParams('')), false);
  assert.equal(feedsEnabled(null), false);
  assert.equal(feedsEnabled(new URLSearchParams('feeds=1')), true);
});
test('no berries, no blocked words in fruit ids or player text', () => {
  const blocked = [/\bPP\b/, /shiny/i, /super effective/i, /pok[eé]dex/i, /pok[eé] ?ball/i, /\bnurse\b/i, /\bweed/i, /\broute\b/i, /berr(y|ies)/i, /\bthrow/i];
  const all = [...Object.values(FS), ...L.FRUIT_IDS, ...Object.keys(FS)].join('\n');
  for (const re of blocked) assert.ok(!re.test(all), 'blocked: ' + re);
  for (const f of ['logic.js', 'index.js', 'ui_art.js', 'strings.js']) assert.ok(!/berr(y|ies)/i.test(readFileSync(new URL('../src/feeds/' + f, import.meta.url), 'utf8')), f);
});
test('every fruit has a placeholder name key', () => { for (const id of L.FRUIT_IDS) assert.ok(FS[`feeds.fruit.${id}.name`], id); });
test('feed grows a part, uses a fruit, adds fullness, and applies the opposite-part trade-off', () => {
  const fs = fresh(), u = uidNeutral('dashfig'); give(fs, 'dashfig', 2);
  L.buildOf(fs, u).lungs = 5;
  const r = L.feed(fs, fs.bag, { uid: u, fruitId: 'dashfig', body: {} });
  assert.ok(r.ok); assert.equal(fs.build[u].legs, 3); assert.equal(fs.build[u].lungs, 4); // legs up -> lungs -1
  assert.equal(fs.full[u], 15); assert.equal(fs.bag.count('fruit_dashfig'), 1);
});
test('trade-off never goes below 0', () => {
  const fs = fresh(), u = uidNeutral('dashfig'); give(fs, 'dashfig');
  L.feed(fs, fs.bag, { uid: u, fruitId: 'dashfig', body: {} }); assert.equal(fs.build[u].lungs, 0);
});
test('likes and dislikes: stable per uid, change gain and fullness', () => {
  assert.deepEqual(L.tastesOf('abc'), L.tastesOf('abc'));
  let like, dis; for (let i = 0; i < 500 && !(like && dis); i++) { const u = 'x' + i; const r = L.reactionOf(u, 'dashfig'); if (r === 'like') like ||= u; if (r === 'dislike') dis ||= u; }
  const b = () => Object.fromEntries(L.PARTS.map((p) => [p, 0]));
  const pl = L.previewFeed({ build: b(), uid: like, fruitId: 'dashfig' }), pd = L.previewFeed({ build: b(), uid: dis, fruitId: 'dashfig' });
  assert.equal(pl.reaction, 'like'); assert.equal(pl.delta.legs, 3.8); assert.equal(pl.full, 10);
  assert.equal(pd.reaction, 'dislike'); assert.equal(pd.delta.legs, 2.3); assert.equal(pd.full, 25);
});
test('Fullness blocks feeding at 100 and does NOT drain with time; practice and battles drain it', () => {
  const fs = fresh(), u = uidNeutral('rumblemelon'); give(fs, 'rumblemelon');
  let n = 0; while (L.feed(fs, fs.bag, { uid: u, fruitId: 'rumblemelon', body: {} }).ok) n++;
  assert.equal(n, 3); assert.equal(fs.full[u], 90);
  assert.equal(L.previewFeed({ build: fs.build[u], full: fs.full[u], uid: u, fruitId: 'rumblemelon' }).reason, 'full');
  assert.equal(fs.full[u], 90); // nothing in logic ticks fullness with time
  L.drain(fs, u, L.DRAIN.practice); assert.equal(fs.full[u], 80);
  L.drain(fs, u, L.DRAIN.battleWin); assert.equal(fs.full[u], 75);
});
test('stat bonus caps at +15 per stat; part cap 60; total cap 150', () => {
  assert.equal(L.statBonus({ legs: 60 }).speed, 15);
  assert.equal(L.statBonus({ legs: 60, wings: 60 }).agility, 15);
  const fs = fresh(), u = uidNeutral('embergourd'); give(fs, 'embergourd', 9999);
  for (let i = 0; i < 2000; i++) { fs.full[u] = 0; L.feed(fs, fs.bag, { uid: u, fruitId: 'embergourd', body: {} }); }
  assert.ok(fs.build[u].grip <= 60 && fs.build[u].grip >= 59.9);
  const b = { legs: 60, lungs: 60, grip: 29, mind: 0, fins: 0, wings: 0 };
  const p = L.previewFeed({ build: b, uid: uidNeutral('mossplum'), fruitId: 'mossplum' });
  assert.ok(p.delta.mind <= 1);
});
test('diminishing returns by tier', () => { assert.equal(L.tierMult(0), 1); assert.equal(L.tierMult(25), 0.6); assert.equal(L.tierMult(45), 0.3); });
test('fins and wings only grow on fitting type or body shape', () => {
  const b = Object.fromEntries(L.PARTS.map((p) => [p, 0])), u = uidNeutral('saltlime');
  assert.equal(L.previewFeed({ build: b, uid: u, fruitId: 'saltlime', body: { types: ['fire'], shape: 'standard' } }).reason, 'misfit');
  assert.ok(L.previewFeed({ build: b, uid: u, fruitId: 'saltlime', body: { types: ['sea'] } }).ok);
  assert.ok(L.previewFeed({ build: b, uid: u, fruitId: 'saltlime', body: { types: ['fire'], shape: 'serpent' } }).ok);
  const w = L.previewFeed({ build: b, uid: uidNeutral('glidepod'), fruitId: 'glidepod', body: { types: ['earth'] } });
  assert.equal(w.reason, 'misfit');
  // Gary Oct 29: a mixed fruit with a misfit fins/wings part is refused completely too (no partial growth)
  const pg = L.previewFeed({ build: b, uid: uidNeutral('padgourd'), fruitId: 'padgourd', body: { types: ['earth'] } });
  assert.equal(pg.reason, 'misfit'); assert.ok(!pg.delta);
  assert.equal(L.partCap('wings', { types: ['earth'] }), 0);
  const fs = fresh(), uu = 'm1'; give(fs, 'glidepod', 1);
  assert.equal(L.feed(fs, fs.bag, { uid: uu, fruitId: 'glidepod', body: { types: ['earth'] } }).reason, 'misfit');
  assert.equal(fs.bag.count('fruit_glidepod'), 1); assert.equal(L.totalBuild(L.buildOf(fs, uu)), 0); assert.equal(L.fullOf(fs, uu), 0);
  assert.equal(FS['feeds.refuse_misfit'], 'This Kilumen refuses to eat the fruit.');
});
test('grow timers run on real time and practice speeds them up; harvest gives fruit', () => {
  const fs = fresh(); fs.bag.add('seedling_dashfig', 1); L.ensurePlots(fs);
  const t0 = 1_000_000; assert.ok(L.plant(fs, fs.bag, 0, 'dashfig', t0));
  assert.equal(L.plotStage(fs.plots[0], t0), 'sprout');
  assert.equal(L.harvest(fs, fs.bag, 0, t0 + 3600e3), null);
  const left = L.msLeft(fs.plots[0], t0); L.practiceBoost(fs); assert.equal(L.msLeft(fs.plots[0], t0), left - 3600e3);
  assert.equal(L.progress(fs.plots[0], t0 - 1e9), 0); // clock set back: never negative
  const h = L.harvest(fs, fs.bag, 0, t0 + 10 * 3600e3); assert.ok(h && h.n >= 2); assert.equal(fs.bag.count('fruit_dashfig'), h.n); assert.equal(fs.plots[0].fruit, null);
});
test('athleticStats is unchanged with feeds off, and gains the build bonus with feeds on', () => {
  const c = { uid: 'feedtest-1', species: 'tumbloam' };
  setAthleticBonus(null); const base = athleticStats(c);
  setAthleticBonus(() => L.statBonus({ legs: 60, grip: 20 })); const up = athleticStats(c);
  assert.equal(up.speed, Math.min(100, base.speed + 15)); assert.equal(up.power, base.power + 5);
  setAthleticBonus(null); assert.deepEqual(athleticStats(c), base);
});
test('Hollowpith reset lowers one part by up to 10', () => {
  const fs = fresh(), u = 'r1'; give(fs, 'hollowpith', 1); Object.assign(L.buildOf(fs, u), { grip: 25 });
  const r = L.feed(fs, fs.bag, { uid: u, fruitId: 'hollowpith', body: {}, resetPart: 'grip' }); assert.ok(r.ok); assert.equal(fs.build[u].grip, 15);
});

test('fruit and seedlings are bag items in the feeds pocket', () => {
  for (const id of L.FRUIT_IDS) { assert.equal(ITEMS[L.fruitItem(id)]?.pocket, 'feeds', id); assert.equal(ITEMS[L.seedItem(id)]?.pocket, 'feeds', id); }
  const b = new Bag({}); b.add('fruit_dashfig', 2); assert.deepEqual(b.pocket('feeds').map((x) => x.id), ['fruit_dashfig']);
});
test('only creatures that fought lose Fullness after a battle', () => {
  const before = [{ uid: 'a', hp: 30, energy: [5, 5], status: '' }, { uid: 'b', hp: 20, energy: [5], status: '' }, { uid: 'c', hp: 25, energy: [4], status: '' }];
  const after = [{ uid: 'a', hp: 22, energy: [4, 5] }, { uid: 'b', hp: 20, energy: [5] }, { uid: 'c', hp: 25, energy: [3] }];
  assert.deepEqual([...L.fightersOf(before, after)].sort(), ['a', 'c']);
  assert.deepEqual([...L.fightersOf(before, [])], ['a']); // the lead always counts
  assert.equal(L.DRAIN.shared, undefined);
});

// ---- v3 orchard backdrop (pure parts) -------------------------------------------------------------------------------
test('backdrop palette follows the clock: bright noon, starry night, smooth in between', async () => {
  const { paletteAt, hourNow } = await import('../src/feeds/backdrop.js');
  const noon = paletteAt(12), mid = paletteAt(0), dusk = paletteAt(19.7);
  assert.equal(noon.night, false); assert.equal(noon.star, 0); assert.ok(noon.sun > 0.9);
  assert.equal(mid.night, true); assert.ok(mid.star > 0.9);
  assert.ok(dusk.star > 0 && dusk.star < 1);
  for (let h = 0; h < 24; h += 0.25) { const p = paletteAt(h); for (const k of ['top', 'bot', 'far', 'mid', 'near', 'grass', 'light', 'glow']) assert.ok(p[k].every((v) => v >= 0 && v <= 255), `${k}@${h}`); }
  assert.deepEqual(paletteAt(24).top, paletteAt(0).top);
  globalThis.kilumen = { scene: { clock: { min: 1440 * 3 + 7 * 60 + 30 } } }; assert.equal(hourNow(), 7.5); delete globalThis.kilumen;
});
test('backdrop is own code, wired in, and honours reduced motion', () => {
  const src = readFileSync(new URL('../src/feeds/backdrop.js', import.meta.url), 'utf8');
  assert.match(src, /reducedMotion/); assert.match(src, /ui-reduce/); assert.match(src, /prefers-reduced-motion/);
  assert.doesNotMatch(src, /https?:\/\//); // no remote assets
  const idx = readFileSync(new URL('../src/feeds/index.js', import.meta.url), 'utf8');
  assert.match(idx, /bg\.mount\(/); assert.match(idx, /bg\?\.stop\(\)/);
  assert.match(readFileSync(new URL('../src/feeds/feed_view.js', import.meta.url), 'utf8'), /__fxbg\?\.burst\(\)/);
});

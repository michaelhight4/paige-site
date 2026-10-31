// Kilumen store, subscription, boost and ads (dev/kilumen-store, Gary Oct 31 2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { detectChannel, storeOn, adsOn } from '../src/store/channel.js';
import { Entitlements, memStorage, CACHE_KEY, PLAY_RECHECK_MS } from '../src/store/entitlements.js';
import { payDailyGold, grantKiluPack, boostXp, boostBonus, storeState } from '../src/store/perks.js';
import { AdTimer, unsafeReason } from '../src/store/ads.js';
import { KilumenStore, attachStore } from '../src/store/index.js';
import { testBilling, parseServerRows, stripeBilling } from '../src/store/billing.js';
import { PRODUCTS, ADS, KILU_PACK, STORE_FLAGS, SUB_SKU } from '../src/store/config.js';
import { RtBenefits } from '../src/systems/rt_benefits.js';
import { Systems } from '../src/systems/index.js';
import { RtBattle } from '../src/rtb/sim.js';

const DATA = JSON.parse(readFileSync(new URL('../data/rt_benefits.json', import.meta.url), 'utf8'));
const DAY = 24 * 3600e3, YEAR = 365 * DAY;
const clock = (t0 = 1.8e12) => { const c = { t: t0 }; c.now = () => c.t; return c; };
const ents = (c = clock(), o = {}) => new Entitlements({ storage: memStorage(), now: c.now, allowTest: true, ...o });
const wallet = () => ({ n: 0, add(x) { this.n += x; } });
const STEAM = { protocol: 'app:', hostname: 'kilumen', search: '?platform=pc', userAgent: 'Mozilla/5.0 Electron/31.0.0', desktopBridge: true };

function mkStore({ c = clock(), sub = false, buy = [], rt = null, scene = {}, flags = {}, ads = null } = {}) {
  const e = ents(c); const items = buy.map((sku) => ({ sku }));
  if (sub) items.push({ sku: SUB_SKU, expiresAt: c.t + YEAR });
  e.applyVerified(items, 'test');
  const sys = { state: {}, wallet: wallet(), rtBenefits: rt, party: { got: [], add(x) { this.got.push(x); } } };
  const sc = { clock: { day: 1 }, party: [{}], store: { extra: { saveId: 'save-A' } }, saveLockReason: () => null, ...scene };
  const st = new KilumenStore(sc, sys, { channel: { id: 'web', test: true }, billing: testBilling({ now: c.now }), ents: e, flags, now: c.now, doc: null, ads });
  st.makeKilu = (k) => ({ species: k.placeholder, level: 15 });
  return { st, sys, sc, e, c };
}

// ---- channels ----------------------------------------------------------------------------------------------------
test('channels: Android + paigegames.net get the store and ads; Steam / desktop / other hosts get neither', () => {
  assert.equal(detectChannel({ native: true }).id, 'android');
  assert.equal(detectChannel({ protocol: 'https:', hostname: 'www.paigegames.net' }).id, 'web');
  for (const env of [STEAM, { ...STEAM, desktopBridge: false }, { protocol: 'app:', hostname: 'kilumen' }, { protocol: 'https:', hostname: 'paigegames.net', userAgent: 'x Electron/31' },
    { protocol: 'https:', hostname: 'evil.example' }, { protocol: 'http:', hostname: 'localhost' }, {}]) {
    const ch = detectChannel(env); assert.ok(!storeOn(ch) && !adsOn(ch), JSON.stringify(env));
  }
  assert.equal(detectChannel({ protocol: 'https:', hostname: 'paigegames.net', search: '?store=test' }).test, false, 'live web can never switch to free test billing');
  assert.equal(detectChannel({ protocol: 'http:', hostname: 'localhost', search: '?store=test' }).test, true);
});

test('Steam: attachStore installs no shop, no ads, no boost, no wrappers', () => {
  const sys = { state: {} }; const s = attachStore({}, sys, { env: STEAM, browser: false });
  assert.equal(s.on, false); assert.equal(s.shopOn, false); assert.equal(s.adsOn, false); assert.equal(s.xpMult(), 1); assert.equal(s.moneyBonus(1000), 0);
  assert.equal(sys.store, s); assert.equal(s.channel, 'desktop');
  // phone menu: the store tile is filtered unless ui.scr_store was installed (only shop_screen.js does that, only on store channels)
  const ui = readFileSync(new URL('../src/ui/ui.js', import.meta.url), 'utf8');
  assert.match(ui, /k !== 'store' \|\| typeof this\.scr_store === 'function'/);
  const ad = s.ads; assert.equal(ad, undefined);
});

// ---- ads -------------------------------------------------------------------------------------------------------------
test('ad timer: due after 10 minutes of ACTIVE play only (idle and gaps do not count)', () => {
  const t = new AdTimer({ now: () => 0 }); let now = 0;
  const run = (ms, active = true) => { for (let i = 0; i < ms / 1000; i++) { now += 1000; if (active) t.input(now); t.tick(now); } };
  run(9 * 60e3); assert.equal(t.due, false);
  run(5 * 60e3, false); assert.ok(t.activeMs < 10 * 60e3, 'idle time after 60 s does not count');
  now += 3600e3; t.tick(now); assert.ok(t.activeMs < 10 * 60e3, 'a sleep / tab-away gap does not count');
  run(61e3); assert.equal(t.due, true); assert.equal(ADS.activeIntervalMs, 600000);
});

test('ad gating: never in battle, cutscene, dialogue, text entry or a menu / purchase', async () => {
  const doc = (tag) => ({ activeElement: tag ? { tagName: tag } : null, querySelector: () => null });
  assert.equal(unsafeReason({ scene: { saveLockReason: () => 'battle' } }), 'battle');
  assert.equal(unsafeReason({ scene: { saveLockReason: () => 'rtb' } }), 'battle');
  assert.equal(unsafeReason({ scene: { saveLockReason: () => 'trainer_approach' } }), 'battle');
  assert.equal(unsafeReason({ scene: { saveLockReason: () => 'script' } }), 'cutscene');
  assert.equal(unsafeReason({ scene: { saveLockReason: () => 'dialogue' } }), 'dialogue');
  assert.equal(unsafeReason({ ui: { active: true } }), 'menu');
  assert.equal(unsafeReason({ shopOpen: true }), 'purchase');
  assert.equal(unsafeReason({ doc: doc('INPUT') }), 'text entry');
  assert.equal(unsafeReason({ doc: doc('TEXTAREA') }), 'text entry');
  assert.equal(unsafeReason({ scene: { saveLockReason: () => null }, ui: { active: false }, doc: doc(null) }), null);
  const t = new AdTimer(); t.activeMs = 600000; let shows = 0; const show = async () => { shows++; return { shown: true }; };
  assert.equal((await t.maybeShow({ unsafe: 'battle', show })).shown, false); assert.equal(t.due, true, 'stays due until a safe moment');
  assert.equal((await t.maybeShow({ unsafe: null, show })).shown, true); assert.equal(shows, 1); assert.equal(t.due, false);
});

test('ads: one interstitial per 10 active minutes; no_ads or the subscription stop them', async () => {
  for (const [opt, expect] of [[{}, 1], [{ buy: ['no_ads'] }, 0], [{ sub: true }, 0]]) {
    let shows = 0; const ads = { interstitial: async () => { shows++; return { shown: true }; } };
    const { st, c } = mkStore({ ...opt, ads });
    for (let i = 0; i < 601; i++) { c.t += 1000; st.timer.input(c.t); await st.step(c.t); }
    assert.equal(shows, expect, JSON.stringify(opt));
  }
  let shows = 0; const { st, c, sc } = mkStore({ ads: { interstitial: async () => { shows++; return { shown: true }; } } });
  sc.saveLockReason = () => 'battle';
  for (let i = 0; i < 700; i++) { c.t += 1000; st.timer.input(c.t); await st.step(c.t); }
  assert.equal(shows, 0, 'not in battle'); sc.saveLockReason = () => null; c.t += 1000; await st.step(c.t); assert.equal(shows, 1, 'right after');
});
test('ad config: Google TEST ids, config-driven', () => {
  assert.match(JSON.stringify(ADS.admob), /ca-app-pub-3940256099942544/);
});

// ---- entitlements --------------------------------------------------------------------------------------------------
test('each product: entitlement works and is account-wide (cache survives a new save)', () => {
  const c = clock(), store = memStorage();
  const a = new Entitlements({ storage: store, now: c.now, allowTest: true });
  for (const sku of ['no_ads', 'daily_gold', 'board_unlock', 'kilu_pack']) { assert.equal(a.has(sku), false); a.grantVerified({ sku: sku }, 'test'); assert.equal(a.has(sku), true, sku); }
  assert.equal(a.adsRemoved(), true);
  const b = new Entitlements({ storage: store, now: c.now, allowTest: true }); // next boot / new save
  assert.deepEqual(b.snapshot().owned, ['board_unlock', 'daily_gold', 'kilu_pack', 'no_ads']);
  const raw = store.getItem(CACHE_KEY); store.setItem(CACHE_KEY, raw.replace('no_ads', 'no_adz'));
  assert.equal(new Entitlements({ storage: store, now: c.now, allowTest: true }).has('no_ads'), false, 'edited cache dropped');
  assert.equal(new Entitlements({ storage: memStorage(), now: c.now }).grantVerified?.({ sku: 'no_ads' }, 'client'), false, 'no client self-grant');
  assert.deepEqual(Object.keys(PRODUCTS).sort(), ['all_passes_yearly', 'board_unlock', 'daily_gold', 'kilu_pack', 'no_ads']);
  assert.equal(PRODUCTS.no_ads.price, '$5'); assert.equal(PRODUCTS.all_passes_yearly.price, '$12/year');
});

test('daily gold: 200 once per in-game day', () => {
  const e = ents(); e.grantVerified({ sku: 'daily_gold' }, 'test'); const w = wallet(), st = {};
  assert.equal(payDailyGold(st, 1, e, w), 200); assert.equal(payDailyGold(st, 1, e, w), 0); assert.equal(payDailyGold(st, 1, e, w), 0);
  assert.equal(payDailyGold(st, 2, e, w), 200); assert.equal(w.n, 400);
  assert.equal(payDailyGold({}, 3, ents(), w), 0, 'not owned');
});

test('board unlock: every non key-card node reads maxed, effects at max, reset still works, lapse restores the real board', () => {
  const c = clock(); const { st, e } = mkStore({ c, sub: true });
  const rt = new RtBenefits({ log: [], flags: new Set(), saveNow: () => true }, {}, DATA, { region: 8 });
  rt.company.xp = 1e9; rt.syncLevel();
  const n0 = rt.nodes.find((n) => !n.grantFlag && !n.requiresFlag);
  assert.ok(rt.buy(n0.id).ok); const real = rt.company.board[n0.id];
  st.sys.rtBenefits = rt; st._wireBoard();
  for (const n of rt.nodes) {
    const s = rt.state(n.id);
    if (!n.grantFlag && !n.requiresFlag) { assert.equal(s.state, 'owned', n.id); assert.equal(s.rank, s.max); assert.equal(rt.effect(n.id), Number(n.ranks.at(-1).value) || 0); }
  }
  assert.equal(rt.buy(n0.id).ok, false, 'nothing to buy');
  const before = rt.ledger(); assert.equal(before.spent > 0, true, 'ledger sees the real ranks');
  const r = rt.respec(); assert.ok(r.ok); assert.equal(r.refunded, before.spent - before.kept);
  assert.equal(rt.state(n0.id).state, 'owned', 'still maxed via the pass');
  c.t += 2 * YEAR; assert.equal(e.has('board_unlock'), false);
  assert.equal(rt.state(n0.id).rank, 0, 'lapse: real (reset) board shows'); assert.ok(real > 0);
});

test('kilu pack: nothing while the art flag is off; once per save when live', () => {
  assert.equal(STORE_FLAGS.kiluPackLive, false); assert.equal(KILU_PACK.length, 4);
  const e = ents(); e.grantVerified({ sku: 'kilu_pack' }, 'test');
  const make = (k) => ({ species: k.placeholder, level: 15 }); const got = [];
  const st = {};
  assert.deepEqual(grantKiluPack(st, 'A', e, { live: false, make, add: (x) => got.push(x) }), []);
  assert.equal(grantKiluPack(st, 'A', e, { live: true, make, add: (x) => got.push(x) }).length, 4);
  assert.equal(grantKiluPack(st, 'A', e, { live: true, make, add: (x) => got.push(x) }).length, 0, 'same save: once');
  assert.equal(grantKiluPack(st, 'B', e, { live: true, make, add: (x) => got.push(x) }).length, 4, 'new save: again');
  assert.ok(got.every((k) => k.level === 15)); assert.equal(got.length, 8);
  const { st: s2, sys } = mkStore({ buy: ['kilu_pack'], flags: { kiluPackLive: true } });
  s2.applyPerks(); s2.applyPerks(); assert.equal(sys.party.got.length, 4);
});

test('subscription: unlocks all four while active; lapse keeps once-purchases and granted gold / Kilu', () => {
  const c = clock(); const { st, sys, e, sc } = mkStore({ c, sub: true, buy: ['no_ads'], flags: { kiluPackLive: true } });
  for (const sku of ['no_ads', 'daily_gold', 'board_unlock', 'kilu_pack']) assert.equal(e.has(sku), true, sku);
  st.applyPerks(); assert.equal(sys.wallet.n, 200); assert.equal(sys.party.got.length, 4);
  c.t += YEAR + DAY; sc.clock.day = 2; st.applyPerks();
  assert.equal(e.subActive(), false); assert.equal(e.has('no_ads'), true, 'bought once: kept');
  for (const sku of ['daily_gold', 'board_unlock', 'kilu_pack']) assert.equal(e.has(sku), false, sku);
  assert.equal(sys.wallet.n, 200, 'gold already paid stays, no new daily gold'); assert.equal(sys.party.got.length, 4, 'Kilu stay');
  // Play: active sub without expiry lapses offline after the re-check window
  const e2 = ents(c); e2.applyVerified([{ sku: SUB_SKU }], 'play'); assert.equal(e2.subActive(), true); c.t += PLAY_RECHECK_MS + 1; assert.equal(e2.subActive(), false);
  assert.equal(PRODUCTS[SUB_SKU].basePlan, 'yearly'); assert.equal(PRODUCTS[SUB_SKU].perMonth, '$1');
});

test('boost: +25% XP and money while subscribed, stacks with trainer XP, stops on lapse', () => {
  const c = clock(); const { st, e } = mkStore({ c, sub: true });
  assert.equal(st.xpMult(), 1.25); assert.equal(boostXp(100, e), 125); assert.equal(boostBonus(1000, e), 250);
  // Systems money: innermost, so rt_payout etc. stack on top
  const w = wallet(); const fake = { store: st, wallet: w };
  assert.equal(Systems.prototype._storeMoney.call(fake, 400), 100); assert.equal(w.n, 100);
  // trainer XP stack: KilumenBattle xpBoost = unit_training x store mult (ui_sd.js); RT battles get xpMult
  const sd = readFileSync(new URL('../src/battle/ui_sd.js', import.meta.url), 'utf8');
  assert.match(sd, /xpBoost: \(sys\?\.rtBenefits\?\.effect\?\.\('unit_training'\) \|\| 1\) \* \(sys\?\.store\?\.xpMult\?\.\(\) \|\| 1\)/);
  const simSrc = readFileSync(new URL('../src/rtb/sim.js', import.meta.url), 'utf8'), rtbSrc = readFileSync(new URL('../src/rtb/index.js', import.meta.url), 'utf8');
  assert.equal((simSrc.match(/\* this\.xpMult\)/g) || []).length, 2, 'both RT XP paths use xpMult'); assert.match(rtbSrc, /xpMult: scene\.systems\?\.store\?\.xpMult\?\.\(\) \|\| 1/);
  assert.equal(typeof RtBattle, 'function');
  c.t += 2 * YEAR;
  assert.equal(st.xpMult(), 1); assert.equal(boostXp(100, e), 100); assert.equal(boostBonus(1000, e), 0);
  assert.equal(Systems.prototype._storeMoney.call(fake, 400), 0);
});

test('web billing: Stripe test mode only; server rows parse', async () => {
  const api = { url: 'u', key: 'k', session: async () => ({ token: 't' }), fetch: async () => ({ ok: true, status: 200, json: async () => ({ url: 'https://checkout.stripe.com/x', mode: 'live' }) }) };
  let went = null; const r = await stripeBilling(api).buy('no_ads', { redirect: (u) => { went = u; } });
  assert.equal(r.ok, false); assert.equal(went, null, 'never redirects to a live checkout');
  api.fetch = async () => ({ ok: true, status: 200, json: async () => ({ url: 'https://checkout.stripe.com/t', mode: 'test' }) });
  assert.equal((await stripeBilling(api).buy('no_ads', { redirect: (u) => { went = u; } })).ok, true); assert.ok(went);
  assert.deepEqual(parseServerRows([{ product_id: 'kilumen:no_ads' }, { product_id: 'kilumen:all_passes_yearly', expires_at: '2030-01-01T00:00:00Z' }, { product_id: 'lifeline:x' }]).map((x) => x.sku), ['no_ads', SUB_SKU]);
});

test('channel reads the boot query that alpha.js keeps before it strips the address bar', async () => {
  const { currentEnv, detectChannel } = await import('../src/store/channel.js?v=v0.2.108-alpha');
  const g = { location: { protocol: 'http:', hostname: 'localhost', search: '' }, navigator: { userAgent: 'x' }, __kilumenBootSearch: '?store=test' };
  assert.equal(detectChannel(currentEnv(g)).id, 'web');
  const live = { location: { protocol: 'https:', hostname: 'paigegames.net', search: '' }, navigator: { userAgent: 'x' }, __kilumenBootSearch: '?store=test' };
  assert.equal(detectChannel(currentEnv(live)).test, false);
  const fs = await import('node:fs');
  assert.match(fs.readFileSync(new URL('../src/alpha.js', import.meta.url), 'utf8'), /__kilumenBootSearch = location\.search/);
});

// NATIVE BRIDGE (Android Capacitor wrapper, package com.pagegames.lifeline).
// On plain web this file does nothing: the PlaceholderAdsAdapter and the free TEST toggles stay in place.
// Inside the Android app, Capacitor injects window.Capacitor with native plugin proxies:
//   Capacitor.Plugins.AdMob            (@capacitor-community/admob) -> real rewarded ads
//   Capacitor.Plugins.LifelineBilling  (custom Java plugin)          -> Google Play Billing
// Ad unit ids are NOT here: they come from the app's admob.properties via LifelineBilling.getConfig(), so swapping test -> real ids needs no site update.
import { setAdsAdapter } from './adapter_ads.js';
import * as Premium from './premium.js';

const cap = () => (typeof window !== 'undefined' ? window.Capacitor : null);
export const isNativeApp = () => { const c = cap(); return !!(c && c.isNativePlatform && c.isNativePlatform() && c.Plugins && c.Plugins.LifelineBilling); };
const plug = (n) => cap().Plugins[n];
const SUB_ID = () => Premium.catalog().subscription.id; // 'all_access' (base plans 'monthly', 'yearly')
const PLAN_KEY = 'lifesim.native.subplan';
// One-time Play product handed out with promo codes. Unlocks exactly the passes that existed when it was created (hardcoded on purpose:
// NOT the subscription and NOT passes added later).
export const TESTER_PACK_ID = 'tester_pack';
export const TESTER_PACK_PASSES = ['einstein', 'midas', 'nepo', 'baller', 'free_realestate', 'sports_owner', 'golden_gun', 'fountain', 'rabbit', 'tax_evasion', 'no_ads', 'creator', 'autopilot'];

// Rewarded ads via AdMob. completed:true ONLY after the SDK's onUserEarnedReward (plugin event 'onRewardedVideoAdReward').
export class AdMobAdsAdapter {
  constructor({ adUnitId, testing }) { this.name = 'admob'; this.adUnitId = adUnitId; this.testing = !!testing; this.ready = null; }
  init() {
    if (!this.ready) this.ready = (async () => {
      const A = plug('AdMob');
      await A.initialize({ initializeForTesting: this.testing });
      try { const ci = await A.requestConsentInfo(); if (ci && ci.isConsentFormAvailable && ci.status === 'REQUIRED') await A.showConsentForm(); } catch (e) { /* consent form optional outside EEA/UK */ }
    })().catch((e) => { this.ready = null; throw e; });
    return this.ready;
  }
  async show(req) {
    const A = plug('AdMob'), t0 = Date.now(), hs = [];
    try { await this.init(); } catch (e) { return { completed: false, watchedMs: 0, reason: 'ads init failed' }; }
    return new Promise(async (resolve) => {
      let earned = false, done = false;
      const end = (reason) => { if (done) return; done = true; hs.forEach((h) => h && h.remove && h.remove());
        const el = Date.now() - t0; resolve(earned ? { completed: true, watchedMs: Math.max(el, req.requiredMs || 0) } : { completed: false, watchedMs: el, reason }); };
      const on = async (ev, fn) => { try { hs.push(await A.addListener(ev, fn)); } catch (e) { /* ignore */ } };
      await on('onRewardedVideoAdReward', () => { earned = true; });
      await on('onRewardedVideoAdDismissed', () => end('closed early'));
      await on('onRewardedVideoAdFailedToLoad', () => end('no ad available'));
      await on('onRewardedVideoAdFailedToShow', () => end('ad failed to show'));
      try { await A.prepareRewardVideoAd({ adId: this.adUnitId, isTesting: this.testing }); await A.showRewardVideoAd(); }
      catch (e) { end('no ad available'); }
    });
  }
}

// Google Play Billing. Play is the source of truth: restore() rewrites the local Premium flags to match what Play reports.
export const billing = {
  products: null,
  async load() {
    if (this.products) return this.products;
    const r = await plug('LifelineBilling').getProducts({ inapp: [...Premium.passes().map((p) => p.id), TESTER_PACK_ID], subs: [SUB_ID()] });
    this.products = r.products || []; return this.products;
  },
  async purchasePass(id) {
    await this.load(); const r = await plug('LifelineBilling').purchase({ productId: id });
    if (r.ok || r.reason === 'already_owned') { Premium.setOwned(id, true); return { ok: true }; } return r;
  },
  async subscribe(plan) {
    await this.load(); const r = await plug('LifelineBilling').purchase({ productId: SUB_ID(), basePlanId: plan });
    if (r.ok || r.reason === 'already_owned') { try { localStorage.setItem(PLAN_KEY, plan); } catch (e) { /* */ } Premium.setSubscription(plan); return { ok: true }; } return r;
  },
  async manage() { await plug('LifelineBilling').manageSubscriptions({ productId: SUB_ID() }); return { ok: true }; },
  async restore() {
    const r = await plug('LifelineBilling').restore(); if (!r.ok) return r; // offline / Play unavailable: keep local flags
    const own = new Set(r.passes || []);
    if (own.has(TESTER_PACK_ID)) TESTER_PACK_PASSES.forEach((id) => own.add(id)); // promo-code pack -> all current passes
  for (const p of Premium.passes()) if (Premium.passDef(p.id) && Premium.owned(p.id) !== own.has(p.id)) Premium.setOwned(p.id, own.has(p.id));
    const sub = (r.subs || []).find((s) => s.id === SUB_ID());
    let plan = 'monthly'; try { plan = localStorage.getItem(PLAN_KEY) || plan; } catch (e) { /* */ }
    Premium.setSubscription(sub ? plan : null); // re-synced every launch, so the local 'until' is only a cache
    return { ok: true, passes: [...own].filter((id) => id !== TESTER_PACK_ID), subscription: sub ? { plan } : null };
  },
};

// Call BEFORE bootAdapter(): swaps the placeholder ad adapter for AdMob. No-op on web.
export async function installNativeAds() {
  if (!isNativeApp()) return false;
  try {
    const cfg = await plug('LifelineBilling').getConfig();
    const a = new AdMobAdsAdapter({ adUnitId: cfg.rewardedAdUnitId, testing: cfg.testAds });
    setAdsAdapter(a); a.init().catch(() => {});
    return true;
  } catch (e) { console.warn('native ads unavailable', e); return false; }
}

// Call AFTER bootAdapter(): routes the Store screen's premium actions through Play Billing. No-op on web.
export function installNativeBilling(impl) {
  if (!isNativeApp() || !impl) return false;
  const get = impl.getPremium.bind(impl);
  impl.getPremium = () => ({ ...get(), test: false, paymentsAvailable: true, platform: 'google_play' });
  impl.setPremiumFlag = async (id, on) => { if (on && !Premium.owned(id)) await billing.purchasePass(id); return impl.getPremium(); };
  impl.setSubscription = async (plan) => { if (plan) await billing.subscribe(plan); else await billing.manage(); return impl.getPremium(); };
  impl.resetPremium = async () => { await billing.restore(); return impl.getPremium(); }; // "Restore purchases" in the app
  billing.restore().catch(() => {}); // on every launch: carries passes + tester_pack over on reinstall
  // promo codes redeemed in the Play Store while the app is open arrive as an update event -> re-sync
  try { plug('LifelineBilling').addListener('purchasesUpdated', () => billing.restore().catch(() => {})); } catch (e) { /* */ }
  return true;
}

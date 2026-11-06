// NATIVE BRIDGE (Capacitor Boundwake — package com.pagegames.boundwake).
// Web: no-op. Cap android/ios: AdMob + Play Billing / StoreKit plug points.
// Ad unit ids MUST come from native config (admob.properties / Info.plist), never hard-coded here.
//
// TODO(Gary): create AdMob apps + unit ids for Boundwake (separate from Lifeline).
// TODO(Coder): add @capacitor-community/admob + BoundwakeBilling plugin mirroring LifelineBilling.
import { setAdsAdapter } from './adapter_ads.js';
import * as Premium from './premium.js';

const cap = () => (typeof window !== 'undefined' ? window.Capacitor : null);
export const isNativeApp = () => {
  const c = cap();
  return !!(c && c.isNativePlatform && c.isNativePlatform());
};

/**
 * AdMob adapter skeleton — same contract as Lifeline AdMobAdsAdapter.
 * Wire when Cap plugins land; until then PlaceholderAdsAdapter stays.
 */
export class AdMobAdsAdapter {
  constructor({ adUnitId, interstitialId, testing }) {
    this.name = 'admob';
    this.adUnitId = adUnitId;
    this.interstitialId = interstitialId || null;
    this.testing = !!testing;
    this.ready = null;
  }
  init() {
    // TODO: Capacitor.Plugins.AdMob.initialize({ initializeForTesting: this.testing })
    this.ready = Promise.resolve();
    return this.ready;
  }
  async show(req) {
    // TODO: prepareRewardVideoAd / prepareInterstitial + show; completed only on reward/dismiss
    console.warn('[Boundwake] AdMobAdsAdapter.show stub', req?.kind, req?.placement);
    return { completed: false, watchedMs: 0, reason: 'AdMob not wired — see docs/STORE_PUSH.md' };
  }
}

/** Call BEFORE UI boot on native. No-op on web. */
export async function installNativeAds() {
  if (!isNativeApp()) return false;
  try {
    // TODO: const cfg = await Capacitor.Plugins.BoundwakeBilling.getConfig();
    // const a = new AdMobAdsAdapter({ adUnitId: cfg.rewardedAdUnitId, interstitialId: cfg.interstitialAdUnitId, testing: cfg.testAds });
    // setAdsAdapter(a); await a.init();
    console.info('[Boundwake] installNativeAds: plug points ready; AdMob not installed yet');
    return false;
  } catch (e) {
    console.warn('native ads unavailable', e);
    return false;
  }
}

/** Call after boot: route Store buys through Play/Apple. */
export function installNativeBilling() {
  if (!isNativeApp()) return false;
  // TODO: restore purchases → Premium.setOwned for each owned product id
  console.info('[Boundwake] installNativeBilling stub — restore on launch when plugin exists');
  return false;
}

export const TESTER_PACK_ID = 'tester_pack';
export function expandTesterPack() {
  if (Premium.owned(TESTER_PACK_ID)) Premium.setOwned(TESTER_PACK_ID, true);
}

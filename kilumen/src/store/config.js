// Kilumen store + ads config (dev/kilumen-store, Gary 2:15 PM CT Oct 31 2026). Pure data, no DOM.
// Everything Gary has to swap later (real ad unit ids, Play product ids, Stripe price keys) lives here or in the native
// BuildConfig (Android: KilumenBillingPlugin.getConfig), never inline in the game code.
import { GOOGLE_TEST_ADMOB } from '../vendor/paige-shared/ads/types.js?v=v0.2.108-alpha';

export const GAME_ID = 'kilumen';

/** One-time purchases are account-wide (every save, now and later). Prices are display only: Play / Stripe charge. */
export const PRODUCTS = Object.freeze({
  no_ads: { sku: 'no_ads', kind: 'once', price: '$5', usd: 5 },
  daily_gold: { sku: 'daily_gold', kind: 'once', price: '$2', usd: 2 },
  board_unlock: { sku: 'board_unlock', kind: 'once', price: '$2', usd: 2 },
  kilu_pack: { sku: 'kilu_pack', kind: 'once', price: '$4', usd: 4 },
  all_passes_yearly: { sku: 'all_passes_yearly', kind: 'sub', price: '$12/year', perMonth: '$1', usd: 12, basePlan: 'yearly' },
});
export const ONCE_SKUS = Object.freeze(['no_ads', 'daily_gold', 'board_unlock', 'kilu_pack']);
export const SUB_SKU = 'all_passes_yearly';
/** What the subscription unlocks while active (all four one-time entitlements). */
export const SUB_GRANTS = ONCE_SKUS;

/** Server product keys (paige-shared checkout_core.js PRODUCTS format game:sku[:interval]). NOT in the server list yet. */
export const stripeKey = (sku) => (sku === SUB_SKU ? `${GAME_ID}:${SUB_SKU}:year` : `${GAME_ID}:${sku}`);
/** Google Play product ids = the sku (Play Console: in-app products no_ads ...; subscription all_passes_yearly, base plan 'yearly'). */
export const playId = (sku) => sku;

export const PERKS = Object.freeze({
  dailyGold: 200,          // daily_gold: per in-game day
  boost: 0.25,             // subscription: +25% XP and money
  kiluLevel: 15,           // kilu_pack: level of the four pack Kilu
});

/** Kilu pack (purchase-only). Gary asked for Dragonoid / Mystical / Sky / Magma. The element chart (src/battle/data/elements.js)
 *  has 'dragos' (Dragonoid), 'mystic' and 'magma'; there is NO 'sky' element ('wind' and 'bird' are the closest).
 *  The four designs are concepts only (design/store_kilu/concept_sheet.png), NOT wired in until Gary approves:
 *  `placeholder` is an existing species of that element so the flow can be tested behind the flag. */
export const KILU_PACK = Object.freeze([
  { slot: 'dragonoid', el: 'dragos', concept: 'store_dragos', placeholder: 'spratwyrm' },
  { slot: 'mystical', el: 'mystic', concept: 'store_mystic', placeholder: 'runeskein' },
  { slot: 'sky', el: 'wind', concept: 'store_sky', placeholder: 'sailquill', note: "no 'sky' element: wind proposed" },
  { slot: 'magma', el: 'magma', concept: 'store_magma', placeholder: 'slagrook' },
]);

/** Ads: one interstitial per 10 minutes of ACTIVE play, only at a safe moment. Ids are Google's TEST units until Gary
 *  sends real ones (Android: BuildConfig ADMOB_* from the native plugin override these). */
export const ADS = Object.freeze({
  activeIntervalMs: 10 * 60 * 1000,
  idleAfterMs: 60 * 1000,       // no input for a minute = not active play (time stops counting)
  maxFrameGapMs: 2000,          // a hidden tab / sleep does not count as play
  admob: { enabled: true, testing: true, appId: GOOGLE_TEST_ADMOB.appId, bannerId: '', interstitialId: GOOGLE_TEST_ADMOB.interstitialId, rewardedId: '' },
  web: { enabled: true, testMode: true, publisherId: 'ca-pub-3732476962662887', allowedHosts: ['paigegames.net', 'www.paigegames.net'], bannerSlot: '' },
  rules: { interstitialSessionGraceMs: 0, interstitialMinGapMs: 0, rewardedPerDay: 0 }, // the 10-min active timer is the cap
  placements: { banner: false, interstitial: true, rewarded: false },
  privacyPolicyUrl: 'https://paigegames.net/privacy.html',
});

/** Feature flags (URL ?store.<flag>=1 or opts). kiluPackLive stays false until Gary approves the art. */
export const STORE_FLAGS = Object.freeze({ kiluPackLive: false });

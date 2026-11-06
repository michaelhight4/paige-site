// Boundwake ads policy. No SDK here — show() goes through adapter_ads.js.
// Forced interstitial every 8–15 cage years on android/ios; No Ads / Realm Pass suppress.
import * as Premium from './premium.js';
import { getAdsAdapter } from './adapter_ads.js';

const KEY = 'bw.ads.v1';
const mem = { v: null };
let _cfg = {
  platform: 'web',
  platforms: {
    web: { ads: false, forced: false },
    android: { ads: true, forced: true },
    ios: { ads: true, forced: true },
    itch: { ads: false, forced: false },
  },
  requiredMs: 5000,
  randomPrompt: { minYears: 8, maxYears: 15, firstAfter: 8 },
  rewards: { gold: 25, stats: ['health', 'happiness', 'smarts', 'looks', 'fame'], statPoints: 3 },
};

export function setConfig(c) { if (c && c.platforms) _cfg = c; return _cfg; }
export const config = () => _cfg;

const ls = () => { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (_) { return null; } };
const blank = () => ({ v: 1, platform: null, used: {} });
export function load() {
  const st = ls(); let r = null;
  try { r = st ? JSON.parse(st.getItem(KEY)) : mem.v; } catch (_) { r = null; }
  return r && r.used ? r : blank();
}
function save(f) { const st = ls(); try { if (st) st.setItem(KEY, JSON.stringify(f)); else mem.v = f; } catch (_) { mem.v = f; } return f; }
export const resetState = () => save(blank());

let platformOverride = null;
export const setPlatformOverride = (p) => { platformOverride = p && config().platforms?.[p] ? p : null; };
export const platform = () => platformOverride || load().platform || config().platform || 'web';
export function setPlatform(p) { const f = load(); f.platform = config().platforms?.[p] ? p : null; save(f); }
export const rules = () => config().platforms?.[platform()] || { ads: false, forced: false };
export const requiredMs = () => config().requiredMs || 5000;

export const noAds = () => Premium.isUnlocked('no_ads') || Premium.subscribed();
export const showsAds = () => !!rules().ads && !noAds();
/** Forced ads only on store platforms with forced:true and without No Ads. */
export const promptsEnabled = () => !!rules().forced && !noAds();

let rng = Math.random; export const setRng = (f) => { rng = f || Math.random; };
const rint = (a, b) => a + Math.floor(rng() * (b - a + 1));

export async function showForced({ placement = 'forced_interval' } = {}) {
  if (!promptsEnabled()) return { shown: false, reason: 'no_ads_or_platform' };
  try {
    const r = await getAdsAdapter().show({ placement, kind: 'interstitial', requiredMs: requiredMs() });
    return { shown: !!(r && r.completed), reason: r && r.reason };
  } catch (_) { return { shown: false, reason: 'failed to load' }; }
}

export const ensure = (s) => { if (!s.ads) s.ads = { played: 0, next: null, due: false, prompts: 0 }; return s.ads; };
export function schedule(s) {
  const A = ensure(s), P = config().randomPrompt || { minYears: 8, maxYears: 15 };
  A.next = A.played + rint(P.minYears, P.maxYears); A.due = false; return A.next;
}
export function yearPassed(s) {
  const A = ensure(s), P = config().randomPrompt || { minYears: 8, maxYears: 15, firstAfter: 8 };
  A.played++;
  if (A.next == null) A.next = Math.max(P.firstAfter || 8, rint(P.minYears, P.maxYears));
  if (A.played >= A.next && A.played >= (P.firstAfter || 8) && !A.due && promptsEnabled()) A.due = true;
  else if (A.played >= A.next && !promptsEnabled() && !A.due) schedule(s);
  return !!A.due;
}
export function dismissPrompt(s) { const A = ensure(s); A.prompts++; A.due = false; return schedule(s); }

export async function authorize(key, { placement = key } = {}) {
  if (noAds()) return { ok: true, mode: 'direct' };
  if (!rules().ads) return { ok: false, reason: 'Ads not on this platform', mode: 'locked' };
  const need = requiredMs();
  let res;
  try { res = await getAdsAdapter().show({ placement, kind: 'rewarded', requiredMs: need, reward: key }); }
  catch (_) { return { ok: false, mode: 'ad', reason: 'The ad failed to load.' }; }
  if (!res || res.completed !== true || !(res.watchedMs >= need)) {
    return { ok: false, mode: 'ad', reason: 'Ad not finished: no reward.', incomplete: true };
  }
  return { ok: true, mode: 'ad', watchedMs: res.watchedMs };
}

export const enabled = () => !noAds() && promptsEnabled();

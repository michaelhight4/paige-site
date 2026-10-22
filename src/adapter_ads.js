// ADS ADAPTER INTERFACE. The game never talks to an ad SDK directly; src/ads.js (policy) calls `getAdsAdapter().show(request)`.
//
//   show({ placement, kind: 'rewarded' | 'interstitial', requiredMs, reward })   (interstitial = forced ad every 8-15 years, no reward)
//   show({ placement, kind: 'rewarded', requiredMs, reward }) -> Promise<{ completed: boolean, watchedMs: number, reason?: string }>
//
// Contract: resolve `completed: true` ONLY when the ad ran for its full required duration (for AdMob: the RewardedAd `onUserEarnedReward`
// callback fired). Skipped / closed early / failed to load -> `completed: false`. The policy layer ALSO re-checks `watchedMs >= requiredMs`,
// so a buggy adapter cannot grant a reward for a partial view.
//
// Web build: PlaceholderAdsAdapter. It shows a fake ad screen with a 5 second countdown (ui/js/ads_ui.js registers the presenter). The screen has no
// skip or close button until the countdown is complete. Headless/Node: no presenter -> a plain timer of `requiredMs` (tests inject their own adapter).
//
// Android wrapper stage (AdMob): implement the same `show` with RewardedAd.load/show, then `setAdsAdapter(new AdMobAdsAdapter(...))` before the game boots
// (e.g. `window.LIFESIM_ADS_ADAPTER = ...` read by ui/js/app.js, or a Capacitor/WebView bridge that resolves the promise from onUserEarnedReward).
export class PlaceholderAdsAdapter {
  constructor() { this.name = 'placeholder'; this.presenter = null; }
  setPresenter(fn) { this.presenter = fn; }
  async show(req) {
    if (this.presenter) return this.presenter(req);
    const t0 = Date.now(); await new Promise((r) => setTimeout(r, req.requiredMs)); return { completed: true, watchedMs: Date.now() - t0 };
  }
}
let current = new PlaceholderAdsAdapter();
export const getAdsAdapter = () => current;
export const setAdsAdapter = (a) => { if (!a || typeof a.show !== 'function') throw new Error('ads adapter needs show(request)'); current = a; return current; };
export const placeholder = () => (current instanceof PlaceholderAdsAdapter ? current : null);

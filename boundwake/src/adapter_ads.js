// ADS ADAPTER INTERFACE. Policy (src/ads.js) calls getAdsAdapter().show(request).
// Web: PlaceholderAdsAdapter (fake countdown or timer). Cap android/ios: setAdsAdapter(AdMobAdsAdapter) from native_bridge.js.
//
// show({ placement, kind: 'rewarded'|'interstitial', requiredMs, reward? })
//   -> Promise<{ completed: boolean, watchedMs: number, reason?: string }>
// completed:true ONLY after full required duration / AdMob onUserEarnedReward.
export class PlaceholderAdsAdapter {
  constructor() { this.name = 'placeholder'; this.presenter = null; }
  setPresenter(fn) { this.presenter = fn; }
  async show(req) {
    if (this.presenter) return this.presenter(req);
    const t0 = Date.now();
    const ms = Math.max(0, req?.requiredMs || 0);
    await new Promise((r) => setTimeout(r, ms));
    return { completed: true, watchedMs: Date.now() - t0 };
  }
}
let current = new PlaceholderAdsAdapter();
export const getAdsAdapter = () => current;
export const setAdsAdapter = (a) => {
  if (!a || typeof a.show !== 'function') throw new Error('ads adapter needs show(request)');
  current = a;
  return current;
};
export const placeholder = () => (current instanceof PlaceholderAdsAdapter ? current : null);

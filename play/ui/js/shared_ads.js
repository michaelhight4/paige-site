// Lifeline ads on the shared Paige ads stack (vendor/paige-shared/ads). Replaces the old placeholder presenter.
//  - AdsController (shared policy: interstitial min gap, rewarded caps) + provider:
//      web: shared WebAdsProvider (AdSense / H5 adBreak) ONLY once a ca-pub id is set in WEB_ADS below (test mode = Google test ads);
//      otherwise LifelinePreviewProvider (TEST ad screen, no real ads, never money).
//  - Android app: native_bridge installs AdMob first; then placeholder() is null and this module stays out of the way.
//  - Banner: OFF by default. Shown only with ?ads=preview (or a web banner slot id), in an IN-FLOW slot under the top bar,
//    so it can never cover the bottom nav, the AGE button or any control. The bottom nav is untouched.
//  - Ads are removed by Lifeline's No Ads / All Access (Lifeline only) or the network Ad-Free for Life (src/network.js).
import { store, h, sheet } from './ui.js';
import { placeholder, setAdsAdapter } from '../../src/adapter_ads.js';
import { AdsController } from '../../vendor/paige-shared/ads/controller.js';
import { WebAdsProvider, webAdsAllowed } from '../../vendor/paige-shared/ads/providers/web.js';
import { mountAdsSettings, mountBanner, adsRow } from '../../vendor/paige-shared/ads/ui.js';
import { lifelineAdsRemoved, adFreeLife } from '../../src/network.js';
import * as Premium from '../../src/premium.js';

// Gary supplies publisherId (ca-pub-...) + bannerSlot; until then web ads stay off and the TEST screen is used.
export const WEB_ADS = { enabled: false, publisherId: '', bannerSlot: '', allowedHosts: ['paigegames.net', 'www.paigegames.net', 'michaelhight4.github.io'], testMode: true, rewardName: 'lifeline-reward' };
const q = () => { try { return new URLSearchParams(location.search); } catch (e) { return new URLSearchParams(); } };
const CONFIG = {
  admob: { enabled: false, testing: true, bannerId: '', interstitialId: '', rewardedId: '' }, // Android AdMob lives in src/native_bridge.js
  web: WEB_ADS,
  placements: { banner: q().get('ads') === 'preview' || !!WEB_ADS.bannerSlot, interstitial: true, rewarded: true },
  rules: { interstitialMinGapMs: 120000, interstitialSessionGraceMs: 0, rewardedPerDay: 999 }, // Lifeline's own cadence (8-15 years / 20 min) still decides WHEN
  privacyPolicyUrl: 'privacy.html',
  testPreview: true,
};

/** TEST ad screen in Lifeline's style (no skip/close until the countdown ends). Same data-el hooks as before. */
export class LifelinePreviewProvider {
  constructor() { this.name = 'preview'; this.domBanner = true; this.needMs = 5000; }
  async init() {} async showBanner() { return 50; } async hideBanner() {}
  consentAvailable() { return true; }
  async openConsent() { await sheet({ title: 'Ad privacy choices', body: 'Test build: real ads are not on yet. When they are, Google\'s consent form opens here (EU/UK) so you can choose how ads may use your data.', buttons: [{ label: 'OK', cls: 'go' }] }); return 'not_required'; }
  screen(kind) {
    return new Promise((resolve) => {
      const t0 = performance.now(), need = this.needMs, forced = kind === 'interstitial';
      const cnt = h('div', { class: 'ad-count', 'data-el': 'ad-count', text: String(Math.ceil(need / 1000)) }), fill = h('i', { style: { width: '0%' } });
      const msg = h('div', { class: 'hint', 'data-el': 'ad-msg', text: forced ? 'The game continues when the ad ends. No Ads removes these in Lifeline; Ad-Free for Life removes them everywhere.' : 'Your reward unlocks when the ad ends. It cannot be skipped.' });
      const box = h('div', { class: 'ad-box' }, h('div', { class: 'ad-tag', text: 'TEST AD · no real ad' }), h('h3', { text: 'Your sponsor message' }), h('p', { class: 'hint', text: forced ? 'Real full-screen ads replace this screen later.' : 'Real rewarded videos replace this screen later.' }), cnt, h('div', { class: 'ad-prog' }, fill), msg);
      const ov = h('div', { class: 'overlay ad-screen', 'data-el': 'ad-screen', role: 'dialog', 'aria-label': 'Advertisement' }, box); store.root.append(ov);
      const iv = setInterval(() => {
        const el = performance.now() - t0; fill.style.width = Math.min(100, el / need * 100) + '%';
        if (el < need) { cnt.textContent = String(Math.ceil((need - el) / 1000)); return; }
        clearInterval(iv); cnt.textContent = '✓'; msg.textContent = forced ? 'Thanks for supporting the game!' : 'Thanks for watching!';
        box.append(h('button', { class: 'btn go block', 'data-el': 'ad-claim', onclick: () => { ov.remove(); resolve({ shown: true, rewarded: !forced }); } }, forced ? 'Continue' : 'Claim reward'));
      }, 100);
    });
  }
  showInterstitial() { return this.screen('interstitial'); }
  showRewarded() { return this.screen('rewarded'); }
}

let ctl = null;
export const adsController = () => ctl;
/** Lifeline ads adapter contract: show(req) -> { completed, watchedMs } (see src/adapter_ads.js). */
export class SharedAdsAdapter {
  constructor(c) { this.name = 'shared:' + c.provider.name; this.ctl = c; }
  async show(req) {
    const t0 = Date.now(), p = this.ctl.provider; if (p.name === 'preview') p.needMs = req.requiredMs;
    try {
      if (req.kind === 'rewarded') { const r = await this.ctl.rewarded({ ignoreDailyCap: true }); return { completed: !!r.rewarded, watchedMs: r.rewarded ? Math.max(req.requiredMs, Date.now() - t0) : Date.now() - t0, reason: r.reason }; }
      const r = await this.ctl.interstitial({}); return { completed: !!r.shown, watchedMs: Date.now() - t0, reason: r.reason };
    } catch (e) { return { completed: false, watchedMs: Date.now() - t0, reason: 'error' }; }
  }
}
export function installSharedAds() {
  if (!placeholder()) return null; // native AdMob (or a test adapter) already installed
  const provider = webAdsAllowed(WEB_ADS) ? new WebAdsProvider(WEB_ADS) : new LifelinePreviewProvider();
  ctl = new AdsController({ game: 'lifeline', config: CONFIG, provider, adsRemoved: lifelineAdsRemoved });
  ctl.init(); setAdsAdapter(new SharedAdsAdapter(ctl)); installBanner(); return ctl;
}
// In-flow banner slot directly under the top bar (re-inserted if the hub re-mounts).
function installBanner() {
  if (!CONFIG.placements.banner) return;
  const slot = h('div', { 'data-el': 'ad-banner' }); let busy = false;
  const place = async () => {
    const top = store.root.querySelector(':scope > .topbar'); if (!top || busy) return;
    if (slot.previousElementSibling !== top) top.after(slot);
    busy = true; try { await mountBanner(slot, ctl, { previewText: 'TEST BANNER AD · 320×50' }); } finally { busy = false; }
  };
  new MutationObserver(() => { place(); }).observe(store.root, { childList: true }); place();
  ctl.onChange(place); document.addEventListener('premiumchange', place);
}
export const refreshAds = () => { if (ctl) { ctl.emit(); document.dispatchEvent(new CustomEvent('premiumchange')); } };

/** Settings > Privacy & ads (shared block, Lifeline row classes so the contrast guard covers it). */
export function privacyAdsSection() {
  const wrap = h('div', { 'data-el': 'privacy-ads' });
  const C = { section: 'sec', row: 'row', icon: 'ic', text: 'tx', title: 't', sub: 's', button: 'btn alt sm', link: 'row' };
  const c = ctl || { settings: () => ({ provider: 'native', adsShown: !lifelineAdsRemoved(), adsRemoved: lifelineAdsRemoved(), consentAvailable: false, privacyPolicyUrl: 'privacy.html' }), onChange: () => () => {}, openConsent: async () => 'unknown' };
  const scope = adsRow(C, '🌐', 'Where your ad-free applies', adFreeLife() ? 'Ad-Free for Life: no ads in every Paige game and on paigegames.net.' : Premium.isUnlocked('no_ads') ? 'No Ads covers Lifeline only. paigegames.net and other games still show ads; Ad-Free for Life removes them everywhere.' : 'No Ads ($5.99) removes ads in Lifeline only. Ad-Free for Life ($35) removes them in every Paige game and on paigegames.net.', 'div', { 'data-el': 'ads-scope' });
  mountAdsSettings(wrap, c, { classes: C, extraRows: [scope], describe: (m) => (adFreeLife() ? 'Ad-Free for Life is active. No ads are shown.' : m.adsRemoved ? 'No Ads / All Access is active in Lifeline. No ads here.' : m.provider === 'preview' ? 'Test build: test ad screens only, never real ads. Ads help keep Lifeline free.' : 'Ads help keep Lifeline free. Rewarded ads only play when you pick a reward.') });
  wrap.setAttribute('data-el', 'privacy-ads');
  return wrap;
}

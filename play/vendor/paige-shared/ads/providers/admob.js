// VENDORED from paige-shared — do not edit; run `npm run sync` in /workspace/paige-shared.
import { BANNER_HEIGHT } from "../types.js";
const cap = () => (typeof window !== "undefined" ? (window.Capacitor ?? null) : null);
export const hasNativeAdMob = () => { const c = cap(); return !!(c?.isNativePlatform?.() && c.Plugins?.AdMob); };
const plug = () => cap().Plugins.AdMob;
export class AdMobProvider {
    constructor(cfg, bannerHeight = BANNER_HEIGHT) {
        this.cfg = cfg;
        this.bannerHeight = bannerHeight;
        this.name = "admob";
        this.domBanner = false; // native view overlays the WebView; the UI reserves its height
        this.ready = null;
        this.consent = "unknown";
        this.canRequest = true;
        this.privacyRequired = false;
        this.heightCbs = [];
    }
    init() {
        if (!this.ready)
            this.ready = (async () => {
                const A = plug();
                await A.initialize({ initializeForTesting: this.cfg.testing });
                await this.runConsent(false);
                try {
                    await A.addListener("bannerAdSizeChanged", (s) => this.heightCbs.forEach((cb) => cb(Math.ceil(s?.height || this.bannerHeight))));
                }
                catch { /* */ }
            })().catch((e) => { this.ready = null; throw e; });
        return this.ready;
    }
    /** Google UMP: ask on first launch in EEA/UK; outside those regions status is NOT_REQUIRED and nothing shows. */
    async runConsent(force) {
        const A = plug();
        try {
            const ci = await A.requestConsentInfo();
            this.privacyRequired = ci.privacyOptionsRequirementStatus === "REQUIRED";
            if (force && A.showPrivacyOptionsForm && this.privacyRequired)
                await A.showPrivacyOptionsForm();
            else if (ci.isConsentFormAvailable && (ci.status === "REQUIRED" || force))
                await A.showConsentForm();
            const after = await A.requestConsentInfo();
            this.consent = after.status === "OBTAINED" ? "obtained" : after.status === "NOT_REQUIRED" ? "not_required" : after.status === "REQUIRED" ? "required" : "unknown";
            this.canRequest = after.canRequestAds ?? this.consent !== "required";
        }
        catch { /* consent form optional outside EEA/UK */ }
        return this.consent;
    }
    async openConsent() { try {
        await this.init();
    }
    catch {
        return this.consent;
    } return this.runConsent(true); }
    consentAvailable() { return true; }
    onBannerHeight(cb) { this.heightCbs.push(cb); }
    async showBanner() {
        try {
            await this.init();
            if (!this.canRequest)
                return 0;
            await plug().showBanner({ adId: this.cfg.bannerId, adSize: "ADAPTIVE_BANNER", position: "BOTTOM_CENTER", margin: 0, isTesting: this.cfg.testing });
            return this.bannerHeight;
        }
        catch {
            return 0;
        }
    }
    async hideBanner() { try {
        await plug().hideBanner();
    }
    catch { /* */ } }
    run(prepare, show, events) {
        const A = plug(), hs = [];
        return new Promise((resolve) => {
            let shown = false, rewarded = false, done = false;
            const end = (reason) => { if (done)
                return; done = true; clearTimeout(guard); hs.forEach((h) => h?.remove?.()); resolve({ shown, rewarded, reason }); };
            const guard = setTimeout(() => { if (!shown)
                end("load timeout"); }, 15000); // never hang the game on a slow load
            const on = async (ev, fn) => { try {
                hs.push(await A.addListener(ev, fn));
            }
            catch { /* */ } };
            (async () => {
                await on(events.shown, () => { shown = true; });
                await on(events.done, () => end());
                for (const f of events.fail)
                    await on(f, () => end("no ad available"));
                if (events.reward)
                    await on(events.reward, () => { rewarded = true; });
                try {
                    await prepare();
                    if (!done)
                        await show();
                }
                catch {
                    end("no ad available");
                }
            })();
        });
    }
    async showInterstitial() {
        try {
            await this.init();
        }
        catch {
            return { shown: false, reason: "ads init failed" };
        }
        if (!this.canRequest)
            return { shown: false, reason: "no consent" };
        const A = plug();
        return this.run(() => A.prepareInterstitial({ adId: this.cfg.interstitialId, isTesting: this.cfg.testing }), () => A.showInterstitial(), { shown: "interstitialAdShowed", done: "interstitialAdDismissed", fail: ["interstitialAdFailedToLoad", "interstitialAdFailedToShow"] });
    }
    /** rewarded:true ONLY after the SDK's onUserEarnedReward ('onRewardedVideoAdReward'). */
    async showRewarded() {
        try {
            await this.init();
        }
        catch {
            return { shown: false, reason: "ads init failed" };
        }
        if (!this.canRequest)
            return { shown: false, reason: "no consent" };
        const A = plug();
        return this.run(() => A.prepareRewardVideoAd({ adId: this.cfg.rewardedId, isTesting: this.cfg.testing }), () => A.showRewardVideoAd(), { shown: "onRewardedVideoAdLoaded", done: "onRewardedVideoAdDismissed", fail: ["onRewardedVideoAdFailedToLoad", "onRewardedVideoAdFailedToShow"], reward: "onRewardedVideoAdReward" });
    }
}

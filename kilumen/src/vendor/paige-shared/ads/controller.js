// VENDORED from paige-shared — do not edit; run `npm run sync` in /workspace/paige-shared.
import { createAdPolicy } from "./policy.js";
export class AdsController {
    constructor(o) {
        this.listeners = new Set();
        this.game = o.game;
        this.config = o.config;
        this.provider = o.provider;
        this.removed = o.adsRemoved;
        this.policy = o.policy ?? createAdPolicy({ rules: o.config.rules, storageKey: `paige-ads-rewarded-${o.game ?? "web"}-v1`, gateReasons: o.gateReasons });
    }
    adsRemoved() { try {
        return !!this.removed();
    }
    catch {
        return false;
    } }
    /** Forced / banner ads run only when a real provider exists and the player has no applicable Ad-Free entitlement. */
    adsShown() { return this.provider.name !== "none" && !this.adsRemoved(); }
    init() { return this.provider.init().catch(() => { }); }
    async banner() {
        if (!this.config.placements.banner || !this.adsShown()) {
            await this.provider.hideBanner();
            return 0;
        }
        return this.provider.showBanner();
    }
    /** Interstitial at a natural break. Never shown with an Ad-Free entitlement; capped by policy. */
    async interstitial(gate = {}, o = {}) {
        if (!this.config.placements.interstitial)
            return { shown: false, reason: "placement off" };
        if (this.adsRemoved())
            return { shown: false, reason: "ad-free" };
        if (!o.ignoreCaps) {
            const g = this.policy.interstitialAllowed(gate);
            if (!g.ok)
                return { shown: false, reason: g.why };
        }
        const r = await this.provider.showInterstitial();
        if (r.shown)
            this.policy.markInterstitial();
        return r;
    }
    /** Rewarded ad (player chose it). Counts against rewardedPerDay only when it rewarded. */
    async rewarded(o = {}) {
        if (!this.config.placements.rewarded)
            return { shown: false, reason: "placement off" };
        if (!o.ignoreDailyCap && this.policy.rewardedLeft() <= 0)
            return { shown: false, reason: "daily cap" };
        const r = await this.provider.showRewarded();
        if (r.rewarded && !o.ignoreDailyCap)
            this.policy.markRewarded();
        return r;
    }
    async openConsent() { const s = await this.provider.openConsent(); this.emit(); return s; }
    settings() {
        return { provider: this.provider.name, adsShown: this.adsShown(), adsRemoved: this.adsRemoved(), consentAvailable: this.provider.consentAvailable(),
            privacyPolicyUrl: this.config.privacyPolicyUrl, rewardedLeft: this.policy.rewardedLeft(), rewardedPerDay: this.config.rules.rewardedPerDay,
            placements: this.config.placements, testAds: this.provider.name === "preview" || this.config.admob.testing || this.config.web.testMode };
    }
    onChange(cb) { this.listeners.add(cb); return () => { this.listeners.delete(cb); }; }
    emit() { this.listeners.forEach((f) => { try {
        f();
    }
    catch { /* */ } }); }
}

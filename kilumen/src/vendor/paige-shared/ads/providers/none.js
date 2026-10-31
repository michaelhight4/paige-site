// VENDORED from paige-shared — do not edit; run `npm run sync` in /workspace/paige-shared.
/** Default: renders nothing, reserves nothing. */
export class NoAdsProvider {
    constructor() {
        this.name = "none";
        this.domBanner = false;
    }
    async init() { }
    async showBanner() { return 0; }
    async hideBanner() { }
    async showInterstitial() { return { shown: false, reason: "ads off" }; }
    async showRewarded() { return { shown: false, reason: "ads off" }; }
    async openConsent() { return "not_required"; }
    consentAvailable() { return false; }
}

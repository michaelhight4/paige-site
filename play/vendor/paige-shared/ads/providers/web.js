// VENDORED from paige-shared — do not edit; run `npm run sync` in /workspace/paige-shared.
import { NoAdsProvider } from "./none.js";
import { BANNER_HEIGHT } from "../types.js";
const w = () => window;
export function webAdsAllowed(c) {
    return c.enabled && !!c.publisherId && typeof window !== "undefined" && c.allowedHosts.includes(window.location.hostname);
}
export class WebAdsProvider {
    constructor(c, bannerHeight = BANNER_HEIGHT) {
        this.c = c;
        this.bannerHeight = bannerHeight;
        this.name = "web";
        this.domBanner = true;
        this.off = new NoAdsProvider();
        this.ready = null;
    }
    init() {
        if (!webAdsAllowed(this.c))
            return Promise.resolve();
        if (!this.ready)
            this.ready = new Promise((resolve) => {
                const c = this.c;
                const s = document.createElement("script");
                s.async = true;
                s.crossOrigin = "anonymous";
                s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${c.publisherId}`;
                if (c.testMode)
                    s.setAttribute("data-adbreak-test", "on");
                s.onload = s.onerror = () => resolve();
                document.head.appendChild(s);
                const win = w();
                win.adsbygoogle = win.adsbygoogle || [];
                win.adBreak = win.adConfig = (o) => { win.adsbygoogle.push(o); };
                win.adConfig({ preloadAdBreaks: "on", sound: "on" });
            });
        return this.ready;
    }
    /** The banner element is rendered by the host UI (renderWebBanner below / Riftward AdsLayer). */
    async showBanner() { return webAdsAllowed(this.c) && this.c.bannerSlot ? this.bannerHeight : 0; }
    async hideBanner() { }
    async showInterstitial() {
        if (!webAdsAllowed(this.c))
            return this.off.showInterstitial();
        await this.init();
        return new Promise((resolve) => w().adBreak({ type: "next", name: "natural-break", adBreakDone: (p) => resolve({ shown: p?.breakStatus === "viewed", reason: p?.breakStatus }) }));
    }
    async showRewarded() {
        if (!webAdsAllowed(this.c))
            return this.off.showRewarded();
        await this.init();
        return new Promise((resolve) => {
            let rewarded = false;
            w().adBreak({ type: "reward", name: this.c.rewardName ?? "reward",
                beforeReward: (showAdFn) => showAdFn(),
                adViewed: () => { rewarded = true; },
                adDismissed: () => { rewarded = false; },
                adBreakDone: (p) => resolve({ shown: rewarded || p?.breakStatus === "viewed", rewarded, reason: p?.breakStatus }) });
        });
    }
    /** AdSense serves Google's certified CMP (Privacy & messaging) itself on approved domains. */
    async openConsent() { const g = window; g.googlefc?.showRevocationMessage?.(); return "unknown"; }
    consentAvailable() { return webAdsAllowed(this.c); }
}
/** Fill a slot element with the AdSense <ins> unit (test mode: data-adtest="on"). */
export function renderWebBanner(slot, c) {
    var _a;
    if (!webAdsAllowed(c) || !c.bannerSlot || slot.querySelector("ins.adsbygoogle"))
        return;
    const ins = document.createElement("ins");
    ins.className = "adsbygoogle";
    ins.style.display = "block";
    ins.style.height = "100%";
    ins.setAttribute("data-ad-client", c.publisherId);
    ins.setAttribute("data-ad-slot", c.bannerSlot);
    ins.setAttribute("data-full-width-responsive", "false");
    if (c.testMode)
        ins.setAttribute("data-adtest", "on");
    slot.appendChild(ins);
    try {
        ((_a = window).adsbygoogle || (_a.adsbygoogle = [])).push({});
    }
    catch { /* */ }
}

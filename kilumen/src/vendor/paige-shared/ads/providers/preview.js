// VENDORED from paige-shared — do not edit; run `npm run sync` in /workspace/paige-shared.
import { BANNER_HEIGHT } from "../types.js";
/** Test placeholder boxes so placements can be checked. Never real money. */
export class PreviewAdsProvider {
    constructor(o = {}) {
        this.o = o;
        this.name = "preview";
        this.domBanner = true;
    }
    async init() { }
    async showBanner() { return this.o.bannerHeight ?? BANNER_HEIGHT; }
    async hideBanner() { }
    box(kind) {
        const p = this.o.classPrefix ?? "pg-ad";
        const secs = kind === "rewarded" ? this.o.rewardedCloseAfterS ?? this.o.closeAfterS ?? 2 : this.o.closeAfterS ?? 2;
        return new Promise((resolve) => {
            const el = document.createElement("div");
            el.className = `${p}-full`;
            el.setAttribute("role", "dialog");
            el.setAttribute("aria-label", `Test ${kind} ad`);
            const label = this.o.label ? this.o.label(kind) : `TEST ${kind.toUpperCase()} AD`;
            el.innerHTML = `<div class="${p}-full-box"><b></b><small></small><button type="button" disabled>Close (${secs})</button></div>`;
            el.querySelector("b").textContent = label;
            el.querySelector("small").textContent = this.o.sub ?? "Placeholder · test build only";
            document.body.appendChild(el);
            const btn = el.querySelector("button");
            let n = secs;
            const t = setInterval(() => { n -= 1; if (n > 0) {
                btn.textContent = `Close (${n})`;
                return;
            } clearInterval(t); btn.disabled = false; btn.textContent = "Close"; }, 1000);
            btn.onclick = () => { el.remove(); resolve({ shown: true, rewarded: kind === "rewarded" }); };
        });
    }
    showInterstitial() { return this.box("interstitial"); }
    showRewarded() { return this.box("rewarded"); }
    async openConsent() { window.alert(this.o.consentMessage ?? "Test build: the Google consent form opens here in the Android app (EU/UK)."); return "not_required"; }
    consentAvailable() { return true; }
}

// VENDORED from paige-shared — do not edit; run `npm run sync` in /workspace/paige-shared.
import { renderWebBanner } from "./providers/web.js";
const DEFAULT_CLASSES = { section: "pg-ads-sec", row: "pg-ads-row", icon: "pg-ads-ic", text: "pg-ads-tx", title: "pg-ads-t", sub: "pg-ads-s", button: "pg-ads-btn", link: "pg-ads-row" };
function el(tag, cls, text, attrs = {}) {
    const e = document.createElement(tag);
    if (cls)
        e.className = cls;
    if (text != null)
        e.textContent = text;
    for (const [k, v] of Object.entries(attrs))
        e.setAttribute(k, v);
    return e;
}
export function adsRow(c, icon, title, sub, tag = "div", attrs = {}) {
    const r = el(tag, tag === "a" ? c.link : c.row, undefined, attrs);
    if (tag === "button")
        r.setAttribute("type", "button");
    const tx = el("span", c.text);
    tx.append(el("span", c.title, title), el("span", c.sub, sub));
    r.append(el("span", c.icon, icon), tx);
    return r;
}
/** Render (or re-render) the Privacy & ads block into container. Returns a disposer. */
export function mountAdsSettings(container, ctl, o = {}) {
    const c = { ...DEFAULT_CLASSES, ...o.classes };
    const render = () => {
        const m = ctl.settings();
        container.replaceChildren();
        container.setAttribute("data-el", "privacy-ads");
        container.append(el("div", c.section, o.heading ?? "Privacy & ads", { id: "pg-privacy-ads" }));
        const status = o.describe ? o.describe(m) : m.adsRemoved ? "Ad-free: no ads are shown." : m.adsShown ? "Ads help keep the game free." : "This version shows no ads.";
        container.append(adsRow(c, "📺", "Ads", status, "div", { "data-el": "ads-status" }));
        if (m.consentAvailable) {
            const b = adsRow(c, "🛡️", "Ad privacy choices", "Review or change how ads may use your data", "button", { "data-el": "ads-consent" });
            b.addEventListener("click", () => { void ctl.openConsent(); });
            container.append(b);
        }
        container.append(adsRow(c, "🔒", "Privacy policy", "Opens in a new tab", "a", { href: m.privacyPolicyUrl, target: "_blank", rel: "noopener noreferrer", "data-el": "ads-privacy-link" }));
        for (const x of o.extraRows ?? [])
            container.append(x);
    };
    render();
    return ctl.onChange(render);
}
/**
 * In-flow banner slot (NOT position:fixed): insert it directly ABOVE the bottom nav so it pushes content up and can
 * never cover navigation or controls. Returns the reserved height (0 = slot hidden).
 */
export async function mountBanner(slot, ctl, o = {}) {
    const h = await ctl.banner();
    slot.classList.add("pg-ad-banner");
    slot.setAttribute("aria-label", "Advertisement");
    slot.hidden = h <= 0 || !ctl.provider.domBanner;
    slot.style.height = slot.hidden ? "0px" : `${h}px`;
    if (slot.hidden) {
        slot.replaceChildren();
        return ctl.provider.domBanner ? 0 : h;
    }
    if (ctl.provider.name === "preview" && !slot.firstChild) {
        const ph = el("div", "pg-ad-ph", o.previewText ?? "TEST BANNER AD · 320×50");
        slot.append(ph);
    }
    if (ctl.provider.name === "web")
        renderWebBanner(slot, ctl.config.web);
    return h;
}

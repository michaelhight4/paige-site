// VENDORED from paige-shared — do not edit; run `npm run sync` in /workspace/paige-shared.
const ls = () => { try {
    return typeof localStorage !== "undefined" ? localStorage : null;
}
catch {
    return null;
} };
export function createAdPolicy(o) {
    const SESSION_START = o.sessionStart ?? (typeof performance !== "undefined" ? Date.now() : 0);
    const reasons = o.gateReasons ?? {};
    let last = 0;
    const store = () => (o.storage === undefined ? ls() : o.storage);
    const today = () => new Date().toISOString().slice(0, 10);
    const p = {
        interstitialAllowed(gate, now = Date.now(), start = SESSION_START, lastAt = last) {
            const r = o.rules;
            for (const k of Object.keys(reasons))
                if (gate[k])
                    return { ok: false, why: reasons[k] };
            for (const k of Object.keys(gate))
                if (gate[k] && !(k in reasons))
                    return { ok: false, why: k };
            if (now - start < r.interstitialSessionGraceMs)
                return { ok: false, why: "session grace" };
            if (lastAt && now - lastAt < r.interstitialMinGapMs)
                return { ok: false, why: "frequency cap" };
            return { ok: true };
        },
        markInterstitial(now = Date.now()) { last = now; },
        resetForPreview() { last = 0; },
        lastInterstitial: () => last,
        rewardedLeft() {
            try {
                const v = JSON.parse(store()?.getItem(o.storageKey) || "{}");
                return o.rules.rewardedPerDay - (v.d === today() ? v.n || 0 : 0);
            }
            catch {
                return o.rules.rewardedPerDay;
            }
        },
        markRewarded() {
            const used = o.rules.rewardedPerDay - p.rewardedLeft() + 1;
            try {
                store()?.setItem(o.storageKey, JSON.stringify({ d: today(), n: used }));
            }
            catch { /* */ }
        },
    };
    return p;
}

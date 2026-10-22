// VENDORED from paige-shared — do not edit; run `npm run sync` in /workspace/paige-shared.
export function capacitorPlugin(name) {
    const w = (typeof window !== "undefined" ? window : {});
    const C = w.Capacitor;
    if (!C || !C.isNativePlatform?.() || !C.Plugins?.[name])
        return null;
    return C.Plugins[name];
}
export class PlayBilling {
    constructor(game, plugin, net) {
        this.game = game;
        this.plugin = plugin;
        this.net = net;
    }
    get available() { return !!this.plugin; }
    products(ids, type = "inapp") { return this.plugin?.getProducts?.({ productIds: ids, type }) ?? Promise.resolve({ products: [] }); }
    async buy(sku, type = "inapp") {
        if (!this.plugin)
            return { ok: false, sku, reason: "Play Billing not available" };
        try {
            const r = await this.plugin.purchase({ productId: sku, type });
            if (r.cancelled)
                return { ok: false, sku, reason: "cancelled" };
            if (r.state === "pending")
                return { ok: false, sku, pending: true, reason: "pending" };
            const good = r.ok !== false && !r.error;
            if (good && r.purchaseToken)
                await this.verify(sku, r.purchaseToken);
            return { ok: good, sku, token: r.purchaseToken, reason: r.error };
        }
        catch (e) {
            return { ok: false, sku, reason: e instanceof Error ? e.message : "purchase failed" };
        }
    }
    /** Server verify + grant (signed-in players only; anonymous players stay on Play restore + local flags). */
    async verify(sku, purchaseToken) {
        if (!this.net?.configured || !this.net.signedIn())
            return { ok: false, error: "no account", offline: true };
        return this.net.fn("verify-google-play", { gameId: this.game, productId: sku, purchaseToken });
    }
    async restore() { try {
        return (await this.plugin?.restore?.())?.purchases ?? [];
    }
    catch {
        return [];
    } }
    manage() { return this.plugin?.manageSubscriptions?.(); }
}

// VENDORED from paige-shared — do not edit; run `npm run sync` in /workspace/paige-shared.
/**
 * Stripe Checkout (web). The client only asks the create-checkout edge function for a hosted Checkout URL and
 * redirects; prices come from the DB catalogue server-side, and entitlements/Blue Bucks are granted ONLY by the
 * stripe-webhook function after checkout.session.completed. Needs a signed-in Paige account.
 */
export class StripeCheckout {
    constructor(game, net) {
        this.game = game;
        this.net = net;
    }
    get available() { return this.net.configured; }
    async start(sku, o = {}) {
        if (!this.net.configured)
            return { ok: false, sku, reason: "Store not connected yet" };
        if (!this.net.signedIn())
            return { ok: false, sku, reason: "Sign in to your Paige Games account first" };
        const r = await this.net.fn("create-checkout", { gameId: this.game, sku, returnUrl: o.returnUrl ?? (typeof location !== "undefined" ? location.href : undefined) });
        if (!r.ok)
            return { ok: false, sku, reason: r.error };
        (o.redirect ?? ((u) => location.assign(u)))(r.value.url);
        return { ok: true, sku, pending: true };
    }
}

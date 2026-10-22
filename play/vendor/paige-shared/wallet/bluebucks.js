// VENDORED from paige-shared — do not edit; run `npm run sync` in /workspace/paige-shared.
import { BB_PER_USD, formatBB } from "../billing/catalog.js";
import { err, ok } from "../net/result.js";
/**
 * Blue Bucks client. The balance is SERVER-AUTHORITATIVE (public.bb_wallets via RLS; changes only through
 * SECURITY DEFINER RPCs). The client never adds or subtracts locally; it only displays what the server returns.
 * TestWallet exists for test builds only and is always labelled as test money.
 */
export { BB_PER_USD, formatBB };
export { BB_PASS_DISCOUNT, BB_PASS_DISCOUNT_PCT, BB_ROUND_TO, BB_DISCOUNT_TAG, priceInBB, fullPriceInBB, bbPayChoice, isPass } from "../billing/catalog.js";
export const newIdemKey = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `k${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`);
export class ServerWallet {
    constructor(net) {
        this.net = net;
        this.kind = "server";
    }
    available() { return this.net.configured && this.net.signedIn(); }
    async balance() {
        if (!this.available())
            return err(this.net.configured ? "sign in" : "not configured", !this.net.configured);
        const r = await this.net.select("bb_wallets", "select=balance");
        return r.ok ? ok(r.value[0]?.balance ?? 0) : r;
    }
    async redeem(game, sku, idemKey = newIdemKey()) {
        if (!this.available())
            return { ok: false, reason: "Sign in to use Blue Bucks" };
        // bb_redeem raises on "not enough Blue Bucks" / "already owned"; success returns { replayed, balance, product }.
        const r = await this.net.rpc("bb_redeem", { p_game: game, p_sku: sku, p_key: idemKey });
        if (!r.ok)
            return { ok: false, reason: r.error.includes("not enough") ? "insufficient" : r.error };
        return { ok: true, balance: r.value.balance, duplicate: r.value.replayed };
    }
}
export class NoWallet {
    constructor() {
        this.kind = "none";
    }
    available() { return false; }
    async balance() { return err("not configured", true); }
    async redeem() { return { ok: false, reason: "Blue Bucks are not available in this build yet" }; }
}
/** TEST BUILDS ONLY: local pretend wallet so the redeem flow can be exercised without a backend. Not real money. */
export class TestWallet {
    constructor(prices, key = "paige.testwallet.v1") {
        this.prices = prices;
        this.key = key;
        this.kind = "test";
    }
    get n() { try {
        return Number(localStorage.getItem(this.key) || 0) || 0;
    }
    catch {
        return 0;
    } }
    set n(v) { try {
        localStorage.setItem(this.key, String(v));
    }
    catch { /* */ } }
    available() { return true; }
    async balance() { return ok(this.n); }
    addTest(amount) { this.n = this.n + amount; return this.n; }
    async redeem(game, sku) {
        const p = this.prices(game, sku);
        if (p == null)
            return { ok: false, reason: "not redeemable" };
        if (this.n < p)
            return { ok: false, reason: "insufficient", balance: this.n };
        this.n = this.n - p;
        return { ok: true, balance: this.n };
    }
}

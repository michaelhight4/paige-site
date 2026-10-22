// VENDORED from paige-shared — do not edit; run `npm run sync` in /workspace/paige-shared.
import { err } from "../net/result.js";
export const DEFAULT_TAG = "CREATOR";
export class AdminClient {
    constructor(net) {
        this.net = net;
        this.cached = null;
    }
    /** Server-confirmed role for the signed-in user (null for everyone else, guests and offline). */
    async me() {
        if (!this.net?.configured || !this.net.signedIn())
            return (this.cached = null);
        const r = await this.net.rpc("admin_me");
        return (this.cached = r.ok ? r.value : null);
    }
    get role() { return this.cached?.role ?? null; }
    call(fn, args) { return this.net ? this.net.rpc(fn, args) : Promise.resolve(err("not configured", true)); }
    players(q) { return this.call("admin_players", { p_q: q }); }
    setItem(user, game, sku, on, note = "") { return this.call("admin_set_item", { p_user: user, p_game: game, p_sku: sku, p_on: on, p_note: note }); }
    grantCurrency(user, currency, amount, note = "") { return this.call("admin_grant_currency", { p_user: user, p_currency: currency, p_amount: amount, p_note: note }); }
    setFlag(game, key, value) { return this.call("admin_set_flag", { p_game: game, p_key: key, p_value: value }); }
    announce(game, body, hours = 24) { return this.call("admin_announce", { p_game: game, p_body: body, p_hours: hours }); }
    audit(limit = 50) { return this.call("admin_audit_view", { p_limit: limit }); }
    /** Public staff tags for a list of player ids (shown next to names). */
    tags(ids) { return this.call("player_tags", { p_ids: ids }); }
}

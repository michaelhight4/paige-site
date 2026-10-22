// VENDORED from paige-shared — do not edit; run `npm run sync` in /workspace/paige-shared.
const ls = () => { try {
    return typeof localStorage !== "undefined" ? localStorage : null;
}
catch {
    return null;
} };
export const NETWORK_KEY = "paige.entitlements.network.v1";
export const gameKey = (game) => `paige.entitlements.${game}.v1`;
export class EntitlementCache {
    constructor(game, storage = ls(), now = Date.now) {
        this.game = game;
        this.storage = storage;
        this.now = now;
        this.live = (e) => !e.expiresAt || e.expiresAt > this.now();
    }
    read(key) { try {
        return JSON.parse(this.storage?.getItem(key) || "[]");
    }
    catch {
        return [];
    } }
    write(key, v) { try {
        this.storage?.setItem(key, JSON.stringify(v));
    }
    catch { /* */ } }
    /** Everything that applies here: network entitlements + (inside a game) that game's own. The website gets network only. */
    all() {
        const net = this.read(NETWORK_KEY).filter((e) => e.scope === "network");
        const own = this.game ? this.read(gameKey(this.game)).filter((e) => e.scope === "game" && e.game === this.game) : [];
        return [...net, ...own].filter(this.live);
    }
    owns(sku) { return this.all().some((e) => e.sku === sku); }
    /** Ads removed? Game: its own removesAds entitlements OR a network one. Website (game null): ONLY network scope. */
    adsRemoved() { return this.all().some((e) => e.removesAds && (e.scope === "network" || (this.game !== null && e.game === this.game))); }
    grant(e) {
        if (e.scope === "game" && (!e.game || (this.game && e.game !== this.game)))
            throw new Error("game entitlement must name this game");
        if (e.scope === "network")
            e = { ...e, game: null };
        const key = e.scope === "network" ? NETWORK_KEY : gameKey(e.game);
        this.write(key, [...this.read(key).filter((x) => x.sku !== e.sku), e]);
    }
    revoke(sku, scope) {
        const key = scope === "network" ? NETWORK_KEY : gameKey(this.game);
        this.write(key, this.read(key).filter((x) => x.sku !== sku));
    }
    /** Replace the cache with server truth (rows from public.entitlements joined to network_products). */
    syncFromServer(rows) {
        const map = (r) => ({ sku: r.product_id.split(":").pop(), game: r.game_id, scope: r.scope, source: r.source ?? "grant", expiresAt: r.expires_at ? Date.parse(r.expires_at) : null, removesAds: !!r.removes_ads });
        const ents = rows.map(map);
        this.write(NETWORK_KEY, ents.filter((e) => e.scope === "network"));
        if (this.game)
            this.write(gameKey(this.game), ents.filter((e) => e.scope === "game" && e.game === this.game));
    }
}

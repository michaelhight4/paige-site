// VENDORED from paige-shared — do not edit; run `npm run sync` in /workspace/paige-shared.
import { err, ok } from "./result.js";
const ls = () => { try {
    return typeof localStorage !== "undefined" ? localStorage : null;
}
catch {
    return null;
} };
const SESSION_KEY = "paige.session.v1";
export function assertPublicKey(key) {
    // A service-role JWT carries "role":"service_role"; refuse it on the client.
    try {
        const p = JSON.parse(atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
        if (p.role === "service_role")
            throw new Error("service-role key must never be used in a client");
    }
    catch (e) {
        if (e instanceof Error && e.message.includes("service-role"))
            throw e;
    }
}
export class PaigeNet {
    constructor(cfg, fetchFn = (...a) => fetch(...a)) {
        this.cfg = cfg;
        this.fetchFn = fetchFn;
        if (cfg)
            assertPublicKey(cfg.anonKey);
    }
    get configured() { return !!this.cfg; }
    session() {
        try {
            const s = JSON.parse(ls()?.getItem(SESSION_KEY) || "null");
            if (s && s.expires_at && s.expires_at * 1000 < Date.now())
                return null;
            return s;
        }
        catch {
            return null;
        }
    }
    signedIn() { return !!this.session(); }
    userId() { return this.session()?.user?.id ?? null; }
    signOut() { ls()?.removeItem(SESSION_KEY); }
    /** Store a session returned by GoTrue (used by auth/). */
    setSession(s) { if (!s)
        ls()?.removeItem(SESSION_KEY);
    else
        ls()?.setItem(SESSION_KEY, JSON.stringify(s)); }
    /** Raw GoTrue call (/auth/v1/...). */
    auth(path, init) { return this.call(`/auth/v1${path}`, init); }
    get url() { return this.cfg?.url.replace(/\/$/, "") ?? ""; }
    /** Pick up a magic-link redirect (#access_token=...). Call once on boot. */
    handleRedirect(loc = typeof location !== "undefined" ? location : { hash: "" }) {
        const p = new URLSearchParams(loc.hash.replace(/^#/, ""));
        const at = p.get("access_token");
        if (!at)
            return false;
        let user;
        try {
            const j = JSON.parse(atob(at.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
            user = { id: j.sub, email: j.email };
        }
        catch {
            return false;
        }
        ls()?.setItem(SESSION_KEY, JSON.stringify({ access_token: at, refresh_token: p.get("refresh_token") ?? undefined, expires_at: Number(p.get("expires_at")) || undefined, user }));
        return true;
    }
    headers() {
        const h = { apikey: this.cfg.anonKey, "content-type": "application/json" };
        h.authorization = `Bearer ${this.session()?.access_token ?? this.cfg.anonKey}`;
        return h;
    }
    async call(path, init) {
        if (!this.cfg)
            return err("not configured", true);
        try {
            const r = await this.fetchFn(this.cfg.url.replace(/\/$/, "") + path, { ...init, headers: { ...this.headers(), ...init.headers } });
            const text = await r.text();
            let body = null;
            try {
                body = text ? JSON.parse(text) : null;
            }
            catch {
                body = text;
            }
            if (!r.ok) {
                const b = body;
                return err(b?.message || b?.error || `HTTP ${r.status}`);
            }
            return ok(body);
        }
        catch {
            return err("offline", true);
        }
    }
    signInWithEmail(email, redirectTo) { return this.call("/auth/v1/otp", { method: "POST", body: JSON.stringify({ email, create_user: true, ...(redirectTo ? { options: { email_redirect_to: redirectTo } } : {}) }) }); }
    rpc(fn, args = {}) { return this.call(`/rest/v1/rpc/${fn}`, { method: "POST", body: JSON.stringify(args) }); }
    select(table, query) { return this.call(`/rest/v1/${table}?${query}`, { method: "GET" }); }
    fn(name, body) { return this.call(`/functions/v1/${name}`, { method: "POST", body: JSON.stringify(body) }); }
}

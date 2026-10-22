// VENDORED from paige-shared — do not edit; run `npm run sync` in /workspace/paige-shared.
import { err, ok } from "../net/result.js";
const claims = (jwt) => { try {
    return JSON.parse(atob((jwt ?? "").split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
}
catch {
    return {};
} };
const toSession = (r) => ({ access_token: r.access_token, refresh_token: r.refresh_token, expires_at: r.expires_at ?? (Math.floor(Date.now() / 1000) + 3600),
    user: { id: r.user?.id ?? String(claims(r.access_token).sub ?? ""), email: r.user?.email || undefined, is_anonymous: r.user?.is_anonymous ?? !!claims(r.access_token).is_anonymous } });
export class PaigeAuth {
    constructor(net) {
        this.net = net;
        this.listeners = new Set();
    }
    state() {
        const s = this.net.session();
        const anon = !!(s?.user?.is_anonymous ?? claims(s?.access_token).is_anonymous);
        return { configured: this.net.configured, signedIn: !!s, guest: !s || anon, userId: s?.user?.id ?? null, email: s?.user?.email ?? null };
    }
    /** Linked (non-anonymous) account? Purchases and redemptions require this. */
    canBuy() { const s = this.state(); return s.signedIn && !s.guest; }
    onChange(cb) { this.listeners.add(cb); return () => { this.listeners.delete(cb); }; }
    emit() { this.listeners.forEach((f) => { try {
        f();
    }
    catch { /* */ } }); }
    save(r) { if (r.ok && r.value?.access_token) {
        this.net.setSession(toSession(r.value));
        this.emit();
    } return r; }
    /** First launch: anonymous guest user (no-op offline / already signed in). */
    async ensureGuest() {
        if (!this.net.configured)
            return err("not configured", true);
        if (this.net.signedIn())
            return ok(this.state());
        const r = this.save(await this.net.auth("/signup", { method: "POST", body: JSON.stringify({ data: {} }) }));
        return r.ok ? ok(this.state()) : r;
    }
    /** Upgrade the current guest with Google (same user id). Redirects; handleRedirect() picks up the session on return. */
    async linkGoogle(redirectTo = typeof location !== "undefined" ? location.href : "") {
        if (!this.net.signedIn())
            await this.ensureGuest();
        const r = await this.net.auth(`/user/identities/authorize?provider=google&skip_http_redirect=true&redirect_to=${encodeURIComponent(redirectTo)}`, { method: "GET" });
        if (r.ok && r.value?.url && typeof location !== "undefined")
            location.assign(r.value.url);
        return r;
    }
    /** Upgrade the current guest with email + password (same user id). Supabase emails a confirmation link. */
    async linkEmail(email, password) {
        if (!this.net.signedIn())
            await this.ensureGuest();
        const r = await this.net.auth("/user", { method: "PUT", body: JSON.stringify(password ? { email, password } : { email }) });
        if (r.ok)
            this.emit();
        return r;
    }
    /** Existing account. Returns { previousGuest } so the caller can offer a merge of guest progress. */
    async signInWithPassword(email, password) {
        const before = this.state();
        const prev = before.signedIn && before.guest ? before.userId : null;
        const r = this.save(await this.net.auth("/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) }));
        return r.ok ? ok({ previousGuest: prev && prev !== this.state().userId ? prev : null }) : r;
    }
    /** Magic link to an existing account (or a new one). */
    sendMagicLink(email, redirectTo) { return this.net.signInWithEmail(email, redirectTo); }
    handleRedirect() { const changed = this.net.handleRedirect(); if (changed)
        this.emit(); return changed; }
    signOut() { this.net.signOut(); this.emit(); }
}

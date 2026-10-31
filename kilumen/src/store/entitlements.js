// Account-wide entitlements (dev/kilumen-store). Pure-ish: storage + clock are injected so tests run in Node.
// Source of truth: Google Play (Android, re-read with restore() on every boot) or the paige-shared server
// (web: public.entitlements, written only by the Stripe webhook). The client NEVER grants a paid item by itself.
// The local cache only covers offline boots. Alpha-level tamper safety:
//   - the cache is signed (FNV-1a over the payload + a per-install salt + the account id); an edited / copied cache is dropped
//   - a cached subscription carries an expiry (server expires_at, or Play: now + PLAY_RECHECK_MS) and lapses on its own offline
//   - only verified sources ('play', 'server', and 'test' on test channels) may write it.
// A real anti-cheat needs server checks on every grant; this is noted in the report as alpha scope.
import { ONCE_SKUS, SUB_SKU, SUB_GRANTS, GAME_ID } from './config.js?v=v0.2.108-alpha';

export const CACHE_KEY = 'kilumen_store_ents.v1';
export const SALT_KEY = 'kilumen_store_salt.v1';
export const PLAY_RECHECK_MS = 3 * 24 * 3600 * 1000; // a Play sub seen active stays active offline for 3 days, then needs a re-check

export function fnv(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36); }
const sign = (body, salt, acct) => fnv(`${salt}|${acct || ''}|${body}|${GAME_ID}`) + fnv(`${body}|${salt}`);

const VALID_SRC = new Set(['play', 'server', 'test']);

export class Entitlements {
  /** o: {storage, now, account (id string or ''), allowTest} */
  constructor(o = {}) {
    this.storage = o.storage === undefined ? safeLs() : o.storage;
    this.now = o.now || (() => Date.now());
    this.account = o.account || '';
    this.allowTest = !!o.allowTest;
    this.owned = {};       // sku -> {src, at}
    this.sub = null;       // {src, expiresAt, autoRenew}
    this.listeners = new Set();
    this.tampered = false;
    this._load();
  }
  // ---- reading -------------------------------------------------------------------------------------------------
  subActive(t = this.now()) { return !!this.sub && Number(this.sub.expiresAt) > t; }
  ownsOnce(sku) { return !!this.owned[sku]; }
  /** Effective entitlement: bought once, or covered by the active subscription. */
  has(sku) {
    if (sku === SUB_SKU) return this.subActive();
    return this.ownsOnce(sku) || (SUB_GRANTS.includes(sku) && this.subActive());
  }
  adsRemoved() { return this.has('no_ads'); }
  boostActive() { return this.subActive(); }
  snapshot() { return { owned: Object.keys(this.owned).sort(), sub: this.subActive() ? { ...this.sub } : null, effective: [...ONCE_SKUS, SUB_SKU].filter((s) => this.has(s)) }; }
  on(f) { this.listeners.add(f); return () => this.listeners.delete(f); }
  _emit() { for (const f of this.listeners) try { f(this.snapshot()); } catch { /* */ } }

  // ---- writing (verified sources only) ------------------------------------------------------------------------
  /** Replace everything from an authoritative list: [{sku, src, expiresAt?, autoRenew?}] (Play restore / server read). */
  applyVerified(items, src) {
    if (!this._srcOk(src)) return false;
    const owned = {}; let sub = null;
    for (const it of items || []) {
      if (!it || typeof it.sku !== 'string') continue;
      if (it.sku === SUB_SKU) {
        const exp = Number(it.expiresAt) || (src === 'play' ? this.now() + PLAY_RECHECK_MS : 0);
        if (exp > this.now()) sub = { src, expiresAt: exp, autoRenew: it.autoRenew !== false };
      } else if (ONCE_SKUS.includes(it.sku)) owned[it.sku] = { src, at: Number(it.at) || this.now() };
    }
    // a once-purchase never disappears because a list is partial; only an explicit refund/revoke removes it
    for (const [k, v] of Object.entries(this.owned)) if (!owned[k] && v.src !== src) owned[k] = v;
    this.owned = owned; this.sub = sub; this._save(); this._emit();
    return true;
  }
  /** One verified purchase (after Play acknowledges / the server confirms). */
  grantVerified(it, src) {
    if (!this._srcOk(src) || !it) return false;
    if (it.sku === SUB_SKU) { const exp = Number(it.expiresAt) || this.now() + PLAY_RECHECK_MS; if (exp <= this.now()) return false; this.sub = { src, expiresAt: exp, autoRenew: it.autoRenew !== false }; }
    else if (ONCE_SKUS.includes(it.sku)) this.owned[it.sku] = { src, at: this.now() };
    else return false;
    this._save(); this._emit(); return true;
  }
  /** Refund / chargeback (server revoked_at or Play no longer lists a once item it previously did). */
  revoke(sku, src) { if (!this._srcOk(src)) return false; if (sku === SUB_SKU) this.sub = null; else delete this.owned[sku]; this._save(); this._emit(); return true; }
  _srcOk(src) { return VALID_SRC.has(src) && (src !== 'test' || this.allowTest); }

  // ---- cache ----------------------------------------------------------------------------------------------------
  _salt() {
    let s = null; try { s = this.storage?.getItem(SALT_KEY); } catch { s = null; }
    if (!s) { s = fnv(String(Math.random()) + this.now()) + fnv(String(Math.random())); try { this.storage?.setItem(SALT_KEY, s); } catch { /* */ } }
    return s;
  }
  _save() {
    if (!this.storage) return;
    const body = JSON.stringify({ owned: this.owned, sub: this.sub, acct: this.account });
    try { this.storage.setItem(CACHE_KEY, JSON.stringify({ b: body, s: sign(body, this._salt(), this.account) })); } catch { /* full / private */ }
  }
  _load() {
    let raw = null; try { raw = this.storage?.getItem(CACHE_KEY); } catch { raw = null; }
    if (!raw) return;
    try {
      const o = JSON.parse(raw), body = o?.b;
      if (typeof body !== 'string' || o.s !== sign(body, this._salt(), this.account)) { this.tampered = true; return; }
      const d = JSON.parse(body);
      if ((d.acct || '') !== this.account) return; // another account's cache never carries over
      for (const [k, v] of Object.entries(d.owned || {})) if (ONCE_SKUS.includes(k) && v && VALID_SRC.has(v.src) && (v.src !== 'test' || this.allowTest)) this.owned[k] = v;
      if (d.sub && VALID_SRC.has(d.sub.src) && (d.sub.src !== 'test' || this.allowTest)) this.sub = d.sub;
    } catch { this.tampered = true; }
  }
}

function safeLs() { try { return globalThis.localStorage || null; } catch { return null; } }

/** In-memory Storage for tests. */
export function memStorage(init = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m };
}

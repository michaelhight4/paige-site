// Billing back-ends (dev/kilumen-store). Every back-end has the same small API:
//   available, products() -> {sku: price}, buy(sku) -> {ok, pending?, reason?}, restore() -> {ok, items:[{sku, expiresAt?, autoRenew?}]},
//   manage() (subscription page), src ('play' | 'server' | 'test').
// Android: Google Play Billing through the native KilumenBilling Capacitor plugin (same contract as LifelineBillingPlugin).
// Web: Stripe Checkout via the shared paige-shared Supabase edge function create-checkout, TEST MODE ONLY: the client
//   refuses to redirect unless the server says mode === 'test'. The webhook writes public.entitlements; the client only reads.
import { PRODUCTS, ONCE_SKUS, SUB_SKU, playId, stripeKey } from './config.js?v=v0.2.108-alpha';

const plug = (g = globalThis) => g.Capacitor?.Plugins?.KilumenBilling || null;

export function playBilling(g = globalThis) {
  return {
    src: 'play',
    get available() { return !!plug(g); },
    async products() {
      const p = plug(g); if (!p) return {};
      try {
        const r = await p.getProducts({ inapp: ONCE_SKUS.map(playId), subs: [playId(SUB_SKU)] });
        const out = {};
        for (const d of r?.products || []) out[d.id] = d.price || d.basePlans?.find((b) => b.id === PRODUCTS[SUB_SKU].basePlan)?.price || null;
        return out;
      } catch { return {}; }
    },
    async buy(sku) {
      const p = plug(g); if (!p) return { ok: false, reason: 'Google Play is not available' };
      try {
        const r = await p.purchase(sku === SUB_SKU ? { productId: playId(sku), basePlanId: PRODUCTS[SUB_SKU].basePlan } : { productId: playId(sku) });
        return r?.ok ? { ok: true, ids: r.productIds || [sku] } : { ok: false, reason: r?.reason || 'not purchased' };
      } catch (e) { return { ok: false, reason: e?.message || 'billing error' }; }
    },
    /** Authoritative: what Play says this Google account owns right now. */
    async restore() {
      const p = plug(g); if (!p) return { ok: false, reason: 'Google Play is not available' };
      try {
        const r = await p.restore(); if (!r?.ok) return { ok: false, reason: r?.reason || 'restore failed' };
        const items = [...(r.passes || []).filter((id) => ONCE_SKUS.includes(id)).map((sku) => ({ sku })),
          ...(r.subs || []).filter((s) => s?.id === playId(SUB_SKU)).map((s) => ({ sku: SUB_SKU, autoRenew: !!s.autoRenewing }))];
        return { ok: true, items };
      } catch (e) { return { ok: false, reason: e?.message || 'restore failed' }; }
    },
    async manage() { try { await plug(g)?.manageSubscriptions?.({ productId: playId(SUB_SKU) }); return { ok: true }; } catch (e) { return { ok: false, reason: e?.message }; } },
    async config() { try { return (await plug(g)?.getConfig?.()) || null; } catch { return null; } },
  };
}

/** Web: Stripe Checkout (TEST) through the shared edge function. api: {session() -> {token, uid, anonymous}|null, fetch, url, key} */
export function stripeBilling(api) {
  const call = async (path, opt = {}) => {
    const s = await api.session(); if (!s?.token) return { ok: false, needsAccount: true };
    const r = await api.fetch(`${api.url}${path}`, { ...opt, headers: { apikey: api.key, Authorization: 'Bearer ' + s.token, 'Content-Type': 'application/json', Accept: 'application/json' } });
    let body = null; try { body = await r.json(); } catch { body = null; }
    return { ok: r.ok, status: r.status, body, anonymous: s.anonymous };
  };
  return {
    src: 'server',
    available: true,
    async products() { return Object.fromEntries(Object.values(PRODUCTS).map((p) => [p.sku, p.price])); }, // Stripe prices are server-side
    async buy(sku, { returnUrl, redirect } = {}) {
      if (!PRODUCTS[sku]) return { ok: false, reason: 'unknown product' };
      const r = await call('/functions/v1/create-checkout', { method: 'POST', body: JSON.stringify({ productKey: stripeKey(sku), returnUrl }) });
      if (r.needsAccount || r.anonymous) return { ok: false, needsAccount: true, reason: 'Sign in to buy' };
      if (!r.ok || !r.body?.url) return { ok: false, reason: r.body?.error || 'Could not start checkout' };
      if (r.body.mode !== 'test') return { ok: false, reason: 'Store is in test mode only (server is not in Stripe test mode)' }; // TEST ONLY guard
      redirect?.(r.body.url);
      return { ok: true, pending: true, mode: r.body.mode };
    },
    /** public.entitlements rows for this account (RLS: own rows). product_id 'kilumen:<sku>' / 'kilumen:all_passes_yearly'. */
    async restore() {
      const r = await call(`/rest/v1/entitlements?select=product_id,game_id,expires_at,revoked_at&game_id=eq.kilumen&revoked_at=is.null`);
      if (r.needsAccount) return { ok: false, needsAccount: true, reason: 'Sign in to restore' };
      if (!r.ok || !Array.isArray(r.body)) return { ok: false, reason: 'Could not reach the store' };
      return { ok: true, items: parseServerRows(r.body) };
    },
    async manage() { return { ok: false, reason: 'Manage the subscription from your Stripe receipt email' }; },
  };
}
export function parseServerRows(rows) {
  const out = [];
  for (const row of rows || []) {
    const id = String(row?.product_id || '').replace(/^kilumen:/, '').replace(/:year$/, '');
    if (row?.revoked_at) continue;
    if (id === SUB_SKU) out.push({ sku: SUB_SKU, expiresAt: Date.parse(row.expires_at) || 0 });
    else if (ONCE_SKUS.includes(id)) out.push({ sku: id });
  }
  return out;
}

/** Test back-end (dev hosts with ?store=test, Node tests): buys succeed instantly, labelled TEST. Never on a real channel
 *  unless the URL asks for it, and the Entitlements cache only accepts 'test' items when allowTest is on. */
export function testBilling({ now = () => Date.now(), yearMs = 365 * 24 * 3600 * 1000 } = {}) {
  const owned = new Map();
  return {
    src: 'test', available: true, test: true, owned,
    async products() { return Object.fromEntries(Object.values(PRODUCTS).map((p) => [p.sku, p.price])); },
    async buy(sku) { if (!PRODUCTS[sku]) return { ok: false, reason: 'unknown' }; owned.set(sku, sku === SUB_SKU ? { sku, expiresAt: now() + yearMs } : { sku }); return { ok: true, ids: [sku] }; },
    async restore() { return { ok: true, items: [...owned.values()] }; },
    async manage() { return { ok: true }; },
    lapse() { owned.delete(SUB_SKU); },
  };
}

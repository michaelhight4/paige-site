// Web payments for Lifeline (paigegames.net/play): Stripe Checkout via the shared Supabase edge functions.
//   create-checkout (paige-shared/supabase/functions) -> hosted Checkout URL, priced server-side from the Stripe catalog of
//   whichever mode STRIPE_SECRET_KEY is in (product.metadata.game='lifeline' + price.metadata.sku=<pass id | all_access>).
//   stripe-webhook -> public.stripe_apply -> public.entitlements (+ public.purchases). The client NEVER grants anything:
//   after the redirect back (?checkout=success) it only re-reads entitlements from the server (refreshEntitlements).
// Native Android keeps Google Play Billing (native_bridge.js); this adapter is for the web build only.
import * as N from './network.js';

export const productKey = (passId) => `lifeline:${passId}`;
export const subKey = (plan) => `lifeline:all_access:${plan === 'yearly' ? 'year' : 'month'}`;
const isNative = () => { try { return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); } catch (e) { return false; } };
const returnUrl = () => { const u = new URL(location.href); u.searchParams.delete('checkout'); u.searchParams.delete('session_id'); u.hash = ''; return u.toString(); };

async function checkout(key, redirect = (u) => location.assign(u)) {
  if (!payments.available) return { ok: false, reason: 'Web store not connected yet' };
  const st = N.accountState();
  if (!st.signedIn || st.guest) return { ok: false, needsAccount: true, reason: N.SIGN_IN_TO_BUY };
  const r = await N.netFn('create-checkout', { productKey: key, returnUrl: returnUrl() });
  if (!r.ok || !r.value || !r.value.url) return { ok: false, reason: (r && (r.error || (r.value && r.value.error))) || 'Could not start checkout' };
  redirect(r.value.url);
  return { ok: true, pending: true, mode: r.value.mode };
}

export const payments = {
  name: 'stripe',
  get available() { return N.netConfigured() && !isNative(); },
  purchasePass: (passId, o = {}) => checkout(productKey(passId), o.redirect),
  subscribe: (plan, o = {}) => checkout(subKey(plan), o.redirect),
  // Cancelling happens in Stripe (customer portal / receipt email); the webhook ends the entitlement.
  async cancelSubscription() { return { ok: false, reason: 'Manage your subscription from your Stripe receipt email' }; },
  async restore() { const r = await N.refreshEntitlements(); return { ok: r.ok, reason: r.reason }; },
};

/** On boot: if we came back from Stripe, poll the server a few times until the webhook has granted the item. */
export async function handleCheckoutReturn(onDone, tries = 8, waitMs = 1500) {
  let q; try { q = new URLSearchParams(location.search).get('checkout'); } catch (e) { return null; }
  if (!q) return null;
  try { const u = new URL(location.href); u.searchParams.delete('checkout'); u.searchParams.delete('session_id'); history.replaceState(null, '', u); } catch (e) { /* */ }
  if (q !== 'success') { onDone && onDone({ ok: false, cancelled: true }); return 'cancel'; }
  const before = JSON.stringify(N.ents.all());
  for (let i = 0; i < tries; i++) {
    await N.refreshEntitlements();
    if (JSON.stringify(N.ents.all()) !== before) break;
    await new Promise((r) => setTimeout(r, waitMs));
  }
  onDone && onDone({ ok: true });
  return 'success';
}
export default payments;

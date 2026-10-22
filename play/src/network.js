// Paige Games network layer for Lifeline: shared entitlements (network vs per-game scope), Blue Bucks wallet, shared billing.
// Uses the vendored @paige/shared build (vendor/paige-shared, synced by /workspace/paige-shared `npm run sync`; do not edit there).
//
// Scope rules (see /workspace/quality/GAME_QUALITY_CHECKLIST.md):
//   - Lifeline's own 'no_ads' pass (per-game) removes ads ONLY inside Lifeline, never on paigegames.net.
//   - 'ad_free_life' (Ad-Free for Life, $35 / 35,000 Blue Bucks) is NETWORK scope: no ads in every Paige game and on the website.
//   - The Blue Bucks balance is SERVER-AUTHORITATIVE. This module never changes a real balance locally.
// Local flags (src/premium.js + the EntitlementCache in localStorage) are only an OFFLINE CACHE of server truth.
import { EntitlementCache } from '../vendor/paige-shared/billing/entitlements.js';
import { AD_FREE_LIFE, BB_PER_USD, BB_DISCOUNT_TAG, BB_TAG_COLORS, bbPayChoice, formatBB, formatUSD } from '../vendor/paige-shared/billing/catalog.js';
import { PaigeNet } from '../vendor/paige-shared/net/rest.js';
import { PlayBilling, capacitorPlugin } from '../vendor/paige-shared/billing/play.js';
import { StripeCheckout } from '../vendor/paige-shared/billing/stripe.js';
import { ServerWallet, TestWallet, NoWallet, newIdemKey } from '../vendor/paige-shared/wallet/bluebucks.js';
import { PaigeAuth } from '../vendor/paige-shared/auth/auth.js';
import { AdminClient } from '../vendor/paige-shared/admin/admin.js';
import * as Premium from './premium.js';

export const GAME = 'lifeline';
// Public Supabase config (URL + anon key ONLY; never a service-role key). null until Gary turns the backend on for Lifeline.
export const NET_CONFIG = null;
export { AD_FREE_LIFE, BB_PER_USD, BB_DISCOUNT_TAG, BB_TAG_COLORS, bbPayChoice, formatBB, formatUSD };

const net = new PaigeNet(NET_CONFIG);
export const netConfigured = () => !!net.configured;
export const ents = new EntitlementCache(GAME);
export const auth = new PaigeAuth(net);
export const admin = new AdminClient(net);

// ---- accounts (guest-first) ----
// With a backend: an anonymous guest is created on first launch; buying needs a linked account (server enforces too).
// Test build (no backend): a local TEST flag stands in for "account linked" so the flow can be exercised. Never real.
const TEST_LINK_KEY = 'lifesim.testaccount.v1';
const testLinked = () => { try { return localStorage.getItem(TEST_LINK_KEY) === '1'; } catch (e) { return false; } };
export const setTestLinked = (on) => { try { if (on) localStorage.setItem(TEST_LINK_KEY, '1'); else localStorage.removeItem(TEST_LINK_KEY); } catch (e) { /* */ } };
export const canBuy = () => (net.configured ? auth.canBuy() : testLinked());
export const accountState = () => (net.configured ? auth.state() : { configured: false, signedIn: testLinked(), guest: !testLinked(), userId: null, email: testLinked() ? 'test account (local)' : null });
export async function bootAccount() { if (!net.configured) return; auth.handleRedirect(); await auth.ensureGuest(); await refreshEntitlements(); }
export const SIGN_IN_TO_BUY = 'Sign in to buy. Create a free account in Settings > Account; your guest progress comes with you.';
const isNative = () => { try { const c = globalThis.window && window.Capacitor; return !!(c && c.isNativePlatform && c.isNativePlatform()); } catch (e) { return false; } };

// ---- entitlements ----
export const adFreeLife = () => ents.owns(AD_FREE_LIFE.sku);
// Lifeline ads are removed by Lifeline's own no_ads / All Access (game scope) OR the network Ad-Free for Life.
export const lifelineAdsRemoved = () => Premium.isUnlocked('no_ads') || adFreeLife();

/** Mirror server entitlements into the offline caches (EntitlementCache + Lifeline premium flags). */
export function applyServerEntitlements(rows) {
  ents.syncFromServer(rows);
  const mine = rows.filter((r) => r.scope === 'game' && r.game_id === GAME).map((r) => ({ sku: String(r.product_id).split(':').pop(), until: r.expires_at ? Date.parse(r.expires_at) : null }));
  for (const p of Premium.passes()) { const on = mine.some((m) => m.sku === p.id); if (Premium.owned(p.id) !== on) Premium.setOwned(p.id, on); }
  const sub = mine.find((m) => m.sku === 'all_access' && (m.until == null || m.until > Date.now()));
  if (!!sub !== Premium.subscribed()) Premium.setSubscription(sub ? 'monthly' : null);
}
/** Pull entitlements from the server when signed in; offline/unconfigured -> keep the cache as is. */
export async function refreshEntitlements() {
  if (!net.configured || !net.signedIn()) return { ok: false, reason: net.configured ? 'signed out' : 'offline cache' };
  const r = await net.select('entitlements', 'select=product_id,game_id,scope,source,expires_at');
  if (!r.ok) return { ok: false, reason: r.error };
  applyServerEntitlements(r.value); return { ok: true };
}
/** After a native Play purchase (passes / All Access / ad_free_life): verify server-side when signed in, then re-sync. */
export async function verifyPlayPurchase(productId, purchaseToken) {
  if (!net.configured || !net.signedIn() || !purchaseToken) return { ok: true, cached: true };
  const pb = new PlayBilling(GAME, capacitorPlugin('LifelineBilling'), net);
  const r = await pb.verify(productId, purchaseToken); if (r.ok) await refreshEntitlements(); return r;
}

/** Ad-Free for Life purchase. Native -> Play sku; website build with backend -> Stripe Checkout; otherwise a TEST local grant. */
export async function buyAdFreeLife() {
  if (adFreeLife()) return { ok: true, already: true };
  if (!canBuy()) return { ok: false, needsAccount: true, reason: SIGN_IN_TO_BUY };
  if (isNative()) {
    try { const r = await capacitorPlugin('LifelineBilling').purchase({ productId: AD_FREE_LIFE.sku }); if (r && (r.ok || r.reason === 'already_owned')) { await verifyPlayPurchase(AD_FREE_LIFE.sku, r.purchaseToken); if (!adFreeLife()) grantLocal(AD_FREE_LIFE, 'play'); return { ok: true }; } return { ok: false, reason: (r && r.reason) || 'cancelled' }; } catch (e) { return { ok: false, reason: String(e && e.message || e) }; }
  }
  if (net.configured) {
    if (!net.signedIn()) return { ok: false, reason: 'Sign in to buy Ad-Free for Life' };
    const r = await new StripeCheckout(null, net).start(AD_FREE_LIFE.sku); return r.ok ? { ok: true, redirecting: true } : { ok: false, reason: r.reason };
  }
  grantLocal(AD_FREE_LIFE, 'test'); return { ok: true, test: true };
}
function grantLocal(p, source) { ents.grant({ sku: p.sku, game: null, scope: 'network', source, expiresAt: null, removesAds: true }); }
export const resetTestNetwork = () => { ents.revoke(AD_FREE_LIFE.sku, 'network'); };

// ---- Blue Bucks ----
// Redeemable here: Lifeline passes, All Access (1 month), and the network Ad-Free for Life.
// Prices come ONLY from the shared priceInBB()/bbPayChoice() (paige-shared billing/catalog): passes are 10% off in Blue Bucks,
// rounded to 10 BB. The server charges the same amount (paige_private.bb_charge). bb = shown AND charged; fullBB = struck-through.
const mkItem = (sku, game, title, kind, priceCents, owned, scope, serverSku = sku, bbPrice = null) => {
  const c = bbPayChoice({ kind, priceCents, bbPrice }); return { sku, serverSku, game, title, kind, usd: c.usd, priceCents, bb: c.price, fullBB: c.full, discounted: c.discounted, tag: c.tag, owned, scope };
};
export function redeemables() {
  const P = Premium.catalog();
  const list = Premium.forSale().map((p) => mkItem(p.id, GAME, p.name, 'entitlement', Math.round(p.price * 100), Premium.owned(p.id), 'game'));
  list.unshift(mkItem('all_access_1m', GAME, `${(P.subscription && P.subscription.name) || 'All Access'} (1 month)`, 'subscription', Math.round(((P.subscription && P.subscription.monthly) || 8) * 100), Premium.subscribed(), 'game', 'all_access'));
  list.unshift(mkItem(AD_FREE_LIFE.sku, null, AD_FREE_LIFE.title + ' (every Paige game + website)', AD_FREE_LIFE.kind, AD_FREE_LIFE.priceCents, adFreeLife(), 'network', AD_FREE_LIFE.sku, AD_FREE_LIFE.bbPrice));
  return list;
}
export const redeemable = (sku) => redeemables().find((r) => r.sku === sku) || null;
const priceOf = (game, sku) => { const x = redeemables().find((r) => (r.serverSku === sku || r.sku === sku) && r.game === game); return x ? x.bb : null; };
const testMode = () => !net.configured && !isNative();
export const wallet = net.configured ? new ServerWallet(net) : testMode() ? new TestWallet(priceOf, 'lifesim.testwallet.v1') : new NoWallet();
export const walletKind = () => wallet.kind;
export async function walletBalance() { const r = await wallet.balance(); return r.ok ? { ok: true, balance: r.value } : { ok: false, reason: r.error }; }
export const addTestBucks = (n) => (wallet.kind === 'test' ? wallet.addTest(n) : null);
/** Redeem Blue Bucks for an item. Server wallet: idempotent RPC, then re-sync entitlements. Test wallet: local grant (labelled TEST). */
export async function redeem(sku, idemKey = newIdemKey()) {
  const item = redeemable(sku); if (!item) return { ok: false, reason: 'not redeemable' };
  if (item.owned) return { ok: false, reason: 'already owned' };
  if (!canBuy()) return { ok: false, needsAccount: true, reason: SIGN_IN_TO_BUY };
  const r = await wallet.redeem(item.game, item.serverSku, idemKey); if (!r.ok) return r; // server sku: all_access_1m -> all_access
  if (wallet.kind === 'server') await refreshEntitlements();
  else if (sku === AD_FREE_LIFE.sku) grantLocal(AD_FREE_LIFE, 'test');
  else if (sku === 'all_access_1m') Premium.setSubscription('monthly');
  else Premium.setOwned(sku, true);
  return r;
}

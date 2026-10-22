// VENDORED from paige-shared — do not edit; run `npm run sync` in /workspace/paige-shared.
/** $1 = 1,000 Blue Bucks. Blue Bucks are the network currency, redeemable in any Paige Games title. */
export const BB_PER_USD = 1000;
export const centsToBB = (cents) => Math.round(cents * (BB_PER_USD / 100));
export const formatBB = (n) => `${Math.max(0, Math.floor(n)).toLocaleString("en-US")} Blue Bucks`;
export const formatUSD = (cents) => `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;
/** Network catalogue (mirror of public.network_products, scope = network). The DB is authoritative. */
export const AD_FREE_LIFE = { sku: "ad_free_life", game: null, scope: "network", kind: "entitlement", title: "Ad-Free for Life", priceCents: 3500, bbPrice: 35000, removesAds: true };
export const BB_PACKS = [5, 10, 20, 50].map((usd) => ({ sku: `bb_${usd * BB_PER_USD}`, game: null, scope: "network", kind: "bucks_pack", title: `${(usd * BB_PER_USD).toLocaleString("en-US")} Blue Bucks`, priceCents: usd * 100, bbPrice: null, removesAds: false, grantsBB: usd * BB_PER_USD }));
export const NETWORK_PRODUCTS = [AD_FREE_LIFE, ...BB_PACKS];
// ---------- Blue Bucks pass discount (Gary, Oct 22 2026) ----------
// THE ONLY PLACE the discount is defined. Every Paige Games title (and future ones) prices passes in Blue Bucks
// through priceInBB(); the server mirror is paige_private.bb_charge() in supabase/migrations/20261022000008_bb_pass_discount.sql
// (same percent, same rounding). Change both together; test/shared.test.mjs + supabase/tests/network.test.mjs check they agree.
/** 10% off game passes when paid with Blue Bucks. Stored as a whole percent so the maths stays exact integers. */
export const BB_PASS_DISCOUNT_PCT = 10;
export const BB_PASS_DISCOUNT = BB_PASS_DISCOUNT_PCT / 100;
/** Discounted Blue Bucks prices are rounded to the nearest 10 BB (half rounds up): 5,391 -> 5,390, 31,500 -> 31,500. */
export const BB_ROUND_TO = 10;
export const BB_DISCOUNT_TAG = `${BB_PASS_DISCOUNT_PCT}% OFF with Blue Bucks`;
/** Passes = things you own or unlock (entitlements, bundles, time passes). NOT Blue Bucks packs, NOT in-game currency (Rift Stones / Echo Coins). */
export const PASS_KINDS = ["entitlement", "subscription", "bundle"];
export const isPass = (p) => PASS_KINDS.includes(p.kind);
/** Normal (undiscounted) Blue Bucks price: catalogue bbPrice, else the USD price x 1,000. null = not sold for Blue Bucks. */
export function fullPriceInBB(p) {
    if (p.kind === "bucks_pack")
        return null;
    if (p.bbPrice != null)
        return p.bbPrice;
    return p.priceCents != null && p.priceCents > 0 ? centsToBB(p.priceCents) : null;
}
/** What a player is SHOWN and CHARGED in Blue Bucks. Passes get BB_PASS_DISCOUNT_PCT off, rounded to BB_ROUND_TO. */
export function priceInBB(p) {
    const full = fullPriceInBB(p);
    if (full == null)
        return null;
    if (!isPass(p))
        return full;
    return Math.round((full * (100 - BB_PASS_DISCOUNT_PCT)) / (100 * BB_ROUND_TO)) * BB_ROUND_TO;
}
/** Everything a pay-choice UI needs: real-money price, discounted BB price, struck-through full BB price, tag. */
export function bbPayChoice(p) {
    const full = fullPriceInBB(p), price = priceInBB(p);
    const discounted = full != null && price != null && price < full;
    return { usd: p.priceCents != null && p.priceCents > 0 ? formatUSD(p.priceCents) : null, price, full, discounted, tag: discounted ? BB_DISCOUNT_TAG : null };
}
/** Bright, high-contrast tag colours (21:1-ish dark on yellow) shared by every game's pay choice. */
export const BB_TAG_COLORS = { bg: "#ffd60a", fg: "#1a1300" };

// Purchase adapter interfaces for Boundwake.
 // Play Billing / Apple IAP / itch DLC — STUBBED until Gary creates console product IDs.
 // Web (paigegames.net): no Stripe-on-itch; website store approval is separate. Store builds may ship ads/IAP first.
import * as Premium from './premium.js';

const isNative = () => {
  try { return !!(globalThis.Capacitor && globalThis.Capacitor.isNativePlatform && globalThis.Capacitor.isNativePlatform()); }
  catch (_) { return false; }
};
const isItch = () => {
  try {
    const q = new URLSearchParams(location.search);
    if (q.get('platform') === 'itch') return true;
    if (/itch\.io$/i.test(location.hostname)) return true;
  } catch (_) { /* */ }
  return false;
};

/** Detect store channel for UI copy. */
export function channel() {
  if (isItch()) return 'itch';
  if (isNative()) {
    try {
      const p = globalThis.Capacitor.getPlatform?.() || '';
      if (p === 'ios') return 'apple';
      if (p === 'android') return 'android';
    } catch (_) { /* */ }
    return 'native';
  }
  return 'web';
}

/**
 * Play Billing stub (Cap Android).
 * TODO(Gary): create one-time products in Play Console with ids matching premium.json playProductId.
 * TODO(Coder): wire @capacitor-community or BoundwakeBilling plugin like LifelineBilling.
 */
export const playBilling = {
  name: 'play_billing',
  available: () => isNative() && (globalThis.Capacitor?.getPlatform?.() === 'android'),
  async getProducts() {
    // TODO: Capacitor.Plugins.BoundwakeBilling.getProducts({ inapp: Premium.forSale().map(p => p.playProductId || p.id), subs: ['all_access'] })
    return { ok: false, reason: 'Play Billing not wired — create products in Play Console first', products: [] };
  },
  async purchasePass(passId) {
    const def = Premium.passDef(passId);
    if (!def) return { ok: false, reason: 'Unknown pass' };
    // TODO: plug('BoundwakeBilling').purchase({ productId: def.playProductId || passId })
    return { ok: false, reason: `TODO: Play product "${def.playProductId || passId}" — Gary must create in Play Console`, todo: true };
  },
  async restore() {
    // TODO: restore from Play → Premium.setOwned
    return { ok: false, reason: 'TODO: Play restore purchases', todo: true };
  },
};

/**
 * Apple IAP stub (Cap iOS / StoreKit 2).
 * TODO(Gary): create non-consumable IAPs in App Store Connect; ids in premium.json appleProductId.
 */
export const appleIap = {
  name: 'apple_iap',
  available: () => isNative() && (globalThis.Capacitor?.getPlatform?.() === 'ios'),
  async getProducts() {
    return { ok: false, reason: 'Apple IAP not wired — create products in ASC first', products: [] };
  },
  async purchasePass(passId) {
    const def = Premium.passDef(passId);
    if (!def) return { ok: false, reason: 'Unknown pass' };
    return { ok: false, reason: `TODO: Apple product "${def.appleProductId || passId}" — Gary must create in App Store Connect`, todo: true };
  },
  async restore() {
    return { ok: false, reason: 'TODO: Apple restore purchases', todo: true };
  },
};

/**
 * itch.io DLC entitlement check stub.
 * Sell each pass as a DLC (or bundle) on the Boundwake itch page — NOT Stripe-on-itch.
 * HTML5 build verifies via itch.io API / download keys — see docs/ITCH_DLC.md.
 */
export const itchDlc = {
  name: 'itch_dlc',
  available: () => isItch(),
  async checkEntitlement(passId) {
    const def = Premium.passDef(passId);
    if (!def) return { ok: false, owned: false, reason: 'Unknown pass' };
    // TODO: itch.itchio API — user ownership of game + DLC file with itchSku
    // Options: (1) itch.io JavaScript API when embedded; (2) download-key query on launch;
    // (3) server verify with itch OAuth for signed-in buyers.
    return {
      ok: false,
      owned: false,
      reason: `TODO: verify itch DLC "${def.itchSku || passId}" — see docs/ITCH_DLC.md`,
      todo: true,
      itchSku: def.itchSku,
    };
  },
  async restoreAll() {
    const owned = [];
    for (const p of Premium.forSale()) {
      const r = await this.checkEntitlement(p.id);
      if (r.owned) { Premium.setOwned(p.id, true); owned.push(p.id); }
    }
    return { ok: true, owned, stub: true };
  },
};

/**
 * Unified purchase entry used by UI.
 * Dev/local: can grant via Premium.setOwned when Premium.canDevGrant().
 * Live web: returns coming_soon (website store approval separate).
 */
export async function purchasePass(passId) {
  const def = Premium.passDef(passId);
  if (!def) return { ok: false, reason: 'Unknown pass' };
  if (Premium.owned(passId)) return { ok: true, already: true };

  const ch = channel();
  if (ch === 'android') return playBilling.purchasePass(passId);
  if (ch === 'apple') return appleIap.purchasePass(passId);
  if (ch === 'itch') {
    const r = await itchDlc.checkEntitlement(passId);
    if (r.owned) { Premium.setOwned(passId, true); return { ok: true, via: 'itch' }; }
    return { ok: false, reason: r.reason || 'Buy this DLC on the Boundwake itch.io page, then Restore.', todo: true, itchSku: def.itchSku };
  }

  // Web alpha: no live Stripe checkout for Boundwake yet (Gary: website approval separate).
  if (Premium.canDevGrant()) {
    Premium.setOwned(passId, true);
    return { ok: true, via: 'dev_grant', note: 'Local/devpass grant only' };
  }
  return {
    ok: false,
    comingSoon: true,
    reason: 'Store purchase coming with Play / App Store / itch launch. Autopilot stays free on web alpha.',
  };
}

export async function restorePurchases() {
  const ch = channel();
  if (ch === 'android') return playBilling.restore();
  if (ch === 'apple') return appleIap.restore();
  if (ch === 'itch') return itchDlc.restoreAll();
  return { ok: false, reason: 'Nothing to restore on web yet' };
}

export const payments = {
  channel,
  purchasePass,
  restorePurchases,
  playBilling,
  appleIap,
  itchDlc,
};
export default payments;

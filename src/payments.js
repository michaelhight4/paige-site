// PAYMENTS ADAPTER STUB. Real payments are NOT implemented: the platform (App Store / Play Billing / Stripe web / Steam) is undecided.
// Implement this interface for the chosen platform; premium.js only needs `setOwned/setSubscription` to be called after a verified purchase.
//   purchasePass(passId)  -> Promise<{ok, receipt?, reason?}>   one-time, $5.99 each (data/premium.json)
//   subscribe(plan)       -> Promise<{ok, receipt?, reason?}>   plan 'monthly' ($8) | 'yearly' ($80)
//   cancelSubscription()  -> Promise<{ok}>                      premium.js must then call setSubscription(null) (passes lapse; owned passes remain)
//   restore()             -> Promise<{ok, passes:[ids], subscription:null|{plan,until}}>  re-sync entitlements on a new device
// Until then the Store screen uses TEST TOGGLES that flip the local flags directly.
export const payments = {
  available: false,
  name: 'stub',
  async purchasePass() { return { ok: false, reason: 'payments not implemented' }; },
  async subscribe() { return { ok: false, reason: 'payments not implemented' }; },
  async cancelSubscription() { return { ok: false, reason: 'payments not implemented' }; },
  async restore() { return { ok: false, passes: [], subscription: null, reason: 'payments not implemented' }; },
};
export default payments;

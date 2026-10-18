// Ads hook. Intentionally does nothing (no ad SDK is integrated); it only respects the no_ads pass / subscription.
// Call gate(placement) wherever a real ad would be shown (e.g. 'refresh_inventory', 'age_interstitial'); await it; proceed.
import * as Premium from './premium.js';
export const enabled = () => !Premium.isUnlocked('no_ads');
export async function gate(placement) { return { shown: false, skipped: !enabled(), placement, reason: enabled() ? 'ad SDK not integrated (stub)' : 'no_ads' }; }
export const settingsRow = () => ({ id: 'ads', label: 'Ads', value: enabled() ? 'On (none implemented)' : 'Off - No Ads', locked: enabled() });

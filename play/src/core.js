import { clamp } from './rng.js';
export const STATS = ['health', 'happiness', 'smarts', 'looks'];
export const ALLSTATS = ['health', 'happiness', 'smarts', 'looks', 'fame', 'karma', 'crazy', 'stress'];
export const STAT_ALIAS = { happy: 'happiness' };
export function log(s, text, kind = 'info') {
  s.log.push({ age: Math.round(s.age * 100) / 100, text, kind }); s.logSeq = (s.logSeq || 0) + 1;
  if (s.log.length > 1500) s.log.shift();
}
export const earn = (s, x) => { s.cash += x; if (x > 0) s.incYear = (s.incYear || 0) + x; };
// Recurring costs may push the player into debt; purchases must check s.cash first.
export function spend(s, x) {
  if (!Number.isFinite(x)) return; // ignore NaN/undefined amounts (missing upkeep etc.)
  if (s.cash >= x) s.cash -= x;
  else if (s.bkLedger && s.age >= 18 && s.alive && s.flags && !s.noBankruptcy) s.cash -= x; // inside a turn tick: cash may dip below 0; Bankruptcy.settle() nets the year after all income is in
  else if (s.age >= 18 && s.alive && s.flags && !s.noBankruptcy) { s.shortfall = (s.shortfall || 0) + (x - s.cash); s.cash = 0; } // adults: the bankruptcy popup decides (see bankruptcy.js)
  else { s.debt += x - s.cash; s.cash = 0; }
}
export function addStat(s, k, d) { k = STAT_ALIAS[k] || k; if (s.stats[k] == null) s.stats[k] = 0; s.stats[k] = clamp(s.stats[k] + d, 0, 100); }
export const fill = (t, o) => String(t).replace(/\{(\w+)\}/g, (m, k) => (o[k] != null ? o[k] : m));

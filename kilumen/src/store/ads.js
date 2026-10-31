// Interstitial timing (dev/kilumen-store, Gary Oct 31 2026): one interstitial per 10 minutes of ACTIVE play, only at a safe
// moment: never in a battle, cutscene, dialogue, text entry or a menu / purchase. no_ads or the subscription turn them off,
// and Steam / desktop never gets an ad provider at all (channel.js). Provider = vendored paige-shared ads.
import { ADS } from './config.js?v=v0.2.108-alpha';

/** Why now is NOT a safe moment (string) or null. ctx: {scene, ui, doc, shopOpen} */
export function unsafeReason({ scene, ui, doc, shopOpen } = {}) {
  if (shopOpen) return 'purchase';
  const lock = scene?.saveLockReason?.(); // battle / trainer walk-up / script / cutscene / dialogue / starter pick (overworld.js)
  if (lock) return lock === 'dialogue' ? 'dialogue' : /battle|rtb|wild|trainer/.test(lock) ? 'battle' : lock === 'script' ? 'cutscene' : lock;
  if (scene?.fade) return 'cutscene';
  if (scene?.dialog?.active) return 'dialogue';
  if (ui?.currentBattle && ui.currentBattle.done === false) return 'battle';
  if (ui?.active || ui?.modal) return 'menu';
  const el = doc?.activeElement, tag = el?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return 'text entry';
  if (doc?.querySelector?.('.kacct, .pg-ad-full, .kstore-ov')) return 'overlay';
  return null;
}

export class AdTimer {
  /** o: {intervalMs, idleAfterMs, maxFrameGapMs, now} */
  constructor(o = {}) {
    this.intervalMs = o.intervalMs ?? ADS.activeIntervalMs;
    this.idleAfterMs = o.idleAfterMs ?? ADS.idleAfterMs;
    this.maxGap = o.maxFrameGapMs ?? ADS.maxFrameGapMs;
    this.now = o.now || (() => Date.now());
    this.activeMs = 0; this.lastTick = null; this.lastInput = -Infinity; this.shown = 0; this.busy = false; this.retryAt = 0;
  }
  input(t = this.now()) { this.lastInput = t; }
  /** Count play time since the last tick, only while the player is active and the gap is a real frame gap. */
  tick(t = this.now(), { paused = false } = {}) {
    const dt = this.lastTick == null ? 0 : t - this.lastTick; this.lastTick = t;
    if (paused || dt <= 0 || dt > this.maxGap || t - this.lastInput > this.idleAfterMs) return this.activeMs;
    this.activeMs += dt; return this.activeMs;
  }
  get due() { return this.activeMs >= this.intervalMs; }
  /** Show one if due and safe. show() -> Promise<{shown}>. -> {shown, reason} */
  async maybeShow({ off = false, unsafe = null, show, t = this.now() } = {}) {
    if (off) { this.activeMs = 0; return { shown: false, reason: 'ad-free' }; } // no backlog builds up while ads are off
    if (!this.due) return { shown: false, reason: 'not due' };
    if (unsafe) return { shown: false, reason: unsafe }; // stays due: the first safe moment gets it
    if (this.busy || t < this.retryAt) return { shown: false, reason: 'busy' };
    this.busy = true;
    try {
      const r = (await show?.()) || { shown: false };
      if (r.shown) { this.activeMs = 0; this.shown++; } else this.retryAt = t + 60000; // no fill: try again in a minute of wall time
      return r;
    } finally { this.busy = false; }
  }
}

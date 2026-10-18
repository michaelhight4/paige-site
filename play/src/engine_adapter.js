// EngineAdapter: implements the UI adapter contract (ui/ADAPTER.md) against the real lifesim engine.
// Pure JS (no DOM); runs in Node for tests. All state is the engine state `s` (saved with E.save after every mutating call).
import * as E from './engine.js';
import { D } from './data.js';
import * as Premium from './premium.js';
import * as PFx from './premium_fx.js';
import * as Legacy from './legacy.js';
import * as B from './slice_bridge.js';
import * as Text from './textpack.js';
import { life } from './adapter_life.js';
import { assets } from './adapter_assets.js';
import { bizApi, unlockApi } from './adapter_biz.js';
import { growth } from './adapter_growth.js';
import { setUnlocks } from './unlocks.js';

const isNode = typeof window === 'undefined';
async function readJson(rel) {
  if (isNode) { const fs = await import('node:fs'); return JSON.parse(fs.readFileSync(new URL(rel, import.meta.url), 'utf8')); }
  return (await fetch(new URL(rel, import.meta.url))).json();
}
export class EngineAdapter {
  constructor(opts = {}) { this.opts = opts; this.s = null; this.cfg = null; this.research = []; }
  async init() {
    await E.loadData(); await Text.loadTextPack();
    this.cfg = await readJson('../ui/data/ui_config.json'); this.research = await readJson('../ui/data/research_activities.json'); setUnlocks(await readJson('../ui/data/unlocks.json'));
    if (!this.opts.fresh) { const g = E.load(); if (g && g.v === 2 && g.alive !== undefined) this.s = g; }
    if (!this.s) this.s = E.newGame({ seed: this.opts.seed });
    this.ensureSeen();
  }
  getConfig() { return this.cfg; }
  save() { if (this.opts.noSave) return; E.save(this.s); }
  // ---- premium / store / settings ----
  getPremium() { const st = Premium.status(); return { ...st, subscription: Premium.catalog().subscription, test: true, paymentsAvailable: false }; }
  setPremiumFlag(id, on) { Premium.setOwned(id, on); return this.getPremium(); }
  setSubscription(plan) { Premium.setSubscription(plan); return this.getPremium(); }
  applyPremiumNow() { const done = PFx.applyStart(this.s); return { ok: true, applied: done, message: done.length ? 'Applied: ' + done.join(', ') : 'Nothing new to apply.' }; }
  resetPremium() { Premium.resetAll(); return this.getPremium(); }
  getSettings() { return { muted: false, ads: { enabled: !Premium.isUnlocked('no_ads'), note: 'Ads are a stub; nothing is shown.' }, textPack: Text.status() }; }
  debugSetup(o = {}) { const s = this.s; if (o.cash != null) s.cash = o.cash; if (o.age != null) { s.age = o.age; if (o.age >= 18) { s.school = null; s.edu = Math.max(s.edu, 1); } else if (o.age >= 12) s.school = 'high'; else if (o.age >= 5) s.school = 'primary'; } return this.getState(); }
}
Object.assign(EngineAdapter.prototype, life, assets, bizApi, unlockApi, growth);
// persist after every mutating call
for (const k of Object.getOwnPropertyNames(EngineAdapter.prototype)) {
  const f = EngineAdapter.prototype[k];
  if (typeof f !== 'function' || k === 'constructor' || /^(get|person|entries|res|mark|sl$|card|nextEvent|owned|asset$|cardV|total|bjView|worldActs|findWorld|applyWorldFx|init|save|debugSetup|reload|prepare)/.test(k)) continue;
  EngineAdapter.prototype[k] = function (...a) { const r = f.apply(this, a); if (r && typeof r.then === 'function') return r.then((x) => { this.save(); return x; }); this.save(); return r; };
}
export default EngineAdapter;

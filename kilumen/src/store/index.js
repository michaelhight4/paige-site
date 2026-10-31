// Kilumen store wiring (dev/kilumen-store, Gary 2:15 PM CT Oct 31 2026). attachStore(scene, sys) from attachSystems.
//   Android (Capacitor): Google Play Billing (KilumenBilling plugin) + AdMob (Google TEST ids until Gary sends real ones)
//   Web (paigegames.net): Stripe Checkout TEST mode + the web ad provider (AdSense adBreak, test mode)
//   Steam / desktop / unknown: nothing. No shop tile, no ad provider, no timers, no money / XP wrappers (channel.js).
import { detectChannel, currentEnv, storeOn } from './channel.js?v=v0.2.108-alpha';
import { Entitlements } from './entitlements.js?v=v0.2.108-alpha';
import { playBilling, stripeBilling, testBilling } from './billing.js?v=v0.2.108-alpha';
import { AdTimer, unsafeReason } from './ads.js?v=v0.2.108-alpha';
import { storeState, payDailyGold, grantKiluPack, boostMult, boostBonus, boostXp, boardCovers } from './perks.js?v=v0.2.108-alpha';
import { ADS, STORE_FLAGS, PRODUCTS, SUB_SKU } from './config.js?v=v0.2.108-alpha';

/** Off switch object: what the game sees on Steam / desktop (and when the store fails to start). */
export const STORE_OFF = Object.freeze({ on: false, channel: 'none', xpMult: () => 1, moneyBonus: () => 0, boostXp: (n) => n, has: () => false, adsOn: false, shopOn: false });

export class KilumenStore {
  /** o: {channel, billing, ents, timer, ads (AdsController or {interstitial}), flags, now, doc, ui} */
  constructor(scene, sys, o = {}) {
    this.scene = scene; this.sys = sys; this.on = true;
    this.channel = o.channel?.id || 'web'; this.test = !!o.channel?.test;
    this.billing = o.billing; this.ents = o.ents; this.ads = o.ads || null;
    this.timer = o.timer || new AdTimer({ now: o.now });
    this.flags = { ...STORE_FLAGS, ...(o.flags || {}) };
    this.doc = o.doc === undefined ? globalThis.document : o.doc;
    this.prices = {}; this.shopOpen = false; this.listeners = new Set(); this.lastAd = null;
    this.shopOn = true; this.adsOn = true;
    this.ents.on(() => { this.applyPerks(); this._emit(); });
    this._wireBoard();
  }
  get st() { return storeState(this.sys.state); }
  has(sku) { return this.ents.has(sku); }
  xpMult() { return boostMult(this.ents); }
  boostXp(n) { return boostXp(n, this.ents); }
  moneyBonus(amount) { return boostBonus(amount, this.ents); }
  adFree() { return this.ents.adsRemoved(); } // no_ads, or the subscription (covers no_ads) while active
  on_(f) { this.listeners.add(f); return () => this.listeners.delete(f); }
  _emit() { for (const f of this.listeners) try { f(); } catch { /* */ } }

  /** board_unlock overlay: the RT board reads every non-key-card node as maxed; company.board is never written, so the
   *  points ledger and the reset (respec) keep working exactly as before, and the real board shows again on lapse. */
  _wireBoard() {
    const rt = this.sys.rtBenefits; if (!rt || rt._storeWired) return;
    rt._storeWired = true;
    rt.perkMax = (node) => this.ents.has('board_unlock') && boardCovers(node);
  }
  /** Restore entitlements from the verified source (boot, resume, after a purchase). */
  async restore() {
    const r = await this.billing.restore();
    if (r.ok) this.ents.applyVerified(r.items, this.billing.src);
    this.applyPerks();
    return r;
  }
  async loadPrices() { try { this.prices = { ...(await this.billing.products()) }; } catch { /* keep config prices */ } return this.prices; }
  priceOf(sku) { return this.prices[sku] || PRODUCTS[sku]?.price || ''; }
  /** Buy: the back-end charges, then entitlements are re-read from the verified source (never granted on the client's word). */
  async buy(sku, o = {}) {
    if (this.ents.has(sku) && (sku === SUB_SKU || this.ents.ownsOnce(sku))) return { ok: false, reason: 'owned' };
    if (sku === 'kilu_pack' && !this.flags.kiluPackLive) return { ok: false, reason: 'coming_soon' };
    const r = await this.billing.buy(sku, o);
    if (r.ok && !r.pending) await this.restore();
    return r;
  }
  /** Per-save perks that depend on time / saves: daily gold, the pack. Safe to call any time (idempotent). */
  applyPerks() {
    const sc = this.scene, st = this.st;
    const paid = payDailyGold(st, sc?.clock?.day, this.ents, this.sys.wallet);
    if (paid) { this._dirty(); sc?.toast?.(`[PH] Daily gold: +${paid}`); }
    if (this.ents.has('kilu_pack') && (sc?.party?.length || 0) > 0 && !sc?.busy) {
      const got = grantKiluPack(st, sc?.store?.extra?.saveId || sc?.saveId || this.sys.state.saveId || sc?._saveId, this.ents, {
        live: !!this.flags.kiluPackLive, make: (e) => this.makeKilu?.(e), add: (c) => this.sys.party?.add?.(c, this.sys.company?.idLevel || 1),
      });
      if (got.length) { this._dirty(); sc?.toast?.(`[PH] Kilu Pack: ${got.length} Kilu joined you`); }
    }
  }
  _dirty() { if (this.scene) this.scene._dirty = true; }
  /** One loop step (1 s): count active play, pay perks, show a due interstitial at a safe moment. */
  async step(t = Date.now()) {
    const sc = this.scene;
    if (sc?.player?.moving) this.timer.input(t);
    this.timer.tick(t, { paused: !!this.doc?.hidden });
    this.applyPerks();
    if (!this.ads) return null;
    const ui = this.ui || globalThis.kilumen?.ui;
    const r = await this.timer.maybeShow({ off: this.adFree(), unsafe: unsafeReason({ scene: sc, ui, doc: this.doc, shopOpen: this.shopOpen || ui?.top?.scr === 'store' }), t,
      show: async () => {
        const release = sc?.lockSave?.('ad'); // no save, no input while the ad is up
        try { return await this.ads.interstitial({}, { ignoreCaps: true }); } finally { release?.(); }
      } });
    this.lastAd = r; return r;
  }
}

/** Build the store for this page. Returns STORE_OFF on Steam / desktop / unknown hosts. */
export function attachStore(scene, sys, opts = {}) {
  const channel = opts.channel || detectChannel(opts.env || currentEnv());
  if (!storeOn(channel)) { sys.store = { ...STORE_OFF, channel: channel.id }; return sys.store; }
  const q = opts.query || new URLSearchParams(globalThis.__kilumenBootSearch ?? globalThis.location?.search ?? '');
  const flags = { kiluPackLive: q.get('store.kilupack') === '1' && channel.test };
  const now = opts.now || (() => Date.now());
  let billing = opts.billing;
  if (!billing) billing = channel.test ? testBilling({ now }) : channel.id === 'android' ? playBilling() : stripeBilling(opts.stripeApi || defaultStripeApi());
  const ents = opts.ents || new Entitlements({ now, account: opts.account || '', allowTest: channel.test });
  const store = new KilumenStore(scene, sys, { channel, billing, ents, flags: { ...flags, ...(opts.flags || {}) }, now, doc: opts.doc, ads: opts.ads || null });
  sys.store = store;
  if (opts.makeKilu) store.makeKilu = opts.makeKilu;
  else import('../systems/creature.js?v=v0.2.108-alpha').then((m) => { store.makeKilu = (e) => m.createCreature({ species: e.placeholder, level: 15, origin: 'kilu_pack' }); }).catch(() => {});
  if (opts.browser === false || typeof window === 'undefined') return store;
  // ---- browser only ----
  store.ready = store.restore().catch(() => null);
  store.loadPrices();
  if (!opts.ads) makeAds(channel, store, q).then((a) => { store.ads = a; }).catch((e) => console.warn('store ads:', e?.message || e));
  for (const ev of ['keydown', 'pointerdown', 'touchstart', 'wheel']) window.addEventListener(ev, () => store.timer.input(), { passive: true, capture: true }); // touch-ok: passive activity ping for the ad play-timer, never activates UI
  window.addEventListener('gamepadconnected', () => store.timer.input());
  setInterval(() => { if (navigator.getGamepads?.()?.some((p) => p?.buttons?.some((b) => b.pressed) || p?.axes?.some((a) => Math.abs(a) > 0.4))) store.timer.input(); store.step().catch(() => {}); }, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) store.restore().catch(() => {}); }); // resume: re-check (a lapse shows up here)
  handleCheckoutReturn(store);
  let tries = 0;
  const tryUi = () => { const ui = sys.ui || globalThis.kilumen?.ui; if (ui?.open) { store.ui = ui; import('./shop_screen.js?v=v0.2.108-alpha').then((m) => m.installShopScreen(ui, store)).catch((e) => console.error('store ui:', e)); } else if (++tries < 240) setTimeout(tryUi, 250); };
  tryUi();
  return store;
}

async function makeAds(channel, store, q) {
  const A = await import('../vendor/paige-shared/ads/index.js?v=v0.2.108-alpha');
  const cfg = { admob: { ...ADS.admob }, web: { ...ADS.web }, rules: ADS.rules, placements: ADS.placements, privacyPolicyUrl: ADS.privacyPolicyUrl, testPreview: true };
  if (channel.id === 'android') { const nc = await store.billing.config?.(); if (nc?.interstitialAdUnitId) { cfg.admob.interstitialId = nc.interstitialAdUnitId; cfg.admob.testing = !!nc.testAds; } }
  else cfg.admob.enabled = false;
  const preview = channel.test || q.get('adpreview') === '1';
  const provider = A.pickAdsProvider(cfg, { preview, previewOptions: { label: () => '[PH] TEST AD', sub: 'Placeholder · test build only', closeAfterS: 3 } });
  if (preview && typeof document !== 'undefined' && !document.querySelector('link[data-pgads]')) {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = new URL('../vendor/paige-shared/ads/ads.css', import.meta.url).href; l.dataset.pgads = '1'; document.head.appendChild(l);
  }
  const c = new A.AdsController({ game: 'kilumen', config: cfg, provider, adsRemoved: () => store.adFree() });
  await c.init();
  return c;
}

function defaultStripeApi() {
  let m = null; const cs = async () => (m ||= await import('../net/cloud_save.js?v=v0.2.108-alpha'));
  let sess = null;
  const api = {
    url: '', key: '', fetch: (...a) => globalThis.fetch(...a),
    session: async () => { const c = await cs(); api.url = c.SB_URL; api.key = c.SB_KEY; sess ||= c.supabaseSession(); return sess(); },
  };
  return api;
}

/** Back from Stripe (?checkout=success): poll the server a few times until the webhook has written the entitlement. */
async function handleCheckoutReturn(store, tries = 8, waitMs = 1500) {
  let q; try { q = new URLSearchParams(globalThis.__kilumenBootSearch ?? location.search).get('checkout'); } catch { return; }
  if (!q) return;
  try { const u = new URL(location.href); u.searchParams.delete('checkout'); u.searchParams.delete('session_id'); history.replaceState(history.state, '', u); } catch { /* */ }
  if (q !== 'success') return;
  const before = JSON.stringify(store.ents.snapshot());
  for (let i = 0; i < tries; i++) { await store.restore(); if (JSON.stringify(store.ents.snapshot()) !== before) break; await new Promise((r) => setTimeout(r, waitMs)); }
}

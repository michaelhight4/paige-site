// RT Store phone tab (dev/kilumen-store). Installed by store/index.js only on Android / web; ui.js lists the tile only
// once ui.scr_store exists, so Steam / desktop never shows it. Text: system_store.* through ui.T, placeholders below
// (every string marked [PH] in game until Text Bot fills data/textbot_requests_store.md).
import { MENU_ICONS } from '../ui/ui_tools2.js?v=v0.2.108-alpha';
import { PRODUCTS, SUB_SKU, SUB_GRANTS } from './config.js?v=v0.2.108-alpha';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fill = (t, v = {}) => String(t).replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? v[k] : m));

/** PLACEHOLDER text. Keys mirror data/textbot_requests_store.md. */
export const STORE_TEXT = {
  labels: {
    tab_title: '[PH] RT Store', buy: '[PH] Buy {price}', subscribe: '[PH] Subscribe {price}', owned: '[PH] Owned', active: '[PH] Active',
    via_sub: '[PH] Included in All Passes', coming_soon: '[PH] Coming soon', cancel: '[PH] Not now', restore: '[PH] Restore purchases',
    manage: '[PH] Manage subscription', per_month: '[PH] {perMonth}/month, billed {price}', test_badge: 'TEST', hint_item: '[PH] Item',
    hint_buy: '[PH] Details / Buy', back: '[PH] Back', sign_in: '[PH] Sign in from Account to buy on the web.',
  },
  products: {
    no_ads: { name: '[PH] No Ads', desc: '[PH] Removes the break-room ads. Forever, on this account.' },
    daily_gold: { name: '[PH] Daily Gold', desc: '[PH] 200 gold every in-game day, on every save.' },
    board_unlock: { name: '[PH] Full Benefits Board', desc: '[PH] Every RT Employee Benefits perk at max rank. Key cards still need earning.' },
    kilu_pack: { name: '[PH] Kilu Pack', desc: '[PH] Four store-only level 15 Kilu: Dragonoid, Mystical, Sky and Magma. Once per save.' },
    all_passes_yearly: { name: '[PH] All Passes', desc: '[PH] Everything above while subscribed, plus +25% XP and money.' },
  },
  confirm: '[PH] Buy {name} for {price}?',
  confirm_sub: '[PH] Subscribe to {name} for {price} ({perMonth}/month)? Renews yearly until you cancel.',
  toast: { bought: '[PH] {name}: done. Thank you!', pending: '[PH] Opening checkout…', failed: '[PH] Purchase did not go through: {reason}',
    restored: '[PH] Purchases restored.', restore_failed: '[PH] Could not restore: {reason}', coming_soon: '[PH] The Kilu Pack is not out yet.', owned: '[PH] You already have this.' },
};
const CSS = `.kst-list{display:flex;flex-direction:column;gap:6px}.kst-row{display:flex;align-items:center;gap:8px;padding:8px 10px}
.kst-row .nm{flex:1;font-weight:700}.kst-row .pr{opacity:.85}.kst-row[data-own="1"] .pr{color:#7fdc8f}.kst-badge{font-size:.7em;padding:1px 5px;border:1px solid currentColor;border-radius:3px;margin-left:6px}
.kst-side button{display:block;margin-top:8px;width:100%}.kst-foot{display:flex;gap:6px;margin-top:8px}.kst-foot button{flex:1}
.kst-split{grid-template-columns:minmax(0,1fr) minmax(220px,40%)}.kst-row{flex-wrap:wrap}.kst-row .nm{min-width:8em}
@media (max-width:600px),(max-aspect-ratio:3/4){.sys-split.kst-split{grid-template-columns:minmax(0,1fr);grid-template-rows:auto minmax(0,1fr);overflow:auto}}`;

export function installShopScreen(ui, store) {
  if (!ui || !store?.on || ui._storeInstalled) return;
  ui._storeInstalled = true;
  if (!MENU_ICONS.store) MENU_ICONS.store = 'shopping-cart';
  if (typeof document !== 'undefined' && !document.querySelector('style[data-kst]')) { const s = document.createElement('style'); s.dataset.kst = '1'; s.textContent = CSS; document.head.appendChild(s); }
  const get = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  const tx = (key, vars) => { const v = ui.T?.(`system_store.${key}`, null); return fill(typeof v === 'string' ? v : get(STORE_TEXT, key) || key, vars); };
  const order = [SUB_SKU, 'no_ads', 'daily_gold', 'board_unlock', 'kilu_pack'];
  const isTop = () => ui.active && ui.top?.scr === 'store';
  store.on_(() => { if (isTop() && !ui.modal) ui.rerender(); });

  const status = (sku) => {
    const e = store.ents;
    if (sku === SUB_SKU) return e.subActive() ? 'active' : 'buy';
    if (e.ownsOnce(sku)) return 'owned';
    if (e.subActive() && SUB_GRANTS.includes(sku)) return 'via_sub';
    if (sku === 'kilu_pack' && !store.flags.kiluPackLive) return 'coming_soon';
    return 'buy';
  };
  const priceLabel = (sku) => {
    const s = status(sku), p = store.priceOf(sku);
    if (s === 'buy') return sku === SUB_SKU ? tx('labels.per_month', { perMonth: PRODUCTS[SUB_SKU].perMonth, price: p }) : p;
    return tx(`labels.${s}`);
  };

  ui.scr_store = function () {
    store.loadPrices().then(() => { if (isTop()) ui.rerender(); });
    let justSel = false;
    const info = (sku) => {
      if (!sku) return '';
      const s = status(sku), P = PRODUCTS[sku], p = store.priceOf(sku);
      const btn = s === 'buy' ? `<button type="button" data-act="buy">${esc(tx(sku === SUB_SKU ? 'labels.subscribe' : 'labels.buy', { price: sku === SUB_SKU ? `${PRODUCTS[SUB_SKU].perMonth}/mo` : p }))}</button>`
        : `<p class="soft">${esc(tx(`labels.${s}`))}</p>`;
      return `<b>${esc(tx(`products.${sku}.name`))}</b><p>${esc(tx(`products.${sku}.desc`))}</p>${sku === SUB_SKU ? `<p class="soft">${esc(tx('labels.per_month', { perMonth: P.perMonth, price: p }))}</p>` : ''}${btn}
        ${sku === SUB_SKU && s === 'active' ? `<button type="button" data-act="manage">${esc(tx('labels.manage'))}</button>` : ''}`;
    };
    const scr = {
      scr: 'store', pat: 'chevron', title: tx('labels.tab_title'), glyph: 'store', sel: ui._kstSel || 0, cols: 1,
      count: () => order.length,
      render: () => `<div class="ui-body sys-split kst-split"><div class="ui-panel ui-pad ui-grow ui-scroll" data-scr="store">
          <div class="plate dark" style="padding:6px 10px">${esc(tx('labels.tab_title'))}${store.test ? `<span class="kst-badge">${esc(tx('labels.test_badge'))}</span>` : ''}</div>
          <div class="kst-list">${order.map((sku, i) => `<div class="plate kst-row" data-i="${i}" data-sku="${sku}" data-own="${/owned|active|via_sub/.test(status(sku)) ? 1 : 0}"><span class="nm">${esc(tx(`products.${sku}.name`))}</span><span class="pr">${esc(priceLabel(sku))}</span></div>`).join('')}</div>
          <div class="kst-foot"><button type="button" data-act="restore">${esc(tx('labels.restore'))}</button></div></div>
        <div class="plate ui-pad ui-scroll sys-side kst-side" id="kstinfo" aria-live="polite">${info(order[scr.sel])}</div></div>`,
      onSel: (i) => { ui._kstSel = i; justSel = true; queueMicrotask(() => { justSel = false; }); const el = ui.stage?.querySelector('#kstinfo'); if (el) el.innerHTML = info(order[i]); },
      hint: () => ui.hintText?.([['▲▼', tx('labels.hint_item')], ['A', tx('labels.hint_buy')], ['B', tx('labels.back')]]),
      onA: (i) => { if (!justSel) buyFlow(order[i]); },
      onAct: (a) => { if (a === 'buy') buyFlow(order[scr.sel]); if (a === 'restore') restoreFlow(); if (a === 'manage') store.billing.manage?.(); },
    };
    return scr;
  };
  const restoreFlow = async () => { const r = await store.restore(); ui.note(r.ok ? tx('toast.restored') : tx('toast.restore_failed', { reason: r.reason || '' }), 2400); ui.rerender(); };
  const buyFlow = async (sku) => {
    if (!sku || ui.modal) return;
    const s = status(sku);
    if (s === 'coming_soon') { ui.note(tx('toast.coming_soon'), 2200); return; }
    if (s !== 'buy') { ui.note(tx('toast.owned'), 2000); return; }
    const name = tx(`products.${sku}.name`), price = store.priceOf(sku);
    const q = sku === SUB_SKU ? tx('confirm_sub', { name, price, perMonth: PRODUCTS[SUB_SKU].perMonth }) : tx('confirm', { name, price });
    const k = await ui.ask('store', [q], [tx(sku === SUB_SKU ? 'labels.subscribe' : 'labels.buy', { price }), tx('labels.cancel')], { pat: 'chevron' });
    if (k !== 0) { ui.rerender(); return; }
    const r = await store.buy(sku, { returnUrl: globalThis.location?.href, redirect: (u) => { globalThis.location.href = u; } });
    if (r.ok && r.pending) ui.note(tx('toast.pending'), 2000);
    else if (r.ok) ui.note(tx('toast.bought', { name }), 2400);
    else ui.note(r.needsAccount ? tx('labels.sign_in') : tx('toast.failed', { reason: r.reason || '' }), 2800);
    ui.rerender();
  };
}

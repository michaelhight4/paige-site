import { bootAdapter, adapter } from './adapter.js';
import { store, h, refreshState, toast, sfx } from './ui.js';
import { mountHub } from './screens/hub.js';
import * as Style from './style.js';
import { runStart } from './screens/start.js';

async function main() {
  store.root = document.getElementById('app');
  window.__errors = [];
  window.addEventListener('error', (e) => window.__errors.push(String(e.message)));
  window.addEventListener('unhandledrejection', (e) => window.__errors.push('rejection: ' + (e.reason?.message || e.reason)));
  document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('button')) sfx('click'); }, true);
  try {
    await Style.init();
    const Native = await import('../../src/native_bridge.js'); await Native.installNativeAds(); // Android app: AdMob (no-op on web)
    await bootAdapter(); Native.installNativeBilling(adapter.impl); (await import('./ads_ui.js')).installAdPresenter(); // Android app: Play Billing
    store.cfg = await adapter.getConfig();
    { const { ensureTerms } = await import('./terms.js'); await ensureTerms(store.root); } // one-time ToS / Privacy agreement before any play
    const st0 = await adapter.getStartState();
    if (st0.mode !== 'play') { window.__start = st0.mode; window.__startReady = true; await runStart(st0.mode, { slot: st0.slot || 1 }); window.__start = null; }
    await refreshState();
    document.title = store.cfg.app.title;
    mountHub(store.root);
    window.__ready = true;
    try { const n = adapter.impl && adapter.impl.loadNote; if (n) setTimeout(() => toast(n, 'warn'), 600); } catch (e) { /* cosmetic */ }
  } catch (e) {
    console.error(e); store.root.replaceChildren(h('div', { class: 'empty', text: 'Failed to start: ' + e.message })); window.__errors.push(String(e));
  }
}
main();

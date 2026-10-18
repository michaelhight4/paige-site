import { bootAdapter, adapter } from './adapter.js';
import { store, h, refreshState, toast, sfx } from './ui.js';
import { mountHub } from './screens/hub.js';
import * as Style from './style.js';

async function main() {
  store.root = document.getElementById('app');
  window.__errors = [];
  window.addEventListener('error', (e) => window.__errors.push(String(e.message)));
  window.addEventListener('unhandledrejection', (e) => window.__errors.push('rejection: ' + (e.reason?.message || e.reason)));
  document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('button')) sfx('click'); }, true);
  try {
    await Style.init();
    await bootAdapter();
    store.cfg = await adapter.getConfig();
    await refreshState();
    document.title = store.cfg.app.title;
    mountHub(store.root);
    window.__ready = true;
  } catch (e) {
    console.error(e); store.root.replaceChildren(h('div', { class: 'empty', text: 'Failed to start: ' + e.message })); window.__errors.push(String(e));
  }
}
main();

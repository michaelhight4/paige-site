// Optional first-life tips: one dismissible banner at a time above the tab bar. Seen-state + on/off live in localStorage (not in saves).
import { store, h } from '../ui.js';
const KEY = 'lifesim.tips.v1';
const rd = () => { try { return JSON.parse(localStorage.getItem(KEY)) || { on: true, seen: {} }; } catch (e) { return { on: true, seen: {} }; } };
const wr = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* private mode */ } };
export const tipsOn = () => rd().on !== false;
export function setTips(on) { const v = rd(); v.on = on; if (on) v.seen = {}; wr(v); document.dispatchEvent(new CustomEvent('statechange', { detail: store.state })); }
let tips = null;
export async function tipsInit(hub) {
  try { tips = await (await fetch(new URL('../../data/tips.json', import.meta.url))).json(); } catch (e) { tips = []; }
  const show = () => {
    const st = store.state, v = rd(); const old = store.root.querySelector('.tip'); if (!st || !tipsOn() || store.stack.length || (st.generation || 1) > 1) { if (old && store.stack.length) old.remove(); return; }
    if (old) return; const t = tips.find((x) => !v.seen[x.id] && st.age >= x.minAge); if (!t) return;
    const el = h('div', { class: 'tip', role: 'note', 'data-tip': t.id }, h('span', { text: '💡 ' + t.text }), h('button', { 'aria-label': 'Dismiss tip', onclick: () => { const w = rd(); w.seen[t.id] = 1; wr(w); el.remove(); show(); }, text: '✕' }));
    store.root.append(el);
  };
  document.addEventListener('statechange', show); document.addEventListener('panelchange', show); show();
}

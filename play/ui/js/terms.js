// One-time Terms of Service / Privacy agreement shown on first launch, before any play.
// Acceptance lives in localStorage `lifesim.terms.v1` = { v, at, news }, SEPARATE from saves, so a new life or wiped saves never re-ask.
// Bump TERMS_VERSION when terms.html / privacy.html change materially: players are asked once more.
import { h } from './ui.js';
export const TERMS_VERSION = 3; // 3 (7c3): occasional forced full-screen ads disclosed
const KEY = 'lifesim.terms.v1';
export const TERMS_URL = 'terms.html', PRIVACY_URL = 'privacy.html';
export function accepted() { try { const a = JSON.parse(localStorage.getItem(KEY) || 'null'); return a && a.v >= TERMS_VERSION ? a : null; } catch (e) { return null; } }
export function accept(news) { const a = { v: TERMS_VERSION, at: Date.now(), news: !!news }; try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) { /* private mode: asked again next launch */ } return a; }
const skip = () => { try { const q = new URLSearchParams(location.search); return q.has('nosave') || q.has('noterms'); } catch (e) { return false; } };
export function ensureTerms(root) {
  if (accepted() || skip()) return Promise.resolve(true);
  return new Promise((resolve) => {
    const box = (id, req, label, url) => { const cb = h('input', { type: 'checkbox', 'data-terms': id, id: 'tc-' + id, onchange: upd });
      return h('div', { class: 'terms-row' }, h('label', { for: 'tc-' + id, class: 'terms-lab' }, cb, h('span', { class: 'terms-tag ' + (req ? 't-req' : 't-opt'), text: req ? '[Required]' : '[Optional]' }), h('span', { class: 'terms-tx', text: label })),
        url ? h('a', { class: 'btn alt sm terms-view', href: url, target: '_blank', rel: 'noopener', 'data-view': id, text: 'View' }) : null); };
    const rows = [box('tos', true, 'I agree to the Terms of Service', TERMS_URL), box('privacy', true, 'I consent to the Privacy Policy', PRIVACY_URL), box('news', false, 'Show me in-game news about updates and events')];
    const q = (id) => ov.querySelector(`[data-terms=${id}]`);
    const start = h('button', { class: 'btn go', 'data-el': 'terms-start', disabled: true, onclick: () => { if (!q('tos').checked || !q('privacy').checked) return; accept(q('news').checked); ov.remove(); resolve(true); } }, 'START GAME');
    const all = h('button', { class: 'btn alt', 'data-el': 'terms-all', onclick: () => { for (const id of ['tos', 'privacy', 'news']) q(id).checked = true; upd(); } }, 'AGREE TO ALL');
    function upd() { if (!ov) return; start.disabled = !(q('tos').checked && q('privacy').checked); }
    const ov = h('div', { class: 'overlay terms-ov', 'data-mandatory': '1', 'data-el': 'terms' },
      h('div', { class: 'sheet center terms-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Agree to Terms' },
        h('h3', { text: 'Agree to Terms' }), h('p', { class: 'hint', text: 'Before you start, please review and agree to the following. You only need to do this once.' }),
        ...rows, h('div', { class: 'btns terms-btns' }, all, start)));
    root.append(ov); upd();
  });
}

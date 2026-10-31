// Held-item icons on every creature slot (Gary, Oct 29 2026: "put the item they are holding's visual item somewhere so the
// player can quickly analyze their build comp"). Used by Team (systems_screens.js), the turn-based Team / switch list
// (battle/ui_sd.js) and the real-time party strip (rtb/view.js). Sprites: art/items/held/<id>.png, one per held
// item, drawn for Kilumen (tools/held_icons/). Charms share one pendant base tinted with the element colour.
// Hover (mouse) or long-press (touch, 450 ms) shows a tooltip: item name + one-line effect. Empty slot = faint empty socket.
import { HELD_BATTLE_ITEMS } from '../battle/data/held_items.js?v=v0.2.XXX-alpha';
import { HELD_DESC, charmDesc } from '../systems/data/held_text.js?v=v0.2.XXX-alpha';
import { ITEMS } from '../systems/items.js?v=v0.2.XXX-alpha';

/** item id -> sprite path (16x16 pixel art + _2x/_3x; one file per held item, charms share a base tinted by element).
 *  Drawn for Kilumen (tools/held_icons/, palette + outline from art/characters/pixel/icons), no third-party art. */
export const HELD_ICON_DIR = 'art/items/held/';
export const heldIconSrc = (id) => `${HELD_ICON_DIR}${id}.png`;
const pretty = (id) => String(id).replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const elLabel = (e) => (e ? e[0].toUpperCase() + e.slice(1) : '');

/** {id, name, effect, src, el} for a held id, or null */
export function heldInfo(id) {
  if (!id) return null;
  const h = HELD_BATTLE_ITEMS[id], it = ITEMS[id];
  if (!h && !it?.held) return null;
  const charm = h?.kHeldKind === 'charm';
  const effect = (HELD_DESC[id] || (charm ? charmDesc(elLabel(h.kElement)) : '')).replace(/^(Held|Lead holder):\s*/, (m, k) => (k === 'Held' ? '' : 'As lead: '));
  return { id, name: h?.name || it?.name || pretty(id), effect: effect ? effect[0].toUpperCase() + effect.slice(1) : '', src: heldIconSrc(id), el: charm ? h.kElement : '' };
}
/** one-line tooltip text */
export const heldTip = (id) => { const i = heldInfo(id); return i ? `${i.name}: ${i.effect}`.replace(/: $/, '') : 'Holding nothing'; };

/** icon chip html. opts: {size: 'sm'|'md', name (display-name override)} */
export function heldIconHtml(id, opts = {}) {
  const i = heldInfo(id), sz = opts.size || 'md';
  if (!i) return `<span class="held-ic empty ${sz}" data-htip="${esc(opts.emptyTip || 'Holding nothing')}" aria-label="${esc(opts.emptyTip || 'Holding nothing')}" tabindex="-1"></span>`;
  const tip = `${opts.name || i.name}${i.effect ? `: ${i.effect}` : ''}`;
  return `<span class="held-ic ${sz}${i.el ? ' charm' : ''}" data-held="${esc(i.id)}"${i.el ? ` data-el="${esc(i.el)}"` : ''} data-htip="${esc(tip)}" aria-label="Holding ${esc(tip)}" role="img" tabindex="-1"><img class="held-spr" src="${i.src}" srcset="${HELD_ICON_DIR}${esc(i.id)}_2x.png 2x, ${HELD_ICON_DIR}${esc(i.id)}_3x.png 3x" width="16" height="16" alt="" draggable="false"></span>`;
}

export const HELD_ICON_CSS = `
.held-ic{position:relative;display:inline-grid;place-items:center;flex:none;box-sizing:border-box;vertical-align:middle;border-radius:5px;
  width:20px;height:20px;background:rgba(29,23,48,.55);border:1px solid rgba(246,196,83,.55);cursor:help;-webkit-touch-callout:none;user-select:none}
.held-ic.sm{width:16px;height:16px;border-radius:4px}
.held-ic .held-spr{width:16px;height:16px;display:block;image-rendering:pixelated;pointer-events:none}
.held-ic.sm{background:transparent;border:0}
.held-ic.empty{background:transparent;border:1.5px dashed currentColor;opacity:.3;cursor:default}
.held-tip{position:fixed;z-index:2147483000;max-width:min(260px,70vw);padding:5px 8px;border-radius:7px;background:#1d1730;color:#fff;
  font:600 12px/1.3 system-ui,sans-serif;box-shadow:0 3px 10px rgba(0,0,0,.4);pointer-events:none;white-space:normal}
@media (prefers-reduced-motion:no-preference){.held-tip{animation:heldTipIn .12s ease-out}@keyframes heldTipIn{from{opacity:0;transform:translateY(3px)}}}
`;
let wired = false;
/** inject the CSS once and wire hover + long-press tooltips (delegated; safe to call many times) */
export function wireHeldIcons(doc = typeof document !== 'undefined' ? document : null) {
  if (!doc || wired) return; wired = true;
  const st = doc.createElement('style'); st.id = 'held-icon-css'; st.textContent = HELD_ICON_CSS; doc.head.appendChild(st);
  let tipEl = null, timer = 0, longShown = false;
  const hide = () => { tipEl?.remove(); tipEl = null; };
  const show = (ic) => {
    hide(); const t = ic.dataset.htip; if (!t) return;
    tipEl = doc.createElement('div'); tipEl.className = 'held-tip'; tipEl.setAttribute('role', 'tooltip'); tipEl.textContent = t; doc.body.appendChild(tipEl);
    const r = ic.getBoundingClientRect(), w = tipEl.offsetWidth, h = tipEl.offsetHeight, vw = doc.documentElement.clientWidth;
    const x = Math.max(4, Math.min(vw - w - 4, r.left + r.width / 2 - w / 2)), y = r.top - h - 6 >= 4 ? r.top - h - 6 : r.bottom + 6;
    tipEl.style.left = `${x}px`; tipEl.style.top = `${y}px`;
    const mine = tipEl, gone = setInterval(() => { if (tipEl !== mine) clearInterval(gone); else if (!ic.isConnected) { clearInterval(gone); hide(); } }, 250); // screen closed under the tip
  };
  const icOf = (e) => e.target?.closest?.('.held-ic');
  doc.addEventListener('mouseover', (e) => { const ic = icOf(e); if (ic && e.pointerType !== 'touch') { show(ic); } });
  doc.addEventListener('mouseout', (e) => { if (icOf(e) && !longShown) hide(); });
  doc.addEventListener('pointerdown', (e) => { // touch-ok: starts a long-press timer only; never activates
    const ic = icOf(e); if (!ic || e.pointerType === 'mouse') return;
    clearTimeout(timer); longShown = false;
    timer = setTimeout(() => { longShown = true; show(ic); setTimeout(() => { longShown = false; hide(); }, 2200); }, 450);
  }, true);
  const cancel = () => clearTimeout(timer);
  doc.addEventListener('pointerup', cancel, true); doc.addEventListener('pointercancel', cancel, true); // touch-ok: release / cancel bookkeeping or game control, never opens a menu item
  // a long-press that showed the tip must not also pick the slot (switch / open menu)
  doc.addEventListener('click', (e) => { if (longShown && icOf(e)) { e.stopPropagation(); e.preventDefault(); } }, true); // touch-ok: capture guard that only swallows a click after a long-press
  doc.addEventListener('contextmenu', (e) => { if (icOf(e)) e.preventDefault(); }, true);
}

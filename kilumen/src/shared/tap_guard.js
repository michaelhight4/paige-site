// Kilumen touch input standard: tap-vs-drag guard (see /workspace/quality/dev_notes/touch_input_standard.md).
// UI never activates on pointerdown / touchstart. A press counts as a TAP only when the finger (or mouse) is released
// within TAP_SLOP px of where it went down, the browser did not take the gesture for scrolling (pointercancel), and
// nothing scrolled in between. Listeners are passive, so native scrolling in scroll containers is never blocked.
export const TAP_SLOP = 10; // px a press may wander and still be a tap
export const TAP_HOLD_MS = 300; // a press held longer than this is a hold, never a tap (Gary, Oct 30 2026: a held finger opens nothing)
export const GHOST_CLICK_MS = 450; // swallow the browser's synthetic click after a handled touch tap

/**
 * onTap(root, selector, handler, opts) -> off()
 *   root      element (or document) to listen on
 *   selector  CSS selector to match from the pressed element up (closest), or null = root itself
 *   handler   (upEvent, matchedEl, downEvent) => void; runs on release, only for a real tap
 *   opts      { slop = TAP_SLOP, hold = TAP_HOLD_MS, mouseButton = 0, stop = false (stopPropagation on the up), ghostClick = true }
 */
export function onTap(root, selector, handler, opts = {}) {
  if (!root?.addEventListener) return () => {};
  const slop = opts.slop ?? TAP_SLOP, hold = opts.hold ?? TAP_HOLD_MS, btn = opts.mouseButton ?? 0;
  let p = null;
  const match = (t) => (selector ? t?.closest?.(selector) : root) || null;
  const down = (e) => {
    if (e.pointerType === 'mouse' && e.button !== btn) return;
    if (e.isPrimary === false) { p = null; return; } // second finger = pinch / gesture, never a tap
    const el = match(e.target); p = el ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: now(), el, e } : null;
  };
  const move = (e) => { if (p && e.pointerId === p.id && Math.hypot(e.clientX - p.x, e.clientY - p.y) > slop) p = null; };
  const cancel = () => { p = null; };
  const up = (e) => {
    const q = p; p = null;
    if (!q || e.pointerId !== q.id || Math.hypot(e.clientX - q.x, e.clientY - q.y) > slop) return;
    if (now() - q.t > hold) return; // held, not tapped
    if (q.el.isConnected === false) return; // the screen changed under the finger
    if (opts.stop) e.stopPropagation?.();
    if (opts.ghostClick !== false && e.pointerType !== 'mouse') armGhost(root, e.clientX, e.clientY);
    handler(e, q.el, q.e);
  };
  const pas = { passive: true };
  root.addEventListener('pointerdown', down, pas); // touch-ok: tap_guard records the press only
  root.addEventListener('pointermove', move, pas);
  root.addEventListener('pointerup', up);
  root.addEventListener('pointercancel', cancel, pas); // the browser started a scroll / gesture
  root.addEventListener('scroll', cancel, { passive: true, capture: true }); // any scroll inside root ends the tap
  return () => {
    root.removeEventListener('pointerdown', down, pas); root.removeEventListener('pointermove', move, pas);
    root.removeEventListener('pointerup', up); root.removeEventListener('pointercancel', cancel, pas);
    root.removeEventListener('scroll', cancel, { capture: true });
  };
}

const now = () => (globalThis.performance?.now ? performance.now() : Date.now());

/**
 * installDragGuard(doc) -> off()   (once per document; ui.js calls it)
 * 1. Click guard: a press (mouse, touch or pen) that moved more than TAP_SLOP or was held longer than TAP_HOLD_MS swallows the
 *    browser's click that follows it (capture phase), so plain `click` / `onclick` handlers never fire after a drag or hold.
 *    Keyboard clicks (no press) are untouched.
 * 2. Mouse drag-to-scroll: a left-button mouse drag scrolls the nearest scrollable ancestor (like a finger does natively), except
 *    on SortableJS reorder lists (`[data-sortable=on]`), game canvases and form fields.
 */
export function installDragGuard(doc = globalThis.document) {
  if (!doc?.addEventListener || doc.__kilDragGuard) return () => {};
  const win = doc.defaultView || globalThis;
  let p = null, eatUntil = 0;
  const scroller = (t) => {
    for (let n = t; n && n !== doc.documentElement && n.nodeType === 1; n = n.parentElement) {
      const cs = win.getComputedStyle?.(n); if (!cs) return null;
      const y = /auto|scroll/.test(cs.overflowY) && n.scrollHeight > n.clientHeight + 1, x = /auto|scroll/.test(cs.overflowX) && n.scrollWidth > n.clientWidth + 1;
      if (x || y) return n;
    }
    return null;
  };
  const down = (e) => {
    if (e.isPrimary === false) return;
    const t = e.target, mouse = e.pointerType === 'mouse';
    const noScroll = !mouse || e.button !== 0 || t?.closest?.('[data-sortable=on], canvas, input, textarea, select, [contenteditable]');
    const sc = noScroll ? null : scroller(t);
    p = { id: e.pointerId, x: e.clientX, y: e.clientY, t: now(), moved: false, sc, sx: sc?.scrollLeft, sy: sc?.scrollTop };
  };
  const move = (e) => {
    if (!p || e.pointerId !== p.id) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    if (!p.moved && Math.hypot(dx, dy) > TAP_SLOP) p.moved = true;
    if (p.moved && p.sc && (e.buttons & 1)) { p.sc.scrollTop = p.sy - dy; p.sc.scrollLeft = p.sx - dx; }
  };
  const up = (e) => {
    if (!p || e.pointerId !== p.id) return;
    const q = p; p = null;
    if (q.moved || Math.hypot(e.clientX - q.x, e.clientY - q.y) > TAP_SLOP || now() - q.t > TAP_HOLD_MS) eatUntil = Date.now() + 400;
  };
  const cancel = (e) => { if (p && e.pointerId === p.id) { p = null; eatUntil = Date.now() + 400; } };
  const click = (e) => { if (Date.now() <= eatUntil && e.detail !== 0) { eatUntil = 0; e.preventDefault(); e.stopImmediatePropagation(); } };
  const cap = { capture: true, passive: true };
  doc.addEventListener('pointerdown', down, cap); // touch-ok: drag guard only records the press
  doc.addEventListener('pointermove', move, cap);
  doc.addEventListener('pointerup', up, cap);
  doc.addEventListener('pointercancel', cancel, cap);
  doc.addEventListener('click', click, true);
  doc.__kilDragGuard = true;
  return () => {
    for (const [k, f] of [['pointerdown', down], ['pointermove', move], ['pointerup', up], ['pointercancel', cancel]]) doc.removeEventListener(k, f, cap);
    doc.removeEventListener('click', click, true); doc.__kilDragGuard = false;
  };
}

// After a touch tap the browser fires a synthetic click ~0-300 ms later at the same point; if the tap changed the
// screen, that click would land on whatever is now there. Swallow it once.
function armGhost(root, x, y) {
  const doc = root.ownerDocument || (root.nodeType === 9 ? root : globalThis.document);
  if (!doc?.addEventListener) return;
  const until = Date.now() + GHOST_CLICK_MS;
  const eat = (e) => {
    doc.removeEventListener('click', eat, true);
    if (Date.now() <= until && Math.hypot((e.clientX ?? x) - x, (e.clientY ?? y) - y) <= 30) { e.preventDefault(); e.stopPropagation(); }
  };
  doc.addEventListener('click', eat, true);
  setTimeout(() => doc.removeEventListener('click', eat, true), GHOST_CLICK_MS);
}

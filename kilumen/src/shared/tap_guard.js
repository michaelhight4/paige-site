// Kilumen touch input standard: tap-vs-drag guard (see /workspace/quality/dev_notes/touch_input_standard.md).
// UI never activates on pointerdown / touchstart. A press counts as a TAP only when the finger (or mouse) is released
// within TAP_SLOP px of where it went down, the browser did not take the gesture for scrolling (pointercancel), and
// nothing scrolled in between. Listeners are passive, so native scrolling in scroll containers is never blocked.
export const TAP_SLOP = 10; // px a press may wander and still be a tap
export const GHOST_CLICK_MS = 450; // swallow the browser's synthetic click after a handled touch tap

/**
 * onTap(root, selector, handler, opts) -> off()
 *   root      element (or document) to listen on
 *   selector  CSS selector to match from the pressed element up (closest), or null = root itself
 *   handler   (upEvent, matchedEl, downEvent) => void; runs on release, only for a real tap
 *   opts      { slop = TAP_SLOP, mouseButton = 0, stop = false (stopPropagation on the up), ghostClick = true }
 */
export function onTap(root, selector, handler, opts = {}) {
  if (!root?.addEventListener) return () => {};
  const slop = opts.slop ?? TAP_SLOP, btn = opts.mouseButton ?? 0;
  let p = null;
  const match = (t) => (selector ? t?.closest?.(selector) : root) || null;
  const down = (e) => {
    if (e.pointerType === 'mouse' && e.button !== btn) return;
    if (e.isPrimary === false) { p = null; return; } // second finger = pinch / gesture, never a tap
    const el = match(e.target); p = el ? { id: e.pointerId, x: e.clientX, y: e.clientY, el, e } : null;
  };
  const move = (e) => { if (p && e.pointerId === p.id && Math.hypot(e.clientX - p.x, e.clientY - p.y) > slop) p = null; };
  const cancel = () => { p = null; };
  const up = (e) => {
    const q = p; p = null;
    if (!q || e.pointerId !== q.id || Math.hypot(e.clientX - q.x, e.clientY - q.y) > slop) return;
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

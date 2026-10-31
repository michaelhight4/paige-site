// Ondravel View still (Coder, Oct 30 2026; Gary: "when you click view it shows that image and then the text rolls until you
// get put into the battle"). A full-screen canvas under the dialogue box (z-index 3; .dlg-wrap is 4) shows giant Ondravel:
// art/fx/wellspire/ondravel_view/ (tools/wellspire/ondravel_view.py): his own in-game sprite at ONE pixel scale with the sky,
// billowing cumulus and the ledge. Drawn nearest-neighbour at min(H/base_h, W/safe_w): the full height always shows (head and
// antlers never cropped); wider screens see more of the wide stack, narrower ones letterbox. Slow front-cloud drift only.
// A short tap / click on the image advances the text like the dialogue box (tap_guard onTap: holds and drags never count).
import { onTap } from '../shared/tap_guard.js?v=v0.2.100-alpha';
export const VIEW_DIR = 'art/fx/wellspire/ondravel_view/';
export const VIEW_LAYERS = ['view_bg', 'view_front', 'view_ledge'];
/** where the base stack lands on a W x H screen (device px). Pure (tests). */
export function viewFit(W, H, m = { base_w: 176, base_h: 70, safe_w: 112 }) {
  const s = Math.min(H / m.base_h, W / m.safe_w), w = m.base_w * s, h = m.base_h * s;
  return { s, x: Math.round((W - w) / 2), y: Math.round((H - h) / 2), w: Math.round(w), h: Math.round(h) };
}
export function makeSummitView(scene) {
  const v = { open: false, el: null, imgs: null, meta: null, t0: 0, raf: 0 };
  const doc = typeof document !== 'undefined' ? document : null;
  const load = async () => {
    if (v.imgs || typeof Image === 'undefined') return;
    try { v.meta = await (await fetch(VIEW_DIR + 'ondravel_view.json')).json(); } catch { v.meta = { base_w: 176, base_h: 70, safe_w: 112, pad: 4, drift_px: 3, drift_s: 24, fill: '#24102f' }; }
    v.imgs = await Promise.all(VIEW_LAYERS.map((n) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = VIEW_DIR + n + '.png'; })));
  };
  const draw = () => {
    const c = v.el; if (!c || !v.open) return; const dpr = window.devicePixelRatio || 1, W = Math.round(innerWidth * dpr), H = Math.round(innerHeight * dpr);
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    const x = c.getContext('2d'), m = v.meta; x.imageSmoothingEnabled = false; x.fillStyle = m?.fill || '#24102f'; x.fillRect(0, 0, W, H);
    if (v.imgs && m) {
      const f = viewFit(W, H, m), t = (performance.now() - v.t0) / 1000, reduce = scene.reducedMotion;
      const drift = reduce ? 0 : Math.round(Math.sin((t / (m.drift_s || 24)) * Math.PI * 2) * (m.drift_px || 3)); // whole base px only
      const [bg, front, ledge] = v.imgs, px = (n) => Math.round(n * f.s);
      if (bg) x.drawImage(bg, f.x, f.y, px(m.base_w), px(m.base_h));
      if (front) x.drawImage(front, f.x + px(-(m.pad || 0) + drift), f.y, px(front.width), px(m.base_h));
      if (ledge) x.drawImage(ledge, f.x, f.y, px(m.base_w), px(m.base_h));
    }
    v.raf = requestAnimationFrame(draw);
  };
  /** show the still (resolves once the art is loaded and the first frame is up) */
  v.show = async () => {
    v.open = true; scene.log?.push?.({ tick: scene.tick, type: 'summit_view', open: true });
    if (!doc) return; await load();
    if (!v.el) { v.el = doc.createElement('canvas'); v.el.id = 'ondravel-view'; v.el.setAttribute('aria-label', 'Ondravel');
      Object.assign(v.el.style, { position: 'fixed', inset: '0', width: '100vw', height: '100vh', zIndex: '3', imageRendering: 'pixelated', touchAction: 'none' });
      onTap(v.el, null, () => { if (scene.dialog?.active) scene.dialog._tap = { a: true }; }); }
    doc.body.appendChild(v.el); doc.body.classList.add('ondravel-view'); v.t0 = performance.now(); cancelAnimationFrame(v.raf); draw();
  };
  v.hide = () => {
    v.open = false; scene.log?.push?.({ tick: scene.tick, type: 'summit_view', open: false });
    if (!doc) return; cancelAnimationFrame(v.raf); v.el?.remove(); doc.body.classList.remove('ondravel-view');
  };
  return v;
}

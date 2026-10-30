// Wellspire v3: Animator's DRAFT sheets (shots/flashback_anim -> art/fx/wellspire/<name>/). One global clock keeps props in phase.
// Phones load the _art1x sheet (same pixels, 1/4 the memory) and scale it by art_px_scale with smoothing off.
const BASE = 'art/fx/wellspire/';
const cache = {};
const phone = () => typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches || Math.min(window.innerWidth, window.innerHeight) < 500);
export function anim(name) {
  if (cache[name] || typeof Image === 'undefined') return cache[name]?.ready ? cache[name] : null;
  const a = cache[name] = { ready: false, meta: null, img: new Image(), k: 1 };
  fetch(BASE + name + '/' + name + '.json').then((r) => r.json()).then((m) => {
    a.meta = m; a.k = phone() ? (m.art_px_scale || 1) : 1; a.cum = []; let t = 0; for (const ms of m.ms) a.cum.push(t += ms);
    a.img.onload = () => { a.ready = true; }; a.img.src = BASE + name + '/' + name + (a.k > 1 ? '_art1x.png' : '.png');
  }).catch(() => {});
  return null;
}
/** frame index at time t (ms): loops wrap, one-shots hold the last frame */
export function frameAt(a, t) {
  const m = a.meta, tot = a.cum[a.cum.length - 1]; if (!m.loop && t >= tot) return m.frames - 1;
  const u = ((t % tot) + tot) % tot; let i = 0; while (a.cum[i] <= u) i++; return Math.min(i, m.frames - 1);
}
/** draw frame f with its bottom-centre at screen (sx, sy); scale = screen px per game px */
export function drawFrame(ctx, a, f, sx, sy, scale, w, h) {
  const m = a.meta, k = a.k, fw = m.frame_w / k, fh = m.frame_h / k, c = f % m.cols, r = Math.floor(f / m.cols);
  const dw = w ?? m.frame_w * scale, dh = h ?? m.frame_h * scale;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(a.img, c * fw, r * fh, fw, fh, Math.round(sx - dw / 2), Math.round(sy - dh), Math.round(dw), Math.round(dh)); ctx.restore();
}

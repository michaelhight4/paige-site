// Fruit feeds v3 "orchard" backdrop: a living pixel scene behind the picnic blanket (Gary Oct 29 2026: "add some flare
// to the backdrop behind the kilumen"). Coder, Oct 29 2026.
// One low-res canvas (2 CSS px per art pixel, nearest-neighbour) drawn in Kilumen's palette, all code-drawn except the
// fruit, which is Animator's art (assets/feeds/fruit/*.png). Layers, back to front: banded sky -> stars -> sun/moon + rays
// -> clouds -> far hills -> orchard hill with fruit trees -> meadow with fruit bushes and swaying grass -> spotlight glow
// -> petals/leaves, butterflies, motes (day) or fireflies (night). Follows the game clock (scene.clock.min).
// Open-source check first: looked at MIT canvas petal/particle libs (chaerry-js, falling-animation, @basmilius/sparkle,
// particlefield). All draw smooth/emoji particles at screen res, not our chunky pixel look, and would add 5-20 KB, so
// this is our own ~250 lines modelled on src/overworld/living.js (motes, fireflies, birds). No third-party code here.
// Reduced motion (prefers-reduced-motion or Options body.ui-reduce): one still frame, redrawn only when the hour changes.
import { fruitColor } from './ui_art.js?v=v0.2.85-alpha';

const PX = 2; // CSS px per art pixel
export const reducedMotion = () => { try { return !!document.querySelector('.ui-reduce') || !!matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };
const lerp = (a, b, t) => a + (b - a) * t;
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => a.map((v, i) => Math.round(lerp(v, b[i], t)));
const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// Time-of-day keys (hour -> palette). Colours pulled from Kilumen's UI (plum #3a2433, cream #f4ead2, amber #f2b94a,
// leaf greens of the overworld) so the scene sits inside the frame instead of fighting it.
const KEYS = [
  { h: 0, top: '#1a1430', bot: '#3a2a52', far: '#2c2a4a', mid: '#253a3a', near: '#22402f', grass: '#2f5a3a', light: '#bcd2ff', glow: '#9fb8ff', star: 1, sun: 0 },
  { h: 5, top: '#2a2148', bot: '#6a4a6e', far: '#3e3a5c', mid: '#2e4a42', near: '#2e5236', grass: '#3d6a40', light: '#ffc2a0', glow: '#ffb48a', star: 0.6, sun: 0 },
  { h: 6.5, top: '#7fa8d8', bot: '#ffcfa0', far: '#9a9ac0', mid: '#5f8a5a', near: '#5d9a4c', grass: '#79b65a', light: '#ffe0a0', glow: '#ffd48a', star: 0, sun: 1 },
  { h: 12, top: '#8ccbec', bot: '#e2f2df', far: '#a8cfc0', mid: '#79ad62', near: '#86c060', grass: '#a6d670', light: '#fff2b8', glow: '#fff0c0', star: 0, sun: 1 },
  { h: 17, top: '#9cc4e4', bot: '#ffe2b0', far: '#b8b8c0', mid: '#7aa058', near: '#8ab45a', grass: '#b2cc66', light: '#ffd890', glow: '#ffd27a', star: 0, sun: 1 },
  { h: 19, top: '#5a4a8a', bot: '#f29a6a', far: '#7a5a7a', mid: '#4f6a48', near: '#56763e', grass: '#7a9a4c', light: '#ffb070', glow: '#ff9a6a', star: 0.2, sun: 0.6 },
  { h: 20.5, top: '#2a2148', bot: '#5a3a5e', far: '#3a3456', mid: '#2c463c', near: '#2a4a32', grass: '#3a623e', light: '#c8c8ff', glow: '#a8b4ff', star: 0.8, sun: 0 },
  { h: 24, top: '#1a1430', bot: '#3a2a52', far: '#2c2a4a', mid: '#253a3a', near: '#22402f', grass: '#2f5a3a', light: '#bcd2ff', glow: '#9fb8ff', star: 1, sun: 0 },
];
/** Palette for an hour 0..24 (interpolated). Exported for tests. */
export function paletteAt(h) {
  h = ((h % 24) + 24) % 24; let i = 0; while (i < KEYS.length - 2 && KEYS[i + 1].h <= h) i++;
  const a = KEYS[i], b = KEYS[i + 1], t = (h - a.h) / (b.h - a.h), o = { h };
  for (const k of Object.keys(a)) if (k !== 'h') o[k] = typeof a[k] === 'number' ? lerp(a[k], b[k], t) : mix(hex(a[k]), hex(b[k]), t);
  o.night = o.star > 0.5; return o;
}
export function hourNow() {
  const o = globalThis.KILUMEN_FEEDS_HOUR; if (typeof o === 'number') return o;
  const m = globalThis.kilumen?.scene?.clock?.min; return typeof m === 'number' ? ((m % 1440) + 1440) % 1440 / 60 : 12;
}

const imgs = {};
let onArt = null; // the live backdrop's redraw hook (still frames need a redraw once the art has loaded)
function fruitImg(id, kind = '') { const k = id + kind; if (!imgs[k]) { const im = new Image(); im.onload = () => onArt?.(); im.src = `assets/feeds/fruit/${id}${kind}.png`; imgs[k] = im; } return imgs[k]; }
const ok = (im) => im && im.complete && im.naturalWidth > 0;

/** The backdrop. One per feeds overlay; mount() re-parents the same canvas into each re-rendered .fx-stage. */
export function createBackdrop({ fruits = ['sunheart_fig', 'dashfig', 'cinderapricot', 'mossplum', 'saltlime'], seed = 7 } = {}) {
  const cv = document.createElement('canvas'); cv.className = 'fx-bg'; cv.setAttribute('aria-hidden', 'true');
  const g = cv.getContext('2d');
  const glow = document.createElement('div'); glow.className = 'fx-glow';
  let W = 0, H = 0, raf = 0, last = 0, t = 0, stage = null, ro = null, still = false, lastHour = -1, burstT = -1, hourTimer = 0;
  const phone = () => Math.min(innerWidth, innerHeight) < 500;
  // tree fruit must read as round fruit at 8 art px: skip the ones whose art has a speed trail or wings
  const treeFruit = fruits.filter((f) => !['dashfig', 'glidepod'].includes(f)); if (!treeFruit.length) treeFruit.push('sunheart_fig');
  const S = { clouds: [], trees: [], bushes: [], grass: [], parts: [], flies: [], stars: [] };
  function layout() {
    const r = rng(seed), w = W, h = H, hz = Math.round(h * 0.58);
    S.hz = hz;
    S.stars = Array.from({ length: Math.round(w * h / 260) }, () => ({ x: r() * w | 0, y: r() * hz * 0.8 | 0, p: r() * 6.28 }));
    S.clouds = Array.from({ length: phone() ? 3 : 5 }, (_, i) => ({ x: r() * w, y: 6 + r() * hz * 0.35, s: 0.6 + r() * 0.8, v: 0.6 + r() * 0.8, i }));
    S.trees = [];
    const nt = w < 200 ? 3 : 5;
    for (let i = 0; i < nt; i++) { const x = Math.round((i + 0.5 + (r() - 0.5) * 0.5) * w / nt); if (Math.abs(x - w / 2) < w * 0.12) continue; S.trees.push({ x, s: 0.8 + r() * 0.5, f: treeFruit[i % treeFruit.length], ph: r() * 6.28 }); }
    S.bushes = [{ x: Math.round(w * 0.24), f: treeFruit[1 % treeFruit.length] }, { x: Math.round(w * 0.77), f: treeFruit[2 % treeFruit.length] }];
    S.grass = Array.from({ length: Math.round(w / (phone() ? 4 : 3)) }, () => ({ x: r() * w | 0, y: hz + 14 + r() * (h - hz - 14) | 0, l: 2 + r() * 4 | 0, p: r() * 6.28 }));
    S.parts = []; S.flies = Array.from({ length: phone() ? 2 : 3 }, () => ({ x: r() * w, y: hz * 0.6 + r() * (h - hz) * 0.5, a: r() * 6.28, c: ['#f2b94a', '#e88aa8', '#9fd0ff'][Math.floor(r() * 3)] }));
  }
  function size() {
    if (!stage) return; const b = stage.getBoundingClientRect(); const w = Math.max(40, Math.ceil(b.width / PX)), h = Math.max(30, Math.ceil(b.height / PX));
    if (w === W && h === H) return; W = w; H = h; cv.width = w; cv.height = h; layout(); draw(0);
  }
  const hillY = (x, base, amp, f, ph) => base - amp * (Math.sin(x * f + ph) * 0.6 + Math.sin(x * f * 2.3 + ph * 1.7) * 0.4);
  function hill(col, base, amp, f, ph, off) { g.fillStyle = rgb(col); for (let x = 0; x < W; x++) { const y = Math.round(hillY(x + off, base, amp, f, ph)); g.fillRect(x, y, 1, H - y); } }
  function cloud(x, y, s, col) { g.fillStyle = col; const blobs = [[0, 2, 10, 4], [3, 0, 7, 3], [8, 1, 6, 3], [-3, 3, 5, 2], [11, 3, 5, 2]]; for (const [bx, by, bw, bh] of blobs) g.fillRect(Math.round(x + bx * s * 1.6), Math.round(y + by * s), Math.round(bw * s * 1.6), Math.round(bh * s + 1)); }
  function tree(tr, base, pal, sway) {
    const s = tr.s, x = tr.x, y = Math.round(base), th = Math.round(12 * s), cr = Math.round(9 * s);
    g.fillStyle = rgb(mix(pal.mid, [58, 36, 51], 0.55)); g.fillRect(x - 1, y - th, 3, th + 2);
    const leaf = mix(pal.mid, pal.grass, 0.35), dark = mix(pal.mid, [26, 18, 38], 0.25), hi = mix(pal.grass, pal.light, 0.25), cx = x + Math.round(sway), cy = y - th - cr + 3;
    const disc = (ox, oy, rr, c) => { g.fillStyle = rgb(c); for (let dy = -rr; dy <= rr; dy++) { const dx = Math.round(Math.sqrt(rr * rr - dy * dy)); g.fillRect(cx + ox - dx, cy + oy + dy, dx * 2 + 1, 1); } };
    disc(0, 2, cr, dark); disc(-Math.round(cr * 0.5), 0, Math.round(cr * 0.7), leaf); disc(Math.round(cr * 0.5), 1, Math.round(cr * 0.7), leaf); disc(0, -Math.round(cr * 0.4), Math.round(cr * 0.75), leaf); disc(-2, -Math.round(cr * 0.6), Math.round(cr * 0.3), hi);
    const im = fruitImg(tr.f), fs = 8; // Animator's fruit, 32 -> 8 art px hanging in the canopy
    const spots = [[-cr * 0.5, cr * 0.2], [cr * 0.45, -cr * 0.1], [0, cr * 0.55]];
    for (const [fx, fy] of spots) if (ok(im)) g.drawImage(im, Math.round(cx + fx - fs / 2), Math.round(cy + fy - fs / 2 + Math.sin(t * 1.5 + tr.ph + fx) * (still ? 0 : 0.6)), fs, fs);
      else { g.fillStyle = fruitColor(tr.f); g.fillRect(Math.round(cx + fx - 2), Math.round(cy + fy - 2), 4, 4); }
  }
  function draw(dt) {
    if (!W) return; const pal = paletteAt(hourNow()), hz = S.hz, mo = still ? 0 : 1;
    // sky in 8 bands (pixel dithering feel)
    for (let i = 0; i < 8; i++) { g.fillStyle = rgb(mix(pal.top, pal.bot, i / 7)); g.fillRect(0, Math.floor(i * hz / 8), W, Math.ceil(hz / 8) + 1); }
    if (pal.star > 0.05) for (const s of S.stars) { const a = pal.star * (0.5 + 0.5 * Math.sin(t * 2 + s.p) * mo + (mo ? 0 : 0.3)); g.fillStyle = `rgba(255,248,220,${Math.max(0, a)})`; g.fillRect(s.x, s.y, 1, 1); }
    // sun (day) or moon (night) on an arc
    const h = pal.h, day = pal.sun > 0.05, k = day ? (h - 6) / 14 : ((h + 4) % 24) / 10;
    const bx = Math.round(W * (0.12 + 0.76 * Math.min(1, Math.max(0, k)))), by = Math.round(hz * (0.85 - 0.65 * Math.sin(Math.PI * Math.min(1, Math.max(0, k)))));
    if (day) {
      g.save(); g.globalAlpha = 0.12 * pal.sun; g.fillStyle = rgb(pal.light); g.translate(bx, by);
      const rot = t * 0.05 * mo; for (let i = 0; i < 9; i++) { const a = rot + i * 0.698; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a - 0.08) * W, Math.sin(a - 0.08) * W); g.lineTo(Math.cos(a + 0.08) * W, Math.sin(a + 0.08) * W); g.fill(); }
      g.restore();
      g.fillStyle = rgb(pal.light, 0.35); g.fillRect(bx - 8, by - 6, 17, 13); g.fillRect(bx - 6, by - 8, 13, 17);
      g.fillStyle = '#ffe08a'; g.fillRect(bx - 5, by - 4, 11, 9); g.fillRect(bx - 4, by - 5, 9, 11); g.fillStyle = '#fff3c4'; g.fillRect(bx - 3, by - 3, 3, 2);
    } else {
      g.fillStyle = 'rgba(220,230,255,.18)'; g.fillRect(bx - 7, by - 5, 15, 11); g.fillRect(bx - 5, by - 7, 11, 15);
      g.fillStyle = '#eef0ff'; g.fillRect(bx - 4, by - 3, 9, 7); g.fillRect(bx - 3, by - 4, 7, 9); g.fillStyle = rgb(pal.top); g.fillRect(bx, by - 4, 5, 6);
    }
    // clouds drift slowly (wrap)
    const cc = mix(pal.bot, [255, 255, 255], day ? 0.7 : 0.15);
    for (const c of S.clouds) { c.x += dt * c.v * 1.2 * mo; if (c.x > W + 30) c.x = -40; cloud(c.x, c.y, c.s, rgb(cc, day ? 0.9 : 0.5)); }
    // parallax hills (slow drift so the scene breathes)
    hill(pal.far, hz + 2, hz * 0.18, 0.035, 1.3, t * 0.6 * mo);
    hill(pal.mid, hz + 10, hz * 0.1, 0.05, 4.1, t * 1.4 * mo);
    for (const tr of S.trees) tree(tr, hillY(tr.x + t * 1.4 * mo, hz + 10, hz * 0.1, 0.05, 4.1) + 2, pal, Math.sin(t * 0.8 + tr.ph) * 0.8 * mo);
    hill(pal.near, hz + 20, 3, 0.03, 2.2, 0);
    // fruit bushes (Animator's plant_fruit art) at the meadow edges, framing the blanket
    for (const b of S.bushes) { const im = fruitImg(b.f, '_plant_fruit'); if (ok(im)) g.drawImage(im, b.x - 12, hz - 2, 24, 24); }
    // grass blades sway
    g.fillStyle = rgb(pal.grass);
    for (const gb of S.grass) { const sw = Math.round(Math.sin(t * 1.6 + gb.p + gb.x * 0.05) * 1.2 * mo); g.fillRect(gb.x, gb.y - gb.l, 1, gb.l); g.fillRect(gb.x + sw, gb.y - gb.l - 1, 1, 1); }
    // spotlight glow behind the creature (lives on the canvas, plus the CSS .fx-glow halo above it)
    const gx = W / 2, gy = H * 0.6, pulse = 1 + 0.05 * Math.sin(t * 1.4) * mo, burst = burstT >= 0 ? Math.max(0, 1 - burstT / 1.2) : 0;
    const rad = H * 0.55 * pulse * (1 + burst * 0.5), gr = g.createRadialGradient(gx, gy, 2, gx, gy, rad);
    gr.addColorStop(0, rgb(pal.glow, 0.45 + burst * 0.4)); gr.addColorStop(0.6, rgb(pal.glow, 0.12)); gr.addColorStop(1, rgb(pal.glow, 0)); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    if (burst > 0) { // happy ray burst: chunky spokes spinning out
      g.save(); g.translate(gx, gy); g.globalAlpha = burst * 0.5; g.fillStyle = rgb(pal.light);
      for (let i = 0; i < 12; i++) { const a = i * 0.5236 + burstT * 1.2, r0 = 10 + (1 - burst) * 30, r1 = r0 + 22; g.beginPath(); g.moveTo(Math.cos(a - 0.06) * r0, Math.sin(a - 0.06) * r0); g.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); g.lineTo(Math.cos(a + 0.06) * r0, Math.sin(a + 0.06) * r0); g.fill(); }
      g.restore(); burstT += dt; if (burstT > 1.2) burstT = -1;
    }
    // particles: petals/leaves (day), fireflies (night)
    if (mo) {
      const cap = phone() ? 10 : 18;
      if (S.parts.length < cap && Math.random() < dt * 3) S.parts.push(newPart(pal));
      for (const p of S.parts) {
        p.age += dt; p.x += (p.vx + Math.sin(p.age * 2 + p.ph) * 4) * dt; p.y += p.vy * dt;
        if (p.kind === 'fly') { p.y += Math.sin(p.age * 1.3 + p.ph) * 3 * dt; const a = Math.max(0, Math.sin(p.age * 2.5 + p.ph)); g.fillStyle = `rgba(255,240,140,${0.25 * a})`; g.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 3, 3); g.fillStyle = `rgba(255,250,190,${a})`; g.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); }
        else if (p.kind === 'mote') { g.fillStyle = `rgba(255,250,220,${0.5 + 0.4 * Math.sin(p.age * 3 + p.ph)})`; g.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); }
        else { const flip = Math.sin(p.age * 5 + p.ph) > 0; g.fillStyle = p.col; g.fillRect(Math.round(p.x), Math.round(p.y), flip ? 2 : 1, flip ? 1 : 2); }
      }
      S.parts = S.parts.filter((p) => p.age < p.life && p.y < H + 4 && p.x > -6 && p.x < W + 6);
      // butterflies by day: wander, two-frame flap
      if (!pal.night) for (const b of S.flies) {
        b.a += (Math.random() - 0.5) * dt * 3; b.x += Math.cos(b.a) * 10 * dt; b.y += Math.sin(b.a) * 6 * dt + Math.sin(t * 6 + b.a) * 0.15;
        if (b.x < 4 || b.x > W - 4) b.a = Math.PI - b.a; if (b.y < hz * 0.5 || b.y > H - 8) b.a = -b.a;
        b.x = Math.max(2, Math.min(W - 2, b.x)); b.y = Math.max(hz * 0.4, Math.min(H - 6, b.y));
        const up = Math.sin(t * 14 + b.x) > 0, x = Math.round(b.x), y = Math.round(b.y);
        g.fillStyle = '#3a2433'; g.fillRect(x, y, 1, 2); g.fillStyle = b.c; if (up) { g.fillRect(x - 2, y - 2, 2, 2); g.fillRect(x + 1, y - 2, 2, 2); } else { g.fillRect(x - 2, y, 2, 1); g.fillRect(x + 1, y, 2, 1); }
      }
    }
    // soft vignette keeps the edges calm so the creature and UI read first
    const vg = g.createRadialGradient(W / 2, H * 0.55, H * 0.4, W / 2, H * 0.55, W * 0.75); vg.addColorStop(0, 'rgba(26,18,38,0)'); vg.addColorStop(1, `rgba(26,18,38,${pal.night ? 0.45 : 0.22})`); g.fillStyle = vg; g.fillRect(0, 0, W, H);
    glow.style.setProperty('--glow', rgb(pal.glow, pal.night ? 0.55 : 0.6));
    stage?.classList.toggle('fx-night', !!pal.night);
  }
  function newPart(pal, burst = false) {
    const day = !pal.night, r = Math.random;
    if (!day) return { kind: 'fly', x: r() * W, y: S.hz + r() * (H - S.hz) * 0.8, vx: (r() - 0.5) * 4, vy: (r() - 0.5) * 2, age: 0, life: 4 + r() * 4, ph: r() * 6.28 };
    if (!burst && r() < 0.3) return { kind: 'mote', x: r() * W, y: S.hz * 0.5 + r() * S.hz * 0.6, vx: 2 + r() * 3, vy: -1 - r() * 2, age: 0, life: 4 + r() * 3, ph: r() * 6.28 };
    const cols = ['#f7b8c8', '#ffd6e0', '#fff1e2', '#c9e08a', '#f2b94a'];
    return burst ? { kind: 'petal', x: W / 2 + (r() - 0.5) * 10, y: H * 0.55, vx: (r() - 0.5) * 60, vy: -20 - r() * 30, grav: 1, age: 0, life: 2.5, ph: r() * 6.28, col: cols[r() * cols.length | 0] }
      : { kind: 'petal', x: -4 + r() * W * 0.6, y: -3 - r() * 10, vx: 6 + r() * 8, vy: 6 + r() * 6, age: 0, life: 12, ph: r() * 6.28, col: cols[r() * cols.length | 0] };
  }
  function loop(now) {
    raf = 0; if (!cv.isConnected) return stop();
    const dt = Math.min(0.1, last ? (now - last) / 1000 : 0); const fps = phone() ? 30 : 60;
    if (dt >= 1 / fps - 0.002 || !last) { last = now; t += dt; for (const p of S.parts) if (p.grav) p.vy += 40 * dt; draw(dt); }
    if (!document.hidden) raf = requestAnimationFrame(loop); else document.addEventListener('visibilitychange', () => { last = 0; start(); }, { once: true });
  }
  function start() {
    still = reducedMotion(); onArt = () => { if (still) draw(0); };
    if (still) { draw(0); clearInterval(hourTimer); hourTimer = setInterval(() => { const hh = Math.floor(hourNow()); if (hh !== lastHour) { lastHour = hh; draw(0); } }, 5000); return; }
    if (!raf) raf = requestAnimationFrame(loop);
  }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; last = 0; clearInterval(hourTimer); ro?.disconnect(); }
  return {
    canvas: cv,
    /** Put the backdrop into a (freshly rendered) .fx-stage, behind everything else in it. */
    mount(st) {
      if (!st) return; stage = st; st.prepend(glow); st.prepend(cv); ro?.disconnect();
      if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(() => size()); ro.observe(st); }
      size(); draw(0); start();
    },
    /** Happy reaction: ray burst + petal shower + glow swell. Reduced motion: a brief still glow only. */
    burst() {
      glow.classList.remove('pop'); void glow.offsetWidth; glow.classList.add('pop');
      if (still) return; burstT = 0; const pal = paletteAt(hourNow()); for (let i = 0; i < (phone() ? 10 : 18); i++) S.parts.push(newPart({ ...pal, night: false }, true));
    },
    stop, set hour(h) { globalThis.KILUMEN_FEEDS_HOUR = h; draw(0); },
    stats: () => ({ W, H, parts: S.parts.length, trees: S.trees.length, running: !!raf, still }),
  };
}

export const BG_CSS = `
.fx-stage .fx-bg{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;z-index:0;pointer-events:none}
.fx-stage .fx-glow{position:absolute;left:50%;bottom:16%;width:62%;aspect-ratio:1.4;transform:translateX(-50%);border-radius:50%;z-index:0;pointer-events:none;
  background:radial-gradient(closest-side,var(--glow,rgba(255,240,192,.6)),transparent);mix-blend-mode:screen;animation:fxglow 3.2s ease-in-out infinite}
.fx-stage .fx-glow.pop{animation:fxglowpop .9s cubic-bezier(.3,1.6,.5,1)}
.fx-stage>.fx-blanket,.fx-stage>.fx-monwrap,.fx-stage>.fx-quip,.fx-stage>.fx-belly,.fx-stage>.fx-tag{z-index:1}
.fx-stage>.fx-quip,.fx-stage>.fx-belly,.fx-stage>.fx-tag{z-index:3}
.fx-stage.has-bg{background:#bfe3f0}.fx-stage.has-bg .fx-sun{display:none}
.fx-stage.fx-night .fx-tag b{box-shadow:0 0 0 2px rgba(244,234,210,.5)}.fx-stage.fx-night .fx-belly>span{color:#f4ead2;text-shadow:0 1px 0 #1a1226}
@keyframes fxglow{50%{opacity:.75;transform:translateX(-50%) scale(1.05)}}
@keyframes fxglowpop{0%{transform:translateX(-50%) scale(1)}40%{transform:translateX(-50%) scale(1.45);filter:brightness(1.4)}100%{transform:translateX(-50%) scale(1)}}
@media (prefers-reduced-motion:reduce){.fx-stage .fx-glow{animation:none!important}}
.ui-reduce .fx-stage .fx-glow{animation:none!important}`;

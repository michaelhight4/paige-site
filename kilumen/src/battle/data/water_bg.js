// Water battle backdrop (biome 'water', Coder, Oct 29 2026). Kilumen's own pixel art, drawn in code into a 480x270 canvas
// shown with image-rendering: pixelated: sky + clouds, far hills/treeline, open water to the horizon with banded swells,
// thin crest lines and light glints, a wooden pier edge under the player side (left front) and ripple rings round the
// foe's spot. Day / dawn / dusk / night palettes (phase from the game clock). Animated at ~15 fps; reduced motion = one frame.
// Technique (flat 3-shade water bands, thin crests, sparse glints, long swell) is adapted from the idea of "Pixel Water"
// by Francisco Cidade (CC0, https://fcidade.itch.io/pixel-water-godot-shader-free); no shader code was copied.
// ART SWAP SLOT: if painted backdrops land (Animator), set WATER_ART[phase] to the PNG path; the live layer then draws only
// the animated water overlay (crests, glints, ripples) on top of that PNG instead of the code-drawn scene.
// Animator's painted backdrop (Oct 29 2026, /workspace/kilumen_water_battle_art/index.json): per-phase 2560x1440 stills
// (pier + ripple painted in) plus a 16-frame strip (1280x720 frames stacked vertically: water surface, foe ripple, pier,
// gulls/fish life; 120 ms a frame, looped) baked by tools/fishing/bake_water_anim.py. Spots are frame fractions.
export const WATER_ART = Object.fromEntries(['day', 'dawn', 'dusk', 'night'].map((p) => [p, `art/world/battle_bg_water_${p}.png`]));
export const WATER_ANIM = { src: (p) => `art/world/water_battle/water_anim_${p}_1x.png`, frames: 16, ms: 120, w: 1280, h: 720 };
export const WATER_SPOTS = { near: [0.261, 0.65], far: [0.727, 0.458] };
export const W = 480, H = 270, HORIZON = 112;
const PAL = {
  day:   { sky: ['#5fb4ef', '#7cc4f3', '#9dd3f5', '#c3e4f4'], sun: '#fff6c8', cloud: ['#ffffff', '#dbe9f5'], hill: ['#6f9fb8', '#5d8f6a'], tree: ['#3f7240', '#2f5a33'],
           water: ['#2a7fc2', '#3a92d3', '#55a8e0', '#7cc2ec'], crest: '#d9f1ff', glint: '#ffffff', wood: ['#8a5a32', '#6b4224', '#a87444', '#4a2c16'], foam: '#eaf8ff' },
  dawn:  { sky: ['#6b7fc4', '#c48ab8', '#f0a990', '#ffd2a0'], sun: '#ffe2a8', cloud: ['#ffd6c4', '#d9a4b4'], hill: ['#7a6f9e', '#5a6a72'], tree: ['#3c4f4a', '#2c3a38'],
           water: ['#3d5a9a', '#5a72ae', '#8a88b8', '#e0a9a0'], crest: '#ffe4cc', glint: '#fff2d8', wood: ['#7a4e30', '#5a3620', '#966440', '#3c2414'], foam: '#ffeede' },
  dusk:  { sky: ['#3a3f82', '#8a4f86', '#e07a5c', '#f6b062'], sun: '#ffcf7a', cloud: ['#f0a07a', '#a8607a'], hill: ['#5a4a78', '#3e4a58'], tree: ['#2c3640', '#20282e'],
           water: ['#28386e', '#3e4a86', '#6a5a8e', '#d0805e'], crest: '#ffcf9a', glint: '#ffe0a0', wood: ['#6a4028', '#4a2c18', '#86563a', '#2e1a0e'], foam: '#f6d6c0' },
  night: { sky: ['#0c1030', '#141a44', '#1e2858', '#2a386a'], sun: '#eef0ff', cloud: ['#3a4478', '#2a3260'], hill: ['#1e2a4a', '#18243a'], tree: ['#101a2a', '#0a121e'],
           water: ['#0c1a3a', '#142650', '#1e3666', '#2c4a80'], crest: '#8ab0e8', glint: '#e8f0ff', wood: ['#4a3428', '#33231a', '#5e4434', '#1e140e'], foam: '#a8c4ee' },
};
export const waterPhase = (p) => (PAL[p] ? p : 'day');
const rng = (s) => () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
const BAYER = [0, 2, 3, 1];
// static part (sky, sun/moon, hills, trees) cached per phase
const statics = new Map();
function drawStatic(phase) {
  if (statics.has(phase)) return statics.get(phase);
  const P = PAL[phase], c = document.createElement('canvas'); c.width = W; c.height = HORIZON + 2; const g = c.getContext('2d'), r = rng(7);
  // banded sky with 2x2 ordered dither between bands
  for (let y = 0; y < HORIZON; y++) { const f = (y / HORIZON) * (P.sky.length - 1), i = Math.floor(f), t = f - i;
    for (let x = 0; x < W; x++) { const th = (BAYER[(x & 1) + ((y & 1) << 1)] + 0.5) / 4; g.fillStyle = P.sky[Math.min(P.sky.length - 1, i + (t > th ? 1 : 0))]; g.fillRect(x, y, 1, 1); } }
  if (phase === 'night') { for (let i = 0; i < 90; i++) { g.fillStyle = r() < 0.2 ? '#ffffff' : '#9aa8d8'; g.fillRect(Math.floor(r() * W), Math.floor(r() * (HORIZON - 30)), 1, 1); } }
  // sun / moon
  const sx = phase === 'day' ? 380 : phase === 'night' ? 90 : phase === 'dawn' ? 120 : 360, sy = phase === 'day' ? 26 : phase === 'night' ? 24 : 86, sr = phase === 'night' ? 9 : 12;
  for (let y = -sr - 3; y <= sr + 3; y++) for (let x = -sr - 3; x <= sr + 3; x++) { const d = Math.hypot(x, y);
    if (d <= sr) { g.fillStyle = P.sun; g.fillRect(sx + x, sy + y, 1, 1); } else if (d <= sr + 3 && ((x + y) & 1)) { g.fillStyle = P.sun + '55'; g.fillRect(sx + x, sy + y, 1, 1); } }
  if (phase === 'night') { g.fillStyle = P.sky[1]; for (let y = -sr; y <= sr; y++) for (let x = -sr; x <= sr; x++) if (Math.hypot(x - 4, y - 2) <= sr - 1 && Math.hypot(x, y) <= sr) g.fillRect(sx + x, sy + y, 1, 1); }
  // far hills (two layers), then a shore treeline along the horizon
  const ridge = (base, amp, fr, ph, col) => { g.fillStyle = col; for (let x = 0; x < W; x++) { const h = Math.round(base - amp * (0.6 * Math.sin(x * fr + ph) + 0.4 * Math.sin(x * fr * 2.7 + ph * 2))); g.fillRect(x, h, 1, HORIZON + 2 - h); } };
  ridge(HORIZON - 18, 12, 0.013, 1.2, P.hill[0]); ridge(HORIZON - 8, 7, 0.031, 0.4, P.hill[1]);
  for (let x = 0; x < W; x += 3) { const h = 4 + Math.floor(r() * 7) + (Math.sin(x * 0.05) > 0.3 ? 4 : 0); g.fillStyle = P.tree[(x / 3) & 1];
    for (let k = 0; k < h; k++) { const w = Math.max(1, Math.round((k / h) * 4)); g.fillRect(x + 1 - (w >> 1), HORIZON - h + k, w + 1, 1); } }
  g.fillStyle = P.tree[1]; g.fillRect(0, HORIZON - 1, W, 3);
  statics.set(phase, c); return c;
}
// clouds drift slowly; water bands scroll; crests and glints twinkle. t in seconds.
export function drawWaterFrame(g, t, phase = 'day', o = {}) {
  const P = PAL[waterPhase(phase)], art = WATER_ART[waterPhase(phase)];
  if (!art) g.drawImage(drawStatic(waterPhase(phase)), 0, 0); else g.clearRect(0, 0, W, H);
  if (!art) { const r = rng(3); for (let i = 0; i < 6; i++) { const cw = 30 + Math.floor(r() * 40), cy = 10 + Math.floor(r() * 50), cx = Math.round(((r() * W + t * (2 + i * 0.6)) % (W + cw * 2)) - cw);
      for (let k = 0; k < 4; k++) { const ww = cw - k * 8, hh = 3; g.fillStyle = P.cloud[k === 3 ? 1 : 0]; g.fillRect(cx + k * 4 + (k & 1) * 3, cy - 3 * (k ? 1 : 0) + k * 2, Math.max(6, ww), hh); } } }
  // water: per row, perspective (rows near the horizon are thin), shade chosen by a scrolling two-sine swell field
  for (let y = HORIZON + 1; y < H; y++) { const d = (y - HORIZON) / (H - HORIZON), sc = 0.25 + d * 1.6, base = Math.min(3, Math.floor(d * 2.2 + 0.4));
    if (art && d < 0.02) continue;
    for (let x = 0; x < W; x += 2) { const v = Math.sin((x / sc) * 0.045 + t * 1.1 + y * 0.35) + 0.6 * Math.sin((x / sc) * 0.11 - t * 1.7 + y * 0.9) + 0.35 * Math.sin(y * 0.22 - t * 0.6);
      let s = base + (v > 1.05 ? 1 : v < -0.9 ? -1 : 0); s = Math.max(0, Math.min(3, s));
      if (art) { if (v > 1.38) { g.fillStyle = P.crest; g.fillRect(x, y, 2, 1); } continue; }
      g.fillStyle = v > 1.38 ? P.crest : P.water[s]; g.fillRect(x, y, 2, 1); } }
  // sun / moon glitter path + random glints
  const gx = waterPhase(phase) === 'night' ? 90 : waterPhase(phase) === 'day' ? 380 : waterPhase(phase) === 'dawn' ? 120 : 360;
  g.fillStyle = P.glint;
  for (let y = HORIZON + 2; y < H; y += 3) { const spread = 4 + (y - HORIZON) * 0.35; for (let k = 0; k < 3; k++) { const ph = Math.sin(t * 3 + y * 1.7 + k * 2.1); if (ph > 0.55) g.fillRect(Math.round(gx + Math.sin(y * 3.1 + k * 5) * spread), y, ph > 0.85 ? 3 : 1, 1); } }
  const r2 = rng(Math.floor(t * 4) + 11); for (let i = 0; i < 14; i++) { const x = Math.floor(r2() * W), y = HORIZON + 6 + Math.floor(r2() * (H - HORIZON - 6)); g.fillRect(x, y, 1, 1); if (r2() < 0.4) { g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); } }
  // ripple rings round the foe spot (fractions of the canvas, matched to .b-foe by the caller)
  const fx = (o.foe?.x ?? 0.8) * W, fy = (o.foe?.y ?? 0.6) * H;
  for (let k = 0; k < 3; k++) { const p = ((t * 0.45 + k / 3) % 1), rx = 30 + p * 48, ry = rx * 0.24; g.fillStyle = P.foam;
    for (let a = 0; a < 64; a++) { if (p > 0.55 && (a + k) % 3 === 0) continue; if (p > 0.8 && a % 2) continue; const an = (a / 64) * Math.PI * 2; g.fillRect(Math.round(fx + Math.cos(an) * rx), Math.round(fy + Math.sin(an) * ry), 2, 1); } }
  // splash droplets hopping near the foe spot
  for (let k = 0; k < 4; k++) { const p = (t * 0.8 + k * 0.27) % 1, hx = fx + (k - 1.5) * 16, hy = fy - Math.sin(p * Math.PI) * 10; if (p < 0.9) g.fillRect(Math.round(hx), Math.round(hy), 1, 2); }
  if (!art) drawPier(g, t, P);
}
// wooden pier edge, front left (the player side stands on its end); posts bob a touch against the water line
function drawPier(g, t, P) {
  const [mid, dark, lite, out] = P.wood, top = 172, x0 = 0, x1 = 230;
  for (let y = top; y < H; y++) { const right = Math.round(x1 + (y - top) * 0.9); g.fillStyle = out; g.fillRect(x0, y, right + 1, 1);
    for (let x = x0; x < right; x++) { const plank = Math.floor((x + (y - top) * 0.9) / 14); g.fillStyle = (x + Math.floor((y - top) * 0.9)) % 14 === 0 ? out : (plank % 3 === 0 ? dark : (y - top) % 9 === 0 ? lite : mid); g.fillRect(x, y, 1, 1); } }
  g.fillStyle = lite; g.fillRect(x0, top, x1, 1); g.fillStyle = out; g.fillRect(x0, top - 1, x1 + 1, 1);
  // front posts going into the water, with a foam lap that pulses
  for (const px of [40, 130, 226]) { const y0 = top - 6; g.fillStyle = out; g.fillRect(px - 1, y0 - 1, 8, 8); g.fillStyle = dark; g.fillRect(px, y0, 6, 6); g.fillStyle = lite; g.fillRect(px, y0, 6, 1); }
  g.fillStyle = P.foam; const lap = Math.round(Math.sin(t * 2.2) * 2);
  for (let y = top - 2; y < H; y += 2) { const xr = Math.round(x1 + (y - top) * 0.9) + 2 + ((y >> 1) & 1) + (Math.sin(t * 2 + y * 0.4) > 0.3 ? 1 : 0) + lap; g.fillRect(xr, y, 2, 1); }
  g.fillRect(0, top - 2 + (lap > 0 ? 1 : 0), x1, 1);
}
// mount the live layer inside .bg; returns stop(). Static single frame under reduced motion.
export function mountWaterBg(host, { phase = 'day', reduced = false, foe } = {}) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; c.className = 'b-water';
  c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;object-fit:cover';
  host.appendChild(c); const g = c.getContext('2d'), t0 = performance.now(); let raf = 0, last = -1;
  const loop = (now) => { if (!c.isConnected) return; const t = (now - t0) / 1000, f = Math.floor(t * 15); if (f !== last) { last = f; drawWaterFrame(g, f / 15, phase, { foe }); } raf = requestAnimationFrame(loop); };
  drawWaterFrame(g, 0, phase, { foe }); if (!reduced) raf = requestAnimationFrame(loop);
  return () => { cancelAnimationFrame(raf); c.remove(); };
}

// Painted art: one canvas over the still in .bg plays the strip at 120 ms/frame (same cover fit as the still).
// Reduced motion: nothing mounted, the still alone shows. Returns stop().
export function mountWaterArt(host, { phase = 'day', reduced = false } = {}) {
  if (reduced) return () => {};
  const A = WATER_ANIM, c = document.createElement('canvas'); c.width = A.w; c.height = A.h; c.className = 'b-water art';
  c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;object-fit:cover';
  const g = c.getContext('2d'), img = new Image(); let raf = 0, last = -1, t0 = 0;
  const loop = (now) => { if (!c.isConnected) return; const f = Math.floor((now - t0) / A.ms) % A.frames;
    if (f !== last) { last = f; g.clearRect(0, 0, A.w, A.h); g.drawImage(img, 0, f * A.h, A.w, A.h, 0, 0, A.w, A.h); } raf = requestAnimationFrame(loop); };
  img.onload = () => { if (!c.isConnected) return; t0 = performance.now(); raf = requestAnimationFrame(loop); };
  img.src = A.src(waterPhase(phase)); host.appendChild(c);
  return () => { cancelAnimationFrame(raf); c.remove(); };
}
// Frame fraction -> px inside a box shown with background-size: cover (how .bg shows the still); ax / ay = background-position
// as a 0..1 fraction (0.5 = centred, phones use ay 1 = bottom-aligned).
export function coverPoint(fx, fy, bw, bh, iw = 1280, ih = 720, ax = 0.5, ay = 0.5) {
  const s = Math.max(bw / iw, bh / ih); return [(bw - iw * s) * ax + fx * iw * s, (bh - ih * s) * ay + fy * ih * s];
}

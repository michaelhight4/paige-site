// Weather v1 renderer: pooled particles + cached fog sheet, drawn in the living-world top pass (renderer.js).
// Budget (phone 844x390 at 4x CPU throttle must stay < 16.7 ms): drops live in a fixed Float32Array pool (no per-frame
// allocation), all rain streaks go in ONE path + ONE stroke, splashes are a 24-slot ring, fog is a 96x54 offscreen
// sheet built once and blitted twice (scrolling), tint / haze / flash are single fillRects.
import { RAINY, FOGGY, particleCap } from './logic.js?v=v0.2.68-alpha';

const RAIN_LOOK = { rain_light: { len: 8, spd: 0.55, a: 0.5, tint: 0.1 }, rain_heavy: { len: 12, spd: 0.8, a: 0.62, tint: 0.18 }, storm: { len: 14, spd: 0.95, a: 0.68, tint: 0.26 } };
const POOL = 280, SPL = 24;

export function createWeatherFx({ mobile = false } = {}) {
  const drops = new Float32Array(POOL * 3); // x01, y01, depth
  for (let i = 0; i < POOL; i++) { drops[i * 3] = Math.random(); drops[i * 3 + 1] = Math.random(); drops[i * 3 + 2] = 0.55 + Math.random() * 0.45; }
  const spl = new Float32Array(SPL * 3); let splI = 0, splT = 0; // x, y (screen), born ms
  const st = { fog: null, flash: 0, nextFlash: 0, lastMs: 0 };

  function fogSheet(ice) {
    if (st.fog?.ice === ice) return st.fog.c;
    const c = (globalThis.OffscreenCanvas ? new OffscreenCanvas(96, 54) : Object.assign(document.createElement('canvas'), { width: 96, height: 54 }));
    const g = c.getContext('2d'), col = ice ? '232,240,250' : '214,220,226';
    let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 26; i++) { // soft blobs, wrapped horizontally so the sheet tiles
      const x = r() * 96, y = r() * 54, rad = 10 + r() * 18;
      for (const ox of [-96, 0, 96]) { const gr = g.createRadialGradient(x + ox, y, 0, x + ox, y, rad); gr.addColorStop(0, `rgba(${col},0.5)`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.fillRect(x + ox - rad, y - rad, rad * 2, rad * 2); }
    }
    st.fog = { ice, c }; return c;
  }

  /** Draw one frame. w = {kind, k (0..1 ease), ms, gust (1 = calm), reduced}. */
  function draw(ctx, v, w) {
    const { kind, k } = w; if (!kind || k <= 0.01) return;
    const W = ctx.canvas.width, H = ctx.canvas.height, ms = w.ms || 0, z = v.zoom || 1, cx = (v.cam?.x || 0) * z, cy = (v.cam?.y || 0) * z;
    const dt = Math.min(50, Math.max(0, ms - st.lastMs)); st.lastMs = ms;
    // tint: darker for rain, cold haze for blizzard
    const look = RAIN_LOOK[kind];
    if (look) { ctx.fillStyle = `rgba(18,26,48,${(look.tint * k).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
    // fog / ice fog / blizzard haze: cached sheet, two scrolled blits
    if (FOGGY.has(kind) || kind === 'blizzard' || kind === 'snow_light') {
      const a = kind === 'blizzard' ? 0.42 + 0.18 * Math.max(0, (w.gust || 1) - 1) : kind === 'snow_light' ? 0.16 : kind === 'ice_fog' ? 0.6 : 0.55;
      const sheet = fogSheet(kind !== 'fog'), sw = W * 1.5, sh = H * 1.2, speed = kind === 'blizzard' ? 0.09 : 0.012;
      const ox = -(((ms * speed * z + cx * 0.6) % sw) + sw) % sw, oy = -(((cy * 0.3) % (sh - H)) + (sh - H)) % (sh - H) || 0;
      ctx.globalAlpha = Math.min(1, a * k); const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = true;
      ctx.drawImage(sheet, ox, oy, sw, sh); ctx.drawImage(sheet, ox + sw, oy, sw, sh);
      if (kind === 'snow_light') { ctx.drawImage(sheet, ox * 0.5, H - sh * 0.35, sw, sh * 0.4); ctx.drawImage(sheet, ox * 0.5 + sw, H - sh * 0.35, sw, sh * 0.4); } // low drift band
      ctx.imageSmoothingEnabled = sm; ctx.globalAlpha = 1;
      if (kind === 'blizzard') { ctx.fillStyle = `rgba(226,234,246,${(0.14 * k).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
    }
    // particles
    const n = Math.min(POOL, Math.round(particleCap(kind, mobile, w.reduced) * k));
    if (n > 0 && look) {
      const L = look.len * z, sp = look.spd * z, slant = 0.28;
      ctx.strokeStyle = `rgba(196,212,236,${look.a.toFixed(2)})`; ctx.lineWidth = Math.max(1, Math.round(z * 0.6)); ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const d = drops[i * 3 + 2], x = ((drops[i * 3] * (W + 60) - cx * 0.2 * d + ms * sp * slant * d) % (W + 60) + W + 60) % (W + 60) - 30;
        const y = ((drops[i * 3 + 1] * (H + 40) - cy * 0.2 * d + ms * sp * d) % (H + 40) + H + 40) % (H + 40) - 20;
        ctx.moveTo(x | 0, y | 0); ctx.lineTo((x - L * slant * d) | 0, (y - L * d) | 0);
      }
      ctx.stroke();
      // splashes: ring buffer, spawn rate by intensity
      splT += dt * n * 0.0016;
      while (splT >= 1) { splT -= 1; const j = splI++ % SPL; spl[j * 3] = Math.random() * W; spl[j * 3 + 1] = H * 0.15 + Math.random() * H * 0.85; spl[j * 3 + 2] = ms; }
      ctx.fillStyle = 'rgba(214,226,244,0.55)';
      for (let j = 0; j < SPL; j++) {
        const age = ms - spl[j * 3 + 2]; if (age < 0 || age > 220) continue;
        const r = 1 + Math.floor(age / 70), x = spl[j * 3] | 0, y = spl[j * 3 + 1] | 0, p = Math.max(1, Math.round(z * 0.5));
        ctx.fillRect(x - r * p * 2, y, p, p); ctx.fillRect(x + r * p * 2, y, p, p); ctx.fillRect(x - r * p, y - r * p, p, p); ctx.fillRect(x + r * p, y - r * p, p, p);
      }
    }
    if (n > 0 && kind === 'blizzard') { // wind-driven streak flakes on top of the soul.js snowfall
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; const g = w.gust || 1, sz = Math.max(2, Math.round(z * (mobile ? 0.9 : 1.1)));
      for (let i = 0; i < n; i++) {
        const d = drops[i * 3 + 2], x = ((drops[i * 3] * (W + 60) - cx * 0.5 * d + ms * 0.32 * z * d * g) % (W + 60) + W + 60) % (W + 60) - 30;
        const y = ((drops[i * 3 + 1] * (H + 40) - cy * 0.5 * d + ms * 0.1 * z * d + Math.sin(ms / 400 + i) * 4 * z) % (H + 40) + H + 40) % (H + 40) - 20;
        ctx.fillRect(x | 0, y | 0, sz * (i & 1 ? 3 : 2), sz);
      }
    }
    // storm lightning
    if (kind === 'storm' && !w.reduced) {
      if (!st.nextFlash) st.nextFlash = ms + 6000 + Math.random() * 9000;
      if (ms > st.nextFlash) { st.flash = 1; st.nextFlash = ms + 8000 + Math.random() * 14000; w.onFlash?.(); }
      if (st.flash > 0.02) { ctx.fillStyle = `rgba(236,240,255,${(0.32 * st.flash * k).toFixed(3)})`; ctx.fillRect(0, 0, W, H); st.flash *= Math.pow(0.86, dt / 16.7); }
    }
  }
  return { draw, st, isRainy: (k) => RAINY.has(k) };
}

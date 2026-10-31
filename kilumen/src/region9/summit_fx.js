// Wellspire v2 (Coder, Oct 29 2026): the towering Ondravel (4x4 tiles, ondravel_big_sheet.png: rows 0 sealed, 1 awake, 2 flare;
// 6 frames of 256 px) and the summit cinematic layers: a cloud bank that parts, light shafts, a violet / white flash and
// camera shake (scene.camFocus jitter). Drawn by renderer.js after the mood layer (v.r9fx). Placement: map json `ondravel`
// {x, y}: x = the centre tile, y = the tile under his feet.
import { makeLabFx } from './lab_fx.js?v=v0.2.107-alpha';
import { anim, frameAt, drawFrame } from './anims.js?v=v0.2.107-alpha';
import { makeTankOverlays } from './tank_overlays.js?v=v0.2.107-alpha';
const T = 64, FW = 256, FH = 256;
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
export function makeSummitFx(scene) {
  const img = typeof Image !== 'undefined' ? new Image() : null; let src = null;
  const fx = { cloud: 0, light: 0, flash: 0, flashCol: '255,255,255', row: null, hidden: false, active: false };
  const meta = () => scene.map?.json?.ondravel || null;
  const lab = fx.lab = makeLabFx(scene); let breaking = false;
  const tanks = fx.tanks = makeTankOverlays(); fx.decorationFx = (ctx, v) => tanks.draw(ctx, v); // lab tank particle overlays (tank_overlays.js)
  // Wellspire v3: in the lab Ondravel floats in the big tank (lab_fx.js); released = glass broken, water drained
  fx.under = (ctx, v) => {
    if (!scene.map?.json?.lab) return;
    if (!breaking) { lab.broken = scene.flags.has('fin_released'); lab.drain = lab.broken ? 1 : 0; }
    lab.under(ctx, v, (c, v2, tk) => {
      const o = meta(); const row = fx.rowFor(); if (!o || !img || row < 0) return;
      if (src !== o.sheet) { src = o.sheet; img.src = o.sheet; } if (!img.complete || !img.naturalWidth) return;
      const z = v2.zoom, t = (v2.ms || 0) / 1000, floatH = (1 - lab.drain) * (28 + Math.sin(t * 1.3) * 8);
      const col = Math.floor((v2.ms || 0) / (lab.broken ? 160 : 320)) % 6;
      const sx = ((tk.x + tk.w / 2) * T - FW / 2 - v2.cam.x) * z, sy = ((tk.y + tk.h) * T - 30 - FH - floatH - v2.cam.y) * z;
      c.drawImage(img, col * FW, row * FH, FW, FH, Math.round(sx), Math.round(sy), FW * z, FH * z);
    });
  };
  fx.breakTank = async () => {
    if (!scene.map?.json?.lab) { // WD lab room 10: tile tank; the glass swaps to wl_bigcrystal_broken_* (flag_swaps on fin_released) at the flash
      if (!meta()) return; breaking = true;
      try { await fx.shake(500, 4); scene.setFlag?.('fin_released'); await fx.flashOut('190,250,255', 120, 500); await fx.shake(1200, 6); } finally { breaking = false; }
      return;
    } breaking = true; lab.broken = false; lab.drain = 0;
    try { await fx.shake(500, 4); lab.releaseT = typeof performance !== 'undefined' ? performance.now() : Date.now(); lab.broken = true; await fx.flashOut('190,250,255', 120, 500); const sh = fx.shake(1200, 6);
      await tween(1800, (e) => { lab.drain = e; }); await sh; } finally { breaking = false; } };
  fx.rowFor = () => {
    if (fx.row != null) return fx.row;
    const f = scene.flags, n = scene.map?.name;
    if (n === 'fin_lab1_now') return f.has('fin_woke_home') ? -1 : f.has('fin_timeslip') ? 1 : 0;
    if (n === 'fin_past_enclosure' || n === 'fin_past_wlab_10_ondravel') return f.has('fin_guardian_beaten') ? -1 : f.has('fin_released') || lab.broken ? 2 : 0;
    return -1;
  };
  fx.centre = () => { const o = meta(); return o && { x: o.x * T + T / 2, y: (o.y + 1) * T - FH / 2 }; };
  fx.draw = (ctx, v) => {
    const o = meta(), z = v.zoom, W = ctx.canvas.width, H = ctx.canvas.height;
    if (o && img && !o.tank) {
      if (src !== o.sheet) { src = o.sheet; img.src = o.sheet; }
      const row = fx.rowFor();
      const tower = row >= 1 && scene.map?.name === 'fin_lab1_now' ? anim('ondravel_summit_tower') : null;
      if (tower) drawFrame(ctx, tower, frameAt(tower, v.ms || 0), (o.x * T + T / 2 - v.cam.x) * z, ((o.y + 1) * T - v.cam.y) * z, z); // Animator's towering Ondravel (9x9 tiles)
      else if (row >= 0 && img.complete && img.naturalWidth) {
        const col = Math.floor((v.ms || 0) / 160) % 6, sx = (o.x * T + T / 2 - FW / 2 - v.cam.x) * z, sy = ((o.y + 1) * T - FH - v.cam.y) * z;
        ctx.save(); ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, col * FW, row * FH, FW, FH, Math.round(sx), Math.round(sy), FW * z, FH * z); ctx.restore();
      }
    }
    if (fx.light > 0 && o) { // light shafts down onto him through the gap
      const cx = (o.x * T + T / 2 - v.cam.x) * z; ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const [dx, w, a] of [[-0.9, 0.5, 0.18], [0, 0.8, 0.28], [0.8, 0.45, 0.16]]) {
        const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, `rgba(255,244,210,${a * fx.light})`); g.addColorStop(1, 'rgba(255,244,210,0)');
        ctx.fillStyle = g; ctx.beginPath(); const top = cx + dx * T * z, bw = w * T * z;
        ctx.moveTo(top - bw * 0.4, 0); ctx.lineTo(top + bw * 0.4, 0); ctx.lineTo(top + bw * 2.4 + dx * T * z, H); ctx.lineTo(top - bw * 2.4 + dx * T * z, H); ctx.fill();
      }
      ctx.restore();
    }
    const split = fx.cloud > 0 ? anim('wellspire_cloud_split') : null;
    if (split) { // Animator's cloud split: the frame follows how far the banks have parted
      ctx.save(); ctx.globalAlpha = Math.min(1, fx.cloud * 1.6); const f = Math.min(split.meta.frames - 1, Math.floor((1 - fx.cloud) * split.meta.frames));
      drawFrame(ctx, split, f, W / 2, H, 1, W, H); ctx.restore();
    } else if (fx.cloud > 0) { // placeholder: two banks that slide apart from the middle
      const open = 1 - fx.cloud, t = (v.ms || 0) / 1000; ctx.save();
      for (const side of [-1, 1]) for (let i = 0; i < 14; i++) {
        const r = (0.16 + ((i * 37) % 11) / 60) * Math.max(W, H), bx = W / 2 + side * (r * 0.35 + open * W * 0.75 + ((i * 53) % 17) / 17 * W * 0.25) + Math.sin(t * 0.4 + i) * 6 * z;
        const by = ((i * 71) % 13) / 12 * H; ctx.fillStyle = `rgba(${i % 3 ? '236,240,248' : '214,222,236'},${0.94 * Math.min(1, fx.cloud * 1.6)})`;
        ctx.beginPath(); ctx.ellipse(bx, by, r, r * 0.62, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    if (scene.map?.json?.lab) lab.over(ctx, v);
    if (fx.flash > 0) { ctx.fillStyle = `rgba(${fx.flashCol},${Math.min(1, fx.flash)})`; ctx.fillRect(0, 0, W, H); }
  };
  const tween = (ms, f) => new Promise((res) => {
    if (typeof requestAnimationFrame === 'undefined') { f(1); return res(); }
    const t0 = performance.now(); const k = (now) => { const t = Math.min(1, (now - t0) / ms); f(ease(t)); if (t < 1) requestAnimationFrame(k); else res(); }; requestAnimationFrame(k);
  });
  fx.tween = tween;
  fx.pan = async (to, ms = 1400) => { const p = scene.player?.pixel?.(); const from = scene.camFocus || (p ? { x: p.px + T / 2, y: p.py + T / 2 } : to);
    await tween(ms, (e) => { scene.camFocus = { x: Math.round(from.x + (to.x - from.x) * e), y: Math.round(from.y + (to.y - from.y) * e) }; }); };
  fx.release = async (ms = 900) => { const p = scene.player?.pixel?.(); if (p && scene.camFocus) await fx.pan({ x: p.px + T / 2, y: p.py + T / 2 }, ms); scene.camFocus = null; };
  fx.shake = async (ms = 900, amp = 7) => { const base = scene.camFocus || fx.centre(); if (!base || scene.reducedMotion) return;
    await tween(ms, (e) => { const a = amp * (1 - e); scene.camFocus = { x: Math.round(base.x + (Math.random() * 2 - 1) * a), y: Math.round(base.y + (Math.random() * 2 - 1) * a) }; }); scene.camFocus = base; };
  fx.flashOut = async (col = '255,255,255', up = 160, down = 900) => { fx.flashCol = col; await tween(up, (e) => { fx.flash = e; }); await tween(down, (e) => { fx.flash = 1 - e; }); };
  return fx;
}

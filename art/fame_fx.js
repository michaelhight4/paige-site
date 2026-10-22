/* LifeSim Fame FX - release-day / sensation animations. No dependencies.
 * UMD: window.LifeSimFameFX.createFameFX(container, opts)
 * trigger({type:'fame_burst', intensity:1-5, label:'...', sub:'...', origin:{x:.5,y:.5}, meter:0-100 (optional absolute)})
 */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.LifeSimFameFX = factory(); })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), rnd = (a, b) => a + Math.random() * (b - a);
  const COLORS = ['#ffd166', '#ef476f', '#06d6a0', '#118ab2', '#ffffff', '#f78c6b', '#c77dff'];

  function createFameFX(container, opts) {
    opts = Object.assign({ manual: false, meterLabel: 'FAME', shake: true }, opts || {});
    const cv = document.createElement('canvas'), ctx = cv.getContext('2d');
    Object.assign(cv.style, { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 20 });
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
    container.appendChild(cv);
    let parts = [], banner = null, shake = null, spot = null, meter = { v: 0, shown: 0, pulse: 0 }, raf = 0, last = 0, destroyed = false, cfgLast = null;
    function size() { const r = container.getBoundingClientRect(), w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height)); if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; } }

    function trigger(cfg) {
      cfg = Object.assign({ type: 'fame_burst', intensity: 3, label: 'SENSATION!', sub: '' }, cfg || {});
      if (cfg.type !== 'fame_burst') return false; cfgLast = cfg; size();
      const I = clamp(Math.round(cfg.intensity), 1, 5), o = cfg.origin || { x: .5, y: .5 }, rm = document.documentElement.dataset.motion === 'reduced', n = rm ? 0 : 30 + I * I * 14; // reduced motion: no particles, flash or shake
      for (let i = 0; i < n; i++) { const a = rnd(0, 6.283), sp = rnd(120, 260 + I * 110), star = Math.random() < .35;
        parts.push({ x: o.x * cv.width, y: o.y * cv.height, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, g: star ? 120 : 380, life: 0, max: rnd(1.4, 2.4 + I * .3), star, size: star ? rnd(7, 12 + I * 2) : rnd(5, 9), rot: rnd(0, 6.28), vr: rnd(-8, 8), color: COLORS[(Math.random() * COLORS.length) | 0], flip: rnd(0, 6.28) }); }
      banner = { t: 0, dur: 2.6 + I * .35, text: cfg.label, sub: cfg.sub, I };
      shake = rm ? null : { t: 0, dur: .25 + I * .1, mag: 2 + I * 3 };
      spot = rm ? null : { t: 0, dur: 1.8 + I * .45, I };
      meter.v = cfg.meter != null ? clamp(cfg.meter, 0, 100) : clamp(meter.v + 8 + I * 5, 0, 100); meter.pulse = 1.6;
      if (!opts.manual) loop(); return true;
    }

    function update(dt) {
      dt = Math.min(dt, .05);
      parts.forEach(p => { p.life += dt; p.vy += p.g * dt; p.vx *= (1 - .6 * dt); p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.flip += dt * 9; }); parts = parts.filter(p => p.life < p.max && p.y < cv.height + 40);
      if (banner) { banner.t += dt; if (banner.t > banner.dur) banner = null; }
      if (spot) { spot.t += dt; if (spot.t > spot.dur) spot = null; }
      if (shake) { shake.t += dt; const k = 1 - shake.t / shake.dur; if (k <= 0) { shake = null; container.style.transform = ''; } else if (opts.shake) container.style.transform = `translate(${rnd(-1, 1) * shake.mag * k}px,${rnd(-1, 1) * shake.mag * k}px)`; }
      meter.shown += (meter.v - meter.shown) * Math.min(1, dt * 4); if (meter.pulse > 0) meter.pulse = Math.max(0, meter.pulse - dt);
    }
    const star = (x, y, r, rot) => { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * .45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); };

    function draw() {
      size(); const W = cv.width, H = cv.height; ctx.clearRect(0, 0, W, H);
      if (spot) { const k = Math.sin(clamp(spot.t / spot.dur, 0, 1) * Math.PI); [[.12, 1], [.88, -1]].forEach(([sx, dir]) => { const ang = Math.PI / 2 + dir * (Math.cos(spot.t * 2.6) * .55 + .15 * dir), L = H * 1.3, ox = sx * W;
        const g = ctx.createLinearGradient(ox, 0, ox + Math.cos(ang) * L, Math.sin(ang) * L); g.addColorStop(0, `rgba(255,248,200,${.5 * k})`); g.addColorStop(1, 'rgba(255,248,200,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(ox, 0); ctx.lineTo(ox + Math.cos(ang - .13) * L, Math.sin(ang - .13) * L); ctx.lineTo(ox + Math.cos(ang + .13) * L, Math.sin(ang + .13) * L); ctx.closePath(); ctx.fill(); }); }
      parts.forEach(p => { ctx.save(); ctx.globalAlpha = clamp(1 - (p.life / p.max - .7) / .3, 0, 1); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color;
        if (p.star) star(0, 0, p.size, 0); else { ctx.scale(1, Math.cos(p.flip)); ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); } ctx.restore(); });
      // fame meter (bottom-left), pulses on trigger
      const mw = Math.min(260, W * .4), mh = 18, mx = 18, my = H - 34, pu = meter.pulse > 0 ? 1 + .12 * Math.sin(meter.pulse * 14) * Math.min(1, meter.pulse) : 1;
      if (meter.v > 0 || meter.shown > .5) { ctx.save(); ctx.translate(mx + mw / 2, my + mh / 2); ctx.scale(pu, pu); ctx.translate(-mx - mw / 2, -my - mh / 2);
        ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(mx - 6, my - 22, mw + 12, mh + 30); ctx.fillStyle = '#ffd166'; ctx.font = 'bold 12px system-ui,sans-serif'; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.fillText('\u2605 ' + opts.meterLabel + '  ' + Math.round(meter.shown), mx, my - 7);
        ctx.fillStyle = '#333'; ctx.fillRect(mx, my, mw, mh); const g = ctx.createLinearGradient(mx, 0, mx + mw, 0); g.addColorStop(0, '#ef476f'); g.addColorStop(.6, '#ffd166'); g.addColorStop(1, '#fff3b0');
        ctx.fillStyle = g; ctx.fillRect(mx, my, mw * meter.shown / 100, mh); if (meter.pulse > 0) { ctx.strokeStyle = `rgba(255,255,255,${meter.pulse / 1.6})`; ctx.lineWidth = 3; ctx.strokeRect(mx - 1, my - 1, mw + 2, mh + 2); } ctx.restore(); }
      if (banner) { const b = banner, inK = clamp(b.t / .35, 0, 1), outK = clamp((b.dur - b.t) / .4, 0, 1), e = 1 - Math.pow(1 - inK, 3), y = -90 + (H * .16 + 90) * e, bh = 74 + b.I * 4;
        ctx.save(); ctx.globalAlpha = outK; const g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, 'rgba(180,20,60,0)'); g.addColorStop(.12, 'rgba(180,20,60,.93)'); g.addColorStop(.88, 'rgba(180,20,60,.93)'); g.addColorStop(1, 'rgba(180,20,60,0)');
        ctx.fillStyle = g; ctx.fillRect(0, y - bh / 2, W, bh); ctx.fillStyle = '#ffd166'; ctx.fillRect(0, y - bh / 2, W, 3); ctx.fillRect(0, y + bh / 2 - 3, W, 3);
        const pulse = 1 + .04 * Math.sin(b.t * 10); ctx.translate(W / 2, y + (b.sub ? -6 : 6)); ctx.scale(pulse, pulse); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `900 ${34 + b.I * 4}px system-ui,sans-serif`; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.strokeText(b.text, 0, 0); ctx.fillStyle = '#fff'; ctx.fillText(b.text, 0, 0);
        if (b.sub) { ctx.font = '600 15px system-ui,sans-serif'; ctx.fillStyle = '#ffe9a8'; ctx.fillText(b.sub, 0, 30 + b.I); } ctx.restore(); }
    }
    function loop() { if (raf || opts.manual || destroyed) return; last = 0; const f = now => { raf = 0; if (destroyed) return; update(last ? (now - last) / 1000 : .016); last = now; draw(); if (parts.length || banner || shake || spot || meter.pulse > 0) raf = requestAnimationFrame(f); }; raf = requestAnimationFrame(f); }
    const api = { trigger, update, draw, canvas: cv, isActive: () => !!(parts.length || banner || shake || spot),
      get meter() { return meter.v; }, setMeter: v => { meter.v = clamp(v, 0, 100); draw(); },
      destroy() { destroyed = true; cancelAnimationFrame(raf); cv.remove(); container.style.transform = ''; } };
    return api;
  }
  return { createFameFX, version: 1 };
});

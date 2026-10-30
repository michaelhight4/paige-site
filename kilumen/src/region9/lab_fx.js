// Wellspire v3 lab (Coder, Oct 29 2026, PLACEHOLDER art until Animator / World Design assets land in shots/flashback_anim/):
// draws map json `lab` (tools/wellspire/build_lab_v3.py) as chunky pixel art on a 16 px/tile buffer scaled up with no
// smoothing, so it reads like the tile art. under(): floors, walls, props, Ondravel's tank (water, bubbles, pulsing tubes,
// Ondravel floating inside); over(): mist, strip-light glow. State: fx.lab.drain 0..1 (water gone), fx.lab.broken.
import { anim, frameAt, drawFrame } from './anims.js?v=v0.2.93-alpha';
const T = 64, S = 16, K = T / S;
const PAL = { white: ['#dfe8ef', '#c9d6e0'], green: ['#1b2a24', '#22342c'], teal: ['#10222a', '#152b34'], steel: ['#b9c6d0', '#a7b6c2'] };
const WALL = { white: '#eef3f7', green: '#1e2b27', teal: '#16262e', steel: '#d4dde4' };
const wall = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()); // release one-shot runs on wall time (scene.ms may be frozen)
export function makeLabFx(scene) {
  const lab = { drain: 0, broken: false, releaseT: null, animTank: false, cache: null, key: null, imgs: {}, ond: null };
  const meta = () => scene.map?.json?.lab || null;
  const img = (src) => { if (typeof Image === 'undefined') return null; let i = lab.imgs[src]; if (!i) { i = lab.imgs[src] = new Image(); i.src = src; } return i.complete && i.naturalWidth ? i : null; };
  const SPEC = ['mirrorkin', 'seaglint', 'pearlisk', 'prismwing', 'moorcoil', 'brineseal', 'glassvine', 'runeskein', 'crowkin', 'cascadorn'];
  const r = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  function staticLayer(L, W, H) {
    const cv = document.createElement('canvas'); cv.width = W * S; cv.height = H * S; const c = cv.getContext('2d');
    for (const z of L.zones) {
      const [a, b] = PAL[z.style];
      for (let y = z.y0; y <= z.y1; y++) for (let x = z.x0; x <= z.x1; x++) { r(c, x * S, y * S, S, S, (x + y) % 2 ? a : b); r(c, x * S, y * S, S, 1, 'rgba(0,0,0,0.12)'); r(c, x * S, y * S, 1, S, 'rgba(0,0,0,0.12)'); }
      // back wall (rows 0-1 above the zone): panels + a light strip
      r(c, z.x0 * S, 0, (z.x1 - z.x0 + 1) * S, 2 * S, WALL[z.style]); r(c, z.x0 * S, 2 * S - 3, (z.x1 - z.x0 + 1) * S, 3, 'rgba(0,0,0,0.25)');
      for (let x = z.x0; x <= z.x1; x++) r(c, x * S, 6, 1, 2 * S - 9, 'rgba(0,0,0,0.12)');
      r(c, z.x0 * S + 4, 3, (z.x1 - z.x0 + 1) * S - 8, 2, z.style === 'green' ? '#9cff9c' : '#bff6ff');
      if (z.style === 'teal' || z.style === 'green') for (let x = z.x0 * S; x < (z.x1 + 1) * S; x += 7) { r(c, x, 8 + (x % 5), 5, 2, '#2f4048'); r(c, x + 2, 14, 2, 10, '#26363d'); } // pipes / ducts
      if (z.style === 'green') for (let x = z.x0 + 1; x < z.x1; x += 2) { r(c, x * S, 14, 12, 10, '#0c1410'); r(c, x * S + 2, 16, 8, 5, '#3bd36b'); } // machinery with green screens
      if (z.style === 'white' && z.id === 'exam') { r(c, (z.x0 + 1) * S, 4, 5 * S, 2 * S - 8, '#0d2a3a'); }
    }
    for (const p of L.props) {
      const x = p.x * S, y = p.y * S, w = p.w * S, h = p.h * S;
      switch (p.k) {
        case 'display': r(c, x + 1, y + 6, 14, 9, '#8aa0ad'); r(c, x + 2, y - 4, 12, 10, 'rgba(190,240,255,0.55)'); r(c, x + 3, y - 3, 2, 8, '#ffffff'); break;
        case 'equip': r(c, x + 2, y + 2, 12, 12, '#7d8c97'); r(c, x + 4, y + 4, 8, 4, '#4fd6ff'); r(c, x + 4, y + 10, 3, 2, '#ffb84f'); break;
        case 'doorway': r(c, x, y, S, S, '#ffffff'); r(c, x + 2, y, 12, S, '#f4feff'); break;
        case 'bed': r(c, x + 1, y + 3, 14, 10, '#9fb0bc'); r(c, x + 2, y + 3, 12, 7, '#ffffff'); r(c, x + 2, y + 3, 5, 4, '#cfe6f2'); break;
        case 'chair': r(c, x + 4, y + 5, 8, 8, '#5f707c'); r(c, x + 4, y + 3, 8, 3, '#2f3a42'); break;
        case 'console': case 'console_w': r(c, x + 1, y + 5, 14, 10, '#2b3640'); r(c, x + 2, y + 1, 12, 7, '#0f1e28'); r(c, x + 3, y + 2, 10, 5, '#45d4ef'); r(c, x + 2, y + 13, 12, 1, '#6ff'); break;
        case 'bench': r(c, x + 1, y + 2, 14, h - 4, '#38454f'); r(c, x + 3, y + 4, 4, 4, '#9ee'); r(c, x + 8, y + 12, 4, 6, '#cde'); break;
        case 'vat': r(c, x - 1, y - 1, w + 2, h + 2, '#5c6a66'); r(c, x, y, w, h, '#0e3a20'); for (let i = 0; i < w; i += 3) r(c, x + i, y - 2, 1, 2, '#8a9894'); break;
        case 'curtain': for (let i = 0; i < 4; i++) r(c, x + i * 4, y, 3, S * 2, 'rgba(210,240,230,0.25)'); break;
        case 'rail': r(c, x, y + 6, w, 3, '#7f909a'); for (let i = 0; i < w; i += 4) r(c, x + i, y + 6, 1, 9, '#a9b9c2'); r(c, x, y + 14, w, 2, '#33424a'); break;
        case 'cable': for (let i = 0; i < w; i += 2) r(c, x + i, y + 10 + Math.round(Math.sin(i / 3) * 2), 2, 2, '#0b1418'); break;
        case 'spec': r(c, x, y + h - 6, S, 6, '#1d262c'); r(c, x + 1, y + h - 5, 14, 1, '#4ff0e8'); r(c, x, y, S, 4, '#283139'); break;
        case 'scan': r(c, x + 4, y, w - 8, h, '#2e3940'); r(c, x, y + 4, w, h - 8, '#2e3940'); r(c, x + 6, y + 6, w - 12, h - 12, '#123848'); break;
        case 'ring': break; case 'holo3': break;
        case 'tank': r(c, x - 2, y + h - 8, w + 4, 10, '#c9d3da'); r(c, x, y + h - 6, w, 2, '#5ff'); r(c, x + 2, y, w - 4, 6, '#9aa7b0'); r(c, x + 4, y + 2, w - 8, 2, '#5ff'); break;
      }
    }
    return cv;
  }
  function animLayer(c, L, ms, front) {
    const t = ms / 1000;
    for (const p of L.props) {
      const x = p.x * S, y = p.y * S, w = p.w * S, h = p.h * S;
      if (!front) {
        if (p.k === 'vat') { const g = 0.6 + 0.25 * Math.sin(t * 1.6 + p.x + p.y); r(c, x + 1, y + 1, w - 2, h - 2, `rgba(80,255,120,${g})`); r(c, x + 2 + ((t * 6 + p.y) % (w - 6)), y + 3, 2, 1, '#d8ffd8'); }
        if (p.k === 'spec') { const g = 0.55 + 0.2 * Math.sin(t * 2 + p.x * 0.7 + p.y); r(c, x + 1, y + 4, 14, h - 10, `rgba(60,230,230,${g})`);
          const i = img(`art/characters/pixel/creatures/${SPEC[(p.specimen || 0) % SPEC.length]}/battle/${SPEC[(p.specimen || 0) % SPEC.length]}_front_128.png`);
          if (i) { c.globalAlpha = 0.75; c.drawImage(i, x + 2, y + 6 + Math.sin(t + p.x) * 1, 12, 12); c.globalAlpha = 1; }
          r(c, x + 3, y + 5, 1, h - 12, 'rgba(255,255,255,0.6)'); }
        if (p.k === 'console' || p.k === 'console_w' || p.k === 'equip') if (Math.sin(t * 3 + p.x * 1.3 + p.y) > 0.6) r(c, x + 3, y + 3, 10, 1, '#fff');
        if (p.k === 'ring') { const cx = x + w / 2, cy = y + h / 2; c.strokeStyle = `rgba(80,220,255,${0.55 + 0.3 * Math.sin(t * 2)})`; c.lineWidth = 2; c.beginPath(); c.ellipse(cx, cy, w / 2 - 2, h / 2 - 6, 0, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.ellipse(cx, cy, w / 4, h / 4 - 2, t, 0, Math.PI * 1.4); c.stroke(); }
        if (p.k === 'scan') { r(c, x + 8, y + 8, w - 16, h - 16, `rgba(80,230,255,${0.5 + 0.3 * Math.sin(t * 2.4)})`); r(c, x + 8, y + 8 + ((t * 10) % (h - 16)), w - 16, 1, '#fff'); }
        if (p.k === 'holo3') for (let i = 0; i < 3; i++) { const sx = x + 2 + i * (w / 3); r(c, sx, y + 3, w / 3 - 4, h - 6, '#08202c'); r(c, sx + 1, y + 4, w / 3 - 6, h - 8, `rgba(60,200,255,${0.35 + 0.15 * Math.sin(t * 2 + i)})`);
          r(c, sx + w / 6 - 3, y + 7, 2, h - 14, '#bff'); r(c, sx + w / 6 - 6, y + 10, 8, 2, '#bff'); r(c, sx + 2, y + 6 + ((t * 8 + i * 5) % (h - 12)), w / 3 - 8, 1, '#fff'); }
        if (p.k === 'tank') tankBack(c, x, y, w, h, t);
      } else if (p.k === 'tank') tankFront(c, x, y, w, h, t);
    }
    if (!front) { // exam wing holo HUD (circle) on the back wall
      const z = L.zones.find((q) => q.id === 'exam'); if (z) { const cx = (z.x0 + 3.5) * S, cy = S; c.strokeStyle = `rgba(110,230,255,${0.7 + 0.2 * Math.sin(t * 3)})`; c.lineWidth = 1;
        c.beginPath(); c.arc(cx, cy, 9, t, t + Math.PI * 1.5); c.stroke(); c.beginPath(); c.arc(cx, cy, 5, -t * 2, -t * 2 + Math.PI); c.stroke(); }
    }
  }
  const level = () => 1 - lab.drain;
  function tankBack(c, x, y, w, h, t) {
    const top = y + 6, bot = y + h - 8, wt = top + (bot - top) * (1 - level());
    r(c, x + 2, top, w - 4, bot - top, 'rgba(8,40,48,0.85)');
    if (level() > 0) { r(c, x + 2, wt, w - 4, bot - wt, 'rgba(50,210,230,0.55)');
      for (let i = 0; i < w - 4; i += 4) { const s = Math.sin(t * 2 + i * 0.4); r(c, x + 2 + i, wt + 4 + ((i * 7) % (bot - wt - 4 || 1)), 3, 1, `rgba(200,255,255,${0.15 + 0.15 * s})`); } }
  }
  function tankFront(c, x, y, w, h, t) {
    const top = y + 6, bot = y + h - 8, wt = top + (bot - top) * (1 - level());
    if (level() > 0) { c.fillStyle = 'rgba(60,220,240,0.22)'; c.fillRect(x + 2, wt, w - 4, bot - wt); r(c, x + 2, wt, w - 4, 1, 'rgba(220,255,255,0.8)');
      for (let i = 0; i < 14; i++) { const by = bot - (((t * (14 + (i % 4) * 5)) + i * 11) % Math.max(1, bot - wt)); r(c, x + 4 + ((i * 13) % (w - 8)) + Math.round(Math.sin(t * 3 + i)), by, i % 3 ? 1 : 2, i % 3 ? 1 : 2, 'rgba(230,255,255,0.85)'); } }
    // glass: highlights + rim; broken = jagged gap and shards on the floor
    if (!lab.broken) { r(c, x + 5, top + 2, 2, bot - top - 4, 'rgba(255,255,255,0.45)'); r(c, x + w - 8, top + 2, 1, bot - top - 4, 'rgba(255,255,255,0.3)'); }
    else { c.fillStyle = 'rgba(10,30,36,0.6)'; c.beginPath(); c.moveTo(x + 10, bot); for (let i = 0; i <= 8; i++) c.lineTo(x + 10 + i * (w - 20) / 8, bot - 18 - (i % 2) * 14 - (i % 3) * 6); c.lineTo(x + w - 10, bot); c.fill();
      for (let i = 0; i < 9; i++) r(c, x - 6 + i * (w + 12) / 9, bot + 4 + (i % 3) * 2, 2, 1, '#d8ffff'); r(c, x - 8, bot + 2, w + 16, 4, `rgba(60,200,230,${0.25 * (1 - Math.min(1, lab.drain - 0.6) )})`); }
    for (const [tx, dir] of [[x + 4, -1], [x + w - 6, 1]]) { // tubes from the hood to the ceiling + walls, light pulses running up them
      r(c, tx, y - 8, 2, 10, '#4b5a63'); r(c, tx, y - 8, dir * 14 + (dir < 0 ? 2 : 0), 2, '#4b5a63');
      const k = (t * 1.5 + (dir > 0 ? 0.5 : 0)) % 1; r(c, tx, y + 2 - k * 10, 2, 2, lab.broken ? '#334' : '#9ff');
    }
    r(c, x + w / 2 - 6, y, 12, 2, `rgba(120,255,255,${0.5 + 0.4 * Math.sin(t * 4)})`);
  }
  let animCv = null, frontCv = null;
  lab.under = (ctx, v, drawOnd) => {
    const L = meta(); if (!L || typeof document === 'undefined') return false;
    const m = scene.map; if (lab.key !== m.name) { lab.key = m.name; lab.cache = staticLayer(L, m.width, m.height); animCv = null; }
    const W = m.width * S, H = m.height * S;
    if (!animCv) { animCv = document.createElement('canvas'); animCv.width = W; animCv.height = H; frontCv = document.createElement('canvas'); frontCv.width = W; frontCv.height = H; }
    const a = animCv.getContext('2d'), f = frontCv.getContext('2d'); a.clearRect(0, 0, W, H); f.clearRect(0, 0, W, H);
    animLayer(a, L, v.ms || 0, false); animLayer(f, L, v.ms || 0, true);
    const z = v.zoom, dx = Math.round(-v.cam.x * z), dy = Math.round(-v.cam.y * z), sc = K * z;
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(lab.cache, dx, dy, W * sc, H * sc); ctx.drawImage(animCv, dx, dy, W * sc, H * sc);
    lab.lastMs = v.ms || 0; const tk = L.tank, idle = anim('ondravel_tank_idle'), rel = anim('ondravel_tank_release'), ms = v.ms || 0;
    lab.animTank = !!(idle && rel); // Animator's tank (glass, water and Ondravel in one sheet) replaces the placeholder
    if (!lab.animTank) drawOnd?.(ctx, v, tk); // placeholder: Ondravel (hi-res sheet) between the water and the glass
    ctx.drawImage(frontCv, dx, dy, W * sc, H * sc); ctx.restore();
    const at = (x, y) => [((x * T) - v.cam.x) * z, ((y * T) - v.cam.y) * z]; // tile corner -> screen
    if (lab.animTank) {
      const [bx, by] = at(tk.x + tk.w / 2, tk.y + tk.h);
      if (lab.releaseT != null || lab.broken) { const t0 = lab.releaseT ?? -1e9; drawFrame(ctx, rel, frameAt(rel, wall() - t0), bx, by, z); }
      else drawFrame(ctx, idle, frameAt(idle, ms), bx, by, z);
    }
    const spec = anim('lab_specimen_tank'), vat = anim('lab_misting_vat');
    for (const p of L.props) { // north-side specimen tanks and the vat lids use Animator's loops (offset per instance)
      if (spec && p.k === 'spec' && p.y < 10) { const [bx, by] = at(p.x + 0.5, p.y + 2); drawFrame(ctx, spec, frameAt(spec, ms + p.x * 137 + p.y * 71), bx, by, z); }
      if (vat && p.k === 'vat') { const [bx, by] = at(p.x + 1, p.y + 1); drawFrame(ctx, vat, frameAt(vat, ms + p.y * 113 + p.x * 29), bx, by, z); }
    }
    return true;
  };
  lab.over = (ctx, v) => {
    const L = meta(); if (!L) return; const z = v.zoom, t = (v.ms || 0) / 1000; ctx.save();
    for (const zn of L.zones) if (zn.style === 'green' || zn.style === 'teal') { // low mist drifting through the dark halls
      for (let i = 0; i < 10; i++) { const px = (zn.x0 * T + (((i * 97) + t * 12 * (i % 2 ? 1 : -1)) % ((zn.x1 - zn.x0 + 1) * T) + (zn.x1 - zn.x0 + 1) * T) % ((zn.x1 - zn.x0 + 1) * T) - v.cam.x) * z;
        const py = ((zn.y0 + 2 + (i * 37) % (zn.y1 - zn.y0 - 2)) * T - v.cam.y) * z; ctx.fillStyle = zn.style === 'green' ? 'rgba(150,255,170,0.06)' : 'rgba(150,240,255,0.05)';
        ctx.beginPath(); ctx.ellipse(px, py, 90 * z, 26 * z, 0, 0, Math.PI * 2); ctx.fill(); } }
    ctx.restore();
  };
  return lab;
}

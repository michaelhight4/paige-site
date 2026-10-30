// Ondravel summit v2 (Coder, Oct 30 2026; Gary: "a towering figure that splits the clouds", mood ref gary_reference.webp):
// the summit (fin_lab1_now, map json ondravel.giant) is an open peak edge of dark jagged rock over a sea of clouds under a
// blazing sunset with distant snowy peaks. Ondravel towers in OPEN SPACE beyond the edge: nothing but cloud and sky touches
// him, backlit by the sun, his feet lost in the cloud sea, his head near the top of the screen (PC 1280x800, phone 844x390).
// Everything is painted at 1/PX resolution and scaled up nearest-neighbour so it stays pixel art.
// Giant art: Animator's sheet art/characters/pixel/guardian/ondravel_summit_giant/ondravel_summit_giant.json+png when it
// (Animator v4, DRAFT until Gary approves).
const T = 64, PX = 4;
const ANIM_DIR = 'art/characters/pixel/guardian/ondravel_summit_giant/';
// Animator's v4 sheets (4 x 448x704, 450 ms, anchor bottom-centre; layers: sky -> giant -> cloud overlay -> ledge/player/UI).
// WIRED AS DRAFT (Oct 30 2026): the art still waits for Gary's approval (its README); the placeholder is gone.
export const USE_ANIMATOR_GIANT = true;
export const GIANT_DRAFT = true;
export const GIANT_SRC = [ANIM_DIR + 'ondravel_summit_giant_idle'];
export const GIANT_OVERLAY = ANIM_DIR + 'ondravel_summit_cloud_overlay';
/** Animator json (frame_width, frame_count, ms_per_frame, horizontal strip) or ours (frame_w, frames, ms, cols) -> one shape */
export const normMeta = (m) => ({ ...m, frame_w: m.frame_w ?? m.frame_width, frame_h: m.frame_h ?? m.frame_height, frames: m.frames ?? m.frame_count,
  ms: m.ms ?? m.ms_per_frame, cols: m.cols ?? (m.frames ?? m.frame_count) });
const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const mk = (w, h) => { if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h); if (typeof document === 'undefined') return null; const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

/** where the giant stands on screen: feet sunk in the cloud sea, head near the top. Pure (tests). */
export function giantLayout({ W, H, edgeY, cx, rise = 1, aspect = 1 }) {
  const top = Math.round(H * 0.04), feet = Math.round(Math.max(edgeY, H * 0.3) + H * 0.45);
  const h = Math.max(T, feet - top), w = h * aspect, drop = (1 - rise) * h * 0.75;
  return { x: cx, feet: feet + drop, h, w, head: feet + drop - h };
}

export function makeSummitPeak(scene) {
  const g = { meta: null, img: null, src: null, tried: false, rise: 0.4, part: 0 };
  const load = async () => {
    g.tried = true; if (typeof fetch === 'undefined' || typeof Image === 'undefined') return;
    const get = async (base) => { try { const r = await fetch(base + '.json'); if (!r.ok) return null; const m = normMeta(await r.json()); const im = new Image(); im.src = base + '.png';
      await im.decode?.().catch(() => {}); return im.naturalWidth ? { m, im } : null; } catch { return null; } };
    for (const base of GIANT_SRC) {
      const a = await get(base); if (!a) continue; g.meta = a.m; g.img = a.im; g.src = base;
      if (base === GIANT_SRC[0]) { const o = await get(GIANT_OVERLAY); if (o) { g.over = o.im; g.overMeta = o.m; } }
      return;
    }
  };
  let rock = null, rockKey = '';
  const rockLayer = (m) => { // dark jagged rock on every non-cloud cell (collision != 1 or a '#'/door/cairn cell); cached at 1/PX
    const J = m.json, MW = J.width, MH = J.height; const key = m.name + MW; if (rockKey === key) return rock; rockKey = key;
    const PAD = 8, w = (MW + PAD * 2) * T / PX, h = (MH + PAD) * T / PX, c = mk(w, h); if (!c) return null; const x = c.getContext('2d');
    const cl = new Set(J.peak?.cloud || []), keep = new Set(J.peak?.keep || []), isCloud = (cx, cy) => cy < 0 || ((cx < 0 || cx >= MW) && cy < 8) || (cy < MH - 3 && cx >= 0 && cx < MW && cl.has(cy * MW + cx)); // the cave side (south rows) is all mountain // south of the map = the mountain (cave side)
    const s = T / PX;
    for (let cy = 0; cy < MH + PAD; cy++) for (let cx = -PAD; cx < MW + PAD; cx++) {
      if (isCloud(cx, cy)) continue;
      for (let py = 0; py < s; py++) for (let px = 0; px < s; px++) {
        const i = (cy * s + py) * 997 + cx * s + px, n = rnd(i);
        // jagged rim against the clouds: bite pixels off the edge rows
        const nT = isCloud(cx, cy - 1) && py < 1 + Math.floor(rnd(cx * 31 + px >> 1) * 5), nL = isCloud(cx - 1, cy) && px < Math.floor(rnd(cy * 17 + py >> 1) * 4), nR = isCloud(cx + 1, cy) && s - px <= Math.floor(rnd(cy * 13 + py >> 1) * 4);
        if (nT || nL || nR) continue;
        const lit = (isCloud(cx, cy - 1) && py < 6) || (cx * s + px + cy * s + py) % 23 === 0 && n > 0.5;
        const v = 22 + Math.floor(n * 14) + (rnd(((cy * s + py) >> 2) * 131 + ((cx * s + px) >> 2)) > 0.7 ? 10 : 0);
        x.fillStyle = lit ? `rgb(${150 + n * 60 | 0},${70 + n * 30 | 0},${36})` : `rgb(${v + 8},${v - 2},${v + 2})`; x.fillRect((cx + PAD) * s + px, cy * s + py, 1, 1);
      }
    }
    for (const k of keep) { const cx = k % MW, cy = Math.floor(k / MW); if (cy < MH - 3) continue; // the cave mouth the player walks out of
      const ox = (cx + PAD) * s, oy = cy * s; x.fillStyle = 'rgb(10,6,8)'; x.beginPath(); x.ellipse(ox + s / 2, oy + s * 0.55, s * 0.42, s * 0.5, 0, Math.PI, 0); x.fillRect(ox + s * 0.08, oy + s * 0.55, s * 0.84, s * 0.45); x.fill();
      x.fillStyle = 'rgb(150,70,36)'; x.fillRect(ox + s * 0.1, oy + s * 0.04, s * 0.8, 1); }
    rock = c; return c;
  };
  let sky = null, skyKey = '';
  const skyLayer = (W, H, hz) => { // sunset gradient, sun, streaks, distant snowy peaks (1/PX; redrawn on resize)
    const w = Math.ceil(W / PX), h = Math.ceil(H / PX), key = `${w}x${h}:${hz | 0}`; if (skyKey === key) return sky; skyKey = key;
    const c = mk(w, h); if (!c) return null; const x = c.getContext('2d'), hy = hz / PX;
    const stops = [[0, [52, 18, 46]], [0.35, [150, 38, 40]], [0.7, [236, 104, 40]], [0.92, [255, 186, 80]], [1, [255, 226, 150]]];
    for (let y = 0; y < h; y++) { const t = Math.min(1, y / Math.max(1, hy)); let a = stops[0], b = stops[stops.length - 1];
      for (let k = 0; k < stops.length - 1; k++) if (t >= stops[k][0] && t <= stops[k + 1][0]) { a = stops[k]; b = stops[k + 1]; break; }
      const u = (t - a[0]) / Math.max(1e-6, b[0] - a[0]), d = ((y * 7) % 4) / 40; // ordered dither bands
      x.fillStyle = `rgb(${a[1].map((v, i) => Math.round(v + (b[1][i] - v) * Math.min(1, u + d))).join(',')})`; x.fillRect(0, y, w, 1); }
    const sx = w * 0.5, sy = hy - 2; // the sun behind him, on the horizon: backlight
    for (const [r, col] of [[w * 0.2, 'rgba(255,170,70,0.25)'], [w * 0.1, 'rgba(255,210,120,0.45)'], [Math.max(6, w * 0.035), 'rgba(255,246,210,1)']]) { x.fillStyle = col; x.beginPath(); x.arc(sx, sy, r, 0, Math.PI * 2); x.fill(); }
    for (let i = 0; i < 18; i++) { const y = hy * (0.15 + rnd(i) * 0.7), l = w * (0.15 + rnd(i + 9) * 0.35), x0 = rnd(i + 3) * w - l / 2; // glowing cloud streaks
      x.fillStyle = `rgba(${255},${120 + rnd(i + 5) * 90 | 0},${60},${0.35 + rnd(i + 7) * 0.3})`; x.fillRect(Math.round(x0), Math.round(y), Math.round(l), 1 + (rnd(i + 2) * 2 | 0)); }
    for (const [base, amp, col, snow, seed] of [[hy + 1, h * 0.12, 'rgb(96,60,92)', 'rgb(255,214,190)', 1], [hy + 2, h * 0.07, 'rgb(70,40,70)', 'rgb(240,170,150)', 7]]) {
      x.fillStyle = col; let peaks = []; // distant snowy peaks
      for (let px = 0; px < w; px++) { const n = Math.abs(Math.sin(px * 0.045 + seed)) * 0.6 + Math.abs(Math.sin(px * 0.13 + seed * 3)) * 0.3 + rnd(px + seed) * 0.05;
        const top = Math.round(base - amp * n); peaks.push(top); x.fillRect(px, top, 1, base - top + 2); }
      x.fillStyle = snow; peaks.forEach((top, px) => { if (base - top > amp * 0.45) x.fillRect(px, top, 1, Math.max(1, Math.round((base - top) * 0.25))); });
    }
    sky = c; return c;
  };
  const cloudSea = (x, w, h, hy, t, gap) => { // billowing cloud sea below the horizon (1/PX canvas); gap parts it around the giant
    for (let row = 0; row < 9; row++) { const yy = hy + row * (h - hy) / 7, r = 6 + row * 3.4, n = Math.ceil(w / (r * 1.3)) + 2;
      for (let i = 0; i < n; i++) { let cx = ((i * r * 1.3 + row * 19 + t * (3 + row * 0.8)) % (w + r * 2.6)) - r * 1.3; const cy = yy + Math.sin(i * 1.7 + row + t * 0.5) * 1.6;
        if (gap) { const dx = cx - gap.x; if (Math.abs(dx) < gap.w && cy < gap.y) cx = gap.x + Math.sign(dx || 1) * gap.w; }
        const rr = r * (0.8 + rnd(i * 7 + row) * 0.5); x.fillStyle = 'rgb(118,62,84)'; x.beginPath(); x.ellipse(Math.round(cx), Math.round(cy + 1), rr, rr * 0.6, 0, 0, 7); x.fill();
        x.fillStyle = row < 3 ? 'rgb(255,170,96)' : 'rgb(232,128,92)'; x.beginPath(); x.ellipse(Math.round(cx), Math.round(cy - rr * 0.18), rr * 0.86, rr * 0.45, 0, 0, 7); x.fill();
        x.fillStyle = 'rgb(255,226,160)'; x.fillRect(Math.round(cx - rr * 0.4), Math.round(cy - rr * 0.62), Math.max(1, Math.round(rr * 0.6)), 1); }
    }
  };
  let low = null;
  g.edgeY = (v) => { const o = scene.map?.json?.ondravel; return o ? ((o.y + 1) * T - v.cam.y) * v.zoom : v.H * 0.3; };
  g.layout = (v, W, H) => { const o = scene.map.json.ondravel, m = g.meta, a = m ? (m.art_bbox ? (m.art_bbox[2] - m.art_bbox[0]) / (m.art_bbox[3] - m.art_bbox[1]) : m.frame_w / m.frame_h) : 1;
    return giantLayout({ W, H, edgeY: g.edgeY(v), cx: (o.x * T + T / 2 - v.cam.x) * v.zoom, rise: g.rise, aspect: a }); };
  g.under = (ctx, v) => {
    const m = scene.map; if (!m?.json?.ondravel?.giant) return false; if (!g.tried) load();
    const W = ctx.canvas.width, H = ctx.canvas.height, t = (v.ms || 0) / 1000, edge = g.edgeY(v), hz = Math.max(H * 0.12, edge - H * 0.1);
    const w = Math.ceil(W / PX), h = Math.ceil(H / PX); if (!low || low.width !== w || low.height !== h) low = mk(w, h); if (!low) return false;
    const x = low.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, w, h);
    const s = skyLayer(W, H, hz); if (s) x.drawImage(s, 0, 0);
    cloudSea(x, w, h, hz / PX + 4, t, null);
    const L = g.layout(v, W, H), show = scene.flags.has('fin_woke_home') ? 0 : 1;
    if (show && g.img) { // the giant, backlit: a warm rim (offset silhouette) then a darkened body
      const mm = g.meta, cols = mm.cols || mm.frames, f = Math.floor((v.ms || 0) / (mm.ms?.[0] || 160)) % mm.frames, fw = mm.frame_w, fh = mm.frame_h;
      const ax = mm.anchor?.x ?? fw / 2, ay = mm.anchor?.y ?? fh, bb = mm.art_bbox || [0, 0, fw, fh], k = L.h / (bb[3] - bb[1]) / PX;
      const dx = L.x / PX - ax * k, dy = L.feet / PX - ay * k, sx = (f % cols) * fw, sy = Math.floor(f / cols) * fh;
      const sil = mk(Math.ceil(fw * k) + 4, Math.ceil(fh * k) + 4), sx2 = sil?.getContext('2d');
      if (sx2) { sx2.imageSmoothingEnabled = false; sx2.drawImage(g.img, sx, sy, fw, fh, 2, 2, fw * k, fh * k); sx2.globalCompositeOperation = 'source-atop'; sx2.fillStyle = 'rgb(255,200,110)'; sx2.fillRect(0, 0, sil.width, sil.height);
        x.save(); x.globalAlpha = 0.9 * show; for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1]]) x.drawImage(sil, Math.round(dx - 2 + ox), Math.round(dy - 2 + oy)); x.restore(); }
      x.drawImage(g.img, sx, sy, fw, fh, Math.round(dx), Math.round(dy), fw * k, fh * k);
      if (!mm.PLACEHOLDER) { /* Animator's art carries its own sunset rim: no extra darkening */ } else {
      x.save(); x.globalCompositeOperation = 'source-atop'; x.globalAlpha = 0.42; x.fillStyle = 'rgb(60,24,48)'; x.fillRect(Math.round(dx), Math.round(dy), fw * k, fh * k); x.restore(); } // backlit: shadow side to us
      if (g.over) x.drawImage(g.over, sx, sy, fw, fh, Math.round(dx), Math.round(dy), fw * k, fh * k); // Animator front cloud bank, same frame
    }
    // front cloud bank swallowing his legs, parted around him as he rises (g.part 0..1)
    const gw = (L.w * (0.25 + 0.35 * g.part)) / PX; cloudSea(x, w, h, L.feet / PX - L.h / PX * 0.16, t * 1.3 + 40, { x: L.x / PX, w: gw, y: L.feet / PX - L.h / PX * (0.05 + 0.2 * g.part) });
    const r = rockLayer(m); if (r) { const z = v.zoom || 1; x.drawImage(r, Math.floor((-v.cam.x - 8 * T) * z / PX), Math.floor(-v.cam.y * z / PX), r.width * z, r.height * z); } // world px * zoom = screen px
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(low, 0, 0, w * PX, h * PX); ctx.restore();
    return true;
  };
  return g;
}

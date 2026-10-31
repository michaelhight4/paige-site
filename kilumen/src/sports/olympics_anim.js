// Olympics event animations (dev/olympics, Coder Oct 30 2026; Gary pt2575u "have each event fully animated").
// PURE + STATELESS: drawOlyFrame(g, plan, t) paints the whole frame for time t (seconds) from the plan alone, so any
// frame can be rendered out of order (tests, shots, frame skips) and the RESULT IS NEVER DECIDED HERE: animPlan() turns
// the already-ranked rows from runOlympics (olympics.js) into finish times/qualities, and every motion is driven from
// those (better score = finishes first / lands closer / lifts higher / catches more). Particles (dust, splash, sparkle,
// sparks, snow) are pure functions of time too (seeded hash), JuiceFX-style. Checked MIT libs first (sparkle,
// 2D-Canvas-Image-Particles): both are stateful smooth-shaded systems; a tiny stateless pixel version fits better.
// Logical canvas AW x AH; the UI draws it at 2x (sprites are the 2x overworld walk frames, so 32 logical = 64 native px).
import { OS } from './olympics_strings.js?v=v0.2.101-alpha';

export const AW = 480, AH = 270, INTRO = 1.2, OUTRO = 1.5, SPR = 32;
export const ORD = ['1st', '2nd', '3rd', '4th'];
/** every event: kind (layout), venue (backdrop), motion, track length (world px), action seconds */
export const OLY_ANIM = {
  sprint: { kind: 'race', venue: 'stadium', motion: 'run', len: 900, dur: 4.2 },
  hurdles: { kind: 'race', venue: 'stadium', motion: 'hurdle', len: 900, dur: 4.8 },
  relay: { kind: 'race', venue: 'stadium', motion: 'relay', len: 1200, dur: 5.2 },
  marathon: { kind: 'race', venue: 'road', motion: 'jog', len: 2000, dur: 5.6 },
  hop: { kind: 'race', venue: 'garden', motion: 'hop', len: 820, dur: 4.8 },
  swim: { kind: 'race', venue: 'pool', motion: 'swim', len: 820, dur: 5.0 },
  slide: { kind: 'race', venue: 'ice', motion: 'slide', len: 1100, dur: 4.4 },
  haul: { kind: 'race', venue: 'dock', motion: 'haul', len: 700, dur: 5.2 },
  push: { kind: 'race', venue: 'forge', motion: 'push', len: 700, dur: 5.2 },
  archery: { kind: 'archery', venue: 'range', motion: 'shoot', dur: 5.2 },
  lift: { kind: 'lift', venue: 'stage', motion: 'lift', dur: 4.6 },
  catch: { kind: 'catch', venue: 'night', motion: 'catch', dur: 5.4 },
};
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const hash = (a, b = 0) => { let h = (a * 374761393 + b * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const nm = (c) => c?.nickname || c?.name || c?.species || '';
export const frameSrc = (sp, i) => `art/characters/pixel/creatures/${sp}/overworld/${sp}_ow/${sp}_ow_right_walk${i}_2x.png`;

/** rows (ranked, from runOlympics) -> plan. Lanes in fixed order (you first). opts.mates {who: kilu} for relay leg 1. */
export function animPlan(id, rows, opts = {}) {
  const cfg = OLY_ANIM[id]; if (!cfg) throw new Error('no animation for ' + id);
  const sc = rows.map((r) => r.score), top = Math.max(...sc), lo = Math.min(...sc), span = top - lo || 1;
  const lanes = [...rows].sort((a, b) => (a.who === 'me' ? -1 : b.who === 'me' ? 1 : a.who > b.who ? 1 : -1)).map((r, i) => {
    const q = top === lo ? 1 : (r.score - lo) / span;
    let f = INTRO + cfg.dur * (0.6 + 0.34 * (1 - q));
    if (cfg.kind === 'catch') f = INTRO + cfg.dur * 0.94 + (r.place - 1) * 0.18;
    return { i, who: r.who, me: r.who === 'me', name: r.name, kilu: r.kilu, mate: opts.mates?.[r.who] || r.kilu, place: r.place, score: r.score, q, f, seed: i * 7 + 3 };
  });
  const end = Math.max(...lanes.map((l) => l.f)) + OUTRO;
  return { id, cfg, lanes, end, first: Math.min(...lanes.map((l) => l.f)) };
}
/** 0..1 race progress of a lane at t (eased start, small seeded surges; exactly 1 at its finish time) */
export function progress(l, t) {
  const u = clamp((t - INTRO) / (l.f - INTRO)); if (u >= 1) return 1;
  const e = u < 0.12 ? (u * u) / 0.24 : u - 0.06; const base = e / 0.94;
  return clamp(base + 0.03 * Math.sin(u * Math.PI * 3 + l.seed) * Math.sin(u * Math.PI));
}
export const isDone = (plan, t) => t >= plan.end;

// ---------- tiny pixel helpers ----------
const R = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
function sprite(g, im, x, foot, o = {}) {
  if (!im || !im.complete || !im.naturalWidth) { R(g, '#00000055', x - 10, foot - 3, 20, 4); return; }
  const s = (o.s || SPR); g.save(); g.translate(Math.round(x * 2) / 2, Math.round(foot * 2) / 2); if (o.rot) g.rotate(o.rot);
  g.scale((o.flip ? -1 : 1) * (o.sx || 1), o.sy || 1);
  if (o.clipY != null) { g.beginPath(); g.rect(-s, -s - 4, s * 2, s + 4 - o.clipY); g.clip(); }
  g.drawImage(im, -s / 2, -s, s, s); g.restore();
}
const shadow = (g, x, y, w = 18) => { g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(Math.round(x), Math.round(y), w / 2, 2.5, 0, 0, 6.283); g.fill(); };
function text(g, s, x, y, size, col = '#fff', align = 'center', out = '#1b1f2a') {
  g.font = `bold ${size}px monospace`; g.textAlign = align; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.lineWidth = Math.max(2, size / 4); g.strokeStyle = out; g.strokeText(s, x, y); g.fillStyle = col; g.fillText(s, x, y);
}
function big(g, s, x, y, size, k = 1) {
  g.save(); g.translate(x, y); g.scale(k, k); g.font = `bold ${size}px monospace`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.lineWidth = size / 4; g.strokeStyle = '#1b1f2a'; g.strokeText(s, 0, 0); g.lineWidth = size / 10; g.strokeStyle = '#fff'; g.strokeText(s, 0, 0);
  g.fillStyle = '#ffc928'; g.fillText(s, 0, 0); g.restore();
}
/** stateless particle burst: n particles born at t0 at (x,y), seeded */
function burst(g, t, t0, x, y, o) {
  const age = t - t0; if (age < 0 || age > o.life) return; const k = age / o.life;
  for (let i = 0; i < o.n; i++) {
    const a = (o.a0 ?? 0) + (o.spread ?? 6.283) * hash(o.seed, i), v = o.v * (0.4 + 0.6 * hash(o.seed + 9, i));
    const px = x + Math.cos(a) * v * age, py = y + Math.sin(a) * v * age + (o.grav || 0) * age * age;
    const s = Math.max(1, Math.round((o.s || 2) * (o.shrink ? 1 - k : 1)));
    g.globalAlpha = o.fade === false ? 1 : 1 - k; R(g, o.cols[i % o.cols.length], px - s / 2, py - s / 2, s, s);
  }
  g.globalAlpha = 1;
}
const SPARK = ['#fff7b0', '#ffc928', '#ffffff'], DUST = ['#d9c7a3', '#bfa982', '#e8dcc0'], SPLASH = ['#ffffff', '#bfe9ff', '#7fd0f5'], CONF = ['#ffc928', '#e8584a', '#4aa8e8', '#7ad25a', '#ffffff', '#c58ae8'];

// ---------- backdrops (pixel art, procedural, repeat with camera) ----------
function crowd(g, y0, h, camX, t, rm, cheer) {
  R(g, '#3b3048', 0, y0, AW, h);
  const skin = ['#f2c9a0', '#c98e62', '#8a5a3a', '#f5d6b8'], shirt = ['#e86a5a', '#f3d36a', '#6ac0e8', '#f3ead2', '#8ad46a', '#c58ae8', '#ff9a3c', '#4a6ae8'];
  const off = Math.floor(camX * 0.4); const rows = Math.floor(h / 9);
  for (let r = 0; r < rows; r++) for (let c = -1; c < AW / 8 + 1; c++) {
    const wc = c + Math.floor(off / 8), k = Math.abs(wc * 7 + r * 13) % 97, x = c * 8 - (off % 8) + (r % 2) * 4, y = y0 + 2 + r * 9;
    const up = cheer && !rm && Math.sin(t * 8 + wc * 0.7 + r) > 0.3 ? -1 : 0;
    R(g, shirt[k % 8], x + 1, y + 4 + up, 6, 5); R(g, skin[k % 4], x + 2, y + up, 4, 4);
    if (up) { R(g, skin[k % 4], x, y - 2, 1, 3); R(g, skin[k % 4], x + 7, y - 2, 1, 3); }
  }
  R(g, '#2a2236', 0, y0 + h - 3, AW, 3);
}
function sky(g, top, bot, h) { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, AW, h); }
function hills(g, y, camX, f, col, amp, per) { g.fillStyle = col; g.beginPath(); g.moveTo(0, AH); for (let x = 0; x <= AW; x += 4) { const w = x + camX * f; g.lineTo(x, Math.round(y - amp * (0.5 + 0.5 * Math.sin(w / per) * Math.cos(w / (per * 2.3))))); } g.lineTo(AW, AH); g.fill(); }
const LANE0 = 96, LANEH = 42; // race lanes: 4 x 42 from y 96 to 264
const footY = (i) => LANE0 + LANEH * i + 34;
function venueRace(g, v, camX, t, rm, cheer) {
  const tiles = (col1, col2, wpx) => { for (let i = 0; i < 4; i++) R(g, i % 2 ? col1 : col2, 0, LANE0 + i * LANEH, AW, LANEH); };
  if (v === 'stadium') {
    sky(g, '#5ec0f4', '#a8e2fa', 30); for (let i = -1; i < 9; i++) { const x = i * 64 - (Math.floor(camX * 0.4) % 64); g.fillStyle = i % 2 ? '#ffc928' : '#e8584a'; g.beginPath(); g.moveTo(x, 22); g.lineTo(x + 64, 22); g.lineTo(x + 32, 30); g.fill(); }
    crowd(g, 30, 54, camX, t, rm, cheer); R(g, '#5bb04a', 0, 84, AW, 12); for (let x = -(camX % 24); x < AW; x += 24) R(g, '#4f9c40', x, 84, 12, 12);
    tiles('#c8553d', '#d4613f'); for (let i = 0; i <= 4; i++) R(g, '#f3ead2', 0, LANE0 + i * LANEH - 1, AW, 2);
    for (let x = -(camX % 40); x < AW; x += 40) for (let i = 0; i < 4; i++) R(g, '#b84a35', x, LANE0 + i * LANEH + 20, 6, 1);
  } else if (v === 'road') {
    sky(g, '#7cc8ee', '#d8f0fb', 96); hills(g, 70, camX, 0.1, '#9cc7a8', 26, 70); hills(g, 92, camX, 0.25, '#6fae6a', 18, 40);
    for (let k = Math.floor(camX * 0.5 / 70) - 1; k < (camX * 0.5 + AW) / 70 + 1; k++) { const x = k * 70 - camX * 0.5 + 20 * hash(k, 1); R(g, '#6b4a2b', x + 6, 74, 3, 18); R(g, '#3f8a3a', x, 62, 15, 14); R(g, '#57a64c', x + 2, 60, 9, 8); }
    tiles('#8d8a86', '#9a9792'); for (let x = -(camX % 32); x < AW; x += 32) for (let i = 1; i < 4; i++) R(g, '#f3ead2', x, LANE0 + i * LANEH - 1, 16, 2);
    R(g, '#e9e2c9', 0, LANE0 - 2, AW, 2); R(g, '#e9e2c9', 0, AH - 6, AW, 2);
    for (let k = Math.floor(camX / 160); k < (camX + AW) / 160 + 1; k++) { const x = k * 160 - camX; R(g, '#5a3d24', x, 70, 2, 24); R(g, '#f3ead2', x - 8, 66, 18, 9); text(g, String(k * 2), x + 1, 71, 6, '#2a2236', 'center', '#f3ead2'); }
  } else if (v === 'garden') {
    sky(g, '#8fd3f4', '#dff4fb', 96); hills(g, 78, camX, 0.15, '#5ca055', 14, 30);
    for (let x = -(camX * 0.6 % 30); x < AW; x += 30) { R(g, '#3d7d3a', x, 76, 28, 20); R(g, '#4f9a45', x + 2, 72, 24, 8); const k = Math.floor((x + camX * 0.6) / 30); R(g, ['#f36a8a', '#ffd84a', '#ffffff', '#c58ae8'][Math.abs(k) % 4], x + 8 + 6 * hash(k, 2), 74, 3, 3); }
    tiles('#7cc45e', '#86cf66'); for (let i = 0; i <= 4; i++) R(g, '#5a9c45', 0, LANE0 + i * LANEH - 1, AW, 2);
    for (let x = -(camX % 46); x < AW; x += 46) for (let i = 0; i < 4; i++) { R(g, '#c9a66b', x + 10, LANE0 + i * LANEH + 30, 14, 5); R(g, '#e0c48a', x + 11, LANE0 + i * LANEH + 30, 12, 2); }
  } else if (v === 'pool') {
    sky(g, '#6fc3ee', '#bfe6f8', 40); R(g, '#3b7fb8', 0, 34, AW, 10); for (let x = -(camX * 0.3 % 90); x < AW; x += 90) { R(g, '#f3ead2', x + 20, 26, 26, 10); R(g, '#c8553d', x + 18, 22, 30, 4); R(g, '#6b4a2b', x + 32, 14, 2, 8); }
    crowd(g, 44, 40, camX, t, rm, cheer); R(g, '#e8e2d2', 0, 84, AW, 12); for (let x = -(camX % 12); x < AW; x += 12) R(g, '#cfc7b4', x, 84, 1, 12);
    for (let i = 0; i < 4; i++) { R(g, '#2f8fd0', 0, LANE0 + i * LANEH, AW, LANEH); R(g, '#3aa0dd', 0, LANE0 + i * LANEH + 6, AW, LANEH - 14); }
    for (let i = 0; i < 4; i++) for (let x = -(camX % 16) - 8; x < AW; x += 16) { const w = rm ? 0 : Math.round(Math.sin(t * 3 + x * 0.1 + i) * 1.5); R(g, '#8fd6f6', x + w, LANE0 + i * LANEH + 14 + ((x / 16) % 2 ? 10 : 0), 6, 1); }
    for (let i = 1; i < 4; i++) for (let x = -(camX % 8); x < AW; x += 8) R(g, (Math.floor((x + camX) / 8) % 4 < 2) ? '#e8584a' : '#ffffff', x, LANE0 + i * LANEH - 2, 6, 3);
  } else if (v === 'ice') {
    sky(g, '#9fc9ea', '#e6f3fb', 96); hills(g, 60, camX, 0.08, '#f4f8fc', 34, 50); hills(g, 60, camX, 0.08, '#c9dcec', 10, 50); hills(g, 92, camX, 0.22, '#dbe8f3', 16, 28);
    for (let x = -(camX * 0.4 % 50); x < AW; x += 50) { R(g, '#2f5d4a', x + 20, 72, 6, 20); R(g, '#3f7a5f', x + 16, 62, 14, 12); R(g, '#ffffff', x + 18, 60, 10, 3); }
    tiles('#cfe9f7', '#dff1fa'); for (let i = 0; i <= 4; i++) R(g, '#9cc6e0', 0, LANE0 + i * LANEH - 1, AW, 2);
    for (let x = -(camX % 60); x < AW; x += 60) for (let i = 0; i < 4; i++) R(g, '#ffffff', x + 20 * hash(i, 4), LANE0 + i * LANEH + 12, 24, 1);
    if (!rm) for (let k = 0; k < 40; k++) { const x = (hash(k, 7) * AW - camX * 0.3 + t * 8 * hash(k, 8) * 3) % AW, y = (hash(k, 9) * AH + t * (14 + 10 * hash(k, 3))) % AH; R(g, '#ffffff', (x + AW) % AW, y, 2, 2); }
  } else if (v === 'dock') {
    sky(g, '#f6b278', '#fde2b8', 60); R(g, '#2e6f9e', 0, 60, AW, 36); for (let x = -(camX * 0.2 % 18); x < AW; x += 18) R(g, '#5a9cc8', x + (Math.sin(t * 2 + x) * 2 | 0) * (rm ? 0 : 1), 66 + (x % 3) * 8, 8, 1);
    for (let x = -(camX * 0.35 % 140); x < AW; x += 140) { R(g, '#7a4a2a', x + 10, 78, 50, 10); R(g, '#a0663a', x + 14, 74, 42, 5); R(g, '#e9e2c9', x + 30, 50, 2, 26); R(g, '#f3ead2', x + 32, 52, 16, 18); }
    tiles('#8a5a34', '#956238'); for (let i = 0; i < 4; i++) for (let x = -(camX % 20); x < AW; x += 20) { R(g, '#6b4426', x, LANE0 + i * LANEH, 1, LANEH); R(g, '#a5713f', x + 2, LANE0 + i * LANEH + 4, 14, 1); }
    for (let i = 0; i <= 4; i++) R(g, '#5a3a20', 0, LANE0 + i * LANEH - 1, AW, 2);
    for (let x = -(camX % 120); x < AW; x += 120) { R(g, '#3a2a1a', x, LANE0 - 10, 6, 12); R(g, '#e9e2c9', x - 1, LANE0 - 12, 8, 3); }
  } else { // forge
    sky(g, '#3a2430', '#7a3a2a', 96); for (let x = -(camX * 0.25 % 110); x < AW; x += 110) { R(g, '#2a1c22', x + 10, 26, 18, 70); R(g, '#4a3036', x + 40, 46, 60, 50); R(g, '#ff9a3c', x + 52, 62, 10, 8); R(g, '#ffc928', x + 54, 64, 6, 4); R(g, '#ff9a3c', x + 78, 62, 10, 8); }
    if (!rm) for (let k = 0; k < 16; k++) { const ph = (t * 0.6 + hash(k, 1)) % 1, x = ((hash(k, 2) * 110) - camX * 0.25 % 110 + 330) % AW; g.globalAlpha = 0.5 * (1 - ph); R(g, '#7a6a70', x + 14 + ph * 10, 26 - ph * 30, 6 + ph * 8, 6 + ph * 8); g.globalAlpha = 1; }
    tiles('#5a4c50', '#64555a'); for (let i = 0; i < 4; i++) for (let x = -(camX % 24); x < AW; x += 24) { R(g, '#4a3e42', x, LANE0 + i * LANEH + ((x + camX) % 48 < 24 ? 0 : 21), 24, 1); R(g, '#4a3e42', x, LANE0 + i * LANEH, 1, LANEH); }
    for (let i = 0; i <= 4; i++) R(g, '#ff7a2a', 0, LANE0 + i * LANEH - 1, AW, 2);
  }
}
function finishLine(g, sx, y0, y1) { for (let y = y0; y < y1; y += 4) for (let k = 0; k < 2; k++) R(g, ((y / 4 + k) % 2) ? '#ffffff' : '#1b1f2a', sx + k * 4, y, 4, 4); }
function nameTag(g, l, x, y) { const s = l.name; g.font = 'bold 7px monospace'; const w = Math.ceil(g.measureText(s).width) + 6; R(g, '#1b1f2acc', x - w / 2, y - 5, w, 10); R(g, l.me ? '#e8c26a' : '#5b7bd5', x - w / 2, y + 4, w, 1); text(g, s, x, y, 7, l.me ? '#ffd86a' : '#f3ead2'); }
function placePop(g, l, t, x, y) {
  if (t < l.f) return; const a = t - l.f, k = a < 0.18 ? 0.4 + (a / 0.18) * 0.9 : a < 0.3 ? 1.3 - ((a - 0.18) / 0.12) * 0.3 : 1;
  const col = ['#ffc928', '#d8dde8', '#d08a4a', '#8fa0c0'][l.place - 1] || '#8fa0c0';
  g.save(); g.translate(Math.round(x), Math.round(y - Math.min(a, 0.3) * 20)); g.scale(k, k);
  R(g, '#1b1f2a', -15, -8, 30, 16); R(g, col, -14, -7, 28, 14); R(g, '#ffffff66', -14, -7, 28, 3); text(g, ORD[l.place - 1] || '', 0, 0, 9, '#1b1f2a', 'center', '#ffffff'); g.restore();
}
function hudTop(g, plan, t, frac) { // progress indicator: track with a dot per lane + flag
  const x0 = 120, x1 = 360, y = 8; R(g, '#1b1f2acc', x0 - 6, y - 5, x1 - x0 + 22, 12); R(g, '#3a4466', x0, y, x1 - x0, 2);
  finishLine(g, x1 + 2, y - 3, y + 5);
  plan.lanes.forEach((l, i) => { const p = frac(l); R(g, '#1b1f2a', x0 + p * (x1 - x0) - 3, y - 2 + (i % 2) * 2, 6, 5); R(g, l.me ? '#ffd86a' : ['#5b7bd5', '#7ad25a', '#e86a5a', '#c58ae8'][i], x0 + p * (x1 - x0) - 2, y - 1 + (i % 2) * 2, 4, 3); });
}
function countdown(g, t, rm) {
  if (t < INTRO) { const n = 3 - Math.floor(t / (INTRO / 3)); const ph = (t % (INTRO / 3)) / (INTRO / 3); big(g, String(n), AW / 2, AH / 2, 40, rm ? 1 : 1.4 - ph * 0.4); }
  else if (t < INTRO + 0.6) big(g, OS.anim_go, AW / 2, AH / 2, 40, rm ? 1 : 1 + (t - INTRO) * 0.6);
}
function finishBanner(g, plan, t, rm) { const a = t - plan.first; if (a >= 0 && a < 0.9) { const k = rm ? 1 : a < 0.15 ? a / 0.15 * 1.2 : 1.2 - Math.min(0.2, a); big(g, OS.anim_finish, AW / 2, 58, 26, k); }
  if (!rm) for (let k = 0; k < 2; k++) burst(g, t, plan.first + k * 0.12, AW / 2, 58, { n: 30, life: 1.4, v: 160, grav: 120, cols: CONF, s: 3, seed: 900 + k, fade: false }); }

// ---------- race-type events ----------
function drawRace(g, plan, t, imgs, rm) {
  const c = plan.cfg, L = c.len, X0 = 50, wx = (l, tt = t) => X0 + progress(l, tt) * L;
  const lead = Math.max(...plan.lanes.map((l) => wx(l))), camX = clamp(lead - AW * 0.62, 0, X0 + L + 70 - AW);
  const anyDone = plan.lanes.some((l) => t >= l.f);
  venueRace(g, c.venue, camX, t, rm, anyDone || t < INTRO + 0.6);
  // start + finish lines
  const sxF = X0 + L - camX; if (sxF < AW + 8) finishLine(g, sxF + 8, LANE0, LANE0 + 4 * LANEH); if (X0 - camX > -10) R(g, '#ffffff', X0 - camX + 10, LANE0, 2, 4 * LANEH);
  if (c.motion === 'hurdle') for (let i = 0; i < 4; i++) for (const hx of HURDLES) { const sx = X0 + hx * L - camX + 12; if (sx < -10 || sx > AW + 10) continue; const fy = footY(i);
    const knocked = plan.lanes[i] && plan.lanes[i].q < 0.25 && hx === HURDLES[2] && wx(plan.lanes[i]) > X0 + hx * L + 14; // last place clips one
    if (knocked) { R(g, '#f3ead2', sx - 2, fy - 3, 14, 3); R(g, '#e8584a', sx + 3, fy - 3, 4, 3); } else { R(g, '#5a3a20', sx, fy - 16, 2, 16); R(g, '#5a3a20', sx + 10, fy - 16, 2, 16); R(g, '#f3ead2', sx - 1, fy - 18, 14, 4); R(g, '#e8584a', sx + 4, fy - 18, 4, 4); } }
  if (c.motion === 'relay') for (let i = 0; i < 4; i++) { const sx = X0 + L / 2 - camX + 12; R(g, '#ffc928', sx - 20, LANE0 + i * LANEH + 2, 2, LANEH - 4); R(g, '#ffc928', sx + 20, LANE0 + i * LANEH + 2, 2, LANEH - 4); }
  plan.lanes.forEach((l, i) => drawRacer(g, plan, l, i, t, imgs, rm, camX, wx));
  hudTop(g, plan, t, (l) => progress(l, t));
  plan.lanes.forEach((l, i) => nameTag(g, l, 26, LANE0 + i * LANEH + 8));
}
const HURDLES = [0.16, 0.32, 0.48, 0.64, 0.8];
function drawRacer(g, plan, l, i, t, imgs, rm, camX, wx) {
  const c = plan.cfg, m = c.motion, L = c.len, x = wx(l) - camX + 12, fy = footY(i), p = progress(l, t), dist = p * L;
  const running = t > INTRO && t < l.f + 0.05, settle = t - l.f; const fr = imgs(l.kilu.species);
  const stride = m === 'jog' ? 16 : m === 'haul' || m === 'push' ? 22 : 12, cyc = running ? Math.floor(dist / stride) % 4 : 0;
  const bob = rm ? 0 : running ? (cyc % 2 ? -1 : 0) : settle > 0 && settle < 0.6 ? -Math.abs(Math.sin(settle * 14)) * 3 : 0; // celebratory bounce
  const dustAt = (k0, cols, n = 3) => { if (rm) return; const step = 0.09; for (let k = Math.floor((t - 0.45) / step); k <= t / step; k++) { const tk = k * step; if (tk < INTRO || tk > l.f) continue; const xk = wx(l, tk) - camX + 6; burst(g, t, tk, xk, fy - 1, { n, life: 0.45, v: 26, a0: Math.PI * 1.05, spread: Math.PI * 0.45, grav: 20, cols, s: 3, seed: l.seed * 100 + k + k0, shrink: true }); } };
  if (m === 'swim') {
    const wl = fy - 12, sb = rm ? 0 : Math.sin(t * 9 + i) * 1.5; R(g, '#2a78b5', x - 14, wl + 2, 28, 3);
    sprite(g, fr[running ? Math.floor(t * 6) % 4 : 0], x, fy + 2 + sb, { clipY: 14 }); R(g, '#bfe9ff', x - 14, wl, 28, 2);
    if (!rm && running) { for (let k = Math.floor((t - 0.4) / 0.12); k <= t / 0.12; k++) { const tk = k * 0.12; if (tk < INTRO || tk > l.f) continue; burst(g, t, tk, wx(l, tk) - camX + 14, wl, { n: 4, life: 0.4, v: 40, a0: -Math.PI * 0.95, spread: Math.PI * 0.6, grav: 160, cols: SPLASH, s: 2, seed: l.seed * 50 + k }); }
      for (let k = 1; k < 5; k++) R(g, '#d6f2ff', x - 10 - k * 10, wl + 1 + (k % 2), 7 - k, 1); }
    if (t > INTRO && t < INTRO + 0.4 && !rm) burst(g, t, INTRO, x, wl, { n: 14, life: 0.5, v: 60, a0: -Math.PI, spread: Math.PI, grav: 200, cols: SPLASH, s: 3, seed: l.seed });
  } else if (m === 'hop') {
    const N = 11, ph = (p * N) % 1, air = running ? Math.sin(ph * Math.PI) : 0, y = fy - air * 20;
    shadow(g, x, fy, 18 - air * 8); sprite(g, fr[air > 0.2 ? 1 : 0], x, y + bob, { sx: air < 0.15 && running ? 1.12 : 1, sy: air < 0.15 && running ? 0.88 : 1 });
    if (!rm) for (let k = 0; k < N; k++) { const pk = (k + 1) / N; if (p < pk) break; const tk = timeAt(l, pk); burst(g, t, tk, wx(l, tk) - camX + 12, fy, { n: 6, life: 0.4, v: 30, a0: Math.PI, spread: Math.PI, grav: 40, cols: ['#7ad25a', '#d9c7a3', '#f36a8a'], s: 2, seed: l.seed * 30 + k }); }
  } else if (m === 'hurdle') {
    let y = fy; for (const hx of HURDLES) { const d = dist - (hx * L - 14); if (d > -6 && d < 34) { y = fy - Math.sin(Math.PI * clamp((d + 6) / 40)) * 22; } }
    shadow(g, x, fy, 18 - (fy - y) / 3); sprite(g, fr[y < fy - 2 ? 1 : cyc], x, y + bob, { rot: y < fy - 2 && !rm ? -0.12 : 0 }); dustAt(0, DUST, 2);
  } else if (m === 'slide') {
    shadow(g, x, fy); sprite(g, fr[0], x, fy + bob, { rot: running && !rm ? -0.18 : 0, sx: 1.06, sy: 0.94 });
    if (running) R(g, '#ffffff', x - 22, fy - 1, 14, 1); dustAt(5, ['#ffffff', '#dff1fa', '#a8d8f0'], 3);
    if (!rm && running) for (let k = 0; k < 3; k++) { const ph = (t * 3 + k / 3 + i) % 1; g.globalAlpha = 1 - ph; R(g, '#ffffff', x - 8 - ph * 20, fy - 16 - ph * 6 + k * 4, 2, 2); g.globalAlpha = 1; }
  } else if (m === 'haul' || m === 'push') {
    const lean = running && !rm ? (m === 'push' ? 0.1 : -0.08) : 0, crate = m === 'push' ? x + 22 : x - 30;
    if (m === 'haul') { g.strokeStyle = '#d9c7a3'; g.lineWidth = 1; g.beginPath(); g.moveTo(x - 6, fy - 12); g.lineTo(crate + 10, fy - 10); g.stroke(); }
    const wob = running && !rm ? Math.round(Math.sin(dist / 6) * 1) : 0;
    if (m === 'haul') { R(g, '#5a3a20', crate - 10, fy - 18 + wob, 22, 18); R(g, '#a0663a', crate - 9, fy - 17 + wob, 20, 16); R(g, '#5a3a20', crate - 9, fy - 10 + wob, 20, 2); R(g, '#5a3a20', crate, fy - 17 + wob, 2, 16); }
    else { R(g, '#2a2236', crate - 12, fy - 20, 26, 16); R(g, '#6b6a72', crate - 11, fy - 19, 24, 12); R(g, '#9a99a2', crate - 11, fy - 19, 24, 3); R(g, '#3a2a1a', crate - 9, fy - 5, 6, 5); R(g, '#3a2a1a', crate + 5, fy - 5, 6, 5);
      R(g, (Math.floor(dist / 6) % 2) ? '#ffc928' : '#c8a020', crate - 7, fy - 4, 2, 2); R(g, (Math.floor(dist / 6) % 2) ? '#ffc928' : '#c8a020', crate + 7, fy - 4, 2, 2); }
    shadow(g, x, fy); sprite(g, fr[cyc], x, fy + bob, { rot: lean }); dustAt(2, m === 'push' ? ['#ff9a3c', '#ffc928', '#7a6a70'] : DUST, 3);
  } else if (m === 'relay') {
    const hand = 0.5, mateX = X0w(plan) + Math.min(p, hand) * L - camX + 12, legB = p >= hand, frm = imgs(l.mate.species);
    const waitX = X0w(plan) + hand * L - camX + 12;
    if (!legB) { shadow(g, waitX + 8, fy); sprite(g, fr[0], waitX + 8, fy - 2 + (rm ? 0 : Math.sin(t * 6 + i) * 1), { sx: 0.82, sy: 0.82, flip: false }); }
    const mx = legB ? waitX - 6 - Math.min(14, (p - hand) * L * 0.2) : mateX, mcyc = legB ? 0 : cyc;
    shadow(g, mx, fy + 4, 14); sprite(g, frm[mcyc], mx, fy + 4 + (legB ? 0 : bob), { sx: 0.82, sy: 0.82 });
    if (!legB) R(g, '#ffc928', mx + 8, fy - 14, 6, 2); // baton
    if (legB) { shadow(g, x, fy); sprite(g, fr[cyc], x, fy + bob); R(g, '#ffc928', x + 8, fy - 16, 6, 2); dustAt(3, DUST, 2);
      const th = timeAt(l, hand); if (!rm) burst(g, t, th, waitX + 6, fy - 16, { n: 10, life: 0.5, v: 50, cols: SPARK, s: 2, seed: l.seed + 77 }); }
  } else { // run / jog
    shadow(g, x, fy); sprite(g, fr[cyc], x, fy + bob, { rot: running && m === 'run' && !rm ? 0.06 : 0 }); dustAt(1, DUST, m === 'jog' ? 1 : 3);
    if (m === 'jog' && running && !rm && p > 0.5 && Math.floor(t * 3 + i) % 3 === 0) R(g, '#9fdcff', x + 6, fy - 30 + ((t * 20) % 6), 2, 3); // sweat drop
  }
  if (t >= l.f) { placePop(g, l, t, x, fy - 42); if (l.place === 1 && !rm) burst(g, t, l.f, x, fy - 20, { n: 18, life: 0.8, v: 70, grav: 40, cols: SPARK, s: 2, seed: 400 + i }); }
}
const X0w = () => 50;
/** time at which a lane reaches progress pk (bisection on the monotone-enough curve) */
function timeAt(l, pk) { let a = INTRO, b = l.f; for (let k = 0; k < 18; k++) { const mid = (a + b) / 2; if (progress(l, mid) < pk) a = mid; else b = mid; } return b; }

// ---------- archery (Target Toss) ----------
export const ARROWS = 3;
function arrowsOf(l) { // per arrow: shot time, land time, hit offset (closer for better score), points
  const span = l.f - INTRO, out = [];
  for (let k = 0; k < ARROWS; k++) { const land = INTRO + span * (k + 1) / ARROWS, shot = land - 0.45, r = (1 - l.q) * 11 + hash(l.seed, k) * 3, a = hash(l.seed + 5, k) * 6.283;
    out.push({ shot, land, dx: Math.cos(a) * r * 0.5, dy: Math.sin(a) * r, pts: Math.max(1, 10 - Math.floor(r / 1.5)) }); }
  return out;
}
function drawArchery(g, plan, t, imgs, rm) {
  sky(g, '#7cc8ee', '#d8f0fb', 96); hills(g, 74, 0, 0, '#7fb878', 18, 46); hills(g, 94, 0, 0, '#5ca055', 12, 26);
  for (let k = 0; k < 8; k++) { const x = 20 + k * 62; R(g, '#5a3d24', x + 6, 64, 3, 30); R(g, '#3f8a3a', x, 52, 15, 16); R(g, '#57a64c', x + 2, 50, 10, 8); }
  for (let i = 0; i < 4; i++) { R(g, i % 2 ? '#7cc45e' : '#86cf66', 0, LANE0 + i * LANEH, AW, LANEH); R(g, '#d9c7a3', 0, LANE0 + i * LANEH, 70, LANEH); R(g, '#f3ead2', 70, LANE0 + i * LANEH, 2, LANEH); }
  const TX = 420;
  plan.lanes.forEach((l, i) => {
    const fy = footY(i), ty = fy - 16, ar = arrowsOf(l);
    R(g, '#5a3a20', TX - 1, ty, 3, fy - ty + 2); // target stand
    const rings = ['#ffffff', '#1b1f2a', '#4aa8e8', '#e8584a', '#ffc928'];
    rings.forEach((c, k) => { g.fillStyle = '#1b1f2a'; g.beginPath(); g.ellipse(TX, ty, 6 - k + 1, 15 - k * 3 + 1, 0, 0, 6.283); g.fill(); g.fillStyle = c; g.beginPath(); g.ellipse(TX, ty, 6 - k, 15 - k * 3, 0, 0, 6.283); g.fill(); });
    const sx = 52, fr = imgs(l.kilu.species);
    let total = 0, pull = 0;
    ar.forEach((a, k) => { if (t >= a.shot - 0.35 && t < a.shot) pull = (t - (a.shot - 0.35)) / 0.35;
      if (t >= a.shot && t < a.land) { const u = (t - a.shot) / (a.land - a.shot), ex = TX - 4 + a.dx, ey = ty + a.dy; const ax = sx + 14 + (ex - sx - 14) * u, ay = fy - 18 + (ey - fy + 18) * u - Math.sin(u * Math.PI) * 26;
        const ang = Math.atan2((ey - fy + 18) - Math.cos(u * Math.PI) * 26 * Math.PI, ex - sx - 14); g.save(); g.translate(ax, ay); g.rotate(ang * 0.25); R(g, '#6b4a2b', -10, 0, 10, 1); R(g, '#d0d4dc', 0, -1, 3, 3); R(g, '#e8584a', -11, -1, 3, 3); g.restore();
        if (!rm) for (let s = 1; s < 4; s++) { g.globalAlpha = 0.4 / s; R(g, '#ffffff', ax - s * 7, ay + s * 1.5 * (u < 0.5 ? 1 : -1), 4, 1); g.globalAlpha = 1; } }
      if (t >= a.land) { total += a.pts; R(g, '#6b4a2b', TX - 12 + a.dx, ty + a.dy, 10, 1); R(g, '#e8584a', TX - 14 + a.dx, ty + a.dy - 1, 3, 3); R(g, '#1b1f2a', TX - 1 + a.dx, ty + a.dy - 1, 2, 2);
        if (!rm) burst(g, t, a.land, TX + a.dx, ty + a.dy, { n: 10, life: 0.4, v: 50, cols: a.pts >= 9 ? SPARK : ['#ffffff', '#d9c7a3'], s: 2, seed: l.seed * 9 + k });
        if (t - a.land < 0.7) text(g, '+' + a.pts, TX + 18, ty - 6 - (t - a.land) * 20, 9, a.pts >= 9 ? '#ffd86a' : '#ffffff'); } });
    shadow(g, sx, fy); sprite(g, fr[0], sx, fy, { sx: 1 - pull * 0.08, sy: 1 + pull * 0.06 });
    // bow
    g.strokeStyle = '#8a5a34'; g.lineWidth = 2; g.beginPath(); g.arc(sx + 14, fy - 18, 9, -1.1, 1.1); g.stroke(); g.strokeStyle = '#f3ead2'; g.lineWidth = 1; g.beginPath(); g.moveTo(sx + 14 + Math.cos(-1.1) * 9, fy - 18 + Math.sin(-1.1) * 9); g.lineTo(sx + 14 - pull * 5 + 4, fy - 18); g.lineTo(sx + 14 + Math.cos(1.1) * 9, fy - 18 + Math.sin(1.1) * 9); g.stroke();
    R(g, '#1b1f2acc', 300, fy - 32, 34, 12); text(g, String(total), 317, fy - 26, 8, l.me ? '#ffd86a' : '#ffffff');
    nameTag(g, l, 26, LANE0 + i * LANEH + 8);
    if (t >= l.f) placePop(g, l, t, 340, fy - 26);
  });
  hudTop(g, plan, t, (l) => arrowsOf(l).filter((a) => t >= a.land).length / ARROWS);
}

// ---------- weight lift ----------
const LIFT_X = [78, 190, 302, 414];
export const liftHeight = (l, t) => { const u = clamp((t - INTRO) / (l.f - INTRO)); return u < 0.35 ? 0 : u < 0.5 ? (u - 0.35) / 0.15 * 0.45 : 0.45 + 0.55 * clamp((u - 0.5) / 0.5) ** 0.7; };
function drawLift(g, plan, t, imgs, rm) {
  R(g, '#2a1c2e', 0, 0, AW, AH); for (let x = 0; x < AW; x += 16) { R(g, '#7a2a3a', x, 0, 14, 150); R(g, '#9a3a4a', x + 2, 0, 4, 150); } R(g, '#5a1a2a', 0, 0, AW, 14); for (let x = 0; x < AW; x += 20) R(g, '#ffc928', x + 6, 10, 8, 4);
  crowd(g, 150, 30, 0, t, rm, plan.lanes.some((l) => t >= l.f)); R(g, '#6b4a2b', 0, 180, AW, 90); for (let x = 0; x < AW; x += 32) R(g, '#5a3d24', x, 180, 1, 90); R(g, '#8a5a34', 0, 180, AW, 3);
  plan.lanes.forEach((l, i) => {
    const cx = LIFT_X[i], fy = 236, fr = imgs(l.kilu.species), h = liftHeight(l, t), plates = 1 + Math.round(l.q * 3);
    // spotlight
    g.globalAlpha = 0.16; g.fillStyle = '#fff7b0'; g.beginPath(); g.moveTo(cx - 6, 0); g.lineTo(cx + 6, 0); g.lineTo(cx + 44, fy + 6); g.lineTo(cx - 44, fy + 6); g.fill(); g.globalAlpha = 1;
    R(g, '#3a2a1a', cx - 42, fy, 84, 8); R(g, '#c8a060', cx - 42, fy, 84, 2); // platform
    const strain = h > 0 && h < 1 && !rm ? Math.round(Math.sin(t * 40 + i) * 1) : 0, squat = clamp((t - INTRO) / ((l.f - INTRO) * 0.35));
    const sy = h === 0 ? 1 - squat * 0.12 : 1 + h * 0.06, by = fy - 14 - h * 30 - (h > 0 ? 6 : 0) + strain;
    shadow(g, cx, fy, 22); sprite(g, fr[0], cx + strain * 0.5, fy, { sx: 2 - sy, sy, s: 36 });
    // barbell
    R(g, '#c8ccd6', cx - 30, by, 60, 3); for (let k = 0; k < plates; k++) { R(g, '#1b1f2a', cx - 30 - k * 4, by - 7, 4, 17); R(g, ['#e8584a', '#4aa8e8', '#ffc928', '#7ad25a'][k], cx - 29 - k * 4, by - 6, 2, 15); R(g, '#1b1f2a', cx + 26 + k * 4, by - 7, 4, 17); R(g, ['#e8584a', '#4aa8e8', '#ffc928', '#7ad25a'][k], cx + 27 + k * 4, by - 6, 2, 15); }
    // gauge
    R(g, '#1b1f2a', cx + 40, 196, 5, 36); R(g, '#3a4466', cx + 41, 197, 3, 34); R(g, l.me ? '#ffd86a' : '#7ad25a', cx + 41, 231 - 34 * h * (0.55 + 0.45 * l.q), 3, 34 * h * (0.55 + 0.45 * l.q));
    if (!rm && h > 0) burst(g, t, timeAt2(l, 0.35), cx, fy, { n: 12, life: 0.5, v: 40, a0: Math.PI, spread: Math.PI, grav: 30, cols: DUST, s: 3, seed: l.seed * 3, shrink: true });
    if (t >= l.f && !rm) burst(g, t, l.f, cx, by, { n: 16, life: 0.7, v: 60, cols: SPARK, s: 2, seed: l.seed * 11 });
    nameTag(g, l, cx, 258); if (t >= l.f) placePop(g, l, t, cx, by - 22);
  });
  hudTop(g, plan, t, (l) => liftHeight(l, t));
}
const timeAt2 = (l, u) => INTRO + (l.f - INTRO) * u;

// ---------- lantern catch ----------
export const DROPS = 10;
export const caughtOf = (l) => 3 + Math.round(l.q * 6);
const COLX = [72, 184, 296, 408];
function dropsOf(plan, l) {
  const n = caughtOf(l), tot = plan.cfg.dur * 0.9, out = [];
  const miss = new Set(); for (let k = 0; miss.size < DROPS - n; k++) miss.add(Math.floor(hash(l.seed + 31, k) * DROPS)); // which ones it misses (seeded)
  for (let j = 0; j < DROPS; j++) { const born = INTRO - 0.4 + (tot * j) / DROPS + hash(l.seed, j) * 0.15, dx = (hash(l.seed + 1, j) - 0.5) * 70; out.push({ born, land: born + 1.0, dx, got: !miss.has(j) }); }
  return out;
}
function drawCatch(g, plan, t, imgs, rm) {
  sky(g, '#0d1330', '#2a2a5a', 200); for (let k = 0; k < 50; k++) R(g, hash(k, 3) > 0.8 && !rm && Math.sin(t * 4 + k) > 0.5 ? '#ffffff' : '#b8c0e8', hash(k, 1) * AW, hash(k, 2) * 120, 1, 1);
  R(g, '#f3ead2', 400, 20, 14, 14); R(g, '#0d1330', 405, 18, 12, 12);
  for (let x = 0; x < AW; x += 60) { R(g, '#1b1f2a', x + 10, 110, 40, 70); R(g, '#2a2236', x + 12, 112, 36, 68); R(g, '#ffc928', x + 18, 124, 6, 6); R(g, '#ff9a3c', x + 34, 140, 6, 6); }
  for (let x = 0; x < AW; x += 40) { R(g, '#3a2a1a', x + 18, 20 + (x % 80 ? 4 : 0), 1, 8); } g.strokeStyle = '#3a2a1a'; g.beginPath(); g.moveTo(0, 22); g.quadraticCurveTo(AW / 2, 40, AW, 22); g.stroke();
  R(g, '#2e4a6e', 0, 180, AW, 30); for (let x = 0; x < AW; x += 14) R(g, '#4a6a9e', x + (rm ? 0 : Math.sin(t * 2 + x) * 2), 186 + (x % 3) * 6, 6, 1);
  R(g, '#6b4a2b', 0, 210, AW, 60); for (let x = 0; x < AW; x += 20) R(g, '#5a3d24', x, 210, 1, 60); R(g, '#8a5a34', 0, 210, AW, 2);
  plan.lanes.forEach((l, i) => {
    const cx = COLX[i], fy = 248, ds = dropsOf(plan, l), fr = imgs(l.kilu.species); let got = 0, target = cx, tPrev = -9, xPrev = cx;
    for (const d of ds) { if (t >= d.land) { if (d.got) got++; tPrev = d.land; xPrev = cx + (d.got ? d.dx : d.dx * 0.3); } else if (t >= d.born - 0.3) { target = cx + (d.got ? d.dx : d.dx * 0.3); break; } }
    const nextLand = ds.find((d) => t < d.land)?.land ?? t, u = clamp((t - tPrev) / Math.max(0.2, nextLand - tPrev - 0.15)), kx = t > INTRO - 0.4 ? xPrev + (target - xPrev) * (u * u * (3 - 2 * u)) : cx;
    const moving = Math.abs(target - xPrev) > 2 && u < 1;
    for (const d of ds) {
      const lx = cx + d.dx;
      if (t >= d.born && t < d.land) { const u2 = (t - d.born) / (d.land - d.born), y = 30 + u2 * (fy - 22 - 30) * (d.got ? 1 : 1.08), sw = rm ? 0 : Math.sin(t * 5 + d.dx) * 2;
        R(g, '#3a2a1a', lx + sw - 1, y - 9, 1, 3); R(g, '#1b1f2a', lx + sw - 4, y - 6, 9, 10); R(g, '#ff9a3c', lx + sw - 3, y - 5, 7, 8); R(g, '#ffd86a', lx + sw - 1, y - 3, 3, 4);
        if (!rm) { g.globalAlpha = 0.25; R(g, '#ffd86a', lx + sw - 7, y - 9, 15, 16); g.globalAlpha = 1; } }
      if (t >= d.land && t < d.land + 0.6 && !rm) burst(g, t, d.land, d.got ? kx : lx, d.got ? fy - 30 : fy - 2, d.got ? { n: 12, life: 0.5, v: 55, cols: SPARK, s: 2, seed: l.seed * 20 + ds.indexOf(d) } : { n: 8, life: 0.5, v: 30, a0: Math.PI, spread: Math.PI, grav: 30, cols: ['#7a6a70', '#9a8a90'], s: 3, seed: l.seed * 21 + ds.indexOf(d), shrink: true });
      if (!d.got && t >= d.land) { R(g, '#1b1f2a', lx - 4, fy - 4, 9, 4); R(g, '#7a4a2a', lx - 3, fy - 3, 7, 2); }
    }
    const jump = ds.some((d) => d.got && t > d.land - 0.18 && t < d.land + 0.1) && !rm ? 6 : 0;
    shadow(g, kx, fy, 20 - jump); sprite(g, fr[moving ? Math.floor(t * 10) % 4 : 0], kx, fy - jump, { flip: target < xPrev - 2 });
    R(g, '#1b1f2acc', cx - 14, 216, 28, 11); R(g, '#ff9a3c', cx - 12, 218, 5, 7); text(g, String(got), cx + 4, 222, 8, l.me ? '#ffd86a' : '#ffffff');
    nameTag(g, l, cx, 262); if (t >= l.f) placePop(g, l, t, kx, fy - 44);
  });
  hudTop(g, plan, t, (l) => clamp((t - INTRO) / (plan.cfg.dur * 0.94)));
}

const KIND = { race: drawRace, archery: drawArchery, lift: drawLift, catch: drawCatch };
/** paint the frame for time t. imgs(species) -> [4 Image-like]. opts.rm = reduced motion */
export function drawOlyFrame(g, plan, t, imgs, opts = {}) {
  const rm = !!opts.rm; g.imageSmoothingEnabled = false; g.textBaseline = 'middle';
  KIND[plan.cfg.kind](g, plan, t, imgs, rm);
  finishBanner(g, plan, t, rm);
  countdown(g, t, rm);
}

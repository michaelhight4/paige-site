// Olympics winner-circle podium (dev/olympics, Coder Oct 30 2026; Gary pt2580u "need a better winner circle ui for the
// end of the rounds"). Shown after EVERY event (kind 'event') and, grand version, after the last one (kind 'final').
// PURE + STATELESS like olympics_anim.js: podiumPlan() turns the already-computed rows/tables from runOlympics and
// settleOlympics into a plan; drawPodiumPixels(g, plan, t, imgs) paints the pixel-art layer (logical PW x PH, drawn by
// the UI into a 2x offscreen canvas then nearest-neighbour scaled) and drawPodiumText(g, plan, t) paints the vector text
// on top at device resolution, so the art stays crisp and the text stays sharp at any size. NOTHING IS DECIDED HERE.
// Licences checked first: canvas-confetti (ISC), party-js (MIT), fireworks-js (MIT) are stateful, smooth-shaded,
// DOM/canvas-owning systems; a tiny seeded stateless pixel confetti/firework fits the pixel style and the
// any-frame-out-of-order rule better, so nothing was vendored.
import { OS, ot } from './olympics_strings.js?v=v0.2.104-alpha';
import { OLY_ANIM, venueBackdrop } from './olympics_anim.js?v=v0.2.104-alpha';

export const PW = 480, PH = 270, FLOOR = 228;
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const ease = (u) => { u = clamp(u); return u * u * (3 - 2 * u); };
const hash = (a, b = 0) => { let h = (a * 374761393 + b * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export const kiluName = (c) => { const s = c?.nickname || c?.name || c?.species || ''; return c?.nickname || c?.name ? s : s.charAt(0).toUpperCase() + s.slice(1); };
export const ORD = ['1st', '2nd', '3rd', '4th'];
/** podium slots by finishing order: 0 = 1st (centre, tallest), 1 = 2nd (left), 2 = 3rd (right), 3 = 4th (off to the side, floor) */
export const TIERS = [{ x: 150, w: 66, h: 58 }, { x: 80, w: 62, h: 40 }, { x: 220, w: 62, h: 26 }, { x: 274, w: 34, h: 0 }];
export const MEDAL = ['#ffc928', '#d8dde8', '#d08a4a'];
const MEDAL_D = ['#b8860b', '#8a93a6', '#8a5226'];
export const T = { rise: 0.15, hop0: 0.85, hopGap: 0.42, hopDur: 0.5, medal: 2.75, medalGap: 0.28, medalDur: 0.45, spot: 3.55, fly: 3.95, flyGap: 0.16, flyDur: 0.6, count: 0.55, sort: 5.45, sortDur: 0.6 };
const HOP_ORDER = [3, 2, 1, 0]; // 4th, 3rd, 2nd, then the winner

/** kind 'event': {id, rows (ranked event rows), prev (table before, [] for event 1), table (after), n, of}
 *  kind 'final': {venue, table (final), events (run.events), result (settleOlympics), venueName} */
export function podiumPlan(o) {
  const final = o.kind === 'final';
  const bd = final ? 'stadium' : (OLY_ANIM[o.id]?.venue || 'stadium');
  let entries;
  if (!final) entries = o.rows.slice(0, 4).map((r, i) => ({ slot: i, who: r.who, name: r.name, me: r.who === 'me', kilu: r.kilu, place: r.place, pts: r.pts }));
  else entries = o.table.slice(0, 4).map((x, i) => { // each trainer's star Kilu = its best score across the three events
    let best = null; for (const ev of o.events || []) { const r = ev.rows.find((y) => y.who === x.who); if (r && (!best || r.score > best.score)) best = r; }
    return { slot: i, who: x.who, name: x.name, me: x.who === 'me', kilu: best?.kilu || { species: 'capling' }, place: i + 1, pts: x.pts, wins: x.firsts || 0 }; });
  const prev = final ? [] : (o.prev || []), table = o.table;
  const order0 = prev.length ? prev.map((x) => x.who) : (final ? table.map((x) => x.who) : o.rows.map((r) => r.who).sort((a, b) => (a === 'me' ? -1 : b === 'me' ? 1 : a < b ? -1 : 1)));
  const add = new Map(final ? [] : o.rows.map((r) => [r.who, r.pts]));
  const stand = table.map((x, rank) => { const p = prev.find((y) => y.who === x.who); const a = add.get(x.who) ?? 0;
    return { who: x.who, name: x.name, me: x.who === 'me', rank, prevRank: Math.max(0, order0.indexOf(x.who)), before: final ? 0 : (p ? p.pts : x.pts - a), add: final ? x.pts : a, after: x.pts, wins: x.firsts || 0 }; });
  const flyOrder = HOP_ORDER.slice().reverse(); // winner's points fly first
  const fly = new Map(entries.map((e) => [e.who, T.fly + flyOrder.indexOf(e.slot) * T.flyGap]));
  const meE = entries.find((e) => e.me);
  const end = final ? T.sort + 1.6 : T.sort + T.sortDur + 0.4;
  return { kind: final ? 'final' : 'event', id: o.id, backdrop: bd, entries, stand, fly, n: o.n || 3, of: o.of || 3, result: o.result || null,
    venueName: o.venueName || '', meSlot: meE ? meE.slot : -1, mePlaced: !!meE && meE.place <= 3, end, arrows: !final && (o.n || 1) > 1 };
}
export const hopStart = (slot) => T.hop0 + HOP_ORDER.indexOf(slot) * T.hopGap;
export const medalStart = (slot) => T.medal + (2 - slot) * T.medalGap; // bronze, silver, then gold
export const tierTop = (slot, t) => FLOOR - TIERS[slot].h * ease((t - T.rise - slot * 0.06) / 0.5);
const spr = (plan, e) => (plan.kind === 'final' && e.slot === 0 ? 64 : 32);
/** where a Kilu is at t: hops from below the stage up onto its tier (pure; tests use it) */
export function kiluPos(plan, e, t) {
  const s0 = hopStart(e.slot), u = clamp((t - s0) / T.hopDur), top = tierTop(e.slot, 99), x1 = TIERS[e.slot].x, x0 = x1 + (e.slot === 2 || e.slot === 3 ? 34 : -34);
  if (t < s0) return { x: x0, y: PH + 40, shown: false, u: 0 };
  const y = PH + 30 + (top - PH - 30) * u - 70 * 4 * u * (1 - u), land = t - s0 - T.hopDur;
  return { x: Math.round(x0 + (x1 - x0) * u), y: Math.round(u < 1 ? y : top), shown: true, u, squash: land > 0 && land < 0.16 ? 1 - land / 0.16 : 0 };
}
/** count-up value of a standings row at t */
export function shownPts(plan, s, t) {
  const t0 = plan.kind === 'final' ? T.fly : (plan.fly.get(s.who) ?? T.fly) + T.flyDur; return s.before + Math.round(s.add * ease((t - t0) / T.count));
}
/** row y-slot of a standings row at t (re-sorts from the old order to the new one) */
export const rowSlot = (plan, s, t) => (plan.kind === 'final' ? s.rank : s.prevRank + (s.rank - s.prevRank) * ease((t - T.sort) / T.sortDur));
export const isTap = (down, up) => !!down && !!up && up.t - down.t < 350 && Math.hypot(up.x - down.x, up.y - down.y) < 12; // a hold or drag is not a tap

// ---------- pixel helpers (logical coords, integer rects) ----------
const R = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
function sprite(g, im, x, foot, s, o = {}) {
  if (!im || !im.complete || !im.naturalWidth) { R(g, '#00000055', x - 10, foot - 3, 20, 4); return; }
  const sx = o.sq ? 1 + o.sq * 0.14 : 1, sy = o.sq ? 1 - o.sq * 0.14 : 1, w = Math.round(s * sx), h = Math.round(s * sy);
  g.save(); g.translate(Math.round(x), Math.round(foot)); if (o.flip) g.scale(-1, 1); g.drawImage(im, -Math.round(w / 2), -h, w, h); g.restore();
}
function medal(g, x, y, place) {
  const c = MEDAL[place - 1], d = MEDAL_D[place - 1]; if (!c) return;
  R(g, '#2b4a9a', x - 3, y - 5, 2, 4); R(g, '#e8584a', x + 2, y - 5, 2, 4); R(g, '#2b4a9a', x - 2, y - 2, 2, 2); R(g, '#e8584a', x + 1, y - 2, 2, 2);
  R(g, '#1b1f2a', x - 4, y - 1, 9, 9); R(g, '#1b1f2a', x - 3, y - 2, 7, 11); R(g, d, x - 3, y, 7, 7); R(g, d, x - 2, y - 1, 5, 9); R(g, c, x - 2, y, 5, 6); R(g, c, x - 3, y + 1, 6, 4); R(g, '#ffffffcc', x - 2, y + 1, 2, 2);
}
function trophy(g, x, y, k = 2) { // pixel cup, foot at (x, y); k = pixel size
  const P = (c, a, b, w, h) => R(g, c, x + a * k, y + b * k, w * k, h * k);
  P('#1b1f2a', -7, -2, 14, 2); P('#5a3d24', -6, -2, 12, 2); P('#1b1f2a', -5, -5, 10, 3); P('#7a4a2a', -4, -4, 8, 2);
  P('#b8860b', -1, -8, 2, 3); P('#1b1f2a', -3, -9, 6, 1);
  P('#1b1f2a', -7, -19, 14, 10); P('#1b1f2a', -6, -9, 12, 1); P('#b8860b', -6, -18, 12, 9); P('#ffc928', -6, -18, 10, 8); P('#fff3a0', -5, -17, 2, 6); P('#ffffff', -5, -17, 1, 2);
  P('#1b1f2a', -10, -17, 3, 6); P('#ffc928', -9, -16, 2, 4); P('#1b1f2a', 7, -17, 3, 6); P('#b8860b', 7, -16, 2, 4); P('#e8584a', -2, -15, 4, 3); P('#fff3a0', -1, -15, 1, 1);
}
const CONF = ['#ffc928', '#e8584a', '#4aa8e8', '#7ad25a', '#ffffff', '#c58ae8'];
function confetti(g, t, t0, x0, w, n, seed) { if (t < t0) return;
  for (let k = 0; k < n; k++) { const sp = 26 + 30 * hash(seed, k), y = ((t - t0) * sp + hash(seed + 1, k) * -PH * 0.9) % (PH + 20); if (y < -4) continue;
    const x = x0 + hash(seed + 2, k) * w + Math.round(Math.sin(t * 2.6 + k) * 4), flip = Math.floor(t * 6 + k) % 2; R(g, CONF[k % 6], x, y - 6, flip ? 3 : 2, flip ? 2 : 3); } }
function burst(g, t, t0, x, y, n, v, cols, seed) { const a = t - t0; if (a < 0 || a > 1.3) return; const k = a / 1.3;
  for (let i = 0; i < n; i++) { const ang = (6.283 * i) / n + hash(seed, i) * 0.3, vv = v * (0.7 + 0.3 * hash(seed + 3, i)); g.globalAlpha = 1 - k * k;
    R(g, cols[i % cols.length], x + Math.cos(ang) * vv * a, y + Math.sin(ang) * vv * a + 30 * a * a, 2, 2); } g.globalAlpha = 1; }
const FW = [[70, 50, 4.3], [250, 40, 4.7], [160, 30, 5.1], [400, 26, 5.5], [110, 34, 5.9], [330, 46, 6.3]];
/** table geometry (logical) */
export const TB = { x: 304, y: 30, w: 170, rowH: 21, head: 18 };
const rowY = (i) => TB.y + TB.head + 4 + i * TB.rowH;
const arrowDir = (s) => (s.rank < s.prevRank ? 1 : s.rank > s.prevRank ? -1 : 0);

/** pixel-art layer for time t. imgs(species) -> [Image-like] (frame 0 used). */
export function drawPodiumPixels(g, plan, t, imgs, opts = {}) {
  const rm = !!opts.rm, final = plan.kind === 'final'; g.imageSmoothingEnabled = false;
  venueBackdrop(g, plan.backdrop, rm ? 0 : t, rm);
  if (final) { g.globalAlpha = 0.45; R(g, '#0d1330', 0, 0, PW, PH); g.globalAlpha = 1; }
  // stage floor
  R(g, '#1b1f2a', 0, FLOOR, PW, PH - FLOOR); R(g, '#3a2a3a', 0, FLOOR + 1, PW, 3); for (let x = 0; x < PW; x += 24) R(g, '#2a2236', x, FLOOR + 4, 1, PH - FLOOR);
  // dim + spotlight on the winner
  const sp = ease((t - T.spot) / 0.4);
  if (sp > 0) { g.globalAlpha = 0.32 * sp; R(g, '#0d1320', 0, 0, PW, PH); g.globalAlpha = 0.22 * sp; g.fillStyle = '#fff3b0';
    const cx = TIERS[0].x, top = tierTop(0, 99), sw = rm ? 0 : Math.sin(t * 1.3) * 3; g.beginPath(); g.moveTo(cx - 8 + sw, 0); g.lineTo(cx + 8 + sw, 0); g.lineTo(cx + 46, top + 2); g.lineTo(cx - 46, top + 2); g.fill();
    g.globalAlpha = 0.35 * sp; R(g, '#fff3b0', cx - 40, top - 2, 80, 3); g.globalAlpha = 1; }
  // podium tiers
  TIERS.forEach((tr, slot) => { const e = plan.entries[slot]; if (!e) return; const top = tierTop(slot, t), x = tr.x - tr.w / 2;
    if (slot === 3) { R(g, '#1b1f2a', x - 1, FLOOR + 3, tr.w + 2, 22); R(g, '#384260', x, FLOOR + 4, tr.w, 20); R(g, '#5b6a92', x, FLOOR + 4, tr.w, 2); return; }
    const h = FLOOR - top; if (h < 1) return; const col = ['#e8c26a', '#c9cfdc', '#d39a62'][slot], dk = ['#a8822a', '#8a93a6', '#9a6236'][slot];
    R(g, '#1b1f2a', x - 2, top - 2, tr.w + 4, h + 2); R(g, '#f3ead2', x, top, tr.w, h); R(g, '#d8cdb0', x, top + 4, tr.w, h - 4); R(g, col, x, top, tr.w, 4); R(g, dk, x, top + 3, tr.w, 1);
    R(g, '#ffffff55', x + 2, top + 5, 2, h - 6);
    const ph = Math.min(18, h - 8); if (ph > 6) { R(g, '#1b1f2a', x + 4, top + 7, tr.w - 8, ph); R(g, e.me ? '#4a3a1a' : '#27304a', x + 5, top + 8, tr.w - 10, ph - 2); }
    if (e.me && ph > 6) { const on = rm || Math.floor(t * 3) % 2 === 0; R(g, on ? '#ffd86a' : '#e8c26a', x + 4, top + 7 + ph - 1, tr.w - 8, 1); R(g, on ? '#ffd86a' : '#e8c26a', x + 4, top + 7, tr.w - 8, 1); }
    // big place number block under the plate
    if (h > 34) { R(g, col, tr.x - 7, top + 30, 14, Math.min(16, h - 34)); }
  });
  // Kilu hop on, medals, YOU marker
  const order = [3, 2, 1, 0];
  for (const slot of order) { const e = plan.entries[slot]; if (!e) continue; const p = kiluPos(plan, e, t); if (!p.shown) continue; const s = spr(plan, e);
    const fr = imgs(e.kilu.species) || []; const ground = p.u >= 1;
    if (ground) { g.globalAlpha = 0.3; R(g, '#000', p.x - s * 0.3, p.y - 1, s * 0.6, 2); g.globalAlpha = 1; }
    // hotfix v0.2.104: the winner's cheer is a squash pulse anchored at its feet (no lift), so every Kilu rests on its step
    const bob = 0, cheer = rm || !ground || slot !== 0 || t <= T.spot ? 0 : Math.abs(Math.sin((t - T.spot) * 5)) * 0.35;
    sprite(g, fr[ground ? 0 : 1] || fr[0], p.x, p.y, s, { flip: slot >= 2, sq: rm ? 0 : Math.max(p.squash, cheer) });
    if (ground && p.squash > 0.5 && !rm) for (let k = 0; k < 6; k++) R(g, '#e8dcc0', p.x + (k - 2.5) * 6 * (1 - p.squash), p.y - 2 - (1 - p.squash) * 4, 2, 2);
    // medal drop onto the chest
    if (e.place <= 3 && slot <= 2) { const m0 = medalStart(slot), u = clamp((t - m0) / T.medalDur); if (u > 0) { const yT = p.y - s * 0.3 + bob, yy = u < 0.75 ? -12 + (yT + 12) * (u / 0.75) ** 2 : yT - Math.sin(((u - 0.75) / 0.25) * Math.PI) * 4;
      medal(g, p.x + (slot >= 2 ? -2 : 2), yy, e.place);
      if (!rm && t - m0 - T.medalDur < 0.5) burst(g, t, m0 + T.medalDur * 0.75, p.x, yT, 10, 34, ['#fff7b0', MEDAL[e.place - 1], '#ffffff'], 40 + slot); } }
  }
  // confetti over the winner + trophy + fireworks (final)
  if (t > T.spot) confetti(g, rm ? T.spot + 9 : t, T.spot, final ? 0 : 20, final ? PW : 270, final ? 110 : 60, final ? 77 : 7);
  if (final) { const e = plan.entries[0], p = e && kiluPos(plan, e, 99), u = ease((t - T.spot) / 0.7);
    if (p && u > 0) { const ty = Math.round(-60 + (p.y - 62 + 60) * u); trophy(g, TIERS[0].x + 2, ty, 2);
      if (!rm) burst(g, t, T.spot + 0.7, TIERS[0].x, p.y - 80, 18, 50, ['#fff7b0', '#ffc928', '#ffffff'], 99); }
    if (!rm) for (const [i, [fx, fy, f0]] of FW.entries()) for (let rep = 0; rep < 3; rep++) burst(g, t, f0 + rep * 2.4, fx, fy, 22, 44, [CONF[i % 6], '#ffffff', CONF[(i + 2) % 6]], 300 + i * 7 + rep); }
  // standings table panel
  const rows = plan.stand.length, ph = TB.head + 8 + rows * TB.rowH;
  R(g, '#1b1f2a', TB.x - 2, TB.y - 2, TB.w + 4, ph + 4); R(g, '#22293aee', TB.x, TB.y, TB.w, ph); R(g, '#e8c26a', TB.x, TB.y, TB.w, 2); R(g, '#384260', TB.x, TB.y + TB.head, TB.w, 1);
  for (const s of plan.stand) { const y = rowY(rowSlot(plan, s, t)); if (s.me) { R(g, '#4a3a1a', TB.x + 2, y - 1, TB.w - 4, TB.rowH - 3); R(g, '#e8c26a', TB.x + 2, y - 1, 2, TB.rowH - 3); }
    const t0 = plan.kind === 'final' ? T.fly : (plan.fly.get(s.who) ?? 0) + T.flyDur, pop = t - t0; if (pop > 0 && pop < 0.25 && !rm) { g.globalAlpha = 0.5 * (1 - pop / 0.25); R(g, '#fff3b0', TB.x + 2, y - 1, TB.w - 4, TB.rowH - 3); g.globalAlpha = 1; }
    if (plan.arrows && t >= T.sort) { const d = arrowDir(s), ax = TB.x + 30, ay = y + 8;
      if (d > 0) { R(g, '#1b1f2a', ax - 4, ay - 4, 9, 8); for (let k = 0; k < 4; k++) R(g, '#7ad25a', ax - k, ay - 3 + k, 1 + 2 * k, 1); R(g, '#7ad25a', ax - 1, ay + 1, 3, 2); }
      else if (d < 0) { R(g, '#1b1f2a', ax - 4, ay - 4, 9, 8); for (let k = 0; k < 4; k++) R(g, '#e8584a', ax - k, ay + 3 - k, 1 + 2 * k, 1); R(g, '#e8584a', ax - 1, ay - 2, 3, 2); }
      else R(g, '#8fa0c0', ax - 2, ay, 5, 1); } }
  // rewards panel (final)
  if (final && plan.result) { const u = ease((t - T.sort) / 0.4), y0 = TB.y + ph + 8; if (u > 0) { const h = 64;
    R(g, '#1b1f2a', TB.x - 2, y0 - 2, TB.w + 4, h + 4); R(g, '#2a2236', TB.x, y0, TB.w, h); R(g, '#ffc928', TB.x, y0, Math.round(TB.w * u), 2);
    const it = rewardItems(plan); it.forEach((r, i) => { if (t < T.sort + 0.3 + i * 0.3 && !rm) return; const iy = y0 + 18 + i * 15, ix = TB.x + 10;
      if (r.k === 'gold') { R(g, '#1b1f2a', ix - 4, iy - 4, 9, 9); R(g, '#ffc928', ix - 3, iy - 3, 7, 7); R(g, '#fff3a0', ix - 2, iy - 2, 2, 2); }
      else if (r.k === 'merit') { R(g, '#1b1f2a', ix - 4, iy - 4, 9, 9); R(g, '#c58ae8', ix - 3, iy - 3, 7, 7); R(g, '#ffffff', ix - 1, iy - 3, 1, 7); R(g, '#ffffff', ix - 3, iy - 1, 7, 1); }
      else { R(g, '#5a3d24', ix - 3, iy - 5, 1, 11); R(g, '#e8584a', ix - 2, iy - 5, 7, 5); R(g, '#ffc928', ix, iy - 4, 2, 2); } }); } }
}
/** reward lines for the final panel (keys + values; text from OS) */
export function rewardItems(plan) { const r = plan.result; if (!r) return []; const out = [];
  if (r.place === 1) out.push({ k: 'gold', key: 'pod_gold', v: { prize: r.prize } });
  out.push({ k: 'merit', key: 'pod_merit', v: { merit: r.merit } });
  if (r.firstWin) out.push({ k: 'flag', key: 'pod_first', v: { venue: plan.venueName } });
  return out; }

// ---------- text layer (vector; UI draws it at device resolution on top of the scaled pixel layer) ----------
function txt(g, s, x, y, size, col = '#fff', align = 'center', out = '#1b1f2a') {
  g.font = `bold ${size}px monospace`; g.textAlign = align; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.lineWidth = Math.max(2, size / 3.5); g.strokeStyle = out; g.strokeText(s, x, y); g.fillStyle = col; g.fillText(s, x, y);
}
const fit = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1) + '.' : String(s));
/** vector text for time t (logical coords). Returns the list of strings drawn (tests). */
export function drawPodiumText(g, plan, t, opts = {}) {
  const rm = !!opts.rm, final = plan.kind === 'final';
  // title ribbon
  const title = final ? ot(OS.pod_champ_title, { venue: plan.venueName }) : ot(OS.pod_title, { n: plan.n, of: plan.of, event: OS.events[plan.id] || plan.id });
  const ti = rm ? 1 : ease(t / 0.35); g.globalAlpha = ti; g.fillStyle = '#1b1f2acc'; g.fillRect(PW / 2 - 150, 3, 300, 20); g.globalAlpha = 1;
  txt(g, title, PW / 2, 13 - (1 - ti) * 16, final ? 13 : 12, '#ffd86a');
  // plates
  plan.entries.forEach((e) => { const tr = TIERS[e.slot], top = tierTop(e.slot, t), h = FLOOR - top;
    if (e.slot === 3) { txt(g, fit(e.name, 7), tr.x, FLOOR + 10, 7, e.me ? '#ffd86a' : '#f3ead2'); txt(g, fit(kiluName(e.kilu), 7), tr.x, FLOOR + 19, 7, '#c8d0e8'); txt(g, ORD[e.place - 1] || '', tr.x, FLOOR - 40, 7, '#8fa0c0'); return; }
    if (h < 26) { if (h >= 14) txt(g, fit(e.name, 11), tr.x, top + 10, 7, e.me ? '#ffd86a' : '#f3ead2'); return; }
    txt(g, fit(e.name, 11), tr.x, top + 12, 7, e.me ? '#ffd86a' : '#f3ead2'); txt(g, fit(kiluName(e.kilu), 11), tr.x, top + 20, 7, '#c8d0e8');
    if (h > 34) txt(g, String(e.place), tr.x, top + 30 + Math.min(16, h - 34) / 2, 10, '#ffffff'); });
  // YOU marker over the player's Kilu, + this event's points above each Kilu then flying to the table
  plan.entries.forEach((e) => { const p = kiluPos(plan, e, t); if (!p.shown || p.u < 1) return; const s = spr(plan, e);
    if (e.me && !(final && e.slot === 0)) txt(g, '▼ ' + OS.you, p.x, p.y - s - 8 + (rm ? 0 : Math.round(Math.sin(t * 5) * 1.5)), 7, '#ffd86a');
    if (final) return; const f0 = plan.fly.get(e.who), u = clamp((t - f0) / T.flyDur), srow = plan.stand.find((x) => x.who === e.who);
    if (t < f0 - 0.6 || !srow || u >= 1) return; const tx = TB.x + TB.w - 44, ty = rowY(srow.prevRank) + 8, sx = p.x, sy = p.y - s - (e.me ? 18 : 8);
    const k = ease(u), x = sx + (tx - sx) * k, y = sy + (ty - sy) * k - Math.sin(k * Math.PI) * 30;
    txt(g, '+' + e.pts, x, y, u > 0 ? 10 : 9, e.pts ? '#ffd86a' : '#c8d0e8'); });
  // table
  txt(g, final ? OS.pod_final : ot(OS.pod_standings, { n: plan.n, of: plan.of }), TB.x + TB.w / 2, TB.y + 10, 8, '#e8c26a');
  for (const s of plan.stand) { const y = rowY(rowSlot(plan, s, t)) + 8, col = s.me ? '#ffd86a' : '#f3ead2';
    txt(g, ORD[Math.round(rowSlot(plan, s, t))] || '', TB.x + 6, y, 8, col, 'left');
    txt(g, fit(s.name, 9), TB.x + 40, y, 8, col, 'left');
    if (final) txt(g, '★' + s.wins, TB.x + TB.w - 44, y, 7, '#c8d0e8', 'left');
    else { const f0 = (plan.fly.get(s.who) ?? 0) + T.flyDur; if (t >= f0) txt(g, '+' + s.add, TB.x + TB.w - 44, y, 7, s.add ? '#7ad25a' : '#8fa0c0', 'left'); }
    txt(g, String(shownPts(plan, s, t)), TB.x + TB.w - 8, y, 9, col, 'right'); }
  // player line
  const me = plan.entries.find((e) => e.me);
  if (!final && me && t > T.spot) { const msg = me.place <= 3 ? ot(OS.pod_you_placed, { kilu: kiluName(me.kilu), place: ORD[me.place - 1] }) : ot(OS.pod_you_missed, { kilu: kiluName(me.kilu) });
    txt(g, msg, 150, 34, 8, me.place <= 3 ? '#ffd86a' : '#c8d0e8'); }
  if (final && plan.result && t >= T.sort) { const r = plan.result, ph = TB.head + 8 + plan.stand.length * TB.rowH, y0 = TB.y + ph + 8;
    txt(g, r.place === 1 ? OS.pod_you_champ : ot(OS.pod_you_finished, { place: ORD[r.place - 1] }), TB.x + TB.w / 2, y0 + 7, 8, r.place === 1 ? '#ffd86a' : '#f3ead2');
    rewardItems(plan).forEach((it, i) => { if (t < T.sort + 0.3 + i * 0.3 && !rm) return; txt(g, ot(OS[it.key], it.v), TB.x + 22, y0 + 18 + i * 15, 8, '#f3ead2', 'left'); }); }
  if (final && plan.entries[0]) { const w = plan.entries[0]; if (t > T.spot + 0.7) txt(g, ot(OS.pod_champ_name, { trainer: w.me ? OS.you : w.name, kilu: kiluName(w.kilu) }), 150, 34, 9, '#ffd86a'); }
  if (opts.hint && !rm) { g.globalAlpha = 0.6 + 0.4 * Math.abs(Math.sin(t * 2)); txt(g, opts.hint, 120, FLOOR + 30, 7, '#c8d0e8'); g.globalAlpha = 1; }
  return true;
}

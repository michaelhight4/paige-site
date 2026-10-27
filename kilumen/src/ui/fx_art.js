// Animator FX art, wired in Oct 22, 2026 (Gary approved 11:26 PM CT: "Yes, wire capture, evolution and heal in").
// Art + JSON: art/characters/pixel/fx_extra/{capture,evolution,heal_restore}/ (owned by Animator; read only here).
// Lazily imported by ui_tools2.js the first time one of these plays, so it adds nothing to the boot bundle.
// Rollback: set a FX_ART flag to false -> capture goes back to the CSS/DOM placeholder (capture_fx.js); heal and
// evolution then play nothing (there was no old path for them).
import { SPECIES, battleSpriteRel } from './data.js?v=v0.2.26-alpha';

export const FX_ART = { capture: true, evolution: true, heal: true };
export const FX_CFG = {
  base: 'art/characters/pixel/fx_extra/',
  pilotH: 240,               // the art is authored on a 320x240 pilot screen; display scale = battle box height / pilotH
  // Default capture HOLD point in pilot px (64,128). Used only when poses are off (?poses=0) or a character has no bone_v2
  // data; otherwise the crystal follows that character's per-frame hand point (poses below).
  hold: [64, 128],
  // Heal cradle centre in 1x px from the top-left of the 2x2 machine's _0_0 tile, searched in this order (heal_restore canvas_px [30,30]
  // goes here). heal_restore.json hooks.cradle_centre.<base>_2x2_px overrides these when present. 11:43 PM CT: heal branches place
  // i_crystal_polisher (7476-7479); the old heal_machine eye [32,51] is retired (heal_centre_int only).
  cradle: [['i_crystal_polisher', [63, 28]], ['i_heal_machine', [63, 28]]],
  // Heal camera (Gary 2:42 PM CT Oct 23 2026: "zoom in to highlight the machine healing"): the world canvas scales up about the
  // cradle after the camera pans there (scene.camFocus; CSS transform, so the FX overlay, placed from getBoundingClientRect, stays aligned).
  healZoom: { scale: 1.75, ms: 300 },
  // Character models' capture poses: bone_v2 (one arm extended; natural elbow bend, smoothed arm edges, slimmer hiker sleeve).
  // ON by default since Oct 23, 2026 (Gary approved 12:00 AM CT: "just pass them on as approved im going to sleep").
  // Rollbacks: ?poses=0 (old placeholder trainer + the single `hold` point above) or ?fxart=0 (whole art path off).
  // Per character: <dir><id>/hold_points.json {frames, frame_w, frame_h, hold_px[i] (1x px in the frame's own top-left), pad}
  // + <id>_capture_strip.png (frames side by side). Frame widths vary (64-108 px): the arm pad is even on both sides and
  // the frame is centred on the original 64 px centre (left edge moves by -pad.left), so the feet never shift.
  // The crystal FX anchor [32,32] goes on hold_px of the current frame, 1 art px = 1 sprite px, drawn ON TOP of the sprite and never clipped to it.
  // A character with no (or invalid) bone_v2 data falls back to the old pose + the default `hold` point and is logged (POSE_LOG.missing).
  // Test switch: ?posechar=<id> captures with another character (back views cal/mira suit the near side; tr_* are front views).
  poses: { on: true, dir: 'art/characters/pixel/capture_poses/bone_v2/', player: 'cal',
    // the player (cal; mira has the same back view) + every trainer with battle art (npcs/tr_*, humans/*/trainer)
    roster: ['cal', 'mira', 'tr_bugcatcher_f', 'tr_camper_f', 'tr_gymtrainer_f', 'tr_gymtrainer_m', 'tr_hiker_f', 'tr_hiker_m', 'tr_lass_f',
      'tr_master_fernwick_m', 'tr_master_saltmere_f', 'tr_ranger_m', 'tr_scientist_f', 'tr_scientist_m', 'tr_swimmer_f', 'tr_swimmer_m',
      'tr_youngster_m', 'ron', 'vane', 'riverbank_stranger'],
    points: (id) => `${id}/hold_points.json`,
    sheet: (id) => `${id}/${id}_capture_strip.png`,
    frameFor: { raise: 'raise', beam: 'hold', absorb: 'hold', pulse: 'hold', lock_bloom: 'hold', breakout: 'hold_strain', lower: 'lowered' },
    // a frame the character doesn't have (trainers: raise + hold only) -> this one, then 'hold', then frame 0
    alt: { hold_strain: 'hold', lowered: 'raise' } },
};

// ---------- loader: piece JSON (+ per-step <step>_battle_2x.json for capture) -> one normalised shape ----------
const cache = {};
const getJson = (u) => (cache[u] ||= fetch(u).then((r) => (r.ok ? r.json() : null)).catch(() => null));
const imgs = {};
const getImg = (u) => (imgs[u] ||= new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = u; }));
export const piece = (p) => getJson(`${FX_CFG.base}${p}/${p}.json`);

/** -> { name, kind, w, h (native px), frames [{x, ms}] (native px), total, anchor {x, y} (overlay) | {hold, foe} (travel), src (2x sheet), src1x, hooks } */
export async function anim(p, name) {
  const P = await piece(p), a = P?.anims?.[name]; if (!a) return null;
  const per = p === 'capture' ? await getJson(`${FX_CFG.base}${p}/${name}/${name}_battle_2x.json`) : null;
  const [w, h] = a.frame_size, k = per?.scale || 2;
  const frames = per?.frames ? per.frames.map((f) => ({ x: f.x / k, ms: f.ms })) : a.rects.map((r, i) => ({ x: r[0], ms: a.ms_per_frame[i] }));
  const an = per?.anchor || {}, pa = a.anchor || {};
  const anchor = a.kind === 'travel'
    ? { hold: an.hold_in_canvas_native || [pa.hold_screen[0] - pa.canvas_top_left_on_screen[0], pa.hold_screen[1] - pa.canvas_top_left_on_screen[1]],
      foe: an.foe_in_canvas_native || [pa.foe_centre_screen[0] - pa.canvas_top_left_on_screen[0], pa.foe_centre_screen[1] - pa.canvas_top_left_on_screen[1]] }
    : { x: (an.native || pa.canvas_px)[0], y: (an.native || pa.canvas_px)[1] };
  return { name, kind: a.kind, w, h, frames, total: per?.total_ms ?? a.total_ms, anchor, src: a.sheet_2x, src1x: a.sheet, hooks: per?.hooks || null, piece: P };
}
export async function preload(list) { const out = await Promise.all(list.map(([p, n]) => anim(p, n))); if (out.some((a) => !a)) return null;
  const ok = await Promise.all(out.map((a) => getImg(a.src))); return ok.every(Boolean) ? Object.fromEntries(out.map((a) => [a.name, a])) : null; }

// ---------- DOM sheet player (capture + heal): nearest-neighbour, fixed schedule from the JSON ms ----------
// s = display px per native px. Overlays sit on their anchor at (x, y); travel canvases map their hold->foe line onto
// the live hold->foe line (uniform scale + small rotation).
export function sheet(parent, a, s, pos) {
  const el = document.createElement('i'); el.className = 'fxa'; el.setAttribute('aria-hidden', 'true'); el.dataset.anim = a.name;
  const W = a.frames.length * a.w;
  el.style.cssText = `width:${a.w}px;height:${a.h}px;background-image:url(${a.src});background-size:${W}px ${a.h}px;`;
  if (a.kind === 'travel') {
    const [hx, hy] = a.anchor.hold, [fx, fy] = a.anchor.foe, vx = fx - hx, vy = fy - hy, ux = pos.fx - pos.x, uy = pos.fy - pos.y;
    const sc = Math.hypot(ux, uy) / Math.hypot(vx, vy), rot = Math.atan2(uy, ux) - Math.atan2(vy, vx);
    el.style.transform = `translate(${pos.x}px,${pos.y}px) rotate(${rot}rad) scale(${sc}) translate(${-hx}px,${-hy}px)`;
  } else el.style.transform = `translate(${pos.x}px,${pos.y}px) scale(${s}) translate(${-a.anchor.x}px,${-a.anchor.y}px)`;
  parent.appendChild(el);
  const show = (i) => { el.style.backgroundPosition = `${-a.frames[i].x}px 0`; el.dataset.f = i; };
  show(0);
  const timers = [];
  // play frames [from..to] (reverse ok); onFrame(i) on each; resolves after their summed ms (timers on one clock)
  const play = ({ reverse = false, onFrame } = {}) => new Promise((res) => {
    const order = a.frames.map((_, i) => i); if (reverse) order.reverse();
    let t = 0; order.forEach((i) => { timers.push(setTimeout(() => { show(i); onFrame?.(i); }, t)); t += a.frames[i].ms; });
    timers.push(setTimeout(res, t)); });
  const last = () => show(a.frames.length - 1);
  const move = (q) => { el.style.transform = `translate(${q.x}px,${q.y}px) scale(${s}) translate(${-a.anchor.x}px,${-a.anchor.y}px)`; };
  return { el, play, show, last, move, stop: () => timers.forEach(clearTimeout), remove: () => { timers.forEach(clearTimeout); el.remove(); } };
}
const sleepUntil = (t) => new Promise((r) => setTimeout(r, Math.max(0, t - performance.now())));

// ---------- capture: raise -> beam -> absorb -> pulse_N -> lock_bloom | breakout_<type> (capture.json hooks) ----------
export const breakoutType = (P, el = '') => P?.hooks?.breakout_type_by_element?.[String(el).toLowerCase()] || 'generic';
export function captureList(n, caught, type) { return ['raise', 'beam', 'absorb', `pulse_${n}`, caught ? 'lock_bloom' : `breakout_${type}`]; }
export async function loadCapture(n, caught, el) { const P = await piece('capture'); if (!P) return null;
  const type = breakoutType(P, el), names = captureList(n, caught, type), set = await preload(names.map((k) => ['capture', k]));
  poseCoverage(); // once, in the background: logs which roster characters fall back to the old pose
  return set && { P, type, names, set, pose: await loadPose() }; }
/** Pose log (tests + dev notes): bone_v2 characters loaded / characters that fell back to the old pose + default hold point. */
export const POSE_LOG = { loaded: [], missing: [] };
const posesOn = () => { const q = typeof location !== 'undefined' ? null /* ALPHA build: ?poses ignored */ : null; return q !== '0' && (FX_CFG.poses.on || q === '1'); };
/** bone_v2 json sanity: one hold point per frame, every point inside its frame, pad even on both sides and inside the frame. */
export function poseJsonOk(hp) {
  if (!hp || !Array.isArray(hp.frames) || !hp.frames.length || !Array.isArray(hp.hold_px) || hp.hold_px.length !== hp.frames.length) return false;
  const { frame_w: w, frame_h: h, pad = {} } = hp, l = pad.left || 0, r = pad.right || 0;
  if (!(w > 0 && h > 0) || l !== r || l < 0 || l * 2 >= w) return false;
  return hp.hold_px.every((p) => Array.isArray(p) && p[0] >= 0 && p[0] < w && p[1] >= 0 && p[1] < h);
}
const miss = (id, why) => { if (!POSE_LOG.missing.some((m) => m.id === id)) { POSE_LOG.missing.push({ id, why });
  console.info(`[capture poses] ${id}: no bone_v2 data (${why}) -> old pose + default hold point [${FX_CFG.hold}]`); } };
/** Pose strip + per-frame hold points for the capturing character (null when poses are off or the character has no
 *  usable bone_v2 data -> the caller keeps the old pose and FX_CFG.hold). id: char id (default ?posechar= or the player). */
export async function loadPose(id) {
  if (!posesOn()) return null;
  const C = FX_CFG.poses; id ||= (typeof location !== 'undefined' && null /* ALPHA build: ?posechar ignored */) || C.player;
  const hp = await getJson(C.dir + C.points(id));
  if (!hp) { miss(id, 'no hold_points.json'); return null; }
  if (!poseJsonOk(hp)) { miss(id, 'hold_points.json invalid'); return null; }
  const src = C.dir + C.sheet(id), im = await getImg(src);
  if (!im) { miss(id, 'no strip'); return null; }
  if (im.naturalWidth !== hp.frames.length * hp.frame_w || im.naturalHeight !== hp.frame_h) { miss(id, `strip ${im.naturalWidth}x${im.naturalHeight} != json`); return null; }
  if (!POSE_LOG.loaded.includes(id)) POSE_LOG.loaded.push(id);
  return { id, src, frames: hp.frames, fw: hp.frame_w, fh: hp.frame_h, hold: hp.hold_px, pad: hp.pad?.left || 0 };
}
/** Check the whole roster once (json only, no images) and log who falls back. Resolves { loaded, missing }. */
let coverage = null;
export function poseCoverage() { return (coverage ||= (async () => { if (!posesOn()) return { off: true, loaded: [], missing: [] };
  const C = FX_CFG.poses, ok = [], bad = [];
  for (const id of C.roster) { const hp = await getJson(C.dir + C.points(id)); if (poseJsonOk(hp)) ok.push(id); else { bad.push(id); miss(id, hp ? 'hold_points.json invalid' : 'no hold_points.json'); } }
  if (bad.length) console.info(`[capture poses] bone_v2: ${ok.length}/${C.roster.length} characters; fallback (old pose): ${bad.join(', ')}`);
  return { loaded: ok, missing: bad }; })()); }
// Show pose frame `f` (by name -> alt -> 'hold' -> frame 0) on the trainer element; returns the hand point in wrap px + px scale.
// The element's original centre line is the reference: a padded frame (fw = 64 + 2*pad, pad even) is centred on it,
// so the original 64 px centre (and the feet) stay where they were.
export function poseFrame(t, pose, f) {
  const fr = pose.frames, A = FX_CFG.poses.alt || {};
  let i = fr.indexOf(f); if (i < 0 && A[f]) i = fr.indexOf(A[f]); if (i < 0) i = fr.indexOf('hold'); if (i < 0) i = 0;
  if (!t.dataset.cx) { t.dataset.cx = (parseFloat(t.style.left) || 0) + t.offsetWidth / 2; t.dataset.y0 = parseFloat(t.style.top) || 0; } // original centre line
  const n = fr.length, k = t.offsetHeight / pose.fh, x0 = +t.dataset.cx - (pose.fw * k) / 2, y0 = +t.dataset.y0; // pad even both sides -> = old left - pad*k
  t.style.left = `${x0}px`; t.style.width = `${pose.fw * k}px`;
  t.style.backgroundImage = `url(${pose.src})`; t.style.backgroundSize = `${n * 100}% 100%`; t.style.backgroundPosition = `${n > 1 ? (i / (n - 1)) * 100 : 0}% 0`;
  t.dataset.pose = fr[i]; t.dataset.posechar = pose.id;
  return { x: x0 + (pose.hold[i][0] + 0.5) * k, y: y0 + (pose.hold[i][1] + 0.5) * k, k };
}

/** ctx: { A (anime.js | null), p (placeholder parts: wrap, hold, trainer), g {gx, gy, fx, fy, tw, H}, foe, ally, caught, ban, sfx, steps, art } */
export async function runCapture(ctx) {
  const { A, p, g, foe, caught, ban, sfx, steps, art } = ctx, t0 = performance.now(), layer = p.wrap;
  const hold = { x: g.gx, y: g.gy, fx: g.fx, fy: g.fy }, P = art.P, cues = P.hooks?.sfx_cues || {};
  p.wrap.classList.add('art');
  // poses (bone_v2, default ON): hold point per character frame from <id>/hold_points.json, 1 art px = 1 sprite px
  let s = g.H / FX_CFG.pilotH;
  const pose = (step) => { if (!art.pose) return; const fm = FX_CFG.poses.frameFor, q = poseFrame(p.trainer, art.pose, fm[step] || fm[step.replace(/_.*$/, '')]);
    hold.x = q.x; hold.y = q.y; s = q.k; held?.move(hold); };
  if (art.pose) p.wrap.classList.add('pose');
  let at = 0, held = null, tail = null; const slot = async (a, fn) => { steps.push(a.name); pose(a.name); at += a.total; fn(); await sleepUntil(t0 + at); };
  const [raise, beam, absorb, pulse, end] = art.names.map((k) => art.set[k]);
  // raise: the trainer slides in; the crystal appears in the raised hands (stays on its last frame while the beam runs)
  await slot(raise, () => { if (A) { A.animate(p.trainer, { translateX: [-g.tw * 1.4, 0], opacity: [0, 1], duration: 260, ease: 'outCubic' }); if (ctx.ally) A.animate(ctx.ally, { opacity: [1, 0.35], duration: 260 }); }
    held = sheet(p.hold, raise, s, hold); held.play(); });
  await slot(beam, () => { const b = sheet(layer, beam, s, hold); b.play().then(() => b.remove()); });
  // absorb: the foe dissolves into light (removed_fraction per frame, capture.json hooks.foe_dissolve) and streams in
  const dis = P.hooks?.foe_dissolve?.removed_fraction || [];
  await slot(absorb, () => { const b = sheet(layer, absorb, s, hold); if (foe) { foe.style.animation = 'none'; foe.classList.add('ax-lit'); }
    b.play({ onFrame: (i) => { if (foe && dis[i] != null) foe.style.opacity = String(1 - dis[i]); } }).then(() => b.remove()); });
  // pulse_N in the hands (each pulse = one capture check)
  await slot(pulse, () => { held.remove(); held = sheet(p.hold, pulse, s, hold); held.play(); });
  if (caught) {
    const chime = cues.lock_bloom?.bloom_chime ?? 4;
    await slot(end, () => { held.remove(); held = sheet(p.hold, end, s, hold); if (foe) foe.style.opacity = '0';
      held.play({ onFrame: (i) => { if (i === chime) { sfx('catch'); layer.appendChild(ban); A?.animate(ban, { scale: [0.6, 1], opacity: [0, 1], translateY: [12, 0], duration: 300, ease: 'outBack(1.8)' }); if (!A) ban.style.opacity = '1'; } } }); });
  } else {
    const ref = P.hooks?.foe_reform || { frames: [6, 7, 8, 9], hidden_fraction: [1, 0.66, 0.33, 0] };
    await slot(end, () => { held.remove(); held = null; const b = sheet(layer, end, s, hold);
      tail = b.play({ onFrame: (i) => { const j = ref.frames.indexOf(i); if (foe && j >= 0 && !foe.dataset.capDone) { foe.classList.remove('ax-lit'); foe.style.opacity = String(1 - ref.hidden_fraction[j]); } } })
        .then(() => { b.remove(); if (foe) { foe.classList.remove('ax-lit'); foe.style.opacity = ''; foe.style.animation = ''; } }); });
  }
  // the breakout burst can outlive its slot by a frame; let it finish (max 100 ms) so it never sits off the lowered hand
  if (tail) await Promise.race([tail, sleepUntil(performance.now() + 100)]);
  ctx.lowerPose = () => pose('lower');
  return { held, ms: Math.round(performance.now() - t0) };
}
/** Reduced motion: no motion at all; caught -> the lock_bloom last frame sits where the crystal would be, plus the banner. */
export function captureEnd(p, g, art, ban) { const a = art.set.lock_bloom; if (!a) return; const h = sheet(p.wrap, a, g.H / FX_CFG.pilotH, { x: g.gx, y: g.gy }); h.last(); p.wrap.appendChild(ban); }
export const captureMs = (art) => art.names.reduce((n, k) => n + art.set[k].total, 0);

// ---------- heal_restore at the machine cradle (heal_restore.json hooks.sequence) ----------
function findMachine(sc, cc) {
  const ts = sc.tileset, m = sc.map; if (!ts || !m) return null;
  const nameOf = (id) => ts.byId?.get?.(id)?.name || ts.tiles?.[id]?.name || ts.get?.(id)?.name || '';
  for (const [base, pt0] of FX_CFG.cradle) { const pt = cc?.[`${base}_2x2_px`] || pt0; for (const L of ['decoration', 'overlay', 'ground']) { const g = m.layers?.[L]; if (!g) continue;
    for (let y = 0; y < g.length; y++) for (let x = 0; x < g[y].length; x++) if (g[y][x] && nameOf(g[y][x]) === `${base}_0_0`) return { x, y, base, pt }; } }
  return null;
}
/** sc: the overworld scene; n: team size. Resolves { ms, machine, steps } (skipped: reduced motion / no machine / art missing). */
export async function healFx(sc, n, { reduced = false, steps = [] } = {}) {
  n = Math.max(1, Math.min(6, n || 1));
  if (reduced) return { ms: 0, skipped: 'reduced', steps };
  const H = (await piece('heal_restore'))?.hooks, mc = findMachine(sc, H?.cradle_centre); if (!mc) return { ms: 0, skipped: 'no machine', steps };
  const names = ['heal_cradle_open', `heal_float_${n}`, 'heal_scanner_sweep', `heal_glow_${n}`, 'heal_done_ping'];
  const set = await preload(names.map((k) => ['heal_restore', k])); if (!set) return { ms: 0, skipped: 'art missing', steps };
  const zoom = await healZoomIn(sc, mc);
  try { return await healPlay(sc, n, mc, set, steps, zoom); } finally { await healZoomOut(sc, zoom); }
}
/** Close-up on the machine (input is already held: the heal runs inside a dialogue script): the camera pans to the cradle
 *  (scene.camFocus, overworld.js view), then the world canvas scales up about it (CSS transform: the FX overlay is placed from
 *  getBoundingClientRect after this, so it stays on the cradle). -> undo info | null */
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const tween = (ms, f) => new Promise((res) => { const t0 = performance.now(); const tick = (now) => { const t = Math.min(1, (now - t0) / ms); f(ease(t)); if (t < 1) requestAnimationFrame(tick); else res(); }; requestAnimationFrame(tick); });
async function healZoomIn(sc, mc) {
  const cv = sc.canvas, Z = FX_CFG.healZoom; if (!cv?.style || !Z || !(Z.scale > 1)) return null;
  const T = 64, pp = sc.player?.pixel?.(), from = pp ? { x: pp.px + T / 2, y: pp.py + T / 2 } : null, to = { x: mc.x * T + mc.pt[0], y: mc.y * T + mc.pt[1] };
  const prev = { transform: cv.style.transform, transformOrigin: cv.style.transformOrigin, transition: cv.style.transition };
  const z = { cv, prev, from, to, ms: Z.ms, scale: Z.scale };
  if (from) await tween(Z.ms, (e) => { sc.camFocus = { x: Math.round(from.x + (to.x - from.x) * e), y: Math.round(from.y + (to.y - from.y) * e) }; });
  else sc.camFocus = to;
  await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res))); // the camera has drawn at the cradle
  const r = cv.getBoundingClientRect(), cssK = r.width / cv.width, cam = sc._cam || { x: 0, y: 0 }, s = sc.zoom * cssK;
  cv.style.transformOrigin = `${(to.x - cam.x) * s}px ${(to.y - cam.y) * s}px`; // cradle in canvas-local CSS px (centre unless clamped)
  cv.style.transition = `transform ${Z.ms}ms ease-in-out`; void cv.offsetWidth; cv.style.transform = `scale(${Z.scale})`;
  await new Promise((res) => setTimeout(res, Z.ms + 30));
  return z;
}
async function healZoomOut(sc, z) {
  if (!z) return; const { cv, prev, from, to, ms } = z;
  cv.style.transform = prev.transform || ''; await new Promise((res) => setTimeout(res, ms + 30));
  cv.style.transition = prev.transition || ''; cv.style.transformOrigin = prev.transformOrigin || '';
  if (from) await tween(ms, (e) => { sc.camFocus = { x: Math.round(to.x + (from.x - to.x) * e), y: Math.round(to.y + (from.y - to.y) * e) }; });
  sc.camFocus = null;
}
async function healPlay(sc, n, mc, set, steps, zoom) {
  const cv = sc.canvas, r = cv.getBoundingClientRect(), cssK = r.width / cv.width, z = sc.zoom, cam = sc._cam || { x: 0, y: 0 }, T = 64;
  const s = z * cssK, x = r.left + ((mc.x * T + mc.pt[0]) - cam.x) * s, y = r.top + ((mc.y * T + mc.pt[1]) - cam.y) * s;
  const host = document.createElement('div'); host.className = 'ax-heal'; host.setAttribute('aria-hidden', 'true'); document.body.appendChild(host);
  const t0 = performance.now(), pos = { x, y };
  const step = async (k, o) => { steps.push(o?.reverse ? `${k}_back` : k); const sp = sheet(host, set[k], s, pos); await sp.play(o); return sp; };
  (await step('heal_cradle_open')).remove();
  const fl = await step(`heal_float_${n}`); fl.last();             // crystals held up over the cradle
  (await step('heal_scanner_sweep')).remove();                         // one sweep over the held float
  fl.remove(); (await step(`heal_glow_${n}`)).remove();
  (await step('heal_done_ping')).remove();
  (await step(`heal_float_${n}`, { reverse: true })).remove();       // crystals home
  host.remove();
  return { ms: Math.round(performance.now() - t0), machine: mc, mapPx: [mc.x * T + mc.pt[0], mc.y * T + mc.pt[1]], at: { x: Math.round(x), y: Math.round(y) }, scale: s, steps, zoom: zoom ? zoom.scale : 1 };
}

// ---------- evolution (evolution.json hooks): veins grow -> hold -> reveal front -> ring burst; canvas, masked + recoloured ----------
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export const nextForm = (id) => { const sp = SPECIES.find((x) => x.id === id); if (!sp?.line) return null; const line = SPECIES.filter((x) => x.line === sp.line); return line[line.indexOf(sp) + 1] || null; };
async function recoloured(a, map) { // 1x sheet -> canvas with the family colours swapped in (exact #rrggbb match)
  const im = await getImg(a.src1x); if (!im) return null; const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
  const x = c.getContext('2d'); x.drawImage(im, 0, 0); if (!map) return c;
  const d = x.getImageData(0, 0, c.width, c.height), px = d.data, m = Object.entries(map).map(([f, t]) => [hex(f), hex(t)]);
  for (let i = 0; i < px.length; i += 4) { if (!px[i + 3]) continue; for (const [f, t] of m) if (px[i] === f[0] && px[i + 1] === f[1] && px[i + 2] === f[2]) { px[i] = t[0]; px[i + 1] = t[1]; px[i + 2] = t[2]; break; } }
  x.putImageData(d, 0, 0); return c;
}
/** o: { from (species id), to?, host?, reduced, cancel (true = test: B during the hold; a function = polled live, src/systems/evolution.js),
 *  text ({start, end} overrides hooks.text), hold (ms the text waits) }. Resolves { from, to, steps, ms, cancelled }. */
export async function evolveFx(o = {}) {
  const old = SPECIES.find((x) => x.id === o.from), nw = o.to ? SPECIES.find((x) => x.id === o.to) : nextForm(o.from);
  if (!old || !nw) return { skipped: 'no next form', steps: [] };
  const E = await piece('evolution'), H = E?.hooks || {}, steps = [], t0 = performance.now();
  const live = typeof o.cancel === 'function', stopNow = () => (live ? !!o.cancel() : !!o.cancel); // live: B can stop it until the reveal starts
  const names = o.reduced ? ['evo_reduced_motion'] : live ? ['evo_veins_grow', 'evo_veins_hold', 'evo_cancel', 'evo_reveal_front', 'evo_ring_burst'] : ['evo_veins_grow', 'evo_veins_hold', o.cancel ? 'evo_cancel' : 'evo_reveal_front', 'evo_ring_burst'];
  const set = await preload(names.map((k) => ['evolution', k])); if (!set) return { skipped: 'art missing', steps };
  const tints = await getJson('art/characters/pixel/warmth/warmth_tints.json'), fam = tints?.creatures?.[old.id]?.stages?.['3'] || null; // no entry -> violet
  const spr = (id) => getImg('art/characters/pixel/' + battleSpriteRel(id, 'front', false));
  const [A0, A1] = await Promise.all([spr(old.id), spr(nw.id)]); if (!A0 || !A1) return { skipped: 'sprite missing', steps };
  const sheets = {}; for (const k of names) sheets[k] = await recoloured(set[k], k === 'evo_ring_burst' ? null : fam);
  // stage (self-contained; there is no evolution flow in the game yet): dim panel, the creature, one text line
  const st = document.createElement('div'); st.className = 'ax-evo'; st.innerHTML = '<canvas width="128" height="128"></canvas><p class="ax-evo-msg" role="status"></p>';
  (o.host || document.body).appendChild(st);
  const cv = st.firstChild, cx = cv.getContext('2d'), msg = st.lastChild, sz = 128, C = [64, 64]; // crystal point: sprite centre (crystal_anchors has no battle-sprite entry)
  const fill = (s, v) => s.replace('{old}', old.name).replace('{new}', nw.name);
  const T = o.text || H.text || { start: '{old} is changing...', end: '{old} became {new}!' };
  const off = document.createElement('canvas'); off.width = off.height = sz; const ox = off.getContext('2d');
  const mask = (imgs) => { const m = document.createElement('canvas'); m.width = m.height = sz; const mx = m.getContext('2d'); imgs.forEach((i) => mx.drawImage(i, 0, 0)); return m; };
  const mOld = mask([A0]), mBoth = mask([A0, A1]);
  const overlay = (k, i, m) => { const a = set[k]; ox.clearRect(0, 0, sz, sz); ox.globalCompositeOperation = 'source-over';
    ox.drawImage(sheets[k], a.frames[i].x, 0, a.w, a.h, C[0] - a.anchor.x, C[1] - a.anchor.y, a.w, a.h);
    if (m) { ox.globalCompositeOperation = 'destination-in'; ox.drawImage(m, 0, 0); ox.globalCompositeOperation = 'source-over'; } cx.drawImage(off, 0, 0); };
  // reveal (hooks.reveal.rule): new pixel where dist(p, C) + (bayer/16 - 0.5) * 12 < R, else old
  const d0 = mask([A0]).getContext('2d').getImageData(0, 0, sz, sz), d1 = mask([A1]).getContext('2d').getImageData(0, 0, sz, sz);
  let Rmax = 0; for (let y = 0; y < sz; y++) for (let x = 0; x < sz; x++) { const i = (y * sz + x) * 4 + 3; if (d0.data[i] || d1.data[i]) Rmax = Math.max(Rmax, Math.hypot(x - C[0], y - C[1])); }
  const mix = (R) => { const out = cx.createImageData(sz, sz); for (let y = 0; y < sz; y++) for (let x = 0; x < sz; x++) { const i = (y * sz + x) * 4,
    src = Math.hypot(x - C[0], y - C[1]) + (BAYER[y % 4][x % 4] / 16 - 0.5) * 12 < R ? d1 : d0; for (let j = 0; j < 4; j++) out.data[i + j] = src.data[i + j]; } cx.putImageData(out, 0, 0); };
  const base = (img) => { cx.clearRect(0, 0, sz, sz); if (img) cx.drawImage(img, 0, 0); };
  const play = (k, draw, frames) => new Promise((res) => { steps.push(k); const a = set[k], idx = frames || a.frames.map((_, i) => i); let t = 0;
    idx.forEach((i, n) => { setTimeout(() => draw(i, n), t); t += a.frames[i].ms; }); setTimeout(res, t); });
  base(A0); msg.textContent = fill(T.start);
  let cancelled = false;
  if (o.reduced) { await play('evo_reduced_motion', (i) => { base(A0); overlay('evo_reduced_motion', i, mOld); }); if (live && stopNow()) { base(A0); cancelled = true; } else base(A1); }
  else {
    await play('evo_veins_grow', (i) => { base(A0); overlay('evo_veins_grow', i, mOld); });
    const loops = Math.max(1, Math.round((o.hold ?? 1332) / set.evo_veins_hold.total));
    for (let l = 0; l < loops && !(live && stopNow()); l++) await play('evo_veins_hold', (i) => { base(A0); overlay('evo_veins_hold', i, mOld); });
    if (stopNow()) { await play('evo_cancel', (i) => { base(A0); overlay('evo_cancel', i, mOld); }); base(A0); cancelled = true; }
    else {
      const RR = H.reveal?.REVEAL_R || [16, 32, 48, 64, 80, 96, 112, 128, 144, 160], a = set.evo_reveal_front;
      const upto = a.frames.map((_, i) => i).filter((i, n, arr) => n === 0 || RR[arr[n - 1]] < Rmax + 6); // stop rule
      await play('evo_reveal_front', (i) => { mix(RR[i] ?? 999); overlay('evo_reveal_front', i, mBoth); }, upto);
      await play('evo_ring_burst', (i) => { base(A1); overlay('evo_ring_burst', i, null); });
      base(A1);
    }
  }
  if (!cancelled) msg.textContent = fill(T.end);
  return { from: old.id, to: cancelled ? old.id : nw.id, steps, cancelled, ms: Math.round(performance.now() - t0), el: st, close: () => st.remove() };
}

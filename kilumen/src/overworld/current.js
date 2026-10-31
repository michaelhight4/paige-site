// Tide currents (Gary, Oct 31 2026: "one way water paths should have a rushing tide that pushes the player when they try to go
// against it"). No one-way water existed (v0.2.97 made all water ride-only, not one-way), so this is new; the sweep reuses the
// hall push-tile pattern (progression/hall_v2.js: onArrive -> mover._attempt(dir) -> 'stop'). No outside code used.
// Data: map.json `currents: {"x,y": "up"|"down"|"left"|"right"}` on water cells (code 3 / 11; Tideglide rides them).
//  - stepping onto (or across: the first square always drifts) a current cell sweeps the rider square by square in the flow direction until it ends;
//  - pressing against the flow bounces the rider back one square downstream (splash sfx + ripple), then the sweep goes on;
//  - a sideways press into free calm (non-current) water beside the current escapes it; the push stops on calm water.
//  - the overlay (drawCurrents) streaks move with the flow; reduced motion draws static chevrons only (push still works).
// Input: uses the existing d-pad/keys only; nothing here is tap- or hold-activated, so no new touch gesture can move anyone.
import { Col, DELTA, TILE } from './constants.js?v=v0.2.103-alpha';

export const OPP = Object.freeze({ up: 'down', down: 'up', left: 'right', right: 'left' });
const WET = new Set([Col.WATER, Col.DEEP_WATER]);

/** Flow direction of the cell, or null. Accepts a GameMap (json/def) or raw map json. */
export function currentAt(m, x, y) {
  const c = (m?.json || m?.def || m)?.currents; const d = c?.[x + ',' + y];
  return d && DELTA[d] ? d : null;
}

/** Calm water = water cell with no current, in bounds, no NPC. */
export function isCalm(m, x, y) {
  if (m.inBounds && !m.inBounds(x, y)) return false;
  if (m.npcAt?.(x, y)) return false;
  return WET.has(m.code(x, y)) && !currentAt(m, x, y);
}

/** Pure: what the current does to a rider standing on (x,y) who holds `held` (or null). -> dir to move, or null (not a current). */
export function sweepDir(m, x, y, held) {
  const f = currentAt(m, x, y); if (!f) return null;
  if (held && held !== f && held !== OPP[f]) { const d = DELTA[held]; if (isCalm(m, x + d.x, y + d.y)) return held; } // escape sideways
  return f;
}

/** Pure: is a step from (x,y) in dir against the flow of the cell the rider is on? */
export const against = (m, x, y, dir) => { const f = currentAt(m, x, y); return !!f && dir === OPP[f]; };

/** Wire into scene.worldApi (outermost, after overnight/field so water is already floor while gliding). */
export function attachCurrents(scene) {
  if (!scene || typeof scene.worldApi !== 'function') return;
  const wa = scene.worldApi.bind(scene);
  scene.worldApi = () => {
    const w = wa(), m = scene.map; if (!m || !(m.json || m.def)?.currents) return w;
    const isP = (mv) => !mv || mv === scene.player;
    const out = { ...w };
    out.query = (x, y, dir, mode) => {
      const p = scene.player;
      if (p && p.x === x && p.y === y && against(m, x, y, dir)) return { type: 'block', code: Col.WATER, current: true };
      return w.query(x, y, dir, mode);
    };
    out.onBump = (x, y, dir, who, q) => {
      if (q?.current && isP(who)) { // bounce back one square downstream
        const p = scene.player, f = currentAt(m, x, y);
        scene.audio?.sfx?.('bump'); scene.rustles?.set?.(x + ',' + y, scene.ms);
        scene.log?.push({ tick: scene.tick, type: 'current_push', at: [x, y], flow: f });
        p.state = 'idle'; p.t = 0; p._attempt(f, out, []); if (p.state === 'step') { p.facing = OPP[f]; scene._tideSwept = true; } // keep facing upstream: pushed back, not turned
        return;
      }
      return w.onBump?.(x, y, dir, who, q);
    };
    out.onArrive = (x, y, mover, how) => {
      const r = w.onArrive?.(x, y, mover, how); if (r === 'stop' || !isP(mover)) return r;
      const p = scene.player, swept = scene._tideSwept; scene._tideSwept = false;
      const d = sweepDir(m, x, y, swept ? p.holdDir || null : null); if (!d) return r; // entering always drifts one square first
      const keepFace = p.facing; p._attempt(d, out, []);
      if (p.state !== 'step' && p.state !== 'hop') { p.state = 'idle'; p.t = 0; p.facing = keepFace; return r; } // current ends at a wall
      scene._tideSwept = true;
      if (p.holdDir === OPP[d]) { scene.audio?.sfx?.('bump'); scene.rustles?.set?.(x + ',' + y, scene.ms); scene.log?.push({ tick: scene.tick, type: 'current_push', at: [x, y], flow: d }); p.facing = OPP[d]; } // pushing upstream: splash, pushed back facing the press
      scene.log?.push({ tick: scene.tick, type: 'current_sweep', from: [x, y], dir: d });
      return 'stop';
    };
    return out;
  };
}

/** Reduced motion: ?motion=reduce, the UI reduce class, or the OS setting. */
export function reducedMotion(v) {
  if (v?.life?.reducedMotion != null) return !!v.life.reducedMotion;
  const g = globalThis; if (g.document?.body?.classList?.contains('ui-reduce')) return true;
  try { return !!g.matchMedia?.('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

/** Rushing-flow overlay, drawn under characters. Streak offset = phase(ms) along the flow; static chevrons when reduced. */
export function drawCurrents(ctx, v) {
  const c = (v.map?.json || v.map?.def)?.currents; if (!c) return;
  const z = v.zoom, cam = v.cam, still = reducedMotion(v), ph = still ? 0 : ((v.ms || 0) / 450) % 1;
  ctx.save();
  for (const [k, dir] of Object.entries(c)) {
    const [x, y] = k.split(',').map(Number), d = DELTA[dir]; if (!d) continue;
    const sx = (x * TILE - cam.x) * z, sy = (y * TILE - cam.y) * z, S = TILE * z;
    if (sx < -S || sy < -S || sx > ctx.canvas.width || sy > ctx.canvas.height) continue;
    ctx.fillStyle = 'rgba(20,70,140,0.45)'; ctx.fillRect(sx, sy, S, S);
    const h = !!d.x, sgn = h ? d.x : d.y;
    if (still) { // static chevron pointing downstream
      ctx.strokeStyle = 'rgba(230,248,255,0.7)'; ctx.lineWidth = Math.max(1, 3 * z / 2); ctx.beginPath();
      const cx = sx + S / 2, cy = sy + S / 2, a = S * 0.18;
      if (h) { ctx.moveTo(cx - sgn * a, cy - a); ctx.lineTo(cx + sgn * a, cy); ctx.lineTo(cx - sgn * a, cy + a); }
      else { ctx.moveTo(cx - a, cy - sgn * a); ctx.lineTo(cx, cy + sgn * a); ctx.lineTo(cx + a, cy - sgn * a); }
      ctx.stroke(); continue;
    }
    ctx.fillStyle = 'rgba(240,252,255,0.9)';
    for (let i = 0; i < 4; i++) { // 4 lanes of streaks, each lane offset so they don't march in step
      const lane = (i + 0.5) / 4, t = ((ph + i * 0.37) % 1) * 1.4 - 0.4, along = (sgn > 0 ? t : 1 - t), len = 0.45;
      const a0 = Math.max(0, along - (sgn > 0 ? len : 0)), a1 = Math.min(1, along + (sgn > 0 ? 0 : len)); if (a1 <= a0) continue;
      const th = Math.max(2, S * 0.05);
      if (h) ctx.fillRect(sx + a0 * S, sy + lane * S - th / 2, (a1 - a0) * S, th);
      else ctx.fillRect(sx + lane * S - th / 2, sy + a0 * S, th, (a1 - a0) * S);
    }
  }
  ctx.restore();
}

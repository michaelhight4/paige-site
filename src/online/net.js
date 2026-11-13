// Pure networking helpers (no DOM): send throttle, snapshot interpolation, block/mute list.
// Unit-tested in tests/online.test.mjs.

/**
 * Throttle pumped from the game loop (no timers, so it is deterministic and testable).
 * push(value, now) returns the value to send now or null; a value pushed during the cooldown is
 * kept and returned by poll(now) once the cooldown ends (trailing edge, latest value wins).
 */
export class Throttle {
  constructor(intervalMs) { this.interval = intervalMs; this.last = -Infinity; this.pending = null; }
  push(value, now) {
    if (now - this.last >= this.interval) { this.last = now; this.pending = null; return value; }
    this.pending = value; return null;
  }
  poll(now) {
    if (this.pending != null && now - this.last >= this.interval) { const v = this.pending; this.pending = null; this.last = now; return v; }
    return null;
  }
}

/** Do two snapshots look the same to a watcher? (Skip sending when nothing changed.) */
export function sameSnap(a, b) {
  return !!a && !!b && a.map === b.map && a.px === b.px && a.py === b.py && a.f === b.f && a.a === b.a && a.l === b.l;
}

/**
 * Snapshot interpolation for one remote player. Snapshots carry the sender's clock (t, ms).
 * The receiver estimates the clock offset from the fastest-arriving sample, then draws the player
 * at (now - offset - delay) in the sender's timeline, blending the two snapshots around that time.
 * A jump larger than teleportPx (door, warp, map change) snaps instead of sliding.
 */
export class Interp {
  constructor({ delayMs = 180, teleportPx = 192, max = 32 } = {}) {
    this.delay = delayMs; this.teleport = teleportPx; this.max = max; this.buf = []; this.offset = null;
  }
  push(snap, recvNow) {
    const off = recvNow - snap.t;
    this.offset = this.offset == null ? off : Math.min(this.offset, off);
    const b = this.buf;
    if (b.length && snap.t <= b[b.length - 1].t) { // out of order or duplicate: insert in place, drop exact dup
      if (b.some((s) => s.t === snap.t)) return;
      b.push(snap); b.sort((x, y) => x.t - y.t);
    } else b.push(snap);
    if (b.length > this.max) b.splice(0, b.length - this.max);
  }
  latest() { return this.buf[this.buf.length - 1] || null; }
  /** Position at local time now: { px, py, l, f, a, map, moving } or null before the first snapshot. */
  sample(now) {
    const b = this.buf; if (!b.length) return null;
    const rt = now - this.offset - this.delay;
    if (rt <= b[0].t) return { ...b[0], moving: false };
    for (let i = b.length - 1; i > 0; i--) {
      const s0 = b[i - 1], s1 = b[i];
      if (rt >= s0.t && rt <= s1.t) {
        // drop history we no longer need (keep s0)
        if (i - 1 > 0) { b.splice(0, i - 1); }
        if (s0.map !== s1.map || Math.abs(s1.px - s0.px) + Math.abs(s1.py - s0.py) > this.teleport) return { ...s1, moving: false };
        const k = s1.t === s0.t ? 1 : (rt - s0.t) / (s1.t - s0.t);
        const moving = s0.px !== s1.px || s0.py !== s1.py;
        return { ...s1, px: Math.round(s0.px + (s1.px - s0.px) * k), py: Math.round(s0.py + (s1.py - s0.py) * k), l: Math.round((s0.l || 0) + ((s1.l || 0) - (s0.l || 0)) * k), f: s1.f, moving };
      }
    }
    return { ...b[b.length - 1], moving: false }; // past the newest snapshot: hold (no extrapolation)
  }
}

/**
 * Block and mute list. Block = persistent, hides the player and everything they send.
 * Mute = this session only, hides their chat but still shows them walking around.
 * storage is anything with getItem/setItem (localStorage in the game, a Map shim in tests).
 */
export class SafetyList {
  constructor(storage = null, key = 'kilumen.online.blocked.v1') {
    this.storage = storage; this.key = key; this.muted = new Set(); this.blocked = new Set();
    try { const raw = storage?.getItem(key); if (raw) for (const id of JSON.parse(raw)) if (typeof id === 'string') this.blocked.add(id); } catch { /* corrupt list: start empty */ }
  }
  _save() { try { this.storage?.setItem(this.key, JSON.stringify([...this.blocked])); } catch { /* storage full/blocked */ } }
  block(id) { this.blocked.add(id); this.muted.delete(id); this._save(); }
  unblock(id) { this.blocked.delete(id); this._save(); }
  mute(id) { this.muted.add(id); }
  unmute(id) { this.muted.delete(id); }
  isBlocked(id) { return this.blocked.has(id); }
  isMuted(id) { return this.muted.has(id); }
  /** Should this player's sprite be hidden? */
  hides(id) { return this.blocked.has(id); }
  /** Should this player's chat be hidden? */
  silences(id) { return this.blocked.has(id) || this.muted.has(id); }
}

/** Rate limit for our own chat sends. */
export class Cooldown {
  constructor(ms) { this.ms = ms; this.last = -Infinity; }
  ready(now) { return now - this.last >= this.ms; }
  take(now) { if (!this.ready(now)) return false; this.last = now; return true; }
}

/** Which shard should a joiner take? Players are ranked by (joinedAt, id); the first cap stay. */
export function rankIn(peers, me) {
  const key = (p) => [p.joinedAt || 0, p.id];
  const [mj, mi] = key(me);
  return peers.filter((p) => { const [j, i] = key(p); return j < mj || (j === mj && i < mi); }).length;
}

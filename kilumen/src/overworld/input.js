// Kilumen overworld: input. Keyboard always; standard-mapping gamepads; an on-screen D-pad + A button
// for touch. Everything is reduced to {dir (latest held wins), a (edge), b (held), select (edge), debug (edge)}.
// Gamepad (standard mapping): d-pad/left stick, A = 0, B = 1 (hold to run), Select = 8 (bike), L3 = 10 (debug).
const KEY_DIR = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
};
const KEY_A = new Set(['KeyZ', 'Space', 'Enter', 'KeyF']); // F: PC talk / read / check (Gary 11:31 AM CT Oct 23); Z / Space / Enter still work
const KEY_B = new Set(['KeyX', 'ShiftLeft', 'ShiftRight', 'Escape']); // B: hold to run (MOVEMENT.md, needs has_run_shoes)
const KEY_SELECT = new Set(['KeyC', 'Backspace']);            // Select: bike on/off (MOVEMENT.md, needs has_bike)
const KEY_DEBUG = new Set(['F3', 'Backquote']);
const PAD_DIR = { 12: 'up', 13: 'down', 14: 'left', 15: 'right' };
const STICK_DEAD = 0.6;     // radial dead zone (was 0.5 per axis, no recentre check: a drifting stick could hold 'down')
const STICK_CENTRE = 0.25;  // a pad's stick is ignored until it has once read inside this after connect (drift guard)
// Stuck-input guards (Gary 1:04 PM CT Oct 23, 2026: "walk south on his own even when i press up"; a missed KeyS keyup).
const KEY_STALE_MS = 1000;  // keyboard dir with no keydown (repeat or not) for this long is dropped, once OS key repeat is known
const TOUCH_STALE_MS = 1500; // touch dir with no pointer events for this long while not pressed (buttons / pressure 0) is dropped
const now = () => (globalThis.performance?.now ? globalThis.performance.now() : Date.now());
const editable = (t) => !!(t && t.closest && (t.isContentEditable || t.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"], .kil-devpanel')));

export class Input {
  constructor(target = window) {
    this.held = [];            // held directions, most recent last
    this.sources = new Map();  // source id -> dir (keyboard key, touch pointer, pad)
    this.aQueued = false; this.debugQueued = false; this.selQueued = false; this.kbB = false; this.padB = false; this.touchB = false; this.bQueued = false; // bQueued: a B press seen this frame (dialogue cancel), even if released before the frame
    this.padPrev = new Map();
    this.dirQueued = null;     // touch: a d-pad press seen this frame, so a tap shorter than a frame still turns / steps / moves a list
    this.lastDevice = null;    // 'keyboard' | 'controller' | 'touch': last device used (dialogue prompts, platform.js promptVars)
    this.now = now;            // clock (tests swap it)
    this.keySeen = new Map();  // 'k:Code' -> last keydown / keep-alive time (stuck-key guard)
    this.kbRepeat = null;      // learned OS key repeat {delay, interval} (ms); null = no repeat seen yet (or repeat off): no timeout
    this.ptr = new Map();      // 'p:id' -> {t, pressed} last pointer event for a held touch dir (stale-touch guard)
    this.padCentred = new Set(); // pad indexes whose stick has read near centre since connect
    this._kd = (e) => this._key(e, true);
    this._ku = (e) => this._key(e, false);
    this._kdCap = (e) => this._keepAlive(e);
    this._kuCap = (e) => this._keyUpAny(e);
    this._blur = () => { this.sources.clear(); this.keySeen.clear(); this.ptr.clear(); this._rebuild(); this.kbB = false; this.touchB = false; this._bPointer = null; this.dirQueued = null; };
    this._clearKeys = () => { for (const k of [...this.sources.keys()]) if (k.startsWith('k:')) this.sources.delete(k); this.keySeen.clear(); this.kbB = false; this._rebuild(); };
    // Releases are capture phase, so an overlay that stops keyup (online.js chat input, ui/devpanel.js lil-gui panel) or
    // takes focus mid-hold can no longer leave a direction held. Presses stay bubble phase on purpose: overlays that stop
    // keydown (hall puzzle preview in progression/index.js, chat typing, dev panel) must keep the player still.
    target.addEventListener('keydown', this._kdCap, { capture: true });
    target.addEventListener('keyup', this._kuCap, { capture: true });
    target.addEventListener('keydown', this._kd);
    target.addEventListener('keyup', this._ku);
    const win = globalThis.window, doc = globalThis.document;
    win?.addEventListener?.('blur', this._blur);
    win?.addEventListener?.('focus', this._clearKeys); // PC too: keys held while away have no trustworthy state
    if (doc?.addEventListener) doc.addEventListener('visibilitychange', () => { if (doc.hidden) this._clearKeys(); });
    win?.addEventListener?.('gamepaddisconnected', (e) => this._padGone(e.gamepad?.index));
    win?.addEventListener?.('gamepadconnected', (e) => this._padGone(e.gamepad?.index)); // fresh pad: must recentre again
    this.target = target;
  }

  /** Capture-phase keydown (sees every keydown, even ones an overlay then stops): stuck-key keep-alive. The OS repeats only
   *  the newest held key, so any keydown keeps every held keyboard direction alive; repeats also teach the repeat timing. */
  _keepAlive(e) {
    const t = this.now(), src = 'k:' + e.code;
    if (e.repeat && this.sources.has(src)) {
      const prev = this.keySeen.get(src) ?? t, gap = t - prev, r = this.kbRepeat || (this.kbRepeat = { delay: 0, interval: 0 });
      if (!this._repeated?.has(src)) { r.delay = Math.max(r.delay, gap); (this._repeated ||= new Set()).add(src); } else r.interval = Math.max(r.interval * 0.9, gap);
    }
    for (const k of this.keySeen.keys()) this.keySeen.set(k, t);
  }

  /** Capture-phase keyup: any keyup for a key code anywhere releases it, whoever stops it later. */
  _keyUpAny(e) {
    const code = e.code, src = 'k:' + code;
    if (KEY_DIR[code]) { this.keySeen.delete(src); this._repeated?.delete(src); this._release(src); }
    if (KEY_B.has(code)) this.kbB = false;
    // macOS sends no keyup for keys released while Cmd is held: drop held directions when Cmd goes up (a still-held key
    // comes back on its next repeat keydown, see _key)
    if (code === 'MetaLeft' || code === 'MetaRight' || code === 'OSLeft' || code === 'OSRight') this._clearKeys();
    const t = this.now(); for (const k of this.keySeen.keys()) this.keySeen.set(k, t); // the key held under it gets a fresh window
  }

  /** Called from poll(): drop keyboard directions whose key has gone quiet (missed keyup). Only once OS key repeat has been
   *  seen this session (repeat off / not learned yet = never time out), and never sooner than 1.5x the learned repeat delay
   *  or 2.5x the repeat interval, so slow repeat settings still hold fine. */
  _dropStaleKeys() {
    return; // v0.2.15 (Gary: holding W stops): no hold timeout. Letter keys may not auto-repeat (macOS press-and-hold), so the
    // learned repeat timing from arrow keys dropped a still-held W. Keys now release only on keyup, blur, focus or hidden page.
    if (!this.kbRepeat || !this.keySeen.size) return;
    const t = this.now(), r = this.kbRepeat, limit = Math.max(KEY_STALE_MS, r.delay * 1.5 + 100, r.interval * 2.5);
    for (const [k, seen] of this.keySeen) if (t - seen > limit) { this.keySeen.delete(k); this._repeated?.delete(k); this._release(k); }
  }

  _key(e, down) {
    const code = e.code;
    if (down && editable(e.target)) return; // typing in a text field / the dev panel never moves the player
    if (down && (KEY_DIR[code] || KEY_A.has(code) || KEY_B.has(code) || KEY_SELECT.has(code) || KEY_DEBUG.has(code))) this.lastDevice = 'keyboard';
    if (KEY_DIR[code]) {
      e.preventDefault();
      if (!down) { this._release('k:' + code); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return; // Ctrl/Cmd+S etc. are browser shortcuts (save dialog steals the keyup)
      const src = 'k:' + code;
      if (!e.repeat || !this.sources.has(src)) { this._press(src, KEY_DIR[code]); this.keySeen.set(src, this.now()); } // a repeat re-adds a key dropped while still held
      return;
    }
    if (KEY_A.has(code)) { e.preventDefault(); if (down && !e.repeat) this.aQueued = true; return; }
    if (KEY_B.has(code)) { if (down && !e.repeat) this.bQueued = true; this.kbB = down; return; }
    if (KEY_SELECT.has(code)) { e.preventDefault(); if (down && !e.repeat) this.selQueued = true; return; }
    if (KEY_DEBUG.has(code)) { e.preventDefault(); if (down && !e.repeat) this.debugQueued = true; }
  }

  _press(src, dir) { this.sources.delete(src); this.sources.set(src, dir); this._rebuild(); }
  _release(src) { if (this.sources.delete(src)) this._rebuild(); }
  _rebuild() { this.held = [...this.sources.values()]; }

  /** Attach a touch D-pad: elements with data-dir="up|down|left|right" and data-btn="a|debug". */
  attachTouch(root) {
    const dirAt = (x, y) => document.elementFromPoint(x, y)?.closest?.('[data-dir]')?.dataset.dir || null;
    root.addEventListener('pointerdown', (e) => {
      this.lastDevice = 'touch';
      const btn = e.target.closest('[data-btn]');
      if (btn) {
        e.preventDefault();
        const b = btn.dataset.btn;
        if (b === 'a') this.aQueued = true; else if (b === 'debug') this.debugQueued = true;
        else if (b === 'select') this.selQueued = true; else if (b === 'b') { this.touchB = true; this.bQueued = true; this._bPointer = e.pointerId; }
        return;
      }
      const d = dirAt(e.clientX, e.clientY);
      if (!d) return;
      e.preventDefault();
      try { root.setPointerCapture?.(e.pointerId); } catch { /* pointer already gone (lifted / cancelled before this ran): keep the press, the up/cancel handlers clear it */ }
      this._press('p:' + e.pointerId, d); this.dirQueued = d; this._ptrSeen(e);
    });
    root.addEventListener('pointermove', (e) => {
      if (!this.sources.has('p:' + e.pointerId)) return;
      this._ptrSeen(e);
      const d = dirAt(e.clientX, e.clientY); // slide between arrows without lifting the thumb
      if (d && d !== this.sources.get('p:' + e.pointerId)) { this._press('p:' + e.pointerId, d); this.dirQueued = d; }
    });
    const up = (e) => { this._release('p:' + e.pointerId); if (e.pointerId === this._bPointer) { this.touchB = false; this._bPointer = null; } };
    root.addEventListener('pointerup', up);
    root.addEventListener('pointercancel', up);
    root.addEventListener('lostpointercapture', up); // touchpad re-rendered / capture lost: no pointerup will come to root
    const win = globalThis.window; // a lift that lands outside the pad (capture already lost) still releases
    win?.addEventListener?.('pointerup', up, { capture: true });
    win?.addEventListener?.('pointercancel', up, { capture: true });
    this._touchRoot = root;
    root.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  _ptrSeen(e) {
    // buttons first (0 = nothing down), else pressure (0 = hovering); neither reported = assume pressed (never drop early)
    const pressed = typeof e.buttons === 'number' ? e.buttons !== 0 : typeof e.pressure === 'number' ? e.pressure > 0 : true;
    this.ptr.set('p:' + e.pointerId, { t: this.now(), pressed });
  }

  /** Called from poll(): drop touch directions that can't still be held: the pad element left the page, or no pointer
   *  event for 1.5 s while the last one said not pressed (buttons / pressure 0). A finger resting still stays held. */
  _dropStaleTouch() {
    if (!this.ptr.size && !this._touchRoot) return;
    const t = this.now(), gone = this._touchRoot && this._touchRoot.isConnected === false;
    for (const k of [...this.sources.keys()]) {
      if (!k.startsWith('p:')) continue;
      const p = this.ptr.get(k);
      if (gone || (p && !p.pressed && t - p.t > TOUCH_STALE_MS)) { this.ptr.delete(k); this._release(k); }
    }
    for (const k of [...this.ptr.keys()]) if (!this.sources.has(k)) this.ptr.delete(k);
  }

  /** Phones only (main.js, profile.controls.touch): drop held input when the page is hidden / left / rotated, and block
   *  page gestures the CSS can't (iOS pinch "gesture*" events, double-tap, long-press menu and selection). Touch e2e, Oct 22, 2026. */
  guardTouchPage(win = window) {
    const doc = win.document, clear = () => this._blur();
    doc.addEventListener('visibilitychange', () => { if (doc.hidden) clear(); });
    win.addEventListener('pagehide', clear);
    win.addEventListener('orientationchange', clear);
    win.screen?.orientation?.addEventListener?.('change', clear);
    const stop = (e) => { if (e.cancelable) e.preventDefault(); };
    for (const t of ['contextmenu', 'selectstart', 'dblclick', 'gesturestart', 'gesturechange', 'gestureend']) doc.addEventListener(t, stop, { passive: false });
    doc.addEventListener('touchmove', (e) => { if (e.touches.length > 1 && !e.target.closest?.('#touchpad')) stop(e); }, { passive: false }); // two-finger pinch on the game
  }

  /** A pad went away (or reconnected): release its direction and forget its state, so a stale 'down' can't persist. */
  _padGone(index) {
    if (index === undefined || index === null) return;
    this._release('g' + index); this.padPrev.delete(index); this.padCentred.delete(index);
  }

  _pollPads() {
    const pads = (globalThis.navigator?.getGamepads ? globalThis.navigator.getGamepads() : null) || [];
    this.padB = false;
    const live = new Set();
    for (const p of pads) {
      if (!p || p.mapping !== 'standard' || p.connected === false) continue;
      const id = 'g' + p.index;
      live.add(id);
      let dir = null;
      for (const [b, d] of Object.entries(PAD_DIR)) if (p.buttons[b]?.pressed) dir = d;
      const ax = p.axes?.[0] || 0, ay = p.axes?.[1] || 0;
      if (Math.abs(ax) < STICK_CENTRE && Math.abs(ay) < STICK_CENTRE) this.padCentred.add(p.index); // drift guard: stick seen at rest
      if (!dir && this.padCentred.has(p.index) && Math.hypot(ax, ay) > STICK_DEAD)
        dir = Math.abs(ax) > Math.abs(ay) ? (ax > 0 ? 'right' : 'left') : (ay > 0 ? 'down' : 'up');
      if (dir !== (this.sources.get(id) ?? null)) { if (dir) this._press(id, dir); else this._release(id); }
      const prev = this.padPrev.get(p.index) || {};
      const a = !!p.buttons[0]?.pressed, sel = !!p.buttons[8]?.pressed, dbg = !!p.buttons[10]?.pressed;
      if (a && !prev.a) this.aQueued = true;
      if (sel && !prev.sel) this.selQueued = true;
      if (dbg && !prev.dbg) this.debugQueued = true;
      this.padB = this.padB || !!p.buttons[1]?.pressed;
      if (dir || a || sel || dbg || p.buttons[1]?.pressed) this.lastDevice = 'controller';
      this.padPrev.set(p.index, { a, sel, dbg });
    }
    for (const k of [...this.sources.keys()]) if (k.startsWith('g') && !live.has(k)) this._padGone(Number(k.slice(1))); // pad missing from getGamepads()
  }

  /** Call once per frame. Returns the frame's input snapshot; edge-triggered buttons are consumed. */
  poll() {
    this._pollPads();
    this._dropStaleKeys(); this._dropStaleTouch();
    const snap = { dir: this.held.length ? this.held[this.held.length - 1] : this.dirQueued, a: this.aQueued, b: this.kbB || this.padB || this.touchB, bTap: this.bQueued, select: this.selQueued, debug: this.debugQueued };
    this.aQueued = false; this.debugQueued = false; this.selQueued = false; this.bQueued = false; this.dirQueued = null;
    return snap;
  }
}

// Kilumen overworld: input. Keyboard always; standard-mapping gamepads; an on-screen D-pad + A button
// for touch. Everything is reduced to {dir (latest held wins), a (edge), b (held), select (edge), debug (edge)}.
// Gamepad (standard mapping): d-pad/left stick, A = 0, B = 1 (hold to run), Select = 8 (bike), L3 = 10 (debug).
const KEY_DIR = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
};
const KEY_A = new Set(['KeyZ', 'Space', 'Enter']);
const KEY_B = new Set(['KeyX', 'ShiftLeft', 'ShiftRight']); // B: hold to run (MOVEMENT.md, needs has_run_shoes)
const KEY_SELECT = new Set(['KeyC', 'Backspace']);            // Select: bike on/off (MOVEMENT.md, needs has_bike)
const KEY_DEBUG = new Set(['F3', 'Backquote']);
const PAD_DIR = { 12: 'up', 13: 'down', 14: 'left', 15: 'right' };
const STICK_DEAD = 0.5;

export class Input {
  constructor(target = window) {
    this.held = [];            // held directions, most recent last
    this.sources = new Map();  // source id -> dir (keyboard key, touch pointer, pad)
    this.aQueued = false; this.debugQueued = false; this.selQueued = false; this.kbB = false; this.padB = false; this.touchB = false; this.bQueued = false; // bQueued: a B press seen this frame (dialogue cancel), even if released before the frame
    this.padPrev = new Map();
    this.dirQueued = null;     // touch: a d-pad press seen this frame, so a tap shorter than a frame still turns / steps / moves a list
    this.lastDevice = null;    // 'keyboard' | 'controller' | 'touch': last device used (dialogue prompts, platform.js promptVars)
    this._kd = (e) => this._key(e, true);
    this._ku = (e) => this._key(e, false);
    this._blur = () => { this.sources.clear(); this._rebuild(); this.kbB = false; this.touchB = false; this._bPointer = null; this.dirQueued = null; };
    target.addEventListener('keydown', this._kd);
    target.addEventListener('keyup', this._ku);
    window.addEventListener('blur', this._blur);
    this.target = target;
  }

  _key(e, down) {
    const code = e.code;
    if (down && (KEY_DIR[code] || KEY_A.has(code) || KEY_B.has(code) || KEY_SELECT.has(code) || KEY_DEBUG.has(code))) this.lastDevice = 'keyboard';
    if (KEY_DIR[code]) {
      e.preventDefault();
      if (down) { if (!e.repeat) this._press('k:' + code, KEY_DIR[code]); } else this._release('k:' + code);
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
      this._press('p:' + e.pointerId, d); this.dirQueued = d;
    });
    root.addEventListener('pointermove', (e) => {
      if (!this.sources.has('p:' + e.pointerId)) return;
      const d = dirAt(e.clientX, e.clientY); // slide between arrows without lifting the thumb
      if (d && d !== this.sources.get('p:' + e.pointerId)) { this._press('p:' + e.pointerId, d); this.dirQueued = d; }
    });
    const up = (e) => { this._release('p:' + e.pointerId); if (e.pointerId === this._bPointer) { this.touchB = false; this._bPointer = null; } };
    root.addEventListener('pointerup', up);
    root.addEventListener('pointercancel', up);
    root.addEventListener('contextmenu', (e) => e.preventDefault());
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

  _pollPads() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    this.padB = false;
    for (const p of pads) {
      if (!p || p.mapping !== 'standard') continue;
      const id = 'g' + p.index;
      let dir = null;
      for (const [b, d] of Object.entries(PAD_DIR)) if (p.buttons[b]?.pressed) dir = d;
      if (!dir) {
        const [ax, ay] = p.axes;
        if (Math.abs(ax) > STICK_DEAD || Math.abs(ay) > STICK_DEAD)
          dir = Math.abs(ax) > Math.abs(ay) ? (ax > 0 ? 'right' : 'left') : (ay > 0 ? 'down' : 'up');
      }
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
  }

  /** Call once per frame. Returns the frame's input snapshot; edge-triggered buttons are consumed. */
  poll() {
    this._pollPads();
    const snap = { dir: this.held.length ? this.held[this.held.length - 1] : this.dirQueued, a: this.aQueued, b: this.kbB || this.padB || this.touchB, bTap: this.bQueued, select: this.selQueued, debug: this.debugQueued };
    this.aQueued = false; this.debugQueued = false; this.selQueued = false; this.bQueued = false; this.dirQueued = null;
    return snap;
  }
}

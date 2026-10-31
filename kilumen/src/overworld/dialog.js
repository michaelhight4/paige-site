// Kilumen: dialogue box (DOM over the canvas). Promise-based so scene scripts read top to bottom:
//   await dlg.say(pages, speaker)          A advances a page (B too)
//   const i = await dlg.ask(pages, choices, speaker)   up/down + A; B picks the last choice (No)
//   await dlg.inbox(emails, isRead, markRead)          up/down + A opens; B goes back / closes
// speaker = {name, portrait (url, one frame), battle (url of the 64x128 trainer sprite), zoom, thought (inner monologue style)}
// Input comes from the scene each tick (handle(snap)), so it shares the game's keyboard / pad / touch mapping.

/**
 * Which touch controls are hidden for a dialogue state (profile controls.hideDuringDialog / showDpadForLists).
 * @returns {{hide: string[], listDpad: boolean}} hide = control names ('dpad' | 'sel' | 'dbg' | ...); listDpad = show d-pad up/down again
 */
import { onTap } from '../shared/tap_guard.js?v=v0.2.104-alpha'; // touch input standard
export function touchControlsFor(controls, { open = false, list = false } = {}) {
  const names = (open && controls?.hideDuringDialog) || [];
  const extra = (open && list && controls?.hideDuringLists) || []; // phone menu fix (Oct 23, 2026): rows are tapped, so A/B fade too
  return { hide: [...names, ...extra.filter((n) => !names.includes(n))], listDpad: !!(open && list && controls?.showDpadForLists && names.includes('dpad')) };
}

/**
 * Full-size phone dialogue box (profile hud.dialogFull). Rects in CSS px; `left` / `right` = the visible touch controls on each side.
 * Candidate 'beside': from the left edge (or just right of a visible left control) to just left of the right controls, at the bottom.
 * Candidate 'above': full width, just above every visible control. 'beside' wins unless it is narrower than minWidthPx
 * (listMinWidthPx while a list is open); then 'above' (the caller falls back to 'beside' if 'above' does not fit vertically).
 */
export function dialogBoxCandidates(F, { W, H, safe = {}, left = [], right = [], list = false }) {
  const m = F.marginPx ?? 8, g = F.gapPx ?? 8, maxW = F.maxWidthPx ?? Infinity;
  const sL = safe.left || 0, sR = safe.right || 0, sB = safe.bottom || 0;
  const fit = (l, r, bottom, kind) => { const w = Math.min(maxW, r - l); return { kind, left: l + (r - l - w) / 2, width: w, bottom }; };
  const lEdge = Math.max(sL + m, ...left.map((b) => b.right + g)), rEdge = Math.min(W - sR - m, ...right.map((b) => b.left - g));
  const beside = fit(lEdge, rEdge, sB + m, 'beside');
  const all = [...left, ...right];
  const above = fit(sL + m, W - sR - m, all.length ? H - Math.min(...all.map((b) => b.top)) + g : sB + m, 'above');
  const minW = list ? (F.listMinWidthPx ?? F.minWidthPx ?? 0) : (F.minWidthPx ?? 0);
  return { beside, above, prefer: beside.width >= minW ? 'beside' : 'above' };
}

export class Dialog {
  /**
   * @param {object} [layout] the platform profile's hud (optional): hud.battleImage {fit:'aboveDialog', gapPx, topMarginPx, minScale,
   *   maxScale} sizes the trainer image in whole device px per art px and sits it above the box (unset = the old 64*zoom CSS px);
   *   hud.toastDuringDialog {gapPx, topMarginPx} lifts a toast shown while the box is open above it (unset = toast unchanged).
   * @param {HTMLElement} [toastEl] the #toast element (needed for toastDuringDialog).
   * @param {object} [controls] the platform profile's controls (optional): hideDuringDialog / showDpadForLists toggle body
   *   classes that fade the touch controls; tapDialog makes the box (and list rows) tappable. Unset (pc) = nothing changes.
   */
  constructor(root = document.body, layout = null, toastEl = null, controls = null) {
    this.layout = layout || {}; this.toastEl = toastEl; this.controls = controls || {}; this._tap = null;
    const el = (tag, cls, parent) => { const e = document.createElement(tag); if (cls) e.className = cls; parent?.appendChild(e); return e; };
    this.wrap = el('div', 'dlg-wrap', root); this.wrap.hidden = true;
    this.portrait = el('img', 'dlg-portrait', this.wrap); this.portrait.alt = '';
    this.battle = el('img', 'dlg-battle', this.wrap); this.battle.alt = '';
    this.box = el('div', 'dlg-box', this.wrap); this.box.setAttribute('role', 'dialog'); this.box.setAttribute('aria-live', 'polite');
    this.name = el('div', 'dlg-name', this.box);
    this.text = el('div', 'dlg-text', this.box);
    this.list = el('ul', 'dlg-list', this.box);
    this.more = el('div', 'dlg-more', this.box); this.more.textContent = '\u25BC';
    // Advance hint (Gary 2:10 PM CT Oct 23, 2026: "press f by the bottom right corner of speech bubbles"): F is an A key on PC;
    // touch profiles have no F key, so the box (tapDialog) is tapped. Shown by _hint(); style.css .dlg-hint. Visual only (aria-hidden).
    this.hint = el('div', 'dlg-hint', this.box); this.hint.hidden = true; this.hint.setAttribute('aria-hidden', 'true');
    this.hint.textContent = this.controls.touch || this.controls.tapDialog ? 'Tap' : 'Press F';
    // v0.2.12 back arrow (Gary: stuck in the company inbox): top-right of the box on inbox / choice lists; same as B.
    this.back = el('button', 'dlg-back', this.box); this.back.type = 'button'; this.back.hidden = true; this.back.textContent = '\u2190'; this.back.setAttribute('aria-label', 'Back');
    const goBack = (e) => { e.preventDefault(); e.stopPropagation(); if (this.cur) this._tap = { b: true }; };
    onTap(this.back, null, goBack, { stop: true }); this.back.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); }); // touch-ok: click handler; document drag guard (installDragGuard, tap_guard.js) swallows the click after a drag / hold; keeps keyboard Enter
    this.cur = null;
    this.shown = []; // every page shown (tests)
    root.ownerDocument?.defaultView?.addEventListener?.('resize', () => this._place());
    for (const img of [this.portrait, this.battle]) img.addEventListener?.('load', () => this._place()); // sizes known once loaded
    if (this.controls.tapDialog) {
      root.ownerDocument?.body?.classList.add('dlg-tap');
      // tap the box = A; tap a list row = pick that row. Queued here, applied on the next handle() tick like a button press.
      // touch standard: on a tap RELEASE (src/shared/tap_guard.js), so a drag that scrolls an inbox list never picks / advances.
      onTap(this.box, null, (e, _b, d) => {
        if (!this.cur || this.back.contains?.(d.target)) return;
        const li = d.target.closest?.('li[data-i]');
        this._tap = li ? { pick: +li.dataset.i } : { a: true };
      });
    } else {
      // gd bug 3 (Heal Centre menu had no mouse): on pc the choice / inbox rows take a click (= pick) and hover (= select),
      // like the ui.js menus (mousemove [data-i] -> select, pointerdown -> activate). The box itself still needs F / A.
      onTap(this.list, 'li[data-i]', (e, li) => { // click (release) = pick, never pointerdown (touch standard)
        if (!this.cur) return; e.stopPropagation(); this._tap = { pick: +li.dataset.i };
      });
      this.list.addEventListener?.('mousemove', (e) => {
        const li = e.target.closest?.('li[data-i]'); if (li) this._hover(+li.dataset.i);
      });
    }
  }

  get active() { return !!this.cur; }

  /** Mouse hover over a list row: move the selection there without rebuilding the list (gd bug 3). */
  _hover(i) {
    const c = this.cur; if (!c || this.list.hidden || !(i >= 0)) return;
    if (c.type === 'ask') { if (c.i < c.pages.length - 1 || i >= c.choices.length || c.sel === i) return; c.sel = i; }
    else if (c.type === 'inbox' && c.open == null) { if (i >= c.items.length || c.sel === i) return; c.sel = i; }
    else return;
    for (const li of this.list.querySelectorAll?.('li[data-i]') || []) li.classList.toggle('sel', +li.dataset.i === i);
  }

  _speaker(sp) {
    this.name.textContent = sp?.name || ''; this.name.hidden = !sp?.name;
    this.portrait.hidden = !sp?.portrait; if (sp?.portrait) this.portrait.src = sp.portrait;
    // playtest fixes 3: one picture per speaker: a portrait always wins over the 64x128 figure (Mags showed twice in the Revival hall)
    const fig = sp?.portrait ? null : sp?.battle;
    this.battle.hidden = !fig;
    if (fig) {
      this.battle.src = fig;
      if (this.layout.battleImage?.fit !== 'aboveDialog') { const z = sp.zoom || 2; this.battle.style.width = 64 * z + 'px'; this.battle.style.height = 128 * z + 'px'; }
    }
    this.wrap.classList.toggle('has-portrait', !!sp?.portrait);
    this.wrap.classList.toggle('thought', !!sp?.thought); // home start v1: inner monologue (no name, italic; style.css .dlg-wrap.thought)
  }

  _show() { this.wrap.hidden = false; requestAnimationFrame(() => this.wrap.classList.add('open')); }
  _close() { this.wrap.classList.remove('open'); this.wrap.hidden = true; this.cur = null; this._tap = null; if (this.back) this.back.hidden = true; this._hint(); this._controlsState(); this.placeToast(); }

  /** Press F / Tap hint: on while the page can be advanced, off while a choice / inbox list is open. While ui.js types the page
   *  out (.dlg-text .rv spans), style.css holds it back for --dlg-chars x --reveal-ms; each new page restarts that wait. */
  _hint() {
    const on = !!this.cur && this.list.hidden;
    if (on) { this.hint.hidden = true; void this.hint.offsetWidth; this.hint.style.setProperty('--dlg-chars', String([...this.text.textContent].length)); }
    this.hint.hidden = !on; this.box.classList.toggle('hint-on', on);
  }

  /** Profile controls.hideDuringDialog / showDpadForLists -> body classes tp-hide-<name> and tp-list-dpad (style.css fades them). */
  _controlsState() {
    const C = this.controls, body = this.wrap.ownerDocument?.body;
    if (!C.hideDuringDialog || !body) return;
    const st = touchControlsFor(C, { open: !!this.cur && !this.wrap.hidden, list: !!this.cur && !this.list.hidden });
    // Phone menu fix (Oct 23, 2026; Gary: the d-pad covered the title menu): _place() runs on every resize (iOS Safari fires
    // them as its bars slide), so never un-hide a control an open UI screen still owns (ui.js sets ui-hid-<name>).
    for (const n of new Set([...C.hideDuringDialog, ...(C.hideDuringLists || [])])) body.classList.toggle(`tp-hide-${n}`, st.hide.includes(n) || body.classList.contains(`ui-hid-${n}`));
    body.classList.toggle('tp-list-dpad', st.listDpad);
  }

  /** Touch buttons that stay visible in the current dialogue state, split into left / right of the screen centre. */
  _visibleControls(win) {
    const tp = this.wrap.ownerDocument.getElementById('touchpad');
    const out = { left: [], right: [] };
    if (!tp || tp.hidden) return out;
    const st = touchControlsFor(this.controls, { open: true, list: !this.list.hidden });
    const SEL = { dpad: '[data-dir]', sel: '[data-btn=select]', dbg: '[data-btn=debug]', a: '[data-btn=a]', b: '[data-btn=b]' };
    for (const b of tp.querySelectorAll('button')) {
      let hidden = st.hide.some((n) => SEL[n] && b.matches(SEL[n]));
      if (hidden && st.listDpad && b.matches('[data-dir=up],[data-dir=down]')) hidden = false;
      if (hidden) continue;
      const r = b.getBoundingClientRect();
      if (!r.width) continue;
      ((r.left + r.right) / 2 < win.innerWidth / 2 ? out.left : out.right).push(r);
    }
    return out;
  }

  _safe(win) {
    if (!this._probe) {
      const p = this._probe = this.wrap.ownerDocument.createElement('div');
      p.style.cssText = 'position:fixed;left:var(--safe-left,0px);right:var(--safe-right,0px);bottom:var(--safe-bottom,0px);height:0;visibility:hidden;pointer-events:none';
      this.wrap.ownerDocument.body.appendChild(p);
    }
    const cs = win.getComputedStyle(this._probe);
    return { left: parseFloat(cs.left) || 0, right: parseFloat(cs.right) || 0, bottom: parseFloat(cs.bottom) || 0 };
  }

  /** hud.dialogFull: box (and portrait) at full size at the bottom, clear of the visible touch controls. */
  _layoutBox(win) {
    const F = this.layout.dialogFull;
    if (!F || !this.cur || this.wrap.hidden) return;
    const H = win.innerHeight, W = win.innerWidth, vis = this._visibleControls(win), list = !this.list.hidden;
    const cand = dialogBoxCandidates(F, { W, H, safe: this._safe(win), ...vis, list });
    const bs = this.box.style, ps = this.portrait.style;
    const apply = (c) => {
      bs.transform = 'none'; bs.maxWidth = 'none';
      bs.left = `${Math.round(c.left)}px`; bs.width = `${Math.round(c.width)}px`; bs.bottom = `${Math.round(c.bottom)}px`;
      ps.left = `${Math.round(c.left)}px`; ps.bottom = `${Math.round(c.bottom)}px`;
      ps.maxHeight = `${Math.max(0, Math.floor(H - c.bottom - (F.topMarginPx ?? 4)))}px`;
    };
    let pick = cand[cand.prefer];
    apply(pick);
    if (pick.kind === 'above' && this.box.getBoundingClientRect().top < (F.topMarginPx ?? 4)) { pick = cand.beside; apply(pick); }
    this.box.dataset.layout = pick.kind;
  }

  /** Profile layout after each render / resize: battle image fit (hud.battleImage) and the toast lift (hud.toastDuringDialog). */
  _place() {
    const bi = this.layout.battleImage, win = this.wrap.ownerDocument?.defaultView;
    this._controlsState();
    if (win) this._layoutBox(win);
    // playtest fixes 3: the portrait art is wider than the fixed padding on some sizes and covered the first letters of each line;
    // pad the box past the portrait's real right edge (measured once the image has its size).
    if (this.cur && !this.wrap.hidden && !this.portrait.hidden && this.portrait.complete && this.portrait.naturalWidth) {
      this.box.style.paddingLeft = '';
      // layout box (offset*), not getBoundingClientRect: the portrait's pop-in animation scales it while it plays
      const op = this.portrait.offsetParent?.getBoundingClientRect?.() || { left: 0 }, pRight = op.left + this.portrait.offsetLeft + this.portrait.offsetWidth;
      const bx = this.box.getBoundingClientRect(), base = parseFloat(win?.getComputedStyle(this.box).paddingLeft) || 0;
      const need = Math.ceil(pRight - bx.left + 18);
      if (this.portrait.offsetWidth && need > base) this.box.style.paddingLeft = `${need}px`;
    } else if (this.box.style.paddingLeft) this.box.style.paddingLeft = '';
    if (this.cur && !this.wrap.hidden && win && bi?.fit === 'aboveDialog' && !this.battle.hidden) {
      const bx = this.box.getBoundingClientRect();
      if (bx.height) {
        const dpr = win.devicePixelRatio || 1, gap = bi.gapPx ?? 6, natW = bi.artWidth ?? 64, natH = bi.artHeight ?? 128;
        // maxHeightFrac (optional): cap at that share of the viewport height so a tall phone strip doesn't get a giant sprite
        const avail = Math.min(bx.top - gap - (bi.topMarginPx ?? 4), bi.maxHeightFrac ? win.innerHeight * bi.maxHeightFrac : Infinity);
        // whole device px per art px (nearest-neighbour stays crisp); the largest that fits above the box, within min/max
        const s = Math.max(bi.minScale ?? 1, Math.min(bi.maxScale ?? 4, Math.floor((avail * dpr) / natH)));
        const snap = (v) => Math.round(v * dpr) / dpr, h = (natH * s) / dpr, H = win.innerHeight;
        this.battle.style.width = `${(natW * s) / dpr}px`; this.battle.style.height = `${h}px`;
        // no room above the box even at minScale: keep it on screen and draw it over the box's right corner instead of cropping it
        const fits = h <= avail;
        this.battle.classList.toggle('over-box', !fits);
        this.battle.style.bottom = `${snap(fits ? H - bx.top + gap : H - (bi.topMarginPx ?? 4) - h)}px`;
        if (bi.align === 'boxRight') this.battle.style.right = `${snap(win.innerWidth - bx.right + (bi.insetPx ?? 0))}px`; // top-right, above the box, insetPx in from its right edge
        else { this.battle.style.right = ''; this.battle.style.right = `${snap(parseFloat(win.getComputedStyle(this.battle).right) || 0)}px`; }
      }
    }
    this.placeToast();
  }

  /** Toast shown while the box is open: above the box (and its name tag), between the portrait and the battle image, over the box in z. */
  placeToast() {
    const t = this.toastEl, T = this.layout.toastDuringDialog, doc = this.wrap.ownerDocument, win = doc?.defaultView;
    if (!t || !T || !win) return;
    const on = !!this.cur && !this.wrap.hidden;
    doc.body.classList.toggle('dlg-toast-lift', on);
    if (!on) { for (const k of ['bottom', 'left', 'max-width']) t.style.removeProperty(k); return; }
    if (t.hidden) return;
    const R = (el) => (el.hidden || el.closest('[hidden]') ? null : el.getBoundingClientRect());
    const bx = this.box.getBoundingClientRect(), nm = R(this.name), pt = R(this.portrait), bt = R(this.battle);
    if (!bx.height) return;
    const gap = T.gapPx ?? 8, H = win.innerHeight;
    const top = Math.min(bx.top, nm?.height ? nm.top : Infinity);
    const lo = Math.max(bx.left, pt?.width ? pt.right + gap : -Infinity), hi = Math.min(bx.right, bt?.width ? bt.left - gap : Infinity);
    t.style.left = `${Math.round((lo + hi) / 2)}px`; t.style.maxWidth = `${Math.floor(hi - lo)}px`;
    const th = t.getBoundingClientRect().height;
    t.style.bottom = `${Math.max(0, Math.round(Math.min(H - top + gap, H - (T.topMarginPx ?? 4) - th)))}px`;
  }

  _render() {
    const c = this.cur;
    if (!c) return;
    this.list.replaceChildren(); this.list.hidden = true;
    if (c.type === 'say' || c.type === 'ask') {
      this.text.textContent = c.pages[c.i] ?? '';
      this.text.hidden = false;
      const lastPage = c.i >= c.pages.length - 1;
      if (c.type === 'ask' && lastPage) this._items(c.choices.map((t) => ({ t })), c.sel, 0);
      this.more.hidden = c.type === 'ask' && lastPage;
      if (c.i < c.pages.length) this.shown.push(c.pages[c.i]);
      if (c.i < c.pages.length && (this._pageOf !== c || this._pageI !== c.i)) { this._pageOf = c; this._pageI = c.i; this.onPage?.(c.pages[c.i]); } // new page: text blip (src/audio)
    } else if (c.type === 'inbox') {
      if (c.open != null) {
        const e = c.items[c.open];
        this.name.textContent = `${e.from}: ${e.subject}`; this.name.hidden = false;
        this.text.textContent = e.pages[c.page] ?? ''; this.text.hidden = false; this.more.hidden = false;
        this.shown.push(e.pages[c.page]);
      } else {
        this.name.textContent = c.title; this.name.hidden = false;
        this.text.hidden = c.items.length > 0; this.text.textContent = 'No messages.';
        const start = Math.max(0, Math.min(c.sel - 2, c.items.length - 5));
        this._items(c.items.slice(start, start + 5).map((e) => ({ t: e.subject, sub: e.from, dot: !c.isRead(e) })), c.sel - start, start);
        this.more.hidden = true;
      }
    }
    this.back.hidden = !(c.type === 'inbox' || (c.type === 'ask' && c.i >= c.pages.length - 1));
    this._hint();
    this._place();
  }

  _items(items, sel, offset = 0) {
    this.list.hidden = false;
    items.forEach((it, i) => {
      const li = document.createElement('li');
      li.dataset.i = String(offset + i); // absolute choice / message index (tapDialog)
      if (i === sel) li.className = 'sel';
      if (it.dot) { const d = document.createElement('span'); d.className = 'new-dot'; d.title = 'new'; li.appendChild(d); }
      li.appendChild(document.createTextNode(it.t));
      if (it.sub) { const s = document.createElement('span'); s.className = 'sub'; s.textContent = it.sub; li.appendChild(s); }
      this.list.appendChild(li);
    });
  }

  say(pages, speaker) {
    if (!pages?.length) return Promise.resolve();
    // a say() opened over another open say() used to orphan the first promise, so the script awaiting it never ended
    // (scene.busy stuck, player locked; seen after the derby turn-in). Resolve the replaced line first.
    const prev = this.cur?.type === 'say' ? this.cur.resolve : null;
    return new Promise((resolve) => { this._speaker(speaker); this.cur = { type: 'say', pages, i: 0, resolve }; if (prev) queueMicrotask(prev); this._show(); this._render(); });
  }

  /** Close an open say() box early and resolve it (the caller's state moved on; e.g. the derby scale changed). Lists stay. */
  dismiss() { const c = this.cur; if (!c || c.type !== 'say') return false; const r = c.resolve; this._close(); r(); return true; }

  ask(pages, choices, speaker) {
    return new Promise((resolve) => { this._speaker(speaker); this.cur = { type: 'ask', pages, i: 0, choices, sel: 0, resolve }; this._show(); this._render(); });
  }

  inbox(title, items, isRead, markRead) {
    return new Promise((resolve) => { this._speaker(null); this.cur = { type: 'inbox', title, items, sel: 0, open: null, page: 0, isRead, markRead, resolve }; this._show(); this._render(); });
  }

  /** One tick of input: {a, bEdge, dirEdge}. */
  handle({ a, bEdge, dirEdge }) {
    const c = this.cur;
    if (!c) return;
    const tap = this._tap; this._tap = null;
    if (tap?.a) a = true;
    if (tap?.b) { bEdge = true; a = false; }
    if (tap?.pick != null && !this.list.hidden) {
      // a tapped row: select it, then act as A (ask picks it; inbox opens it)
      const n = c.type === 'ask' ? c.choices.length : c.items?.length ?? 0;
      if (tap.pick >= 0 && tap.pick < n) { c.sel = tap.pick; a = true; }
    } else if (tap?.pick != null) a = true;
    const finish = (v) => { const r = c.resolve; this._close(); r(v); };
    if (c.type === 'say') {
      if (a || bEdge) { if (++c.i >= c.pages.length) finish(); else this._render(); }
    } else if (c.type === 'ask') {
      const onChoices = c.i >= c.pages.length - 1;
      if (!onChoices) { if (a || bEdge) { c.i++; this._render(); } return; }
      if (dirEdge === 'up' || dirEdge === 'down') { c.sel = (c.sel + (dirEdge === 'down' ? 1 : -1) + c.choices.length) % c.choices.length; this._render(); }
      else if (a) finish(c.sel);
      else if (bEdge) finish(c.choices.length - 1);
    } else if (c.type === 'inbox') {
      if (c.open != null) {
        if (a && c.page < c.items[c.open].pages.length - 1) { c.page++; this._render(); }
        else if (a || bEdge) { c.open = null; this._render(); }
        return;
      }
      if (!c.items.length) { if (a || bEdge) finish(); return; }
      if (dirEdge === 'up' || dirEdge === 'down') { c.sel = Math.max(0, Math.min(c.items.length - 1, c.sel + (dirEdge === 'down' ? 1 : -1))); this._render(); }
      else if (a) { c.open = c.sel; c.page = 0; c.markRead(c.items[c.sel]); this._render(); }
      else if (bEdge) finish();
    }
  }
}

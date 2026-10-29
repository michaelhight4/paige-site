// Kilumen UI tools 2 (Oct 22, 2026; Gary: "Add the 5 ready UI tools"). Local only. Owned by ui.js (imported there).
//   auto-animate (MIT, lazy)  : enter / leave / reorder for Team, Field Archive, Pack, RT Supply and the choice modal (ask()).
//   floating-ui (MIT, lazy)   : item / skill / creature tooltips ([data-tip]) that flip / shift to stay on screen.
//   pixelarticons (MIT)       : 24 px pixel icons (menu badges, pockets, empty states, Options rows). Tiny subset, in the ui chunk.
//   Kenney UI packs (CC0)     : PLACEHOLDER slider / checkbox / 9-slice frame (art/ui/kenney_ui_placeholder) until final art.
//   anime.js 4.x (MIT, lazy)  : default battle shell only (scr_battle): command panel slide-in + stagger, HP drain + counter,
//                               XP fill, level-up popup timeline. ui_sd.js is NOT touched; it can use ui.fx (see hookSd note below).
// Reduced motion (body.ui-reduce or prefers-reduced-motion): auto-animate and anime.js are never imported; everything jumps
// straight to its end state. Tooltips still work (no fade).
// Hook for src/battle/ui_sd.js later (owned by the battle worker): makeSdBattle(ui, ...) already receives `ui`, so it can call
//   await ui.fx.battleWarm();                     // lazy-load anime.js (no-op when motion is reduced)
//   ui.fx.drainBar(barEl, f, { num, from, to, max })  // HP drain, ghost chunk, counter; instant when reduced
//   ui.fx.cmdsIn(panelEl) / ui.fx.levelUpPop(boxEl)   // panel slide-in + stagger / level-up timeline
import { PXI } from '../vendor/pixelarticons/icons.js?v=v0.2.57-alpha';
import { CAPTURE_STEPS, CAPTURE_MS, BURST_COL, buildCapture } from './capture_fx.js?v=v0.2.57-alpha'; // capture sequence (Oct 22, 2026; swap points per step)

const KUI = 'art/ui/kenney_ui_placeholder/';
const AA_URL = '../vendor/auto-animate/auto-animate.min.js?v=v0.2.57-alpha';
const FUI_URL = '../vendor/floating-ui/floating-ui.dom.bundle.min.mjs?v=v0.2.57-alpha';
const ANIME_URL = '../vendor/animejs/anime.ui.min.mjs?v=v0.2.57-alpha';
const mods = {}; const loads = {};
const load = (k, url) => (loads[k] ||= import(url).then((m) => (mods[k] = m)).catch((e) => { delete loads[k]; console.warn(`ui tools (${k}):`, e.message); return null; }));

// ---------- pixelarticons ----------
export const MENU_ICONS = { team: 'users', pack: 'backpack', kilindex: 'book-open', tasks: 'clipboard-note', map: 'map', contacts: 'contact', save: 'save',
  options: 'sliders', archive: 'archive', shop: 'store', battle: 'sword', menu: 'menu', summary: 'info-box' };
export const POCKET_ICONS = { care: 'heart', feeds: 'leaf', gear: 'tools', crystals: 'diamond-gem', key: 'key', logs: 'notebook' };
export const EMPTY_ICONS = { team: 'users', pack: 'backpack', shop: 'shopping-cart', tasks: 'clipboard-note', contacts: 'contact' };
export const OPTION_ICONS = { 'Cloud shadows': 'cloud', 'Ambient life': 'tree', 'Depth shadows': 'sun', 'Menu motion': 'speed-medium', Sound: 'volume-3',
  Volume: 'volume-3', 'Music volume': 'music', 'Effects volume': 'audio-waveform', 'Screen previews (dev build)': 'gamepad', 'Wild battles': 'zap' };
export const hasPx = (n) => !!PXI[n];
export const pxi = (name, cls = 'pxi', color = '') => (PXI[name] ? `<svg class="${cls}" viewBox="0 0 24 24" fill="currentColor"${color ? ` style="color:${color}"` : ''} shape-rendering="crispEdges" aria-hidden="true" focusable="false" data-icon="pixelarticons:${name}">${PXI[name]}</svg>` : '');

// ---------- Kenney UI placeholders ----------
export const kuiSlider = (v) => { const p = Math.round(Math.max(0, Math.min(1, v)) * 100);
  return `<span class="kui-slider" data-placeholder="kenney-ui" style="--v:${p}%" aria-hidden="true"><i class="fill"></i><img class="hdl" src="${KUI}slide_hangle.png" alt="" draggable="false"></span>`; };
export const kuiCheck = (on) => `<img class="kui-check" data-placeholder="kenney-ui" src="${KUI}${on ? 'check_square_color_checkmark' : 'check_square_grey'}.png" alt="" aria-hidden="true" draggable="false">`;

const syncAttrs = (o, n) => {
  for (const a of [...o.attributes]) if (!n.hasAttribute(a.name)) o.removeAttribute(a.name);
  for (const a of [...n.attributes]) if (o.getAttribute(a.name) !== a.value) o.setAttribute(a.name, a.value);
};

export class UiTools2 {
  constructor(ui) {
    this.ui = ui; this.ctl = new WeakMap(); this.tip = null; this._tipRef = null; this._tipT = 0; this._tipOff = null;
    this._tipEvents();
    this.motion = { last: {} }; this._motionHooks(); // catch + menu motion (Oct 22, 2026): counters for tests (anime.js uses inline styles, not WAAPI)
  }
  reduced() { return this.ui.body.classList.contains('ui-reduce') || matchMedia('(prefers-reduced-motion: reduce)').matches; }
  warm() { if (!this.reduced()) { load('aa', AA_URL); load('anime', ANIME_URL); } } // menu opened: ask() rows (auto-animate) + menu motion (anime.js)
  battleWarm() { return this.reduced() ? Promise.resolve(null) : load('anime', ANIME_URL); }
  get loaded() { return { autoAnimate: !!mods.aa, floatingUi: !!mods.fui, anime: !!mods.anime }; }

  // ---------- auto-animate: keyed reconcile so rerender() moves real nodes instead of replacing them ----------
  // Before stage.innerHTML is replaced, keep() grabs the [data-aa] containers of the same screen object; adopt() then patches
  // the old container to the new markup (children matched by data-k) and swaps it back in, so auto-animate sees adds / removes / moves.
  keep(stage, t) {
    this.tipHide();
    // same screen id at the same stack depth (rerender, or replace('team') after a Move); other screens start fresh
    const id = `${t.scr}:${this.ui.stack.length}`, m = new Map(), same = this._lastScr === id; this._lastScr = id;
    if (!same || this.reduced() || !mods.aa) return m;
    for (const c of stage.querySelectorAll('[data-aa]')) m.set(c.dataset.aa, c);
    return m;
  }
  adopt(stage, kept) {
    for (const nc of stage.querySelectorAll('[data-aa]')) {
      const oc = kept.get(nc.dataset.aa);
      if (oc && oc !== nc) {
        const old = new Map(); for (const k of [...oc.children]) { if (k.dataset.k && !old.has(k.dataset.k)) old.set(k.dataset.k, k); else k.remove(); }
        const next = [...nc.children].map((n) => {
          const o = n.dataset.k && old.get(n.dataset.k); if (!o) return n;
          old.delete(n.dataset.k); syncAttrs(o, n); if (o.innerHTML !== n.innerHTML) o.innerHTML = n.innerHTML; return o;
        });
        for (const o of old.values()) o.remove();
        next.forEach((n, i) => { if (oc.children[i] !== n) oc.insertBefore(n, oc.children[i] || null); });
        syncAttrs(oc, nc); nc.replaceWith(oc);
        this._aa(oc);
      } else this._aa(nc);
    }
  }
  _aa(el) {
    if (this.reduced()) { this.ctl.get(el)?.disable(); return; }
    if (!mods.aa) { load('aa', AA_URL); return; } // first render of a screen is covered by the stage slide-in anyway
    let c = this.ctl.get(el);
    if (!c) { c = mods.aa.autoAnimate(el, { duration: 200, easing: 'cubic-bezier(.2,.8,.2,1)' }); this.ctl.set(el, c); }
    if (this._drag) c.disable(); else c.enable();
  }
  dragging(on) { // SortableJS animates its own drag; auto-animate stays off until the drop has been re-rendered
    this.tipHide();
    const set = () => { for (const c of this.ui.stage.querySelectorAll('[data-aa]')) { const k = this.ctl.get(c); if (k) (this._drag || this.reduced() ? k.disable() : k.enable()); } };
    if (on) { this._drag = true; set(); } else setTimeout(() => { this._drag = false; set(); }, 0); // after the drop's synchronous rerender
  }
  listIn(ul, items) { // ask() choices: attach auto-animate first, then add the rows so they animate in (instant when reduced / not loaded)
    if (!this.reduced() && mods.aa) this.ctl.set(ul, mods.aa.autoAnimate(ul, { duration: 180, easing: 'ease-out' }));
    ul.insertAdjacentHTML('beforeend', items);
  }

  // ---------- floating-ui tooltips ----------
  _tipEvents() {
    const root = this.ui.root;
    root.addEventListener('pointerover', (e) => { if (e.pointerType !== 'mouse') return; const r = e.target.closest?.('[data-tip]:not([data-i])'); if (r) this.tipShow(r); });
    root.addEventListener('pointerout', (e) => { if (e.pointerType !== 'mouse') return; const r = e.target.closest?.('[data-tip]:not([data-i])'); if (r && r === this._tipRef && !r.contains(e.relatedTarget)) this.tipHide(); });
    root.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      const r = e.target.closest?.('[data-tip]'); if (!r || this.ui.modal) { this.tipHide(); return; }
      if (!r.dataset.i) { if (this._tipRef === r) this.tipHide(); else this.tipShow(r, 3500); return; } // info rows: tap toggles
      const t = this.ui.top; if (!t?.sortable) return; // drag screens: long-press shows the tip (a tap still opens / picks)
      const x = e.clientX, y = e.clientY; clearTimeout(this._holdT);
      const cancel = (ev) => { if (ev.type !== 'pointermove' || Math.hypot(ev.clientX - x, ev.clientY - y) > 8) { clearTimeout(this._holdT); off(); } };
      const off = () => { for (const k of ['pointermove', 'pointerup', 'pointercancel']) root.removeEventListener(k, cancel); };
      for (const k of ['pointermove', 'pointerup', 'pointercancel']) root.addEventListener(k, cancel);
      this._holdT = setTimeout(() => { off(); if (this.ui._dragging || this.ui.modal || !r.isConnected) return; this.ui._tipHold = true; this.tipShow(r, 4000); }, 520);
    });
    addEventListener('keydown', (e) => { if (e.key === 'Escape') this.tipHide(); });
  }
  tipSel() { // keyboard / pad / hover / tap selection on a [data-i] item: show its tip after a short settle
    clearTimeout(this._tipT);
    this._tipT = setTimeout(() => {
      const ui = this.ui, t = ui.top; if (!t || ui.modal || !ui.active) { this.tipHide(); return; }
      const host = t.full ? ui.layer : ui.stage, r = host.querySelector(`[data-i="${t.sel}"][data-tip]`);
      if (r) this.tipShow(r); else this.tipHide();
    }, 140);
  }
  async tipShow(ref, autoHideMs = 0) {
    if (!ref?.dataset?.tip) return;
    const F = mods.fui || await load('fui', FUI_URL); if (!F || !ref.isConnected || this.ui.modal) return;
    if (!this.tip) {
      this.tip = document.createElement('div'); this.tip.className = 'ui-tip'; this.tip.id = 'ui-tip'; this.tip.setAttribute('role', 'tooltip');
      this.tip.dataset.placeholder = 'kenney-ui'; this.tip.innerHTML = '<b class="tt"></b><span class="tb"></span>'; document.body.appendChild(this.tip);
    }
    if (this._tipRef && this._tipRef !== ref) this._tipRef.removeAttribute('aria-describedby');
    this._tipOff?.(); this._tipRef = ref; ref.setAttribute('aria-describedby', 'ui-tip');
    const tip = this.tip; tip.querySelector('.tt').textContent = ref.dataset.tipT || ''; tip.querySelector('.tt').hidden = !ref.dataset.tipT;
    tip.querySelector('.tb').textContent = ref.dataset.tip; tip.dataset.el = ref.dataset.el || '';
    tip.hidden = false; tip.classList.remove('show');
    const cs = getComputedStyle(this.ui.body), px = (v) => parseFloat(cs.getPropertyValue(v)) || 0;
    const pad = { top: 8 + px('--safe-top'), right: 8 + px('--safe-right'), bottom: 8 + px('--safe-bottom'), left: 8 + px('--safe-left') };
    const { computePosition, autoUpdate, offset, flip, shift, size } = F;
    const update = () => {
      if (!ref.isConnected || !ref.getClientRects().length) { this.tipHide(); return; }
      computePosition(ref, tip, { strategy: 'fixed', placement: ref.dataset.tipPlace || 'top',
        middleware: [offset(8), flip({ padding: pad, fallbackPlacements: ['bottom', 'right', 'left'] }), shift({ padding: pad, crossAxis: true }),
          size({ padding: pad, apply({ availableWidth, availableHeight, elements }) { Object.assign(elements.floating.style, { maxWidth: `${Math.max(140, Math.min(320, availableWidth))}px`, maxHeight: `${Math.max(64, availableHeight)}px` }); } })],
      }).then(({ x, y, placement }) => { if (this._tipRef !== ref) return; Object.assign(tip.style, { left: `${x}px`, top: `${y}px` }); tip.dataset.place = placement; tip.classList.add('show'); });
    };
    const stop = autoUpdate(ref, tip, update);
    const iv = setInterval(() => { if (!ref.isConnected || !ref.getClientRects().length || this.ui.modal || !this.ui.active) this.tipHide(); }, 250);
    const hid = autoHideMs ? setTimeout(() => this.tipHide(), autoHideMs) : 0;
    this._tipOff = () => { stop(); clearInterval(iv); clearTimeout(hid); };
  }
  tipHide() {
    clearTimeout(this._tipT); this._tipOff?.(); this._tipOff = null;
    if (this._tipRef) this._tipRef.removeAttribute('aria-describedby'); this._tipRef = null;
    if (this.tip) { this.tip.hidden = true; this.tip.classList.remove('show'); }
  }

  // ---------- anime.js (default battle shell; ui_sd.js may call these later) ----------
  drainBar(bar, f, { num = null, from = 0, to = 0, max = 0, ms = 700 } = {}) {
    const i = bar?.querySelector(':scope > i'); if (!i) return false;
    const w = `${Math.max(0, f) * 100}%`, A = mods.anime;
    const setNum = (v) => { if (num) num.textContent = `${Math.round(v)}/${max}`; };
    if (this.reduced()) { i.style.transition = 'none'; i.style.width = w; setNum(to); return true; }
    if (!A) return false; // caller keeps its CSS transition path
    const cur = i.getBoundingClientRect().width / Math.max(1, bar.clientWidth) * 100;
    i.style.transition = 'background-color 300ms';
    if (Math.max(0, f) * 100 < cur - 0.5) { // damage (judged by width; the foe bar has no number): a light chunk lingers, then catches up (classic HP drain)
      let g = bar.querySelector(':scope > .ax-ghost'); if (!g) { g = document.createElement('s'); g.className = 'ax-ghost'; bar.insertBefore(g, i); }
      A.animate(g, { width: [`${cur}%`, w], duration: ms, delay: 260, ease: 'inOutQuad' });
    }
    A.animate(i, { width: w, duration: ms * 0.7, ease: 'outCubic' });
    if (num) { const o = { v: from }; A.animate(o, { v: to, duration: ms, ease: 'outQuad', onUpdate: () => setNum(o.v), onComplete: () => setNum(to) }); }
    return true;
  }
  fillBar(bar, pct, { ms = 700, from = null } = {}) {
    const i = bar?.querySelector(':scope > i'); if (!i) return false; const A = mods.anime;
    if (this.reduced()) { i.style.transition = 'none'; i.style.width = `${pct}%`; return true; }
    if (!A) return false;
    i.style.transition = 'background-color 300ms';
    A.animate(i, { width: from == null ? `${pct}%` : [`${from}%`, `${pct}%`], duration: ms, ease: 'inOutQuad' });
    return true;
  }
  cmdsIn(panel) {
    const A = mods.anime; if (!panel || this.reduced() || !A) return;
    const kids = [...panel.children];
    A.animate(panel, { translateY: ['35%', '0%'], opacity: [0, 1], duration: 260, ease: 'outQuad', onComplete: (a) => a.revert() });
    if (kids.length) A.animate(kids, { scale: [0.82, 1], opacity: [0, 1], duration: 240, delay: A.stagger(45, { start: 60 }), ease: 'outBack(1.6)', onComplete: (a) => a.revert() });
  }
  levelUpPop(box) {
    const A = mods.anime; if (!box || this.reduced() || !A) return;
    box.classList.add('ax'); // our timeline replaces the CSS ui-pop keyframes
    const rows = box.querySelectorAll('dt, dd'), ups = box.querySelectorAll('dd.up');
    A.createTimeline({ defaults: { ease: 'outQuad' } })
      .add(box, { scale: [0.6, 1], opacity: [0, 1], translateY: [24, 0], duration: 380, ease: 'outBack(1.8)' })
      .add(rows, { opacity: [0, 1], translateX: [14, 0], duration: 220, delay: A.stagger(55) }, '-=120')
      .add(ups, { scale: [1, 1.4, 1], duration: 360, delay: A.stagger(70) }, '-=80');
  }

  // ---------- capture sequence (Oct 22, 2026; Gary 11:05 PM CT, SOUL_PLAYBOOK 5.3): see capture_fx.js ----------
  // host: the battle box; o: { foe, ally (img), name, pulses 1-4 (by catch odds), caught, el (foe element, tints the break-out) }.
  // Steps raise -> beam -> absorb -> pulse x n -> lock + bloom ('catch' chime, banner) | breakout; the trainer then slides out
  // without holding input. Reduced motion / anime.js missing: the end state at once (caught: crystal + banner, foe gone).
  // Resolves { ban, caught }; this.motion.capture logs the steps run (tests), catchHeld the real ms input waited.
  async catchFx(host, o = {}) {
    if (!host) return null;
    const pulses = Math.max(1, Math.min(4, Math.round(o.pulses) || 1)), caught = !!o.caught, A = this._A();
    if (o.foe) delete o.foe.dataset.capDone; // ui_sd.js restoreFoe sets it after a break-free
    // Animator art (fx_art.js, ON by default; rollback: FX_ART.capture = false or ?fxart=0 -> the placeholder below)
    const fa = await this.art(), art = fa?.FX_ART.capture ? await Promise.race([fa.loadCapture(pulses, caught, o.el), new Promise((r) => setTimeout(r, 1500))]) : null;
    const t0 = performance.now();
    const { parts: p, ban, g } = buildCapture(host, { foe: o.foe, ally: o.ally, name: o.name, banner: 'Crystal bound!', hold: art ? fa.FX_CFG.hold : null });
    const steps = []; this.motion.capture = steps; this.motion.captureArt = art ? art.names.join(',') : ''; this.motion.holdDrift = g.drift; this._log('catch', A ? 1 : 0);
    const sfx = (id) => this.ui.scene?.audio?.sfx?.(id);
    if (!A) { // end state only
      if (caught) { if (o.foe) o.foe.style.opacity = '0'; if (art) { p.wrap.classList.add('art', 'end'); fa.captureEnd(p, g, art, ban); } else { p.wrap.classList.add('end'); p.runes.classList.add('lock'); p.wrap.appendChild(ban); } sfx('catch'); }
      else p.wrap.remove();
      this.motion.catchHeld = 0; return { ban: caught ? ban : null, caught };
    }
    if (art) {
      ban.style.opacity = '0'; this.motion.captureBudget = fa.captureMs(art);
      const rc = { A, p, g, foe: o.foe, ally: o.ally, caught, ban, sfx, steps, art }; await fa.runCapture(rc); rc.lowerPose?.(); this.motion.pose = p.trainer.dataset.pose || '';
      this.motion.catchHeld = Math.round(performance.now() - t0);
      steps.push('lower'); const c = { A, p, g, ms: CAPTURE_MS, ally: o.ally, tw: (el, q) => new Promise((res) => { A.animate(el, { ...q, onComplete: res }); setTimeout(res, (q.duration || 300) + 250); }) };
      CAPTURE_STEPS.lower(c).then(() => { if (!caught) p.wrap.remove(); });
      return { ban: caught ? ban : null, caught };
    }
    const c = { A, p, g, ban, ms: CAPTURE_MS, foe: o.foe, ally: o.ally, caught, burst: BURST_COL(o.el), sfx, tw: (el, q) => new Promise((res) => { let d = false; const f = () => { if (!d) { d = true; res(); } };
      A.animate(el, { ...q, onComplete: f }); setTimeout(f, (q.duration || 300) + (q.delay || 0) + 250); }) };
    // fixed schedule: each step starts on its slot (CAPTURE_MS), so a slow device never stretches the time input waits
    let at = 0; const run = async (k, ...a) => { steps.push(k); CAPTURE_STEPS[k](c, ...a); at += k === 'pulse' ? CAPTURE_MS.pulse : CAPTURE_MS[k];
      const left = t0 + at - performance.now(); if (left > 0) await new Promise((r) => setTimeout(r, left)); };
    ban.style.opacity = '0'; if (caught) p.wrap.appendChild(ban);
    await run('raise'); await run('beam'); await run('absorb');
    for (let k = 1; k <= pulses; k++) await run('pulse', k, pulses);
    if (caught) { await run('lock'); await run('bloom'); if (o.foe) o.foe.style.opacity = '0'; } else await run('breakout');
    this.motion.catchHeld = Math.round(performance.now() - t0);
    steps.push('lower'); CAPTURE_STEPS.lower(c).then(() => { if (!caught) p.wrap.remove(); }); // input is free from here
    return { ban: caught ? ban : null, caught };
  }

  // ---------- Animator FX art (fx_art.js, lazy): capture / evolution / heal_restore ----------
  art() { if (new URLSearchParams(location.search).get('fxart') === '0') return Promise.resolve(null);
    return (loads.art ||= import('./fx_art.js?v=v0.2.57-alpha').catch((e) => { delete loads.art; console.warn('fx art:', e.message); return null; })); }
  /** Heal machine sequence at the cradle (src/systems/heal.js). Skipped when motion is reduced. */
  async healFx(sc, n) { const fa = await this.art(); if (!fa?.FX_ART.heal || !sc) return null;
    const r = await fa.healFx(sc, n, { reduced: this.reduced() }); this.motion.heal = r; return r; }
  /** Evolution player (self-contained: the game has no evolution flow yet). o: { from, to?, cancel?, hold? } */
  async evolveFx(o) { const fa = await this.art(); if (!fa?.FX_ART.evolution) return null;
    this._evolving = true; let r; try { r = await fa.evolveFx({ ...o, reduced: this.reduced() }); } finally { this._evolving = false; } // save lock guard (ui.js mountUI)
    this.motion.evolve = { from: r.from, to: r.to, steps: r.steps, ms: r.ms, skipped: r.skipped }; return r; }

  // ---------- menu motion (Oct 22, 2026; anime.js, 120-220 ms, never holds input) ----------
  // Open: the live stage animates (input works at once). Close: an inert, aria-hidden CLONE (ids / data-i / data-m / data-act stripped)
  // fades over the already-closed UI, so closing is instant for input too. Modals (ask / qty) and dialogue choice lists are watched with
  // MutationObservers (no edits in their code). Reduced motion: none of this runs; anime.js not loaded yet: short CSS fallback (ui_tools2.css).
  _A() { return this.reduced() ? null : mods.anime || null; }
  _log(k, ms) { this.motion[k] = (this.motion[k] || 0) + 1; this.motion.last[k] = ms; }
  menuIn(stage, anim) {
    const A = this._A(); if (!A || (anim !== 'in' && anim !== 'back')) return;
    stage.classList.add('ax-m'); // anime.js replaces the CSS ui-slide-in / ui-slide-back keyframes from here on
    const back = anim === 'back', ms = back ? 150 : 190;
    A.animate(stage, back ? { opacity: [0, 1], translateX: [-12, 0], duration: ms, ease: 'outQuad', onComplete: (a) => a.revert() }
      : { opacity: [0, 1], translateY: [16, 0], scale: [0.97, 1], duration: ms, ease: 'outBack(1.4)', onComplete: (a) => a.revert() });
    this._log(back ? 'back' : 'open', ms);
  }
  selMove() { // _select(): the newly selected item gives a small pop (keyboard / pad / hover / tap)
    const A = this._A(), t = this.ui.top; if (!A || !t || t.full) return;
    const el = this.ui.stage.querySelector(`[data-i="${t.sel}"]`); if (!el) return;
    A.animate(el, { scale: [0.95, 1], duration: 140, ease: 'outBack(2.2)', onComplete: (a) => a.revert() }); this._log('sel', 140);
  }
  closeOut() { // _closeRoot(), before it hides the root
    const ui = this.ui, A = this._A(); if (!A || !ui.active || ui.root.hidden || ui.stage.hidden || !ui.stage.firstChild) return;
    const g = this._ghost([ui.backdrop, ui.stage, ...ui.root.querySelectorAll(':scope > .ui-modal')]), st = g.querySelector('.ui-stage');
    A.animate(g, { opacity: [1, 0], duration: 140, ease: 'inQuad', onComplete: () => g.remove() });
    if (st) A.animate(st, { translateY: [0, 12], scale: [1, 0.97], duration: 140, ease: 'inQuad' });
    setTimeout(() => g.remove(), 700); this._log('close', 140);
  }
  _strip(root) {
    const at = ['id', 'data-i', 'data-m', 'data-act', 'data-tip', 'tabindex', 'aria-describedby', 'role', 'aria-modal'];
    for (const e of [root, ...root.querySelectorAll('*')]) for (const a of at) e.removeAttribute(a);
    root.setAttribute('aria-hidden', 'true'); root.inert = true; root.classList.add('ax-out'); return root;
  }
  _ghost(nodes) {
    const ui = this.ui, g = ui.root.cloneNode(false); g.hidden = false;
    for (const n of nodes) g.appendChild(n.isConnected ? n.cloneNode(true) : n);
    this._strip(g); ui.root.after(g); return g;
  }
  _motionHooks() {
    const ui = this.ui;
    new MutationObserver((recs) => {
      for (const r of recs) {
        if (r.type === 'attributes') { const e = r.target; if (e.dataset.m != null && e.classList.contains('sel') && !/\bsel\b/.test(r.oldValue || '')) this._nudge(e, 'sel'); continue; }
        for (const n of r.addedNodes) if (n.classList?.contains('ui-modal')) this._modalIn(n);
        for (const n of r.removedNodes) if (n.classList?.contains('ui-modal')) this._modalOut(n);
      }
    }).observe(ui.root, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'], attributeOldValue: true });
    this._dlgHook();
  }
  _nudge(el, k) { const A = this._A(); if (!A) return; A.animate(el, { translateX: [-6, 0], duration: 130, ease: 'outQuad', onComplete: (a) => a.revert() }); this._log(k, 130); }
  _modalIn(w) {
    const A = this._A(); if (!A || w.classList.contains('ax-out')) return;
    w.classList.add('ax-m'); // replaces the CSS ui-pop on its panel (also stops qty() redraws from re-popping)
    A.animate(w, { opacity: [0, 1], duration: 120, ease: 'outQuad', onComplete: (a) => a.revert() });
    const p = w.querySelector('.ui-panel'); if (p) A.animate(p, { scale: [0.9, 1], opacity: [0, 1], duration: 180, ease: 'outBack(1.6)', onComplete: (a) => a.revert() });
    this._log('modalIn', 180);
  }
  _modalOut(w) {
    const A = this._A(); if (!A || w.classList.contains('ax-out') || !w.firstChild) return;
    const g = this._ghost([w]);
    A.animate(g, { opacity: [1, 0], duration: 130, ease: 'inQuad', onComplete: () => g.remove() });
    const p = w.querySelector('.ui-panel'); if (p) A.animate(p, { scale: [1, 0.94], duration: 130, ease: 'inQuad' });
    setTimeout(() => g.remove(), 700); this._log('modalOut', 130);
  }
  _dlgHook(n = 0) { // overworld dialogue choice lists (dialog.js rebuilds .dlg-list on every render): open / move / close
    const d = this.ui.scene?.dialog;
    if (!d?.list || !d.wrap) { if (n < 40) setTimeout(() => this._dlgHook(n + 1), 500); return; }
    let shown = false, sig = '', selI = -1, snap = null;
    const mo = new MutationObserver(() => {
      const L = d.list, vis = !L.hidden && !d.wrap.hidden && L.children.length > 0, A = this._A();
      if (vis) {
        const kids = [...L.children], s = kids.map((li) => li.textContent).join('|'), si = kids.findIndex((li) => li.classList.contains('sel'));
        if (!A) { if (!this.reduced()) load('anime', ANIME_URL); } else if (!shown || s !== sig) {
          const st = Math.min(18, 60 / Math.max(1, kids.length - 1));
          A.animate(L, { opacity: [0, 1], translateY: [8, 0], duration: 160, ease: 'outQuad', onComplete: (a) => a.revert() });
          A.animate(kids, { opacity: [0, 1], translateX: [-10, 0], duration: 140, delay: A.stagger(st), ease: 'outQuad', onComplete: (a) => a.revert() });
          this._log('dlgIn', Math.round(Math.max(160, 140 + st * (kids.length - 1))));
        } else if (si !== selI && kids[si]) this._nudge(kids[si], 'dlgSel');
        shown = true; sig = s; selI = si; snap = A ? d.wrap.cloneNode(true) : null;
      } else if (shown) {
        shown = false; const A2 = this._A();
        if (A2 && snap && d.wrap.hidden && d.wrap.parentNode) { // the whole box closed after a choice: its last frame fades + drops
          const g = this._strip(snap); g.hidden = false; d.wrap.after(g);
          A2.animate(g, { opacity: [1, 0], translateY: [0, 10], duration: 140, ease: 'inQuad', onComplete: () => g.remove() });
          setTimeout(() => g.remove(), 700); this._log('dlgOut', 140);
        }
        snap = null;
      }
    });
    mo.observe(d.list, { childList: true, attributes: true, attributeFilter: ['hidden'] });
    mo.observe(d.wrap, { attributes: true, attributeFilter: ['hidden'] });
  }
}

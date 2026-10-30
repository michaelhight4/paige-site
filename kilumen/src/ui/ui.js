// Kilumen UI layer (UI pass, Oct 22, 2026; Gary: "a full ui that feels alive and colourful", "need patterns and colors").
// Screens: title, phone menu (Team, Pack, Kilindex, Tasks, Map, Contacts, File today's report, Options), team, summary,
// Kilindex, pack, RT Supply shop, Field Archive, save prompt, battle shell; overworld HUD (location banner, clock, menu
// button, A prompt); restyle hooks for the dialogue box (text reveal, name tag colour) and touch controls (press feedback).
// Additive only: it wraps scene.step to freeze the player while a screen is open and never edits overworld/dialog/input code.
// Labels come from text/overworld_lines.json (system_phone, system_party, system_kilindex, system_shop, system_save,
// system_heal, comfort.bag_pockets, catalogue). Stats / gold / bag / skills are PLACEHOLDERS from ./data.js (see report).
// Open: Esc or M (keyboard), Start (pad button 9), the menu button (touch / mouse). Dev: ?ui=title|phone|team|summary|pack|
// kilindex|shop|archive|save|options|map|battle|levelup, ?uidemo=1 (demo team/bag/gold, not saved), ?battle=shell
// (old scripted battle shell instead of the default engine battle, src/battle/ui_sd.js; Oct 23, 2026), ?title=0|1 (title on a bare URL only by default).
import { iconRel, battleSpriteRel } from './data.js?v=v0.2.95-alpha';
import { CONN_NODES, CONN_EDGES } from './connections.gen.js?v=v0.2.95-alpha'; // v0.2.23 Paths map view // creature sync (Oct 23, 2026)
import { SPECIES, speciesById, ELEMENT_LABEL, skillsFor, PLACEHOLDER_PRICES, SHOP_STOCK, POCKETS, POCKET_PAT, DEMO, statsFor } from './data.js?v=v0.2.95-alpha';
// FX prep (Oct 22, 2026): hit effects drawn from the transparent redraws' sidecar JSON (natural size, anchor, total_ms); gated by
// HIT_EFFECTS_ENABLED / HIT_TRAVEL_FX_ENABLED in ./data.js; dev preview ?fxpreview=staging. See ./hit_fx.js.
import { areaName } from '../overworld/area_sign.js?v=v0.2.95-alpha';
import { fxSettings, fxStem, loadFx, prepFx, showImpact, showTravel, isRanged } from './hit_fx.js?v=v0.2.95-alpha';
import { installWildEncounters, biomeFor } from '../battle/encounters.js?v=v0.2.95-alpha';
import { fishingFlags } from '../fishing/flags.js?v=v0.2.95-alpha'; // fishing v1: terrain encounters flag (off by default) // battles default v1: wild encounters
// UI tools pass (Oct 22, 2026; Gary: "use them and log them for later use"): lrud-spatial (Apache-2.0) picks the nearest item
// in the pressed direction from the real layout; SortableJS (MIT, lazy) drags Team / Field Archive; ?dev=1 lazy-loads the
// lil-gui tuning panel (./devpanel.js); Kenney CC0 PLACEHOLDER art (art/ui/kenney_placeholder) only where there was none.
import { getNextFocus } from '../vendor/lrud-spatial/lrud.js?v=v0.2.95-alpha';
import { ALPHA_VERSION, ALPHA_NOTICE, noticeSeen, markNoticeSeen } from '../alpha.js?v=v0.2.95-alpha';
// UI tools 2 (Oct 22, 2026; Gary: "Add the 5 ready UI tools"): pixelarticons, Kenney UI placeholders, floating-ui tooltips,
// auto-animate lists, anime.js battle-menu transitions. Heavy libs are lazy (see ./ui_tools2.js); ui.fx is the hook for ui_sd.js.
import { showContinue } from '../overworld/save.js?v=v0.2.95-alpha'; // first-launch Continue fix (batch 3 wire)
import { installQol } from '../qol/qol.js?v=v0.2.95-alpha'; // [qol hook] Battle pace / Text speed / Run toggle (Oct 29 2026)
import { UiTools2, pxi, MENU_ICONS, POCKET_ICONS, EMPTY_ICONS, OPTION_ICONS, kuiSlider, kuiCheck } from './ui_tools2.js?v=v0.2.95-alpha';
import { catchNet, NET_TEXT } from '../systems/catch_net.js?v=v0.2.95-alpha';
import { attachWipNotice } from '../systems/wip_notice.js?v=v0.2.95-alpha';
import { captureChance, captureRoll, rarityOf } from '../battle/capture.js?v=v0.2.95-alpha'; // capture rules (Gary, Oct 23 2026)
import { rtbMode, setRtbMode, rtbKilled } from '../rtb/flag.js?v=v0.2.95-alpha'; // real-time wild battles option (Oct 29 2026)
import { DIFFICULTIES, DIFF_ORDER, PENDING_KEY, diffOf, getDifficulty, setDifficulty } from '../systems/difficulty.js?v=v0.2.95-alpha';
import { windEnabled, killedByUrl as windKilledByUrl } from '../overworld/wind.js?v=v0.2.95-alpha'; // Options 'Wind' toggle (Oct 29 2026)
const KPH = 'art/ui/kenney_placeholder/';
const kph = (f, cls = 'ph-ico') => `<img class="${cls}" data-placeholder="kenney" src="${KPH}${f}.png" alt="" aria-hidden="true" draggable="false">`;
const LRUD_KEY = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const get = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
const fill = (t, v) => String(t).replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? v[k] : m));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const PIX = 'art/characters/pixel/';
const icon = (sp, f = 0, sz = '2x') => { const rel = iconRel(sp, f, sz); return rel ? PIX + rel : `${PIX}icons/${sp}_icon_f${f}${sz ? '_' + sz : ''}.png`; }; // synced sets: own icon/ow frames
const front = (sp) => PIX + battleSpriteRel(sp, 'front'); // creature sync: 160px big forms
const back = (sp) => PIX + battleSpriteRel(sp, 'back');
const fx = (el, anim = 'impact') => `${fxStem(el, anim)}.gif`; // live path (kept for callers); playback goes through ./hit_fx.js
const lvlOf = (f) => (f > 0.5 ? 'good' : f > 0.2 ? 'warn' : 'bad');

// tiny crisp glyphs (12x12 grids) for app badges: '#' = ink
const GLYPHS = {
  team: ['....##..##..', '...####.####', '...####.####', '....##..##..', '..##......##', '.####....###', '.####....###', '..##..##..#.', '.....####...', '....######..', '....######..', '.....####...'],
  pack: ['....####....', '...#....#...', '..########..', '.##########.', '.##......##.', '.##.####.##.', '.##.#..#.##.', '.##.####.##.', '.##......##.', '.##########.', '..########..', '............'],
  kilindex: ['.##########.', '.#........##', '.#.######.##', '.#........##', '.#.####...##', '.#........##', '.#..##....##', '.#.####...##', '.#..##....##', '.#........##', '.##########.', '............'],
  tasks: ['..########..', '.#........#.', '.#......#.#.', '.#.....##.#.', '.#.#..##..#.', '.#.####...#.', '.#..##....#.', '.#........#.', '.#.######.#.', '.#........#.', '..########..', '............'],
  map: ['....####....', '...######...', '..###..###..', '..##....##..', '..###..###..', '...######...', '...######...', '....####....', '.....##.....', '..#..##..#..', '.##########.', '............'],
  contacts: ['....####....', '...######...', '...######...', '...######...', '....####....', '............', '..########..', '.##########.', '.##########.', '.##########.', '............', '............'],
  save: ['.#########..', '.#...#...##.', '.#...#...#.#', '.#...#...#.#', '.#########.#', '.#.........#', '.#.#######.#', '.#.#.....#.#', '.#.#######.#', '.#.#.....#.#', '.###########', '............'],
  options: ['.....##.....', '..#.####.#..', '.##########.', '..###..###..', '.###....###.', '####....####', '####....####', '.###....###.', '..###..###..', '.##########.', '..#.####.#..', '.....##.....'],
  archive: ['.##########.', '.#........#.', '.#.##..##.#.', '.#.##..##.#.', '.#........#.', '.##########.', '.#........#.', '.#.##..##.#.', '.#.##..##.#.', '.#........#.', '.##########.', '............'],
  shop: ['............', '.##########.', '#.#.#.#.#.##', '############', '.#........#.', '.#.###....#.', '.#.#.#.##.#.', '.#.#.#.##.#.', '.#.###....#.', '.#........#.', '.##########.', '............'],
  battle: ['#.........##', '.#.......###', '..#.....###.', '...#...###..', '....#.###...', '.....###....', '....###.#...', '..####...#..', '..###.....#.', '.##........#', '##..........', '............'],
  badges: ['...######...', '..#......#..', '.#..####..#.', '#..#....#..#', '#.#..##..#.#', '#.#.####.#.#', '#.#.####.#.#', '#.#..##..#.#', '#..#....#..#', '.#..####..#.', '..#......#..', '...######...'],
  feeds: ['.....##.....', '......#.##..', '...####.#...', '..########..', '.###########', '.####.######', '.###.#######', '.###########', '.###########', '..#########.', '...#######..', '....####....'], // fruit (Feeds, v0.2.69)
  menu: ['............', '.##########.', '.##########.', '............', '............', '.##########.', '.##########.', '............', '............', '.##########.', '.##########.', '............'],
};
const ICONS_PX = typeof location === 'undefined' || new URLSearchParams(location.search).get('icons') !== 'classic'; // ?icons=classic: old 12x12 glyphs
const glyph = (k, color = 'var(--ink)') => (ICONS_PX && MENU_ICONS[k] ? pxi(MENU_ICONS[k], 'pxi-g', color) : glyph12(k, color));
const glyph12 = (k, color) => `<svg viewBox="0 0 12 12" shape-rendering="crispEdges" aria-hidden="true">${(GLYPHS[k] || GLYPHS.menu)
  .flatMap((row, y) => [...row].map((c, x) => (c === '#' ? `<rect x="${x}" y="${y}" width="1" height="1" fill="${color}"/>` : ''))).join('')}</svg>`;

const ELS = (sp) => speciesById(sp).el;
// UI tools 2: floating-ui tooltip attributes (text only; ui_tools2.js sets it with textContent)
const tipAttr = (title, body) => ` data-tip-t="${esc(title)}" data-tip="${esc(body)}"`;
const elNames = (els) => els.map((e) => ELEMENT_LABEL(e)).join(' / ');
const elChip = (e) => `<span class="el-chip" data-el="${e}" data-pat="stripes">${esc(ELEMENT_LABEL(e))}</span>`;

function hasSessionHintUI() { try { for (let i = 0; i < localStorage.length; i++) if (/^sb-[a-z0-9]+-auth-token$/.test(localStorage.key(i) || '')) return true; } catch (e) { /* */ } return false; }
export class GameUI {
  constructor({ scene, platform, toast, params = new URLSearchParams(location.search), root = document.body }) {
    this.scene = scene; this.platform = platform; this.toastFn = toast; this.q = params; this.body = root;
    this.cfg = platform?.profile?.ui || {};
    this.demo = params.get('uidemo') === '1';
    this.stack = []; this.modal = null; this.active = false;
    this.gold = this.demo ? DEMO.gold : null; this.bag = this.demo ? { ...DEMO.bag } : {};
    this._padPrev = false; this._heldDir = null; this._heldT = 0;
    this._applyProfile();
    this._build();
    this.fx = new UiTools2(this); // UI tools 2: tooltips, list animation, battle transitions (lazy libs)
    this._wrapStep();
    this._keys();
    this._touchFx();
    this._dialogFx();
    this._loop();
    root.classList.add('ui-skin');
    if (this._reduced()) root.classList.add('ui-reduce');
  }

  // ---------- platform profile -> CSS vars ----------
  _applyProfile() {
    const vars = this.cfg.vars || {};
    for (const [k, v] of Object.entries(vars)) this.body.style.setProperty(`--ui-${k}`, String(v));
    const setScale = () => {
      const rows = this.cfg.spriteScale || [{ minHeight: 0, scale: 2 }];
      let s = rows[0].scale; for (const r of rows) if (innerHeight >= r.minHeight) s = r.scale;
      this.body.style.setProperty('--ui-sprite-scale', String(s));
    };
    setScale(); addEventListener('resize', setScale);
    for (const n of this.cfg.hideTouchDuringUI || []) this.body.classList.add(`ui-can-hide-${n}`);
  }
  _reduced() {
    if (this.q.get('motion') === 'reduce') return true;
    try { if (localStorage.getItem('kilumen_alpha_ui.motion') === 'reduce') return true; } catch { /* private mode */ }
    return false;
  }

  // ---------- DOM ----------
  _build() {
    const el = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; parent?.appendChild(e); return e; };
    this.hud = el('div', 'ui-hud', this.body); this.hud.dataset.scr = 'hud';
    this.banner = el('div', 'hud-banner', this.hud); this.banner.dataset.pat = 'crystal'; this.banner.dataset.scr = 'phone';
    this.hudTop = el('div', 'hud-top', this.hud);
    this.clock = el('div', 'hud-clock', this.hudTop);
    const touch = !!this.platform?.profile?.controls?.touch;
    const mb = this.cfg.menuButton ?? (touch ? 'round' : 'chip');
    if (mb) {
      this.menuBtn = el('button', 'hud-menu', this.hudTop, touch ? `${glyph('menu')}<span>Menu</span>` : `${glyph('menu')}<span>Menu</span><span class="k">Esc</span>`);
      this.menuBtn.dataset.pat = 'dots'; this.menuBtn.dataset.scr = 'title'; this.menuBtn.setAttribute('aria-label', 'Open menu');
      this.menuBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.requestOpen('phone'); });
      // "I'm stuck" (Gary Oct 24): teleport to the front of the spawn house
      this.stuckBtn = el('button', 'hud-stuck', this.hudTop, "I'm stuck");
      this.stuckBtn.setAttribute('aria-label', "I'm stuck: return to your house");
      this.stuckBtn.addEventListener('pointerdown', async (e) => { e.preventDefault(); e.stopPropagation();
        const sc = this.scene; if (sc.saveLocked || sc.fade || sc.busy) return;
        const sp = await sc._homeStart(true); if (sp) sc.startWarp(sp, 'stuck'); });
    }
    this.prompt = el('div', 'hud-prompt', this.hud, `<span class="g">A</span><span class="t">Talk</span>`);
    this.root = el('div', 'ui-root', this.body); this.root.hidden = true; this.root.setAttribute('role', 'dialog'); this.root.setAttribute('aria-modal', 'true'); this.root.setAttribute('aria-label', 'Kilumen');
    this.backdrop = el('div', 'ui-backdrop', this.root);
    this.stage = el('div', 'ui-stage', this.root);
    this.layer = el('div', '', this.root); // full-screen screens (title, battle)
    this.root.addEventListener('pointerdown', (e) => this._pointer(e));
    this.root.addEventListener('mousemove', (e) => { const t = e.target.closest?.('[data-i]'); if (t && this.top && !this.modal && !this._dragging && e.movementX + e.movementY !== 0) this._select(+t.dataset.i, true); });
    this.root.addEventListener('pointerup', (e) => this._tapUp(e)); // UI tools pass: drag screens activate on release
    this.root.addEventListener('focusin', (e) => { const it = e.target.closest?.('[data-i]'); if (it && this.top && !this.modal && this.stage.contains(it)) this._select(+it.dataset.i, true); });
  }

  get top() { return this.stack[this.stack.length - 1] || null; }
  T(path, fb) { const v = get(this.scene.lines, path); return v == null ? fb : v; }
  P(path, fb, vars = {}) { const v = this.T(path, null); const pages = Array.isArray(v) ? v : v?.pages || fb; return (pages || []).map((t) => fill(t, { player: this.scene.config?.playerName || 'Cal', ...vars })); }
  party() { return this.scene.party?.length ? this.scene.party : this.demo ? DEMO.party : []; }

  // ---------- input ----------
  _wrapStep() {
    const s = this.scene, orig = s.step.bind(s);
    s.step = (snap) => {
      if (this.active && !s.dialog?.active) { this._input(snap); return orig({ ...snap, dir: null, a: false, b: false, bTap: false, select: false }); }
      if (this._pendingOpen && this._canOpen()) { const id = this._pendingOpen; this._pendingOpen = null; this.open(id); }
      return orig(snap);
    };
  }
  _canOpen() { const s = this.scene; return !s.dialog?.active && !s.busy && !s.fade && !s.player?.moving && !!s.map; }
  requestOpen(id = 'phone') { if (this.active) return; if (this._canOpen()) this.open(id); else this._pendingOpen = id; }
  _keys() {
    const keys = new Set(this.cfg.menuKeys || ['Escape', 'KeyM']);
    addEventListener('keydown', (e) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (!keys.has(e.code)) return;
      e.preventDefault();
      // v0.2.61: Escape mashed during the phone menu's open/close animation toggled it back and forth; one toggle per 250 ms
      const now = performance.now(); if (now - (this._menuKeyT || 0) < 250) return; this._menuKeyT = now;
      // v0.2.54: Escape is also a B key in overworld/input.js, so the same press used to reach _input as a B edge and
      // instantly back()/close the menu it just opened (Gary 11:03 Oct 29). Eat the B from this press until it is released.
      this._eatB = true;
      if (this.active) { if (this.modal) this._modalBack(); else this.back(); } else this.requestOpen('phone');
    });
  }
  _input(snap) {
    // pad Start (opens/closes) is polled here so it works with any profile
    const pads = navigator.getGamepads?.() || [], btn = this.cfg.menuPadButton ?? 9;
    const start = [...pads].some((p) => p?.buttons?.[btn]?.pressed);
    const startEdge = start && !this._padPrev; this._padPrev = start;
    let bEdge = (!!snap.b && !this._bPrev) || !!snap.bTap; this._bPrev = !!snap.b;
    if (this._eatB) { bEdge = false; if (!snap.b) this._eatB = false; }
    let dir = null;
    if (snap.dir !== this._heldDir) { this._heldDir = snap.dir || null; this._heldT = 0; dir = snap.dir || null; }
    else if (snap.dir) { this._heldT++; if (this._heldT > 22 && this._heldT % 6 === 0) dir = snap.dir; }
    if (startEdge) { this.closeAll(); return; }
    if (this.modal) { this.modal.handle({ dir, a: !!snap.a, b: bEdge }); return; }
    const t = this.top; if (!t) return;
    const dev = this.scene.input?.lastDevice; // UI tools pass: swap keyboard <-> controller glyphs when the device changes
    if (dev !== this._hintDev) { this._hintDev = dev; const h = this.stage.querySelector('.ui-hint'); if (h && t.hint) h.innerHTML = t.hint(); }
    if (t.handle) { t.handle({ dir, a: !!snap.a, b: bEdge }); return; }
    if (dir) this._nav(dir);
    if (snap.a) this._activate();
    else if (bEdge) this.back();
  }
  _nav(dir) {
    const t = this.top, n = t.count?.() ?? 0, cols = t.cols || 1;
    if ((dir === 'left' || dir === 'right') && cols === 1 && t.onLR) { t.onLR(dir === 'left' ? -1 : 1); return; }
    if (!n) return;
    const sp = this._spatial(dir); if (sp != null) { this._select(sp); return; } // nothing that way -> index maths below
    const d = { up: -cols, down: cols, left: -1, right: 1 }[dir];
    let i = t.sel + d;
    if (cols > 1 && (dir === 'left' || dir === 'right') && t.onLR && Math.floor(i / cols) !== Math.floor(t.sel / cols)) { t.onLR(d); return; }
    i = Math.max(0, Math.min(n - 1, i));
    this._select(i);
  }
  _spatial(dir) {
    const t = this.top; if (!t || t.full || this.q.get('spatial') === '0') return null;
    const cur = this.stage.querySelector(`[data-i="${t.sel}"]`); if (!cur) return null;
    let nx = null; try { nx = getNextFocus(cur, LRUD_KEY[dir], this.stage); } catch { return null; }
    const it = nx?.closest?.('[data-i]'); const i = it && this.stage.contains(it) ? +it.dataset.i : NaN;
    return Number.isFinite(i) && i !== t.sel && i < (t.count?.() ?? 0) ? i : null;
  }
  _select(i, quiet) {
    const t = this.top; if (!t || i === t.sel) return;
    t.sel = i; this._markSel(); t.onSel?.(i); this.fx?.tipSel(); this.fx?.selMove(); // selMove: anime.js item pop (menu motion)
    if (!quiet) this.scene.audio?.sfx('cursor'); // libs pass: placeholder menu sounds (src/audio)
  }
  _markSel() {
    const t = this.top; if (!t) return;
    for (const e of this.root.querySelectorAll('[data-i]')) { const on = +e.dataset.i === t.sel; e.classList.toggle('sel', on); e.tabIndex = 0;
      // axe aria-allowed-attr: aria-selected only on roles that support it; plain buttons/links mark the cursor with aria-current
      if (e.matches('[role="option"],[role="tab"],[role="row"],[role="gridcell"],[role="treeitem"],[role="columnheader"],[role="rowheader"]')) e.setAttribute('aria-selected', String(on));
      else { e.removeAttribute('aria-selected'); if (on) e.setAttribute('aria-current', 'true'); else e.removeAttribute('aria-current'); } }
    this.root.querySelector(`[data-i="${t.sel}"]`)?.scrollIntoView?.({ block: 'nearest' });
  }
  _activate() { const t = this.top; if (t?.onA) { this.scene.audio?.sfx('select'); t.onA(t.sel); } }
  _pointer(e) {
    const act = e.target.closest?.('[data-act]');
    if (act) { e.preventDefault(); this._act(act.dataset.act, act); return; }
    if (this.modal) { const r = e.target.closest?.('[data-m]'); if (r) { e.preventDefault(); this.modal.pick(+r.dataset.m); } return; }
    const t = this.top; if (!t) return;
    if (t.sortable) { const it = e.target.closest?.('[data-i]'); if (it) { this._tap = { id: e.pointerId, x: e.clientX, y: e.clientY, i: +it.dataset.i }; return; } }
    if (t.handlePointer && t.handlePointer(e)) return;
    const tab = e.target.closest?.('[data-tab]');
    if (tab) { e.preventDefault(); t.onTab?.(+tab.dataset.tab); return; }
    const it = e.target.closest?.('[data-i]');
    if (it) { e.preventDefault(); const i = +it.dataset.i; const same = i === t.sel; this._select(i, true); if (same || e.pointerType !== 'mouse' || true) this._activate(); }
  }
  _tapUp(e) {
    const p = this._tap, t = this.top; this._tap = null;
    if (this._tipHold) { this._tipHold = false; return; } // UI tools 2: a long-press showed a tooltip, so do not open / pick
    if (!p || !t || this.modal || this._dragging || p.id !== e.pointerId || Math.hypot(e.clientX - p.x, e.clientY - p.y) > 10) return;
    if (!this.stage.querySelector(`[data-i="${p.i}"]`)) return;
    this._select(p.i, true); this._activate();
  }
  _act(a, elx) {
    if (a === 'close') { this.modal ? this._modalBack() : this.back(); }
    else if (a === 'start') this.top?.onA?.(0);
    else this.top?.onAct?.(a, elx);
  }

  // ---------- open / close / stack ----------
  open(id, arg) {
    const scr = this._make(id, arg); if (!scr) return;
    if (!this.active) {
      this.active = true; this.root.hidden = false; this.root.classList.add('open'); this.body.classList.add('ui-open');
      for (const n of this.cfg.hideTouchDuringUI || []) this.body.classList.add(`tp-hide-${n}`, 'ui-hid-' + n);
    }
    this.stack.push(scr); this._render('in'); this.fx?.warm();
  }
  replace(id, arg) { this.stack.pop(); const scr = this._make(id, arg); this.stack.push(scr); this._render('in'); }
  back() {
    const t = this.top; if (!t) return;
    this.scene.audio?.sfx('back');
    if (t.onBack && t.onBack() === false) return;
    this.stack.pop();
    if (!this.stack.length) this._closeRoot(); else this._render('back');
  }
  closeAll() { this.stack = []; this.modal = null; this._closeRoot(); }
  _closeRoot() {
    this.fx?.closeOut(); // menu motion: an inert clone fades out; the real UI closes now, so input is never held
    this.active = false; this.root.classList.remove('open'); this.root.hidden = true; this.stage.innerHTML = ''; this.layer.innerHTML = ''; this.modal = null;
    this.body.classList.remove('ui-open'); this.fx?.tipHide();
    for (const n of this.cfg.hideTouchDuringUI || []) {
      this.body.classList.remove('ui-hid-' + n);
      if (!this.scene.dialog?.active) this.body.classList.remove(`tp-hide-${n}`); // the dialogue owns them while it is open
    }
    if (this.scene.dialog?.active) this.scene.dialog._controlsState?.(); // phone menu fix: hand the controls back to the open dialogue's state
    this._onClose?.(); this._onClose = null;
  }
  _render(anim) {
    const t = this.top; if (!t) return;
    this.root.dataset.scr = t.scr;
    this._touchFor(t.scr);
    const full = !!t.full;
    this.stage.hidden = full; this.layer.hidden = !full; this.backdrop.hidden = full;
    const keep = this.fx?.keep(this.stage, t); // UI tools 2: auto-animate reuses same-screen list nodes
    if (!full) {
      this.backdrop.dataset.scr = t.scr; this.backdrop.dataset.pat = t.pat || 'dots'; this.backdrop.toggleAttribute('data-scroll', true);
      this.stage.dataset.scr = t.scr;
      this.stage.innerHTML = `<div class="ui-head"><div class="ui-title"><span class="ico">${glyph(t.glyph || t.scr, '#fff')}</span>${esc(t.title)}</div>
        <span class="ui-spacer"></span>${t.chips ? t.chips() : ''}<button class="ui-x" data-act="close" aria-label="Back">&#x2715;</button></div>${t.render()}
        ${t.hint ? `<div class="ui-hint">${t.hint()}</div>` : ''}`;
      if (keep) this.fx.adopt(this.stage, keep);
      this.stage.classList.remove('in', 'back'); void this.stage.offsetWidth; this.stage.classList.add(anim === 'back' ? 'back' : 'in');
      this.fx?.menuIn(this.stage, anim); // menu motion: anime.js open / back (120-220 ms; CSS fallback, none when reduced)
    } else { this.layer.innerHTML = ''; this.layer.dataset.scr = t.scr; t.mount(this.layer); }
    this._markSel(); t.after?.(); this._uiTools(t);
  }
  _touchFor(scr) { // phone menu fix (Oct 23, 2026): profile ui.keepTouchOn {screen: [names]} keeps e.g. A/B on battle (B backs out of its submenus)
    const keep = this.cfg.keepTouchOn?.[scr] || [];
    for (const n of this.cfg.hideTouchDuringUI || []) {
      const hide = !keep.includes(n);
      this.body.classList.toggle('ui-hid-' + n, hide);
      if (hide) this.body.classList.add(`tp-hide-${n}`); else if (!this.scene.dialog?.active) this.body.classList.remove(`tp-hide-${n}`);
    }
    if (this.scene.dialog?.active) this.scene.dialog._controlsState?.();
  }
  _uiTools(t) { // UI tools pass: keep lrud on [data-i] items; SortableJS on screens that return sortable()
    for (const b of this.stage.querySelectorAll('button:not([data-i]), a:not([data-i]), input')) b.classList.add('lrud-ignore');
    try { this._sortable?.destroy(); } catch { /* element already gone */ }
    this._sortable = null; this._dragging = false;
    const s = !t.full && t.sortable?.(); if (!s) return;
    const el = this.stage.querySelector(s.el); if (!el) return;
    const make = (Sortable) => {
      if (this.top !== t || !el.isConnected) return;
      this._sortable = Sortable.create(el, { animation: 150, forceFallback: true, fallbackTolerance: 6, delay: 160, delayOnTouchOnly: true, touchStartThreshold: 6,
        draggable: s.draggable, swap: !!s.swap, swapClass: 'ui-swap-hl', ghostClass: 'ui-drag-ghost', chosenClass: 'ui-drag-chosen', dragClass: 'ui-drag-fly', scroll: true, bubbleScroll: true,
        onStart: () => { this._dragging = true; this._tap = null; this._tipHold = false; this.root.classList.add('ui-dragging'); this.fx?.dragging(true); },
        onEnd: (ev) => {
          this.root.classList.remove('ui-dragging'); setTimeout(() => { this._dragging = false; }, 0); this.fx?.dragging(false);
          const order = [...el.querySelectorAll(s.draggable)].map((n) => +n.dataset.i);
          if (order.every((v, k) => v === k)) return;
          this.scene.audio?.sfx('select'); s.onReorder(order, +ev.item.dataset.i);
        } });
      el.dataset.sortable = 'on';
    };
    (GameUI._sortableP ||= import('../vendor/sortablejs/sortable.esm.min.js?v=v0.2.95-alpha').then((m) => m.default)).then(make).catch((e) => console.warn('sortable:', e.message));
  }
  async _reorderTeam(order, moved) { // drag-to-reorder: same creature objects, new order (duplicates of a species are kept)
    const s = this.scene, real = !!s.party?.length, list = this.party(), name = (c) => c.nickname || speciesById(c.species).name;
    const next = order.map((k) => list[k]).filter(Boolean); if (next.length !== list.length) { this.rerender(); return; }
    const lead = next[0] !== list[0];
    if (real) { s.party = next; s._dirty = true; if (lead) { s._placeFollower?.(); await s._loadActorSprites?.(); } }
    else list.splice(0, list.length, ...next); // ?uidemo party: memory only, never saved
    if (this.top?.scr !== 'team') return;
    this.stack[this.stack.length - 1] = this._make('team'); this.top.sel = Math.max(0, order.indexOf(moved)); this.rerender();
    if (lead) this.note(this.P('system_party.new_lead', ['{creature} takes the lead. It looks pleased.'], { creature: name(next[0]) })[0], 2200);
  }
  rerender() { const t = this.top; if (!t || t.full) return; const s = this.stage.querySelector('.ui-scroll')?.scrollTop; this._render(); this.stage.classList.remove('in', 'back'); const sc = this.stage.querySelector('.ui-scroll'); if (sc && s) sc.scrollTop = s; }
  hintText(parts) {
    const touch = !!this.platform?.profile?.controls?.touch;
    const pad = this.scene.input?.lastDevice === 'controller';
    if (!touch || pad) { // UI tools pass: Kenney input-prompt PLACEHOLDER glyphs (keyboard, or Xbox when a pad was used last); text kept for readers
      const G = pad ? { A: ['xbox_button_a'], B: ['xbox_button_b'], '▲▼◀▶': ['xbox_dpad_all'], '▲▼': ['xbox_dpad_vertical'], '◀▶': ['xbox_dpad_horizontal'] }
        : { A: ['keyboard_z', 'keyboard_enter'], B: ['keyboard_x', 'keyboard_escape'], '▲▼◀▶': ['keyboard_arrows_all'], '▲▼': ['keyboard_arrows_vertical'], '◀▶': ['keyboard_arrows_horizontal'] };
      const T = pad ? { A: 'A', B: 'B' } : { A: 'Z / Enter', B: 'X / Esc' };
      return parts.map(([k, v]) => (G[k] ? `<span class="ph-keys">${G[k].map((f) => kph(f, 'ph-key')).join('')}<span class="sr">${T[k] || k}</span></span> ${v}` : `${k} ${v}`)).join(' &nbsp;·&nbsp; ');
    }
    return parts.map(([k, v]) => `${touch ? (k === 'A' ? 'Tap / A' : k === 'B' ? 'B or X' : k) : k === 'A' ? 'Z / Enter' : k === 'B' ? 'X / Esc' : k} ${v}`).join(' &nbsp;·&nbsp; ');
  }

  // ---------- notes, sparkles ----------
  note(text, ms = 1800) {
    const n = document.createElement('div'); n.className = 'ui-note'; n.textContent = text; this.root.appendChild(n);
    setTimeout(() => n.remove(), ms);
  }
  sparkle(x, y, n = 14, parent = this.root) {
    if (this.body.classList.contains('ui-reduce') || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('i'); s.className = 'ui-spark'; const a = (i / n) * Math.PI * 2, r = 50 + Math.random() * 60;
      s.style.cssText = `left:${x}px;top:${y}px;--dx:${Math.cos(a) * r}px;--dy:${Math.sin(a) * r}px;background:${['#ffd23f', '#ff8ad8', '#7fd4ff', '#fff'][i % 4]}`;
      parent.appendChild(s); setTimeout(() => s.remove(), 950);
    }
  }

  // ---------- modal (choices) ----------
  ask(scr, text, choices, { pat = 'sparkle' } = {}) {
    return new Promise((resolve) => {
      const wrap = document.createElement('div'); wrap.className = 'ui-modal'; wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true'); wrap.setAttribute('aria-label', text[0] || 'Message'); this.fx?.tipHide();
      const draw = (sel) => { // UI tools 2: moves only toggle .sel (rows are built once, so auto-animate can slide them in)
        if (wrap.firstChild) { for (const r of wrap.querySelectorAll('[data-m]')) { r.classList.toggle('sel', +r.dataset.m === sel); if (+r.dataset.m === sel) r.scrollIntoView?.({ block: 'nearest' }); } return; } // short screens scroll the list (Oct 29 2026)
        wrap.innerHTML = `<div class="ui-panel ui-pad" data-scr="${scr}" data-pat="${pat}" data-scroll><div class="plate ui-pad" style="margin-bottom:10px">${text.map(esc).join('<br>')}</div>
          <ul class="ui-list"></ul></div>`;
      };
      let sel = 0; draw(sel); this.root.appendChild(wrap);
      const rowsHtml = choices.map((c, i) => `<li class="ui-row ${i === sel ? 'sel' : ''}" data-m="${i}">${esc(c)}</li>`).join(''), ul = wrap.querySelector('.ui-list');
      if (this.fx) this.fx.listIn(ul, rowsHtml); else ul.innerHTML = rowsHtml;
      const done = (i) => { wrap.remove(); this.modal = null; resolve(i); };
      this.modal = {
        handle: ({ dir, a, b }) => { if (dir === 'up' || dir === 'down') { sel = (sel + (dir === 'up' ? -1 : 1) + choices.length) % choices.length; draw(sel); } if (a) done(sel); else if (b) done(-1); },
        pick: (i) => done(i), back: () => done(-1),
      };
    });
  }
  _modalBack() { this.modal?.back?.(); }

  // ---------- overworld HUD loop ----------
  _loop() {
    const tick = (t) => {
      try { this._hud(t); } catch (e) { /* HUD must never break the game */ }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    setInterval(() => { if (this.body.classList.contains('ui-reduce')) return; for (const im of document.querySelectorAll('img.ui-icon.flip')) { const f = im.dataset.f === '1' ? '0' : '1'; im.dataset.f = f; im.src = icon(im.dataset.sp, f); } }, 420);
  }
  _hud() {
    const s = this.scene; if (!s.map) return;
    this.body.classList.toggle('ui-dlg-open', !!s.dialog?.active);
    // location banner on map change
    // Area name sign (Gary 10:33 AM CT): the scene decides (outdoor/cave maps only, no edge bounce re-show) and calls
    // onAreaSign after the fade-in; older scenes without the hook keep the plain map-change banner.
    if (typeof s._areaSignEnter === 'function') {
      if (!this._areaHooked) {
        this._areaHooked = true;
        s.onAreaSign = (a) => { if (this.cfg.locationBanner !== false) this.showBanner(a.title, a.holdMs); };
        if (s.areaSign && s.tick - s.areaSign.tick < 30) s.onAreaSign(s.areaSign); // fired just before the UI mounted
      }
    } else if (s.map.name !== this._lastMap && !s.fade) {
      const first = this._lastMap == null; this._lastMap = s.map.name;
      if (this.cfg.locationBanner !== false && !(first && this.active)) this.showBanner(s.map.title || s.map.name);
    }
    // v0.2.61: a warp (dev Travel, heal, fly) into a map with no sign of its own left the last town's 'TOWN Fernwick'
    // plate in the banner (seen inside the Saltmere / Mirefen halls and the rest centre). Every map change now drops a
    // banner that belongs to another map and re-labels it for the current one.
    if (s.map.name !== this._bannerMap) {
      this._bannerMap = s.map.name;
      if (this.banner?.dataset.map && this.banner.dataset.map !== s.map.name) {
        clearTimeout(this._bannerT); this.banner.classList.remove('show');
        const here = s.areaSign?.map === s.map.name ? s.areaSign.title : (areaName(s.map, (k) => s.text?.(k)).title || '');
        this.banner.innerHTML = here ? `<span class="kind">${this._bannerKind()}</span><span class="plate">${esc(here)}</span>` : '';
        this.banner.dataset.title = here; this.banner.dataset.map = s.map.name;
      }
    }
    // clock
    const h = s.hour, m = Math.floor(s.clock.min % 60), ph = s.phase;
    const txt = `Day ${s.clock.day} · ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    if (txt !== this._clockTxt) { this._clockTxt = txt; this.clock.innerHTML = `<span class="sky ${ph === 'night' ? 'night' : ''}"></span>${txt}`; }
    // A prompt over the faced thing
    if (this.cfg.interactPrompt !== false) this._promptTick();
  }
  _bannerKind(zone = (this.scene.layout?.zones || []).find((z) => z.id === this.scene.zone?.())) {
    const n = this.scene.map.name;
    return /_int$|^home_|^house_|^heal_|^lab_|^rt_|^office|^shop|^station|^club/.test(n) ? 'Indoors' : /^greystone/.test(n) ? 'Cave' : zone?.type === 'town' ? 'Town' : /^route|thornwood|mirefen/.test(n) ? 'Trail' : 'Area';
  }
  showBanner(title, holdMs) {
    const zone = (this.scene.layout?.zones || []).find((z) => z.id === this.scene.zone?.());
    const kind = this._bannerKind(zone);
    const pat = { Town: 'dots', Trail: 'leaf', Indoors: 'lattice', Area: 'crystal', Cave: 'crystal' }[kind];
    const scr = { Town: 'team', Trail: 'pack', Indoors: 'kilindex', Area: 'phone', Cave: 'phone' }[kind];
    this.banner.dataset.pat = pat; this.banner.dataset.scr = scr;
    title = String(title ?? '').replace(/^\s*DRAFT\s*[-–:]\s*/i, ''); // playtest fixes 3: dev marker never shown
    this.banner.innerHTML = `<span class="kind">${kind}</span><span class="plate">${esc(title)}</span>`;
    this._fitBanner();
    this.banner.classList.remove('show'); void this.banner.offsetWidth; this.banner.classList.add('show');
    clearTimeout(this._bannerT); this._bannerT = setTimeout(() => this.banner.classList.remove('show'), holdMs ? this._bannerSlideMs() + holdMs : (this.cfg.bannerMs || 2600));
    this.banner.dataset.title = title; this.banner.dataset.map = this.scene.map.name; this.bannerShownAt = performance.now();
  }
  /** Keep the sign clear of the top-right HUD pills (clock, menu): cap its width at the gap, the plate ellipsizes. */
  _fitBanner() {
    try {
      const top = this.hud.querySelector('.hud-top')?.getBoundingClientRect(), b = this.banner;
      const left = b.offsetLeft || 0, right = top && top.width ? top.left : window.innerWidth;
      b.style.maxWidth = `min(var(--ui-banner-max, 46vw), ${Math.max(120, Math.floor(right - left - 12))}px)`;
    } catch { /* layout not ready */ }
  }
  /** Slide-in time (CSS --t-slow) so the hold starts once the sign is fully in. */
  _bannerSlideMs() { const v = getComputedStyle(this.banner).transitionDuration || '0s'; const n = parseFloat(v) || 0; return /ms/.test(v) ? n : n * 1000; }
  _promptTick() {
    const s = this.scene, p = s.player, show = (on) => this.prompt.classList.toggle('show', on);
    if (!p || this.active || s.dialog?.active || s.busy || s.fade || p.moving || !s._cam) { show(false); return; }
    const D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[p.facing]; if (!D) { show(false); return; }
    const m = s.map; let hit = null, verb = 'Check';
    const fx0 = p.x + D[0], fy0 = p.y + D[1];
    if (s.spots?.some((sp) => sp.kind !== 'trigger' && sp.x === fx0 && sp.y === fy0)) hit = [fx0, fy0];
    else for (let k = 1; k <= 3 && !hit; k++) {
      const x = p.x + D[0] * k, y = p.y + D[1] * k;
      if (!m.inBounds(x, y)) break;
      if (m.signs?.some((sg) => sg.x === x && sg.y === y)) { hit = [x, y]; verb = 'Read'; break; }
      if (m.npcAt?.(x, y)) { hit = [x, y]; verb = 'Talk'; break; }
      const c = m.code(x, y); if (c === 0 || c === 4 || c === 7) break; // Col.WALK / DOOR / PLATE: open floor, as in Overworld.interact
    }
    if (!hit) { show(false); return; }
    const ts = s.map?.json?.tile_size || 64, z = s.zoom, /* world tile (camera units); tileset.size is the zoomed sheet (128 at 2x), which put the bubble off screen */ cv = s.canvas, cr = cv.getBoundingClientRect(), k = cr.width / cv.width;
    const x = cr.left + ((hit[0] + 0.5) * ts - s._cam.x) * z * k, y = cr.top + ((hit[1] - (verb === 'Talk' ? 0.5 : 0)) * ts - s._cam.y) * z * k - 4; // NPC sprites stand taller than their tile: lift half a tile so the bubble clears the head
    // PC talk prompt (Gary 11:31 AM CT Oct 23): keyboard shows a keycap (profile ui.interactKey, 'F'), a pad shows A.
    // Words: profile ui.interactVerbs {npc, sign, object}; the phone profile turns the whole prompt off (interactPrompt).
    const pad = this.platform?.profile?.controls?.touch || this.scene.input?.lastDevice === 'controller';
    const glyphA = pad ? 'A' : (this.cfg.interactKey || 'F'), vb = this.cfg.interactVerbs || {};
    verb = (verb === 'Talk' ? vb.npc : verb === 'Read' ? vb.sign : vb.object) || verb;
    this.prompt.classList.toggle('key', !pad);
    this.prompt.querySelector('.g').textContent = glyphA; this.prompt.querySelector('.t').textContent = verb;
    this.prompt.style.left = `${Math.round(x)}px`; this.prompt.style.top = `${Math.round(y)}px`; show(true);
  }

  // ---------- touch control press feedback (visual only; input.js still owns the input) ----------
  _touchFx() {
    const tp = document.getElementById('touchpad'); if (!tp) return;
    const down = new Map();
    const press = (b, e) => {
      if (!b) return; b.classList.add('ui-down'); b.classList.remove('ui-ripple'); void b.offsetWidth; b.classList.add('ui-ripple');
      down.set(e.pointerId, b); navigator.vibrate?.(this.cfg.haptics ? 8 : 0);
    };
    const release = (e) => { const b = down.get(e.pointerId); if (b) { b.classList.remove('ui-down'); down.delete(e.pointerId); } };
    tp.addEventListener('pointerdown', (e) => press(e.target.closest('button'), e), { passive: true });
    tp.addEventListener('pointermove', (e) => {
      const cur = down.get(e.pointerId); if (!cur || !cur.dataset.dir) return;
      const b = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('#touchpad [data-dir]');
      if (b && b !== cur) { cur.classList.remove('ui-down'); press(b, e); }
    }, { passive: true });
    for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) tp.addEventListener(t, release, { passive: true });
    addEventListener('blur', () => { for (const b of down.values()) b.classList.remove('ui-down'); down.clear(); });
  }

  // ---------- dialogue: text reveal + name tag colour (visual only; textContent stays the same) ----------
  _dialogFx() {
    const d = this.scene.dialog; if (!d?.text) return;
    const NAME_COLS = ['#ffd23f', '#ff9d8f', '#8fe0c8', '#9fd3ff', '#f0a8ff', '#b8f0a6', '#ffc06a'];
    const ob = new MutationObserver(() => {
      if (this._revealing) return;
      const t = d.text.textContent;
      if (!t || d.text.querySelector('.rv') || this.body.classList.contains('ui-reduce') || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      this._revealing = true;
      const frag = document.createDocumentFragment(); let i = 0;
      for (const ch of t) { const s = document.createElement('span'); s.className = 'rv'; s.style.setProperty('--i', String(i++)); s.textContent = ch; frag.appendChild(s); }
      d.text.replaceChildren(frag);
      this._revealing = false;
    });
    ob.observe(d.text, { childList: true, characterData: true, subtree: false });
    const ob2 = new MutationObserver(() => {
      const n = d.name.textContent || ''; let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) >>> 0;
      d.name.style.setProperty('--dlg-name-bg', NAME_COLS[h % NAME_COLS.length]);
    });
    ob2.observe(d.name, { childList: true, characterData: true, subtree: true });
  }

  // ---------- screens ----------
  _make(id, arg) {
    const f = this['scr_' + id]; return f ? f.call(this, arg) : null;
  }

  scr_phone() {
    const L = this.T('system_phone.menu.labels', {});
    const apps = [['team', L.team || 'Team', 'team'], ['pack', L.pack || 'Pack', 'pack'], ['kilindex', L.kilindex || 'Kilindex', 'kilindex'], ['tasks', L.tasks || 'Tasks', 'tasks'],
      ['map', L.map || 'Map', 'map'], ['contacts', L.contacts || 'Contacts', 'contacts'], ['save', L.save || "File today's report", 'save'], ['options', L.options || 'Options', 'options'],
      ['rt_benefits', L.rt_benefits || this.T('system_rt_benefits.labels.tab_title', 'RT Employee Benefits'), 'rt_benefits']] // RT Employee Benefits (Oct 23 2026): appended, existing order kept
      .filter(([k]) => k !== 'save' || !this.scene.saveLocked) // save lock: no manual save mid battle / talk / cutscene (overworld.js saveLockReason)
      .filter(([k]) => k !== 'rt_benefits' || typeof this.scr_rt_benefits === 'function'); // only once src/ui/rt_benefits_screen.js installed it
    const hasBdg = typeof this.scr_badges === 'function'; // Badges (v0.2.65): own top-row entry after Tasks; only installed when badgesOn() (?badges=0 kill switch)
    if (hasBdg) apps.splice(4, 0, ['badges', this.T('system_badges.labels.tab', 'Badges'), 'badges']);
    const feeds = globalThis.window?.kilumen?.feeds, hasFeeds = typeof feeds?.open === 'function'; // Feeds (v0.2.69, Gary): top-row entry after Badges; only when src/feeds attached (flag on)
    if (hasFeeds) apps.splice(hasBdg ? 5 : 4, 0, ['feeds', this.T('feeds.title', 'Feeds'), 'feeds']);
    const COLS = { team: '#ff7a6b', pack: '#3fbf6a', kilindex: '#2f9bff', tasks: '#ff6fa8', map: '#47c27a', contacts: '#ff9a3d', save: '#9b6cff', options: '#5a7cff', rt_benefits: '#d98a00', badges: '#c8962a', feeds: '#3b9a3e' };
    const cols = +(this.cfg.vars?.['app-cols'] || 4) + (hasBdg ? 1 : 0) + (hasFeeds ? 1 : 0); // one more column each so Badges sits on the top row
    return { scr: 'phone', pat: 'crystal', title: 'Phone', glyph: 'contacts', sel: Math.min(this._phoneSel || 0, apps.length - 1), cols,
      count: () => apps.length,
      chips: () => `${this.gold != null ? `<span class="ui-chip"><i class="coin"></i>${this.gold.toLocaleString()}</span>` : ''}<span class="ui-chip dark">${esc(this.scene.map?.title || '')}</span>`,
      render: () => `<div class="ui-panel ui-pad ui-grow ui-scroll" data-scr="phone" data-pat="lattice"><div class="ui-apps" style="--ui-app-cols:${cols}">${apps.map(([k, l], i) =>
        `<div class="ui-tile" data-i="${i}" data-app="${k}"><span class="badge" style="background:${COLS[k]}">${k === 'badges' && this.badgeIcon ? this.badgeIcon() : glyph(k, '#fff')}</span><span class="lbl">${esc(l)}</span></div>`).join('')}</div></div>`,
      hint: () => this.hintText([['A', 'Open'], ['B', 'Close']]),
      onA: (i) => { this._phoneSel = i; if (apps[i][0] === 'feeds') { this.closeAll(); setTimeout(() => feeds.open('feed'), 60); return; } this.open(apps[i][0]); }, // Feeds is its own overlay (needs free roam, so the Phone closes first)
      onSel: (i) => { this._phoneSel = i; },
    };
  }

  scr_team() {
    const party = this.party(), L = this.T('system_party.menu.labels', {});
    const seenK = {}, keyOf = (c) => c.rt || `${c.species}#${(seenK[c.species] = (seenK[c.species] || 0) + 1)}`; // UI tools 2: stable auto-animate keys
    const card = (c, i) => {
      const sp = speciesById(c.species), st = statsFor(c, i), f = st.hp / st.hpMax;
      return `<div class="ui-card ${i === 0 ? 'lead' : ''}" data-i="${i}" data-el="${sp.el[0]}" data-k="${esc(keyOf(c))}"${tipAttr(c.nickname || sp.name, `${elNames(sp.el)} · Lv.${st.level} · HP ${st.hp}/${st.hpMax}\n${sp.blurb || ''}`)}><img class="ui-icon flip bob" data-sp="${c.species}" data-f="0" src="${icon(c.species)}" alt="">
        <div class="nm"><span>${esc(c.nickname || sp.name)}${c.variant ? ' ✦' : ''}</span><span class="lv">Lv.${st.level}</span>${sp.el.map(elChip).join('')}</div>
        <div><div class="bar-row"><b>HP</b><div class="bar" data-lvl="${lvlOf(f)}"><i style="width:${(f * 100).toFixed(1)}%"></i></div><span>${st.hp}/${st.hpMax}</span></div></div></div>`;
    };
    return { scr: 'team', pat: 'dots', title: this.T('system_phone.menu.labels.team', 'Team'), glyph: 'team', sel: 0, cols: +(this.cfg.vars?.['team-cols'] || 2), count: () => party.length,
      render: () => `<div class="ui-panel ui-pad ui-grow ui-scroll" data-scr="team" data-pat="dots">${party.length ? `<div class="ui-team" data-aa="team">${party.map(card).join('')}${
        Array.from({ length: Math.max(0, 6 - party.length) }, (_, n) => `<div class="ui-card empty" data-k="empty-${n}"><span class="soft">Empty slot</span></div>`).join('')}</div>`
        : `<div class="plate ui-empty">${pxi(EMPTY_ICONS.team, 'pxi pxi-empty')}No creatures on your team yet.</div>`}</div>`,
      hint: () => this.hintText([['A', 'Choose'], ['B', 'Back']]) + (party.length > 1 ? ' &nbsp;·&nbsp; Drag to reorder' : ''),
      sortable: () => (party.length > 1 ? { el: '.ui-team', draggable: '.ui-card[data-i]', onReorder: (order, moved) => this._reorderTeam(order, moved) } : null),
      onA: async (i) => {
        const c = party[i]; if (!c) return;
        const name = c.nickname || speciesById(c.species).name;
        const opts = [L.summary || 'Summary', ...(i > 0 && this.scene.party?.length ? [L.move || 'Move'] : []), L.back || 'Back'];
        const k = await this.ask('team', [name], opts, { pat: 'dots' });
        if (opts[k] === (L.summary || 'Summary')) this.open('summary', i);
        else if (opts[k] === (L.move || 'Move')) {
          await this.scene.setLead(c.species, { nickname: c.nickname, warmth: c.warmth, rt: c.rt });
          this.note(this.P('system_party.new_lead', ['{creature} takes the lead. It looks pleased.'], { creature: name })[0], 2200); this.replace('team');
        }
      },
    };
  }

  scr_summary(i = 0) {
    const party = this.party(); let page = 0;
    const L = this.T('system_party.summary_labels.labels', {}), K = this.T('catalogue.kilindex_labels', {});
    const gemFor = (c) => { const t = this.scene.warmth?.creatures?.[c.species]; const st = c.warmth >= 75 ? 3 : c.warmth >= 50 ? 2 : c.warmth >= 20 ? 1 : 0; const pal = t?.stages?.[String(st)]; return pal ? Object.values(pal)[3] : '#b076ec'; };
    const scr = { scr: 'summary', pat: 'chevron', title: 'Summary', glyph: 'kilindex', sel: 0, cols: 1, idx: i, count: () => 0,
      render: () => {
        const c = party[scr.idx]; if (!c) return '<div class="plate ui-empty">No creature.</div>';
        const sp = speciesById(c.species), st = statsFor(c, scr.idx), f = st.hp / st.hpMax;
        const info = `<dl class="ui-kv"><dt>${esc(K.catalogue_id || 'Catalogue ID')}</dt><dd>${esc(c.rt || 'RT-????')}</dd><dt>${esc(K.called || 'Called')}</dt><dd>${esc(c.nickname || '—')}</dd>
          <dt>${esc(L.element || 'Element')}</dt><dd>${sp.el.map(elChip).join(' ')}</dd><dt>${esc(L.warmth || 'Crystal')}</dt><dd><i class="ui-gem" style="--gem:${gemFor(c)}"></i></dd>
          <dt>${esc(L.met || 'Met in')}</dt><dd>${esc(sp.found.split(',')[0] || '—')}</dd></dl>
          <div class="bar-row" style="margin-top:10px"><b>HP</b><div class="bar" data-lvl="${lvlOf(f)}"><i style="width:${f * 100}%"></i></div><span>${st.hp}/${st.hpMax}</span></div>
          <div class="bar-row" style="margin-top:6px"><b>XP</b><div class="bar xp"><i style="width:${st.xp}%"></i></div><span>${st.xp}%</span></div>`;
        const skills = `<ul class="ui-list">${skillsFor(c.species).map((s) => `<li class="ui-row" data-el="${s.el}" data-pat="stripes" style="padding-left:12px"${tipAttr(s.name, `${ELEMENT_LABEL(s.el)} skill · Power ${s.power ?? '?'} · ${L.energy || 'Energy'} ${s.en}/${s.enMax}`)}><span class="plate" style="padding:0 10px">${esc(s.name)}</span><span class="ui-spacer"></span><span class="plate dark" style="padding:0 8px;font-size:.8em">${esc(L.energy || 'Energy')} ${s.en}/${s.enMax}</span></li>`).join('')}</ul>`;
        return `<div class="ui-body"><div class="ui-col ui-grow"><div class="ui-stagebox ui-grow" data-el="${sp.el[0]}" data-pat="waves" data-scroll>
          <img class="ui-sprite idle" src="${front(c.species)}" alt="${esc(sp.name)}"></div>
          <div class="plate ui-pad" style="display:flex;gap:10px;align-items:center"><span class="grow" style="font-size:1.2em">${esc(c.nickname || sp.name)}${c.variant ? ' ✦' : ''}</span><span class="lv">${esc(L.level || 'Lv.')}${st.level}</span><span class="soft">${esc(sp.name)}</span></div></div>
          <div class="ui-col ui-grow"><div class="ui-tabs"><div class="ui-tab ${page === 0 ? 'on' : ''}" data-tab="0">Info</div><div class="ui-tab ${page === 1 ? 'on' : ''}" data-tab="1">Skills</div></div>
          <div class="plate ui-pad ui-grow ui-scroll">${page === 0 ? info : skills}</div></div></div>`;
      },
      hint: () => this.hintText([['◀▶', 'Page'], ['▲▼', 'Creature'], ['B', 'Back']]),
      onTab: (t) => { page = t; this.rerender(); },
      onLR: (d) => { page = (page + d + 2) % 2; this.rerender(); },
      handle: ({ dir, a, b }) => {
        if (dir === 'left' || dir === 'right') scr.onLR(dir === 'left' ? -1 : 1);
        else if (dir === 'up' || dir === 'down') { scr.idx = (scr.idx + (dir === 'up' ? -1 : 1) + party.length) % party.length; this.rerender(); }
        else if (b || a) this.back();
      },
    };
    return scr;
  }

  scr_kilindex() {
    const kx = this.scene.systems?.kilindex?.data; // [overnight hook] C15/M1 logging (src/overnight/kilindex.js)
    const seen = new Set([...(this.demo ? DEMO.seen : []), ...this.party().map((c) => c.species), ...Object.keys(kx?.seen || {})]);
    const reg = new Set([...this.party().map((c) => c.species), ...Object.keys(kx?.caught || {})]);
    const L = this.T('system_kilindex.labels.labels', {});
    const scr = { scr: 'kilindex', pat: 'lattice', title: this.T('system_phone.menu.labels.kilindex', 'Kilindex'), glyph: 'kilindex', sel: 0, cols: +(this.cfg.vars?.['dex-cols'] || 4), count: () => SPECIES.length,
      chips: () => `<span class="ui-chip">${esc(L.seen || 'Seen')} ${seen.size}</span><span class="ui-chip">${esc(L.caught || 'Registered')} ${reg.size}</span>`,
      render: () => `<div class="ui-body"><div class="ui-panel ui-pad ui-grow ui-scroll" data-scr="kilindex" data-pat="lattice" style="flex:1.5"><div class="ui-dex">${SPECIES.map((s, i) => {
        const k = seen.has(s.id); return `<div class="ui-tile" data-i="${i}" data-el="${s.el[0]}"${k ? tipAttr(s.name, `${elNames(s.el)}\n${kilindexBlurb(this.T.bind(this), s)}`) : tipAttr('???', 'Not seen yet.')}><span class="no">No.${String(i + 1).padStart(3, '0')}</span>${reg.has(s.id) ? '<span class="reg"></span>' : ''}
          <img class="ui-icon ${k ? 'flip' : 'sil'}" data-sp="${s.id}" data-f="0" src="${icon(s.id)}" alt=""><span class="lbl">${k ? esc(s.name) : '???'}</span></div>`; }).join('')}</div></div>
        <div class="ui-col" style="flex:1"><div class="ui-stagebox" data-el="${SPECIES[scr.sel].el[0]}" data-pat="dots" data-scroll style="flex:1;min-height:0" id="dexart"></div><div class="plate ui-pad ui-scroll" id="dexinfo" style="max-height:45%"></div></div></div>`,
      after: () => scr.onSel(scr.sel),
      onSel: (i) => {
        const s = SPECIES[i], k = seen.has(s.id), art = this.stage.querySelector('#dexart'), inf = this.stage.querySelector('#dexinfo'); if (!art) return;
        art.dataset.el = s.el[0];
        art.innerHTML = `<img class="ui-sprite ${k ? 'idle' : ''}" style="--ui-sprite-scale:calc(var(--ui-dex-sprite, 1));${k ? '' : 'filter:brightness(0) opacity(.5)'}" src="${front(s.id)}" alt="">`;
        inf.innerHTML = k ? `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b style="font-size:1.15em">${esc(s.name)}</b>${s.el.map(elChip).join('')}</div>
          <p style="margin:.4em 0" class="soft">${esc(kilindexBlurb(this.T.bind(this), s))}</p><div class="soft" style="font-size:.85em">${esc(L.regions || 'Found in')}: ${esc(s.found)}</div>`
          : `<b>???</b><p class="soft" style="margin:.4em 0">Not seen yet.</p>`;
      },
      hint: () => this.hintText([['▲▼◀▶', 'Browse'], ['B', 'Back']]),
      onA: () => {},
    };
    return scr;
  }

  _items(pocket) {
    const cat = this.T('system_item_catalogue', {});
    return Object.entries(this.bag).filter(([id, n]) => n > 0 && cat[id]?.pocket === pocket).map(([id, n]) => ({ id, n, ...cat[id] }));
  }
  scr_pack() {
    const P = this.T('comfort.bag_pockets', {}); let pi = 0;
    const scr = { scr: 'pack', pat: 'leaf', title: this.T('system_phone.menu.labels.pack', 'Pack'), glyph: 'pack', sel: 0, cols: 1,
      count: () => this._items(POCKETS[pi]).length,
      chips: () => (this.gold != null ? `<span class="ui-chip"><i class="coin"></i>${this.gold.toLocaleString()}</span>` : ''),
      render: () => {
        const items = this._items(POCKETS[pi]), cur = items[scr.sel];
        return `<div class="ui-tabs">${POCKETS.map((p, i) => `<div class="ui-tab ${i === pi ? 'on' : ''}" data-tab="${i}">${pxi(POCKET_ICONS[p])}${esc(P[p]?.label || p)}</div>`).join('')}</div>
        <div class="ui-body"><div class="ui-panel ui-pad ui-grow ui-scroll" data-scr="pack" data-pat="${POCKET_PAT[POCKETS[pi]]}" data-scroll style="flex:1.4">
          ${items.length ? `<ul class="ui-list" data-aa="pack-${pi}">${items.map((it, i) => `<li class="ui-row" data-i="${i}" data-k="${esc(it.id)}"${tipAttr(it.name, (it.pages || []).join(' '))}><span class="grow">${esc(it.name)}</span><span class="price">×${it.n}</span></li>`).join('')}</ul>`
            : `<div class="plate ui-empty">${pxi(EMPTY_ICONS.pack, 'pxi pxi-empty')}Nothing in this pocket yet.</div>`}</div>
          <div class="plate ui-pad" style="flex:1" id="packinfo">${cur ? `<b>${esc(cur.name)}</b><p class="soft">${esc((cur.pages || []).join(' '))}</p>` : `<p class="soft">${esc((P[POCKETS[pi]]?.help || []).join(' '))}</p>`}</div></div>`;
      },
      onSel: (i) => { const it = this._items(POCKETS[pi])[i], el = this.stage.querySelector('#packinfo'); if (el && it) el.innerHTML = `<b>${esc(it.name)}</b><p class="soft">${esc((it.pages || []).join(' '))}</p>`; },
      onTab: (t) => { pi = t; scr.sel = 0; this.rerender(); },
      onLR: (d) => scr.onTab((pi + d + POCKETS.length) % POCKETS.length),
      hint: () => this.hintText([['◀▶', 'Pocket'], ['▲▼', 'Item'], ['B', 'Back']]),
      onA: () => {},
    };
    return scr;
  }

  scr_shop() {
    const M = this.T('system_shop.menu.labels', {}), cat = this.T('system_item_catalogue', {}); let mode = 0;
    if (this.gold == null) this.gold = DEMO.gold; // PLACEHOLDER: gold is not in the save yet
    const list = () => (mode === 0 ? SHOP_STOCK.map((id) => ({ id, ...cat[id], price: PLACEHOLDER_PRICES[id] || 100 }))
      : Object.entries(this.bag).filter(([id, n]) => n > 0 && cat[id]).map(([id, n]) => ({ id, n, ...cat[id], price: Math.floor((PLACEHOLDER_PRICES[id] || 100) / 2) })));
    const scr = { scr: 'shop', pat: 'awning', title: 'RT Supply', glyph: 'shop', sel: 0, cols: 1, count: () => list().length,
      chips: () => `<span class="ui-chip"><i class="coin"></i>${this.gold.toLocaleString()}</span>`,
      render: () => {
        const l = list(), cur = l[scr.sel];
        return `<div class="ui-tabs"><div class="ui-tab ${mode === 0 ? 'on' : ''}" data-tab="0">${esc(M.buy || 'Buy')}</div><div class="ui-tab ${mode === 1 ? 'on' : ''}" data-tab="1">${esc(M.sell || 'Sell')}</div></div>
        <div class="ui-body"><div class="ui-panel ui-pad ui-grow ui-scroll" data-scr="shop" data-pat="awning" data-scroll style="flex:1.4">
          ${l.length ? `<ul class="ui-list" data-aa="shop-${mode}">${l.map((it, i) => `<li class="ui-row" data-i="${i}" data-k="${esc(it.id)}"${tipAttr(it.name, `${(it.pages || []).join(' ')}\nIn your pack: ${this.bag[it.id] || 0}`)}><span class="grow">${esc(it.name)}</span>${it.n ? `<span class="soft">×${it.n}</span>` : ''}<span class="price"><i class="coin"></i> ${it.price}</span></li>`).join('')}</ul>`
            : `<div class="plate ui-empty">${pxi(EMPTY_ICONS.shop, 'pxi pxi-empty')}Nothing to sell.</div>`}</div>
          <div class="plate ui-pad" style="flex:1" id="shopinfo">${cur ? `<b>${esc(cur.name)}</b><p class="soft">${esc((cur.pages || []).join(' '))}</p><p class="soft">In your pack: ${this.bag[cur.id] || 0}</p>` : ''}</div></div>`;
      },
      onTab: (t) => { mode = t; scr.sel = 0; this.rerender(); },
      onLR: (d) => scr.onTab((mode + 1) % 2),
      onSel: () => this.rerender(),
      hint: () => this.hintText([['◀▶', `${M.buy || 'Buy'} / ${M.sell || 'Sell'}`], ['A', 'Pick'], ['B', M.done || "That's all"]]),
      onA: async (i) => {
        const it = list()[i]; if (!it) return;
        const n = await this.qty(it, mode === 0 ? Math.max(1, Math.min(99, Math.floor(this.gold / it.price))) : it.n);
        if (!n) return;
        const total = it.price * n;
        if (mode === 0) {
          const k = await this.ask('shop', this.P('system_shop.confirm', ['{item} x{count} comes to {total}.', 'Ring it up?'], { item: it.name, count: n, total }), this.T('system_shop.confirm.choices', ['Ring it up', 'Never mind']), { pat: 'awning' });
          if (k !== 0) return;
          if (total > this.gold) { this.note(this.P('system_shop.short', ["You're {total} short, I'm afraid."], { total: total - this.gold })[0]); return; }
          this.gold -= total; this.bag[it.id] = (this.bag[it.id] || 0) + n; this.note(this.P('system_shop.bought', ['Bagged. Pleasure doing business.'])[0]);
        } else {
          const k = await this.ask('shop', this.P('system_shop.sell_offer', ["I'll give you {total} for that. Deal?"], { total }), this.T('system_shop.sell_offer.choices', ['Deal', 'No deal']), { pat: 'awning' });
          if (k !== 0) return;
          this.gold += total; this.bag[it.id] -= n; this.note(this.P('system_shop.sold', ['Done. {total} for you.'], { total })[0]);
        }
        const r = this.root.getBoundingClientRect(); this.sparkle(r.width / 2, r.height / 3, 10); this.rerender();
      },
      onBack: () => { this.toastFn?.(this.P('system_shop.bye', ["See you. Prices won't move, promise."])[0]); },
    };
    return scr;
  }
  qty(it, max) {
    return new Promise((resolve) => {
      let n = 1; const wrap = document.createElement('div'); wrap.className = 'ui-modal'; this.fx?.tipHide();
      const draw = () => { wrap.innerHTML = `<div class="ui-panel ui-pad" data-scr="shop" data-pat="awning"><div class="plate ui-pad" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
        <b class="grow" style="flex:1">${esc(it.name)}</b><span class="qty"><button data-m="-1" aria-label="Fewer">−</button><b style="min-width:2.5em;text-align:center">×${n}</b><button data-m="-2" aria-label="More">+</button></span>
        <span class="price"><i class="coin"></i> ${it.price * n}</span></div><ul class="ui-list" style="margin-top:10px"><li class="ui-row sel" data-m="0">OK</li></ul></div>`; };
      draw(); this.root.appendChild(wrap);
      const done = (v) => { wrap.remove(); this.modal = null; resolve(v); };
      const step = (d) => { n = Math.max(1, Math.min(Math.max(1, max), n + d)); draw(); };
      this.modal = { handle: ({ dir, a, b }) => { if (dir === 'up' || dir === 'right') step(1); else if (dir === 'down' || dir === 'left') step(-1); if (a) done(n); else if (b) done(0); },
        pick: (i) => (i === -1 ? step(-1) : i === -2 ? step(1) : done(n)), back: () => done(0) };
    });
  }

  scr_archive() {
    const H = this.T('system_heal.storage_menu.labels', {}); let box = 0;
    const boxes = Array.from({ length: 8 }, (_, b) => Array.from({ length: 30 }, (_, k) => (this.demo && b === 0 ? DEMO.archive[k] : null) || null));
    const stage = this.stage; // UI tools pass: narrow phones reflow the box to 5/4 columns (44 px slots), so read the live column count
    const scr = { scr: 'archive', pat: 'checker', title: 'Field Archive', glyph: 'archive', sel: 0, get cols() { const b = stage.querySelector('.ui-box'); return (b && getComputedStyle(b).gridTemplateColumns.split(' ').filter(Boolean).length) || 6; }, count: () => 30,
      chips: () => `<span class="ui-chip dark">${esc(this.P('system_heal.storage_open', ['Field Archive. Logged in as {player}.'])[0])}</span>`,
      render: () => `<div class="ui-body"><div class="ui-col" style="flex:.8"><div class="plate ui-pad soft" style="font-size:.85em">${esc(H.move || 'Move creatures')} · ${esc(H.deposit || 'Drop off')} · ${esc(H.withdraw || 'Pick up')}</div>
          <div class="ui-panel ui-pad ui-grow ui-scroll" data-scr="team" data-pat="dots"><ul class="ui-list">${this.party().map((c) => `<li class="ui-row" style="padding-left:8px"><img class="ui-icon flip" data-sp="${c.species}" data-f="0" src="${icon(c.species)}" style="--ui-icon:40px" alt=""><span class="grow">${esc(c.nickname || speciesById(c.species).name)}</span></li>`).join('') || '<li class="plate ui-empty">No team.</li>'}</ul></div></div>
        <div class="ui-col ui-grow"><div class="ui-tabs"><div class="ui-tab" data-act="prevbox">◀</div><div class="ui-tab on" style="flex:4">Box ${box + 1}</div><div class="ui-tab" data-act="nextbox">▶</div></div>
        <div class="ui-panel ui-pad ui-grow ui-scroll" data-scr="archive" data-pat="checker" data-scroll><div class="ui-box" data-aa="box-${box}">${boxes[box].map((c, i) => `<div class="ui-slot${scr.held?.b === box && scr.held.i === i ? ' held' : ''}" data-i="${i}" data-k="${c ? esc(c.rt || c.species + i) : 'e' + i}"${c ? tipAttr(speciesById(c.species).name, `${c.rt || ''} · ${elNames(ELS(c.species))}`) : ''}>${c ? `<img src="${icon(c.species)}" alt="" draggable="false">` : ''}</div>`).join('')}</div></div>
        <div class="plate ui-pad" id="arcinfo" style="min-height:2.6em"></div></div></div>`,
      after: () => scr.onSel(scr.sel),
      onSel: (i) => { const c = boxes[box][i], el = this.stage.querySelector('#arcinfo'); if (el) el.innerHTML = c ? `<b>${esc(speciesById(c.species).name)}</b> <span class="soft">${esc(c.rt)}</span> ${ELS(c.species).map(elChip).join('')}` : '<span class="soft">Empty</span>'; },
      onAct: (a) => { box = (box + (a === 'prevbox' ? 7 : 1)) % 8; this.rerender(); },
      onLR: (d) => scr.onAct(d < 0 ? 'prevbox' : 'nextbox'),
      hint: () => this.hintText([['▲▼◀▶', 'Slot'], ['A', scr.held ? 'Swap here' : 'Pick up'], ['B', scr.held ? 'Cancel' : H.logout || 'Log out']]) + ' &nbsp;·&nbsp; Drag to move',
      // UI tools pass: drag a slot onto another to swap (SortableJS Swap plugin); A picks up / swaps (works across boxes)
      sortable: () => ({ el: '.ui-box', draggable: '.ui-slot', swap: true, onReorder: (order, moved) => {
        const b = boxes[box], nb = order.map((k) => b[k]); b.splice(0, b.length, ...nb); scr.held = null; scr.sel = Math.max(0, order.indexOf(moved)); this.rerender(); } }),
      onA: (i) => {
        if (!scr.held) { if (boxes[box][i]) { scr.held = { b: box, i }; this.rerender(); } return; }
        const h = scr.held, a = boxes[h.b][h.i]; boxes[h.b][h.i] = boxes[box][i]; boxes[box][i] = a; scr.held = null; this.rerender();
      },
      onBack: () => { if (scr.held) { scr.held = null; this.rerender(); return false; } return true; },
    };
    return scr;
  }

  scr_save() {
    const run = async () => {
      if (this.scene.saveLocked) { this.back(); this.note(this.P('system_save.locked', ["Can't file a report right now."]).join(' '), 2200); return; } // save lock
      const k = await this.ask('save', this.P('system_save.prompt', ["File today's report? This saves your game."]), this.T('system_save.prompt.choices', ['File it', 'Not yet']), { pat: 'sparkle' });
      if (k !== 0) { this.back(); return; }
      const wrap = document.createElement('div'); wrap.className = 'ui-modal';
      wrap.innerHTML = `<div class="ui-panel ui-pad" data-scr="save" data-pat="sparkle" data-scroll><div class="plate ui-pad">${esc(this.P('system_save.saving', ['Filing... keep the game open.'])[0])}
        <div class="bar xp ui-filing" style="margin-top:10px"><i></i></div></div></div>`;
      this.root.appendChild(wrap); this.modal = { handle() {}, pick() {}, back() {} };
      await wait(950);
      const ok = this.scene.saveNow?.();
      wrap.remove(); this.modal = null;
      const msg = ok ? this.P('system_save.saved', ["Report filed. {player}'s day is on record."]) : this.P('system_save.failed', ["Couldn't file the report.", 'Try again in a moment.']);
      this.back(); this.note(msg.join(' '), 2600);
      if (ok) { const r = this.root.getBoundingClientRect(); this.sparkle(r.width / 2, 40, 16); }
      if (ok) this.scene.audio?.sfx('save'); // manual save only (autosave stays silent)
    };
    const scr = { scr: 'save', pat: 'sparkle', title: this.T('system_save.menu_label.labels.save', "File today's report"), glyph: 'save', sel: 0, cols: 1, count: () => 0,
      render: () => `<div class="ui-panel ui-pad ui-grow" data-scr="save" data-pat="sparkle"><div class="plate ui-pad"><b>${esc(this.scene.config?.playerName || 'Cal')}</b>
        <p class="soft">${esc(this.scene.map?.title || '')} · Day ${this.scene.clock?.day ?? 1} · Team ${this.party().length}</p></div></div>`,
      after: () => setTimeout(run, 30), onA: () => {},
    };
    return scr;
  }

  scr_options() {
    const s = this.scene;
    const rows = () => [
      ['Cloud shadows', s.life?.state?.().clouds ? 'On' : 'Off', () => s.life.toggle('clouds')],
      ['Ambient life', s.life?.state?.().life ? 'On' : 'Off', () => s.life.toggle('life')],
      ...(s.systems?.state ? [['Difficulty', diffOf(getDifficulty(s.systems.state)).label, () => { const st = s.systems.state; setDifficulty(st, DIFF_ORDER[(DIFF_ORDER.indexOf(getDifficulty(st)) + 1) % 3]); s._dirty = true; },
        (d) => { const st = s.systems.state; setDifficulty(st, DIFF_ORDER[Math.max(0, Math.min(2, DIFF_ORDER.indexOf(getDifficulty(st)) + d))]); s._dirty = true; }]] : []), // Oct 29 2026: Easy / Normal / Hard (src/systems/difficulty.js)
      [this.T('system_phone.options.labels.wind', 'Wind'), s.life?.settings && windEnabled(s.life) ? 'On' : 'Off', () => { if (s.life && !windKilledByUrl()) s.life.toggle('wind'); }], // Oct 29 2026 (Gary): world wind on/off, live; ?wind=0 forces Off
      ['Depth shadows', s.depth?.state?.(s.map ? s.view() : null)?.enabled ? 'On' : 'Off', () => s.depth.toggle()],
      ['Menu motion', this.body.classList.contains('ui-reduce') ? 'Reduced' : 'Full', () => { const r = this.body.classList.toggle('ui-reduce'); try { localStorage.setItem('kilumen_alpha_ui.motion', r ? 'reduce' : 'full'); } catch { /* */ } }],
      ...audioRows(),
      ...(this.qol?.rows() || []), // [qol hook] src/qol/qol.js (?qol=0 kill switch)
      ...(rtbKilled(this.q) ? [] : [['Battles', rtbMode(s, this.q) === 'rt' ? 'Real-time' : 'Turn-based', () => setRtbMode(s, rtbMode(s, this.q) === 'rt' ? 'turn' : 'rt')]]), // real-time option (Oct 29 2026; also on the wild battle screen)
      ...(s.companyVoice ? [['Company voice', s.companyVoice.modeLabel(), () => s.companyVoice.cycleMode()]] : []), // [company voice hook] Full / Milestones only / Off (on by default; row absent with ?cv=0)
      ...(s.companyVoice?.ritaVoice ? [['RITA voice', s.companyVoice.ritaVoice.label(), () => s.companyVoice.ritaVoice.toggle()]] : []), // [rita voice hook] spoken lines on/off (default on)
      [hasSessionHintUI() ? 'Account' : 'Sign in', hasSessionHintUI() ? 'Signed in' : 'Open', () => { import('../net/account.js?v=v0.2.95-alpha').then((m) => m.openAccount()); }], // v0.2.49: in-app sign-in
      ...(window.kilumen?.dev?.active && window.kilumen.dev.role === 'owner' ? [['Dev menu', 'Open', () => { this.closeAll(); setTimeout(() => window.kilumen?.dev?.open?.({ fromMenu: true }), 80); }]] : []), // v0.2.47 (Gary): owner-only, set by dev/console.js after the server owner check
    ];
    // libs pass: sound rows (src/audio/audio.js; saved per platform). A cycles volume in 20% steps, left/right nudge 10%.
    const a = s.audio, pct = (v) => `${Math.round(v * 100)}%`;
    const nudge = (k, d) => a.setVolume(k, Math.round(a.settings[k] * 10 + d) / 10);
    const cycle = (k) => a.setVolume(k, a.settings[k] >= 0.99 ? 0 : Math.min(1, Math.round(a.settings[k] * 10 + 2) / 10));
    function audioRows() {
      return !a ? [] : [
        ['Sound', a.settings.muted ? 'Muted' : 'On', () => a.setMuted(!a.settings.muted)],
        ['Volume', pct(a.settings.master), () => cycle('master'), (d) => nudge('master', d)],
        ['Music volume', pct(a.settings.music), () => cycle('music'), (d) => nudge('music', d)],
        ['Effects volume', pct(a.settings.sfx), () => cycle('sfx'), (d) => nudge('sfx', d)],
      ];
    }
    const scr = { scr: 'options', pat: 'waves', title: this.T('system_phone.menu.labels.options', 'Options'), glyph: 'options', sel: 0, cols: 1, count: () => rows().length,
      render: () => `<div class="ui-panel ui-pad ui-grow ui-scroll" data-scr="options" data-pat="waves" data-scroll><ul class="ui-list">${rows().map(([l, v, , nudge], i) => // UI tools 2: pixelarticons per row; Kenney UI slider / checkbox PLACEHOLDERS (text value kept)
        `<li class="ui-row" data-i="${i}"><span class="grow">${pxi(OPTION_ICONS[l], 'pxi opt-ico')} ${esc(l)}</span><span class="price">${nudge ? kuiSlider(parseInt(v, 10) / 100) : /^(On|Off|Muted)$/.test(v) ? kuiCheck(v === 'On') : ''}${esc(v)}</span></li>`).join('')}</ul></div>`,
      hint: () => this.hintText([['A', 'Change'], ['B', 'Back']]),
      onA: (i) => { rows()[i][2](); this.rerender(); },
      onLR: (d) => { // volume rows: nudge; other rows: move like up/down did before
        const r = rows()[scr.sel];
        if (r?.[3]) { r[3](d); this.rerender(); s.audio?.sfx('cursor'); } else this._select(Math.max(0, Math.min(rows().length - 1, scr.sel + d)));
      },
    };
    return scr;
  }
  scr_tasks() { return this._simple('tasks', this.T('system_phone.menu.labels.tasks', 'Tasks'), 'stripes', 'No tasks yet. Revival Tech will text you when there is work.'); }
  scr_contacts() { return this._simple('contacts', this.T('system_phone.menu.labels.contacts', 'Contacts'), 'dots', 'No contacts yet. Trade numbers with trainers you meet.'); }
  _simple(id, title, pat, text) {
    return { scr: id, pat, title, glyph: id, sel: 0, cols: 1, count: () => 0, render: () => `<div class="ui-panel ui-pad ui-grow" data-scr="${id}" data-pat="${pat}" data-scroll><div class="plate ui-empty">${EMPTY_ICONS[id] ? pxi(EMPTY_ICONS[id], 'pxi pxi-empty') : ''}${esc(text)}</div></div>`, onA: () => {} };
  }
  // v0.2.23 (Gary, Oct 24 2026): the map has two views. 'Region' = the painted overview (unchanged); 'Paths' = a node-and-line
  // diagram GENERATED from the real map links (src/ui/connections.gen.js, tools/gen_connections.py) placed on the same
  // world_layout map_pos as the painted dots. ◀▶ / L R or the tabs switch views; B backs out as before. Opening it never saves.
  scr_map() {
    const subs = { art: this._scrMapArt(), paths: this._scrMapPaths() };
    let view = this._mapView === 'paths' ? 'paths' : 'art';
    const tabs = () => `<div class="cm-tabs" role="tablist">${[['art', 'Region'], ['paths', 'Paths']].map(([k, t]) => `<button type="button" role="tab" class="cm-tab${k === view ? ' on' : ''}" aria-pressed="${k === view}" data-act="mapview:${k}">${t}</button>`).join('')}</div>`;
    const cur = () => subs[view];
    const scr = { scr: 'map', pat: 'leaf', title: this.T('system_phone.menu.labels.map', 'Map'), glyph: 'map', cols: 1,
      get sel() { return cur().sel; }, set sel(v) { cur().sel = v; },
      count: () => cur().count(),
      render: () => `<div class="cm-wrap">${tabs()}${cur().render()}</div>`,
      after: () => cur().after?.(), onSel: (i) => cur().onSel?.(i),
      hint: () => this.hintText([['◀▶', 'View'], ['▲▼', 'Place'], ...(view === 'art' && this.scene.overnight?.region?.enabled ? [['A', 'Skylift']] : []), ['B', 'Back']]),
      onA: (i) => cur().onA?.(i),
      onLR: () => { view = this._mapView = view === 'art' ? 'paths' : 'art'; this.rerender(); },
      onAct: (a) => { const m = /^mapview:(art|paths)$/.exec(a || ''); if (m && m[1] !== view) scr.onLR(); },
    };
    return scr;
  }
  _scrMapPaths() {
    const N = CONN_NODES, by = Object.fromEntries(N.map((n) => [n.id, n])), sc = this.scene;
    const z = sc.zone?.(), here = by[sc.map?.name] ? sc.map.name : by[sc.lastDoor?.map] ? sc.lastDoor.map : N.find((n) => n.zone === z)?.id || (z === 'greystone_caverns' ? 'greystone_entrance' : null);
    const order = [...N].sort((a, b) => (a.kind === 'road') - (b.kind === 'road') || a.y - b.y || a.x - b.x);
    const scr = { sel: Math.max(0, order.findIndex((n) => n.id === here)), count: () => order.length,
      render: () => {
        const X = (n) => (n.x * 1000).toFixed(1), Y = (n) => (n.y * 750).toFixed(1);
        const lines = CONN_EDGES.map((e) => { const a = by[e.a], b = by[e.b]; return `<line x1="${X(a)}" y1="${Y(a)}" x2="${X(b)}" y2="${Y(b)}" class="cm-l${a.draft || b.draft ? ' ea' : ''}${a.kind === 'cave' && b.kind === 'cave' ? ' cv' : ''}"/>`; }).join('');
        // labels: try below / above / right / left of each dot and keep the first spot that hits no other label or dot
        const rad = (n) => (n.kind === 'road' ? 7 : n.kind === 'cave' ? 8 : 13), boxes = N.map((n) => [n.x * 1000 - rad(n) - 3, n.y * 750 - rad(n) - 3, n.x * 1000 + rad(n) + 3, n.y * 750 + rad(n) + 3]);
        const hit = (b) => b[0] < 6 || b[2] > 994 || b[1] < 4 || b[3] > 746 || boxes.some((q) => b[0] < q[2] && b[2] > q[0] && b[1] < q[3] && b[3] > q[1]);
        const lab = {}; [...order].sort((a, b) => (a.kind === 'road') - (b.kind === 'road')).forEach((n) => {
          const r = rad(n), fs = n.kind === 'road' ? 16 : n.kind === 'cave' ? 15 : 20, w = n.name.length * fs * 0.56, cx = n.x * 1000, cy = n.y * 750;
          const tries = [[0, r + fs + 2, 'middle'], [0, -r - 6, 'middle'], [r + 6, fs * 0.35, 'start'], [-r - 6, fs * 0.35, 'end'], [0, r + fs * 2 + 4, 'middle'], [0, -r - fs - 8, 'middle']];
          const box = ([dx, dy, a]) => { const x0 = a === 'middle' ? cx + dx - w / 2 : a === 'start' ? cx + dx : cx + dx - w; return [x0, cy + dy - fs * 0.8, x0 + w, cy + dy + fs * 0.2]; };
          const t = tries.find((q) => !hit(box(q))) || tries[0]; boxes.push(box(t)); lab[n.id] = t; });
        const nodes = order.map((n, i) => { const r = rad(n), [dx, dy, anc] = lab[n.id];
          return `<g class="cm-n k-${n.kind}${n.draft ? ' ea' : ''}${n.id === here ? ' here' : ''}" data-i="${i}" role="option" tabindex="0" aria-label="${esc(n.name)}${n.id === here ? ', you are here' : ''}">
            ${n.id === here ? `<circle class="cm-ring" cx="${X(n)}" cy="${Y(n)}" r="${r + 7}"/>` : ''}<circle cx="${X(n)}" cy="${Y(n)}" r="${r}"/><text x="${(+X(n) + dx).toFixed(1)}" y="${(+Y(n) + dy).toFixed(1)}" text-anchor="${anc}">${esc(n.name)}</text></g>`; }).join('');
        return `<div class="ui-body"><div class="ui-panel ui-grow cm-frame" data-scr="map" data-pat="leaf" style="flex:2"><div class="cm-scroll" data-scroll><svg class="cm-svg" viewBox="-40 -30 1080 820" role="listbox" aria-label="Paths between places">${lines}${nodes}</svg></div></div>
          <div class="plate ui-pad ui-scroll" style="flex:1"><div id="mapinfo"></div><ul class="rm-legend cm-legend"><li><i class="cm-k here"></i>You are here</li><li><i class="cm-k town"></i>Town</li><li><i class="cm-k road"></i>Trail or Road</li><li><i class="cm-k ea"></i>Early access</li></ul></div></div>`;
      },
      after: () => { scr.onSel(scr.sel); this.stage.querySelector('.cm-n.here')?.scrollIntoView?.({ block: 'center', inline: 'center' }); },
      onSel: (i) => { const n = order[i], el = this.stage.querySelector('#mapinfo'); if (!el || !n) return;
        const to = CONN_EDGES.filter((e) => e.a === n.id || e.b === n.id).map((e) => by[e.a === n.id ? e.b : e.a]).filter(Boolean);
        const kind = { town: 'Town', road: 'Trail', area: 'Area', cave: 'Cave' }[n.kind];
        el.innerHTML = `<b style="font-size:1.15em">${esc(n.name)}</b><p class="soft">${kind}${n.draft ? ' · Early access' : ''}${n.id === here ? ' · You are here' : ''}</p><p>Leads to: ${to.map((t) => esc(t.name)).join(', ') || '—'}</p>`; },
      onA: () => {},
    };
    return scr;
  }
  _scrMapArt() {
    // Region map cleanup (Oct 23, 2026, Gary: "can we clean this up some"): the box keeps the art's 4:3 (no cover crop, so
    // world_layout map_pos lines up on PC and phone); each dot's bottom tip sits on map_pos, just above the painted name plate
    // (map_label), so a dot never covers a name. Dot colours: red = you are here, yellow = status 'built', white = not built yet.
    const zones = (this.scene.layout?.zones || []).filter((z) => z.map_pos), cur = this.scene.zone?.();
    let sel = Math.max(0, zones.findIndex((z) => z.id === cur));
    const KEY = [['here', 'var(--bad)', 'You are here'], ['built', 'var(--sun)', 'Open now'], ['later', '#fff', 'Coming later']];
    const dot = (z) => KEY[z.id === cur ? 0 : z.status === 'built' ? 1 : 2];
    const scr = { scr: 'map', pat: 'leaf', title: this.T('system_phone.menu.labels.map', 'Map'), glyph: 'map', sel, cols: 1, count: () => zones.length,
      render: () => `<div class="ui-body"><div class="ui-panel ui-grow rm-frame" data-scr="map" data-pat="leaf" style="flex:2">
        <div class="rm-box" style="background-image:url(art/world/world_map.webp?v=v0.2.95-alpha)">
        ${zones.map((z, i) => `<span data-i="${i}" class="rm-dot" data-dot="${dot(z)[0]}" title="${esc(z.name)}" style="left:${z.map_pos.x * 100}%;top:${z.map_pos.y * 100}%;--dot:${dot(z)[1]}"></span>`).join('')}
        ${cur ? (() => { const z = zones.find((q) => q.id === cur); return z ? `<span class="hud-prompt show rm-you" style="left:${z.map_pos.x * 100}%;top:${z.map_pos.y * 100}%"><span class="g">★</span><span>You</span></span>` : ''; })() : ''}</div></div>
        <div class="plate ui-pad ui-scroll" style="flex:1"><div id="mapinfo"></div>
        <ul class="rm-legend" aria-label="${esc(this.T('system_phone.map.legend.title', 'Map key'))}">${KEY.map(([k, c, t]) => `<li><i style="--dot:${c}"></i>${esc(this.T(`system_phone.map.legend.${k}`, t))}</li>`).join('')}</ul></div></div>`,
      after: () => { scr.onSel(scr.sel); this._mapPlaceYou(zones); },
      onSel: (i) => { const z = zones[i], el = this.stage.querySelector('#mapinfo'); if (el && z) el.innerHTML = `<b style="font-size:1.15em">${esc(z.name)}</b><p class="soft">${esc(z.type === 'town' ? 'Town' : z.type === 'route' ? 'Route' : z.type || '')}${z.id === cur ? ' · You are here' : ''}</p>`; },
      // [overnight hook] Skylift fast travel from the map (src/overnight/region_map.js, ?ov=regionmap; off by default)
      hint: () => this.hintText([['▲▼', 'Place'], ...(this.scene.overnight?.region?.enabled ? [['A', 'Skylift']] : []), ['B', 'Back']]),
      onA: (i) => { const r = this.scene.overnight?.region; if (r?.enabled && zones[i]) { this.closeAll(); r.travelTo(zones[i].id); } },
    };
    return scr;
  }
  /** 'You' pin: above the current dot; if that leaves the map or covers a name plate / another dot, try left, then right
   *  (3 px clear). If none is clear, the side that covers the least (leaving the map counts most). */
  _mapPlaceYou(zones) {
    const box = this.stage.querySelector('.rm-box'), pin = box?.querySelector('.rm-you');
    if (!pin) return;
    const B = box.getBoundingClientRect();
    const plates = zones.filter((z) => z.map_label).map((z) => ({ l: B.left + z.map_label.x0 * B.width, t: B.top + z.map_label.y0 * B.height, r: B.left + z.map_label.x1 * B.width, b: B.top + z.map_label.y1 * B.height }));
    const dots = [...box.querySelectorAll('.rm-dot')].map((e) => { const d = e.getBoundingClientRect(); return { l: d.left, t: d.top, r: d.right, b: d.bottom }; });
    const over = (p, q, g) => Math.max(0, Math.min(p.right, q.r + g) - Math.max(p.left, q.l - g)) * Math.max(0, Math.min(p.bottom, q.b + g) - Math.max(p.top, q.t - g));
    const cost = (p, g) => [...plates, ...dots].reduce((n, q) => n + over(p, q, g), 0) + 100 * (p.width * p.height - over(p, { l: B.left, t: B.top, r: B.right, b: B.bottom }, 0));
    let best = null;
    for (const side of ['up', 'left', 'right']) {
      pin.dataset.side = side;
      const p = pin.getBoundingClientRect();
      if (cost(p, 3) === 0) return;
      const c = cost(p, 0); if (!best || c < best.c) best = { side, c };
    }
    pin.dataset.side = best.side;
  }

  scr_title() {
    // first launch: the scene's own early autosave must not count as a save (src/overworld/save.js showContinue)
    const played = !!this._leftTitle || !this._bootTitle; // boot title: only a save from before this launch counts
    const hasSave = showContinue({ bootSave: this.scene.opts?.saveData, played, stored: played ? this.scene.store?.load?.() : null });
    const acctLabel = hasSessionHintUI() ? 'Account' : 'Sign in'; // v0.2.49: in-app sign-in (home-screen app has its own storage)
    const items = [...(hasSave ? ['Continue'] : []), 'New game', 'Options', acctLabel];
    // save card: the Continue row names the save's difficulty (old saves: Normal)
    const PICK_ORDER = ['normal', 'easy', 'hard']; // Normal is the highlighted first choice
    const savedDiff = diffOf(getDifficulty((this.scene.store?.load?.() || this.scene.opts?.saveData || {})?.systems || this.scene.systems?.state)).label;
    const rowText = (t) => (t === 'Continue' ? `Continue <span class="soft" data-k="save-diff">· ${esc(savedDiff)}</span>` : t);
    let stage = 0;
    const scr = { scr: 'title', full: true, sel: 0, cols: 1, count: () => (stage ? items.length : 0),
      mount: (layer) => {
        const name = 'Kilumen';
        layer.innerHTML = `<div class="ui-title-scr" data-scr="title"><div class="art" style="background-image:url(art/world/key_art_notext.webp)"></div><div class="veil"></div>
          <div class="ui-logo"><h1>${[...name].map((c, i) => `<span style="--i:${i}">${c}</span>`).join('')}</h1><span class="sub">Start of a Journey</span><span class="alpha-badge" title="Alpha: early version">Alpha</span></div>
          ${stage ? `<div class="ui-panel ui-title-menu" data-scr="title" data-pat="sparkle" data-scroll><ul class="ui-list">${items.map((t, i) => `<li class="ui-row" data-i="${i}">${rowText(t)}</li>`).join('')}</ul></div>`
            : `<div class="ui-press-start" data-act="start">${this.platform?.profile?.controls?.touch ? 'Tap to start' : 'Press Enter or Start'}</div>`}
          <span class="foot">${esc(ALPHA_VERSION)}</span></div>`;
        const r = layer.getBoundingClientRect(); setTimeout(() => this.sparkle(r.width / 2, r.height * 0.3, 18, layer), 400);
      },
      handle: ({ dir, a, b }) => {
        if (!stage) { if (a) { stage = 1; this._render(); } return; }
        if (dir === 'up' || dir === 'down') { scr.sel = (scr.sel + (dir === 'up' ? -1 : 1) + items.length) % items.length; this._markSel(); }
        if (a) scr.onA(scr.sel);
      },
      onA: async (i) => {
        if (!stage) { stage = 1; this._render(); return; }
        const it = items[i];
        if (it !== 'Options' && this.scene.store) this.scene.store.hold = false; // ALPHA: saving starts with the first title choice
        if (it === 'Continue') { this._leftTitle = true; this.closeAll(); }
        else if (it === 'New game') {
          if (hasSave) { const k = await this.ask('title', ['Start a new game?', 'This writes over your current report.'], ['Start over', 'Keep playing'], { pat: 'sparkle' }); if (k !== 0) return; }
          const dk = await this.ask('title', ['Pick a difficulty.', 'You can change it later in Options.'], PICK_ORDER.map((d) => `${DIFFICULTIES[d].label}: ${DIFFICULTIES[d].blurb}`), { pat: 'sparkle' });
          const pick = PICK_ORDER[dk] || 'normal';
          if (hasSave) { try { localStorage.setItem(PENDING_KEY, pick); } catch { /* private mode: Normal */ } location.search = '?reset=1'; return; }
          setDifficulty(this.scene.systems?.state, pick);
          this._leftTitle = true; this.closeAll();
        } else if (it === acctLabel) { import('../net/account.js?v=v0.2.95-alpha').then((m) => m.openAccount()); }
        else { this.stack = []; this.active = false; this.open('options'); }
      },
      onBack: () => false,
      // phone menu fix (Oct 23, 2026): A is hidden under menus on phones, so a tap anywhere on 'Tap to start' starts (touch profile only)
      handlePointer: () => { if (stage || !this.platform?.profile?.controls?.touch) return false; scr.onA(0); return true; },
    };
    return scr;
  }

  // ---------- battle shell (scripted demo; the real battle system is a later pass) ----------
  scr_battle(opts = {}) {
    // engine-driven battle (src/battle/ui_sd.js, imported in mountUI) is the default since Oct 23, 2026; ?battle=shell keeps this scripted shell
    if (this.sdMod && !opts.levelUpOnly) return this.sdMod.makeSdBattle(this, opts, { esc, front, back, fx, wait, lvlOf, speciesById, SPECIES, ELEMENT_LABEL, statsFor });
    const party = this.party(), allyC = party[0] || { species: 'rillop', nickname: null, rt: 'RT-0147' };
    const foeSp = opts.foe || (party[0]?.species === 'cindrip' ? 'rillop' : 'cindrip');
    const ally = { c: allyC, sp: speciesById(allyC.species), ...statsFor(allyC, 0) }, foe = { c: { species: foeSp }, sp: speciesById(foeSp), level: Math.max(2, ally.level - 1) };
    foe.hpMax = 14 + foe.level * 3; foe.hp = foe.hpMax; ally.hp = ally.hpMax;
    const skills = skillsFor(allyC.species);
    let mode = 'msg', msgResolve = null, busy = false;
    const scr = { scr: 'battle', full: true, sel: 0, cols: 2, count: () => (mode === 'cmd' ? 4 : mode === 'skills' ? skills.length : 0) };
    const $ = (s) => this.layer.querySelector(s);
    const plate = (side, m) => `<div class="b-plate ${side}" data-el="${m.sp.el[0]}" data-pat="${side === 'foe' ? 'chevron' : 'dots'}"><div class="plate">
        <div class="top"><span class="grow">${esc(m.c.nickname || m.sp.name)}</span><span class="lv">Lv.${m.level}</span></div>
        <div class="bar-row"><b>HP</b><div class="bar" id="${side}-hp" data-lvl="good"><i style="width:100%"></i></div></div>
        ${side === 'ally' ? `<div class="hpnum" id="ally-hpnum">${m.hp}/${m.hpMax}</div><div class="bar-row"><b>XP</b><div class="bar xp" id="ally-xp" style="height:8px"><i style="width:${m.xp}%"></i></div></div>` : ''}</div></div>`;
    scr.mount = (layer) => {
      this.fx?.battleWarm(); // UI tools 2: lazy anime.js for this default shell (skipped when motion is reduced)
      layer.innerHTML = `<div class="ui-battle" data-scr="battle"><div class="bg" style="background-image:url(art/world/battle_bg.webp)"></div>
        <div class="b-field"><div class="b-foe"><img class="ui-sprite b-mon" id="foe-mon" src="${front(foeSp)}" alt=""><div class="b-pad"></div></div>
          <div class="b-ally"><img class="ui-sprite b-mon" id="ally-mon" src="${back(allyC.species)}" alt=""><div class="b-pad"></div></div>
          ${plate('foe', foe)}${plate('ally', ally)}</div>
        <div class="b-bottom"><div class="plate b-msg" id="b-msg" data-act="msg"></div><div class="ui-panel b-cmds" id="b-cmds" data-scr="battle" data-pat="waves" data-scroll hidden></div></div>
        <div class="b-bars"></div></div>`;
      // layout pass (Oct 22, 2026): --feet = lowest opaque row / height of each sprite, so the pad and the zone rules in ui.css
      // put the feet (not the image box) on the ground; re-measured whenever a sprite's src changes
      layer.querySelectorAll('.b-mon').forEach((img) => { const go = () => { try {
        const w = img.naturalWidth, hh = img.naturalHeight, c = Object.assign(document.createElement('canvas'), { width: w, height: hh }), g = c.getContext('2d');
        g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, w, hh).data; let y = hh - 1;
        for (; y > 0; y--) { let x = 0; while (x < w && d[(y * w + x) * 4 + 3] <= 40) x++; if (x < w) break; }
        img.parentElement.style.setProperty('--feet', String(Math.min(1, (y + 1) / hh)));
      } catch { /* keep the CSS fallback */ } }; img.addEventListener('load', go); if (img.complete && img.naturalWidth) go(); });
      if (!scr.started) { scr.started = true; script(); }
    };
    const say = (t, auto = 0) => new Promise((r) => {
      const m = $('#b-msg'); m.innerHTML = `${esc(t)}${auto ? '' : '<span class="more">▼</span>'}`; mode = 'msg';
      $('#b-cmds').hidden = true;
      if (auto) setTimeout(r, auto); else msgResolve = r;
    });
    const setHp = (side, m) => {
      const f = Math.max(0, m.hp / m.hpMax), b = $(`#${side}-hp`); b.dataset.lvl = lvlOf(f);
      const num = side === 'ally' ? $('#ally-hpnum') : null; // UI tools 2: anime.js HP drain + counter (instant when reduced)
      if (this.fx?.drainBar(b, f, { num, from: num ? +num.textContent.split('/')[0] : 0, to: m.hp, max: m.hpMax })) return;
      b.firstElementChild.style.width = `${f * 100}%`;
      if (side === 'ally') { const target = m.hp, el = $('#ally-hpnum'); let cur = +el.textContent.split('/')[0]; const t = setInterval(() => { cur += Math.sign(target - cur); el.textContent = `${cur}/${m.hpMax}`; if (cur === target) clearInterval(t); }, 40); }
    };
    const anim = (el, cls, ms) => { el.classList.remove('idle', cls); void el.offsetWidth; el.classList.add(cls); return wait(ms).then(() => { el.classList.remove(cls); }); };
    const hit = async (att, def, side, skill) => {
      const aEl = $(att === 'ally' ? '#ally-mon' : '#foe-mon'), dEl = $(side === 'foe' ? '#foe-mon' : '#ally-mon');
      // hit effects (./hit_fx.js; off unless HIT_EFFECTS_ENABLED or ?fxpreview=staging): JSON + GIF load during the lunge; a
      // ranged skill plays its travel effect first (HIT_TRAVEL_FX_ENABLED); frame 0 of the impact IS the hit, so the shake and
      // damage number below start in the same tick the impact appears. Missing JSON/GIF -> no effect, the hit plays as before.
      const fxs = fxSettings(this.q), fxEl = fxs.force || skill.el, box = this.layer.firstElementChild;
      const pImp = fxs.on ? loadFx(fxEl, 'impact', fxs.base).then(prepFx) : null;
      const pTr = fxs.on && fxs.travel && isRanged({ el: fxEl }) ? loadFx(fxEl, att === 'ally' ? 'travel_p2f' : 'travel_f2p', fxs.base).then(prepFx) : null;
      await anim(aEl, att === 'ally' ? 'lunge-r' : 'lunge-l', 380); aEl.classList.add('idle');
      if (pTr) { const tr = await showTravel(await pTr, box, aEl, dEl); if (tr) await tr.done; }
      if (pImp) await showImpact(await pImp, box, dEl, side === 'ally'); // removes itself after the JSON total_ms
      const r = dEl.getBoundingClientRect(), lr = this.layer.getBoundingClientRect();
      const dmg = Math.max(1, Math.round((skill.power || 10) / 6 + Math.random() * 3));
      const n = document.createElement('div'); n.className = 'b-dmg'; n.textContent = `-${dmg}`; n.style.cssText = `left:${r.left - lr.left + r.width / 2}px;top:${r.top - lr.top + 10}px`; this.layer.firstElementChild.appendChild(n);
      await anim(dEl, 'hit', 520); dEl.classList.add('idle'); setTimeout(() => n.remove(), 600);
      def.hp = Math.max(0, def.hp - dmg); setHp(side, def); await wait(700);
    };
    const showCmds = () => {
      mode = 'cmd'; scr.sel = 0; const c = $('#b-cmds'); c.hidden = false; c.classList.remove('skills');
      const cmds = [['Skills', 'battle', 'fire'], ['Pack', 'pack', 'earth'], ['Team', 'team', 'water'], ['Run', 'menu', 'wind']];
      c.innerHTML = cmds.map(([t, g, el], i) => `<div class="b-cmd" data-i="${i}" data-el="${el}" data-pat="stripes"><span class="t">${t}</span></div>`).join('');
      $('#b-msg').textContent = `What will ${ally.c.nickname || ally.sp.name} do?`; this._markSel(); this.fx?.cmdsIn(c);
    };
    const showSkills = () => {
      mode = 'skills'; scr.sel = 0; const c = $('#b-cmds'); c.classList.add('skills');
      c.innerHTML = skills.map((s, i) => `<div class="b-cmd" data-i="${i}" data-el="${s.el}" data-pat="${['stripes', 'dots', 'chevron', 'lattice'][i % 4]}"${tipAttr(s.name, `${ELEMENT_LABEL(s.el)} skill · Power ${s.power ?? '?'} · En ${s.en}/${s.enMax}`)}><span class="t">${esc(s.name)}</span><span class="s">${esc(ELEMENT_LABEL(s.el))} · En ${s.en}/${s.enMax}</span></div>`).join('');
      this._markSel(); this.fx?.cmdsIn(c); this.fx?.tipSel();
    };
    const levelUp = async () => {
      const xpB = $('#ally-xp > i'), xpBar = $('#ally-xp'); if (!this.fx?.fillBar(xpBar, 100)) xpB.style.width = '100%'; await wait(750);
      ally.level++; this.layer.querySelector('.b-plate.ally .lv').textContent = `Lv.${ally.level}`;
      if (!this.fx?.fillBar(xpBar, 18, { from: 0 })) { xpB.style.transition = 'none'; xpB.style.width = '0%'; void xpB.offsetWidth; xpB.style.transition = ''; xpB.style.width = '18%'; }
      const r = $('#ally-mon').getBoundingClientRect(), lr = this.layer.getBoundingClientRect(); this.sparkle(r.left - lr.left + r.width / 2, r.top - lr.top + r.height / 2, 20, this.layer.firstElementChild);
      $('#ally-mon').classList.add('idle');
      const box = document.createElement('div'); box.className = 'plate b-lvup ui-pad';
      box.innerHTML = `<b>${esc(ally.c.nickname || ally.sp.name)} grew to Lv.${ally.level}!</b><dl class="ui-kv"><dt>Health</dt><dd class="up">+3</dd><dt>Power</dt><dd class="up">+2</dd><dt>Guard</dt><dd class="up">+1</dd><dt>Speed</dt><dd class="up">+2</dd></dl>`;
      this.layer.firstElementChild.appendChild(box); this.fx?.levelUpPop(box); // UI tools 2: anime.js timeline (CSS pop when not loaded)
      await say(`${ally.c.nickname || ally.sp.name} grew to Lv.${ally.level}!`); box.remove();
    };
    const end = async () => { const fl = document.createElement('div'); fl.className = 'b-flash'; this.layer.firstElementChild.appendChild(fl); await wait(300); this.closeAll(); };
    const script = async () => {
      await wait(400); $('#foe-mon').classList.add('enter'); await wait(700); $('#foe-mon').classList.replace('enter', 'idle');
      if (opts.levelUpOnly) { $('#ally-mon').classList.add('idle'); await levelUp(); await end(); return; }
      await say(this.P('system_wild.grass', ['{creature} bursts out of the grass!'], { creature: foe.sp.name })[0]);
      $('#ally-mon').classList.add('enter'); await wait(700); $('#ally-mon').classList.replace('enter', 'idle');
      showCmds();
    };
    const turn = async (skill) => {
      busy = true; $('#b-cmds').hidden = true;
      await say(`${ally.c.nickname || ally.sp.name} used ${skill.name}!`, 500); skill.en = Math.max(0, skill.en - 1);
      await hit('ally', foe, 'foe', skill);
      if (foe.hp <= 0) {
        await anim($('#foe-mon'), 'faint', 800); $('#foe-mon').style.opacity = '0';
        await say(`${foe.sp.name} is out cold!`);
        await levelUp(); await end(); return;
      }
      const fs = skillsFor(foeSp)[Math.floor(Math.random() * 2)];
      await say(`${foe.sp.name} used ${fs.name}!`, 500); await hit('foe', ally, 'ally', fs);
      busy = false; showCmds();
    };
    const holdCrystal = async () => { // scripted like ?battle=sd '-kcrystal' (Oct 22, 2026; SOUL_PLAYBOOK 5.3): no throw; the trainer holds the crystal up
      busy = true; $('#b-cmds').hidden = true; const fm = $('#foe-mon');
      // capture rules (Gary, Oct 23 2026): species rarity x foe HP, one roll; the 1-4 pulses come from that roll (src/battle/capture.js)
      const odds = captureChance({ rarity: rarityOf(foe.sp, SPECIES), hp: foe.hp, maxHp: foe.hpMax });
      const { caught, pulses } = captureRoll(odds, Math.random(), opts.forceChance != null ? !!opts.forceChance : undefined);
      await say('You held up a Crystal.', 600);
      await this.fx?.catchFx(this.layer.firstElementChild, { foe: fm, ally: $('#ally-mon'), name: foe.sp.name, pulses, caught, el: foe.sp.el?.[0] });
      if (caught) {
        fm.style.opacity = '0';
        await say(`${foe.sp.name} is with you now!`); await end(); return;
      }
      fm.classList.add('idle'); await say(`${foe.sp.name} broke free!`);
      const fs = skillsFor(foeSp)[Math.floor(Math.random() * 2)];
      await say(`${foe.sp.name} used ${fs.name}!`, 500); await hit('foe', ally, 'ally', fs);
      busy = false; showCmds();
    };
    scr.handle = ({ dir, a, b }) => {
      if (mode === 'msg') { if ((a || b) && msgResolve) { const r = msgResolve; msgResolve = null; r(); } return; }
      if (busy) return;
      if (dir) { const d = { up: -2, down: 2, left: -1, right: 1 }[dir]; const n = scr.count(); const i = scr.sel + d; if (i >= 0 && i < n) { scr.sel = i; this._markSel(); this.fx?.tipSel(); } }
      if (a) scr.onA(scr.sel); else if (b && mode === 'skills') showCmds();
    };
    scr.onA = async (i) => {
      if (mode === 'msg') { if (msgResolve) { const r = msgResolve; msgResolve = null; r(); } return; }
      if (busy) return;
      if (mode === 'skills') { turn(skills[i]); return; }
      if (i === 0) showSkills();
      else if (i === 3) { busy = true; await say(this.P('system_wild.retreated', ['You slipped away.'])[0]); await end(); }
      else if (i === 1 && !opts.trainer && !opts.who && !opts.foes?.length) holdCrystal(); // wild shell battles: Pack holds up a Crystal (catch celebration on success)
      else if (i === 1) $('#b-msg').textContent = this.P('system_trainers.no_capture', ["That creature already has a trainer. A crystal won't take it."])[0]; // no capturing a trainer's creatures (Gary, Oct 23 2026); PH key: data/textbot_requests_capture.md
      else { const m = $('#b-msg'); m.textContent = i === 1 ? 'The Pack opens in the full battle pass.' : 'Team swaps arrive in the full battle pass.'; }
    };
    scr.onAct = (a) => { if (a === 'msg' && msgResolve) { const r = msgResolve; msgResolve = null; r(); } };
    scr.onBack = () => false;
    return scr;
  }
  scr_levelup() { return this.scr_battle({ levelUpOnly: true }); }
}

/** Wild encounters (battles default v1): tall grass rolls encounters.json; the battle opens on the active battle screen
 * (engine by default, the shell with ?battle=shell). Dev: ?enc=0 off, ?encrate=0..1 per-step chance (clips / tests). */
function wireWild(ui, scene, q) {
  if (q.get('enc') === '0' || !scene?.hooks) return;
  const rate = q.has('encrate') ? Number(q.get('encrate')) : undefined;
  const openBattle = (foe, carry = null) => (ui.sdReady || Promise.resolve()).then(() => new Promise((res) => {
    if (!carry && catchNet(scene)) ui.toastFn?.(ui.P('system.catch_net_topup', NET_TEXT)[0]); // first catch never soft-locks (src/systems/catch_net.js)
    ui.closeAll(); ui.open('battle', { foe: foe.species, foeLevel: foe.level, biome: foe.biome, intro: foe.intro, carry, rtSwitch: !rtbKilled(q) && !!ui.sdMod });
    const scr = ui.top; let out = null;
    if (scr && ui.sdMod) scr.onDone = (r) => { out = r; };
    ui._onClose = async () => { if (out?.systems === 'blackout') await scene.systems?.onPartyFainted(); res(out); };
  }));
  const artIds = new Set(SPECIES.map((s) => s.id)); // the battle's art lookup (data.js SPECIES -> battleSpriteRel); #62 filter, ?encart=0 off
  // Real-time wild battles (player option, Oct 29 2026; src/rtb/): the remembered mode picks the screen, and the switch button on
  // either screen hands the same fight over (outcome 'switch' + carry). Trainer / Master / story battles never come through here.
  const runWild = async (foe) => {
    let mode = rtbMode(scene, q), carry = null;
    if (mode === 'rt' && !ui.sdMod) await ui.sdReady?.catch?.(() => {});
    for (;;) {
      const rt = mode === 'rt' && !rtbKilled(q);
      if (rt) catchNet(scene);
      const out = rt ? await import('../rtb/index.js?v=v0.2.95-alpha').then((m) => m.openRtBattle(ui, scene, foe, { q, carry })) : await openBattle(foe, carry);
      if (out?.outcome !== 'switch' || !out.carry?.foes?.length) return out;
      carry = out.carry; mode = setRtbMode(scene, rt ? 'turn' : 'rt');
      const sw = await import('../rtb/switch.js?v=v0.2.95-alpha'); await sw.modeFlash(mode, { reduced: ui.body?.classList.contains('ui-reduce') || reducedMotionQ() });
    }
  };
  const reducedMotionQ = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };
  ui.wild = installWildEncounters(scene, runWild, { rate: Number.isFinite(rate) ? rate : undefined, blocked: () => !!ui.top,
    hasArt: (id) => artIds.has(id), elOf: (id) => speciesById(id).el, foundOf: (id) => speciesById(id).found, terrain: fishingFlags(q).terrain, artFilter: q.get('encart') !== '0', dev: q.get('dev') === '1' || q.get('debug') === '1' });
}

export function mountUI(opts) {
  const ui = new GameUI(opts);
  const q = opts.params || new URLSearchParams(location.search);
  const scene = opts.scene;
  installQol(ui, scene, q); // [qol hook]
  // save lock (Gary, Oct 23 2026): an open battle screen (capture included) or the evolution player blocks every save
  scene.saveGuards?.push(() => (ui.stack.some((s) => s.scr === 'battle') ? 'battle' : ui.fx?._evolving ? 'evolution' : null));
  attachWipNotice(scene); // one-time WIP notice after the last beatable Master (src/systems/wip_notice.js)
  if (q.get('battle') === 'shell') { scene.hooks.onBattle = () => new Promise((res) => { ui.open('battle', { trainer: true }); ui._onClose = () => res(true); }); wireWild(ui, scene, q); }
  const want = q.get('ui');
  // Battles default v1 (Oct 23, 2026, Gary: "switch the dev build to the new battles"): the engine battle (src/battle/ui_sd.js)
  // is the default; ?battle=shell keeps the old scripted shell (trainers always win) as the escape hatch.
  const shell = q.get('battle') === 'shell';
  if (!shell) wireWild(ui, scene, q); // wild encounters from tall grass (src/battle/encounters.js)
  if (!shell) {
    // trainers resolve won/lost from the engine result
    const load = import('../battle/ui_sd.js?v=v0.2.95-alpha').then((m) => { ui.sdMod = m; return m; });
    ui.sdReady = load;
    // real-time trainer fights (branch rtb-trainer, NOT live; Gary Oct 29 2026): the same Options mode picks real-time for trainers,
    // Masters and the rival too. Team: injected Master / map team (progression) > authored team > the turn screen's placeholder pair.
    const rtTrainer = async (who) => {
      const { authoredTeam } = await import('../battle/data/trainer_teams.js?v=v0.2.95-alpha');
      const party = scene.party || [], lead = party[0] || { species: 'rillop', level: 5 };
      const inj = ui.trainerTeam?.(), lv = Math.max(2, (lead.level || 5) - 1), sp = lead.species === 'cindrip' ? 'rillop' : 'cindrip';
      const foes = inj?.foes?.length ? inj.foes.map((f) => ({ species: f.species, level: f.level })) : authoredTeam(who, party)
        || [{ species: sp, level: lv }, { species: sp === 'tumbloam' ? 'burlbeetle' : 'tumbloam', level: lv }];
      const m = await import('../rtb/index.js?v=v0.2.95-alpha'), dm = await import('../systems/difficulty.js?v=v0.2.95-alpha');
      // the trainer NPC on this map (stays standing where they are and watches; rematch ids end in ~rematch)
      const nid = String(who?.rematch || who?.id || '').replace(/~rematch$/, ''), npc = (!who?.map || who.map === scene.map?.name) ? scene.npcs?.byId?.(nid) || null : null;
      let e = {}; try { e = (who?.map && nid && scene._entryFor?.(who.map, { id: nid })) || {}; } catch { e = {}; }
      let hall = null; try { const pm = await import('../progression/masters.js?v=v0.2.95-alpha'); hall = pm.findHallTrainer(await (await fetch('data/masters.json')).json(), who?.map, nid); } catch { hall = null; } // hall Master / helper name + Master number
      const cls = e.trainer_class || '', nm = e.name || '', spk = npc && scene.speakerFor?.(npc)?.name;
      const name = (cls && nm && cls !== nm ? `${cls} ${nm}` : nm || cls) || hall?.who?.name_placeholder || spk || (inj?.foeName !== 'Trainer' && inj?.foeName) || 'Trainer';
      const items = dm.masterItems(inj?.masterNumber || (hall?.isMaster ? hall.hall.coin_number : 0), dm.getDifficulty(scene.systems?.state)); // same Master healing items as the turn battle
      const out = await m.openRtBattle(ui, scene, null, { q, trainer: { foes, name, npc, items, who } });
      return out?.outcome === 'win';
    };
    scene.hooks.onBattle = (who) => (rtbMode(scene, q) === 'rt' && !rtbKilled(q) && scene.party?.some((c) => c.hp == null || c.hp > 0) ? rtTrainer(who) : load.then(() => new Promise((res) => {
      ui.open('battle', { trainer: true, who, biome: biomeFor('', who?.map || scene.map?.name) }); const scr = ui.top; let out = null;
      scr.onDone = (r) => { out = r; }; ui._onClose = () => res(out ? out.outcome === 'win' : false);
    })));
    if (want === 'battle') { load.then(() => ui.open('battle', { trainer: q.get('trainer') === '1' })); return ui; }
  }
  // Dev/test hook (Oct 22, 2026): ?ui=evolve&from=cindrip[&to=..][&cancel=1] plays the Animator evolution FX (no evolution flow exists yet)
  if (want === 'evolve') { ui.evolveDone = Promise.resolve().then(() => ui.fx?.evolveFx({ from: q.get('from') || 'cindrip', to: q.get('to') || undefined, cancel: q.get('cancel') === '1' })); return ui; }
  const titleOnBoot = (ui.cfg.titleOnBoot !== false) && (q.get('title') === '1' || (q.get('title') !== '0' && !q.has('reset')));
  if (want !== 'phone' && (want === 'title' || titleOnBoot)) ui._bootTitle = true; // scr_title: first-launch Continue rule
  if (want === 'phone' || want === 'title' || titleOnBoot) ui.open(want === 'phone' ? 'phone' : 'title');
  // ALPHA build: first-launch notice (remembered in localStorage kilumen_alpha_notice_seen.v1).
  if (!noticeSeen()) setTimeout(() => ui.ask('title', [ALPHA_NOTICE], ['Got it'], { pat: 'sparkle' }).then(markNoticeSeen), 300);
  else if (want) { if (!['battle', 'levelup'].includes(want)) ui.open('phone'); ui.open(want); }
  return ui;
}

/** Kilindex blurb (dev/r56-wiring): the species key, else Text Bot's region 5/6 holding table (system_kilindex.entries._pending_r5_r6.<id>), so R5/R6 entries sync as each species registers. */
export function kilindexBlurb(T, s) {
  const pend = T(`system_kilindex.entries._pending_r5_r6.${s.id}`, null), alt = (typeof pend === 'string' ? pend : pend?.blurb) || s.blurb;
  return s.blurbKey ? T(s.blurbKey, alt) || alt : alt;
}

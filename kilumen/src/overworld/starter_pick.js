// Kilumen: starter choice preview panel (Oct 23, 2026; Gary 9:32 AM CT: "when choosing a starter you should be able to
// see the pokemon you are choosing and its type"). DOM over the canvas, driven by the scene each tick like the Dialog
// (handle({a, bEdge, dirEdge})), so it shares the keyboard / pad / touch mapping.
//   left / right (up / down too) = move the highlight; A = confirm; B = back (resolves null).
//   Tap: tapping a card highlights it; tapping the highlighted card again, or the Confirm button, confirms.
// Shows for the highlighted starter: its idle animation (front_idle GIF; the still battle sprite when reduced motion is on),
// whole-pixel sized so it stays crisp; its name; its element(s) as a coloured chip WITH the element name; its one-line blurb.
// Data: src/ui/data.js SPECIES (real names, elements, blurbs). No stats shown (none invented).
// Placed in the free band between the visible touch controls (phone), centred on PC, so nothing covers it.
import { speciesById, battleSpriteRel, ELEMENT_LABEL } from '../ui/data.js?v=v0.2.21-alpha';

const PIX = 'art/characters/pixel/';
export const idleGifRel = (id) => `creatures/${id}/anim/${id}_front_idle_2x.gif`;

/** Card data for a species id (pure; tests). */
export function starterCard(id) {
  const s = speciesById(id);
  return { species: id, name: s.name, el: (s.el || ['normal']).slice(), elLabels: (s.el || ['normal']).map(ELEMENT_LABEL), blurb: s.blurb || '',
    idle: PIX + idleGifRel(id), still: PIX + battleSpriteRel(id, 'front', true) };
}

/** Next highlight for a direction (pure; tests). */
export function moveSel(sel, dir, n) {
  if (dir === 'left' || dir === 'up') return (sel - 1 + n) % n;
  if (dir === 'right' || dir === 'down') return (sel + 1) % n;
  return sel;
}

const CSS = `
.sp-wrap{position:fixed;inset:0;z-index:30;pointer-events:none}
.sp-wrap[hidden]{display:none}
.sp-panel{position:fixed;pointer-events:auto;box-sizing:border-box;background:#1c1626;color:#f4ead2;border:3px solid #f4ead2;border-radius:16px;
  box-shadow:0 0 0 3px #1a1226,0 10px 30px rgba(0,0,0,.5);padding:14px 18px;display:flex;flex-direction:column;gap:10px;font-family:inherit;
  font-size:clamp(14px,1.6vh,20px)}
.sp-title{margin:0;font-size:1.05em;font-weight:800;letter-spacing:.02em}
.sp-tabs{display:flex;gap:8px;margin:0;padding:0;list-style:none}
.sp-tab{flex:1;min-height:44px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:wrap;cursor:pointer;
  background:#2c2340;color:#f4ead2;border:2px solid #8f7fb0;border-radius:10px;padding:4px 8px;font:inherit;font-weight:700}
.sp-tab[aria-checked=true]{background:#ffe07a;color:#1f1633;border-color:#fff;box-shadow:0 0 0 2px #1a1226}
.sp-tab .sp-dot{width:12px;height:12px;border-radius:50%;border:2px solid #1a1226;background:var(--sc-a)}
.sp-body{display:flex;gap:16px;align-items:center;min-height:0}
.sp-stage{flex:none;display:flex;align-items:center;justify-content:center;border-radius:12px;border:2px solid #8f7fb0;background:#2c2340}
.sp-stage img{display:block;image-rendering:pixelated;image-rendering:crisp-edges}
.sp-info{display:flex;flex-direction:column;gap:8px;min-width:0}
.sp-name{margin:0;font-size:1.6em;font-weight:900;line-height:1.05}
.sp-els{display:flex;gap:6px;flex-wrap:wrap}
.sp-panel .el-chip{font-size:.8em;color:#1f1633;border-color:#1a1226;padding:2px 12px}
.sp-blurb{margin:0;line-height:1.3;color:#f4ead2}
.sp-foot{display:flex;align-items:center;gap:12px;justify-content:space-between}
.sp-hint{margin:0;font-size:.85em;color:#d9cfee}
.sp-ok{min-height:44px;min-width:120px;cursor:pointer;background:#ffc83d;color:#1a1226;border:3px solid #1a1226;border-radius:12px;font:inherit;font-weight:900;padding:4px 14px}
.sp-panel.compact{padding:8px 12px;gap:6px;font-size:13px;border-radius:12px}
.sp-panel.compact .sp-name{font-size:1.35em}
.sp-panel.compact .sp-blurb{font-size:.92em}
.sp-panel.compact .sp-tab{min-height:40px;padding:2px 6px}
`;

export class StarterPicker {
  /** @param {Document} doc  @param {object} [opt] {mobile: bool (touch hint text)} */
  constructor(doc = globalThis.document, opt = {}) {
    this.doc = doc; this.opt = opt; this.cur = null; this._tap = null;
    if (!doc.getElementById('sp-style')) { const st = doc.createElement('style'); st.id = 'sp-style'; st.textContent = CSS; doc.head.appendChild(st); }
    const el = (tag, cls, parent, attrs = {}) => { const e = doc.createElement(tag); if (cls) e.className = cls; for (const k in attrs) e.setAttribute(k, attrs[k]); parent?.appendChild(e); return e; };
    this.wrap = el('div', 'sp-wrap', doc.body); this.wrap.hidden = true;
    this.panel = el('section', 'sp-panel', this.wrap, { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'sp-title' });
    this.title = el('h2', 'sp-title', this.panel, { id: 'sp-title' });
    this.tabs = el('div', 'sp-tabs', this.panel, { role: 'radiogroup', 'aria-labelledby': 'sp-title' });
    this.body = el('div', 'sp-body', this.panel, { 'aria-live': 'polite' });
    this.stage = el('div', 'sp-stage', this.body);
    this.img = el('img', '', this.stage); this.img.alt = '';
    const info = el('div', 'sp-info', this.body);
    this.name = el('p', 'sp-name', info);
    this.els = el('div', 'sp-els', info);
    this.blurb = el('p', 'sp-blurb', info);
    const foot = el('div', 'sp-foot', this.panel);
    this.hint = el('p', 'sp-hint', foot);
    this.ok = el('button', 'sp-ok', foot, { type: 'button' }); this.ok.textContent = 'Confirm';
    this.img.addEventListener('error', () => { if (this.cur && this.img.src.endsWith('.gif')) this.img.src = this.cur.cards[this.cur.sel].still; });
    this.tabs.addEventListener('pointerdown', (e) => {
      const b = e.target.closest?.('[data-i]'); if (!b || !this.cur) return;
      e.preventDefault(); this._tap = { pick: +b.dataset.i };
    });
    this.ok.addEventListener('pointerdown', (e) => { if (!this.cur) return; e.preventDefault(); this._tap = { a: true }; });
    this.stage.addEventListener('pointerdown', (e) => { if (!this.cur) return; e.preventDefault(); this._tap = { a: true }; }); // tapping the shown creature = confirm it
    doc.defaultView?.addEventListener?.('resize', () => this._place());
  }

  get active() { return !!this.cur; }

  /**
   * @param {string[]} species  ids in case order
   * @param {number} sel  first highlight
   * @param {object} [o] {title, reduced}
   * @returns {Promise<number|null>} index confirmed, null = backed out (B)
   */
  open(species, sel = 0, o = {}) {
    return new Promise((resolve) => {
      const cards = species.map(starterCard);
      this.cur = { cards, sel: Math.max(0, Math.min(cards.length - 1, sel | 0)), resolve, reduced: !!o.reduced };
      this.title.textContent = o.title || 'Choose your partner';
      this.hint.textContent = o.hint || (this.opt.mobile ? 'Tap a name to look. Tap it again or Confirm to choose.' : '\u25C0 \u25B6 to look \u00B7 A / Enter to choose \u00B7 B / Esc to back out');
      this.tabs.replaceChildren(...cards.map((c, i) => {
        const b = this.doc.createElement('button'); b.type = 'button'; b.className = 'sp-tab'; b.dataset.i = String(i); b.setAttribute('role', 'radio');
        b.dataset.el = c.el[0];
        const dot = this.doc.createElement('span'); dot.className = 'sp-dot'; dot.setAttribute('aria-hidden', 'true');
        b.append(dot, this.doc.createTextNode(c.name));
        return b;
      }));
      this.wrap.hidden = false;
      this._render(); this._place();
    });
  }

  _render() {
    const c = this.cur; if (!c) return;
    const k = c.cards[c.sel];
    for (const b of this.tabs.children) b.setAttribute('aria-checked', String(+b.dataset.i === c.sel));
    const want = c.reduced ? k.still : k.idle;
    if (!this.img.src.endsWith(want)) this.img.src = want;
    this.img.alt = `${k.name}, ${k.elLabels.join(' and ')} type`;
    this.name.textContent = k.name;
    this.els.replaceChildren(...k.el.map((e, i) => {
      const s = this.doc.createElement('span'); s.className = 'el-chip'; s.dataset.el = e; s.dataset.pat = 'stripes'; s.textContent = k.elLabels[i]; return s;
    }));
    this.blurb.textContent = k.blurb; this.blurb.hidden = !k.blurb;
    this.ok.textContent = `Choose ${k.name}`;
    this.ok.setAttribute('aria-label', `Choose ${k.name}`);
  }

  /** Visible touch buttons (left / right of centre), like Dialog._visibleControls. */
  _controls(win) {
    const tp = this.doc.getElementById('touchpad'), out = { left: [], right: [] };
    if (!tp || tp.hidden) return out;
    for (const b of tp.querySelectorAll('button')) {
      const r = b.getBoundingClientRect(), cs = win.getComputedStyle(b);
      if (!r.width || cs.visibility === 'hidden' || +cs.opacity === 0 || cs.display === 'none') continue;
      ((r.left + r.right) / 2 < win.innerWidth / 2 ? out.left : out.right).push(r);
    }
    return out;
  }

  _place() {
    const win = this.doc.defaultView; if (!win || !this.cur) return;
    const W = win.innerWidth, H = win.innerHeight, m = 8, g = 10, vis = this._controls(win);
    const lo = Math.max(m, ...vis.left.map((r) => r.right + g)), hi = Math.min(W - m, ...vis.right.map((r) => r.left - g));
    const compact = H < 560 || hi - lo < 620;
    this.panel.classList.toggle('compact', compact);
    // sprite: 128-px art; 256 CSS px on PC, 128 on phone. At dpr 1 or 2 that is a whole 1x / 2x of the art (the files are 2x).
    const size = compact ? 128 : 256;
    this.img.style.width = this.img.style.height = `${size}px`;
    this.stage.style.width = this.stage.style.height = `${size + 8}px`;
    const w = Math.min(compact ? 560 : 760, hi - lo);
    const ps = this.panel.style;
    ps.left = `${Math.round(lo + (hi - lo - w) / 2)}px`; ps.width = `${Math.round(w)}px`; ps.maxHeight = `${H - 2 * m}px`;
    ps.top = '0px';
    const h = this.panel.getBoundingClientRect().height;
    ps.top = `${Math.max(m, Math.round((H - h) / 2))}px`;
  }

  _close() { this.wrap.hidden = true; this.cur = null; this._tap = null; }

  /** One tick of input: {a, bEdge, dirEdge}. */
  handle({ a, bEdge, dirEdge }) {
    const c = this.cur; if (!c) return;
    const tap = this._tap; this._tap = null;
    if (tap?.pick != null && tap.pick >= 0 && tap.pick < c.cards.length) {
      if (tap.pick === c.sel) a = true; else { c.sel = tap.pick; this._render(); return; }
    } else if (tap?.a) a = true;
    const finish = (v) => { const r = c.resolve; this._close(); r(v); };
    if (dirEdge) { const n = moveSel(c.sel, dirEdge, c.cards.length); if (n !== c.sel) { c.sel = n; this._render(); } }
    else if (a) finish(c.sel);
    else if (bEdge) finish(null);
  }
}

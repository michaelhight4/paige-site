// Kilumen: dialogue box (DOM over the canvas). Promise-based so scene scripts read top to bottom:
//   await dlg.say(pages, speaker)          A advances a page (B too)
//   const i = await dlg.ask(pages, choices, speaker)   up/down + A; B picks the last choice (No)
//   await dlg.inbox(emails, isRead, markRead)          up/down + A opens; B goes back / closes
// speaker = {name, portrait (url, one frame), battle (url of the 64x128 trainer sprite), zoom}
// Input comes from the scene each tick (handle(snap)), so it shares the game's keyboard / pad / touch mapping.

export class Dialog {
  constructor(root = document.body) {
    const el = (tag, cls, parent) => { const e = document.createElement(tag); if (cls) e.className = cls; parent?.appendChild(e); return e; };
    this.wrap = el('div', 'dlg-wrap', root); this.wrap.hidden = true;
    this.portrait = el('img', 'dlg-portrait', this.wrap); this.portrait.alt = '';
    this.battle = el('img', 'dlg-battle', this.wrap); this.battle.alt = '';
    this.box = el('div', 'dlg-box', this.wrap); this.box.setAttribute('role', 'dialog'); this.box.setAttribute('aria-live', 'polite');
    this.name = el('div', 'dlg-name', this.box);
    this.text = el('div', 'dlg-text', this.box);
    this.list = el('ul', 'dlg-list', this.box);
    this.more = el('div', 'dlg-more', this.box); this.more.textContent = '\u25BC';
    this.cur = null;
    this.shown = []; // every page shown (tests)
  }

  get active() { return !!this.cur; }

  _speaker(sp) {
    this.name.textContent = sp?.name || ''; this.name.hidden = !sp?.name;
    this.portrait.hidden = !sp?.portrait; if (sp?.portrait) this.portrait.src = sp.portrait;
    this.battle.hidden = !sp?.battle;
    if (sp?.battle) { this.battle.src = sp.battle; const z = sp.zoom || 2; this.battle.style.width = 64 * z + 'px'; this.battle.style.height = 128 * z + 'px'; }
    this.wrap.classList.toggle('has-portrait', !!sp?.portrait);
  }

  _show() { this.wrap.hidden = false; requestAnimationFrame(() => this.wrap.classList.add('open')); }
  _close() { this.wrap.classList.remove('open'); this.wrap.hidden = true; this.cur = null; }

  _render() {
    const c = this.cur;
    if (!c) return;
    this.list.replaceChildren(); this.list.hidden = true;
    if (c.type === 'say' || c.type === 'ask') {
      this.text.textContent = c.pages[c.i] ?? '';
      this.text.hidden = false;
      const lastPage = c.i >= c.pages.length - 1;
      if (c.type === 'ask' && lastPage) this._items(c.choices.map((t) => ({ t })), c.sel);
      this.more.hidden = c.type === 'ask' && lastPage;
      if (c.i < c.pages.length) this.shown.push(c.pages[c.i]);
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
        this._items(c.items.slice(start, start + 5).map((e) => ({ t: e.subject, sub: e.from, dot: !c.isRead(e) })), c.sel - start);
        this.more.hidden = true;
      }
    }
  }

  _items(items, sel) {
    this.list.hidden = false;
    items.forEach((it, i) => {
      const li = document.createElement('li');
      if (i === sel) li.className = 'sel';
      if (it.dot) { const d = document.createElement('span'); d.className = 'new-dot'; d.title = 'new'; li.appendChild(d); }
      li.appendChild(document.createTextNode(it.t));
      if (it.sub) { const s = document.createElement('span'); s.className = 'sub'; s.textContent = it.sub; li.appendChild(s); }
      this.list.appendChild(li);
    });
  }

  say(pages, speaker) {
    if (!pages?.length) return Promise.resolve();
    return new Promise((resolve) => { this._speaker(speaker); this.cur = { type: 'say', pages, i: 0, resolve }; this._show(); this._render(); });
  }

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

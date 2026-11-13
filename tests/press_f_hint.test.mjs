// Press F / Tap hint in the dialogue box (Gary 2:10 PM CT Oct 23, 2026: "need a press f by the bottom right corner of speech
// bubbles"). src/overworld/dialog.js builds .dlg-hint; style.css places it. A tiny fake DOM, so no browser is needed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const prof = (n) => JSON.parse(fs.readFileSync(path.join(ROOT, 'src/platform', n + '.json'), 'utf8'));

function el(tag) {
  const cls = new Set(), attrs = {}, props = {};
  const e = {
    tagName: tag.toUpperCase(), children: [], hidden: false, dataset: {}, offsetWidth: 0, _text: '',
    style: { setProperty: (k, v) => { props[k] = v; }, getPropertyValue: (k) => props[k] ?? '' },
    get className() { return [...cls].join(' '); }, set className(v) { cls.clear(); for (const c of String(v).split(/\s+/)) if (c) cls.add(c); },
    classList: { add: (c) => cls.add(c), remove: (c) => cls.delete(c), contains: (c) => cls.has(c), toggle: (c, on = !cls.has(c)) => (on ? cls.add(c) : cls.delete(c), on) },
    get textContent() { return this._text + this.children.map((c) => c.textContent).join(''); }, set textContent(v) { this._text = String(v); this.children = []; },
    appendChild(c) { this.children.push(c); c.parentElement = this; return c; }, replaceChildren(...k) { this._text = ''; this.children = k; },
    setAttribute: (k, v) => { attrs[k] = String(v); }, getAttribute: (k) => attrs[k] ?? null, addEventListener() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }),
    querySelector(sel) { const c = sel.replace(/^\./, ''); for (const k of this.children) { if (k.classList.contains(c)) return k; const f = k.querySelector(sel); if (f) return f; } return null; },
  };
  return e;
}
globalThis.document ??= { createElement: el, createTextNode: (t) => Object.assign(el('#text'), { _text: String(t) }) };
globalThis.requestAnimationFrame ??= (f) => f();
const { Dialog } = await import('../src/overworld/dialog.js');
const make = (controls) => { const d = new Dialog(el('body'), null, null, controls); return { d, hint: d.box.querySelector('.dlg-hint') }; };

test('press F hint: exists inside the dialogue box, after the text, hidden until a page shows', () => {
  const { d, hint } = make(prof('pc').controls);
  assert.ok(hint, '.dlg-hint is in .dlg-box');
  assert.equal(hint.parentElement, d.box);
  assert.equal(hint.hidden, true, 'hidden with no dialogue open');
  assert.equal(hint.getAttribute('aria-hidden'), 'true', 'visual only; the live region does not read it out');
  d.say(['Hello.', 'Bye.']);
  assert.equal(hint.hidden, false, 'shown on an advanceable page');
  assert.ok(d.box.classList.contains('hint-on'));
  assert.equal(hint.style.getPropertyValue('--dlg-chars'), '6', 'typewriter wait = page length');
  d.handle({ a: true }); assert.equal(hint.hidden, false, 'still on for page 2');
  d.handle({ a: true }); assert.equal(d.active, false); assert.equal(hint.hidden, true, 'hidden once the box closes');
});

test('press F hint: "Press F" on PC, "Tap" on the touch (phone) profile', () => {
  assert.equal(make(prof('pc').controls).hint.textContent, 'Press F');
  assert.equal(make(null).hint.textContent, 'Press F', 'no profile = pc');
  assert.equal(make(prof('mobile').controls).hint.textContent, 'Tap');
  assert.equal(make({ touch: true }).hint.textContent, 'Tap');
  assert.equal(make({ tapDialog: true }).hint.textContent, 'Tap');
});

test('press F hint: hidden while a choice list is open, back on the next say; thought bubbles get it too', async () => {
  for (const p of ['pc', 'mobile']) {
    const { d, hint } = make(prof(p).controls);
    const pick = d.ask(['Ready?', 'Pick one.'], ['Yes', 'No']);
    assert.equal(hint.hidden, false, `${p}: lead-in page (no list yet) shows it`);
    d.handle({ a: true });
    assert.equal(d.list.hidden, false, 'choice list open');
    assert.equal(hint.hidden, true, `${p}: hidden while the choice list is open`);
    assert.equal(d.box.classList.contains('hint-on'), false);
    d.handle({ dirEdge: 'down' }); assert.equal(hint.hidden, true, 'still hidden after moving the cursor');
    d.handle({ a: true }); assert.equal(await pick, 1);
    d.say(['...I should go.'], { thought: true });
    assert.ok(d.wrap.classList.contains('thought'));
    assert.equal(hint.hidden, false, `${p}: thought bubble shows it`);
  }
});

test('press F hint: inbox list hides it, an opened email shows it', () => {
  const { d, hint } = make(prof('pc').controls);
  d.inbox('Inbox', [{ from: 'RT', subject: 'Hi', pages: ['One', 'Two'] }], () => false, () => {});
  assert.equal(hint.hidden, true, 'inbox list open');
  d.handle({ a: true }); assert.equal(hint.hidden, false, 'reading an email');
  d.handle({ bEdge: true }); assert.equal(hint.hidden, true, 'back on the list');
});

test('press F hint: style.css plate contrast >= 4.5:1, inside the box, reduced motion off, text reserve', () => {
  const css = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');
  const rule = css.match(/\n\.dlg-hint \{([^}]*)\}/)[1];
  const hex = (k) => rule.match(new RegExp(`(?:^|[;\\s])${k}:\\s*(#[0-9a-fA-F]{6})`))[1];
  const lum = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
  const [a, b] = [lum(hex('color')), lum(hex('background'))].sort((x, y) => y - x);
  assert.ok((a + 0.05) / (b + 0.05) >= 4.5, 'hint text contrast');
  assert.match(rule, /position: absolute; right: calc\(18px \+ [\d.]+em\); bottom: 6px/, 'bottom-right, left of the ▼, inside the padding');
  assert.match(css, /prefers-reduced-motion: reduce\) \{ \.dlg-hint[^{]*\{ animation: none; \}/);
  assert.match(css, /body\.ui-reduce \.dlg-hint \{ animation: none !important; \}/);
  assert.match(css, /\.dlg-box\.hint-on \.dlg-text::after \{ content: ''; display: inline-block; width: [\d.]+em; \}/);
  assert.match(css, /\.dlg-box:has\(\.dlg-text \.rv\) \.dlg-hint \{ animation: dlg-hint-in/, 'waits while the text types out');
});

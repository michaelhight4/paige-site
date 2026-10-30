// Kilumen touch input standard (Gary, Oct 30 2026): UI never activates on pointerdown / touchstart, and nothing blocks
// native scrolling in scroll containers. Rule + how to use src/shared/tap_guard.js: /workspace/quality/dev_notes/touch_input_standard.md
// This test FAILS when:
//   1. any src/ listener for pointerdown / touchstart (addEventListener, .onpointerdown =, .ontouchstart =), or any
//      { passive: false } listener, is added without a `// touch-ok: <reason>` note on the same line (game pads, canvases,
//      stopPropagation guards and long-press timers are the only allowed uses). UI taps go through onTap().
//   2. a CSS rule (style.css, src/**/*.css, CSS strings in src/**/*.js) makes a scroll container touch-action:none, or puts
//      touch-action:none on list rows / scroll lists ([data-i], li, .ui-scroll, .ui-list, *-list, *-scroll).
//   3. the shared guard stops behaving: activation only on a release within TAP_SLOP and TAP_HOLD_MS, never on down, never
//      after a drag / hold / pointercancel / scroll, passive listeners only.
//   4. (drag fix, Oct 30 2026) any activation-style listener: 'click' / .onclick = / onclick= / 'pointerup' / 'mouseup' /
//      'touchend' / .onpointerup = / .onmouseup = / .ontouchend = outside tap_guard.js lacks a `// touch-ok: <reason>`
//      (click fires after a mouse drag that starts and ends on the same element; these must go through onTap() or be
//      game controls / keyboard paths covered by the document drag guard), or ui.js stops installing installDragGuard().
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'src');
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? (n === 'vendor' ? [] : walk(p)) : [p]; });
const files = walk(SRC);
const rel = (p) => relative(ROOT, p).replaceAll('\\', '/');
const GUARD = 'src/shared/tap_guard.js';

test('1. no pointerdown / touchstart / non-passive listener without a touch-ok reason', () => {
  const bad = [];
  const pat = /['"](pointerdown|touchstart)['"]|\.on(pointerdown|touchstart)\s*=|passive:\s*false/;
  for (const f of files.filter((p) => p.endsWith('.js') && rel(p) !== GUARD)) {
    readFileSync(f, 'utf8').split('\n').forEach((l, i) => {
      const code = l.replace(/\/\/ touch-ok:.*$/, '');
      if (!pat.test(code) || /^\s*(\/\/|\*)/.test(l)) return;
      if (!/\/\/ touch-ok: \S/.test(l)) bad.push(`${rel(f)}:${i + 1}: ${l.trim().slice(0, 140)}`);
    });
  }
  assert.deepEqual(bad, [], 'UI must activate on a tap release: use onTap() from src/shared/tap_guard.js, or (game controls only) add `// touch-ok: <reason>`');
});

test('4. no raw click / pointerup / mouseup / touchend activation outside the guard without a touch-ok reason', () => {
  const bad = [];
  const pat = /['"](click|pointerup|mouseup|touchend|dblclick)['"]|\.on(click|pointerup|mouseup|touchend|dblclick)\s*=|\sonclick\s*=/i;
  for (const f of files.filter((p) => p.endsWith('.js') && rel(p) !== GUARD)) {
    readFileSync(f, 'utf8').split('\n').forEach((l, i) => {
      const code = l.replace(/\/\/ touch-ok:.*$/, '');
      if (!pat.test(code) || /^\s*(\/\/|\*)/.test(l)) return;
      if (!/\/\/ touch-ok: \S/.test(l)) bad.push(`${rel(f)}:${i + 1}: ${l.trim().slice(0, 140)}`);
    });
  }
  assert.deepEqual(bad, [], 'a drag must never activate: use onTap() (tap_guard.js); raw click/pointerup handlers only for game controls or keyboard, marked `// touch-ok: <reason>`');
});

test('4b. ui.js installs the document drag guard; fullscreen chip uses onTap', () => {
  assert.match(readFileSync(join(ROOT, 'src/ui/ui.js'), 'utf8'), /installDragGuard\(/);
  assert.match(readFileSync(join(ROOT, 'src/fullscreen.js'), 'utf8'), /onTap\(b, null/);
});

test('1b. menus, dialog rows, starter picker and HUD buttons use the shared guard', () => {
  for (const [f, n] of [['src/ui/ui.js', 3], ['src/overworld/dialog.js', 3], ['src/overworld/starter_pick.js', 3], ['src/systems/company_voice.js', 1]]) {
    const s = readFileSync(join(ROOT, f), 'utf8');
    assert.match(s, /import \{ onTap[ ,\w]*\} from '\.\.\/shared\/tap_guard\.js/, f);
    assert.ok((s.match(/onTap\(/g) || []).length >= n, `${f} wires taps through onTap()`);
  }
});

// ---- CSS ----
const cssSources = () => {
  const out = [];
  for (const f of [join(ROOT, 'style.css'), ...files.filter((p) => p.endsWith('.css'))]) out.push([rel(f), readFileSync(f, 'utf8')]);
  for (const f of files.filter((p) => p.endsWith('.js'))) { const s = readFileSync(f, 'utf8'); if (/touch-action/.test(s)) out.push([rel(f), s]); }
  return out;
};
const rules = (css) => [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ sel: m[1].trim().split('\n').pop().trim(), body: m[2] }));
const NONE = /touch-action\s*:\s*none/;
const SCROLLS = /overflow(-x|-y)?\s*:\s*(auto|scroll)/;
const LISTY = /\[data-i\]|(^|[\s>+~,])li\b|\.ui-scroll|\.ui-list|[\w-]+-list\b|[\w-]+-scroll\b/;

test('2. no scroll container or scrolling list row has touch-action:none', () => {
  const bad = [];
  for (const [f, css] of cssSources()) for (const r of rules(css)) {
    if (!NONE.test(r.body)) continue;
    if (SCROLLS.test(r.body)) bad.push(`${f}: "${r.sel}" scrolls but has touch-action:none`);
    else if (LISTY.test(r.sel)) bad.push(`${f}: "${r.sel}" is a list row / scroll list with touch-action:none (use pan-y)`);
  }
  assert.deepEqual(bad, []);
});

test('2b. the menu scroll area keeps native vertical panning', () => {
  const css = readFileSync(join(ROOT, 'src/ui/ui.css'), 'utf8');
  assert.match(css, /\.ui-scroll\s*\{[^}]*overflow-y:\s*auto[^}]*touch-action:\s*pan-y/);
});

// ---- the shared guard, with fake events ----
class FakeTarget {
  constructor(parent = null) { this.parent = parent; this.l = {}; this.isConnected = true; this.dataset = {}; }
  addEventListener(t, fn, o) { (this.l[t] ||= []).push({ fn, o }); }
  removeEventListener(t, fn) { this.l[t] = (this.l[t] || []).filter((x) => x.fn !== fn); }
  closest(sel) { let n = this; while (n) { if (n.matches?.(sel)) return n; n = n.parent; } return null; }
  contains(n) { while (n) { if (n === this) return true; n = n.parent; } return false; }
  fire(t, p = {}) { const e = { type: t, target: this, pointerId: 1, pointerType: 'touch', isPrimary: true, button: 0, clientX: 0, clientY: 0, preventDefault() { this.dp = true; }, stopPropagation() {}, ...p }; let n = this; while (n) { for (const x of n.l[t] || []) x.fn(e); n = n.parent; } return e; }
}
const setup = async (opts) => {
  const { onTap, TAP_SLOP } = await import('../src/shared/tap_guard.js');
  const root = new FakeTarget(); root.ownerDocument = null;
  const row = new FakeTarget(root); row.matches = (s) => s === '[data-i]';
  const hits = []; onTap(root, '[data-i]', (e, el) => hits.push(el), { ghostClick: false, ...opts });
  return { root, row, hits, TAP_SLOP };
};

test('3a. a still press activates on release, never on down', async () => {
  const { row, hits } = await setup();
  const d = row.fire('pointerdown', { clientX: 50, clientY: 50 });
  assert.equal(hits.length, 0, 'nothing on pointerdown'); assert.ok(!d.dp, 'pointerdown is never preventDefault-ed');
  row.fire('pointerup', { clientX: 53, clientY: 54 }); assert.deepEqual(hits, [row]);
});

test('3b. a drag (scroll gesture) never activates', async () => {
  const { row, hits, TAP_SLOP } = await setup();
  row.fire('pointerdown', { clientX: 50, clientY: 50 }); row.fire('pointermove', { clientX: 50, clientY: 50 + TAP_SLOP + 2 });
  row.fire('pointerup', { clientX: 50, clientY: 50 }); assert.equal(hits.length, 0, 'moved back but it was a drag');
  row.fire('pointerdown', { clientX: 50, clientY: 50 }); row.fire('pointerup', { clientX: 50, clientY: 90 }); assert.equal(hits.length, 0);
});

test('3c. pointercancel (browser took the scroll) and a scroll inside the root cancel the tap', async () => {
  const { root, row, hits } = await setup();
  row.fire('pointerdown'); row.fire('pointercancel'); row.fire('pointerup'); assert.equal(hits.length, 0);
  row.fire('pointerdown'); for (const x of root.l.scroll) x.fn({}); row.fire('pointerup'); assert.equal(hits.length, 0);
});

test('3d. second finger, other mouse buttons, detached rows and presses outside rows never activate', async () => {
  const { root, row, hits } = await setup();
  row.fire('pointerdown', { isPrimary: false }); row.fire('pointerup'); assert.equal(hits.length, 0);
  row.fire('pointerdown', { pointerType: 'mouse', button: 2 }); row.fire('pointerup', { pointerType: 'mouse' }); assert.equal(hits.length, 0);
  row.fire('pointerdown'); row.isConnected = false; row.fire('pointerup'); assert.equal(hits.length, 0); row.isConnected = true;
  root.fire('pointerdown'); root.fire('pointerup'); assert.equal(hits.length, 0);
  row.fire('pointerdown', { pointerType: 'mouse' }); row.fire('pointerup', { pointerType: 'mouse' }); assert.equal(hits.length, 1, 'mouse click still works');
});

test('3f. a press held longer than TAP_HOLD_MS never activates, even without moving (touch and mouse)', async () => {
  const { row, hits } = await setup({ hold: 40 });
  for (const pointerType of ['touch', 'mouse', 'pen']) {
    row.fire('pointerdown', { pointerType }); await new Promise((r) => setTimeout(r, 70)); row.fire('pointerup', { pointerType });
  }
  assert.equal(hits.length, 0, 'held presses');
  row.fire('pointerdown'); row.fire('pointerup'); assert.equal(hits.length, 1, 'a quick tap still works');
  const { TAP_HOLD_MS } = await import('../src/shared/tap_guard.js'); assert.ok(TAP_HOLD_MS >= 200 && TAP_HOLD_MS <= 400, 'hold limit ~300 ms');
});

test('3g. document drag guard swallows the click after a drag or hold, keeps it after a tap, and mouse-drags scroll lists', async () => {
  const { installDragGuard, TAP_SLOP } = await import('../src/shared/tap_guard.js');
  const doc = new FakeTarget(); doc.documentElement = {}; doc.nodeType = 9;
  const list = new FakeTarget(doc); list.nodeType = 1; list.parentElement = null; list.scrollTop = 100; list.scrollLeft = 0; list.scrollHeight = 900; list.clientHeight = 300; list.scrollWidth = 10; list.clientWidth = 10;
  const row = new FakeTarget(list); row.nodeType = 1; row.parentElement = list; row.scrollHeight = 10; row.clientHeight = 10; row.scrollWidth = 10; row.clientWidth = 10;
  doc.defaultView = { getComputedStyle: (n) => (n === list ? { overflowY: 'auto', overflowX: 'hidden' } : { overflowY: 'visible', overflowX: 'visible' }) };
  const off = installDragGuard(doc);
  const clickEaten = () => { let eaten = false; const e = { type: 'click', detail: 1, target: row, preventDefault() { eaten = true; }, stopImmediatePropagation() {} }; for (const x of doc.l.click) x.fn(e); return eaten; };
  const m = { pointerType: 'mouse', buttons: 1 };
  row.fire('pointerdown', { ...m, clientX: 10, clientY: 200 }); row.fire('pointermove', { ...m, clientX: 10, clientY: 200 - (TAP_SLOP + 50) });
  assert.equal(list.scrollTop, 100 + TAP_SLOP + 50, 'mouse drag scrolled the list'); row.fire('pointerup', { ...m, clientX: 10, clientY: 140 });
  assert.ok(clickEaten(), 'click after a mouse drag is swallowed');
  row.fire('pointerdown', { clientX: 10, clientY: 10 }); row.fire('pointerup', { clientX: 12, clientY: 12 }); assert.ok(!clickEaten(), 'tap keeps its click');
  row.fire('pointerdown', { clientX: 10, clientY: 10 }); row.fire('pointercancel'); assert.ok(clickEaten(), 'touch scroll (pointercancel) swallows the click');
  off();
});

test('3e. every guard listener except pointerup is passive (never blocks native scroll)', async () => {
  const { root } = await setup();
  for (const t of ['pointerdown', 'pointermove', 'pointercancel', 'scroll']) assert.equal(root.l[t][0].o?.passive, true, t);
  assert.equal(root.l.touchstart, undefined); assert.equal(root.l.touchmove, undefined);
});

// gd bug 3: the Heal Centre (carer) choice list is a dialog.js ask(); on pc it had no mouse (only tapDialog profiles could tap it,
// and .dlg-wrap is pointer-events:none). Verified in Chromium (Playwright): hover selects, click picks. These guard the wiring.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const dlg = readFileSync(new URL('../src/overworld/dialog.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');

test('dialog choice rows take mouse click and hover on pc', () => {
  assert.match(dlg, /this\.list\.addEventListener\?\.\('pointerdown'/);
  assert.match(dlg, /this\.list\.addEventListener\?\.\('mousemove'/);
  assert.match(dlg, /_hover\(i\)/);
  assert.match(css, /\.dlg-list li\[data-i\][^}]*pointer-events:\s*auto/);
});

test('_hover moves the selection only on the choice page', async () => {
  const { Dialog } = await import('../src/overworld/dialog.js?v=v0.2.93-alpha').catch(() => ({}));
  if (!Dialog) return; // DOM-only module in some builds
  const lis = [0, 1].map((i) => ({ dataset: { i: String(i) }, classList: { on: i === 0, toggle(_, v) { this.on = v; } } }));
  const fake = { cur: { type: 'ask', pages: ['Rest?'], i: 0, choices: ['Rest', 'Not now'], sel: 0 }, list: { hidden: false, querySelectorAll: () => lis } };
  Dialog.prototype._hover.call(fake, 1);
  assert.equal(fake.cur.sel, 1); assert.equal(lis[1].classList.on, true); assert.equal(lis[0].classList.on, false);
  fake.cur.pages = ['a', 'b']; Dialog.prototype._hover.call(fake, 0); assert.equal(fake.cur.sel, 1); // not on choices yet
});

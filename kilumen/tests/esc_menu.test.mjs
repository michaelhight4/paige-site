// v0.2.54 regression: one Esc press opens the menu and leaves it open; a second Esc closes it; X (B) backs out.
// Run: node kilumen/tests/esc_menu.test.mjs [url]   (needs `playwright`; default url = live)
import { chromium } from 'playwright';
const url = process.argv[2] || 'https://paigegames.net/kilumen/';
const b = await chromium.launch(); const fails = [];
for (const [name, opts] of [['pc', { viewport: { width: 1280, height: 720 } }], ['phone', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }]]) {
  const p = await b.newPage(opts);
  await p.goto(url + (url.includes('?') ? '&' : '?') + 'cv=0&skipintro=1'); await p.waitForFunction(() => window.kilumen?.ui && window.kilumen.scene?.map, null, { timeout: 60000 });
  await p.waitForTimeout(3000);
  const act = () => p.evaluate(() => !!window.kilumen.ui.active);
  const ui = async () => { await p.waitForTimeout(400); return act(); };
  for (let i = 0; i < 10 && await act(); i++) { // alpha note -> title -> New game -> difficulty
    if (await p.evaluate(() => !!window.kilumen.ui.modal)) await p.getByText('Got it').click({ timeout: 1500 }).catch(() => p.keyboard.press('Enter')); else await p.keyboard.press('Enter');
    await p.waitForTimeout(1200);
  }
  await p.waitForTimeout(1500);
  for (let i = 0; i < 30 && await p.evaluate(() => { const s = window.kilumen.scene; return !!(s.dialog?.active || s.busy); }); i++) { await p.keyboard.press('KeyZ'); await p.waitForTimeout(500); } // opening lines
  const r = { overworld: !(await act()) };
  await p.keyboard.press('Escape'); r.open = await ui();
  await p.keyboard.press('Escape'); r.closed = !(await ui());
  await p.keyboard.press('Escape'); await ui(); await p.keyboard.press('KeyX'); r.xBack = !(await ui());
  console.log(name, JSON.stringify(r));
  if (!r.open || !r.closed || !r.xBack) fails.push(name);
  await p.close();
}
await b.close();
if (fails.length) { console.error('FAIL', fails); process.exit(1); } console.log('PASS');

// Oct 30 2026 integration blocker: ?dev=1 opened an empty 'Dev console admin' panel (a merge left `let b` inside a comment in
// bchip, so a ReferenceError killed the console). Opens the console in a real page and checks every tab renders a body.
import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
test('dev console (?dev=1, local override) shows all tabs and each renders', { timeout: 120000 }, async () => {
  const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
  const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  const browser = await chromium.launch();
  try {
    const base = `http://127.0.0.1:${PORT}/index.html`;
    for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await sleep(100); }
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.addInitScript(() => { try { localStorage.setItem('kilumen_alpha_notice_seen.v1', '1'); } catch {} });
    const errors = []; page.on('pageerror', (e) => errors.push(String(e.stack || e).split('\n').slice(0, 3).join(' ')));
    await page.goto(`${base}?save=0&audio=0&enc=0&timescale=0&hour=12&dev=1&lead=nibbin`);
    await page.waitForFunction(() => window.kilumen?.uiReady && window.kilumen?.scene?.map, null, { timeout: 60000 });
    await sleep(1200); await page.evaluate(() => { try { kilumen.ui?.closeAll?.(); } catch {} });
    for (let i = 0; i < 8; i++) { await page.keyboard.press('f'); await sleep(300); }
    for (let i = 0; i < 30 && await page.evaluate(() => kilumen.scene.busy || kilumen.scene.dialog?.active || kilumen.scene.fade); i++) { await page.keyboard.press('f'); await sleep(250); }
    let opened = false;
    for (let i = 0; i < 60 && !opened; i++) { await page.evaluate(() => { const s = kilumen.scene; if (s.fade) return; s.busy = false; try { kilumen.ui?.closeAll?.(); } catch {} }); await page.keyboard.press('F2'); await sleep(400); opened = await page.evaluate(() => !!document.querySelector('.kdev .tabs button')); }
    assert.ok(opened, 'console opened with tabs; errors: ' + errors.join(' | '));
    const names = await page.$$eval('.kdev .tabs button', (bs) => bs.map((b) => b.textContent));
    for (const want of ['Items', 'Party', 'Travel', 'Tools', 'Flags']) assert.ok(names.includes(want), `tab ${want} in ${names}`);
    for (const n of names) {
      await page.click(`.kdev .tabs button:text-is("${n}")`); await sleep(200);
      assert.ok(await page.evaluate(() => document.querySelector('.kdev .body')?.children.length > 0), `tab ${n} renders`);
    }
    await page.click('.kdev .tabs button:text-is("Tools")');
    assert.ok(await page.evaluate(() => /speed/i.test(document.querySelector('.kdev .body').textContent)), 'speed control in Tools');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); server.kill(); }
});

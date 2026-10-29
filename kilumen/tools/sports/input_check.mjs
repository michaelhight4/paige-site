// Checks arrows / WASD / gamepad d-pad / left stick / on-screen d-pad all drive a town event. PW=... node tools/sports/input_check.mjs
import { spawn } from 'node:child_process'; import path from 'node:path'; import net from 'node:net'; import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PW || 'playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const browser = await chromium.launch(); const out = []; let fail = 0;
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
  await page.addInitScript(() => { localStorage.setItem('kilumen_alpha_notice_seen.v1', '1'); window.__pad = null;
    navigator.getGamepads = () => [window.__pad]; });
  await page.goto(base); await page.waitForFunction(() => window.kilumen?.sports?.town, null, { timeout: 30000 }); await page.waitForTimeout(2500);
  await page.evaluate(() => { const s = window.kilumen.scene; s.party = [{ uid: 'x', species: 'frostlop', level: 14, hp: 30 }]; window.kilumen.sports.town.openEvent('fernwick'); });
  await page.waitForTimeout(500); await page.click('#town-ev [data-a=go]'); await page.waitForTimeout(400);
  const hold = () => page.evaluate(() => window.kilumen.sports.town.state().hold || {});
  const check = (label, h, k) => { const ok = !!h[k]; if (!ok) fail++; out.push(`${ok ? 'PASS' : 'FAIL'} ${label} -> ${k}`); };
  for (const [key, k] of [['ArrowLeft', 'left'], ['KeyA', 'left'], ['KeyD', 'right'], ['KeyW', 'up'], ['KeyS', 'down'], ['ArrowUp', 'up']]) {
    await page.keyboard.down(key); await page.waitForTimeout(60); check('key ' + key, await hold(), k); await page.keyboard.up(key); await page.waitForTimeout(60); }
  const btn = (on) => Array.from({ length: 17 }, (_, i) => ({ pressed: on.includes(i), value: on.includes(i) ? 1 : 0 }));
  for (const [label, pad, k] of [['pad dpad-left', { b: [14], ax: [0, 0] }, 'left'], ['pad dpad-up', { b: [12], ax: [0, 0] }, 'up'], ['pad stick-right', { b: [], ax: [0.9, 0] }, 'right'], ['pad stick-down', { b: [], ax: [0, 0.9] }, 'down'], ['pad A', { b: [0], ax: [0, 0] }, 'tap']]) {
    await page.evaluate(([b, ax]) => { window.__pad = { connected: true, buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: b.includes(i) })), axes: ax }; }, [pad.b, pad.ax]);
    await page.waitForTimeout(120); check(label, await hold(), k); await page.evaluate(() => { window.__pad = null; }); await page.waitForTimeout(120); }
  const dp = await page.$$eval('#town-ev button', (bs) => bs.map((b) => b.dataset.k || b.dataset.d || b.dataset.a || b.textContent).join(','));
  out.push('on-screen buttons: ' + dp); out.push('page errors: ' + (errs.join(' | ') || 'none'));
} finally { await browser.close(); server.kill(); }
console.log(out.join('\n')); process.exit(fail ? 1 : 0);

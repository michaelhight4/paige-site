// AGE button must not move or resize while it is clicked repeatedly (the pop animation used to override translateX(-50%) and jump it left).
import { loadPuppeteer } from './_pp.mjs'; import { spawn } from 'node:child_process';
const puppeteer = loadPuppeteer(); const ROOT = new URL('..', import.meta.url).pathname, PORT = 18812;
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 800));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let fails = 0; const errors = [];
const ok = (n, c, i = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : '')); };
for (const [w, hgt] of [[390, 844], [320, 568], [480, 900]]) {
  const page = await browser.newPage(); await page.setViewport({ width: w, height: hgt, isMobile: true, hasTouch: false });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${PORT}/index.html?fresh=1&nosave=1&seed=5&age=30&cash=3000000`); await page.waitForFunction(() => window.__ready === true, { timeout: 20000 }); await sleep(400);
  const rect = () => page.evaluate(() => { const e = document.querySelector('[data-el=age]'), b = e.getBoundingClientRect(); /* layout box (offset*) must be fixed; the pop animation may scale/rotate around the centre, so the visual centre must stay put too */ return [b.left + b.width / 2, b.top + b.height / 2, e.offsetWidth, e.offsetHeight, e.getBoundingClientRect().left - (b.width - e.offsetWidth) / 2 >= -1 ? 0 : 1].map((x) => Math.round(x * 10) / 10); });
  const r0 = await rect(); const samples = [r0];
  const ctr = r0[0];
  ok(`[${w}px] AGE is horizontally centered`, Math.abs(ctr - w / 2) <= 1, `center ${ctr}`);
  for (let i = 0; i < 8; i++) {
    const [x, y] = await rect();
    await page.mouse.click(x, y); // real click at the same spot every time
    for (const d of [10, 60, 120]) { await sleep(d); samples.push(await rect()); } // during the pop animation
    const ov = await page.$('.overlay .opt'); if (ov) { await ov.click(); await sleep(150); }
    if (await page.$('.overlay .btn')) await page.evaluate(() => document.querySelector('.overlay .btn').click());
    await sleep(150); samples.push(await rect());
  }
  const dev = Math.max(...samples.map((s) => Math.max(...s.map((v, k) => Math.abs(v - r0[k])))));
  const anim = await page.evaluate(() => getComputedStyle(document.querySelector('[data-el=age]')).transform);
  ok(`[${w}px] AGE centre and size stay locked over 8 clicks (${samples.length} samples)`, dev <= 0.5, `max deviation ${dev}px, rect ${r0}`);
  ok(`[${w}px] label never changes the button size`, await page.evaluate(() => { const b = document.querySelector('[data-el=age]'); const w0 = b.offsetWidth; b.querySelector('small').textContent = 'Age 100'; const w1 = b.offsetWidth; return w0 === w1; }));
  await page.close();
}
ok('no page errors', errors.length === 0, errors.slice(0, 2).join('|'));
await browser.close(); srv.kill(); console.log(fails ? 'AGE BUTTON FAIL' : 'AGE BUTTON PASS'); process.exit(fails ? 1 : 0);

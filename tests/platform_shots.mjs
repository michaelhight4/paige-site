// Platform profiles (DRAFT): screenshot pc + mobile with the dialogue open at the checklist sizes and measure
// zoom, .dlg-box rect, overlap with the touch buttons, the rotate screen and console errors.
// Usage: node tests/platform_shots.mjs  -> shots/platform_profiles/*.png + report.json (+ contact sheet via python)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'shots/platform_profiles');
fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }

const CASES = [
  ...[[1280, 720], [1920, 1080], [2560, 1440], [1440, 900]].map(([w, h]) => ({ plat: 'pc', w, h, dpr: 1, touch: false })),
  ...[[844, 390], [932, 430], [780, 360], [1024, 768]].map(([w, h]) => ({ plat: 'mobile', w, h, dpr: 2, touch: true })),
  { plat: 'mobile', w: 390, h: 844, dpr: 2, touch: true, portrait: true },
  // checklist phone panels in device px: 2340x1080 and 2400x1080 at dpr 3 (780x360 and 800x360 CSS)
  { plat: 'mobile', w: 780, h: 360, dpr: 3, touch: true, tag: '2340x1080' },
  { plat: 'mobile', w: 800, h: 360, dpr: 3, touch: true, tag: '2400x1080' },
];
const PAGES = ['The path ahead is closed. Mira says the bridge washed out in the storm.', 'Hold the B button to run.'];
const inter = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

const browser = await chromium.launch();
const report = [];
try {
  for (const c of CASES) {
    // No ?platform override: selection must come from the device (pc = fine pointer, mobile = has_touch + is_mobile).
    const ctx = await browser.newContext({ viewport: { width: c.w, height: c.h }, deviceScaleFactor: c.dpr, hasTouch: c.touch, isMobile: c.touch });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(base + '?save=0&timescale=0&hour=12');
    await page.waitForFunction(() => window.kilumen && window.kilumen.scene && window.kilumen.scene.tileset, null, { timeout: 15000 });
    await page.evaluate(() => window.kilumen.ready);
    await page.evaluate((pages) => { window.kilumen.scene.dialog.say(pages, { name: 'Mira' }); }, PAGES);
    await page.waitForTimeout(400);
    const m = await page.evaluate(() => {
      const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { left: Math.round(b.left), top: Math.round(b.top), right: Math.round(b.right), bottom: Math.round(b.bottom), width: Math.round(b.width), height: Math.round(b.height) }; };
      const tp = document.getElementById('touchpad'), rot = document.getElementById('rotate');
      const btns = tp.hidden ? [] : [...tp.querySelectorAll('button')].map((b) => ({ id: b.dataset.dir || b.dataset.btn, rect: r(b) }));
      return {
        platform: window.kilumen.platform?.id, bodyClass: document.body.className, coarse: matchMedia('(pointer: coarse)').matches,
        zoom: window.kilumen.scene.zoom, canvasH: document.getElementById('world').height,
        dlg: r(document.querySelector('.dlg-box')), dlgBottomVar: getComputedStyle(document.body).getPropertyValue('--dlg-bottom').trim(),
        touchShown: !tp.hidden, btns, rotateShown: getComputedStyle(rot).display !== 'none',
      };
    });
    const overlaps = m.btns.filter((b) => inter(b.rect, m.dlg) > 0).map((b) => b.id);
    const offscreen = m.dlg.top < 0 || m.dlg.bottom > c.h;
    const name = `${c.plat}${c.portrait ? '_portrait' : ''}_${c.w}x${c.h}${c.dpr !== 2 && c.plat === 'mobile' ? `_dpr${c.dpr}` : ''}.png`;
    await page.screenshot({ path: path.join(OUT, name) });
    report.push({ ...c, file: name, ...m, overlaps, dlgOffscreen: offscreen, errors });
    console.log(`${name}: platform=${m.platform} zoom=${m.zoom} dlg=${JSON.stringify(m.dlg)} overlaps=[${overlaps}] rotate=${m.rotateShown} errors=${errors.length}`);
    await ctx.close();
  }
  // overrides on a desktop context: ?platform=mobile and ?touch=1 both give mobile; ?platform=pc on a phone gives pc
  for (const [q, opts, want] of [['?platform=mobile', {}, 'mobile'], ['?touch=1', {}, 'mobile'], ['?platform=pc', { hasTouch: true, isMobile: true, deviceScaleFactor: 2 }, 'pc']]) {
    const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, ...opts });
    const page = await ctx.newPage();
    await page.goto(base + q + '&save=0');
    await page.waitForFunction(() => window.kilumen?.platform, null, { timeout: 15000 });
    const got = await page.evaluate(() => ({ id: window.kilumen.platform.id, touch: !document.getElementById('touchpad').hidden, cls: document.body.className }));
    report.push({ override: q, want, ...got });
    console.log(`override ${q}${opts.hasTouch ? ' (touch device)' : ''}: ${got.id} touch=${got.touch} ${got.id === want ? 'OK' : 'WRONG'}`);
    await ctx.close();
  }
} finally {
  await browser.close();
  server.kill();
}
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));

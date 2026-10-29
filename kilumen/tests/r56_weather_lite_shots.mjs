// R5/R6 weather lite shots + perf (real sd battle, .wx between backdrop and sprites). Usage: node tests/r56_weather_lite_shots.mjs. OUT defaults to /workspace/kilumen/shots/r56_weather_lite
// NOTE: headless Chromium on the box (software GL, 4x CPU throttle for phone) is NOT a real phone; it cannot prove 60 fps on device.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path'; import net from 'node:net'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.OUT || '/workspace/kilumen/shots/r56_weather_lite'; fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const CASES = [['coast', 'none'], ['coast', 'rain'], ['coast', 'storm'], ['bog', 'fog'], ['bog', 'none'], ['meadow', 'rain']];
const DEV = [{ plat: 'pc', w: 1920, h: 1080, dpr: 1, touch: false }, { plat: 'phone', w: 780, h: 360, dpr: 3, touch: true }];
const browser = await chromium.launch(); const perf = []; const errors = [];
const measure = (page, ms) => page.evaluate((ms) => new Promise((res) => { const t = []; let last = performance.now(); const end = last + ms; const f = (n) => { t.push(n - last); last = n; if (n < end) requestAnimationFrame(f); else { t.sort((a, b) => a - b); const q = (p) => t[Math.min(t.length - 1, Math.floor(p * t.length))]; res({ fps: +(1000 * t.length / ms).toFixed(1), p50: +q(0.5).toFixed(1), p95: +q(0.95).toFixed(1) }); } }; requestAnimationFrame(f); }), ms);
try {
  for (const d of DEV) {
    const ctx = await browser.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: d.dpr, hasTouch: d.touch, isMobile: d.touch });
    await ctx.addInitScript(() => { try { localStorage.setItem('kilumen_alpha_notice_seen.v1', '1'); } catch {} });
    const page = await ctx.newPage(); page.on('pageerror', (e) => errors.push(`${d.plat}: ${e}`));
    const cdp = d.touch ? await ctx.newCDPSession(page) : null;
    await page.goto(base); await page.waitForFunction(() => window.kilumen?.ui?.sdReady, null, { timeout: 30000 });
    // the ALPHA build strips URL flags (src/alpha.js), so the battle is opened from the page: ui.q carries ?phase= for ui_sd.js
    for (const [b, wx] of CASES) {
      await page.evaluate(async ([b, wx]) => { const u = window.kilumen.ui; await u.sdReady; u.closeAll(); u.q = new URLSearchParams(`phase=day&wx=${wx}`); u.open('battle', { biome: b }); }, [b, wx]);
      await page.waitForTimeout(2500);
      const info = await page.evaluate(() => { const r = document.querySelector('.ui-battle'), kids = [...(r?.children || [])].map((e) => e.className.split(' ')[0]); const w = r?.querySelector('.wx'); return { order: kids.slice(0, 3).join('>'), wx: w?.className || null }; });
      if (wx === 'storm') { // freeze one flash for the shot (JS timer would fire 6-14 s later)
        await page.evaluate(() => { const f = document.querySelector('.wx-flash'); if (f) f.style.opacity = '0.55'; }); await page.waitForTimeout(100);
        await page.screenshot({ path: path.join(OUT, `${d.plat}_${b}_storm_flash.png`) });
        await page.evaluate(() => { const f = document.querySelector('.wx-flash'); if (f) f.style.opacity = '0'; }); await page.waitForTimeout(100);
      }
      await page.screenshot({ path: path.join(OUT, `${d.plat}_${b}_${wx}.png`) });
      if (cdp) { await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); await page.waitForTimeout(300); perf.push({ plat: d.plat, biome: b, wx, throttle: '4x', ...info, ...(await measure(page, 5000)) }); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); }
      else perf.push({ plat: d.plat, biome: b, wx, throttle: '1x', ...info, ...(await measure(page, 4000)) });
    }
    await ctx.close();
  }
} finally { await browser.close(); server.kill(); }
fs.writeFileSync(path.join(OUT, 'perf.json'), JSON.stringify({ perf, errors }, null, 1));
console.table(perf); console.log('errors', errors.length, errors.slice(0, 5));

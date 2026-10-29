// R5/R6 art wiring shots + phone perf. Usage: node tests/r56_art_shots.mjs (needs playwright). OUT defaults to /workspace/kilumen/shots/r56_art_wired
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path'; import net from 'node:net'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.OUT || '/workspace/kilumen/shots/r56_art_wired'; fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const BIOMES = ['bog', 'bog_deep', 'causeway', 'coast', 'hall_mirefen', 'hall_tidewater', 'lab_mirefen', 'lab_seacave', 'meadow', 'reef_surf', 'sea_cave'];
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
    for (const b of ['none', ...BIOMES]) for (const ph of (b === 'none' ? ['day'] : ['day', ...(d.touch ? [] : ['night'])])) {
      await page.evaluate(async ([b, ph]) => { const u = window.kilumen.ui; await u.sdReady; u.closeAll(); u.q = new URLSearchParams(`phase=${ph}`); u.open('battle', b === 'none' ? {} : { biome: b }); }, [b, ph]);
      await page.waitForTimeout(2500);
      await page.screenshot({ path: path.join(OUT, `${d.plat}_${b}_${ph}.png`) });
      if (cdp) { await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); await page.waitForTimeout(300); perf.push({ plat: d.plat, biome: b, phase: ph, throttle: '4x', ...(await measure(page, 3000)) }); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); }
      else perf.push({ plat: d.plat, biome: b, phase: ph, throttle: '1x', ...(await measure(page, 2000)) });
    }
    await ctx.close();
  }
} finally { await browser.close(); server.kill(); }
fs.writeFileSync(path.join(OUT, 'perf.json'), JSON.stringify({ perf, errors }, null, 1));
console.table(perf); console.log('errors', errors.length, errors.slice(0, 5));

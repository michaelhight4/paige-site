// Fruit feeds UI shots (PC 1920x1080 + phone 2340x1080 landscape). Usage: node tests/feeds_shots.mjs  (needs playwright)
// OUT defaults to /workspace/kilumen/shots/feeds_v1. Runs with ?feeds=1&feedskit=1 (the flag is off by default).
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path'; import net from 'node:net'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.OUT || '/workspace/kilumen/shots/feeds_v1'; fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const DEV = [{ plat: 'pc', w: 1920, h: 1080, dpr: 1, touch: false }, { plat: 'phone', w: 780, h: 360, dpr: 3, touch: true }];
const browser = await chromium.launch(); const report = [];
try {
  for (const d of DEV) {
    const ctx = await browser.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: d.dpr, hasTouch: d.touch, isMobile: d.touch });
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
    await page.addInitScript(() => { try { localStorage.setItem('kilumen_alpha_notice_seen.v1', '1'); } catch {} globalThis.KILUMEN_FEEDS = true; globalThis.KILUMEN_FEEDS_KIT = true; });
    await page.goto(base);
    await page.waitForFunction(() => window.kilumen?.ui, null, { timeout: 30000 });
    for (let i = 0; i < 40; i++) { const busy = await page.evaluate(() => { const s = window.kilumen.scene; return !!(s.dialog?.active || s.busy || s.fade || window.kilumen.ui?.active); }); if (!busy && i > 3) break; await page.keyboard.press(i % 2 ? 'f' : 'Enter'); await page.waitForTimeout(500); }
    await page.waitForFunction(() => window.kilumen?.feeds && window.kilumen.ui, null, { timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.evaluate(() => { const s = window.kilumen.scene; s.party = [{ uid: 'shot-a', species: 'rillop', level: 12, hp: 30 }, { uid: 'shot-b', species: 'tumbloam', level: 9, hp: 25 }, ...(s.party || [])].slice(0, 6);
    });
    const shot = async (name) => { const f = path.join(OUT, `${d.plat}_${name}.png`); await page.screenshot({ path: f }); report.push(f); };
    await page.waitForTimeout(400); await shot('0_button');
    const blockedState = await page.evaluate(() => JSON.stringify({ dlg: !!window.kilumen.scene.dialog?.active, busy: !!window.kilumen.scene.busy, ui: !!window.kilumen.ui?.active })); report.push(d.plat + ' state ' + blockedState);
    await page.evaluate(() => window.kilumen.feeds.open('feed'));
    await page.evaluate(() => window.kilumen.feeds.select(0, 'dashfig')); await page.waitForTimeout(300); await shot('1_preview');
    await page.evaluate(() => window.kilumen.feeds.feedFor(0, 'dashfig')); await page.waitForTimeout(250); await shot('2_reaction');
    await page.evaluate(() => window.kilumen.feeds.select(1, 'saltlime')); await page.waitForTimeout(200); await shot('3_misfit');
    await page.evaluate(() => { const k = window.kilumen.feeds; for (let i = 0; i < 6; i++) k.feedFor(1, 'rumblemelon'); k.select(1, 'embergourd'); }); await page.waitForTimeout(200); await shot('4_full');
    await page.evaluate(() => { const k = window.kilumen.feeds; k.close(); k.open('grow'); document.querySelector('[data-plant^="0:"]')?.click(); document.querySelector('[data-plant^="1:"]')?.click(); }); await page.waitForTimeout(300); await shot('5_grow');
    report.push(`${d.plat} errors: ${JSON.stringify(errors)}`);
    await ctx.close();
  }
} finally { await browser.close(); server.kill(); }
console.log(report.join('\n'));

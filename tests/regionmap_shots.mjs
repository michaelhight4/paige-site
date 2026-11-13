// Region map cleanup (Oct 23, 2026): phone Map screen shots with the current marker on several towns + axe check.
// Usage: node tests/regionmap_shots.mjs <before|after> -> shots/regionmap_cleanup/<tag>/*.png + report.json (dev only)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TAG = process.argv[2] || 'after';
const OUT = path.join(ROOT, 'shots/regionmap_cleanup', TAG);
fs.mkdirSync(OUT, { recursive: true });
const AXE = path.join(ROOT, 'tools/free_tools/node_modules/axe-core/axe.min.js');
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PROFILES = [{ plat: 'pc', w: 1920, h: 1080, dpr: 1, touch: false }, { plat: 'phone', w: 844, h: 390, dpr: 2, touch: true }];
const TOWNS = ['brookhollow', 'fernwick', 'saltmere', 'aurelith', 'revival_heights', 'sunmeadow_fields'];
const COMMON = 'save=0&timescale=0&hour=12&audio=0&lead=rillop&ov=regionmap';
const report = { tag: TAG, shots: [], axe: [], errors: [] };
const browser = await chromium.launch();
try {
  for (const p of PROFILES) {
    const ctx = await browser.newContext({ viewport: { width: p.w, height: p.h }, deviceScaleFactor: p.dpr, hasTouch: p.touch, isMobile: p.touch });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => report.errors.push(`${p.plat}: ${e.message}`));
    await page.goto(`${base}?${COMMON}&map=brookhollow&x=6&y=20&platform=${p.plat}`);
    await page.waitForFunction(() => window.kilumen?.scene?.map && window.kilumen?.ui, null, { timeout: 30000 });
    await sleep(1500);
    for (const town of TOWNS) {
      await page.evaluate((town) => {
        const k = window.kilumen, s = k.scene; s.zone = () => town; // current place for the shot (towns without a built map too)
        k.ui.closeAll?.(); k.ui.open('map');
      }, town);
      await sleep(600);
      const f = path.join(OUT, `${p.plat}_${town}.png`);
      await page.screenshot({ path: f });
      report.shots.push(path.relative(ROOT, f));
      if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ path: AXE });
      const v = await page.evaluate(async () => (await window.axe.run('.ui-root')).violations.map((x) => `${x.id}(${x.impact}) x${x.nodes.length}: ${x.nodes[0]?.target.join(' ')}`));
      report.axe.push({ plat: p.plat, town, violations: v });
    }
    await ctx.close();
  }
} finally { await browser.close(); server.kill(); }
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
console.log(JSON.stringify({ shots: report.shots.length, axe: report.axe.map((a) => `${a.plat}/${a.town}: ${a.violations.length}`), errors: report.errors }, null, 1));

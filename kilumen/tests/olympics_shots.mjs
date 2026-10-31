// Olympics shots (PC 1280x800 + phone 844x390 touch). Usage: OUT=/workspace/shots/olympics_v1 node tests/olympics_shots.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path'; import net from 'node:net'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.OUT || path.join(ROOT, 'shots/olympics_v1'); fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const DEV = [{ plat: 'pc', w: 1280, h: 800, dpr: 1, touch: false }, { plat: 'phone', w: 844, h: 390, dpr: 2, touch: true }];
const browser = await chromium.launch(); const report = [];
try {
  for (const d of DEV) {
    const ctx = await browser.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: d.dpr, hasTouch: d.touch, isMobile: d.touch });
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
    await page.addInitScript(() => { try { localStorage.setItem('kilumen_alpha_notice_seen.v1', '1'); } catch {} });
    await page.goto(`${base}?save=0&hour=12`);
    await page.waitForFunction(() => window.kilumen?.scene?.tileset && window.kilumen?.sports?.town?.oly, null, { timeout: 30000 });
    await page.waitForTimeout(1500);
    const tap = async (sel) => { if (d.touch) await page.tap(sel); else await page.click(sel); };
    const shot = async (n) => { const f = path.join(OUT, `${d.plat}_${n}.png`); await page.screenshot({ path: f }); report.push(f); };
    await page.evaluate(async () => { const s = window.kilumen.scene; const A = await import('/src/sports/athletics.js?v=v0.2.105-alpha'); s.dialog?.close?.();
      const sp = ['capling', 'brimtoad', 'frondlet', 'glintmoth']; s.party = sp.map((x, i) => ({ species: x, nickname: ['Pip', 'Moss', 'Fern', 'Glim'][i], level: 60, hp: 50, uid: 'shot' + i }));
      for (const c of s.party) { const a = A.ensureAthletics(c); for (const k in a.q) a.q[k] = 0.97; } // staged strong team so the champion screen shows
      s.flags.add('beat_master_fernwick'); window.kilumen.sports.town.openOlympics('fernwick'); });
    await page.waitForSelector('#town-ev.oly .ev'); await tap('#town-ev.oly .ev[data-e="1"]'); await tap('#town-ev.oly .kl button[data-k="3"]');
    await page.waitForTimeout(500); await shot('1_assign');
    await tap('[data-a=go]'); await page.waitForTimeout(2200); await shot('2_event');
    await tap('[data-a=r]'); await page.waitForTimeout(300); await shot('3_results');
    await tap('[data-a=n]'); await page.waitForTimeout(2000); await tap('[data-a=r]'); await tap('[data-a=n]'); await page.waitForTimeout(2000); await tap('[data-a=r]'); await tap('[data-a=n]');
    await page.waitForTimeout(400); await shot('4_final');
    const place = await page.evaluate(() => window.kilumen.sports.town.oly.state().result?.place); report.push(d.plat + ' place ' + place);
    if (place === 1) { await tap('[data-a=n]'); await page.waitForTimeout(500); await shot('5_champion'); }
    report.push(d.plat + ' errors: ' + JSON.stringify(errors.slice(0, 3)));
    await ctx.close();
  }
} finally { await browser.close(); server.kill(); }
console.log(report.join('\n'));

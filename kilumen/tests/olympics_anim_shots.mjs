// Olympics animation shots: every event mid-frame on PC, some on phone, a frame strip. OUT=/workspace/shots/olympics_v2 node tests/olympics_anim_shots.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path'; import net from 'node:net'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.OUT || path.join(ROOT, 'shots/olympics_v2'); fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const VEN = ['fernwick', 'saltmere', 'revival_heights', 'frostspire', 'lanternport', 'cindervale'];
const DEV = [{ plat: 'pc', w: 1280, h: 800, dpr: 1, touch: false, ven: VEN }, { plat: 'phone', w: 844, h: 390, dpr: 2, touch: true, ven: ['fernwick', 'frostspire', 'lanternport'] }];
const MID = { hop: 0.55, sprint: 0.5, archery: 0.62, haul: 0.5, swim: 0.5, relay: 0.55, hurdles: 0.5, slide: 0.5, marathon: 0.5, lift: 0.62, catch: 0.55, push: 0.5 };
const browser = await chromium.launch(); const report = []; const done = new Set();
try {
  for (const d of DEV) {
    const ctx = await browser.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: d.dpr, hasTouch: d.touch, isMobile: d.touch });
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
    await page.addInitScript(() => { try { localStorage.setItem('kilumen_alpha_notice_seen.v1', '1'); } catch {} });
    await page.goto(`${base}?save=0&hour=12`);
    await page.waitForFunction(() => window.kilumen?.scene?.tileset && window.kilumen?.sports?.town?.oly, null, { timeout: 30000 });
    await page.waitForTimeout(1500);
    const tap = async (sel) => { if (d.touch) await page.tap(sel); else await page.click(sel); };
    for (const v of d.ven) {
      await page.evaluate(async (v) => { const s = window.kilumen.scene; const O = await import('/src/sports/olympics.js?v=v0.2.106-alpha'); s.dialog?.close?.();
        const sp = ['capling', 'brimtoad', 'frondlet', 'glintmoth']; s.party = sp.map((x, i) => ({ species: x, nickname: ['Pip', 'Moss', 'Fern', 'Glim'][i], level: 30, hp: 50, uid: 'shot' + i }));
        for (const f of O.doorFlags(v)) s.flags.add(f); window.kilumen.sports.town.openOlympics(v); }, v);
      await page.waitForSelector('#town-ev.oly .ev'); await tap('[data-a=go]');
      for (let e = 0; e < 3; e++) {
        await page.waitForSelector('#town-ev.oly canvas.lanes'); await page.waitForTimeout(400);
        const { id, end, first } = await page.evaluate(() => { const p = window.kilumen.sports.town.oly.state().plan; return { id: p.id, end: p.end, first: p.first }; });
        if (!done.has(d.plat + id)) {
          done.add(d.plat + id);
          await page.evaluate((t) => window.kilumen.sports.town.oly._seek(t), first * MID[id] / 0.6 * 0.6 + 0.0001); await page.waitForTimeout(80);
          const f = path.join(OUT, `${d.plat}_${id}.png`); await page.screenshot({ path: f }); report.push(f);
          if (d.plat === 'pc') { const cv = await page.$('#town-ev.oly canvas.lanes'); fs.mkdirSync(path.join(OUT, 'strip'), { recursive: true });
            for (let k = 0; k < 6; k++) { await page.evaluate((t) => window.kilumen.sports.town.oly._seek(t), (end * (k + 0.5)) / 6); await cv.screenshot({ path: path.join(OUT, 'strip', `${id}_${k}.png`) }); }
            await page.evaluate((t) => window.kilumen.sports.town.oly._seek(t), end); await cv.screenshot({ path: path.join(OUT, 'strip', `${id}_end.png`) }); }
        }
        await page.evaluate(() => document.querySelector('#town-ev.oly canvas.lanes').click());
        await page.waitForSelector('[data-a=r]:not([disabled])', { timeout: 5000 }); await tap('[data-a=r]'); await page.waitForSelector('#oly-board');
        if (e === 0 && v === d.ven[0]) { const f = path.join(OUT, `${d.plat}_results.png`); await page.screenshot({ path: f }); report.push(f); }
        await tap('[data-a=n]');
      }
      await page.waitForTimeout(200); await tap('[data-a=n]').catch(() => {}); await page.waitForTimeout(200);
      if (await page.$('#oly-champ')) await tap('[data-a=x]'); await page.waitForTimeout(200);
    }
    report.push(d.plat + ' errors: ' + JSON.stringify(errors.slice(0, 5)));
    await ctx.close();
  }
} finally { await browser.close(); server.kill(); }
console.log(report.join('\n'));

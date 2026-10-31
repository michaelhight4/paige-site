// Wellspire playtest fixes v1 shots (Coder, Oct 30 2026). Usage: node tests/wellspire_fix_shots.mjs
// -> /workspace/kilumen/shots/wellspire_fix_v1/<plat>_<tag>.png (OUT=... to override; ONLY=tag1,tag2; PLATS=pc)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.OUT || path.join(ROOT, 'shots/wellspire_fix_v1');
fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let PROFILES = [{ plat: 'pc', w: 1280, h: 720, dpr: 1, touch: false }, { plat: 'phone', w: 844, h: 390, dpr: 2, touch: true }];
if (process.env.PLATS) PROFILES = PROFILES.filter((p) => process.env.PLATS.split(',').includes(p.plat));
// [tag, map, x, y, facing, js run after arriving (s = scene, page keys after), wait ms, presses of f]
const VIEWS = (await import('./wellspire_fix_views.mjs')).VIEWS;
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null; const RUN = ONLY ? VIEWS.filter((v) => ONLY.some((o) => v[0].startsWith(o))) : VIEWS;
const browser = await chromium.launch(); const report = [];
try {
  for (const p of PROFILES) {
    const ctx = await browser.newContext({ viewport: { width: p.w, height: p.h }, deviceScaleFactor: p.dpr, hasTouch: p.touch, isMobile: p.touch });
    const page = await ctx.newPage(); await page.addInitScript(() => { try { localStorage.setItem('kilumen_alpha_notice_seen.v1', '1'); } catch {} });
    const errors = [], shots = []; page.on('pageerror', (e) => errors.push(String(e)));
    try {
      await page.goto(`${base}?save=0&timescale=0&hour=12&audio=0&enc=0&lead=${process.env.LEAD || "nibbin"}&dev=1`);
      await page.waitForFunction(() => window.kilumen?.ready || window.kilumen?.ui, null, { timeout: 20000 });
      await page.evaluate(() => Promise.race([window.kilumen.ready, new Promise((r) => setTimeout(r, 15000))]));
      await sleep(1200); await page.evaluate(() => { try { kilumen.ui?.closeAll?.(); } catch {} });
      for (let i = 0; i < 8; i++) { await page.keyboard.press('f'); await sleep(300); }
      await page.evaluate(async () => { const s = kilumen.scene; const C = await import('/src/systems/creature.js?v=v0.2.XXX-alpha');
        for (const sp of ['sunderhoof', 'seraphawk']) s.systems.party.add(C.createCreature({ species: sp, level: 66 })); });
      for (const [tag, map, x, y, facing, js, ms, presses] of RUN) {
        for (let i = 0; i < 30 && await page.evaluate(() => kilumen.scene.busy); i++) { await page.keyboard.press('Escape'); await page.keyboard.press('f'); await sleep(250); }
        await page.evaluate(() => { try { kilumen.ui?.closeAll?.(); } catch {} document.querySelectorAll('.credits, #credits, .kl-credits').forEach((e) => e.remove()); });
        if (map) {
          await page.evaluate(([map, x, y, facing]) => { const s = kilumen.scene; s.fade = null; s.busy = false; s.player.locked = false; s.startWarp({ map, x, y, facing }, 'door'); }, [map, x, y, facing]);
          await sleep(2300);
          const on = await page.evaluate(() => kilumen.scene.map.name); if (on !== map) errors.push(`${tag} on ${on}`);
        }
        let note = null;
        if (js) note = await page.evaluate((code) => new Function('s', `return (async () => { ${code} })()`)(kilumen.scene), js).catch((e) => 'ERR ' + e.message);
        await sleep(ms || 600);
        for (let i = 0; i < (presses || 0); i++) { await page.keyboard.press('f'); await sleep(900); }
        const fn = `${p.plat}_${tag}.png`; await page.screenshot({ path: path.join(OUT, fn) }); shots.push(fn);
        if (note != null) console.log(p.plat, tag, JSON.stringify(note).slice(0, 400));
      }
    } catch (e) { errors.push('runner: ' + e.message); }
    await ctx.close(); report.push({ plat: p.plat, errors, shots });
    console.log(p.plat, shots.length, errors.length ? 'ERRORS ' + errors.join(' | ').slice(0, 800) : 'ok');
  }
} finally { await browser.close(); server.kill(); }
fs.writeFileSync(path.join(OUT, ONLY ? 'report_partial.json' : 'report.json'), JSON.stringify(report, null, 1));

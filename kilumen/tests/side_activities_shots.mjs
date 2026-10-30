// Side activities + world fill shots (Coder, Oct 30 2026, DRAFT for Gary; NOT published). PC + phone.
// Usage: node tests/side_activities_shots.mjs [views.json] -> shots/side_activities_v1/<plat>_<tag>.png (+ report.json).
// A view is [tag, map, standX, standY, facing, flags, act]; act: 'f' = press interact (real stand + face check),
// 'f2' = interact twice, 'eval:<js>' = run code with s = scene, null = just look.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.OUT || path.join(ROOT, 'shots/side_activities_v1');
fs.mkdirSync(OUT, { recursive: true });
const VIEWS = JSON.parse(fs.readFileSync(process.argv[2] || path.join(ROOT, 'tools/side_activities/views.json'), 'utf8'));
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let PROFILES = [{ plat: 'pc', w: 1280, h: 720, dpr: 1, touch: false }, { plat: 'phone', w: 844, h: 390, dpr: 2, touch: true }];
if (process.env.PLATS) PROFILES = PROFILES.filter((p) => process.env.PLATS.split(',').includes(p.plat));
const browser = await chromium.launch(); const report = [];
try {
  for (const p of PROFILES) {
    const ctx = await browser.newContext({ viewport: { width: p.w, height: p.h }, deviceScaleFactor: p.dpr, hasTouch: p.touch, isMobile: p.touch });
    const page = await ctx.newPage(); await page.addInitScript(() => { try { localStorage.setItem('kilumen_alpha_notice_seen.v1', '1'); } catch {} });
    const errors = [], shots = []; page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error' && !/playtime\.js|icon_f0|icon_f1/.test((m.location()?.url || '') + m.text())) errors.push(m.text()); });
    try {
      await page.goto(`${base}?save=0&timescale=0&hour=${process.env.HOUR || 12}&audio=0&enc=0&lead=nibbin`);
      await page.waitForFunction(() => window.kilumen?.ready || window.kilumen?.ui, null, { timeout: 15000 });
      await page.evaluate(() => Promise.race([window.kilumen.ready, new Promise((r) => setTimeout(r, 15000))]).then(() => window.kilumen.ui?.sdReady));
      await sleep(1200); await page.evaluate(() => { try { kilumen.ui?.closeAll?.(); } catch {} });
      for (let i = 0; i < 8; i++) { await page.keyboard.press('f'); await sleep(300); }
      for (let i = 0; i < 40 && !(await page.evaluate(() => !!kilumen.region9 && !!kilumen.side)); i++) await sleep(250);
      for (const [tag, map, x, y, facing, fl, act] of VIEWS) {
        for (let i = 0; i < 30 && await page.evaluate(() => kilumen.scene.busy); i++) { await page.keyboard.press('f'); await sleep(250); }
        await page.evaluate(([map, x, y, facing, fl]) => { const s = kilumen.scene; for (const f of fl || []) s.setFlag(f); s.fade = null; s.busy = false; s.player.locked = false; s.startWarp({ map, x, y, facing }, 'door'); }, [map, x, y, facing, fl]);
        await sleep(2300);
        const on = await page.evaluate(() => kilumen.scene.map.name); if (on !== map) errors.push(`${tag} on ${on}`);
        if (act === 'f' || act === 'f2') { await page.keyboard.press('f'); await sleep(900); if (act === 'f2') { for (let i = 0; i < 6; i++) { await page.keyboard.press('f'); await sleep(250); } await page.keyboard.press('f'); await sleep(900); } }
        else if (act?.startsWith('eval:')) { await page.evaluate((code) => { const s = kilumen.scene; (0, eval)('(s)=>{' + code + '}')(s); }, act.slice(5)); await sleep(+(process.env.EVAL_WAIT || 1500)); }
        const fn = `${p.plat}_${tag}.png`; await page.screenshot({ path: path.join(OUT, fn) }); shots.push(fn);
        await page.evaluate(() => { try { kilumen.side?.close?.(); } catch {} });
      }
    } catch (e) { errors.push('runner: ' + e.message); }
    await ctx.close(); report.push({ plat: p.plat, errors, shots });
    console.log(p.plat, shots.length, errors.length ? 'ERRORS ' + errors.join(' | ').slice(0, 500) : 'ok');
  }
} finally { await browser.close(); server.kill(); }
fs.writeFileSync(path.join(OUT, path.basename(process.argv[2] || 'views', '.json') + '_report.json'), JSON.stringify(report, null, 1));

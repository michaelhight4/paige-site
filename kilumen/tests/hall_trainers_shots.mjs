// Jestrix line (Oct 29 2026): in-game PC + phone shots: battle front/back, overworld walk (lead follower), Kilindex, evolution.
// Usage: node tests/jestrix_line_shots.mjs -> shots/hall_trainers_v1/*.png + report.json (contact sheet: separate step)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.OUT || path.join(ROOT, 'shots/hall_trainers_v1');
fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PROFILES = [{ plat: 'pc', w: 1280, h: 720, dpr: 1, touch: false }, { plat: 'phone', w: 844, h: 390, dpr: 2, touch: true }];
const COMMON = 'save=0&timescale=0&hour=12&audio=0&enc=0';
// the alpha build drops ?map= flags, so the hall is entered through the scene's own warp
const warp = async (page, map, x, y) => { for (let i = 0; i < 8; i++) { await page.keyboard.press('f'); await sleep(400); } await page.evaluate(() => { const s = kilumen.scene; s.fade = null; s.player.locked = false; }); await page.evaluate(([map, x, y]) => kilumen.scene.startWarp({ map, x, y, facing: 'up' }, 'door'), [map, x, y]); await sleep(2500); };
const HALLS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/masters.json'), 'utf8')).halls;
const SCENES = HALLS.flatMap((h) => {
  const m = JSON.parse(fs.readFileSync(path.join(ROOT, `art/world/overworld/maps/${h.hall_map}.json`), 'utf8'));
  const door = m.warps[0]; const sx = door.x, sy = door.y - 1;
  const nu = m.npcs.filter((n) => n.hall_trainers_v1);
  const t = nu[nu.length - 1]; const [cx, cy] = t.sight_cells[t.sight_cells.length - 1];
  return [
    { id: `${h.hall_map}_lobby`, q: `map=${h.hall_map}&x=${sx}&y=${sy}&facing=up&lead=nibbin`, run: async (page, shot) => { await warp(page, h.hall_map, sx, sy); await sleep(1500); await shot(''); } },
    { id: `${h.hall_map}_sight_${t.id}`, q: `map=${h.hall_map}&x=${cx}&y=${cy}&facing=up&lead=nibbin`, run: async (page, shot) => {
      await warp(page, h.hall_map, cx, cy); await sleep(800); await page.keyboard.press('ArrowDown'); await sleep(300); await page.keyboard.press('ArrowUp'); await sleep(2200); await shot('spotted');
      for (let i = 0; i < 4; i++) { await page.keyboard.press('Enter'); await sleep(700); }
      await sleep(2500); await shot('battle');
    } },
  ];
});

const browser = await chromium.launch();
const report = [];
try {
  const ONLY = process.env.ONLY?.split(',');
  for (const p of PROFILES.filter((q) => !process.env.PLAT || q.plat === process.env.PLAT)) for (const sc of SCENES.filter((s) => !ONLY || ONLY.some((o) => s.id.startsWith(o)))) {
    const ctx = await browser.newContext({ viewport: { width: p.w, height: p.h }, deviceScaleFactor: p.dpr, hasTouch: p.touch, isMobile: p.touch });
    const page = await ctx.newPage();
    await page.addInitScript(() => { try { localStorage.setItem('kilumen_alpha_notice_seen.v1', '1'); } catch {} });
    const errors = [], missing = [];
    page.on('console', (m) => { if (m.type() === 'error' && !/playtime\.js|icon_f0|icon_f1/.test((m.location()?.url || '') + m.text())) errors.push(m.text() + ' ' + (m.location()?.url || '')); });
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('response', (r) => { if (r.status() >= 400 && /hall_int|tr_gymtrainer/.test(r.url())) missing.push(r.url() + ' ' + r.status()); });
    const shots = [];
    const shot = async (tag) => { const f = `${p.plat}_${sc.id}${tag ? '_' + tag : ''}.png`; await page.screenshot({ path: path.join(OUT, f) }); shots.push(f); };
    try {
      await page.goto(`${base}?${COMMON}&${sc.q}`);
      await page.waitForFunction(() => window.kilumen?.ready || window.kilumen?.ui, null, { timeout: 15000 });
      await page.evaluate(() => Promise.race([window.kilumen.ready, new Promise((r) => setTimeout(r, 15000))]).then(() => window.kilumen.ui?.sdReady));
      await sleep(1200);
      if (!sc.noClose) { await page.evaluate(() => { try { kilumen.ui?.closeAll?.(); } catch {} }); await page.locator('canvas').first().click({ position: { x: 5, y: 5 } }).catch(() => {}); await sleep(300); }
      await sc.run(page, shot);
      if (!shots.length) await shot('');
    } catch (e) { errors.push('runner: ' + e.message); try { await shot('fail'); } catch {} }
    report.push({ plat: p.plat, scene: sc.id, errors, missing, shots });
    console.log(p.plat, sc.id, errors.length || missing.length ? 'ERRORS ' + [...errors, ...missing].join(' | ').slice(0, 400) : 'ok');
    await ctx.close();
  }
} finally { await browser.close(); server.kill(); }
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));

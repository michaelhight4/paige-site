// r78 wiring shots (Oct 29 2026, DRAFT for Gary): the 14 r78 Kilu in battle (foe front; lead back via ?lead=),
// PC. Usage: node tests/r78_wire_shots.mjs -> shots/regions_5_8_v1/r78_wire/battle_<id>.png
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.OUT || path.join(ROOT, 'shots/regions_5_8_v1/r78_wire');
fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const R78 = ['chimelet', 'glyphmage', 'mantleox', 'mirejaw', 'peakbrute', 'reapmantis', 'reedcrane', 'rimewyrm', 'seraphawk', 'shardhart', 'snowroller', 'spirewing', 'sunbasilisk', 'sunderhoof'];
const BIOME = { mirejaw: 'water', rimewyrm: 'water', mantleox: 'cave', snowroller: 'cave' };
const browser = await chromium.launch(); const report = [];
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage(); await page.addInitScript(() => { try { localStorage.setItem('kilumen_alpha_notice_seen.v1', '1'); } catch {} });
  const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  for (let i = 0; i < R78.length; i++) {
    const foe = R78[i], lead = R78[(i + 7) % R78.length];
    await page.goto(`${base}?save=0&timescale=0&hour=12&audio=0&enc=0&lead=${lead}`);
    await page.waitForFunction(() => window.kilumen?.ready || window.kilumen?.ui, null, { timeout: 15000 });
    await page.evaluate(() => Promise.race([window.kilumen.ready, new Promise((r) => setTimeout(r, 15000))]).then(() => window.kilumen.ui?.sdReady));
    await sleep(800);
    const got = await page.evaluate(async ([foe, lead, biome]) => {
      const u = window.kilumen.ui, s = window.kilumen.scene; await u.sdReady; u.closeAll();
      const p0 = s.systems?.party?.list?.[0]; if (p0 && p0.species !== lead) { p0.species = lead; }
      u.open('battle', { foe, foeLevel: 66, biome }); return p0?.species;
    }, [foe, lead, BIOME[foe] || 'grass']);
    await sleep(2600);
    const fn = `battle_${foe}.png`; await page.screenshot({ path: path.join(OUT, fn) }); report.push({ foe, lead: got, fn });
  }
  report.push({ errors });
  console.log(report.length - 1, 'shots', errors.length ? 'ERRORS ' + errors.join(' | ').slice(0, 400) : 'ok');
  await ctx.close();
} finally { await browser.close(); server.kill(); }
fs.writeFileSync(path.join(OUT, 'report_battle.json'), JSON.stringify(report, null, 1));

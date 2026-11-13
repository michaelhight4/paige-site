// Phone "squished until I re-rotated" check (Gary, Oct 23, 2026 9:50 AM CT, iPhone, live alpha).
// The viewport changes WHILE the game loads (iOS Safari URL bar collapsing / expanding, a portrait start then rotating).
// Measures the canvas backing store vs its CSS box: any aspect mismatch = non-uniform stretch.
// Usage: TAG=before|after TARGET=dev|live node tests/phone_squish_check.mjs -> shots/phone_menu_fix/squish_<tag>/*.png + report.json
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TAG = process.env.TAG || 'after', TARGET = process.env.TARGET || 'dev';
const OUT = path.join(ROOT, 'shots/phone_menu_fix', `squish_${TAG}`); fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = TARGET === 'live' ? 'https://paigegames.net/kilumen/' : `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50 && TARGET !== 'live'; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const Q = '?save=0&title=0&skipintro=1&map=brookhollow&x=5&y=8&facing=down&audio=0';
// iPhone 12-15 (390x844 portrait) and Pro Max (430x932): landscape with Safari's bars shown vs hidden (CSS px)
const CASES = [
  { tag: '844_bars_to_full', from: [844, 293], to: [844, 390] },   // URL bar collapses during load
  { tag: '844_full_to_bars', from: [844, 390], to: [844, 293] },   // bars come back during load
  { tag: '844_portrait_to_land', from: [390, 664], to: [844, 293] }, // load held upright, then rotated
  { tag: '932_bars_to_full', from: [932, 333], to: [932, 430] },
  { tag: '932_portrait_to_land', from: [430, 740], to: [932, 333] },
  { tag: '844_steady', from: [844, 390], to: null },
];
const browser = await chromium.launch();
const report = [];
try {
  for (const c of CASES.filter((k) => !process.env.CASE || k.tag === process.env.CASE)) {
    const ctx = await browser.newContext({ viewport: { width: c.from[0], height: c.from[1] }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
    const page = await ctx.newPage(); const errors = [];
    // TAG=before on dev: serve the pre-fix overworld.js from the backup so before/after run the same build otherwise
    if (TAG === 'before' && TARGET === 'dev') await page.route('**/src/overworld/overworld.js*', (r) => r.fulfill({ path: path.join(ROOT, 'backups/coder_phone_menu_20261023/squish_pre_edit_0951/src/overworld/overworld.js'), contentType: 'text/javascript' }));
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(base + Q, { waitUntil: 'commit' });
    // change the viewport as soon as the canvas has its first size (the game is still loading maps / art)
    await page.waitForFunction(() => document.getElementById('world')?.width > 300, null, { timeout: 30000, polling: 20 });
    const early = await page.evaluate(() => !!window.kilumen?.ready);
    if (c.to) { await page.waitForTimeout(150); await page.setViewportSize({ width: c.to[0], height: c.to[1] }); }
    await page.waitForFunction(() => window.kilumen?.scene?.tileset, null, { timeout: 30000 });
    await page.evaluate(() => window.kilumen.ready);
    await page.waitForTimeout(1500);
    const m = await page.evaluate(() => {
      const cv = document.getElementById('world'), r = cv.getBoundingClientRect(), dpr = devicePixelRatio;
      return { inner: [innerWidth, innerHeight], css: [+r.width.toFixed(1), +r.height.toFixed(1)], backing: [cv.width, cv.height], dpr, zoom: window.kilumen.scene.zoom,
        sx: +(cv.width / (r.width * dpr)).toFixed(4), sy: +(cv.height / (r.height * dpr)).toFixed(4) };
    });
    m.stretchPct = +(Math.abs(m.sx / m.sy - 1) * 100).toFixed(2);
    m.ok = m.stretchPct < 0.5 && Math.abs(m.sx - 1) < 0.01 && Math.abs(m.sy - 1) < 0.01;
    const shot = path.join(OUT, `${TARGET}_${c.tag}.png`);
    await page.screenshot({ path: shot });
    report.push({ target: TARGET, case: c.tag, from: c.from, to: c.to, resizedBeforeReady: !early, ...m, errors });
    console.log(TARGET, c.tag, JSON.stringify(m), errors.slice(0, 1));
    await ctx.close();
  }
} finally { await browser.close(); server.kill(); }
// CASE=<tag> runs one case (low-memory box) and merges into the report
const rp = path.join(OUT, `report_${TARGET}.json`);
const prev = process.env.CASE && fs.existsSync(rp) ? JSON.parse(fs.readFileSync(rp, 'utf8')).filter((r) => r.case !== process.env.CASE) : [];
fs.writeFileSync(rp, JSON.stringify([...prev, ...report], null, 2));

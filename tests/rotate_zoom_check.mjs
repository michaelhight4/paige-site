// Rotate zoom check (Gary, Oct 23, 2026 11:12 AM CT, iPhone, live alpha: after turning the phone from portrait to landscape the
// game came back hugely zoomed in and smeared). Drives an iPhone-sized page through portrait <-> landscape turns (setViewportSize
// + orientationchange) and checks that every landscape frame matches a fresh landscape load: same canvas backing store (= CSS box
// x dpr, no CSS stretch), same integer zoom, sprite/tile sheets at the scale the zoom wants.
// Usage: TAG=before|after TARGET=dev|live [IOS=1] [CASE=<tag>] [OW_SRC=backups/.../overworld.js] node tests/rotate_zoom_check.mjs -> shots/rotate_zoom_fix/<tag>_*.png + report_<tag>_<target>.json
// IOS=1 also replays the iOS Safari rotation order: orientationchange fires first, the viewport flips in two steps (height, then
// width) and the trailing window resize is NOT delivered (the case a plain resize listener misses).
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TAG = process.env.TAG || 'after', TARGET = process.env.TARGET || 'dev', IOS = process.env.IOS === '1';
const OUT = path.join(ROOT, 'shots/rotate_zoom_fix'); fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = TARGET === 'live' ? null : spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = TARGET === 'live' ? 'https://paigegames.net/kilumen/' : `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50 && server; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const Q = TARGET === 'live' ? '' : '?save=0&title=0&skipintro=1&map=brookhollow&x=5&y=8&facing=down&audio=0';
const LAND = [844, 390], LAND_BARS = [844, 340], PORT_ = [390, 664], PORT_FULL = [390, 844];
const CASES = [
  { tag: 'land_portrait_land', start: LAND, seq: [PORT_, LAND] },
  { tag: 'portrait_start_land', start: PORT_, seq: [LAND] },
  { tag: 'portrait_start_bars_land', start: PORT_, seq: [LAND_BARS, LAND] },
  { tag: 'portrait_turn_during_load', start: PORT_, seq: [LAND], early: true }, // turned while maps / art are still loading
  { tag: 'back_and_forth_x4', start: LAND, seq: [PORT_, LAND, PORT_FULL, LAND_BARS, PORT_, LAND, PORT_, LAND] },
];
const browser = await chromium.launch();
const report = [];
// what a landscape page looks like when loaded fresh at this size (the reference)
async function measure(page) {
  return page.evaluate(() => {
    const s = window.kilumen?.scene, cv = document.getElementById('world'), r = cv.getBoundingClientRect(), dpr = devicePixelRatio;
    if (!s) return { live: true, css: [r.width, r.height], backing: [cv.width, cv.height], dpr };
    return { css: [+r.width.toFixed(1), +r.height.toFixed(1)], backing: [cv.width, cv.height], dpr, zoom: s.zoom, sheetScale: s.sheetScale,
      playerScale: s.playerScale, tileScale: s.tileset?.size / 64, smoothing: s.renderer.ctx.imageSmoothingEnabled };
  });
}
async function turn(page, [w, h]) {
  if (IOS) { // iOS order: orientationchange first (old size), then height, then width without a window resize event
    await page.evaluate(() => window.dispatchEvent(new Event('orientationchange')));
    await page.waitForTimeout(60);
    await page.evaluate(() => { window.__dropResize = true; });
    const cur = page.viewportSize();
    await page.setViewportSize({ width: cur.width, height: h }); await page.waitForTimeout(80);
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(80);
    await page.evaluate(() => { window.__dropResize = false; });
  } else {
    await page.setViewportSize({ width: w, height: h });
    await page.evaluate(() => window.dispatchEvent(new Event('orientationchange')));
  }
  await page.waitForTimeout(1600);
}
async function open(size, early) {
  const ctx = await browser.newContext({ viewport: { width: size[0], height: size[1] }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  // OW_SRC=<path>: serve that overworld.js instead (e.g. the pre-squish-fix backup, to show the bug on today's dev build)
  if (process.env.OW_SRC && TARGET === 'dev') await page.route('**/src/overworld/overworld.js*', (r) => r.fulfill({ path: path.resolve(ROOT, process.env.OW_SRC), contentType: 'text/javascript' }));
  if (IOS) await page.addInitScript(() => { // swallow window resize (only) while a turn is in progress, like iOS mid-rotation
    const add = window.addEventListener.bind(window);
    window.addEventListener = (type, fn, o) => add(type, type === 'resize' ? (e) => { if (!window.__dropResize) fn(e); } : fn, o);
  });
  await page.goto(base + Q, { waitUntil: early ? 'commit' : 'load' });
  if (early) { await page.waitForFunction(() => document.getElementById('world')?.width > 300, null, { timeout: 30000, polling: 20 }); return { ctx, page, errors }; }
  await page.waitForFunction(() => window.kilumen?.scene?.tileset, null, { timeout: 45000 });
  await page.evaluate(() => window.kilumen.ready); await page.waitForTimeout(1500);
  return { ctx, page, errors };
}
const refs = {};
try {
  for (const sz of [LAND, LAND_BARS]) { const { ctx, page } = await open(sz); refs[sz.join('x')] = await measure(page);
    if (sz === LAND) await page.screenshot({ path: path.join(OUT, `${TAG}_${TARGET}_fresh_landscape.png`) }); await ctx.close(); }
  for (const c of CASES.filter((k) => !process.env.CASE || k.tag === process.env.CASE)) {
    const { ctx, page, errors } = await open(c.start, c.early);
    const steps = [];
    for (const sz of c.seq) {
      await turn(page, sz);
      if (c.early) { await page.waitForFunction(() => window.kilumen?.scene?.tileset, null, { timeout: 45000 }); await page.evaluate(() => window.kilumen.ready); await page.waitForTimeout(1500); }
      if (sz[0] < sz[1]) continue; // portrait: the overlay covers the game
      const m = await measure(page), ref = refs[sz.join('x')];
      const stretch = m.backing[0] / (m.css[0] * m.dpr) - m.backing[1] / (m.css[1] * m.dpr);
      m.ok = !m.live && m.backing[0] === ref.backing[0] && m.backing[1] === ref.backing[1] && m.zoom === ref.zoom && m.playerScale === ref.playerScale
        && m.tileScale === ref.tileScale && Math.abs(stretch) < 0.005 && m.smoothing === false;
      if (m.live) m.ok = m.backing[0] === ref.backing[0] && m.backing[1] === ref.backing[1];
      steps.push({ size: sz, ...m });
    }
    const shot = path.join(OUT, `${TAG}_${TARGET}${IOS ? '_ios' : ''}_${c.tag}.png`);
    await page.screenshot({ path: shot });
    const ok = steps.every((s) => s.ok);
    report.push({ case: c.tag, ios: IOS, ok, steps, errors: errors.slice(0, 3) });
    console.log(ok ? 'OK  ' : 'FAIL', c.tag, JSON.stringify(steps.map(({ size, backing, zoom, playerScale, tileScale }) => ({ size, backing, zoom, playerScale, tileScale }))));
    await ctx.close();
  }
} finally { await browser.close(); server?.kill(); }
console.log('reference', JSON.stringify(refs));
fs.writeFileSync(path.join(OUT, `report_${TAG}_${TARGET}${IOS ? '_ios' : ''}.json`), JSON.stringify({ refs, report }, null, 2));
process.exitCode = report.every((r) => r.ok) ? 0 : 1;

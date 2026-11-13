// Night FX v1 (Oct 23, 2026): before/after stills of Brookhollow + Fernwick at day/dusk/night, PC 1280x720 and phone
// landscape 844x390 (dpr 3, touch, mobile profile). Canvas pixels only (scene.render() + toDataURL: no DOM HUD), clock
// frozen (?timescale=0), ambient life off (?life=0: no chimney smoke in review shots).
// Usage: node tests/nightfx_shots.mjs <port> <label> [extraQuery]   -> shots/nightfx_v1/<label>/<map>_<phase>_<pc|phone>.png
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const PORT = process.argv[2] || 8231, LABEL = process.argv[3] || 'after', EXTRA = process.argv[4] || '';
const OUT = new URL(`../shots/nightfx_v1/${LABEL}/`, import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
export const SPOTS = { brookhollow: { x: 11, y: 8 }, fernwick: { x: 18, y: 17 } };
export const PHASE_HOURS = { day: 12, dusk: 18, night: 22 };
const devices = {
  pc: { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, q: '&platform=pc' },
  phone: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, q: '&platform=mobile' },
};
const browser = await chromium.launch();
const log = { label: LABEL, extra: EXTRA, shots: [], errors: [] };
for (const [dev, d] of Object.entries(devices)) {
  const { q: dq, ...ctxOpts } = d;
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => log.errors.push(`${dev}: ${e}`));
  page.on('console', (m) => { if (m.type() === 'error') log.errors.push(`${dev}: ${m.text()}`); });
  for (const [map, s] of Object.entries(SPOTS)) for (const [phase, hour] of Object.entries(PHASE_HOURS)) {
    await page.goto(`http://127.0.0.1:${PORT}/index.html?map=${map}&x=${s.x}&y=${s.y}&facing=down&hour=${hour}&timescale=0&life=0&save=0&audio=0${dq}${EXTRA}`);
    await page.evaluate(() => window.kilumen.ready);
    await page.waitForTimeout(600);
    const r = await page.evaluate(async () => {
      const sc = window.kilumen.scene;
      for (let i = 0; i < 3; i++) sc.render();
      const c = sc.renderer.canvas;
      return { url: c.toDataURL('image/png'), w: c.width, h: c.height, zoom: sc.zoom, phase: sc.phase, hour: sc.hour, nightfx: sc.nightfx?.state?.() ?? null };
    });
    const f = `${map}_${phase}_${dev}.png`;
    writeFileSync(OUT + f, Buffer.from(r.url.split(',')[1], 'base64'));
    log.shots.push({ file: f, w: r.w, h: r.h, zoom: r.zoom, phase: r.phase, hour: r.hour, nightfx: r.nightfx });
  }
  await ctx.close();
}
await browser.close();
writeFileSync(OUT + 'shots.json', JSON.stringify(log, null, 1));
console.log(JSON.stringify({ label: LABEL, n: log.shots.length, errors: log.errors }, null, 1));

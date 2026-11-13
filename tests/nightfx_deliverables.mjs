// Night FX v1.1 deliverables (Oct 23, 2026): before (?nightfx=0) / after (dev defaults) stills at the review sizes:
// PC 1920x1080 (dpr 1, pc profile) and phone landscape 2340x1080 (780x360 css, dpr 3, touch, mobile profile).
// Scenes: town (Brookhollow) night, route (Route 1) night, town dusk. Also proves the switches leave day + interiors
// byte-identical (canvas data URL compare). Canvas pixels only, clock frozen, ambient life off.
// Usage: node tests/nightfx_deliverables.mjs <port>  -> shots/nightfx_v1/{before,after}/<scene>_<pc|phone>.png + deliverables.json
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const PORT = process.argv[2] || 8231;
const ROOT = new URL('../shots/nightfx_v1/', import.meta.url).pathname;
export const SCENES = {
  town_night: 'map=brookhollow&x=11&y=8&hour=22',
  route_night: 'map=route1&x=37&y=5&hour=22',
  town_dusk: 'map=brookhollow&x=11&y=8&hour=18',
};
const CHECKS = { town_day: 'map=brookhollow&x=11&y=8&hour=12', interior_night: 'map=heal_brookhollow&x=6&y=7&hour=22', house_night: 'map=house_1f&x=4&y=4&hour=22' };
const devices = {
  pc: { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, q: '&platform=pc' },
  phone: { viewport: { width: 780, height: 360 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, q: '&platform=mobile' },
};
const VARIANTS = { before: '&nightfx=0', after: '' };
const browser = await chromium.launch();
const log = { when: new Date().toString(), shots: [], identical: [], errors: [] };
for (const [dev, d] of Object.entries(devices)) {
  const { q: dq, ...ctxOpts } = d;
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => log.errors.push(`${dev}: ${e}`));
  page.on('console', (m) => { if (m.type() === 'error') log.errors.push(`${dev}: ${m.text()}`); });
  const grab = async (q, extra) => {
    await page.goto(`http://127.0.0.1:${PORT}/index.html?${q}&facing=down&timescale=0&life=0&save=0&audio=0${dq}${extra}`);
    await page.evaluate(() => window.kilumen.ready);
    await page.waitForTimeout(700);
    return page.evaluate(async () => {
      const sc = window.kilumen.scene;
      for (let i = 0; i < 3; i++) sc.render();
      const c = sc.renderer.canvas;
      return { url: c.toDataURL('image/png'), w: c.width, h: c.height, zoom: sc.zoom, phase: sc.phase, map: sc.map?.name, nightfx: sc.nightfx?.state?.() ?? null };
    });
  };
  for (const [scene, q] of Object.entries(SCENES)) for (const [label, extra] of Object.entries(VARIANTS)) {
    const r = await grab(q, extra), f = `${scene}_${dev}.png`;
    mkdirSync(ROOT + label, { recursive: true });
    writeFileSync(`${ROOT}${label}/${f}`, Buffer.from(r.url.split(',')[1], 'base64'));
    log.shots.push({ label, file: `${label}/${f}`, w: r.w, h: r.h, zoom: r.zoom, phase: r.phase, map: r.map, nightfx: r.nightfx });
  }
  for (const [name, q] of Object.entries(CHECKS)) {
    const a = await grab(q, '&nightfx=0'), b = await grab(q, '');
    log.identical.push({ device: dev, case: name, map: b.map, phase: b.phase, identical: a.url === b.url });
  }
  await ctx.close();
}
await browser.close();
writeFileSync(ROOT + 'deliverables.json', JSON.stringify(log, null, 1));
console.log(JSON.stringify({ n: log.shots.length, sizes: [...new Set(log.shots.map((s) => `${s.w}x${s.h}`))], identical: log.identical, errors: log.errors }, null, 1));

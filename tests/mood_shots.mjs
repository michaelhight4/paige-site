// Mood layers v1 contact sheet (src/overworld/mood.js). LOCAL ONLY: writes to shots/mood_v1/.
// Usage: node tests/mood_shots.mjs [port=8131]   (needs a static server on the repo root)
// Region 1 areas x PC/phone, mood off vs on, day clear / day cloudy (sun rays) / dusk / night. Deterministic: the rAF
// loop is stopped, the clock frozen (timescale=0) and the scene stepped a fixed number of ticks before each shot.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const PORT = process.argv[2] || '8131';
const OUT = path.resolve('shots/mood_v1');
fs.mkdirSync(path.join(OUT, 'pc'), { recursive: true }); fs.mkdirSync(path.join(OUT, 'phone'), { recursive: true });
const AREAS = [ // spawn = a walkable 3x3 nearest the map centre (computed from the collision layer, Oct 23)
  ['brookhollow', 29, 20], ['route1', 34, 26], ['greystone_b1', 27, 16], ['fernwick', 27, 19], ['fernwick_hall_int', 8, 7],
];
const LOOKS = [
  ['day_clear', 'hour=12&weather=clear'], ['day_cloudy', 'hour=12&weather=cloudy'],
  ['dusk', 'hour=18.5&weather=cloudy'], ['night', 'hour=22&weather=cloudy'],
];
const PLATFORMS = [
  ['pc', { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 }, 'platform=pc'],
  ['phone', { viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }, 'platform=mobile&touch=1'],
];
const idle = { dir: null, a: false, b: false, bTap: false, debug: false, select: false };
const report = { shots: {}, errors: [], blocks: {} };
const browser = await chromium.launch();
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;

for (const [plat, ctxOpts, pq] of PLATFORMS) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => report.errors.push(`${plat}: ${e}`));
  page.on('console', (m) => { if (m.type() === 'error') report.errors.push(`${plat} console: ${m.text()}`); });
  for (const [map, x, y] of AREAS) {
    if (only && !only.includes(map)) continue;
    for (const [look, lq] of LOOKS) for (const mood of [0, 1]) {
      const name = `${map}_${look}_${mood ? 'on' : 'off'}`;
      const url = `http://127.0.0.1:${PORT}/index.html?save=0&skipintro=1&ui=0&audio=0&timescale=0&${pq}&map=${map}&x=${x}&y=${y}&${lq}&mood=${mood}`;
      await page.goto(url);
      await page.evaluate(() => Promise.all([window.kilumen.ready, window.kilumen.mood.ready]));
      const last = await page.evaluate((snap) => {
        const s = window.kilumen.scene; cancelAnimationFrame(s._raf); s.run = () => {};
        for (let i = 0; i < 90; i++) s.step(snap);
        s.render();
        return { ...window.kilumen.mood.last, grade: s.gradeName, zoom: s.zoom };
      }, idle);
      const file = path.join(OUT, plat, `${name}.png`);
      await page.locator('#world').screenshot({ path: file });
      report.shots[`${plat}/${name}`] = { url, mood: last };
      if (mood) report.blocks[`${plat}/${name}`] = await page.evaluate(() => { // integer-zoom crispness (as life_previews)
        const c = document.getElementById('world'), z = window.kilumen.scene.zoom;
        const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        let bad = 0, blocks = 0;
        for (let by = 0; by + z <= c.height; by += z) for (let bx = 0; bx + z <= c.width; bx += z) {
          const i0 = (by * c.width + bx) * 4; blocks++;
          outer: for (let yy = 0; yy < z; yy++) for (let xx = 0; xx < z; xx++) {
            const i = ((by + yy) * c.width + bx + xx) * 4;
            if (d[i] !== d[i0] || d[i + 1] !== d[i0 + 1] || d[i + 2] !== d[i0 + 2]) { bad++; break outer; }
          }
        }
        return { bad, blocks, z };
      });
      console.log(plat, name, JSON.stringify(last));
    }
  }
  await ctx.close();
}

// Contact sheet: one row per area x platform, columns = look x off/on. Composed in a page canvas (smooth downscale).
if (!only) {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  const cols = LOOKS.flatMap(([l]) => [`${l}_off`, `${l}_on`]);
  const rows = PLATFORMS.flatMap(([p]) => AREAS.map(([m]) => [p, m]));
  const imgs = {};
  for (const [p, m] of rows) for (const c of cols) imgs[`${p}/${m}_${c}`] = 'data:image/png;base64,' + fs.readFileSync(path.join(OUT, p, `${m}_${c}.png`)).toString('base64');
  const b64 = await page.evaluate(async ({ imgs, cols, rows }) => {
    const TW = 360, LW = 150, HEAD = 40, GAP = 6;
    const load = (src) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = src; });
    const L = {}; for (const k in imgs) L[k] = await load(imgs[k]);
    const rh = rows.map(([p, m]) => { const i = L[`${p}/${m}_${cols[0]}`]; return Math.round(TW * i.height / i.width); });
    const W = LW + cols.length * (TW + GAP), H = HEAD + rh.reduce((a, b) => a + b + GAP, 0);
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'); g.fillStyle = '#16131c'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#f2ead8'; g.font = 'bold 15px sans-serif'; g.imageSmoothingQuality = 'high';
    cols.forEach((k, i) => g.fillText(k.replace('_', ' ').replace(/_(on|off)$/, ' · mood $1'), LW + i * (TW + GAP) + 6, 26));
    let y = HEAD;
    rows.forEach(([p, m], r) => {
      g.fillStyle = '#f2ead8'; g.font = 'bold 14px sans-serif'; g.fillText(m, 8, y + 22); g.font = '13px sans-serif'; g.fillText(p, 8, y + 42);
      cols.forEach((k, i) => g.drawImage(L[`${p}/${m}_${k}`], LW + i * (TW + GAP), y, TW, rh[r]));
      y += rh[r] + GAP;
    });
    return c.toDataURL('image/png').split(',')[1];
  }, { imgs, cols, rows });
  fs.writeFileSync(path.join(OUT, 'contact_sheet.png'), Buffer.from(b64, 'base64'));
}
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
console.log('errors:', report.errors.length, report.errors.slice(0, 5));
console.log('blocks bad:', Object.entries(report.blocks).filter(([, b]) => b.bad).map(([k, b]) => `${k}:${b.bad}`));
await browser.close();

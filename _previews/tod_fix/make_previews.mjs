// Time-of-day fix previews (LOCAL ONLY). Usage (repo root, static server running):
//   node _previews/tod_fix/make_previews.mjs <port> <before|after>
// Same views as _previews/living_world/b_*.png (1920x1080, clock frozen, save off).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const PORT = process.argv[2] || '8099', TAG = process.argv[3] || 'after';
const OUT = path.resolve('_previews/tod_fix');
fs.mkdirSync(OUT, { recursive: true });
const errors = [], states = {};
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
page.on('requestfailed', (r) => errors.push(`requestfailed: ${r.url()}`));
page.on('response', (r) => { if (r.status() >= 400) errors.push(`HTTP ${r.status()}: ${r.url()}`); });

async function open(q) {
  await page.goto(`http://127.0.0.1:${PORT}/index.html?save=0&timescale=0&${q}`);
  await page.evaluate(() => window.kilumen.ready);
  await page.evaluate(() => { const s = window.kilumen.scene; cancelAnimationFrame(s._raf); s.run = () => {}; });
  await page.evaluate(() => { const s = window.kilumen.scene; for (let i = 0; i < 120; i++) s.step({ dir: null, a: false, b: false, bTap: false, debug: false, select: false }); s.render(); });
}
async function still(name, q, clip) {
  await open(q);
  const st = await page.evaluate(() => { const s = window.kilumen.state(); return { map: s.map, phase: s.phase, grade: s.grade, cam: s.cam, zoom: s.zoom }; });
  states[name] = { q, ...st };
  const opts = { path: path.join(OUT, `${TAG}_${name}.png`) };
  if (clip) { const c = clip(st); opts.clip = c; await page.screenshot(opts); } else await page.locator('#world').screenshot(opts);
}
// lamp at brookhollow (20,14): 3x3 tiles around it, in page px
const lampClip = (tx, ty) => (st) => ({ x: ((tx - 1) * 64 - st.cam.x) * st.zoom, y: ((ty - 1) * 64 - st.cam.y) * st.zoom, width: 3 * 64 * st.zoom, height: 3 * 64 * st.zoom });
try {
  await still('brookhollow_night', 'map=brookhollow&x=16&y=14&phase=night');
  await still('brookhollow_dusk', 'map=brookhollow&x=16&y=14&phase=dusk');
  await still('brookhollow_dawn', 'map=brookhollow&x=16&y=14&phase=dawn');
  await still('brookhollow_day', 'map=brookhollow&x=16&y=14&phase=day');
  await still('lamp_night_closeup', 'map=brookhollow&x=16&y=14&phase=night', lampClip(20, 14));
  await still('heal_brookhollow_night', 'map=heal_brookhollow&x=6&y=7&phase=night');
  await still('home_brookhollow_a_night', 'map=home_brookhollow_a&x=5&y=5&phase=night');
  await still('route1_crystals_night', 'map=route1&x=10&y=20&phase=night');
} finally {
  fs.writeFileSync(path.join(OUT, `${TAG}_report.json`), JSON.stringify({ states, errors }, null, 1));
  await browser.close();
}
console.log(TAG, Object.keys(states).length, 'shots;', errors.length, 'console errors/warnings', errors.slice(0, 5));

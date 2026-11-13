// Living-world previews (cloud shadows + ambient life). LOCAL ONLY: writes to _previews/living_world/.
// Usage: node tests/life_previews.mjs [port=8097]   (needs a static server on the repo root, plus ffmpeg)
// Clips are rendered deterministically: the rAF loop is stopped and the scene is stepped 2 ticks per frame
// (60 Hz sim -> 30 fps video), so the MP4s show exactly what the game draws, pixel for pixel.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PORT = process.argv[2] || '8097';
const OUT = path.resolve('_previews/living_world');
const TMP = '/tmp/kilumen_life_frames';
fs.mkdirSync(OUT, { recursive: true });
const report = { stills: {}, clips: {}, errors: [], blocks: {} };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => report.errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') report.errors.push(`${m.type()}: ${m.text()}`); });

async function open(q) {
  await page.goto(`http://127.0.0.1:${PORT}/index.html?save=0&${q}`);
  await page.evaluate(() => window.kilumen.ready);
  await page.evaluate(() => { const s = window.kilumen.scene; cancelAnimationFrame(s._raf); s.run = () => {}; });
}
const idle = { dir: null, a: false, b: false, bTap: false, debug: false, select: false };
const advance = (ticks) => page.evaluate(([n, snap]) => { const s = window.kilumen.scene; for (let i = 0; i < n; i++) s.step(snap); s.render(); }, [ticks, idle]);
async function blockCheck() {
  return page.evaluate(() => {
    const c = document.getElementById('world'), z = window.kilumen.scene.zoom;
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let bad = 0, blocks = 0;
    for (let by = 0; by + z <= c.height; by += z) for (let bx = 0; bx + z <= c.width; bx += z) {
      const i0 = (by * c.width + bx) * 4; blocks++;
      outer: for (let y = 0; y < z; y++) for (let x = 0; x < z; x++) {
        const i = ((by + y) * c.width + bx + x) * 4;
        if (d[i] !== d[i0] || d[i + 1] !== d[i0 + 1] || d[i + 2] !== d[i0 + 2]) { bad++; break outer; }
      }
    }
    return { bad, blocks, z };
  });
}
const shot = (file) => page.locator('#world').screenshot({ path: path.join(OUT, file) });
const life = () => page.evaluate(() => window.kilumen.state().life);

async function still(name, q, { warm = 120, pre } = {}) {
  await open(q);
  if (pre) await page.evaluate(pre);
  await advance(warm);
  await shot(`${name}.png`);
  report.stills[name] = { q, life: await life() };
  report.blocks[name] = await blockCheck();
}

async function clip(name, q, { seconds = 4, warm = 90, pre, mid } = {}) {
  await open(q);
  if (pre) await page.evaluate(pre);
  await advance(warm);
  fs.rmSync(TMP, { recursive: true, force: true }); fs.mkdirSync(TMP, { recursive: true });
  const frames = seconds * 30;
  for (let f = 0; f < frames; f++) {
    if (mid && f === mid.at) await page.evaluate(mid.fn);
    await advance(2);
    await page.locator('#world').screenshot({ path: `${TMP}/f${String(f).padStart(4, '0')}.png` });
  }
  report.blocks[name] = await blockCheck();
  const out = path.join(OUT, `${name}.mp4`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '30', '-i', `${TMP}/f%04d.png`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
  report.clips[name] = { q, seconds, life: await life() };
  console.log('clip', name);
}

const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
const want = (n) => !only || only.includes(n);
try {
  // (a) outdoor day, real game speed (1 s = 1 game min = 8 native px of drift)
  if (want('a')) {
    await clip('a_clouds_brookhollow_day', 'map=brookhollow&x=16&y=14&hour=12', { seconds: 8, warm: 30 });
    await clip('a_clouds_route1_day', 'map=route1&x=10&y=20&hour=11', { seconds: 8, warm: 30 });
    await clip('a_clouds_timelapse_x8', 'map=brookhollow&x=16&y=14&hour=12&timescale=8&life=0', { seconds: 6, warm: 30 });
  }
  // (b) phases (clock frozen)
  if (want('b')) for (const ph of ['dawn', 'day', 'dusk', 'night']) await still(`b_${ph}`, `map=brookhollow&x=16&y=14&phase=${ph}&timescale=0`);
  if (want('b')) await still('b_day_toggles_off', 'map=brookhollow&x=16&y=14&phase=day&timescale=0&clouds=0&life=0');
  if (want('b')) await still('b_day_overcast', 'map=brookhollow&x=16&y=14&phase=day&timescale=0&weather=overcast');
  // (c) indoor / cave: no clouds, no life
  if (want('c')) {
    await still('c_indoor_heal_brookhollow', 'map=heal_brookhollow&x=6&y=7&phase=day&timescale=0');
    await still('c_cave_greystone_b1', 'map=greystone_b1&x=4&y=5&phase=day&timescale=0');
  }
  // (d) effects
  if (want('d')) {
    await clip('d_fish_river', 'map=brookhollow&x=21&y=10&hour=12&clouds=0', { seconds: 5, warm: 60 });
    await clip('d_butterflies', 'map=brookhollow&x=20&y=6&hour=10&clouds=0', { seconds: 5 });
    await clip('d_fireflies_night', 'map=brookhollow&x=20&y=22&hour=22&timescale=0', { seconds: 5 });
    await clip('d_birds', 'map=route1&x=10&y=20&hour=12&clouds=0', { seconds: 8, warm: 30, mid: { at: 3, fn: () => window.kilumen.scene.life.spawnBirds(5) } });
    await clip('d_chimney_smoke', 'map=brookhollow&x=6&y=10&hour=8&clouds=0', { seconds: 4, warm: 240 });
    await clip('d_wind_motes', 'map=route1&x=10&y=20&hour=12&clouds=0', { seconds: 4, warm: 240 });
    await clip('d_reduced_motion', 'map=brookhollow&x=16&y=14&hour=12&motion=reduce', { seconds: 4 });
  }
} finally {
  await browser.close();
  const prev = fs.existsSync(path.join(OUT, 'report.json')) ? JSON.parse(fs.readFileSync(path.join(OUT, 'report.json'))) : {};
  const merged = { stills: { ...prev.stills, ...report.stills }, clips: { ...prev.clips, ...report.clips }, blocks: { ...prev.blocks, ...report.blocks }, errors: report.errors };
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(merged, null, 1));
  console.log(JSON.stringify({ errors: report.errors, blocks: report.blocks }, null, 1));
}

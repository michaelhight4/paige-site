// Headless browser check + screenshots for the overworld (real keyboard input, real canvas).
// Usage: node tests/shots.mjs   -> writes shots/overworld_v1/*.png and prints a JSON report.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'shots/overworld_v1');
import net from 'node:net';
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
fs.mkdirSync(OUT, { recursive: true });

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }

const results = []; let failures = 0;
const check = (ok, msg) => { results.push((ok ? 'PASS ' : 'FAIL ') + msg); if (!ok) failures++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function open(page, q = '') {
  await page.goto(base + q);
  await page.waitForFunction(() => window.kilumen && window.kilumen.scene && window.kilumen.scene.tileset);
  await page.evaluate(() => window.kilumen.ready);
  await sleep(150);
}
const st = (page) => page.evaluate(() => window.kilumen.state());
async function hold(page, key, ms) { await page.keyboard.down(key); await sleep(ms); await page.keyboard.up(key); }
async function settle(page) { await page.waitForFunction(() => { const s = window.kilumen.state(); return s.state === 'idle' && !s.fading; }, null, { timeout: 5000 }); await sleep(120); }

/** Every zoom x zoom block of the canvas is one flat colour => nearest-neighbour, integer-aligned, no sub-pixel draws. */
async function blockCheck(page) {
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

const browser = await chromium.launch();
try {
  for (const [w, h, wantZoom, tag] of [[1920, 1080, 2, '1080p'], [2560, 1440, 3, '1440p']]) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    // 1. Player on a loaded map (dev start outside the house in Brookhollow), after walking with real keys.
    await open(page);
    let s = await st(page);
    check(s.map === 'brookhollow' && s.zoom === wantZoom && s.tileSize === 64 * wantZoom, `${tag}: brookhollow loaded at zoom x${s.zoom}, ${s.tileSize}px tile set`);
    check(s.smoothing === false && s.canvas.w === w && s.canvas.h === h, `${tag}: canvas ${s.canvas.w}x${s.canvas.h}, imageSmoothingEnabled=${s.smoothing}`);
    await hold(page, 'ArrowRight', 60); await settle(page);              // tap: turn only
    s = await st(page);
    check(s.x === 5 && s.y === 8 && s.facing === 'right', `${tag}: tap turns in place (5,8 facing ${s.facing})`);
    const trace = [];
    await page.keyboard.down('ArrowRight');
    for (let i = 0; i < 40; i++) { trace.push(await st(page)); await sleep(16); }
    await page.keyboard.up('ArrowRight'); await settle(page);
    s = await st(page);
    check(s.x > 6 && s.y === 8, `${tag}: holding right walks (now ${s.x},${s.y})`);
    check(trace.every((t) => Number.isInteger(t.pixel.px) && Number.isInteger(t.cam.x) && Number.isInteger(t.cam.y)), `${tag}: player px and camera stay whole native pixels while walking`);
    await hold(page, 'ArrowDown', 400); await settle(page);
    s = await st(page);
    let b = await blockCheck(page);
    check(b.bad === 0, `${tag}: crisp: ${b.blocks} ${b.z}x${b.z} blocks, ${b.bad} not flat`);
    await page.screenshot({ path: path.join(OUT, `${tag}_01_player_on_map.png`) });

    // 2. Debug overlay (F3).
    await page.keyboard.press('F3'); await sleep(150);
    check((await st(page)).debug === true, `${tag}: F3 toggles debug on`);
    await page.screenshot({ path: path.join(OUT, `${tag}_02_debug_overlay.png`) });
    await page.keyboard.press('F3'); await sleep(150);
    check((await st(page)).debug === false, `${tag}: F3 toggles debug off`);

    // 2b. Bump into a wall: hold up against the fence/house row stays put.
    await open(page, '?map=brookhollow&x=4&y=8&facing=up');
    await hold(page, 'ArrowUp', 500); await settle(page);
    s = await st(page);
    check(s.x === 4 && s.y === 8 && s.log.some((e) => e.type === 'bump'), `${tag}: walking into a wall bumps in place`);

    // 3. Door warp: from the dev start step up into the house door -> house_1f, then back out ($return-style landing).
    await open(page, '?map=brookhollow&x=5&y=8&facing=up');
    await hold(page, 'ArrowUp', 300);
    await page.waitForFunction(() => window.kilumen.state().warpCount === 1 && !window.kilumen.state().fading, null, { timeout: 5000 });
    await sleep(60);
    s = await st(page);
    check(s.map === 'house_1f' && s.x === 5 && s.y === 8 && s.facing === 'up', `${tag}: door warp -> ${s.map} ${s.x},${s.y} facing ${s.facing}`);
    b = await blockCheck(page);
    check(b.bad === 0, `${tag}: crisp after warp (${b.bad} non-flat blocks)`);
    await page.screenshot({ path: path.join(OUT, `${tag}_03_after_door_warp.png`) });
    await hold(page, 'ArrowDown', 120); await hold(page, 'ArrowDown', 700);
    await page.waitForFunction(() => window.kilumen.state().warpCount === 2 && !window.kilumen.state().fading, null, { timeout: 5000 });
    s = await st(page);
    check(s.map === 'brookhollow' && s.x === 5 && s.y === 8, `${tag}: walking out of the house returns to brookhollow ${s.x},${s.y}`);

    // 4. Map-edge exit: Brookhollow north road -> Route 1 south edge.
    await open(page, '?map=brookhollow&x=10&y=1&facing=up');
    await hold(page, 'ArrowUp', 700);
    await page.waitForFunction(() => window.kilumen.state().warpCount === 1 && !window.kilumen.state().fading, null, { timeout: 5000 });
    await sleep(60);
    s = await st(page);
    check(s.map === 'route1' && s.x === 4 && s.y === 33, `${tag}: edge exit -> ${s.map} ${s.x},${s.y} facing ${s.facing}`);
    await page.screenshot({ path: path.join(OUT, `${tag}_04_after_edge_exit.png`) });

    // 5. Ledge hop on Route 1 + debug overlay showing ledges/grass/exits.
    await open(page, '?map=route1&x=4&y=33&facing=up&debug=1');
    await page.screenshot({ path: path.join(OUT, `${tag}_05_route1_debug.png`) });

    // 5b. Walking into tall grass: grass front/tips overlay covers the legs, rustle plays.
    await open(page, '?map=route1&x=5&y=30&facing=right');
    await hold(page, 'ArrowRight', 560); await settle(page);
    s = await st(page);
    check(s.map === 'route1' && s.x >= 7 && s.y === 30, `${tag}: walked into tall grass at ${s.x},${s.y}`);
    await page.screenshot({ path: path.join(OUT, `${tag}_07_in_tall_grass.png`) });

    // 6. TO COME exit: Brookhollow east road -> closed message, no warp.
    await open(page, '?map=brookhollow&x=33&y=12&facing=right');
    await hold(page, 'ArrowRight', 400); await settle(page);
    s = await st(page);
    check(s.map === 'brookhollow' && s.warpCount === 0 && s.log.some((e) => e.type === 'toast' && /closed/.test(e.text)), `${tag}: TO COME exit shows the closed message and stays put`);

    check(errors.length === 0, `${tag}: no console/page errors ${errors.length ? JSON.stringify(errors.slice(0, 3)) : ''}`);
    await page.close();
  }

  // Touch D-pad (coarse pointer emulation) walks too.
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, hasTouch: true, isMobile: false });
  const tp = await ctx.newPage();
  await open(tp, '?touch=1&map=brookhollow&x=5&y=8&facing=right');
  const btn = await tp.locator('[data-dir=right]').boundingBox();
  await tp.mouse.move(btn.x + btn.width / 2, btn.y + btn.height / 2);
  await tp.mouse.down(); await sleep(600); await tp.mouse.up(); await settle(tp);
  const ts = await st(tp);
  check(ts.x > 5, `touch D-pad (pointer events) walks: x=${ts.x}`);
  await tp.screenshot({ path: path.join(OUT, '720p_06_touch_dpad.png') });
  await ctx.close();
} finally {
  await browser.close();
  server.kill();
}
console.log(results.join('\n'));
console.log(failures ? `\n${failures} FAILED` : '\nall browser checks passed');
process.exit(failures ? 1 : 0);

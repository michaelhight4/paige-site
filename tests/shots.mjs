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

    // 8. Running shoes (MOVEMENT.md): hold B (X / Shift) + direction. No flag = still walking.
    await open(page, '?map=brookhollow&x=5&y=8&facing=right');
    await page.keyboard.down('KeyX'); await page.keyboard.down('ArrowRight'); await sleep(300);
    s = await st(page);
    await page.keyboard.up('ArrowRight'); await page.keyboard.up('KeyX'); await settle(page);
    check(s.stepMode === 'walk', `${tag}: B without has_run_shoes still walks (${s.stepMode})`);
    await open(page, '?map=brookhollow&x=5&y=8&facing=right&flags=has_run_shoes');
    await page.keyboard.down('KeyX'); await page.keyboard.down('ArrowRight');
    const t0 = Date.now(); let runShot = null;
    for (let i = 0; i < 60 && !runShot; i++) { const r = await st(page); if (r.moving !== false && r.state === 'step' && r.frame.anim === 'run' && r.x >= 7) { runShot = r; await page.screenshot({ path: path.join(OUT, `${tag}_08_running.png`) }); } await sleep(10); }
    await sleep(Math.max(0, 500 - (Date.now() - t0)));
    await page.keyboard.up('ArrowRight'); await page.keyboard.up('KeyX'); await settle(page);
    s = await st(page);
    check(!!runShot && runShot.stepMode === 'run' && runShot.dur <= 8, `${tag}: has_run_shoes + B runs (run sheet, ${runShot?.dur} ticks/tile)`);
    check(s.x >= 8 && s.frame.anim === 'walk' && s.frame.col === 0, `${tag}: ran to x=${s.x} in ~0.5 s, stops on walk stand`);

    // 9. Bike (MOVEMENT.md): Select (C) mounts outdoors; ramp hop into the Thornwood pocket; no dismount in the pocket.
    await open(page, '?map=thornwood&x=14&y=14&facing=right');
    await hold(page, 'ArrowRight', 300); await settle(page);
    s = await st(page);
    check(s.x === 14 && s.log.some((e) => e.type === 'toast' && /ramp/i.test(e.text)), `${tag}: ramp is a wall on foot, with the ramp_on_foot line`);
    await open(page, '?map=thornwood&x=14&y=14&facing=right&flags=has_bike&debug=1');
    await page.keyboard.press('KeyC'); await sleep(100);
    s = await st(page);
    check(s.mode === 'bike' && s.frame.anim === 'bike' && s.frame.col === 0, `${tag}: Select mounts the bike (bike_stand)`);
    await page.keyboard.down('ArrowRight');
    let hopShot = null;
    for (let i = 0; i < 40 && !hopShot; i++) { const r = await st(page); if (r.state === 'hop' && r.pixel.lift >= 4) { hopShot = r; await page.screenshot({ path: path.join(OUT, `${tag}_09_bike_ramp_hop.png`) }); } await sleep(5); }
    await page.keyboard.up('ArrowRight'); await settle(page);
    s = await st(page);
    check(!!hopShot && hopShot.frame.col === 2 && s.x >= 16 && s.y === 14, `${tag}: ramp hop on the bike lands in the pocket at ${s.x},${s.y} (lift ${hopShot?.pixel.lift})`);
    await page.keyboard.press('KeyC'); await sleep(100);
    s = await st(page);
    check(s.mode === 'bike' && s.log.some((e) => e.type === 'toast' && /get off/i.test(e.text)), `${tag}: no dismount inside the bike-only pocket`);

    // 10. Bike indoors: doors dismount automatically; Select inside says no.
    await open(page, '?map=brookhollow&x=5&y=8&facing=up&flags=has_bike');
    await page.keyboard.press('KeyC'); await sleep(80);
    await hold(page, 'ArrowUp', 200);
    await page.waitForFunction(() => window.kilumen.state().warpCount === 1 && !window.kilumen.state().fading, null, { timeout: 5000 });
    s = await st(page);
    check(s.map === 'house_1f' && s.mode === 'walk' && s.log.some((e) => e.type === 'toast' && /indoors/i.test(e.text)), `${tag}: riding into a door dismounts (mode ${s.mode})`);
    await page.keyboard.press('KeyC'); await sleep(80);
    check((await st(page)).mode === 'walk', `${tag}: Select indoors does not mount`);

    // 11. Story gate (CRITICAL_PATH.md): Brookhollow east checkpoint blocks until beat_master_fernwick.
    await open(page, '?map=brookhollow&x=31&y=12&facing=right&debug=1');
    await hold(page, 'ArrowRight', 350); await settle(page);
    s = await st(page);
    check(s.x === 31 && s.log.some((e) => e.type === 'bump' && e.gate === 'gate_brookhollow_east') && s.log.some((e) => e.type === 'toast' && /Survey/.test(e.text)), `${tag}: gate blocks with the Text Bot line`);
    await page.screenshot({ path: path.join(OUT, `${tag}_10_story_gate_blocked.png`) });
    await open(page, '?map=brookhollow&x=31&y=12&facing=right&debug=1&flags=beat_master_fernwick');
    await hold(page, 'ArrowRight', 330); await settle(page);
    s = await st(page);
    check(s.x >= 32 && s.y === 12 && s.gatesCleared.includes('gate_brookhollow_east'), `${tag}: with beat_master_fernwick the barricade is gone (walked to ${s.x},${s.y})`);
    await page.screenshot({ path: path.join(OUT, `${tag}_11_story_gate_cleared.png`) });
    await open(page, '?map=brookhollow&x=31&y=12&facing=up');
    await page.keyboard.press('KeyZ'); await sleep(80);
    s = await st(page);
    check(s.log.some((e) => e.type === 'toast' && /Survey|Fernwick/.test(e.text)), `${tag}: talking to the checkpoint guard gives the gate line`);

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

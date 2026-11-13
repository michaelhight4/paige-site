import { chromium } from 'playwright';
import fs from 'node:fs'; import http from 'node:http'; import path from 'node:path';
const OUT = '/workspace/kilumen/shots/weather_v1';
const serve = (ROOT) => new Promise((r) => { const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg' };
  const s = http.createServer((req, res) => { const f = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)); fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(b); }); });
  s.listen(0, '127.0.0.1', () => r(s.address().port)); });
const NEW = await serve('/workspace/wt_weather/kilumen'), OLD = await serve('/workspace/wt_wx_base/kilumen');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PROF = { pc: { viewport: { width: 1280, height: 720 }, q: '&platform=pc' }, phone: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, q: '&platform=mobile' } };
const st = (a) => { const s = a.slice(2).sort((x, y) => x - y); const q = (p) => +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(2); return { n: s.length, avg: +(s.reduce((x, y) => x + y, 0) / s.length).toFixed(2), p50: q(0.5), p95: q(0.95), max: +s.at(-1).toFixed(2), over16_7: s.filter((x) => x > 16.7).length }; };
const measure = async (page, ctx, ms) => { const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); await cdp.send('Performance.enable');
  const m0 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  const iv = await page.evaluate(async (ms) => { const iv = []; let last = performance.now(), go = true; const t = (n) => { iv.push(n - last); last = n; if (go) requestAnimationFrame(t); }; requestAnimationFrame(t); await new Promise((r) => setTimeout(r, ms)); go = false; return iv; }, ms);
  const m1 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  return { raf: st(iv), mainMsPerFrame: +(((m1.TaskDuration - m0.TaskDuration) * 1000) / iv.length).toFixed(2) }; };
const b = await chromium.launch(); const rep = {};
async function scene(prof, port, wx, map, opts = {}) {
  const P = PROF[prof]; const ctx = await b.newContext({ ...P, ...(opts.video ? { recordVideo: { dir: OUT + '/_vid', size: P.viewport } } : {}) }); await ctx.addInitScript(() => { try { localStorage.setItem('kilumen_alpha_notice_seen.v1', '1'); } catch {} }); const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', (e) => errs.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(`http://127.0.0.1:${port}/index.html?reset=1&enc=0${wx === '0' ? '&wx=0' : ''}${P.q}`);
  await page.waitForFunction(() => window.kilumen?.ui?.sdReady && window.kilumen.scene.systems, null, { timeout: 40000 });
  await sleep(1500);
  for (let i = 0; i < 4 && await page.evaluate(() => !!document.querySelector('.ui-modal')); i++) { await page.keyboard.press('Escape'); await sleep(300); }
  await page.evaluate(({ wx, hour }) => { const sc = window.kilumen.scene; sc.clock.min = hour * 60; if (wx && wx !== '0') sc.weather?.set(wx); }, { wx, hour: opts.hour ?? 12 });
  await page.evaluate(async ({ map, fish }) => { const sc = window.kilumen.scene; sc.startWarp({ map, x: 1, y: 1, facing: 'down' }, 'dev'); }, { map, fish: opts.fish });
  for (let t = 0; t < 3; t++) { const ok = await page.waitForFunction((m) => window.kilumen.scene.map?.name === m, map, { timeout: 8000 }).then(() => true).catch(() => false); if (ok) break;
    await page.evaluate(() => window.kilumen.ui.closeAll?.()); await sleep(400); await page.evaluate((map) => window.kilumen.scene.startWarp({ map, x: 1, y: 1, facing: 'down' }, 'dev'), map); }
  await sleep(800);
  // pick a spot: fishing = walkable cell facing water nearest the middle; else walkable cell nearest middle
  await page.evaluate(({ fish, at }) => { const sc = window.kilumen.scene, m = sc.map; const D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }; let best = null;
    const cx = at ? at[0] : m.width / 2, cy = at ? at[1] : m.height / 2;
    for (let y = 2; y < m.height - 2; y++) for (let x = 2; x < m.width - 2; x++) { if (m.code(x, y) !== 0 || m.npcAt?.(x, y)) continue;
      let face = 'down'; if (fish) { face = Object.keys(D).find((f) => [3, 8].includes(m.code(x + D[f][0], y + D[f][1])) || m.code(x + D[f][0], y + D[f][1]) === 3); if (!face) continue; if (face === 'up') continue; }
      else if ([-2, -1, 0, 1, 2].some((dx) => m.code(x + dx, y) !== 0)) continue;
      const d = (x - cx) ** 2 + (y - cy) ** 2; if (!best || d < best.d) best = { x, y, face, d }; }
    sc.startWarp({ map: m.name, x: best.x, y: best.y, facing: best.face }, 'dev'); }, { fish: opts.fish, at: opts.at });
  await page.waitForFunction(() => !window.kilumen.scene.fade, null, { timeout: 20000 }).catch(() => {}); await sleep(opts.video ? 300 : 2500);
  for (let i = 0; i < 5; i++) { if (!(await page.evaluate(() => !!window.kilumen.scene.busy || !!document.querySelector('.ui-dialog:not([hidden]), .dlg:not([hidden])')))) break; await page.keyboard.press('f'); await sleep(450); }
  if (wx && wx !== '0') await page.evaluate((wx) => { const w = window.kilumen.scene.weather; if (w) { w.set(wx); w.st.shown = wx; w.st.k = 1; } }, wx);
  await sleep(600);
  await page.evaluate(() => window.kilumen.ui.closeAll?.()); await sleep(300);
  if (opts.fish) { await page.evaluate(() => { const sc = window.kilumen.scene; sc.systems.bag.add('fishing_rod', 1); sc.party.length || sc.party.push({}); sc.interact(); }); await sleep(1800); }
  return { ctx, page, errs };
}
const shots = [
  // name, map, wx, opts
  ['snow_before', 'frostspire_pass', null, { old: true, at: [32, 35] }], ['snow_after', 'frostspire_pass', 'snow_light', { at: [32, 35] }],
  ['blizzard', 'frostspire_pass', 'blizzard', { at: [32, 35] }], ['ice_fog', 'frostspire_pass', 'ice_fog', { at: [32, 35] }],
  ['clear', 'route1', 'clear', {}], ['rain_light', 'route1', 'rain_light', {}], ['rain_heavy', 'route1', 'rain_heavy', {}], ['storm', 'route1', 'storm', {}],
  ['fog_dawn', 'route1', 'fog', { hour: 6 }], ['swamp_fog', 'mirefen_bog', 'fog', {}], ['rain_fishing', 'brookhollow', 'rain_heavy', { fish: true }],
];
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
for (const prof of ['pc', 'phone']) for (const [name, map, wx, o] of shots) { if (ONLY && !ONLY.includes(name)) continue;
  const { ctx, page, errs } = await scene(prof, o.old ? OLD : NEW, wx, map, o);
  await page.screenshot({ path: `${OUT}/${name}_${prof}.png` });
  const dbg = await page.evaluate(() => window.kilumen.scene.weather?.debug?.() || null);
  let perf = null; if (prof === 'phone' || process.env.PCPERF) perf = await measure(page, ctx, 5000);
  rep[`${name}_${prof}`] = { map, wx, dbg, perf, errs: errs.slice(0, 5) }; console.log(name, prof, JSON.stringify(rep[`${name}_${prof}`]));
  await ctx.close();
}
if (!ONLY) {
// baseline (origin/main) perf for the same temperate scene
for (const prof of ['phone']) { const { ctx, page } = await scene(prof, OLD, null, 'route1', {}); rep[`route1_base_${prof}`] = { perf: await measure(page, ctx, 5000) }; console.log('route1 base', JSON.stringify(rep[`route1_base_${prof}`])); await ctx.close(); }
{ const { ctx, page } = await scene('phone', NEW, '0', 'route1', {}); rep.route1_wxoff_phone = { perf: await measure(page, ctx, 5000) }; console.log('wx=0', JSON.stringify(rep.route1_wxoff_phone)); await ctx.close(); }
// clip: eased transitions on PC + phone
for (const prof of ['pc', 'phone']) { const { ctx, page } = await scene(prof, NEW, null, 'route1', { video: true });
  for (const k of ['clear', 'rain_light', 'rain_heavy', 'storm', 'fog', 'clear']) { await page.evaluate((k) => window.kilumen.scene.weather.set(k), k); await sleep(4200); }
  await page.evaluate(() => { const sc = window.kilumen.scene; sc.startWarp({ map: 'frostspire_pass', x: 32, y: 35, facing: 'down' }, 'dev'); }); await sleep(2500);
  for (const k of ['snow_light', 'blizzard', 'ice_fog']) { await page.evaluate((k) => window.kilumen.scene.weather.set(k), k); await sleep(4200); }
  const v = page.video(); await ctx.close(); fs.renameSync(await v.path(), `${OUT}/clip_${prof}.webm`); }
}
await b.close(); fs.writeFileSync(`${OUT}/report${ONLY ? '_' + ONLY.join('_') : ''}.json`, JSON.stringify(rep, null, 1)); process.exit(0);

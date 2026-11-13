// Kilumen optional PWA check (Playwright Chromium). Serves the repo on its own free port (never 8080/8093).
// 1) plain URL: no service worker, pwa_register.js never fetched (live game unchanged)
// 2) ?pwa=1: worker active, build id, shell precached, art cached at runtime, manifest installable (CDP)
// 3) a new build (BUILD_ID=<id>_next) takes over and its activate step deletes the old build's caches
// 4) with the web server stopped (true offline), a reload still boots the new build from cache
// The normal build is restored at the end. Page errors are only failed while online; offline ones are logged as INFO.
// 5) ?pwa=0 unregisters and deletes every kilumen- cache
// Usage: (cd tools/free_tools && npm ci) && node tests/pwa_e2e.mjs   -> shots/pwa/result.json
import { chromium } from 'playwright';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'shots/pwa'); fs.mkdirSync(OUT, { recursive: true });
const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const PORT = Number(process.env.PORT) || await freePort();
let server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const BASE = `http://127.0.0.1:${PORT}`;
for (let i = 0; i < 50; i++) { try { await fetch(BASE + '/index.html'); break; } catch { await new Promise((r) => setTimeout(r, 100)); } }
const build = (env = {}) => JSON.parse(execFileSync('node', ['tools/pwa_build.mjs'], { cwd: ROOT, env: { ...process.env, ...env } }).toString().trim().split('\n').pop());

const results = []; let fails = 0;
const check = (name, ok, info = '') => { results.push({ name, ok: !!ok, info }); if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${info ? '  ' + info : ''}`); };
const GAME = '/index.html?save=0&hour=12&clouds=0&life=0';
const gameReady = (page) => page.waitForFunction(() => window.kilumen && window.kilumen.scene && window.kilumen.scene.player, null, { timeout: 30000 });
const cacheInfo = (page) => page.evaluate(async () => { const o = {}; for (const k of await caches.keys()) o[k] = (await (await caches.open(k)).keys()).length; return o; });

const b1 = build();
const browser = await chromium.launch();
try {
  // 1) plain URL
  { const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }); const page = await ctx.newPage(); const reqs = [];
    page.on('request', (r) => reqs.push(r.url()));
    await page.goto(BASE + GAME); await gameReady(page); await page.waitForTimeout(1500);
    const regs = await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length);
    check('plain URL: no service worker registered', regs === 0, `registrations=${regs}`);
    check('plain URL: pwa_register.js / kilumen-sw.js never requested', !reqs.some((u) => /pwa_register|kilumen-sw/.test(u)));
    check('plain URL: page keeps the original manifest.webmanifest', await page.evaluate(() => document.querySelector('link[rel=manifest]').getAttribute('href') === 'manifest.webmanifest'));
    await ctx.close(); }

  // 2-5) ?pwa=1
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }); const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(BASE + GAME + '&pwa=1'); await gameReady(page);
  const st = await page.evaluate(() => window.kilumenPWA.ready.then((s) => ({ status: s.status, build: s.build })));
  check('?pwa=1: worker active', st.status === 'active', JSON.stringify(st));
  check('?pwa=1: build id reported by the worker matches the build', st.build === b1.buildId, `${st.build} vs ${b1.buildId}`);
  await page.reload(); await gameReady(page); await page.waitForTimeout(2500); // now controlled: art/audio go through the worker
  check('page is controlled by kilumen-sw.js', await page.evaluate(() => !!navigator.serviceWorker.controller && navigator.serviceWorker.controller.scriptURL.endsWith('/kilumen-sw.js')));
  const c1 = await cacheInfo(page);
  const pre = Object.entries(c1).find(([k]) => k.includes('precache')), art = Object.entries(c1).find(([k]) => k.endsWith('-art'));
  check('shell precached (all entries)', pre && pre[1] === b1.precacheEntries, JSON.stringify(c1));
  check('art runtime cache filled on use', art && art[1] > 20, art ? `${art[0]}: ${art[1]}` : 'none');
  check('every cache name carries the build id', Object.keys(c1).every((k) => k.includes(b1.buildId)), Object.keys(c1).join(', '));
  const cdp = await ctx.newCDPSession(page);
  const inst = await cdp.send('Page.getInstallabilityErrors');
  check('installable (Chromium reports no installability errors)', inst.installabilityErrors.length === 0, JSON.stringify(inst.installabilityErrors));
  const man = await cdp.send('Page.getAppManifest');
  const mj = JSON.parse(man.data || '{}');
  check('manifest: Kilumen name, landscape, icons', mj.short_name === 'Kilumen' && mj.orientation === 'landscape' && (mj.icons || []).length === 3, man.url);
  await page.screenshot({ path: path.join(OUT, '1_online_pwa.png') });

  // 3) new version
  const b2 = build({ BUILD_ID: b1.buildId + '_next' });
  await page.goto(BASE + GAME + '&pwa=1'); await gameReady(page);
  const swBuild = () => page.evaluate(() => new Promise((res) => { const c = navigator.serviceWorker.controller; if (!c) return res(null); const ch = new MessageChannel(); ch.port1.onmessage = (e) => res(e.data.build); c.postMessage({ type: 'KILUMEN_SW_BUILD' }, [ch.port2]); setTimeout(() => res(null), 1000); }));
  let now = null; for (let i = 0; i < 40 && now !== b2.buildId; i++) { await page.waitForTimeout(500); now = await swBuild(); }
  check('new build controls the page after one online load', now === b2.buildId, `controller build=${now}`);
  let names = []; for (let i = 0; i < 30; i++) { names = await page.evaluate(() => caches.keys());  if (names.length && names.every((k) => k.includes(b2.buildId))) break; await page.waitForTimeout(500); }
  await page.reload(); await gameReady(page); await page.waitForTimeout(2000);
  const c2 = await cacheInfo(page);
  check('new build took over and old caches were deleted', Object.keys(c2).length > 0 && Object.keys(c2).every((k) => k.includes(b2.buildId)) && !Object.keys(c2).some((k) => k.includes(b1.buildId + '-')), JSON.stringify(c2));

  const onlineErrors = errors.splice(0);
  // 4) offline
  server.kill(); await new Promise((r) => setTimeout(r, 300)); // server gone = origin fully offline (Playwright setOffline does not reliably reach service workers)
  await page.reload(); await gameReady(page); await page.waitForTimeout(1500);
  const off = await page.evaluate(() => ({ online: navigator.onLine, map: window.kilumen.scene.map && (window.kilumen.scene.map.id || window.kilumen.scene.map.name), canvas: (() => { const c = document.getElementById('world'); const d = c.getContext('2d').getImageData(c.width / 2 | 0, c.height / 2 | 0, 1, 1).data; return [...d]; })() }));
  check('offline reload boots the game from cache', !!off.map, JSON.stringify(off));
  await page.screenshot({ path: path.join(OUT, '2_offline_reload.png') });
  await page.goto(BASE + GAME + '&pwa=1&x=1'); await gameReady(page);
  check('offline: a different query string still opens (navigate fallback)', true);
  server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { try { await fetch(BASE + '/index.html'); break; } catch { await new Promise((r) => setTimeout(r, 100)); } }

  // 5) off switch
  await page.goto(BASE + GAME + '&pwa=0');
  await page.waitForFunction(() => window.kilumenPWA && window.kilumenPWA.status === 'removed', null, { timeout: 20000 }); await page.waitForTimeout(1500);
  const after = await page.evaluate(async () => ({ controlled: !!navigator.serviceWorker.controller, regs: (await navigator.serviceWorker.getRegistrations()).length, caches: (await caches.keys()).filter((k) => k.startsWith('kilumen-')) }));
  check('?pwa=0 unregisters and clears kilumen- caches', after.regs === 0 && after.caches.length === 0 && !after.controlled, JSON.stringify(after));
  check('no page errors while online', onlineErrors.length === 0, onlineErrors.slice(0, 3).join(' | '));
  results.push({ name: 'INFO offline page errors (art never visited online is not cached)', ok: true, info: errors.slice(0, 5).join(' | ') });
  await ctx.close();
} finally {
  await browser.close(); server.kill();
  const b = build(); // restore the normal build id
  fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify({ when: new Date().toString(), build: b, pass: results.length - fails, fail: fails, results }, null, 2));
}
console.log(`\n${results.length - fails}/${results.length} PASS`);
process.exit(fails ? 1 : 0);

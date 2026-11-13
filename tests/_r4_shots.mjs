import { chromium } from 'playwright';
import fs from 'node:fs'; import http from 'node:http'; import path from 'node:path';
const ROOT = '/workspace/wt_r4c/kilumen', OUT = '/workspace/kilumen/shots/r4_creatures_ingame';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg' };
const server = http.createServer((req, res) => { const f = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)); fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(b); }); });
await new Promise((r) => server.listen(0, '127.0.0.1', r)); const PORT = server.address().port;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MONS = (process.env.MONS || 'hushpine,cairnhorn,glintmoth,skivvet,aurorel,tbdcandle').split(',');
const PROF = { pc: { viewport: { width: 1280, height: 720 }, q: '&platform=pc' }, phone: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, q: '&platform=mobile' } };
const b = await chromium.launch(); const rep = {};
const st = (a) => { const s = a.slice(2).sort((x, y) => x - y); const q = (p) => +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(2); return { n: s.length, avg: +(s.reduce((x, y) => x + y, 0) / s.length).toFixed(2), p50: q(0.5), p95: q(0.95), max: +s.at(-1).toFixed(2), over16_7: s.filter((x) => x > 16.7).length }; };
const measure = async (page, ctx, ms) => { const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); await cdp.send('Performance.enable');
  const m0 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  const iv = await page.evaluate(async (ms) => { const iv = []; let last = performance.now(), go = true; const t = (n) => { iv.push(n - last); last = n; if (go) requestAnimationFrame(t); }; requestAnimationFrame(t); await new Promise((r) => setTimeout(r, ms)); go = false; return iv; }, ms);
  const m1 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  return { rafInterval: st(iv), mainThreadPerFrameMs: +(((m1.TaskDuration - m0.TaskDuration) * 1000) / iv.length).toFixed(2) }; };
for (const [prof, P] of Object.entries(PROF).filter(([k]) => !process.env.PROFS || process.env.PROFS.includes(k))) for (const mon of MONS) {
  const ctx = await b.newContext(P); await ctx.addInitScript(() => { for (const k of Object.keys(localStorage)) {} localStorage.setItem("kilumen_alpha_notice_seen.v1", "1"); }); const page = await ctx.newPage(); const errs = [], miss = [];
  page.on('pageerror', (e) => errs.push(String(e))); page.on('response', (r) => { if (r.status() >= 400) miss.push(r.url()); });
  await page.goto(`http://127.0.0.1:${PORT}/index.html?save=0&hour=12&clouds=0&audio=0&enc=0&title=0&skipintro=1&map=frostspire_pass&x=32&y=35${P.q}`);
  await page.waitForFunction(() => window.kilumen?.ui?.sdReady && window.kilumen.scene?.systems, null, { timeout: 40000 }).catch(async () => console.log("dbg", await page.evaluate(() => ({ k: !!window.kilumen, keys: window.kilumen && Object.keys(window.kilumen), body: document.body.innerText.slice(0, 300) })), errs, miss.slice(0, 5)));
  await page.evaluate(() => Promise.all([window.kilumen.ui.sdReady, window.kilumen.ui.wild?.ready]));
  for (let i = 0; i < 6 && await page.evaluate(() => !!window.kilumen.ui.active); i++) { await page.evaluate(() => window.kilumen.ui.closeAll()); await sleep(600); }
  await page.evaluate(async (mon) => { const { createCreature } = await import('/src/systems/creature.js'); const sc = window.kilumen.scene; const c = createCreature({ species: mon, level: 30 }); sc.party.unshift(c);
 }, mon);
  for (let k = 0; k < 8; k++) { if (!await page.evaluate(() => { const s = window.kilumen.scene; return !!(s.busy || s.dialog?.open || s.fade); })) break; await page.evaluate(() => window.kilumen.scene.dialog?.open ? window.kilumen.scene.dialog.advance?.() : 0); await page.keyboard.press('Enter'); await sleep(700); }
  await page.evaluate(() => window.kilumen.scene.startWarp({ map: 'frostspire_pass', x: 28, y: 33, facing: 'down' }, 'dev'));
  await page.waitForFunction(() => window.kilumen.scene.map?.name === 'frostspire_pass' && !window.kilumen.scene.fade, null, { timeout: 20000 }).catch(() => console.log('warp timeout'));
  await page.waitForFunction(() => window.kilumen.scene.map?.name === 'frostspire_pass' && !window.kilumen.scene.fade, null, { timeout: 20000 }).catch(() => {});
  await page.evaluate(async () => { const sc = window.kilumen.scene; sc._placeFollower?.(); await sc._loadActorSprites?.(); sc._dirty = true; });
  for (let i = 0; i < 2; i++) { await page.keyboard.down('ArrowLeft'); await sleep(260); await page.keyboard.up('ArrowLeft'); await sleep(250); }
  console.log("map", await page.evaluate(() => [window.kilumen.scene.map?.name, window.kilumen.scene.player?.x, window.kilumen.scene.player?.y]));
  await page.keyboard.down('ArrowDown'); await sleep(120); await page.keyboard.up('ArrowDown');
  await sleep(1500); await page.screenshot({ path: `${OUT}/${mon}_overworld_${prof}.png` });
  const fol = await page.evaluate(() => { const f = window.kilumen.scene.follower; return f ? { species: f.species, sheetW: f.sheet?.naturalWidth || f.sheet?.width || 0 } : null; });
  const owPerf = prof === 'phone' ? await measure(page, ctx, 5000) : null;
  await page.evaluate((mon) => { const ui = window.kilumen.ui; ui.closeAll(); ui.open('battle', { foe: mon, foeLevel: 30, biome: 'snow' }); }, mon);
  await page.waitForFunction(() => { const i = [...document.querySelectorAll('.ui-battle img')].filter((x) => /creatures\//.test(x.src)); return i.length >= 2 && i.every((x) => x.complete && x.naturalWidth > 0); }, null, { timeout: 20000 }).catch(() => {});
  await sleep(2500);
  for (let n = 0; n < 12; n++) { if (await page.locator('#b-cmds:not([hidden]) .b-cmd').count()) break; await page.locator('#b-msg').first().click({ timeout: 2000 }).catch(() => {}); await sleep(500); }
  await sleep(500); await page.screenshot({ path: `${OUT}/${mon}_battle_${prof}.png` });
  const imgs = await page.evaluate(() => [...document.querySelectorAll('.ui-battle img')].filter((x) => /creatures\//.test(x.src)).map((x) => [x.src.split('/').slice(-2).join('/'), x.naturalWidth]));
  const btPerf = prof === 'phone' ? await measure(page, ctx, 5000) : null;
  rep[`${mon}_${prof}`] = { follower: fol, battleImgs: imgs, owPerf, btPerf, errs, miss };
  console.log(mon, prof, JSON.stringify(rep[`${mon}_${prof}`]));
  await ctx.close();
}
await b.close(); server.close(); fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(rep, null, 1));

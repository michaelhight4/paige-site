// Creature sync smoke test (Oct 23, 2026): synced species as lead (overworld follower, party screen) and as a wild foe in the engine
// battle, on PC 1920x1080 and phone landscape (780x360 CSS @3x). Fails on page errors / 404s for creature art.
// Usage: PORT=<http.server port> LEAD=peeplark FOE=geodrake node tests/creatures_sync_smoke.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
// own static server unless PORT is given (other workers' http.servers come and go)
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json' };
let server = null;
if (!process.env.PORT) {
  server = http.createServer((req, res) => { const f = path.join(process.cwd(), decodeURIComponent(new URL(req.url, 'http://x').pathname));
    fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(b); }); });
  await new Promise((r) => server.listen(0, '127.0.0.1', r)); process.env.PORT = String(server.address().port);
}
const PORT = process.env.PORT, LEAD = process.env.LEAD || 'peeplark', FOE = process.env.FOE || 'geodrake';
const OUT = process.env.OUT || 'shots/creatures_overnight'; fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PROFILES = {
  pc: { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, hasTouch: false, isMobile: false, q: '&platform=pc' },
  phone: { viewport: { width: 780, height: 360 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true, q: '&platform=mobile' },
};
const browser = await chromium.launch();
const report = {}; let bad = 0;
for (const [prof, P] of Object.entries(PROFILES)) {
  const ctx = await browser.newContext(P); const page = await ctx.newPage();
  const errs = [], miss = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  page.on('response', (r) => { if (r.status() >= 400 && /creatures\/|icons\//.test(r.url())) miss.push(r.url()); });
  await page.goto(`http://127.0.0.1:${PORT}/index.html?save=0&hour=12&clouds=0&audio=0&bseed=1,2,3,4&enc=1${P.q}`);
  await page.waitForFunction(() => window.kilumen?.ui?.sdReady && window.kilumen.scene.systems && window.kilumen.ui.wild?.ready, null, { timeout: 30000 });
  await page.evaluate(() => Promise.all([window.kilumen.ui.sdReady, window.kilumen.ui.wild.ready]));
  const info = await page.evaluate(async (lead) => {
    const { createCreature } = await import('/src/systems/creature.js');
    const k = window.kilumen, sc = k.scene, c = createCreature({ species: lead, level: 14 });
    sc.party.unshift(c); sc._placeFollower(); await sc._loadActorSprites(); sc._dirty = true;
    const ro = k.ui.wild.roller;
    return { lead: c.species, skills: c.skills, table: ro?.data?.generated || 'live encounters.json', route1: ro?.data?.zones?.sunmeadow_grass?.slots?.length };
  }, LEAD);
  for (let i = 0; i < 3; i++) { await page.keyboard.down('ArrowDown'); await sleep(260); await page.keyboard.up('ArrowDown'); await sleep(250); }
  await sleep(1200);
  await page.screenshot({ path: `${OUT}/overworld_follower_${prof}.png` });
  const fol = await page.evaluate(() => { const f = window.kilumen.scene.follower; return f && { species: f.species, sheet: f.sheet?.naturalWidth || f.sheet?.width || 0 }; });
  info.follower = fol;
  await page.evaluate(() => window.kilumen.ui.open('team')); await sleep(1200);
  await page.screenshot({ path: `${OUT}/party_${prof}.png` });
  await page.evaluate(() => window.kilumen.ui.closeAll());
  await page.evaluate(({ foe }) => { const ui = window.kilumen.ui; ui.closeAll(); ui.open('battle', { foe, foeLevel: 12, biome: 'cave' }); }, { foe: FOE });
  await page.waitForFunction(() => { const i = [...document.querySelectorAll('.ui-battle img')].filter((x) => /creatures\//.test(x.src)); return i.length >= 2 && i.every((x) => x.complete && x.naturalWidth > 0); }, null, { timeout: 20000 }).catch(() => {});
  await sleep(2500);
  const st = await page.evaluate(() => ({ imgs: [...document.querySelectorAll('.ui-battle img')].filter((x) => /creatures\//.test(x.src)).map((x) => [x.src.split('/').pop(), x.naturalWidth]), msg: document.querySelector('#b-msg')?.textContent || '' }));
  // advance intro text until commands show, then use one skill
  for (let n = 0; n < 12; n++) { const c = await page.locator('#b-cmds:not([hidden]) .b-cmd').count(); if (c) break; await page.locator('#b-msg').first().click({ timeout: 2000 }).catch(() => {}); await sleep(500); }
  await page.screenshot({ path: `${OUT}/battle_${prof}.png` });
  let used = false;
  try { await page.locator('#b-cmds .b-cmd[data-i="0"]').first().click({ timeout: 4000 }); await sleep(300); await page.locator('#b-cmds .b-cmd:not([style*="opacity"])').first().click({ timeout: 4000 }); used = true; } catch {}
  await sleep(3000);
  await page.screenshot({ path: `${OUT}/battle_${prof}_turn1.png` });
  const after = await page.evaluate(() => document.querySelector('#b-msg')?.textContent || '');
  const battleErrs = errs.splice(0); // later errors: force-closing the battle mid-turn (test only) can leave its timers on removed DOM
  await page.evaluate(() => { const ui = window.kilumen.ui; ui.closeAll(); ui.open('kilindex'); }); await sleep(800);
  await page.evaluate((id) => { const ui = window.kilumen.ui, i = ui.top?.count ? [...document.querySelectorAll('[data-scr="kilindex"] [data-i]')].findIndex((e) => e.textContent.includes(id[0].toUpperCase() + id.slice(1))) : -1; if (i >= 0) ui._select(i); }, LEAD);
  await sleep(800);
  await page.screenshot({ path: `${OUT}/kilindex_${prof}.png` });
  report[prof] = { ...info, battleImgs: st.imgs, introMsg: st.msg.slice(0, 120), usedSkill: used, afterMsg: after.slice(0, 160), errors: battleErrs, afterForceClose: errs, missing: miss };
  if (battleErrs.length || miss.length || st.imgs.length < 2 || st.imgs.some(([, w]) => !w)) bad++;
  await ctx.close();
}
await browser.close(); server?.close();
fs.writeFileSync(`${OUT}/smoke_report.json`, JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
process.exit(bad ? 1 : 0);

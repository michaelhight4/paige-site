// Interiors v2 live-tree check (Oct 29 2026). Usage: node tests/interiors_live_check.mjs <baseUrl> <tag> [query]
import { chromium } from 'playwright'; import fs from 'node:fs';
const BASE = process.argv[2], TAG = process.argv[3] || 'local', QS = process.argv[4] || '';
const OUT = '/workspace/kilumen/shots/interiors_live'; fs.mkdirSync(OUT, { recursive: true });
const ROOMS = (process.env.ROOMS || 'house_1f:5:7,house_2f:4:6,shop_int:5:6,office_int:5:6,heal_brookhollow:6:8,lab_brookhollow:6:8,home_brookhollow_a:5:6').split(',').map((s) => { const [map, x, y] = s.split(':'); return { map, x: +x, y: +y }; });
const DEVS = { pc: { viewport: { width: 1280, height: 720 } }, phone: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 } };
const browser = await chromium.launch(); const rep = { errors: [] };
const warp = (page, sp) => page.evaluate(async (sp) => { const s = window.kilumen.scene; s.fade = null; s.startWarp(sp, 'door'); for (let i = 0; i < 200 && (s.fade || s.map.name !== sp.map); i++) await new Promise((r) => setTimeout(r, 50)); return s.map.name; }, sp);
for (const [dev, opt] of Object.entries(DEVS)) {
  const ctx = await browser.newContext(opt); const page = await ctx.newPage();
  page.on('pageerror', (e) => rep.errors.push(dev + ': ' + e)); page.on('console', (m) => { if (m.type() === 'error') rep.errors.push(dev + ' console: ' + m.text()); });
  await page.goto(BASE + 'kilumen/index.html' + QS);
  await page.waitForFunction(() => window.kilumen?.scene?.tileset, null, { timeout: 30000 }); await page.evaluate(() => window.kilumen.ready);
  await page.waitForTimeout(1500); await page.keyboard.press('Enter').catch(() => {}); await page.waitForTimeout(800);
  rep[dev] = { version: await page.evaluate(() => [...document.querySelectorAll('script[src],link[href]')].map((e) => e.src || e.href).find((u) => /\?v=/.test(u)) || ''), ix2: await page.evaluate(() => !!window.kilumen.scene.ixlight?.flags.ix2), devchip: await page.evaluate(() => !!document.querySelector('.kdev-chip')), rooms: [] };
  await page.evaluate(() => document.querySelectorAll('.ui-title,.title,[class*=title]').forEach((e) => { if (e.offsetHeight > 200) e.style.display = 'none'; }));
  for (const r of ROOMS) for (const h of [12, 22]) {
    const got = await warp(page, { map: r.map, x: r.x, y: r.y, facing: 'down' });
    await page.evaluate((h) => { window.kilumen.scene.setHour(h); }, h); await page.waitForTimeout(700);
    const f = `${OUT}/${TAG}_${dev}_${r.map}_${h === 12 ? 'day' : 'night'}.png`; await page.screenshot({ path: f });
    rep[dev].rooms.push({ map: r.map, got, phase: await page.evaluate(() => window.kilumen.scene.phase), mapUrl: await page.evaluate(() => window.kilumen.scene.mapUrl('house_1f')) });
  }
  // exit test: stand on the house_1f mat and walk out the front door
  await warp(page, { map: 'house_1f', x: 5, y: 8, facing: 'down' }); await page.waitForTimeout(400);
  await page.keyboard.down('ArrowDown'); await page.waitForTimeout(600); await page.keyboard.up('ArrowDown');
  await page.waitForFunction(() => window.kilumen.scene.map.name === 'brookhollow' && !window.kilumen.scene.fade, null, { timeout: 8000 }).catch(() => {});
  rep[dev].exit = await page.evaluate(() => { const s = window.kilumen.scene; return { map: s.map.name, x: s.player.x, y: s.player.y }; });
  await page.screenshot({ path: `${OUT}/${TAG}_${dev}_exit.png` });
  // save/load: state survives a save + reload through the scene's store
  rep[dev].save = await page.evaluate(async () => { const s = window.kilumen.scene; try { const st = s.save?.(); return st ? 'save() ok' : 'no save() method'; } catch (e) { return 'save err ' + e.message; } });
  await ctx.close();
}
await browser.close(); fs.writeFileSync(`${OUT}/${TAG}_report.json`, JSON.stringify(rep, null, 1)); console.log(JSON.stringify(rep, null, 1).slice(0, 4000));

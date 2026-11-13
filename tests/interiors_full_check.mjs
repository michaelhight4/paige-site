// FULL interiors overhaul check (Oct 29 2026, v0.2.41): every interior map, PC + phone, day + night, plus ?ix2=0 "before" shots
// and a walk-out exit test per room. Usage: node tests/interiors_full_check.mjs <baseUrl> <tag> [before=1]
import { chromium } from 'playwright'; import fs from 'node:fs';
const BASE = process.argv[2], TAG = process.argv[3] || 'local', BEFORE = process.argv[4] === '1';
const OUT = '/workspace/kilumen/shots/interiors_full'; fs.mkdirSync(OUT, { recursive: true });
const MAPDIR = '/workspace/ps_clone/kilumen/art/world/overworld/maps/';
const ROOMS = (process.env.ROOMS ? process.env.ROOMS.split(',') : fs.readdirSync(MAPDIR).map((f) => f.replace(/\.json$/, '')).filter((m) => /_int$|^heal_|^home_|^house_|^lab_|^rt_branch/.test(m) && m !== 'house_1f_v2'))
  .map((map) => { const d = JSON.parse(fs.readFileSync(MAPDIR + map + '.json')); const w = [...d.warps].filter((w) => w.to !== map && !/_2f|_1f/.test(w.to) || w.to === '$return').sort((a, b) => b.y - a.y)[0] || d.warps[0]; return { map, w }; });
const DEVS = { pc: { viewport: { width: 1280, height: 720 } }, phone: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 } };
const browser = await chromium.launch(); const rep = { errors: [], rooms: {} };
const warp = (page, sp) => page.evaluate(async (sp) => { const s = window.kilumen.scene; s.fade = null; s.startWarp(sp, 'door'); for (let i = 0; i < 200 && (s.fade || s.map.name !== sp.map); i++) await new Promise((r) => setTimeout(r, 50)); return s.map.name; }, sp);
const variants = BEFORE ? [['before', '?ix2=0']] : [['after', '']];
for (const [vt, qs] of variants) for (const [dev, opt] of Object.entries(DEVS)) {
  const ctx = await browser.newContext(opt); const page = await ctx.newPage();
  page.on('pageerror', (e) => rep.errors.push(`${vt} ${dev}: ${e}`)); page.on('console', (m) => { if (m.type() === 'error') rep.errors.push(`${vt} ${dev} console: ${m.text()}`); });
  await page.goto(BASE + 'kilumen/index.html' + qs);
  await page.waitForFunction(() => window.kilumen?.scene?.tileset, null, { timeout: 30000 }); await page.evaluate(() => window.kilumen.ready);
  await page.waitForTimeout(1500); for (let i = 0; i < 6; i++) { await page.keyboard.press('Enter').catch(() => {}); await page.waitForTimeout(250); }
  rep[`${vt}_${dev}`] = { version: await page.evaluate(() => [...document.querySelectorAll('script[src],link[href]')].map((e) => e.src || e.href).find((u) => /\?v=/.test(u)) || ''), ix2: await page.evaluate(() => !!window.kilumen.scene.ixlight?.flags.ix2) };
  for (const { map, w } of ROOMS) {
    const r = (rep.rooms[map] ||= { warp: w });
    for (const h of [12, 22]) {
      const got = await warp(page, { map, x: w.x, y: Math.max(1, w.y - 2), facing: 'up' });
      for (let i = 0; i < 4; i++) { await page.keyboard.press('f'); await page.waitForTimeout(150); }
      await page.evaluate((h) => { window.kilumen.scene.setHour(h); }, h); await page.waitForTimeout(600);
      await page.screenshot({ path: `${OUT}/${TAG}_${vt}_${dev}_${map}_${h === 12 ? 'day' : 'night'}.png` });
      if (got !== map) r[`${vt}_${dev}_load`] = 'FAILED got ' + got;
    }
    r[`${vt}_${dev}_cam`] = await page.evaluate(() => { const s = window.kilumen.scene; return s._cam ? { y: s._cam.y } : null; });
    if (vt === 'after') { // exit: stand on the tile above the door warp, walk down
      await warp(page, { map, x: w.x, y: w.y - 1, facing: 'down' }); await page.waitForTimeout(300);
      for (let i = 0; i < 4; i++) { await page.keyboard.press('f'); await page.waitForTimeout(150); }
      await page.keyboard.down('ArrowDown'); await page.waitForTimeout(700); await page.keyboard.up('ArrowDown');
      await page.waitForFunction((m) => window.kilumen.scene.map.name !== m && !window.kilumen.scene.fade, map, { timeout: 6000 }).catch(() => {});
      r[`${dev}_exit`] = await page.evaluate(() => { const s = window.kilumen.scene; return `${s.map.name} ${s.player.x},${s.player.y}`; });
    }
  }
  await ctx.close();
}
await browser.close(); fs.writeFileSync(`${OUT}/${TAG}_${BEFORE ? 'before' : 'after'}_report.json`, JSON.stringify(rep, null, 1));
console.log('errors', rep.errors.length, rep.errors.slice(0, 8)); for (const [m, r] of Object.entries(rep.rooms)) console.log(m, r.pc_exit, '|', r.phone_exit, r.after_pc_load || '', r.after_phone_load || '');

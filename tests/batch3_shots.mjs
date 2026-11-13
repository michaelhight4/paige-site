// Batch 3 (Oct 22, 2026): text_pending NPCs in place, short interiors pinned to the bottom, prompts from the profile,
// mobile toast/battle offsets. Same style as tests/platform_shots.mjs. Does NOT run tests/shots.mjs.
// Usage: PORT=<running http.server port> node tests/batch3_shots.mjs   (no PORT: starts and stops its own server)
//        -> shots/batch3/*.png + report.json; then python3 tests/batch3_contact_sheet.py
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'shots/batch3');
fs.mkdirSync(OUT, { recursive: true });
let PORT = Number(process.env.PORT) || 0, server = null;
if (!PORT) {
  PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
  server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
}
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }

const DEVICES = {
  pc: { w: 1920, h: 1080, dpr: 1, touch: false },
  mobile: { w: 844, h: 390, dpr: 2, touch: true },
  phone2340: { w: 780, h: 360, dpr: 3, touch: true },
};
// npc: stand on a free floor tile next to it and face it ('talk' opens the real dialogue via interact())
const SCENES = [
  { tag: 'heal_brookhollow_npcs', map: 'heal_brookhollow', npc: 'technician' },
  { tag: 'lab_brookhollow_npcs', map: 'lab_brookhollow', npc: 'researcher' },
  { tag: 'home_brookhollow_b_npcs', map: 'home_brookhollow_b', npc: 'parent' },
  { tag: 'short_interior_home_brookhollow_a', map: 'home_brookhollow_a', npc: 'owner' },
  { tag: 'dialogue_heal_technician', map: 'heal_brookhollow', npc: 'technician', talk: true },
  { tag: 'dialogue_prompts_toast', map: 'home_fernwick_a', npc: 'parent', prompts: true },
  { tag: 'battle_image_route1', map: 'route1', battle: true },
];
const CASES = [
  ...['pc', 'mobile'].flatMap((d) => SCENES.map((s) => ({ dev: d, ...s }))),
  // World Design ask: the fernwick_hall_int guide (10,16) vs the touch buttons on a 2340x1080 phone with bottom-pin on
  { dev: 'phone2340', tag: 'hall_guide_2340', map: 'fernwick_hall_int', npc: 'guide', stand: [10, 15], facing: 'down' },
  { dev: 'mobile', tag: 'hall_guide', map: 'fernwick_hall_int', npc: 'guide', stand: [10, 15], facing: 'down' },
];
const inter = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

const browser = await chromium.launch();
const report = [];
try {
  for (const c of CASES) {
    const d = DEVICES[c.dev];
    const ctx = await browser.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: d.dpr, hasTouch: d.touch, isMobile: d.touch });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`${base}?save=0&timescale=0&hour=12&map=${c.map}&x=1&y=1`);
    await page.waitForFunction(() => window.kilumen?.scene?.tileset, null, { timeout: 15000 });
    await page.evaluate(() => window.kilumen.ready);
    await page.waitForTimeout(300);
    const setup = await page.evaluate(async (c) => {
      const s = window.kilumen.scene, m = s.map, p = s.player;
      const ids = s.npcs.list.map((n) => n.def?.id || n.id);
      let target = null, stand = null;
      if (c.npc) {
        target = s.npcs.list.find((n) => { const id = n.def?.id || n.id; return id === c.npc || id === `${m.name}_${c.npc}`; }); // text_pending ids carry the map prefix
        if (!target) return { ids, error: `npc ${c.npc} not on ${m.name}` };
        const tx = target.x, ty = target.y;
        const opts = c.stand ? [[...c.stand, c.facing]] : [[tx, ty + 1, 'up'], [tx - 1, ty, 'right'], [tx + 1, ty, 'left'], [tx, ty - 1, 'down']];
        for (const [x, y, f] of opts) {
          if (c.stand || (m.inBounds(x, y) && m.code(x, y) === 0 && !m.npcAt(x, y))) { stand = [x, y, f]; break; }
        }
        if (stand) { p.x = stand[0]; p.y = stand[1]; p.facing = stand[2]; }
      }
      if (c.talk) s.interact();
      if (c.prompts) {
        const L = s.lines; s.say([...L.items.running_shoes.tip, ...L.items.bike.tip], { name: 'Tip' });
        s.toast('Toast check: the path ahead is closed.');
      }
      if (c.battle) {
        const n = s.npcs.list.find((n) => n.sprite?.trainer_64x128);
        if (n) { s.say(['You looked my way. That means a battle!'], s.speakerFor(n, true)); s.toast('Toast check: battle line.'); }
      }
      return { ids, stand, target: target && { id: c.npc, x: target.x, y: target.y } };
    }, c);
    await page.waitForTimeout(c.talk || c.prompts || c.battle ? 900 : 400);
    const m = await page.evaluate((tgt) => {
      const R = (el) => { if (!el || el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return null; const b = el.getBoundingClientRect(); if (!b.width) return null; return { left: Math.round(b.left), top: Math.round(b.top), right: Math.round(b.right), bottom: Math.round(b.bottom) }; };
      const s = window.kilumen.scene, cv = document.getElementById('world'), cr = cv.getBoundingClientRect(), k = cr.width / cv.width, z = s.zoom, T = 64;
      const cam = s._cam;
      const scr = (x, y, w, h) => ({ left: Math.round(cr.left + (x * T - cam.x) * z * k), top: Math.round(cr.top + (y * T - cam.y) * z * k), right: Math.round(cr.left + ((x + w) * T - cam.x) * z * k), bottom: Math.round(cr.top + ((y + h) * T - cam.y) * z * k) });
      const tp = document.getElementById('touchpad');
      const btns = tp.hidden ? [] : [...tp.querySelectorAll('button')].filter((b) => b.offsetParent && getComputedStyle(b).visibility !== 'hidden').map((b) => ({ id: b.dataset.dir || b.dataset.btn, rect: R(b) }));
      const dlgOpen = !!document.querySelector('.dlg-wrap:not([hidden]) .dlg-box') && getComputedStyle(document.querySelector('.dlg-box')).display !== 'none';
      return {
        platform: window.kilumen.platform?.id, zoom: z, cam: { x: cam.x, y: cam.y },
        mapPx: { w: s.map.width * T, h: s.map.height * T }, viewNative: { w: cv.width / z, h: cv.height / z },
        dlg: dlgOpen ? R(document.querySelector('.dlg-box')) : null, dlgText: dlgOpen ? document.querySelector('.dlg-box')?.innerText.slice(0, 160) : null,
        battle: R(document.querySelector('.dlg-battle')), portrait: R(document.querySelector('.dlg-portrait')), toast: R(document.getElementById('toast')),
        btns, target: tgt ? { tile: scr(tgt.x, tgt.y, 1, 1), sprite: scr(tgt.x, tgt.y - 1, 1, 2) } : null,
      };
    }, setup.target);
    const pinnedBottom = m.mapPx.h - m.viewNative.h > 0 ? Math.abs(m.cam.y - Math.floor(m.mapPx.h - m.viewNative.h)) < 1 : null;
    const hit = (r) => (r ? m.btns.filter((b) => inter(b.rect, r) > 0).map((b) => b.id) : []);
    const name = `${c.dev}_${c.tag}.png`;
    await page.screenshot({ path: path.join(OUT, name) });
    const row = { ...c, ...d, file: name, ...setup, ...m, pinnedBottom, overlaps: { dlg: hit(m.dlg), toast: hit(m.toast), battle: hit(m.battle), portrait: hit(m.portrait), targetTile: hit(m.target?.tile), targetSprite: hit(m.target?.sprite) }, errors };
    report.push(row);
    console.log(`${name}: ${m.platform} z=${m.zoom} cam=${JSON.stringify(m.cam)} map=${m.mapPx.w}x${m.mapPx.h} view=${m.viewNative.w}x${m.viewNative.h} pinned=${pinnedBottom} npcs=[${setup.ids}] stand=${JSON.stringify(setup.stand)} dlg=${JSON.stringify(m.dlg)} battle=${JSON.stringify(m.battle)} toast=${JSON.stringify(m.toast)} target=${JSON.stringify(m.target)} overlaps=${JSON.stringify(row.overlaps)} text=${JSON.stringify(m.dlgText)} errors=${errors.length}${setup.error ? ' ERR ' + setup.error : ''}`);
    await ctx.close();
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));

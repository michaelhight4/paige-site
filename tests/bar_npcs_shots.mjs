// Bar NPCs fix (Oct 29, 2026): The Firefly (club_int) cast was placed (solid + talkable) but had no npc_sprite_map
// entries, so nothing was drawn. Shots at night (DJ on stage) and day (DJ asleep in booth), PC 1920x1080 + phone 2340x1080.
// Usage: node tests/bar_npcs_shots.mjs before|after  -> shots/bar_npcs_fix/<phase>_*.png + <phase>_report.json
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const PHASE = process.argv[2] || 'after';
const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// SITE: game tree to serve (default this tree; pass the live clone, e.g. /workspace/ps_clone/kilumen). FIXED_MAP: optional
// patched npc_sprite_map.json served in place of the site's (preview a fix without touching the publish tree).
const ROOT = process.env.SITE || HERE, FIXED_MAP = process.env.FIXED_MAP || '';
const OUT = path.join(HERE, 'shots/bar_npcs_fix');
fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const PC = { plat: 'pc', w: 1920, h: 1080, dpr: 1, touch: false };
const PHONE = { plat: 'phone', w: 780, h: 360, dpr: 3, touch: true, tag: '2340x1080' };
const CASES = [];
for (const d of [PC, PHONE]) for (const hour of [22, 12]) CASES.push({ ...d, hour, label: hour === 22 ? 'night' : 'day' });
const browser = await chromium.launch();
const report = [];
try {
  for (const c of CASES) {
    const ctx = await browser.newContext({ viewport: { width: c.w, height: c.h }, deviceScaleFactor: c.dpr, hasTouch: c.touch, isMobile: c.touch });
    const page = await ctx.newPage();
    await page.addInitScript(() => { try { localStorage.setItem('kilumen_alpha_notice_seen.v1', '1'); } catch {} }); // skip the alpha notice
    if (FIXED_MAP) await page.route('**/npc_sprite_map.json*', (r) => r.fulfill({ contentType: 'application/json', body: fs.readFileSync(FIXED_MAP, 'utf8') }));
    const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`${base}?save=0&timescale=0&hour=${c.hour}&audio=0&online=0&title=0&map=club_int&x=7&y=11&facing=up`);
    await page.waitForFunction(() => window.kilumen && window.kilumen.scene && window.kilumen.scene.tileset, null, { timeout: 15000 });
    await page.evaluate(() => window.kilumen.ready);
    // the alpha build ignores ?map/?hour, so walk in the same way a door does: Enter past the title, setHour, startWarp
    for (let i = 0; i < 4; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(600); }
    await page.waitForFunction(() => !window.kilumen.scene.fade, null, { timeout: 15000 }); // boot fade-in must end first (startWarp ignores calls mid-fade)
    await page.evaluate(async (h) => { const s = window.kilumen.scene; s.setHour(h); s.startWarp({ map: 'club_int', x: 7, y: 11, facing: 'up' }, 'door'); }, c.hour);
    await page.waitForFunction(() => window.kilumen.scene.map?.name === 'club_int' && !window.kilumen.scene.fade, null, { timeout: 15000 });
    await page.waitForTimeout(1500);
    const mapName = await page.evaluate(() => window.kilumen.scene.map?.name);
    const npcs = await page.evaluate(() => window.kilumen.scene.npcs.list.map((n) => ({ id: n.id, x: n.x, y: n.y, sprite: n.sprite?.sprite_id || null, drawn: !!n.imgs?.[1] })));
    const file = `${PHASE}_${c.plat}_${c.tag || `${c.w}x${c.h}`}_${c.label}.png`;
    await page.screenshot({ path: path.join(OUT, file) });
    report.push({ ...c, file, mapName, npcs, drawn: npcs.filter((n) => n.drawn).length, total: npcs.length, errors });
    console.log(file, mapName, `${npcs.filter((n) => n.drawn).length}/${npcs.length} drawn`, errors.length ? errors : '');
    await ctx.close();
  }
} finally { await browser.close(); server.kill(); }
fs.writeFileSync(path.join(OUT, `${PHASE}_report.json`), JSON.stringify(report, null, 1));

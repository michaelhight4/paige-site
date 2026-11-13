// Progression pass shots (Oct 23, 2026): quests HUD / log / NPC give, Master battles, hall puzzle previews, PC + phone.
// Usage: node tests/progression_shots.mjs -> shots/overnight_systems/pg_*.png + contact_sheet_quests_halls.png (python3 + PIL)
import { chromium } from 'playwright';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'shots/overnight_systems');
fs.mkdirSync(OUT, { recursive: true });
let PORT = Number(process.env.PORT) || 0, server = null;
if (!PORT) {
  PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
  server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
}
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DEVICES = { pc: { w: 1920, h: 1080, dpr: 1, touch: false }, phone: { w: 844, h: 390, dpr: 2, touch: true } };
const QF = 'flg_promoted,got_starter';
const talkTo = (id) => async (page) => page.evaluate((id) => {
  const s = kilumen.scene, m = s.map, n = s.npcs.list.find((n) => (n.def?.id || n.id) === id); if (!n) return 'missing ' + id;
  for (const [x, y, f] of [[n.x, n.y + 1, 'up'], [n.x - 1, n.y, 'right'], [n.x + 1, n.y, 'left'], [n.x, n.y - 1, 'down']])
    if (m.inBounds(x, y) && m.code(x, y) === 0 && !m.npcAt(x, y)) { s.player.place(x, y, f); break; }
  s.interact(); return 'ok';
}, id);
const SCENES = [
  { id: 'quest_hud', q: `pg=quests&flags=${QF}&map=brookhollow&x=6&y=20`, run: async () => sleep(900) },
  { id: 'quest_log', q: `pg=quests&flags=${QF}&map=brookhollow&x=6&y=20`, run: async (page) => { await sleep(700); await page.evaluate(() => { kilumen.ui.open('phone'); kilumen.ui.open('tasks'); }); await sleep(700); } },
  { id: 'quest_give', q: `pg=quests&flags=${QF}&map=brookhollow&x=6&y=20`, run: async (page) => { await sleep(700); const r = await talkTo('villager_garden')(page); await sleep(1100); return r; } },
  { id: 'master_saltmere', q: 'pg=masters&master=saltmere&map=brookhollow&x=6&y=20', run: async () => sleep(2500) },
  { id: 'master_cindervale', q: 'pg=masters&master=cindervale&map=brookhollow&x=6&y=20', run: async () => sleep(2500) },
  ...['saltmere', 'revival_heights', 'frostspire', 'mirefen', 'tidewater_coast', 'lanternport', 'cindervale'].map((z) => ({ id: `hall_${z}`, q: `pg=hallPuzzles&hall=${z}&map=brookhollow&x=6&y=20`, pcOnly: z !== 'revival_heights', run: async () => sleep(900) })),
  { id: 'hall_saltmere_solved', q: 'pg=hallPuzzles&hall=saltmere&map=brookhollow&x=6&y=20', run: async (page) => { await sleep(800);
    await page.evaluate(async () => { const d = await kilumen.progression.loadPuzzle('saltmere'); const o = document.getElementById('pg-puzzle'); o?.remove(); const ov = await kilumen.progression.openPuzzle('saltmere'); for (const a of d.verified.shortest_solution.split(' ')) ov.rt.act(a); ov.act('L'); ov.act('R'); }); await sleep(500); } },
];
const browser = await chromium.launch(); const files = [], report = [];
try {
  for (const dev of ['pc', 'phone']) for (const sc of SCENES) {
    if (dev === 'phone' && sc.pcOnly) continue;
    const d = DEVICES[dev];
    const ctx = await browser.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: d.dpr, hasTouch: d.touch, isMobile: d.touch });
    const page = await ctx.newPage(); const errors = [];
    page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`${base}?save=0&timescale=0&hour=12&platform=${dev === 'pc' ? 'pc' : 'mobile'}&${sc.q}`);
    await page.waitForFunction(() => window.kilumen?.scene?.tileset, null, { timeout: 20000 });
    await page.evaluate(() => window.kilumen.ready); await page.waitForFunction(() => window.kilumen.progression, null, { timeout: 15000 });
    const r = await sc.run(page);
    const info = await page.evaluate(() => ({ hud: document.getElementById('pg-quest-hud')?.innerText || null, flags: [...kilumen.scene.flags].filter((f) => f.startsWith('q_')), dlg: document.querySelector('.dlg-box')?.innerText?.slice(0, 120) || null }));
    const f = `pg_${dev}_${sc.id}.png`; await page.screenshot({ path: path.join(OUT, f) }); files.push(f);
    report.push({ file: f, r, ...info, errors }); console.log(f, JSON.stringify({ r, ...info, errors: errors.slice(0, 3) }));
    await ctx.close();
  }
} finally { await browser.close(); if (server) server.kill(); }
fs.writeFileSync(path.join(OUT, 'pg_report.json'), JSON.stringify(report, null, 1));
execFileSync('python3', ['-c', `
import sys
from PIL import Image, ImageDraw
fs = sys.argv[2:]; out = sys.argv[1]
W = 480; tiles = []
for f in fs:
    im = Image.open(f).convert('RGB'); im.thumbnail((W, 300)); tiles.append((f.split('/')[-1], im))
cols = 4; rows = (len(tiles) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (W + 8) + 8, rows * 318 + 8), (24, 20, 30)); d = ImageDraw.Draw(sheet)
for i, (n, im) in enumerate(tiles):
    x = 8 + (i % cols) * (W + 8); y = 8 + (i // cols) * 318
    sheet.paste(im, (x, y + 16)); d.text((x, y + 2), n, fill=(244, 234, 210))
sheet.save(out)
`, path.join(OUT, 'contact_sheet_quests_halls.png'), ...files.map((f) => path.join(OUT, f))]);
console.log('contact sheet ok', files.length);

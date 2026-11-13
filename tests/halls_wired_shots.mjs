// Hall wiring smoke shots (Coder, Oct 23, 2026): town door -> overnight hall, hall NPCs placed, Master text, Mirefen
// darkness puzzle (0 and 2 reed lamps lit). PC + phone profiles.
// Usage: node tests/halls_wired_shots.mjs -> shots/halls_wired_v1/*.png + contact_sheet.png + report.json (python3 + PIL)
import { chromium } from 'playwright';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'shots/halls_wired_v1');
fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DEVICES = { pc: { w: 1920, h: 1080, dpr: 1, touch: false }, phone: { w: 844, h: 390, dpr: 2, touch: true } };
const talkTo = (id) => async (page) => page.evaluate((id) => {
  const s = kilumen.scene, m = s.map, n = s.npcs.list.find((n) => (n.def?.id || n.id) === id); if (!n) return 'missing ' + id;
  for (const [x, y, f] of [[n.x, n.y + 1, 'up'], [n.x - 1, n.y, 'right'], [n.x + 1, n.y, 'left'], [n.x, n.y - 1, 'down']])
    if (m.inBounds(x, y) && m.code(x, y) === 0 && !m.npcAt(x, y)) { s.player.place(x, y, f); break; }
  s.interact(); return 'ok';
}, id);
const npcs = (page) => page.evaluate(() => ({ map: kilumen.scene.map.name, npcs: kilumen.scene.npcs.list.map((n) => n.def?.id || n.id) }));
const SCENES = [
  { id: 'saltmere_door_to_hall', q: 'map=saltmere&x=12&y=21', run: async (page) => { await sleep(600); await page.keyboard.down('ArrowUp'); await sleep(500); await page.keyboard.up('ArrowUp'); await sleep(1500); return npcs(page); } },
  { id: 'saltmere_hall_master', q: 'map=saltmere_hall_int&x=5&y=4', run: async (page) => { await sleep(600); const r = await talkTo('saltmere_hall_int_master')(page); await sleep(400); for (let i = 0; i < 3; i++) { await page.keyboard.press('Enter'); await sleep(350); } return r; } },
  { id: 'tidewater_hall', q: 'map=tidewater_hall_int&x=6&y=12', run: async (page) => { await sleep(900); return npcs(page); } },
  { id: 'mirefen_hall', q: 'pg=hallPuzzles&map=mirefen_hall_int&x=5&y=17', run: async (page) => { await sleep(900); return npcs(page); } },
  { id: 'mirefen_guide_puzzle_dark', q: 'pg=hallPuzzles&map=mirefen_hall_int&x=9&y=16', run: async (page) => { await sleep(600); const r = await talkTo('mirefen_hall_int_guide')(page);
    await sleep(400); await page.keyboard.press('Enter'); await sleep(300); await page.keyboard.press('Enter'); await sleep(900); return r; } },
  { id: 'mirefen_puzzle_2_lamps', q: 'pg=hallPuzzles&map=mirefen_hall_int&x=5&y=17', run: async (page) => { await sleep(700);
    return page.evaluate(async () => { const d = await kilumen.progression.loadPuzzle('mirefen'); document.getElementById('pg-puzzle')?.remove(); const ov = await kilumen.progression.openPuzzle('mirefen');
      for (const a of d.verified.shortest_solution.split(' ')) { if ((ov.rt.st?.p || 0) >= 2) break; ov.rt.act(a); } ov.draw(); return { p: ov.rt.st?.p, at: [ov.rt.x, ov.rt.y] }; }).then(async (r) => { await sleep(500); return r; }); } },
];
const browser = await chromium.launch(); const files = [], report = [];
try {
  for (const dev of ['pc', 'phone']) for (const sc of SCENES) {
    const d = DEVICES[dev];
    const ctx = await browser.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: d.dpr, hasTouch: d.touch, isMobile: d.touch });
    const page = await ctx.newPage(); const errors = [];
    page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`${base}?save=0&timescale=0&hour=12&platform=${dev === 'pc' ? 'pc' : 'mobile'}&${sc.q}`);
    await page.waitForFunction(() => window.kilumen?.scene?.tileset, null, { timeout: 20000 });
    await page.evaluate(() => window.kilumen.ready); await page.waitForFunction(() => window.kilumen.progression, null, { timeout: 15000 });
    let r; try { r = await sc.run(page); } catch (e) { r = 'run error: ' + e.message; }
    const info = await page.evaluate(() => ({ map: kilumen.scene.map.name, pos: [kilumen.scene.player.x, kilumen.scene.player.y], dlg: document.querySelector('.dlg-box')?.innerText?.slice(0, 160) || null, puzzle: !!document.getElementById('pg-puzzle') }));
    const f = `${dev}_${sc.id}.png`; await page.screenshot({ path: path.join(OUT, f) }); files.push(f);
    report.push({ file: f, r, ...info, errors }); console.log(f, JSON.stringify({ r, ...info, errors: errors.slice(0, 3) }));
    await ctx.close();
  }
} finally { await browser.close(); server.kill(); }
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
execFileSync('python3', ['-c', `
import sys, os
from PIL import Image, ImageDraw
out, files = sys.argv[1], sys.argv[2:]
W = 640; th = []
for f in files:
    im = Image.open(os.path.join(out, f)).convert('RGB'); h = int(im.height * W / im.width); th.append((f, im.resize((W, h))))
cols = 3; rows = (len(th) + cols - 1) // cols; rh = max(t.height for _, t in th) + 28
sheet = Image.new('RGB', (cols * W, rows * rh), (20, 20, 28)); d = ImageDraw.Draw(sheet)
for i, (f, t) in enumerate(th):
    x, y = (i % cols) * W, (i // cols) * rh; sheet.paste(t, (x, y + 24)); d.text((x + 6, y + 6), f, fill=(230, 230, 230))
sheet.save(os.path.join(out, 'contact_sheet.png'))
`, OUT, ...files]);
console.log('wrote', OUT);

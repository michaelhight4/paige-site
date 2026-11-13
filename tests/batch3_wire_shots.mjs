// Batch 3 wiring smoke (Oct 23 2026, Coder): PC 1920x1080 + phone 844x390 landscape. Per profile:
//  1 Mirefen hall: dark (tint grade night) with one reed lamp lit (puzzle p=1 -> lamp 3 at 1,10 shows tile 2068)
//  2 hall trainer sight: step into mirefen_hall_int_h1's sight -> spotted -> pages -> engine battle opens
//  3 a batch 3 sign is read (saltmere_hall_int lobby plaque)
// Usage: node tests/batch3_wire_shots.mjs -> shots/batch3_wire_v1/*.png + contact_sheet.png + report.json
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'shots/batch3_wire_v1');
fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = []; let failures = 0;
const check = (ok, msg) => { results.push((ok ? 'PASS ' : 'FAIL ') + msg); if (!ok) failures++; };
const shots = [];

const PROFILES = [
  { tag: 'pc_1080p', ctx: { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 }, want: 'pc' },
  { tag: 'phone_844x390', ctx: { viewport: { width: 844, height: 390 }, screen: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36' }, want: 'mobile' },
];

const browser = await chromium.launch();
try {
  for (const P of PROFILES) {
    const ctx = await browser.newContext(P.ctx), page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errors.push(m.text()); });
    const open = async (q) => {
      await page.goto(`${base}?save=0&hour=12&clouds=0&${q}`);
      await page.waitForFunction(() => window.kilumen?.scene?.tileset);
      await page.evaluate(() => window.kilumen.ready);
      await page.waitForFunction(() => window.kilumen.ui, null, { timeout: 8000 }).catch(() => {});
      await sleep(600);
      await page.evaluate(() => { const ui = window.kilumen.ui; if (ui?.stack?.length) ui.closeAll(); }); // no boot title in a smoke run
      await sleep(200);
    };
    const st = () => page.evaluate(() => window.kilumen.state());
    const snap = async (name, label) => { const f = path.join(OUT, `${P.tag}_${name}.png`); await page.screenshot({ path: f }); shots.push({ f, label: `${P.tag}: ${label}` }); };
    const press = async (k, n = 1, gap = 250) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await sleep(gap); } };

    // 1 dark hall, one lamp lit
    await open('map=mirefen_hall_int&x=5&y=12&facing=up');
    const plat = await page.evaluate(() => window.kilumen.platform.id);
    check(plat === P.want, `${P.tag}: platform profile ${plat}`);
    await page.evaluate(() => { const s = window.kilumen.scene, pg = s.progression; pg.store.puzzles = pg.store.puzzles || {}; pg.store.puzzles.mirefen = { st: { p: 1 } }; return pg.refreshLamps(); });
    await sleep(500);
    const dark = await page.evaluate(() => { const s = window.kilumen.scene, m = s.map; return { grade: s.gradeName, cells: [[1, 8], [9, 8], [1, 10], [9, 10]].map(([x, y]) => m.tile('decoration', x, y)) }; });
    check(dark.grade === 'night', `${P.tag}: Mirefen hall grade ${dark.grade} (day outside)`);
    check(JSON.stringify(dark.cells) === '[2067,2067,2068,2067]', `${P.tag}: one lamp lit ${JSON.stringify(dark.cells)}`);
    await snap('1_mirefen_dark_one_lamp', 'Mirefen hall dark, lamp 3 lit');

    // 2 hall trainer sight -> battle
    await open('map=mirefen_hall_int&x=5&y=16&facing=up');
    await press('ArrowUp', 1, 100);
    let spotted = false, battle = false, dialogShot = false;
    for (let i = 0; i < 80 && !battle; i++) {
      const s = await st();
      battle = await page.evaluate(() => !!document.querySelector('.ui-battle[data-engine="sd"]'));
      if (battle) break;
      if (s.dialog && !spotted) { spotted = true; }
      if (s.dialog && !dialogShot) { dialogShot = true; await snap('2a_hall_trainer_spotted', 'hall trainer h1 spots the player'); }
      if (s.dialog) await page.keyboard.press('Enter');
      await sleep(250);
    }
    const log = await page.evaluate(() => window.kilumen.scene.log.filter((e) => e.type === 'spotted').map((e) => e.npc));
    check(log.includes('mirefen_hall_int_h1'), `${P.tag}: sight system spotted ${JSON.stringify(log)}`);
    check(battle, `${P.tag}: engine battle opened from the hall trainer`);
    await sleep(1500);
    const foes = await page.evaluate(() => window.kilumen.ui._sd?.kb?.p2?.creature?.map((c) => c.species?.id || c.species) || null);
    check(!!foes?.length, `${P.tag}: battle foes ${JSON.stringify(foes)}`);
    await snap('2b_hall_trainer_battle', 'trainer battle (engine) from sight');
    // force-close the battle mid-fight: must not throw
    await page.evaluate(() => window.kilumen.ui.closeAll()); await sleep(1500);

    // 3 sign read (saltmere hall lobby plaque at 0,12, read from the right)
    await open('map=saltmere_hall_int&x=1&y=12&facing=left');
    await press('Enter', 1, 600);
    const sg = await st();
    check(!!sg.dialog?.text, `${P.tag}: sign read "${(sg.dialog?.text || '').slice(0, 60)}"`);
    await snap('3_sign_read', 'saltmere hall plaque read');

    check(errors.length === 0, `${P.tag}: no page errors ${JSON.stringify(errors.slice(0, 3))}`);
    await ctx.close();
  }
  // contact sheet
  const page = await browser.newPage({ viewport: { width: 1800, height: 1000 } });
  const cells = shots.map((s) => `<figure><img src="data:image/png;base64,${fs.readFileSync(s.f).toString('base64')}"><figcaption>${s.label}</figcaption></figure>`).join('');
  await page.setContent(`<style>body{margin:0;background:#1d1b22;color:#eee;font:14px sans-serif;display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:10px}
    figure{margin:0}img{width:100%;display:block;image-rendering:pixelated}figcaption{padding:4px 0}h1{grid-column:1/-1;margin:4px 0;font-size:18px}</style>
    <h1>Kilumen dev, batch 3 wire v1 (Oct 23 2026): PC 1920x1080 / phone 844x390</h1>${cells}`);
  await page.screenshot({ path: path.join(OUT, 'contact_sheet.png'), fullPage: true });
} finally { await browser.close(); server.kill(); }
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ results, failures }, null, 1));
console.log(results.join('\n')); console.log(failures ? `${failures} FAIL` : 'ALL PASS');
process.exit(failures ? 1 : 0);

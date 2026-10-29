// Jestrix line (Oct 29 2026): in-game PC + phone shots: battle front/back, overworld walk (lead follower), Kilindex, evolution.
// Usage: node tests/jestrix_line_shots.mjs -> shots/jestrix_line_ingame/*.png + report.json (contact sheet: separate step)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.OUT || path.join(ROOT, 'shots/jestrix_line_ingame');
fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PROFILES = [{ plat: 'pc', w: 1280, h: 720, dpr: 1, touch: false }, { plat: 'phone', w: 844, h: 390, dpr: 2, touch: true }];
const COMMON = 'save=0&timescale=0&hour=12&audio=0&enc=0';
const LINE = ['jestrix', 'japkit', 'harlequop', 'mummerhop', 'maestrix'];
const LV = { jestrix: 12, japkit: 24, harlequop: 38, mummerhop: 50, maestrix: 60 };
// battle pairs: every form shows once as the foe (front) and once as the player's lead (back)
const PAIRS = [['jestrix', 'japkit'], ['japkit', 'harlequop'], ['harlequop', 'mummerhop'], ['mummerhop', 'maestrix'], ['maestrix', 'jestrix']];

const SCENES = [
  ...PAIRS.map(([me, foe]) => ({ id: `battle_${me}_vs_${foe}`, q: `map=brookhollow&x=6&y=20&lead=${me}`, run: async (page) => {
    await page.evaluate(async ([foe, lv, mlv, me]) => { const s = kilumen.scene; await s.setLead(me); if (s.party?.[0]) s.party[0].level = mlv; kilumen.ui.closeAll(); kilumen.ui.open('battle', { foe, foeLevel: lv }); }, [foe, LV[foe], LV[me], me]);
    await sleep(2600);
  } })),
  ...LINE.map((id) => ({ id: `walk_${id}`, q: `map=brookhollow&x=6&y=20&facing=right&lead=${id}`, run: async (page, shot) => {
    await page.evaluate((id) => kilumen.scene.setLead(id), id); await sleep(500);
    await sleep(2500); await shot('0start'); // page through the opening lines so the player can walk
    for (const [key, n, tag] of [['ArrowRight', 3, 'right'], ['ArrowDown', 2, 'down'], ['ArrowLeft', 3, 'left'], ['ArrowUp', 2, 'up']]) {
      await page.keyboard.down(key); await sleep(170 * n); await shot(tag + '_mid'); await page.keyboard.up(key); await sleep(250);
    }
  } })),
  { id: 'kilindex', q: 'map=brookhollow&x=6&y=20&lead=jestrix', run: async (page, shot) => {
    await page.evaluate((ids) => { const s = kilumen.scene; for (const id of ids) s.systems.applyBattleResult({ outcome: 'caught', team: s.party.map((c) => ({ ...c })), bag: {}, caught: { species: id, level: 20, hp: 10, variant: '' }, foesSeen: [{ species: id }] }); }, LINE);
    await sleep(500);
    for (const id of LINE) {
      await page.evaluate((id) => { const ui = kilumen.ui; ui.closeAll(); ui.open('kilindex'); }, id); await sleep(500);
      await page.evaluate((id) => { const ui = kilumen.ui, t = ui.top; const { SPECIES } = window.__sp || {}; const i = [...document.querySelectorAll('.ui-dex .ui-tile img')].findIndex((im) => im.dataset.sp === id); t.sel = i; ui._markSel?.(); t.onSel(i); document.querySelector(`.ui-dex .ui-tile[data-i="${i}"]`)?.scrollIntoView({ block: 'center' }); }, id);
      await sleep(600); await shot(id);
    }
  } },
  ...LINE.slice(0, 4).map((id, i) => ({ id: `evolve_${id}_to_${LINE[i + 1]}`, q: `ui=evolve&from=${id}&to=${LINE[i + 1]}`, run: async (page, shot) => {
    await page.evaluate(([a, b]) => { kilumen.scene.setLead(a); kilumen.ui.closeAll(); window.__evo = kilumen.ui.fx.evolveFx({ from: a, to: b }).then(() => { window.__evoDone = true; }); }, [id, LINE[i + 1]]);
    await sleep(1200); await shot('start'); await sleep(2500); await shot('glow');
    await sleep(3500); await shot('reveal');
  } })),
];

const browser = await chromium.launch();
const report = [];
try {
  const ONLY = process.env.ONLY?.split(',');
  for (const p of PROFILES) for (const sc of SCENES.filter((s) => !ONLY || ONLY.some((o) => s.id.startsWith(o)))) {
    const ctx = await browser.newContext({ viewport: { width: p.w, height: p.h }, deviceScaleFactor: p.dpr, hasTouch: p.touch, isMobile: p.touch });
    const page = await ctx.newPage();
    await page.addInitScript(() => { try { localStorage.setItem('kilumen_alpha_notice_seen.v1', '1'); } catch {} });
    const errors = [], missing = [];
    page.on('console', (m) => { if (m.type() === 'error' && !/playtime\.js|icon_f0|icon_f1/.test((m.location()?.url || '') + m.text())) errors.push(m.text() + ' ' + (m.location()?.url || '')); });
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('response', (r) => { if (r.status() >= 400 && /jestrix|japkit|harlequop|mummerhop|maestrix/.test(r.url())) missing.push(r.url() + ' ' + r.status()); });
    const shots = [];
    const shot = async (tag) => { const f = `${p.plat}_${sc.id}${tag ? '_' + tag : ''}.png`; await page.screenshot({ path: path.join(OUT, f) }); shots.push(f); };
    try {
      await page.goto(`${base}?${COMMON}&${sc.q}`);
      await page.waitForFunction(() => window.kilumen?.ready || window.kilumen?.ui, null, { timeout: 15000 });
      await page.evaluate(() => Promise.race([window.kilumen.ready, new Promise((r) => setTimeout(r, 15000))]).then(() => window.kilumen.ui?.sdReady));
      await sleep(1200);
      if (!sc.noClose) { await page.evaluate(() => { try { kilumen.ui?.closeAll?.(); } catch {} }); await page.locator('canvas').first().click({ position: { x: 5, y: 5 } }).catch(() => {}); await sleep(300); }
      await sc.run(page, shot);
      if (!shots.length) await shot('');
    } catch (e) { errors.push('runner: ' + e.message); try { await shot('fail'); } catch {} }
    report.push({ plat: p.plat, scene: sc.id, errors, missing, shots });
    console.log(p.plat, sc.id, errors.length || missing.length ? 'ERRORS ' + [...errors, ...missing].join(' | ').slice(0, 400) : 'ok');
    await ctx.close();
  }
} finally { await browser.close(); server.kill(); }
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));

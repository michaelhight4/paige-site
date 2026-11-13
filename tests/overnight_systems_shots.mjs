// Overnight systems (Oct 23, 2026): PC + phone screenshots of the new systems + console-error check.
// Usage: node tests/overnight_systems_shots.mjs -> shots/overnight_systems/*.png + report.json
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'shots/overnight_systems');
fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PROFILES = [{ plat: 'pc', w: 1280, h: 720, dpr: 1, touch: false }, { plat: 'phone', w: 844, h: 390, dpr: 2, touch: true }];
const COMMON = 'save=0&timescale=0&hour=12&audio=0&lead=rillop';

const SCENES = [
  { id: 'boot_default', q: 'map=brookhollow&x=6&y=20', run: async () => {} },
  { id: 'sight', q: 'map=route1&x=12&y=21', run: async (page, shot) => { // default flags: sight is ON
    const r = await page.evaluate(() => { // stand one step outside trainer_r1_a's sight, step in
      const s = kilumen.scene, n = s.npcs.byId('trainer_r1_a'), cells = n.def.sight_cells;
      for (const [cx, cy] of cells) for (const [dx, dy, key] of [[0, 1, 'ArrowUp'], [0, -1, 'ArrowDown']]) {
        const x = cx + dx, y = cy + dy; if (s.map.passable(x, y, 'walk') && !cells.some(([a, b]) => a === x && b === y)) { s.player.place(x, y, key === 'ArrowUp' ? 'up' : 'down'); return { x, y, key }; }
      }
      return null;
    });
    if (!r) return { note: 'no approach cell' };
    await sleep(300); await page.keyboard.down(r.key); await sleep(180); await page.keyboard.up(r.key);
    await sleep(350); await shot('spark');
    await sleep(1400); await shot('spotted');
    return r;
  } },
  { id: 'kilindex', q: 'map=brookhollow&x=6&y=20', run: async (page) => { await page.evaluate(() => kilumen.ui.open('kilindex')); await sleep(700); } },
  { id: 'kilindex_new', q: 'map=route1&x=12&y=24', run: async (page, shot) => {
    const r = await page.evaluate(() => { const s = kilumen.scene; s.systems.applyBattleResult({ outcome: 'caught', team: s.party.map((c) => ({ ...c })), bag: {}, caught: { species: 'cindrip', level: 4, hp: 10, variant: '' }, foesSeen: [{ species: 'cindrip' }] }); return s.overnight.kilindex.toJSON(); });
    await sleep(900); await shot('line');
    return { seen: Object.keys(r.seen), caught: Object.keys(r.caught) };
  } },
  { id: 'tideglide', q: 'ov=field&flags=has_tideglide&map=route1&x=18&y=13&facing=down', run: async (page, shot) => {
    await sleep(300); await page.keyboard.press('KeyZ'); await sleep(900); await shot('inspect');
    for (let i = 0; i < 6; i++) { await page.keyboard.press('KeyZ'); await sleep(500); }
    await page.keyboard.down('ArrowDown'); await sleep(200); await page.keyboard.up('ArrowDown'); await sleep(700);
    return page.evaluate(() => ({ gliding: kilumen.scene.overnight.field.gliding, at: [kilumen.scene.player.x, kilumen.scene.player.y] }));
  } },
  { id: 'brush_locked', q: 'ov=field&map=route1&x=18&y=13&facing=down', run: async (page) => { await sleep(300); await page.keyboard.press('KeyZ'); await sleep(900); } },
  { id: 'boulder', q: 'ov=field&map=greystone_b1&x=17&y=10&facing=right', run: async (page) => {
    await sleep(300); await page.keyboard.down('ArrowRight'); await sleep(260); await page.keyboard.up('ArrowRight'); await sleep(700);
    return page.evaluate(() => ({ boulderAt19: kilumen.scene.map.code(19, 10) === 5, at18: kilumen.scene.map.code(18, 10) }));
  } },
  { id: 'regionmap', q: 'ov=regionmap&flags=has_skylift,visited_brookhollow,visited_fernwick&map=fernwick&x=5&y=8', run: async (page, shot) => {
    await page.evaluate(() => kilumen.ui.open('map')); await sleep(600);
    await page.evaluate(() => { const ui = kilumen.ui, t = ui.top, zones = (kilumen.scene.layout.zones || []).filter((z) => z.map_pos); t.sel = Math.max(0, zones.findIndex((z) => z.id === 'brookhollow')); ui._render?.(); t.onSel?.(t.sel); });
    await sleep(500); await shot('menu');
    await page.evaluate(() => kilumen.ui._activate()); await sleep(1000); await shot('confirm');
    await page.keyboard.press('KeyZ'); await sleep(600);
    for (let i = 0; i < 4; i++) { await page.keyboard.press('KeyZ'); await sleep(500); }
    await sleep(1800);
    return page.evaluate(() => ({ map: kilumen.scene.map.name, at: [kilumen.scene.player.x, kilumen.scene.player.y] }));
  } },
  { id: 'learn', q: 'ov=learnsets&map=brookhollow&x=6&y=20', run: async (page, shot) => {
    await page.evaluate(async () => { const m = await import('./src/overnight/index.js'); const s = kilumen.scene; const c = s.party[0]; while (c.skills.length < 4) c.skills.push('tackle' + c.skills.length); s.script(() => m.learnPrompt(s, s.overnight, c, 'zephyrcut')); });
    await sleep(900); await shot('slots_full');
    await page.keyboard.press('KeyZ'); await sleep(900);
  } },
  { id: 'staged_map', q: 'ov=stagedMaps&map=heal_saltmere&x=5&y=7', run: async (page) => { await sleep(800); return page.evaluate(() => ({ map: kilumen.scene.map?.name, staged: Object.keys(kilumen.scene.overnight.staged).length })); } },
];

const browser = await chromium.launch();
const report = [];
try {
  const ONLY = process.env.ONLY?.split(',');
  for (const p of PROFILES) for (const sc of SCENES.filter((s) => !ONLY || ONLY.includes(s.id))) {
    const ctx = await browser.newContext({ viewport: { width: p.w, height: p.h }, deviceScaleFactor: p.dpr, hasTouch: p.touch, isMobile: p.touch });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text() + ' ' + (m.location()?.url || '')); });
    page.on('pageerror', (e) => errors.push(String(e)));
    const shots = [];
    const shot = async (tag) => { const f = `${p.plat}_${sc.id}${tag ? '_' + tag : ''}.png`; await page.screenshot({ path: path.join(OUT, f) }); shots.push(f); };
    let info = null;
    try {
      await page.goto(`${base}?${COMMON}&${sc.q}`);
      await page.waitForFunction(() => window.kilumen?.ready, null, { timeout: 15000 });
      await page.evaluate(() => kilumen.ready); await sleep(900);
      await page.evaluate(() => { try { kilumen.ui?.closeAll?.(); } catch {} });
      await page.locator('canvas').first().click({ position: { x: 5, y: 5 } }).catch(() => {});
      info = await sc.run(page, shot);
      if (!shots.length) await shot('');
      else await shot('end');
    } catch (e) { errors.push('runner: ' + e.message); try { await shot('fail'); } catch {} }
    report.push({ plat: p.plat, scene: sc.id, info, errors, shots });
    console.log(p.plat, sc.id, JSON.stringify(info), errors.length ? 'ERRORS ' + errors.join(' | ').slice(0, 400) : 'ok');
    await ctx.close();
  }
} finally { await browser.close(); server.kill(); }
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));

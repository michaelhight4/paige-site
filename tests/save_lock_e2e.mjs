// Save lock proof (Oct 23 2026, Gary 11:35 AM CT): a trainer spots you -> walk-up -> battle opens -> the game is CLOSED
// (page.close fires pagehide) -> reopened: you stand where the trainer saw you, the trainer is not beaten and spots you again.
// PC 1920x1080 + phone 844x390 (touch: dialogue advanced by tapping the box). Real save on (localStorage + IndexedDB).
// Usage: node tests/save_lock_e2e.mjs -> shots/save_lock_20261023/*.png + report.json
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'shots/save_lock_20261023');
fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MAP = 'mirefen_hall_int', NPC = 'mirefen_hall_int_h1';
const VIEWS = [
  { plat: 'pc', ctx: { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 } },
  { plat: 'phone', ctx: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true } },
];
const report = []; let fails = 0;
const check = (ok, msg) => { console.log(ok ? 'PASS' : 'FAIL', msg); report.push({ ok, msg }); if (!ok) fails++; };
const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
try {
  for (const v of VIEWS) {
    const ctx = await browser.newContext(v.ctx);
    let page = await ctx.newPage();
    const errors = []; const watch = (p) => p.on('pageerror', (e) => errors.push(String(e)));
    watch(page);
    const boot = async (q) => {
      await page.goto(`${base}?hour=12&clouds=0&enc=0&${q}`);
      await page.waitForFunction(() => window.kilumen?.scene?.tileset, null, { timeout: 20000 });
      await page.evaluate(() => window.kilumen.ready);
      await page.waitForFunction(() => window.kilumen.ui, null, { timeout: 8000 }).catch(() => {});
      await sleep(700);
      await page.evaluate(() => { const ui = window.kilumen.ui; if (ui?.stack?.length) ui.closeAll(); });
      await sleep(200);
    };
    const snap = async (name) => { const f = `${v.plat}_${name}.png`; await page.screenshot({ path: path.join(OUT, f) }); return f; };
    const disk = () => page.evaluate(() => { const r = localStorage.getItem('kilumen.save.v1'); return r ? JSON.parse(r) : null; });
    const advance = async () => { if (v.ctx.hasTouch) await page.tap('.dlg-box').catch(() => {}); else await page.keyboard.press('Enter'); };
    const toBattle = async () => {
      let shotSpotted = null;
      for (let i = 0; i < 120; i++) {
        if (await page.evaluate(() => !!document.querySelector('.ui-battle'))) return shotSpotted;
        const dlg = await page.evaluate(() => !!window.kilumen.scene.dialog?.active);
        if (dlg && !shotSpotted) shotSpotted = await snap('1_spotted');
        if (dlg) await advance();
        await sleep(300);
      }
      return shotSpotted;
    };

    // 1) fresh game state at the hall, step into the trainer's sight
    await boot(`reset=1&map=${MAP}`);
    const setup = await page.evaluate(async ({ NPC }) => {
      const s = window.kilumen.scene, n = s.npcs.byId(NPC), { sightCells } = await import('/src/overnight/sight.js');
      const cells = sightCells({ ...n.def, x: n.x, y: n.y }), c = cells[cells.length - 1];
      const dx = Math.sign(c.x - n.x), dy = Math.sign(c.y - n.y), out = { x: c.x + dx, y: c.y + dy };
      const facing = dx > 0 ? 'left' : dx < 0 ? 'right' : dy > 0 ? 'up' : 'down';
      const { createCreature } = await import('/src/systems/creature.js');
      if (!s.systems.party.list.length) s.systems.party.add(createCreature({ species: 'cindrip', level: 12, origin: { how: 'starter', map: s.map.name } }));
      s.player.place(out.x, out.y, facing); s.saveNow();
      return { c, out, facing, party: s.systems.party.list.length };
    }, { NPC });
    console.log(v.plat, 'setup', JSON.stringify(setup));
    const key = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }[setup.facing];
    await page.keyboard.press(key);
    const spottedShot = await toBattle();
    await sleep(1500);
    const inBattle = await page.evaluate(() => !!document.querySelector('.ui-battle'));
    check(inBattle, `${v.plat}: trainer spotted -> walk-up -> battle open`);
    const lock = await page.evaluate(() => ({ why: window.kilumen.scene.saveLockReason(), save: window.kilumen.scene.saveNow() }));
    check(lock.why && lock.save === false, `${v.plat}: save refused in battle (lock '${lock.why}')`);
    const battleShot = await snap('2_in_battle_before_close');
    const mid = await disk();
    check(mid?.pos?.x === setup.c.x && mid?.pos?.y === setup.c.y, `${v.plat}: on disk mid-battle = pre-approach spot ${JSON.stringify(mid?.pos)}`);
    check(!mid?.seen?.[`defeated:${MAP}.${NPC}`], `${v.plat}: on disk mid-battle, trainer not beaten`);

    // 2) close the game mid-battle (pagehide), reopen from the save
    await page.close({ runBeforeUnload: true });
    page = await ctx.newPage(); watch(page);
    await boot('title=0');
    const back = await page.evaluate(({ MAP, NPC }) => { const s = window.kilumen.scene; return { map: s.map.name, x: s.player.x, y: s.player.y, facing: s.player.facing, beaten: !!s.seen[`defeated:${MAP}.${NPC}`] }; }, { MAP, NPC });
    const reloadShot = await snap('3_reopened');
    check(back.map === MAP && back.x === setup.c.x && back.y === setup.c.y, `${v.plat}: reopened at the pre-approach spot ${JSON.stringify(back)}`);
    check(!back.beaten, `${v.plat}: trainer not beaten after reopen`);
    const again = await page.evaluate(({ NPC }) => window.kilumen.scene.log.some((e) => e.type === 'spotted' && e.npc === NPC), { NPC });
    await sleep(800);
    const again2 = again || await page.evaluate(({ NPC }) => window.kilumen.scene.log.some((e) => e.type === 'spotted' && e.npc === NPC), { NPC });
    if (again2) await snap('4_spotted_again');
    check(again2, `${v.plat}: the trainer spots you again (interaction replays)`);
    check(!errors.length, `${v.plat}: no page errors ${errors.slice(0, 2).join(' | ')}`);
    report.push({ view: v.plat, setup, mid: mid?.pos, back, shots: [spottedShot, battleShot, reloadShot] });
    await ctx.close();
  }
} finally { await browser.close(); server.kill(); }
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
console.log(fails ? `FAILED ${fails}` : 'ALL PASS');
process.exit(fails ? 1 : 0);

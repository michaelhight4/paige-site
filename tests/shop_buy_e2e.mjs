// Shop buy e2e (Oct 23, 2026): RT Supply clerk across the counter -> Buy -> crystal -> qty -> Ring it up; count rises.
// PC 1366x768 (F/Enter keys) + phone 844x390 (taps). ROOT env picks the tree (dev default). OUT=shots/shop_fix.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path'; import net from 'node:net'; import { fileURLToPath } from 'node:url';
const ROOT = process.env.ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'shots/shop_fix'); fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const TAG = process.env.TAG || '';
let fails = 0; const log = (ok, m) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${m}`); if (!ok) fails++; };
const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
try {
  for (const v of [{ plat: 'pc', w: 1366, h: 768, touch: false }, { plat: 'phone', w: 844, h: 390, touch: true }].filter((x) => !process.env.PLATS || process.env.PLATS.split(',').includes(x.plat))) {
    const ctx = await browser.newContext({ viewport: { width: v.w, height: v.h }, hasTouch: v.touch, isMobile: v.touch });
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', (e) => errs.push(String(e)));
    const S = (fn, a) => page.evaluate(fn, a);
    const shot = async (l) => { const f = path.join(OUT, `${v.plat}_${v.w}x${v.h}_${TAG}${l}.png`); await page.screenshot({ path: f }); console.log('shot', f); };
    await page.goto(`${base}?save=0&audio=0&online=0&hour=12&weather=clear&skipintro=1`);
    await page.waitForFunction(() => window.kilumen?.ui && window.kilumen.scene?.tileset && window.kilumen.scene.systems?.bag, null, { timeout: 30000 });
    await page.waitForTimeout(1500);
    for (let i = 0; i < 8 && (await S(() => !!window.kilumen.ui?.active)); i++) { // release build: alpha notice + title screen
      const got = page.getByText('Got it', { exact: true }); if (await got.count()) await got.first().click().catch(() => {}); else await page.keyboard.press('Enter');
      await page.waitForTimeout(700);
    }
    if (process.env.DBG) { await shot('0_dbg'); console.log(await S(() => JSON.stringify({ ui: window.kilumen.ui?.active, scr: window.kilumen.ui?.stack?.map?.((x) => x.scr), m: window.kilumen.scene.map?.name, busy: window.kilumen.scene.busy, fade: !!window.kilumen.scene.fade }))); }
    await page.waitForFunction(() => { const s = window.kilumen.scene; return !s.fade && !s.busy; }, null, { timeout: 12000 }).catch(() => {});
    await S(() => { const s = window.kilumen.scene; if (s.intro?.holding || s.intro?.wakePending) { s.intro.holding = false; s.intro.wakePending = false; s.fade = null; } }); // release: wake-up hold (headless), skip it
    await S(() => window.kilumen.scene.startWarp({ map: 'shop_int', x: 2, y: 5, facing: 'up' }, 'door'));
    await page.waitForFunction(() => { const s = window.kilumen.scene; if (s.intro?.holding || s.intro?.wakePending) { s.intro.holding = false; s.intro.wakePending = false; if (s.fade?.phase === 'hold') s.fade = null; } return s.map?.name === 'shop_int' && !s.fade; }, null, { timeout: 20000 }).catch(async (e) => { console.log(await S(() => { const s = window.kilumen.scene; return JSON.stringify({ m: s.map?.name, busy: s.busy, fade: s.fade, dlg: s.dialog?.active, t: document.body.innerText.slice(0, 160) }); })); throw e; });
    for (let i = 0; i < 40 && (await S(() => window.kilumen.scene.busy)); i++) { // release: the wake-up lines still play; click through
      if (v.touch) await page.tap('.dlg-box').catch(() => page.keyboard.press('Enter')); else await page.keyboard.press('Enter');
      await page.waitForTimeout(400);
    }
    await page.waitForTimeout(800);
    await S(() => { const s = window.kilumen.scene; s.player.place(2, 5, 'up'); s.systems.wallet.n = 3000; });
    // a RITA strip up (the v0.2.7 suspect): force one if the voice is attached
    const cvUp = await S(() => { const cv = window.kilumen.companyVoice; if (!cv) return 'no cv'; try { cv.emit?.('board_node', { key: 'shoptest#1', node: 'Walk', rank: 1 }); } catch (e) { return String(e); } return !!cv.current; });
    const before = await S(() => window.kilumen.scene.systems.bag.count('dominance_crystal'));
    // talk to the clerk
    if (v.touch) { const a = page.locator('[data-btn="a"], .tc-a, #btnA, .touch-a').first(); if (await a.count()) await a.tap(); else await page.keyboard.press('f'); } else await page.keyboard.press('f');
    await page.waitForTimeout(700);
    for (let i = 0; i < 30; i++) { // click through clerk dialogue until the shop screen is open
      const st = await S(() => ({ ui: !!window.kilumen.ui?.active, scr: window.kilumen.ui?.stack?.at?.(-1)?.scr || (document.querySelector('.ui-row[data-k]') && 'shop'), dlg: !!window.kilumen.scene.dialog?.active }));
      if (st.scr === 'shop') break;
      if (st.dlg) { if (v.touch) await page.tap('.dlg-box').catch(() => {}); else await page.keyboard.press('Enter'); }
      await page.waitForTimeout(350);
    }
    const scr = await S(() => window.kilumen.ui?.stack?.at?.(-1)?.scr || document.querySelector('[data-scr="shop"]') && 'shop(dom)');
    log(!!scr, `[${v.plat}] shop opened (${scr}); cv=${cvUp}`);
    await shot('1_shop_open');
    const tap = async (loc, what) => { try { if (v.touch) await loc.tap({ timeout: 5000 }); else await loc.click({ timeout: 5000 }); } catch (e) { log(false, `[${v.plat}] ${what}: ${e.message.split('\n')[0]}`); } };
    let coins0 = await S(() => window.kilumen.scene.systems.wallet.coins);
    for (const [k, id] of [['crystal', 'dominance_crystal'], ['potion', 'tonic_small']]) {
      const b0 = await S((x) => window.kilumen.scene.systems.bag.count(x), id);
      await tap(page.locator(`.ui-row[data-k="${id}"]`).first(), `row ${id}`); await page.waitForTimeout(500);
      const plus = page.locator('.ui-modal button[data-m="-2"]').first();
      for (let n = 0; n < 2; n++) { await tap(plus, 'plus'); await page.waitForTimeout(150); }
      await shot(`2_${k}_qty`);
      await tap(page.locator('.ui-modal li[data-m="0"]').first(), 'qty OK'); await page.waitForTimeout(600);
      await shot(`3_${k}_confirm`);
      await tap(page.locator('.ui-modal li[data-m="0"]').last(), 'Ring it up'); await page.waitForTimeout(900);
      const b1 = await S((x) => window.kilumen.scene.systems.bag.count(x), id), c1 = await S(() => window.kilumen.scene.systems.wallet.coins);
      log(b1 === b0 + 3 && c1 < coins0, `[${v.plat}] ${k} ${id} ${b0} -> ${b1}, money ${coins0} -> ${c1}`); coins0 = c1;
      await shot(`4_${k}_bought`);
      await page.waitForTimeout(1200);
    }
    log(!errs.length, `[${v.plat}] no page errors ${errs.slice(0, 3).join(' | ')}`);
    await ctx.close();
  }
} finally { await browser.close(); server.kill(); }
process.exit(fails ? 1 : 0);

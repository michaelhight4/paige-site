// systems-gd headless shots (Oct 22, 2026): Team / Pack / RT Supply / Heal board at 1280x720 (PC) and 844x390 (mobile,
// touch, DPR 2) into shots/systems_gd_v1/, plus layout checks (no page errors, nothing cut off, no UI under a visible
// touch button). Runs the real game (index.html) with the systems hooks. Usage: PORT=8097 node tests/systems_gd_shots.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
const OUT = 'shots/systems_gd_v1'; fs.mkdirSync(OUT, { recursive: true });
const base = `http://127.0.0.1:${process.env.PORT || 8097}/index.html`;
const SIZES = [{ id: 'pc1280x720', w: 1280, h: 720, p: 'pc' }, { id: 'mob844x390', w: 844, h: 390, p: 'mobile', dpr: 2, touch: true }];
const problems = [];
const b = await chromium.launch();

async function layout(page, label) {
  const r = await page.evaluate(() => {
    const vw = innerWidth, vh = innerHeight, out = { cut: [], overlap: [], small: [] };
    const tp = document.getElementById('touchpad');
    const btns = [...document.querySelectorAll('#touchpad button')].filter((e) => tp && !tp.hidden && getComputedStyle(e).visibility !== 'hidden' && getComputedStyle(e).display !== 'none' && e.offsetParent !== null).map((e) => [e.dataset.btn || e.dataset.dir, e.getBoundingClientRect()]);
    for (const e of document.querySelectorAll('.ui-root:not([hidden]) :is(.ui-row, .ui-card, .ui-tab, .ui-x, .ui-panel, .plate)')) {
      const q = e.getBoundingClientRect(); if (!q.width || e.offsetParent === null) continue;
      const sc = e.closest('.ui-scroll'), box = sc && sc !== e ? sc.getBoundingClientRect() : null;
      const v = box ? { left: Math.max(q.left, box.left), right: Math.min(q.right, box.right), top: Math.max(q.top, box.top), bottom: Math.min(q.bottom, box.bottom) } : q;
      if (v.right <= v.left || v.bottom <= v.top) continue;
      if (!box && (q.left < -1 || q.top < -1 || q.right > vw + 1 || q.bottom > vh + 1)) out.cut.push(`${e.className} ${Math.round(q.left)},${Math.round(q.top)},${Math.round(q.right)},${Math.round(q.bottom)}`);
      for (const [n, bq] of btns) if (v.left < bq.right && v.right > bq.left && v.top < bq.bottom && v.bottom > bq.top) out.overlap.push(`${e.className.split(' ')[0]} x ${n}`);
      if (e.matches('.ui-row, .ui-tab, .ui-x') && q.height < 43.5) out.small.push(`${e.className.split(' ')[0]} h=${Math.round(q.height)}`);
    }
    // icon scale must be a whole number of 32px frames
    for (const i of document.querySelectorAll('.sys-ico')) { const w = i.getBoundingClientRect().width; if (w && w % 32) out.cut.push(`sys-ico non-integer ${w}`); }
    return out;
  });
  for (const k of ['cut', 'overlap', 'small']) for (const x of [...new Set(r[k])]) problems.push(`${label}: ${k} ${x}`);
}

for (const c of SIZES) {
  const ctx = await b.newContext({ viewport: { width: c.w, height: c.h }, deviceScaleFactor: c.dpr || 1, hasTouch: !!c.touch, isMobile: !!c.touch });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', (e) => errs.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  const go = async (map, x, y) => {
    await page.goto(`${base}?save=0&timescale=0&hour=12&clouds=0&platform=${c.p}&map=${map}&x=${x}&y=${y}&facing=up`);
    await page.waitForFunction(() => window.kilumen?.scene?.systems?.ui, null, { timeout: 30000 });
    await page.evaluate(async () => { // demo team / bag / wallet through the systems API
      const sys = window.kilumen.scene.systems, { createCreature } = await import('./src/systems/creature.js');
      const P = [['rillop', 14, 'Pebble'], ['tumbloam', 12], ['halovy', 11], ['gloamtick', 9], ['emberlunx', 13], ['sailquill', 10]];
      sys.scene.party.length = 0;
      for (const [sp, lv, nick] of P) sys.party.add(createCreature({ species: sp, level: lv, nickname: nick || null, warmth: 60, origin: { map: 'route1' } }));
      const L = sys.scene.party; L[1].hp = Math.floor(L[1].hp * 0.4); L[2].hp = 0; L[3].status = 'psn'; L[4].hp = Math.floor(L[4].hp * 0.15);
      L[0].energy = L[0].energy?.map?.((e) => Math.floor(e / 2)) ?? null;
      for (const [id, n] of [['tonic_small', 4], ['tonic_large', 1], ['calm_tea', 2], ['trail_mix', 3], ['dominance_crystal', 5], ['feed_bag_small', 2]]) sys.bag.add(id, n);
      sys.wallet.add(2480);
    });
    await page.waitForTimeout(300);
  };
  const shot = async (name) => { await page.waitForTimeout(700); await layout(page, `${c.id} ${name}`); await page.screenshot({ path: `${OUT}/${name}_${c.id}.png` }); };

  await go('brookhollow', 10, 12);
  await page.evaluate(() => window.kilumen.ui.open('sys_party')); await shot('party');
  await page.evaluate(() => { const ui = window.kilumen.ui; ui.closeAll(); ui.open('sys_bag'); }); await shot('bag');
  await go('heal_fernwick', 6, 5);
  await page.evaluate(() => { const ui = window.kilumen.ui; ui.closeAll(); ui.open('sys_shop'); }); await shot('shop');
  await page.evaluate(() => { const ui = window.kilumen.ui; ui.closeAll(); ui.open('sys_heal'); }); await shot('heal');
  await page.evaluate(() => { const ui = window.kilumen.ui; ui.top.onA(0); }); await shot('heal_done');
  if (errs.length) problems.push(...errs.map((e) => `${c.id} error: ${e}`));
  await ctx.close();
}
await b.close();
console.log(problems.length ? `PROBLEMS (${problems.length}):\n${problems.join('\n')}` : 'systems_gd shots: OK, no layout problems');
process.exitCode = problems.length ? 1 : 0;

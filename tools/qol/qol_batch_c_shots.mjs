// QoL batch C shots (phone + PC): phone menu tiles, storage, summary menu, stats, rename, renew prompt, quick save ok/blocked, chain.
// Static server on :8137 from the repo root. Output: shots/qol_v1/batchC/*.png
import { chromium } from 'playwright';
const base = 'http://localhost:8137/index.html', out = 'shots/qol_v1/batchC/';
const devs = [{ n: 'pc', w: 1366, h: 768, dpr: 1, touch: false }, { n: 'phone', w: 844, h: 390, dpr: 3, touch: true }];
const b = await chromium.launch();
for (const d of devs) {
  const ctx = await b.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: d.dpr, hasTouch: d.touch, isMobile: d.touch });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`${base}?save=0&timescale=0&hour=12&title=0&ix2=0&map=route1&x=20&y=24&uidemo=1&qolc=chain`);
  await p.waitForFunction(() => window.kilumen?.qolc?.flags, null, { timeout: 30000 }); await p.waitForTimeout(2500);
  const shot = async (f) => { await p.waitForTimeout(400); await p.screenshot({ path: `${out}${d.n}_${f}.png` }); };
  const ev = (fn, a) => p.evaluate(fn, a);
  await ev(() => { const ui = window.kilumen.ui; ui.closeAll(); ui.open('phone'); }); await shot('01_phone_menu');
  await ev(() => { const ui = window.kilumen.ui; ui.open('qolc_storage'); }); await shot('02_storage');
  await ev(() => { const ui = window.kilumen.ui; ui.closeAll(); ui.open('summary', { i: 0 }); }); await p.keyboard.press('Enter'); await shot('03_summary_menu');
  await ev(() => { const ui = window.kilumen.ui; ui.closeAll(); ui.open('qolc_stats', { i: 0 }); }); await shot('04_stats');
  await ev(() => { window.kilumen.ui.closeAll(); window.kilumen.qolc.rename(0, 'Bubbles'); }); await ev(() => window.kilumen.ui.open('summary', { i: 0 })); await shot('05_renamed_summary');
  await ev(() => { const q = window.kilumen.qolc, ui = window.kilumen.ui; ui.closeAll(); q.cfg.blockerItems.test_spray = 50; q.offerRenew?.('test_spray'); }); await shot('06_renew_prompt');
  await ev(() => { const ui = window.kilumen.ui; ui.modal?.close?.(); ui.closeAll(); window.kilumen.qolc.quickSave(); }); await shot('07_quick_save_ok');
  const blocked = await ev(() => { const s = window.kilumen.scene; const rel = s.lockSave('cutscene'); const r = window.kilumen.qolc.quickSave(); rel(); return r; }); await shot('08_quick_save_blocked');
  await ev(() => { const ui = window.kilumen.ui; ui.closeAll(); window.kilumen.qolc.chain.record('rillop'); window.kilumen.qolc.chain.record('rillop'); ui.open('qolc_chain'); }); await shot('09_chain');
  console.log(d.n, 'blocked:', JSON.stringify(blocked), 'errors:', errs.length, errs.slice(0, 3).join(' / '));
  await ctx.close();
}
await b.close();

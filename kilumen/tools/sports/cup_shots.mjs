// Town cups shots + clips (dev/sports-events). Usage: PW=/path/to/playwright/index.mjs node tools/sports/cup_shots.mjs
// ROOT=<kilumen dir> MODE=before shoots only the Badges screen (run against main for the "before" shot).
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path'; import net from 'node:net'; import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PW || 'playwright');
const ROOT = process.env.ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), MODE = process.env.MODE || 'after';
const OUT = process.env.OUT || '/workspace/kilumen/shots/sports_events_v1'; fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const DEV = [{ plat: 'pc', w: 1280, h: 720, dpr: 1, touch: false }, { plat: 'phone', w: 780, h: 360, dpr: 2, touch: true }];
const TOWNS = ['fernwick', 'saltmere', 'revival_heights', 'frostspire', 'lanternport', 'cindervale'];
const browser = await chromium.launch(); const report = []; const errs = [];
async function boot(d, vname) {
  const vdir = vname ? path.join(OUT, '.v_' + vname) : null; if (vdir) fs.rmSync(vdir, { recursive: true, force: true });
  const ctx = await browser.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: d.dpr, hasTouch: d.touch, isMobile: d.touch, ...(vdir ? { recordVideo: { dir: vdir, size: { width: d.w, height: d.h } } } : {}) });
  const page = await ctx.newPage(); page.on('pageerror', (e) => errs.push(`${vname || d.plat}: ${e}`));
  await page.addInitScript(() => { try { localStorage.setItem('kilumen_alpha_notice_seen.v1', '1'); } catch {} });
  await page.goto(base); await page.waitForFunction(() => window.kilumen?.ui, null, { timeout: 30000 });
  for (let i = 0; i < 40; i++) { const busy = await page.evaluate(() => { const s = window.kilumen.scene; return !!(s.dialog?.active || s.busy || s.fade || window.kilumen.ui?.active); }); if (!busy && i > 3) break; await page.keyboard.press(i % 2 ? 'f' : 'Enter'); await page.waitForTimeout(500); }
  await page.waitForTimeout(800);
  await page.evaluate(() => { const s = window.kilumen.scene; s.party = [{ uid: 'cup-a', species: 'frostlop', nickname: 'Pip', level: 14, hp: 30 }, { uid: 'cup-b', species: 'capling', level: 11, hp: 25 }, ...(s.party || [])].slice(0, 6); if (s.systems?.wallet) s.systems.wallet.n = 2000; });
  return { ctx, page, vdir };
}
const shot = async (page, name) => { const f = path.join(OUT, name + '.png'); await page.screenshot({ path: f }); report.push(f); };
async function finishClip(b, name) { await b.page.close(); await b.ctx.close(); const v = fs.readdirSync(b.vdir).find((f) => f.endsWith('.webm')); if (v) { const dst = path.join(OUT, name + '.webm'); fs.renameSync(path.join(b.vdir, v), dst); report.push(dst); } fs.rmSync(b.vdir, { recursive: true, force: true }); }
async function badges(d, tag, seedWins) {
  const b = await boot(d); const { page } = b;
  if (seedWins) await page.evaluate(() => { const st = window.kilumen.scene.systems.state; st.sports ||= {}; st.sports.wins = Math.max(st.sports.wins || 0, 1); st.sports.town ||= {};
    for (const [id, n] of [['garden_hop', 2], ['tide_run', 1], ['signal_relay', 1], ['ice_slide', 3], ['lantern_catch', 1], ['forge_push', 1]]) st.sports.town[id] = { best: 50, plays: 4, golds: 1, cups: n, cupEntries: n, cupWindow: -1 }; });
  await page.evaluate(() => window.kilumen.ui.open('badges')); await page.waitForTimeout(1200);
  const scrollTo = async (re) => page.evaluate((src) => { const r = new RegExp(src, 'i'); const el = [...document.querySelectorAll('.bdg-name')].find((e) => r.test(e.textContent)); el?.scrollIntoView({ block: 'start' }); return !!el; }, re);
  await scrollTo('dash|garden|cup'); await page.waitForTimeout(500); await shot(page, `${d.plat}_badges_${tag}`);
  report.push(`${d.plat} badges ${tag}: ` + await page.evaluate(() => [...document.querySelectorAll('.bdg-sub')].map((e) => e.textContent).filter((t) => /soon/i.test(t)).length + ' coming-soon plates'));
  await b.page.close(); await b.ctx.close();
}
try {
  for (const d of DEV) {
    if (MODE === 'before') { await badges(d, 'before', false); continue; }
    for (const town of TOWNS) {
      const name = `${d.plat}_${town}`; const b = await boot(d, name); const { page } = b;
      const day = await page.evaluate((t) => { const sp = window.kilumen.sports, s = window.kilumen.scene; for (let dd = 1; dd < 10; dd++) { s.clock.day = dd; if (sp.town.cupStatus(t).ok) return dd; } return -1; }, town);
      await page.evaluate((t) => { window.kilumen.sports.town.openEvent(t); }, town); await page.waitForTimeout(700); await shot(page, `${name}_1_coach`);
      await page.click('#town-ev [data-a=cup]'); await page.waitForTimeout(700); await shot(page, `${name}_2_cup_field`);
      await page.click('#town-ev [data-a=go]'); await page.waitForTimeout(300);
      const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'f', 'ArrowLeft', 'ArrowUp', 'f', 'ArrowRight'];
      for (let i = 0; i < 26; i++) { await page.keyboard.down(keys[i % keys.length]); await page.waitForTimeout(90); await page.keyboard.up(keys[i % keys.length]); await page.waitForTimeout(60); if (i === 12) await shot(page, `${name}_3_play_crowd`); }
      // dev finish: a winning score so the champion screen shows (score is set the way the event counts it)
      await page.evaluate(() => { const r = window.kilumen.sports.town.state().run; r.score = 99; r.dist = 99; r.left = 0.01; });
      await page.waitForFunction(() => window.kilumen.sports.town.state().phase === 'champion', null, { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(2600); await shot(page, `${name}_4_champion`);
      const st = await page.evaluate(() => { const s = window.kilumen.sports.town.state(); return { cup: s.cup && { place: s.cup.place, prize: s.cup.prize, cups: s.cup.cups }, coins: window.kilumen.scene.systems?.wallet?.coins }; });
      report.push(`${name}: cup day ${day}, ${JSON.stringify(st)}`);
      await page.evaluate(() => window.kilumen.sports.town.tap()); await page.waitForTimeout(800); await shot(page, `${name}_5_result`);
      await finishClip(b, name);
    }
    await badges(d, 'after', true);
  }
} finally { await browser.close(); server.kill(); }
report.push('page errors: ' + (errs.length ? errs.join(' | ') : 'none'));
fs.writeFileSync(path.join(OUT, `report_${MODE}.txt`), report.join('\n') + '\n'); console.log(report.filter((l) => !l.endsWith('.png')).join('\n'));

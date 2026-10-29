// Aurelith Games major + Saltmere Harbour Haul (tug) shots, clips and frame times (dev/sports-major).
// Usage: PW=/path/to/playwright/index.mjs node tools/sports/major_shots.mjs  (phone runs with 4x CPU throttle)
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path'; import net from 'node:net'; import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PW || 'playwright');
const ROOT = process.env.ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), MODE = process.env.MODE || 'after';
const OUT = process.env.OUT || '/workspace/kilumen/shots/sports_major_v1'; fs.mkdirSync(OUT, { recursive: true });
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

const FT = `(() => { window.__ft = []; let last = performance.now(); const f = (t) => { window.__ft.push(t - last); last = t; if (window.__ftOn) requestAnimationFrame(f); }; window.__ftOn = true; requestAnimationFrame(f); })()`;
const ftStop = async (page) => page.evaluate(() => { window.__ftOn = false; const a = window.__ft.slice(5).sort((x, y) => x - y); const q = (p) => a[Math.floor(a.length * p)]?.toFixed(1); return { frames: a.length, p50: q(0.5), p95: q(0.95), max: a.at(-1)?.toFixed(1) }; });
// tug bot: real key events. 'f' on the pulse window, hold ArrowDown while a surge warning is up (the run's own pulse/surge drive the timing)
const BOT = `(() => { const T = window.kilumen.sports.town; let down = false; window.__bot = setInterval(() => { const r = T.state().run; if (!r || r.done || T.state().phase !== 'play') return;
  const kd = (k, c, t) => window.dispatchEvent(new KeyboardEvent(t, { key: k, code: c, bubbles: true }));
  if (r.pulse !== undefined) { if (r.pulse > 0.84 && r.pulse < 0.93 && !r.__tapped) { r.__tapped = 1; kd('f', 'KeyF', 'keydown'); kd('f', 'KeyF', 'keyup'); } if (r.pulse < 0.5) r.__tapped = 0;
    const want = !!(r.surge && r.surge.warn < 0.35); if (want !== down) { down = want; kd('ArrowDown', 'ArrowDown', want ? 'keydown' : 'keyup'); } }
  else { const ks = [['ArrowLeft','ArrowLeft'],['ArrowRight','ArrowRight'],['ArrowUp','ArrowUp'],['f','KeyF']], k = ks[Math.floor(performance.now() / 150) % 4]; kd(k[0], k[1], 'keydown'); setTimeout(() => kd(k[0], k[1], 'keyup'), 70); } }, 16); })()`;
const saveRefused = (page) => page.evaluate(() => { const s = window.kilumen.scene; return s.saveNow() === false || s.saveNow() == null ? 'refused' : 'SAVED'; });
const devFinish = (page) => page.evaluate(() => { const r = window.kilumen.sports.town.state().run; if (!r) return; if (r.pulse !== undefined) r.p = 0.9; else { r.score = 99; r.dist = 99; r.left = 0.01; } });
const ft = [];
try {
  for (const d of DEV) {
    // 1) Harbour Haul practice + cup (played for real by the key bot, no dev finish)
    { const name = `${d.plat}_tug`; const b = await boot(d, name); const { page } = b; if (d.touch) { const c = await page.context().newCDPSession(page); await c.send('Emulation.setCPUThrottlingRate', { rate: 4 }); }
      await page.evaluate(() => { const s = window.kilumen.scene; for (const m of s.party) { m.power = 70; m.stamina = 65; } });
      report.push(`${name} cup day: ` + await page.evaluate(async () => { const s = window.kilumen.scene, T = window.kilumen.sports.town; for (let dd = 1; dd < 10; dd++) { s.clock.day = dd; T.openTug(); await new Promise((r) => setTimeout(r, 50)); const ok = !document.querySelector('#town-ev [data-a=cup]')?.disabled; T.close(); await new Promise((r) => setTimeout(r, 50)); if (ok) return dd; } return -1; }));
      await page.evaluate(() => { window.kilumen.sports.town.openTug(); }); await page.waitForTimeout(700); await shot(page, `${name}_1_coach`);
      await page.click('#town-ev [data-a=go]'); await page.waitForTimeout(500); await shot(page, `${name}_2_pick_crew`);
      await page.click('#town-ev [data-a=go]', { timeout: 800 }).catch(() => {}); await page.evaluate(FT); await page.evaluate(BOT); await page.waitForTimeout(2500);
      await shot(page, `${name}_3_play`); report.push(`${name} save during play: ` + await saveRefused(page));
      await page.waitForFunction(() => window.kilumen.sports.town.state().phase === 'result', null, { timeout: 40000 }).catch(() => {});
      const f1 = await ftStop(page); ft.push(`${name} practice: rAF ${JSON.stringify(f1)}`); await page.waitForTimeout(900); await shot(page, `${name}_4_result`);
      report.push(`${name} practice: ` + JSON.stringify(await page.evaluate(() => { const r = window.kilumen.sports.town.state().run; return r && { won: r.won, score: r.score, p: +r.p.toFixed(2) }; })));
      await page.evaluate(() => window.kilumen.sports.town.close()); await page.waitForTimeout(400);
      await page.evaluate(() => { window.kilumen.sports.town.openTug(); }); await page.waitForTimeout(500); await page.click('#town-ev [data-a=cup]'); await page.waitForTimeout(600); await shot(page, `${name}_5_cup_field`);
      await page.click('#town-ev [data-a=go]'); await page.waitForTimeout(300); await page.click('#town-ev [data-a=go]', { timeout: 800 }).catch(() => {});
      await page.waitForFunction(() => /champion|cup_result/.test(window.kilumen.sports.town.state().phase), null, { timeout: 45000 }).catch(() => {});
      await page.waitForTimeout(2600); await shot(page, `${name}_6_cup_end`);
      report.push(`${name} cup: ` + JSON.stringify(await page.evaluate(() => { const s = window.kilumen.sports.town.state(); return { phase: s.phase, cup: s.cup && { place: s.cup.place, prize: s.cup.prize } }; })));
      await page.evaluate(() => clearInterval(window.__bot)); await finishClip(b, name); }
    // 2) Aurelith Games: locked -> open -> 3 rounds -> champion
    { const name = `${d.plat}_major`; const b = await boot(d, name); const { page } = b; if (d.touch) { const c = await page.context().newCDPSession(page); await c.send('Emulation.setCPUThrottlingRate', { rate: 4 }); }
      await page.evaluate(() => { const s = window.kilumen.scene; s.clock.day = 4; s.systems.wallet.n = 1000; for (const m of s.party) { m.power = 70; m.stamina = 65; } });
      await page.evaluate(() => { window.kilumen.sports.town.openMajor(); }); await page.waitForTimeout(700); await shot(page, `${name}_0_locked`);
      report.push(`${name} locked: ` + await page.evaluate(() => document.querySelector('#major-status')?.textContent));
      await page.click('#town-ev [data-a=back]'); await page.waitForTimeout(300);
      await page.evaluate(() => { const st = window.kilumen.scene.systems.state; st.sports ||= {}; st.sports.town ||= {}; for (const id of ['garden_hop', 'tide_run', 'ice_slide', 'forge_push']) st.sports.town[id] = { best: 50, plays: 3, golds: 1, cups: 1, cupEntries: 1, cupWindow: -1 }; });
      await page.evaluate(() => { window.kilumen.sports.town.openMajor(); }); await page.waitForTimeout(700); await shot(page, `${name}_1_intro`);
      report.push(`${name} intro save: ` + await saveRefused(page));
      await page.click('#town-ev [data-a=enter]'); await page.waitForTimeout(600);
      report.push(`${name} after fee: coins ${await page.evaluate(() => window.kilumen.scene.systems.wallet.coins)}; rounds ${await page.evaluate(() => window.kilumen.sports.town.state().major?.rounds?.join(','))}`);
      await page.evaluate(BOT);
      for (let i = 0; i < 3; i++) {
        await shot(page, `${name}_${2 + i}a_round${i + 1}_card`); await page.click('#town-ev [data-a=go]'); await page.waitForTimeout(300); await page.click('#town-ev [data-a=go]', { timeout: 800 }).catch(() => {});
        await page.evaluate(FT); await page.waitForTimeout(3000); await shot(page, `${name}_${2 + i}b_round${i + 1}_play`); report.push(`${name} r${i + 1} play save: ` + await saveRefused(page));
        const ev = await page.evaluate(() => window.kilumen.sports.town.state().ev); ft.push(`${name} r${i + 1} ${ev}: rAF ${JSON.stringify(await ftStop(page))}`);
        await devFinish(page); // dev finish (shots only): a winning score so the champion path shows
        await page.waitForFunction(() => window.kilumen.sports.town.state().phase === 'major_table', null, { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(500); await shot(page, `${name}_${2 + i}c_round${i + 1}_table`); await page.click('#town-ev [data-a=next]'); await page.waitForTimeout(600);
      }
      await page.waitForTimeout(2600); await shot(page, `${name}_5_champion`); report.push(`${name} champion save: ` + await saveRefused(page));
      await page.evaluate(() => window.kilumen.sports.town.tap()); await page.waitForTimeout(900); await shot(page, `${name}_6_final`);
      report.push(`${name} end: ` + JSON.stringify(await page.evaluate(() => { const s = window.kilumen.scene; return { phase: window.kilumen.sports.town.state().phase, coins: s.systems.wallet.coins, majorWins: s.systems.state.sports?.major?.wins }; })));
      await page.click('#town-ev [data-a=back]', { timeout: 800 }).catch(() => {}); await page.waitForTimeout(300); report.push(`${name} after close save: ` + await saveRefused(page));
      await page.evaluate(() => window.kilumen.ui.open('badges')); await page.waitForTimeout(1200);
      await page.evaluate(() => { const el = [...document.querySelectorAll('.bdg-name')].find((e) => /aurelith games|harbour/i.test(e.textContent)); el?.scrollIntoView({ block: 'center' }); }); await page.waitForTimeout(400); await shot(page, `${name}_7_badges`);
      report.push(`${name} badges coming-soon plates: ` + await page.evaluate(() => [...document.querySelectorAll('.bdg-sub')].filter((e) => /soon/i.test(e.textContent)).length));
      await page.evaluate(() => clearInterval(window.__bot)); await finishClip(b, name); }
  }
} finally { await browser.close(); server.kill(); }
report.push(...ft, 'page errors: ' + (errs.length ? errs.join(' | ') : 'none'));
fs.writeFileSync(path.join(OUT, 'report.txt'), report.join('\n') + '\n'); console.log(report.filter((l) => !l.endsWith('.png')).join('\n'));

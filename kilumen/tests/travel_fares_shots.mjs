// Fare confirm shots (Coder, Oct 29 2026). LOCAL ONLY. PC 1920x1080 + phone 844x390.
// Dev shortcuts: ?ov=regionmap, flags has_skylift/has_rail_pass/visited_*, wallet set, commuter_benefit rank set on the
// company board (region pinned 4). Usage: node tests/travel_fares_shots.mjs [outdir]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path'; import net from 'node:net'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2] || path.join(ROOT, 'shots/board_fish_sports_v2'); fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const VIEWS = [
  { plat: 'pc', ctx: { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 }, q: 'platform=pc' },
  { plat: 'phone', ctx: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, q: 'platform=mobile&touch=1' },
];
const report = { checks: [], errors: [], shots: [] };
const check = (plat, what, ok, info = '') => { report.checks.push({ plat, what, ok: !!ok, info }); console.log(ok ? 'PASS' : 'FAIL', plat, what, String(info).slice(0, 300)); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
try {
  for (const v of VIEWS) {
    const ctx = await browser.newContext(v.ctx), page = await ctx.newPage();
    page.on('pageerror', (e) => report.errors.push(`${v.plat}: ${e}`));
    const S = (fn, a) => page.evaluate(fn, a);
    let n = 0; const shot = async (label) => { const f = `${String(++n).padStart(2, '0')}_${v.plat}_${label}.png`; await page.screenshot({ path: path.join(OUT, f) }); report.shots.push(f); };
    await page.goto(`${base}?audio=0&online=0&hour=12&weather=clear&skipintro=1&reset=1&ov=regionmap&lead=tumbloam&${v.q}`);
    await page.waitForFunction(() => window.kilumen?.scene?.systems?.wallet && window.kilumen.scene.overnight?.region && window.kilumen.scene.layout, null, { timeout: 30000 });
    await wait(1200);
    for (let i = 0; i < 3 && await S(() => !!document.querySelector('.ui-modal')); i++) { await page.locator('.ui-modal').getByText('Got it').first().click({ timeout: 3000 }).catch(() => {}); await wait(300); }
    await page.waitForFunction(() => !window.kilumen.scene.busy && !window.kilumen.scene.fade, null, { timeout: 20000 }).catch(() => {});
    const drain = async () => { for (let i = 0; i < 40; i++) { const st = await S(() => { const s = window.kilumen.scene, d = s.dialog; if (window.kilumen.ui.active) window.kilumen.ui.closeAll?.(); if (d?.cur) { d._tap = d.cur.type === 'ask' ? { b: true } : { a: true }; return 'dlg'; } return s.busy || s.fade ? 'busy' : 'idle'; }); if (st === 'idle') return; await wait(250); } };
    await drain();
    await S(() => { const s = window.kilumen.scene, d = s.layout.fly.destinations.brookhollow, fp = d.fly_point; s.startWarp({ map: d.map, x: fp.x, y: fp.y + 1, facing: 'down' }, 'dev'); });
    await page.waitForFunction(() => window.kilumen.scene.map?.name === 'brookhollow' && !window.kilumen.scene.fade && !window.kilumen.scene.busy, null, { timeout: 20000 }).catch(() => {});
    await wait(1200); await drain(); await wait(400);
    const mapName = await S(() => window.kilumen.scene.map.name + ' busy=' + window.kilumen.scene.busy);
    const dlgText = () => S(() => { const d = window.kilumen.scene.dialog; return (d?.text?.textContent || '') + ' ' + window.__dbg + ' cur=' + d?.cur?.type + ' || ' + [...document.querySelectorAll('.dlg li')].map((e) => e.textContent).join('/'); });
    const run = async (label, setup, call, expect) => {
      await S(setup);
      await S((c) => { const d = window.kilumen.scene.dialog; const r = window.kilumen.scene.overnight?.region; r.enabled = true; if (!window.kilumen.scene.party.length) window.kilumen.scene.party.push({ species: 'tumbloam', level: 5, hp: 20, maxHp: 20 }); window.__dbg = 'en=' + r?.enabled + ' busy=' + window.kilumen.scene.busy + ' party=' + window.kilumen.scene.party?.length; window.__t = r?.[c[0]](c[1]); }, call);
      await wait(4000);
      const t = await dlgText();
      check(v.plat, label, expect.test(t), t.replace(/\s+/g, ' ').slice(0, 200));
      await shot(label);
      await drain(); await wait(500);
    };
    const setup = (coins, rank) => `(() => { const s = window.kilumen.scene, sys = s.systems; for (const f of ['has_skylift','has_rail_pass','visited_brookhollow','visited_fernwick','visited_saltmere','visited_lanternport','visited_aurelith','visited_revival_heights']) s.flags.add(f);
      sys.wallet.n = ${coins}; const rt = sys.rtBenefits; rt.opts.region = 4; rt.region = 4; rt.company.board.commuter_benefit = ${rank}; s.overnight.region.lastTown = 'saltmere'; })()`;
    check(v.plat, 'warped to brookhollow (outdoors)', /^brookhollow busy=false/.test(mapName), mapName);
    await run('skylift_fare_full', setup(500, 0), ['travelTo', 'fernwick'], /coins/);
    await run('skylift_fare_commuter_III', setup(500, 3), ['travelTo', 'fernwick'], /before your Commuter/);
    await run('skylift_short_walk', setup(20, 0), ['travelTo', 'fernwick'], /walk/);
    await run('rail_fare_commuter_II', setup(500, 2), ['railTo', 'aurelith'], /before your Commuter|coins/);
    await run('rail_broke_standby', setup(0, 0), ['railTo', 'aurelith'], /standby/i);
    await ctx.close();
  }
} finally { await browser.close(); server.kill(); }
check('all', 'no page errors', report.errors.length === 0, report.errors.slice(0, 4).join(' | '));
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
const fails = report.checks.filter((c) => !c.ok); console.log('checks', report.checks.length, 'fails', fails.length); process.exitCode = fails.length ? 1 : 0;

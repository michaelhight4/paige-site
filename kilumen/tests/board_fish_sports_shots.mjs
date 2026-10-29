// Board fish/sports shots (Oct 29 2026, coder). LOCAL ONLY. PC 1920x1080 + phone 844x390: RT Employee Benefits tab with the new
// Angler / Wellness / Commuter / R&D Clearance / Executive Perks branches, a detail panel, and phone frame time.
// Dev shortcuts (named in the report): region pinned to 4, ID level 12, points granted, a few ranks pre-bought via rt.buy().
// Usage: node tests/board_fish_sports_shots.mjs [outdir]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2] || path.join(ROOT, 'shots/board_fish_sports_v1');
fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const VIEWS = [
  { plat: 'pc', ctx: { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 }, q: 'platform=pc' },
  { plat: 'phone', ctx: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, q: 'platform=mobile&touch=1' },
];
const report = { checks: [], errors: [], shots: [], frame: {} };
const check = (plat, what, ok, info = '') => { report.checks.push({ plat, what, ok: !!ok, info }); console.log(ok ? 'PASS' : 'FAIL', plat, what, String(info).slice(0, 300)); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BLOCKED = /\bPP\b|shiny|berry|berries|\bthrow/i;
const NEWB = ['angler_plan', 'wellness_plan', 'commuter_plan', 'rnd_clearance', 'executive_perks'];
const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
try {
  for (const v of VIEWS) {
    const ctx = await browser.newContext(v.ctx), page = await ctx.newPage();
    page.on('pageerror', (e) => report.errors.push(`${v.plat}: ${e}`));
    page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) report.errors.push(`${v.plat} console: ${m.text()}`); });
    const S = (fn, a) => page.evaluate(fn, a);
    let n = 0;
    const shot = async (label) => { const f = `${String(++n).padStart(2, '0')}_${v.plat}_${label}.png`; await page.screenshot({ path: path.join(OUT, f) }); report.shots.push(f); };
    await page.goto(`${base}?audio=0&online=0&hour=12&weather=clear&skipintro=1&reset=1&${v.q}`);
    await page.waitForFunction(() => window.kilumen?.ui?.scr_rt_benefits && window.kilumen.scene.systems?.rtBenefits?.data, null, { timeout: 30000 });
    await wait(1000);
    const bought = await S(() => {
      const rt = window.kilumen.scene.systems.rtBenefits; rt.opts.region = 4; rt.region = 4;
      Object.assign(rt.company, { idLevel: 12, pointsFree: 30 });
      const out = {}; for (const id of ['rod_steady_grip', 'rod_quick_bite', 'bait_allowance', 'grow_stipend', 'wellness_days', 'skill_tidal_audit']) out[id] = rt.buy(id).ok;
      return { out, pts: rt.company.pointsFree, perks: rt.fishingPerks(), feeds: rt.feedPerks(), skills: rt.boardSkills() };
    });
    check(v.plat, 'dev setup: ranks bought through rt.buy', Object.values(bought.out).every(Boolean), JSON.stringify(bought));
    for (let i = 0; i < 4 && await S(() => !!document.querySelector('.ui-modal')); i++) { await page.keyboard.press('Escape'); await wait(300); if (await S(() => !!document.querySelector('.ui-modal'))) { await page.locator('.ui-modal').getByText('Got it').first().click({ timeout: 3000 }).catch(() => {}); await wait(300); } }
    await S(() => window.kilumen.ui.open('phone')); await wait(400);
    await S(() => window.kilumen.ui.open('rt_benefits')); await wait(900);
    if (await S(() => !!document.querySelector('.ui-modal'))) { await page.locator('.ui-modal').getByText('Got it').first().click({ timeout: 3000 }).catch(() => {}); await wait(400); }
    check(v.plat, 'alpha notice dismissed before shots', await S(() => !document.querySelector('.ui-modal')));
    const info = await S(() => ({ nodes: [...document.querySelectorAll('.rtb-node')].map((e) => `${e.dataset.node}:${e.dataset.state}`), heads: [...document.querySelectorAll('.rtb-bh')].map((e) => e.textContent), text: document.querySelector('.ui-root').innerText }));
    check(v.plat, 'tab shows 5 new branches', NEWB.length === info.heads.filter((h) => /Angler|Wellness|Commuter|R&D|Executive/.test(h)).length, info.heads.join(' | '));
    check(v.plat, 'tab text: no blocked words', !BLOCKED.test(info.text), info.text.match(BLOCKED)?.[0] || '');
    check(v.plat, 'commuter + key cards show locked', info.nodes.filter((x) => /^(commuter_benefit|rt_node_station_[mt]|keycard_r[78]):locked$/.test(x)).length === 5, info.nodes.join(','));
    await shot('tab_top');
    for (const b of NEWB) {
      await S((b) => { const h = [...document.querySelectorAll('.rtb-branch')].find((s) => s.querySelector(`[data-node]`) && s.getAttribute('aria-label')); const sec = [...document.querySelectorAll('.rtb-branch')].find((s) => [...s.querySelectorAll('.rtb-node')].some((e) => window.kilumen.scene.systems.rtBenefits.node(e.dataset.node)?.branch === b)); sec?.scrollIntoView({ block: 'start' }); }, b);
      await wait(300); await shot('branch_' + b);
    }
    // detail panel: a board skill and the dormant commuter benefit
    for (let id of ['_warm', 'rod_deep_water', 'skill_team_huddle', 'commuter_benefit', 'rt_node_station_m']) {
      const warm = id === '_warm'; if (warm) id = 'rod_quick_bite'; // first tap after the alpha notice only focuses the list
      const el = page.locator(`.rtb-node[data-node="${id}"]`).first(); await el.scrollIntoViewIfNeeded();
      await S(() => document.querySelectorAll('.ui-modal').forEach((m) => m.remove())); await el.scrollIntoViewIfNeeded(); if (v.plat === 'phone') await el.tap({ timeout: 5000 }); else await el.click({ timeout: 5000 });
      await wait(400);
      if (await S(() => !!window.kilumen.ui.modal)) { await page.keyboard.press('Escape'); await wait(300); }
      const d = await S(() => document.querySelector('#rtbinfo')?.innerText || '');
      if (warm) continue;
      check(v.plat, `detail ${id}`, d.includes(await S((id) => document.querySelector(`.rtb-node[data-node="${id}"] .rtb-nm`).textContent, id)), d.replace(/\s+/g, ' ').slice(0, 160));
      await shot('detail_' + id);
    }
    if (v.plat === 'phone') {
      // frame time: rAF deltas for 4 s with the tab open, then while scrolling the tree
      const ft = await S(async () => {
        const run = (ms, act) => new Promise((res) => { const d = []; let last = performance.now(), t0 = last; const sc = document.querySelector('.rtb-main');
          const f = (t) => { d.push(t - last); last = t; if (act && sc) sc.scrollTop = (sc.scrollTop + 6) % Math.max(1, sc.scrollHeight - sc.clientHeight); if (t - t0 < ms) requestAnimationFrame(f); else res(d.slice(5)); }; requestAnimationFrame(f); });
        const st = (d) => { const s = [...d].sort((a, b) => a - b); return { n: d.length, mean: +(d.reduce((a, b) => a + b, 0) / d.length).toFixed(2), p95: +s[Math.floor(s.length * 0.95)].toFixed(2), max: +s.at(-1).toFixed(2) }; };
        return { idle: st(await run(4000)), scrolling: st(await run(4000, true)) };
      });
      report.frame = ft;
      check(v.plat, 'phone frame time p95 at vsync (<=17 ms; rAF is 60 Hz-locked, so ~16.7 mean = no dropped frames)', ft.idle.p95 <= 17 && ft.scrolling.p95 <= 17, JSON.stringify(ft));
    }
    // reload keeps ranks
    await S(() => window.kilumen.save.flush?.()); await wait(300);
    await page.goto(`${base}?audio=0&online=0&hour=12&weather=clear&skipintro=1&${v.q}`);
    await page.waitForFunction(() => window.kilumen?.scene?.systems?.rtBenefits?.data, null, { timeout: 30000 }); await wait(800);
    const re = await S(() => JSON.parse(JSON.stringify(window.kilumen.scene.systems.rtBenefits.company.board)));
    check(v.plat, 'reload: new ranks persisted', re.rod_steady_grip === 1 && re.skill_tidal_audit === 1 && re.store_discount == null, JSON.stringify(re));
    await ctx.close();
  }
} finally { await browser.close(); server.kill(); }
const KNOWN = /capture_poses\/.*hold_points\.json/;
report.errors = report.errors.filter((e) => !KNOWN.test(e));
check('all', 'no page / console errors', report.errors.length === 0, report.errors.slice(0, 5).join(' | '));
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
const fails = report.checks.filter((c) => !c.ok); console.log('checks', report.checks.length, 'fails', fails.length);
process.exitCode = fails.length ? 1 : 0;

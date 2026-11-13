// Evolution on level-up, browser proof (Coder, Oct 23 2026). PC 1920x1080 + phone landscape 844x390 (touch).
// Per profile: party = one Cindrip ("Pip") 1 XP short of L16 -> a real wild engine battle (tumbloam L6, forced roll) ->
// fight to the win -> battle closes -> "Pip is changing!" + evolution player -> "Pip became Emberlunx!" -> A -> Kilindex
// entry line -> saved AFTER (localStorage) as emberlunx. Second run: B during the hold stops it (stays Cindrip).
// Usage: node tests/evolution_e2e.mjs [pc|phone] -> shots/evolution/<profile>_*.png + report.json. Exit 1 on any FAIL.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'shots/evolution');
fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const want = process.argv.slice(2);
const VIEWS = [
  { plat: 'pc', ctx: { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 }, q: '&platform=pc' },
  { plat: 'phone', ctx: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }, q: '&platform=mobile' },
].filter((v) => !want.length || want.includes(v.plat));
const report = []; let fails = 0;
const check = (ok, msg) => { console.log(ok ? 'PASS' : 'FAIL', msg); report.push({ ok: !!ok, msg }); if (!ok) fails++; };
const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });

async function run(v, cancel) {
  const tag = `${v.plat}${cancel ? '_cancel' : ''}`;
  const ctx = await browser.newContext(v.ctx);
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e))); page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await page.goto(`${base}?reset=1&hour=12&clouds=0&audio=0&bseed=1,2,3,4&map=route1&x=14&y=23${v.q}`);
  await page.waitForFunction(() => window.kilumen?.ui?.sdReady && window.kilumen.scene.systems && window.kilumen.ui.wild?.ready, null, { timeout: 30000 });
  await page.evaluate(() => Promise.all([window.kilumen.ui.sdReady, window.kilumen.ui.wild.ready]));
  await page.waitForFunction(() => !window.kilumen.scene.busy && !window.kilumen.scene.fade, null, { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => { const ui = window.kilumen.ui; if (ui?.stack?.length) ui.closeAll(); });
  const snap = async (name) => { const f = `${tag}_${name}.png`; await page.screenshot({ path: path.join(OUT, f) }); return f; };
  const disk = () => page.evaluate(() => { const r = localStorage.getItem('kilumen.save.v1'); return r ? JSON.parse(r) : null; });
  const pressA = async () => { if (v.ctx.hasTouch) await page.locator('[data-btn="a"]').first().tap({ timeout: 5000 }).catch(() => {}); else await page.keyboard.press('Enter'); };
  const pressB = async () => { if (v.ctx.hasTouch) await page.locator('[data-btn="b"]').first().tap({ timeout: 5000 }).catch(() => {}); else await page.keyboard.press('KeyX'); };
  const state = () => page.evaluate(() => {
    const msg = document.querySelector('#b-msg'), cmds = document.querySelector('#b-cmds'), sc = window.kilumen.scene, evo = document.querySelector('.ax-evo');
    return { open: !!document.querySelector('.ui-battle'), more: !!msg?.querySelector('.more'), cmds: cmds && !cmds.hidden ? [...cmds.querySelectorAll('.b-cmd')].map((e) => e.textContent) : null,
      dlg: !!sc.dialog?.active, dlgText: sc.dialog?.active ? sc.dialog.text?.textContent || '' : '', busy: !!sc.busy, evo: evo ? evo.querySelector('.ax-evo-msg').textContent : null,
      evoWait: !!evo?.classList.contains('evo-wait'), lock: sc.saveLockReason(), species: sc.party.map((c) => c.species), level: sc.party[0]?.level };
  });
  const tap = async (sel) => { const el = page.locator(sel).first(); await el.waitFor({ state: 'visible', timeout: 15000 }); await el.click({ timeout: 15000 }); };

  // 1) party + forced wild roll (real engine battle)
  const setup = await page.evaluate(async () => {
    const { createCreature, xpForLevel } = await import('/src/systems/creature.js');
    const sc = window.kilumen.scene, c = createCreature({ species: 'cindrip', level: 15, nickname: 'Pip', warmth: 40, origin: { how: 'starter', map: 'route1' } });
    c.xp = xpForLevel(16) - 1; sc.party.length = 0; sc.party.push(c); sc._placeFollower?.(); await sc._loadActorSprites?.(); sc._dirty = true; sc.saveNow();
    window.kilumen.ui.wild.roller.step = () => ({ species: 'tumbloam', level: 6, table: 'e2e', t: 0 });
    return { evolution: !!sc.evolution, party: sc.party.map((p) => `${p.species} L${p.level}`) };
  });
  check(setup.evolution, `${tag}: evolution attached (scene.evolution)`);
  await sleep(400); await snap('0_before_cindrip_L15');
  await page.evaluate(() => { const s = window.kilumen.scene; s.hooks.onEncounterTile(s.player.x, s.player.y, 0); });
  // 2) fight to the end
  let shotBattle = false, s;
  for (let n = 0, t = Date.now(); Date.now() - t < 60000; n++) {
    s = await state();
    if (!s.open) break;
    if (s.more) { await page.locator('#b-msg').first().click({ timeout: 2000 }).catch(() => {}); await sleep(150); continue; }
    if (s.cmds) {
      if (!shotBattle) { await sleep(300); await snap('1_battle'); shotBattle = true; }
      if (s.cmds.length === 4 && /Skills/.test(s.cmds[0])) { await tap('#b-cmds .b-cmd[data-i="0"]'); await sleep(250); s = await state(); }
      if (s.cmds) await tap('#b-cmds .b-cmd:not([style*="opacity"])').catch(() => {});
      if (await page.locator('.ui-modal [data-m="0"]').count()) await tap('.ui-modal [data-m="0"]').catch(() => {});
    }
    await sleep(150);
  }
  const res = await page.evaluate(() => window.kilumen.ui.lastBattle && { outcome: window.kilumen.ui.lastBattle.outcome });
  check(res?.outcome === 'win', `${tag}: wild battle won (${JSON.stringify(res)})`);
  // 3) evolution sequence
  const seen = { start: null, end: null, lockDuring: null, savedDuring: null, kilindexLine: null };
  let shots = 0, bSent = false;
  for (let t = Date.now(); Date.now() - t < 40000;) {
    s = await state();
    if (s.evo && !s.evoWait) {
      if (!seen.start) {
        seen.start = s.evo; seen.lockDuring = s.lock;
        seen.savedDuring = await page.evaluate(() => window.kilumen.scene.saveNow());
        await snap('2_is_changing'); shots++;
        if (cancel) { await sleep(500); await pressB(); bSent = true; await sleep(200); await snap('3_b_pressed'); }
      } else if (!cancel && shots === 1) { await sleep(1700); await snap('3_reveal'); shots++; }
      await sleep(100); continue;
    }
    if (s.evo && s.evoWait) { seen.end = s.evo; await snap(cancel ? '4_stopped' : '4_became'); const mid = await disk(); seen.diskAtEnd = mid?.party?.[0]?.species; await sleep(300); await pressA(); await sleep(400); continue; }
    if (s.dlg) { if (/Kilindex/.test(s.dlgText)) { seen.kilindexLine = s.dlgText; await snap('5_kilindex_entry'); } await sleep(400); await pressA(); await sleep(300); continue; }
    if (seen.end && !s.busy) break;
    await sleep(120);
  }
  await sleep(800);
  const after = await state(); const saved = await disk();
  await snap('6_after');
  const full = await page.evaluate(() => { const c = window.kilumen.scene.party[0]; return { species: c.species, level: c.level, nickname: c.nickname, hp: c.hp, kilindex: window.kilumen.scene.systems.kilindex?.isCaught('emberlunx'), log: window.kilumen.scene.evolution.log }; });
  check(/Pip/.test(seen.start || '') && /changing/i.test(seen.start || ''), `${tag}: start text "${seen.start}"`);
  check(seen.lockDuring && seen.savedDuring === false, `${tag}: save refused mid-evolution (lock '${seen.lockDuring}')`);
  if (cancel) {
    check(bSent && full.species === 'cindrip', `${tag}: B stopped it, still ${full.species} L${full.level}`);
    check(/Pip/.test(seen.end || ''), `${tag}: stopped text "${seen.end}"`);
  } else {
    check(full.species === 'emberlunx' && full.level === 16 && full.nickname === 'Pip', `${tag}: became ${full.species} L${full.level} "${full.nickname}"`);
    check(/Pip/.test(seen.end || '') && /Emberlunx/.test(seen.end || ''), `${tag}: end text "${seen.end}"`);
    check(seen.diskAtEnd === 'cindrip', `${tag}: disk still has the pre-evolution save while the end text is up (${seen.diskAtEnd})`);
    check(full.kilindex && /Emberlunx/.test(seen.kilindexLine || ''), `${tag}: Kilindex registered the new form ("${seen.kilindexLine}")`);
    check(saved?.party?.[0]?.species === 'emberlunx', `${tag}: saved AFTER the evolution (disk party[0] = ${saved?.party?.[0]?.species})`);
  }
  check(!after.busy && !after.evo, `${tag}: back to the overworld`);
  check(!errs.length, `${tag}: no page errors ${errs.slice(0, 3).join(' | ')}`);
  report.push({ tag, setup, seen, full, errs: errs.slice(0, 5) });
  await ctx.close();
}

try { for (const v of VIEWS) { await run(v, false); await run(v, true); } }
catch (e) { check(false, 'script: ' + e.stack); }
finally { await browser.close(); server.kill(); }
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ when: new Date().toString(), fails, report }, null, 1));
console.log(fails ? `${fails} FAIL` : 'ALL PASS');
process.exit(fails ? 1 : 0);

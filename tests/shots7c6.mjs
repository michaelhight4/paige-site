// 7c6 phone shots (390x844): coaching squad + transfers, social accounts. TAG=before|after node tests/shots7c6.mjs
import { loadPuppeteer } from './_pp.mjs'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const puppeteer = loadPuppeteer(); const ROOT = new URL('..', import.meta.url).pathname, PORT = 18893, SHOTS = '/workspace/lifesim_shots_7c6', TAG = process.env.TAG || 'after'; fs.mkdirSync(SHOTS, { recursive: true });
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 800));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let fails = 0; const ok = (n, c, i = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : '')); };
const page = await browser.newPage(); await page.setViewport({ width: 390, height: 844, isMobile: true });
await page.goto(`http://127.0.0.1:${PORT}/index.html?fresh=1&nosave=1&seed=9&age=30&cash=5000000`); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForFunction(() => window.__ready === true, { timeout: 20000 }); await sleep(500);
const A = (code) => page.evaluate(`(async()=>{const {adapter}=await import('/ui/js/adapter.js'); ${code}})()`);
const full = async (n) => { await page.screenshot({ path: `${SHOTS}/${TAG}_${n}.png`, fullPage: true }); };
await A("const a=adapter.impl; a.s.flags.ex_pro=1; a.s.school=null; a.s.edu=2; a.s.job=null; a.s.pending.length=0; return adapter.coachAction('take','soccer')");
await page.click('[data-tab=occupation]'); await sleep(700);
const scrollTo = (txt) => page.evaluate((t) => { const e = [...document.querySelectorAll('.panel.top .sec, .panel.top h4, .panel.top [data-el]')].find((x) => x.textContent.trim().startsWith(t)); if (e) e.scrollIntoView(); return !!e; }, txt);
ok('My Job coaching visible', await page.evaluate(() => !!document.querySelector('[data-el=coach-card]')));
await scrollTo('Squad'); await sleep(200); await page.screenshot({ path: `${SHOTS}/${TAG}_coach_squad.png` }); await full('coach_myjob_full');
const groups = await page.evaluate(() => [...document.querySelectorAll('.panel.top [data-el=pos-group]')].map((e) => e.textContent.trim()));
console.log('groups:', JSON.stringify(groups));
await A("const a=adapter.impl; a.s.social=null; a.socialAction('chirpr','open'); a.socialAction('vidnest','open'); a.socialAction('snapfolio','open'); a.socialAction('clipwave','open'); const ac=a.s.social.accounts; ac.chirpr.followers=4033374890875975.5e6; ac.vidnest.followers=578398.2e6; ac.snapfolio.followers=12345678; ac.clipwave.followers=45210; a.s.social.prompt=null; a.s.pending.length=0; return 1");
await page.click('[data-tab=relationships]'); await sleep(600); await page.evaluate(() => document.querySelector('[data-stab=profiles]')?.click()); await sleep(600);
await page.screenshot({ path: `${SHOTS}/${TAG}_social_accounts.png` });
const st = await page.evaluate(() => document.querySelector('.panel.top')?.innerText || ''); console.log('social:', st.slice(0, 600).replace(/\n/g, ' | '));
if (TAG === 'after') {
  await A("const a=adapter.impl,s=a.s; s.coach=null; s.edu=3; s.stats.smarts=90; s.pending.length=0; const g=await adapter.getJobs(); const all=(g.groups||[]).flatMap((x)=>x.jobs||[]).concat(g.jobs||[]); const j=all.find((x)=>x.eligible!==false&&!String(x.id).startsWith('mil:')); for(let k=0;k<20&&!s.job;k++) await adapter.applyJob(j.id); if(s.job) s.job.yrs=25; if(s.sl&&s.sl.job) s.sl.job.years=25; s.pending.length=0; const U=await import('/ui/js/ui.js'); U.store.state=await adapter.getState(); return !!s.job");
  console.log("job?", await A("return JSON.stringify([!!adapter.impl.s.job, adapter.impl.s.pending.length])")); await page.click("[data-tab=more]").catch(() => {}); await sleep(300); await page.click("[data-tab=occupation]"); await sleep(700); console.log((await page.evaluate(() => document.querySelector(".panel.top")?.innerText || "")).slice(0, 900).replace(/\n/g, " | "));
  ok('retire countdown shown', await page.evaluate(() => !!document.querySelector('[data-el=retire-countdown]'))); await page.evaluate(() => document.querySelector('[data-el=retire-countdown]')?.scrollIntoView()); await page.screenshot({ path: `${SHOTS}/after_myjob_retire.png` });
  await page.evaluate(() => document.querySelector('[data-act=retire]')?.click()); await sleep(800); ok('retire popup shows pension', await page.evaluate(() => !!document.querySelector('[data-el=retire-quote]'))); await page.screenshot({ path: `${SHOTS}/after_retire_popup.png` });
  await page.evaluate(() => [...document.querySelectorAll('.sheet .btn, .overlay .btn')].find((b) => /Cancel/.test(b.textContent))?.click()); await sleep(400);
  await A("const a=adapter.impl,s=a.s; const {slice}=await import('/src/slice_bridge.js'); const sl=slice(s); sl.market.stk_atlas=100; a.invest('stk_atlas',50000); sl.market.stk_atlas=130; a.investSellUnits('stk_atlas',100); sl.divBal=1234.5; return 1");
  await page.click('[data-tab=assets]'); await sleep(600); const okP = await page.evaluate(() => { const r = [...document.querySelectorAll('.panel.top .row')].find((e) => /Invest/i.test(e.textContent)); if (r) { r.click(); return true; } return false; }); await sleep(800);
  ok('portfolio lifetime row', okP && await page.evaluate(() => !!document.querySelector('[data-el=lifetime-pnl]'))); await page.evaluate(() => document.querySelector('[data-el=portfolio]')?.scrollIntoView()); await page.screenshot({ path: `${SHOTS}/after_portfolio.png` });
}
await browser.close(); srv.kill(); process.exit(fails ? 1 : 0);

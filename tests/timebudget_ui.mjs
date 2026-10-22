// UI test @390px: Time & Stress screen (Work menu + More), budget bar, warnings, relief, second job. node tests/timebudget_ui.mjs
import { loadPuppeteer } from './_pp.mjs'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const puppeteer = loadPuppeteer(); const ROOT = new URL('..', import.meta.url).pathname, PORT = 18873, SHOTS = process.env.SHOTS || '/workspace/lifesim_art128/feature_shots8'; fs.mkdirSync(SHOTS, { recursive: true });
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 800));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let fails = 0; const errors = [];
const ok = (n, c, i = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : '')); };
const page = await browser.newPage(); await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: false });
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); }); page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
await page.goto(`http://127.0.0.1:${PORT}/index.html?fresh=1&nosave=1&seed=9&age=30&cash=500000000`); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForFunction(() => window.__ready === true, { timeout: 20000 }); await sleep(600);
const A = (code) => page.evaluate(`(async()=>{const {adapter}=await import('/ui/js/adapter.js'); ${code}})()`);
const shot = (n) => page.screenshot({ path: `${SHOTS}/${n}.png` });
const top = () => page.evaluate(() => document.querySelector('.panel.top')?.innerText || '');
const clickRow = (text) => page.evaluate((text) => { const el = [...document.querySelectorAll('.row')].find((e) => e.textContent.includes(text)); if (el) { el.scrollIntoView(); el.click(); return true; } return false; }, text);
const clickId = async (id) => { const r = await page.evaluate((i) => { const e = document.querySelector(`.panel.top [data-id="${i}"]`); if (e) { e.scrollIntoView(); e.click(); return true; } return false; }, id); await sleep(500); return r; };
const back = async () => { await page.evaluate(() => document.querySelector('[data-nav=back]')?.click()); await sleep(400); };
await A(`const a=adapter.impl; a.s.school=null; a.s.edu=2; a.s.job={id:(await import('/src/data.js')).D.careers[0].id,level:0,perf:60,yrs:0,lvlYrs:0}; a.s.stats.stress=30; return 1`);
await page.click('[data-tab=occupation]'); await sleep(400); await page.evaluate(() => document.querySelector('.panel.top [data-wtab=all]')?.click()); await sleep(400); ok('Work menu has Time & Stress', await clickRow('Time & Stress')); await sleep(600);
let t = await top(); ok('calm state: stress card, budget bar, commitments, relief', !!(await page.$('[data-el=tb-stress]')) && !!(await page.$('[data-el=tb-bar]')) && /Main job/.test(t) && /Mental health day/.test(t) && /Free/.test(t) && /Sleep/.test(t) && !/Commute/.test(t), t.slice(60, 200).replace(/\n/g, ' | ')); await shot('01_time_budget_calm');
await A(`const a=adapter.impl; for(let i=0;i<9;i++) a.s.biz.push({id:'b'+i,name:'Shop'+i}); a.s.stream={active:true,schedule:'grind'}; a.s.stats.stress=82; return 1`); await back(); await clickRow('Time & Stress'); await sleep(600);
t = await top(); ok('high-stress warning shows with committed hours and shrunken rest/sleep', /High stress/.test(t) && /health, mood/.test(t) && /committed of 119h/.test(t)); await page.evaluate(() => window.scrollTo(0, 0)); await shot('02_time_budget_high_stress');
await A(`const a=adapter.impl; a.s.stats.stress=93; return 1`); await back(); await clickRow('Time & Stress'); await sleep(600); t = await top(); ok('burnout warning mentions Autopilot stop', /Burnout/.test(t) && /Autopilot has stopped/.test(t)); await shot('03_time_budget_burnout');
await clickId('relief:vacation'); const st = await A(`return adapter.impl.s.stats.stress`); ok('vacation relief lowers stress', st < 80, String(st)); await shot('04_time_budget_after_relief');
await clickId('second:pick').catch(() => {}); const sheetOpen = await page.$('.sheet .opt'); if (sheetOpen) { await shot('05_second_job_picker'); await page.keyboard.press('Escape'); await page.evaluate(() => document.querySelector('.sheet .scrim, .scrim')?.click()); await sleep(300); }
await A(`const a=adapter.impl; a.s.biz.length=0; a.s.stream=null; return 1`); await back(); await page.click('[data-tab=more]'); await sleep(400); ok('More directory has Time & Stress', await clickRow('Time & Stress')); await sleep(500); ok('opens the same screen', !!(await page.$('[data-el=tb-budget]'))); await shot('06_time_budget_from_more');
ok('no console errors', errors.length === 0, errors.slice(0, 2).join(' | ')); await browser.close(); srv.kill(); console.log(fails ? 'timebudget_ui: FAIL ' + fails : 'timebudget_ui: PASS'); process.exit(fails ? 1 : 0);

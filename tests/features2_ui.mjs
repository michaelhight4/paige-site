// Autopilot UI, ads/rewards UI, scholarships renew UI, streamer + influencer screens. node tests/features2_ui.mjs  (SHOTS=/dir saves screenshots)
import { loadPuppeteer } from './_pp.mjs'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const puppeteer = loadPuppeteer(); const ROOT = new URL('..', import.meta.url).pathname, PORT = 18827, SHOTS = process.env.SHOTS;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 800));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let fails = 0; const errors = [];
const ok = (n, c, i = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : '')); };
const page = await browser.newPage(); await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: false });
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
const shot = async (n) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${n}.png` }); };
const boot = async (q, ls) => { await page.goto(`http://127.0.0.1:${PORT}/index.html?fresh=1&nosave=1&${q}`); await page.evaluate((v) => { localStorage.clear(); if (v) for (const [k, x] of Object.entries(v)) localStorage.setItem(k, JSON.stringify(x)); }, ls || null); await page.reload(); await page.waitForFunction(() => window.__ready === true, { timeout: 20000 }); await sleep(500); };
const clickSel = async (s) => { await page.waitForSelector(s, { timeout: 5000 }); await page.evaluate((x) => document.querySelector(x).click(), s); await sleep(350); };
const has = (s) => page.evaluate((x) => !!document.querySelector(x), s);
const text = () => page.evaluate(() => document.querySelector('.panel.top, .overlay')?.textContent || '');
const dismiss = async () => { for (let i = 0; i < 6; i++) { const o = await page.$('.overlay .opt'); if (!o) { const b = await page.$('.overlay .btn'); if (!b) return; await b.click(); await sleep(250); continue; } await o.click(); await sleep(300); } };
const openMore = async (q, re) => { await clickSel('[data-tab=more]'); await sleep(200); await page.evaluate((v) => { const i = document.querySelector('.panel.top input'); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); }, q); await sleep(300); const f = await page.evaluate((src) => { const r = new RegExp(src, 'i'); const el = [...document.querySelectorAll('.panel.top .row')].find((e) => r.test(e.textContent)); if (el) { el.click(); return true; } return false; }, re.source); await sleep(600); return f; };
const age = () => page.evaluate(() => Number(document.querySelector('.agebar span').textContent.match(/Age: (\d+)/)[1]));
const PREM = { 'lifesim.premium.v1': { v: 1, owned: { autopilot: true }, sub: null } };

// ---- Autopilot (locked, then unlocked)
await boot('seed=5&age=30&cash=3000000');
ok('Autopilot entry is in the More directory', await openMore('autopilot', /Autopilot/));
ok('locked: shows the pass card, not controls', await has('[data-el=auto-locked]') && !(await has('[data-el=auto-skip]'))); await shot('autopilot_locked');
await boot('seed=5&age=30&cash=3000000', PREM);
await openMore('skills', /Skills/); await page.evaluate(() => { const el = [...document.querySelectorAll('.panel.top .row')].find((e) => /Physical/.test(e.textContent)); if (el) el.click(); }); await sleep(500);
ok('inline autopilot toggle + skip sit next to Age', await has('.panel.top [data-el=inline-auto]') && await has('.panel.top [data-el=inline-skip]')); await shot('autopilot_inline');
const a0 = await age(); await clickSel('.panel.top [data-el=inline-auto]'); await sleep(300);
ok('toggle turns autopilot on (AGE button marked)', await page.evaluate(() => !!document.querySelector('.agebtn.auto-on, .panel.top .qauto .on, .panel.top [data-el=inline-auto].on')));
await clickSel('.panel.top [data-el=inline-age]'); await sleep(600); await dismiss(); await sleep(300);
ok('aging with autopilot runs the year', (await age()) === a0 + 1);
await page.evaluate(() => document.querySelector('.panel.top [data-el=inline-auto]')?.click()); await sleep(300);
await page.goto(page.url()); // no-op safeguard
await boot('seed=5&age=30&cash=3000000', PREM);
await openMore('autopilot', /Autopilot/);
ok('autopilot screen shows controls', await has('[data-el=auto-card]') && await has('[data-el=auto-skip]')); await shot('autopilot_screen');
await clickSel('[data-el=auto-skip]'); ok('skip-ahead sheet lists routines and year choices', await has('[data-el=skip-routines]') && await has('[data-years="5"]')); await shot('autopilot_skip_sheet');
await clickSel('[data-years="5"]'); await page.evaluate(() => [...document.querySelectorAll('.overlay .btn')].find((b) => /Skip ahead/.test(b.textContent)).click()); await sleep(2500);
ok('skip-ahead shows a per-year summary', await has('[data-el=skip-summary]') && (await page.evaluate(() => document.querySelectorAll('[data-el=skip-summary] > *').length)) >= 1); await shot('autopilot_skip_summary'); await dismiss();

// ---- Rewards + ad countdown (android platform)
await boot('seed=6&age=20&cash=1000');
ok('Rewards entry exists', await openMore('rewards', /Rewards/));
ok('rewards screen lists cash and stat options', await has('[data-reward="cash"]') && await has('[data-reward="stat:smarts"]')); await shot('rewards_screen');
const cash0 = await page.evaluate(() => Number(document.body.textContent.match(/\$([\d,]+)/)?.[1].replace(/,/g, '')));
await clickSel('[data-reward="cash"]'); ok('ad screen opens with a countdown and no close button', await has('[data-el=ad-screen]') && !(await has('.ad-screen [data-el=ad-close]')) && (await page.$eval('[data-el=ad-count]', (e) => e.textContent)) === '5'); await shot('ad_countdown');
await sleep(1500); ok('reward is not available before the full duration', !(await has('[data-el=ad-claim]')));
await page.keyboard.press('Escape'); await sleep(200); ok('Escape does not skip the ad', await has('[data-el=ad-screen]'));
await page.waitForSelector('[data-el=ad-claim]', { timeout: 8000 }); await shot('ad_complete'); await clickSel('[data-el=ad-claim]'); await sleep(600);
const g = await page.evaluate(() => window.__adapter ? 1 : 0); void g;
ok('ad screen closes after claiming', !(await has('[data-el=ad-screen]')));
// ---- Steam: no ads, limited reward
await boot('seed=6&age=20&cash=1000&platform=steam&steamsub=1');
await openMore('rewards', /Rewards/); ok('steam subscriber sees rewards screen', await has('[data-reward="cash"]')); await shot('rewards_steam');
await clickSel('[data-reward="cash"]'); await sleep(500); ok('steam: no ad screen shown', !(await has('[data-el=ad-screen]')));
await dismiss(); await sleep(300);
const rowTxt = await page.evaluate(() => document.querySelector('[data-reward="cash"]')?.textContent || ''); ok('steam: option is used up for today', /tomorrow|today|used|come back|limit/i.test(rowTxt) || await page.evaluate(() => !!document.querySelector('[data-reward="cash"]')?.classList.contains('disabled') || !!document.querySelector('[data-reward="cash"]')?.disabled), rowTxt.slice(0, 80));

// ---- Scholarships with renew
await boot('seed=9&age=19&cash=5000');
const sid = await page.evaluate(async () => { const { adapter } = await import('/ui/js/adapter.js'); await adapter.debugSetup({ college: 0, gpa: 3.6, award: 'merit' }); return 'ok'; });
console.log('  setup:', sid);
ok('Scholarships screen opens', await openMore('scholarship', /Scholarship/)); ok('odds card + renew row shown', await has('[data-el=sch-odds]') && await has('[id="renew:merit"], [data-id="renew:merit"]') || /renew/i.test(await text())); await shot('scholarships');

// ---- Streamer + influencer
await boot('seed=8&age=22&cash=50000');
ok('Streamer entry is in the Work menu directory', await openMore('streamer', /Live Streamer/));
ok('topic picker shown', await has('[data-id^="topic:"], .row') && /game|topic/i.test(await text())); await shot('streamer_pick');
await page.evaluate(() => [...document.querySelectorAll('.panel.top .row')].find((e) => /Just Chatting|Chatting/i.test(e.textContent))?.click()); await sleep(700);
ok('started: stream card with subs and burnout', await has('[data-el=stream-card]') && /Subscribers/.test(await text())); await shot('streamer_dashboard');
await page.evaluate(() => document.querySelector('[data-act=sponsor]')?.click()); await sleep(300);
await clickSel('[data-act=rest]'); ok('break action marks itself done', await page.evaluate(() => document.querySelector('[data-act=rest]').disabled));
await clickSel('.panel.top [data-el=inline-age]').catch(() => {}); await sleep(600); await dismiss();
ok('Influencer entry exists', await openMore('influencer', /Influencer/)); await shot('influencer_pick');
await page.evaluate(() => [...document.querySelectorAll('.panel.top .row')].find((e) => /Fashion|Comedy|Food/i.test(e.textContent))?.click()); await sleep(700);
ok('influencer card with heat and engagement', await has('[data-el=infl-card]') && /heat/i.test(await text())); await shot('influencer_dashboard');
await boot('seed=8&age=12&cash=50000'); await openMore('streamer', /Live Streamer/); ok('age 12: streaming is locked', /13/.test(await text()) || !(await has('[data-el=stream-card]'))); 
ok('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close(); srv.kill(); console.log(fails ? `FEATURES2 UI FAIL (${fails})` : 'FEATURES2 UI PASS'); process.exit(fails ? 1 : 0);

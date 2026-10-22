// UI test: Social tab Online Profiles / Live Streaming accordion, More directory entries, yearly post-plan popup, and "Autopilot this page" cards. node tests/social_ui.mjs
import { loadPuppeteer } from './_pp.mjs'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const puppeteer = loadPuppeteer(); const ROOT = new URL('..', import.meta.url).pathname, PORT = 18869, SHOTS = process.env.SHOTS || '/workspace/lifesim_art128/feature_shots7'; fs.mkdirSync(SHOTS, { recursive: true });
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 800));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let fails = 0; const errors = [];
const ok = (n, c, i = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : '')); };
const page = await browser.newPage(); await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: false });
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); }); page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
await page.goto(`http://127.0.0.1:${PORT}/index.html?fresh=1&nosave=1&seed=4&age=22&cash=2000000`); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForFunction(() => window.__ready === true, { timeout: 20000 }); await sleep(500);
const A = (code) => page.evaluate(`(async()=>{const {adapter}=await import('/ui/js/adapter.js'); ${code}})()`);
const shot = (n) => page.screenshot({ path: `${SHOTS}/${n}.png` });
const top = () => page.evaluate(() => document.querySelector('.panel.top')?.textContent || '');
const acc = async (sel) => { await page.evaluate((s) => document.querySelector(s).click(), sel); await sleep(450); };
const clickRow = (text) => page.evaluate((text) => { const el = [...document.querySelectorAll('.panel.top .row')].find((e) => e.textContent.includes(text)); if (el) { el.scrollIntoView(); el.click(); return true; } return false; }, text);
await A(`const a=adapter.impl; a.s.school=null; a.socialAction('chirpr','open'); a.socialAction('vidnest','open'); a.s.social.prompt=null; return 1`);
// ---- Social tab accordion ----
await page.click('[data-tab=relationships]'); await sleep(600);
ok('Social tab shows Online Profiles and Live Streaming tabs', !!(await page.$('[data-stab=profiles]')) && !!(await page.$('[data-stab=live]')));
const n0 = await page.evaluate(() => document.querySelectorAll('.panel').length);
await acc('[data-stab=profiles]'); const t1 = await top(); ok('Online Profiles open in place with followers', /followers|Profile/i.test(t1) && (await page.evaluate(() => document.querySelectorAll('.panel').length)) === n0); await shot('10_social_profiles_open');
await acc('[data-stab=live]'); ok('Live Streaming opens in place', /Go live|Streaming|stream/i.test(await top())); await shot('11_social_live_streaming_open');
await acc('[data-stab=people]'); ok('People tab returns', !!(await page.$('[data-stab=people].on')));
// ---- More directory ----
await page.click('[data-tab=more]'); await sleep(500); const dir = await page.evaluate(() => document.body.innerText); ok('More directory lists Online Profiles and Live Streaming under Social', /Online Profiles/.test(dir) && /Live Streaming/.test(dir)); await shot('12_more_directory_social');
// ---- Post plan popup after aging ----
await page.click('[data-tab=relationships]').catch(() => {}); await sleep(300);
await A(`const a=adapter.impl; a.s.pending.length=0; a.s.prison=null; a.s.stats.health=95; return 1`);
const dismiss = async () => { for (let i = 0; i < 8; i++) { const o = await page.$('.overlay .opt'); if (o) { const n = (await page.$$('.overlay .opt')).length; await page.evaluate((n) => document.querySelectorAll('.overlay .opt')[n - 1].click(), n); await sleep(500); continue; } const b = await page.$('.overlay .btn, .overlay [data-btn]'); if (!b) return; await b.click(); await sleep(400); } };
let pop = null; for (let y = 0; y < 8 && !pop; y++) { await A(`const a=adapter.impl; a.s.pending.length=0; a.s.prison=null; a.s.stats.health=95; return 1`); await page.evaluate(() => (document.querySelector('[data-el=age]') || document.querySelector('[data-el=inline-age]'))?.click()); await sleep(1400); pop = await page.$('[data-el=plan-popup]'); if (!pop) await dismiss(); }
ok('yearly post-plan popup appears after aging with social accounts', !!pop); await shot('13_post_plan_popup');
const popTxt = await page.evaluate(() => document.querySelector('[data-el=plan-popup]')?.closest('.sheet')?.textContent || '');
ok('popup lists safe (0% risk) and riskier plans', /Safe/i.test(popTxt) && /Ban risk 0%/.test(popTxt) && /Viral|Controversial/i.test(popTxt), popTxt.slice(0, 160));
await page.evaluate(() => document.querySelectorAll('.sheet .opt')[3]?.click()); await sleep(800); await dismiss();
ok('choosing a plan stores it for the year', !!(await A(`return adapter.impl.s.social.postPlan && adapter.impl.s.social.postPlan.id`)), String(await A(`return adapter.impl.s.social.postPlan && adapter.impl.s.social.postPlan.id`)));
// ---- Autopilot this page cards (premium) ----
await A(`const Pm=await import('/src/premium.js'); Pm.setOwned('autopilot'); const a=adapter.impl; a.s.pending.length=0; return 1`);
const cardOn = async (screen, check) => { await check(); await sleep(700); const has = !!(await page.$('.panel.top [data-el=autopage]')); return has; };
await page.click('[data-tab=relationships]'); await sleep(500); await page.evaluate(() => document.querySelector('[data-id="social"], [data-el=social-row]')?.click());
await page.click('[data-stab=social]'); await sleep(800); ok('Social Media page has the autopilot card', !!(await page.$('.panel.top [data-el=autopage]'))); await shot('14_autopage_social');
await page.evaluate(() => document.querySelector('.panel.top [data-act=autopage-toggle]')?.click()); await sleep(900);
ok('locking the page turns it on (shown ON)', /ON/.test(await page.evaluate(() => document.querySelector('.panel.top [data-el=autopage]')?.textContent || '')) && (await A(`return adapter.impl.getAutoPage('social').on`)) === true); await shot('15_autopage_social_on');
await page.click('[data-tab=occupation]'); await sleep(500); await page.evaluate(() => document.querySelector('.panel.top [data-wtab=all]')?.click()); await sleep(400); await clickRow('Education'); await sleep(700); ok('Education page has the autopilot card', !!(await page.$('.panel.top [data-el=autopage]'))); await shot('16_autopage_school');
await page.click('[data-tab=occupation]').catch(() => {}); await sleep(300); await page.evaluate(() => document.querySelector('.panel.top [data-wtab=all]')?.click()); await sleep(400);
await A(`const a=adapter.impl; a.s.job={id:'clerk',title:'Clerk',employer:'X',salary:40000,years:1,level:1}; return 1`);
await page.evaluate(() => document.querySelector('.panel.top [data-el=back], [data-el=back]')?.click()); await sleep(300);
// autopilot screen lists the page under its section
await dismiss(); await page.click('[data-tab=more]'); await sleep(400); await clickRow('Autopilot'); await sleep(900);
await page.evaluate(() => document.querySelector('[data-acc=hobbies]')?.click()); await sleep(500);
const rowTxt = await page.evaluate(() => [...document.querySelectorAll('[data-id^="page:"]')].map((e) => e.dataset.id + ':' + e.textContent.slice(0, 60)).join(' | '));
ok('Autopilot screen shows the locked page under Hobbies', /page:social/.test(rowTxt), rowTxt); await shot('17_autopilot_page_rows');
ok('no JS errors', errors.length === 0, errors.join('; ')); await browser.close(); srv.kill(); console.log(fails ? 'FAIL social_ui' : 'PASS social_ui'); process.exit(fails ? 1 : 0);

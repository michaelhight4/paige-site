// UI test: account Autopilot tab + posts-this-year counter/cap. node tests/acctauto_ui.mjs
import { loadPuppeteer } from './_pp.mjs'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const puppeteer = loadPuppeteer(); const ROOT = new URL('..', import.meta.url).pathname, PORT = 18870, SHOTS = process.env.SHOTS || '/workspace/lifesim_art128/feature_shots7'; fs.mkdirSync(SHOTS, { recursive: true });
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 800));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let fails = 0; const errors = [];
const ok = (n, c, i = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : '')); };
const page = await browser.newPage(); await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: false });
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); }); page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
await page.goto(`http://127.0.0.1:${PORT}/index.html?fresh=1&nosave=1&seed=6&age=24&cash=2000000`); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForFunction(() => window.__ready === true, { timeout: 20000 }); await sleep(500);
const A = (code) => page.evaluate(`(async()=>{const {adapter}=await import('/ui/js/adapter.js'); ${code}})()`);
const shot = (n) => page.screenshot({ path: `${SHOTS}/${n}.png` });
const top = () => page.evaluate(() => document.querySelector('.panel.top')?.textContent || '');
const clickId = async (id) => { const r = await page.evaluate((i) => { const e = document.querySelector(`.panel.top [data-id="${i}"]`); if (e) { e.scrollIntoView(); e.click(); return true; } return false; }, id); await sleep(500); return r; };
const clickRow = (text) => page.evaluate((text) => { const el = [...document.querySelectorAll('.panel.top .row')].find((e) => e.textContent.includes(text)); if (el) { el.scrollIntoView(); el.click(); return true; } return false; }, text);
const opt = async (i) => { await page.evaluate((i) => document.querySelectorAll('.sheet .opt')[i].click(), i); await sleep(600); };
await A(`const Pm=await import('/src/premium.js'); Pm.setOwned('autopilot'); const a=adapter.impl; a.s.school=null; a.socialAction('chirpr','open'); a.s.social.accounts.chirpr.followers=800; a.s.social.prompt=null; return 1`);
await page.click('[data-tab=relationships]'); await sleep(500); await page.click('[data-stab=social]'); await sleep(800); await clickId('plat:chirpr'); await sleep(700);
ok('account screen shows "Posts this year: n/5"', /Posts this year0\/5/.test(await top()), (await top()).slice(0, 0));
ok('Autopilot tab banner on the account', !!(await page.$('[data-acct=auto]'))); await page.evaluate(() => document.querySelector('[data-acct=auto]').click()); await sleep(500);
const ids = await page.evaluate(() => [...document.querySelectorAll('[data-id^="aa:"]')].map((e) => e.dataset.id)); ok('all setting rows present', ['aa:plan', 'aa:posts', 'aa:tone', 'aa:reply', 'aa:collab', 'aa:sponsor', 'aa:appeal', 'aa:style'].every((x) => ids.includes(x)), ids.join()); await shot('18_account_autopilot_tab');
await clickId('aa:posts'); await opt(4); await sleep(300);
ok('editing posts per year saves in place', (await A(`return adapter.impl.getAutoAccount('chirpr').settings.posts`)) === 4);
await clickId('aa:collab'); ok('toggle collab', (await A(`return adapter.impl.getAutoAccount('chirpr').settings.collab`)) === true);
await page.evaluate(() => document.querySelector('[data-act=acct-auto-toggle]').click()); await sleep(900);
ok('lock in turns the account page on', (await A(`return adapter.impl.getAutoPage('social_chirpr').on`)) === true && /ON/.test(await page.evaluate(() => document.querySelector('[data-el=acct-auto-card]').textContent))); await shot('19_account_autopilot_on');
await clickId('aa:posts'); await opt(1); ok('edit while on updates the locked copy', (await A(`return adapter.impl.s.auto.pages.social_chirpr.locked.posts`)) === 1);
// autopilot runs, counter, cap
await A(`const a=adapter.impl; const Auto=await import('/src/autopilot.js'); Auto.configure(a.s,{on:true,routines:[]}); await Auto.playYear(a,{routines:[],floor:0}); return 1`);
await page.evaluate(() => document.querySelector('.panel.top [data-nav=back]')?.click()); await sleep(400); await clickId('plat:chirpr'); await sleep(700);
ok('autopilot post counted (1/5)', /Posts this year1\/5/.test(await top()), (await top()).match(/Posts this year\S+/)?.[0]);
await A(`const a=adapter.impl; for(let i=0;i<4;i++) a.socialAction('chirpr','post','meme'); return 1`); await page.evaluate(() => document.querySelector('.panel.top [data-nav=back]')?.click()); await sleep(400); await clickId('plat:chirpr'); await sleep(700);
const dis = await page.evaluate(() => { const b = document.querySelector('[data-act=post]'); return b ? { t: b.textContent, d: b.disabled || b.getAttribute('disabled') !== null } : null; }); ok('Post button disabled with a clear label at 5/5', dis && dis.d && /5\/5/.test(dis.t), JSON.stringify(dis)); await shot('20_account_post_limit');
// Autopilot screen lists it
await page.click('[data-tab=more]'); await sleep(400); await clickRow('Autopilot'); await sleep(900); await page.evaluate(() => document.querySelector('[data-acc=hobbies]')?.getAttribute('aria-expanded') === 'false' && document.querySelector('[data-acc=hobbies]').click()); await sleep(500);
ok('Autopilot screen lists the account page under Hobbies', !!(await page.$('[data-id="page:social_chirpr"]'))); await shot('21_autopilot_screen_account_row');
ok('no JS errors', errors.length === 0, errors.join('; ')); await browser.close(); srv.kill(); console.log(fails ? 'FAIL acctauto_ui' : 'PASS acctauto_ui'); process.exit(fails ? 1 : 0);

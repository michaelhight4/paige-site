// Social first screen: tab bar, current accounts with breakdown, "Platforms you don't have" panel; open an account on every platform at age 31. node tests/socialtabs_ui.mjs
import { loadPuppeteer } from './_pp.mjs'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const puppeteer = loadPuppeteer(); const ROOT = new URL('..', import.meta.url).pathname, PORT = 18812, OUT = '/workspace/lifesim_art128/feature_shots8'; fs.mkdirSync(OUT, { recursive: true });
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 800));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let fails = 0; const errors = [];
const ok = (n, c, i = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : '')); };
const page = await browser.newPage(); await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
await page.goto(`http://127.0.0.1:${PORT}/index.html?fresh=1&nosave=1&seed=5&age=31&cash=9000000`); await page.waitForFunction(() => window.__ready === true, { timeout: 20000 }); await sleep(500);
const A = (code) => page.evaluate(`(async()=>{const {adapter}=await import('/ui/js/adapter.js'); ${code}})()`);
const top = () => page.evaluate(() => (document.querySelector('.panel.top') || document.body).innerText);
const depth = () => page.evaluate(() => document.querySelectorAll('.panel').length);
const click = (sel) => page.evaluate((sel) => { const e = document.querySelector(sel); if (e) { e.scrollIntoView(); e.click(); return true; } return false; }, sel);
const clickRow = (text) => page.evaluate((text) => { const el = [...document.querySelectorAll('.panel.top .row')].find((e) => e.textContent.includes(text)); if (el) { el.scrollIntoView(); el.click(); return true; } return false; }, text);
const closeAll = async () => { for (let i = 0; i < 8 && (await depth()); i++) { await click('.panel.top [data-nav=back]'); await sleep(250); } };
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
const openSocial = async () => { await closeAll(); await click('[data-tab=relationships]'); await sleep(600); };
await openSocial();
const tabs = await page.evaluate(() => [...document.querySelectorAll('.panel.top [data-stab]')].map((b) => b.textContent));
ok('tab bar has People, Family Tree, Legacy, Online Profiles, Social Media, Live Streaming', ['People', 'Family Tree', 'Legacy', 'Online Profiles', 'Social Media', 'Live Streaming'].every((x) => tabs.some((t) => t.includes(x))), tabs.join('|'));
ok('tab bar visible at the top without scrolling', await page.evaluate(() => { const r = document.querySelector('.panel.top [data-el=soc-tabs]').getBoundingClientRect(); return r.top >= 0 && r.top < 200; }));
ok('0 accounts: says none yet and offers Platforms you don\'t have', /No social media accounts yet/.test(await top()) && !!(await page.$('.panel.top [data-id=unopened]'))); await shot('social_first_0_accounts');
// open one account through the panel
await click('.panel.top [data-id=unopened]'); await sleep(500); await shot('social_unopened_panel');
const plats = await page.evaluate(() => [...document.querySelectorAll('.panel.top [data-open]')].map((b) => b.dataset.open));
ok('unopened panel lists platforms with Open account buttons', plats.length >= 3, plats.join(','));
await click(`.panel.top [data-open="${plats[0]}"]`); await sleep(900);
await openSocial(); ok('1 account: card with breakdown shown', (await page.$$('.panel.top [data-acct]')).length === 1 && /Followers/.test(await top()) && /Posts this year/.test(await top())); await shot('social_first_1_account');
// open every remaining platform via adapter UI path and report failures with reasons
const res = []; for (const pid of plats.slice(1)) { await click('.panel.top [data-id=unopened]'); await sleep(450); const has = await page.$(`.panel.top [data-open="${pid}"]`); if (!has) { res.push(pid + ':missing'); await openSocial(); continue; } await click(`.panel.top [data-open="${pid}"]`); await sleep(800); await openSocial(); }
const st = await A('return (await adapter.getSocial()).platforms.map(p=>p.id+":"+(p.open?1:0)+":"+(p.lockReason||""))');
ok('every platform opens at age 31 (Podcastle included)', st.every((x) => x.split(':')[1] === '1'), st.join(' | ') + ' ' + res.join(','));
await openSocial(); ok('several accounts listed as cards', (await page.$$('.panel.top [data-acct]')).length === st.length); await shot('social_first_all_accounts');
for (const [id, re] of [['tree', /Family|tree|You/i], ['legacy', /Legacy|heir|will|estate/i], ['profiles', /Influencer|Profile|Social/i], ['social', /Fame|followers/i], ['live', /Stream|live/i]]) { await click(`.panel.top [data-stab=${id}]`); await sleep(600); ok(`tab ${id} opens in place`, re.test(await top()) && (await depth()) === 1); await shot('social_tab_' + id); }
await click('.panel.top [data-stab=people]'); await sleep(300);
ok('no page errors', errors.length === 0, errors.join(' | ').slice(0, 300));
await browser.close(); srv.kill(); console.log(fails ? `socialtabs_ui: ${fails} FAIL` : 'socialtabs_ui: PASS'); process.exit(fails ? 1 : 0);

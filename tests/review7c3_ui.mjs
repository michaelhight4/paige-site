// 7c3 review: Special Careers > Sports (Pro Athlete + Coaching), coaching on My Job, per-industry job icons, forced ad, ads text, Founder badge. 360x640 shots -> /workspace/lifesim_shots_7c3. node tests/review7c3_ui.mjs
import { loadPuppeteer } from './_pp.mjs'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const puppeteer = loadPuppeteer(); const ROOT = new URL('..', import.meta.url).pathname, PORT = 18873, OUT = process.env.OUT || '/workspace/lifesim_shots_7c3'; fs.mkdirSync(OUT, { recursive: true });
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 800));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let fails = 0; const errors = [];
const ok = (n, c, i = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : '')); };
const page = await browser.newPage(); await page.setViewport({ width: 360, height: 640, isMobile: true, hasTouch: true });
page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
const boot = async (q = '') => { await page.goto(`http://127.0.0.1:${PORT}/index.html?fresh=1&nosave=1&seed=5&age=30&cash=9000000${q}`); await page.waitForFunction(() => window.__ready === true, { timeout: 20000 }); await sleep(600); };
const A = (code) => page.evaluate(`(async()=>{const {adapter}=await import('/ui/js/adapter.js'); ${code}})()`);
const top = () => page.evaluate(() => (document.querySelector('.panel.top') || document.body).innerText);
const depth = () => page.evaluate(() => document.querySelectorAll('.panel').length);
const click = (sel) => page.evaluate((sel) => { const e = document.querySelector(sel); if (e) { e.scrollIntoView(); e.click(); return true; } return false; }, sel);
const clickRow = (text) => page.evaluate((text) => { const el = [...document.querySelectorAll('.panel.top .row')].find((e) => e.textContent.includes(text)); if (el) { el.scrollIntoView(); el.click(); return true; } return false; }, text);
const rowTitles = () => page.evaluate(() => [...document.querySelectorAll('.panel.top .row')].map((e) => (e.querySelector('.t') || e).textContent.trim()));
const closeAll = async () => { for (let i = 0; i < 10 && (await depth()); i++) { await click('.panel.top [data-nav=back]'); await sleep(250); } };
const shot = async (n) => { await sleep(300); await page.screenshot({ path: `${OUT}/${n}.png` }); };
const overlaps = (sel) => page.evaluate((sel) => { const els = [...document.querySelectorAll(sel)].filter((e) => e.offsetParent); const r = els.map((e) => e.getBoundingClientRect()); for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) { const a = r[i], b = r[j]; if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) return [els[i].className, els[j].className].join(' x '); } return null; }, sel);
const openWork = async (tab) => { await closeAll(); await click('[data-tab=occupation]'); await sleep(500); await click(`.panel.top [data-wtab=${tab}]`); await sleep(500); };

await boot();
ok('bottom bar unchanged', await page.evaluate(() => [...document.querySelectorAll('.nav [data-tab]')].map((b) => b.dataset.tab).join() === 'life,skills,assets,occupation,relationships,more'));
await openWork('all'); let t = await rowTitles();
ok('All Work: no separate Sports Career / Coaching rows', !t.includes('Sports Career') && !t.includes('Coaching'), t.join('|'));
ok('All Work lists Special Careers', await clickRow('Special Careers')); await sleep(600); t = await rowTitles();
ok('Special Careers: Sports tab listed first', t[0] === 'Sports', t.join('|')); ok('Pro Athlete ladder moved into Sports', !t.includes('Pro Athlete'));
ok('special careers each have their own icon', await page.evaluate(() => { const ids = [...document.querySelectorAll('.panel.top .row [data-job-icon]')].map((e) => e.dataset.jobIcon); return ids.length >= 8 && new Set(ids).size === ids.length; }));
await shot('01_special_careers');
await clickRow('Sports'); await sleep(600); t = await rowTitles(); ok('Sports tab has Pro Athlete + Coaching', t.includes('Pro Athlete') && t.includes('Coaching'), t.join('|')); await shot('02_sports_tab');
ok('Pro Athlete opens the sports career page', await clickRow('Pro Athlete')); await sleep(700); ok('sports page renders', (await top()).length > 60); await click('.panel.top [data-nav=back]'); await sleep(400);
ok('Coaching opens from the Sports tab', await clickRow('Coaching')); await sleep(700); ok('coaching page renders', await page.evaluate(() => !!document.querySelector('[data-el=coach-intro],[data-el=coach-card]')));
// jobs industries: distinct art
await openWork('all'); await clickRow('Jobs'); await sleep(700);
const ji = await page.evaluate(() => [...document.querySelectorAll('.panel.top .row [data-job-icon]')].map((e) => [e.dataset.jobIcon, e.classList.contains('art')]));
ok('every industry row uses job art', ji.length >= 20 && ji.every((x) => x[1]), ji.length + ''); await shot('03_job_industries');
await page.evaluate(() => document.querySelector('.panel.top .body, .panel.top')?.scrollBy(0, 900)); await shot('03b_job_industries_more');
// coaching on My Job
await A("adapter.impl.s.flags.ex_pro = 1; adapter.impl.s.school = null; adapter.impl.s.edu = 2; adapter.impl.s.job = null; return adapter.coachAction('take', 'soccer')");
await A("const {refreshState}=await import('/ui/js/ui.js'); await refreshState(); return 1");
await openWork('myjob'); t = await top();
ok('My Job recognizes coaching (no "No job yet")', !/No job yet/.test(t) && await page.evaluate(() => !!document.querySelector('[data-el=current-job-coach]')), t.slice(0, 200));
ok('coaching actions on My Job', await page.evaluate(() => !!document.querySelector('[data-el=coach-card]')) && /Leave club/.test(t)); await shot('04_myjob_coaching');
ok('My Job no overlaps in coach card', !(await overlaps('[data-el=coach-card] .btns > *')));
// settings ads text
await closeAll(); await click('[data-el=settings-link]'); await sleep(700); await page.evaluate(() => document.querySelector('[data-el=ads-row]')?.scrollIntoView({ block: 'center' }));
t = await page.evaluate(() => document.querySelector('[data-el=ads-row]')?.innerText || ''); ok('settings ads row mentions full-screen ads + No Ads', /full-screen/.test(t) && /No Ads/.test(t), t); await shot('05_settings_ads');
await closeAll(); await click('[data-el=store-link]'); await sleep(700); await page.evaluate(() => document.querySelector('[data-pass=no_ads]')?.scrollIntoView({ block: 'center' }));
t = await page.evaluate(() => document.querySelector('[data-pass=no_ads]')?.innerText || ''); ok('store No Ads effect text', /Removes forced ads and gives ad rewards instantly without watching/.test(t), t); await shot('06_store_no_ads');
// founder badge (web TEST toggle)
ok('founder_pack has a TEST toggle on web', await click('[data-toggle=founder_pack]')); await sleep(800); await closeAll(); await sleep(300);
ok('Founder badge on the character card', await page.evaluate(() => /Founder/.test(document.querySelector('[data-el=founder-badge]')?.textContent || '')));
ok('top bar: badge does not overlap name/headline/buttons', !(await overlaps('.topbar .who > *')) && !(await overlaps('.topbar > *'))); await shot('07_founder_badge');
await click('[data-el=profile-link]'); await sleep(800); ok('Founder badge on the profile', await page.evaluate(() => !!document.querySelector('[data-el=profile-founder]'))); await shot('08_founder_profile');
await A("await adapter.setPremiumFlag('founder_pack', false); return 1"); await closeAll();
// forced ad (8-15 year trigger): placeholder countdown, no skip
await A("adapter.impl.s.ads = adapter.impl.s.ads || {}; adapter.impl.s.ads.due = true; return 1");
const done = page.evaluate(async () => { const { showAdPrompt } = await import('/ui/js/ads_ui.js'); const { adapter } = await import('/ui/js/adapter.js'); await showAdPrompt(await adapter.getAdPrompt()); return 1; });
await sleep(1500); ok('forced ad overlay shown', await page.evaluate(() => !!document.querySelector('[data-el=ad-screen]')));
ok('no skip / close while counting down', await page.evaluate(() => !document.querySelector('[data-el=ad-screen] button'))); await shot('09_forced_ad');
await page.waitForSelector('[data-el=ad-claim]', { timeout: 10000 }); await shot('10_forced_ad_done'); await click('[data-el=ad-claim]'); await done; ok('ad closes and play continues', !(await page.evaluate(() => !!document.querySelector('[data-el=ad-screen]'))));
console.log(errors.length ? 'ERRORS ' + errors.join(' | ') : 'no page errors'); ok('no page errors', !errors.length);
await browser.close(); srv.kill(); console.log(fails ? `FAILS ${fails}` : 'REVIEW 7c3 UI PASS'); process.exit(fails ? 1 : 0);

// UI click test: Social Media hub on the Social tab + More directory, platform/post/verify screens, Politics screen, Gear shop. node tests/social_pol_ui.mjs
import { loadPuppeteer } from './_pp.mjs'; import { spawn } from 'node:child_process';
const puppeteer = loadPuppeteer(); const ROOT = new URL('..', import.meta.url).pathname, PORT = 18811; const SHOTS = process.env.SHOTS || '/workspace/lifesim_art128/feature_shots3';
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 800));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let fails = 0; const errors = [];
const ok = (n, c, i = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : '')); };
const page = await browser.newPage(); await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
await page.goto(`http://127.0.0.1:${PORT}/index.html?fresh=1&nosave=1&seed=5&age=30&cash=3000000`); await page.waitForFunction(() => window.__ready === true, { timeout: 20000 });
const A = (code) => page.evaluate(`(async()=>{const {adapter}=await import('/ui/js/adapter.js'); ${code}})()`);
const shot = (n) => page.screenshot({ path: `${SHOTS}/${n}.png` });
const clickRow = (text) => page.evaluate((text) => { const el = [...document.querySelectorAll('.panel.top .row')].find((e) => e.textContent.includes(text)); if (el) { el.scrollIntoView(); el.click(); return true; } return false; }, text);
const clickBtn = (sel) => page.evaluate((sel) => { const el = document.querySelector('.panel.top ' + sel) || document.querySelector(sel); if (el) { el.scrollIntoView(); el.click(); return true; } return false; }, sel);
const back = async () => { await page.evaluate(() => { const b = document.querySelector('.panel.top [data-el=back], .panel.top .back, .panel.top button[aria-label=Back]'); if (b) b.click(); }); await sleep(300); };
// Social tab entry
await page.click('[data-tab=relationships]'); await sleep(500);
ok('Social tab has a "Social Media" tab', !!(await page.$('[data-stab=social]'))); await page.click('[data-stab=social]'); await sleep(600);
ok('hub shows fame panel, platforms and tools', await page.evaluate(() => !!document.querySelector('[data-el=fame-panel]') && /Platforms/.test(document.body.innerText) && /Content calendar/.test(document.body.innerText) && /Gear/.test(document.body.innerText) && /Your team/.test(document.body.innerText) && /sponsorships/i.test(document.body.innerText)));
await shot('01_social_hub');
await A('await adapter.socialAction("chirpr","open")'); await page.evaluate(() => 0); await page.click('[data-tab=relationships]').catch(() => {}); await sleep(400); await page.click('[data-stab=social]'); await sleep(500);
ok('open a platform page', await clickRow('Chirpr')); await sleep(500);
ok('platform has post/verify/sponsor buttons', await page.evaluate(() => ['post', 'verify', 'sponsors', 'collab'].every((a) => document.querySelector(`[data-act=${a}]`))));
await shot('02_platform');
await clickBtn('[data-act=post]'); await sleep(500); ok('post picker lists posts', await page.evaluate(() => document.querySelectorAll('.panel.top .row').length >= 4)); await shot('03_post_picker');
await page.evaluate(() => { const r = [...document.querySelectorAll('.panel.top .row')].find((e) => !e.className.includes('disabled')); r.click(); }); await sleep(700); ok('post result sheet', await page.evaluate(() => !!document.querySelector('[data-el=post-result]'))); await shot('04_post_result');
await page.keyboard.press('Escape'); await page.evaluate(() => { const o = document.querySelector('.overlay, .sheet-ov'); if (o) o.click(); }); await sleep(400);
await A('const r=await adapter.getPlatform("chirpr"); return 1'); await page.evaluate(() => document.querySelectorAll('.overlay,.sheet-ov,.scrim').forEach((e) => e.remove()));
await clickBtn('[data-act=verify]'); await sleep(500); ok('verification progress bar is visible', await page.evaluate(() => !!document.querySelector('[data-bar=verify-progress]'))); await shot('05_verification');
// More directory
await page.evaluate(() => { location.reload(); }); await page.waitForFunction(() => window.__ready === true, { timeout: 20000 });
await page.click('[data-tab=more]'); await sleep(400);
await page.evaluate(() => { const i = document.querySelector('.panel.top input'); if (i) { i.value = 'social media'; i.dispatchEvent(new Event('input', { bubbles: true })); } }); await sleep(400);
ok('More directory lists Social Media', await page.evaluate(() => [...document.querySelectorAll('.panel.top .row')].some((e) => /Social Media/.test(e.textContent)))); await shot('06_directory');
// Politics via Work
await page.evaluate(() => location.reload()); await page.waitForFunction(() => window.__ready === true, { timeout: 20000 });
await page.click('[data-tab=occupation]'); await sleep(500); await page.evaluate(() => document.querySelector('.panel.top [data-wtab=all]')?.click()); await sleep(400); ok('Work menu has Politics', await clickRow('Politics')); await sleep(600);
ok('politics panel and office list', await page.evaluate(() => !!document.querySelector('[data-el=pol-panel]') && /8 seats/.test(document.body.innerText) && /Run for office/.test(document.body.innerText))); await shot('07_politics');
await clickRow('8 seats'); await sleep(600); ok('campaign card appears', await page.evaluate(() => !!document.querySelector('[data-el=pol-campaign]'))); 
await clickBtn('[data-act=plat-schools]'); await sleep(400); await clickBtn('[data-act=budget]'); await sleep(400);
for (let i = 0; i < 4; i++) { await clickBtn('[data-act=ans0]'); await sleep(450); }
ok('campaign ready after 4 answers', await page.evaluate(() => { const b = document.querySelector('[data-act=launch]'); return b && !b.disabled; })); await shot('08_campaign');
await clickBtn('[data-act=launch]'); await sleep(700); ok('election result shown', await page.evaluate(() => !!document.querySelector('[data-el=pol-result]'))); await shot('09_election_result');
// royalty screen
const rr = await A('return await adapter.getRoyalty()'); ok('royalty API reachable', typeof rr.available === 'boolean');
// Coaching
await page.evaluate(() => location.reload()); await page.waitForFunction(() => window.__ready === true, { timeout: 20000 });
await A('adapter.impl.s.flags.ex_pro = 1; adapter.impl.s.school = null; adapter.impl.s.edu = 2; return 1');
await page.click('[data-tab=occupation]'); await sleep(500); await page.evaluate(() => document.querySelector('.panel.top [data-wtab=all]')?.click()); await sleep(400); ok('Work menu has Coaching', (await clickRow('Special Careers'), await sleep(500), await clickRow('Sports'), await sleep(500), await clickRow('Coaching'))); await sleep(600);
ok('coaching intro shows requirements', await page.evaluate(() => !!document.querySelector('[data-el=coach-intro]') && /Sports Science|Coaching/.test(document.body.innerText))); await shot('10_coaching_intro');
ok('sports to pick', await clickRow('Soccer')); await sleep(700); ok('coach card and season card', await page.evaluate(() => !!document.querySelector('[data-el=coach-card]') && !!document.querySelector('[data-el=coach-season]')));
await page.evaluate(() => document.querySelector('.panel.top [data-el=back], .panel.top .back')?.click()); await sleep(300); (await clickRow('Special Careers'), await sleep(500), await clickRow('Sports'), await sleep(500), await clickRow('Coaching')); await sleep(600); await shot('11_coaching_hub');
ok('play a quarter with a style', await clickBtn('[data-act=q-assist], [data-act=q-attack]')); await sleep(800); ok('watch prompt', await page.evaluate(() => /Watch/.test(document.body.innerText))); await page.evaluate(() => document.querySelector('[data-btn=yes]')?.click()); await sleep(1500);
ok('top-down match canvas animates', await page.evaluate(() => { const c = document.querySelector('[data-el=match-canvas]'); return !!c && /-/.test(document.querySelector('[data-el=match-score]').textContent); })); await shot('12_match_canvas'); await sleep(7500); await shot('13_match_end');
ok('match reaches full time', await page.evaluate(() => /Full time/.test(document.querySelector('[data-el=match-score]')?.textContent || '')));
await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /^Close$/.test(b.textContent.trim()))?.click()); await sleep(300);
await A('adapter.impl.s.coach.role="head"; adapter.impl.s.coach.budget=4e6; return 1'); await page.evaluate(() => { const b = [...document.querySelectorAll('.panel.top button, .panel.top [role=button]')][0]; b && b.click(); }); await sleep(400); (await clickRow('Special Careers'), await sleep(500), await clickRow('Sports'), await sleep(500), await clickRow('Coaching')); await sleep(700);
ok('head coach sees plan and transfers', await page.evaluate(() => !!document.querySelector('[data-el=coach-plan]'))); await shot('14_head_coach_plan');
await page.evaluate(() => document.querySelector('[data-el=coach-plan]').scrollIntoView()); await clickRow('Transfers'); await sleep(600); ok('transfers list', await page.evaluate(() => /Market/.test(document.body.innerText))); await shot('15_transfers');
// gear shop
const shops = await A('const b=await adapter.getBelongings(); return JSON.stringify(b).includes("gear")'); ok('gear appears in the assets/shop data', shops === true);
ok('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close(); srv.kill(); console.log(fails ? 'SOCIAL/POLITICS UI FAIL' : 'SOCIAL/POLITICS UI PASS'); process.exit(fails ? 1 : 0);

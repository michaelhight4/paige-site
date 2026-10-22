// UI test (390px): Work > Sports opens My Team for anyone on a team. node tests/myteam_ui.mjs
import { loadPuppeteer } from './_pp.mjs'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const puppeteer = loadPuppeteer(); const ROOT = new URL('..', import.meta.url).pathname, PORT = 18871, SHOTS = process.env.SHOTS || '/workspace/lifesim_art128/feature_shots8'; fs.mkdirSync(SHOTS, { recursive: true });
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 800));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let fails = 0; const errors = [];
const ok = (n, c, i = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : '')); };
const page = await browser.newPage(); await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: false });
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); }); page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
await page.goto(`http://127.0.0.1:${PORT}/index.html?fresh=1&nosave=1&seed=5&age=28&cash=2000000`); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForFunction(() => window.__ready === true, { timeout: 20000 }); await sleep(500);
const A = (code) => page.evaluate(`(async()=>{const {adapter}=await import('/ui/js/adapter.js'); ${code}})()`);
const shot = (n) => page.screenshot({ path: `${SHOTS}/${n}.png` });
const clickRow = (text) => page.evaluate((text) => { const el = [...document.querySelectorAll('.panel.top .row')].find((e) => e.textContent.includes(text)); if (el) { el.scrollIntoView(); el.click(); return true; } return false; }, text);
const clickSel = (sel) => page.evaluate((sel) => { const el = document.querySelector('.panel.top ' + sel); if (el) { el.scrollIntoView(); el.click(); return true; } return false; }, sel);
const text = () => page.evaluate(() => document.querySelector('.panel.top')?.innerText || '');
// Gary's case: Pro Rookie in the Pro Athlete job, no s.sport
await A(`const s=adapter.impl.s; s.school=null; s.edu=2; const B=await import('/src/slice_bridge.js'); const sl=B.slice(s); sl.job={kind:'special',special:'athlete',id:'sp_athlete_2',title:'Pro Rookie',wage:600000,years:0,yearsInLevel:0,step:2,sector:'special'}; B.push(s); const E=await import('/src/engine.js'); for(let i=0;i<3;i++){ await adapter.age(); let g=0; while(s.pending.length&&g++<8) E.resolveCard(s,0);} `);
await page.click('[data-tab=occupation]'); await sleep(500); await page.evaluate(() => document.querySelector('.panel.top [data-wtab=all]')?.click()); await sleep(400);
ok('player holds an athlete job (slice job, no s.sport)', /^(Amateur|Minor League|Pro Rookie|Starter|Franchise Player)\|false$/.test(await A(`const s=adapter.impl.s; return s.sl.job.title+'|'+!!s.sport`)));
ok('Sports row opens', (await clickRow('Special Careers'), await sleep(500), await clickRow('Sports'), await sleep(500), await clickRow('Pro Athlete'))); await sleep(900);
let t = await text(); ok('opens to My Team (no school sport list, no "Not available right now")', /League standing/.test(t) && !/Not available right now/.test(t) && !/Choose a school sport/.test(t)); await shot('01_myteam_pro');
const w = await page.evaluate(() => document.documentElement.scrollWidth); ok('no horizontal overflow at 390px', w <= 392, String(w));
ok('team name, record and title chance shown', await page.evaluate(() => !!document.querySelector('[data-el=mt-team]')?.textContent && /title chance/i.test(document.querySelector('[data-el=mt-standing]').textContent)));
const sticky = await page.evaluate(() => { const e = document.querySelector('[data-el=mt-tabs]'); return getComputedStyle(e).position; }); ok('sticky tab bar', sticky === 'sticky');
// style
ok('style button', await clickSel('[data-style=aggressive]')); await sleep(700); ok('style saved', (await A(`return adapter.impl.s.mt.style`)) === 'aggressive'); await shot('02_myteam_style');
// skills
ok('skills tab', await clickSel('[data-mt=skills]')); await sleep(600); t = await text(); ok('skills show n/3 this year', /0\/3 this year/.test(t)); await shot('03_skills');
ok('train one skill', await clickSel('[data-train]')); await sleep(700); t = await text(); ok('counter 1/3', /1\/3 this year/.test(t));
ok('train lowest 3', await clickSel('[data-act=mt-lowest]')); await sleep(800); t = await text(); ok('counter 3/3 and buttons disabled', /3\/3 this year/.test(t) && await page.evaluate(() => [...document.querySelectorAll('.panel.top [data-train]')].every((b) => b.disabled))); await shot('04_skills_capped');
// season
await A(`const E=await import('/src/engine.js'); const s=adapter.impl.s; for(let i=0;i<2;i++){ await adapter.age(); let g=0; while(s.pending.length&&g++<8) E.resolveCard(s,0);} return 1`);
await clickSel('[data-mt=season]'); await sleep(300); await page.evaluate(() => document.querySelector('.panel.top [data-mt=team]')?.click()); await sleep(400);
await page.evaluate(() => document.querySelector('.panel.top [data-mt=season]')?.click()); await sleep(600); t = await text(); ok('season stats, career stats, leaders', /Career stats/.test(t) && /League leaders/.test(t) && /in league/.test(t)); await shot('05_season');
await A(`const m=adapter.impl.s.mt; m.offers.push({id:99,kind:'contract',team:'Harbor Comets',salary:2400000,years:3,role:'Starter',age:30}); m.offers.push({id:100,kind:'trade',team:'Granite Storm',salary:3000000,years:2,role:'Starter',note:'x',age:30}); return 1`);
await page.evaluate(() => document.querySelector('.panel.top [data-mt=offers]')?.click()); await sleep(600); t = await text(); ok('offers with accept / negotiate / decline', /Contract: Harbor Comets/.test(t) && /Trade request/.test(t) && /Negotiate/.test(t)); await shot('06_offers');
ok('accept contract', await clickSel('[data-offer="99"] [data-offer-act=accept]')); await sleep(700); ok('contract applied', (await A(`return adapter.impl.s.mt.contract.team`)) === 'Harbor Comets');
ok('decline trade', await clickSel('[data-offer="100"] [data-offer-act=decline]')); await sleep(600);
await page.evaluate(() => document.querySelector('.panel.top [data-mt=awards]')?.click()); await sleep(500); t = await text(); ok('awards tab', /Titles and awards/.test(t)); await shot('07_awards');
// school player + autopilot card
ok('autopilot card on the page', await page.evaluate(() => !!document.querySelector('.panel.top [data-el=autopage]')));
await page.reload(); await page.waitForFunction(() => window.__ready === true); await sleep(400);
await A(`const s=adapter.impl.s; s.age=15; s.school='high'; adapter.joinSport({sportId:'soccer',position:'Mid'}); return 1`);
await page.click('[data-tab=occupation]'); await sleep(400); await page.evaluate(() => document.querySelector('.panel.top [data-wtab=all]')?.click()); await sleep(400); await clickRow('Special Careers'); await sleep(500); await clickRow('Sports'); await sleep(500); await clickRow('Pro Athlete'); await sleep(700); t = await text(); ok('school team also opens My Team', /My Team/.test(t) && /Soccer/.test(t)); await shot('08_school_team');
await A(`const s=adapter.impl.s; s.sport=null; s.mt=null; s.job=null; return 1`); await page.click('.panel.top .back, .panel.top [data-act=back]').catch(() => {});
ok('no JS errors', errors.length === 0, errors.join('; ')); await browser.close(); srv.kill(); console.log(fails ? 'FAIL myteam_ui' : 'PASS myteam_ui'); process.exit(fails ? 1 : 0);

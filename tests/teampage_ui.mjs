// UI test @390px: the team page (owned/just-bought, major/minor, racing) opens with header + always-visible tab bar + overview summaries from EVERY entry path. node tests/teampage_ui.mjs
import { loadPuppeteer } from './_pp.mjs'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const puppeteer = loadPuppeteer(); const ROOT = new URL('..', import.meta.url).pathname, PORT = 18871, SHOTS = process.env.SHOTS || '/workspace/lifesim_art128/feature_shots7'; fs.mkdirSync(SHOTS, { recursive: true });
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 800));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let fails = 0; const errors = [];
const ok = (n, c, i = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : '')); };
const page = await browser.newPage(); await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: false });
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); }); page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
await page.goto(`http://127.0.0.1:${PORT}/index.html?fresh=1&nosave=1&seed=9&age=40&cash=5000000000`); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForFunction(() => window.__ready === true, { timeout: 20000 }); await sleep(600);
const A = (code) => page.evaluate(`(async()=>{const {adapter}=await import('/ui/js/adapter.js'); ${code}})()`);
const shot = (n) => page.screenshot({ path: `${SHOTS}/${n}.png` });
const top = () => page.evaluate(() => document.querySelector('.panel.top')?.innerText || '');
const clickRow = (text) => page.evaluate((text) => { const el = [...document.querySelectorAll('.panel.top .row, .row')].find((e) => e.textContent.includes(text)); if (el) { el.scrollIntoView(); el.click(); return true; } return false; }, text);
const back = async () => { await page.evaluate(() => document.querySelector('[data-nav=back]')?.click()); await sleep(400); };
const vis = (sel) => page.evaluate((sel) => { const e = document.querySelector('.panel.top ' + sel); if (!e) return false; const r = e.getBoundingClientRect(), p = document.querySelector('.panel.top').getBoundingClientRect(); return r.width > 0 && r.top >= p.top - 1 && r.bottom <= p.bottom + 1 && r.right <= 391; }, sel);
await A(`const a=adapter.impl; a.s.school=null; a.frAction('buy',{sport:'soccer',teamId:'soccer_0',type:'pro',size:'small',tier:'basic',preset:'balanced'}); a.frAction('buy',{sport:'soccer',teamId:'soccer_0_m',type:'semi',size:'small',tier:'basic',preset:'balanced'}); a.frAction('hire','head_coach'); a.rcAction('create',{name:'Redline Motorsport',type:'stock',tier:0,size:'small',logo:null}); a.frAction('switch','soccer_0'); return 1`);
const checkFr = async (label, shotName, owner) => {
  await sleep(500); const t = await top();
  ok(label + ': header shows team name, sport, tier, league, record, rating', /Harbor/.test(t) && /Soccer/.test(t) && /(Major|Minor) team/.test(t) && /league/.test(t) && /Record:/.test(t) && /rated \d+/.test(t), t.slice(0, 160).replace(/\n/g, ' | '));
  ok(label + ': tab bar visible with all six tabs', await vis('[data-el=fr-tabs]') && (await page.evaluate(() => [...document.querySelectorAll('.panel.top [data-hub]')].map((e) => e.dataset.hub).join())) === 'overview,staff,roster,facilities,finances,style');
  ok(label + ': overview shows performance, facilities and staff summaries', !!(await page.$('.panel.top [data-el=fr-perf]')) && !!(await page.$('.panel.top [data-el=fr-fac-sum]')) && !!(await page.$('.panel.top [data-el=fr-staff-sum]')) && /Roles filled/.test(t) && /Stadium/.test(t));
  await shot(shotName);
};
// entry 1: Work menu
await page.click('[data-tab=occupation]'); await sleep(400); await page.evaluate(() => document.querySelector('.panel.top [data-wtab=all]')?.click()); await sleep(400); ok('Work menu lists Own a Team', await clickRow('Own a Team')); await checkFr('Work menu', '22_team_page_work_menu');
ok('your-teams switcher lists both sister clubs', (await page.$$('.panel.top [data-team]')).length === 2);
await page.evaluate(() => document.querySelector('.panel.top [data-jump=staff]').click()); await sleep(500); ok('Overview jump button opens Staff tab (tab bar stays visible)', /Payroll for staff/.test(await top()) && await vis('[data-el=fr-tabs]')); await shot('23_team_page_staff_tab');
for (const k of ['facilities', 'roster', 'finances', 'style']) { await page.evaluate((k) => document.querySelector(`.panel.top [data-hub=${k}]`).click(), k); await sleep(450); ok('tab ' + k + ' opens with the tab bar still on screen', await vis('[data-el=fr-tabs]')); }
await shot('24_team_page_stats_tab'); await page.evaluate(() => document.querySelector('.panel.top [data-hub=overview]').click()); await sleep(300);
await back(); await back().catch(() => {});
// entry 2: More directory
await page.click('[data-tab=more]'); await sleep(500); ok('More directory has Own a Team', await clickRow('Own a Team')); await checkFr('More directory', '25_team_page_more_directory');
await page.evaluate(() => document.querySelector('.panel.top [data-team="soccer_0_m"]').click()); await sleep(600); const tm = await top(); ok('minor team opens via switcher: Minor label + Harbor Juniors header', /Minor team/.test(tm) && /Harbor Juniors/.test(tm)); await shot('26_team_page_minor');
await back();
// entry 3: Your businesses
await page.click('[data-tab=occupation]').catch(() => {}); await sleep(300); await page.evaluate(() => document.querySelector('.panel.top [data-wtab=all]')?.click()); await sleep(400); await A(`return 1`);
const goBiz = async () => { await page.click('[data-tab=more]'); await sleep(400); await clickRow('Businesses & Studios'); await sleep(600); };
await goBiz(); const bt = await top(); ok('Your businesses lists both teams and the racing team', /Harbor United/.test(bt) && /Harbor Juniors/.test(bt) && /Redline/.test(bt), bt.slice(0, 200).replace(/\n/g, ' | ')); await shot('27_businesses_list');
await clickRow('Harbor United'); await checkFr('Businesses list (major)', '28_team_page_from_businesses'); await back(); await sleep(300);
await clickRow('Harbor Juniors'); await sleep(500); ok('Businesses list opens the MINOR team page (not the active one)', /Harbor Juniors/.test(await top()) && /Minor team/.test(await top())); await shot('29_team_page_from_businesses_minor'); await back(); await sleep(300);
// racing entries
const checkRc = async (label, n) => { await sleep(500); const t = await top(); ok(label + ': header name, sport, series, record, rating', /Redline/.test(t) && /Racing/.test(t) && /team/.test(t) && /wins/.test(t) && /rated \d+/.test(t), t.slice(0, 160).replace(/\n/g, ' | ')); ok(label + ': tab bar visible (7 tabs)', await vis('[data-el=rc-tabs]') && (await page.$$('.panel.top [data-hub]')).length === 7); ok(label + ': overview summaries', !!(await page.$('.panel.top [data-el=rc-perf]')) && !!(await page.$('.panel.top [data-el=rc-fac-sum]')) && !!(await page.$('.panel.top [data-el=rc-staff-sum]'))); await shot(n); };
await clickRow('Redline'); await checkRc('Businesses list (racing)', '30_racing_team_from_businesses'); await back(); await back().catch(() => {});
await page.click('[data-tab=more]'); await sleep(400); ok('More directory has Racing Team', await clickRow('Racing Team')); await checkRc('More directory (racing)', '31_racing_team_from_directory'); await back();
await page.click('[data-tab=occupation]'); await sleep(400); await page.evaluate(() => document.querySelector('.panel.top [data-wtab=all]')?.click()); await sleep(400); await clickRow('Racing'); await sleep(600); await page.evaluate(() => document.querySelector('[data-rctop=team]')?.click()); await checkRc('Work menu (racing My team)', '32_racing_team_from_work');
// just-bought team lands on the full page
await back(); await back().catch(() => {}); await A(`const a=adapter.impl; a.frAction('buy',{sport:'hockey',teamId:'hockey_2',type:'pro',size:'small',tier:'basic',preset:'balanced'}); return 1`);
await page.click('[data-tab=occupation]'); await sleep(400); await page.evaluate(() => document.querySelector('.panel.top [data-wtab=all]')?.click()); await sleep(400); await clickRow('Own a Team'); await sleep(600); const jt = await top(); ok('just-bought hockey team opens with full header and tabs', /Hockey/.test(jt) && /Major team/.test(jt) && await vis('[data-el=fr-tabs]')); await shot('33_team_page_just_bought');
ok('no console errors', errors.length === 0, errors.slice(0, 2).join(' | ')); await browser.close(); srv.kill(); console.log(fails ? 'teampage_ui: FAIL ' + fails : 'teampage_ui: PASS'); process.exit(fails ? 1 : 0);

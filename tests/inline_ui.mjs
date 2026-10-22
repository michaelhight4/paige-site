// Inline quick actions + Age inside menus. node tests/inline_ui.mjs  (SHOTS=/dir saves screenshots)
import { loadPuppeteer } from './_pp.mjs'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const puppeteer = loadPuppeteer(); const ROOT = new URL('..', import.meta.url).pathname, PORT = 18813, SHOTS = process.env.SHOTS;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 800));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let fails = 0; const errors = [];
const ok = (n, c, i = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : '')); };
const page = await browser.newPage(); await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: false });
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
const shot = async (n) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${n}.png` }); };
await page.goto(`http://127.0.0.1:${PORT}/index.html?fresh=1&nosave=1&seed=5&age=30&cash=3000000`); await page.waitForFunction(() => window.__ready === true, { timeout: 20000 }); await sleep(500);
const age = () => page.evaluate(() => Number(document.querySelector('.agebar span').textContent.match(/Age: (\d+)/)[1]));
const clickSel = async (s) => { await page.waitForSelector(s, { timeout: 4000 }); await page.evaluate((x) => document.querySelector(x).click(), s); await sleep(350); };
const dismiss = async () => { for (let i = 0; i < 6; i++) { const o = await page.$('.overlay .opt'); if (!o) { const b = await page.$('.overlay .btn'); if (!b) return; await b.click(); await sleep(250); continue; } await o.click(); await sleep(300); } };
const quick = () => page.evaluate(() => [...document.querySelectorAll('.panel.top [data-quick]')].map((b) => ({ id: b.dataset.quick, done: b.classList.contains('done'), dis: b.disabled })));
const stackLen = () => page.evaluate(() => document.querySelectorAll('.panel').length);
const rectIA = () => page.evaluate(() => { const b = document.querySelector('.panel.top [data-el=inline-age]').getBoundingClientRect(); return [b.left, b.top, b.width, b.height].map((x) => Math.round(x * 10) / 10); });
// Skills
await clickSel('[data-tab=more]'); await sleep(200); await page.evaluate(() => { const i = document.querySelector('.panel.top input'); i.value = 'skills'; i.dispatchEvent(new Event('input', { bubbles: true })); }); await sleep(300);
await page.evaluate(() => { const el = [...document.querySelectorAll('.panel.top .row')].find((e) => /Skills/.test(e.textContent) && /Physical/.test(e.textContent)); el.click(); }); await sleep(600);
const sv = () => page.evaluate(() => [...document.querySelectorAll('.panel.top .skill')].map((c) => c.textContent).join('|'));
let q = await quick(); ok('Skills has quick actions (Train, Read, Study...)', ['train', 'read', 'study'].every((id) => q.some((x) => x.id === id)), q.map((x) => x.id).join(','));
ok('Skills has an inline Age button', !!(await page.$('.panel.top [data-el=inline-age]')));
await shot('inline_skills');
const before = await sv(), p0 = await stackLen();
await clickSel('.panel.top [data-quick=train]'); await sleep(300);
q = await quick(); ok('Train marks itself done for the year and the screen stays open', q.find((x) => x.id === 'train').done && (await stackLen()) === p0);
ok('Train changed skills (screen refreshed in place)', (await sv()) !== before);
await clickSel('.panel.top [data-quick=read]'); q = await quick(); ok('Read works too', q.find((x) => x.id === 'read').done);
await shot('inline_skills_done');
// inline age: advance without leaving
const a0 = await age(), j0 = await page.evaluate(() => document.querySelectorAll('.j-line').length);
await clickSel('.panel.top [data-el=inline-age]'); await sleep(500); await dismiss(); await sleep(300);
ok('inline Age advances the year', (await age()) === a0 + 1, `${a0} -> ${await age()}`);
ok('still in the Skills screen after aging', (await stackLen()) === p0 && await page.evaluate(() => document.querySelector('.panel.top').dataset.title === 'Skills'));
ok('journal got the new year', (await page.evaluate(() => document.querySelectorAll('.j-line').length)) > j0);
q = await quick(); ok('actions reset for the new year', !q.find((x) => x.id === 'train').done && !q.find((x) => x.id === 'read').done);
ok('inline age label shows next age', (await page.evaluate(() => document.querySelector('.panel.top [data-el=inline-age] small').textContent)) === '→ ' + (a0 + 2));
// repeated clicks: button stays put and works
const r0 = await rectIA(); let moved = 0;
for (let i = 0; i < 6; i++) { await clickSel('.panel.top [data-el=inline-age]'); await sleep(300); await dismiss(); const r = await rectIA(); if (r.some((v, k) => Math.abs(v - r0[k]) > 0.5)) moved++; }
ok('inline Age stays locked in place across repeated clicks', moved === 0, `moved ${moved}x`);
ok('repeated inline clicks aged the character', (await age()) >= a0 + 6, String(await age()));
// other screens
for (const [tab, title] of [['occupation', 'Work'], ['activities', 'Activities'], ['relationships', 'Social']]) {
  const viaMore = tab === 'activities';
  await page.evaluate(() => { const b = document.querySelector('.panel .pbtn'); }); await page.evaluate(() => document.querySelectorAll('.panel').forEach((p) => p.remove())); 
  await page.reload(); await page.waitForFunction(() => window.__ready === true, { timeout: 20000 }); await sleep(400);
  if (viaMore) { await clickSel('[data-tab=more]'); await page.evaluate(() => { const i = document.querySelector('.panel.top input'); i.value = 'all activities'; i.dispatchEvent(new Event('input', { bubbles: true })); }); await sleep(300); await page.evaluate(() => [...document.querySelectorAll('.panel.top .row')].find((e) => /All activities/.test(e.textContent)).click()); await sleep(600); } else { await clickSel(`[data-tab=${tab}]`); await sleep(500); }
  ok(`${title} screen has quick bar + inline Age`, !!(await page.$('.panel.top [data-el=inline-age]')) && (await quick()).length > 0, (await quick()).map((x) => x.id).join(','));
  if (tab === 'relationships') { const before2 = await page.evaluate(() => document.querySelector('.panel.top .person .hint') && [...document.querySelectorAll('.panel.top .person')].map((c) => c.textContent).join('|')); await page.evaluate(() => document.querySelector('.panel.top [data-quick^="upkeep:"]').click()); await sleep(500); const q2 = await quick(); ok('relationship upkeep marks done', q2.some((x) => x.id.startsWith('upkeep:') && x.done)); await shot('inline_social'); }
  if (tab === 'occupation') await shot('inline_work'); if (tab === 'activities') await shot('inline_activities');
}
await page.reload(); await page.waitForFunction(() => window.__ready === true, { timeout: 20000 }); await sleep(400);
await clickSel('[data-tab=more]'); await sleep(300); ok('More menu has no quick bar', !(await page.$('.panel.top [data-el=inline-age]')) || await page.evaluate(() => document.querySelector('.panel.top [data-el=qbar]').hidden));
ok('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close(); srv.kill(); console.log(fails ? 'INLINE UI FAIL' : 'INLINE UI PASS'); process.exit(fails ? 1 : 0);

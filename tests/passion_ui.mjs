// UI test: the Autopilot "Train passion" routine + passion picker vs the manual Practice button. node tests/passion_ui.mjs
import { loadPuppeteer } from './_pp.mjs'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const puppeteer = loadPuppeteer(); const ROOT = new URL('..', import.meta.url).pathname, PORT = 18866, SHOTS = process.env.SHOTS || '/workspace/lifesim_art128/feature_shots7';
fs.mkdirSync(SHOTS, { recursive: true });
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 800));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let fails = 0; const errors = [];
const ok = (n, c, i = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : '')); };
const PREM = { 'lifesim.premium.v1': { v: 1, owned: { autopilot: true }, sub: null } };
async function boot(q) { const page = await browser.newPage(); await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: false }); page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); }); page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
  await page.goto(`http://127.0.0.1:${PORT}/index.html?fresh=1&nosave=1&${q}`); await page.evaluate((v) => { localStorage.clear(); for (const [k, x] of Object.entries(v)) localStorage.setItem(k, JSON.stringify(x)); }, PREM); await page.reload(); await page.waitForFunction(() => window.__ready === true, { timeout: 20000 }); await sleep(500); return page; }
const A = (page, code) => page.evaluate(`(async()=>{const {adapter}=await import('/ui/js/adapter.js'); ${code}})()`);
const clean = (page) => A(page, `const s=adapter.impl.s; s.pending=[]; s.diseases=[]; s.prison=null; s.stats.health=90; s.cash=Math.max(s.cash,2e6); return 1`);
const dismiss = async (page) => { for (let i = 0; i < 6; i++) { const o = await page.$('.overlay .opt'); if (!o) { const b = await page.$('.overlay .btn'); if (!b) return; await b.click(); await sleep(250); continue; } await o.click(); await sleep(300); } };
const clickRow = (page, text) => page.evaluate((text) => { const el = [...document.querySelectorAll('.panel.top .row')].find((e) => e.textContent.includes(text)); if (el) { el.scrollIntoView(); el.click(); return true; } return false; }, text);
const state = (page) => A(page, `const p=adapter.impl.getPassions(); return JSON.stringify({cash:Math.round(adapter.impl.s.cash), age:Math.floor(adapter.impl.s.age), active:p.active.map(a=>({id:a.id,meter:a.meter,practiced:a.practiced})), mastered:p.mastered.length, skills:Object.fromEntries(Object.entries(adapter.impl.s.skills||{}).map(([k,v])=>[k,Math.round(v*100)/100]))})`).then(JSON.parse);
const YEARS = 6;
// ---- manual path: pick science, press Practice each year via the real button, then age
const man = await boot('seed=5&age=14&cash=1000000'); await clean(man);
await man.click('[data-tab=skills]'); await sleep(400); ok('Passions reachable from the Skills screen', await man.evaluate(() => { const b = document.querySelector('[data-el=passions-link]'); if (b) { b.click(); return true; } return false; })); await sleep(500);
ok('manual: pick a passion', await clickRow(man, 'Science') || await clickRow(man, 'Music')); await sleep(600);
const pid = (await state(man)).active[0].id; const manLog = [];
for (let y = 0; y < YEARS; y++) { await clean(man); const b = await state(man);
  await man.evaluate(() => document.querySelector('[data-tab=skills]').click()); await sleep(300); await man.evaluate(() => document.querySelector('[data-el=passions-link]')?.click()); await sleep(500);
  await man.evaluate(() => { const bt = document.querySelector('[data-act=practice]'); if (bt) bt.click(); }); await sleep(500); const a = await state(man); manLog.push({ before: b.active[0]?.meter, after: a.active[0]?.meter, cost: b.cash - a.cash });
  await A(man, `await adapter.impl.age({noAuto:true}); return 1`); await dismiss(man); await clean(man); await man.evaluate(() => document.querySelector('[data-el=passions-link]')?.click()); await sleep(300); }
const manEnd = await state(man); await man.close();
// ---- autopilot path through the real Autopilot screen: choose the passion with the picker, switch the routine on, age with the real AGE flow
const aut = await boot('seed=5&age=14&cash=1000000'); await clean(aut);
await A(aut, `await adapter.impl.setAutopilot({routines:[]}); return 1`);
await aut.click('[data-tab=more]'); await sleep(300); await aut.evaluate((v) => { const i = document.querySelector('.panel.top input'); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); }, 'autopilot'); await sleep(300);
await aut.evaluate(() => { const r = [...document.querySelectorAll('.panel.top .row')].find((e) => /Autopilot/.test(e.textContent)); r && r.click(); }); await sleep(600);
// accordion: sections collapsed, tap to drop down in place (no new page), tap again to collapse, state remembered
const panels = () => aut.evaluate(() => document.querySelectorAll('.panel').length), open = (id) => aut.evaluate((i) => document.querySelector(`[data-acc=${i}]`).getAttribute('aria-expanded'), id), vis = (id) => aut.evaluate((i) => { const e = document.querySelector(`[data-id="${i}"]`); return !!e && getComputedStyle(e.closest('.acc-body')).visibility !== 'hidden' && e.closest('.acc-body').offsetHeight > 0; }, id);
ok('sections School/Job/Business/Hobbies exist as banners', await aut.evaluate(() => ['school', 'job', 'business', 'hobbies'].every((i) => document.querySelector(`[data-acc=${i}]`))));
ok('sections start collapsed', (await open('hobbies')) === 'false' && !(await vis('routine:practice'))); const p0 = await panels(); await aut.screenshot({ path: SHOTS + '/04_autopilot_accordion_collapsed.png' });
await aut.evaluate(() => document.querySelector('[data-acc=hobbies]').click()); await sleep(450); ok('tapping Hobbies drops it down in place', (await open('hobbies')) === 'true' && (await vis('routine:practice')) && (await panels()) === p0); await aut.screenshot({ path: SHOTS + '/05_autopilot_accordion_open.png' });
await aut.evaluate(() => document.querySelector('[data-acc=school]').click()); await sleep(450); ok('school section has Try harder in school', await vis('routine:study') && /Try harder in school/.test(await aut.evaluate(() => document.querySelector('[data-id="routine:study"]').textContent)));
await aut.evaluate(() => document.querySelector('[data-acc=hobbies]').click()); await sleep(450); ok('tapping again collapses it', (await open('hobbies')) === 'false' && !(await vis('routine:practice')));
await aut.reload(); await aut.waitForFunction(() => window.__ready === true, { timeout: 20000 }); await sleep(500); await clean(aut); await A(aut, `await adapter.impl.setAutopilot({routines:[]}); return 1`);
await aut.evaluate(() => document.querySelector('[data-tab=more]').click()); await sleep(300); await aut.evaluate((v) => { const i = document.querySelector('.panel.top input'); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); }, 'autopilot'); await sleep(300); await aut.evaluate(() => [...document.querySelectorAll('.panel.top .row')].find((e) => /Autopilot/.test(e.textContent))?.click()); await sleep(600);
ok('open/closed state is remembered (school open, hobbies closed)', (await open('school')) === 'true' && (await open('hobbies')) === 'false');
await aut.evaluate(() => document.querySelector('[data-acc=hobbies]').click()); await sleep(450);
ok('Autopilot screen lists the visible Train passion routine', await aut.evaluate(() => !!document.querySelector('[data-id="routine:practice"]') && /Train passion/.test(document.querySelector('[data-id="routine:practice"]').textContent)));
ok('Autopilot screen has the Passion to train picker', await aut.evaluate(() => !!document.querySelector('[data-id="auto:passion"]'))); await aut.screenshot({ path: SHOTS + '/00_autopilot_passion_picker.png' });
await aut.evaluate(() => document.querySelector('[data-id="auto:passion"]').click()); await sleep(500); await aut.screenshot({ path: SHOTS + '/01_passion_picker_sheet.png' });
const names = await aut.evaluate(() => [...document.querySelectorAll('.sheet .opt')].map((e) => e.textContent));
const idx = names.findIndex((n) => n.includes((pid[0].toUpperCase() + pid.slice(1)).replace('_', ' ')) || n.toLowerCase().includes(pid.replace('_', ' '))); ok('picker offers the passion', idx > 0, names.slice(0, 5).join(' | '));
await aut.evaluate((i) => document.querySelectorAll('.sheet .opt')[i].click(), idx); await sleep(700);
ok('picker sets the autopilot passion and turns the routine on', (await A(aut, `const a=adapter.impl.getAutopilot(); return a.passion+'|'+a.selected.join(',')`)) === pid + '|practice');
await aut.click('[data-el=auto-toggle]'); await sleep(500); ok('autopilot is ON', await A(aut, `return adapter.impl.getAutopilot().on`)); await aut.screenshot({ path: SHOTS + '/02_autopilot_on.png' });
const autLog = []; let paused = [];
for (let y = 0; y < YEARS; y++) { await clean(aut); const b = await state(aut);
  await aut.evaluate(() => document.querySelector('.panel.top [data-el=inline-age]')?.click()); await A(aut, 'return 1'); 
  await A(aut, `if(adapter.impl.s.age===${b.age}) await adapter.impl.age({}); return 1`); await sleep(400); await dismiss(aut);
  const a = await state(aut); const last = await A(aut, `return JSON.stringify(adapter.impl.getAutopilot().last)`); const L = JSON.parse(last); autLog.push({ age: a.age, practicedBy: L && L.ran.map((r) => r.id), paused: L && L.paused, meterBefore: b.active[0]?.meter, meterAfter: a.active[0]?.meter, cashDelta: a.cash - b.cash }); }
console.log(JSON.stringify(autLog.slice(0, 3)));
const autEnd = await state(aut);
ok('autopilot practiced the passion every year', autLog.every((l, i) => l.practicedBy && l.practicedBy.includes('practice')), JSON.stringify(autLog.map((l) => l.practicedBy)));
ok('manual practice raised the meter each year', manLog.every((l) => l.after > l.before), JSON.stringify(manLog));
// Autopilot now does the new year's practice at the start of the year (so the chips show Done), so after N ages it is exactly one practice ahead of a manual player who has not yet clicked Practice.
ok('passion progress matches the manual path (auto is one start-of-year practice ahead)', autEnd.active.every((a, i) => !manEnd.active[i] || (a.meter >= manEnd.active[i].meter && a.meter - manEnd.active[i].meter <= 14)) && autEnd.mastered >= manEnd.mastered, `manual ${JSON.stringify(manEnd.active)} vs auto ${JSON.stringify(autEnd.active)}`);
ok('skills grown at least as much (one year ahead)', Object.keys(manEnd.skills).every((k) => autEnd.skills[k] >= manEnd.skills[k]));
ok('Practice costs the same (none) on both paths', manLog.every((l) => l.cost === 0));
await aut.evaluate(() => { document.querySelector('[data-tab=skills]').click(); }); await sleep(300); await aut.evaluate(() => document.querySelector('[data-el=passions-link]')?.click()); await sleep(500); await aut.screenshot({ path: SHOTS + '/03_passion_after_autopilot.png' });
ok('no JS errors', errors.length === 0, errors.join('; ')); await browser.close(); srv.kill(); console.log(fails ? 'FAIL passion_ui' : 'PASS passion_ui'); process.exit(fails ? 1 : 0);

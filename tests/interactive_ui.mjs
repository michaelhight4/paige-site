// 7c6: Interactive mode for Pro Athlete (key game from My Job and from My Team) and Coaching (season buttons use refresh). node tests/interactive_ui.mjs
import { loadPuppeteer } from './_pp.mjs'; import { spawn } from 'node:child_process';
const puppeteer = loadPuppeteer(); const ROOT = new URL('..', import.meta.url).pathname, PORT = 18897;
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 800));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let fails = 0; const errors = []; const ok = (n, c, i = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : '')); };
const page = await browser.newPage(); await page.setViewport({ width: 390, height: 844, isMobile: true }); page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://127.0.0.1:${PORT}/index.html?fresh=1&nosave=1&seed=21&age=26&cash=500000`); await page.waitForFunction(() => window.__ready === true, { timeout: 20000 }); await sleep(400);
const A = (code) => page.evaluate(`(async()=>{const {adapter}=await import('/ui/js/adapter.js'); ${code}})()`);
const athlete = `const a=adapter.impl,s=a.s; s.school=null; s.edu=2; s.job=null; s.pending.length=0; const B=await import('/src/slice_bridge.js'); const sl=B.slice(s); sl.job={kind:'special',special:'athlete',id:'sp_athlete_3',title:'Starter',wage:9e6,years:3,yearsInLevel:1,step:3,sector:'special'}; B.push(s); const MT=await import('/src/myteam.js'); if(MT.ensure(s).key) MT.ensure(s).key=null; const {refreshState}=await import('/ui/js/ui.js'); if(refreshState) await refreshState(); return a.getMyTeam().onTeam`;
const pickCall = async () => { await sleep(500); const c = await page.evaluate(() => { const o = [...document.querySelectorAll('.overlay .opt, .sheet .opt')]; if (!o.length) return 0; o[0].click(); return o.length; }); await sleep(700); if (await page.$('.overlay .btn')) await page.evaluate(() => document.querySelector('.overlay .btn')?.click()); await sleep(300); return c; };
ok('athlete set up', await A(athlete));
// entry 1: Work page (My Job)
await page.click('[data-tab=occupation]'); await sleep(800);
ok('[My Job] key game card shown', await page.evaluate(() => !!document.querySelector('[data-el=key-game] [data-act=key-game]')));
await page.evaluate(() => document.querySelector('[data-act=key-game]').click()); ok('[My Job] 3 calls offered', (await pickCall()) === 3);
let k = JSON.parse(await A(`return JSON.stringify(adapter.impl.getKeyGame())`)); ok('[My Job] key game played', k.done === true, JSON.stringify(k).slice(0, 150));
await page.click('[data-tab=occupation]'); await sleep(600); ok('[My Job] result shown', /Won|Lost/.test(await page.evaluate(() => document.querySelector('[data-el=key-game]')?.textContent || '')));
// entry 2: My Team screen
await A(`const MT=await import('/src/myteam.js'); MT.ensure(adapter.impl.s).key=null; return 1`);
await A(`const {openPanel}=await import('/ui/js/ui.js'); const m=await import('/ui/js/screens/sports.js'); openPanel('My Team', m.myTeamInline); return 1`); await sleep(900);
ok('[My Team] key game card shown', await page.evaluate(() => !!document.querySelector('.panel.top [data-act=key-game]')));
await page.evaluate(() => document.querySelector('.panel.top [data-act=key-game]').click()); ok('[My Team] 3 calls offered', (await pickCall()) === 3);
k = JSON.parse(await A(`return JSON.stringify(adapter.impl.getKeyGame())`)); ok('[My Team] key game played', k.done === true);
const w0 = JSON.parse(await A(`const a=adapter.impl; a.s.pending.length=0; await a.age({noAuto:true}); const MT=await import('/src/myteam.js'); const m=MT.ensure(a.s); return JSON.stringify({kg:m.last&&m.last.keyGame, used:m.key&&m.key.used})`));
ok('season record applies the key game', !!w0.kg && w0.used === true, JSON.stringify(w0));
// coaching interactive: Auto-finish uses refresh (was undefined)
await page.goto(`http://127.0.0.1:${PORT}/index.html?fresh=1&nosave=1&seed=9&age=30&cash=5000000`); await page.waitForFunction(() => window.__ready === true, { timeout: 20000 }); await sleep(400);
await A("const a=adapter.impl; a.s.flags.ex_pro=1; a.s.school=null; a.s.edu=2; a.s.job=null; a.s.pending.length=0; return adapter.coachAction('take','soccer')");
await page.click('[data-tab=occupation]'); await sleep(800); const before = errors.length;
const fin = await page.evaluate(() => { const b = document.querySelector('[data-act=finish]'); if (b) b.click(); return !!b; }); await sleep(2500);
ok('[Coaching] season buttons present', fin); ok('[Coaching] Auto-finish runs without errors', errors.length === before, errors.slice(before).join('|'));
ok('[Coaching] season finished on screen', /finished|Age up/.test(await page.evaluate(() => document.querySelector('[data-el=coach-season]')?.textContent || '')));
ok('no page errors', errors.length === 0, errors.slice(0, 3).join('|'));
await browser.close(); srv.kill(); console.log(fails ? 'INTERACTIVE FAIL' : 'INTERACTIVE PASS'); process.exit(fails ? 1 : 0);

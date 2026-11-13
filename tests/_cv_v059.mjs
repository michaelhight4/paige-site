import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await (await b.newContext({viewport:{width:1280,height:800}})).newPage();
p.on('pageerror', e => console.log('ERR', e.message));
await p.goto('https://paigegames.net/kilumen/index.html?save=0&audio=0');
await p.evaluate(() => window.kilumen.ready); await p.waitForTimeout(2500);
await p.keyboard.press('Enter'); await p.waitForTimeout(1000);
for (let i=0;i<80;i++){ const st = await p.evaluate(() => !!window.kilumen.scene.dialog?.active || !!window.kilumen.scene.busy || !!window.kilumen.scene.fade || !!window.kilumen.scene.player.locked); if(!st) break; await p.keyboard.press('Enter'); await p.waitForTimeout(300);} await p.waitForTimeout(1000);
if (process.env.WS) await p.evaluate((w) => { window.kilumen.scene.worldSpeed = w; }, Number(process.env.WS));
await p.evaluate(() => { const k = window.kilumen, cv = k.companyVoice, s=k.scene; window._log = []; 
  const o = cv.show.bind(cv); cv.show = (it) => { o(it); window._log.push(['show', s.tick, it.name, s.seen['cv#trainer1']]); };
  const oh = cv.hide.bind(cv); cv.hide = (w) => { window._log.push(['hide', s.tick, w]); oh(w); };
  const oa = cv.advance.bind(cv); cv.advance = (w) => { window._log.push(['adv', s.tick, w, cv.current?.page]); oa(w); };
  s.flags.add('got_starter'); s.flags.add('rita_installed'); cv.emit('rita_install'); });
for (let i = 0; i < 12; i++) { await p.waitForTimeout(1000); console.log(await p.evaluate(() => { const cv = window.kilumen.companyVoice, s = window.kilumen.scene; return [cv.blockedReason(), s.fade && JSON.stringify(s.fade).slice(0,80), document.querySelector('.cv-strip')?.textContent].join(' ; '); })); }
console.log(JSON.stringify(await p.evaluate(() => window._log)));
await b.close();

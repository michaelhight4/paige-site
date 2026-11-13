import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await (await b.newContext({viewport:{width:1280,height:800}})).newPage();
p.on('pageerror', e => console.log('ERR', e.message));
await p.goto('http://localhost:8765/kilumen/index.html?save=0&skipintro=1&audio=0&map=lab_brookhollow&cv=1');
await p.evaluate(() => window.kilumen.ready); await p.waitForTimeout(2500);
await p.evaluate(() => { const k = window.kilumen, cv = k.companyVoice; window._log = []; const o = cv.show.bind(cv); cv.show = (it) => { o(it); window._log.push([k.scene.tick, it.name, (cv.current?.pages||[]).join(' | ').slice(0,90), k.scene.seen['cv#trainer1']]); }; k.scene.flags.add('got_starter'); k.scene.flags.add('rita_installed'); cv.emit('rita_install'); });
for (let i = 0; i < 6; i++) { await p.waitForTimeout(1000); console.log(await p.evaluate(() => { const cv = window.kilumen.companyVoice, s = window.kilumen.scene; return [cv.blockedReason(), s.saveLockReason?.(), cv.lastHideAt, s.ms, !!s.busy].join(','); })); }
console.log(JSON.stringify(await p.evaluate(() => ({ log: window._log, st: window.kilumen.companyVoice.state() })), null, 0));
await b.close();

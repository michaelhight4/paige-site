import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await (await b.newContext({viewport:{width:1280,height:800}})).newPage();
p.on('pageerror', e => console.log('ERR', e.message));
await p.goto('http://localhost:8765/kilumen/index.html?save=0&audio=0');
await p.evaluate(() => window.kilumen.ready); await p.waitForTimeout(2500);
console.log(await p.evaluate(() => { const k=window.kilumen, s=k.scene; return JSON.stringify({kk:Object.keys(k), sys:Object.keys(s.systems||{}), ui: !!k.ui, rep: k.ui && k.ui.scr_pack===k.ui.scr_sys_bag}); }));
console.log(await p.evaluate(() => { const s=window.kilumen.scene, sys=s.systems; sys.bag.add('tonic_small',3); sys.bag.add('calm_tea',2); return JSON.stringify([sys.bag.pocket('care'), sys.bag.counts]); }));
await b.close();

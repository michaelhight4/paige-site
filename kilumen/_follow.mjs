import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const ROOT=process.env.ROOT||'/dev/shm/ps/kilumen', PORT=+(process.env.PORT||8932), OUT=process.env.OUT;
const sv=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{cwd:ROOT,stdio:'ignore'});
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms)); await sleep(800);
const b=await chromium.launch(); const page=await (await b.newContext({viewport:{width:1280,height:720}})).newPage();
await page.addInitScript(()=>{try{localStorage.clear();localStorage.setItem('kilumen_alpha_notice_seen.v1','1')}catch{}});
await page.goto(`http://127.0.0.1:${PORT}/index.html?save=0&hour=12&audio=0&enc=0`);
await page.waitForFunction(()=>window.kilumen?.scene,null,{timeout:30000}); await sleep(4000);
const st=()=>page.evaluate(()=>{const s=kilumen.scene;return {map:s.map?.name,party:s.party.map(c=>c.species+':'+c.origin?.how),follower:s.follower?.species||null,comp:s.opening2?.companion?.species||null,flags:['open2_active','flg_promoted','got_starter','open2_companion_joined'].filter(f=>s.flags.has(f))}});
console.log('new game',JSON.stringify(await st()));
await page.evaluate(async()=>{const s=kilumen.scene;document.querySelectorAll('.open2-id').forEach(e=>e.remove());s.opening2.holding=false;s.fade=null;s.seen['open2:name']=s.seen['open2:name']||'Gary';s.opening2.S["open2:companion"]={species:'mossmote',level:3};for(const f of ['open2_fed','open2_done','flg_promoted'])s.setFlag(f);s.opening2?.joinNow?.();try{kilumen.ui?.closeAll?.()}catch{} s.dialog?.close?.();});
for(let i=0;i<8;i++){await page.keyboard.press('f');await sleep(200);}
await page.evaluate(()=>{const s=kilumen.scene;s.fade=null;s.busy=false;s.player.locked=false;s.startWarp({map:'lab_brookhollow',x:4,y:6,facing:'down'},'door');});
await sleep(3500); for(let i=0;i<4;i++){await page.keyboard.press('f');await sleep(200);}
console.log('lab after promotion, before starter',JSON.stringify(await st()));
await page.screenshot({path:OUT+'_lab_promoted_no_starter.png'});
if(process.env.STARTER){await page.evaluate(()=>{const s=kilumen.scene;s.setFlag('got_starter');});await sleep(2500);for(let i=0;i<6;i++){await page.keyboard.press('f');await sleep(300);}
 for(const k of ['ArrowDown','ArrowDown']){await page.keyboard.press(k);await sleep(400);} await sleep(800);
 console.log('after got_starter',JSON.stringify(await st())); await page.screenshot({path:OUT+'_after_starter.png'});}
await b.close(); sv.kill();

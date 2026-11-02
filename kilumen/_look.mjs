import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const ROOT=process.env.ROOT||'/dev/shm/ps/kilumen', PORT=8931;
const sv=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{cwd:ROOT,stdio:'ignore'});
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms)); await sleep(800);
const [,, out, map, x, y] = process.argv;
const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:1280,height:720}}); const page=await ctx.newPage();
await page.addInitScript(()=>{try{localStorage.setItem('kilumen_alpha_notice_seen.v1','1')}catch{}});
await page.goto(`http://127.0.0.1:${PORT}/index.html?save=0&timescale=0&hour=12&audio=0&enc=0&lead=nibbin&dev=1`);
await page.waitForFunction(()=>window.kilumen?.ready||window.kilumen?.ui,null,{timeout:20000});
await page.evaluate(()=>Promise.race([window.kilumen.ready,new Promise(r=>setTimeout(r,15000))]));
await sleep(1500); for(let i=0;i<8;i++){await page.keyboard.press('f');await sleep(250);}
await page.evaluate(([map,x,y])=>{const s=kilumen.scene;try{kilumen.ui?.closeAll?.()}catch{} s.fade=null;s.busy=false;s.player.locked=false;s.startWarp({map,x:+x,y:+y,facing:'down'},'door');},[map,x,y]);
await sleep(3000); await page.evaluate(()=>{try{kilumen.ui?.closeAll?.()}catch{}}); await sleep(300);
const N=+(process.env.N||1); for(let i=0;i<N;i++){await page.screenshot({path:N>1?out.replace(".png","_"+i+".png"):out}); await sleep(+(process.env.GAP||700));} await b.close(); sv.kill();

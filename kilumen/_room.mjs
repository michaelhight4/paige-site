import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const ROOT='/dev/shm/ps/kilumen', PORT=8932, OUT='/workspace/shots/room_kilu';
const sv=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{cwd:ROOT,stdio:'ignore'});
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms)); await sleep(800);
const DEV=[{plat:'pc',w:1920,h:1080,dpr:1,touch:false},{plat:'phone',w:780,h:360,dpr:3,touch:true}];
const b=await chromium.launch(); const rep=[];
for(const d of DEV){
  const ctx=await b.newContext({viewport:{width:d.w,height:d.h},deviceScaleFactor:d.dpr,hasTouch:d.touch,isMobile:d.touch}); const page=await ctx.newPage();
  await page.addInitScript(()=>{try{localStorage.setItem('kilumen_alpha_notice_seen.v1','1')}catch{}});
  await page.goto(`http://127.0.0.1:${PORT}/index.html?save=0&timescale=0&hour=12&audio=0&enc=0&lead=nibbin&dev=1`);
  await page.waitForFunction(()=>window.kilumen?.ready||window.kilumen?.ui,null,{timeout:20000});
  await page.evaluate(()=>Promise.race([window.kilumen.ready,new Promise(r=>setTimeout(r,15000))]));
const drain=async()=>{for(let i=0;i<30;i++){const busy=await page.evaluate(()=>{const s=kilumen.scene;return !!(s.dialog?.active||s.busy||s.fade||s._script)});if(!busy&&i>2)break;await page.keyboard.press('f');await sleep(350);}await page.evaluate(()=>{const s=kilumen.scene;s.player.locked=false;});};
  await sleep(1500); for(let i=0;i<8;i++){await page.keyboard.press('f');await sleep(250);}
  await page.evaluate(()=>{const s=kilumen.scene;try{kilumen.ui?.closeAll?.()}catch{} s.dialog?.close?.(); s.fade=null;s.busy=false;s.player.locked=false;
    for(const f of ['open2_active','open2_fed','open2_done']) s.flags.add(f); s.flags.delete('flg_promoted'); s.flags.delete('open2_companion_joined');
    s.seen['open2:companion']={species:'mossmote'}; s.party.length=0;
    s.startWarp({map:'house_2f',x:2,y:4,facing:'down'},'door');});
  await sleep(3500); await drain();
  const st=await page.evaluate(async()=>{const s=kilumen.scene;try{kilumen.ui?.closeAll?.()}catch{} s.dialog?.close?.(); const f=s.follower; if(!f) return {err:'no follower',map:s.map.name};
    s.player.x=f.x-1; s.player.y=f.y; s.player.facing='right'; s._dirty=true; return {f:{x:f.x,y:f.y,st:f.static},p:[s.player.x,s.player.y]};});
  rep.push(d.plat+' setup '+JSON.stringify(st)); await sleep(400);
  await page.keyboard.down('ArrowRight'); await sleep(700); await page.keyboard.up('ArrowRight'); await sleep(500);
  const after=await page.evaluate(()=>{const s=kilumen.scene;return [s.player.x,s.player.y,s.player.facing]});
  rep.push(d.plat+' after walk into kilu '+JSON.stringify(after));
  await page.screenshot({path:`${OUT}/${d.plat}_1_blocked.png`});
  if(d.touch){ await page.tap('#touchpad [data-btn=a]'); await sleep(1200); rep.push('phone A tap dialog '+await page.evaluate(()=>!!kilumen.scene.dialog?.active));
  } else { await page.keyboard.press('f'); await sleep(1200); }
  const dl=await page.evaluate(()=>({active:!!kilumen.scene.dialog?.active,log:kilumen.scene.log.filter(e=>e.step==='roomTalk').length,said:kilumen.scene.dialog?.lines?.[0]||kilumen.scene.dialog?.text||null,txt:document.querySelector('.dialog, #dialog, .dlg')?.innerText?.slice(0,120)}));
  rep.push(d.plat+' dialog '+JSON.stringify(dl));
  await page.screenshot({path:`${OUT}/${d.plat}_2_dialog.png`});
  // early leave: pre-promotion save that already has the companion in the party (old bug)
  await page.evaluate(()=>{const s=kilumen.scene;s.dialog?.close?.();s.busy=false;s.player.locked=false;s.party.length=0;
    s.party.push({species:'mossmote',level:5,origin:{how:'companion',noQuest:true},hp:20,maxHp:20,moves:[]});
    s.startWarp({map:'brookhollow',x:21,y:17,facing:'down'},'door');});
  await sleep(3500); await drain();

  await page.keyboard.down('ArrowDown'); await sleep(900); await page.keyboard.up('ArrowDown'); await sleep(600);
  const fo=await page.evaluate(()=>{const s=kilumen.scene;return {map:s.map.name,follower:s.follower?{sp:s.follower.species,x:s.follower.x,y:s.follower.y}:null,p:[s.player.x,s.player.y]}});
  rep.push(d.plat+' early leave '+JSON.stringify(fo));
  await page.screenshot({path:`${OUT}/${d.plat}_3_left_home_no_follower.png`});
  await ctx.close();
}
await b.close(); sv.kill(); console.log(rep.join('\n'));

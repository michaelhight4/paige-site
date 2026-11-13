import { chromium } from '/workspace/kilumen/node_modules/playwright/index.mjs';
import fs from 'fs';
const pages = JSON.parse(fs.readFileSync('/tmp/v044/fit/pages.json'));
const css = fs.readFileSync('/tmp/v044/fit/style.css','utf8');
const b = await chromium.launch();
for (const [w,h,touch] of [[1280,720,false],[1920,1080,false],[844,390,true],[800,360,true],[1024,768,true]]) for (const portrait of [false,true]) {
  const p = await b.newPage({viewport:{width:w,height:h}});
  await p.setContent(`<style>${css}</style><div class="dlg-wrap open ${portrait?'has-portrait':''}"><div class="dlg-box"><div class="dlg-text" id="t"></div></div></div>
  <div id="touchpad" ${touch?'':'hidden'} style="display:${touch?'block':'none'}"><div class="dpad" id="dp"></div><div class="btns" id="bt"><button data-btn="b">B</button><button data-btn="a">A</button></div></div>`);
  const r = await p.evaluate((pages) => {
    const t = document.getElementById('t'); const lh = parseFloat(getComputedStyle(t).lineHeight); let over=[];
    for (const s of pages) { t.textContent = s; const n = Math.round(t.getBoundingClientRect().height / lh); if (n > 2) over.push([n,s]); }
    t.textContent = pages[0];
    const box = document.querySelector('.dlg-box').getBoundingClientRect(); const dp = document.getElementById('dp').getBoundingClientRect(); const bt = document.getElementById('bt').getBoundingClientRect();
    const ov = (a,b)=> a.width&&b.width&& a.left<b.right && b.left<a.right && a.top<b.bottom && b.top<a.bottom;
    return {font:getComputedStyle(t).fontSize, textW: t.getBoundingClientRect().width, box:[Math.round(box.left),Math.round(box.top),Math.round(box.width),Math.round(box.height)], overDpad: ov(box,dp), overBtns: ov(box,bt), over: over.length, ex: over.slice(0,6)};
  }, pages);
  console.log(w+'x'+h, portrait?'portrait':'plain', JSON.stringify(r));
  await p.close();
}
await b.close();

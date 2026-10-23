(()=>{const tabs=['home','games','webtoons','start-of-the-end','music','wallet','social','about'];
const rm=matchMedia('(prefers-reduced-motion: reduce)').matches;
function show(t,focus){if(!tabs.includes(t))t='home';document.body.dataset.tab=t;
document.querySelectorAll('[data-panel]').forEach(p=>p.hidden=p.dataset.panel!==t);
document.querySelectorAll('.tabs a,.dlinks a').forEach(a=>a.dataset.go===t?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current'));
if(focus){window.scrollTo(0,0);document.getElementById('p-'+t).focus({preventScroll:true});}}
document.querySelectorAll('.panel').forEach(p=>p.tabIndex=-1);
addEventListener('hashchange',()=>show(location.hash.slice(1),true));
show(location.hash.slice(1),false);
if(!rm)setTimeout(()=>{document.querySelectorAll('[data-tilt]').forEach(c=>{c.addEventListener('pointermove',e=>{const r=c.getBoundingClientRect();
c.style.setProperty('--rx',((e.clientY-r.top)/r.height-.5)*-4+'deg');c.style.setProperty('--ry',((e.clientX-r.left)/r.width-.5)*5+'deg')});
c.addEventListener('pointerleave',()=>{c.style.setProperty('--rx','0deg');c.style.setProperty('--ry','0deg')})});
const sbg=document.querySelector('.s-bg');let syr=0;addEventListener('scroll',()=>{if(syr||!sbg||document.body.dataset.tab!=='start-of-the-end')return;syr=requestAnimationFrame(()=>{syr=0;sbg.style.setProperty('--sy',scrollY)})},{passive:true});});
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const G=window.GAMES||[],T=window.WEBTOONS||[];
const gCard=(g,big)=>{const live=g.status==='live';const shot=g.img?`<${g.url?'a':'div'} class="shot${g.phone?' phone':''}"${g.url?` href="${esc(g.url)}" tabindex="-1"`:''} aria-hidden="true"><img src="${esc(g.img)}" alt="" loading="lazy">${g.fx==="glow"?`<img class="fx fx-glow" src="${esc(g.img.replace(".webp","-glow.webp"))}" alt="" loading="lazy">`:g.fx==="treasure"?`<img class="fx fx-halo" src="${esc(g.img.replace(".webp","-halo.webp"))}" alt="" loading="lazy"><img class="fx fx-glow fx-gem" src="${esc(g.img.replace(".webp","-glow.webp"))}" alt="" loading="lazy"><span class="fx fx-wave fx-shine" style="--m:url(${esc(g.img.replace(".webp","-path.webp"))})"></span><span class="fx fx-sparks"><i style="left:44%;top:12%"></i><i style="left:83%;top:18%;animation-delay:1.3s"></i><i style="left:63%;top:31%;animation-delay:2.6s"></i><i style="left:12.6%;top:40%;animation-delay:.7s"></i></span>`:
g.fx==="wave"?`<span class="fx fx-wave" style="--m:url(${esc(g.img.replace(".webp","-path.webp"))})"></span>`:""}</${g.url?'a':'div'}>`:`<div class="shot soon" aria-hidden="true"><div class="orbs"><i></i><i></i><i></i></div><span class="soonmark">${esc(g.title[0])}</span></div>`;
return `<article class="game ${esc(g.accent)}${big?' feat':''}" data-status="${g.status}" data-tilt>${shot}<div class="body"><div class="tagrow">${live?'<p class="tag live">● Live now</p><p class="free">FREE · NO DOWNLOAD</p>':`<p class="tag soon">◆ In development${g.note?' · '+esc(g.note):''}</p><p class="free">FREE</p>`}</div>
<h2>${esc(g.title)}${g.sub?` <small>${esc(g.sub)}</small>`:''}</h2><p>${esc(g.blurb)}</p><ul class="chips">${g.chips.map(c=>`<li>${esc(c)}</li>`).join('')}</ul>
${live?`<a class="btn play" href="${esc(g.url)}">▶ Play ${esc(g.title)}</a>`:'<span class="btn ghost" aria-disabled="true">In development</span>'}</div></article>`};
const tCard=t=>`<article class="toon">${t.img?`<img src="${esc(t.img)}" alt="${esc(t.alt||'')}" loading="lazy" decoding="async">`:`<div class="toon-ph" aria-hidden="true"><span>${esc(t.title)}</span></div>`}<div class="tbody">${t.status==='live'?'<p class="tag live">● Reading now</p>':'<p class="tag soon">◆ Coming soon</p>'}
<h3>${esc(t.title)}</h3>${t.tags.length?`<ul class="chips">${t.tags.map(c=>`<li>${esc(c)}</li>`).join('')}</ul>`:''}<p${t.blurb.startsWith('PLACEHOLDER')?' class="ph"':''}>${esc(t.blurb)}</p>
${t.links.length?`<p class="row">${t.links.map((l,i)=>`<a class="btn${i?' ghost':''}" href="${esc(l.url)}"${l.url[0]==='#'?'':' rel="noopener"'}>${esc(l.label)}</a>`).join(' ')}</p>`:''}</div></article>`;
const $=id=>document.getElementById(id);
const pick=(arr,n,key)=>{const sh=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
let last=[];try{last=JSON.parse(localStorage.getItem('feat-'+key)||'[]')}catch(e){}
const img=arr.filter(x=>x.img),noimg=arr.filter(x=>!x.img);let pool=img.length>=n?img:img.concat(noimg);
const fresh=pool.filter(x=>!last.includes(x.id));let out=sh(fresh).slice(0,n);if(out.length<n)out=out.concat(sh(pool.filter(x=>!out.includes(x))).slice(0,n-out.length));
if(out.map(x=>x.id).sort().join()===last.slice().sort().join()&&pool.length>n){out=sh(pool).slice(0,n)}
try{localStorage.setItem('feat-'+key,JSON.stringify(out.map(x=>x.id)))}catch(e){}return out};
$('home-games').innerHTML=pick(G,2,'g').map(g=>gCard(g,false)).join('');
$('all-games').innerHTML=G.map(g=>gCard(g,false)).join('');
$('home-toons').innerHTML=pick(T,2,'t').map(tCard).join('');
$('all-toons').innerHTML=T.map(tCard).join('');
document.querySelectorAll('.filters button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.filters button').forEach(x=>x.setAttribute('aria-pressed',x===b));
document.querySelectorAll('#all-games .game').forEach(c=>c.hidden=!(b.dataset.f==='all'||c.dataset.status===b.dataset.f))});
const ico=k=>{const p=(window.ICONS||{})[k];return p?`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${p}"/></svg>`:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.6 13.4a1 1 0 0 1 0-1.4l3.5-3.5a3 3 0 1 1 4.2 4.2l-2 2-1.4-1.4 2-2a1 1 0 1 0-1.4-1.4L12 13.4a1 1 0 0 1-1.4 0zm2.8-2.8a1 1 0 0 1 0 1.4l-3.5 3.5a3 3 0 1 1-4.2-4.2l2-2 1.4 1.4-2 2a1 1 0 1 0 1.4 1.4L12 10.6a1 1 0 0 1 1.4 0z"/></svg>'};
$('socials').innerHTML=(window.SOCIALS?.sections||[]).map(s=>`<section class="socsec"><p class="eyebrow">${esc(s.eyebrow)}</p><h2 class="sec">${esc(s.title)}</h2><ul class="socs">${s.items.map(i=>`<li><a class="soc" data-i="${esc(i.icon||'link')}" href="${esc(i.url)}" rel="noopener">${ico(i.icon)}<span><b>${esc(i.name)}</b><small>${esc(i.note)}</small></span></a></li>`).join('')}</ul></section>`).join('');
// drawer
const bg=$('burger'),dr=$('drawer'),sc=$('scrim'),dl=$('dlinks');
dl.innerHTML=[...document.querySelectorAll('.tabs a')].map(a=>`<li><a href="${a.getAttribute('href')}" data-go="${a.dataset.go}">${a.textContent}</a></li>`).join('');
const openD=()=>{dr.removeAttribute('inert');dr.setAttribute('aria-hidden','false');sc.hidden=false;document.body.classList.add('dopen');bg.setAttribute('aria-expanded','true');bg.setAttribute('aria-label','Close menu');(dl.querySelector('[aria-current]')||dl.querySelector('a')).focus()};
const closeD=f=>{if(!document.body.classList.contains('dopen'))return;document.body.classList.remove('dopen');dr.setAttribute('inert','');dr.setAttribute('aria-hidden','true');sc.hidden=true;bg.setAttribute('aria-expanded','false');bg.setAttribute('aria-label','Open menu');if(f!==false)bg.focus()};
bg.onclick=()=>document.body.classList.contains('dopen')?closeD():openD();$('dx').onclick=()=>closeD();sc.onclick=()=>closeD();
dl.addEventListener('click',e=>{if(e.target.closest('a'))closeD(false)});
addEventListener('keydown',e=>{if(!document.body.classList.contains('dopen'))return;if(e.key==='Escape'){closeD();return}
if(e.key==='Tab'){const f=[...dr.querySelectorAll('a,button')];const i=f.indexOf(document.activeElement);if(e.shiftKey&&i<=0){e.preventDefault();f[f.length-1].focus()}else if(!e.shiftKey&&i===f.length-1){e.preventDefault();f[0].focus()}}});
show(location.hash.slice(1),false);
const today=new Date().toISOString().slice(0,10),S=window.SONGS||[],box=document.getElementById('songs');
if(box){document.getElementById('artist-links').innerHTML=(window.ARTIST_LINKS||[]).map(l=>`<a class="btn ghost" href="${esc(l.url)}" rel="noopener">${esc(l.platform)}</a>`).join(' ');
box.innerHTML=S.map((s,i)=>{const up=s.release>today;return `<article class="song"><img src="${esc(s.cover)}" alt="Cover art for ${esc(s.title)}" loading="lazy" width="400" height="400">
<div class="sb"><h3>${esc(s.title)}</h3><p class="meta">${esc(s.type)} · ${up?'Out '+esc(s.release):esc(s.release.slice(0,4))}</p>
<p class="plays">${s.plays!=null?new Intl.NumberFormat('en',{notation:'compact'}).format(s.plays)+' '+esc(s.playsLabel||'plays'):'— plays'}</p>
<button class="btn play" type="button" data-song="${i}">${up?'Pre-save / listen':'▶ Listen now'}</button>${window.PaigePlayer&&PaigePlayer.hasYT(i)?`<button class="btn ghost here" type="button" data-here="${i}" aria-label="Play ${esc(s.title)} here in the mini player">▶ Play here</button>`:''}</div></article>`}).join('');
const dlg=document.getElementById('chooser');
box.addEventListener('click',e=>{const h=e.target.closest('[data-here]');if(h){PaigePlayer.play(h.dataset.here);return}const b=e.target.closest('[data-song]');if(!b)return;const s=S[b.dataset.song];
document.getElementById('ch-title').textContent=s.title;document.getElementById('ch-img').src=s.cover;
document.getElementById('ch-links').innerHTML=(window.PaigePlayer&&PaigePlayer.hasYT(b.dataset.song)?`<li><button type="button" class="here" data-play="${b.dataset.song}">▶ Play here<span>mini player</span></button></li>`:'')+s.links.map(l=>`<li><a href="${esc(l.url)}" rel="noopener" target="_blank">${esc(l.platform)}<span>↗</span></a></li>`).join('');dlg.showModal();});
document.getElementById('ch-links').addEventListener('click',e=>{const p=e.target.closest('[data-play]');if(p){dlg.close();PaigePlayer.play(p.dataset.play)}});
document.getElementById('ch-close').onclick=()=>dlg.close();dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close()});}
const cur=document.querySelector('.tabs a[aria-current]');
addEventListener('hashchange',()=>{const a=document.querySelector('.tabs a[aria-current]');a&&a.scrollIntoView({block:'nearest',inline:'center'})});
// iOS Safari scroll perf (Oct 22 2026): WebKit repaints every running decorative animation (circuit glow, card fx, sky canvas, aurora) under the page each frame. On iOS only, pause them while scrolling and pause card fx offscreen. Android/desktop unchanged.
const IOS=CSS.supports('-webkit-touch-callout','none'),de=document.documentElement,circ=document.getElementById('circuit');let scr=0,sct=0,skyP=0;
if(IOS&&!rm){addEventListener('scroll',()=>{if(!scr){scr=1;de.classList.add('is-scrolling');circ&&circ.pauseAnimations&&circ.pauseAnimations()}clearTimeout(sct);sct=setTimeout(()=>{scr=0;de.classList.remove('is-scrolling');circ&&circ.unpauseAnimations&&circ.unpauseAnimations();if(skyP){skyP=0;requestAnimationFrame(draw)}},180)},{passive:true});
if('IntersectionObserver' in window){const io=new IntersectionObserver(es=>es.forEach(e=>e.target.classList.toggle('fx-off',!e.isIntersecting)),{rootMargin:'100px'});document.querySelectorAll('.game').forEach(g=>io.observe(g))}}
const cv=document.getElementById('sky'),x=cv.getContext('2d');let W,H,ps=[];
function rs(){W=cv.width=innerWidth;H=cv.height=innerHeight;ps=Array.from({length:Math.min(70,W/18|0)},()=>({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.8+.4,v:Math.random()*.3+.08,h:Math.random()}))}
rs();addEventListener('resize',()=>{if(IOS&&innerWidth===W){if(innerHeight!==H)H=cv.height=innerHeight;return}rs()});
function draw(){if(scr){skyP=1;return}x.clearRect(0,0,W,H);const s=document.body.dataset.tab==='start-of-the-end';
for(const p of ps){x.fillStyle=s?(p.h>.5?'rgba(240,196,92,.55)':'rgba(120,230,140,.35)'):(p.h>.6?'rgba(255,196,90,.5)':'rgba(130,170,255,.45)');
x.beginPath();x.arc(p.x,p.y,p.r,0,7);x.fill();if(!rm){p.y-=p.v;p.x+=Math.sin(p.y/60)*.15;if(p.y<-5){p.y=H+5;p.x=Math.random()*W}}}
if(!rm)requestAnimationFrame(draw)}draw();})();

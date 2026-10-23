// Paige mini player: YouTube official embed (youtube-nocookie.com). No tracking, no downloads.
(()=>{const S=window.SONGS||[];const yid=s=>{for(const l of s.links||[]){const m=/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/.exec(l.url);if(m)return m[1]}return null};
const Q=S.map((s,i)=>({i,s,id:yid(s)})).filter(t=>t.id);window.YT_TRACKS=Q;
let el,cur=-1,col=false;try{col=localStorage.getItem('mp-collapsed')==='1'}catch(e){}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function build(){el=document.createElement('section');el.className='mp';el.id='miniplayer';el.setAttribute('aria-label','Music mini player');
el.innerHTML=`<div class="mp-head"><img class="mp-thumb" alt="" width="40" height="40"><div class="mp-t"><span class="mp-ey">Now playing</span><b class="mp-title" aria-live="polite"></b></div>
<div class="mp-btns"><button type="button" class="mp-b" data-a="prev" aria-label="Previous track">⏮</button><button type="button" class="mp-b" data-a="next" aria-label="Next track">⏭</button>
<button type="button" class="mp-b" data-a="col" aria-controls="mp-body"></button><button type="button" class="mp-b" data-a="close" aria-label="Close player">✕</button></div></div>
<div class="mp-body" id="mp-body"><div class="mp-vid"></div></div>`;document.body.appendChild(el);
el.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b)return;const a=b.dataset.a;
if(a==='close')close();else if(a==='col')setCol(!col);else if(a==='next')go(1);else if(a==='prev')go(-1)});}
function setCol(v){col=v;try{localStorage.setItem('mp-collapsed',v?'1':'0')}catch(e){}if(!el)return;el.classList.toggle('collapsed',v);
const b=el.querySelector('[data-a=col]');b.setAttribute('aria-expanded',String(!v));b.setAttribute('aria-label',v?'Expand player':'Collapse player');b.textContent=v?'▴':'▾';}
function load(k){if(!el)build();cur=k;const t=Q[k];el.querySelector('.mp-title').textContent=t.s.title;el.querySelector('.mp-thumb').src=t.s.cover;
el.querySelector('.mp-vid').innerHTML=`<iframe src="https://www.youtube-nocookie.com/embed/${esc(t.id)}?autoplay=1&rel=0&playsinline=1" title="YouTube player: ${esc(t.s.title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
const one=Q.length<2;el.querySelectorAll('[data-a=prev],[data-a=next]').forEach(b=>b.hidden=one);setCol(col);document.body.classList.add('mp-on');}
function go(d){if(cur<0)return;load((cur+d+Q.length)%Q.length)}
function close(){if(!el)return;const f=el.contains(document.activeElement);el.remove();el=null;cur=-1;document.body.classList.remove('mp-on');if(f)document.querySelector('main')?.focus?.();}
window.PaigePlayer={hasYT:i=>Q.some(t=>t.i===+i),play:i=>{const k=Q.findIndex(t=>t.i===+i);if(k>=0)load(k)},close,collapse:setCol};})();
// Listen-now chooser: big platforms first, rest under collapsible "Other platforms"; per-platform public plays; owner-provided distributor totals.
(()=>{const S=window.SONGS||[],T=window.STREAM_TOTALS||{},BIG=/^(Spotify|Apple Music|YouTube|YouTube Music|Amazon Music|TikTok|Pre-save)/;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const nf=n=>new Intl.NumberFormat('en').format(n),dt=d=>new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
const alb=s=>(T.albums||[]).find(a=>(a.songs||[]).includes(s.title));
let busy=false;
function regroup(ul){if(busy||ul.dataset.grouped)return;const s=S.find(x=>x.title===document.getElementById('ch-title').textContent);if(!s)return;busy=true;
const lis=[...ul.children],big=[],oth=[];for(const li of lis){const a=li.querySelector('a');(!a||BIG.test(a.firstChild.textContent)?big:oth).push(li)}
oth.forEach(li=>li.remove());const box=ul.parentNode;box.querySelectorAll('.ch-x').forEach(e=>e.remove());
let h='';if(oth.length)h+=`<details class="ch-x ch-other" id="ch-other"><summary>Other platforms <span>(${oth.length})</span></summary><ul class="ch-chips">${oth.map(li=>li.innerHTML.replace(/<span>↗<\/span>/,'')).map(x=>`<li>${x}</li>`).join('')}</ul></details>`;
const by=s.playsBy||[];h+=`<div class="ch-x ch-plays">${s.playsOwner?`<p class="ch-own"><b>${nf(s.playsOwner.plays)} plays</b> · owner-provided, ${esc(dt(s.playsOwner.date))}</p>`:''}<p class="ch-ph">Public plays</p>${by.length?`<ul>${by.map(p=>`<li><span>${esc(p.platform)}</span><b>${nf(p.plays)}</b></li>`).join('')}${s.playsOwner?'':`<li class="tot"><span>Total (public)</span><b>${nf(s.plays)}</b></li>`}</ul><p class="ch-src">Public view counts, checked ${esc(dt(by[0].fetched))}. Other platforms don't show public numbers.</p>`:(s.playsOwner?'':`<p class="ch-src">No public play numbers yet.</p>`)}`;
const a=alb(s);if(a)h+=`<p class="ch-src">Album “${esc(a.album)}”: ${nf(a.last365)} streams in the last year · distributor estimate, ${esc(dt(a.updated))}</p>`;h+='</div>';
ul.insertAdjacentHTML('afterend',h);ul.dataset.grouped='1';busy=false}
function cards(){const box=document.getElementById('songs');if(!box||box.dataset.tot)return;box.dataset.tot='1';
if(T.all&&!document.getElementById('stream-sum'))box.insertAdjacentHTML('beforebegin',`<p class="stream-sum" id="stream-sum"><b>${nf(T.all.last365)} streams in the last year</b><span>across ${esc(T.all.services)} · distributor estimate, updated ${esc(dt(T.all.updated))}</span></p>`);
const today=new Date().toISOString().slice(0,10),sec={pre:[],alb:[],sgl:[]};
box.querySelectorAll('.song').forEach(c=>{const s=S.find(x=>x.title===c.querySelector('h3')?.textContent);if(!s){sec.sgl.push(c);return}
if(s.release>today)sec.pre.push(c);else if(s.album)sec.alb.push([s.release||'',c]);else sec.sgl.push(c)});
const mk=(id,t,sub)=>{const d=document.createElement('section');d.className='msec';d.setAttribute('aria-labelledby',id);d.innerHTML=`<h2 class="msec-h" id="${id}">${t}</h2>${sub||''}`;return d};
const grid=()=>{const g=document.createElement('div');g.className='songs';return g};const out=[];
if(sec.pre.length){const d=mk('ms-pre','Pre-release','<p class="msec-s">Coming soon. Pre-save now.</p>'),g=grid();sec.pre.forEach(c=>g.appendChild(c));d.appendChild(g);out.push(d)}
// Albums: one grid like Pre-release/Singles (newest first); each album's distributor note sits inside its card (.alb-tot below).
if(sec.alb.length){const d=mk('ms-alb','Albums'),g=grid();sec.alb.sort((x,y)=>y[0].localeCompare(x[0])).forEach(x=>g.appendChild(x[1]));d.appendChild(g);out.push(d)}
if(sec.sgl.length){const d=mk('ms-sgl','Singles'),g=grid();sec.sgl.forEach(c=>g.appendChild(c));d.appendChild(g);out.push(d)}
box.classList.add('songs-sec');out.forEach(d=>box.appendChild(d));
box.querySelectorAll('.song').forEach(c=>{const s=S.find(x=>x.title===c.querySelector('h3')?.textContent),a=s&&alb(s);if(a)c.querySelector('.plays')?.insertAdjacentHTML('afterend',`<p class="alb-tot">${nf(a.last365)} streams in the last year · distributor estimate, ${esc(dt(a.updated))}</p>`)})}
addEventListener('DOMContentLoaded',()=>{const ul=document.getElementById('ch-links');if(ul){const mo=new MutationObserver(()=>{delete ul.dataset.grouped;regroup(ul);mo.takeRecords()});mo.observe(ul,{childList:true})}
const box=document.getElementById('songs');if(box){if(box.children.length)cards();else new MutationObserver((m,o)=>{if(box.children.length){o.disconnect();cards()}}).observe(box,{childList:true})}});})();

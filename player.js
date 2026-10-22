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

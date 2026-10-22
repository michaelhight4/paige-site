// SOTE maps lightbox: native <dialog> (Esc closes, modal = inert background), focus trap, click/wheel zoom.
(()=>{const lb=document.getElementById('maps-lb');if(!lb)return;
const img=document.getElementById('maps-lb-img'),t=document.getElementById('maps-lb-t'),view=lb.querySelector('.lb-view'),close=lb.querySelector('.lb-close');let opener=null;
document.querySelectorAll('.map-open').forEach(b=>b.addEventListener('click',()=>{opener=b;const th=b.querySelector('img');
img.src=b.dataset.full;img.alt=th.alt;t.textContent=b.dataset.title;view.classList.remove('zoomed');
lb.showModal();close.focus();}));
close.addEventListener('click',()=>lb.close());
lb.addEventListener('close',()=>{img.removeAttribute('src');opener&&opener.focus();});
lb.addEventListener('click',e=>{if(e.target===lb)lb.close();});
const zoom=(on,e)=>{const was=view.classList.contains('zoomed');view.classList.toggle('zoomed',on);
if(on&&!was&&e){const r=img.getBoundingClientRect();requestAnimationFrame(()=>{view.scrollLeft=(e.clientX-r.left)/r.width*view.scrollWidth-view.clientWidth/2;view.scrollTop=(e.clientY-r.top)/r.height*view.scrollHeight-view.clientHeight/2;});}};
img.addEventListener('click',e=>zoom(!view.classList.contains('zoomed'),e));
view.addEventListener('wheel',e=>{if(e.ctrlKey||!view.classList.contains('zoomed')&&e.deltaY<0){e.preventDefault();zoom(e.deltaY<0,e);}},{passive:false});
view.addEventListener('keydown',e=>{if(e.key==='+'||e.key==='=')zoom(true);if(e.key==='-')zoom(false);});
lb.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const f=[close,view];const i=f.indexOf(document.activeElement);
e.preventDefault();f[(i+(e.shiftKey?f.length-1:1))%f.length].focus();});
})();

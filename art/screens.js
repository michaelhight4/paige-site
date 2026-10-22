/* screens.js - UI components built on avatar.js + icons.js. All return HTML/SVG strings unless noted.
 *  statBar(label,value,{icon})  levelClass(v)  row({icon,title,sub,value,neg,chevron,id})  logHTML(entries)
 *  renderRibbon(r) / renderRibbons(list)  renderTombstone(d)  renderCemetery(list)  mountCemetery(el,list,onSelect)
 *  renderFamilyTree(data,opts)  modal({title,body,actions})  fx.agePop(el) fx.deathFade(el) fx.floatNumber(el,text,neg) fx.fameBurst(host,cfg) */
(function(g){
  var A = g.LifeSimArt = g.LifeSimArt || {};
  var esc = function(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); };
  A.esc = esc;
  A.levelClass = function(v){ v=+v; return v>=31?'is-good':v>=13?'is-mid':'is-bad'; };
  A.statBar = function(label,value,o){ o=o||{}; value=Math.max(0,Math.min(100,Math.round(value)));
    return '<div class="ls-stat">'+(o.icon?'<span class="ls-stat-ico">'+o.icon+'</span>':'')+'<span class="ls-stat-label">'+esc(label)+'</span><div class="ls-bar '+A.levelClass(value)+'" role="progressbar" aria-valuenow="'+value+'"><i style="--v:'+value+'%"></i></div><span class="ls-stat-num">'+value+'</span></div>'; };
  A.row = function(r){ var ic = r.avatar ? A.renderAvatar(r.avatar,{size:44,crop:'head'}) : r.icon ? A.icon(r.icon,{size:44,cat:r.cat}) : '';
    return '<button class="ls-row'+(r.chevron!==false?' has-chevron':'')+(r.disabled?' is-disabled':'')+'" data-id="'+esc(r.id||'')+'">'+(ic?'<span class="ls-row-icon">'+ic+'</span>':'')+'<span class="ls-row-main"><div class="ls-row-title">'+esc(r.title)+'</div>'+(r.sub?'<div class="ls-row-sub">'+esc(r.sub)+'</div>':'')+'</span>'+(r.value!=null?'<span class="ls-row-val'+(r.neg?' is-neg':'')+'">'+esc(r.value)+'</span>':'')+'</button>'; };
  // entries: [{age:12, year:2031, text, tone:'good'|'bad'|'money'|'big'}]  grouped by age
  A.logHTML = function(entries){ var out='<div class="ls-log">', cur=null; entries.forEach(function(e){ if (e.age!==cur){ cur=e.age; out+='<div class="ls-log-year">Age '+esc(e.age)+(e.year?'<small>'+esc(e.year)+'</small>':'')+'</div>'; }
      out+='<div class="ls-log-entry'+(e.tone?' '+e.tone.split(' ').map(function(t){return 'is-'+t;}).join(' '):'')+'">'+esc(e.text)+'</div>'; }); return out+'</div>'; };

  // ---- ribbons: {id:'honor', title:'Honor Roll', tier:'bronze|silver|gold|plat', locked:false, icon:'optional icon id'}
  var TIER = {bronze:['#cd7f32','#8a5521'],silver:['#c4ccd6','#8793a3'],gold:['#f4c542','#b78a10'],plat:['#9be3f5','#4aa6c4']};
  A.renderRibbon = function(r,o){ o=o||{}; var t=TIER[r.tier]||TIER.gold, sz=o.size||64, id='r'+Math.random().toString(36).slice(2,7);
    var svg='<svg viewBox="0 0 64 80" width="'+sz+'" height="'+sz*1.25+'" aria-hidden="true"><path d="M18 46L10 76L22 70L28 80L34 50Z" fill="'+t[1]+'"/><path d="M46 46L54 76L42 70L36 80L30 50Z" fill="'+t[0]+'"/>'+
      '<circle cx="32" cy="30" r="27" fill="'+t[1]+'"/><circle cx="32" cy="30" r="23" fill="'+t[0]+'"/><circle cx="32" cy="30" r="18" fill="none" stroke="#fff6" stroke-width="1.5"/>'+
      '<g transform="translate(15 13) scale(.7083)">'+A.icon(r.icon||r.id,{size:48,bg:false,fg:'#fff',color:t[1],shape:'none'}).replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'')+'</g></svg>';
    return '<div class="ls-ribbon'+(r.locked?' is-locked':'')+'" title="'+esc(r.title||r.id)+'">'+svg+esc(r.title||r.id)+'</div>'; };
  A.renderRibbons = function(list,o){ return '<div class="ls-ribbons">'+list.map(function(r){return A.renderRibbon(r,o);}).join('')+'</div>'; };

  // ---- tombstone. d: {name, born, died, age, epitaph, cause, style:'classic|cross|obelisk|round', avatar:spec, ribbons:[], netWorth, flowers:true}
  function wrap(txt,max){ var w=String(txt||'').split(/\s+/), L=[], c=''; w.forEach(function(x){ if ((c+' '+x).trim().length>max){ if(c) L.push(c); c=x; } else c=(c+' '+x).trim(); }); if(c) L.push(c); return L.slice(0,4); }
  function stonePath(style,x,y,w,h){ // returns path for stone silhouette
    if (style==='obelisk') return 'M'+(x+w*.15)+' '+(y+h)+'V'+(y+h*.25)+'L'+(x+w/2)+' '+y+'L'+(x+w*.85)+' '+(y+h*.25)+'V'+(y+h)+'Z';
    if (style==='cross') { var a=w*.34; return 'M'+(x+a)+' '+(y+h)+'V'+(y+h*.42)+'H'+x+'V'+(y+h*.22)+'H'+(x+a)+'V'+y+'H'+(x+w-a)+'V'+(y+h*.22)+'H'+(x+w)+'V'+(y+h*.42)+'H'+(x+w-a)+'V'+(y+h)+'Z'; }
    if (style==='round') return 'M'+x+' '+(y+h)+'V'+(y+w/2)+'A'+(w/2)+' '+(w/2)+' 0 0 1 '+(x+w)+' '+(y+w/2)+'V'+(y+h)+'Z';
    return 'M'+x+' '+(y+h)+'V'+(y+h*.22)+'Q'+x+' '+y+' '+(x+w*.2)+' '+y+'H'+(x+w*.8)+'Q'+(x+w)+' '+y+' '+(x+w)+' '+(y+h*.22)+'V'+(y+h)+'Z'; }
  A.renderTombstone = function(d,o){ o=o||{}; var style=d.style||'classic', W=300,H=340, sx=50,sy=40,sw=200,sh=240;
    var lines=wrap(d.name,15), epi=wrap(d.epitaph?'\u201C'+d.epitaph+'\u201D':'',24), t='';
    var ty = d.avatar ? 168 : 110;
    var cx=150; if (style==='cross'){ sx=60; sw=180; }
    var ang = (style==='cross'||style==='obelisk')?'':'';
    t+='<text x="'+cx+'" y="'+(ty-18)+'" text-anchor="middle" font-size="13" font-weight="800" letter-spacing="3" fill="#4d535c">R.I.P.</text>';
    lines.forEach(function(l,i){ t+='<text x="'+cx+'" y="'+(ty+i*22)+'" text-anchor="middle" font-size="'+(lines.length>2?17:20)+'" font-weight="900" fill="#2b3037" font-family="var(--ls-font-display)">'+esc(l)+'</text>'; });
    var y2=ty+lines.length*22+4;
    t+='<text x="'+cx+'" y="'+y2+'" text-anchor="middle" font-size="13" font-weight="700" fill="#4d535c">'+esc((d.born!=null?d.born:'')+(d.died!=null?' \u2013 '+d.died:''))+'</text>';
    if (d.age!=null) t+='<text x="'+cx+'" y="'+(y2+17)+'" text-anchor="middle" font-size="12" fill="#5c626b">Aged '+esc(d.age)+'</text>';
    epi.forEach(function(l,i){ t+='<text x="'+cx+'" y="'+(y2+38+i*15)+'" text-anchor="middle" font-size="11.5" font-style="italic" fill="#4d535c">'+esc(l)+'</text>'; });
    var av = d.avatar ? '<g>'+A.renderAvatar(Object.assign({},d.avatar,{dead:true}),{crop:'head',shape:'circle',attrs:'x="'+(cx-28)+'" y="'+(sy+(style==='obelisk'?64:style==='cross'?6:24))+'" width="56" height="56"'})+'</g>' : '';
    var flowers = d.flowers!==false ? '<g><circle cx="86" cy="296" r="5" fill="#ef476f"/><circle cx="96" cy="300" r="5" fill="#ffd166"/><circle cx="214" cy="298" r="5" fill="#c77dff"/><circle cx="224" cy="294" r="5" fill="#ef476f"/><path d="M86 301V312M96 305V314M214 303V313M224 299V312" stroke="#2e7d4f" stroke-width="2"/></g>' : '';
    var svg='<svg class="ls-tombstone" viewBox="0 0 '+W+' '+H+'" width="'+(o.size||300)+'" role="img" aria-label="Tombstone of '+esc(d.name)+'">'+
      '<defs><linearGradient id="lsst" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4d9df"/><stop offset="1" stop-color="#9aa1ab"/></linearGradient></defs>'+
      '<ellipse cx="150" cy="316" rx="128" ry="14" fill="#000" opacity=".3"/><path d="M10 322Q150 296 290 322V340H10Z" fill="var(--ls-grass)"/>'+
      '<path class="ls-stone-body" d="'+stonePath(style,sx,sy,sw,sh+40)+'" fill="url(#lsst)" stroke="#6d747e" stroke-width="3"/>'+
      '<rect x="'+(sx-14)+'" y="'+(sy+sh+34)+'" width="'+(sw+28)+'" height="14" rx="3" fill="#8a919b" stroke="#6d747e" stroke-width="2"/>'+
      av+t+flowers+'</svg>';
    var rib = d.ribbons && d.ribbons.length ? '<div class="ls-ribbons" style="justify-content:center;color:#fff">'+d.ribbons.map(function(r){return A.renderRibbon(r,{size:46});}).join('')+'</div>' : '';
    var nw = d.netWorth!=null ? '<div style="padding:4px 0 10px;font-weight:800;color:#ffe9a8">Net worth '+esc(d.netWorth)+(d.cause?' \u00B7 '+esc(d.cause):'')+'</div>' : (d.cause?'<div style="padding:4px 0 10px;color:#d8d0ee">'+esc(d.cause)+'</div>':'');
    return '<div class="ls-grave ls-rise">'+svg+nw+rib+'</div>'; };

  // ---- cemetery scene. list:[{name,born,died,age,style,epitaph}] ; items clickable (data-index)
  A.renderCemetery = function(list,o){ o=o||{}; var cols=o.cols||3, cw=110, rows=Math.max(1,Math.ceil(list.length/cols)), W=cols*cw+30, H=170+rows*115, st=['classic','round','obelisk'];
    var s='<svg viewBox="0 0 '+W+' '+H+'" role="group" aria-label="Cemetery"><defs><linearGradient id="lscsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--ls-sky-1)"/><stop offset="1" stop-color="var(--ls-sky-2)"/></linearGradient><linearGradient id="lscs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4d9df"/><stop offset="1" stop-color="#9aa1ab"/></linearGradient></defs>'+
      '<rect width="'+W+'" height="'+H+'" fill="url(#lscsky)"/>'+
      '<g fill="#fff" opacity=".8">'+[[30,20],[90,45],[180,15],[250,50],[300,25],[60,80],[220,90]].map(function(p){return '<circle cx="'+(p[0]*W/330)+'" cy="'+p[1]+'" r="1.4"/>';}).join('')+'</g>'+
      '<circle cx="'+(W-60)+'" cy="55" r="26" fill="#f6efd2"/><circle cx="'+(W-50)+'" cy="49" r="24" fill="url(#lscsky)" opacity="0"/>'+
      '<path d="M0 135Q'+(W*.25)+' 95 '+(W*.5)+' 125T'+W+' 110V'+H+'H0Z" fill="#1a2a24"/><path d="M0 165Q'+(W*.5)+' 140 '+W+' 160V'+H+'H0Z" fill="var(--ls-grass)"/>'+
      '<g stroke="#0b0f18" stroke-width="3" fill="none" opacity=".8"><path d="M20 150V105M12 150V115M28 150V118"/><path d="M'+(W-24)+' 150V100M'+(W-14)+' 150V112"/></g>';
    list.forEach(function(p,i){ var c=i%cols, r=Math.floor(i/cols), x=15+c*cw+20, y=185+r*115, w=62, h=74, style=p.style||st[(A._hash(p.name||i))%st.length];
      var nm=wrap(p.name,10)[0]||''; var fn=(p.name||'').split(' ')[0];
      var cr = style==='cross', ty0=y+(cr?0:26);
      s+='<g class="ls-plot" tabindex="0" role="button" data-index="'+i+'" aria-label="'+esc(p.name)+'"><ellipse cx="'+(x+w/2)+'" cy="'+(y+h+2)+'" rx="'+(w*.7)+'" ry="6" fill="#000" opacity=".3"/><path class="ls-stone-body" d="'+stonePath(style,x,y,w,h)+'" fill="url(#lscs)" stroke="#6d747e" stroke-width="2"/>'+
        (cr ? '<text x="'+(x+w/2)+'" y="'+(y+h+17)+'" text-anchor="middle" font-size="10" font-weight="800" fill="#e8e4f5">'+esc(fn.slice(0,12))+(p.age!=null?' \u00B7 '+p.age:'')+'</text>' :
        '<text x="'+(x+w/2)+'" y="'+ty0+'" text-anchor="middle" font-size="8" font-weight="800" fill="#4d535c">R.I.P.</text>'+
        '<text x="'+(x+w/2)+'" y="'+(ty0+14)+'" text-anchor="middle" font-size="10" font-weight="900" fill="#2b3037">'+esc(fn.slice(0,9))+'</text>'+
        '<text x="'+(x+w/2)+'" y="'+(ty0+28)+'" text-anchor="middle" font-size="8" fill="#4d535c">'+esc(p.age!=null?'Age '+p.age:(p.died||''))+'</text>')+
        '<path d="M'+(x+4)+' '+(y+h)+'Q'+(x+8)+' '+(y+h-8)+' '+(x+12)+' '+(y+h)+'M'+(x+w-14)+' '+(y+h)+'Q'+(x+w-10)+' '+(y+h-7)+' '+(x+w-6)+' '+(y+h)+'" stroke="#3e7a52" stroke-width="2" fill="none"/></g>'; });
    if (!list.length) s+='<text x="'+W/2+'" y="220" text-anchor="middle" fill="#cfc8e6" font-size="14">No graves yet. Live a long life.</text>';
    s+='<g opacity=".18" fill="#fff"><ellipse cx="'+(W*.3)+'" cy="'+(H-30)+'" rx="120" ry="12"/><ellipse cx="'+(W*.7)+'" cy="'+(H-70)+'" rx="140" ry="10"/></g></svg>';
    return '<div class="ls-cemetery">'+s+'</div>'; };
  A.mountCemetery = function(el,list,cb){ el.innerHTML=A.renderCemetery(list); var h=function(e){ var p=e.target.closest&&e.target.closest('.ls-plot'); if(p&&cb) cb(list[+p.getAttribute('data-index')],+p.getAttribute('data-index')); }; el.onclick=h; el.onkeydown=function(e){ if(e.key==='Enter'||e.key===' ') h(e); }; };

  // ---- family tree. data:{ people:{id:{name,gender,age,born,died,alive,avatar:spec,label}}, unions:[{partners:[a,b?],children:[ids]}], root:'id' (highlight) }
  A.renderFamilyTree = function(data,o){ o=o||{}; var P=data.people||{}, U=data.unions||[], CW=o.cellW||104, RH=o.rowH||150, AV=o.avatar||52, placed={}, nodes=[], edges=[], maxDepth=0;
    var childOf={}; U.forEach(function(u){ (u.children||[]).forEach(function(c){ childOf[c]=u; }); });
    function unionsOf(id){ return U.filter(function(u){ return (u.partners||[]).indexOf(id)>=0; }); }
    // roots: persons in unions (or alone) who are not children of anything
    var ids=Object.keys(P), roots=[]; ids.forEach(function(id){ if(!childOf[id]) roots.push(id); });
    // drop roots whose only role is to be the partner of someone who IS a child (they get placed with spouse)
    roots=roots.filter(function(id){ return !unionsOf(id).some(function(u){ return (u.partners||[]).some(function(p){ return p!==id && childOf[p]; }); }) || unionsOf(id).length===0 ; });
    if (!roots.length) roots=ids.slice(0,1);
    function unitFor(id){ var us=unionsOf(id).filter(function(u){return !u._used;}); return us[0]||null; }
    function layout(id,depth,x0){ // returns width in cells; places person (+partners) with their children
      if (placed[id]) return 0; var u=unitFor(id), partners=[id]; placed[id]=1;
      if (u){ u._used=true; (u.partners||[]).forEach(function(p){ if(p!==id && !placed[p]){ placed[p]=1; partners.push(p); } }); }
      var kids=u?(u.children||[]):[], cw=0, kidNodes=[];
      var cx=x0; kids.forEach(function(k){ var w=layout(k,depth+1,cx); if(w){ kidNodes.push({id:k,x:null,w:w,start:cx}); cx+=w; } }); cw=cx-x0;
      var mine=Math.max(partners.length,1), width=Math.max(cw,mine), off=x0+(width-mine)/2, pos={};
      partners.forEach(function(p,i){ var n=byId(p); n.x=off+i+.5; n.y=depth; pos[p]=n; });
      maxDepth=Math.max(maxDepth,depth);
      if (u && kids.length){ var mx = partners.length>1 ? (pos[partners[0]].x+pos[partners[1]].x)/2 : pos[partners[0]].x;
        edges.push({t:'u',a:partners.length>1?pos[partners[0]]:null,b:partners.length>1?pos[partners[1]]:null,mx:mx,y:depth});
        kidNodes.forEach(function(k){ var kn=byId(k.id); edges.push({t:'c',mx:mx,y:depth,kx:kn.x,ky:kn.y}); }); }
      else if (partners.length>1) edges.push({t:'u',a:pos[partners[0]],b:pos[partners[1]],y:depth,mx:null});
      return width; }
    function byId(id){ for (var i=0;i<nodes.length;i++) if(nodes[i].id===id) return nodes[i]; var n={id:id,p:P[id]||{name:id}}; nodes.push(n); return n; }
    // children width calc happens before parent position: nodes created lazily; kidNodes x set once layout returns.
    var cursor=0; roots.forEach(function(r){ cursor+=layout(r,0,cursor)+.3; });
    ids.forEach(function(id){ if(!placed[id]){ cursor+=layout(id,0,cursor)+.3; } });
    var W=Math.max(cursor,1)*CW+20, H=(maxDepth+1)*RH+30;
    var svg='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="group" aria-label="Family tree">';
    var X=function(c){return 10+c*CW;}, Y=function(d){return 12+d*RH+AV/2;};
    edges.forEach(function(e){ if(e.t==='u'){ if(e.a&&e.b) svg+='<path d="M'+X(e.a.x)+' '+Y(e.y)+'H'+X(e.b.x)+'" stroke="#e86fb0" stroke-width="3" stroke-linecap="round"/>'; if(e.mx!=null) svg+='<path d="M'+X(e.mx)+' '+(Y(e.y)+(e.a?0:AV/2))+'V'+(Y(e.y)+AV/2+22)+'" stroke="#9aa3af" stroke-width="2.5"/>'; }
      else { var y0=Y(e.y)+AV/2+22, y1=Y(e.ky)-AV/2-4; svg+='<path d="M'+X(e.mx)+' '+y0+'V'+(y0+8)+'H'+X(e.kx)+'V'+y1+'" fill="none" stroke="#9aa3af" stroke-width="2.5" stroke-linejoin="round"/>'; } });
    nodes.forEach(function(n){ var p=n.p, cx=X(n.x), cy=Y(n.y), dead=p.alive===false||p.died!=null, me=data.root===n.id;
      var spec=Object.assign({},p.avatar||{seed:n.id,gender:p.gender,age:p.age},{dead:dead&&p.avatar? true:dead});
      if(!spec.age&&p.age!=null) spec.age=p.age; if(!spec.gender&&p.gender) spec.gender=p.gender;
      svg+='<g class="ls-node" data-id="'+esc(n.id)+'">'+(me?'<circle cx="'+cx+'" cy="'+cy+'" r="'+(AV/2+5)+'" fill="none" stroke="#f4b400" stroke-width="3"/>':'')+
        A.renderAvatar(spec,{crop:'head',attrs:'x="'+(cx-AV/2)+'" y="'+(cy-AV/2)+'" width="'+AV+'" height="'+AV+'"'})+
        (dead?'<text x="'+(cx+AV/2-4)+'" y="'+(cy-AV/2+10)+'" font-size="14" text-anchor="middle">\u271D</text>':'')+
        '<text x="'+cx+'" y="'+(cy+AV/2+14)+'" font-size="12" text-anchor="middle" fill="var(--ls-text)">'+esc((p.name||'').slice(0,14))+'</text>'+
        '<text x="'+cx+'" y="'+(cy+AV/2+27)+'" font-size="10.5" text-anchor="middle" fill="var(--ls-muted)" style="font-weight:600">'+esc(p.label||(dead?(p.age!=null?'Died '+p.age:'Deceased'):(p.age!=null?'Age '+p.age:'')))+'</text></g>'; });
    return '<div class="ls-tree">'+svg+'</svg></div>'; };

  // ---- modal (DOM). returns {el, close}
  A.modal = function(m){ var b=document.createElement('div'); b.className='ls-modal-backdrop';
    b.innerHTML='<div class="ls-modal" role="dialog" aria-modal="true"><div class="ls-modal-head">'+esc(m.title||'')+'</div><div class="ls-modal-body">'+(m.html||esc(m.body||''))+'</div><div class="ls-modal-actions"></div></div>';
    var box=b.querySelector('.ls-modal-actions'); function close(){ b.remove(); }
    (m.actions||[{label:'OK'}]).forEach(function(a){ var bt=document.createElement('button'); bt.className='ls-btn is-block '+(a.cls||''); bt.textContent=a.label; bt.onclick=function(){ close(); a.onClick&&a.onClick(); }; box.appendChild(bt); });
    (m.host||document.body).appendChild(b); return {el:b,close:close}; };

  // ---- FX
  var fxs = A.fx = {
    agePop:function(el){ if(!el) return; el.classList.remove('ls-age-pop'); void el.offsetWidth; el.classList.add('ls-age-pop'); A.sfx&&A.sfx.play('age'); },
    deathFade:function(el){ if(!el) return; el.classList.add('ls-death-fade'); A.sfx&&A.sfx.play('death'); },
    floatNumber:function(el,text,neg){ var s=document.createElement('span'); s.className='ls-float-num'+(neg?' is-neg':''); s.textContent=text; s.style.left='50%'; s.style.top='30%'; s.style.fontSize='22px'; el.appendChild(s); setTimeout(function(){s.remove();},1200); A.sfx&&A.sfx.play(neg?'bad':'money'); },
    fameBurst:function(host,cfg){ if(!g.LifeSimFameFX) return null; host.classList.add('ls-fx-host'); if(!host._fame) host._fame=g.LifeSimFameFX.createFameFX(host,{shake:false}); host._fame.trigger(cfg||{intensity:3}); A.sfx&&A.sfx.play('fame'); return host._fame; }
  };
})(typeof window!=='undefined'?window:globalThis);

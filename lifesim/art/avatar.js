/* renderAvatar(spec[, opts]) -> SVG string.  renderAvatarEl(spec[, opts]) -> HTMLElement.
 * spec: { gender:'m'|'f'|'n', age:number | stage:'baby'|'child'|'teen'|'adult'|'elder', skin:'s1'..|'#hex', hair:{style,color}|'style', eyes:'round'|..., eyeColor:'brown'|..,
 *   mouth:'smile'|.., outfit:<career id|outfit id>, outfitColor:'#hex', accessories:['glasses','beard',...], bg:'#hex'|'none', dead:true, seed:any (fills missing fields deterministically) }
 * opts: { size:px|css, shape:'circle'|'square'|'none', crop:'bust'|'head', cls, attrs:'x=".." y=".."' (for nesting), title }
 * Pure data-driven (avatar_data.js); extend with LifeSimArt.registerAvatarData(). */
(function(g){
  var A = g.LifeSimArt = g.LifeSimArt || {}, uid = 0;
  function hash(s){ s=String(s); var h=2166136261; for (var i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }
  function rng(seed){ var a=hash(seed)||1; return function(){ a|=0; a=a+0x6D2B79F5|0; var t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
  function pick(r,arr){ return arr[Math.floor(r()*arr.length)]; }
  function stageOf(spec){ var D=A.avatarData; if (spec.stage) return spec.stage; var age=spec.age==null?30:+spec.age, L=D.stages.list; for (var i=0;i<L.length;i++) if (age<L[i].max) return L[i].id; return 'adult'; }
  function byId(list,id,key){ key=key||'id'; for (var i=0;i<list.length;i++) if (list[i][key]===id) return list[i]; return null; }
  function fill(s,m){ return s.replace(/\{(\w+)\}/g,function(_,k){ return m[k]!=null?m[k]:''; }); }
  function shade(hex,f){ var m=/^#?([0-9a-f]{6})$/i.exec(hex||''); if(!m) return hex; var n=parseInt(m[1],16),r=n>>16,gg=n>>8&255,b=n&255; function c(x){ return Math.max(0,Math.min(255,Math.round(x*f))); } return '#'+[c(r),c(gg),c(b)].map(function(x){return ('0'+x.toString(16)).slice(-2);}).join(''); }

  A.randomAvatarSpec = function(seed, base){
    var D=A.avatarData, r=rng(seed), s=Object.assign({}, base||{});
    s.gender = s.gender || pick(r,D.genders); s.skin = s.skin || pick(r,D.skins.slice(0,7)).id;
    var hs = D.randomHair[s.gender] || Object.keys(D.hair);
    s.hair = typeof s.hair==='string' ? {style:s.hair} : Object.assign({}, s.hair||{});
    s.hair.style = s.hair.style || pick(r,hs); s.hair.color = s.hair.color || pick(r,D.hairColors.slice(0,7)).id;
    s.eyeColor = s.eyeColor || pick(r,D.eyeColors).id;
    if (!s.eyes) s.eyes = s.gender==='f' ? pick(r,['lashes','round','lashes']) : pick(r,['round','narrow','round']);
    if (!s.mouth) s.mouth = s.gender==='f' && r()<.5 ? 'lips' : pick(r,['smile','smile','neutral','grin','smirk']);
    if (!s.accessories) { s.accessories=[]; if (r()<.2) s.accessories.push('glasses'); if (r()<.15) s.accessories.push('freckles'); if (s.gender!=='f' && r()<.25) s.accessories.push(pick(r,['beard','stubble','mustache'])); }
    return s;
  };

  A.renderAvatar = function(spec, opts){
    var D=A.avatarData; spec=spec||{}; opts=opts||{};
    if (spec.seed!=null) spec=A.randomAvatarSpec(spec.seed, spec);
    var st=stageOf(spec), P=D.stages.params[st]||{}, id='lsav'+(++uid), gender=spec.gender||'n';
    var sk = byId(D.skins,spec.skin,'id') || (typeof spec.skin==='string'&&spec.skin[0]==='#'?{base:spec.skin,shade:shade(spec.skin,.82)}:D.skins[1]);
    var hairSpec = typeof spec.hair==='string'?{style:spec.hair}:(spec.hair||{});
    var hStyle = P.hairForce || hairSpec.style || 'short'; if (!D.hair[hStyle]) hStyle='short';
    var hc = byId(D.hairColors,hairSpec.color,'id') || (/^#/.test(hairSpec.color||'')?{c:hairSpec.color,d:shade(hairSpec.color,.78)}:D.hairColors[2]);
    if (P.gray && hairSpec.keep!==true) hc = byId(D.hairColors,'gray','id') || hc;
    var ec = (byId(D.eyeColors,spec.eyeColor,'id')||D.eyeColors[0]).c;
    var outfit = D.outfits[spec.outfit] || (st==='baby'?D.outfits.baby:st==='child'?D.outfits.kid:D.outfits.default);
    if (st==='baby' && !spec.outfit) outfit=D.outfits.baby;
    var oc = spec.outfitColor||outfit.c;
    var m = {skin:sk.base, skinD:sk.shade||shade(sk.base,.82), hair:hc.c, hairD:hc.d, eye:ec, lip:spec.lip||D.lipColors[0], c:oc, c2:outfit.c2};
    var hd = D.heads[gender]||D.heads.n, eyesKey = spec.dead?(spec.deadEyes||'closed'):(spec.eyes && !P.eyes ? spec.eyes : (P.eyes||spec.eyes||'round')); if (!D.eyes[eyesKey]) eyesKey='round';
    var mouthKey = st==='baby' ? 'baby' : (spec.mouth||'smile'); if (spec.dead) mouthKey='neutral'; if (!D.mouths[mouthKey]) mouthKey='smile';
    var noseKey = P.nose || spec.nose || 'nose';
    // accessories: spec + outfit auto (id or "id:#color")
    var accs=[], seen={};
    function addAcc(a){ var p=String(a).split(':'), k=p[0]; if (seen[k]||!D.accessories[k]) return; seen[k]=1; var d=D.accessories[k]; if ((P.noBeard||st==='child'||st==='baby')&&d.adultOnly) return; accs.push({d:d,c:p[1]}); }
    (spec.accessories||[]).forEach(addAcc);
    if (!spec.noOutfitAcc && outfit.acc && st!=='baby') outfit.acc.forEach(addAcc);
    if (st==='baby' && spec.pacifier) addAcc('pacifier');
    function accs_(layer){ return accs.filter(function(a){return a.d.layer===layer;}).map(function(a){ return fill(a.d.svg, Object.assign({},m,a.c?{c:a.c}:{})); }).join(''); }
    var hair = D.hair[hStyle], hairAcc = accs.some(function(a){return a.d.hideHair;});
    var head = '<g transform="translate(50 '+P.cy+') scale('+P.hs+') translate(-50 -50)">'+
      fill(hair.back||'',m)+
      '<rect x="43" y="68" width="14" height="26" fill="'+m.skinD+'"/>'+ // neck inside head group so scales with head
      '<ellipse cx="'+(50-hd.rx)+'" cy="52" rx="4" ry="6" fill="'+m.skin+'"/><ellipse cx="'+(50+hd.rx)+'" cy="52" rx="4" ry="6" fill="'+m.skin+'"/>'+
      '<ellipse cx="50" cy="50" rx="'+hd.rx+'" ry="'+hd.ry+'" fill="'+m.skin+'"/>'+
      accs_('beard')+fill(D.noses[noseKey]||'',m)+fill(D.eyes[eyesKey],m)+fill(D.mouths[mouthKey],m)+
      (P.wrinkles&&!spec.dead?fill(D.wrinkles,m):'')+accs_('face')+
      (hairAcc?'':fill(hair.front||'',m))+accs_('top')+'</g>';
    var body = '<g transform="translate(50 120) scale('+P.bs+') translate(-50 -120)">'+fill(D.kinds[outfit.kind]||D.kinds.tee,m)+'</g>';
    var bg = spec.bg===undefined ? (st==='baby'?'#ffe3ef':st==='child'?'#d9efff':'#dfe6f0') : spec.bg;
    var shape = opts.shape||'circle', crop = opts.crop==='head' ? '12 6 76 76' : '0 0 100 120';
    var clip = shape==='circle' ? '<clipPath id="'+id+'"><circle cx="50" cy="60" r="58"/></clipPath>' : shape==='square' ? '<clipPath id="'+id+'"><rect x="0" y="0" width="100" height="120" rx="12"/></clipPath>' : '';
    var bgEl = bg && bg!=='none' && shape!=='none' ? (shape==='circle'?'<circle cx="50" cy="60" r="58" fill="'+bg+'"/>':'<rect width="100" height="120" rx="12" fill="'+bg+'"/>') : '';
    var sz = opts.size!=null ? (typeof opts.size==='number'?opts.size+'px':opts.size) : null;
    var vbW = opts.crop==='head'?76:100, vbH = opts.crop==='head'?76:120;
    var style = (spec.dead?'filter:grayscale(1) brightness(.9);':'') + (sz?'width:'+sz+';height:calc('+sz+' * '+(vbH/vbW).toFixed(3)+');':'');
    var role = opts.title ? 'role="img" aria-label="'+String(opts.title).replace(/"/g,'&quot;')+'"' : 'aria-hidden="true"';
    return '<svg xmlns="http://www.w3.org/2000/svg" class="ls-avatar-svg '+(opts.cls||'')+'" viewBox="'+crop+'" '+(opts.attrs||'')+' style="'+style+'" '+role+' data-stage="'+st+'">'+
      (clip?'<defs>'+clip+'</defs>':'')+bgEl+'<g'+(clip?' clip-path="url(#'+id+')"':'')+'>'+accs_('back')+body+head+'</g></svg>';
  };
  A.renderAvatarEl = function(spec, opts){ var d=document.createElement('span'); d.className='ls-avatar'; d.innerHTML=A.renderAvatar(spec,opts); return d; };
  A.avatarStage = stageOf; A._rng = rng; A._hash = hash; A._shade = shade; A._fill = fill;
  g.renderAvatar = A.renderAvatar; g.renderAvatarEl = A.renderAvatarEl;
})(typeof window!=='undefined'?window:globalThis);

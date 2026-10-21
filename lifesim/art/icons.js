/* icon(id[, opts]) -> SVG string.  id: 'swe' | 'career.swe' | 'vehicle.sports' ... (plain ids searched in order: opts.cat, career, asset, activity, vehicle, property, ribbon).
 * opts: {size:px (default 40), cat, bg:false (glyph only), shape:'round'|'circle'|'none', color:'#bg override', cls, title}
 * Unknown id -> fallback '?' icon. iconList(cat) -> ids. */
(function(g){
  var A = g.LifeSimArt = g.LifeSimArt || {};
  var ORDER=['career','asset','activity','vehicle','property','ribbon'];
  function resolve(id,cat,depth){
    var D=A.iconData; if (depth>4) return null;
    if (typeof id==='string' && id.indexOf('.')>0){ var p=id.split('.'); cat=p[0]; id=p.slice(1).join('.'); }
    var cats = cat ? [cat].concat(ORDER) : ORDER;
    for (var i=0;i<cats.length;i++){ var e=D[cats[i]] && D[cats[i]][id]; if (e){ if (e.alias){ var r=resolve(e.alias,null,(depth||0)+1); return r ? {c:e.c||r.c, g:r.g} : null; } return e; } }
    return null;
  }
  A.icon = function(id, opts){
    opts=opts||{}; var e=resolve(id,opts.cat,0), fb=false; if (!e){ e=A.iconData.fallback.unknown; fb=true; }
    var size=opts.size||40, bg=opts.color||e.c, shape=opts.shape||'round';
    var back = opts.bg===false||shape==='none' ? '' : shape==='circle' ? '<circle cx="24" cy="24" r="24" fill="'+bg+'"/>' : '<rect width="48" height="48" rx="11" fill="'+bg+'"/>';
    var gl = opts.bg===false ? '<g fill="'+(opts.fg||bg)+'" stroke="none">'+e.g.replace(/#fff/g,opts.fg||bg)+'</g>' : '<g fill="#fff">'+e.g+'</g>';
    var s = typeof size==='number'?size+'px':size;
    return '<svg xmlns="http://www.w3.org/2000/svg" class="ls-icon '+(opts.cls||'')+'" viewBox="0 0 48 48" width="'+s+'" height="'+s+'" '+(opts.title?'role="img" aria-label="'+opts.title+'"':'aria-hidden="true"')+(fb?' data-fallback="1"':'')+'>'+back+gl+'</svg>';
  };
  A.hasIcon = function(id,cat){ return !!resolve(id,cat,0); };
  A.iconList = function(cat){ return Object.keys(A.iconData[cat]||{}); };
  g.icon = A.icon;
})(typeof window!=='undefined'?window:globalThis);

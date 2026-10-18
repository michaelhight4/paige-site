/* sfx.js - WebAudio generated blips, no files. LifeSimArt.sfx.play('age'|'money'|'death'|'fame'|'click'|'good'|'bad'|'pop')
 * mute: sfx.setMuted(bool) / sfx.toggle() / sfx.isMuted()  (persisted in localStorage 'lifesim_muted'); sfx.mountToggle(el) renders a speaker button.
 * Add your own: sfx.define('name', [{f:440,t:0,d:.1,type:'square',v:.2,to:880}, ...]) (notes: freq, start s, duration s, wave, volume, optional glide-to freq). */
(function(g){
  var A = g.LifeSimArt = g.LifeSimArt || {}, ctx=null, master=null, muted=false;
  try { muted = g.localStorage && g.localStorage.getItem('lifesim_muted')==='1'; } catch(e){}
  var N = function(n){ return 440*Math.pow(2,(n-69)/12); };
  var P = {
    age:   [{f:N(72),t:0,d:.09,type:'square',v:.12},{f:N(76),t:.08,d:.09,type:'square',v:.12},{f:N(79),t:.16,d:.16,type:'square',v:.12}],
    money: [{f:N(83),t:0,d:.07,type:'triangle',v:.2},{f:N(88),t:.07,d:.22,type:'triangle',v:.2}],
    death: [{f:N(57),t:0,d:.5,type:'sawtooth',v:.12,to:N(43)},{f:N(50),t:.35,d:.9,type:'sine',v:.18,to:N(36)}],
    fame:  [{f:N(72),t:0,d:.1,type:'square',v:.1},{f:N(76),t:.09,d:.1,type:'square',v:.1},{f:N(79),t:.18,d:.1,type:'square',v:.1},{f:N(84),t:.27,d:.4,type:'square',v:.12},{f:N(91),t:.27,d:.5,type:'triangle',v:.12}],
    click: [{f:N(84),t:0,d:.04,type:'square',v:.07}],
    pop:   [{f:300,t:0,d:.12,type:'sine',v:.2,to:700}],
    good:  [{f:N(76),t:0,d:.08,type:'triangle',v:.18},{f:N(83),t:.08,d:.14,type:'triangle',v:.18}],
    bad:   [{f:N(60),t:0,d:.12,type:'sawtooth',v:.1},{f:N(55),t:.1,d:.2,type:'sawtooth',v:.1}]
  };
  function ensure(){ if (ctx) return ctx; var C=g.AudioContext||g.webkitAudioContext; if(!C) return null; try{ ctx=new C(); master=ctx.createGain(); master.gain.value=.8; master.connect(ctx.destination);}catch(e){ctx=null;} return ctx; }
  var sfx = A.sfx = {
    isMuted:function(){return muted;},
    setMuted:function(m){ muted=!!m; try{g.localStorage.setItem('lifesim_muted',muted?'1':'0');}catch(e){} document.querySelectorAll&&document.querySelectorAll('[data-ls-mute]').forEach(function(b){b.textContent=muted?'\uD83D\uDD07':'\uD83D\uDD0A';}); return muted; },
    toggle:function(){ return sfx.setMuted(!muted); },
    define:function(name,notes){ P[name]=notes; },
    play:function(name){ if (muted) return false; var c=ensure(); if(!c) return false; if (c.state==='suspended') c.resume(); var notes=P[name]; if(!notes) return false; var t0=c.currentTime+.01;
      notes.forEach(function(n){ var o=c.createOscillator(), gn=c.createGain(); o.type=n.type||'sine'; o.frequency.setValueAtTime(n.f,t0+n.t); if(n.to) o.frequency.exponentialRampToValueAtTime(n.to,t0+n.t+n.d);
        gn.gain.setValueAtTime(0.0001,t0+n.t); gn.gain.exponentialRampToValueAtTime(n.v||.15,t0+n.t+.01); gn.gain.exponentialRampToValueAtTime(0.0001,t0+n.t+n.d); o.connect(gn); gn.connect(master); o.start(t0+n.t); o.stop(t0+n.t+n.d+.05); }); return true; },
    mountToggle:function(el){ var b=document.createElement('button'); b.className='ls-header-btn'; b.setAttribute('data-ls-mute',''); b.setAttribute('aria-label','Toggle sound'); b.textContent=muted?'\uD83D\uDD07':'\uD83D\uDD0A'; b.onclick=function(){ sfx.toggle(); if(!muted) sfx.play('click'); }; el.appendChild(b); return b; }
  };
})(typeof window!=='undefined'?window:globalThis);

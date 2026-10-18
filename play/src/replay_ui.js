// Replay overlay: scoreboard + canvas + controls + ticker + pick-a-play panel, built on the vendored LifeSimReplay / LifeSimFameFX.
const $ = (id) => document.getElementById(id);
const fmt = (t) => { t = Math.floor(t); return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); };
let fxGlobal = null;
export function burst(cfg) { // full-screen fame_fx burst (release day, sensation, title)
  const host = document.getElementById('fxhost'); if (!host || !window.LifeSimFameFX) return null;
  if (!fxGlobal) fxGlobal = window.LifeSimFameFX.createFameFX(host);
  fxGlobal.trigger(Object.assign({ type: 'fame_burst', intensity: 3 }, cfg)); return fxGlobal;
}
let cur = null;
export const active = () => cur;
export function closeReplay() { if (cur) { cur.rp.destroy(); cur = null; } const h = $('rhost'); if (h) h.innerHTML = ''; }

// opts: { log, title, interactive, onChoose(playId)->newLog|null, onEnd(), onClose(), note }
export function openReplay(opts) {
  closeReplay(); const host = $('rhost');
  host.innerHTML = `<div class="rp-ov"><div class="rp-box">
    <div class="rp-head"><b id="rp-title"></b><button class="alt sm" id="rp-close" data-rp="close">✕ Close</button></div>
    <div class="rp-score"><span class="dot" id="rp-d0"></span><span id="rp-n0"></span><b id="rp-s0">0</b><span>–</span><b id="rp-s1">0</b><span id="rp-n1"></span><span class="dot" id="rp-d1"></span><span id="rp-clock" class="mut"></span></div>
    <div id="rp-stage"><canvas id="rp-field" width="960" height="600"></canvas></div>
    <div class="rp-ctl"><button class="alt sm" id="rp-prev" title="previous event">⏮</button><button class="sm" id="rp-play" style="min-width:76px">▶ Play</button><button class="alt sm" id="rp-next" title="next event">⏭</button>
      <span id="rp-speeds"></span><input type="range" id="rp-scrub" min="0" max="1000" value="0"><span class="mut" id="rp-tm"></span></div>
    <div class="rp-card" id="rp-pcard" style="display:none"><h3>Pick a play</h3><div id="rp-picker"></div></div>
    <p class="mut" id="rp-note">${opts.note || ''}</p><div id="rp-ticker"></div></div></div>`;
  const canvas = $('rp-field'), stage = $('rp-stage'), fx = window.LifeSimFameFX.createFameFX(stage);
  const rp = window.LifeSimReplay.createReplay(canvas, opts.log, { pauseOnPlayCall: !!opts.interactive });
  const ctl = { rp, fx, opts, lastCall: null, lastKey: '', ended: false }; cur = ctl;
  const head = () => { const T = rp.meta.teams; [0, 1].forEach((i) => { $('rp-n' + i).textContent = T[i].name; $('rp-d' + i).style.background = T[i].color; }); $('rp-title').textContent = opts.title || 'Replay'; };
  const panel = (c) => { const card = $('rp-pcard'); card.style.display = c ? 'block' : 'none'; if (!c) return; const pk = $('rp-picker'); pk.innerHTML = '';
    c.call.options.forEach((o) => { const b = document.createElement('button'); b.className = 'opt' + (o.id === c.call.chosen ? ' chosen' : ''); b.dataset.play = o.id; b.innerHTML = `<b>${o.name}</b><small>${o.desc}</small>`;
      b.onmouseenter = () => rp.previewPlay(o.id); b.onmouseleave = () => rp.previewPlay(null); b.onclick = () => rp.choosePlay(o.id); pk.appendChild(b); }); };
  const upd = () => { const st = rp.getState(), m = rp.meta; $('rp-s0').textContent = st.score[0]; $('rp-s1').textContent = st.score[1];
    $('rp-clock').textContent = m.sport === 'basketball' ? 'Q' + st.period + ' ' + fmt(Math.max(0, 720 - (rp.time % 720))) : '';
    $('rp-tm').textContent = fmt(rp.time) + ' / ' + fmt(rp.duration); if (document.activeElement !== $('rp-scrub')) $('rp-scrub').value = Math.round((rp.time / Math.max(1, rp.duration)) * 1000);
    $('rp-play').textContent = rp.playing ? '❚❚ Pause' : '▶ Play';
    const c = rp.getActivePlayCall(), key = c ? c.t + ':' + (rp.awaiting ? 1 : 0) : ''; if (c) ctl.lastCall = c; if (key !== ctl.lastKey) { ctl.lastKey = key; panel(c); } };
  head();
  rp.on('event', (e) => { const d = document.createElement('div'), who = (id) => { const p = rp.index.players[id]; return p ? '#' + p.num + ' ' + (p.name || '') : ''; };
    d.className = e.type === 'goal' ? 'g' : ''; d.innerHTML = `<span class="t">${fmt(e.t)}</span>${e.text || e.type + ' ' + who(e.actor)}`; d.onclick = () => rp.seek(e.t);
    const tk = $('rp-ticker'); if (!tk) return; tk.appendChild(d); while (tk.children.length > 60) tk.firstChild.remove(); tk.scrollTop = tk.scrollHeight;
    if (e.type === 'goal' && e.points >= 3) fx.trigger({ type: 'fame_burst', intensity: 2, label: 'SCORE +' + e.points, sub: e.text || '', origin: { x: e.x, y: e.y } }); });
  rp.on('seek', () => { const tk = $('rp-ticker'); if (tk) tk.innerHTML = ''; });
  rp.on('time', upd); rp.on('state', upd);
  rp.on('load', () => { head(); ctl.lastKey = ''; });
  rp.on('end', () => { if (!ctl.ended && opts.onEnd && !opts.interactivePending) { ctl.ended = true; opts.onEnd(ctl); } });
  rp.on('playchoice', (c) => { if (!opts.onChoose) return; const t = c.t, log = opts.onChoose(c.play_id); if (!log) return; ctl.ended = false; rp.load(log); rp.seek(t); rp.play(); });
  [0.5, 1, 2, 4].forEach((s) => { const b = document.createElement('button'); b.textContent = s + '×'; b.className = 'sm ' + (s === 1 ? '' : 'alt'); b.dataset.speed = s; b.onclick = () => { rp.setSpeed(s); [...$('rp-speeds').children].forEach((x) => (x.className = 'sm ' + (x === b ? '' : 'alt'))); }; $('rp-speeds').appendChild(b); });
  $('rp-play').onclick = () => rp.toggle(); $('rp-next').onclick = () => rp.nextEvent(); $('rp-prev').onclick = () => rp.prevEvent();
  $('rp-scrub').oninput = (e) => rp.seek((e.target.value / 1000) * rp.duration);
  $('rp-close').onclick = () => { const f = opts.onClose; closeReplay(); if (f) f(); };
  upd(); return ctl;
}

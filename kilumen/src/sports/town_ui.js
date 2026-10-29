// Town practice events UI (Oct 29 2026). Talk to <town>_practice_coach -> pick a creature -> play -> result + reaction.
// Practice only: no prize, no podium; best score per event saved in sports state (.town). Logic: town_events.js.
// Regions not built yet (LIVE_REGION) get a "still being built" line instead of the event.
import { eventFor, coachId, recordRun, scoreOf, gradeOf } from './town_events.js?v=v0.2.74-alpha';
import { TS, tt } from './town_strings.js?v=v0.2.74-alpha';
import { athleticStats } from './athletics.js?v=v0.2.74-alpha';

export const LIVE_REGION = 3; // R1-R3 are playable; Frostspire (R4), Lanternport (R7), Cindervale (R8) unlock with their region
const W = 360, H = 480;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const CSS = `#town-ev{position:fixed;inset:0;z-index:9000;background:#141a26ee;color:#f3ead2;font:14px/1.35 monospace;display:flex;align-items:center;justify-content:center;touch-action:none;user-select:none}
#town-ev .box{width:min(96vw,420px);max-height:96vh;overflow:auto;background:#22293a;border:3px solid #e8c26a;border-radius:6px;padding:10px;text-align:center}
#town-ev h2{margin:2px 0 6px;color:#e8c26a;font-size:17px}#town-ev canvas{width:min(92vw,360px,calc((96vh - 150px)*.75));aspect-ratio:3/4;background:#0d1320;border-radius:4px;display:block;margin:0 auto;image-rendering:pixelated}
#town-ev button{font:inherit;background:#384260;color:#f3ead2;border:2px solid #e8c26a;border-radius:4px;padding:6px 12px;margin:3px;cursor:pointer}
#town-ev .pad{display:flex;justify-content:center;gap:4px;margin-top:6px}#town-ev .pad button{min-width:52px;min-height:44px;font-size:18px}
#town-ev .mon{display:inline-flex;flex-direction:column;align-items:center;margin:4px;padding:4px;border:2px solid #384260;border-radius:4px;cursor:pointer}#town-ev .mon.sel{border-color:#e8c26a}
#town-ev .mon img{width:48px;height:48px;image-rendering:pixelated}#town-ev .react{margin:8px 0;font-style:italic}`;
const sheet = new Map();
const imgFor = (sp) => { if (!sheet.has(sp)) { const im = new Image(); im.src = `art/characters/pixel/creatures/${sp}/overworld/${sp}_ow/${sp}_ow_right_walk0_2x.png`; sheet.set(sp, im); } return sheet.get(sp); };
const nameOf = (c) => c.nickname || c.name || c.species;

export function attachTownEvents(scene, { sys, sstate, isOpen }) {
  const st = { open: false, phase: 'closed', ev: null, run: null, mon: null, raf: 0, input: null, last: null };
  (scene.saveGuards ||= []).push(() => (st.open ? (st.phase === 'play' ? 'town_event' : 'town_event_menu') : null));
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  let ov = null, savedTs = 1;
  const team = () => (scene.party || []).filter((c) => c && c.species && c.hp !== 0);
  const coachAt = (fx, fy) => {
    const m = scene.map, ev = eventFor(m?.name); if (!ev) return null;
    const id = coachId(ev.town), n = (m.npcs || m.json?.npcs || []).find((x) => x.id === id); if (!n) return null;
    const live = scene.npcs?.list?.find?.((x) => x.def?.id === id || x.id === id), x = live ? live.x : n.x, y = live ? live.y : n.y;
    return x === fx && y === fy ? ev : null;
  };
  const hook = (s) => {
    if (!s || s._townEvHooked) return; s._townEvHooked = true;
    const prev = s.onInteract.bind(s);
    s.onInteract = (fx, fy) => {
      const ev = coachAt(fx, fy); if (!ev) return prev(fx, fy);
      scene.script(async () => {
        if (ev.region > LIVE_REGION) { await scene.say?.([TS.not_ready], { name: TS.coach_name, portrait: null }); return; }
        await scene.say?.([TS[ev.id].hello], { name: TS.coach_name, portrait: null }); await openEvent(ev);
      });
      return true;
    };
  };
  hook(sys());

  function openEvent(ev) {
    if (st.open || isOpen?.()) return Promise.resolve();
    st.open = true; st.ev = ev; savedTs = scene.timescale ?? 1; scene.timescale = 0;
    ov = document.createElement('div'); ov.id = 'town-ev'; document.body.appendChild(ov);
    window.addEventListener('keydown', key, true); window.addEventListener('keyup', key, true);
    showPick();
    return new Promise((res) => { st.onClose = res; });
  }
  function close() {
    cancelAnimationFrame(st.raf); window.removeEventListener('keydown', key, true); window.removeEventListener('keyup', key, true);
    ov?.remove(); ov = null; st.open = false; st.phase = 'closed'; st.run = null; scene.timescale = savedTs;
    const cb = st.onClose; st.onClose = null; cb?.();
  }
  const KEYMAP = { ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right', ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down', ' ': 'tap', Enter: 'tap', f: 'tap', F: 'tap', z: 'tap', A: 'tap' };
  function press(k, down) { const I = st.input; if (!I) return; if (down && !I.hold[k]) I.edge[k] = true; I.hold[k] = down; }
  function key(e) {
    e.stopPropagation();
    if (st.phase === 'play') { const k = KEYMAP[e.key]; if (k) { e.preventDefault(); press(k, e.type === 'keydown'); } return; }
    if (e.type === 'keydown' && e.key === 'Escape') close();
  }

  function showPick() {
    st.phase = 'pick'; const ev = st.ev, rec = sstate().town?.[ev.id], mons = team();
    st.mon = st.mon && mons.includes(st.mon) ? st.mon : mons[0];
    ov.innerHTML = `<div class="box"><h2>${esc(TS[ev.id].title)}</h2><div>${esc(rec?.best ? tt(TS.best, { best: rec.best, unit: ev.unit }) : TS.none_yet)}</div>
      <div>${esc(TS.pick)}</div><div>${mons.map((c, i) => `<div class="mon${c === st.mon ? ' sel' : ''}" data-i="${i}"><img src="${imgFor(c.species).src}"><span>${esc(nameOf(c))}</span></div>`).join('')}</div>
      <div style="opacity:.8;margin:4px">${esc(TS[ev.id].how)}</div><button data-a="go">${esc(TS.start)}</button><button data-a="back">${esc(TS.back)}</button></div>`;
    ov.querySelectorAll('.mon').forEach((m) => (m.onclick = () => { st.mon = mons[+m.dataset.i]; showPick(); }));
    ov.querySelector('[data-a=go]').onclick = () => play(); ov.querySelector('[data-a=back]').onclick = () => close();
  }

  function play() {
    const ev = st.ev, c = st.mon; if (!c) return close();
    let stats = {}; try { stats = athleticStats(c.uid || c.id ? c : { ...c, uid: `${c.species}:${c.nickname || ''}` }); } catch (e) { /* no athletics: average */ }
    st.run = ev.create(`${ev.id}:${Date.now()}`, stats, team().length); st.run.team = [c, ...team().filter((x) => x !== c)]; st.phase = 'play';
    st.input = { hold: {}, edge: {}, pointerX: null };
    ov.innerHTML = `<div class="box"><h2>${esc(TS[ev.id].title)}</h2><canvas width="${W}" height="${H}"></canvas>
      <div class="pad"><button data-k="left">◀</button><button data-k="up">▲</button><button data-k="down">▼</button><button data-k="right">▶</button><button data-k="tap">A</button></div></div>`;
    const cv = ov.querySelector('canvas'), g = cv.getContext('2d');
    ov.querySelectorAll('.pad button').forEach((b) => { const k = b.dataset.k; b.onpointerdown = (e) => { e.preventDefault(); press(k, true); }; b.onpointerup = b.onpointerleave = b.onpointercancel = () => press(k, false); });
    if (ev.id === 'lantern_catch') { const mv = (e) => { const r = cv.getBoundingClientRect(); st.input.pointerX = (e.clientX - r.left) / r.width; }; cv.onpointerdown = mv; cv.onpointermove = (e) => { if (e.buttons) mv(e); }; cv.onpointerup = () => (st.input.pointerX = null); }
    st.last = performance.now();
    const loop = (now) => {
      if (st.phase !== 'play') return;
      const dt = Math.min(0.05, (now - st.last) / 1000); st.last = now;
      const I = st.input, inp = { ...I.edge, hold: { ...I.hold }, pointerX: I.pointerX }; I.edge = {};
      ev.step(st.run, dt, inp); draw(g, ev, st.run, c, now / 1000);
      if (st.run.done) { st.phase = 'result'; setTimeout(() => showResult(), 500); return; }
      st.raf = requestAnimationFrame(loop);
    };
    st.raf = requestAnimationFrame(loop);
  }

  function showResult() {
    if (!ov) return;
    const ev = st.ev, r = recordRun(sstate(), ev, st.run), c = st.mon, lines = TS['react_' + r.grade];
    try { globalThis.kilumen?.feeds?.onPractice?.(c); } catch (e) { /* feeds off */ } // fruit feeds: practice drains Fullness + speeds grow timers
    const react = tt(lines[Math.floor(Math.random() * lines.length)], { creature: nameOf(c) });
    ov.innerHTML = `<div class="box"><h2>${esc(TS[ev.id].title)}</h2><img src="${imgFor(c.species).src}" class="hopmon" style="width:72px;image-rendering:pixelated;animation:tevj .5s ease ${r.grade === 'none' ? 1 : 3}">
      <div><b>${esc(tt(TS.result, { creature: nameOf(c), score: r.score, unit: ev.unit }))}</b>${r.isBest ? ` · ${esc(TS.new_best)}` : ''}</div>
      <div>${esc(TS['grade_' + r.grade])} · ${esc(tt(TS.best, { best: r.best, unit: ev.unit }))}</div><div class="react">${esc(react)}</div>
      <button data-a="again">${esc(TS.again)}</button><button data-a="back">${esc(TS.back)}</button></div><style>@keyframes tevj{50%{transform:translateY(${r.grade === 'none' ? 4 : -14}px)}}</style>`;
    ov.querySelector('[data-a=again]').onclick = () => showPick(); ov.querySelector('[data-a=back]').onclick = () => close();
    st.phase = 'result';
  }

  const api = { openEvent: (town) => openEvent(eventFor(town)), state: () => ({ open: st.open, phase: st.phase, ev: st.ev?.id, run: st.run }), close, hook };
  return api;
}

// ---------------- drawing ----------------
function pop(g, text, x, y, col = '#ffe58a') { g.fillStyle = col; g.font = 'bold 18px monospace'; g.textAlign = 'center'; g.fillText(text, x, y); }
function hud(g, ev, s, extra = '') {
  g.fillStyle = '#000a'; g.fillRect(0, 0, W, 26); g.fillStyle = '#f3ead2'; g.font = '13px monospace'; g.textAlign = 'left';
  g.fillText(`${Math.max(0, Math.ceil(s.left))}s  ${scoreOf(ev, s)} ${ev.unit}  ${extra}`, 8, 18);
}
const hearts = (n) => '♥'.repeat(Math.max(0, n));
function mon(g, c, x, y, sz = 40, t = 0, flip = false) {
  const im = imgFor(c.species); if (!im.complete || !im.naturalWidth) { g.fillStyle = '#e8c26a'; g.beginPath(); g.arc(x, y, sz / 3, 0, 7); g.fill(); return; }
  g.save(); g.translate(x, y); if (flip) g.scale(-1, 1); g.drawImage(im, -sz / 2, -sz / 2, sz, sz); g.restore();
}
function draw(g, ev, s, c, t) {
  g.clearRect(0, 0, W, H);
  ({ garden_hop: dHop, tide_run: dTide, signal_relay: dRelay, ice_slide: dIce, lantern_catch: dCatch, forge_push: dForge })[ev.id](g, ev, s, c, t);
}
function dHop(g, ev, s, c, t) {
  g.fillStyle = '#1f4a3a'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) { g.fillStyle = i % 2 ? '#2c6650' : '#255a46'; g.fillRect((i * 53 + t * 8) % W, (i * 97) % H, 30, 3); }
  const rise = Math.sin(s.bob * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5; // 1 at the top of the bob (the beat)
  for (let k = 3; k >= 0; k--) { // upcoming rows (only the next is real; the rest are scenery)
    const y = 300 - k * 80, sc = 1 - k * 0.12;
    for (const side of [0, 1]) {
      const x = side ? 250 : 110, now = k === 0, stone = now && s.pair.stone;
      g.fillStyle = stone ? '#8b8f99' : '#3f9a4f'; g.beginPath(); g.ellipse(x, y + (now ? -rise * 6 : 0), 46 * sc, 18 * sc, 0, 0, 7); g.fill();
      const showHint = now && !stone && s.stepT < s.hint && ((side === 0) === s.pair.safeLeft);
      if (showHint) { g.fillStyle = '#ffd1ea'; g.beginPath(); g.arc(x + 18, y - 4 - rise * 6, 6, 0, 7); g.fill(); }
      if (now && !stone && s.stepT > s.window * 0.6) { g.strokeStyle = '#9ad'; g.globalAlpha = 0.6; g.beginPath(); g.ellipse(x, y, 52, 22, 0, 0, 7); g.stroke(); g.globalAlpha = 1; }
    }
  }
  const sx = s.fx?.side === 'L' ? 110 : s.fx?.side === 'R' ? 250 : 180, sy = s.fx && s.fx.k !== 'splash' && s.fx.k !== 'sink' ? 380 - Math.sin((1 - s.fx.t / 0.22) * Math.PI) * 40 : 390;
  mon(g, c, sx, sy, 48);
  g.fillStyle = '#ffffff22'; g.fillRect(150, 440, 60, 8); g.fillStyle = Math.abs(s.bob - 0.5) < 0.18 ? '#ffe58a' : '#8fd'; g.fillRect(150, 440, 60 * rise, 8); // beat meter
  if (s.fx) pop(g, TS[s.fx.k === 'perfect' ? 'pop_perfect' : s.fx.k === 'splash' ? 'pop_splash' : s.fx.k === 'sink' ? 'pop_sink' : 'pop_good'], 180, 220);
  hud(g, ev, s, hearts(s.lives) + (s.combo > 2 ? ` x${s.combo}` : ''));
}
function dTide(g, ev, s, c, t) {
  const top = 50, lane = (H - 120) / (ev.lanes + 1);
  g.fillStyle = '#16405f'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#c8b27e'; g.fillRect(0, top - 20, W, 30); g.fillRect(0, top + ev.lanes * lane + 10, W, H);       // far shore, near shore
  for (let i = 0; i < ev.lanes; i++) { const y = top + 10 + i * lane; g.fillStyle = i % 2 ? '#7c6f58' : '#8a7c62'; g.fillRect(0, y, W, lane - 4); } // causeway stones
  for (const w of s.waves) { const y = top + 10 + w.lane * lane, x = (((w.x % 1.6) + 1.6) % 1.6) * W - 0.1 * W;
    g.fillStyle = '#5fb3e6cc'; g.beginPath(); g.ellipse(x, y + lane / 2, w.w * W / 2, lane / 2 - 2, 0, 0, 7); g.fill(); g.fillStyle = '#fff'; g.fillRect(x - w.w * W / 3, y + 4, w.w * W / 1.5, 3); }
  const py = s.row >= ev.lanes ? top + ev.lanes * lane + 30 : top + 10 + s.row * lane + lane / 2;
  mon(g, c, s.x * W, py - (s.hop > 0 ? 6 : 0), 36);
  if (s.stun > 0) pop(g, TS.pop_washed, s.x * W, py - 26, '#bfe7ff');
  hud(g, ev, s, `L${s.level}`);
}
function dRelay(g, ev, s, c, t) {
  g.fillStyle = '#1c2133'; g.fillRect(0, 0, W, H);
  const C = ['#ff6b6b', '#ffd93d', '#6bcB77', '#4d96ff'], P = [[180, 130], [270, 220], [180, 310], [90, 220]], A = ['▲', '▶', '▼', '◀'];
  P.forEach(([x, y], i) => { const on = s.lit === i; g.fillStyle = on ? C[i] : C[i] + '44'; g.beginPath(); g.arc(x, y, on ? 44 : 38, 0, 7); g.fill();
    if (on) { g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke(); } g.fillStyle = '#0008'; g.font = '20px monospace'; g.textAlign = 'center'; g.fillText(A[i], x, y + 7); });
  for (let i = 0; i < s.legs; i++) { g.globalAlpha = i === s.leg ? 1 : 0.35; mon(g, s.team?.[i] || c, 70 + i * 70, 420, i === s.leg ? 44 : 32); } g.globalAlpha = 1;
  for (let i = 0; i < s.seq.length; i++) { g.fillStyle = s.phase === 'input' && i < s.pos ? '#ffe58a' : '#ffffff33'; g.fillRect(180 - s.seq.length * 7 + i * 14, 370, 10, 10); }
  if (s.phase === 'fumble') pop(g, TS.pop_miss, 180, 225, '#ff9a9a'); if (s.phase === 'pass') pop(g, TS.pop_perfect, 180, 225);
  hud(g, ev, s, '✕'.repeat(s.miss));
}
function dIce(g, ev, s, c, t) {
  g.fillStyle = '#dff1ff'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 12; i++) { g.strokeStyle = '#b9dcf2'; g.beginPath(); const y = ((i * 60 + t * s.speed * H) % (H + 60)) - 30; g.moveTo(0, y); g.lineTo(W, y + 20); g.stroke(); }
  for (const o of s.objs) { const x = o.x * W, y = o.y * H;
    if (o.gate) { g.fillStyle = o.done ? '#aaa' : '#e84d4d'; g.fillRect(x - o.w * W / 2 - 3, y - 18, 6, 22); g.fillRect(x + o.w * W / 2 - 3, y - 18, 6, 22); }
    else { g.strokeStyle = '#5a7f99'; g.lineWidth = 3; g.beginPath(); g.moveTo(x - 20, y); g.lineTo(x - 4, y - 8); g.lineTo(x + 6, y + 6); g.lineTo(x + 20, y - 2); g.stroke(); g.lineWidth = 1; } }
  g.save(); g.translate(s.x * W, 0.84 * H); g.rotate(s.bal * 0.6 + (s.wobble > 0 ? Math.sin(t * 30) * 0.3 : 0)); mon(g, c, 0, 0, 44, t, s.vx < 0); g.restore();
  g.fillStyle = '#0003'; g.fillRect(130, 455, 100, 8); g.fillStyle = Math.abs(s.bal) > 0.7 ? '#e84d4d' : '#4d96ff'; g.fillRect(180 + s.bal * 50 - 3, 452, 6, 14); // balance
  if (s.wobble > 0.6) pop(g, TS.pop_fall, s.x * W, 0.74 * H, '#335');
  hud(g, ev, s, '✕'.repeat(s.falls));
}
function dCatch(g, ev, s, c, t) {
  g.fillStyle = '#10142a'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 30; i++) { g.fillStyle = '#ffffff33'; g.fillRect((i * 71) % W, (i * 37) % 300, 2, 2); }
  g.fillStyle = '#1b2a3a'; g.fillRect(0, 0.95 * H, W, H); g.strokeStyle = '#ffe58a55'; g.beginPath(); g.moveTo(0, 0.9 * H); g.lineTo(W, 0.9 * H); g.stroke(); // beat line
  for (const it of s.items) { const x = it.x * W, y = it.y * H;
    if (it.soot) { g.fillStyle = '#444'; g.beginPath(); g.arc(x, y, 10, 0, 7); g.fill(); g.fillStyle = '#666'; g.beginPath(); g.arc(x + 6, y - 5, 6, 0, 7); g.fill(); }
    else { g.fillStyle = '#ffb347'; g.fillRect(x - 7, y - 10, 14, 18); g.fillStyle = '#fff4c2'; g.globalAlpha = 0.25 + 0.15 * Math.sin(t * 6 + it.born); g.beginPath(); g.arc(x, y, 18, 0, 7); g.fill(); g.globalAlpha = 1; } }
  const bx = s.x * W; mon(g, c, bx, 0.9 * H - 30, 40); g.fillStyle = '#8b5a2b'; g.fillRect(bx - s.reach * W, 0.9 * H - 8, s.reach * W * 2, 14);
  for (const f of s.fx) pop(g, f.k === 'perfect' ? TS.pop_perfect : f.k === 'soot' ? TS.pop_soot : '+1', f.x * W, 0.8 * H - (0.4 - f.t) * 60, f.k === 'soot' ? '#aaa' : '#ffe58a');
  hud(g, ev, s, hearts(s.lives) + (s.combo > 4 ? ` x${s.combo}` : ''));
}
function dForge(g, ev, s, c, t) {
  g.fillStyle = '#2a1410'; g.fillRect(0, 0, W, H);
  const ang = Math.atan(ev.slope(s.dist)) * 0.8;
  g.save(); g.translate(W / 2, 300); g.rotate(-ang);
  g.fillStyle = '#4a2a20'; g.fillRect(-W, 20, W * 2, 200);
  for (let i = -6; i < 7; i++) { g.fillStyle = '#7a4a30'; g.fillRect(i * 40 - (s.dist * 20) % 40, 20, 4, 8); } // rails moving under you
  g.fillStyle = '#555'; g.fillRect(-10, -26, 70, 40); g.fillStyle = '#c86b3c'; g.fillRect(-4, -36, 58, 14); // cart + ore
  mon(g, c, -36, -10, 44); g.restore();
  g.fillStyle = '#ff7a1a'; g.globalAlpha = 0.25 + 0.1 * Math.sin(t * 3); g.fillRect(W - 50, 60, 50, 180); g.globalAlpha = 1; // furnace glow
  const bx = 40, bw = 280, by = 400; g.fillStyle = '#000a'; g.fillRect(bx, by, bw, 18);
  g.fillStyle = '#ff7a1a'; g.fillRect(bx + (s.zc - s.zone / 2) * bw, by, s.zone * bw, 18); g.fillStyle = '#ffe58a'; g.fillRect(bx + (s.zc - s.zone / 8) * bw, by, s.zone / 4 * bw, 18);
  g.fillStyle = '#fff'; g.fillRect(bx + (s.marker ?? 0) * bw - 2, by - 4, 4, 26);
  g.fillStyle = '#ffffff33'; g.fillRect(bx, by + 28, bw, 6); g.fillStyle = '#8fd'; g.fillRect(bx, by + 28, bw * s.heat, 6); // breath
  if (s.last) pop(g, TS['pop_' + s.last.q], W / 2, 370, s.last.q === 'miss' ? '#ff9a9a' : '#ffe58a');
  if (s.v < -0.2) pop(g, '↙', 60, 250, '#ff9a9a');
  hud(g, ev, s);
}

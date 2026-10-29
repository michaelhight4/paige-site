// Town practice events UI (Oct 29 2026). Talk to <town>_practice_coach -> pick a creature -> play -> result + reaction.
// Practice only: no prize, no podium; best score per event saved in sports state (.town). Logic: town_events.js.
// Regions not built yet (LIVE_REGION) get a "still being built" line instead of the event.
import { eventFor, coachId, recordRun, scoreOf, gradeOf } from './town_events.js?v=v0.2.79-alpha';
import { TS, tt } from './town_strings.js?v=v0.2.79-alpha';
import { athleticStats } from './athletics.js?v=v0.2.79-alpha';
import { CUP, canEnterCup, payCup, rivalsFor, settleCup, cupState, cupDaysUntil } from './town_cup.js?v=v0.2.79-alpha';
import { diffOf, getDifficulty } from '../systems/difficulty.js?v=v0.2.79-alpha';
import { runChampion, reducedMotion } from './hype.js?v=v0.2.79-alpha';
import { keyAction, pollPad, feedPad } from './pad_input.js?v=v0.2.79-alpha';

export const LIVE_REGION = 8; // all six town events are playable (dev/sports-events, Oct 29 2026); each coach also runs the town cup
const W = 360, H = 480;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const CSS = `#town-ev{position:fixed;inset:0;z-index:9000;background:#141a26ee;color:#f3ead2;font:14px/1.35 monospace;display:flex;align-items:center;justify-content:center;touch-action:none;user-select:none}
#town-ev .box{width:min(96vw,420px);max-height:96vh;overflow:auto;background:#22293a;border:3px solid #e8c26a;border-radius:6px;padding:10px;text-align:center}
#town-ev h2{margin:2px 0 6px;color:#e8c26a;font-size:17px}#town-ev canvas{width:min(92vw,360px,calc((96vh - 150px)*.75));aspect-ratio:3/4;background:#0d1320;border-radius:4px;display:block;margin:0 auto;image-rendering:pixelated}
#town-ev button{font:inherit;background:#384260;color:#f3ead2;border:2px solid #e8c26a;border-radius:4px;padding:6px 12px;margin:3px;cursor:pointer}
#town-ev .pad{display:flex;justify-content:center;gap:4px;margin-top:6px}#town-ev .pad button{min-width:52px;min-height:44px;font-size:18px}
#town-ev .mon{display:inline-flex;flex-direction:column;align-items:center;margin:4px;padding:4px;border:2px solid #384260;border-radius:4px;cursor:pointer}#town-ev .mon.sel{border-color:#e8c26a}
#town-ev canvas#sports-champ{width:min(96vw,calc(96vh*16/9));aspect-ratio:16/9}#town-ev .rivals{display:flex;justify-content:center;gap:6px;margin:6px 0}#town-ev .rv{border:2px solid #384260;border-radius:4px;padding:4px;min-width:84px}#town-ev .rv b{color:#e8c26a}#town-ev .rank{margin:6px auto;border-collapse:collapse}#town-ev .rank td{padding:2px 8px}#town-ev .rank tr.me{color:#e8c26a;font-weight:bold}#town-ev button:disabled{opacity:.45}#town-ev .mon img{width:48px;height:48px;image-rendering:pixelated}#town-ev .react{margin:8px 0;font-style:italic}`;
const sheet = new Map();
const imgFor = (sp) => { if (!sheet.has(sp)) { const im = new Image(); im.src = `art/characters/pixel/creatures/${sp}/overworld/${sp}_ow/${sp}_ow_right_walk0_2x.png`; sheet.set(sp, im); } return sheet.get(sp); };
const nameOf = (c) => c.nickname || c.name || c.species;

export function attachTownEvents(scene, { sys, sstate, isOpen }) {
  const day = () => scene.clock?.day || 0, wallet = () => sys()?.wallet, rm = reducedMotion(new URLSearchParams(location.search));
  const st = { mode: 'practice', rivals: null, crowd: null, open: false, phase: 'closed', ev: null, run: null, mon: null, raf: 0, input: null, last: null };
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
        if (ev.region > LIVE_REGION) { await scene.say?.([TS.not_ready], { name: TS[ev.id].coach || TS.coach_name, portrait: null }); return; }
        await scene.say?.([TS[ev.id].hello], { name: TS[ev.id].coach || TS.coach_name, portrait: null }); await openEvent(ev);
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
    if (st.phase === 'play') { const k = keyAction(e); if (k) { e.preventDefault(); press(k, e.type === 'keydown'); } return; }
    if (e.type === 'keydown' && e.key === 'Escape') close();
  }

  function showPick() {
    st.phase = 'pick'; const ev = st.ev, rec = sstate().town?.[ev.id], mons = team();
    st.mon = st.mon && mons.includes(st.mon) ? st.mon : mons[0];
    ov.innerHTML = `<div class="box"><h2>${esc(TS[ev.id].title)}</h2><div>${esc(rec?.best ? tt(TS.best, { best: rec.best, unit: ev.unit }) : TS.none_yet)}</div>
      <div>${esc(TS.pick)}</div><div>${mons.map((c, i) => `<div class="mon${c === st.mon ? ' sel' : ''}" data-i="${i}"><img src="${imgFor(c.species).src}"><span>${esc(nameOf(c))}</span></div>`).join('')}</div>
      <div style="opacity:.8;margin:4px">${esc(TS[ev.id].how)}</div><div class="cupline" id="cup-status">${esc(cupStatus(ev).msg)}</div>
      <button data-a="go">${esc(TS.practice)}</button><button data-a="cup"${cupStatus(ev).ok ? '' : ' disabled'}>${esc(tt(TS.cup_enter, { fee: CUP.fee }))}</button><button data-a="back">${esc(TS.back)}</button></div>`;
    ov.querySelectorAll('.mon').forEach((m) => (m.onclick = () => { st.mon = mons[+m.dataset.i]; showPick(); }));
    ov.querySelector('[data-a=go]').onclick = () => { st.mode = 'practice'; play(); }; ov.querySelector('[data-a=back]').onclick = () => close();
    ov.querySelector('[data-a=cup]').onclick = () => cupIntro();
  }
  function cupStatus(ev) {
    const r = cupState(sstate(), ev), c = canEnterCup({ ev, day: day(), coins: wallet()?.coins ?? 0, sstate: sstate() });
    const msg = c.ok ? tt(TS.cup_today, { prize: CUP.prize, cups: r.cups }) : c.reason === 'not_today' ? tt(TS.cup_in_days, { days: c.days, cups: r.cups }) : c.reason === 'entered' ? TS.cup_entered : tt(TS.cup_no_gold, { fee: CUP.fee });
    return { ...c, msg };
  }
  /** Cup: pay, meet the three rivals (their posted scores), the coach sets the target, then the real event. */
  function cupIntro() {
    const ev = st.ev; if (!payCup({ ev, day: day(), wallet: wallet(), sstate: sstate() })) return showPick();
    st.mode = 'cup'; st.rivals = rivalsFor(ev, day()); st.coinsBefore = wallet()?.coins ?? 0; st.phase = 'cup_intro';
    const top = Math.max(...st.rivals.map((r) => r.score));
    ov.innerHTML = `<div class="box" id="cup-intro"><h2>${esc(tt(TS.cup_title, { event: TS[ev.id].title }))}</h2><div>${esc(TS.cup_field)}</div>
      <div class="rivals">${st.rivals.map((r) => `<div class="rv"><img src="${imgFor(r.species).src}" style="width:48px;image-rendering:pixelated"><div>${esc(r.trainer)}</div><b>${r.score} ${esc(ev.unit)}</b></div>`).join('')}</div>
      <div class="react">${esc(TS[ev.id].coach || TS.coach_name)}: ${esc(tt(TS.cup_target, { score: top + 1, unit: ev.unit, creature: nameOf(st.mon) }))}</div>
      <button data-a="go">${esc(TS.start)}</button></div>`;
    try { window.kilumen?.audio?.sfx?.('select'); } catch (e) { /* no audio */ }
    ov.querySelector('[data-a=go]').onclick = () => play();
  }

  function play() {
    const ev = st.ev, c = st.mon; if (!c) return close();
    let stats = {}; try { stats = athleticStats(c.uid || c.id ? c : { ...c, uid: `${c.species}:${c.nickname || ''}` }); } catch (e) { /* no athletics: average */ }
    st.run = ev.create(`${ev.id}:${Date.now()}`, stats, team().length); st.run.team = [c, ...team().filter((x) => x !== c)]; st.phase = 'play';
    st.input = { hold: {}, edge: {}, pointerX: null }; st.pad = {}; st.crowd = makeCrowd(st.mode === 'cup' ? 2 : 1, ev.id); st.prevScore = 0; st.prevBad = 0; st.quip = null;
    ov.innerHTML = `<div class="box"><h2>${esc(TS[ev.id].title)}</h2><canvas width="${W}" height="${H}"></canvas>
      <div class="pad"><button data-k="left">◀</button><button data-k="up">▲</button><button data-k="down">▼</button><button data-k="right">▶</button><button data-k="tap">A</button></div></div>`;
    const cv = ov.querySelector('canvas'), g = cv.getContext('2d');
    ov.querySelectorAll('.pad button').forEach((b) => { const k = b.dataset.k; b.onpointerdown = (e) => { e.preventDefault(); press(k, true); }; b.onpointerup = b.onpointerleave = b.onpointercancel = () => press(k, false); });
    if (ev.id === 'lantern_catch') { const mv = (e) => { const r = cv.getBoundingClientRect(); st.input.pointerX = (e.clientX - r.left) / r.width; }; cv.onpointerdown = mv; cv.onpointermove = (e) => { if (e.buttons) mv(e); }; cv.onpointerup = () => (st.input.pointerX = null); }
    st.last = performance.now();
    const loop = (now) => {
      if (st.phase !== 'play') return;
      const dt = Math.min(0.05, (now - st.last) / 1000); st.last = now;
      st.pad = feedPad(st.pad || {}, pollPad(), press);
      const I = st.input, inp = { ...I.edge, hold: { ...I.hold }, pointerX: I.pointerX }; I.edge = {};
      ev.step(st.run, dt, inp); draw(g, ev, st.run, c, now / 1000);
      { const sc = scoreOf(ev, st.run), bad = badOf(st.run), cr = st.crowd;
        if (sc > st.prevScore) { cr.hype = Math.min(1, cr.hype + 0.22); if (sc % 5 === 0 || cr.hype > 0.9) quip('cheer'); }
        if (bad > st.prevBad) { cr.gasp = 0.8; cr.hype *= 0.5; quip('oops'); }
        st.prevScore = sc; st.prevBad = bad; if (st.run.left < 5 && st.run.left + dt >= 5) quip('final');
        drawCrowd(g, cr, dt, now / 1000, rm); if (st.quip) { st.quip.t -= dt; drawQuip(g, st.quip, (st.crowd.bottom || 40) + 16); if (st.quip.t <= 0) st.quip = null; } }
      if (st.run.done) { st.phase = 'result'; setTimeout(() => showResult(), 500); return; }
      st.raf = requestAnimationFrame(loop);
    };
    st.raf = requestAnimationFrame(loop);
  }

  function quip(kind) { const L = TS['coach_' + kind]; if (!L || (st.quip && st.quip.t > 0.6)) return; st.quip = { text: L[Math.floor(Math.random() * L.length)], t: 1.6 }; }
  function showResult() {
    if (!ov) return;
    if (st.mode === 'cup') return showCupResult();
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

  async function showCupResult() {
    const ev = st.ev, c = st.mon, r = recordRun(sstate(), ev, st.run);
    try { globalThis.kilumen?.feeds?.onPractice?.(c); } catch (e) { /* feeds off */ }
    let mult = 1; try { mult = diffOf(getDifficulty(sys()?.state)).money || 1; } catch (e) { mult = 1; }
    const res = settleCup({ ev, score: r.score, rivals: st.rivals, wallet: wallet(), sstate: sstate(), mult }); st.cupResult = res;
    if (res.place === 1) {
      st.phase = 'champion'; const ss = sstate(); ss.pid ??= Math.floor(Math.random() * 100000);
      const big = (sp) => { const im = new Image(); im.src = `art/characters/pixel/creatures/${sp}/battle/${sp}_front_128.png`; im.onerror = () => { im.onerror = null; im.src = `art/characters/pixel/creatures/${sp}/base/${sp}_front.png`; }; return im; };
      await runChampion({ st, ov, party: [c.species], playerSrc: 'art/characters/pixel/humans/cal/run_bike/frames_3x/cal_chibi_down_run0_3x.png', title: tt(TS.cup_champ, { town: TS[ev.id].town || '' }),
        scoreLabel: TS.cup_score, scoreText: `${r.score} ${ev.unit}`, name: scene.config?.playerName || 'Cal', id: ss.pid, time: 0, coinsFrom: st.coinsBefore, prize: res.prize, reduced: rm, audio: window.kilumen?.audio,
        framesBig: big });
      st.tapFn = null; if (!ov) return;
    }
    st.phase = 'cup_result';
    const lines = TS['cup_react_' + (res.place === 1 ? 'win' : res.place === 2 ? 'close' : 'lose')];
    ov.innerHTML = `<div class="box" id="cup-result"><h2>${esc(tt(TS.cup_title, { event: TS[ev.id].title }))}</h2>
      <table class="rank">${res.field.map((x, i) => `<tr class="${x.me ? 'me' : ''}"><td>${i + 1}.</td><td>${esc(x.me ? nameOf(c) : `${x.trainer}'s ${x.species}`)}</td><td>${x.score} ${esc(ev.unit)}</td></tr>`).join('')}</table>
      <div>${esc(res.place === 1 ? tt(TS.cup_won, { prize: res.prize, cups: res.cups }) : TS.cup_lost)}</div>
      <div class="react">${esc(TS[ev.id].coach || TS.coach_name)}: ${esc(tt(lines[Math.floor(Math.random() * lines.length)], { creature: nameOf(c) }))}</div>
      <button data-a="back">${esc(TS.back)}</button></div>`;
    ov.querySelector('[data-a=back]').onclick = () => close();
  }

  const api = { openEvent: (town) => openEvent(eventFor(town)), state: () => ({ open: st.open, phase: st.phase, mode: st.mode, ev: st.ev?.id, run: st.run, rivals: st.rivals, cup: st.cupResult || null, crowd: st.crowd && { hype: st.crowd.hype }, hold: st.input ? { ...st.input.hold } : null }), cupStatus: (town) => cupStatus(eventFor(town)), tap: () => st.tapFn?.(), close, hook };
  return api;
}

// ---------------- crowd (pre-rendered strip, one drawImage per frame: cheap on phones) ----------------
const badOf = (s) => (3 - (s.lives ?? 3)) + (s.falls || 0) + (s.miss || 0) + (s.washed || 0);
const CROWD_COLS = { garden_hop: ['#f2a7c3', '#9bd18b', '#ffe08a'], tide_run: ['#7fc4e8', '#f3ead2', '#e8875a'], signal_relay: ['#9ad1ff', '#c3a6ff', '#ffe58a'],
  ice_slide: ['#dff1ff', '#8fb8ff', '#ff9aa8'], lantern_catch: ['#ffb347', '#ffe58a', '#c38bff'], forge_push: ['#ff7a1a', '#c86b3c', '#ffd77a'] };
function makeCrowd(rows, evId) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = 14 * rows + 6; const g = cv.getContext('2d'), cols = CROWD_COLS[evId] || ['#ccc'];
  g.fillStyle = '#0b0f1a'; g.fillRect(0, 0, cv.width, cv.height);
  for (let r = 0; r < rows; r++) for (let i = 0; i < 30; i++) { const x = i * 12 + (r % 2) * 6 + 4, y = 9 + r * 14; g.fillStyle = cols[(i + r) % cols.length]; g.fillRect(x - 4, y, 8, 6); g.fillStyle = '#e8c9a0'; g.beginPath(); g.arc(x, y - 2, 3, 0, 7); g.fill(); }
  return { cv, hype: 0.2, gasp: 0, rows };
}
function drawCrowd(g, cr, dt, t, rm) {
  cr.hype = Math.max(0.15, cr.hype - dt * 0.12); cr.gasp = Math.max(0, cr.gasp - dt);
  const y = 26, bob = rm ? 0 : Math.round(Math.abs(Math.sin(t * (4 + cr.hype * 8))) * (1 + cr.hype * 4));
  g.globalAlpha = 0.9; g.drawImage(cr.cv, 0, y - bob, W, cr.cv.height); g.globalAlpha = 1; cr.bottom = y + cr.cv.height;
  if (!rm && cr.hype > 0.6) { g.fillStyle = '#ffe58a'; for (let i = 0; i < 6; i++) { const x = (i * 61 + t * 40) % W; g.fillRect(x, y - 6 - ((t * 30 + i * 7) % 10), 2, 5); } } // waving arms / sparkle
  if (cr.gasp > 0) { g.fillStyle = '#fff'; g.font = 'bold 11px monospace'; g.textAlign = 'center'; g.fillText(TS.crowd_gasp, W / 2, y + cr.cv.height + 12); }
  else if (cr.hype > 0.75) { g.fillStyle = '#ffe58a'; g.font = 'bold 11px monospace'; g.textAlign = 'center'; g.fillText(TS.crowd_roar, W / 2, y + cr.cv.height + 12); }
}
function drawQuip(g, q, y0 = 30) {
  g.globalAlpha = Math.min(1, q.t * 2); g.fillStyle = '#22293aee'; g.fillRect(6, y0, W - 12, 22); g.strokeStyle = '#e8c26a'; g.strokeRect(6, y0, W - 12, 22);
  g.fillStyle = '#f3ead2'; g.font = '12px monospace'; g.textAlign = 'left'; g.fillText(q.text, 12, y0 + 15); g.globalAlpha = 1;
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

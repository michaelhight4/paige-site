/* LifeSim Replay - 2D sports replay renderer. No dependencies.
 * UMD: window.LifeSimReplay (browser <script>) or require('./replay.js') (node / bundlers).
 * API: createReplay(canvas, eventLog, opts)  |  buildIndex(log)  |  stateAt(index, t)
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LifeSimReplay = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const smooth = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
  const NON_BALL = { substitution: 1, period_end: 1, play_call: 1 };
  const SPORT = { // drift: how strongly players slide toward the ball (attacking / defending)
    soccer: { atk: .2, def: .32, shift: .22, key: 5, vmax: .1 }, basketball: { atk: .22, def: .7, shift: .1, key: 3, vmax: .35 },
    football: { atk: .2, def: .4, shift: .2, key: 4, vmax: .09 } };
  // vmax = max player speed in field-widths per game second (LifeSim patch: fixes 'fast runner' on sparse event gaps)

  function bsearch(arr, t) { let lo = 0, hi = arr.length; while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m].t < t) lo = m + 1; else hi = m; } return lo; }

  // ---------- index / interpolation (pure, testable in node) ----------
  function buildIndex(log) {
    if (!log || !log.meta || !Array.isArray(log.events)) throw new Error('replay: invalid event log');
    const meta = log.meta, events = log.events.slice().sort((a, b) => a.t - b.t);
    const teams = meta.teams, teamIdx = {}, players = {};
    teams.forEach((tm, i) => { teamIdx[tm.id] = i; tm.roster.forEach((p, k) => { players[p.id] = Object.assign({}, p, { team: i, k }); }); });
    const ballKeys = [], pkeys = {}, subs = [], calls = [], goals = [];
    events.forEach((e, i) => {
      e._i = i;
      if (e.type === 'substitution') subs.push(e);
      if (e.type === 'play_call') calls.push(e);
      if (e.type === 'goal') goals.push(e);
      if (!NON_BALL[e.type] && isFinite(e.x) && isFinite(e.y)) {
        ballKeys.push({ t: e.t, x: e.x, y: e.y, team: teamIdx[e.team], actor: e.actor, ev: e });
        if (e.actor && players[e.actor] && (e.type !== 'goal' || isFinite(e.ax))) (pkeys[e.actor] = pkeys[e.actor] || []).push({ t: e.t, x: isFinite(e.ax) ? e.ax : e.x, y: isFinite(e.ay) ? e.ay : e.y }); // goal x,y = ball only (goal mouth)
      }
    });
    const duration = meta.duration || (events.length ? events[events.length - 1].t : 0);
    return { log, meta, events, teams, teamIdx, players, ballKeys, pkeys, subs, calls, goals, duration, sport: SPORT[meta.sport] || SPORT.soccer };
  }

  function basePos(ix, p, team) { // formation spot in global coords
    const tm = ix.teams[team]; let x = p.x, y = p.y;
    if (x == null || y == null) { const n = tm.roster.length; x = .2 + .5 * ((p.k % 4) / 3); y = (Math.floor(p.k / 4) + 1) / (Math.ceil(n / 4) + 1); }
    return tm.attack === 'left' ? [1 - x, 1 - y] : [x, y];
  }

  function onField(ix, t) {
    const set = {}; ix.teams.forEach(tm => tm.roster.forEach(p => { if (!p.bench) set[p.id] = true; }));
    for (const s of ix.subs) { if (s.t > t) break; delete set[s.actor]; set[s.target] = true; }
    return set;
  }

  function ballAt(ix, t) {
    const k = ix.ballKeys; if (!k.length) return { x: .5, y: .5, hasTeam: [.5, .5], carrier: null };
    const j = bsearch(k, t); let x, y, prev, next;
    if (j === 0) { x = k[0].x; y = k[0].y; prev = next = k[0]; }
    else if (j >= k.length) { const l = k[k.length - 1]; x = l.x; y = l.y; prev = next = l; }
    else { prev = k[j - 1]; next = k[j]; const u = (t - prev.t) / Math.max(1e-6, next.t - prev.t); x = lerp(prev.x, next.x, u); y = lerp(prev.y, next.y, u); }
    // possession weight (smooth hand-over in the last 3s before the next key)
    const win = Math.min(3, next.t - prev.t) || 1, w = prev === next ? 0 : smooth((t - (next.t - win)) / win), a = [0, 1].map(ti => lerp(prev.team === ti ? 1 : 0, next.team === ti ? 1 : 0, w));
    return { x, y, hasTeam: a, carrier: prev.actor, prevEv: prev.ev };
  }

  function stateAt(ix, t) {
    t = clamp(t, 0, ix.duration);
    const b = ballAt(ix, t), field = onField(ix, t), sp = ix.sport, W = sp.key, out = [];
    // LifeSim patch: players drift toward a time-smoothed ball (3 s window) so long passes don't make everyone sprint
    const bd = { x: 0, y: 0 }; for (let i = 0; i < 5; i++) { const q = ballAt(ix, Math.max(0, t - i * .75)); bd.x += q.x / 5; bd.y += q.y / 5; }
    ix.teams.forEach((tm, ti) => tm.roster.forEach(p0 => {
      if (!field[p0.id]) return;
      const p = ix.players[p0.id], [bx0, by0] = basePos(ix, p, ti), k = (b.hasTeam[ti] * sp.atk + (1 - b.hasTeam[ti]) * sp.def) * (p.pos === 'GK' ? .25 : 1);
      let x = bx0 + (bd.x - bx0) * k + (bd.x - .5) * sp.shift * (p.pos === 'GK' ? 0 : 1) * (1 - k), y = by0 + (bd.y - by0) * k * .8;
      const ks = ix.pkeys[p.id];
      if (ks) { const j = bsearch(ks, t), pr = ks[j - 1], nx = ks[j], asp = ix.meta.field ? ix.meta.field.h / ix.meta.field.w : .65, vm = sp.vmax || .12;
        const dist = (a, b) => Math.hypot(a.x - b.x, (a.y - b.y) * asp), home = { x: bx0, y: by0 };
        const fast = pr && nx && dist(pr, nx) / Math.max(1e-6, nx.t - pr.t) > vm; // key->key run would exceed top speed
        if (pr && nx && nx.t - pr.t <= 2 * W && !fast) { const u = smooth((t - pr.t) / Math.max(1e-6, nx.t - pr.t)); x = lerp(pr.x, nx.x, u); y = lerp(pr.y, nx.y, u); } // close keys: go straight key->key
        else { // far keys: fade formation -> key as it approaches, key -> formation after; windows stretch so speed stays <= vmax
          if (pr) { const Wp = Math.max(W, dist(pr, home) / vm); if (t - pr.t <= Wp) { const s = smooth(1 - (t - pr.t) / Wp); x = lerp(x, pr.x, s); y = lerp(y, pr.y, s); } }
          if (nx) { const Wn = Math.max(W, dist(nx, home) / vm); if (nx.t - t <= Wn) { const s = smooth(1 - (nx.t - t) / Wn); x = lerp(x, nx.x, s); y = lerp(y, nx.y, s); } } } }
      out.push({ id: p.id, team: ti, num: p.num, pos: p.pos, name: p.name, x: clamp(x, .01, .99), y: clamp(y, .01, .99), carrier: p.id === b.carrier });
    }));
    const score = [0, 0]; for (const g of ix.goals) { if (g.t > t) break; score[ix.teamIdx[g.team]] += g.points || 1; }
    let period = 1; const pe = ix.events.filter(e => e.type === 'period_end'); for (const e of pe) if (e.t <= t) period = (e.period || period) + 1;
    period = Math.min(period, ix.meta.periods || period);
    return { t, ball: { x: b.x, y: b.y }, players: out, score, period, carrier: b.carrier };
  }

  function activeCall(ix, t, awaiting) {
    if (awaiting && awaiting.t <= t + 1e-6) return awaiting;
    let found = null; for (const c of ix.calls) { if (c.t > t) break; if (t <= c.t + (c.dur || 6)) found = c; } return found;
  }
  function callPlay(call, id) { const o = call.call; id = id || o.chosen; return (o.options || []).find(p => p.id === id) || o.options[0]; }

  // ---------- drawing ----------
  function drawField(ctx, sport, R) {
    const { x, y, w, h } = R; ctx.save();
    ctx.fillStyle = sport === 'basketball' ? '#c08a4f' : '#2f8f4a'; ctx.fillRect(x, y, w, h);
    if (sport !== 'basketball') for (let i = 0; i < 10; i++) { if (i % 2) { ctx.fillStyle = 'rgba(0,0,0,.06)'; ctx.fillRect(x + i * w / 10, y, w / 10, h); } }
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
    const X = u => x + u * w, Y = v => y + v * h, line = (a, b, c, d) => { ctx.beginPath(); ctx.moveTo(X(a), Y(b)); ctx.lineTo(X(c), Y(d)); ctx.stroke(); };
    const circ = (cx, cy, r, a0 = 0, a1 = Math.PI * 2) => { ctx.beginPath(); ctx.ellipse(X(cx), Y(cy), r * w, r * w, 0, a0, a1); ctx.stroke(); };
    const rect = (a, b, c, d) => ctx.strokeRect(X(a), Y(b), (c - a) * w, (d - b) * h);
    if (sport === 'basketball') {
      line(.5, 0, .5, 1); circ(.5, .5, .065); // center circle (x-scaled)
      [0, 1].forEach(s => { const m = s ? -1 : 1, bx = s ? 1 : 0;
        rect(s ? .81 : 0, .33, s ? 1 : .19, .67); circ(bx + m * .19, .5, .065, s ? Math.PI / 2 : -Math.PI / 2, s ? Math.PI * 1.5 : Math.PI / 2);
        ctx.beginPath(); ctx.ellipse(X(bx + m * .05), Y(.5), .012 * w, .012 * w, 0, 0, 7); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(X(bx + m * .105), Y(.5), .225 * w, .43 * h, 0, s ? Math.PI * .5 : -Math.PI * .5, s ? Math.PI * 1.5 : Math.PI * .5, false); ctx.stroke(); });
    } else if (sport === 'football') {
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x, y, w * .08, h); ctx.fillRect(x + w * .92, y, w * .08, h);
      for (let i = 1; i < 20; i++) { const u = .08 + i * .84 / 20; line(u, i % 5 ? .47 : 0, u, i % 5 ? .53 : 1); }
      line(.08, 0, .08, 1); line(.92, 0, .92, 1);
    } else {
      line(.5, 0, .5, 1); circ(.5, .5, .088); rect(0, .2, .157, .8); rect(.843, .2, 1, .8); rect(0, .37, .052, .63); rect(.948, .37, 1, .63);
      ctx.beginPath(); ctx.arc(X(.5), Y(.5), 3, 0, 7); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; line(0, .45, 0, .55); line(1, .45, 1, .55);
    }
    ctx.restore();
  }

  function arrow(ctx, pts, color, width, dash) {
    if (pts.length < 2) return; ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
    ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = width + 3; ctx.setLineDash(dash || []); ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke(); ctx.setLineDash([]);
    const a = pts[pts.length - 2], b = pts[pts.length - 1], ang = Math.atan2(b[1] - a[1], b[0] - a[0]), s = 11;
    ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(b[0] - s * Math.cos(ang - .45), b[1] - s * Math.sin(ang - .45)); ctx.lineTo(b[0] - s * Math.cos(ang + .45), b[1] - s * Math.sin(ang + .45)); ctx.closePath(); ctx.fillStyle = color; ctx.fill();
    ctx.restore();
  }

  // ---------- createReplay ----------
  function createReplay(canvas, eventLog, opts) {
    opts = Object.assign({ autoplay: false, speed: 1, rate: null, pauseOnPlayCall: false, pad: 26, trail: true, requestFrame: true }, opts || {});
    const ctx = canvas.getContext('2d'), L = {}; let ix, t = 0, speed = opts.speed, playing = false, last = 0, raf = 0, awaiting = null, preview = null, fired = -1, trail = [], destroyed = false, flash = null;
    const on = (n, f) => ((L[n] = L[n] || []).push(f), () => off(n, f)), off = (n, f) => { L[n] = (L[n] || []).filter(x => x !== f); };
    const emit = (n, d) => (L[n] || []).slice().forEach(f => { try { f(d); } catch (e) { console.error(e); } });
    const rate = () => opts.rate || ix.meta.default_rate || 30;

    function load(log) { ix = buildIndex(log); t = 0; fired = -1; awaiting = null; preview = null; trail = []; playing = false; emit('load', { meta: ix.meta, duration: ix.duration }); render(); }
    function rect() { const f = ix.meta.field || { w: 105, h: 68 }, pad = opts.pad, aw = canvas.width - pad * 2, ah = canvas.height - pad * 2, ar = f.w / f.h; let w = aw, h = aw / ar; if (h > ah) { h = ah; w = ah * ar; } return { x: (canvas.width - w) / 2, y: (canvas.height - h) / 2, w, h }; }

    function fireUpTo(to) { // fire events in (fired, to]
      const E = ix.events; let i = fired + 1;
      while (i < E.length && E[i].t <= to + 1e-9) { const e = E[i]; fired = i; i++; flash = { e, at: performance.now ? performance.now() : Date.now() };
        emit('event', e); if (e.type === 'goal') emit('goal', e); if (e.type === 'period_end') emit('period_end', e);
        if (e.type === 'play_call') { emit('playcall', e); if (opts.pauseOnPlayCall && playing) { awaiting = e; t = e.t; pause(); emit('awaiting_play', e); break; } } }
    }
    function advance(dtMs) { if (!playing) return; const nt = t + dtMs / 1000 * rate() * speed; const target = Math.min(nt, ix.duration); t = target; fireUpTo(t); if (!playing) { return; } if (t >= ix.duration) { pause(); emit('end', { t }); } }
    function frame(now) { if (destroyed) return; const dt = last ? Math.min(100, now - last) : 16; last = now; advance(dt); render(); emit('time', t); if (opts.requestFrame) raf = requestAnimationFrame(frame); }
    const startLoop = () => { if (opts.requestFrame && !raf && typeof requestAnimationFrame === 'function') { last = 0; raf = requestAnimationFrame(frame); } };

    function play() { if (t >= ix.duration) seek(0); playing = true; if (awaiting && awaiting.t < t) awaiting = null; last = 0; startLoop(); emit('state', { playing }); }
    function pause() { playing = false; emit('state', { playing }); }
    function toggle() { playing ? pause() : play(); }
    function seek(nt) { t = clamp(nt, 0, ix.duration); fired = bsearch(ix.events, t + 1e-9) - 1; awaiting = null; trail = []; emit('seek', t); render(); emit('time', t); }
    function setSpeed(s) { speed = s; emit('speed', s); }
    function nextEvent(dir) { dir = dir || 1; const E = ix.events; let i;
      if (dir > 0) { i = bsearch(E, t + 1e-6); while (i < E.length && E[i].t <= t + 1e-6) i++; } else { i = bsearch(E, t - 1e-6) - 1; }
      if (i < 0 || i >= E.length) return null; const e = E[i]; seek(e.t); fired = i; emit('event', e); return e; }
    function choosePlay(id) { const c = activeCall(ix, t, awaiting); if (!c) return null; const p = callPlay(c, id);
      const choice = { type: 'play_choice', t: c.t, team: c.team, play_id: p.id, play_name: p.name, source: 'user' };
      awaiting = null; preview = null; emit('playchoice', choice);
      if (typeof CustomEvent === 'function' && canvas.dispatchEvent) canvas.dispatchEvent(new CustomEvent('lifesim:playchoice', { detail: choice, bubbles: true }));
      if (!playing) play(); return choice; }
    function previewPlay(id) { preview = id || null; render(); }
    const getState = () => stateAt(ix, t);
    const getActivePlayCall = () => activeCall(ix, t, awaiting);

    function render() {
      if (!ix) return; const R = rect(), st = stateAt(ix, t), sport = ix.meta.sport || 'soccer'; ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#10151c'; ctx.fillRect(0, 0, canvas.width, canvas.height); drawField(ctx, sport, R);
      const P = (x, y) => [R.x + x * R.w, R.y + y * R.h], rad = clamp(R.w * (sport === 'basketball' ? .018 : .0145), 9, 15);
      // ball trail
      if (opts.trail) { trail.push([st.ball.x, st.ball.y]); if (trail.length > 14) trail.shift(); ctx.save(); trail.forEach((p, i) => { const q = P(p[0], p[1]); ctx.beginPath(); ctx.arc(q[0], q[1], 2 + i * .25, 0, 7); ctx.fillStyle = 'rgba(255,255,255,' + (i / trail.length * .35) + ')'; ctx.fill(); }); ctx.restore(); }
      // play-call overlay (under players)
      const call = getActivePlayCall();
      if (call) { const pid = preview || call.call.chosen, pl = callPlay(call, pid), col = preview && preview !== call.call.chosen ? '#7dd3fc' : '#fde047';
        (pl.routes || []).forEach(r => { const pts = r.pts.map(p => P(p[0], p[1])); arrow(ctx, pts, r.kind === 'pass' ? '#ffffff' : col, 3.2, r.kind === 'pass' ? [7, 6] : r.kind === 'screen' ? [2, 5] : null);
          if (r.kind === 'screen') { const e = pts[pts.length - 1]; ctx.fillStyle = col; ctx.fillRect(e[0] - 9, e[1] - 3, 18, 6); } });
        (pl.arrows || []).forEach(a => arrow(ctx, [P(a.from[0], a.from[1]), P(a.to[0], a.to[1])], col, 3));
        ctx.save(); ctx.font = 'bold 15px system-ui,sans-serif'; const txt = 'PLAY CALL: ' + pl.name.toUpperCase(), tw = ctx.measureText(txt).width + 24;
        ctx.fillStyle = 'rgba(0,0,0,.72)'; ctx.fillRect(R.x + R.w / 2 - tw / 2, R.y + 8, tw, 28); ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, R.x + R.w / 2, R.y + 22); ctx.restore(); }
      // players
      const bp = P(st.ball.x, st.ball.y);
      st.players.slice().sort((a, b) => a.y - b.y).forEach(p => { const tm = ix.teams[p.team], q = P(p.x, p.y);
        ctx.beginPath(); ctx.arc(q[0] + 1.5, q[1] + 2.5, rad, 0, 7); ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fill();
        ctx.beginPath(); ctx.arc(q[0], q[1], rad, 0, 7); ctx.fillStyle = tm.color; ctx.fill(); ctx.lineWidth = p.carrier ? 3 : 2; ctx.strokeStyle = p.carrier ? '#fff176' : (tm.color2 || '#fff'); ctx.stroke();
        ctx.fillStyle = tm.textColor || (tm.color2 && /^#(f|e|d|c)/i.test(tm.color2) ? tm.color2 : '#fff'); ctx.font = 'bold ' + Math.round(rad * .95) + 'px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(p.num, q[0], q[1] + .5); });
      // ball
      ctx.beginPath(); ctx.arc(bp[0], bp[1], sport === 'basketball' ? 6 : 5, 0, 7); ctx.fillStyle = sport === 'basketball' ? '#e86a1c' : '#fff'; ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.stroke();
      // event flash
      if (flash && ix.events[fired] === flash.e && flash.e.type === 'goal') { const age = ((performance.now ? performance.now() : Date.now()) - flash.at) / 1000; if (age < 1.5) { ctx.save(); ctx.globalAlpha = 1 - age / 1.5; ctx.font = 'bold 54px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 6; const s = flash.e.points > 1 ? 'SCORE +' + flash.e.points : 'GOAL!'; ctx.strokeText(s, canvas.width / 2, R.y + R.h / 2); ctx.fillText(s, canvas.width / 2, R.y + R.h / 2); ctx.restore(); } }
    }

    function destroy() { destroyed = true; if (raf) cancelAnimationFrame(raf); raf = 0; playing = false; }
    load(eventLog);
    const api = { play, pause, toggle, seek, setSpeed, nextEvent: () => nextEvent(1), prevEvent: () => nextEvent(-1), on, off, getState, getActivePlayCall, choosePlay, previewPlay, load, destroy, render,
      tick: ms => { advance(ms); render(); emit('time', t); }, // manual stepping (tests / custom loops)
      get time() { return t; }, get duration() { return ix.duration; }, get speed() { return speed; }, get playing() { return playing; }, get meta() { return ix.meta; }, get events() { return ix.events; }, get awaiting() { return awaiting; }, get index() { return ix; } };
    if (opts.autoplay) play(); else startLoop();
    return api;
  }
  return { createReplay, buildIndex, stateAt, activeCall, callPlay, version: 1 };
});

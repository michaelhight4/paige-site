// Kilumen sports hype pass v2 (DEV, Oct 28 2026). Gary 7:54 AM CT: "feels boring ... should feel 'wow this is cool'";
// 8:06 AM CT: single races stay short and snappy but need "life and spirit and soul".
// Everything is drawn on the race canvas (640x360 logical, pixel art, no smoothing). Pure presentation: the race sim
// (race.js) is stepped exactly as before at fixed 1/60 s, so hitstop / slow-mo never change a result.
// Reduced motion (prefers-reduced-motion or ?rm=1): no shake, no flashes, a fifth of the confetti, slower beams.
import { S, t } from './strings.js?v=v0.2.70-alpha';
import { stepRace, applyStart, applyPush, applySprint, markerQuality, startQuality, DIST, WINDOW_S } from './race.js?v=v0.2.70-alpha';
import { pingPong, walkFrame, parallax } from './ported.js?v=v0.2.70-alpha';
import { rngFor } from './rng.js?v=v0.2.70-alpha';
import { dashScore } from './dash.js?v=v0.2.70-alpha';

export const W = 640, H = 360, PPM = 30, LANE_Y = [164, 222, 280, 338], SPR = 84; // v4: 58px lanes, track starts at y=112 so the 1.3x runners fit without covering the lane above
export const TIMING = { intro: 1.6, beat: 0.55, oneMin: 0.45, oneMax: 0.8, play: 2.0, hitstop: 0.22, photoGap: 0.2, slowmo: 0.3, stretchAt: 80, afterAll: 1.1, wipe: 0.45, board: 1.6 };
const LANE_COL = ['#e8584a', '#4aa8e8', '#f3c84a', '#7ad25a'];
const PLACE_COL = { 1: ['#fff3a0', '#ffc928', '#c47a08'], 2: ['#ffffff', '#cfd8e6', '#7c8aa3'], 3: ['#ffd2a8', '#e0904a', '#8a4a1c'], 4: ['#dddddd', '#999999', '#555555'] };
export const reducedMotion = (q) => q?.get?.('rm') === '1' || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
const ease = (x) => 1 - (1 - Math.min(1, Math.max(0, x))) ** 3;
const back = (x) => { x = Math.min(1, Math.max(0, x)); const c = 1.9; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };

// ---------------- personality (pure, tested) ----------------
/** Pre-start persona from traits: 'hop' (nervous), 'proud' (confident pose) or 'stretch'. */
/** Shown seconds: official sim times scaled to the 2x playback, so the clock matches the race you watch (results still stat-driven). */
export const showTime = (s) => s / TIMING.play;
export const TOP = 112, LINES = [112, 170, 228, 286, 344];
export function persona(traits = []) {
  if (traits.includes('fast_starter')) return 'hop';
  if (traits.includes('sprinter') || traits.includes('clutch_finisher')) return 'proud';
  return 'stretch';
}
/** True when the top two will cross within TIMING.photoGap s of each other (checked the moment the leader crosses). */
export function isPhotoFinish(race) {
  const lead = race.order[0]; if (!lead) return false;
  const rest = race.racers.filter((r) => r !== lead);
  const etaOf = (r) => (r.done ? r.finish - lead.finish : (DIST - r.x) / Math.max(0.1, r.v));
  return Math.min(...rest.map(etaOf)) <= TIMING.photoGap;
}
/** Live order: finished runners by time, then the rest by distance. */
export const liveOrder = (race) => [...race.racers].sort((a, b) => (a.done && b.done ? a.finish - b.finish : a.done ? -1 : b.done ? 1 : b.x - a.x));
/** Scoreboard value at elapsed s: every time ticks up at the same rate, the fastest stops first. */
export const tickValue = (final, maxT, el, dur = TIMING.board) => Math.min(final, (maxT * el) / dur);
/** Coach + announcer context line after a watched race. ctx: { place, underdog, rematch:{name,won}|null, newBest, time } */
export function coachLine(ctx) {
  if (ctx.place === 1 && ctx.underdog) return t('coach_underdog', ctx);
  if (ctx.rematch) return t(ctx.rematch.won ? 'coach_rematch_win' : 'coach_rematch_lose', { rival: ctx.rematch.name });
  if (ctx.newBest) return t('coach_best', { time: ctx.time.toFixed(2) });
  return S[ctx.place === 1 ? 'coach_win' : ctx.place <= 3 ? 'coach_podium' : 'coach_lose'];
}
export const monLine = (place, name) => t(place === 1 ? 'mon_win' : place <= 3 ? 'mon_podium' : 'mon_lose', { name });
/** 5-digit trainer ID shown on the champion bar. */
export const idText = (n) => String(n % 100000).padStart(5, '0');

// ---------------- sound (WebAudio one-shots on the game's effects bus) ----------------
export function makeSfx(audio) {
  const last = {};
  const out = () => { try { return audio?.sfxOut?.() || null; } catch { return null; } };
  let noiseBuf = null;
  const nb = (ctx) => { if (!noiseBuf || noiseBuf.sampleRate !== ctx.sampleRate) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } return noiseBuf; };
  const env = (ctx, o, at, dur, vol, atk = 0.005) => { const gn = ctx.createGain(); gn.gain.setValueAtTime(0.0001, at); gn.gain.linearRampToValueAtTime(vol, at + atk); gn.gain.exponentialRampToValueAtTime(0.0001, at + dur); gn.connect(o); return gn; };
  const tone = (f, dur, type = 'square', vol = 0.3, to = null, delay = 0) => { const o = out(); if (!o) return; const ctx = o.context, at = ctx.currentTime + delay; const os = ctx.createOscillator(); os.type = type; os.frequency.setValueAtTime(f, at); if (to) os.frequency.exponentialRampToValueAtTime(to, at + dur); os.connect(env(ctx, o, at, dur, vol)); os.start(at); os.stop(at + dur + 0.02); };
  const noise = (dur, vol, f = 1000, kind = 'bandpass', to = null, delay = 0, atk = 0.005) => { const o = out(); if (!o) return; const ctx = o.context, at = ctx.currentTime + delay; const s = ctx.createBufferSource(); s.buffer = nb(ctx); s.loop = true; const fl = ctx.createBiquadFilter(); fl.type = kind; fl.frequency.setValueAtTime(f, at); if (to) fl.frequency.exponentialRampToValueAtTime(to, at + dur); s.connect(fl); fl.connect(env(ctx, o, at, dur, vol, atk)); s.start(at); s.stop(at + dur + 0.02); };
  const gate = (id, ms) => { const n = performance.now(); if (last[id] && n - last[id] < ms) return false; last[id] = n; return true; };
  return {
    thud() { tone(130, 0.28, 'sine', 0.9, 38); noise(0.09, 0.35, 380, 'lowpass'); },
    go() { tone(523, 0.12, 'square', 0.22); tone(784, 0.4, 'square', 0.22, null, 0.07); tone(1046, 0.4, 'square', 0.14, null, 0.07); noise(0.35, 0.3, 1800, 'highpass'); },
    tick() { if (gate('tick', 45)) tone(1900, 0.022, 'square', 0.1); },
    slash() { noise(0.32, 0.55, 700, 'bandpass', 6500); tone(220, 0.25, 'sawtooth', 0.12, 880); },
    stamp() { tone(95, 0.2, 'triangle', 0.85, 48); noise(0.05, 0.3, 2500, 'highpass'); },
    cheer() { if (gate('cheer', 900)) noise(1.3, 0.22, 1300, 'bandpass', 1700, 0, 0.25); },
    gasp() { if (gate('gasp', 1200)) noise(0.55, 0.22, 900, 'bandpass', 350, 0, 0.05); },
    roar() { if (gate('roar', 1500)) { noise(1.8, 0.4, 900, 'bandpass', 1400, 0, 0.12); noise(1.6, 0.15, 3000, 'highpass', null, 0.05, 0.2); } },
    whoosh() { noise(0.45, 0.3, 300, 'bandpass', 3500); },
    hop() { if (gate('hop', 120)) tone(660, 0.07, 'square', 0.08, 990); },
    fanfare() { [523, 659, 784, 1046].forEach((f, i) => tone(f, i === 3 ? 0.5 : 0.13, 'square', 0.2, null, i * 0.11)); [392, 523].forEach((f, i) => tone(f, 0.6, 'triangle', 0.2, null, 0.33 + i * 0.01)); },
    record() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.12, 'square', 0.16, null, i * 0.07)); },
    coin() { if (gate('coin', 40)) { tone(1320, 0.04, 'square', 0.09); tone(1760, 0.07, 'square', 0.09, null, 0.035); } },
    music: (r) => { try { audio?.musicRate?.(r); } catch { /* none */ } },
  };
}

// ---------------- drawing helpers ----------------
/** Big outlined gradient text (centred at x,y). cols = [top, mid, bottom]. */
export function bigText(g, txt, x, y, size, cols = ['#fff7b0', '#ffc928', '#e8582a'], outline = '#1b1f2a') {
  g.save(); g.font = `bold ${size}px monospace`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.lineWidth = Math.max(4, size / 6); g.strokeStyle = outline; g.strokeText(txt, x, y);
  g.lineWidth = Math.max(2, size / 16); g.strokeStyle = '#ffffff'; g.strokeText(txt, x, y);
  const gr = g.createLinearGradient(0, y - size / 2, 0, y + size / 2); gr.addColorStop(0, cols[0]); gr.addColorStop(0.55, cols[1]); gr.addColorStop(1, cols[2]);
  g.fillStyle = gr; g.fillText(txt, x, y); g.restore();
}
function emote(g, x, y, glyph, col = '#1b1f2a') {
  g.fillStyle = '#1b1f2a'; g.fillRect(x - 9, y - 9, 18, 16); g.fillStyle = '#fff'; g.fillRect(x - 8, y - 8, 16, 14); g.fillRect(x - 2, y + 6, 4, 3);
  g.fillStyle = col; g.font = 'bold 11px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(glyph, x, y - 1); g.textBaseline = 'alphabetic';
}
function sprite(g, im, cx, footY, size, p = {}) {
  if (!im?.complete || !im.naturalWidth) return;
  g.save(); g.translate(Math.round(cx), Math.round(footY + (p.dy || 0))); if (p.rot) g.rotate(p.rot);
  g.scale((p.flip ? -1 : 1) * (p.sx || 1), p.sy || 1); g.drawImage(im, -size / 2, -size, size, size); g.restore();
}
/** Pre-rendered crowd tiles: 3 poses (sit, cheer, gasp) x 1 strip of 10 px columns, 8 rows. */
function crowdTiles() {
  const mk = (pose) => { const c = document.createElement('canvas'); c.width = 400; c.height = 100; const g = c.getContext('2d');
    const skin = ['#f2c9a0', '#c98e62', '#8a5a3a', '#f5d6b8'], shirt = ['#e86a5a', '#f3d36a', '#6ac0e8', '#f3ead2', '#8ad46a', '#c58ae8', '#ff9a3c', '#4a6ae8'];
    for (let row = 0; row < 8; row++) for (let col = 0; col < 40; col++) {
      const k = (col * 7 + row * 13) % 97, x = col * 10 + (row % 2) * 5, y = row * 12 + 2;
      g.fillStyle = shirt[k % shirt.length]; g.fillRect(x + 2, y + 5, 6, 6);
      g.fillStyle = skin[k % skin.length]; g.fillRect(x + 3, y + 1, 4, 4);
      if (pose === 1) { g.fillRect(x + 1, y - 2, 1, 5); g.fillRect(x + 8, y - 2, 1, 5); }
      else if (pose === 2) { g.fillRect(x + 2, y, 1, 3); g.fillRect(x + 7, y, 1, 3); g.fillStyle = '#1b1f2a'; g.fillRect(x + 4, y + 3, 2, 1); }
      if (k % 11 === 0) { g.fillStyle = shirt[(k + 3) % shirt.length]; g.fillRect(x + 1, y - 5, 8, 4); } // a flag / sign
    }
    return c; };
  return [mk(0), mk(1), mk(2)];
}
let TILES = null;
/** Stadium: sky, banners, stands with a reacting crowd. mood: 'idle'|'cheer'|'gasp'|'roar' */
function drawStadium(g, tm, camX, mood, rm) {
  TILES ||= crowdTiles();
  g.fillStyle = '#5ec0f4'; g.fillRect(0, 0, W, 44); g.fillStyle = '#8ad6f8'; g.fillRect(0, 30, W, 14);
  const off = Math.floor(camX * 0.3);
  for (let i = -1; i < 12; i++) { const x = i * 64 - (off % 64); g.fillStyle = i % 2 ? '#ffc928' : '#e8584a'; g.beginPath(); g.moveTo(x, 34); g.lineTo(x + 64, 34); g.lineTo(x + 32, 44); g.fill(); }
  g.fillStyle = '#3b3048'; g.fillRect(0, 44, W, 104);
  const far = Math.floor(-parallax(camX).far);
  for (let c = 0; c < 66; c++) {
    const wx = c * 10 + far, col = ((Math.floor(wx / 10) % 40) + 40) % 40;
    let pose = 0, bob = 0;
    if (mood === 'gasp') pose = 2;
    else if (mood === 'roar') { pose = 1; bob = rm ? 0 : Math.round(Math.sin(tm * 18 + c) * 2); }
    else if (mood === 'cheer') { const w = Math.sin(tm * 7 - c * 0.45); pose = w > 0.2 ? 1 : 0; bob = rm ? 0 : (w > 0.6 ? -2 : 0); }
    else pose = Math.sin(tm * 1.3 + c * 2.7) > 0.93 ? 1 : 0;
    const sx = c * 10 - (((far % 10) + 10) % 10);
    g.drawImage(TILES[pose], col * 10, 0, 10, 100, sx, 48 + bob, 10, 100);
  }
  g.fillStyle = '#2a2236'; g.fillRect(0, 144, W, 6);
}
function confettiSys(n, rm, seed = 'c') {
  const r = rngFor(seed), cols = ['#ffc928', '#e8584a', '#4aa8e8', '#7ad25a', '#ffffff', '#c58ae8'];
  const ps = Array.from({ length: rm ? Math.ceil(n / 5) : n }, () => ({ x: r() * W, y: -r() * H, vy: 40 + r() * 70, vx: -15 + r() * 30, ph: r() * 6, c: cols[(r() * cols.length) | 0], s: 2 + ((r() * 3) | 0) }));
  return { draw(g, dt, tm) { for (const p of ps) { p.y += p.vy * dt * (rm ? 0.5 : 1); p.x += (p.vx + Math.sin(tm * 3 + p.ph) * 20) * dt; if (p.y > H + 4) { p.y = -6; p.x = Math.random() * W; } const fl = Math.abs(Math.sin(tm * 6 + p.ph)); g.fillStyle = p.c; g.fillRect(p.x | 0, p.y | 0, p.s, Math.max(1, (p.s * fl + 0.5) | 0)); } } };
}
function checkerWipe(g, p) { // p 0..1 covers left->right on a diagonal, 1..2 uncovers
  const sq = 32, cols = Math.ceil(W / sq) + 8, rows = Math.ceil(H / sq);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const d = (i + j * 0.5) / (cols + rows * 0.5); // diagonal order
    const k = p <= 1 ? Math.min(1, Math.max(0, (p * 1.6 - d) * 4)) : 1 - Math.min(1, Math.max(0, ((p - 1) * 1.6 - d) * 4));
    if (k <= 0) continue; const s = sq * k, x = i * sq - 4 * sq + (sq - s) / 2 + j * 0, y = j * sq + (sq - s) / 2;
    g.fillStyle = (i + j) % 2 ? '#111' : '#fff'; g.fillRect(x + 4 * sq - (j % 2 ? 0 : 0), y, s, s);
  }
}

// ---------------- the live race ----------------
/**
 * Runs one watched race with the full show and resolves with [{time, racer}] after the scoreboard.
 * o: { st, ov, race, me, seed, label, isFinal, framesFor, audio, reduced, bestBefore, prev, setTap, onRecord }
 */
export function runRaceShow(o) {
  const { st, race, me, seed, framesFor, reduced: rm } = o;
  const sfx = makeSfx(o.audio);
  return new Promise((resolve) => {
    o.ov.innerHTML = `<canvas width="${W}" height="${H}"></canvas>`;
    race.window = WINDOW_S * TIMING.play; // prompts stay open the same REAL time as at 1x, so 2x playback stays fair
    const cv = o.ov.querySelector('canvas'), g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    const rng = rngFor('cd:' + seed);
    const one = TIMING.oneMin + rng() * (TIMING.oneMax - TIMING.oneMin); // random "1" so GO can't be counted in
    const CD = TIMING.beat * 2 + one;
    let tReal = -(TIMING.intro + CD), last = performance.now(), acc = 0, ended = false, endT = 0;
    let shakeA = 0, shakeT = 0, flashT = 0, lastDigit = 0, goT = -9, stretchT = -9, firstT = -9, photo = false, photoDone = false, recordT = -9;
    let mood = 'cheer', moodT = 1.5, ann = '', annT = 0, banner = null, bannerT = 0, wipeT = -1, boardT = -1, doneAt = -1;
    const parts = [], stamps = [], speed = Array.from({ length: 34 }, (_, i) => ({ y: 40 + ((i * 37) % 300), x: (i * 97) % W, l: 70 + ((i * 29) % 110) }));
    const R = new Map(race.racers.map((r) => [r.key, { persona: persona(r.traits), vh: [], stumble: -9, burst: -9, glance: -9, glanceCd: 0, push: null, sprint: null, rank: r.lane + 1 }]));
    const half = 0.07 + (me.stats.focus / 100) * 0.08;
    let rating = null, ratingT = 0, zoom = 1;
    const say = (s, dur = 1.8) => { ann = s; annT = dur; };
    const crowd = (m, d = 0.9) => { mood = m; moodT = d; if (m === 'gasp') sfx.gasp(); if (m === 'roar') sfx.roar(); if (m === 'cheer') sfx.cheer(); };
    const shake = (a, d = 0.18) => { if (rm) return; shakeA = Math.max(shakeA, a); shakeT = Math.max(shakeT, d); };
    const flash = () => { if (!rm) flashT = 0.12; };
    const rate = (q) => (q >= 0.85 ? S.perfect : q >= 0.6 ? S.good : q > 0 ? S.late : S.missed);
    const showRating = (s) => { rating = s; ratingT = 0.9; };
    const names = race.racers.map((r) => t('ann_lane', { lane: r.lane + 1, name: r.name })).join('  ');
    say((o.isFinal ? S.ann_final : t('ann_heat', { n: o.label.replace(/\D/g, '') || 1 })) + '  ' + names, TIMING.intro + 0.3);
    o.setTap(() => {
      if (boardT >= 0) { if (boardT > TIMING.board + 0.8) finish(); return; }
      if (tReal < -CD) { tReal = -CD; return; } // skip the intro (never a false start)
      if (me.inputs.start === null) { const q = tReal < 0 ? -1 : startQuality(tReal); applyStart(race, me, q); showRating(q < 0 ? S.false_start : rate(q)); if (q < 0) crowd('gasp'); st.log.push(['start', q]); return; }
      if (st.prompt) { const q = markerQuality(pingPong((race.clock - st.prompt.t0) / TIMING.play), 0.5, half); (st.prompt.kind === 'push' ? applyPush : applySprint)(race, me, q); showRating(rate(q)); st.log.push([st.prompt.kind, q]); st.prompt = null; }
    });
    cv.addEventListener('pointerdown', (e) => { e.preventDefault(); st.tapFn?.(); });
    let resolved = false;
    const finish = () => { if (resolved) return; resolved = true; sfx.music(1); st.fx = null; resolve(race.racers.map((r) => ({ time: r.finish, racer: r }))); };
    const result = () => {
      const order = [...race.racers].sort((a, b) => a.finish - b.finish), place = order.indexOf(me) + 1;
      const underdog = race.racers.every((r) => r === me || dashScore(r.stats) > dashScore(me.stats));
      const prevMe = o.prev?.find((x) => x.isPlayer);
      const rv = o.prev && prevMe ? race.racers.filter((r) => !r.isPlayer).map((r) => ({ r, p: o.prev.find((x) => x.key === r.key) })).find((x) => x.p && x.p.finish < prevMe.finish) : null;
      const rematch = rv ? { name: rv.r.name, won: me.finish < rv.r.finish } : null;
      const newBest = o.bestBefore != null && me.finish < o.bestBefore;
      return { order, place, ctx: { place, underdog, rematch, newBest, time: me.finish, name: me.name } };
    };
    let res = null, conf = null;

    const frame = (now) => {
      if (!st.open || resolved) return;
      const dt = Math.min(0.1, (now - last) / 1000); last = now; tReal += dt;
      const bannerOn = banner && bannerT > 0; if (!bannerOn) annT -= dt; /* announcer waits while the banner holds its row */ bannerT -= dt; ratingT -= dt; moodT -= dt; shakeT -= dt; flashT -= dt;
      if (moodT <= 0) mood = tReal < 0 ? 'cheer' : 'idle';
      // countdown beats
      if (tReal >= -CD && tReal < 0) { const d = tReal < -CD + TIMING.beat ? 3 : tReal < -CD + 2 * TIMING.beat ? 2 : 1; if (d !== lastDigit) { lastDigit = d; sfx.thud(); shake(2, 0.12); mood = 'idle'; moodT = 9; } }
      if (tReal >= 0 && goT < -1) { goT = tReal; sfx.go(); crowd('roar', 1.2); shake(4, 0.2); flash(); for (let i = 0; i < 26; i++) parts.push({ k: 'spark', x: W / 2, y: 100, vx: Math.cos(i / 26 * 6.28) * 260, vy: Math.sin(i / 26 * 6.28) * 200, t: 0, life: 0.5, c: i % 2 ? '#ffc928' : '#fff' }); }
      // sim
      if (tReal >= 0 && !race.finished) {
        if (me.inputs.start === null && tReal > 1.2) { applyStart(race, me, 0); showRating(S.missed); }
        let ts = 1;
        if (firstT > -1) { const since = tReal - firstT; ts = since < TIMING.hitstop ? 0 : photo && !photoDone ? TIMING.slowmo : 1; }
        acc += dt * ts * TIMING.play; // shown faster than sim time; results stay from the fixed 1/60 sim
        while (acc >= 1 / 60 && !race.finished) {
          acc -= 1 / 60;
          for (const e of stepRace(race, 1 / 60)) {
            if (e.key === me.key && (e.type === 'push' || e.type === 'sprint')) st.prompt = { kind: e.type, t0: race.clock };
            if (e.type === 'finish') onFinish(race.racers.find((r) => r.key === e.key));
          }
        }
        if (st.prompt && me.inputs[st.prompt.kind] !== null) { if (me.inputs[st.prompt.kind] === 0) showRating(S.missed); st.prompt = null; }
        if (st.prompt && race.clock - st.prompt.t0 > race.window) st.prompt = null;
        react(dt);
      }
      if (race.finished && !ended) { ended = true; endT = tReal; }
      if (ended && wipeT < 0 && tReal - endT > TIMING.afterAll) { wipeT = 0; sfx.whoosh(); res = result(); }
      draw(dt);
      requestAnimationFrame(frame);
    };
    function onFinish(r) {
      const place = race.order.length;
      stamps.push({ r, place, t: tReal }); sfx.stamp(); shake(place === 1 ? 5 : 2.5, 0.16);
      if (place === 1) {
        firstT = tReal; sfx.slash(); flash(); photo = isPhotoFinish(race);
        if (photo) { say(S.ann_photo, 2.2); crowd('roar', 2.2); } else crowd('cheer', 1.6);
      }
      if (place === 2 && photo) { photoDone = true; flash(); }
      if (r === me && o.bestBefore != null && me.finish < o.bestBefore) { recordT = tReal; sfx.record(); }
      if (r === me) sfx.music(1);
    }
    function react(dt) {
      const ord = liveOrder(race), lead = ord[0];
      ord.forEach((r, i) => {
        const f = R.get(r.key), was = f.rank; f.rank = i + 1;
        if (!r.done && race.clock > 2 && was !== f.rank) {
          if (f.rank === 1 && was > 1) { say(t('ann_lead', { name: r.name })); crowd('gasp', 0.7); if (r === me) shake(2); }
          else if (r === me && f.rank < was) { say(t('ann_pass', { name: r.name }), 1.3); crowd('cheer', 0.9); }
        }
        // stumble = a real speed dip (noise trough / fatigue), burst = a push or sprint input landing well
        f.vh.push(r.v); if (f.vh.length > 15) f.vh.shift();
        if (!r.done && r.x > 8 && f.vh.length === 15 && f.vh[0] - r.v > 0.09 && race.clock - f.stumble > 4) { f.stumble = race.clock; if (r.x < 90) say(t('ann_stumble', { name: r.name }), 1.3); }
        for (const k of ['push', 'sprint']) if (f[k] === null && r.inputs[k] !== null) { f[k] = r.inputs[k]; if (r.inputs[k] >= 0.6) { f.burst = race.clock; if (r === me) { shake(3, 0.15); if (k === 'push') say(t('ann_burst', { name: r.name }), 1.3); } } }
        // glance when neck and neck with the next lane
        f.glanceCd -= dt;
        if (!r.done && f.glanceCd <= 0) for (const o2 of race.racers) if (o2 !== r && Math.abs(o2.lane - r.lane) === 1 && !o2.done && Math.abs(o2.x - r.x) < 0.35 && r.x > 15) { f.glance = race.clock; f.glanceCd = 3.5; if (r === me) say(S.ann_close, 1.1); break; }
        // dust at the feet
        f.ph = (f.ph || 0) + r.v * dt * TIMING.play * 0.55; // stride cycle scales with speed
        if (r.v > 1 && !r.done && parts.length < (rm ? 40 : 200)) for (let n = Math.random() < (rm ? 0.15 : 0.9) ? (rm ? 1 : 2) : 0; n > 0; n--) parts.push({ k: 'dust', wx: r.x * PPM + 30, y: LANE_Y[r.lane] + 2 - Math.random() * 4, vx: -90 - Math.random() * 120, vy: -25 - Math.random() * 45, t: 0, life: 0.4 + Math.random() * 0.2 });
      });
      if (lead && lead.x >= TIMING.stretchAt && stretchT < -1) { stretchT = tReal; banner = S.final_stretch; bannerT = 1.6; sfx.whoosh(); crowd('cheer', 3); sfx.music(1.18); }
    }
    function runnerPose(r, f, tm) {
      const p = { dy: 0, sx: 1, sy: 1, rot: 0, flip: false, em: null, emc: '#1b1f2a', sweat: false };
      if (tReal < 0) { // personality before the start
        if (f.persona === 'hop') { const h = Math.abs(Math.sin(tm * 9 + r.lane)); p.dy = -Math.round(h * 5); if ((tm * 2 + r.lane) % 3 < 1) p.em = '!'; p.emc = '#e8584a'; }
        else if (f.persona === 'proud') { p.rot = -0.08; p.sx = 1.06; p.sy = 1.06; if ((tm + r.lane) % 2.5 < 1.2) { p.em = '*'; p.emc = '#c47a08'; } }
        else { const s = Math.sin(tm * 3 + r.lane); p.sx = 1 - s * 0.06; p.sy = 1 + s * 0.08; if ((tm + r.lane) % 3 < 1) p.em = '~'; }
        return p;
      }
      const rc = race.clock;
      if (r.done) { const place = race.order.indexOf(r) + 1, since = tm - (stamps.find((s) => s.r === r)?.t ?? tm);
        if (place === 1) { p.dy = -Math.round(Math.abs(Math.sin(since * 9)) * 9); if (since > 0.2) p.em = '♪'; p.emc = '#e8584a'; if (Math.abs(Math.sin(since * 9)) > 0.97) sfx.hop(); }
        else if (place === race.racers.length) { p.sy = 0.9; p.sx = 1.06; p.rot = 0.06; if (since > 0.3) p.em = '…'; }
        else { p.dy = since % 1.2 < 0.15 ? -3 : 0; }
        return p; }
      if (rc - f.stumble < 0.35) { const k = (rc - f.stumble) / 0.35; p.rot = 0.28 * Math.sin(k * Math.PI); p.dy = 3 * Math.sin(k * Math.PI); p.em = '!?'; p.emc = '#e8584a'; }
      if (rc - f.burst < 0.6) { p.sx = 1.08; p.rot = -0.1; p.em = '!'; p.emc = '#c47a08'; }
      if (rc - f.glance < 0.35) p.flip = true;
      if (r.energy / r.pool < 0.35) p.sweat = true;
      return p;
    }
    function draw(dt) {
      const tm = tReal + 99;
      const camX = tReal < 0 ? 0 : Math.max(0, Math.min(DIST * PPM - W + 160, me.x * PPM - 200));
      // FOV-like push-in on bursts and in the Final Stretch (off with reduced motion)
      const zT = rm || tReal < 0 || me.done ? 1 : (race.clock - (R.get(me.key).burst) < 0.8 || stretchT > -1 ? 1.07 : 1.025);
      zoom += (zT - zoom) * Math.min(1, dt * 5);
      g.save();
      if (zoom !== 1) { const fy0 = LANE_Y[me.lane] - 20; g.translate(200, fy0); g.scale(zoom, zoom); g.translate(-200, -fy0); }
      if (shakeT > 0) g.translate(Math.round((Math.random() - 0.5) * shakeA * 2), Math.round((Math.random() - 0.5) * shakeA * 2)); else shakeA = 0;
      drawStadium(g, tm, camX, mood, rm);
      // track
      g.fillStyle = '#2a2236'; g.fillRect(0, TOP - 6, W, 6); g.fillStyle = '#c4573f'; g.fillRect(0, TOP, W, 236);
      const near = ((Math.floor(camX) % 48) + 48) % 48; g.fillStyle = '#b44c36';
      for (let y = TOP + 10; y < 344; y += 29) for (let x = -near - 48; x < W; x += 48) g.fillRect(x + ((((y - TOP) / 29) | 0) % 2) * 24, y, 14, 2);
      g.fillStyle = '#f3ead2'; for (const y of LINES) g.fillRect(0, y, W, 2);
      g.fillStyle = '#4f8a3a'; g.fillRect(0, 346, W, 14);
      for (let m = 0; m <= DIST; m += 10) { const x = m * PPM - camX + 40; if (x < -40 || x > W + 40) continue; g.fillStyle = '#f3ead2aa'; g.fillRect(x, TOP, 2, 232); g.fillStyle = '#fff'; g.font = '10px monospace'; g.textAlign = 'left'; g.fillText(m + 'm', x + 3, TOP + 10); }
      const fx = DIST * PPM - camX + 40; for (let y = TOP; y < 344; y += 6) for (let k = 0; k < 2; k++) { g.fillStyle = ((y / 6 + k) | 0) % 2 ? '#111' : '#fff'; g.fillRect(fx + k * 6, y, 6, 6); }
      // speed lines (scale with the player's speed)
      const sp = tReal > 0 && !me.done ? me.v / me.vTop : 0;
      if (sp > 0.3) { g.fillStyle = '#ffffff'; for (const l of speed.slice(0, rm ? 6 : 34)) { l.x -= dt * (1100 + 1500 * sp); if (l.x < -l.l) { l.x = W + Math.random() * 120; l.y = 50 + Math.random() * 290; } g.globalAlpha = (l.y < TOP ? 0.18 : 0.3) + 0.4 * sp; g.fillRect(l.x | 0, l.y | 0, l.l * sp | 0, l.l > 140 ? 2 : 1); } g.globalAlpha = 1; }
      // particles (dust, sparks)
      for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.t += dt; if (p.t > p.life) { parts.splice(i, 1); continue; } const k = p.t / p.life;
        if (p.k === 'dust') { p.wx += p.vx * dt; p.y += p.vy * dt; const s = 3 + k * 6; g.globalAlpha = 0.55 * (1 - k); g.fillStyle = '#e8c9a0'; g.fillRect((p.wx - camX) | 0, p.y | 0, s | 0, s | 0); }
        else { p.x += p.vx * dt; p.y += p.vy * dt; g.globalAlpha = 1 - k; g.fillStyle = p.c; g.fillRect(p.x | 0, p.y | 0, 4, 4); } }
      g.globalAlpha = 1;
      // runners
      const ord = liveOrder(race);
      for (const r of race.racers) {
        const f = R.get(r.key), fr = framesFor(r.species), moving = r.v > 0.2 && !r.done;
        const fi = moving ? Math.floor(f.ph || 0) % fr.length : 0, im = fr[fi], cx = r.x * PPM - camX + 48, fy = LANE_Y[r.lane] + 6;
        const p = runnerPose(r, f, tm), rv = moving ? r.v / r.vTop : 0;
        if (moving && !p.rot) p.rot = -0.07 - 0.07 * rv; // forward lean grows with speed
        const bob = moving ? -Math.round(Math.abs(Math.sin((f.ph || 0) * Math.PI)) * (2 + 3 * rv)) : 0;
        g.fillStyle = '#00000044'; g.fillRect(cx - 28, LANE_Y[r.lane] + 2, 56, 6);
        if (moving && rv > 0.45) for (let k = rm ? 1 : 3; k >= 1; k--) { g.globalAlpha = (rm ? 0.12 : 0.22) / k; sprite(g, im, cx - k * (10 + 14 * rv), fy + bob, SPR, { ...p, em: null }); } // afterimage trail
        g.globalAlpha = 1;
        sprite(g, im, cx, fy + bob, SPR, p);
        if (p.sweat) { const k = (tm * 2 + r.lane) % 1; g.fillStyle = '#9ad1ff'; g.fillRect(cx + 14 + k * 6, fy - 50 + k * 14, 3, 4); g.fillRect(cx - 18 - k * 5, fy - 44 + k * 12, 2, 3); }
        if (p.em) emote(g, cx + 20, fy - SPR - 2 + (p.dy || 0), p.em, p.emc);
      }
      // name + place tags in a second pass, in each runner's own lane just ahead of it (never on top of another sprite)
      for (const r of race.racers) {
        const cx = r.x * PPM - camX + 48, ly = LANE_Y[r.lane] - 34;
        const pl = tReal >= 0 ? (r.done ? race.order.indexOf(r) + 1 : ord.indexOf(r) + 1) : 0;
        const label = (r.isPlayer ? '▶ ' : '') + r.name; g.font = '10px monospace'; g.textAlign = 'left';
        const w = g.measureText(label).width + (pl ? 30 : 6), x = Math.min(W - w - 4, cx + SPR / 2 + 2);
        g.fillStyle = '#1b1f2abb'; g.fillRect(x, ly - 9, w, 13);
        if (pl) { g.font = 'bold 10px monospace'; g.fillStyle = PLACE_COL[pl][1]; g.fillText(S['place_' + pl], x + 3, ly); g.font = '10px monospace'; }
        g.fillStyle = r.isPlayer ? '#ffd77a' : '#f3ead2'; g.fillText(label, x + (pl ? 27 : 3), ly);
      }
      // near foreground layer (moves 1.6x the camera): rail posts + grass blades sell the speed
      { const fo = camX * 1.6; g.fillStyle = '#3d7a2e'; g.fillRect(0, 346, W, 14);
        for (let x = -((fo % 160) + 160) % 160 - 160; x < W + 40; x += 160) { g.fillStyle = '#e8e0cc'; g.fillRect(x, 340, 8, 20); g.fillStyle = '#a89f8a'; g.fillRect(x + 6, 340, 2, 20); }
        g.fillStyle = '#5fa848'; const bo = -((fo * 1.3 % 24) + 24) % 24; for (let x = bo - 24; x < W; x += 24) { g.fillRect(x, 350, 2, 10); g.fillRect(x + 9, 346, 2, 14); g.fillRect(x + 15, 352, 2, 8); } }
      // place stamps slam on at the line
      for (const s of stamps) { const k = (tReal - s.t) / 0.14, sc = k < 1 ? 3 - 2 * ease(k) : 1, x = Math.min(W - 40, fx - 40), y = LANE_Y[s.r.lane] - 26;
        g.save(); g.translate(x, y); g.scale(sc, sc); g.rotate(-0.12); bigText(g, S['place_' + s.place], 0, 0, 22, PLACE_COL[s.place]); g.restore(); }
      g.restore(); g.save(); // HUD and overlays sit outside the camera zoom/shake
      // HUD
      g.fillStyle = '#141a26cc'; g.fillRect(0, 0, W, 24);
      g.fillStyle = '#44506b'; g.fillRect(150, 10, 380, 4);
      for (const r of race.racers) { g.fillStyle = r.isPlayer ? '#ffd77a' : LANE_COL[r.lane]; g.fillRect(150 + (r.x / DIST) * 376, 6 + r.lane, 4, 10); }
      g.fillStyle = '#f3ead2'; g.font = '11px monospace'; g.textAlign = 'left'; g.fillText(showTime(Math.max(0, race.clock)).toFixed(1) + 's', 96, 16);
      if (tReal >= 0) { const pl = me.done ? race.order.indexOf(me) + 1 : ord.indexOf(me) + 1; bigText(g, S['place_' + pl], 30, 16, 18, PLACE_COL[pl]); g.fillStyle = '#f3ead2'; g.font = '10px monospace'; g.fillText('/' + race.racers.length, 54, 20); }
      g.fillText(S.stat_stamina, 540, 12); g.fillStyle = '#44506b'; g.fillRect(540, 16, 90, 4); g.fillStyle = me.energy / me.pool < 0.35 ? '#e8584a' : '#7fd27a'; g.fillRect(540, 16, 90 * (me.energy / me.pool), 4);
      g.textAlign = 'center';
      // countdown: 3-2-1 scale from huge down to normal, then GO! burst
      if (tReal >= -CD && tReal < 0) { const d = lastDigit, st0 = -CD + (3 - d) * TIMING.beat, u = tReal - st0, sc = 1 + 2.4 * (1 - ease(u / 0.22));
        g.save(); g.translate(W / 2, 100); g.scale(sc, sc); bigText(g, String(d), 0, 0, 56, d === 1 ? ['#fff', '#7ad25a', '#2a8a3a'] : undefined); g.restore();
        g.fillStyle = '#f3ead2'; g.font = '11px monospace'; g.fillText(S.tap_go, W / 2, 140); }
      if (tReal >= 0 && tReal - goT < 0.8 && me.inputs.start !== -1) { const u = (tReal - goT) / 0.8, sc = 0.6 + 0.8 * back(u * 3); g.save(); g.translate(W / 2, 100); g.scale(sc, sc);
        if (!rm) { g.fillStyle = '#ffc92855'; for (let i = 0; i < 12; i++) { g.save(); g.rotate(i / 12 * 6.28 + u); g.fillRect(0, -6, 160, 12); g.restore(); } }
        bigText(g, S.go, 0, 0, 64, ['#ffffff', '#7ad25a', '#1f7a3a']); g.restore(); }
      // push / sprint prompt
      if (st.prompt) { const p = pingPong((race.clock - st.prompt.t0) / TIMING.play), bx = W / 2 - 150;
        g.fillStyle = '#141a26dd'; g.fillRect(bx - 8, 46, 316, 56); g.fillStyle = '#f3ead2'; g.font = '12px monospace'; g.fillText(st.prompt.kind === 'push' ? S.push_prompt : S.sprint_prompt, W / 2, 62);
        g.fillStyle = '#44506b'; g.fillRect(bx, 72, 300, 18); g.fillStyle = '#7fd27a'; g.fillRect(bx + 300 * (0.5 - half), 72, 300 * half * 2, 18);
        g.fillStyle = '#ffd77a'; g.fillRect(bx + 300 * p - 2, 68, 4, 26); g.fillStyle = '#e86a5a'; g.fillRect(bx, 96, 300 * (1 - (race.clock - st.prompt.t0) / race.window), 3); }
      // Final Stretch banner slides across
      if (banner && bannerT > 0) { const u = 1 - bannerT / 1.6, x = u < 0.2 ? W + 200 - ease(u / 0.2) * (W / 2 + 200) : u > 0.8 ? W / 2 - ease((u - 0.8) / 0.2) * (W / 2 + 260) : W / 2;
        // Oct 29: takes the announcer row (announcer pauses meanwhile), never over the top lane (phone covered lane 1 at y 112-146)
        g.fillStyle = '#e8584a'; g.beginPath(); g.moveTo(x - 170, 22); g.lineTo(x + 186, 22); g.lineTo(x + 170, 48); g.lineTo(x - 186, 48); g.fill(); g.fillStyle = '#ffc928'; g.fillRect(x - 176, 22, 352, 2); g.fillRect(x - 186, 46, 352, 2);
        bigText(g, banner, x, 36, 20, ['#ffffff', '#fff3a0', '#ffc928']); }
      if (rating && ratingT > 0) bigText(g, rating, W / 2, 96, 20, ['#ffffff', '#ffd77a', '#e8a030']); // drawn after the banner, below it
      // FINISH! slash
      if (firstT > -1) { const u = tReal - firstT;
        if (u < 1.5) { const a = Math.min(1, u / 0.12), out = u > 1.2 ? (u - 1.2) / 0.3 : 0;
          g.save(); g.globalAlpha = 1 - out; g.translate(W / 2, 92); g.rotate(-0.12);
          g.fillStyle = '#1b1f2add'; g.fillRect(-W * a, -34, W * 2 * a, 68); g.fillStyle = '#ffc928'; g.fillRect(-W * a, -36, W * 2 * a, 4); g.fillRect(-W * a, 32, W * 2 * a, 4);
          const sc = u < 0.15 ? 2 - ease(u / 0.15) : 1; g.scale(sc, sc); bigText(g, S.finish, 0, 0, 62); g.restore(); }
        if (photo && u < 2.4 && u > 0.2) { g.fillStyle = '#ffffff'; g.font = 'bold 14px monospace'; g.fillText(S.ann_photo, W / 2, 140); }
      }
      if (recordT > -1 && tReal - recordT < 2.2) { const u = tReal - recordT, sc = u < 0.15 ? 2.5 - 1.5 * ease(u / 0.15) : 1; g.save(); g.translate(W / 2, 150); g.scale(sc, sc); bigText(g, S.new_record, 0, 0, 26, ['#ffffff', '#ff7ad2', '#7a4ae8']); g.restore(); }
      // announcer strip
      if (ann && annT > 0 && !(banner && bannerT > 0)) { g.fillStyle = '#141a26e6'; g.fillRect(0, 24, W, 20); g.fillStyle = '#ffc928'; g.fillRect(0, 42, W, 2); const shown = ann.slice(0, Math.ceil((ann.length * (1.8 - Math.max(0, annT - 0.0))) * 3)); g.fillStyle = '#f3ead2'; g.font = '12px monospace'; g.textAlign = 'left'; g.fillText('» ' + shown, 8, 38); g.textAlign = 'center'; }
      g.restore();
      if (flashT > 0) { g.fillStyle = `rgba(255,255,255,${(flashT / 0.12) * 0.6})`; g.fillRect(0, 0, W, H); }
      // wipe -> scoreboard
      if (wipeT >= 0) {
        wipeT += dt; if (wipeT >= TIMING.wipe && boardT < 0) { boardT = 0; st.fx = 'results'; }
        if (boardT >= 0) { boardT += dt; drawBoard(dt); }
        const p = wipeT < TIMING.wipe ? wipeT / TIMING.wipe : 1 + Math.min(1, (wipeT - TIMING.wipe) / TIMING.wipe);
        if (p < 2) checkerWipe(g, p);
        if (boardT > 5.5) finish();
      }
      st.fx = boardT >= 0 ? 'results' : firstT > -1 ? 'finish' : stretchT > -1 ? 'final_stretch' : tReal >= 0 ? 'race' : tReal >= -CD ? 'countdown' : 'intro';
    }
    let lastStop = 0, revealed = false;
    function drawBoard(dt) {
      const order = res.order, maxT = Math.max(...order.map((r) => r.finish)), el = boardT;
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#1d2a4a'); gr.addColorStop(1, '#0d1222'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.fillStyle = '#ffffff08'; for (let x = 0; x < W; x += 8) g.fillRect(x, 0, 1, H);
      g.fillStyle = '#ffc928'; g.fillRect(16, 12, W - 32, 3); g.fillRect(16, 250, W - 32, 3);
      g.textAlign = 'center'; bigText(g, S.results.toUpperCase(), W / 2, 32, 22, ['#ffffff', '#9ad1ff', '#4a6ae8']);
      let stopped = 0, ticking = false;
      order.forEach((r, i) => { // rows in finishing order (winner on top)
        const y = 62 + i * 46, v = tickValue(r.finish, maxT, el), done = v >= r.finish, place = i + 1;
        if (done) stopped++; else ticking = true;
        const win = revealed && place === 1;
        g.fillStyle = win ? '#ffc92833' : '#ffffff0c'; g.fillRect(24, y - 4, W - 48, 40);
        g.fillStyle = LANE_COL[r.lane]; g.fillRect(24, y - 4, 6, 40);
        const p = win ? { dy: -Math.round(Math.abs(Math.sin(el * 8)) * 6) } : place === order.length && revealed ? { sy: 0.92 } : {};
        sprite(g, framesFor(r.species)[0], 70, y + 36, 44, p);
        g.textAlign = 'left'; g.font = 'bold 14px monospace'; g.fillStyle = r.isPlayer ? '#ffd77a' : '#f3ead2'; g.fillText(r.name + (r.isPlayer ? ' (' + S.you + ')' : ''), 100, y + 20);
        g.fillStyle = '#000'; g.fillRect(380, y + 2, 120, 28); g.font = 'bold 20px monospace'; g.fillStyle = done ? '#ffc928' : '#ff6a4a'; g.textAlign = 'right'; g.fillText(showTime(v).toFixed(2) + 's', 494, y + 24);
        if (done) { const k = Math.min(1, (el - (r.finish / maxT) * TIMING.board) / 0.12), sc = 2.6 - 1.6 * ease(k); g.save(); g.translate(560, y + 16); g.scale(sc, sc); bigText(g, S['place_' + place], 0, 0, 20, PLACE_COL[place]); g.restore(); }
      });
      if (ticking) sfx.tick();
      if (stopped > lastStop) { sfx.stamp(); lastStop = stopped; }
      if (!ticking && !revealed) { revealed = true; sfx.fanfare(); if (res.place === 1) { conf = confettiSys(50, rm, 'p' + seed); crowd('roar'); } else crowd('cheer'); }
      if (revealed) {
        const w = order[0], u = el - TIMING.board, sc = u < 0.2 ? 2 - ease(u / 0.2) : 1;
        g.save(); g.translate(W / 2, 270); g.scale(sc, sc); bigText(g, t('winner', { name: w.name }), 0, 0, 22); g.restore();
        g.textAlign = 'left'; g.font = '12px monospace'; g.fillStyle = '#9ad1ff'; g.fillText(S.coach_name + ': ' + coachLine(res.ctx), 28, 302);
        g.fillStyle = '#ffd77a'; g.fillText(monLine(res.place, me.name) + (res.place === 1 ? '  ♪' : res.place === order.length ? '  …' : ''), 28, 322);
        if (res.place === 1 && !o.isFinal) { g.textAlign = 'right'; g.fillStyle = '#7ad25a'; g.fillText(S.you_won, W - 28, 322); }
        if (el > TIMING.board + 0.8) { g.textAlign = 'center'; g.fillStyle = '#f3ead2aa'; g.font = '10px monospace'; g.fillText(S.tap_continue, W / 2, 348); }
        conf?.draw(g, dt, el);
      }
    }
    requestAnimationFrame(frame);
  });
}

// ---------------- tournament champion screen ----------------
/** o: { ov, party:[species], playerSrc, name, id, time, coinsFrom, prize, reduced, audio, framesBig(sp) -> Image, st }. Resolves on tap after the count-up. */
export function runChampion(o) {
  const rm = o.reduced, sfx = makeSfx(o.audio);
  return new Promise((resolve) => {
    o.ov.innerHTML = `<canvas width="${W}" height="${H}" id="sports-champ"></canvas>`;
    const cv = o.ov.querySelector('canvas'), g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    const pat = document.createElement('canvas'); pat.width = pat.height = 32; const pg = pat.getContext('2d');
    pg.fillStyle = '#ff9a3c'; pg.fillRect(0, 0, 32, 32); pg.fillStyle = '#ffc928'; for (let i = -32; i < 64; i += 16) { pg.beginPath(); pg.moveTo(i, 0); pg.lineTo(i + 8, 0); pg.lineTo(i + 40, 32); pg.lineTo(i + 32, 32); pg.fill(); }
    pg.fillStyle = '#fff3a0'; pg.fillRect(4, 4, 2, 2); pg.fillRect(20, 20, 2, 2);
    const pattern = g.createPattern(pat, 'repeat');
    const hero = new Image(); hero.src = o.playerSrc;
    const mons = o.party.slice(0, 1).map((sp) => o.framesBig(sp)); // only the winning Kilumen (Gary Oct 29)
    const conf = confettiSys(140, rm, 'champ');
    let tm = 0, last = performance.now(), done = false, coinT = -1, shown = 0, flashed = false;
    o.st.tapFn = () => { if (shown >= o.prize && tm > 2.2) end(); };
    cv.addEventListener('pointerdown', (e) => { e.preventDefault(); o.st.tapFn?.(); });
    const end = () => { if (done) return; done = true; resolve(); };
    sfx.fanfare(); sfx.roar(); o.st.fx = 'champion';
    const frame = (now) => {
      if (done || !o.st.open) return;
      const dt = Math.min(0.1, (now - last) / 1000); last = now; tm += dt;
      // animated patterned background
      g.save(); const off = (tm * (rm ? 8 : 24)) % 32; g.translate(-off, -off); g.fillStyle = pattern; g.fillRect(0, 0, W + 32, H + 32); g.restore();
      // sweeping spotlight beams
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) { const base = i < 2 ? -40 : W + 40, ang = (i < 2 ? -0.9 : -2.24) + Math.sin(tm * (rm ? 0.4 : 1.1) + i * 1.7) * 0.35;
        const gr = g.createLinearGradient(base, H, base + Math.cos(ang) * 500, H + Math.sin(ang) * 500); gr.addColorStop(0, '#ffffffaa'); gr.addColorStop(1, '#ffffff00'); g.fillStyle = gr;
        g.beginPath(); g.moveTo(base, H + 10); g.lineTo(base + Math.cos(ang - 0.12) * 700, H + Math.sin(ang - 0.12) * 700); g.lineTo(base + Math.cos(ang + 0.12) * 700, H + Math.sin(ang + 0.12) * 700); g.fill(); }
      g.restore();
      // big gold medal as a background element on the right, 75% opacity, behind the player and team
      { const mx = W - 118, my = 168, rr = 92; g.save(); g.globalAlpha = 0.75;
        g.fillStyle = '#4a6ae8'; g.beginPath(); g.moveTo(mx - 70, -10); g.lineTo(mx - 20, -10); g.lineTo(mx + 10, my - rr + 10); g.lineTo(mx - 30, my - rr + 10); g.fill();
        g.fillStyle = '#e8584a'; g.beginPath(); g.moveTo(mx + 70, -10); g.lineTo(mx + 20, -10); g.lineTo(mx - 10, my - rr + 10); g.lineTo(mx + 30, my - rr + 10); g.fill();
        g.fillStyle = '#7a4a08'; g.beginPath(); g.arc(mx, my, rr, 0, 6.28); g.fill(); g.fillStyle = '#ffc928'; g.beginPath(); g.arc(mx, my, rr - 8, 0, 6.28); g.fill();
        g.strokeStyle = '#e8a030'; g.lineWidth = 6; g.beginPath(); g.arc(mx, my, rr - 22, 0, 6.28); g.stroke();
        g.fillStyle = '#fff3a0'; g.fillRect(mx - 52, my - 50, 22, 12); g.fillRect(mx - 58, my - 36, 10, 10);
        g.fillStyle = '#b8780a'; g.font = 'bold 96px monospace'; g.textAlign = 'center'; g.fillText('1', mx, my + 32);
        if (!rm && Math.sin(tm * 2.5) > 0.85) { g.fillStyle = '#fff'; g.fillRect(mx + 40, my - 64, 4, 22); g.fillRect(mx + 31, my - 55, 22, 4); }
        g.restore(); }
      // podium floor
      g.fillStyle = '#e8584a'; g.fillRect(0, 286, W, 6); g.fillStyle = '#b8402e'; g.fillRect(0, 292, W, 22);
      // team posed either side, big
      const slots = [[-150, 0]];
      mons.forEach((im, i) => { const [dx, dy] = slots[i]; const hop = rm ? 0 : Math.round(Math.abs(Math.sin(tm * 4 + i * 1.3)) * 6); sprite(g, im, W / 2 + dx, 292 + dy - hop - (dy ? 0 : 6), dy ? 96 : 128, { flip: dx > 0 }); });
      // player centred
      if (hero.complete && hero.naturalWidth) { const h = 200, w = h * hero.naturalWidth / hero.naturalHeight; g.drawImage(hero, Math.round(W / 2 - w / 2), 292 - h, w, h);
      }
      // banner
      const u = Math.min(1, tm / 0.35); g.save(); g.translate(W / 2, 40); g.scale(2 - ease(u), 2 - ease(u)); bigText(g, S.champ_title, 0, 0, 36); g.restore();
      if (tm > 0.3) bigText(g, S.champ_congrats, W / 2, 76, 22, ['#ffffff', '#ffe3f0', '#ff7ab0']);
      conf.draw(g, dt, tm);
      // bottom bar: name, ID, time, gold count-up
      g.fillStyle = '#1b1f2aee'; g.fillRect(0, 314, W, 46); g.fillStyle = '#ffc928'; g.fillRect(0, 314, W, 3);
      g.textAlign = 'left'; g.font = 'bold 13px monospace'; g.fillStyle = '#9ad1ff'; g.fillText(S.champ_name, 14, 334); g.fillText(S.champ_id, 160, 334); g.fillText(S.champ_time, 300, 334);
      g.fillStyle = '#f3ead2'; g.fillText(o.name, 14, 352); g.fillText(idText(o.id), 160, 352); g.fillText(showTime(o.time).toFixed(2) + 's', 300, 352);
      if (tm > 0.9 && coinT < 0) coinT = 0; if (coinT >= 0) { coinT += dt; const n = Math.min(o.prize, Math.round(o.prize * ease(coinT / 1.4))); if (n > shown) { shown = n; sfx.coin(); if (n >= o.prize && !flashed) { flashed = true; sfx.stamp(); } } }
      g.textAlign = 'right'; bigText(g, t('champ_gold', { n: shown.toLocaleString('en-US') }), 560, 336, 20); g.textAlign = 'right'; g.font = '11px monospace'; g.fillStyle = '#ffd77a';
      g.fillText(S.wallet + ' ' + (o.coinsFrom + shown).toLocaleString('en-US'), W - 12, 354);
      if (shown >= o.prize && tm > 2.2) { g.textAlign = 'center'; g.fillStyle = '#ffffffcc'; g.font = '10px monospace'; g.fillText(S.tap_continue, W / 2, 306); }
      o.st.champ = { shown, prize: o.prize, coinsFrom: o.coinsFrom };
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}

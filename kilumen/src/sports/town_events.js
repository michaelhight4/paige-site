// Town practice events (Oct 29 2026, Gary's list): one per town, each with its OWN mechanic (not a dash reskin).
// Pure logic, no DOM: create(seed, stats) -> state; step(state, dt, input) mutates; state.done / state.score / grade().
// input per frame: { left, right, up, down, tap } (true on the frame it was pressed) + { hold } (held). Rendering: town_ui.js.
// Brookhollow Dash stays in index.js (the original). Aurelith hosts the major competition (the tournament), not a practice.
// Ported mechanics (MIT, credit in THIRD_PARTY_LICENSES section (C)) from sausi-7/games:
//   glass-step     -> Garden Hop: each step is a left/right pair, exactly one holds (isLeftSafe = random < .5)
//   road-cross     -> Tide Run: lanes y = goal + (i + .5) * lane, speed = laneSpeed[i] + rand(-20,20) + (level-1)*12,
//                     dir alternates per lane, count = 2 + floor(level/2), wrap off-screen by a random 200-600
//   memory         -> Signal Relay: show the pattern with a 1000 ms lead and a 500 ms check delay
//   one-car        -> Ice Slide: obstacles fall at obstacleSpeed toward the player row; targets (gates) the same way
//   fruit-basket   -> Lantern Catch: spawn every 700 ms, fall 350 px/s and ramping, basket clamped to the play area,
//                     bombs (here soot puffs) cost a life
//   straight-rush  -> Forge Push: the ping-pong timing marker (already ported as pingPong in ported.js)
import { rngFor } from './rng.js?v=v0.2.61-alpha';
import { pingPong } from './ported.js?v=v0.2.61-alpha';

const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
const n01 = (stats, k) => cl((stats?.[k] ?? 50) / 100, 0, 1); // athletics stat -> 0..1

export const GRADES = ['gold', 'silver', 'bronze', 'none'];
const gradeBy = (score, [g, s, b]) => (score >= g ? 'gold' : score >= s ? 'silver' : score >= b ? 'bronze' : 'none');

// ---------- 2. Fernwick Garden Hop: timed jumps across lily pads and stepping stones ----------
const hop = {
  id: 'garden_hop', town: 'fernwick', region: 1, unit: 'pads', time: 35, bars: [70, 45, 25],
  create(seed, stats) {
    const r = rngFor(seed);
    return { r, t: 0, left: this.time, lives: 3, step: 0, score: 0, side: 0, bob: 0, window: 1.25 + 0.35 * n01(stats, 'agility'),
      hint: 0.35 + 0.45 * n01(stats, 'focus'), stepT: 0, pair: this.pair(r), fx: null, done: false, combo: 0 };
  },
  pair(r) { return { safeLeft: r() < 0.5, stone: r() < 0.3 }; }, // glass-step: isLeftSafe; a stone step is always safe on both sides
  step(s, dt, inp) {
    if (s.done) return; s.t += dt; s.left -= dt; s.stepT += dt; s.bob = (s.bob + dt * 2.2) % 1;
    if (s.fx) { s.fx.t -= dt; if (s.fx.t <= 0) s.fx = null; }
    const pick = inp.left ? 'L' : inp.right ? 'R' : null;
    if (pick && !s.fx) {
      const ok = s.pair.stone || (pick === 'L') === s.pair.safeLeft, onBeat = Math.abs(s.bob - 0.5) < 0.18; // jump as the pad rises
      if (ok) { s.combo++; s.score += onBeat ? 2 : 1; s.fx = { k: onBeat ? 'perfect' : 'land', side: pick, t: 0.22 }; }
      else { s.lives--; s.combo = 0; s.fx = { k: 'splash', side: pick, t: 0.6 }; }
      s.step++; s.stepT = 0; s.pair = this.pair(s.r);
    } else if (s.stepT > s.window && !s.fx) { s.lives--; s.combo = 0; s.fx = { k: 'sink', side: null, t: 0.6 }; s.step++; s.stepT = 0; s.pair = this.pair(s.r); } // waited too long: the pad sank
    if (s.lives <= 0 || s.left <= 0) s.done = true;
  },
};

// ---------- 3. Saltmere Tide Run: causeway obstacle run that beats the waves ----------
const tide = {
  id: 'tide_run', town: 'saltmere', region: 2, unit: 'crossings', time: 40, bars: [5, 3, 2],
  lanes: 5, laneSpeeds: [0.26, 0.34, 0.42, 0.3, 0.5], // play width per second (road-cross CAR_SPEEDS idea)
  create(seed, stats) {
    const r = rngFor(seed), s = { r, t: 0, left: this.time, level: 1, score: 0, row: this.lanes, x: 0.5, waves: [], stun: 0, done: false, hop: 0,
      dodge: 0.03 + 0.03 * n01(stats, 'agility'), tide: 0 };
    this.spawn(s); return s;
  },
  spawn(s) { // road-cross: per lane, speed + jitter + level ramp, alternate dir, 2 + floor(level/2) waves spaced across the width
    s.waves = [];
    for (let i = 0; i < this.lanes; i++) {
      const speed = this.laneSpeeds[i] + (s.r() * 40 - 20) / 1000 + (s.level - 1) * 0.012, dir = i % 2 === 0 ? 1 : -1, n = 2 + Math.floor(s.level / 2);
      for (let j = 0; j < n; j++) s.waves.push({ lane: i, dir, speed, x: j / n + (s.r() * 0.1 - 0.05), w: 0.16 });
    }
  },
  hit(s) { return s.row < this.lanes && s.waves.some((w) => w.lane === s.row && Math.abs(((w.x % 1) + 1) % 1 - s.x) < w.w / 2 + 0.04 - s.dodge); },
  step(s, dt, inp) {
    if (s.done) return; s.t += dt; s.left -= dt; s.tide = (s.tide + dt * 0.6) % 1;
    for (const w of s.waves) { w.x += w.dir * w.speed * dt; if (w.x > 1.3) w.x = -0.2 - s.r() * 0.4; if (w.x < -0.3) w.x = 1.2 + s.r() * 0.4; } // road-cross wrap
    if (s.stun > 0) { s.stun -= dt; } else {
      if (inp.up || inp.tap) { s.row--; s.hop = 0.15; }
      if (inp.down && s.row < this.lanes) s.row++;
      if (inp.left) s.x = cl(s.x - 0.1, 0.05, 0.95); if (inp.right) s.x = cl(s.x + 0.1, 0.05, 0.95);
      if (s.row < 0) { s.score++; s.level++; s.row = this.lanes; this.spawn(s); }
      else if (this.hit(s)) { s.stun = 0.7; s.row = Math.min(this.lanes, s.row + 2); s.washed = (s.washed || 0) + 1; } // the wave washes you back
    }
    if (s.hop > 0) s.hop -= dt;
    if (s.left <= 0) s.done = true;
  },
};

// ---------- 4. Revival Heights Signal Relay: team relay matching lab signals in sequence ----------
const relay = {
  id: 'signal_relay', town: 'revival_heights', region: 3, unit: 'signals', time: 60, bars: [45, 30, 15],
  keys: ['up', 'right', 'down', 'left'],
  create(seed, stats, team = 1) {
    const r = rngFor(seed), s = { r, t: 0, left: this.time, legs: Math.max(1, Math.min(4, team)), leg: 0, seq: [], pos: 0, phase: 'show', ph: 1.0, lit: -1, score: 0, miss: 0, done: false,
      showRate: 0.62 - 0.18 * n01(stats, 'focus') };
    this.grow(s); this.grow(s); this.grow(s); return s;
  },
  grow(s) { s.seq.push(Math.floor(s.r() * 4)); },
  step(s, dt, inp) {
    if (s.done) return; s.t += dt; s.left -= dt;
    if (s.phase === 'show') { // memory: a 1000 ms lead before the pattern, then one lamp per showRate
      s.ph -= dt; const k = Math.floor(-s.ph / s.showRate);
      s.lit = s.ph < 0 && k < s.seq.length ? s.seq[k] : -1;
      if (k >= s.seq.length) { s.phase = 'input'; s.pos = 0; s.lit = -1; }
    } else if (s.phase === 'input') {
      const k = this.keys.findIndex((d) => inp[d]);
      if (k >= 0) {
        s.lit = k; s.flash = 0.15;
        if (k === s.seq[s.pos]) { s.pos++; s.score++; if (s.pos >= s.seq.length) { s.phase = 'pass'; s.ph = 0.5; } } // memory: 500 ms check delay
        else { s.miss++; s.phase = 'fumble'; s.ph = 0.9; }
      }
      if (s.flash > 0 && (s.flash -= dt) <= 0) s.lit = -1;
    } else { // 'pass' = baton to the next teammate (longer pattern); 'fumble' = same runner retries the same pattern
      s.ph -= dt;
      if (s.ph <= 0) { if (s.phase === 'pass') { s.leg = (s.leg + 1) % s.legs; this.grow(s); } s.phase = 'show'; s.ph = 0.6; }
    }
    if (s.miss >= 3 || s.left <= 0) s.done = true;
  },
};

// ---------- 5. Frostspire Ice Slide: sliding and balance with slippery steering ----------
const ice = {
  id: 'ice_slide', town: 'frostspire', region: 4, unit: 'flags', time: 40, bars: [18, 11, 6],
  create(seed, stats) {
    return { r: rngFor(seed), t: 0, left: this.time, x: 0.5, vx: 0, bal: 0, speed: 0.42, objs: [], next: 0.6, score: 0, falls: 0, wobble: 0, done: false,
      grip: 0.4 + 0.5 * n01(stats, 'agility'), steady: 0.5 + 0.5 * n01(stats, 'stamina') };
  },
  step(s, dt, inp) {
    if (s.done) return; s.t += dt; s.left -= dt; s.speed = Math.min(0.85, 0.42 + s.t * 0.01);
    if (s.wobble > 0) s.wobble -= dt;
    const push = (inp.hold?.left ? -1 : 0) + (inp.hold?.right ? 1 : 0);
    s.vx += push * 1.5 * (0.6 + 0.4 * s.grip) * dt;              // steering is an acceleration, not a position: ice
    s.vx *= Math.pow(0.55 + 0.25 * s.grip, dt);                  // very little friction
    s.x += s.vx * dt;
    s.bal += (s.vx * 2.6 - s.bal * (1.2 + s.steady)) * dt;       // hard turns tip you; a steady creature rights itself
    if (s.x < 0.04 || s.x > 0.96) { s.x = cl(s.x, 0.04, 0.96); s.vx *= -0.4; s.bal += 0.3 * Math.sign(s.vx || 1); }
    if (Math.abs(s.bal) > 1) { s.falls++; s.bal = 0; s.vx = 0; s.wobble = 1; }
    s.next -= dt;
    if (s.next <= 0) { // one-car: spawn above, fall at obstacleSpeed; a gate (flag pair) or an ice crack
      const gate = s.r() < 0.6; s.objs.push({ y: -0.1, x: 0.15 + s.r() * 0.7, gate, w: gate ? 0.2 : 0.12 });
      s.next = 0.9 - Math.min(0.4, s.t * 0.008);
    }
    for (const o of s.objs) {
      o.y += s.speed * dt;
      if (!o.done && o.y >= 0.82) { o.done = true; const inside = Math.abs(o.x - s.x) < o.w / 2;
        if (o.gate && inside && s.wobble <= 0) s.score++; else if (!o.gate && inside) { s.falls++; s.wobble = 1; s.vx *= 0.3; } }
    }
    s.objs = s.objs.filter((o) => o.y < 1.1);
    if (s.falls >= 4 || s.left <= 0) s.done = true;
  },
};

// ---------- 6. Lanternport Lantern Catch: catch falling lights in a basket, rhythm-style ----------
const catchEv = {
  id: 'lantern_catch', town: 'lanternport', region: 7, unit: 'lights', time: 40, bars: [55, 35, 20],
  create(seed, stats) {
    return { r: rngFor(seed), t: 0, left: this.time, x: 0.5, items: [], lastSpawn: 0, spawnEvery: 0.7, fall: 0.62, lives: 3, score: 0, combo: 0, beat: 0.5, done: false,
      reach: 0.09 + 0.05 * n01(stats, 'agility'), move: 0.9 + 0.6 * n01(stats, 'speed'), fx: [] };
  },
  step(s, dt, inp) {
    if (s.done) return; s.t += dt; s.left -= dt;
    const dir = (inp.hold?.left ? -1 : 0) + (inp.hold?.right ? 1 : 0);
    if (inp.pointerX != null) s.x = cl(inp.pointerX, 0.08, 0.92); else s.x = cl(s.x + dir * s.move * dt, 0.08, 0.92); // fruit-basket: basket clamped
    if (s.t > s.lastSpawn + s.spawnEvery) { // fruit-basket: spawn on the interval (here on the harbour drum beat)
      s.lastSpawn = s.t; const soot = s.r() < Math.min(0.28, 0.08 + s.t * 0.004);
      s.items.push({ x: 0.1 + s.r() * 0.8, y: -0.05, soot, born: s.t });
      s.fall = Math.min(1.05, s.fall + 0.006); s.spawnEvery = Math.max(0.42, s.spawnEvery - 0.004); // ramps up
    }
    for (const it of s.items) {
      it.y += s.fall * dt;
      if (!it.gone && it.y >= 0.86 && it.y < 0.95 && Math.abs(it.x - s.x) < s.reach) {
        it.gone = true;
        if (it.soot) { s.lives--; s.combo = 0; s.fx.push({ k: 'soot', x: it.x, t: 0.5 }); }
        else { const onBeat = (inp.tap && Math.abs(it.y - 0.9) < 0.05); s.combo++; s.score += onBeat ? 3 : 1 + (s.combo >= 8 ? 1 : 0); s.fx.push({ k: onBeat ? 'perfect' : 'catch', x: it.x, t: 0.4 }); }
      }
      if (!it.gone && it.y >= 1.0) { it.gone = true; if (!it.soot) s.combo = 0; }
    }
    s.items = s.items.filter((i) => !i.gone && i.y < 1.05); s.fx = s.fx.filter((f) => (f.t -= dt) > 0);
    if (s.lives <= 0 || s.left <= 0) s.done = true;
  },
};

// ---------- 7. Cindervale Forge Push: strength cart push with timing bars ----------
const forge = {
  id: 'forge_push', town: 'cindervale', region: 8, unit: 'm', time: 30, bars: [60, 40, 24],
  create(seed, stats) {
    return { r: rngFor(seed), t: 0, left: this.time, dist: 0, v: 0, heat: 1, bt: 0, zone: 0.22, zc: 0.5, last: null, done: false, steam: 0,
      power: 0.8 + 0.5 * n01(stats, 'power'), rate: 0.9 + 0.25 * (1 - n01(stats, 'focus')) };
  },
  slope(d) { return 0.15 + 0.1 * Math.sin(d / 9) + d * 0.002; }, // the ramp up to the furnace gets steeper
  step(s, dt, inp) {
    if (s.done) return; s.t += dt; s.left -= dt; s.bt += dt;
    const m = pingPong(s.bt, s.rate + s.dist * 0.004);        // straight-rush ping-pong marker
    s.marker = m;
    if (inp.tap) {
      const off = Math.abs(m - s.zc);
      const q = off < s.zone * 0.25 ? 'perfect' : off < s.zone / 2 ? 'good' : 'miss';
      if (q !== 'miss') { s.v += (q === 'perfect' ? 3.2 : 2.0) * s.power * s.heat; s.heat = Math.max(0.45, s.heat - 0.04); }
      else { s.v *= 0.5; s.heat = Math.min(1, s.heat + 0.02); }
      s.last = { q, t: 0.4 }; s.zc = 0.25 + s.r() * 0.5; s.zone = Math.max(0.1, 0.22 - s.dist * 0.0015);
    }
    if (s.last && (s.last.t -= dt) <= 0) s.last = null;
    s.heat = Math.min(1, s.heat + dt * 0.05);                   // breath comes back slowly
    s.v = Math.max(-1.2, s.v - this.slope(s.dist) * 9 * dt);    // gravity on the ramp: stop pushing and it rolls back
    s.v *= Math.pow(0.6, dt); s.dist = Math.max(0, s.dist + s.v * dt);
    if (s.left <= 0) s.done = true;
  },
};
forge.score = (s) => Math.floor(s.dist);

export const EVENTS = [hop, tide, relay, ice, catchEv, forge];
export const eventFor = (town) => EVENTS.find((e) => e.town === town) || null;
export const eventById = (id) => EVENTS.find((e) => e.id === id) || null;
export const scoreOf = (ev, s) => (ev.score ? ev.score(s) : s.score);
export const gradeOf = (ev, s) => gradeBy(scoreOf(ev, s), ev.bars);
/** coach npc id per town map */
export const coachId = (town) => `${town}_practice_coach`;
/** saved bests: sports state .town { [eventId]: { best, plays, golds } } */
export function recordRun(sstate, ev, s) {
  const tw = (sstate.town ||= {}), r = (tw[ev.id] ||= { best: 0, plays: 0, golds: 0 }), sc = scoreOf(ev, s), g = gradeOf(ev, s);
  const isBest = sc > r.best; r.plays++; if (isBest) r.best = sc; if (g === 'gold') r.golds++;
  return { score: sc, grade: g, best: r.best, isBest };
}

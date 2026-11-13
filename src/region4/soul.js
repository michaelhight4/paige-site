// Region 4 (Frostspire) "soul" layer, dev/region4-station, Oct 29 2026 (Coder, v6 items 5 + 7; SOUL_PLAYBOOK.md).
// Drawn through the existing living-world slots (scene.view() is wrapped; nothing in the renderer changes):
//   over: breath puffs on every person + creature, NPC routines (shovelling villager, kid on a sled, climber warming
//         hands by the lamp), creature shiver, NPC idle bob
//   top:  gentle parallax snowfall (pass above the snowline + town only), wind tied to the living-world gust,
//         ~40% of the flakes on phones, none with reduced motion
// Audio (WebAudio, no files): snow footstep crunch, ambience = thin-air hush (soft wind bed rising on gusts) + a far
// glass bell every 14-26 s. Uses the game's audio settings (muted / sfx volume) and only plays once audio is unlocked.
// Pure helpers are exported for tests. Never saves; no player text here.
export const SOUL_MAPS = new Set(['frostspire', 'frostspire_pass']);
export const SNOWFALL_MAPS = new Set(['frostspire', 'frostspire_pass']);
export const ROUTINES = { frostspire_villager_1: 'shovel', frostspire_kid_sledder: 'sled', frostspire_climber: 'warm_hands' };
const TILE = 64;
/** Same gust curve as living.js (1..1.6). */
export const gust = (t) => 1 + 0.6 * Math.max(0, Math.sin(t / 420)) * Math.max(0, Math.sin(t / 97));
/** Flake count for a screen: phones get ~40%, reduced motion none. */
export const flakeCount = (w, h, mobile, reduced) => (reduced ? 0 : Math.round(Math.min(160, (w * h) / 9000) * (mobile ? 0.4 : 1)));
/** Snowfall strength 0..1 on a map at player tile y (pass: fades out over 3 rows above the snowline). */
export function snowfallAt(mapName, y, snowlineY) {
  if (!SNOWFALL_MAPS.has(mapName)) return 0;
  if (mapName !== 'frostspire_pass' || snowlineY == null) return 1;
  return Math.max(0, Math.min(1, (snowlineY + 1 - y) / 4));
}
/** Is a ground tile name snow (crunchy footsteps)? */
export const isSnowGround = (n) => /^(snow|xs_snow|x_snow|x_snowline|path>snow)/.test(n || '');

export function attachSoul(scene, { mobile = false } = {}) {
  const reduced = () => !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !!globalThis.document?.body?.classList.contains('ui-reduce');
  const st = { puffs: [], flakes: [], lastTile: null, nextBell: 0, amb: null, sparks: [] };
  const on = () => SOUL_MAPS.has(scene.map?.name);
  const tnow = () => scene.tick || 0;
  const night = () => { const h = scene.hour ?? 12; return h >= 19 || h < 6; };

  // ---- actors: shiver + idle bob (pure transforms on the view's actor objects) -----------------------------------
  function tweakActors(v) {
    const t = tnow(), ms = scene.ms || 0;
    for (const a of v.actors) {
      if (a.follower) { // creatures react to the cold: a quick shiver every ~5 s, stronger on gusts
        const c = (t + (a.follower.length * 37)) % 300;
        if (c < 18) a.px += (c & 2 ? 1 : -1) * (gust(t) > 1.3 ? 2 : 1);
      } else if (a.npc && !a.lift) {
        const r = ROUTINES[a.npc];
        if (r === 'sled') { a.px += Math.round(Math.sin(ms / 900) * 26); } // kid sledding back and forth down the bank
        else if (r === 'shovel') { const c = ms % 1400; a.lift = c < 160 ? 2 : 0; } // dig dip
        else { const c = (ms + a.npc.length * 211) % 3200; if (c < 260) a.py -= 1; } // idle breath bob
      }
    }
  }
  // ---- breath puffs ----------------------------------------------------------------------------------------------
  function breathe(v) {
    const ms = scene.ms || 0, cold = night() ? 1.3 : 1;
    for (const a of v.actors) {
      if (!(a.npc || a.follower || a.anim !== undefined)) continue;
      const key = a.npc || a.follower || 'player', per = a.follower ? 2300 : 1900, ph = (key.length * 331) % per;
      if (Math.floor((ms + ph) / per) !== Math.floor((ms + ph - 34) / per)) {
        const face = { 0: [0, 1], 1: [-1, 0], 2: [1, 0], 3: [0, -1] }[a.row] || [0, 1];
        st.puffs.push({ x: a.px + 32 + face[0] * 12, y: a.py + (a.follower ? 30 : 18), vx: face[0] * 0.25, born: ms, life: 900 * cold });
      }
    }
    st.puffs = st.puffs.filter((p) => ms - p.born < p.life).slice(-60);
  }
  function drawPuffs(ctx, v) {
    const z = v.zoom, ms = scene.ms || 0, g = gust(tnow());
    for (const p of st.puffs) {
      const f = (ms - p.born) / p.life, x = (p.x + p.vx * f * 40 + f * 6 * g - v.cam.x) * z, y = (p.y - f * 10 - v.cam.y) * z;
      const r = Math.round((2 + f * 4) * z * 0.5) * 2;
      ctx.fillStyle = `rgba(150,170,200,${(0.35 * (1 - f)).toFixed(3)})`; ctx.fillRect(Math.round(x - r / 2) + 1, Math.round(y - r / 2) + 2, r, r);
      ctx.fillStyle = `rgba(250,252,255,${(0.8 * (1 - f)).toFixed(3)})`;
      ctx.fillRect(Math.round(x - r / 2), Math.round(y - r / 2), r, r);
      ctx.fillRect(Math.round(x - r / 2 + r * 0.6), Math.round(y - r * 0.8), Math.round(r * 0.6), Math.round(r * 0.6));
    }
  }
  // ---- NPC routine props -----------------------------------------------------------------------------------------
  function drawRoutines(ctx, v) {
    const z = v.zoom, ms = scene.ms || 0, px = (n) => Math.max(1, Math.round(n * z));
    for (const a of v.actors) {
      const r = a.npc && ROUTINES[a.npc]; if (!r) continue;
      const bx = (a.px - v.cam.x) * z, by = (a.py - v.cam.y) * z;
      if (r === 'shovel') { // shovel blade + a clod of snow arcing off it every dig
        const c = (ms % 1400) / 1400, ang = c < 0.15 ? 0.9 : 0.2;
        ctx.save(); ctx.translate(bx + 44 * z, by + 40 * z); ctx.rotate(ang);
        ctx.fillStyle = '#6b4a2e'; ctx.fillRect(0, -px(14), px(2), px(18)); ctx.fillStyle = '#9aa4b4'; ctx.fillRect(-px(3), px(4), px(8), px(5)); ctx.restore();
        if (c > 0.15 && c < 0.7) { const k = (c - 0.15) / 0.55; ctx.fillStyle = '#f4f8ff'; ctx.fillRect(bx + (46 + k * 26) * z, by + (40 - Math.sin(k * Math.PI) * 22) * z, px(4), px(3)); ctx.fillRect(bx + (50 + k * 22) * z, by + (42 - Math.sin(k * Math.PI) * 16) * z, px(2), px(2)); }
      } else if (r === 'sled') { // wooden sled under the kid + snow spray behind
        const dir = Math.cos(ms / 900) >= 0 ? 1 : -1;
        ctx.fillStyle = '#8c5a32'; ctx.fillRect(bx + 14 * z, by + 56 * z, px(36), px(4)); ctx.fillStyle = '#c23a2c'; ctx.fillRect(bx + 14 * z, by + 60 * z, px(36), px(2));
        ctx.fillStyle = 'rgba(244,248,255,.85)'; for (let i = 0; i < 4; i++) ctx.fillRect(bx + (32 - dir * (22 + i * 5)) * z, by + (58 - (i % 2) * 3 - ((ms / 60 + i) % 3)) * z, px(2), px(2));
      } else if (r === 'warm_hands') { // warm glow at the hands + rising heat motes
        const k = 0.75 + 0.25 * Math.sin(ms / 180);
        const gr = ctx.createRadialGradient(bx + 32 * z, by + 40 * z, 0, bx + 32 * z, by + 40 * z, 26 * z);
        gr.addColorStop(0, `rgba(255,190,100,${(0.35 * k).toFixed(3)})`); gr.addColorStop(1, 'rgba(255,190,100,0)');
        ctx.fillStyle = gr; ctx.fillRect(bx + 6 * z, by + 14 * z, 52 * z, 52 * z);
        ctx.fillStyle = '#ffcf7a'; for (let i = 0; i < 3; i++) { const f = ((ms / 1100) + i / 3) % 1; ctx.globalAlpha = 1 - f; ctx.fillRect(bx + (28 + i * 4 + Math.sin(f * 6 + i) * 2) * z, by + (40 - f * 18) * z, px(1.5), px(1.5)); } ctx.globalAlpha = 1;
        // rubbing hands: two little mitten blips alternating
        const s = Math.sin(ms / 90) > 0 ? 1 : -1; ctx.fillStyle = '#b8443a'; ctx.fillRect(bx + (29 + s) * z, by + 42 * z, px(3), px(3)); ctx.fillRect(bx + (33 - s) * z, by + 42 * z, px(3), px(3));
      }
    }
  }
  // ---- snowfall (parallax) ---------------------------------------------------------------------------------------
  function drawSnow(ctx, v) {
    const k = snowfallAt(scene.map?.name, scene.player?.y ?? 0, scene.map?.json?.snowline_y);
    if (k <= 0) return;
    const W = ctx.canvas.width, H = ctx.canvas.height, n = Math.round(flakeCount(W, H, mobile, reduced()) * k);
    while (st.flakes.length < n) st.flakes.push({ x: Math.random(), y: Math.random(), d: [0.35, 0.6, 1][st.flakes.length % 3], ph: Math.random() * 6.28 });
    const ms = scene.ms || 0, g = gust(tnow()), z = v.zoom;
    for (let i = 0; i < n; i++) {
      const f = st.flakes[i], sz = Math.max(2, Math.round((1.5 + f.d * 2.5) * z * 0.5));
      // parallax: near flakes (d=1) move with the camera more than far ones; wind pushes harder in a gust
      const sx = (f.x * (W + 40) - v.cam.x * z * f.d * 0.5 + ms * 0.012 * g * f.d * z + Math.sin(ms / 700 + f.ph) * 6 * z) % (W + 40);
      const sy = (f.y * (H + 40) - v.cam.y * z * f.d * 0.5 + ms * 0.02 * f.d * z) % (H + 40);
      const fx = Math.round((sx + W + 40) % (W + 40)) - 20, fy = Math.round((sy + H + 40) % (H + 40)) - 20;
      ctx.fillStyle = `rgba(92,112,148,${(0.18 + 0.2 * f.d).toFixed(2)})`; ctx.fillRect(fx + 1, fy + 1, sz, sz); // soft shade so flakes read against white snow
      ctx.fillStyle = `rgba(255,255,255,${(0.6 + 0.4 * f.d).toFixed(2)})`; ctx.fillRect(fx, fy, sz, sz);
    }
  }
  // ---- audio -----------------------------------------------------------------------------------------------------
  const au = () => { const a = scene.audio || globalThis.kilumen?.audio; const ctx = globalThis.Howler?.ctx; if (!a?.unlocked || !ctx || a.settings?.muted) return null; return { a, ctx, out: globalThis.Howler.masterGain || ctx.destination, vol: (a.settings?.sfx ?? 1) }; };
  function noiseBuf(ctx, sec) { const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * sec), ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }
  function crunch() {
    const A = au(); if (!A || A.vol <= 0) return; const { ctx, out } = A, t = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = st.nb ||= noiseBuf(ctx, 0.12);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800 + Math.random() * 900; bp.Q.value = 0.9;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16 * A.vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    s.connect(bp).connect(g).connect(out); s.start(t); s.stop(t + 0.12);
  }
  function bell() {
    const A = au(); if (!A) return; const { ctx, out } = A, t = ctx.currentTime, f0 = [1568, 1760, 2093][Math.floor(Math.random() * 3)];
    for (const [m, v, d] of [[1, 0.05, 3.2], [2.76, 0.025, 1.8], [5.4, 0.012, 0.9]]) {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f0 * m;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v * A.vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(out); o.start(t); o.stop(t + d + 0.05);
    }
  }
  function ambience(want) {
    const A = au();
    if (!want || !A) { if (st.amb) { try { st.amb.g.gain.setTargetAtTime(0, st.amb.ctx.currentTime, 0.4); const s = st.amb.s; setTimeout(() => { try { s.stop(); } catch { /* gone */ } }, 1500); } catch { /* ctx gone */ } st.amb = null; } return; }
    if (!st.amb) {
      const { ctx, out } = A, s = ctx.createBufferSource(); s.buffer = noiseBuf(ctx, 4); s.loop = true;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; const g = ctx.createGain(); g.gain.value = 0;
      s.connect(lp).connect(g).connect(out); s.start(); st.amb = { ctx, s, lp, g };
    }
    const k = gust(tnow()), t = st.amb.ctx.currentTime; // thin air: a very low bed that swells with the gust
    st.amb.g.gain.setTargetAtTime((0.012 + 0.03 * (k - 1)) * A.vol, t, 0.6); st.amb.lp.frequency.setTargetAtTime(420 + 500 * (k - 1), t, 0.6);
  }
  // ---- per-tick (1 s timer + footstep poll) --------------------------------------------------------------------------
  function poll() {
    const p = scene.player; if (!p || !on()) { st.lastTile = null; return; }
    const key = p.x + ',' + p.y;
    if (st.lastTile && key !== st.lastTile && isSnowGround(scene.map?.tileName?.('ground', p.x, p.y) ?? nameAt(p.x, p.y))) crunch();
    st.lastTile = key;
  }
  const nameAt = (x, y) => { const id = scene.map?.tile?.('ground', x, y); return scene.tileset?.byId?.get(id)?.name; };
  const stepTimer = setInterval(poll, 60);
  const ambTimer = setInterval(() => {
    const want = on() && !scene.battle && !globalThis.document?.hidden; ambience(want);
    const now = performance.now(); if (want && now > st.nextBell) { if (st.nextBell) bell(); st.nextBell = now + 14000 + Math.random() * 12000; }
  }, 1000);

  // ---- hook scene.view ---------------------------------------------------------------------------------------------
  const view0 = scene.view.bind(scene);
  scene.view = () => {
    const v = view0();
    if (!on()) return v;
    tweakActors(v); breathe(v);
    const life = v.life;
    v.life = {
      under: (c, vv) => life?.under?.(c, vv),
      over: (c, vv) => { life?.over?.(c, vv); drawRoutines(c, vv); drawPuffs(c, vv); },
      top: (c, vv) => { life?.top?.(c, vv); drawSnow(c, vv); },
    };
    return v;
  };
  return { st, crunch, bell, stop: () => { clearInterval(stepTimer); clearInterval(ambTimer); ambience(false); scene.view = view0; } };
}

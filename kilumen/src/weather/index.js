// Weather v1 runtime: picks the weather per area type from the game clock (logic.js), eases it in / out, draws it
// (fx.js), exposes scene.weather {kind(), fishMods(), snowMul()} to the encounter roller, fishing and soul.js snow,
// a small HUD chip next to the clock, and an optional WebAudio rain bed (same Howler context as region4/soul.js).
// Save: systems.state.weather {seed, override} rides the normal systems block; nothing here calls save, so the
// existing save lock (battles, talks, cutscenes refuse saves) still decides when it is written.
// Dev: ?wx=clear|fog|rain_light|rain_heavy|storm|snow_light|ice_fog|blizzard forces a kind (not saved); ?wx=0 = off.
import { weatherFor, areaType, fishMods, normaliseWeather, RAINY, FOGGY, TEXT } from './logic.js?v=v0.2.68-alpha';
import { createWeatherFx } from './fx.js?v=v0.2.68-alpha';
import { isIndoor } from '../overworld/clock.js?v=v0.2.68-alpha';
import { gust } from '../region4/soul.js?v=v0.2.68-alpha';

const EASE_MS = 4000; // smooth start / stop (real ms)
const ICON = { clear: '☀', fog: '≋', rain_light: '☂', rain_heavy: '☂', storm: '⚡', snow_light: '❄', ice_fog: '≋', blizzard: '❄' };

export function installWeather(scene, { query = null, mobile = false } = {}) {
  const force = query?.get?.('wx');
  const fx = createWeatherFx({ mobile });
  const sysState = () => scene.systems?.state;
  const state = () => { const s = sysState(); if (!s) return st.mem; if (!s.weather || s.weather.seed == null) { s.weather = normaliseWeather(s.weather); scene._dirty = true; } return s.weather; };
  const st = { mem: normaliseWeather(null), shown: 'clear', k: 0, lastNow: 0, forced: force && force !== '0' ? force : null, amb: null };
  const reduced = () => !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !!globalThis.document?.body?.classList.contains('ui-reduce');
  const outdoor = () => !!scene.map && !isIndoor(scene.map.name);
  const target = () => (st.forced || weatherFor(state(), scene.map?.name, scene.clock, outdoor()));

  const api = {
    /** Current gameplay kind (what the roller / fishing use: the target, not the eased visual). */
    kind: () => target(),
    area: () => areaType(scene.map?.name),
    fishMods: () => fishMods(target()),
    /** soul.js snowfall multiplier: light snow a touch denser, blizzard dense. */
    snowMul: () => (st.shown === 'blizzard' ? 1 + 1.2 * st.k : 1),
    set: (kind) => { st.forced = kind || null; return api.kind(); }, // dev / shots
    setOverride: (area, kind) => { const s = state(); s.override = { ...s.override, [area]: kind }; Object.assign(s, normaliseWeather(s)); scene._dirty = true; },
    debug: () => ({ target: target(), shown: st.shown, k: +st.k.toFixed(2), area: api.area(), seed: state().seed }),
    st,
  };
  scene.weather = api;

  // ease: fade the shown kind out, swap, fade the new one in
  function tickEase() {
    const now = performance.now(), dt = st.lastNow ? Math.min(100, now - st.lastNow) : 16; st.lastNow = now;
    const t = outdoor() ? target() : 'clear';
    if (t !== st.shown) { st.k = Math.max(0, st.k - dt / EASE_MS); if (st.k <= 0) st.shown = t; }
    else st.k = Math.min(1, st.k + dt / EASE_MS);
    if (scene._wxFirst !== false) { scene._wxFirst = false; st.shown = t; st.k = query?.get?.('wxease') === '1' ? 0 : 1; } // load into the saved weather, no fade
    // living world: wet = fish dive, no butterflies / birds; fog = overcast clouds
    const lw = scene.life, want = RAINY.has(st.shown) && st.k > 0.3 ? 'rain' : (FOGGY.has(st.shown) || st.shown === 'blizzard') && st.k > 0.3 ? 'overcast' : null;
    if (lw?.setWeather && want !== st.lwSet) { st.lwSet = want; lw.setWeather(want || st.lw0 || 'fair'); }
  }
  st.lw0 = scene.life?.weather || 'fair';

  const view0 = scene.view.bind(scene);
  scene.view = () => {
    const v = view0();
    tickEase();
    if (!outdoor() && st.k <= 0) return v;
    const life = v.life, W = { kind: st.shown, k: st.k, ms: scene.ms, gust: gust(scene.tick || 0), reduced: reduced(), onFlash: thunder };
    v.life = { under: (c, vv) => life?.under?.(c, vv), over: (c, vv) => life?.over?.(c, vv), top: (c, vv) => { life?.top?.(c, vv); const t0 = st.prof ? performance.now() : 0; fx.draw(c, vv || v, W); if (st.prof) st.prof.push(performance.now() - t0); } };
    return v;
  };

  // HUD chip beside the clock (placeholder text keys weather.*)
  const T = (k) => (globalThis.kilumen?.text?.(k) || TEXT[k]?.[0] || k);
  let chip = null, chipTxt = '';
  const hud = setInterval(() => {
    const top = globalThis.kilumen?.ui?.hudTop; if (!top || typeof document === 'undefined') return;
    if (!chip) { chip = document.createElement('div'); chip.className = 'hud-clock hud-wx'; chip.style.marginLeft = '6px'; top.querySelector('.hud-clock')?.after(chip) ?? top.appendChild(chip); }
    const k = outdoor() ? target() : null, txt = k ? `${ICON[k] || ''} ${T('weather.' + k)}` : '';
    if (txt !== chipTxt) { chipTxt = txt; chip.textContent = txt; chip.hidden = !k; chip.dataset.kind = k || ''; }
    ambience();
  }, 500);

  // optional audio: filtered-noise rain bed, wind bed in a blizzard, a low rumble on lightning
  const au = () => { const a = scene.audio || globalThis.kilumen?.audio, ctx = globalThis.Howler?.ctx; if (!a?.unlocked || !ctx || a.settings?.muted) return null; return { ctx, out: globalThis.Howler.masterGain || ctx.destination, vol: a.settings?.sfx ?? 1 }; };
  const noise = (ctx) => { const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; };
  function ambience() {
    const A = au(); const lvl = !A || scene.battle || globalThis.document?.hidden ? 0 : ({ rain_light: 0.05, rain_heavy: 0.09, storm: 0.11, blizzard: 0.07 }[st.shown] || 0) * st.k * (A?.vol ?? 0);
    if (!A) return;
    if (!st.amb && lvl > 0) { const { ctx, out } = A, s = ctx.createBufferSource(); s.buffer = st.nb ||= noise(ctx); s.loop = true; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; const g = ctx.createGain(); g.gain.value = 0.0001; s.connect(f).connect(g).connect(out); s.start(); st.amb = { s, f, g }; }
    if (st.amb) { const t = A.ctx.currentTime; st.amb.f.frequency.setTargetAtTime(st.shown === 'blizzard' ? 700 : 2400, t, 0.5); st.amb.g.gain.setTargetAtTime(Math.max(0.0001, lvl), t, 0.8); }
  }
  function thunder() {
    const A = au(); if (!A) return; const { ctx, out, vol } = A, t = ctx.currentTime + 0.4 + Math.random() * 0.8;
    const s = ctx.createBufferSource(); s.buffer = st.nb ||= noise(ctx); const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 160; const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25 * vol, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
    s.connect(f).connect(g).connect(out); s.start(t); s.stop(t + 2.3);
  }
  return { api, fx, stop: () => { clearInterval(hud); scene.view = view0; chip?.remove(); try { st.amb?.s.stop(); } catch {} } };
}

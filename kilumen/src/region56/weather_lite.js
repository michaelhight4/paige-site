// Kilumen R5-6 weather lite (Animator package, art/world/weather/r56/weather_lite_README.md). Weather is a DOM layer of
// compositor-only CSS animations (weather_lite.css) between the backdrop and the sprites/HUD:
//   backdrop canvas (or the battle .bg div)  ->  <div class="wx wx-rain|wx-storm|wx-fog">  ->  sprite/HUD canvas (or .b-field)
// so fog sits under the HP cards and sprites (Gary's battle rule). Nothing here runs per frame: classes change only when the
// weather changes, lightning is a JS timer (6-14 s) with a hard cap of 3 flashes per 10 s at <= 0.55, and pausing the
// game sets animation-play-state:paused. ?wx=rain|storm|fog|none overrides (dev/preview).
export const WX_DIR = 'art/world/weather/r56/';
export const WEATHERS = ['rain', 'storm', 'fog'];
export const FLASH = { max: 0.55, cap: 3, windowMs: 10000, everyS: [6, 14], seq: [[60, 0.55], [50, 0], [70, 0.35], [220, 'fade']] };
const R56_MAPS = /^(mirefen|mirefen_bog|route_saltmere_mirefen|route_sunmeadow_mirefen|sunmeadow_fields|route_revival_sunmeadow|tidewater_coast|route_coast)(_storm)?$/;

/** Which lite weather an R5/R6 outdoor map shows: storm on the storm variant or in storm season east of Fernwick, rain when
 *  the living world says rain, else none. Fog is opt-in only (?wx=fog) until Gary OKs ambient fog (weather_spec.json). */
export function weatherFor({ map = '', flags = null, life = null, override = null } = {}) {
  if (override && (WEATHERS.includes(override) || override === 'none')) return override === 'none' ? null : override;
  if (!R56_MAPS.test(map)) return null;
  if (/_storm$/.test(map) || flags?.has?.('storm_season')) return 'storm';
  if (life === 'rain') return 'rain';
  return null;
}

const markup = (w, bolt) => w === 'fog' ? '<div class="mv band a"></div><div class="mv band b"></div>'
  : '<div class="mv ox"><div class="mv oy"></div></div>' + (w === 'storm'
    ? `<div class="wx-tint"></div><div class="wx-flash"><div class="w"></div><img alt="" src="${WX_DIR}lightning_bolt_${bolt}.webp"></div>` : '');

/** Flash limiter: true when one more flash fits (<= cap in any windowMs window). Pure, for tests. */
export function flashAllowed(times, now, { cap = FLASH.cap, windowMs = FLASH.windowMs } = {}) {
  return times.filter((t) => now - t < windowMs).length < cap;
}

/**
 * Mount the weather layer. `before` = the element the .wx div goes in front of (sprites/HUD), so it lands right after the
 * backdrop. Returns { el, set(weather), pause(on), reduceFlashing(on), destroy(), flashes }.
 * env (tests): { doc, setTimeout, clearTimeout, now, random }.
 */
export function mountWeather(parent, { before = null, weather = null, reduceFlashing = false, env = {} } = {}) {
  const doc = env.doc || globalThis.document;
  const st = env.setTimeout || globalThis.setTimeout.bind(globalThis), ct = env.clearTimeout || globalThis.clearTimeout.bind(globalThis);
  const now = env.now || (() => performance.now()), rnd = env.random || Math.random;
  const el = doc.createElement('div'); el.className = 'wx'; el.setAttribute('aria-hidden', 'true');
  parent.insertBefore(el, before && before.parentNode === parent ? before : null);
  let cur = null, paused = false, noFlash = !!reduceFlashing, timer = null, seqTimers = [], destroyed = false;
  const flashes = []; // timestamps of every flash pulse shown (for the cap and tests)
  const flashEl = () => el.querySelector('.wx-flash');
  const stopLightning = () => { if (timer) ct(timer); timer = null; for (const t of seqTimers) ct(t); seqTimers = []; const f = flashEl(); if (f) { f.style.transition = ''; f.style.opacity = '0'; } };
  const schedule = () => {
    stopLightning();
    if (cur !== 'storm' || paused || noFlash || destroyed) return;
    const [a, b] = FLASH.everyS; timer = st(strike, Math.round((a + rnd() * (b - a)) * 1000));
  };
  const pulse = (a) => { const f = flashEl(); if (!f) return; const t = now();
    if (a > 0) { if (!flashAllowed(flashes, t)) { f.style.opacity = '0'; return; } flashes.push(t); while (flashes.length > 12) flashes.shift(); }
    f.style.transition = ''; f.style.opacity = String(Math.min(FLASH.max, a)); };
  function strike() {
    timer = null; if (cur !== 'storm' || paused || noFlash) return;
    const img = flashEl()?.querySelector('img'); if (img) img.src = `${WX_DIR}lightning_bolt_${Math.floor(rnd() * 3)}.webp`;
    let at = 0;
    for (const [ms, a] of FLASH.seq) {
      const go = a === 'fade' ? () => { const f = flashEl(); if (f) { f.style.transition = `opacity ${ms}ms linear`; f.style.opacity = '0'; } } : () => pulse(a);
      seqTimers.push(st(go, at)); at += ms;
    }
    seqTimers.push(st(() => { seqTimers = []; schedule(); }, at));
  }
  const cls = () => { el.className = 'wx' + (cur ? ` wx-${cur}` : '') + (paused ? ' wx-paused' : '') + (noFlash ? ' reduce-flashing' : ''); el.hidden = !cur; };
  const api = {
    el, flashes,
    get weather() { return cur; },
    set(w) { w = WEATHERS.includes(w) ? w : null; if (w === cur) return api; stopLightning(); cur = w; el.innerHTML = w ? markup(w, Math.floor(rnd() * 3)) : ''; cls(); schedule(); return api; },
    pause(on) { on = !!on; if (on === paused) return api; paused = on; cls(); schedule(); return api; },
    reduceFlashing(on) { noFlash = !!on; cls(); schedule(); return api; },
    destroy() { destroyed = true; stopLightning(); el.remove(); },
  };
  cls(); api.set(weather);
  return api;
}

/** The README's three-layer stack for a canvas renderer: backdrop canvas, .wx, transparent sprite/HUD canvas whose
 *  clearDirty(rects) clears only the given rects (never a full clear). */
export function createWeatherStack(host, { width, height, weather = null, reduceFlashing = false, env = {} } = {}) {
  const doc = env.doc || globalThis.document;
  host.classList?.add('wx-stack');
  const mk = (c) => { const v = doc.createElement('canvas'); v.className = c; v.width = width; v.height = height; host.appendChild(v); return v; };
  const back = mk('wx-back');
  const top = mk('wx-top');
  const wx = mountWeather(host, { before: top, weather, reduceFlashing, env });
  const tctx = top.getContext?.('2d');
  const clearDirty = (rects) => { for (const r of rects) tctx?.clearRect(Math.floor(r.x) - 1, Math.floor(r.y) - 1, Math.ceil(r.w) + 2, Math.ceil(r.h) + 2); };
  return { back, top, wx, backCtx: back.getContext?.('2d'), topCtx: tctx, clearDirty };
}

/** reduce-flashing setting: ?flash=0, localStorage kilumen.reduceFlashing=1, or the OS reduced-motion setting. */
export function reduceFlashingSetting(q) {
  if (q?.get?.('flash') === '0') return true;
  try { if (globalThis.localStorage?.getItem('kilumen.reduceFlashing') === '1') return true; } catch { /* no storage */ }
  try { return !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

/** Battle hook: put .wx between the .bg backdrop and .b-field (sprites + HP cards) of an sd battle root. */
export function attachBattleWeather(root, { scene, query, env } = {}) {
  const w = weatherFor({ map: scene?.map?.name || '', flags: scene?.flags, life: scene?.life?.weather, override: query?.get?.('wx') });
  if (!w || !root) return null;
  const wx = mountWeather(root, { before: root.querySelector('.b-field'), weather: w, reduceFlashing: reduceFlashingSetting(query), env });
  const vis = () => wx.pause(globalThis.document?.hidden || !!scene?.paused);
  globalThis.document?.addEventListener?.('visibilitychange', vis);
  const destroy = wx.destroy; wx.destroy = () => { globalThis.document?.removeEventListener?.('visibilitychange', vis); destroy(); };
  // battle closed -> stop timers (checked on the 1 s region56 tick, not per frame)
  if (scene) (scene._wxBattles ||= new Set()).add(wx);
  return wx;
}

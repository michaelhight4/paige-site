// Kilumen: boot. Dev URL params: ?map=route1&x=4&y=30&facing=up&debug=1&zoom=3&touch=1&flags=has_run_shoes,has_bike
// Platform (src/platform.js, DRAFT): ?platform=pc|mobile picks the profile; ?touch=1 = mobile, ?touch=0 = pc. Picked once at start-up.
// Save: 'kilumen.save.v1' (+ .bak) in IndexedDB (idb-keyval, save_backend.js) mirrored to localStorage; ?idb=0 = localStorage
// only. ?save=0 = no persistence, ?reset=1 = wipe the save first.
// Audio (src/audio/audio.js, placeholder tones): starts on the first touch/click/key. ?audio=0 = no audio at all.
// Soul-pass dev params: ?hour=22 | ?phase=night, ?timescale=0 (freeze clock), ?lead=rillop&warmth=80&nick=Bubbles
// Living world (living.js): ?clouds=0|1 ?life=0|1 (override, not saved), ?weather=clear|fair|cloudy|overcast|rain,
// ?motion=reduce|full (else prefers-reduced-motion). Keys: K = cloud shadows on/off, L = ambient life on/off (saved
// in localStorage 'kilumen.settings.v1').
// Depth pass (depth.js / depth.json): ?depth=0|1 (override, not saved); key J (depth.json debug_key) toggles it (saved in
// localStorage 'kilumen.depth.v1').
// ?depthstrength=light|medium|strong previews the shadow strength options (depth.json strengths, Gary's call);
// ?litgreens=1|0 overrides CONFIG.litGreensAtNight (src/overworld/lighting.js).
// Night FX (src/overworld/nightfx.js, CONFIG.nightFx + profile nightFx): ?nightfx=0|1 all switches, ?moonlight=0|1,
// ?nightlights=0|1, ?clouds=0|1 (also living-world clouds), ?lightcell=N (light buffer cell, native px). Key N = night FX on/off.
// Never on in the alpha build (ALPHA_QUERY is only defined there).
// ALPHA build (src/alpha.js): none of the dev params above are read; only ?reset=1 (New game) is kept.
import { ALPHA_QUERY } from './alpha.js';
import { CONFIG } from './config.js';
import { Input } from './overworld/input.js';
import { Overworld } from './overworld/overworld.js';
import { SaveStore, SAVE_KEY } from './overworld/save.js';
import { openSaveStorage } from './overworld/save_backend.js';
import { Dialog } from './overworld/dialog.js';
import { attachSystems } from './systems/index.js'; // [systems-gd hook]
import { attachOvernight } from './overnight/index.js'; // [overnight hook] links / field / Skylift / sight / Kilindex / learnsets (src/overnight/flags.js)
import { startPlatform } from './platform.js';
import { resolveNightFx } from './overworld/nightfx.js';

const q = new URLSearchParams(ALPHA_QUERY);
const ALPHA = typeof ALPHA_QUERY !== 'undefined'; // alpha build only (build_alpha.py imports it); dev: undeclared -> 'undefined'
const num = (k) => (q.has(k) && q.get(k) !== '' && Number.isFinite(+q.get(k)) ? +q.get(k) : undefined);
const start = q.has('map')
  ? { map: q.get('map'), x: num('x') ?? 0, y: num('y') ?? 0, facing: q.get('facing') || 'down' }
  : null; // null: continue from the save, else CONFIG.start

const toastEl = document.getElementById('toast');
let toastTimer = 0, dialog = null;
function toast(text) {
  toastEl.textContent = text;
  toastEl.hidden = false;
  dialog?.placeToast(); // profile hud.toastDuringDialog: lift it above an open dialogue box
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.hidden = true; }, 2200 + 1400 * (text.split('\n').length - 1));
}

// Platform profile (pc or mobile), picked once. Touch controls, zoom, camera and the dialogue/HUD layout all come from it.
let platform;
try { platform = await startPlatform(); } catch (e) { console.error(e); toast('Failed to load platform profile: ' + e.message); throw e; }
const touchPad = document.getElementById('touchpad');
touchPad.hidden = !platform.profile.controls.touch;

let storage = null;
try { storage = q.get('save') === '0' ? null : window.localStorage; } catch { storage = null; } // private mode: play without saving
let saveStorage = storage; // libs pass: IndexedDB first (one-time copy of an existing localStorage save), localStorage fallback
if (q.get('save') !== '0' && q.get('idb') !== '0') {
  try {
    const idb = await import('./vendor/idb-keyval/idb-keyval.js');
    saveStorage = (await openSaveStorage({ idb, local: storage, keys: [SAVE_KEY, SAVE_KEY + '.bak'] })) || storage;
    if (saveStorage?.lastError) console.warn('save backend:', saveStorage.lastError);
  } catch (e) { console.warn('save: IndexedDB unavailable, using localStorage:', e?.message || e); }
}
const store = new SaveStore(saveStorage);
if (q.get('reset') === '1') store.clear();
const saveData = store.load();
if (!saveData && !q.has('reset') && q.get('title') !== '0') store.hold = true; // ALPHA: first launch, nothing saved until Continue / New game
if (store.lastError) console.warn('save:', store.lastError, store.loadedFrom ? `(loaded ${store.loadedFrom})` : '');

const canvas = document.getElementById('world');
const input = new Input(window);
input.attachTouch(touchPad);
if (platform.profile.controls.touch) input.guardTouchPage(window); // phones: no stuck input, no page gestures (tests/touch_e2e.mjs)
const flags = (q.get('flags') || '').split(',').map((f) => f.trim()).filter(Boolean); // dev only, merged into the save
const scene = new Overworld(canvas, input, CONFIG, {
  start, debug: q.get('debug') === '1', zoom: num('zoom'), platform, toast, flags, store, saveData: saveData || undefined,
  dialog: (dialog = new Dialog(document.body, platform.profile.hud, toastEl, platform.profile.controls)), hour: num('hour'), phase: q.get('phase') || undefined, timescale: num('timescale'),
  lead: q.get('lead') || undefined, warmth: num('warmth'), nick: q.get('nick') || undefined,
  life: {
    clouds: q.has('clouds') ? q.get('clouds') !== '0' : undefined, life: q.has('life') ? q.get('life') !== '0' : undefined,
    weather: q.get('weather') || undefined, reducedMotion: q.get('motion') === 'reduce' ? true : q.get('motion') === 'full' ? false : undefined,
  },
  depth: q.has('depth') ? q.get('depth') !== '0' : undefined,
  depthStrength: q.get('depthstrength') || undefined, // light|medium|strong (depth.json strengths; preview, not saved)
  litGreens: q.has('litgreens') ? q.get('litgreens') !== '0' : undefined, // CONFIG.litGreensAtNight override (preview)
  nightFx: resolveNightFx({ config: CONFIG.nightFx, profile: platform.profile.nightFx, query: q, alpha: ALPHA }), // Night FX switches
});
window.addEventListener('keydown', (e) => { // living-world toggles (K / L are free in input.js)
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.code === 'KeyK') toast(`Cloud shadows ${scene.life.toggle('clouds') ? 'on' : 'off'}`);
  else if (e.code === 'KeyL') toast(`Ambient life ${scene.life.toggle('life') ? 'on' : 'off'}`);
  else if (e.code === 'KeyN' && !ALPHA) toast(`Night FX ${scene.nightfx.toggle() ? 'on' : 'off'}`);
  else if (e.code === scene.depth.key) toast(`Depth shadows ${scene.depth.toggle() ? 'on' : 'off'}`);
});

attachSystems(scene, { saveData: saveData || {}, config: q }); // [systems-gd hook] party/bag/heal/shop/puzzles (src/systems/HOOKS.md)
try { attachOvernight(scene, { query: q, saveData: saveData || {} }); } catch (e) { console.error('overnight:', e); } // [overnight hook] never blocks boot
window.kilumen = { scene, platform: { id: platform.id, profile: platform.profile }, state: () => scene.state(), ready: scene.init().then(() => { scene.run(); return true; }) };
window.kilumen.ready.catch((e) => { console.error(e); toast('Failed to load: ' + e.message); });
window.kilumen.save = { backend: saveStorage?.backend || (saveStorage ? 'localStorage' : 'none'), flush: () => saveStorage?.flush?.() };

// Audio (libs pass, Oct 22, 2026): howler music + ZzFX effects, placeholder tones. Mounted beside the world (not
// awaited); nothing is created until the first gesture. Hooks: scene.audio (grass, door), dialog.onPage (blips), UI.
if (q.get('audio') !== '0') {
  let ls = null; try { ls = window.localStorage; } catch { ls = null; }
  import('./audio/audio.js').then(({ mountAudio }) => mountAudio({ profile: platform.profile, platformId: platform.id, storage: ls }))
    .then((audio) => {
      scene.audio = audio; window.kilumen.audio = audio;
      dialog.onPage = (text) => audio.blip(text);
      window.kilumen.ready.then(() => audio.follow(scene));
    }).catch((e) => console.error('audio:', e));
}

// UI layer (src/ui/ui.js, UI pass Oct 22, 2026): phone menu (Esc / M / Start / menu button), HUD, title, screens, battle
// shell. Loaded after the world is up and guarded, so a UI failure never stops the game. ?ui=0 skips it.
if (q.get('ui') !== '0') {
  window.kilumen.ready.then(() => import('./ui/ui.js')).then(({ mountUI }) => { window.kilumen.ui = mountUI({ scene, platform, toast, params: q });
    return import('./ui/systems_screens.js').then((m) => m.installSystemsScreens(window.kilumen.ui, scene.systems)); }) // [systems-gd hook]
    .then(() => import('./progression/index.js').then((m) => m.attachProgression(scene, window.kilumen.ui, { query: q, platform })).catch((e) => console.error('progression:', e))) // [progression hook] Masters / hall puzzles / quests (src/progression/flags.js, ?pg=)
    .catch((e) => console.error('ui:', e));
}


// Kilumen: boot. Dev URL params: ?map=route1&x=4&y=30&facing=up&debug=1&zoom=3&touch=1&flags=has_run_shoes,has_bike
// ?skipintro=1 = a new game starts outside the front door (no bedroom wake-up / Ron briefing gate; src/overworld/intro.js)
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
// Mood layers (src/overworld/mood.js + mood.json, profile `mood` block): ?mood=0|1 (area tint, vignette, particles, sun rays).
// ALPHA build (src/alpha.js): none of the dev params above are read; only ?reset=1 (New game) is kept.
import { ALPHA_QUERY, DEV_REQUESTED } from './alpha.js?v=v0.2.27-alpha';
import { CONFIG } from './config.js?v=v0.2.27-alpha';
import { Input } from './overworld/input.js?v=v0.2.27-alpha';
import { Overworld } from './overworld/overworld.js?v=v0.2.27-alpha';
import { SaveStore, SAVE_KEY } from './overworld/save.js?v=v0.2.27-alpha';
import { openSaveStorage } from './overworld/save_backend.js?v=v0.2.27-alpha';
import { Dialog } from './overworld/dialog.js?v=v0.2.27-alpha';
import { attachSystems } from './systems/index.js?v=v0.2.27-alpha'; // [systems-gd hook]
import { attachOvernight } from './overnight/index.js?v=v0.2.27-alpha'; // [overnight hook] links / field / Skylift / sight / Kilindex / learnsets (src/overnight/flags.js)
import { attachEvolution } from './systems/evolution.js?v=v0.2.27-alpha'; // [evolution hook] level-up evolution after battles
import { startPlatform } from './platform.js?v=v0.2.27-alpha';
import { resolveNightFx } from './overworld/nightfx.js?v=v0.2.27-alpha';
import { Mood, resolveMood } from './overworld/mood.js?v=v0.2.27-alpha';

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
    const idb = await import('./vendor/idb-keyval/idb-keyval.js?v=v0.2.27-alpha');
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
// home start v1 (src/overworld/intro.js): a new game holds on black until the UI (title) has mounted and closed.
// 'loading' = UI not mounted yet (intro.js gives up waiting after 10 s), true = a UI screen is open, false = go.
let uiState = q.get('ui') === '0' ? 'off' : 'loading';
const introGate = () => (uiState === 'loading' ? 'loading' : uiState === 'ready' ? !!window.kilumen?.ui?.active : false);
const scene = new Overworld(canvas, input, CONFIG, {
  skipIntro: q.get('skipintro') === '1', introGate, // ?skipintro=1: a new game starts outside the house as before
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
scene.mood = new Mood(scene, { switches: resolveMood({ profile: platform.profile.mood, query: q }) }); // cinematic mood layers (Gary's easy set, Oct 23)
scene.mood.ready = fetch('src/overworld/mood.json').then((r) => r.json()).then((d) => { scene.mood.data = d; scene.mood._mapName = null; return true; }).catch((e) => { console.warn('mood presets off:', e.message); return false; });
window.addEventListener('keydown', (e) => { // living-world toggles (K / L are free in input.js)
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.code === 'KeyK') toast(`Cloud shadows ${scene.life.toggle('clouds') ? 'on' : 'off'}`);
  else if (e.code === 'KeyL') toast(`Ambient life ${scene.life.toggle('life') ? 'on' : 'off'}`);
  else if (e.code === 'KeyN' && !ALPHA) toast(`Night FX ${scene.nightfx.toggle() ? 'on' : 'off'}`);
  else if (e.code === scene.depth.key) toast(`Depth shadows ${scene.depth.toggle() ? 'on' : 'off'}`);
});

attachSystems(scene, { saveData: saveData || {}, config: q }); // [systems-gd hook] party/bag/heal/shop/puzzles (src/systems/HOOKS.md)
try { attachOvernight(scene, { query: q, saveData: saveData || {} }); } catch (e) { console.error('overnight:', e); } // [overnight hook] never blocks boot
import('./systems/crystal_resupply.js?v=v0.2.27-alpha').then((m) => m.attachCrystalResupply(scene)).catch((e) => console.error('crystal resupply:', e)); // [crystal resupply hook] RITA restock in the opening test run
try { attachEvolution(scene, { query: q }); } catch (e) { console.error('evolution:', e); } // [evolution hook] level-up evolution after battles (src/systems/evolution.js, ?evo=0 off)
window.kilumen = { scene, mood: scene.mood, platform: { id: platform.id, profile: platform.profile }, state: () => scene.state(), ready: scene.init().then(() => { scene.run(); return true; }) };
window.kilumen.ready.catch((e) => { console.error(e); toast('Failed to load: ' + e.message); });
window.kilumen.save = { backend: saveStorage?.backend || (saveStorage ? 'localStorage' : 'none'), flush: () => saveStorage?.flush?.() };
if (q.get('cv') !== '0') import('./systems/company_voice.js?v=v0.2.27-alpha').then((m) => m.attachCompanyVoice(scene, { query: q })).then((cv) => { window.kilumen.companyVoice = cv; if (cv && q.get('ritavoice') !== '0') return import('./systems/rita_voice.js?v=v0.2.27-alpha').then((r) => { window.kilumen.ritaVoice = r.attachRitaVoice(cv, { audio: () => window.kilumen.audio }); }); }) /* [rita voice hook] spoken clips, Options 'RITA voice' (default on), ?ritavoice=0 off */.catch((e) => console.error('company voice:', e)); // [company voice hook] DEFAULT ON for region 1 (Gary 12:45 PM CT Oct 23 2026: "Yes, ship RITA in region 1"); ?cv=0 turns off (design/company_voice.md)
if (q.get('contacts') !== '0') window.kilumen.ready.then(() => Promise.all([import('./systems/contacts.js?v=v0.2.27-alpha'), import('./ui/data.js?v=v0.2.27-alpha'), import('./systems/items.js?v=v0.2.27-alpha')])).then(([m, d, it]) => m.attachContacts(scene, { query: q, ui: () => window.kilumen.ui, speciesName: (id) => d.speciesById(id).name, itemName: (id) => scene.lines?.items?.[id]?.name || it.BATTLE_ITEMS[id]?.name || id })).then((c) => { window.kilumen.contacts = c; }).catch((e) => console.error('contacts:', e)); // [contacts hook] DEFAULT ON (Gary 12:42 PM CT Oct 23 2026: ship in region 1); ?contacts=0 turns off (src/systems/contacts.js)

// Audio (libs pass, Oct 22, 2026): howler music + ZzFX effects, placeholder tones. Mounted beside the world (not
// awaited); nothing is created until the first gesture. Hooks: scene.audio (grass, door), dialog.onPage (blips), UI.
if (q.get('audio') !== '0') {
  let ls = null; try { ls = window.localStorage; } catch { ls = null; }
  import('./audio/audio.js?v=v0.2.27-alpha').then(({ mountAudio }) => mountAudio({ profile: platform.profile, platformId: platform.id, storage: ls }))
    .then((audio) => {
      scene.audio = audio; window.kilumen.audio = audio;
      dialog.onPage = (text) => audio.blip(text);
      window.kilumen.ready.then(() => audio.follow(scene));
    }).catch((e) => console.error('audio:', e));
}

// UI layer (src/ui/ui.js, UI pass Oct 22, 2026): phone menu (Esc / M / Start / menu button), HUD, title, screens, battle
// shell. Loaded after the world is up and guarded, so a UI failure never stops the game. ?ui=0 skips it.
if (q.get('ui') !== '0') {
  window.kilumen.ready.then(() => import('./ui/ui.js?v=v0.2.27-alpha')).then(({ mountUI }) => { window.kilumen.ui = mountUI({ scene, platform, toast, params: q }); uiState = 'ready';
    return import('./ui/systems_screens.js?v=v0.2.27-alpha').then((m) => m.installSystemsScreens(window.kilumen.ui, scene.systems)); }) // [systems-gd hook]
    .then(() => import('./progression/index.js?v=v0.2.27-alpha').then((m) => m.attachProgression(scene, window.kilumen.ui, { query: q, platform })).catch((e) => console.error('progression:', e))) // [progression hook] Masters / hall puzzles / quests (src/progression/flags.js, ?pg=)
    // dev console (v0.2.26, Gary): only with ?dev=1 AND a signed-in admin account (server check, src/dev/devgate.js). Nothing dev is loaded otherwise.
    .then(() => DEV_REQUESTED ? import('./dev/devgate.js?v=v0.2.27-alpha').then((g) => g.checkDevAccess()).then((acc) => acc.ok ? import('./dev/console.js?v=v0.2.27-alpha').then((m) => m.installDevConsole(scene, acc)) : console.info('dev console: not available (' + acc.reason + ')')).catch((e) => console.error('dev:', e)) : null)
    .catch((e) => { console.error('ui:', e); if (uiState === 'loading') uiState = 'failed'; });
}


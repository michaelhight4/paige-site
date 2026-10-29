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
import { ALPHA_QUERY, DEV_REQUESTED } from './alpha.js?v=v0.2.86-alpha';
/** Hint only (the role is decided by the server in dev/devgate.js): skip loading supabase-js for players with no site sign-in. */
function devSessionHint() { try { for (let i = 0; i < localStorage.length; i++) if (/^sb-[a-z0-9]+-auth-token$/.test(localStorage.key(i) || '')) return true; } catch (e) { /* storage blocked */ } return false; }
import { CONFIG } from './config.js?v=v0.2.86-alpha';
import { Input } from './overworld/input.js?v=v0.2.86-alpha';
import { Overworld } from './overworld/overworld.js?v=v0.2.86-alpha';
import { SaveStore, SAVE_KEY } from './overworld/save.js?v=v0.2.86-alpha';
import { openSaveStorage } from './overworld/save_backend.js?v=v0.2.86-alpha';
import { Dialog } from './overworld/dialog.js?v=v0.2.86-alpha';
import { attachSystems } from './systems/index.js?v=v0.2.86-alpha'; // [systems-gd hook]
import { attachOvernight } from './overnight/index.js?v=v0.2.86-alpha'; // [overnight hook] links / field / Skylift / sight / Kilindex / learnsets (src/overnight/flags.js)
import { attachEvolution } from './systems/evolution.js?v=v0.2.86-alpha'; // [evolution hook] level-up evolution after battles
import { startPlatform } from './platform.js?v=v0.2.86-alpha';
import { resolveNightFx } from './overworld/nightfx.js?v=v0.2.86-alpha';
import { Mood, resolveMood } from './overworld/mood.js?v=v0.2.86-alpha';

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
    const idb = await import('./vendor/idb-keyval/idb-keyval.js?v=v0.2.86-alpha');
    saveStorage = (await openSaveStorage({ idb, local: storage, keys: [SAVE_KEY, SAVE_KEY + '.bak'] })) || storage;
    if (saveStorage?.lastError) console.warn('save backend:', saveStorage.lastError);
  } catch (e) { console.warn('save: IndexedDB unavailable, using localStorage:', e?.message || e); }
}
try { await (await import('./net/account.js?v=v0.2.86-alpha')).refreshIfStale(); } catch (e) { /* offline */ } // v0.2.49: refresh a stale session (home-screen app)
// Cloud saves (Oct 29, 2026, src/net/cloud_save.js): signed-in site accounts only, ?cloudsave=0 off. Runs before the save is read.
let cloudSave = null, cloudInd = null; // v0.2.54: 'Cloud: synced <time>' indicator (src/net/cloud_save.js cloudIndicator)
if (saveStorage && q.get('cloudsave') !== '0') {
  try {
    const cs = await import('./net/cloud_save.js?v=v0.2.86-alpha');
    try { cloudInd = cs.cloudIndicator(); cloudInd.set(cs.hasSessionHint() ? 'checking…' : 'off'); } catch { cloudInd = null; }
    if (cs.hasSessionHint()) {
      const { isLoadableSave } = await import('./overworld/save_schema.js?v=v0.2.86-alpha');
      const limit = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
      const session = cs.supabaseSession(), sess = () => limit(session(), 3000); // v0.2.61: was 6 s + 8 s; a slow check held the boot on black ~10 s
      const fetchFn = (u, init) => limit(fetch(u, init), 4000);
      const reset = q.get('reset') === '1';
      cloudSave = await cs.bootCloudSave({
        storage: saveStorage, key: SAVE_KEY, isLoadable: isLoadableSave, device: platform.id, session: sess, fetchFn, ls: window.localStorage,
        reset, ask: (l, c) => cs.askChoice(l, c), locked: () => !!window.kilumen?.scene?.saveLocked,
        onResult: (r) => { if (r && r.ok === false) { console.warn('cloud save:', r.reason, r.error || ''); cloudInd?.set(r.reason === 'network' ? 'error' : r.reason === 'older' ? 'newer' : 'error'); } else if (r?.ok) cloudInd?.set('synced', Number(r.saved_at) || Date.now()); },
      });
      if (!cloudSave.ok) cloudInd?.set('off');
      else if (cloudSave.action === 'download' || cloudSave.action === 'take_cloud' || cloudSave.action === 'same') cloudInd?.set('synced', cloudSave.cloud?.savedAt || Date.now());
      else if (cloudSave.action === 'upload' || cloudSave.action === 'keep_local') cloudInd?.set('saving');
      else cloudInd?.set('synced', cloudSave.cloud?.savedAt || 0);
      if (cloudSave.uploader) {
        const up = cloudSave.uploader;
        window.addEventListener('pagehide', () => up.hidden());
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') up.hidden(); });
      }
    }
  } catch (e) { console.warn('cloud save off this session:', e?.message || e); cloudSave = null; cloudInd?.set('error'); }
}
const store = new SaveStore(saveStorage);
if (q.get('reset') === '1') store.clear();
if (cloudSave?.uploader) store.onSaved = (json) => cloudSave.uploader.saved(json);
if (cloudSave?.api) try { (await import('./net/cloud_save.js?v=v0.2.86-alpha')).liveSync({ api: cloudSave.api, storage: saveStorage, key: SAVE_KEY, store, ind: cloudInd, locked: () => !!window.kilumen?.scene?.saveLocked }); } catch (e) { console.warn('cloud live sync:', e?.message || e); }
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
import('./systems/crystal_resupply.js?v=v0.2.86-alpha').then((m) => m.attachCrystalResupply(scene)).catch((e) => console.error('crystal resupply:', e)); // [crystal resupply hook] RITA restock in the opening test run
try { attachEvolution(scene, { query: q }); } catch (e) { console.error('evolution:', e); } // [evolution hook] level-up evolution after battles (src/systems/evolution.js, ?evo=0 off)
window.kilumen = { scene, mood: scene.mood, platform: { id: platform.id, profile: platform.profile }, state: () => scene.state(), ready: scene.init().then(() => { scene.run(); return true; }) };
window.kilumen.ready.catch((e) => { console.error(e); toast('Failed to load: ' + e.message); });
window.kilumen.save = { backend: saveStorage?.backend || (saveStorage ? 'localStorage' : 'none'), flush: () => saveStorage?.flush?.(), cloud: cloudSave ? { action: cloudSave.action, uploader: cloudSave.uploader || null } : null };
if (q.get('cv') !== '0') import('./systems/company_voice.js?v=v0.2.86-alpha').then((m) => m.attachCompanyVoice(scene, { query: q })).then((cv) => { window.kilumen.companyVoice = cv; if (cv && q.get('ritavoice') !== '0') return import('./systems/rita_voice.js?v=v0.2.86-alpha').then((r) => { window.kilumen.ritaVoice = r.attachRitaVoice(cv, { audio: () => window.kilumen.audio }); }); }) /* [rita voice hook] spoken clips, Options 'RITA voice' (default on), ?ritavoice=0 off */.catch((e) => console.error('company voice:', e)); // [company voice hook] DEFAULT ON for region 1 (Gary 12:45 PM CT Oct 23 2026: "Yes, ship RITA in region 1"); ?cv=0 turns off (design/company_voice.md)
import('./fishing/flags.js?v=v0.2.86-alpha').then((f) => { if (f.fishingFlags(q).fishing) return window.kilumen.ready.then(() => import('./fishing/index.js?v=v0.2.86-alpha')).then((m) => { window.kilumen.fishing = m.installFishing(scene); }); }).catch((e) => console.error('fishing:', e)); // [fishing hook] v1 (Oct 29 2026): rod from the Brookhollow fisher, cast at any water; OFF by default, ?fishing=1 on (src/fishing/)
window.kilumen.ready.then(() => import('./rail/index.js?v=v0.2.86-alpha')).then((m) => { window.kilumen.rail = m.attachRail(scene, { systems: scene.systems }); }).catch((e) => console.error('rail:', e)); // [rail hook] Lumen Line travel menu (src/rail/)
if (q.get('r4') !== '0') window.kilumen.ready.then(() => import('./region4/index.js?v=v0.2.86-alpha')).then(async (m) => { window.kilumen.region4 = m.attachRegion4(scene, { systems: scene.systems, data: await m.loadRegion4Data() }); }).catch((e) => console.error('region4:', e)); // [region4 hook] v0.2.48: shipped (Gary Oct 29 2026). Frostspire via Skylift after Master 3; ?r4=0 turns off (src/region4/)
if (q.get('sports') !== '0') window.kilumen.ready.then(() => import('./sports/index.js?v=v0.2.86-alpha')).then((m) => { window.kilumen.sports = m.attachSports(scene, { query: q, systems: scene.systems }); }).catch((e) => console.error('sports:', e)); // [sports hook] Brookhollow Dash Track (coach npc dash_coach): free practice + 3-day tournament; ?sports=0 turns off (src/sports/)
if (q.get('feeds') !== '0' && globalThis.KILUMEN_FEEDS !== false) window.kilumen.ready.then(() => Promise.all([import('./feeds/index.js?v=v0.2.86-alpha'), import('./ui/data.js?v=v0.2.86-alpha')])).then(([m, d]) => { window.kilumen.feeds = m.attachFeeds(scene, { query: q, systems: scene.systems, speciesInfo: (id) => d.speciesById(id) }); }).catch((e) => console.error('feeds:', e)); // [feeds hook] fruit feeds, OFF by default (src/feeds/flags.js); on only by globalThis.KILUMEN_FEEDS = true (tests/dev; the alpha build strips ?feeds=1)
if (q.get('contacts') !== '0') window.kilumen.ready.then(() => Promise.all([import('./systems/contacts.js?v=v0.2.86-alpha'), import('./ui/data.js?v=v0.2.86-alpha'), import('./systems/items.js?v=v0.2.86-alpha')])).then(([m, d, it]) => m.attachContacts(scene, { query: q, ui: () => window.kilumen.ui, speciesName: (id) => d.speciesById(id).name, itemName: (id) => scene.lines?.items?.[id]?.name || it.BATTLE_ITEMS[id]?.name || id })).then((c) => { window.kilumen.contacts = c; }).catch((e) => console.error('contacts:', e)); // [contacts hook] DEFAULT ON (Gary 12:42 PM CT Oct 23 2026: ship in region 1); ?contacts=0 turns off (src/systems/contacts.js)

// Audio (libs pass, Oct 22, 2026): howler music + ZzFX effects, placeholder tones. Mounted beside the world (not
// awaited); nothing is created until the first gesture. Hooks: scene.audio (grass, door), dialog.onPage (blips), UI.
if (q.get('audio') !== '0') {
  let ls = null; try { ls = window.localStorage; } catch { ls = null; }
  import('./audio/audio.js?v=v0.2.86-alpha').then(({ mountAudio }) => mountAudio({ profile: platform.profile, platformId: platform.id, storage: ls }))
    .then((audio) => {
      scene.audio = audio; window.kilumen.audio = audio;
      dialog.onPage = (text) => audio.blip(text);
      window.kilumen.ready.then(() => audio.follow(scene));
    }).catch((e) => console.error('audio:', e));
}

// UI layer (src/ui/ui.js, UI pass Oct 22, 2026): phone menu (Esc / M / Start / menu button), HUD, title, screens, battle
// shell. Loaded after the world is up and guarded, so a UI failure never stops the game. ?ui=0 skips it.
if (q.get('ui') !== '0') {
  // playtest fixes 3 (slow reload): start downloading the UI module graph now, in parallel with the world's tiles; it is still
  // only MOUNTED once the world is ready (these modules have no top-level side effects).
  const uiMod = import('./ui/ui.js?v=v0.2.86-alpha');
  for (const m of ['./ui/systems_screens.js?v=v0.2.86-alpha', './qol_c/index.js?v=v0.2.86-alpha', './progression/index.js?v=v0.2.86-alpha']) import(m).catch(() => {});
  uiMod.catch(() => {});
  window.kilumen.ready.then(() => uiMod).then(({ mountUI }) => { window.kilumen.ui = mountUI({ scene, platform, toast, params: q }); uiState = 'ready';
    return import('./ui/systems_screens.js?v=v0.2.86-alpha').then((m) => m.installSystemsScreens(window.kilumen.ui, scene.systems)); }) // [systems-gd hook]
    .then(() => import('./qol_c/index.js?v=v0.2.86-alpha').then((m) => { window.kilumen.qolc = m.installQolC(scene, window.kilumen.ui, { query: q }); }).catch((e) => console.error('qol_c:', e))) // [qol batch C hook] storage/quick save/stats/rename/renew/chain (?qolc=)
    .then(() => import('./progression/index.js?v=v0.2.86-alpha').then((m) => m.attachProgression(scene, window.kilumen.ui, { query: q, platform })).catch((e) => console.error('progression:', e))) // [progression hook] Masters / hall puzzles / quests (src/progression/flags.js, ?pg=)
    // dev console (v0.2.26, Gary): only with ?dev=1 AND a signed-in admin account (server check, src/dev/devgate.js). Nothing dev is loaded otherwise.
    // dev console: ?dev=1 (owner/admin) or, with no flag, any signed-in browser is checked server-side and only role 'owner' gets it (v0.2.39)
    .then(() => (DEV_REQUESTED || devSessionHint()) ? import('./dev/devgate.js?v=v0.2.86-alpha').then((g) => g.checkDevAccess(DEV_REQUESTED ? ['owner', 'admin'] : ['owner'])).then((acc) => acc.ok ? import('./dev/console.js?v=v0.2.86-alpha').then((m) => m.installDevConsole(scene, acc)) : (DEV_REQUESTED ? console.info('dev console: not available (' + acc.reason + ')') : null)).catch((e) => console.error('dev:', e)) : null)
    .catch((e) => { console.error('ui:', e); if (uiState === 'loading') uiState = 'failed'; });
}


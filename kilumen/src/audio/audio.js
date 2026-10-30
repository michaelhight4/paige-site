// Kilumen: audio (libs pass, Oct 22, 2026). Music through howler.js (MIT, src/vendor/howler), sound effects through
// ZzFX (MIT, src/vendor/zzfx). EVERYTHING HERE IS A PLACEHOLDER: music loops are generated tones and effects are
// ZzFX parameter sets. Real audio replaces them track by track (PLACEHOLDER_AUDIO below lists every slot).
//
// - Music follows the scene: trackFor({map, zone, phase}) picks a track (zone + day/night outdoors, home /
//   interior / heal centre / cave indoors) and changes crossfade (profile.audio.crossfadeMs).
// - Unlock: browsers (iOS Safari above all) only start audio inside a user gesture. Nothing audio-related is created
//   before the first touchend / pointerup / keydown / mousedown (profile.audio.unlockOn). Inside that handler we
//   create the AudioContext, play one silent buffer and resume(). ZzFX is imported only after that, because it makes
//   its own AudioContext when the module loads; we close that one and point ZzFX at howler's context instead.
// - Volume: master (Howler.volume), music (per track), effects (our own gain node into howler's master gain, so
//   mute and master cover both). Defaults per platform in src/platform/pc.json / mobile.json "audio"; the player's
//   changes (Options screen) are stored per platform in localStorage 'kilumen.audio.<platform>'.
// - Tab hidden: the context is suspended (profile.audio.pauseWhenHidden) and resumed when visible.
// Pure helpers (trackFor, synthTrack, wavBytes, blipCount) have no browser or vendor imports, for node tests.
// - DRAFT audio (wave 2, Oct 22, 2026): three original BeepBox loops (town / route / battle) and a jsfxr SFX sprite,
//   rendered by tools/audio/ (see /workspace/quality/toolkit/MUSIC_SFX_PIPELINE.md). They are DRAFTS for Gary to veto.
//   ONE-LINE REVERT to the placeholder tones + ZzFX: set DRAFT_AUDIO below to { music: false, sfx: false }.
import { isIndoor } from '../overworld/clock.js?v=v0.2.97-alpha';

/** DRAFT audio switch (Gary can veto): { music: false, sfx: false } puts every slot back on the placeholders. */
export const DRAFT_AUDIO = { music: true, sfx: true };

/** Placeholder track id -> DRAFT loop (audio/music/kil_draft_<loop>.ogg|.m4a). Unlisted ids keep their placeholder. */
export const DRAFT_MUSIC = {
  'brookhollow.day': 'town', 'brookhollow.night': 'town', 'fernwick.day': 'town', 'fernwick.night': 'town', 'lanternport.day': 'town', 'lanternport.night': 'town',
  'route.day': 'route', 'route.night': 'route', 'sunmeadow_fields.day': 'route', 'sunmeadow_fields.night': 'route', 'thornwood.day': 'route', 'thornwood.night': 'route',
  'saltmere.day': 'saltmere', 'saltmere.night': 'saltmere', 'aurelith.day': 'aurelith', 'aurelith.night': 'aurelith', 'revival_heights.day': 'revival_heights', 'revival_heights.night': 'revival_heights', // Oct 27, 2026: own town loops (tools/audio/songs.mjs)
  battle: 'battle',
};
/** DRAFT SFX sprite map [offset ms, duration ms] (copied from audio/sfx/kil_sfx_draft.json by tools/audio/make_sfx.mjs). */
export const DRAFT_SFX_SPRITE = { cursor: [100, 89], select: [288, 256], back: [643, 165], door: [908, 454], grass: [1461, 179], blip: [1740, 53], save: [1893, 772], catch: [2764, 778] };
const ASSET = (p) => new URL('../../audio/' + p, import.meta.url).href;
/** Sources for a DRAFT asset: OGG Vorbis first, AAC .m4a fallback (older iPhone Safari has no Ogg); howler takes the first it can play. */
export const draftSrc = (path) => [ASSET(path + '.ogg'), ASSET(path + '.m4a')];
/** Draft loop for a track id, or null when the placeholder should play. */
export function draftLoopFor(id, draft = DRAFT_AUDIO) { return (draft?.music && id && DRAFT_MUSIC[id]) || null; }

/** ZzFX parameter sets (placeholder tones). randomness 0 so each sound renders once and is cached. */
export const SFX = {
  cursor: [0.35, 0, 880, 0, 0.01, 0.03, 0, 1],
  select: [0.5, 0, 660, 0, 0.02, 0.08, 0, 1, 0, 0, 330, 0.03],
  back: [0.45, 0, 520, 0, 0.02, 0.08, 0, 1, 0, 0, -180, 0.03],
  door: [0.6, 0, 110, 0.01, 0.05, 0.15, 4, 1, -5, 0, 0, 0, 0, 0.4],
  grass: [0.22, 0, 1400, 0, 0.01, 0.06, 4, 2, 0, 0, 0, 0, 0, 1.5],
  blip: [0.18, 0, 740, 0, 0.005, 0.02, 1, 1],
  save: [0.5, 0, 784, 0.01, 0.15, 0.3, 0, 1, 0, 0, 262, 0.08, 0.08],
  catch: [0.5, 0, 659, 0.01, 0.2, 0.35, 0, 1, 0, 0, 392, 0.1, 0.1],
};

/** Where each effect fires (for the placeholder list). */
export const SFX_USES = {
  cursor: 'menu cursor moves (src/ui/ui.js _select)',
  select: 'menu confirm (ui.js _activate)',
  back: 'menu back / close (ui.js back)',
  door: 'door warps (overworld.js startWarp kind=door)',
  grass: 'player steps into grass (overworld.js onStepStart rustle branch)',
  blip: 'dialogue text blips while a page reveals (dialog.js onPage)',
  save: 'manual save chime only, not autosave (ui.js save screen)',
  catch: "capture success, with the 'Caught!' celebration (ui_tools2.js catchFx; default battle + ?battle=sd)",
};

const DAY = new Set(['dawn', 'day']);
/** Music track id for a scene state. */
export function trackFor({ map, zone, phase } = {}) {
  if (!map) return null;
  const tod = DAY.has(phase) ? 'day' : 'night';
  if (/^heal_/.test(map)) return 'heal_centre';
  if (/^greystone/.test(map)) return 'cave';
  if (/^(home_|house_)/.test(map)) return 'home';
  if (isIndoor(map)) return 'interior';
  return `${zone || 'route'}.${tod}`;
}

/** Every track a built map can ask for, plus the zones with no maps yet (from world_layout zones). */
export function musicTrackIds(layout) {
  const ids = new Set(['home', 'interior', 'heal_centre', 'cave', 'route.day', 'route.night']);
  for (const z of layout?.zones || []) for (const tod of ['day', 'night']) ids.add(`${z.id}.${tod}`);
  return [...ids];
}

// ---- placeholder music: a seeded two-voice triangle loop per track id ----------------------------------------
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const MAJOR_PENT = [0, 2, 4, 7, 9], MINOR_PENT = [0, 3, 5, 7, 10];

/** Deterministic placeholder loop for a track id: mono Float32 samples at `rate`, 16 bars of eighth notes. */
export function synthTrack(id, rate = 22050) {
  const r = rng(hash(id)), night = /\.night$/.test(id), indoor = !id.includes('.');
  const scale = night || id === 'cave' ? MINOR_PENT : MAJOR_PENT;
  const root = 48 + Math.floor(r() * 7) + (indoor ? 5 : 0);
  const bpm = (night ? 72 : 96) + Math.floor(r() * 16), step = 60 / bpm / 2, steps = 64;
  const n = Math.round(steps * step * rate), out = new Float32Array(n);
  const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
  const tri = (ph) => 4 * Math.abs(ph - Math.floor(ph + 0.5)) - 1;
  let deg = 2;
  const notes = [];
  for (let i = 0; i < steps; i++) {
    if (r() < 0.25) { notes.push(null); continue; }
    deg = Math.max(0, Math.min(9, deg + Math.floor(r() * 5) - 2));
    notes.push(root + 12 + scale[deg % 5] + 12 * Math.floor(deg / 5));
  }
  for (let i = 0; i < steps; i++) {
    const s0 = Math.round(i * step * rate), s1 = Math.round((i + 1) * step * rate);
    const bass = root + (Math.floor(i / 8) % 2 ? 7 : 0) - 12, lead = notes[i];
    for (let s = s0; s < s1 && s < n; s++) {
      const t = (s - s0) / rate, env = Math.min(1, t * 200) * Math.exp(-t * 6);
      let v = 0.18 * tri((s / rate) * hz(bass)) * (i % 2 ? 0.6 : 1);
      if (lead != null) v += 0.22 * env * tri((s / rate) * hz(lead));
      out[s] = v;
    }
  }
  for (let s = 0; s < 256; s++) { out[s] *= s / 256; out[n - 1 - s] *= s / 256; } // no click at the loop point
  return out;
}

/** 16-bit mono PCM WAV bytes. */
export function wavBytes(samples, rate) {
  const b = new ArrayBuffer(44 + samples.length * 2), v = new DataView(b);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 0x7fff, true);
  return new Uint8Array(b);
}

/** Blips for one dialogue page: one per `every` visible characters (profile blipEveryChars), capped; 1 when instant. */
export function blipCount(text, instant, every = 3) {
  const chars = String(text || '').replace(/\s/g, '').length;
  if (!chars) return 0;
  return instant ? 1 : Math.min(24, Math.ceil(chars / Math.max(1, every)));
}

const clamp01 = (x) => Math.max(0, Math.min(1, Number(x)));
// Default volumes (Oct 22, 2026, after Gary's "seems a little loud" on the draft demos). The draft loops are now
// normalised to -16 LUFS (they were -11 to -12 LUFS, true peak up to +1.2 dBTP) and the music default dropped from 0.5
// to 0.4, so default music is about 6 dB quieter than before (town -7.0, route -5.6, battle -5.9 dB); the effects
// default dropped 0.8 -> 0.55 (-3.3 dB, files unchanged). Effective PC playback = master x channel: music 0.32
// (about -26 LUFS), effects 0.44. pc.json / mobile.json "audio" mirror these (mobile: music 0.3, sfx 0.5, master 0.9).
// AUDIO_LEVEL_NOTE below is the single place the numbers are written down for tests and tools/audio/make_demos.sh.
export const AUDIO_LEVEL_NOTE = { musicLufs: -16, maxTruePeakDb: -1, date: '2026-10-22', before: { pc: { master: 0.8, music: 0.5, sfx: 0.8 }, mobile: { master: 0.9, music: 0.4, sfx: 0.7 } } };
export const AUDIO_DEFAULTS = { master: 0.8, music: 0.4, sfx: 0.55, muted: false, crossfadeMs: 1200, blip: true, blipEveryChars: 3, unlockOn: ['touchend', 'pointerup', 'mousedown', 'keydown'], pauseWhenHidden: true };

/** Profile audio section + saved player settings -> settings (player values win, clamped). */
export function audioSettings(profileAudio, saved) {
  const base = { ...AUDIO_DEFAULTS, ...(profileAudio || {}) };
  const s = { master: clamp01(base.master), music: clamp01(base.music), sfx: clamp01(base.sfx), muted: !!base.muted };
  for (const k of ['master', 'music', 'sfx']) if (Number.isFinite(saved?.[k])) s[k] = clamp01(saved[k]);
  if (typeof saved?.muted === 'boolean') s.muted = saved.muted;
  return { settings: s, cfg: base };
}

// ---- music duck (Oct 23 2026, coder; Gary 1:41 PM CT: "music should turn down to let her talk") -----------------------
// Generic, reference-counted: duck(id, level, fadeMs) / unduck(id, fadeMs). Several holders may duck at once; the music
// plays at the user's music volume x the LOWEST active level, and comes back to the user's volume only when every holder
// has let go. It scales the music only (never effects or master) and multiplies settings.music, never overwrites it.
// A holder that never lets go is released after maxMs (fallback). First user: RITA's comms strip (company_voice.js).
export const DUCK_DEFAULTS = { level: 0.35, fadeInMs: 250, fadeOutMs: 600, maxMs: 20000 };

/** Pure duck bookkeeping (node-testable). onChange(factor, fadeMs) fires whenever the effective factor changes. */
export function createMusicDuck({ onChange = () => {}, setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  const holds = new Map(); // id -> {count, level, timer}
  let last = 1;
  const factor = () => { let f = 1; for (const h of holds.values()) f = Math.min(f, h.level); return f; };
  const changed = (fadeMs) => { const f = factor(); if (f !== last) { last = f; onChange(f, fadeMs); } };
  const drop = (id) => { const h = holds.get(id); if (h) { clearTimer(h.timer); holds.delete(id); } };
  const d = {
    factor,
    /** -> true when the hold was taken. level 0..1 (0.35 = music at 35% of the user's volume). */
    duck(id, level = DUCK_DEFAULTS.level, fadeMs = DUCK_DEFAULTS.fadeInMs, maxMs = DUCK_DEFAULTS.maxMs) {
      if (id == null) return false;
      const lv = clamp01(Number.isFinite(Number(level)) ? level : DUCK_DEFAULTS.level);
      const h = holds.get(id) || { count: 0, level: 1, timer: 0 };
      h.count++; h.level = Math.min(h.count > 1 ? h.level : 1, lv);
      clearTimer(h.timer);
      if (maxMs > 0) h.timer = setTimer(() => { drop(id); changed(DUCK_DEFAULTS.fadeOutMs); }, maxMs); // never stuck low
      holds.set(id, h);
      changed(fadeMs);
      return true;
    },
    /** One release for id (all: every hold of id). -> holds left for id. Unknown id = no-op. */
    unduck(id, fadeMs = DUCK_DEFAULTS.fadeOutMs, all = false) {
      const h = holds.get(id); if (!h) return 0;
      if (all || --h.count <= 0) drop(id);
      changed(fadeMs);
      return holds.get(id)?.count || 0;
    },
    /** Safety: drop every hold. */
    clear(fadeMs = DUCK_DEFAULTS.fadeOutMs) { for (const id of [...holds.keys()]) drop(id); changed(fadeMs); },
    state: () => ({ factor: factor(), holds: Object.fromEntries([...holds].map(([k, h]) => [k, { count: h.count, level: h.level }])) }),
  };
  return d;
}
/** Music howl volume for the user's music setting x the duck factor. */
export const musicTarget = (settings, factor = 1) => clamp01((Number(settings?.music) || 0) * clamp01(factor));

/**
 * Mount audio for the page. Nothing plays (and no AudioContext exists) until the first user gesture.
 * @param {{profile:object, platformId:string, storage?:Storage|null, enabled?:boolean, doc?:Document, win?:Window, howler?:object}} o
 *   howler: {Howler, Howl} stand-in (node tests only); default = the vendored howler.js.
 */
export async function mountAudio({ profile, platformId, storage = null, enabled = true, win = window, doc = document, howler = null }) {
  const KEY = 'kilumen_alpha_audio.' + platformId;
  let saved = null;
  try { saved = JSON.parse(storage?.getItem(KEY) || 'null'); } catch { saved = null; }
  const { settings, cfg } = audioSettings(profile?.audio, saved);
  const { Howler, Howl } = howler || await import('../vendor/howler/howler.esm.js?v=v0.2.97-alpha');
  Howler.autoSuspend = false; // we suspend on tab hide ourselves; SFX run on raw nodes howler does not track
  const st = { unlocked: false, failed: null, track: null, zzfx: null, cache: new Map(), bus: null, music: null, urls: new Map(), blipTimer: 0, followTimer: 0, sprite: null, spriteState: 'off' };

  const persist = () => { try { storage?.setItem(KEY, JSON.stringify(settings)); } catch { /* private mode */ } };
  const applyMaster = () => { if (st.unlocked) { Howler.volume(settings.master); Howler.mute(settings.muted); } };
  const bus = () => { // effects gain node on howler's current context (howler may replace its context once on unlock)
    const ctx = Howler.ctx;
    if (!ctx || !Howler.masterGain) return null;
    if (!st.bus || st.bus.context !== ctx) { st.bus = ctx.createGain(); st.bus.connect(Howler.masterGain); st.cache.clear(); }
    st.bus.gain.value = settings.sfx;
    return st.bus;
  };

  function unlock() {
    if (st.unlocked || !enabled) return;
    try {
      Howler.volume(settings.master); Howler.mute(settings.muted); // creates howler's AudioContext inside this gesture
      // A first Howl runs howler's own unlock now, which may replace a context whose sampleRate != 44100 (iOS).
      new Howl({ src: [URL.createObjectURL(new Blob([wavBytes(new Float32Array(32), 22050)], { type: 'audio/wav' }))], format: ['wav'], volume: 0 });
      const ctx = Howler.ctx;
      if (!ctx) { st.failed = 'no Web Audio'; return; }
      const src = ctx.createBufferSource(); src.buffer = ctx.createBuffer(1, 1, 22050); src.connect(ctx.destination); src.start(0); // iOS: a sound inside the gesture
      ctx.resume?.().catch(() => {});
      st.unlocked = true;
      for (const t of cfg.unlockOn) win.removeEventListener(t, unlock, true);
      import('../vendor/zzfx/ZzFX.js?v=v0.2.97-alpha').then((m) => {
        try { m.ZZFX.audioContext?.close?.(); } catch { /* ignore */ }
        m.ZZFX.audioContext = Howler.ctx;
        st.zzfx = m.ZZFX;
      }).catch((e) => { st.failed = 'zzfx: ' + e.message; });
      if (DRAFT_AUDIO.sfx) { // DRAFT SFX sprite (web audio, not html5: exact offsets); ZzFX stays as fallback until it decodes
        st.spriteState = 'loading';
        st.sprite = new Howl({ src: draftSrc('sfx/kil_sfx_draft'), sprite: DRAFT_SFX_SPRITE, volume: settings.sfx, pool: 8,
          onload: () => { st.spriteState = 'loaded'; }, onloaderror: (_, e) => { st.spriteState = 'error: ' + e; } });
      }
      if (st.want) { const w = st.want; st.want = null; api.music(w); }
    } catch (e) { st.failed = e.message; }
  }
  for (const t of cfg.unlockOn) win.addEventListener(t, unlock, { capture: true, passive: true });
  if (cfg.pauseWhenHidden) doc.addEventListener('visibilitychange', () => {
    const ctx = Howler.ctx; if (!st.unlocked || !ctx) return;
    if (doc.hidden) ctx.suspend?.().catch(() => {}); else ctx.resume?.().catch(() => {});
  });

  // music duck: the current track fades to settings.music x factor; a crossfade-in targets the same (no fight: howler's
  // fade() replaces any fade still running on that sound, and the outgoing track keeps fading to 0 untouched).
  const duck = createMusicDuck({ onChange: (f, ms) => applyMusic(ms) });
  function applyMusic(fadeMs = 0) {
    const m = st.music; if (!m) return;
    const to = musicTarget(settings, duck.factor());
    if (fadeMs > 0) m.howl.fade(m.howl.volume(), to, fadeMs); else m.howl.volume(to);
  }

  function trackUrl(id) {
    if (!st.urls.has(id)) st.urls.set(id, URL.createObjectURL(new Blob([wavBytes(synthTrack(id), 22050)], { type: 'audio/wav' })));
    return st.urls.get(id);
  }

  const api = {
    settings, cfg, platformId,
    get unlocked() { return st.unlocked; },
    get track() { return st.track; },
    unlock,
    sfx(id) {
      if (st.unlocked && !settings.muted && settings.sfx > 0 && st.spriteState === 'loaded' && DRAFT_SFX_SPRITE[id]) { st.sprite.play(id); return true; }
      if (!st.unlocked || !st.zzfx || settings.muted || settings.sfx <= 0 || !SFX[id]) return false;
      const out = bus(); if (!out) return false;
      const ctx = Howler.ctx;
      let buf = st.cache.get(id);
      if (!buf) {
        const samples = st.zzfx.buildSamples(...SFX[id]);
        buf = ctx.createBuffer(1, samples.length, st.zzfx.sampleRate);
        buf.getChannelData(0).set(samples);
        st.cache.set(id, buf);
      }
      const src = ctx.createBufferSource(); src.buffer = buf; src.connect(out); src.start();
      return true;
    },
    blip(text) {
      clearInterval(st.blipTimer);
      if (!cfg.blip) return 0;
      const instant = doc.body?.classList.contains('ui-reduce') || win.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      let left = blipCount(text, instant, cfg.blipEveryChars || 3);
      const ms = (parseFloat(win.getComputedStyle?.(doc.documentElement).getPropertyValue('--reveal-ms')) || 14) * (cfg.blipEveryChars || 3);
      const n = left;
      if (left-- > 0) api.sfx('blip');
      if (left > 0) st.blipTimer = setInterval(() => { if (left-- <= 0) clearInterval(st.blipTimer); else api.sfx('blip'); }, ms);
      return n;
    },
    music(id) {
      if (!st.unlocked) { st.want = id; return; }
      if (id === st.track) return;
      st.track = id;
      const fade = cfg.crossfadeMs, old = st.music;
      if (old) { old.howl.fade(old.howl.volume(), 0, fade); const h = old.howl; setTimeout(() => h.unload(), fade + 50); }
      st.music = null;
      if (!id) return;
      const loop = draftLoopFor(id); // DRAFT loop (ogg, m4a fallback) or the generated placeholder WAV
      const howl = loop ? new Howl({ src: draftSrc('music/kil_draft_' + loop), loop: true, volume: 0 }) : new Howl({ src: [trackUrl(id)], format: ['wav'], loop: true, volume: 0 });
      howl.play(); howl.fade(0, musicTarget(settings, duck.factor()), fade);
      st.music = { id, howl };
    },
    /** Poll the scene (map, zone, phase) and switch music when the track changes. */
    follow(scene, everyMs = 500) {
      clearInterval(st.followTimer);
      const tick = () => { try {
        // DRAFT battle loop while any battle screen is up (sd engine or old shell both render .ui-battle); off = old behaviour
        if (DRAFT_AUDIO.music && DRAFT_MUSIC.battle && doc.querySelector?.('.ui-battle')) return api.music('battle');
        if (!scene.fade) api.music(trackFor({ map: scene.map?.name, zone: scene.zone?.(), phase: scene.phase }));
      } catch { /* scene loading */ } };
      tick(); st.followTimer = setInterval(tick, everyMs);
    },
    setVolume(kind, v) {
      if (!['master', 'music', 'sfx'].includes(kind)) return;
      settings[kind] = Math.round(clamp01(v) * 100) / 100; persist();
      if (kind === 'master') applyMaster();
      if (kind === 'music' && st.music) st.music.howl.volume(musicTarget(settings, duck.factor())); // still ducked if held
      if (kind === 'sfx' && st.bus) st.bus.gain.value = settings.sfx;
      if (kind === 'sfx' && st.sprite) st.sprite.volume(settings.sfx);
    },
    setMuted(m) { settings.muted = !!m; persist(); applyMaster(); },
    /** RITA voice output (src/systems/rita_voice.js, Oct 23 2026): a gain node into howler's master gain, so master volume
     *  and mute cover the voice. null until the first gesture unlocked audio. */
    voiceOut() {
      const ctx = Howler.ctx; if (!st.unlocked || !ctx || !Howler.masterGain) return null;
      if (!st.voice || st.voice.context !== ctx) { st.voice = ctx.createGain(); st.voice.gain.value = 1; st.voice.connect(Howler.masterGain); }
      return st.voice;
    },
    /**
     * Turn the music down while something talks (RITA's comms strip). -> true when the hold was taken. A no-op (false)
     * when audio is locked, muted or the music volume is 0. Overlapping ids are reference-counted (lowest level wins).
     */
    duck(id, level = DUCK_DEFAULTS.level, fadeMs = DUCK_DEFAULTS.fadeInMs, maxMs = DUCK_DEFAULTS.maxMs) {
      if (!st.unlocked || settings.muted || !(settings.music > 0)) return false;
      return duck.duck(id, level, fadeMs, maxMs);
    },
    /** Release one hold of id (all = every hold of id); music returns to the user's volume when nothing holds it. */
    unduck(id, fadeMs = DUCK_DEFAULTS.fadeOutMs, all = false) { return duck.unduck(id, fadeMs, all); },
    unduckAll(fadeMs = DUCK_DEFAULTS.fadeOutMs) { duck.clear(fadeMs); },
    get duckFactor() { return duck.factor(); },
    musicVolume: () => (st.music ? st.music.howl.volume() : null),
    state: () => ({ unlocked: st.unlocked, failed: st.failed, track: st.track, ctx: Howler.ctx?.state || null, sampleRate: Howler.ctx?.sampleRate || null, zzfx: !!st.zzfx, draft: { ...DRAFT_AUDIO }, sfxSprite: st.spriteState, musicLoop: draftLoopFor(st.track), duck: duck.state(), ...settings }),
  };
  return api;
}

/** Placeholder slots still waiting for real audio (report + docs). */
export function placeholderList(layout) {
  return {
    music: musicTrackIds(layout).map((id) => ({ id, built: !id.includes('.') || id.startsWith('route.') || (layout?.zones || []).some((z) => `${z.id}.` === id.slice(0, z.id.length + 1) && z.maps?.length), draft: draftLoopFor(id) })),
    sfx: Object.keys(SFX).map((id) => ({ id, use: SFX_USES[id], draft: !!(DRAFT_AUDIO.sfx && DRAFT_SFX_SPRITE[id]) })),
  };
}

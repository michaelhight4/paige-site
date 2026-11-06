// Boundwake original music beds. Web Audio BufferSource.loop = true for gapless loops
// (HTML5 <audio loop> always inserts a stop/restart click even on seamless OGGs).
const BASE = 'assets/music/';
const TRACKS = {
  hub: { ogg: 'hub_life.ogg', mp3: 'hub_life.mp3' },
  adventure: { ogg: 'adventure_travel.ogg', mp3: 'adventure_travel.mp3' },
  night: { ogg: 'dusk_night.ogg', mp3: 'dusk_night.mp3' },
};
const VOL = 0.4;
const XFADE = 1.4; // seconds
const MUTE_KEY = 'bw.music.muted';

let unlocked = false;
let muted = localStorage.getItem(MUTE_KEY) === '1';
let curKey = '';
let wanted = 'hub';
let ctx = null;
let master = null;
/** @type {Record<string, AudioBuffer>} */
const buffers = {};
let loading = {};
/** @type {{src:AudioBufferSourceNode, gain:GainNode, key:string}|null} */
let live = null;
/** @type {{src:AudioBufferSourceNode, gain:GainNode, key:string}|null} */
let fading = null;

function ensureCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : VOL;
  master.connect(ctx.destination);
  return ctx;
}

function urlsFor(key) {
  const t = TRACKS[key] || TRACKS.hub;
  return [BASE + t.ogg, BASE + t.mp3];
}

async function loadBuffer(key) {
  if (buffers[key]) return buffers[key];
  if (loading[key]) return loading[key];
  const c = ensureCtx();
  if (!c) return null;
  loading[key] = (async () => {
    let lastErr;
    for (const url of urlsFor(key)) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(String(res.status));
        const ab = await res.arrayBuffer();
        const buf = await c.decodeAudioData(ab.slice(0));
        buffers[key] = buf;
        return buf;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error('music load failed');
  })();
  try {
    return await loading[key];
  } finally {
    delete loading[key];
  }
}

function stopNode(node, when) {
  if (!node) return;
  try { node.src.stop(when); } catch (_) {}
  try { node.src.disconnect(); } catch (_) {}
  try { node.gain.disconnect(); } catch (_) {}
}

function startLoop(key, buf, startVol) {
  const c = ensureCtx();
  const gain = c.createGain();
  gain.gain.value = startVol;
  gain.connect(master);
  const src = c.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  src.connect(gain);
  src.start(0);
  return { src, gain, key };
}

async function crossfadeTo(key) {
  const c = ensureCtx();
  if (!c || muted || !unlocked) return;
  if (key === curKey && live) return;
  let buf;
  try {
    buf = await loadBuffer(key);
  } catch (_) {
    return;
  }
  if (!buf) return;
  // Drop stale loads if the player asked for another bed while we decoded.
  if (wanted !== key) return;
  if (key === curKey && live) return;
  // Mute / lock may have flipped while we were decoding — never start a loop then.
  if (muted || !unlocked) return;

  await c.resume().catch(() => {});
  // Re-check after resume (resume is async); a mute click can land in between.
  if (muted || !unlocked || wanted !== key) return;

  const next = startLoop(key, buf, 0);
  const prev = live;
  live = next;
  curKey = key;

  const now = c.currentTime;
  const t = Math.max(0.05, XFADE);
  next.gain.gain.cancelScheduledValues(now);
  next.gain.gain.setValueAtTime(0, now);
  next.gain.gain.linearRampToValueAtTime(1, now + t);

  if (prev) {
    fading = prev;
    prev.gain.gain.cancelScheduledValues(now);
    prev.gain.gain.setValueAtTime(prev.gain.gain.value, now);
    prev.gain.gain.linearRampToValueAtTime(0, now + t);
    const endAt = now + t + 0.05;
    stopNode(prev, endAt);
    setTimeout(() => { if (fading === prev) fading = null; }, (t + 0.1) * 1000);
  }
}

export function pickTrack(tab, tod) {
  const nightish = tod === 'dusk' || tod === 'night';
  if (nightish) return 'night';
  if (tab === 'adv' || tab === 'realms') return 'adventure';
  return 'hub';
}

export function syncMusic(tab, tod) {
  wanted = pickTrack(tab, tod || document.documentElement.dataset.tod || 'day');
  updateToggle();
  if (!unlocked || muted) return;
  crossfadeTo(wanted);
}

export function unlockMusic() {
  if (unlocked) return;
  unlocked = true;
  const c = ensureCtx();
  if (c) c.resume().catch(() => {});
  if (!muted) {
    if (master) master.gain.value = VOL;
    crossfadeTo(wanted);
  }
  updateToggle();
}

export function setMuted(v) {
  muted = !!v;
  localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  ensureCtx();
  if (master) {
    const c = ctx;
    const now = c ? c.currentTime : 0;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(muted ? 0 : VOL, now);
  }
  if (muted) {
    stopNode(live, ctx ? ctx.currentTime + 0.05 : 0);
    stopNode(fading, ctx ? ctx.currentTime + 0.05 : 0);
    live = null;
    fading = null;
    curKey = '';
    // Belt-and-braces: suspend the graph so nothing can keep sounding.
    if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {});
  } else if (unlocked) {
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    crossfadeTo(wanted);
  }
  updateToggle();
}

export function toggleMute() {
  // Callers unlock first (document gesture + unlockMusic()). Always flip mute
  // so the first music-button click ends muted when music just started.
  setMuted(!muted);
  return muted;
}
export function isMuted() { return muted; }

export function musicToggleHTML() {
  return `<button type="button" class="music-tog" data-a="music" aria-label="Toggle music" title="Music">${muted ? '🔇' : '🎵'}</button>`;
}

function updateToggle() {
  document.querySelectorAll('.music-tog').forEach((btn) => {
    btn.textContent = muted ? '🔇' : '🎵';
    btn.setAttribute('aria-pressed', muted ? 'true' : 'false');
    btn.title = muted ? 'Unmute music' : 'Mute music';
  });
}

export function mountMusic() {
  updateToggle();
  const unlock = () => unlockMusic();
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) =>
    document.addEventListener(ev, unlock, { once: true, passive: true }));
  const obs = new MutationObserver(() =>
    syncMusic(document.body.dataset.tab || 'life', document.documentElement.dataset.tod));
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-tod'] });
}

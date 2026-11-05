// Boundwake original music beds (Nov 5, 2026 CT). Prefer OGG for gapless HTML5 loop.
const BASE = 'assets/music/';
const TRACKS = {
  hub: { ogg: 'hub_life.ogg', mp3: 'hub_life.mp3' },
  adventure: { ogg: 'adventure_travel.ogg', mp3: 'adventure_travel.mp3' },
  night: { ogg: 'dusk_night.ogg', mp3: 'dusk_night.mp3' },
};
const VOL = 0.4;
const XFADE = 1400;
const MUTE_KEY = 'bw.music.muted';

let unlocked = false, muted = localStorage.getItem(MUTE_KEY) === '1';
let curKey = '', a = null, b = null, usingA = true, fadeTimer = 0, wanted = 'hub';

function el() {
  const x = new Audio();
  x.preload = 'auto';
  x.loop = true;
  x.volume = 0;
  x.setAttribute('playsinline', '');
  return x;
}
function srcFor(key) {
  const t = TRACKS[key] || TRACKS.hub;
  // Prefer OGG; browsers that can't play it fall through via error → mp3
  return BASE + t.ogg;
}
function fallbackMp3(key) {
  const t = TRACKS[key] || TRACKS.hub;
  return BASE + t.mp3;
}

export function pickTrack(tab, tod) {
  const nightish = tod === 'dusk' || tod === 'night';
  if (nightish) return 'night';
  if (tab === 'adv' || tab === 'realms') return 'adventure';
  return 'hub';
}

function active() { return usingA ? a : b; }
function inactive() { return usingA ? b : a; }

function ensureNodes() {
  if (!a) { a = el(); b = el(); document.body.append(a, b); a.style.display = b.style.display = 'none';
    a.addEventListener('error', () => { if (curKey && a.src.endsWith('.ogg')) { a.src = fallbackMp3(curKey); a.load(); if (unlocked && !muted) a.play().catch(() => {}); } });
    b.addEventListener('error', () => { if (curKey && b.src.endsWith('.ogg')) { b.src = fallbackMp3(curKey); b.load(); if (unlocked && !muted) b.play().catch(() => {}); } });
  }
}

function clearFade() { if (fadeTimer) { clearInterval(fadeTimer); fadeTimer = 0; } }

function crossfadeTo(key) {
  ensureNodes();
  if (key === curKey && active().src) return;
  const next = inactive();
  const prev = active();
  next.src = srcFor(key);
  next.load();
  next.currentTime = 0;
  next.volume = 0;
  curKey = key;
  const start = () => {
    if (muted || !unlocked) return;
    next.play().catch(() => {});
    clearFade();
    const t0 = performance.now();
    fadeTimer = setInterval(() => {
      const p = Math.min(1, (performance.now() - t0) / XFADE);
      next.volume = VOL * p;
      prev.volume = VOL * (1 - p);
      if (p >= 1) {
        clearFade();
        prev.pause();
        prev.volume = 0;
        usingA = !usingA;
        next.volume = VOL;
      }
    }, 40);
  };
  if (next.readyState >= 2) start();
  else next.addEventListener('canplay', start, { once: true });
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
  ensureNodes();
  // silent unlock gesture
  const x = active();
  x.src = srcFor(wanted);
  x.load();
  curKey = wanted;
  if (!muted) {
    x.volume = VOL;
    x.play().catch(() => {});
  }
  updateToggle();
}

export function setMuted(v) {
  muted = !!v;
  localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  ensureNodes();
  if (muted) {
    clearFade();
    a && a.pause(); b && b.pause();
    if (a) a.volume = 0; if (b) b.volume = 0;
  } else if (unlocked) {
    crossfadeTo(wanted);
    const x = active();
    x.volume = VOL;
    x.play().catch(() => {});
  }
  updateToggle();
}

export function toggleMute() {
  // First control tap should unlock + play, not flip straight into mute.
  if (!unlocked) { unlockMusic(); setMuted(false); return muted; }
  setMuted(!muted); return muted;
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
  ensureNodes();
  updateToggle();
  const unlock = () => unlockMusic();
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => document.addEventListener(ev, unlock, { once: true, passive: true }));
  // re-sync when ambient tod flips
  const obs = new MutationObserver(() => syncMusic(document.body.dataset.tab || 'life', document.documentElement.dataset.tod));
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-tod'] });
}

// Kilumen: landscape-only play on phones and tablets (Gary, Oct 22, 2026).
// Driven by the platform profile (src/platform.js): a profile with controls.orientation "landscape" (mobile.json)
// sets body.landscape-only, and the CSS overlay (#rotate) then covers the game whenever the screen is upright.
// Here we also ask the browser to lock landscape on the first tap (only works in fullscreen, so we request it); any
// refusal is ignored and the overlay still does the job. The PC profile (orientation "any") is never affected.
import './alpha.js?v=v0.2.63-alpha'; // ALPHA build: strips URL flags before the platform is picked
import { startPlatform } from './platform.js?v=v0.2.63-alpha';

const portrait = matchMedia('(orientation: portrait)');
const overlay = document.getElementById('rotate');
let landscapeOnly = false;

function sync() {
  const block = landscapeOnly && portrait.matches;
  document.body.classList.toggle('needs-landscape', block);
  if (overlay) overlay.setAttribute('aria-hidden', block ? 'false' : 'true');
  // Drop any held direction or button so the player doesn't keep walking behind the overlay.
  if (block) window.dispatchEvent(new Event('blur'));
}
portrait.addEventListener?.('change', sync);

async function tryLock() {
  if (!landscapeOnly) return;
  try {
    const r = document.documentElement;
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      if (r.requestFullscreen) await r.requestFullscreen({ navigationUI: 'hide' });
      else if (r.webkitRequestFullscreen) r.webkitRequestFullscreen(); // phone menu fix: older Android / iPad Safari prefix
    }
    await screen.orientation?.lock?.('landscape');
  } catch { /* iOS Safari and some browsers refuse; the overlay covers it */ }
}

startPlatform().then((p) => {
  landscapeOnly = p.profile.controls?.orientation === 'landscape';
  sync();
  if (landscapeOnly) window.addEventListener('pointerdown', tryLock, { once: true, capture: true });
}).catch(() => { /* main.js reports a profile failure */ });

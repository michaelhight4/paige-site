// Kilumen: one-tap full screen on phones (mobile full screen pass, Oct 23, 2026; Gary: "make sure the mobile version uses the
// whole screen"). Only when the platform profile asks (mobile.json display.fullscreenButton); pc never gets the chip.
// Tap: Fullscreen API (standard or webkit-prefixed) + landscape orientation lock where supported. iPhone Safari has no
// element full screen, so the tap shows display.iosHint (Add to Home Screen; the manifest's display fullscreen/standalone and
// the apple-mobile-web-app-capable meta then give a bar-free launch). The chip hides while in full screen.
import { startPlatform } from './platform.js?v=v0.2.24-alpha';

const doc = document, root = doc.documentElement;
const fsElement = () => doc.fullscreenElement || doc.webkitFullscreenElement || null;
const canFullscreen = () => !!(root.requestFullscreen || root.webkitRequestFullscreen);
const standalone = () => matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || navigator.standalone === true;

export async function enterFullscreen() {
  try {
    if (!fsElement()) {
      if (root.requestFullscreen) await root.requestFullscreen({ navigationUI: 'hide' });
      else if (root.webkitRequestFullscreen) root.webkitRequestFullscreen();
    }
    await screen.orientation?.lock?.('landscape');
  } catch { /* refused (iOS, desktop emulation, no user gesture): the landscape overlay still covers portrait */ }
}

function hint(text) {
  const t = doc.getElementById('toast');
  if (!t || !text) return;
  t.textContent = text; t.hidden = false;
  clearTimeout(hint._t); hint._t = setTimeout(() => { t.hidden = true; }, 4200);
}

// Phone menu fix (Oct 23, 2026; Gary: "make the web site so the web bar auto hides for phone users"): a page cannot hide
// iPhone Safari's bars, so where the Fullscreen API is missing show display.iosHint once as a dismissible banner.
function iosHintOnce(text) {
  const KEY = 'kilumen.iosHint';
  try { if (localStorage.getItem(KEY)) return; localStorage.setItem(KEY, '1'); } catch { /* private mode: show it anyway */ }
  const box = doc.createElement('div');
  box.id = 'ios-hint'; box.setAttribute('role', 'status');
  const msg = doc.createElement('span'); msg.textContent = text;
  const x = doc.createElement('button'); x.type = 'button'; x.textContent = '\u2715'; x.setAttribute('aria-label', 'Dismiss');
  const close = () => box.remove();
  x.addEventListener('pointerup', (e) => { e.preventDefault(); e.stopPropagation(); close(); });
  x.addEventListener('pointerdown', (e) => e.stopPropagation());
  box.append(msg, x); doc.body.appendChild(box);
  setTimeout(close, 12000);
}

startPlatform().then((p) => {
  const d = p.profile.display;
  if (!d?.fullscreenButton || standalone()) return;
  if (d.iosHintOnce && !canFullscreen()) iosHintOnce(d.iosHint);
  const b = doc.createElement('button');
  b.id = 'fs-btn'; b.type = 'button'; b.textContent = '\u26F6'; b.setAttribute('aria-label', 'Full screen');
  const sync = () => { b.hidden = !!fsElement(); };
  b.addEventListener('pointerup', (e) => {
    e.preventDefault(); e.stopPropagation();
    if (canFullscreen()) enterFullscreen(); else hint(d.iosHint);
  });
  doc.addEventListener('fullscreenchange', sync); doc.addEventListener('webkitfullscreenchange', sync);
  doc.body.appendChild(b); sync();
}).catch(() => { /* main.js reports a profile failure */ });

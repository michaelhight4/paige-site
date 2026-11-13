// Kilumen optional PWA (installable + offline). OFF by default: index.html only imports this file when the URL has
// ?pwa=1 / ?pwa=0 or when PWA_ENABLED is set to true in the one-line loader at the end of index.html.
//   ?pwa=1  register kilumen-sw.js (precached game shell, runtime-cached art/audio, versioned caches) and point the
//           page at pwa/kilumen.webmanifest (icons + landscape) so Chrome/Edge/Android offer "Install".
//   ?pwa=0  unregister the worker and delete every "kilumen-" cache (back to the plain live game).
// Test hook: window.kilumenPWA = { status, build, ready, installPrompt }.
// Built by tools/pwa_build.mjs (workbox-build 7.4.1, MIT). See pwa/README.md.
const q = new URLSearchParams(location.search);
const mode = q.get('pwa');
const ROOT_URL = new URL('../', import.meta.url);
const state = (window.kilumenPWA = { status: 'off', build: null, ready: null, installPrompt: null });

function askBuild(sw) {
  return new Promise((res) => {
    if (!sw) return res(null);
    const ch = new MessageChannel();
    const t = setTimeout(() => res(null), 3000);
    ch.port1.onmessage = (e) => { clearTimeout(t); res(e.data && e.data.build); };
    sw.postMessage({ type: 'KILUMEN_SW_BUILD' }, [ch.port2]);
  });
}

if (!('serviceWorker' in navigator)) {
  state.status = 'unsupported';
} else if (mode === '0') {
  state.ready = (async () => {
    for (const r of await navigator.serviceWorker.getRegistrations()) if (r.scope === ROOT_URL.href) await r.unregister();
    for (const k of await caches.keys()) if (k.startsWith('kilumen-')) await caches.delete(k);
    // A page that is still controlled keeps feeding the old worker (which re-creates its art cache), so reload once.
    if (navigator.serviceWorker.controller && !sessionStorage.getItem('kilumen-pwa-off')) {
      sessionStorage.setItem('kilumen-pwa-off', '1');
      location.reload();
      return state;
    }
    sessionStorage.removeItem('kilumen-pwa-off');
    state.status = 'removed';
    return state;
  })();
} else {
  // Manifest with icons for install; the plain manifest.webmanifest stays the default for the live game.
  const link = document.querySelector('link[rel="manifest"]') || document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'manifest' }));
  link.href = new URL('kilumen.webmanifest', import.meta.url).href;
  const touch = document.createElement('link');
  touch.rel = 'apple-touch-icon';
  touch.href = new URL('icons/PLACEHOLDER_keyart_crop_192.png', import.meta.url).href;
  document.head.appendChild(touch);
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); state.installPrompt = e; state.installable = true; });
  state.status = 'registering';
  state.ready = navigator.serviceWorker.register(new URL('kilumen-sw.js', ROOT_URL).href, { scope: ROOT_URL.pathname })
    .then(() => navigator.serviceWorker.ready)
    .then(async (reg) => { state.status = 'active'; state.build = await askBuild(reg.active); return state; })
    .catch((err) => { state.status = 'error'; state.error = String(err); console.warn('[kilumen pwa]', err); return state; });
}

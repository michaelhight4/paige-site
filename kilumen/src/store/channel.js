// Which storefront this copy of Kilumen runs in (dev/kilumen-store, Gary Oct 31 2026: "store, subscription and ads go on
// Android AND the website ... Gate them off on Steam/desktop"). Pure: tests pass an env, the game passes the real one.
//   'android' : Capacitor native (Play Billing + AdMob)
//   'web'     : paigegames.net (Stripe Checkout TEST + the web ad provider)
//   'desktop' : Electron / Steam build (app://kilumen/..., Electron UA, or the desktop preload bridge): NO shop, NO ads
//   'none'    : anything else (file://, unknown hosts, Node). No shop, no ads. Fail closed.
// Dev hosts (localhost / 127.0.0.1) count as 'web' only with ?store=web|test, so local play-checks stay clean.
export const WEB_HOSTS = Object.freeze(['paigegames.net', 'www.paigegames.net']);
export const DEV_HOSTS = Object.freeze(['localhost', '127.0.0.1']);

/** env: {protocol, hostname, search, userAgent, native, desktopBridge} -> {id, reason, test} */
export function detectChannel(env = {}) {
  const q = new URLSearchParams(env.search || '');
  const ua = String(env.userAgent || ''), proto = String(env.protocol || ''), host = String(env.hostname || '').toLowerCase();
  // desktop first: a desktop build must never sell or show ads, whatever the URL says
  if (env.desktopBridge || /\bElectron\//.test(ua) || proto === 'app:') return { id: 'desktop', reason: env.desktopBridge ? 'desktop bridge' : proto === 'app:' ? 'app: protocol' : 'Electron UA', test: false };
  if (env.native) return { id: 'android', reason: 'Capacitor native', test: false };
  if (proto === 'https:' && WEB_HOSTS.includes(host)) return { id: 'web', reason: host, test: false };
  if ((proto === 'http:' || proto === 'https:') && DEV_HOSTS.includes(host) && ['web', 'test'].includes(q.get('store'))) return { id: 'web', reason: 'dev host ?store=' + q.get('store'), test: true };
  return { id: 'none', reason: proto ? `${proto}//${host}` : 'no location', test: false };
}

/** The real environment (browser). */
export function currentEnv(g = globalThis) {
  const loc = g.location || {};
  let native = false; try { native = !!g.Capacitor?.isNativePlatform?.(); } catch { native = false; }
  return { protocol: loc.protocol, hostname: loc.hostname, search: g.__kilumenBootSearch ?? loc.search, userAgent: g.navigator?.userAgent || '', native,
    desktopBridge: !!(g.kilumenDesktop || g.kilumenSteam || g.steam) };
}

/** Does this channel get a shop / ads at all? */
export const storeOn = (ch) => ch?.id === 'android' || ch?.id === 'web';
export const adsOn = storeOn;

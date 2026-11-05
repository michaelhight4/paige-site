// Boundwake public alpha gate (Gary Nov 5 ~2:27 PM CT).
// Was admin-only via admin_me; now open to everyone like Kilumen alpha.
// Localhost and live both play. Keep helpers for future soft gates.
const LOCAL = ['localhost', '127.0.0.1'];

export function isLocalHost(loc = globalThis.location) {
  return LOCAL.includes(String(loc?.hostname || '').toLowerCase());
}

/** Public alpha: always ok. */
export async function checkAdminAccess() {
  return { ok: true, role: isLocalHost() ? 'local' : 'public', tag: 'alpha', email: '' };
}

export function gateHTML() {
  return `<div class="card panel-gate"><div class="card-hd">Boundwake · alpha</div><div class="card-body">
    <p class="eyebrow">Alpha</p>
    <h1>Boundwake</h1>
    <p class="sub">Loading…</p>
    <p><a class="btn-gate" href="/">Paige Games</a></p></div></div>`;
}

// Online config. Empty by default: online play runs on the LOCAL transport only (BroadcastChannel,
// no server). The Supabase transport turns on only when a project URL and a PUBLIC key are supplied,
// either here or at runtime via window.KILUMEN_ONLINE_CONFIG = { supabaseUrl, supabaseKey }.
// NEVER put a service-role / secret key here (or anywhere in the client, or in git). checkPublicKey()
// refuses one even if someone tries.
export const ONLINE_CONFIG = Object.freeze({
  supabaseUrl: '',  // e.g. https://<project-ref>.supabase.co  (left blank on purpose: not connected)
  supabaseKey: '',  // publishable (sb_publishable_...) or legacy anon JWT ONLY
});

function b64urlJson(part) {
  const s = part.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s + '='.repeat((4 - (s.length % 4)) % 4);
  const txt = typeof atob === 'function' ? atob(pad) : Buffer.from(pad, 'base64').toString('binary');
  return JSON.parse(txt);
}

/** Is this key safe to ship in a browser? { ok, reason } */
export function checkPublicKey(key) {
  if (typeof key !== 'string' || !key) return { ok: false, reason: 'missing' };
  if (key.startsWith('sb_secret_')) return { ok: false, reason: 'secret key: never use in the client' };
  if (key.startsWith('sb_publishable_')) return { ok: true, reason: null };
  const parts = key.split('.');
  if (parts.length === 3) {
    let claims = null;
    try { claims = b64urlJson(parts[1]); } catch { return { ok: false, reason: 'unreadable key' }; }
    if (claims?.role === 'anon') return { ok: true, reason: null };
    return { ok: false, reason: `role "${claims?.role}" is not public: never use in the client` };
  }
  return { ok: false, reason: 'unknown key format' };
}

/** Pick the transport: 'local' (default), 'supabase' (only if configured + public key), or 'off'. */
export function resolveOnline(params, win = globalThis) {
  const want = params?.get?.('transport') || 'local';
  const cfg = { ...ONLINE_CONFIG, ...(win?.KILUMEN_ONLINE_CONFIG || {}) };
  if (want === 'supabase') {
    if (!cfg.supabaseUrl || !/^https:\/\//.test(cfg.supabaseUrl)) return { kind: 'off', reason: 'no Supabase URL configured' };
    const k = checkPublicKey(cfg.supabaseKey);
    if (!k.ok) return { kind: 'off', reason: `Supabase key refused (${k.reason})` };
    return { kind: 'supabase', url: cfg.supabaseUrl, key: cfg.supabaseKey };
  }
  if (want === 'off') return { kind: 'off', reason: 'turned off' };
  return { kind: 'local' };
}

// Admin-only gate for paigegames.net/boundwake/ (same pattern as Kilumen src/dev/devgate.js).
// Localhost / 127.0.0.1: always open (local play). Live: require signed-in owner/admin via admin_me RPC.
// No client-side secret. Security is the server's public.admins check.
const SB_URL = 'https://kjdubkeowcyuoazvpoyt.supabase.co';
const SB_KEY = 'sb_publishable_NZC6vzmXDYRLnRh2vDHWAg_VCDi3FQc';
const SB_LIB = 'https://esm.sh/@supabase/supabase-js@2.45.4';
const ROLES = ['owner', 'admin'];
const LOCAL = ['localhost', '127.0.0.1'];

export function isLocalHost(loc = globalThis.location) {
  return LOCAL.includes(String(loc?.hostname || '').toLowerCase());
}

export async function checkAdminAccess(roles = ROLES) {
  if (isLocalHost()) return { ok: true, role: 'local', tag: 'local', email: '' };
  // ?gate=off is intentionally ignored on live hosts — only localhost bypasses.
  try {
    const { createClient } = await import(SB_LIB);
    const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: false, detectSessionInUrl: false, flowType: 'implicit' } });
    let { data: u, error: ue } = await sb.auth.getUser();
    if (ue || !u?.user) {
      try { const r = await sb.auth.refreshSession(); if (!r.error) ({ data: u, error: ue } = await sb.auth.getUser()); } catch (_) { /* */ }
    }
    const user = u?.user;
    if (ue || !user) return { ok: false, reason: 'not_signed_in' };
    if (user.is_anonymous) return { ok: false, reason: 'guest_account' };
    const { data: me, error } = await sb.rpc('admin_me');
    if (error) return { ok: false, reason: 'check_failed' };
    const role = me && me.role;
    if (!role || !roles.includes(role)) return { ok: false, reason: 'not_admin' };
    return { ok: true, role, tag: me.tag || '', email: user.email || '' };
  } catch (_) {
    return { ok: false, reason: 'check_failed' };
  }
}

export function gateHTML(reason) {
  const msg = {
    not_signed_in: 'Sign in on Paige Games with an admin account, then open this page again.',
    guest_account: 'Guest sessions can’t open Boundwake yet. Sign in with an admin account.',
    not_admin: 'This build is admin-only. Your account isn’t on the admin list.',
    check_failed: 'Couldn’t verify admin access. Check your connection and try again.',
  }[reason] || 'Admin access required.';
  return `<div class="card panel-gate"><div class="card-hd">Boundwake · admin play</div><div class="card-body">
    <p class="eyebrow">Admin only</p>
    <h1>Admin play only</h1>
    <p class="sub">${msg}</p>
    <p><a class="btn-gate" href="/">Sign in on Paige Games</a></p>
    <p class="sub muted">Not linked from the public games list. After you sign in as owner/admin, reload this URL.</p></div></div>`;
}

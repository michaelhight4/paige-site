// Dev console gate (v0.2.25). The console is allowed only when ALL of these hold:
//   1. the URL asked for it (?dev=1, read by alpha.js before it strips the query), and
//   2. a real (non-anonymous) Supabase session exists, validated by the auth server (auth.getUser), and
//   3. the server's own admin check says so: the same `admin_me` RPC the site's admin page and header tag use
//      (security definer, reads public.admins; admin rows are written only by SQL / service role). Role must be owner or admin.
// There is no key, flag or constant stored in the client. Nothing in this file is loaded unless ?dev=1 was in the URL.
const SB_URL = 'https://kjdubkeowcyuoazvpoyt.supabase.co';
const SB_KEY = 'sb_publishable_NZC6vzmXDYRLnRh2vDHWAg_VCDi3FQc'; // the site's public publishable key (same one auth.js ships)
const SB_LIB = 'https://esm.sh/@supabase/supabase-js@2.45.4';        // same pinned build as /auth.js
const ROLES = ['owner', 'admin'];

export async function checkDevAccess() {
  try {
    const { createClient } = await import(SB_LIB);
    // same origin => same persisted session as the site's sign-in; read-only use (no refresh loops, no URL parsing)
    const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: false, detectSessionInUrl: false, flowType: 'implicit' } });
    const { data: u, error: ue } = await sb.auth.getUser();
    const user = u?.user;
    if (ue || !user) return { ok: false, reason: 'not_signed_in' };
    if (user.is_anonymous) return { ok: false, reason: 'guest_account' };
    const { data: me, error } = await sb.rpc('admin_me');
    if (error) return { ok: false, reason: 'check_failed' };
    const role = me && me.role;
    if (!role || !ROLES.includes(role)) return { ok: false, reason: 'not_admin' };
    return { ok: true, role, tag: me.tag || '', email: user.email || '' };
  } catch (e) {
    return { ok: false, reason: 'check_failed' };
  }
}

// Dev console gate (v0.2.26). The console is allowed only when ALL of these hold:
//   1. the URL asked for it (?dev=1, read by alpha.js before it strips the query), and
//   2. a real (non-anonymous) Supabase session exists, validated by the auth server (auth.getUser), and
//   3. the server's own admin check says so: the same `admin_me` RPC the site's admin page and header tag use
//      (security definer, reads public.admins; admin rows are written only by SQL / service role). Role must be owner or admin.
// There is no key, flag or constant stored in the client.
// v0.2.39 (Gary, Oct 29 2026: "dev menu on my owner account at all times"): main.js also runs this check WITHOUT ?dev=1 when the
// browser holds a site sign-in (sb-*-auth-token in localStorage). That is only a hint so ordinary players never load supabase-js;
// the decision is still steps 2 and 3 above, and the auto path accepts role 'owner' only. ?dev=1 keeps owner + admin.
const SB_URL = 'https://kjdubkeowcyuoazvpoyt.supabase.co';
const SB_KEY = 'sb_publishable_NZC6vzmXDYRLnRh2vDHWAg_VCDi3FQc'; // the site's public publishable key (same one auth.js ships)
const SB_LIB = 'https://esm.sh/@supabase/supabase-js@2.45.4';        // same pinned build as /auth.js
const ROLES = ['owner', 'admin'];

/** Cheap hint only (never trusted for the role): does this origin hold a Supabase sign-in? */
export function hasSessionHint(store = globalThis.localStorage) {
  try { for (let i = 0; i < store.length; i++) if (/^sb-[a-z0-9]+-auth-token$/.test(store.key(i) || '')) return true; } catch (e) { /* storage blocked */ }
  return false;
}

export async function checkDevAccess(roles = ROLES, loadLib = () => import(SB_LIB)) {
  try {
    const { createClient } = await loadLib();
    // same origin => same persisted session as the site's sign-in; read-only use (no refresh loops, no URL parsing)
    const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: false, detectSessionInUrl: false, flowType: 'implicit' } });
    const { data: u, error: ue } = await sb.auth.getUser();
    const user = u?.user;
    if (ue || !user) return { ok: false, reason: 'not_signed_in' };
    if (user.is_anonymous) return { ok: false, reason: 'guest_account' };
    const { data: me, error } = await sb.rpc('admin_me');
    if (error) return { ok: false, reason: 'check_failed' };
    const role = me && me.role;
    if (!role || !roles.includes(role)) return { ok: false, reason: 'not_admin' };
    return { ok: true, role, tag: me.tag || '', email: user.email || '' };
  } catch (e) {
    return { ok: false, reason: 'check_failed' };
  }
}

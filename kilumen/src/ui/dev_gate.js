// Kilumen developer console gate (v0.2.26). The console only exists when BOTH are true:
//   1. the page was opened with ?dev=1 (alpha.js remembers it before it strips the query), and
//   2. the signed-in paigegames.net account is a site owner / admin: the same server check the site's own Admin link uses
//      (RPC admin_me -> {role, tag}; role 'owner' or 'admin'; anonymous / guest sessions never count).
// Players never reach dev_console.js: it is not imported unless both checks pass, and nothing here is shown or announced
// otherwise (the reason goes to the browser console only). Read-only: no Supabase data or schema is touched.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SB_URL = 'https://kjdubkeowcyuoazvpoyt.supabase.co';
const SB_KEY = 'sb_publishable_NZC6vzmXDYRLnRh2vDHWAg_VCDi3FQc'; // publishable key, same one auth.js / playtime.js ship
const ADMIN_ROLES = ['owner', 'admin'];

/** -> {ok, why}. Same session as the rest of the site (shared localStorage on paigegames.net); this client never writes data. */
export async function isSiteAdmin() {
  try {
    const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: false, detectSessionInUrl: false } });
    const { data: { session } } = await sb.auth.getSession();
    const user = session?.user;
    if (!user) return { ok: false, why: 'not signed in on paigegames.net (sign in there first, then reload with ?dev=1)' };
    if (user.is_anonymous) return { ok: false, why: 'guest session, not a real account' };
    const { data, error } = await sb.rpc('admin_me');
    if (error || !data) return { ok: false, why: 'account is not a site admin' };
    if (!ADMIN_ROLES.includes(data.role)) return { ok: false, why: 'account role is not owner / admin' };
    return { ok: true, role: data.role };
  } catch (e) { return { ok: false, why: 'admin check failed: ' + (e?.message || e) }; }
}

/** k = window.kilumen. Waits for the UI + systems to be up, checks the account, then loads the console. */
export async function startDevGate(k) {
  const verdict = await isSiteAdmin();
  if (!verdict.ok) { console.info('Kilumen dev console: off (' + verdict.why + ')'); return null; }
  for (let i = 0; i < 160 && !(k.ui && k.scene?.systems?.party); i++) await new Promise((r) => setTimeout(r, 250)); // up to 40 s
  if (!(k.ui && k.scene?.systems?.party)) { console.info('Kilumen dev console: off (game not ready)'); return null; }
  const m = await import('./dev_console.js?v=v0.2.89-alpha');
  k.devConsole = m.mountDevConsole({ scene: k.scene, ui: k.ui, role: verdict.role });
  console.info('Kilumen dev console: on (' + verdict.role + '). DEV button, or F2.');
  return k.devConsole;
}

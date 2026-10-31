// Riftward maintenance gate. Riftward is offline for everyone except signed-in admin accounts.
// Admin is decided server-side by the admin_me RPC (public.admins), the same check auth.js/admin.html use.
// Uses the site's Supabase session (same project + default storage key as auth.js), so signing in on paigegames.net carries over.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
const sb = createClient('https://kjdubkeowcyuoazvpoyt.supabase.co', 'sb_publishable_NZC6vzmXDYRLnRh2vDHWAg_VCDi3FQc',
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
export async function isRiftwardAdmin() {
  try {
    const { data: { user } } = await sb.auth.getUser();
    if (!user || user.is_anonymous) return false;
    const { data, error } = await sb.rpc('admin_me');
    return !error && !!data && ['owner', 'admin'].includes(data.role);
  } catch { return false; }
}

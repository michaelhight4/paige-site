// In-game account sign-in (v0.2.49, Gary Oct 29 2026). A home-screen web app (iOS/Android PWA) has its own storage,
// so the browser's paigegames.net sign-in does not carry over. This is an in-app email + password form (no popup,
// no redirect, so it works in standalone mode). Same Supabase project and key as the site's auth.js; the session is
// stored in THIS app's localStorage (sb-*-auth-token), then the page reloads so cloud saves + the owner dev check run.
import { SB_URL, SB_KEY, SB_LIB, hasSessionHint } from './cloud_save.js?v=v0.2.101-alpha';
let sbP = null;
const client = () => (sbP ||= import(SB_LIB).then(({ createClient }) => createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: false, detectSessionInUrl: false, flowType: 'implicit' } })));
export const signedInHint = () => hasSessionHint();
/** Refresh an expired stored session once at boot so cloud saves / the dev check do not see a stale token. */
export async function refreshIfStale() {
  // Google sign-in came back to this app (redirect, implicit flow): store the session from the #access_token hash.
  if (/[#&]access_token=/.test(location.hash) || /[#&]error_description=/.test(location.hash)) {
    try {
      const { createClient } = await import(SB_LIB);
      const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: false, detectSessionInUrl: true, flowType: 'implicit' } });
      await sb.auth.getSession();
    } catch (e) { console.warn('account redirect:', e?.message || e); }
    try { history.replaceState(history.state, '', location.pathname); } catch (e) { /* */ }
    return;
  }
  if (!hasSessionHint()) return;
  try { const sb = await client(); const { data } = await sb.auth.getSession(); const s = data?.session; if (s && (s.expires_at || 0) * 1000 < Date.now() + 60000) await sb.auth.refreshSession(); } catch (e) { console.warn('account refresh:', e?.message || e); }
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const CSS = `.kacct{position:fixed;inset:0;z-index:100001;background:rgba(5,7,16,.82);display:flex;align-items:center;justify-content:center;font:16px system-ui,sans-serif;color:#eef}
.kacct .bx{background:#141a2b;border:1px solid #3a4670;border-radius:14px;padding:16px;width:min(420px,94vw);max-height:94vh;overflow:auto;box-sizing:border-box}
.kacct h3{margin:0 0 10px;font-size:20px}.kacct input{display:block;width:100%;box-sizing:border-box;min-height:44px;margin:6px 0;padding:8px 10px;font-size:16px;border-radius:8px;border:1px solid #47557f;background:#0c1020;color:#fff}
.kacct button{min-height:44px;min-width:88px;padding:8px 14px;margin:6px 6px 0 0;font-size:16px;border-radius:8px;border:1px solid #5a6aa0;background:#2a3560;color:#fff}.kacct button.pri{background:#2f7a45;border-color:#4fae6a}
.kacct .m{min-height:1.2em;margin:6px 0;color:#ffd38a;font-size:14px}.kacct small{color:#aab;display:block;margin-top:8px}.kacct a{color:#9cf}`;
export async function openAccount() {
  if (document.querySelector('.kacct')) return;
  if (!document.getElementById('kacct-css')) document.head.appendChild(Object.assign(document.createElement('style'), { id: 'kacct-css', textContent: CSS }));
  const ov = document.createElement('div'); ov.className = 'kacct';
  ['keydown', 'keyup', 'keypress', 'pointerdown', 'touchstart'].forEach((t) => ov.addEventListener(t, (e) => e.stopPropagation())); // touch-ok: stopPropagation guard only (keeps game keys/taps out of the form)
  document.body.appendChild(ov);
  const close = () => ov.remove();
  ov.innerHTML = '<div class="bx"><h3>Account</h3><div class="m">Checking…</div></div>';
  let user = null;
  try { const sb = await client(); const { data } = await sb.auth.getSession(); user = data?.session?.user || null; } catch (e) { /* offline */ }
  const bx = ov.querySelector('.bx');
  if (user && !user.is_anonymous) {
    bx.innerHTML = `<h3>Account</h3><div>Signed in as <b>${esc(user.email || 'your account')}</b></div><div class="m"></div><button data-out>Sign out</button><button data-x>Close</button><small>Cloud saves use this account. The owner dev menu shows in Options when this account is the owner.</small>`;
    bx.querySelector('[data-x]').onclick = close; // touch-ok: click handler; document drag guard (installDragGuard, tap_guard.js) swallows the click after a drag / hold; keeps keyboard Enter
    bx.querySelector('[data-out]').onclick = async () => { try { await (await client()).auth.signOut({ scope: 'local' }); } catch (e) { /* */ } location.reload(); }; // touch-ok: click handler; document drag guard (installDragGuard, tap_guard.js) swallows the click after a drag / hold; keeps keyboard Enter
    return;
  }
  bx.innerHTML = `<h3>Sign in</h3><form><input type="email" name="e" autocomplete="username" placeholder="Email" required><input type="password" name="p" autocomplete="current-password" placeholder="Password" required>
<div class="m"></div><button class="pri" type="submit">Sign in</button><button type="button" data-x>Cancel</button></form>
<button type="button" data-g style="width:100%;margin-top:10px;background:#fff;color:#222;border-color:#ccc">Sign in with Google</button>
<small>Use your paigegames.net account. No account or forgot your password? Set it up at <a href="https://paigegames.net/" target="_blank" rel="noopener">paigegames.net</a> in your browser, then sign in here.</small>`;
  bx.querySelector('[data-x]').onclick = close; // touch-ok: click handler; document drag guard (installDragGuard, tap_guard.js) swallows the click after a drag / hold; keeps keyboard Enter
  const f = bx.querySelector('form'), m = bx.querySelector('.m');
  bx.querySelector('[data-g]').onclick = async () => { // same-window redirect (no popup), so it also works in a home-screen app; comes back to this page // touch-ok: click handler; document drag guard (installDragGuard, tap_guard.js) swallows the click after a drag / hold; keeps keyboard Enter
    m.textContent = 'Opening Google…';
    try { const { error } = await (await client()).auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } }); if (error) m.textContent = error.message; }
    catch (err) { m.textContent = 'Could not reach the sign-in server. Check your connection.'; }
  };
  f.onsubmit = async (e) => {
    e.preventDefault(); m.textContent = 'Signing in…';
    try {
      const sb = await client();
      const { error } = await sb.auth.signInWithPassword({ email: f.e.value.trim(), password: f.p.value });
      if (error) { m.textContent = /invalid login/i.test(error.message) ? 'That email and password don’t match.' : /confirm/i.test(error.message) ? 'Please confirm your email first (check your inbox).' : error.message; return; }
      m.textContent = 'Signed in. Reloading…'; setTimeout(() => location.reload(), 400);
    } catch (err) { m.textContent = 'Could not reach the sign-in server. Check your connection.'; }
  };
  setTimeout(() => f.e.focus(), 50);
}

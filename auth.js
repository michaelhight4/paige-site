// Member sign-in for paigegames.net (Supabase Auth, publishable key only — never a service-role key).
// Mirrors @paige/shared PaigeAuth (guest-first: email sign-up from a guest links via updateUser, same user id)
// and AdminClient.me() (admin_me RPC -> gold CREATOR tag; server decides via public.admins).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
const URL_ = 'https://kjdubkeowcyuoazvpoyt.supabase.co';
const KEY = 'sb_publishable_NZC6vzmXDYRLnRh2vDHWAg_VCDi3FQc';
const REDIRECT = 'https://paigegames.net/';
const recovering = /type=recovery/.test(location.hash) || /type=recovery/.test(location.search);
const sb = createClient(URL_, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' } });
const $ = (id) => document.getElementById(id);
const dlg = $('auth'), title = $('auth-title'), msg = $('auth-msg');
const TITLES = { signin: 'Sign in', signup: 'Create account', forgot: 'Forgot password', reset: 'Set a new password', account: 'Your account' };
let view = 'signin', opener = null, user = null, role = null;

function say(t, bad) { msg.textContent = t || ''; msg.classList.toggle('err', !!bad); }
function go(v, keepMsg) {
  view = v; title.textContent = TITLES[v];
  dlg.querySelectorAll('[data-view]').forEach((f) => (f.hidden = f.dataset.view !== v));
  if (!keepMsg) say('');
  dlg.querySelectorAll('[aria-invalid]').forEach((i) => i.removeAttribute('aria-invalid'));
  $('su-guest').hidden = !(user && user.is_anonymous);
  const first = dlg.querySelector(`[data-view="${v}"] input, [data-view="${v}"] button`);
  (first || title).focus();
}
function open(v, from) {
  opener = from || document.activeElement;
  if (document.body.classList.contains('dopen')) $('dx').click();
  if (!dlg.open) dlg.showModal();
  go(v || (user && !user.is_anonymous ? 'account' : 'signin'), true);
}
function close() { if (dlg.open) dlg.close(); }
dlg.addEventListener('close', () => { say(''); const o = opener && document.contains(opener) && opener.offsetParent ? opener : $('acct-btn'); o && o.focus(); });
dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
$('auth-x').onclick = close;
// Escape is native for <dialog>; explicit trap keeps Tab inside even in browsers with weak dialog support.
dlg.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { e.preventDefault(); close(); return; }
  if (e.key !== 'Tab') return;
  const f = [...dlg.querySelectorAll('button,input,a[href]')].filter((x) => !x.disabled && x.offsetParent !== null);
  const i = f.indexOf(document.activeElement);
  if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
  else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
});
dlg.addEventListener('click', (e) => { const b = e.target.closest('[data-to]'); if (b) go(b.dataset.to); });
$('acct-btn').onclick = (e) => open(null, e.currentTarget);
$('dacct-btn').onclick = () => open(null, $('burger'));

const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
function bad(input, text) { input.setAttribute('aria-invalid', 'true'); input.focus(); say(text, true); return false; }
function busy(form, on) { form.querySelectorAll('button').forEach((b) => (b.disabled = on)); }
const friendly = (e) => {
  const m = String(e?.message || e || '');
  if (/invalid login/i.test(m)) return 'That email and password don’t match. Try again or reset your password.';
  if (/not confirmed/i.test(m)) return 'Please confirm your email first — check your inbox for the link.';
  if (/rate limit|too many/i.test(m)) return 'Too many tries. Please wait a minute and try again.';
  if (/already (been )?registered|already exists/i.test(m)) return 'That email already has an account. Try signing in.';
  if (/password/i.test(m) && /least|short|weak/i.test(m)) return 'Please choose a stronger password (8+ characters).';
  return m || 'Something went wrong. Please try again.';
};

dlg.querySelector('[data-view=signin]').addEventListener('submit', async (e) => {
  e.preventDefault(); const f = e.currentTarget, em = $('si-email'), pw = $('si-pass');
  if (!emailOk(em.value.trim())) return bad(em, 'Enter a valid email address.');
  if (!pw.value) return bad(pw, 'Enter your password.');
  busy(f, true); say('Signing in…');
  const { error } = await sb.auth.signInWithPassword({ email: em.value.trim(), password: pw.value });
  busy(f, false);
  if (error) return say(friendly(error), true);
  pw.value = ''; close();
});

dlg.querySelector('[data-view=signup]').addEventListener('submit', async (e) => {
  e.preventDefault(); const f = e.currentTarget, em = $('su-email'), pw = $('su-pass'), pw2 = $('su-pass2');
  const email = em.value.trim();
  if (!emailOk(email)) return bad(em, 'Enter a valid email address.');
  if (pw.value.length < 8) return bad(pw, 'Password needs at least 8 characters.');
  if (pw.value !== pw2.value) return bad(pw2, 'Passwords don’t match.');
  busy(f, true); say('Creating your account…');
  let error, data;
  if (user && user.is_anonymous) {
    // Guest-first: link email + password to the SAME anonymous user (keeps progress). Supabase emails a confirmation link.
    ({ data, error } = await sb.auth.updateUser({ email, password: pw.value }, { emailRedirectTo: REDIRECT }));
  } else {
    ({ data, error } = await sb.auth.signUp({ email, password: pw.value, options: { emailRedirectTo: REDIRECT } }));
    if (!error && data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) error = { message: 'already registered' };
  }
  busy(f, false);
  if (error) return say(friendly(error), true);
  pw.value = pw2.value = '';
  say(`Check ${email} — we sent a confirmation link. Click it to finish creating your account.`);
});

dlg.querySelector('[data-view=forgot]').addEventListener('submit', async (e) => {
  e.preventDefault(); const f = e.currentTarget, em = $('fp-email'), email = em.value.trim();
  if (!emailOk(email)) return bad(em, 'Enter a valid email address.');
  busy(f, true); say('Sending…');
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: REDIRECT });
  busy(f, false);
  if (error && /rate limit|too many/i.test(error.message)) return say(friendly(error), true);
  // Same message whether or not the account exists (no account enumeration).
  say(`If ${email} has an account, a reset link is on its way. Open it on this device to set a new password.`);
});

dlg.querySelector('[data-view=reset]').addEventListener('submit', async (e) => {
  e.preventDefault(); const f = e.currentTarget, pw = $('rp-pass'), pw2 = $('rp-pass2');
  if (pw.value.length < 8) return bad(pw, 'Password needs at least 8 characters.');
  if (pw.value !== pw2.value) return bad(pw2, 'Passwords don’t match.');
  busy(f, true); say('Saving…');
  const { error } = await sb.auth.updateUser({ password: pw.value });
  busy(f, false);
  if (error) return say(friendly(/session|jwt|expired/i.test(error.message) ? 'This reset link has expired. Request a new one.' : error), true);
  pw.value = pw2.value = '';
  go('account', true); say('Password updated. You’re signed in.');
});

dlg.querySelectorAll('[data-google]').forEach((b) => b.addEventListener('click', async () => {
  say('Connecting to Google…');
  try {
    const s = await fetch(`${URL_}/auth/v1/settings`, { headers: { apikey: KEY } }).then((r) => r.json());
    if (!s?.external?.google) throw new Error('google off');
    const opts = { provider: 'google', options: { redirectTo: REDIRECT } };
    const { error } = user && user.is_anonymous ? await sb.auth.linkIdentity(opts) : await sb.auth.signInWithOAuth(opts);
    if (error) throw error;
  } catch { say('Google sign-in coming soon. Please use email for now.', true); }
}));

$('signout').onclick = async () => { await sb.auth.signOut(); close(); };

async function loadRole() {
  role = null;
  if (user && !user.is_anonymous) { const { data, error } = await sb.rpc('admin_me'); if (!error && data) role = data; }
  paint();
}
function paint() {
  const real = user && !user.is_anonymous;
  const name = real ? (user.user_metadata?.display_name || user.user_metadata?.full_name || user.email || 'Member') : '';
  const tag = role ? (role.tag || 'CREATOR') : '';
  for (const id of ['acct-btn', 'dacct-btn']) {
    const b = $(id); b.classList.toggle('me', !!real); b.textContent = '';
    if (!real) { b.textContent = 'Sign in'; b.setAttribute('aria-label', 'Sign in or create account'); continue; }
    const n = document.createElement('span'); n.className = 'nm'; n.textContent = name; b.append(n);
    if (tag) { const t = document.createElement('span'); t.className = 'creator'; t.textContent = tag; b.append(t); }
    b.setAttribute('aria-label', `Account: ${name}${tag ? ', ' + tag : ''}. Open account menu to sign out`);
  }
  $('acct-email').textContent = name; $('acct-creator').hidden = !tag; $('acct-stats').hidden = !tag; $('acct-creator').textContent = tag || 'CREATOR';
}

// First-party analytics (analytics.js; skipped under DNT/GPC). signup = new real account or guest upgraded on this device; login = SIGNED_IN, once per session.
let lastAnonId = null;
function track(ev, session) {
  const A = window.__paigeAnalytics, u = session?.user;
  if (!A || !u) return;
  if (u.is_anonymous) { lastAnonId = u.id; return; }
  const ago = (t) => (t ? Date.now() - Date.parse(t) : Infinity), fresh = 60 * 60 * 1000;
  if (lastAnonId === u.id || ago(u.created_at) < fresh || ago(u.email_confirmed_at || u.confirmed_at) < fresh) A.auth('signup', u, session.access_token);
  if (ev === 'SIGNED_IN') A.auth('login', u, session.access_token);
}
// Ad-Free for Life ($35 network pass): public.ads_removed(null) -> paige_private.ads_removed (network scope). ads.js listens for 'paige:ads'.
async function checkAds() {
  let removed = false;
  if (user && !user.is_anonymous) { try { const { data, error } = await sb.rpc('ads_removed', { p_game: null }); removed = !error && data === true; } catch (_) {} }
  window.__paigeAdsRemoved = removed; window.dispatchEvent(new CustomEvent('paige:ads', { detail: { removed } }));
}
sb.auth.onAuthStateChange((ev, session) => {
  user = session?.user || null; setTimeout(loadRole, 0); setTimeout(checkAds, 0);
  if (ev === 'SIGNED_IN' || ev === 'USER_UPDATED' || ev === 'INITIAL_SESSION') setTimeout(() => track(ev, session), 0);
  if (ev === 'PASSWORD_RECOVERY') open('reset');
});
const { data: { session } } = await sb.auth.getSession();
user = session?.user || null; await loadRole(); checkAds();
if (recovering && user && view !== 'reset') open('reset');
if (location.hash.includes('access_token') || location.hash.includes('error_description')) {
  const err = new URLSearchParams(location.hash.slice(1)).get('error_description');
  history.replaceState(null, '', location.pathname + location.search);
  if (err) { open('signin'); say(err.includes('expired') ? 'That link has expired. Please request a new one.' : err, true); }
  else if (!recovering && user && !user.is_anonymous) { open('account'); say('Email confirmed — welcome to Paige Industries!'); }
}
window.__paigeAuth = { open, go };

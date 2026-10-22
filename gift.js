/* Daily visit gift + Invite friends (Gary, Oct 22 2026). Server-authoritative: amounts, streak and the CT day come from
   public.daily_gift_status / claim_daily_gift (paige-shared migration 013). Pays DOLLAR BUCKS (earned-only, 1:1 with Blue Bucks); this file only displays them.
   Popup shows once per Central-Time day (dismiss remembered); the header gift button reopens it any time.
   ads.js waits for 'paige:gift-done' so the gift and the ad notice are never open together. */
(() => {
  const $ = (id) => document.getElementById(id);
  // Self-contained styles: link gift.css next to this script if the page doesn't already (fixes unstyled popup off home).
  if (!document.querySelector('link[href*="gift.css"]')) { const me = document.currentScript?.src || 'gift.js', l = document.createElement('link'); l.rel = 'stylesheet'; l.href = new URL('gift.css?v=2', me).href; document.head.append(l); }
  const dlg = $('gift'), btn = $('gift-btn'); if (!dlg || !btn) return;
  const days = $('gift-days'), claim = $('gift-claim'), msg = $('gift-msg'), dot = btn.querySelector('.gdot');
  const FALLBACK = [25, 50, 75, 100, 125, 150, 175]; // display-only fallback if the server can't be reached; server table wins
  const ctDay = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date());
  const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };
  const SEEN = 'paige_gift_seen', fmt = (n) => Number(n).toLocaleString('en-US');
  let st = { signed_in: false, day: 1, claimed_today: false, table: FALLBACK }, auto = ls(SEEN) !== ctDay(), opener = null, busy = false;
  window.__paigeGiftBusy = auto;

  // ?ref=CODE invite capture (first touch, like analytics.js ?src=); attached server-side after sign-in.
  const q = new URLSearchParams(location.search), ref = (q.get('ref') || '').toLowerCase();
  if (/^[a-z0-9]{8}$/.test(ref) && !ls('paige_ref')) ls('paige_ref', ref);
  if (q.has('ref')) { q.delete('ref'); const s = q.toString(); history.replaceState(history.state, '', location.pathname + (s ? '?' + s : '') + location.hash); }

  const A = () => window.__paigeAuth;
  async function rpc(n, a) { if (!A()?.rpc) throw new Error('offline'); const { data, error } = await A().rpc(n, a); if (error) throw error; return data; }

  function render() {
    const t = Array.isArray(st.table) && st.table.length === 7 ? st.table : FALLBACK, today = st.day || 1, got = !!st.claimed_today;
    days.innerHTML = t.map((amt, i) => {
      const d = i + 1, done = st.signed_in && (d < today || (d === today && got)), now = d === today && !got;
      const cls = done ? 'done' : now ? 'today' : 'later', bonus = d === 7 && !!st.reward_week, label = `Day ${d}, ${fmt(amt)} Dollar Bucks${done ? ', claimed' : now ? ', today' : ''}${bonus ? ', plus a bonus reward' : ''}`;
      return `<li class="gday ${cls}"${now ? ' aria-current="date"' : ''} aria-label="${label}"><span class="gd" aria-hidden="true">Day ${d}</span><span class="gc" aria-hidden="true">${done ? '✓' : 'DB'}</span><b aria-hidden="true">${fmt(amt)}</b><small aria-hidden="true">Dollar Bucks</small>${bonus ? '<span class="gbonus" aria-hidden="true">+ bonus</span>' : ''}</li>`;
    }).join('');
    const nw = st.next_reward_in_weeks, gn = $('gift-next');
    if (gn) gn.textContent = st.reward_week ? 'Finish day 7 this week for a bonus reward.' : nw ? `Next reward in ${nw} week${nw === 1 ? '' : 's'}.` : '';
    claim.disabled = false; claim.removeAttribute('aria-disabled');
    if (!st.signed_in) { claim.textContent = 'Sign in to claim'; claim.className = 'btn gclaim'; }
    else if (got) { claim.textContent = `Come back tomorrow for ${fmt(st.next_amount ?? t[today % 7])}`; claim.className = 'btn ghost gclaim'; claim.setAttribute('aria-disabled', 'true'); }
    else { claim.textContent = `Claim ${fmt(st.amount ?? t[today - 1])} Dollar Bucks`; claim.className = 'btn gclaim'; }
    dot.hidden = !!(st.signed_in && got);
    btn.setAttribute('aria-label', st.signed_in && got ? 'Daily gift (claimed today)' : 'Daily gift (ready to claim)');
  }
  function show(from) { opener = from || null; render(); msg.textContent = ''; if (!dlg.open) dlg.showModal(); (claim.getAttribute('aria-disabled') ? $('gift-x') : claim).focus(); }
  function done() { if (!window.__paigeGiftBusy) return; window.__paigeGiftBusy = false; dispatchEvent(new CustomEvent('paige:gift-done')); }
  dlg.addEventListener('close', () => { ls(SEEN, ctDay()); auto = false; (opener && document.contains(opener) ? opener : btn).focus(); if (toSignIn !== 'pending') done(); });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); dlg.close(); return; }
    if (e.key !== 'Tab') return; const f = [...dlg.querySelectorAll('button')].filter((x) => x.offsetParent !== null);
    const i = f.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  });
  $('gift-x').onclick = () => dlg.close();
  btn.onclick = () => show(btn);
  let toSignIn = false;
  // After a sign-in that started from the gift, the ad notice still has to wait: auth dialog closing → reopen gift.
  addEventListener('paige:user', (e) => { if (toSignIn === 'pending') { toSignIn = false; if (e.detail.real) load(true); else done(); } });
  claim.onclick = async () => {
    if (claim.getAttribute('aria-disabled') || busy) return;
    if (!st.signed_in) { toSignIn = 'pending'; dlg.close(); if (A()?.open) { A().open('signin', btn); const a = $('auth'); a && a.addEventListener('close', () => { if (!A().user?.() || A().user().is_anonymous) done(); }, { once: true }); } else done(); return; }
    busy = true; claim.disabled = true; msg.textContent = 'Claiming…';
    try { const r = await rpc('claim_daily_gift'); st = { ...st, ...r, signed_in: true }; render(); balances(); msg.textContent = r.claimed_now ? `+${fmt(r.amount)} Dollar Bucks added to your wallet. Day ${r.day} of 7.${r.day === 7 ? ' Bonus reward unlocked!' : ''}` : 'Already claimed today.'; }
    catch (err) { claim.disabled = false; msg.textContent = /guest/i.test(err?.message || '') ? 'Sign in with email or Google to claim.' : 'Couldn’t claim right now. Please try again.'; }
    busy = false; claim.focus();
  };
  async function load(open) {
    try { const r = await rpc('daily_gift_status'); if (r) st = r; } catch (e) {}
    render(); balances();
    if (st.signed_in) { invite(); const code = ls('paige_ref'); if (code) { try { await rpc('claim_referral', { p_code: code }); } catch (e) {} try { localStorage.removeItem('paige_ref'); } catch (e) {} } } else invite();
    if (open && !dlg.open && !document.querySelector('dialog[open]')) show(null); else if (open === true && !dlg.open) done();
  }
  let first = true;
  const start = () => { if (!first) return; first = false; load(auto); addEventListener('paige:user', () => { if (!dlg.open && toSignIn !== 'pending') load(false); }); };
  if (window.__paigeAuth) start(); else { addEventListener('paige:auth-ready', start, { once: true }); setTimeout(start, 4000); }
  if (!auto) window.__paigeGiftBusy = false;

  // ---------- Invite friends (wallet tab). Server rules: public.referral_status (migration 014). ----------
  async function invite() {
    const wrap = document.querySelector('#p-wallet .wrap'); if (!wrap) return;
    let box = $('invite'); if (!box) { box = document.createElement('section'); box.id = 'invite'; box.className = 'invite'; box.setAttribute('aria-labelledby', 'inv-t'); wrap.append(box); }
    const rule = (n) => `<p class="inv-rule">Your friend gets <b>100</b> Dollar Bucks and you get <b>${n}</b> once you both play 4 hours. Every friend after that earns you 50 more, up to 500.</p>`;
    const head = '<p class="eyebrow">Invite friends</p><h2 id="inv-t">Play together, earn together</h2>';
    if (!st.signed_in) { box.innerHTML = head + rule(150) + '<button class="btn" type="button" id="inv-in">Sign in to get your invite link</button>'; $('inv-in').onclick = (e) => A()?.open?.('signin', e.currentTarget); return; }
    let code = null, s = null; try { code = await rpc('my_referral_code'); s = await rpc('referral_status'); } catch (e) {}
    if (!code) { box.innerHTML = head + rule(150) + '<p class="inv-note">Your invite link isn’t available right now.</p>'; return; }
    const link = `https://paigegames.net/?ref=${code}`, need = s?.rules?.need_seconds || 14400, hrs = (x) => (Math.min(x, need) / 3600).toFixed(1);
    const bar = (sec) => `<span class="ibar" role="progressbar" aria-valuemin="0" aria-valuemax="4" aria-valuenow="${hrs(sec)}" aria-label="Play time"><i style="width:${Math.min(100, (sec / need) * 100)}%"></i></span>`;
    const fr = (s?.friends || []).map((f) => `<li><span>Friend ${f.n}</span>${bar(f.seconds)}<small>${f.paid ? 'Paid ✓' : `${hrs(f.seconds)} / 4 h`}</small></li>`).join('');
    const next = s?.next_referrer_amount ?? 150;
    const mail = s && s.email_confirmed === false ? '<p class="inv-warn" role="note">Confirm your email to earn invite rewards.</p>' : '';
    box.innerHTML = head + rule(next) + `<p class="inv-next">Your next friend earns you <b>${fmt(next)}</b> Dollar Bucks</p>${mail}<div class="inv-link"><input id="inv-url" readonly value="${link}" aria-label="Your invite link"><button class="btn" type="button" id="inv-copy">Copy link</button></div><p class="inv-note" id="inv-msg" role="status" aria-live="polite"></p>
<h3>Your play time</h3><ul class="inv-list"><li><span>You</span>${bar(s?.my_seconds || 0)}<small>${hrs(s?.my_seconds || 0)} / 4 h</small></li></ul>
<h3>Friends</h3>${fr ? `<ul class="inv-list">${fr}</ul>` : '<p class="inv-note">No friends yet. Share your link!</p>'}`;
    $('inv-copy').onclick = async () => { try { await navigator.clipboard.writeText(link); $('inv-msg').textContent = 'Link copied.'; } catch (e) { $('inv-url').select(); $('inv-msg').textContent = 'Press Ctrl+C (or long-press) to copy.'; } };
  }
  invite();

  // ---------- Wallet balances (public.wallet_status, migration 012). ----------
  async function balances() {
    const el = $('wal-bal'); if (!el) return;
    if (!st.signed_in) { el.hidden = true; return; }
    try { const w = await rpc('wallet_status'); if (!w) return; $('bal-db').textContent = fmt(w.dollar_bucks); $('bal-bb').textContent = fmt(w.blue_bucks); el.hidden = false; welcome(w.signup_bonus); } catch (e) {}
    history_();
  }
  // Sign-up bonus (migration 017): server pays 100 DB once after email confirmation; show the toast once per account on this device.
  function welcome(b) {
    const uid = A()?.user?.()?.id; if (!b || !b.paid || !uid) return;
    const k = 'paige_welcome_toast:' + uid; if (ls(k)) return; ls(k, '1');
    const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status');
    t.innerHTML = `<i class="cico db" aria-hidden="true">$</i> You got ${fmt(b.amount || 100)} Dollar Bucks for joining! <button type="button" aria-label="Dismiss">×</button>`;
    t.querySelector('button').onclick = () => t.remove(); document.body.append(t); setTimeout(() => t.remove(), 8000);
  }
  window.__paigeWelcomeToast = welcome;
  // Recent wallet activity (public.my_wallet_history, migration 016): 'Welcome bonus', 'Gift from Paige Industries', daily gifts...
  async function history_() {
    const box = $('wal-hist'); if (!box) return;
    try { const rows = await rpc('my_wallet_history', { p_limit: 8 }); if (!rows || !rows.length) { box.hidden = true; return; }
      box.innerHTML = '<h2>Recent activity</h2><ul>' + rows.map((r) => `<li><span>${String(r.label).replace(/[&<>]/g, '')}</span><b class="${r.delta < 0 ? 'neg' : 'pos'}">${r.delta > 0 ? '+' : ''}${fmt(r.delta)} ${r.currency === 'blue_bucks' ? 'Blue Bucks' : 'Dollar Bucks'}</b></li>`).join('') + '</ul>';
      box.hidden = false; } catch (e) { box.hidden = true; }
  }
  addEventListener('paige:gift-state', balances);
})();

// Admin dashboard (admin.html). Every call goes through an `rpc(name, args)` function; the server re-checks admin on EVERY
// RPC (paige_private.need -> 42501), so hiding this page is convenience, not security. Publishable key only.
export const GIFT_CAP = 50000;
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmt = (n) => Number(n || 0).toLocaleString('en-US');
export const ct = (t) => (t ? new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(t)) + ' CT' : '—');
export const hrs = (s) => { s = Number(s || 0); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? `${h} h ${m} m` : `${m} m`; };
export const isDenied = (e) => !!e && (e.code === '42501' || /admin only|42501/i.test(String(e.message || '')));
export const CUR = { dollar_bucks: 'Dollar Bucks', blue_bucks: 'Blue Bucks' };

// Gift validation (mirrors the server; server is authoritative). Returns { ok, error, summary }.
export function checkGift(g) {
  if (!g.user) return { ok: false, error: 'Pick a recipient account first.' };
  const note = String(g.note || '').trim();
  if (note.length < 3 || note.length > 280) return { ok: false, error: 'A note (3–280 characters) is required.' };
  if (g.kind === 'cosmetic') {
    if (!g.reward) return { ok: false, error: 'Pick a cosmetic.' };
    return { ok: true, summary: `${g.reward.name} (${g.reward.reward_type}, ${g.reward.game_id})`, note };
  }
  if (!CUR[g.kind]) return { ok: false, error: 'Pick what to send.' };
  const raw = String(g.amount ?? '').replace(/[,\s]/g, '');
  if (!/^\d+$/.test(raw)) return { ok: false, error: 'Amount must be a whole number.' };
  const n = Number(raw);
  if (n < 1) return { ok: false, error: 'Amount must be at least 1.' };
  if (n > GIFT_CAP) return { ok: false, error: `Max ${fmt(GIFT_CAP)} per gift (typo guard).` };
  return { ok: true, amount: n, summary: `${fmt(n)} ${CUR[g.kind]}`, note };
}
export const newKey = () => 'gift-' + (globalThis.crypto?.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

export function mount(root, rpc, opts = {}) {
  const $ = (s) => root.querySelector(s);
  const state = { tab: 'accounts', q: '', sort: 'created_at', desc: true, page: 0, size: 25, sel: null, gift: { kind: 'dollar_bucks' }, cosmetics: null, cur: 'dollar_bucks' };
  const call = async (n, a) => { const { data, error } = await rpc(n, a); if (error) throw error; return data; };
  const fail = (el, e) => { el.innerHTML = `<p class="st-msg" role="alert">${isDenied(e) ? 'Admins only. This account can’t use admin tools.' : 'Couldn’t load. Please try again.'}</p>`; };
  const tabs = [...root.querySelectorAll('[role=tab]')];
  function show(id, focus) {
    state.tab = id;
    tabs.forEach((t) => { const on = t.dataset.tab === id; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; if (on && focus) t.focus(); });
    root.querySelectorAll('[role=tabpanel]').forEach((p) => { p.hidden = p.id !== 'tp-' + id; });
    if (opts.hash !== false) history.replaceState(null, '', '#' + id);
    LOAD[id]();
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => show(t.dataset.tab));
    t.addEventListener('keydown', (e) => { const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (d) { e.preventDefault(); show(tabs[(i + d + tabs.length) % tabs.length].dataset.tab, true); } });
  });
  const pick = (u) => { state.sel = u; root.querySelectorAll('.who').forEach((w) => { w.textContent = u ? `${u.display_name || '(no name)'} · ${u.email}` : 'No account selected. Pick one on Accounts.'; }); };

  // ---------- Accounts ----------
  async function accounts() {
    const el = $('#acc-out'); el.innerHTML = '<p class="st-msg">Loading…</p>';
    try {
      const d = await call('admin_accounts', { p_q: state.q || null, p_sort: state.sort, p_desc: state.desc, p_limit: state.size, p_offset: state.page * state.size });
      const g = d.guests || {}, pages = Math.max(1, Math.ceil((d.total || 0) / state.size));
      $('#acc-sum').innerHTML = `<div class="sc"><b>${fmt(d.registered)}</b><span>Signed-up accounts</span><small>${fmt(d.confirmed)} confirmed email</small></div>` +
        `<div class="sc"><b>${fmt(g.total)}</b><span>Guest (anonymous) accounts</span><small>${fmt(g.last_7d)} new · ${fmt(g.active_7d)} active in 7 days</small></div>`;
      const th = (k, l) => `<th scope="col" aria-sort="${state.sort === k ? (state.desc ? 'descending' : 'ascending') : 'none'}"><button type="button" class="sort" data-k="${k}">${l}${state.sort === k ? (state.desc ? ' ▼' : ' ▲') : ''}</button></th>`;
      el.innerHTML = `<div class="tw" tabindex="0"><table><caption class="sr">Signed-up accounts, page ${state.page + 1} of ${pages}</caption><thead><tr>${th('email', 'Email')}${th('display_name', 'Name')}${th('created_at', 'Created')}${th('last_sign_in_at', 'Last sign-in')}<th scope="col">Email confirmed</th>${th('play_seconds', 'Play time')}<th scope="col"><span class="sr">Actions</span></th></tr></thead><tbody>` +
        (d.rows.length ? d.rows.map((r, i) => `<tr><td>${esc(r.email)}${r.role ? ` <span class="pill gold">${esc(r.role)}</span>` : ''}</td><td>${esc(r.display_name || '—')}</td><td>${ct(r.created_at)}</td><td>${ct(r.last_sign_in_at)}</td><td>${r.email_confirmed ? '<span class="pill ok">Yes</span>' : '<span class="pill no">No</span>'}</td><td>${hrs(r.play_seconds)}</td><td><button type="button" class="btn sm" data-i="${i}" aria-label="View ${esc(r.email)}">View</button></td></tr>`).join('')
          : '<tr><td colspan="7" class="empty">No accounts match.</td></tr>') + '</tbody></table></div>' +
        `<nav class="pager" aria-label="Accounts pages"><button type="button" class="btn sm" id="pg-prev" ${state.page ? '' : 'disabled'}>Previous</button><span>Page ${state.page + 1} of ${pages} · ${fmt(d.total)} accounts</span><button type="button" class="btn sm" id="pg-next" ${state.page + 1 < pages ? '' : 'disabled'}>Next</button></nav>`;
      el.querySelectorAll('.sort').forEach((b) => b.onclick = () => { const k = b.dataset.k; state.desc = state.sort === k ? !state.desc : !['email', 'display_name'].includes(k); state.sort = k; state.page = 0; accounts(); });
      el.querySelectorAll('[data-i]').forEach((b) => b.onclick = () => { pick(d.rows[+b.dataset.i]); show('owned'); });
      $('#pg-prev').onclick = () => { state.page--; accounts(); }; $('#pg-next').onclick = () => { state.page++; accounts(); };
      state.rows = d.rows;
    } catch (e) { fail(el, e); }
  }
  let t0; $('#acc-q').addEventListener('input', (e) => { clearTimeout(t0); t0 = setTimeout(() => { state.q = e.target.value.trim(); state.page = 0; accounts(); }, 250); });

  // ---------- Owned ----------
  async function owned() {
    const el = $('#own-out');
    if (!state.sel) { el.innerHTML = '<p class="empty">Pick an account on the Accounts tab (View), or search on Gifts.</p>'; return; }
    el.innerHTML = '<p class="st-msg">Loading…</p>';
    try {
      const d = await call('admin_account_owned', { p_user: state.sel.id }), p = d.play || {}, dg = d.daily_gift || {};
      const list = (rows, f, none) => rows && rows.length ? '<ul class="ol">' + rows.map(f).join('') + '</ul>' : `<p class="empty">${none}</p>`;
      el.innerHTML = `<div class="grid2"><div class="box"><h2>Games played</h2><p>Total play time: <b>${hrs(p.total_seconds)}</b></p><p>Today: ${hrs(p.today_seconds)} · Last game: <b>${esc(p.last_game || '—')}</b> · Last played ${ct(p.last_beat)}</p>` +
        (d.per_game ? list(d.per_game, (g) => `<li><b>${esc(g.game_id)}</b> ${hrs(g.seconds)}</li>`, '') : '<p class="empty">Per-game split isn’t tracked yet (server stores a network total + last game).</p>') + '</div>' +
        `<div class="box"><h2>Game passes &amp; entitlements</h2>${list(d.entitlements, (e) => `<li><b>${esc(e.name || e.product_id)}</b> <span class="pill">${esc(e.game_id || 'network')}</span> <span class="pill">${esc(e.source)}</span>${e.revoked_at ? ' <span class="pill no">revoked</span>' : ''}${e.expires_at ? ` <small>expires ${ct(e.expires_at)}</small>` : ''}<br><small>since ${ct(e.granted_at)}</small></li>`, 'No passes or entitlements.')}</div>` +
        `<div class="box"><h2>Cosmetics</h2>${list(d.cosmetics, (c) => `<li><b>${esc(c.name)}</b> <span class="pill">${esc(c.game_id)}</span> <span class="pill">${esc(c.reward_type)}</span><br><small>${esc(c.source)} · ${ct(c.granted_at)}</small></li>`, 'No cosmetics.')}</div>` +
        `<div class="box"><h2>Streak &amp; purchases</h2><p>Daily gifts claimed: <b>${fmt(dg.claims)}</b> · Weeks completed: <b>${fmt(dg.weeks_completed)}</b> · Last claim: ${esc(dg.last_claim || '—')}</p>` +
        (d.purchases_table ? list(d.purchases, (x) => `<li><b>${esc(x.product_key || x.sku || x.id)}</b> <span class="pill">${esc(x.status || '')}</span>${x.livemode === false ? ' <span class="pill">test mode</span>' : ''} ${x.amount_cents != null ? '$' + (x.amount_cents / 100).toFixed(2) + ' ' + esc(String(x.currency || '').toUpperCase()) : ''}<br><small>${ct(x.created_at)}${x.expires_at ? ' · renews/ends ' + ct(x.expires_at) : ''}</small></li>`, 'No Stripe purchases.') : '<p class="empty">Purchases: not connected yet (Stripe checkout pending). Passes bought with Stripe still show under entitlements.</p>') + '</div></div>';
    } catch (e) { fail(el, e); }
  }

  // ---------- Balances ----------
  async function balances() {
    const el = $('#bal-out'); el.innerHTML = '<p class="st-msg">Loading…</p>';
    try {
      const [tot, d] = await Promise.all([call('admin_economy_totals'), call('admin_accounts', { p_q: state.q || null, p_sort: state.cur, p_desc: true, p_limit: state.size, p_offset: 0 })]);
      el.innerHTML = `<div class="cards"><div class="sc"><b>${fmt(tot.dollar_bucks)}</b><span>Dollar Bucks held</span><small>${fmt(tot.gifted_db)} gifted by admins</small></div><div class="sc"><b>${fmt(tot.blue_bucks)}</b><span>Blue Bucks held</span><small>${fmt(tot.gifted_bb)} gifted by admins</small></div></div>` +
        `<div class="tw" tabindex="0"><table><caption class="sr">Balances by account</caption><thead><tr><th scope="col">Account</th><th scope="col" class="num">Dollar Bucks</th><th scope="col" class="num">Blue Bucks</th><th scope="col"><span class="sr">Ledger</span></th></tr></thead><tbody>` +
        d.rows.map((r, i) => `<tr><td>${esc(r.email)}<br><small>${esc(r.display_name || '')}</small></td><td class="num">${fmt(r.dollar_bucks)}</td><td class="num">${fmt(r.blue_bucks)}</td><td><button type="button" class="btn sm" data-i="${i}" aria-label="Ledger for ${esc(r.email)}">Ledger</button></td></tr>`).join('') + '</tbody></table></div><div id="led"></div>';
      el.querySelectorAll('[data-i]').forEach((b) => b.onclick = () => { pick(d.rows[+b.dataset.i]); ledger(); });
      if (state.sel) ledger();
    } catch (e) { fail(el, e); }
  }
  async function ledger(cur = state.ledCur || 'dollar_bucks') {
    state.ledCur = cur; const el = $('#led'); if (!el || !state.sel) return;
    el.innerHTML = '<p class="st-msg">Loading ledger…</p>';
    try {
      const d = await call('admin_ledger', { p_user: state.sel.id, p_currency: cur, p_limit: 50 });
      el.innerHTML = `<div class="box" style="margin-top:12px"><h2>Ledger · ${esc(state.sel.email)}</h2><div class="range" role="group" aria-label="Currency">${Object.entries(CUR).map(([k, l]) => `<button type="button" data-c="${k}" aria-pressed="${k === cur}">${l}</button>`).join('')}</div>` +
        `<p>Balance: <b>${fmt(d.balance)} ${CUR[cur]}</b></p><div class="tw" tabindex="0"><table><caption class="sr">${CUR[cur]} ledger</caption><thead><tr><th scope="col">When</th><th scope="col">What</th><th scope="col" class="num">Change</th><th scope="col" class="num">Balance after</th></tr></thead><tbody>` +
        (d.rows.length ? d.rows.map((r) => `<tr><td>${ct(r.created_at)}</td><td>${esc(r.label)}${r.game_id ? ` <span class="pill">${esc(r.game_id)}</span>` : ''}</td><td class="num ${r.delta < 0 ? 'neg' : 'pos'}">${r.delta > 0 ? '+' : ''}${fmt(r.delta)}</td><td class="num">${fmt(r.balance_after)}</td></tr>`).join('') : '<tr><td colspan="4" class="empty">No ledger rows.</td></tr>') + '</tbody></table></div></div>';
      el.querySelectorAll('[data-c]').forEach((b) => b.onclick = () => ledger(b.dataset.c));
    } catch (e) { fail(el, e); }
  }

  // ---------- Gifts ----------
  async function gifts() {
    const f = $('#gift-form');
    if (!state.cosmetics) { try { state.cosmetics = await call('admin_cosmetic_catalog'); } catch (e) { state.cosmetics = []; } }
    $('#g-reward').innerHTML = '<option value="">Choose a cosmetic…</option>' + state.cosmetics.map((c, i) => `<option value="${i}">${esc(c.name)} · ${esc(c.reward_type)} · ${esc(c.game_id)}</option>`).join('');
    if (state.sel && !state.gift.user) setUser(state.sel);
    sync(); history_();
    f.dataset.ready = '1';
  }
  function setUser(u) { state.gift.user = u; $('#g-to').textContent = u ? `${u.email}${u.display_name ? ' (' + u.display_name + ')' : ''}` : 'Nobody yet'; }
  function sync() {
    const k = root.querySelector('input[name=g-kind]:checked')?.value || 'dollar_bucks'; state.gift.kind = k;
    $('#g-amt-row').hidden = k === 'cosmetic'; $('#g-cos-row').hidden = k !== 'cosmetic';
  }
  root.querySelectorAll('input[name=g-kind]').forEach((r) => r.addEventListener('change', sync));
  let t1; $('#g-find').addEventListener('input', (e) => { clearTimeout(t1); const q = e.target.value.trim(); t1 = setTimeout(async () => {
    const box = $('#g-hits'); if (q.length < 3) { box.innerHTML = ''; return; }
    try { const hits = await call('admin_find_account', { p_email: q });
      box.innerHTML = hits.length ? hits.map((h, i) => `<li><button type="button" class="btn sm ghost" data-i="${i}">${esc(h.email)}${h.display_name ? ' · ' + esc(h.display_name) : ''}${h.email_confirmed ? '' : ' (unconfirmed)'}</button></li>`).join('') : '<li class="empty">No signed-up account matches.</li>';
      box.querySelectorAll('[data-i]').forEach((b) => b.onclick = () => { setUser(hits[+b.dataset.i]); box.innerHTML = ''; $('#g-find').value = ''; });
    } catch (err) { box.innerHTML = `<li class="empty" role="alert">${isDenied(err) ? 'Admins only.' : 'Search failed.'}</li>`; }
  }, 250); });
  $('#gift-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const g = { ...state.gift, amount: $('#g-amt').value, note: $('#g-note').value, reward: state.cosmetics?.[+$('#g-reward').value] && $('#g-reward').value !== '' ? state.cosmetics[+$('#g-reward').value] : null };
    const v = checkGift(g), err = $('#g-err');
    if (!v.ok) { err.textContent = v.error; return; }
    err.textContent = '';
    state.pending = { g, v, key: newKey() };
    $('#cf-what').textContent = v.summary; $('#cf-to').textContent = g.user.email; $('#cf-note').textContent = v.note;
    $('#cf-label').textContent = 'Gift from Paige Industries';
    $('#confirm').showModal ? $('#confirm').showModal() : $('#confirm').setAttribute('open', '');
  });
  $('#cf-cancel').onclick = () => $('#confirm').close();
  $('#cf-send').onclick = async () => {
    const p = state.pending, out = $('#g-msg'), btn = $('#cf-send'); if (!p || btn.disabled) return;
    btn.disabled = true;
    try {
      const r = await call('admin_send_gift', { p_user: p.g.user.id, p_kind: p.g.kind, p_amount: p.g.kind === 'cosmetic' ? null : p.v.amount,
        p_game: p.g.reward?.game_id || null, p_reward: p.g.reward?.reward_id || null, p_note: p.v.note, p_key: p.key });
      out.textContent = r.replayed ? 'Already sent (duplicate click ignored).' : `Sent ${p.v.summary} to ${p.g.user.email}.`;
      $('#gift-form').reset(); sync(); state.pending = null; history_();
    } catch (e) { out.textContent = isDenied(e) ? 'Admins only. Gift not sent.' : `Not sent: ${e.message || 'error'}`; }
    finally { btn.disabled = false; $('#confirm').close(); }
  };
  async function history_() {
    const el = $('#g-hist'); el.innerHTML = '<p class="st-msg">Loading history…</p>';
    try {
      const d = await call('admin_gift_history', { p_limit: 50, p_offset: 0 });
      el.innerHTML = `<div class="tw" tabindex="0"><table><caption class="sr">Gift history (audit log)</caption><thead><tr><th scope="col">When</th><th scope="col">To</th><th scope="col">What</th><th scope="col">Note</th><th scope="col">By</th></tr></thead><tbody>` +
        (d.rows.length ? d.rows.map((r) => `<tr><td>${ct(r.at)}</td><td>${esc(r.target_email)}</td><td>${r.kind === 'cosmetic' ? esc(r.reward_name) + ' <span class="pill">' + esc(r.game_id) + '</span>' : fmt(r.amount) + ' ' + CUR[r.kind]}</td><td>${esc(r.note)}</td><td>${esc(r.admin_email || r.admin_id)}</td></tr>`).join('') : '<tr><td colspan="5" class="empty">No gifts sent yet.</td></tr>') + '</tbody></table></div>';
    } catch (e) { fail(el, e); }
  }

  // ---------- Site stats ----------
  let days = 30;
  async function stats() {
    const el = $('#st-out'); el.innerHTML = '<p class="st-msg">Loading…</p>';
    try { (opts.renderStats || (() => {}))(el, await call('admin_site_stats', { days })); } catch (e) { fail(el, e); }
  }
  root.querySelectorAll('#tp-stats .range button').forEach((b) => b.addEventListener('click', () => { days = +b.dataset.d; root.querySelectorAll('#tp-stats .range button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); stats(); }));

  const LOAD = { accounts, owned, balances, gifts, stats };
  pick(null);
  const h = (opts.initial || location.hash.slice(1));
  show(LOAD[h] ? h : 'accounts');
  return { show, state, pick, setUser };
}

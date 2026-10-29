// Kilumen cloud saves (Oct 29, 2026; Gary 2:15 AM CT: "build cloud saves with one save per account and push it live").
// One save per site account in Supabase (public.kilumen_saves, supabase/migrations_proposed/20261029000001_kilumen_cloud_saves.sql).
//   - Only for a real signed-in site account (same sign-in as the site header). Guests / anonymous sessions: nothing changes.
//   - Boot: before the save is read, ask the server for the cloud save's id + savedAt only (a few bytes). The full save is
//     downloaded only when it is newer than this device's save (same playthrough), or when the player picks it.
//   - The saves "truly differ" when they are different playthroughs (different saveId). Then ONE choice: "This device"
//     or "Cloud" (cards with place, party, coins, time saved). The pick is remembered for that pair, so it is never asked twice.
//   - Taking the cloud save keeps this device's old save under <key>.device (and <key>.bak).
//   - Uploads: only from SaveStore.onSaved, i.e. after a local save succeeded. Saves are already refused mid battle /
//     conversation / cutscene (overworld.js saveLockReason); a queued upload also waits while a save lock is up.
//     At most one upload per 30 s, plus one when the page is hidden. The server refuses a save older than the cloud one.
//   - Kill switch: ?cloudsave=0 (kept by alpha.js). If the boot check fails (offline, timeout), nothing is uploaded this session,
//     so a device can never overwrite a cloud playthrough it has not been compared with.
export const SB_URL = 'https://kjdubkeowcyuoazvpoyt.supabase.co';
export const SB_KEY = 'sb_publishable_NZC6vzmXDYRLnRh2vDHWAg_VCDi3FQc'; // public publishable key (same one the site's auth.js ships)
export const SB_LIB = 'https://esm.sh/@supabase/supabase-js@2.45.4';
export const THROTTLE_MS = 30000;
const MEMO_KEY = 'kilumen.cloudsave.choice';

export function hasSessionHint(store = globalThis.localStorage) {
  try { for (let i = 0; i < store.length; i++) if (/^sb-[a-z0-9]+-auth-token$/.test(store.key(i) || '')) return true; } catch { /* blocked */ }
  return false;
}
const parse = (raw) => { try { const o = JSON.parse(raw); return o && typeof o === 'object' ? o : null; } catch { return null; } };
export const metaOf = (o) => (o && typeof o.saveId === 'string' ? { saveId: o.saveId, savedAt: Number(o.savedAt) || 0 } : null);

/**
 * What to do at boot. local / cloud: {saveId, savedAt} or null. memo: an earlier pick for this exact pair.
 * -> 'none' | 'same' | 'upload' (local is newer or the cloud is empty) | 'download' (cloud is newer, same playthrough) | 'ask'
 *    | 'keep_local' / 'take_cloud' (a remembered pick).
 */
export function decide(local, cloud, memo = null) {
  if (!local && !cloud) return 'none';
  if (!cloud) return 'upload';
  if (!local) return 'download';
  if (local.saveId === cloud.saveId) return cloud.savedAt > local.savedAt ? 'download' : cloud.savedAt < local.savedAt ? 'upload' : 'same';
  if (memo && memo.local === local.saveId && memo.cloud === cloud.saveId) return memo.pick === 'cloud' ? 'take_cloud' : 'keep_local';
  return 'ask';
}

/** Small summary for a choice card. */
export function summarise(o, speciesName = (id) => id) {
  const nice = (s) => String(s || '').replace(/_int$|_\d+f$/i, '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const party = Array.isArray(o?.party) ? o.party : [];
  const caught = Object.keys(o?.kilindex?.caught || {}).length;
  return {
    place: o?.pos?.map ? nice(o.pos.map) : 'Start',
    party: party.slice(0, 6).map((c) => `${c.nickname || speciesName(c.species)}${c.level ? ' Lv ' + c.level : ''}`),
    coins: Number(o?.coins) || 0, day: (Number(o?.clock?.day) || 0) + 1, caught, badges: Object.keys(o?.systems?.progression?.masters || {}).length,
    savedAt: Number(o?.savedAt) || 0,
  };
}

/** REST client on fetch. getToken() -> access token (refreshed) or null. */
export function restClient({ fetchFn = globalThis.fetch, getToken, url = SB_URL, key = SB_KEY }) {
  const h = (tok) => ({ apikey: key, Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json', Accept: 'application/json' });
  return {
    async meta() {
      const tok = await getToken(); if (!tok) throw new Error('no session');
      const r = await fetchFn(`${url}/rest/v1/kilumen_saves?select=save_id,saved_at,device,updated_at`, { headers: h(tok) });
      if (!r.ok) throw new Error('meta ' + r.status);
      const rows = await r.json(); const m = rows[0];
      return m ? { saveId: m.save_id, savedAt: Number(m.saved_at), device: m.device, updatedAt: m.updated_at } : null;
    },
    async data() {
      const tok = await getToken(); if (!tok) throw new Error('no session');
      const r = await fetchFn(`${url}/rest/v1/kilumen_saves?select=data`, { headers: h(tok) });
      if (!r.ok) throw new Error('data ' + r.status);
      const rows = await r.json(); return rows[0] ? rows[0].data : null;
    },
    async put(json, device, { keepalive = false, token = null } = {}) {
      const tok = token || await getToken(); if (!tok) throw new Error('no session');
      const body = `{"p_data":${json},"p_device":${JSON.stringify(device || null)}}`;
      const r = await fetchFn(`${url}/rest/v1/rpc/kilumen_save_put`, { method: 'POST', headers: h(tok), body, keepalive: keepalive && body.length < 60000 });
      if (!r.ok) throw new Error('put ' + r.status);
      return r.json();
    },
  };
}

/** Throttled uploader. Wire store.onSaved = up.saved; call up.hidden() on pagehide / visibilitychange(hidden). */
export function uploader({ api, device, locked = () => false, now = () => Date.now(), setTimer = setTimeout, clearTimer = clearTimeout, onResult = () => {}, cachedToken = () => null }) {
  let pending = null, last = -Infinity, timer = 0, inflight = null, stopped = false;
  const send = async (opts) => {
    if (!pending || stopped) return;
    const json = pending; pending = null; last = now();
    try {
      inflight = api.put(json, device, opts); const r = await inflight; onResult(r);
      if (r && r.ok === false && r.reason === 'older') stopped = true; // another device saved newer: stop, the next boot offers it
      if (r && r.ok === false && r.reason === 'account_needed') stopped = true;
    } catch (e) { if (!pending) pending = json; onResult({ ok: false, reason: 'network', error: String(e?.message || e) }); }
    finally { inflight = null; }
  };
  const tick = () => {
    timer = 0; if (!pending || stopped) return;
    if (locked() || inflight) { timer = setTimer(tick, 5000); return; } // never send while a battle / talk / cutscene holds the save lock
    const wait = last + THROTTLE_MS - now();
    if (wait > 0) { timer = setTimer(tick, wait); return; }
    send();
  };
  return {
    saved(json) { if (stopped) return; pending = json; if (!timer) tick(); },
    hidden() { if (timer) { clearTimer(timer); timer = 0; } if (pending && !stopped && !inflight) send({ keepalive: true, token: cachedToken() }); },
    get pending() { return pending; }, get stopped() { return stopped; },
  };
}

function readMemo(ls, uid) { try { const m = JSON.parse(ls.getItem(MEMO_KEY) || 'null'); return m && m.uid === uid ? m : null; } catch { return null; } }
function writeMemo(ls, m) { try { ls.setItem(MEMO_KEY, JSON.stringify(m)); } catch { /* full / blocked */ } }

/**
 * Boot check. Returns { ok, action, uploader? , msg? }. Writes the cloud save into storage[key] when it is taken.
 * o: { storage (sync Storage-like save backend), key, isLoadable(raw), device, ask(localObj, cloudObj) -> Promise<'device'|'cloud'>,
 *      session() -> Promise<{token, uid, anonymous}|null>, api?, ls (localStorage for the memo), locked(), onResult }
 */
export async function bootCloudSave(o) {
  const sess = await o.session();
  if (!sess || !sess.token || sess.anonymous) return { ok: false, action: 'guest' };
  let token = sess.token;
  const api = o.api || restClient({ fetchFn: o.fetchFn, getToken: async () => { const s = await o.session(); if (s?.token) token = s.token; return s?.token || null; } });
  if (o.reset) return { ok: true, action: 'reset', api, uid: sess.uid, uploader: uploader({ api, device: o.device, locked: o.locked, onResult: o.onResult, cachedToken: () => token }) }; // New game: the new save replaces the cloud one when it is saved
  const localRaw = o.storage.getItem(o.key);
  const localObj = localRaw && o.isLoadable(localRaw) ? parse(localRaw) : null;
  const cloud = await api.meta();
  let action = decide(metaOf(localObj), cloud, readMemo(o.ls, sess.uid));
  let cloudObj = null;
  if (action === 'ask' || action === 'download' || action === 'take_cloud') {
    cloudObj = await api.data();
    if (!cloudObj || !o.isLoadable(JSON.stringify(cloudObj))) action = localObj ? 'upload' : 'none'; // a bad cloud save is never loaded
  }
  if (action === 'ask') {
    const pick = await o.ask(localObj, cloudObj);
    writeMemo(o.ls, { uid: sess.uid, local: localObj.saveId, cloud: cloudObj.saveId, pick, at: Date.now() });
    action = pick === 'cloud' ? 'take_cloud' : 'keep_local';
  }
  const up = uploader({ api, device: o.device, locked: o.locked, onResult: o.onResult, cachedToken: () => token });
  if (action === 'download' || action === 'take_cloud') {
    if (localRaw) { o.storage.setItem(o.key + '.device', localRaw); o.storage.setItem(o.key + '.bak', localRaw); }
    o.storage.setItem(o.key, JSON.stringify(cloudObj));
    await o.storage.flush?.();
  } else if (action === 'upload') {
    up.saved(localRaw);
  } else if (action === 'keep_local') {
    // the cloud copy is newer by clock; restamp this device's save so the server takes it (the player picked it)
    const re = JSON.stringify({ ...localObj, savedAt: Math.max(Date.now(), (cloud?.savedAt || 0) + 1) });
    o.storage.setItem(o.key, re); await o.storage.flush?.();
    up.saved(re);
  }
  return { ok: true, action, uploader: up, cloud, api, uid: sess.uid };
}

/** The one-time choice: two cards, "This device" / "Cloud". Resolves 'device' | 'cloud'. */
export function askChoice(localObj, cloudObj, { doc = document, speciesName } = {}) {
  const L = summarise(localObj, speciesName), C = summarise(cloudObj, speciesName);
  const when = (t) => { try { return new Date(t).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch { return ''; } };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const card = (id, title, s) => `<button class="ks-card" data-pick="${id}"><b>${title}</b><span>Saved ${esc(when(s.savedAt))}</span>`
    + `<span>${esc(s.place)} · Day ${s.day}</span><span>${esc(s.party.join(', ') || 'No Kilumen yet')}</span>`
    + `<span>${s.coins} coins · ${s.caught} caught</span></button>`;
  return new Promise((resolve) => {
    const el = doc.createElement('div'); el.id = 'cloudsave-choice';
    el.innerHTML = `<style>#cloudsave-choice{position:fixed;inset:0;z-index:9999;background:rgba(6,8,18,.94);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;font:15px/1.35 system-ui,sans-serif;color:#eef;padding:16px;box-sizing:border-box;text-align:center}
#cloudsave-choice h2{margin:0;font-size:20px}#cloudsave-choice p{margin:0;max-width:560px;opacity:.85}
#cloudsave-choice .row{display:flex;gap:14px;flex-wrap:wrap;justify-content:center}
.ks-card{display:flex;flex-direction:column;gap:4px;min-width:220px;max-width:280px;padding:14px 16px;border-radius:12px;border:2px solid #4a5a9a;background:#151a33;color:#eef;font:inherit;text-align:left;cursor:pointer}
.ks-card:hover,.ks-card:focus{border-color:#9fb4ff;outline:none}.ks-card b{font-size:17px}</style>
<h2>Two different saves</h2><p>This device and your account's cloud save are different games. Pick the one to keep playing. The other is kept as a backup on this device.</p>
<div class="row">${card('device', 'This device', L)}${card('cloud', 'Cloud', C)}</div>`;
    el.addEventListener('click', (e) => { const b = e.target.closest?.('[data-pick]'); if (!b) return; el.remove(); resolve(b.dataset.pick); });
    doc.body.appendChild(el); el.querySelector('.ks-card')?.focus();
  });
}

/** Session from the site's sign-in (same origin, same persisted session). */
export function supabaseSession(loadLib = () => import(SB_LIB)) {
  let sb = null;
  return async () => {
    if (!sb) { const { createClient } = await loadLib(); sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: false, detectSessionInUrl: false, flowType: 'implicit' } }); }
    const { data } = await sb.auth.getSession(); const s = data?.session;
    return s ? { token: s.access_token, uid: s.user?.id, anonymous: !!s.user?.is_anonymous } : null;
  };
}

// ---- v0.2.54 (Gary 11:04 AM CT Oct 29: "saves arent working across my devices yet") -------------------------------
// Before: a device only compared with the cloud at boot. A home-screen app / phone tab that is resumed (not reloaded)
// never saw the other device's newer save, and nothing on screen said whether cloud saving was on at all.
// Now: (1) a small "Cloud: synced <time>" / "Cloud: off, sign in" indicator; (2) on resume (tab visible again) and every
// 60 s, the cloud meta is checked; a newer save of the same playthrough from another device is offered with one tap
// ("Load"), which writes it locally with saving held, then reloads. Never while a battle / talk / cutscene holds the lock.
const hhmm = (t) => { try { return new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); } catch { return ''; } };
export function cloudIndicator(doc = document) {
  let el = doc.getElementById('cloud-ind');
  if (!el) {
    el = doc.createElement('div'); el.id = 'cloud-ind';
    el.style.cssText = 'position:fixed;left:6px;bottom:4px;z-index:9000;font:11px/1.3 system-ui,sans-serif;color:#cfe;background:rgba(6,10,22,.55);padding:2px 7px;border-radius:8px;pointer-events:none;opacity:.85';
    doc.body.appendChild(el);
  }
  return {
    el,
    set(state, at = 0) {
      const txt = state === 'synced' ? `Cloud: synced ${hhmm(at)}` : state === 'saving' ? 'Cloud: saving…' : state === 'off' ? 'Cloud: off (sign in in Options)'
        : state === 'newer' ? 'Cloud: newer save on another device' : state === 'error' ? 'Cloud: offline, will retry' : 'Cloud: ' + state;
      el.textContent = txt; el.dataset.state = state; if (at) el.dataset.at = String(at);
      try { (globalThis.kilumen ||= {}).cloudStatus = { state, at, text: txt }; } catch { /* */ }
    },
  };
}
export function liveSync({ api, storage, key, store, locked = () => false, ind, doc = document, every = 60000, reload = () => location.reload() }) {
  let busy = false, offered = null;
  const localMeta = () => { try { return metaOf(parse(storage.getItem(key))); } catch { return null; } };
  const offer = (cloud) => {
    if (offered === cloud.savedAt || doc.getElementById('cloud-newer')) return; offered = cloud.savedAt;
    const b = doc.createElement('div'); b.id = 'cloud-newer';
    b.style.cssText = 'position:fixed;left:50%;top:10px;transform:translateX(-50%);z-index:9999;background:#141a2b;border:1px solid #4a5a9a;border-radius:12px;padding:10px 12px;color:#eef;font:15px system-ui,sans-serif;display:flex;gap:10px;align-items:center;max-width:94vw';
    b.innerHTML = `<span>Newer cloud save from ${cloud.device === 'mobile' ? 'your phone' : cloud.device === 'pc' ? 'your PC' : 'another device'} (${hhmm(cloud.savedAt)})</span><button data-l style="min-height:40px;padding:6px 12px;border-radius:8px;background:#2f7a45;color:#fff;border:1px solid #4fae6a">Load</button><button data-x style="min-height:40px;padding:6px 10px;border-radius:8px;background:#2a3560;color:#fff;border:1px solid #5a6aa0">Later</button>`;
    ['keydown', 'keyup', 'pointerdown', 'touchstart'].forEach((t) => b.addEventListener(t, (e) => e.stopPropagation()));
    b.querySelector('[data-x]').onclick = () => b.remove();
    b.querySelector('[data-l]').onclick = async () => {
      b.querySelector('span').textContent = 'Loading cloud save…';
      try {
        const data = await api.data(); if (!data || data.saveId !== cloud.saveId) throw new Error('changed');
        if (store) store.hold = true; // no local save may overwrite it before the reload
        const raw = storage.getItem(key); if (raw) storage.setItem(key + '.bak', raw);
        storage.setItem(key, JSON.stringify(data)); await storage.flush?.(); reload();
      } catch (e) { b.querySelector('span').textContent = 'Could not load it, try again later.'; }
    };
    doc.body.appendChild(b);
  };
  const check = async () => {
    if (busy || doc.visibilityState === 'hidden') return; busy = true;
    try {
      const cloud = await api.meta(), loc = localMeta();
      if (cloud && loc && cloud.saveId === loc.saveId && cloud.savedAt > loc.savedAt) {
        ind?.set('newer', cloud.savedAt);
        if (!locked()) offer(cloud);
      } else if (cloud && loc && cloud.saveId === loc.saveId && cloud.savedAt === loc.savedAt) ind?.set('synced', cloud.savedAt);
    } catch { /* offline: keep the last status */ } finally { busy = false; }
  };
  doc.addEventListener('visibilitychange', () => { if (doc.visibilityState === 'visible') check(); });
  const t = setInterval(check, every);
  return { check, stop: () => clearInterval(t) };
}

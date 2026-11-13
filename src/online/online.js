// Online play, stage 1 prototype (Oct 22, 2026; DRAFT, local only). Loaded by main.js only with ?online=1.
// See players in the same zone as translucent "ghosts" with name tags, interpolated movement and
// quick-chat bubbles. Mute and block work. Typed chat is OFF by default and, when a player turns it on,
// is filtered on both ends (filter.js) and only shown to players who also turned it on.
// The game is not edited: we wrap scene.renderer.draw to add ghost actors and position the DOM layer.
//
// URL: ?online=1 [&transport=local|supabase|off]. Keys: T = quick-chat, P = players, 1-9 = phrase while
// the chat panel is open, Esc = close. Test/debug handle: window.kilumen.online.
import { onlineProfile } from './profiles.js';
import { PHRASES, phraseText, isPhrase } from './phrases.js';
import { nameFor, safeName } from './names.js';
import { checkText, REASON_TEXT } from './filter.js';
import { Throttle, Interp, SafetyList, Cooldown, sameSnap } from './net.js';
import { resolveOnline } from './config.js';
import { LocalTransport } from './local_transport.js';
import { ghostActor } from './ghosts.js';
import { TILE } from '../overworld/constants.js';

const FACING = { down: 'down', left: 'left', right: 'right', up: 'up' };
const HUMAN_H = 96;

function randomId() {
  const a = new Uint8Array(12); crypto.getRandomValues(a);
  return 'p_' + [...a].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function safeStore(get) { try { return get(); } catch { return null; } }

export async function startOnline({ scene, platform, params, toast = () => {} }) {
  const prof = onlineProfile(platform?.id);
  const res = resolveOnline(params);
  if (res.kind === 'off') { console.info('online off:', res.reason); toast(`Online off: ${res.reason}`); return null; }
  const ls = safeStore(() => window.localStorage), ss = safeStore(() => window.sessionStorage);

  // Identity. Local transport: one id per TAB (sessionStorage), so two tabs are two players.
  let id = ss?.getItem('kilumen.online.tab.v1');
  if (!id) { id = randomId(); ss?.setItem('kilumen.online.tab.v1', id); }
  const settingsKey = `kilumen.online.settings.${prof.id}.v1`; // per platform, independent
  const settings = { roll: 0, freeText: prof.freeTextDefault, ...(JSON.parse(safeStore(() => ls?.getItem(settingsKey)) || 'null') || {}) };
  const saveSettings = () => { try { ls?.setItem(settingsKey, JSON.stringify(settings)); } catch { /* ignore */ } };
  const safety = new SafetyList(ls);

  let transport;
  if (res.kind === 'supabase') {
    const { SupabaseTransport } = await import('./supabase_transport.js');
    transport = new SupabaseTransport({ id, profile: prof, url: res.url, key: res.key });
    id = await transport.connect(); // auth uid becomes the player id
  } else transport = new LocalTransport({ id, profile: prof });
  transport.dropFrom = (from) => safety.hides(from);

  const me = { id, name: nameFor(id, settings.roll), bubble: null };
  const peers = new Map(); // id -> { meta, interp, dist, last, bubble, log }
  const throttle = new Throttle(1000 / prof.sendHz), cooldown = new Cooldown(prof.chatCooldownMs);
  const counters = { sent: 0, recv: 0, dropped: 0 };
  let lastSnap = null, lastSentAt = -1e9, zoneKey = null, joining = null, status = 'starting';
  const sendPos = (snap, now) => { transport.send('pos', { ...snap, t: now }); counters.sent++; lastSentAt = now; };

  // ---- transport events ------------------------------------------------------------------
  transport.on('status', (s) => { status = s.state; ui.refresh(); });
  transport.on('peer', ({ id: pid, meta, isNew }) => {
    let p = peers.get(pid);
    if (!p) { p = { meta, interp: new Interp({ delayMs: prof.interpDelayMs, teleportPx: prof.teleportTiles * TILE }), dist: 0, last: null, bubble: null, log: [] }; peers.set(pid, p); }
    p.meta = meta;
    if (isNew) lastSentAt = -1e9; // newcomer sees us on the next frame (keyframe path below)
    ui.refresh();
  });
  transport.on('leave', ({ id: pid }) => { peers.delete(pid); ui.refresh(); });
  transport.on('msg', ({ type, from, payload, recv }) => {
    const p = peers.get(from); if (!p || !payload || typeof payload !== 'object') return;
    counters.recv++;
    if (type === 'need') { lastSentAt = -1e9; return; } // someone unblocked us / lost our position: resend
    if (type === 'pos') {
      const s = readSnap(payload); if (s) p.interp.push(s, recv); else counters.dropped++;
    } else if (type === 'qc') {
      if (!isPhrase(payload.p)) { counters.dropped++; return; }
      p.log.push({ at: Date.now(), kind: 'qc', p: payload.p }); p.log.splice(0, p.log.length - 10);
      if (!safety.silences(from)) p.bubble = { text: phraseText(payload.p), until: performance.now() + prof.bubbleMs };
    } else if (type === 'say') {
      const c = checkText(payload.text, { maxLen: prof.freeTextMaxLen });
      p.log.push({ at: Date.now(), kind: 'say', text: String(payload.text).slice(0, 80), passed: c.ok }); p.log.splice(0, p.log.length - 10);
      if (!c.ok) { counters.dropped++; return; } // receiver re-filters: a modded sender can't get past us
      if (settings.freeText && !safety.silences(from)) p.bubble = { text: c.text, typed: true, until: performance.now() + prof.bubbleMs };
    }
  });

  function readSnap(d) {
    if (!Number.isFinite(d.t) || !Number.isFinite(d.px) || !Number.isFinite(d.py) || typeof d.map !== 'string') return null;
    return { t: d.t, map: d.map.slice(0, 64), px: Math.round(d.px), py: Math.round(d.py), l: Number.isFinite(d.l) ? Math.max(0, Math.min(64, d.l)) : 0, f: FACING[d.f] || 'down', a: d.a === 'run' || d.a === 'bike' ? d.a : 'walk' };
  }

  // ---- zone channel ------------------------------------------------------------------------
  function zoneOf() { const z = scene.zone?.(); return z ? `zone:${z}` : `map:${scene.map?.name || 'none'}`; }
  async function ensureZone() {
    const z = zoneOf();
    if (z === zoneKey || joining) return;
    zoneKey = z; peers.clear();
    joining = transport.joinZone(z, { name: me.name, map: scene.map?.name, platform: prof.id, freeText: !!settings.freeText })
      .catch((e) => { console.error('online join:', e); status = 'error'; })
      .finally(() => { joining = null; lastSnap = null; ui.refresh(); });
  }

  // ---- per-frame hook (wrap renderer.draw; the game files stay untouched) -------------------
  const renderer = scene.renderer, draw = renderer.draw.bind(renderer);
  renderer.draw = (v) => {
    const now = performance.now();
    try { tick(v, now); } catch (e) { console.error('online tick:', e); }
    draw(v);
    try { ui.place(v, now); } catch (e) { console.error('online ui:', e); }
  };

  function tick(v, now) {
    if (!scene.map) return;
    ensureZone();
    // our snapshot -> throttled send (nothing is sent while standing still)
    const p = v.player, { px, py, lift } = p.pixel(), f = p.frame();
    const snap = { map: scene.map.name, px, py, l: lift, f: p.facing, a: f.anim };
    if (transport.channel && !joining) {
      if (snap.map !== transport.meta.map) transport.setMeta({ map: snap.map });
      let out = null;
      if (!sameSnap(snap, lastSnap)) { lastSnap = snap; out = throttle.push(snap, now); } else out = throttle.poll(now);
      if (out) sendPos(out, now);
      else if (now - lastSentAt >= prof.keyframeMs && sameSnap(snap, lastSnap)) sendPos(snap, now); // slow keyframe: heals lost/dropped messages
    }
    // ghosts on our map
    for (const [pid, g] of peers) {
      if (safety.hides(pid)) { g.screen = null; continue; }
      const s = g.interp.sample(now);
      if (!s || s.map !== scene.map.name) { g.screen = null; continue; }
      if (g.last && g.last.map === s.map) g.dist += Math.abs(s.px - g.last.px) + Math.abs(s.py - g.last.py);
      if (!s.moving) g.dist = 0;
      g.last = s;
      v.actors.push(ghostActor(scene, s, g.dist, v.grade));
      g.screen = s;
    }
  }

  // ---- chat ------------------------------------------------------------------------------
  function sendPhrase(pid) {
    if (!isPhrase(pid) || !transport.channel) return false;
    if (!cooldown.take(performance.now())) { ui.flash('Wait a moment…'); return false; }
    transport.send('qc', { p: pid }); counters.sent++;
    me.bubble = { text: phraseText(pid), until: performance.now() + prof.bubbleMs };
    return true;
  }
  function sendText(raw) {
    if (!settings.freeText) return { ok: false, reason: 'off' };
    const c = checkText(raw, { maxLen: prof.freeTextMaxLen });
    if (!c.ok) { ui.flash(REASON_TEXT[c.reason] || "Can't send that."); return c; }
    if (!transport.channel || !cooldown.take(performance.now())) { ui.flash('Wait a moment…'); return { ok: false, reason: 'cooldown' }; }
    transport.send('say', { text: c.text }); counters.sent++;
    me.bubble = { text: c.text, typed: true, until: performance.now() + prof.bubbleMs };
    return c;
  }
  function report(pid, reason = 'other') {
    const p = peers.get(pid);
    const entry = { at: new Date().toISOString(), reported: pid, name: safeName(p?.meta?.name), reason, evidence: p?.log?.slice(-5) || [], zone: zoneKey, by: id };
    if (transport.kind === 'supabase') transport.report?.({ reportedId: pid, reason, evidence: entry.evidence }).catch((e) => console.error('report:', e));
    else { // local prototype: keep reports on this device (stage 2 sends them to online_reports)
      try { const all = JSON.parse(ls?.getItem('kilumen.online.reports.v1') || '[]'); all.push(entry); ls?.setItem('kilumen.online.reports.v1', JSON.stringify(all.slice(-50))); } catch { /* ignore */ }
    }
    safety.block(pid); ui.refresh(); ui.flash('Thanks. Reported and blocked.');
    return entry;
  }

  function unblock(pid) { safety.unblock(pid); if (transport.channel) transport.send('need', {}); ui.refresh(); }

  // ---- UI ----------------------------------------------------------------------------------
  const ui = mountUI({ prof, me, peers, safety, settings, sendPhrase, sendText, report, unblock, saveSettings, getStatus: () => ({ status, channel: transport.channel, kind: transport.kind }), transport });

  const api = {
    id, get name() { return me.name; }, profile: prof.id, transport: transport.kind,
    state: () => ({
      id, name: me.name, status, channel: transport.channel, kind: transport.kind, freeText: !!settings.freeText, counters: { ...counters },
      peers: [...peers.entries()].map(([pid, p]) => ({ id: pid, name: safeName(p.meta?.name), map: p.meta?.map, hidden: safety.hides(pid), muted: safety.isMuted(pid), blocked: safety.isBlocked(pid), onScreen: !!p.screen, pos: p.screen ? { px: p.screen.px, py: p.screen.py, f: p.screen.f } : null, bubble: p.bubble && p.bubble.until > performance.now() ? p.bubble.text : null })),
      myBubble: me.bubble && me.bubble.until > performance.now() ? me.bubble.text : null,
    }),
    sendPhrase, sendText, report,
    mute: (pid) => { safety.mute(pid); ui.refresh(); }, unmute: (pid) => { safety.unmute(pid); ui.refresh(); },
    block: (pid) => { safety.block(pid); ui.refresh(); }, unblock: (pid) => { unblock(pid); },
    setFreeText: (on) => { settings.freeText = !!on; saveSettings(); transport.setMeta({ freeText: !!on }); ui.refresh(); },
    leave: () => transport.leave(),
  };
  window.addEventListener('pagehide', () => { transport.leave(); });
  return api;
}

// ---- DOM layer: top-centre bar, panels, name tags, bubbles ------------------------------------
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

function mountUI(o) {
  const { prof, me, peers, safety, settings } = o;
  if (!document.querySelector('link[data-online-css]')) {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = new URL('./online.css', import.meta.url).href; l.dataset.onlineCss = '1'; document.head.appendChild(l);
  }
  document.body.classList.add('ol-on', `ol-${prof.id}`);
  document.documentElement.style.setProperty('--ol-btn', `${prof.minButtonPx}px`);
  document.documentElement.style.setProperty('--ol-cols', String(prof.panelColumns));

  const layer = el('div', 'ol-layer'); layer.setAttribute('aria-hidden', 'true');
  const bar = el('div', 'ol-bar'); bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Online');
  const label = el('span', 'ol-label', 'Online');
  const chatBtn = el('button', 'ol-btn ol-chat-btn', 'Chat'); chatBtn.type = 'button'; chatBtn.dataset.ol = 'chat';
  const plBtn = el('button', 'ol-btn ol-players-btn', 'Players'); plBtn.type = 'button'; plBtn.dataset.ol = 'players';
  bar.append(label, chatBtn, plBtn);

  const chat = el('div', 'ol-panel ol-chat'); chat.hidden = true; chat.setAttribute('role', 'dialog'); chat.setAttribute('aria-label', 'Quick chat');
  const grid = el('div', 'ol-phrases');
  PHRASES.forEach((p, i) => {
    const b = el('button', 'ol-btn ol-phrase', p.text); b.type = 'button'; b.dataset.phrase = p.id;
    if (i < 9) b.title = `${i + 1}`;
    b.addEventListener('click', () => { if (o.sendPhrase(p.id)) closeAll(); });
    grid.append(b);
  });
  const typed = el('form', 'ol-typed');
  const input = el('input', 'ol-input'); input.type = 'text'; input.maxLength = prof.freeTextMaxLen; input.placeholder = 'Type a message (filtered)'; input.autocomplete = 'off'; input.enterKeyHint = 'send';
  const sendB = el('button', 'ol-btn', 'Send'); sendB.type = 'submit';
  typed.append(input, sendB);
  typed.addEventListener('submit', (e) => { e.preventDefault(); const r = o.sendText(input.value); if (r.ok) { input.value = ''; closeAll(); } });
  input.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') closeAll(); }); // typing never moves the player
  input.addEventListener('keyup', (e) => e.stopPropagation());
  const close1 = el('button', 'ol-btn ol-close', 'Close'); close1.type = 'button'; close1.addEventListener('click', () => closeAll());
  chat.append(grid, typed, close1);

  const pl = el('div', 'ol-panel ol-players'); pl.hidden = true; pl.setAttribute('role', 'dialog'); pl.setAttribute('aria-label', 'Players nearby');
  const list = el('ul', 'ol-list');
  const meRow = el('p', 'ol-me');
  const ftLabel = el('label', 'ol-setting'); const ft = el('input'); ft.type = 'checkbox'; ft.dataset.ol = 'freetext';
  ftLabel.append(ft, document.createTextNode(' Typed chat (filtered). Off = quick-chat only'));
  ft.addEventListener('change', () => { settings.freeText = ft.checked; o.saveSettings(); o.transport.setMeta({ freeText: ft.checked }); refresh(); });
  const close2 = el('button', 'ol-btn ol-close', 'Close'); close2.type = 'button'; close2.addEventListener('click', () => closeAll());
  pl.append(meRow, list, ftLabel, close2);

  const flashEl = el('div', 'ol-flash'); flashEl.setAttribute('role', 'status');
  document.body.append(layer, bar, chat, pl, flashEl);
  for (const n of [bar, chat, pl]) { n.addEventListener('pointerdown', (e) => e.stopPropagation()); n.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true }); }

  function closeAll() { chat.hidden = true; pl.hidden = true; chatBtn.setAttribute('aria-expanded', 'false'); plBtn.setAttribute('aria-expanded', 'false'); input.blur(); }
  function toggle(panel, btn) { const open = panel.hidden; closeAll(); panel.hidden = !open; btn.setAttribute('aria-expanded', String(open)); if (open) refresh(); }
  chatBtn.addEventListener('click', () => toggle(chat, chatBtn));
  plBtn.addEventListener('click', () => toggle(pl, plBtn));
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement || e.repeat) return;
    if (e.code === prof.keys.chat) toggle(chat, chatBtn);
    else if (e.code === prof.keys.players) toggle(pl, plBtn);
    else if (e.code === 'Escape' && (!chat.hidden || !pl.hidden)) { closeAll(); e.stopPropagation(); }
    else if (!chat.hidden && /^Digit[1-9]$/.test(e.code)) { const p = PHRASES[Number(e.code.slice(5)) - 1]; if (p && o.sendPhrase(p.id)) closeAll(); }
  }, true);

  let flashT = 0;
  function flash(msg) { flashEl.textContent = msg; flashEl.classList.add('show'); clearTimeout(flashT); flashT = setTimeout(() => flashEl.classList.remove('show'), 1800); }

  function refresh() {
    const st = o.getStatus(), n = [...peers.keys()].filter((id) => !safety.hides(id)).length;
    const where = st.channel ? st.channel.replace(/^(zone|map):/, '').replace(/#1$/, '').replace(/#(\d+)$/, ' (area $1)').replace(/_/g, ' ') : '…';
    const full = st.status === 'joined' ? `Online · ${where} · ${n} nearby` : st.status === 'full' ? 'Online · area full' : st.status === 'error' ? 'Online · offline' : 'Online · joining…';
    // phones: short label so the bar never reaches the clock (top-right) in landscape
    label.textContent = prof.id === 'mobile' ? (st.status === 'joined' ? `${n} nearby` : st.status === 'full' ? 'Area full' : st.status === 'error' ? 'Offline' : 'Joining…') : full;
    label.title = full; bar.setAttribute('aria-label', full);
    typed.hidden = !settings.freeText; ft.checked = !!settings.freeText;
    meRow.textContent = `You are ${me.name}`;
    if (pl.hidden) return;
    list.replaceChildren();
    if (!peers.size) list.append(el('li', 'ol-empty', 'Nobody nearby yet.'));
    for (const [pid, p] of peers) {
      const li = el('li', 'ol-row'); li.dataset.peer = pid;
      const nm = el('span', 'ol-name', safeName(p.meta?.name));
      const blocked = safety.isBlocked(pid), muted = safety.isMuted(pid);
      const mute = el('button', 'ol-btn', muted ? 'Unmute' : 'Mute'); mute.type = 'button'; mute.dataset.act = 'mute'; mute.disabled = blocked;
      mute.addEventListener('click', () => { muted ? safety.unmute(pid) : safety.mute(pid); refresh(); });
      const block = el('button', 'ol-btn', blocked ? 'Unblock' : 'Block'); block.type = 'button'; block.dataset.act = 'block';
      block.addEventListener('click', () => { blocked ? o.unblock(pid) : safety.block(pid); refresh(); });
      const rep = el('button', 'ol-btn ol-report', 'Report'); rep.type = 'button'; rep.dataset.act = 'report';
      rep.addEventListener('click', () => o.report(pid, 'other'));
      li.append(nm, mute, block, rep); list.append(li);
    }
  }

  // name tags + bubbles, positioned over the canvas each frame
  const tags = new Map();
  function tagFor(key) {
    let t = tags.get(key);
    if (!t) { t = { root: el('div', 'ol-tag'), name: el('span', 'ol-tag-name'), bub: el('span', 'ol-bubble') }; t.root.append(t.bub, t.name); layer.append(t.root); tags.set(key, t); }
    return t;
  }
  let lastCount = -1;
  function place(v, now) {
    const canvas = v.map && document.getElementById('world'); if (!canvas) return;
    const k = canvas.clientWidth / canvas.width, z = v.zoom, live = new Set();
    const put = (key, name, s, bubble, mine) => {
      const t = tagFor(key); live.add(key);
      const x = (s.px + TILE / 2 - v.cam.x) * z * k, y = (s.py + TILE - HUMAN_H - (s.l || 0) - v.cam.y) * z * k;
      t.root.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -100%)`;
      t.root.classList.toggle('mine', !!mine);
      if (t.name.textContent !== name) t.name.textContent = name;
      const btxt = bubble && bubble.until > now ? bubble.text : '';
      if (t.bub.textContent !== btxt) t.bub.textContent = btxt;
      t.bub.hidden = !btxt; t.bub.classList.toggle('typed', !!bubble?.typed);
    };
    const p = v.player.pixel();
    put('me', me.name, { px: p.px, py: p.py, l: p.lift }, me.bubble, true);
    for (const [pid, g] of peers) if (g.screen) put(pid, safeName(g.meta?.name), g.screen, safety.silences(pid) ? null : g.bubble, false);
    for (const [key, t] of tags) if (!live.has(key)) { t.root.remove(); tags.delete(key); }
    const n = peers.size; if (n !== lastCount) { lastCount = n; refresh(); }
  }
  refresh();
  return { refresh, place, flash, closeAll };
}

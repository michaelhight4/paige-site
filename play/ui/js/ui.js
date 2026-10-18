// ui.js — tiny DOM helpers, navigation stack, modals. No state beyond what adapter returns.
import { adapter } from './adapter.js';

export const store = { cfg: null, state: null, root: null, stack: [], newIds: new Set(), unlocks: [] };
export const Art = () => window.LifeSimArt || null;
export const sfx = (n) => { try { const a = Art(); a && a.sfx && a.sfx.play(n); } catch (e) { /* audio is optional */ } };
// emoji used by the ui3 config -> art_ui icon ids (unmapped emoji stay as text)
const EMO = { '💼': 'finance', '🎓': 'activity.study', '🥊': 'athlete', '🧰': 'builder', '🏢': 'finance', '🕑': 'retail', '🎖️': 'police', '🎭': 'actor', '🏅': 'athlete', '🗂️': 'agent', '💳': 'asset.cash', '📈': 'stocks', '💎': 'asset.jewelry', '🔨': 'collectibles', '🎰': 'activity.casino', '🏎️': 'vehicle.super', '🦒': 'activity.pet', '🛠️': 'builder', '🧳': 'asset.land', '🏠': 'property.suburb', '🏡': 'property.suburb', '🛍️': 'activity.shopping', '🚗': 'vehicle.sedan', '⛵': 'vehicle.dinghy', '✈️': 'vehicle.prop', '💍': 'asset.jewelry', '🎸': 'media', '🎹': 'media', '💪': 'activity.gym', '🏥': 'medicine', '🧘': 'activity.meditate', '🎉': 'activity.party', '🏖️': 'activity.vacation', '📚': 'activity.library', '🤝': 'activity.volunteer', '📜': 'lawyer', '🔪': 'criminal', '🏆': 'ribbon.honor', '🌳': 'property.cabin', '⭐': 'ribbon.famous', '🔧': 'builder', '🎯': 'activity.work', '👪': 'ribbon.parent', '🏦': 'asset.bonds' };
export function ico(e, size = 40) {
  const A = Art(), id = EMO[e];
  const el = document.createElement('span'); el.className = 'ic';
  if (A && id) { el.innerHTML = A.icon(id, { size, title: '' }); el.classList.add('art'); } else el.textContent = e || '';
  return el;
}
// Pixel-character avatar: composes the layered 128x128 sprite (src/character.js) for the player / a person (spec.pid) / a seed.
// Falls back to the old art_ui avatar only if the sprite cannot be built.
export function avatarEl(spec, size = 44, crop = 'head') {
  const el = document.createElement('div'); el.className = 'avatar art char-avatar'; el.style.width = el.style.height = size + 'px'; el.style.lineHeight = '0';
  if (spec && spec.dead) el.style.filter = 'grayscale(1) opacity(.7)';
  const legacy = () => { const A = Art(); if (A && spec) { try { let sp = spec; if (sp.seed != null) sp = A.randomAvatarSpec(sp.seed, sp); el.innerHTML = A.renderAvatar(sp, { size, crop }); return; } catch (e) { /* fall through */ } } el.textContent = '🙂'; };
  (async () => {
    try {
      const look = spec && spec.pid != null ? await adapter.getLookOf(spec.pid) : spec ? await adapter.getLookSeed(spec.seed, spec.age) : null;
      if (!look || !look.layers) return legacy();
      const { composeSprite } = await import('./character.js');
      el.innerHTML = await composeSprite(look, { size, crop: crop === 'head' ? 'head' : null, shadow: crop !== 'head' });
    } catch (e) { legacy(); }
  })();
  return el;
}

export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return el;
}

export function money(n, compact = false) {
  if (n == null || isNaN(n)) return '—';
  const neg = n < 0, a = Math.abs(n);
  let s;
  if (compact && a >= 1e9) s = (a / 1e9).toFixed(2) + ' Billion'; else if (compact && a >= 1e6) s = (a / 1e6).toFixed(2) + ' Million';
  else s = Math.round(a).toLocaleString('en-US');
  return (neg ? '-' : '') + '$' + s;
}

export function band(v) {
  for (const b of store.cfg.statBands) if (v >= b.min && v <= b.max) return b;
  return store.cfg.statBands[0];
}
export function bar(label, value, o = {}) {
  const A = Art(), cls = o.neutral ? 'is-mid' : (A ? A.levelClass(value) : '');
  return h('div', { class: `bar ${band(value).cls} ${o.thin ? 'thin' : ''}`, 'data-bar': o.key || label, 'data-value': value, role: 'progressbar', 'aria-valuenow': value, 'aria-label': label },
    h('div', { class: 'lbl' }, o.icon ? h('span', { text: o.icon }) : null, label),
    h('div', { class: 'track' }, h('div', { class: 'fill', style: { width: Math.max(2, value) + '%' } })),
    h('div', { class: 'val', text: String(value) }));
}

export function avatarFor(gender, age, spec) {
  if (spec) return avatarEl(spec, 44);
  let e = '🙂'; for (const a of store.cfg.avatars) if (age >= a.minAge) e = a[gender] || a.M; return h('div', { class: 'avatar', text: e });
}

export function section(title) { return h('div', { class: 'sec', text: title }); }
export function row({ icon, title, sub, right, badge, badgeCls, chevron = true, onClick, disabled, id, premium, avatar }) {
  const isNew = id && store.newIds.has(id) && !disabled; if (isNew && !badge) { badge = 'New'; badgeCls = 'new'; }
  if (isNew && onClick) { const o = onClick; onClick = (e) => { store.newIds.delete(id); import('./adapter.js').then((m) => m.adapter.markSeen(id)).then(() => document.dispatchEvent(new CustomEvent('unlockseen'))); return o(e); }; }
  return h(onClick && !disabled ? 'button' : 'div', { class: 'row' + (disabled ? ' dis' : '') + (premium ? ' prem' : '') + (premium && disabled ? ' prem-lock' : ''), 'data-id': id, 'data-premium': premium, onclick: disabled ? null : onClick },
    avatar ? avatarEl(avatar, 40) : icon ? ico(icon) : null,
    h('span', { class: 'tx' }, h('span', { class: 't', text: title }), sub ? h('span', { class: 's', text: sub }) : null),
    badge ? h('span', { class: 'badge ' + (badgeCls || ''), text: badge }) : null,
    right ? h('span', { class: 'rt', text: right }) : null,
    chevron && onClick && !disabled ? h('span', { class: 'chev', text: '›' }) : null);
}
export function kv(k, v, cls) { return h('div', { class: 'kv' }, h('span', { text: k }), h('b', { class: cls || '', text: v })); }
export const btn = (label, onClick, cls = '', extra = {}) => h('button', { class: 'btn ' + cls, onclick: onClick, ...extra }, label);
export function empty(msg) { return h('div', { class: 'empty', text: msg }); }
export function chip(text, cls = '') { return h('span', { class: 'chip ' + cls, text }); }

// ---------- toast ----------
export function toast(msg, kind = '') {
  store.root.querySelectorAll('.toast').forEach(x => x.remove()); sfx(kind === 'good' ? 'good' : kind === 'bad' ? 'bad' : 'pop'); const t = h('div', { class: 'toast ' + kind, role: 'status', text: msg }); store.root.append(t); setTimeout(() => t.remove(), 2600);
}

// ---------- modal / sheet ----------
export function sheet({ title, body, options, buttons, center = false, dismissable = true, html }) {
  return new Promise((resolve) => {
    const close = (v) => { ov.remove(); resolve(v); };
    const content = h('div', { class: 'sheet' + (center ? ' center' : ''), role: 'dialog', 'aria-label': title },
      title ? h('h3', { text: title }) : null,
      body ? (typeof body === 'string' ? h('p', { text: body }) : body) : null,
      (options || []).map((o, i) => h('button', { class: 'opt' + (o.disabled ? ' dis' : ''), 'data-opt': i, onclick: () => close(i) }, o.label, o.sub ? h('div', { class: 'hint', text: o.sub }) : null)),
      buttons ? h('div', { class: 'btns' }, buttons.map((b) => h('button', { class: 'btn ' + (b.cls || ''), 'data-btn': b.id, onclick: () => close(b.id) }, b.label))) : null);
    const ov = h('div', { class: 'overlay', onclick: (e) => { if (dismissable && e.target === ov) close(null); } }, content);
    store.root.append(ov);
  });
}
export const confirmSheet = async (title, body, yes = 'Yes', cls = '') => (await sheet({ title, body, center: true, buttons: [{ id: 'no', label: 'Cancel', cls: 'alt' }, { id: 'yes', label: yes, cls }] })) === 'yes';
export async function askNumber(title, { min = 0, max = 1e9, def, note = '' } = {}) {
  const inp = h('input', { type: 'number', min, max, value: def ?? min, inputmode: 'numeric', 'data-input': 'amount' });
  const body = h('div', null, note ? h('p', { text: note }) : null, inp);
  const r = await sheet({ title, body, center: true, buttons: [{ id: 'no', label: 'Cancel', cls: 'alt' }, { id: 'ok', label: 'OK', cls: 'go' }] });
  return r === 'ok' ? Math.max(min, Math.min(max, Number(inp.value) || 0)) : null;
}

// ---------- state & actions ----------
export async function refreshState() {
  store.state = await adapter.getState(); try { store.unlocks = await adapter.getUnlocks(); store.newIds = new Set(store.unlocks.filter((u) => u.isNew).map((u) => u.id)); } catch (e) { /* custom adapters may not support unlocks */ } document.dispatchEvent(new CustomEvent('statechange', { detail: store.state })); return store.state;
}
// run an adapter action that returns {ok,message,entries?}: toast + refresh state + append journal
export async function act(promise, { quiet = false } = {}) {
  let r; try { r = await promise; } catch (e) { console.error(e); toast('Error: ' + e.message, 'bad'); throw e; }
  if (r?.message && !quiet) toast(r.message, r.ok ? 'good' : 'bad');
  if (r?.entries?.length) document.dispatchEvent(new CustomEvent('journal', { detail: r.entries }));
  await refreshState();
  if (r?.died && r.death) document.dispatchEvent(new CustomEvent('died', { detail: r.death }));
  if (store.stack.length) await rerenderTop();
  return r;
}

// ---------- panel navigation ----------
// screen = async (body, ctx) => void ; ctx = {nav, refresh}
export function openPanel(title, render, { mini } = {}) {
  store.stack.push({ title, render, mini }); drawPanel(true); document.dispatchEvent(new CustomEvent('panelchange'));
}
export async function rerenderTop() { if (store.stack.length) await drawTop(); }
export function closeAll() { store.root.querySelectorAll('.panel').forEach(p => p.remove()); store.stack = []; document.dispatchEvent(new CustomEvent('panelchange')); }
export function back() {
  store.stack.pop(); document.dispatchEvent(new CustomEvent('panelchange')); const ps = store.root.querySelectorAll('.panel'); if (ps.length) ps[ps.length - 1].remove();
  const rest = store.root.querySelectorAll('.panel');
  if (store.stack.length && rest.length) { const t = rest[rest.length - 1]; t.style.display = ''; t.style.animation = 'none'; t.classList.add('top'); drawTop(); }
}
function drawPanel(animate) {
  const top = store.stack[store.stack.length - 1];
  const el = h('div', { class: 'panel', 'data-title': top.title, style: animate ? null : { animation: 'none' } },
    h('div', { class: 'pbar' },
      h('button', { class: 'pbtn', 'aria-label': store.stack.length > 1 ? 'Back' : 'Close', 'data-nav': 'back', onclick: back, text: store.stack.length > 1 ? '‹' : '✕' }),
      h('h2', { text: top.title })),
    h('div', { class: 'mini', 'data-mini': '' }),
    h('div', { class: 'qbar', 'data-el': 'qbar', hidden: true }),
    h('div', { class: 'body' }));
  store.root.querySelectorAll('.panel').forEach(p => { p.style.display = 'none'; p.classList.remove('top'); });
  el.classList.add('top'); store.root.append(el);
  drawTop();
}
// ---------- inline quick actions + Age (menus that list repeatable actions) ----------
// panel title -> quick-action context (see src/adapter_quick.js CONTEXTS). Screens not listed get no bar.
export const QUICK_PANELS = { Skills: 'skills', Passions: 'skills', Scholarships: 'skills', Work: 'work', Education: 'work', 'Part-Time': 'work', 'Freelance Gigs': 'work', 'Sports Career': 'work', 'Live Streamer': 'work', Influencer: 'work', Activities: 'activities', Social: 'social' };
async function paintQuick(bar, title) {
  if (!bar) return; const ctx = QUICK_PANELS[title]; if (!ctx) { bar.hidden = true; bar.replaceChildren(); return; }
  let q; try { q = await adapter.getQuickActions(ctx); } catch (e) { bar.hidden = true; return; }
  const chips = q.actions.map((a) => h('button', { class: 'qchip' + (a.done ? ' done' : ''), 'data-quick': a.id, disabled: a.disabled || null, title: a.reason || a.hint || '', onclick: async () => { await act(adapter.quickAction(a.id)); } }, h('span', { class: 'qi', text: a.done ? '✓' : a.icon }), h('span', { class: 'ql', text: a.label }), a.hint && !a.done ? h('small', { text: a.hint }) : null));
  const ageB = h('button', { class: 'qage', 'data-el': 'inline-age', 'aria-label': 'Age one year', disabled: q.alive ? null : true, onclick: () => document.dispatchEvent(new CustomEvent('ageup')) }, h('b', { text: 'AGE' }), h('small', { text: '→ ' + q.nextAge }));
  const au = q.auto || {};
  const autoB = h('div', { class: 'qauto' }, h('button', { class: 'qa' + (au.on ? ' on' : ''), 'data-el': 'inline-auto', 'aria-label': 'Toggle autopilot', 'aria-pressed': au.on ? 'true' : 'false', onclick: async () => { const m = await import('./screens/auto.js'); if (!au.unlocked) { openPanel('Autopilot', m.autopilotScreen); return; } await act(adapter.setAutopilot({ on: !au.on }), { quiet: true }); } }, '🤖 ' + (au.on ? 'On' : au.unlocked ? 'Off' : '🔒')),
    h('button', { class: 'qa', 'data-el': 'inline-skip', 'aria-label': 'Skip ahead', onclick: async () => { const m = await import('./screens/auto.js'); if (!au.unlocked) { openPanel('Autopilot', m.autopilotScreen); return; } await m.skipSheet(); } }, '⏩ Skip'));
  bar.hidden = false; bar.replaceChildren(h('div', { class: 'qchips' }, ...chips), autoB, ageB);
}
async function drawTop() {
  const top = store.stack[store.stack.length - 1]; const panels = store.root.querySelectorAll('.panel'); const el = panels[panels.length - 1]; if (!el) return;
  const body = el.querySelector('.body'), mini = el.querySelector('[data-mini]'), sc = body.scrollTop;
  const st = store.state;
  mini.replaceChildren(h('span', { text: st.name + ' · age ' + st.age }), h('span', { text: money(st.cash) }));
  await paintQuick(el.querySelector('[data-el=qbar]'), top.title);
  const frag = h('div'); frag.dataset.screen = top.title;
  try { await top.render(frag, { refresh: rerenderTop, nav: { open: openPanel, back, closeAll } }); }
  catch (e) { console.error('screen error', top.title, e); frag.replaceChildren(empty('Something went wrong: ' + e.message)); }
  body.replaceChildren(frag); body.scrollTop = sc;
}

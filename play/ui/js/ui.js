import { fmtMoney, fmtCompact } from '../../src/fmt.js';
// ui.js — tiny DOM helpers, navigation stack, modals. No state beyond what adapter returns.
import { adapter } from './adapter.js';

export const store = { cfg: null, state: null, root: null, stack: [], newIds: new Set(), unlocks: [] };
export const Art = () => window.LifeSimArt || null;
export const sfx = (n) => { try { const a = Art(); a && a.sfx && a.sfx.play(n); } catch (e) { /* audio is optional */ } };
// emoji used by the ui3 config -> art_ui icon ids (unmapped emoji stay as text)
const EMO = { '💼': 'finance', '🎓': 'activity.study', '🥊': 'athlete', '🧰': 'builder', '🏢': 'finance', '🕑': 'retail', '🎖️': 'police', '🎭': 'actor', '🏅': 'athlete', '🗂️': 'agent', '💳': 'asset.cash', '📈': 'stocks', '💎': 'asset.jewelry', '🔨': 'collectibles', '🎰': 'activity.casino', '🏎️': 'vehicle.super', '🦒': 'activity.pet', '🛠️': 'builder', '🧳': 'asset.land', '🏠': 'property.suburb', '🏡': 'property.suburb', '🛍️': 'activity.shopping', '🚗': 'vehicle.sedan', '⛵': 'vehicle.dinghy', '✈️': 'vehicle.prop', '💍': 'asset.jewelry', '🎸': 'media', '🎹': 'media', '💪': 'activity.gym', '🏥': 'medicine', '🧘': 'activity.meditate', '🎉': 'activity.party', '🏖️': 'activity.vacation', '📚': 'activity.library', '🤝': 'activity.volunteer', '📜': 'lawyer', '🔪': 'criminal', '🏆': 'ribbon.honor', '🌳': 'property.cabin', '⭐': 'ribbon.famous', '🔧': 'builder', '🎯': 'activity.work', '👪': 'ribbon.parent', '🏦': 'asset.bonds' };
export function ico(e, size = 40) {
  // 'job:<sector or special id>' -> the per-industry job art (art/icon_data.js `job`); emoji fallback when the art pack is not loaded
  if (typeof e === 'string' && e.startsWith('job:')) { const A0 = Art(), el0 = document.createElement('span'); el0.className = 'ic'; if (A0 && A0.iconData && A0.iconData.job && A0.iconData.job[e.slice(4)]) { el0.innerHTML = A0.icon('job.' + e.slice(4), { size, title: '' }); el0.classList.add('art'); } else el0.textContent = '💼'; el0.dataset.jobIcon = e.slice(4); return el0; }
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

// 7c6 item 13: values >= 1B show the compact form only ("$172.59 sept", "-$22.94 quint"); tapping a value reveals the full number.
export const FULL = new Map();
export function money(n, compact = false) {
  if (compact) return fmtCompact(n);
  if (n != null && isFinite(n) && Math.abs(n) >= 1e9) { const c = fmtCompact(n); FULL.set(c, fmtMoney(n)); if (FULL.size > 5000) FULL.clear(); return c; }
  return fmtMoney(n);
}
if (typeof document !== 'undefined') document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('b, .big, .right, .sub'); if (!b || b.children.length) return; const t = b.textContent; if (b.dataset.compact) { b.textContent = b.dataset.compact; delete b.dataset.compact; return; } for (const [c, f] of FULL) if (t.includes(c)) { b.dataset.compact = t; b.textContent = t.replace(c, f); return; } });

export function band(v) {
  for (const b of store.cfg.statBands) if (v >= b.min && v <= b.max) return b;
  return store.cfg.statBands[0];
}
// dev/ui-modern stats redesign: clean SVG icon badge per core stat, value chip, change animation (reduced-motion aware)
const STAT_ICON = {
  happy: '<path d="M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18Zm-3.5-10.5a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Zm7 0a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4ZM7.8 13.5a4.6 4.6 0 0 0 8.4 0Z" fill="currentColor" fill-rule="evenodd"/>',
  health: '<path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z" fill="currentColor"/><path d="M8 12h2.4l1-2 1.6 4 1-2H16" stroke="#0005" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  smarts: '<path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V17h5.2v-1.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3Z" fill="currentColor"/><rect x="9.4" y="18.2" width="5.2" height="2.6" rx="1.2" fill="currentColor"/>',
  looks: '<path d="M12 2.5l2.2 6.3 6.3 2.2-6.3 2.2L12 19.5l-2.2-6.3L3.5 11l6.3-2.2Z" fill="currentColor"/><circle cx="19" cy="19" r="1.8" fill="currentColor"/>',
  fame: '<path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9Z" fill="currentColor"/>',
};
const lastVal = new Map();
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export function bar(label, value, o = {}) {
  const A = Art(), cls = o.neutral ? 'is-mid' : (A ? A.levelClass(value) : '');
  const k = o.key || label, svg = STAT_ICON[k], prev = svg ? lastVal.get(k) : undefined; if (svg) lastVal.set(k, value);
  const d = prev === undefined ? 0 : value - prev;
  const startW = d && !calm() ? Math.max(2, prev) : Math.max(2, value);
  const fill = h('div', { class: 'fill', style: { width: startW + '%' } });
  if (startW !== Math.max(2, value)) requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.width = Math.max(2, value) + '%'; }));
  const icon = svg ? h('span', { class: 'sbadge', 'aria-hidden': 'true' }) : (o.icon ? h('span', { text: o.icon }) : null);
  if (svg) icon.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18">${svg}</svg>`;
  const el = h('div', { class: `bar ${band(value).cls} ${o.thin ? 'thin' : ''} ${svg ? 'sbar' : ''} ${d > 0 ? 'chg up' : d < 0 ? 'chg down' : ''}`, 'data-bar': k, 'data-value': value, role: 'progressbar', 'aria-valuenow': value, 'aria-label': label },
    h('div', { class: 'lbl' }, icon, h('span', { class: 'ltx', text: label })),
    h('div', { class: 'track' }, fill),
    h('div', { class: 'val' }, h('b', { text: String(value) }), d ? h('em', { class: 'delta', text: (d > 0 ? '+' : '') + d }) : null));
  return el;
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
export function kv(k, v, cls) { if (cls === 'pos' && /^\s*[-−]\s*\$?\d/.test(String(v))) cls = 'neg'; /* sign and colour always agree (7c6) */ return h('div', { class: 'kv' }, h('span', { text: k }), h('b', { class: cls || '', text: v })); }
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
    const ov = h('div', { class: 'overlay', 'data-mandatory': dismissable ? null : '1', onclick: (e) => { if (dismissable && e.target === ov) close(null); } }, content);
    store.root.append(ov);
  });
}
export const confirmSheet = async (title, body, yes = 'Yes', cls = '') => (await sheet({ title, body, center: true, buttons: [{ id: 'no', label: 'Cancel', cls: 'alt' }, { id: 'yes', label: yes, cls }] })) === 'yes';
export async function askNumber(title, { min = 0, max = 1e9, def, note = '', money: isMoney, cash } = {}) {
  // formatted amount input (commas as you type, live short total, cash available, 25% / 50% / Max); never a raw prompt
  isMoney = isMoney ?? (max > 1000 || /\$|cash|money|invest|fund|withdraw|loan|deposit|add|pay|price|amount/i.test(title));
  const inp = h('input', { type: 'text', inputmode: 'decimal', class: 'numin', 'data-input': 'amount', style: { width: '100%', fontSize: '18px', padding: '8px', boxSizing: 'border-box' } });
  const num = () => Number(String(inp.value).replace(/[^\d.]/g, '')) || 0, fmt = (n) => (n ? Math.round(n).toLocaleString('en-US') : '');
  const cashNow = cash ?? (store.state && store.state.cash);
  const live = h('div', { class: 'hint', 'data-el': 'amount-live' }), clampN = (n) => Math.max(min, Math.min(max, n));
  const upd = () => { const n = num(); live.textContent = isMoney ? `${money(n, true)}${n > max ? ` · max ${money(max, true)}` : ''}` : (n > max ? `max ${max.toLocaleString('en-US')}` : ''); };
  inp.addEventListener('input', () => { const raw = String(inp.value).replace(/[^\d]/g, ''); inp.value = raw ? Number(raw).toLocaleString('en-US') : ''; upd(); });
  inp.value = fmt(def ?? min); upd();
  const quick = h('div', { class: 'btns', 'data-el': 'amount-quick' }, ...[['25%', 0.25], ['50%', 0.5], ['Max', 1]].map(([lb, f]) => h('button', { class: 'btn alt sm', 'data-q': lb, text: lb, onclick: () => { const top = isMoney && cashNow != null && cashNow > 0 ? Math.min(max, cashNow) : max; inp.value = fmt(clampN(Math.floor(top * f))); upd(); } })));
  const body = h('div', null, note ? h('p', { text: note }) : null, isMoney && cashNow != null ? h('div', { class: 'hint', 'data-el': 'amount-cash', text: `Cash available: ${money(cashNow, true)}` }) : null, inp, live, max < 1e12 ? quick : null);
  const r = await sheet({ title, body, center: true, buttons: [{ id: 'no', label: 'Cancel', cls: 'alt' }, { id: 'ok', label: 'OK', cls: 'go' }] });
  return r === 'ok' ? clampN(num()) : null;
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
let breakHook = null; export const setBreakHook = (h) => { breakHook = h; }; // forced real-time ad at a natural break (ui/js/ads_ui.js)
export function openPanel(title, render, { mini } = {}) {
  if (breakHook && breakHook.due()) { breakHook.run().finally(() => openPanel(title, render, { mini })); return; }
  store.stack.push({ title, render, mini }); drawPanel(true); document.dispatchEvent(new CustomEvent('panelchange'));
}
export async function rerenderTop() { if (store.stack.length) await drawTop(); }
export function closeAll() { store.root.querySelectorAll('.panel').forEach(p => p.remove()); store.stack = []; document.dispatchEvent(new CustomEvent('panelchange')); }
// X: leave every screen + sheet and land on the main life screen (mandatory popups stay).
export function closeHome() { closeAll(); store.root.querySelectorAll('.overlay:not([data-mandatory])').forEach((o) => { if (!o.querySelector('[data-mandatory]')) o.remove(); }); store.root.classList.remove('ls-death-fade'); document.dispatchEvent(new CustomEvent('panelchange')); }
export function back() {
  store.stack.pop(); document.dispatchEvent(new CustomEvent('panelchange')); const ps = store.root.querySelectorAll('.panel'); if (ps.length) ps[ps.length - 1].remove();
  const rest = store.root.querySelectorAll('.panel');
  if (store.stack.length && rest.length) { const t = rest[rest.length - 1]; t.style.display = ''; t.style.animation = 'none'; t.classList.add('top'); drawTop(); }
}
function drawPanel(animate) {
  const top = store.stack[store.stack.length - 1];
  const el = h('div', { class: 'panel', 'data-title': top.title, style: animate ? null : { animation: 'none' } },
    h('div', { class: 'pbar' },
      h('button', { class: 'pbtn', 'aria-label': 'Back', 'data-nav': 'back', onclick: back, text: '‹' }),
      h('h2', { text: top.title }),
      h('button', { class: 'pclose', 'aria-label': 'Close to home', 'data-nav': 'home', onclick: closeHome, text: '✕' })),
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
  try { const { yearlyChecklist } = await import('./screens/yearly.js'); await yearlyChecklist(frag, top.title); } catch (e) { /* optional */ }
  body.replaceChildren(frag); body.scrollTop = sc;
}

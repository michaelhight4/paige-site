import { adapter } from '../adapter.js';
import { store, h, row, section, kv, btn, empty, bar, money, sheet, act, avatarFor, avatarEl, Art, openPanel } from '../ui.js';

export async function profileScreen(body, { nav }) {
  const p = await adapter.getProfile();
  body.append(h('div', { class: 'card', 'data-el': 'profile-card', style: { textAlign: 'center' } },
    h('div', { style: { display: 'flex', justifyContent: 'center', margin: '4px 0' } }, (() => { const a = avatarEl(p.avatar, 84, 'head'); a.style.width = a.style.height = '96px'; adapter.getLookOf('me').then(async (lk) => { if (lk && lk.layers) { const { composeSprite } = await import('../character.js'); const d = h('div', { 'data-el': 'profile-sprite' }); d.innerHTML = await composeSprite(lk, { size: 112 }); a.replaceWith(d); } }).catch(() => {}); return a; })()),
    h('h3', { style: { fontSize: '22px' }, text: p.name }), p.founder ? h('div', { style: { margin: '2px 0 4px' } }, h('span', { class: 'founder-badge', 'data-el': 'profile-founder', text: '🏅 Founder' })) : null, h('div', { class: 'hint', text: `${p.stage} · ${p.gender === 'M' ? 'Male' : 'Female'} · ${p.city}, ${p.country}` }),
    h('div', { style: { textAlign: 'left', marginTop: '10px' } }, kv('Age', String(p.age)), kv('Born', String(p.born)), kv('Occupation', p.headline), kv('Education', p.edu), kv('Partner', p.partner || '—'), kv('Children', String(p.childrenCount)), kv('Assets owned', String(p.assetsCount)), kv('Driver license', p.license ? 'Yes' : 'No'), kv('Net worth', money(p.netWorth), p.netWorth < 0 ? 'neg' : 'pos'), kv('Careers mastered', String(p.careersCollected)), p.sport ? kv('Sport', p.sport) : null, kv('Lifetime gambling', money(p.lifetimeGambling), p.lifetimeGambling < 0 ? 'neg' : 'pos'))));
  body.append(h('div', { class: 'card' }, h('h3', { text: 'Stats' }), ...store.cfg.stats.map(s => bar(s.label, p.stats[s.key] ?? 0, { icon: s.icon, key: s.key }))));
  body.append(btn('🌳 Family Legacy', () => nav.open('Family Legacy', legacyScreen), 'block', { 'data-el': 'open-legacy' }), btn('🪦 Cemetery', () => nav.open('Cemetery', cemeteryScreen), 'alt block', { 'data-el': 'open-cemetery' }), btn('⭐ Premium', async () => { const { storeScreen } = await import('./store.js'); nav.open('Premium', storeScreen); }, 'alt block'));
  const earned = p.ribbons.filter(r => r.earned).length;
  body.append(section(`Ribbons (${earned}/${p.ribbons.length})`), h('div', { class: 'ribbons', 'data-el': 'ribbons' }, ...p.ribbons.map(r => h('div', { class: 'ribbon' + (r.earned ? ' on' : ''), title: r.condition, onclick: () => sheet({ title: r.ribbon, body: (r.earned ? '✅ Earned. ' : '🔒 Not yet earned. ') + r.condition, center: true }) }, (() => { const d = h('div', { class: 'rb' }); const A = Art(); if (A) d.innerHTML = A.renderRibbon({ id: r.id, title: r.ribbon, tier: 'gold', locked: !r.earned, icon: r.icon }, { size: 54 }); else d.textContent = '🎗️'; return d; })()))));
}
export async function legacyScreen(body, { nav }) {
  const l = await adapter.getLegacy();
  body.append(h('div', { class: 'card', 'data-el': 'legacy-card' }, h('h3', { text: `The ${l.surname} family` }), kv('Generations', String(l.generations.length)), kv('Combined wealth', money(l.totalWealth), 'pos'), l.creatorUsed ? h('div', { class: 'hint', 'data-el': 'creator-flag', text: '🛠️ Creator used in this family line. Not eligible for challenges or leaderboards.' }) : null));
  body.append(btn('🌳 Family tree', () => nav.open('Family tree', familyTreeScreen), 'alt block', { 'data-el': 'open-tree' }), btn('📜 Will & estate', async () => { const { willScreen } = await import('./activities.js'); nav.open('Will & Testament', willScreen); }, 'alt block'));
  if (l.estate) body.append(h('div', { class: 'card', 'data-el': 'estate' }, h('h3', { text: 'Estate' }), kv('Gross', money(l.estate.gross)), kv('Estate tax', '-' + money(l.estate.tax), 'neg'), kv('Net', money(l.estate.net), 'pos'), ...l.estate.heirs.map(x => kv(x.name, money(x.cash) + (x.assets ? ` + ${x.assets} assets` : '')))));
  body.append(section('Generations'));
  l.generations.forEach((m, i) => body.append(h('div', { class: 'gen' + (m.current ? ' cur' : ''), 'data-gen': m.gen }, h('div', { class: 'stem' }, h('i', { style: { opacity: i === 0 ? 0 : 1 } }), h('b'), h('i', { style: { opacity: i === l.generations.length - 1 ? 0 : 1 } })),
    h('div', { class: 'card' }, h('div', { style: { fontWeight: 800, color: 'var(--navy)' }, text: `Gen ${m.gen} · ${m.name}${m.current ? ' (you)' : ''}${m.creator ? ' 🛠️' : ''}` }), h('div', { class: 'hint', text: `${m.born}–${m.died ?? 'present'}${m.cause ? ' · ' + m.cause : ''}` }), kv('Occupation', m.job || '—'), kv('Net worth', money(m.netWorth || 0)), m.ribbon ? kv('Ribbon', m.ribbon) : null))));
  if (l.canContinue && l.livingHeirs.length) { body.append(section('Continue the legacy'), ...l.livingHeirs.map(c => row({ avatar: { pid: c.id, seed: c.id, gender: 'm', age: c.age }, title: 'Play as ' + c.name, sub: `${c.relation || ''} · age ${c.age}`, onClick: async () => { const r = await act(adapter.continueAsHeir(c.id)); if (r.ok) document.dispatchEvent(new CustomEvent('newlife')); } }))); }
}

export async function familyTreeScreen(body) {
  const A = Art(), t = await adapter.getFamilyTree();
  if (!A) return body.append(empty('Family tree needs the art kit.'));
  const d = h('div', { 'data-el': 'family-tree' }); d.innerHTML = A.renderFamilyTree(t, { avatar: 48 }); body.append(d);
}
export async function cemeteryScreen(body) {
  const A = Art(), c = await adapter.getCemetery();
  body.append(h('div', { class: 'card' }, kv('Lives lived', String(c.lives)), kv('Best net worth', money(c.bestNW)), kv('Longest life', c.longest + ' yrs')));
  if (!c.graves.length) return body.append(empty('No graves yet. Everyone is alive for now.'));
  if (!A) return body.append(...c.graves.map(g => row({ icon: '🪦', title: g.name, sub: `${g.born}-${g.died} · ${g.cause}`, chevron: false })));
  const el = h('div', { 'data-el': 'cemetery' }); body.append(el);
  A.mountCemetery(el, c.graves.map(g => ({ ...g, avatar: { seed: g.name, gender: 'm', age: g.age, dead: true } })), (i) => { const g = c.graves[i]; if (g) sheet({ title: g.name, center: true, body: h('div', null, kv('Age at death', String(g.age)), kv('Cause', g.cause), kv('Net worth', money(g.nw || 0)), g.ribbon ? kv('Ribbon', g.ribbon) : null) }); });
}

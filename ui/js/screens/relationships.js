import { adapter } from '../adapter.js';
import { store, h, row, section, kv, btn, empty, bar, money, sheet, act, avatarFor } from '../ui.js';

function personCard(p, { late } = {}) {
  const barsDef = [['relationship', 'Relationship'], ['health', 'Health'], ['happy', 'Happiness'], ['smarts', 'Smarts'], ['looks', 'Looks']];
  const bars = late ? [] : barsDef.filter(([k]) => p.bars[k] != null).map(([k, l]) => bar(l, p.bars[k], { thin: true, key: k }));
  return h('div', { class: 'card person' + (late ? ' late' : ''), 'data-person': p.id, onclick: () => personSheet(p) },
    avatarFor(p.gender, p.age, late && p.avatar ? { ...p.avatar, dead: true } : p.avatar),
    h('div', { style: { flex: 1, minWidth: 0 } }, h('div', { class: 'nm', style: { fontWeight: 800, color: 'var(--navy)' }, text: p.name }),
      h('div', { class: 'hint', text: late ? `${p.relation} · died at ${p.deathAge ?? p.age}${p.deathYear ? ' (' + p.deathYear + ')' : ''}${p.cause ? ' · ' + p.cause : ''}` : `${p.relation} · age ${p.age}` }), ...bars));
}
async function personSheet(p) {
  const acts = await adapter.getRelationshipActions(p.id);
  const i = await sheet({ title: p.name, body: `${p.relation}${p.alive ? ', age ' + p.age : ' (deceased)'}`, options: acts.map(a => ({ label: (a.premium ? (a.locked ? '🔒 ' : '⭐ ') : '') + a.label, sub: a.premium ? 'Premium' : '', disabled: a.locked })) });
  if (i != null) act(adapter.interact(p.id, acts[i].id));
}
async function peopleBody(body, ctx) {
  const r = await adapter.getRelationships();
  body.append(h('div', { class: 'btns', style: { padding: '10px 12px 0' } }, btn('💘 Find partner', () => act(adapter.findPartner()), 'alt sm', { 'data-el': 'find-partner' }), !r.partner ? btn('📺 Instant romance', () => act(adapter.startRomanceWithAd()), 'alt sm', { 'data-el': 'ad-romance' }) : null, btn(r.premium && r.premium.rabbit ? '⭐ Have children (Rabbit)' : '👶 Have a child', () => act(adapter.haveChild()), 'alt sm', { 'data-el': 'have-child' })));
  const sec = (title, list, o = {}) => { if (!list.length) return; body.append(section(title), ...list.map(p => personCard(p, o))); };
  sec('Family', r.family); if (r.partner) sec('Partner', [r.partner]); sec('Children', r.children); sec('Friends', r.friends); sec('Exes', r.exes); sec('Late relatives', r.late, { late: true });
  if (!r.family.length && !r.partner && !r.children.length) body.append(empty('Nobody here yet.'));
}

// Social first screen: tab bar (opens in place), current accounts with their breakdown, then "Platforms you don't have" in its own panel.
export const SOCIAL_TABS = [['people', '👪 People'], ['tree', '🌳 Family Tree'], ['legacy', '🪦 Legacy'], ['profiles', '🌐 Online Profiles'], ['social', '📱 Social Media'], ['live', '🎥 Live Streaming']];
let relTab = 'people';
const cnt = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(n));
export function accountCard(p, nav) {
  return h('button', { class: 'card acct', 'data-acct': p.id, style: { display: 'block', width: 'calc(100% - 24px)', textAlign: 'left' }, onclick: async () => { const { platformScreen } = await import('./social.js'); nav.open(p.name, (b, c) => platformScreen(b, c, p.id)); } },
    h('div', { class: 'nm', style: { fontWeight: 800 }, text: `${p.icon} ${p.name}${p.verified ? ' ✔ verified' : ''}` }),
    kv('Followers', cnt(p.followers)), kv('Engagement', p.engagement + '%'), kv('Posts this year', `${p.postsThisYear}/${p.postsMax}`), kv('Status', p.status || 'active'), kv('Sponsor deals', String(p.deals)));
}
export async function unopenedScreen(body, ctx) {
  const st = await adapter.getSocial(); const list = st.platforms.filter((p) => !p.open);
  if (st.locked) return body.append(empty('Social media starts at age 13.'));
  if (!list.length) return body.append(empty('You have an account on every platform.'));
  body.append(section('Platforms you don\'t have'), ...list.map((p) => h('div', { class: 'card', 'data-plat': p.id }, h('div', { class: 'nm', style: { fontWeight: 800 }, text: `${p.icon} ${p.name}` }), h('div', { class: 'hint', text: `${p.role} · audience: ${p.audience || ''}${p.likes ? ' · likes ' + p.likes : ''}` }), p.locked ? h('div', { class: 'hint neg', 'data-el': 'lock-reason', text: p.lockReason }) : null,
    btn('Open account', async () => { const r = await act(adapter.socialAction(p.id, 'open')); if (r && r.ok) { const { platformScreen } = await import('./social.js'); ctx.nav.back(); ctx.nav.open(p.name, (b, c) => platformScreen(b, c, p.id)); } }, 'go sm', { 'data-open': p.id, disabled: p.locked ? true : null }))));
}
export async function accountsBlock(body, ctx) {
  const st = await adapter.getSocial(); if (st.locked) { body.append(h('div', { class: 'hint', style: { padding: '6px 14px' }, text: 'Social media accounts open at age 13.' })); return; }
  const mine = st.platforms.filter((p) => p.open);
  body.append(section(`Your accounts (${mine.length})`));
  if (!mine.length) body.append(h('div', { class: 'hint', style: { padding: '4px 14px' }, 'data-el': 'no-accounts', text: 'No social media accounts yet.' }));
  body.append(...mine.map((p) => accountCard(p, ctx.nav)));
  const n = st.platforms.filter((p) => !p.open).length;
  if (n) body.append(row({ id: 'unopened', icon: '➕', title: 'Platforms you don\'t have', sub: `${n} platform${n > 1 ? 's' : ''} · open an account`, onClick: () => ctx.nav.open('Platforms you don\'t have', unopenedScreen) }));
  body.append(row({ id: 'use-fame', icon: '🌟', title: 'Use your fame', sub: 'Land TV roles, features, talk shows, endorsements…', onClick: async () => { const { fameScreen } = await import('./fame.js'); ctx.nav.open('Use your fame', fameScreen); } }));
}
export async function relationshipsScreen(body, ctx) {
  const bar = h('div', { class: 'tabs-inline soc-tabs', 'data-el': 'soc-tabs', style: { overflowX: 'auto', whiteSpace: 'nowrap', flexWrap: 'nowrap', display: 'flex' } }, ...SOCIAL_TABS.map(([id, label]) => h('button', { class: relTab === id ? 'on' : '', 'data-stab': id, style: { flex: '0 0 auto' }, text: label, onclick: async () => { relTab = id; await ctx.refresh(); } })));
  body.append(bar);
  if (relTab === 'people') { await accountsBlock(body, ctx); return peopleBody(body, ctx); }
  if (relTab === 'tree') { const { familyTreeScreen } = await import('./profile.js'); return familyTreeScreen(body, ctx); }
  if (relTab === 'legacy') { const { legacyScreen } = await import('./profile.js'); return legacyScreen(body, ctx); }
  if (relTab === 'social') { const { socialHub } = await import('./social.js'); return socialHub(body, ctx); }
  if (relTab === 'live') { const { talentCard } = await import('./bizops.js'); const c = await talentCard(['stream', 'infl'], ctx.refresh); if (c) body.append(c); }
  const O = await import('./onlinehub.js'); body.append(section(relTab === 'live' ? 'Live Streaming' : 'Online Profiles'), ...(relTab === 'live' ? await O.streamRows(ctx) : await O.profileRows(ctx)));
}

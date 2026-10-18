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
export async function relationshipsScreen(body, ctx) {
  const r = await adapter.getRelationships();
  body.append(h('div', { class: 'tabs-inline' }, h('button', { class: 'on', text: 'People' }), h('button', { text: 'Family tree', onclick: async () => { const { familyTreeScreen } = await import('./profile.js'); ctx.nav.open('Family tree', familyTreeScreen); } }), h('button', { text: 'Legacy', onclick: async () => { const { legacyScreen } = await import('./profile.js'); ctx.nav.open('Family Legacy', legacyScreen); } })));
  body.append(row({ id: 'social-media', icon: '📱', title: 'Social Media', sub: 'Platforms, posts, followers, sponsors, verification, calendar, team, gear', onClick: async () => { const { socialHub } = await import('./social.js'); ctx.nav.open('Social Media', socialHub); } }));
  body.append(h('div', { class: 'btns', style: { padding: '10px 12px 0' } }, btn('💘 Find partner', () => act(adapter.findPartner()), 'alt sm', { 'data-el': 'find-partner' }), !r.partner ? btn('📺 Instant romance', () => act(adapter.startRomanceWithAd()), 'alt sm', { 'data-el': 'ad-romance' }) : null, btn(r.premium && r.premium.rabbit ? '⭐ Have children (Rabbit)' : '👶 Have a child', () => act(adapter.haveChild()), 'alt sm', { 'data-el': 'have-child' })));
  const sec = (title, list, o = {}) => { if (!list.length) return; body.append(section(title), ...list.map(p => personCard(p, o))); };
  sec('Family', r.family); if (r.partner) sec('Partner', [r.partner]); sec('Children', r.children); sec('Friends', r.friends); sec('Exes', r.exes); sec('Late relatives', r.late, { late: true });
  if (!r.family.length && !r.partner && !r.children.length) body.append(empty('Nobody here yet.'));
}

import { adapter } from '../adapter.js';
import { store, h, row, section, kv, btn, empty, bar, money, sheet, act } from '../ui.js';

export async function sportsScreen(body) {
  const s = await adapter.getSportsCareer();
  const order = s.stages.map(x => x.id); const cur = s.current;
  const curIdx = cur ? Math.max(0, order.indexOf(cur.stage === 'pro' ? 'draft' : cur.stage)) : -1;
  body.append(h('div', { class: 'stagebar', 'data-el': 'sport-stages' }, ...s.stages.map((x, i) => h('div', { class: i === curIdx ? 'cur' : i < curIdx ? 'done' : '', 'data-stage': x.id }, h('div', { text: ['🏫', '🎓', '🏟️'][i] || '•' }), x.label))));
  if (!cur) {
    if (s.premiumActions) body.append(section('Premium'), ...s.premiumActions.map(a => row({ id: a.id, premium: a.premium, icon: '🏟️', title: (a.locked ? '🔒 ' : '⭐ ') + a.label, sub: a.locked ? 'Premium: Baller pass' : 'Baller pass: skip to the pros', disabled: a.locked, onClick: () => act(adapter.sportsAction(a.id)) })));
    body.append(section('Choose a school sport'));
    body.append(...s.eligibleSports.map(x => row({ id: x.id, icon: x.icon, title: x.label, sub: x.eligible ? 'Try out for the team' : x.reason, disabled: !x.eligible, onClick: async () => {
      const i = await sheet({ title: `${x.label}: pick a position`, options: x.positions.map(p => ({ label: p })) }); if (i == null) return;
      act(adapter.joinSport({ sportId: x.id, position: x.positions[i] }));
    } })));
    return;
  }
  body.append(h('div', { class: 'card', 'data-el': 'sport-card' }, h('div', { class: 'asset' }, h('div', { class: 'ic', text: cur.icon }), h('div', { class: 'main' }, h('div', { class: 'nm', text: cur.label + ' · ' + cur.position }), h('div', { class: 'sb', text: cur.team }))), cur.carried ? h('div', { class: 'hint', 'data-el': 'sport-carried', text: '🔁 ' + cur.carried }) : null,
    bar('Skill', cur.skill, { thin: true }), bar('Fitness', cur.fitness, { thin: true }),
    cur.draft ? h('div', null, kv('Draft', `Round ${cur.draft.round}, pick ${cur.draft.pick}`), kv('League', cur.proLeague), kv('Contract', money(cur.salary) + '/yr', 'pos')) : (cur.offers.length ? kv('College offers', cur.offers.join(', ')) : null)));
  body.append(section('Actions'), ...cur.actions.map(a => row({ id: a.id, premium: a.premium, disabled: a.locked, icon: a.id === 'retire' ? '🚪' : a.id === 'train' ? '💪' : a.id === 'declare_draft' ? '📋' : a.id === 'apply_college' ? '🎓' : '✍️', title: a.label, sub: a.sub, onClick: () => act(adapter.sportsAction(a.id)) })));
  body.append(section('Season history'));
  if (!cur.seasons.length) body.append(empty('No seasons played yet — age up to play your first season.'));
  else body.append(...[...cur.seasons].reverse().map(x => row({ icon: '📅', title: `${x.year} · ${x.label}`, sub: x.team, right: `${x.wins}W–${x.losses}L`, chevron: false })));
}

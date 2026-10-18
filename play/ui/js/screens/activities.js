import { adapter } from '../adapter.js';
import { store, h, avatarEl, row, section, kv, btn, empty, money, sheet, confirmSheet, act, openPanel, askNumber } from '../ui.js';

let catSel = null;
export function setActivityCategory(id) { catSel = id; }
const GO = { shopping: 'Shopping', casino: 'Casino', zoo: 'Zoo' };
export async function activitiesScreen(body, { nav, refresh }) {
  const a = await adapter.getActivities();
  const pinned = [];
  const tb = (t, f, on) => h('button', { class: on ? 'on' : '', onclick: f, text: t });
  body.append(h('div', { class: 'tabs-inline', 'data-el': 'activity-tabs' }, tb('All', () => { catSel = null; refresh(); }, !catSel), ...a.menus.filter(m => m.items.some(i => !i.special)).map(m => tb(m.label, () => { catSel = m.id; refresh(); }, catSel === m.id))));
  body.append(h('div', { class: 'mini', style: { background: '#fff4d6' } }, h('span', { text: 'Locked items unlock at the age shown.' })));
  for (const m of a.menus) {
    const items = m.items.filter(i => { if (i.special) { pinned.push(i); return false; } return !catSel || m.id === catSel; });
    if (!items.length) continue;
    body.append(section(`${m.icon} ${m.label}`));
    body.append(...items.map(i => row({ id: i.id, premium: i.premium, title: (i.premium ? (i.locked ? '🔒 ' : '⭐ ') : '') + i.label, badge: i.premium ? 'Premium' : i.minAge > 0 ? i.minAge + '+' : 'Any age', badgeCls: i.locked ? 'lock' : 'ok', sub: i.locked ? i.reason : i.go ? 'Opens ' + (GO[i.go] || i.go) : null, disabled: i.locked && !i.premium, chevron: false, onClick: () => runActivity(i, nav) })));
  }
  if (pinned.length) {
    body.append(section('Life'));
    body.append(...pinned.map(i => row({ id: i.id, icon: i.special === 'will' ? '📜' : '🏳️', title: i.label, sub: i.locked ? i.reason : i.special === 'will' ? 'Decide who inherits' : 'End your life', badge: i.minAge > 0 ? i.minAge + '+' : null, badgeCls: i.locked ? 'lock' : 'ok', disabled: i.locked, onClick: async () => {
      if (i.special === 'will') nav.open('Will & Testament', willScreen);
      else if (await confirmSheet('Surrender?', 'Surrendering ends your life immediately. This cannot be undone.', 'Surrender', 'danger')) act(adapter.surrender());
    } })));
  }
}
async function runActivity(i, nav) {
  if (i.go) { const A = await import('./assets.js'), O = await import('./occupation.js'); const m = { shopping: ['Shopping', A.shoppingScreen], casino: ['Casino', A.casinoScreen], zoo: ['Zoo & pets', A.zooScreen], parttime: ['Part-Time', O.partTimeScreen], freelance: ['Freelance Gigs', O.freelanceScreen] }[i.go]; if (m) return nav.open(m[0], m[1]); }
  if (i.locked && i.premium) { const { openPanel: op } = await import('../ui.js'); const { storeScreen } = await import('./store.js'); if (await confirmSheet(i.label, 'This is a Premium option (' + i.premium + ' pass). Open the store?', 'Open store', 'go')) op('Premium', storeScreen); return; }
  if (i.hasChoices) { const c = await adapter.getActivityChoices(i.id); if (c && c.choices && c.choices.length) { const k = await sheet({ title: c.title, options: c.choices.map(x => ({ label: x.label, sub: [x.cost ? 'Costs ' + money(x.cost) : '', x.note || ''].filter(Boolean).join(' · '), disabled: x.affordable === false })) }); if (k == null) return; return act(adapter.doActivity(i.id, k)); } }
  return act(adapter.doActivity(i.id));
}
export async function willScreen(body) {
  const w = await adapter.getWill();
  body.append(h('div', { class: 'card', 'data-el': 'will' }, h('h3', { text: 'Estate' }), h('div', { class: 'big', text: money(w.estateValue) }), h('div', { class: 'hint', text: 'Allocate percentages of your estate to living relatives.' })));
  if (!w.beneficiaries.length) return body.append(empty('You have no living relatives to inherit.'));
  const inputs = w.beneficiaries.map(b => ({ b, inp: h('input', { type: 'number', min: 0, max: 100, value: b.percent, 'data-person': b.personId, style: { width: '72px', padding: '8px', border: '2px solid #cddaf0', borderRadius: '8px', fontSize: '16px', textAlign: 'right' } }) }));
  body.append(section('Beneficiaries'), ...inputs.map(({ b, inp }) => h('div', { class: 'row' }, avatarEl({ seed: b.personId, gender: 'm', age: 30 }, 36), h('span', { class: 'tx' }, h('span', { class: 't', text: b.name }), h('span', { class: 's', text: b.relation })), inp, h('span', { text: '%' }))));
  const ch = h('select', { 'data-el': 'charity', style: { padding: '8px', fontSize: '15px' } }, h('option', { value: '', text: 'No charity' }), ...(w.charities || []).map(c => h('option', { value: c.id, text: c.name, selected: w.charityId === c.id ? true : null })));
  const cp = h('input', { type: 'number', min: 0, max: 100, value: w.charityPct || 0, 'data-el': 'charity-pct', style: { width: '72px', padding: '8px', border: '2px solid #cddaf0', borderRadius: '8px', fontSize: '16px', textAlign: 'right' } });
  body.append(section('Charity'), h('div', { class: 'row' }, h('span', { class: 'tx' }, ch), cp, h('span', { text: '%' })), h('div', { class: 'hint', style: { padding: '6px 14px' }, text: `Estate tax ${Math.round((w.taxRate || 0) * 100)}%. Anything not allocated goes to the state.` }));
  body.append(btn('Save will', () => act(adapter.saveWill(inputs.map(({ b, inp }) => ({ personId: b.personId, percent: Number(inp.value) || 0 })), ch.value ? { id: ch.value, pct: Number(cp.value) || 0 } : null)), 'go block', { 'data-el': 'save-will' }));
}

// Politics: offices & odds, campaign (platform, budget, donors, trick questions), in office, judge track, war, royalty.
import { adapter } from '../adapter.js';
import { h, row, section, kv, btn, empty, bar, money, sheet, confirmSheet, act } from '../ui.js';

const pct = (n) => (n == null ? '-' : n + '%');

export async function politicsScreen(body, { nav, refresh }) {
  const st = await adapter.getPolitics(), ry = await adapter.getRoyalty();
  if (st.age < 18) return body.append(empty('Politics starts at age 18.'));
  const go = async (a, a1, a2) => { const r = await act(adapter.politicsAction(a, a1, a2)); await refresh(); return r; };
  body.append(h('div', { class: 'card', 'data-el': 'pol-panel' }, h('h3', { text: '🏛️ Political standing' }), kv('Elected wins', `${st.wins} (${st.losses} losses)`), bar('Name recognition', st.fame, { thin: true, key: 'fame' }), bar('Reputation', st.reputation, { thin: true, key: 'rep' }), kv('Family name', st.familyFame + '/100'), kv('Strength', String(st.strength)),
    st.heat ? bar('Investigation heat', Math.min(100, st.heat), { thin: true, key: 'heat' }) : null));
  if (st.office) {
    const o = st.office;
    body.append(h('div', { class: 'card', 'data-el': 'pol-office' }, h('h3', { text: '🏛️ ' + o.title }), kv('Salary', money(o.pay || (o.def && o.def.pay) || 0) + '/yr', 'pos'), kv('Term ends in', o.yearsLeft + ' yrs'), bar('Approval', o.approval, { thin: true, key: 'approval' }),
      h('div', { class: 'btns', style: { flexWrap: 'wrap' } }, btn('🗳️ Popular bill', () => go('govern', 'popular'), 'alt sm', { 'data-act': 'popular', disabled: st.done.govern ? true : null }), btn('🎤 Town hall', () => go('govern', 'townhall'), 'alt sm', { 'data-act': 'townhall', disabled: st.done.govern ? true : null }), btn('🤫 Backroom deal', () => go('govern', 'deal'), 'danger sm', { 'data-act': 'deal', disabled: st.done.govern ? true : null }), btn('Resign', async () => { if (await confirmSheet('Resign?', 'You leave office.', 'Resign', 'danger')) await go('resign'); }, 'alt sm'))));
  }
  if (st.case) body.append(h('div', { class: 'card', 'data-el': 'pol-case' }, h('h3', { text: '⚖️ Case before the court' }), h('div', { class: 'hint', text: st.case.text }), h('div', { class: 'btns', style: { flexWrap: 'wrap' } }, ...st.case.choices.map((c, i) => btn(c.label, () => go('rule', i), 'alt sm', { 'data-act': 'rule' + i, disabled: st.done.rule ? true : null })))));
  if (st.favors.length) body.append(section('Favors you owe'), ...st.favors.map((f) => row({ id: 'favor:' + f.i, icon: '🤝', title: f.donor, sub: `Wants: ${f.what} · due in ${f.due} yrs`, chevron: false })));
  if (st.canDeclareWar || st.war) body.append(h('div', { class: 'card', 'data-el': 'pol-war' }, h('h3', { text: '⚔️ War' }), st.war ? [kv('Enemy', st.war.foe), kv('Overall', (st.war.progress >= 0 ? 'Advancing ' : 'Retreating ') + Math.abs(st.war.progress)), warMapView(st.war.map, go), kv('Military budget', ['', 'Low', 'Medium', 'High'][st.war.level || 2] + ` (${st.war.map.pool} force points)`), h('div', { class: 'btns', style: { flexWrap: 'wrap' } }, ...[1, 2, 3].map((l) => btn(['', 'Low', 'Medium', 'High'][l] + ' budget', () => go('warBudget', l), (st.war.level || 2) === l ? 'go sm' : 'alt sm', { 'data-act': 'wb' + l })), btn('Make peace', () => go('peace'), 'go sm', { 'data-act': 'peace' }))] : [h('div', { class: 'hint', text: 'As head of state you can declare war. Three fronts, forces to assign, a yearly update; win by holding the average above +65, lose it below -65.' }), btn('Declare war', async () => { if (await confirmSheet('Declare war?', 'It is costly and the public may turn on you.', 'Declare', 'danger')) await go('war'); }, 'danger sm', { 'data-act': 'war' })]));
  if (st.campaign) { body.append(campaignCard(st.campaign, go)); } else {
    body.append(section('Run for office'), ...st.offices.map((o) => row({ id: 'off:' + o.id, icon: o.kind === 'appointed' ? '⚖️' : '🏛️', title: o.title, sub: o.held ? 'You hold this office' : o.eligible ? `${o.scope} · ${o.seats} seat${o.seats > 1 ? 's' : ''} · ${o.term}-yr term · ${money(o.pay)}/yr${o.filing ? ' · filing ' + money(o.filing) : ''}` : o.why, right: o.eligible ? pct(o.odds) : '', disabled: !o.eligible || o.held, onClick: async () => { if (o.kind === 'appointed') { if (await confirmSheet('Apply: ' + o.title, 'Judges are appointed, not elected. Odds depend on your record and name.', 'Apply', 'go')) { await go('apply', o.id); } } else await go('start', o.id); } })));
  }
  if (st.dirt.length) body.append(section('What the press could dig up'), ...st.dirt.map((d) => row({ icon: '📰', title: d.text, chevron: false })));
  if (ry.available) body.append(section('Royalty'), row({ id: 'royal', icon: '👑', title: ry.monarchy.name || 'Royal family', sub: ry.royal ? ry.royal.titleNow : 'Born or marry into the throne', onClick: () => nav.open('Royal family', royalScreen) }));
  history(body, st);
}
function history(body, st) { if (st.history.length) body.append(section('History'), ...st.history.slice(-8).reverse().map((x) => row({ icon: '📜', title: x.title, sub: `Age ${x.from}-${x.to}`, chevron: false }))); }

function campaignCard(c, go) {
  const parts = Object.entries(c.parts).map(([k, v]) => kv(k[0].toUpperCase() + k.slice(1), String(v)));
  return h('div', { class: 'card', 'data-el': 'pol-campaign' }, h('h3', { text: '📣 Campaign: ' + c.title }), bar('Campaign score', c.score, { key: 'score' }), kv('Estimated win chance', pct(c.odds)), kv('Budget', money(c.budget)), ...parts,
    h('h3', { text: 'Platform' }), h('div', { class: 'btns', style: { flexWrap: 'wrap' } }, ...c.platforms.map((p) => btn(p.icon + ' ' + p.name, () => go('platform', p.id), p.id === c.platform ? 'go sm' : 'alt sm', { 'data-act': 'plat-' + p.id }))),
    h('div', { class: 'btns', style: { flexWrap: 'wrap' } }, btn('💵 Spend $10,000', () => go('budget', 10000), 'alt sm', { 'data-act': 'budget' }), btn(c.spun ? 'Spin team hired' : '🎭 Spin team', () => go('spin'), 'alt sm', { 'data-act': 'spin', disabled: c.spun ? true : null }), btn('💰 Payoff', () => go('shady', 'payoff'), 'danger sm', { 'data-act': 'payoff', disabled: c.shady && c.shady.payoff ? true : null }), btn('🗳️ Buy votes', () => go('shady', 'votes'), 'danger sm', { 'data-act': 'votes', disabled: c.shady && c.shady.votes ? true : null })),
    c.offers.length ? [h('h3', { text: 'Donors (they will want favors later)' }), ...c.offers.map((o, i) => row({ id: 'donor:' + i, icon: '🤝', title: o.name, sub: `${o.type} · ${money(o.amount)} · wants ${o.favor.replace(/_/g, ' ')}`, onClick: () => go('donor', i) }))] : null,
    c.question ? [h('h3', { text: `Press question ${c.answered + 1}/4` }), h('div', { class: 'hint', text: c.question.text }), ...c.question.choices.map((q, i) => btn(`${q.label} (+${q.points})`, () => go('answer', i), 'alt block', { 'data-act': 'ans' + i }))] : h('div', { class: 'hint', text: 'All 4 questions answered.' }),
    h('div', { class: 'btns' }, btn('🗳️ Election day', () => go('launch').then((r) => showResult(r)), 'go', { 'data-act': 'launch', disabled: c.ready ? null : true }), btn('Withdraw', () => go('withdraw'), 'alt sm', { 'data-act': 'withdraw' })));
}
async function showResult(r) {
  const x = r && r.result; if (!x) return;
  await sheet({ title: x.won ? '🏆 You won!' : '🗳️ You lost', center: true, body: h('div', { 'data-el': 'pol-result' }, kv('Your odds', pct(x.odds)), kv('Vote share', x.share != null ? x.share + '%' : '-'), ...(x.press || []).map((t) => h('div', { class: 'hint', text: '📰 ' + t })), x.busted ? h('div', { class: 'hint neg', text: 'Your shady dealings leaked.' }) : null, x.prosecuted ? h('div', { class: 'hint neg', text: 'You were prosecuted.' }) : null), options: [{ label: 'OK' }] });
}

export async function royalScreen(body, { refresh }) {
  const ry = await adapter.getRoyalty(); if (!ry.available) return body.append(empty('No monarchy here.'));
  const r = ry.royal; if (!r) return body.append(empty('You are not part of the royal family. Rarely, a royal suitor shows up.'));
  body.append(h('div', { class: 'card', 'data-el': 'royal-card' }, h('h3', { text: '👑 ' + r.titleNow }), kv('Popularity', Math.round(r.popularity) + '/100'), kv('Allowance', money(r.allowance) + '/yr', 'pos'), kv('Line of succession', r.rank ? '#' + r.rank : '-')),
    section('Royal duties (3 a year)'), ...ry.duties.map((d) => row({ id: 'duty:' + d.id, icon: d.icon, title: d.name, sub: `Popularity +${d.pop}`, onClick: async () => { await act(adapter.politicsAction('duty', d.id)); await refresh(); } })));
}

// Simple war map: three fronts as tug-of-war strips (left = lost ground, right = ours), with force points to assign to each.
function warMapView(map, go) {
  return h('div', { class: 'warmap', 'data-el': 'war-map', style: { margin: '8px 0' } }, ...map.fronts.map((f) => {
    const pos = Math.round((f.ctrl + 100) / 2), col = f.ctrl >= 0 ? '#4cc38a' : '#ff6b6b';
    return h('div', { class: 'front', 'data-front': f.id, style: { margin: '6px 0' } },
      h('div', { class: 'row sp' }, h('span', { text: `${f.terrain === 'mountains' ? '⛰️' : f.terrain === 'coast' ? '🌊' : '🌾'} ${f.name}` }), h('span', { class: 'mut', text: `${f.ctrl >= 0 ? '+' : ''}${f.ctrl}` })),
      h('div', { style: { position: 'relative', height: '14px', background: '#3a2a2a', borderRadius: '7px', overflow: 'hidden' } }, h('div', { style: { position: 'absolute', left: 0, top: 0, bottom: 0, width: pos + '%', background: col, opacity: 0.85 } }), h('div', { style: { position: 'absolute', left: '50%', top: 0, bottom: 0, width: '2px', background: '#fff8' } }), h('div', { style: { position: 'absolute', left: `calc(${pos}% - 3px)`, top: 0, bottom: 0, width: '6px', background: '#fff' } })),
      h('div', { class: 'row sp', style: { marginTop: '4px' } }, h('span', { class: 'mut', text: `Our forces ${f.force} · enemy ${f.enemy}` }), h('span', null, btn('−', () => go('warAssign', f.id, -1), 'alt sm', { 'data-act': 'fm:' + f.id }), ' ', btn('+', () => go('warAssign', f.id, 1), 'alt sm', { 'data-act': 'fp:' + f.id }))));
  }), h('div', { class: 'hint', text: `Forces assigned ${map.used}/${map.pool}. Mountains favour the defender.` }));
}

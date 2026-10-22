import { adapter } from '../adapter.js';
import { autoPageCard } from './autopage.js';
import { store, h, row, section, kv, btn, empty, bar, money, sheet, act } from '../ui.js';

let mtTab = 'team';
const AW_ICON = { mvp: '🏅', score: '🎯', defense: '🛡️', roty: '🌟', allstar: '⭐', champion: '🏆', hof: '🏛️' };
const rankTxt = (n) => (n ? '#' + n : '');
export const secBar = (sec) => sec ? h('div', { 'data-el': 'roster-sec' }, bar(`Roster security (cut risk ${Math.round(sec.risk * 100)}%/season)`, sec.security, { thin: true }), h('div', { class: 'hint', text: sec.factors.map((f) => `${f.label}: ${f.value >= 0 ? '+' : ''}${f.value}`).join(' · ') })) : null;
// open My Team straight on a tab (used by the Work page job card)
export async function myTeamInline(body, ctx) { const v = await adapter.getMyTeam(); if (v.onTeam) return myTeamScreen(body, ctx, v); }
export async function openMyTeam(nav, tab = 'team') { mtTab = tab; nav.open('Sports Career', sportsScreen); }
async function myTeamScreen(body, ctx, v) {
  const refresh = (ctx && ctx.refresh) || (() => {}); const go = async (p) => { await act(p); refresh(); };
  await autoPageCard(body, 'myteam');
  const L = v.last, tc = v.titleChance;
  body.append(h('div', { class: 'card', 'data-el': 'mt-head' }, h('div', { class: 'asset' }, h('div', { class: 'ic', text: v.icon }), h('div', { class: 'main' }, h('div', { class: 'nm', 'data-el': 'mt-team', text: v.team }), h('div', { class: 'sb', 'data-el': 'mt-sub', text: `${v.sport} · ${v.levelLabel}${v.league ? ' · ' + v.league : ''}` }), h('div', { class: 'sb', text: v.position + ' · overall ' + v.overall }))),
    L ? h('div', { class: 'hint', 'data-el': 'mt-rec', text: `Last season: ${L.w}-${L.l}, ${L.team === v.team ? '' : L.team + ', '}finished ${L.rank}/${L.teams}${L.champion ? ' 🏆' : ''}` }) : h('div', { class: 'hint', text: 'No season played yet. Age up to play one.' })));
  const tabs = [['team', '🏟️', 'My Team'], ['skills', '💪', 'Skills'], ['season', '📈', 'Season'], ['mates', '🤝', 'Teammates'], ['offers', '✍️', 'Offers' + (v.offers.length ? ` (${v.offers.length})` : '')], ['awards', '🏆', 'Awards']];
  body.append(h('div', { class: 'mt-tabbar', 'data-el': 'mt-tabs', style: { position: 'sticky', top: '0', zIndex: 5, background: 'var(--bg)', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px', padding: '6px 4px', borderBottom: '1px solid var(--line)' } },
    ...tabs.map(([id, ic, lb]) => h('button', { class: 'btn ' + (id === mtTab ? 'go sm' : 'alt sm'), 'data-mt': id, style: { padding: '6px 1px', fontSize: '10.5px', lineHeight: '1.2', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }, onclick: () => { mtTab = id; refresh(); } }, h('span', { style: { fontSize: '16px' }, text: ic }), h('span', { text: lb })))));
  const tab = h('div', { 'data-el': 'mt-' + mtTab }); body.append(tab); const add = (...x) => tab.append(...x);
  if (mtTab === 'team') {
    add(h('div', { class: 'card', 'data-el': 'mt-standing' }, h('h3', { text: '📊 League standing' }), secBar(v.security),
      kv('Team', v.team), kv('League', v.league || 'Draft class'), kv('Last season record', L ? `${L.w}-${L.l} (rank ${L.rank} of ${L.teams})` : '—'), kv('Your league rank', L ? `${rankTxt(L.rankOverall)} of ${L.fieldSize} players` : '—'),
      tc ? kv('League title chance', `${tc.champion}% (playoffs ${tc.playoffs}%)`, tc.champion >= 20 ? 'pos' : '') : null, v.contract ? kv('Contract', `${money(v.contract.salary)}/yr until age ${v.contract.until}`) : v.salary ? kv('Salary', money(v.salary) + '/yr') : null),
      L && L.standings ? h('div', { class: 'card', 'data-el': 'mt-table' }, h('h3', { text: 'Top of the table' }), ...L.standings.map((x, i) => h('div', { class: 'kv' }, h('span', { text: `${i + 1}. ${x.name}${x.mine ? ' (you)' : ''}` }), h('b', { text: `${x.w}-${x.l}` })))) : null);
    add(h('div', { class: 'card', 'data-el': 'mt-style' }, h('h3', { text: '🎽 Play style this season' }), h('div', { class: 'hint', text: v.styleChosen ? 'Chosen for this season. You can still change it before you age up.' : 'Choose how you play. Every style has a trade-off.' }),
      ...v.styles.map((x) => h('button', { class: 'btn ' + (x.id === v.style ? 'go' : 'alt') + ' sm', 'data-style': x.id, style: { display: 'block', width: '100%', textAlign: 'left', margin: '4px 0' }, onclick: () => go(adapter.mtStyle(x.id)) }, h('b', { text: (x.id === v.style ? '✓ ' : '') + x.name }), h('div', { style: { fontSize: '12px', fontWeight: 500 }, text: x.note })))));
    if (v.limbo) add(h('div', { class: 'hint', text: 'You are a draft prospect. Open Offers to accept or decline a draft offer.' }));
    return;
  }
  if (mtTab === 'mates') {
    const tm = await adapter.getTeammates(); if (!tm) { add(empty('No teammates yet.')); return; }
    add(h('div', { class: 'hint', 'data-el': 'mt-mates-cap', style: { padding: '6px 12px' }, text: `Teammate interactions: ${tm.used}/${tm.cap} this year (one per teammate a year)` }));
    for (const p of tm.list) add(h('button', { class: 'card', 'data-mate': p.id, style: { display: 'block', width: 'calc(100% - 24px)', textAlign: 'left', opacity: p.doneThisYear ? 0.6 : 1 }, onclick: async () => { const i = await sheet({ title: p.name, body: `${p.pos} · age ${p.age} · ${p.persona}`, options: tm.acts.map((a) => ({ label: a.label, disabled: p.doneThisYear || tm.used >= tm.cap })) }); if (i != null) go(adapter.mtMate(p.id, tm.acts[i].id)); } },
      h('div', { class: 'nm', style: { fontWeight: 800 }, text: `${p.name}${p.doneThisYear ? ' · done this year' : ''}` }), h('div', { class: 'hint', text: `${p.pos} · rating ${p.rating} · ${p.persona}` }), bar('Relationship', p.rel, { thin: true }), bar('Professionalism', p.prof, { thin: true })));
    return;
  }
  if (mtTab === 'skills') {
    add(h('div', { class: 'card', 'data-el': 'mt-skills' }, h('h3', { text: `💪 ${v.sport} skills` }), h('div', { class: 'hint', 'data-el': 'mt-decline', text: `Age decline risk: ${v.declineRisk}% per skill this year (halved for skills you train; untrained skills slip every year)` }), h('div', { class: 'hint', 'data-el': 'mt-cap', text: `Individual training: ${v.train.used}/${v.train.cap} this year (resets every year, same at school, college and pro). Skills stay with you as you move up.${v.train.cost ? ' Cost ' + money(v.train.cost) + ' per skill.' : ' Free, like other sports training.'}` }),
      ...v.skills.map((x) => h('div', { 'data-skill': x.name }, bar(x.name + (x.offense ? ' · offense' : x.defense ? ' · defense' : ''), x.value, { thin: true }), h('button', { class: 'btn alt sm', 'data-train': x.name, disabled: x.trained || v.train.used >= v.train.cap, style: { margin: '2px 0 8px' }, onclick: () => go(adapter.mtTrain(x.name)) }, x.trained ? '✓ Trained this year' : 'Train ' + x.name))),
      h('button', { class: 'btn go', 'data-act': 'mt-lowest', disabled: v.train.used >= v.train.cap, onclick: () => go(adapter.mtTrainLowest()) }, `Train my lowest 3 skills (${v.train.lowest.join(', ') || 'none left'})`)));
    return;
  }
  if (mtTab === 'season') {
    if (!L) { add(empty('No season played yet — age up to play your first season.')); return; }
    add(h('div', { class: 'card', 'data-el': 'mt-last' }, h('h3', { text: `📈 ${L.year} season · ${L.team}` }), kv('Record', `${L.w}-${L.l} · ${L.rank}/${L.teams}${L.champion ? ' · champions 🏆' : L.playoffs ? ' · made the playoffs' : ''}`), kv('Play style', (v.styles.find((x) => x.id === L.style) || {}).name || L.style), L.injured ? h('div', { class: 'hint neg', text: 'Injured part of the season: stats reduced.' }) : null,
      ...v.lastLine.map((x) => kv(x.label, `${x.value}${x.rank ? '  (' + rankTxt(x.rank) + ' in league)' : ''}`))));
    add(h('div', { class: 'card', 'data-el': 'mt-career' }, h('h3', { text: '📚 Career stats' }), v.career ? kv('Seasons · record', `${v.career.seasons} · ${v.career.w}-${v.career.l}`) : null, v.career ? kv('Titles', String(v.career.titles)) : null, ...v.careerLine.map((x) => kv(x.label, x.value))));
    add(h('div', { class: 'card', 'data-el': 'mt-leaders' }, h('h3', { text: '🏅 League leaders (overall)' }), ...(v.field || []).map((x) => h('div', { class: 'kv' }, h('span', { text: `${x.rank}. ${x.name}${x.me ? ' (you)' : ''}` }), h('b', { text: x.team })))));
    add(h('div', { class: 'card', 'data-el': 'mt-hist' }, h('h3', { text: 'Season history' }), ...v.history.map((x) => h('div', { class: 'kv' }, h('span', { text: `${x.year} · ${x.team}` }), h('b', { text: `${x.w}-${x.l}${x.champion ? ' 🏆' : ''}` })))));
    return;
  }
  if (mtTab === 'offers') {
    add(await brandCard(go));
    if (!v.offers.length) add(empty('No offers right now. Good seasons bring contract offers, trade requests and, after school or college, draft offers.'));
    for (const o of v.offers) {
      const title = o.kind === 'draft' ? `📋 Draft: ${o.team}` : o.kind === 'trade' ? `🔁 Trade request: ${o.team}` : o.kind === 'extension' ? `📝 Extension: ${o.team}` : `✍️ Contract: ${o.team}`;
      add(h('div', { class: 'card', 'data-el': 'mt-offer', 'data-offer': o.id }, h('h3', { text: title }), kv('Salary', money(o.salary) + '/yr'), kv('Length', `${o.years} year${o.years > 1 ? 's' : ''}`), o.kind === 'draft' ? kv('Draft slot', `Round ${o.round}, pick ${o.pick}`) : kv('Role', o.role), o.note ? h('div', { class: 'hint', text: o.note }) : null,
        h('div', { class: 'btns' }, btn('Accept', () => go(adapter.mtOffer(o.id, 'accept')), 'go sm', { 'data-offer-act': 'accept' }), btn('Negotiate', () => go(adapter.mtOffer(o.id, 'negotiate')), 'alt sm', { 'data-offer-act': 'negotiate', disabled: !!o.negotiated }), btn('Decline', () => go(adapter.mtOffer(o.id, 'decline')), 'alt sm', { 'data-offer-act': 'decline' }))));
    }
    return;
  }
  { const tc = await adapter.getTrophyCase(); add(h('div', { class: 'card', 'data-el': 'trophy-case' }, h('h3', { text: '🏆 Trophy case' + (tc.hof ? ' · 🏛️ Hall of Fame' : '') }),
    ...(tc.groups.length ? tc.groups.map((g) => h('div', { class: 'kv' }, h('span', { text: `${g.icon.repeat(Math.min(g.count, 5))} ${g.label}${g.count > 1 ? ' ×' + g.count : ''}` }), h('b', { text: g.years.join(', ') }))) : [h('div', { class: 'hint', text: 'Win a league title to earn a championship ring (basketball, football, baseball, hockey) or a trophy and winner\'s medal (other sports).' })]))); }
  add(h('div', { class: 'card', 'data-el': 'mt-awards' }, h('h3', { text: '🏆 Titles and awards' }), h('div', { class: 'hint', text: `Awards compare you with the ${v.field.length ? 'rivals in your league' : 'league'}. Career points ${v.careerPts}${v.hof ? ' · Hall of Fame' : ' (30 + a long career earns the Hall of Fame)'}.` }),
    ...(v.awards.length ? v.awards.map((a) => h('div', { class: 'kv' }, h('span', { text: `${AW_ICON[a.id] || '🏅'} ${a.label}` }), h('b', { text: `${a.year} · ${a.level}` }))) : [h('div', { class: 'hint', text: 'None yet. MVP, scoring and defensive titles, Rookie of the Year, All-Star, championships and the Hall of Fame come from beating the league.' })])));
}
export async function sportsScreen(body, ctx) {
  const v = await adapter.getMyTeam();
  if (v.onTeam) return myTeamScreen(body, ctx, v);
  const s = await adapter.getSportsCareer();
  const order = s.stages.map(x => x.id); const cur = s.current;
  const curIdx = cur ? Math.max(0, order.indexOf(cur.stage === 'pro' ? 'draft' : cur.stage)) : -1;
  body.append(h('div', { class: 'stagebar', 'data-el': 'sport-stages' }, ...s.stages.map((x, i) => h('div', { class: i === curIdx ? 'cur' : i < curIdx ? 'done' : '', 'data-stage': x.id }, h('div', { text: ['🏫', '🎓', '🏟️'][i] || '•' }), x.label))));
  if (!cur) {
    if (s.premiumActions) body.append(section('Premium'), ...s.premiumActions.map(a => row({ id: a.id, premium: a.premium, icon: '🏟️', title: (a.locked ? '🔒 ' : '⭐ ') + a.label, sub: a.locked ? 'Premium: Baller pass' : 'Baller pass: skip to the pros', disabled: a.locked, onClick: () => act(adapter.sportsAction(a.id)) })));
    if (!s.eligibleSports.some((x) => x.eligible)) { body.append(empty('You are not on a team. School sports open while you are a student; pro careers start from the draft or the Pro Athlete job.')); return; }
    body.append(section('Choose a school sport'));
    body.append(...(s.eligibleSports.some((x) => x.eligible) ? s.eligibleSports.filter((x) => x.eligible) : []).map(x => row({ id: x.id, icon: x.icon, title: x.label, sub: x.eligible ? 'Try out for the team' : x.reason, disabled: !x.eligible, onClick: async () => {
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

async function brandCard(go) {
  const v = await adapter.getBrandDeals(), card = h('div', { class: 'card', 'data-el': 'brand-deals' }, h('h3', { text: `🤝 Brand deals (${v.deals.length}/${v.max})` + (v.yearly ? ` · ${money(v.yearly)}/yr` : '') }));
  if (!v.eligible && !v.deals.length) { card.append(h('div', { class: 'hint', text: 'Shoe, drink, apparel and video game brands sign pro and minor-league athletes. Fame and results raise the pay.' })); return card; }
  for (const d of v.deals) card.append(h('div', { class: 'kv', 'data-deal': d.id }, h('span', { text: `${d.icon} ${d.brand} · ${money(d.pay)}/yr · ${d.left} yr left` }), h('button', { class: 'btn sm alt', 'data-bdrop': d.id, text: 'Drop', onclick: () => go(adapter.brandDrop(d.id)) })));
  if (v.offers.length) card.append(h('div', { class: 'hint', text: 'Offers this year (one brand per category):' }));
  for (const o of v.offers) { const same = v.deals.find((d) => d.cat === o.cat), lo = [...v.deals].sort((a, b) => a.pay - b.pay)[0], swap = same || (v.deals.length >= v.max ? lo : null);
    card.append(h('div', { class: 'kv', 'data-boffer': o.id }, h('span', { text: `${o.icon} ${o.brand} · ${money(o.pay)}/yr · ${o.years} yrs${swap ? (o.pay > swap.pay ? ' · better' : ' · lower') : ''}` }),
      h('button', { class: 'btn sm go', 'data-bacc': o.id, text: swap ? `Swap for ${swap.brand}` : 'Sign', onclick: () => go(adapter.brandAccept(o.id, swap ? swap.id : undefined)) }))); }
  return card;
}

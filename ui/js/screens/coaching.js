// Coaching & management: take a job, plan/training, transfers, stadium & gear, quarterly interactive season with a watchable top-down match, season review.
import { adapter } from '../adapter.js';
import { autoPageCard } from './autopage.js';
import { h, row, section, kv, btn, empty, bar, money, sheet, confirmSheet, act } from '../ui.js';

// Squad grouped by position type (on-field order), each with a header showing count and average rating; best rated first inside.
const squadGroups = (groups, mk) => groups.filter((g) => g.count).flatMap((g) => [h('div', { class: 'pos-group', 'data-el': 'pos-group', 'data-pos': g.id }, h('span', { class: 'pg-name', text: g.name }), h('span', { class: 'pg-meta', text: `${g.count} · avg ${g.avg}` })), ...g.players.map(mk)]);
const KITS = [['#d94a4a', '#ffffff'], ['#3b6fd1', '#ffffff']];
export async function coachingScreen(body, { nav, refresh }) {
  await autoPageCard(body, 'coaching');
  const st = await adapter.getCoaching();
  const go = async (a, a1, a2) => { const r = await act(adapter.coachAction(a, a1, a2)); await refresh(); return r; };
  if (!st.active) {
    body.append(h('div', { class: 'card', 'data-el': 'coach-intro' }, h('h3', { text: '📋 Coaching & management' }), h('div', { class: 'hint', text: 'Study Sports Science or Coaching (Education), or retire from playing, then coach a team you do not own. Start as an assistant and work up to head coach.' }), kv('Sports degree', st.hasDegree ? 'Yes' : 'No'), kv('Playing experience', st.expLabel || (st.exPlayer ? 'Yes' : 'No'))));
    if (st.canRetireCoach) body.append(section('Retire & start coaching'), ...st.sports.map((x) => row({ id: 'retire-coach:' + x.id, icon: x.icon, title: `Retire & coach ${x.name}`, sub: 'Ends your playing career and starts a coaching job (famous pros can land head coach)', onClick: () => go('take', x.id, { retire: true }) })));
    else if (!st.eligible) body.append(empty(st.why)); else body.append(section('Pick a sport'), ...st.sports.map((x) => row({ id: 'take:' + x.id, icon: x.icon, title: x.name, sub: 'Apply for a coaching job', onClick: () => go('take', x.id) })));
    if (st.reviews.length) body.append(section('Last season'), ...st.reviews.map(reviewRow));
    return;
  }
  body.append(h('div', { class: 'card', 'data-el': 'coach-card' }, h('h3', { text: `${st.sport.icon} ${st.team.name}` }), kv('Role', st.roleName), kv('Squad strength', String(st.team.strength)), bar('Board confidence', st.conf, { thin: true, key: 'conf' }), kv('Club budget', money(st.budget), 'pos'), kv('Years', String(st.years)), kv('Titles', String(st.titles)),
    st.role === 'assistant' ? h('div', { class: 'hint', text: st.canPromote ? 'The board will hear your case for head coach.' : `Head coach job after ${st.needYears} years as assistant (${st.years} so far).` }) : null,
    h('div', { class: 'btns', style: { flexWrap: 'wrap' } }, st.canPromote ? btn('Ask for the top job', () => go('promote'), 'go sm', { 'data-act': 'promote' }) : null, btn('Leave club', async () => { if (await confirmSheet('Leave the club?', 'You give up the job.', 'Leave', 'danger')) await go('quit'); }, 'alt sm'))));
  if (st.season) body.append(seasonCard(st, go, nav, refresh));
  if (st.role === 'head') {
    body.append(h('div', { class: 'card', 'data-el': 'coach-plan' }, h('h3', { text: 'Game plan & training' }), h('div', { class: 'btns', style: { flexWrap: 'wrap' } }, ...st.styles.map((x) => btn(x.name, () => go('plan', x.id), x.id === st.style ? 'go sm' : 'alt sm', { 'data-act': 'style-' + x.id }))), h('div', { class: 'btns', style: { flexWrap: 'wrap' } }, ...st.training.map((x) => btn(x.name, () => go('plan', null, x.id), x.id === st.trainingId ? 'go sm' : 'alt sm', { 'data-act': 'train-' + x.id }))),
      h('div', { class: 'hint', text: st.mode === 'interactive' ? 'Interactive: play each quarter yourself.' : 'Auto: the season runs when you age up.' }), btn(st.mode === 'interactive' ? 'Switch to auto' : 'Switch to interactive', () => go('mode', st.mode === 'interactive' ? 'auto' : 'interactive'), 'alt sm', { 'data-act': 'mode' })));
    body.append(section('Club'), row({ id: 'stadium', icon: '🏟️', title: st.stadium.name, sub: st.stadium.next ? `Upgrade: ${st.stadium.next.name} (${money(st.stadium.next.cost)})` : 'Best stadium', disabled: !st.stadium.next, onClick: () => go('upgrade', 'stadium') }), row({ id: 'gear', icon: '🎽', title: st.gear.name, sub: st.gear.next ? `Upgrade: ${st.gear.next.name} (${money(st.gear.next.cost)})` : 'Best facilities', disabled: !st.gear.next, onClick: () => go('upgrade', 'gear') }),
      row({ id: 'transfers', icon: '🔁', title: 'Transfers', sub: `${st.market.length} players on the market`, onClick: () => nav.open('Transfers', transfersScreen) }), row({ id: 'donate', icon: '💵', title: 'Add $100,000 of your own money', sub: 'Boosts the club budget and confidence', onClick: () => go('donate', 100000) }));
  }
  body.append(section(`Squad · ${st.team.players.length} players`), ...squadGroups(st.team.groups, (p) => row({ icon: '🧍', title: p.name, sub: `${p.pos} · age ${p.age} · pot ${p.pot} · morale ${p.morale}`, right: String(p.ovr), chevron: false })));
  body.append(section('League table'), ...st.table.map((t) => row({ icon: t.me ? '⭐' : '🏳️', title: `${t.pos}. ${t.name}`, right: `${t.pts} pts`, sub: `GD ${t.gd >= 0 ? '+' : ''}${t.gd}`, chevron: false })));
  if (st.reviews.length) body.append(section('Season reviews'), ...st.reviews.slice().reverse().map(reviewRow));
}
const reviewRow = (r) => row({ icon: r.champion ? '🏆' : '📊', title: `${r.year} · ${r.team}: #${r.pos}`, sub: `${r.w}W-${r.l}L-${r.d}D · GF ${r.gf} GA ${r.ga} · ${r.notes.join(' ')}${r.best ? ' · Star: ' + r.best.name + ' (' + r.best.ovr + ')' : ''} · Income ${money(r.revenue.gate + r.revenue.sponsors)} · your pay ${money(r.revenue.salary)}`, chevron: false, 'data-el': 'review-row' });

function seasonCard(st, go, nav, refresh) {
  const S = st.season; const interactive = st.mode === 'interactive' || st.role === 'head';
  return h('div', { class: 'card', 'data-el': 'coach-season' }, h('h3', { text: `Season ${S.q >= 4 ? '(finished)' : S.quarters[S.q]}` }), kv('Record', `${S.w}W-${S.l}L-${S.d}D`), kv('Goals', `${S.gf}-${S.ga}`),
    S.nextOpp ? h('div', null, kv('Major game vs', `${S.nextOpp} (${S.nextOppStr})`), h('div', { class: 'btns', style: { flexWrap: 'wrap' } }, ...(st.role === 'head' ? st.styles.map((x) => btn(x.name, () => playQ(go, nav, x.id, true, st), x.id === st.style ? 'go sm' : 'alt sm', { 'data-act': 'q-' + x.id })) : [btn('Play the quarter (assistant)', () => playQ(go, nav, null, true), 'go sm', { 'data-act': 'q-assist' })]), btn('⏩ Auto-finish season', async () => { for (let i = 0; i < 4; i++) await adapter.coachAction('quarter'); await refresh(); }, 'alt sm', { 'data-act': 'finish' }))) : h('div', { class: 'hint', text: 'Age up to start the next season.' }),
    st.last ? h('div', { class: 'hint', 'data-el': 'last-quarter', text: 'Last quarter: ' + st.last.games.map((g) => `${g.r} ${g.a}-${g.b} ${g.opp}`).join(' · ') }) : null,
    st.match ? btn('▶️ Watch the major game', () => watch(), 'alt sm', { 'data-act': 'watch' }) : null, interactive ? null : null);
}
async function playQ(go, nav, style, watchIt, st) {
  let st2 = null;
  if (style && st && st.role === 'head') { const h1 = await go('half', style); if (!h1 || !h1.ok) return; const hf = h1.half; const i = await sheet({ title: `⏱️ Halftime: ${hf.a}-${hf.b} vs ${hf.oppName}`, body: 'Change your tactic for the second half, or keep it.', options: st.styles.map((x) => ({ label: (x.id === style ? '✓ ' : '') + x.name, sub: x.id === style ? 'Keep the same plan' : '' })) }); st2 = i == null ? style : st.styles[i].id; }
  const r = await go('quarter', style, st2); if (r && r.ok && r.match) { if (await confirmSheet('Major game played', `${r.match.a}-${r.match.b} vs ${r.match.oppName}.${r.match.ht && r.match.ht.changed ? ' You changed tactics at halftime.' : ''} Watch the replay?`, 'Watch', 'go')) await watch(); } }

export async function watch(data) {
  const m = data || await adapter.getMatchFrames(); if (!m) return; const cv = h('canvas', { width: 320, height: 200, 'data-el': 'match-canvas', style: { width: '100%', borderRadius: '10px', background: '#3f9b4f' } }); const score = h('div', { class: 'hint', style: { textAlign: 'center', fontWeight: '700' }, 'data-el': 'match-score', text: '0 - 0' });
  let stop = false, i = 0; const ctx = cv.getContext('2d'), W = 320, H = 200;
  const person = (x, y, c) => { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x, y + 7, 7, 3, 0, 0, 7); ctx.fill(); ctx.fillStyle = c[0]; ctx.strokeStyle = '#2b2a3a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(x - 5, y - 4, 10, 11, 3); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#f1c9a0'; ctx.beginPath(); ctx.arc(x, y - 8, 5, 0, 7); ctx.fill(); ctx.stroke(); };
  const draw = (f) => { ctx.fillStyle = '#3f9b4f'; ctx.fillRect(0, 0, W, H); for (let k = 0; k < 8; k++) { if (k % 2) { ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fillRect(k * W / 8, 0, W / 8, H); } } ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2; ctx.strokeRect(6, 6, W - 12, H - 12); ctx.beginPath(); ctx.moveTo(W / 2, 6); ctx.lineTo(W / 2, H - 6); ctx.stroke(); ctx.beginPath(); ctx.arc(W / 2, H / 2, 24, 0, 7); ctx.stroke(); ctx.strokeRect(6, H / 2 - 28, 22, 56); ctx.strokeRect(W - 28, H / 2 - 28, 22, 56);
    for (const p of f.op) person(6 + p[0] * (W - 12), 6 + p[1] * (H - 12), ['#3b6fd1']); for (const p of f.me) person(6 + p[0] * (W - 12), 6 + p[1] * (H - 12), ['#d94a4a']);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#2b2a3a'; ctx.beginPath(); ctx.arc(6 + f.ball[0] * (W - 12), 6 + f.ball[1] * (H - 12), 4, 0, 7); ctx.fill(); ctx.stroke(); if (f.goal != null) { ctx.fillStyle = 'rgba(255,230,80,.9)'; ctx.font = 'bold 28px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('GOAL!', W / 2, H / 2); } score.textContent = `${f.score[0]} - ${f.score[1]}  ·  ${Math.round(f.t * 0.9)}'`; };
  draw(m.frames[0]); const tick = () => { if (stop) return; draw(m.frames[i]); i++; if (m.frames[i - 1] && m.frames[i - 1].ht) score.textContent = `Halftime: ${m.match.ht.a}-${m.match.ht.b}${m.match.ht.changed ? ' (tactics changed)' : ''}`; if (i < m.frames.length) setTimeout(tick, m.frames[i - 1] && m.frames[i - 1].ht ? 900 : 70); else score.textContent = `Full time: ${m.match.a} - ${m.match.b} vs ${m.match.oppName}`; }; setTimeout(tick, 300);
  await sheet({ title: `⚽ vs ${m.match.oppName} (red = you)`, body: h('div', null, cv, score, btn('⏩ Skip to full time', () => { i = m.frames.length - 1; }, 'alt sm', { 'data-act': 'skip' })), buttons: [{ id: 'c', label: 'Close', cls: 'alt' }] }); stop = true;
}
async function transfersScreen(body, { refresh }) {
  const st = await adapter.getCoaching(); if (!st.active) return body.append(empty('No team.'));
  body.append(h('div', { class: 'hint', style: { padding: '8px 12px' }, text: `Club budget: ${money(st.budget)}. Tap a market player to sign, or a squad player to sell.` }), section('Market'), ...st.market.map((p) => row({ id: 'buy:' + p.id, icon: '🛒', title: p.name, sub: `${p.pos} · age ${p.age} · pot ${p.pot}`, right: `${p.ovr} · ${money(p.price)}`, onClick: async () => { await act(adapter.coachAction('buy', p.id)); await refresh(); } })), section('Your squad'), ...squadGroups(st.team.groups, (p) => row({ id: 'sell:' + p.id, icon: '💱', title: p.name, sub: `${p.pos} · age ${p.age} · value ${money(Math.round(p.value * 0.8))}`, right: String(p.ovr), onClick: async () => { if (await confirmSheet('Sell ' + p.name + '?', 'You get 80% of their value.', 'Sell', 'danger')) { await act(adapter.coachAction('sell', p.id)); await refresh(); } } })));
}

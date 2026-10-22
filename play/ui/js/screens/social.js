// Social Media hub: platforms, post picker, results, sponsorships, verification (progress bar), calendar, team, gear, merch/channel, drama/appeal/cancel.
import { adapter } from '../adapter.js';
import { autoPageCard } from './autopage.js';
import { accountAutopilot } from './acctauto.js';
import { h, row, section, kv, btn, empty, chip, bar, money, sheet, confirmSheet, act, toast } from '../ui.js';

import { fmtCount as cnt } from '../../../src/fmt.js';
const TAGCLS = { Safe: 'good', Spicy: '', Risky: 'bad' };

export async function handlePrompt(pr) {
  const i = await sheet({ title: { drama: '⚡ Drama', appeal: '⚖️ Appeal', cancel: '🚫 Cancelled', hack: '🔓 Hacked' }[pr.kind] || 'Social', body: pr.text, options: pr.choices.map((c) => ({ label: c.label })), dismissable: false });
  if (i != null) await act(adapter.socialPrompt(i));
}
const fameBars = (st) => [bar('Fame', st.fame, { thin: true, key: 'fame' }), bar('Reputation', st.reputation, { thin: true, key: 'rep' }), bar('Brand safety', st.brandSafety, { thin: true, key: 'safety' }), bar('Burnout', st.burnout, { thin: true, key: 'burnout' })];

export async function socialHub(body, { nav, refresh }) {
  await autoPageCard(body, 'social');
  const st = await adapter.getSocial();
  if (st.locked) return body.append(empty('Social media starts at age 13.'));
  { const { talentCard } = await import('./bizops.js'); const c = await talentCard('social', refresh); if (c) body.append(c); }
  body.append(h('div', { class: 'card', 'data-el': 'fame-panel' }, h('h3', { text: '📱 Fame & reputation' }), kv('Total followers', cnt(st.total)), kv('Earned from social', money(st.earned), 'pos'), ...fameBars(st),
    st.streak ? h('div', { class: 'hint', text: `🔥 Posting streak: ${st.streak} year${st.streak > 1 ? 's' : ''} (consistency bonus)` }) : null, st.cancelledUntil ? h('div', { class: 'hint neg', text: 'You are laying low after being cancelled.' }) : null,
    st.teen ? h('div', { class: 'hint', text: 'Under 18: kid-safe sponsors only, no fan club, parents take half of the money.' }) : null));
  if (st.platforms.some((p) => p.open)) body.append(planCard(st, refresh));
  if (st.prompt) body.append(h('div', { class: 'card', 'data-el': 'social-prompt' }, h('h3', { text: st.prompt.kind === 'appeal' ? '⚖️ Appeal needed' : st.prompt.kind === 'cancel' ? '🚫 You were cancelled' : '⚡ Drama' }), h('p', { class: 'hint', text: st.prompt.text }), btn('Respond', async () => { await handlePrompt(st.prompt); await refresh(); }, 'go sm', { 'data-act': 'prompt' })));
  body.append(section('Your platforms'), ...st.platforms.filter((p) => p.open).map((p) => row({ id: 'plat:' + p.id, icon: p.icon, title: p.name + (p.verified ? ' ✔' : ''), sub: p.locked ? p.lockReason : p.open ? `${cnt(p.followers)} followers · ${p.engagement}% engagement · ${p.postsLeft} posts left${p.status !== 'active' ? ' · ' + p.status : ''}${p.career ? ' · career' : ''}` : `${p.role} · tap to open an account`, right: p.open ? cnt(p.followers) : '', disabled: p.locked, onClick: async () => { if (!p.open) { if (!(await act(adapter.socialAction(p.id, 'open'))).ok) return; } nav.open(p.name, (b, c) => platformScreen(b, c, p.id)); } })));
  { const n = st.platforms.filter((p) => !p.open).length; if (n) body.append(row({ id: 'unopened', icon: '➕', title: 'Platforms you don\'t have', sub: `${n} platform${n > 1 ? 's' : ''} · open an account`, onClick: async () => { const { unopenedScreen } = await import('./relationships.js'); nav.open('Platforms you don\'t have', unopenedScreen); } })); }
  body.append(section('Tools'),
    row({ id: 'cal', icon: '🗓️', title: 'Content calendar', sub: 'Yearly posting plan, consistency growth', onClick: () => nav.open('Content calendar', calendarScreen) }),
    row({ id: 'team', icon: '🧑‍💼', title: 'Your team', sub: 'Editor, manager, agent', right: String(st.team.length), onClick: () => nav.open('Team', teamScreen) }),
    row({ id: 'gear', icon: '🎥', title: 'Gear & studio', sub: `Growth +${Math.round(st.gear.growth * 100)}% · viral +${Math.round(st.gear.viral * 100)}% · sponsors +${Math.round(st.gear.sponsor * 100)}%`, onClick: () => nav.open('Gear & studio', gearScreen) }),
    row({ id: 'merch', icon: '👕', title: 'Merch & channel business', sub: 'Tied to your Businesses', onClick: () => nav.open('Merch & channel', merchScreen) }),
    row({ id: 'sponsors', icon: '🤝', title: 'All sponsorships', sub: 'Offers and deals on every platform', onClick: () => nav.open('Sponsorships', allSponsorsScreen) }));
  if (st.ambassador) body.append(h('div', { class: 'card' }, h('h3', { text: '🏅 Brand ambassador' }), kv(st.ambassador.brand, money(st.ambassador.pay) + '/yr'), h('div', { class: 'hint', text: 'Exclusive: no other sponsors. Ending early costs a penalty.' })));
  if (st.last) body.append(h('div', { class: 'card', 'data-el': 'social-last' }, h('h3', { text: `Last year (age ${st.last.age})` }), kv('Followers', `${cnt(st.last.before)} → ${cnt(st.last.after)}`), kv('Net income', money(st.last.income), st.last.income >= 0 ? 'pos' : 'neg'), h('div', { class: 'hint', text: Object.entries(st.last.parts).map(([k, v]) => `${k} ${money(v)}`).join(' · ') }), st.last.events.length ? h('div', { class: 'hint', text: st.last.events.join(' · ') }) : null));
}

export async function platformScreen(body, { nav, refresh }, pid) {
  const p = await adapter.getPlatform(pid); if (!p) return body.append(empty('No such platform.'));
  const go = async (action, a1, a2, after) => { const r = await act(adapter.socialAction(pid, action, a1, a2)); if (after) await after(r); await refresh(); return r; };
  { const { talentCard } = await import('./bizops.js'); const c = await talentCard('social', refresh); if (c) { c.dataset.acctMgmt = pid; body.append(c); } }
  body.append(h('div', { class: 'card', 'data-el': 'plat-card' }, h('h3', { text: `${p.icon} ${p.name}${p.verified ? ' ✔ Verified' : ''}` }), h('div', { class: 'hint', text: p.personality }), kv('Followers', cnt(p.followers)), kv('Engagement', p.engagement + '%'), kv('Niche', p.niche || 'none yet'), kv('Posts this year', `${p.postsThisYear}/${p.postsMax}`, p.postsLeft ? '' : 'neg'),
    kv('Audience likes', p.likes.join(', ')), kv('Audience dislikes', p.dislikes.join(', ') || '-'), p.status !== 'active' ? h('div', { class: 'hint neg', text: `Status: ${p.status}${p.suspendedYears ? ' (~' + p.suspendedYears + ' yr)' : ''}` }) : null, p.careerOwned ? h('div', { class: 'hint', text: 'This account is your career account: the career pays your income here.' }) : null));
  await accountAutopilot(body, pid, refresh);
  body.append(h('div', { class: 'btns', style: { flexWrap: 'wrap', padding: '0 12px' } },
    btn(p.postsLeft ? '✍️ Post' : `Post limit ${p.postsThisYear}/${p.postsMax}`, () => (p.postsLeft ? nav.open('Pick a post', (b, c) => postPicker(b, c, pid)) : toast(`Post limit reached: ${p.postsMax} posts per account per year. It resets when you age.`, 'bad')), p.postsLeft ? 'go sm' : 'alt sm', { 'data-act': 'post', disabled: p.postsLeft ? null : true }),
    btn(p.done.reply ? 'Replied' : '💬 Reply to comments', () => go('reply'), 'alt sm', { 'data-act': 'reply', disabled: p.done.reply ? true : null }),
    btn('🤝 Sponsorships', () => nav.open('Sponsorships', (b, c) => sponsorScreen(b, c, pid)), 'alt sm', { 'data-act': 'sponsors' }),
    btn(p.verified ? 'Verified ✔' : '✔ Verification', () => nav.open('Verification', (b, c) => verifyScreen(b, c, pid)), 'alt sm', { 'data-act': 'verify' }),
    btn(p.done.boost ? 'Boosted' : '🚀 Buy boost', async () => { const i = await sheet({ title: 'Buy followers', body: 'Cheap, bots, once a year: engagement -20% and a 25% chance the platform suspends you.', options: [{ label: '+1,000 followers ($20)' }, { label: '+5,000 followers ($100)' }, { label: '+20,000 followers ($400)' }] }); if (i != null) await go('boost', i); }, 'alt sm', { 'data-act': 'boost', disabled: p.done.boost ? true : null }),
    btn(p.done.collab ? 'Collab done' : '👯 Collab', () => go('collab'), 'alt sm', { 'data-act': 'collab', disabled: p.done.collab ? true : null }),
    btn(p.status === 'break' ? '▶️ Come back' : '😴 Take a break', () => go('break'), 'alt sm', { 'data-act': 'break' }),
    btn('🗑️ Delete account', async () => { if (await confirmSheet('Delete ' + p.name + '?', 'You lose the followers.', 'Delete', 'danger')) { const r = await act(adapter.socialAction(pid, 'delete')); if (r.ok) nav.back ? nav.back() : null; } }, 'danger sm', { 'data-act': 'delete' })));
  const dr = await adapter.getSocial(); if (dr.prompt) body.append(btn('⚡ Respond to ' + dr.prompt.kind, async () => { await handlePrompt(dr.prompt); await refresh(); }, 'go block'));
  if (p.plan) body.append(h('div', { class: 'hint', style: { padding: '8px 12px' }, text: `🗓️ Plan: ${p.plan.n} ${p.plan.type} posts a year (runs when you age).` }));
}

export async function postPicker(body, { nav, refresh }, pid) {
  const p = await adapter.getPlatform(pid);
  body.append(h('div', { class: 'hint', style: { padding: '8px 12px' }, text: `${p.name} audience likes: ${p.likes.join(', ')}. Posts this year: ${p.postsThisYear}/${p.postsMax}. Fit shows how well a post suits this platform.` }));
  body.append(...p.posts.map((t) => row({ id: 'post:' + t.id, icon: t.icon, title: t.name, sub: `${t.tag} · niche ${t.niche} · fit ${t.fit}${t.locked ? ' · ' + (t.reason || 'locked') : ''}`, right: t.tag, disabled: t.locked || !p.postsLeft, onClick: async () => {
    const r = await act(adapter.socialAction(pid, 'post', t.id), { quiet: true }); if (!r.ok) { await act(Promise.resolve(r)); return; }
    const x = r.post; await sheet({ title: x.viral ? '🔥 VIRAL!' : 'Post result', center: true, body: h('div', { 'data-el': 'post-result' }, kv('Likes', cnt(x.likes)), kv('Comments', cnt(x.comments)), kv('Followers', (x.delta >= 0 ? '+' : '') + cnt(x.delta), x.delta >= 0 ? 'pos' : 'neg'), kv('Platform fit', x.fit), x.loss ? h('div', { class: 'hint neg', text: `Lost ${cnt(x.loss)} followers to backlash.` }) : null, x.drama ? h('div', { class: 'hint neg', text: '⚡ Drama is brewing in the replies.' }) : null), buttons: [{ id: 'ok', label: 'OK', cls: 'go' }] });
    const st = await adapter.getSocial(); if (st.prompt) await handlePrompt(st.prompt); await refresh();
  } })));
}

async function offerRows(p, pid, nav, refresh) {
  const items = [];
  for (const o of p.offers) items.push(row({ id: 'offer:' + pid + o.id, icon: o.fit === 'great' ? '🟢' : o.fit === 'ok' ? '🟡' : '🔴', title: o.brand, sub: `${o.cat} · fit ${o.fit} · ${o.yrs} yr`, right: money(o.pay) + '/yr', onClick: async () => { const i = await sheet({ title: o.brand, body: `${money(o.pay)} a year for ${o.yrs} year(s). Product fit: ${o.fit}.${o.fit === 'poor' ? ' Poor fit can cost followers.' : ''}`, options: [{ label: 'Accept' }, { label: 'Decline' }, ...(p.deals.length >= p.maxDeals ? [{ label: 'Swap for my weakest deal' }] : [])] }); if (i === 0) await act(adapter.socialAction(pid, 'accept', o.id)); else if (i === 1) await act(adapter.socialAction(pid, 'decline', o.id)); else if (i === 2) await act(adapter.socialAction(pid, 'accept', o.id, true)); await refresh(); } }));
  return items;
}
export async function sponsorScreen(body, { nav, refresh }, pid) {
  const p = await adapter.getPlatform(pid);
  if (p.careerOwned) body.append(h('div', { class: 'hint', style: { padding: '8px 12px' }, text: 'Your career account earns sponsors through the Work screen instead.' }));
  if (!p.canSponsor) return body.append(empty('Brands notice you at 5k followers.'));
  body.append(section(`Deals (${p.deals.length}/${p.maxDeals})`), ...p.deals.map((d, i) => row({ id: 'deal:' + i, icon: '🤝', title: d.brand, sub: `${money(d.pay)}/yr · ${d.yrsLeft} yr left · fit ${d.fit} · tap to drop`, onClick: async () => { if (await confirmSheet('Drop ' + d.brand + '?', 'End this deal now.', 'Drop', 'danger')) { await act(adapter.socialAction(pid, 'dropDeal', i)); await refresh(); } } })));
  const rs = await offerRows(p, pid, nav, refresh); body.append(section('Offers'), ...(rs.length ? rs : [empty('No offers right now. New ones arrive each year.')]));
  if (p.ambassadorOk && !p.ambassadorDeal) body.append(btn('🏅 Become a brand ambassador', async () => { await act(adapter.socialAction(pid, 'ambassador')); await refresh(); }, 'go block', { 'data-act': 'ambassador' }));
  if (p.ambassadorDeal) body.append(btn('End ambassador deal (penalty)', async () => { if (await confirmSheet('End early?', 'Costs half a year of pay.', 'End', 'danger')) { await act(adapter.socialAction(pid, 'endAmbassador')); await refresh(); } }, 'danger block'));
}
async function allSponsorsScreen(body, ctx) { const st = await adapter.getSocial(); const pl = st.platforms.filter((p) => p.open); if (!pl.length) return body.append(empty('Open an account first.')); for (const x of pl) { const p = await adapter.getPlatform(x.id); body.append(section(`${x.icon} ${x.name} (${p.deals.length}/${p.maxDeals})`), ...p.deals.map((d) => row({ icon: '🤝', title: d.brand, sub: `${money(d.pay)}/yr`, chevron: false })), ...(await offerRows(p, x.id, ctx.nav, ctx.refresh))); } }

export async function verifyScreen(body, { refresh }, pid) {
  const p = await adapter.getPlatform(pid), v = p.verify;
  if (p.verified) return body.append(h('div', { class: 'card' }, h('h3', { text: '✔ Verified' }), h('p', { class: 'hint', text: 'Sponsor pay +20%, trolls -30%, and a reputation floor.' })));
  body.append(h('div', { class: 'card', 'data-el': 'verify-card' }, h('h3', { text: 'Verification checklist' }), bar('Progress', v.progress, { thin: true, key: 'verify-progress' }),
    kv(`Followers ${cnt(v.followers)} / ${cnt(v.reqFollowers)}`, v.followers >= v.reqFollowers ? '✅' : '⬜'), kv(`Fame ${v.fame} / ${v.reqFame}`, v.fame >= v.reqFame ? '✅' : '⬜'), kv('No suspension in 2 years', v.clean ? '✅' : '⬜'), kv('Approval chance when eligible', v.chance + '%'), v.cooldown ? h('div', { class: 'hint neg', text: `Rejected recently: wait ${v.cooldown} yr.` }) : null));
  body.append(btn(v.eligible ? 'Apply for verification' : 'Not eligible yet', async () => { await act(adapter.socialAction(pid, 'verify')); await refresh(); }, (v.eligible ? 'go' : 'alt') + ' block', { 'data-act': 'apply-verify', disabled: v.eligible ? null : true }));
}

export async function calendarScreen(body, { refresh }) {
  const st = await adapter.getSocial(); const open = st.platforms.filter((p) => p.open);
  body.append(h('div', { class: 'card', 'data-el': 'calendar-card' }, h('h3', { text: '🗓️ Content calendar' }), h('p', { class: 'hint', text: 'Plan posts per platform for the year. They run automatically when you age. Hitting every plan builds a consistency streak (growth bonus); more than ~18 posts a year in total, or 10+ on one platform, builds burnout.' }), kv('Streak', st.streak + ' yr'), bar('Burnout', st.burnout, { thin: true, key: 'burnout' })));
  if (!open.length) return body.append(empty('Open an account first.'));
  for (const p of open) body.append(row({ id: 'plan:' + p.id, icon: p.icon, title: p.name, sub: p.plan ? `${p.plan.n} × ${p.plan.type} per year` : 'No plan', right: 'Edit', onClick: async () => { const i = await sheet({ title: p.name + ' plan', options: [0, 2, 4, 6, 8, 10, 12].map((n) => ({ label: n ? `${n} posts a year` : 'No plan' })) }); if (i == null) return; await act(adapter.socialAction(p.id, 'plan', [0, 2, 4, 6, 8, 10, 12][i], p.plan ? p.plan.type : undefined)); await refresh(); } }));
}
export async function teamScreen(body, { refresh }) {
  const st = await adapter.getSocial();
  body.append(h('div', { class: 'hint', style: { padding: '8px 12px' }, text: 'Adults only. A team costs salary every year but pays back in quality, sponsor pay and fewer disasters.' }));
  for (const t of st.teamDefs) { const m = st.team.find((x) => x.role === t.id); body.append(row({ id: 'team:' + t.id, icon: t.icon, title: t.name + (m ? ': ' + m.name : ''), sub: m ? t.blurb : `${t.blurb} Needs ${cnt(t.minFollowers)} followers.`, right: m ? 'Fire' : t.cut ? '10% cut' : money(t.salary) + '/yr', disabled: !m && t.locked, onClick: async () => { if (m) { if (await confirmSheet('Let ' + m.name + ' go?', '', 'Fire', 'danger')) await act(adapter.socialTeam('fire', t.id)); } else await act(adapter.socialTeam('hire', t.id)); await refresh(); } })); }
}
export async function gearScreen(body, { nav }) {
  const st = await adapter.getSocial(); const g = st.gear;
  body.append(h('div', { class: 'card', 'data-el': 'gear-card' }, h('h3', { text: '🎥 Streaming & podcast gear' }), kv('Follower growth', '+' + Math.round(g.growth * 100) + '%'), kv('Viral chance', '+' + Math.round(g.viral * 100) + '%'), kv('Sponsor pay', '+' + Math.round(g.sponsor * 100) + '%'), h('div', { class: 'hint', text: g.items.length ? 'Using: ' + g.items.map((i) => i.name).join(', ') : 'No gear yet. Pricier tiers give bigger boosts; a full set adds its own bonus.' })));
  body.append(btn('🛍️ Open the Creator Gear Hub', async () => { const { shopScreen } = await import('./assets.js'); nav.open('Creator Gear Hub', (b, c) => shopScreen(b, c, 'gear_hub')); }, 'go block', { 'data-act': 'open-gear-shop' }));
}
export async function merchScreen(body, { refresh }) {
  const st = await adapter.getSocial();
  body.append(h('div', { class: 'hint', style: { padding: '8px 12px' }, text: 'Merch and channel companies are real businesses (see Businesses). Their reputation, and so demand, follows your following.' }));
  for (const c of st.canMerch) body.append(row({ id: 'merch:' + c.type, icon: c.type === 'creator_merch' ? '👕' : '🎞️', title: c.name, sub: c.have ? 'You own one: manage it under Businesses' : c.why || 'Ready to found', right: c.have ? '✓' : '', disabled: c.have || !!c.why, onClick: async () => { await act(adapter.socialBusiness(c.type)); await refresh(); } }));
}

// ---- yearly post plan (popup after you age, and a card on the Social Media hub) ----
const planSub = (o) => `Ban risk ${o.banPct}%${o.banPct === 0 ? ' (none)' : ''} · growth ${o.growth >= 0 ? '+' : ''}${o.growth}% · income ${o.income >= 0 ? '+' : ''}${o.income}% · sponsors ${o.sponsor >= 0 ? '+' : ''}${o.sponsor}% · drama ${o.drama === 0 ? 'none' : 'x' + o.drama}`;
export async function showPostPlanPopup() {
  const st = await adapter.getSocial(); if (st.locked || !st.postPlan.needed) return false;
  const opts = st.postPlan.options, i = await sheet({ title: '🗓️ Your post plan for this year', body: h('div', { 'data-el': 'plan-popup' }, h('p', { class: 'hint', text: 'This choice decides the year: ban risk, follower growth, income, sponsor appeal and drama. Safe plans cannot get you banned.' })), options: opts.map((o) => ({ label: `${o.icon} ${o.name}`, sub: `${o.desc} ${planSub(o)}` })), dismissable: true });
  if (i == null) return false; await act(adapter.setPostPlan(opts[i].id)); return true;
}
export function planCard(st, refresh) {
  const cur = st.postPlan.options.find((o) => o.id === st.postPlan.effective);
  return h('div', { class: 'card', 'data-el': 'plan-card' }, h('h3', { text: '🗓️ This year\'s post plan' }), h('div', { class: 'nm', style: { fontWeight: 800 }, text: `${cur.icon} ${cur.name}${st.postPlan.current ? '' : ' (default, not chosen yet)'}` }), h('div', { class: 'hint', text: planSub(cur) }),
    h('div', { class: 'btns' }, btn(st.postPlan.current ? 'Change plan' : 'Choose a plan', async () => { await showPostPlanPopup(); if (refresh) await refresh(); }, 'go sm', { 'data-act': 'plan-choose' })));
}

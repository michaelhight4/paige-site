// Online Profiles + Live Streaming: inline accordion on the Social tab, and full screens in the More directory (Social).
import { adapter } from '../adapter.js';
import { h, row, section, kv, btn, empty, bar, money, sheet, confirmSheet, act } from '../ui.js';
import { accordion } from './accordion.js';
const cnt = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + 'k' : String(Math.round(n)));
export async function profileRows(ctx) {
  const { nav } = ctx, [sm, inf, st] = await Promise.all([adapter.getSocial(), adapter.getInfluencer(), adapter.getStreamer()]), out = [];
  if (sm.locked) return [empty('Online profiles start at age 13.')];
  const open = sm.platforms.filter((p) => p.open);
  out.push(h('div', { class: 'card', 'data-el': 'profiles-summary' }, kv('Total followers', cnt(sm.total)), kv('Accounts', open.length + ' of ' + sm.platforms.length), kv('Fame', String(sm.fame)), kv('Reputation', String(sm.reputation)), kv('Earned online', money(sm.earned), 'pos')));
  for (const p of sm.platforms) out.push(row({ id: 'prof:' + p.id, icon: p.icon, title: p.name + (p.verified ? ' ✔' : ''), sub: p.locked ? p.lockReason : p.open ? `${cnt(p.followers)} followers · ${p.engagement}% engagement · ${p.role}${p.status && p.status !== 'active' ? ' · ' + p.status : ''} · bio: ${p.personality || p.audience || ''}` : `${p.role} · tap to open an account`, right: p.open ? 'Manage' : p.locked ? '' : 'Open', disabled: !!p.locked, onClick: () => nav.open(p.name, async (b, c) => { const { platformScreen } = await import('./social.js'); return platformScreen(b, c, p.id); }) }));
  if (!inf.locked) out.push(row({ id: 'prof:influencer', icon: inf.nicheIcon || '🌟', title: 'Influencer profile', sub: inf.active ? `${inf.nicheName} · ${cnt(inf.followers)} followers · engagement ${inf.engagement}% · heat ${inf.heat} · trust ${inf.trust}${inf.deals.length ? ' · ' + inf.deals.length + ' deals' : ''}` : 'Not started · pick a niche and build a following', right: inf.active ? 'Manage' : 'Start', onClick: () => nav.open('Influencer', async (b, c) => { const { influencerScreen } = await import('./online.js'); return influencerScreen(b, c); }) }));
  if (!st.locked) out.push(row({ id: 'prof:stream', icon: st.topicIcon || '🎥', title: 'Streaming channel', sub: st.active ? `${st.topicName} · ${cnt(st.subs)} subscribers · ${cnt(st.viewers)} avg viewers` : st.years ? `Off air · peak ${cnt(st.peakSubs)} subscribers` : 'Not started', right: st.active ? 'Manage' : 'Start', onClick: () => nav.open('Live Streaming', liveScreen) }));
  return out;
}
export async function streamRows(ctx) {
  const { nav, refresh } = ctx, st = await adapter.getStreamer(), out = [], rf = async () => { if (refresh) await refresh(); };
  if (st.locked) return [empty(`Streaming starts at age ${st.minAge}.`)];
  if (!st.active) {
    out.push(h('div', { class: 'card', 'data-el': 'stream-intro' }, h('div', { class: 'hint', text: 'Pick a game or topic and go live. Subscribers and viewers bring donations, ad money and sponsors. Watch out for strikes, bans and burnout.' + (st.teen ? ' (Under 18: parents cap your hours and take half of sponsor money.)' : '') }), st.bannedYears ? h('div', { class: 'hint neg', text: `Channel suspended for ~${st.bannedYears} more year(s).` }) : null, st.years ? h('div', { class: 'hint', text: `Past run: ${cnt(st.peakSubs)} peak subscribers, ${money(st.earned)} earned.` }) : null));
    out.push(btn('🔴 Go live', async () => { const i = await sheet({ title: 'Go live: pick a game or topic', options: st.topics.map((t) => ({ label: `${t.icon} ${t.name}`, sub: `Growth x${t.growth} · ban risk ${Math.round(t.ban * 100)}%/yr` })) }); if (i == null) return; await act(adapter.streamerAction('start', st.topics[i].id)); await rf(); }, 'go block', { 'data-act': 'go-live', disabled: st.bannedYears ? true : null }));
  } else {
    out.push(h('div', { class: 'card', 'data-el': 'stream-card' }, h('div', { class: 'nm', style: { fontWeight: 800 }, text: `🔴 Live · ${st.topicIcon} ${st.topicName}` }), kv('Subscribers', cnt(st.subs)), kv('Avg viewers', cnt(st.viewers)), kv('Earned so far', money(st.earned), 'pos'), kv('Years streaming', String(st.years)), bar('Burnout', st.burnout, { thin: true, key: 'burnout' }), bar('Setup quality', st.quality, { thin: true, key: 'setupq' }), kv('Strikes', `${st.strikes} / ${st.strikesToBan}`, st.strikes ? 'neg' : ''),
      h('div', { class: 'btns' }, btn(st.done.marathon ? 'Marathon done' : '🏃 Marathon', async () => { await act(adapter.streamerAction('marathon')); await rf(); }, 'go sm', { 'data-act': 'marathon', disabled: st.done.marathon ? true : null }), btn(st.done.rest ? 'Rested' : '😴 Break', async () => { await act(adapter.streamerAction('rest')); await rf(); }, 'alt sm', { 'data-act': 'rest', disabled: st.done.rest ? true : null }), btn('Stop', async () => { if (await confirmSheet('Stop streaming?', 'You keep your money and fame; sponsors leave.', 'Stop', 'danger')) { await act(adapter.streamerAction('quit')); await rf(); } }, 'danger sm', { 'data-act': 'quit' }))));
    out.push(section('Schedule'), h('div', { class: 'btns', style: { padding: '0 12px', flexWrap: 'wrap' } }, ...st.schedules.map((x) => btn(x.name, async () => { await act(adapter.streamerAction('schedule', x.id)); await rf(); }, (x.current ? 'go' : 'alt') + ' sm', { 'data-schedule': x.id, disabled: x.locked ? true : null }))));
    out.push(section(`Sponsors (${st.sponsors.length}/${st.maxSponsors})`), ...st.sponsors.map((x) => row({ id: 'sp:' + x.i, icon: '🤝', title: x.brand, sub: `${money(x.pay)}/yr · ${x.yrsLeft} yr left`, onClick: async () => { if (await confirmSheet('Drop ' + x.brand + '?', 'You lose the sponsorship.', 'Drop', 'danger')) { await act(adapter.streamerAction('dropSponsor', x.i)); await rf(); } } })),
      btn(st.done.sponsor ? 'Pitched this year' : st.canSponsor ? '📨 Pitch sponsors' : `Sponsors need ${st.minSubsForSponsor}+ subs`, async () => { await act(adapter.streamerAction('sponsor')); await rf(); }, 'alt block', { 'data-act': 'sponsor', disabled: st.done.sponsor || !st.canSponsor ? true : null }));
    out.push(section('Gear'), ...st.setup.map((it) => row({ id: 'gear:' + it.id, icon: it.icon, title: `${it.name}: ${it.current}`, sub: it.next ? `Upgrade to ${it.next}` : 'Maxed', right: it.next ? money(it.cost) : '✓', disabled: !it.next || !it.afford, onClick: async () => { await act(adapter.streamerAction('upgrade', it.id)); await rf(); } })));
  }
  out.push(section('Stream history'));
  if (!st.hist || !st.hist.length) out.push(h('div', { class: 'hint', 'data-el': 'stream-hist-none', style: { padding: '4px 14px' }, text: 'No streams yet. History appears after each year you stream.' }));
  else out.push(...st.hist.map((x) => row({ id: 'hist:' + x.age, icon: '📅', title: `Age ${x.age} · ${cnt(x.subs)} subs (${x.gain >= 0 ? '+' : ''}${cnt(x.gain)})`, sub: `${cnt(x.viewers)} avg viewers${x.events.length ? ' · ' + x.events.join(', ') : ''}`, right: money(x.income), chevron: false })));
  out.push(btn('Open the full streamer screen', () => nav.open('Streamer', async (b, c) => { const { streamerScreen } = await import('./online.js'); return streamerScreen(b, c); }), 'alt block', { 'data-act': 'stream-full' }));
  return out;
}
export async function profilesScreen(body, ctx) { body.append(...(await profileRows(ctx))); }
export async function liveScreen(body, ctx) { body.append(...(await streamRows(ctx))); }
export async function onlineAccordion(ctx) {
  const [sm, st, inf] = await Promise.all([adapter.getSocial(), adapter.getStreamer(), adapter.getInfluencer()]);
  const open = sm.locked ? 0 : sm.platforms.filter((p) => p.open).length + (inf.active ? 1 : 0) + (st.active ? 1 : 0);
  return accordion('lifesim.social.acc', [
    { id: 'profiles', icon: '🌐', label: 'Online Profiles', badge: sm.locked ? 'age 13+' : open + ' active', on: open > 0, rows: await profileRows(ctx) },
    { id: 'live', icon: '🎥', label: 'Live Streaming', badge: st.locked ? `age ${st.minAge}+` : st.active ? 'LIVE' : 'off air', on: !!st.active, rows: await streamRows(ctx) }], 'data-soc');
}

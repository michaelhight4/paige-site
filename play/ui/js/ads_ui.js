// Web placeholder ad screen (fake countdown) + reward prompt. The real SDK (AdMob) plugs into src/adapter_ads.js at the Android wrapper stage.
import { adapter } from './adapter.js';
import { store, h, sheet, act, money } from './ui.js';
import { placeholder } from '../../src/adapter_ads.js';

export function installAdPresenter() {
  const ph = placeholder(); if (!ph) return;
  ph.setPresenter((req) => new Promise((resolve) => {
    const t0 = performance.now(), need = req.requiredMs;
    const cnt = h('div', { class: 'ad-count', 'data-el': 'ad-count', text: String(Math.ceil(need / 1000)) }), fill = h('i', { style: { width: '0%' } });
    const msg = h('div', { class: 'hint', 'data-el': 'ad-msg', text: 'Your reward unlocks when the ad ends. It cannot be skipped.' });
    const box = h('div', { class: 'ad-box' }, h('div', { class: 'ad-tag', text: 'AD · placeholder' }), h('h3', { text: 'Your sponsor message' }), h('p', { class: 'hint', text: 'This is a stand-in for a real rewarded video.' }), cnt, h('div', { class: 'prog' }, fill), msg);
    const ov = h('div', { class: 'overlay ad-screen', 'data-el': 'ad-screen', role: 'dialog', 'aria-label': 'Advertisement' }, box); store.root.append(ov);
    const iv = setInterval(() => {
      const el = performance.now() - t0; fill.style.width = Math.min(100, el / need * 100) + '%';
      if (el >= need) {
        clearInterval(iv); cnt.textContent = '✓'; msg.textContent = 'Thanks for watching!';
        box.append(h('button', { class: 'btn go block', 'data-el': 'ad-claim', onclick: () => { ov.remove(); resolve({ completed: true, watchedMs: Math.max(need, performance.now() - t0) }); } }, 'Claim reward'));
      } else cnt.textContent = String(Math.ceil((need - el) / 1000));
    }, 100);
  }));
}
export async function showAdPrompt(pr) {
  if (!pr) return;
  const i = await sheet({ title: '🎁 Sponsor offer', body: `Watch a short ad (${Math.round(pr.requiredMs / 1000)} seconds) for ${pr.label}?`, options: [{ label: '📺 Watch the ad', sub: pr.label }, { label: 'No thanks' }], dismissable: false });
  await act(adapter.answerAdPrompt(i === 0));
}
export async function rewardsScreen(body, { refresh }) {
  const r = await adapter.getRewards();
  body.append(h('div', { class: 'card gold', 'data-el': 'rewards-card' }, h('h3', { text: '📺 Rewards' }),
    h('p', { class: 'hint', text: r.showsAds ? `Watch a ${Math.round(r.requiredMs / 1000)}-second ad for a reward. The reward arrives only after the ad finishes.` : r.steamNote }),
    h('div', { class: 'hint', 'data-el': 'rewards-platform', text: `Platform: ${r.platform}${r.showsAds ? '' : r.subscriber ? ' · subscriber' : ' · not subscribed'}${r.perDay ? ' · once per option per day' : ' · unlimited'}` })));
  const sec = (t) => body.append(h('div', { class: 'sec', text: t }));
  const mkRow = (o) => h('button', { class: 'row' + (o.ok ? '' : ' dis'), 'data-reward': o.key, disabled: o.ok ? null : true, onclick: async () => { await act(adapter.claimReward(o.key)); await refresh(); } },
    h('span', { class: 'ic', text: o.icon }), h('span', { class: 'tx' }, h('span', { class: 't', text: o.label }), h('span', { class: 's', text: o.ok ? (o.mode === 'ad' ? '📺 Watch an ad · ' : '⭐ Subscriber · ') + o.sub : o.reason })), o.ok ? h('span', { class: 'chev', text: '›' }) : null);
  sec('Cash'); body.append(...r.options.filter((o) => o.key === 'cash').map(mkRow));
  sec('Boost a stat'); body.append(...r.options.filter((o) => o.key.startsWith('stat:')).map(mkRow));
  sec('Elsewhere in the game'); body.append(...r.options.filter((o) => ['club', 'romance', 'rare'].includes(o.key)).map((o) => h('div', { class: 'row', 'data-reward-info': o.key }, h('span', { class: 'ic', text: o.icon }), h('span', { class: 'tx' }, h('span', { class: 't', text: o.label }), h('span', { class: 's', text: ({ club: 'Scholarships > clubs: tap a locked club', romance: 'Social: the Instant romance button', rare: 'On some event choices: look for the 🌟 option' })[o.key] + (o.ok ? '' : ' · ' + o.reason) })))));
  body.append(h('div', { class: 'hint', style: { padding: '8px 14px' }, text: `Years played: ${r.played}. A random sponsor offer can appear every 8-15 years, never before year 8${r.promptsEnabled ? '' : ' (off: No Ads / subscription / platform)'}.` }));
}

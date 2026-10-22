// Web placeholder ad screen (fake countdown) + reward prompt. The real SDK (AdMob) plugs into src/adapter_ads.js at the Android wrapper stage.
import { adapter } from './adapter.js';
import { store, h, sheet, act, money } from './ui.js';
import { placeholder } from '../../src/adapter_ads.js';

export function installAdPresenter() {
  const ph = placeholder(); if (!ph) return;
  ph.setPresenter((req) => new Promise((resolve) => {
    const t0 = performance.now(), need = req.requiredMs, forced = req.kind === 'interstitial';
    const cnt = h('div', { class: 'ad-count', 'data-el': 'ad-count', text: String(Math.ceil(need / 1000)) }), fill = h('i', { style: { width: '0%' } });
    const msg = h('div', { class: 'hint', 'data-el': 'ad-msg', text: forced ? 'The game continues when the ad ends. No Ads removes these.' : 'Your reward unlocks when the ad ends. It cannot be skipped.' });
    const box = h('div', { class: 'ad-box' }, h('div', { class: 'ad-tag', text: 'AD · placeholder' }), h('h3', { text: 'Your sponsor message' }), h('p', { class: 'hint', text: forced ? 'This is a stand-in for a real full-screen ad.' : 'This is a stand-in for a real rewarded video.' }), cnt, h('div', { class: 'prog' }, fill), msg);
    const ov = h('div', { class: 'overlay ad-screen', 'data-el': 'ad-screen', role: 'dialog', 'aria-label': 'Advertisement' }, box); store.root.append(ov);
    const iv = setInterval(() => {
      const el = performance.now() - t0; fill.style.width = Math.min(100, el / need * 100) + '%';
      if (el >= need) {
        clearInterval(iv); cnt.textContent = '✓'; msg.textContent = forced ? 'Thanks for supporting the game!' : 'Thanks for watching!';
        box.append(h('button', { class: 'btn go block', 'data-el': 'ad-claim', onclick: () => { ov.remove(); resolve({ completed: true, watchedMs: Math.max(need, performance.now() - t0) }); } }, forced ? 'Continue' : 'Claim reward'));
      } else cnt.textContent = String(Math.ceil((need - el) / 1000));
    }, 100);
  }));
}
// Real-time fallback: 20 visible minutes without a forced ad -> show one at the next natural break (screen change or AGE tap), before it proceeds.
let rtDue = false, rtBusy = false;
export function installRealtimeAds() {
  const tick = async () => { try { const r = await adapter.adClockTick(document.visibilityState !== 'hidden'); rtDue = !!(r && r.due); } catch (e) { /* adapter not ready */ } };
  document.addEventListener('visibilitychange', tick); setInterval(() => { if (document.visibilityState !== 'hidden') tick(); }, 15000); tick();
}
export const realtimeAdDue = () => rtDue && !rtBusy;
export async function naturalBreak() {
  if (!rtDue || rtBusy) return; rtBusy = true;
  try { await adapter.showRealtimeForcedAd(); } catch (e) { console.warn('forced ad failed', e); } finally { rtDue = false; rtBusy = false; }
}
// Forced ad every 8-15 years: no choice, no reward. If the ad fails to load the game just continues.
export async function showAdPrompt(pr) {
  if (!pr) return;
  try { await adapter.showForcedAd(); } catch (e) { console.warn('forced ad failed', e); } rtDue = false; // year ad also resets the 20-min timer
}
export async function rewardsScreen(body, { refresh }) {
  const r = await adapter.getRewards();
  body.append(h('div', { class: 'card gold', 'data-el': 'rewards-card' }, h('h3', { text: '📺 Rewards' }),
    h('p', { class: 'hint', text: r.showsAds ? (r.noAds ? 'No Ads: tap any reward to get it instantly, no ad. Once per option per day.' : `Watch a ${Math.round(r.requiredMs / 1000)}-second ad for a reward. The reward arrives only after the ad finishes.`) : r.steamNote }),
    h('div', { class: 'hint', 'data-el': 'rewards-platform', text: `Platform: ${r.platform}${r.showsAds ? '' : r.subscriber ? ' · subscriber' : ' · not subscribed'}${r.perDay || r.noAds ? ' · once per option per day' : ' · unlimited'}` })));
  const sec = (t) => body.append(h('div', { class: 'sec', text: t }));
  const mkRow = (o) => h('button', { class: 'row' + (o.ok ? '' : ' dis'), 'data-reward': o.key, disabled: o.ok ? null : true, onclick: async () => { await act(adapter.claimReward(o.key)); await refresh(); } },
    h('span', { class: 'ic', text: o.icon }), h('span', { class: 'tx' }, h('span', { class: 't', text: o.label }), h('span', { class: 's', text: o.ok ? (o.mode === 'ad' ? '📺 Watch an ad · ' : r.noAds ? '⚡ Instant (No Ads) · ' : '⭐ Subscriber · ') + o.sub : o.reason })), o.ok ? h('span', { class: 'chev', text: '›' }) : null);
  sec('Cash'); body.append(...r.options.filter((o) => o.key === 'cash').map(mkRow));
  sec('Boost a stat'); body.append(...r.options.filter((o) => o.key.startsWith('stat:')).map(mkRow));
  sec('Elsewhere in the game'); body.append(...r.options.filter((o) => ['club', 'romance', 'rare'].includes(o.key)).map((o) => h('div', { class: 'row', 'data-reward-info': o.key }, h('span', { class: 'ic', text: o.icon }), h('span', { class: 'tx' }, h('span', { class: 't', text: o.label }), h('span', { class: 's', text: ({ club: 'Scholarships > clubs: tap a locked club', romance: 'Social: the Instant romance button', rare: 'On some event choices: look for the 🌟 option' })[o.key] + (o.ok ? '' : ' · ' + o.reason) })))));
  body.append(h('div', { class: 'hint', style: { padding: '8px 14px' }, text: `Years played: ${r.played}. A full-screen ad appears at a break every 8-15 years (never before year 8) or after 20 minutes of active play${r.promptsEnabled ? '. No Ads removes it.' : ' (off: No Ads / subscription / platform)'}.` }));
}

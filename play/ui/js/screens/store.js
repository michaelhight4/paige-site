// Premium store (TEST TOGGLES: free local flags, no real payments) and Settings (sound, theme, ads hook).
import { adapter } from '../adapter.js';
import { store, h, row, section, kv, btn, empty, money, sheet, confirmSheet, act, toast, Art, sfx } from '../ui.js';

const EFFECT = { instant_any_degree: 'Get any degree instantly', start_cash_1000000_every_life: 'Start every life with $1,000,000', instant_famous: 'Instantly famous', instant_draft_pick: 'Instant draft pick', free_house_2000000_every_new_life: 'Free $2,000,000 house every new life', edit_any_character: 'Edit the stats and age of any character, including yourself', own_sports_team: 'Own a sports team', kill_anyone_get_away: 'Kill anyone and get away with it', never_catch_disease: 'Never catch a disease', unlimited_children: 'Unlimited children', never_pay_taxes: 'Never pay taxes', no_ads: 'Remove ads' };
const stars = (on) => (on ? '★' : '☆');
export async function storeScreen(body, { refresh, nav }) {
  const p = await adapter.getPremium();
  body.append(h('div', { class: 'card gold', 'data-el': 'premium-banner' }, h('h3', { text: '⭐ Premium' }),
    h('p', { class: 'hint', text: 'TEST MODE: toggles are free local flags kept on this device (they survive new lives). Real payments are not implemented (payments.js is a stub).' }),
    h('div', { class: 'btns' }, btn('Reset all flags', async () => { await adapter.resetPremium(); await refresh(); }, 'alt sm', { 'data-el': 'premium-reset' }), btn('Apply start perks now', () => act(adapter.applyPremiumNow()), 'go sm', { 'data-el': 'premium-apply' }))));
  const sub = p.subscription;
  body.append(section('All Access'), h('div', { class: 'card gold', 'data-el': 'subscription' },
    h('div', { class: 'nm', style: { fontWeight: 800 }, text: `${stars(p.subscribed)} ${sub.name || 'All Access'}` }),
    h('div', { class: 'hint', text: `$${sub.monthly}/month or $${sub.yearly}/year. Includes every pass while active; lapses on cancel.` + (p.subscribed ? ` Active (${p.plan}).` : '') }),
    h('div', { class: 'btns' }, p.subscribed ? btn('Cancel (test)', async () => { await adapter.setSubscription(null); await refresh(); }, 'danger sm', { 'data-el': 'sub-cancel' })
      : [btn(`Monthly $${sub.monthly}`, async () => { await adapter.setSubscription('monthly'); sfx('good'); await refresh(); }, 'go sm', { 'data-el': 'sub-monthly' }), btn(`Yearly $${sub.yearly}`, async () => { await adapter.setSubscription('yearly'); sfx('good'); await refresh(); }, 'go sm', { 'data-el': 'sub-yearly' })])));
  body.append(section('Passes ($5.99 each)'));
  for (const x of p.passes) {
    const on = x.owned, via = x.unlocked && !x.owned;
    body.append(h('div', { class: 'row prem' + (x.unlocked ? '' : ' prem-lock'), 'data-pass': x.id },
      h('span', { class: 'ic', text: x.unlocked ? '🔓' : '🔒' }),
      h('span', { class: 'tx' }, h('span', { class: 't', text: x.name }), h('span', { class: 's', text: (EFFECT[x.effect] || x.effect) + (via ? ' (via subscription)' : '') })),
      x.id === 'creator' && x.unlocked ? h('span', { class: 'rt' }, btn('Open', async () => { const { creatorScreen } = await import('./extra.js'); nav.open('The Creator', creatorScreen); }, 'go sm', { 'data-el': 'creator-open' })) : h('span', { class: 'rt', text: '$' + x.price.toFixed(2) }),
      h('label', { class: 'toggle', title: 'TEST TOGGLE' }, h('input', { type: 'checkbox', checked: on ? true : null, 'data-toggle': x.id, onchange: async (e) => { await adapter.setPremiumFlag(x.id, e.target.checked); sfx(e.target.checked ? 'good' : 'click'); await refresh(); } }), h('span', { text: 'TEST' }))));
  }
}
export async function settingsScreen(body, { refresh, nav }) {
  const s = await adapter.getSettings(), A = Art();
  body.append(section('Sound & look'));
  body.append(h('div', { class: 'row', 'data-el': 'mute-row' }, h('span', { class: 'ic', text: '🔊' }), h('span', { class: 'tx' }, h('span', { class: 't', text: 'Sound effects' }), h('span', { class: 's', text: A && A.sfx.isMuted() ? 'Muted' : 'On' })), btn(A && A.sfx.isMuted() ? 'Unmute' : 'Mute', () => { A && A.sfx.toggle(); refresh(); }, 'alt sm', { 'data-el': 'mute' })));
  const fant = document.documentElement.classList.contains('theme-fantasy');
  body.append(h('div', { class: 'row' }, h('span', { class: 'ic', text: '🎨' }), h('span', { class: 'tx' }, h('span', { class: 't', text: 'Theme' }), h('span', { class: 's', text: fant ? 'Fantasy' : 'Modern' })), btn(fant ? 'Modern' : 'Fantasy', () => { document.documentElement.classList.toggle('theme-fantasy'); if (!fant && A && A.fantasyPack) A.fantasyPack.apply(); refresh(); }, 'alt sm', { 'data-el': 'theme' })));
  body.append(h('div', { class: 'row', 'data-el': 'style-row', onclick: async () => { const { styleScreen } = await import('./extra.js'); nav.open('Style', styleScreen); } }, h('span', { class: 'ic', text: '🎨' }), h('span', { class: 'tx' }, h('span', { class: 't', text: 'Style & accessibility' }), h('span', { class: 's', text: 'Colors, large text, reduced motion' })), h('span', { class: 'chev', text: '›' })));
  { const { tipsOn, setTips } = await import('./tips.js'); body.append(h('div', { class: 'row', 'data-el': 'tips-row' }, h('span', { class: 'ic', text: '💡' }), h('span', { class: 'tx' }, h('span', { class: 't', text: 'First-life tips' }), h('span', { class: 's', text: tipsOn() ? 'On' : 'Off' })), btn(tipsOn() ? 'Turn off' : 'Turn on', async () => { setTips(!tipsOn()); await refresh(); }, 'alt sm'))); }
  body.append(section('Ads'), h('div', { class: 'row prem' + (s.ads.enabled ? ' prem-lock' : ''), 'data-el': 'ads-row' }, h('span', { class: 'ic', text: s.ads.enabled ? '🔒' : '🔓' }), h('span', { class: 'tx' }, h('span', { class: 't', text: 'Ads' }), h('span', { class: 's', text: s.ads.enabled ? 'No ads are shown (SDK not integrated). Buy No Ads to turn the hook off.' : 'Off: No Ads is unlocked.' }))));
  body.append(section('Content'), h('div', { class: 'row' }, h('span', { class: 'ic', text: '📚' }), h('span', { class: 'tx' }, h('span', { class: 't', text: 'Text pack' }), h('span', { class: 's', text: s.textPack.loaded ? `Loaded (${s.textPack.events} events)` : 'Starter text (' + s.textPack.reason + ')' }))));
  body.append(btn('Start a new life', async () => { if (await confirmSheet('New life?', 'Your current life ends without an obituary.', 'New life', 'danger')) { await adapter.newLife(); document.dispatchEvent(new CustomEvent('newlife')); } }, 'danger block', { 'data-el': 'new-life' }));
}

// Autopilot tab for one social account: yearly settings edited in place, toggled with the same page-lock as the Autopilot screen.
import { adapter } from '../adapter.js';
import { accordion } from './accordion.js';
import { h, row, kv, btn, sheet, act, toast } from '../ui.js';

const STYLES = ['Apologize', 'Explain what happened', 'Act confused', 'Threaten them'];
export async function accountAutopilot(body, pid, refresh) {
  const d = await adapter.getAutoAccount(pid), l = d.settings, pg = d.page, on = !!(pg && pg.on);
  const save = async (patch) => { await act(adapter.setAutoAccount(pid, patch), { quiet: true }); toast('Autopilot settings saved', 'good'); await refresh(); };
  const tog = (id, icon, title, sub, key) => row({ id: 'aa:' + id, icon, title: `${title}: ${l[key] ? 'on' : 'off'}`, sub, onClick: () => save({ [key]: !l[key] }) });
  const plan = d.planOptions.find((o) => o.id === d.plan) || d.planOptions[0];
  const rows = [
    h('div', { class: 'card', 'data-el': 'acct-auto-card', 'data-pid': pid }, h('div', { class: 'nm', style: { fontWeight: 800 }, text: `🤖 Account autopilot · ${on ? 'ON' : 'off'}` }), h('div', { class: 'hint', 'data-el': 'acct-auto-sum', text: on ? `Locked since age ${pg.since}. Runs every year with the same costs and risks as manual play. Edits below apply immediately.` : 'Choose the settings below, then lock them in. They re-apply each year when you age (same actions, costs and risks as doing it by hand).' }),
      h('div', { class: 'btns' }, btn(on ? 'Turn off' : 'Lock in & turn on', async () => { if (!d.unlocked) { toast('Needs the Autopilot Pack or All Access', 'bad'); return; } await act(adapter.setAutoPage('social_' + pid, !on)); await refresh(); }, (on ? 'alt' : 'go') + ' sm', { 'data-act': 'acct-auto-toggle' }))),
    plan ? row({ id: 'aa:plan', icon: plan.icon, title: 'Post plan (all accounts): ' + plan.name, sub: `Ban risk ${plan.banPct}%${plan.banPct === 0 ? ' (none)' : ''} · used every autopilot year`, onClick: async () => { const i = await sheet({ title: 'Preferred post plan', options: d.planOptions.map((o) => ({ label: `${o.icon} ${o.name}`, sub: `Ban risk ${o.banPct}%` })) }); if (typeof i === 'number') await save({ plan: d.planOptions[i].id }); } }) : null,
    row({ id: 'aa:posts', icon: '✍️', title: `Posts per year: ${l.posts} of ${d.cap}`, sub: `Capped at ${d.cap} posts per account per year`, onClick: async () => { const i = await sheet({ title: 'Posts per year', options: [0, 1, 2, 3, 4, 5].map((n) => ({ label: n + (n === 1 ? ' post' : ' posts') })) }); if (typeof i === 'number') await save({ posts: i }); } }),
    row({ id: 'aa:tone', icon: l.tone === 'safe' ? '🧸' : '🌶️', title: 'Post tone: ' + (l.tone === 'safe' ? 'Safe only' : 'Safe + Spicy'), sub: 'Spicy posts grow faster and raise drama risk', onClick: () => save({ tone: l.tone === 'safe' ? 'spicy' : 'safe' }) }),
    tog('reply', '💬', 'Reply to comments', 'Once a year', 'reply'), tog('collab', '👯', 'Collab', 'Once a year when possible', 'collab'), tog('sponsor', '🤝', 'Accept sponsor deals', 'Best-paying offer that fits', 'sponsor'),
    tog('appeal', '⚖️', 'Appeal if banned', 'Answers the appeal with your chosen style', 'appeal'),
    l.appeal ? row({ id: 'aa:style', icon: '🗣️', title: 'Appeal style: ' + STYLES[l.appealStyle], sub: 'Same four choices as the manual appeal', onClick: async () => { const i = await sheet({ title: 'Appeal style', options: STYLES.map((x) => ({ label: x })) }); if (typeof i === 'number') await save({ appealStyle: i }); } }) : null,
    pid === 'vidnest' ? tog('stream', '🎥', 'Go live each year', 'Starts your streaming channel if you are not live', 'stream') : null].filter(Boolean);
  body.append(accordion('lifesim.acct.auto.acc', [{ id: 'auto', icon: '🤖', label: 'Autopilot', badge: on ? 'ON' : 'off', on, rows }], 'data-acct'));
}

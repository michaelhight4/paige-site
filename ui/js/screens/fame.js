// "Use your fame": tier + meter, then every spot with odds, pay, toll and risk. Spots are capped per year; locked ones say why.
import { adapter } from '../adapter.js';
import { h, row, section, kv, bar, money, act, empty } from '../ui.js';
export async function fameScreen(body, ctx) {
  const f = await adapter.getFame();
  body.append(h('div', { class: 'card fame-card fame-' + f.tierId, 'data-el': 'fame-status' }, h('h3', { text: `🌟 ${f.tier}` }), bar('Fame', f.fame, { thin: true, key: 'fame' }),
    kv('Next tier', f.next ? `${f.next.name} at ${f.next.at}` : 'Top tier'), kv('Spots this year', `${f.used}/${f.cap}`), kv('Earned from fame spots', money(f.earned), 'pos'),
    h('div', { class: 'hint', text: 'Each spot raises stress. Every extra spot in a year pays a little less and risks overexposure; scandals cost fame.' })));
  body.append(section('Spots you can go after'));
  for (const q of f.spots) body.append(row({ id: 'fame:' + q.id, icon: q.icon, title: q.name, sub: q.ok ? `${q.odds}% chance · pays ${money(q.pay)} · stress +${q.stress} · scandal ${q.scandal}%` : q.reason, disabled: !q.ok, onClick: async () => { await act(adapter.fameTake(q.id)); } }));
  if (f.hist.length) body.append(section('Recent'), ...f.hist.map((x) => h('div', { class: 'hint', style: { padding: '2px 14px' }, text: `Age ${x.age}: ${f.spots.find((q) => q.id === x.id)?.name || x.id} · ${x.ok ? 'landed ' + money(x.pay) : 'missed'}` })));
}

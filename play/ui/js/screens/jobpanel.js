// Coworkers & boss: performance, promotion readiness, boss relationship, coworker list with yearly-capped interactions.
import { adapter } from '../adapter.js';
import { h, kv, bar, btn, section, sheet, act, empty } from '../ui.js';
export async function jobPanelScreen(body, { refresh }) {
  const v = await adapter.getJobPanel(); if (!v) return body.append(empty('You do not have a job right now.'));
  const go = async (p) => { await act(p); await refresh(); };
  body.append(h('div', { class: 'card', 'data-el': 'jp-head' }, h('h3', { text: `💼 ${v.title}` }), bar('Performance', v.perf, { thin: true }),
    h('div', { 'data-el': 'jp-promo' }, bar(v.top ? 'Top of the ladder' : `Promotion readiness → ${v.nextTitle}`, v.readiness, { thin: true })),
    h('div', { class: 'hint', text: 'Readiness grows with performance, time in the role and your boss relationship. Asking at 70%+ usually works.' }),
    h('div', { class: 'btns', style: { flexWrap: 'wrap' } },
      btn(v.promoAsked ? 'Asked this year' : 'Ask for a promotion', () => go(adapter.jobBoss('promotion')), 'go sm', { 'data-act': 'jp-promo', disabled: v.promoAsked || v.top }),
      btn(v.raiseAsked ? 'Asked this year' : 'Ask for a raise', () => go(adapter.jobBoss('raise')), 'alt sm', { 'data-act': 'jp-raise', disabled: v.raiseAsked }))));
  body.append(h('div', { class: 'card', 'data-el': 'jp-boss' }, h('h3', { text: `👔 Boss: ${v.boss.name}` }), bar('Relationship', v.boss.rel, { thin: true }), h('div', { class: 'btns' }, btn(v.impressed ? 'Done this year' : 'Impress the boss', () => go(adapter.jobBoss('impress')), 'alt sm', { 'data-act': 'jp-impress', disabled: v.impressed }))));
  body.append(section(`Coworkers · interactions ${v.used}/${v.cap} this year`));
  for (const c of v.coworkers) body.append(h('button', { class: 'card', 'data-cw': c.id, style: { display: 'block', width: 'calc(100% - 24px)', textAlign: 'left', opacity: c.done ? 0.6 : 1 }, onclick: async () => {
    const i = await sheet({ title: c.name, body: `${c.role} · age ${c.age} · ${c.persona}`, options: v.acts.map((a) => ({ label: a.label, disabled: c.done || v.used >= v.cap })) }); if (i != null) go(adapter.jobCoworker(c.id, v.acts[i].id)); } },
    h('div', { style: { fontWeight: 800 }, text: `${c.name}${c.done ? ' · done this year' : ''}` }), h('div', { class: 'hint', text: `${c.role} · age ${c.age} · ${c.persona}` }), bar('Relationship', c.rel, { thin: true }), bar('Professionalism', c.prof, { thin: true }), bar('Work ethic', c.ethic, { thin: true })));
}

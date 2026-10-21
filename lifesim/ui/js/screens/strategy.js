// Yearly strategy pickers for live streaming and media creation (production companies), like the social post plan.
import { adapter } from '../adapter.js';
import { h, btn, sheet, act } from '../ui.js';

const sg = (n) => (n >= 0 ? '+' : '') + n;
const streamSub = (o) => `Ban risk ${o.banPct}%${o.banPct === 0 ? ' (none)' : ''} · growth ${sg(o.growth)}% · income ${sg(o.income)}% · burnout ${sg(o.burnout)}`;
const mediaSub = (o) => `Scandal risk ${o.scandalPct}%${o.scandalPct === 0 ? ' (none)' : ''} · revenue ${sg(o.revenue)}% · reputation ${sg(o.reputation)}% · budgets ${sg(o.budget)}% · slots ${sg(o.slots)}`;

export async function showStreamPlanPopup(force) {
  const st = await adapter.getStreamer(); if (st.locked || !st.active || (!force && !st.plan.needed)) return false;
  const opts = st.plan.options, i = await sheet({ title: '📡 Your streaming strategy this year', body: h('div', { 'data-el': 'stream-plan-popup' }, h('p', { class: 'hint', text: 'This decides the year: growth, income, burnout and strike risk. Consistent and Niche cannot get you banned.' })), options: opts.map((o) => ({ label: `${o.icon} ${o.name}`, sub: `${o.desc} ${streamSub(o)}` })), dismissable: true });
  if (i == null) return false; await act(adapter.setStreamPlan(opts[i].id)); return true;
}
export function streamPlanCard(st, refresh) {
  const cur = st.plan.options.find((o) => o.id === st.plan.effective) || { icon: '⚖️', name: 'Unplanned', desc: 'No strategy chosen this year.', banPct: 0, growth: 0, income: 0, burnout: 0 };
  return h('div', { class: 'card', 'data-el': 'stream-plan-card' }, h('h3', { text: '📡 This year\'s streaming strategy' }), h('div', { class: 'nm', style: { fontWeight: 800 }, text: `${cur.icon} ${cur.name}${st.plan.current ? '' : ' (not chosen yet)'}` }), h('div', { class: 'hint', text: streamSub(cur) }),
    h('div', { class: 'btns' }, btn(st.plan.current ? 'Change strategy' : 'Choose a strategy', async () => { await showStreamPlanPopup(true); if (refresh) await refresh(); }, 'go sm', { 'data-act': 'stream-plan-choose' })));
}
export async function showMediaPlanPopups() {
  const st = await adapter.getProdCos(); if (st.locked) return false; let any = false;
  for (const m of st.media) { const co = m.company; if (!co || !co.plan.needed) continue; if (await showMediaPlanPopup(m.id, co)) any = true; }
  return any;
}
export async function showMediaPlanPopup(medium, co0) {
  const co = co0 || (await adapter.getProdCos()).media.find((x) => x.id === medium).company; if (!co) return false;
  const opts = co.plan.options, i = await sheet({ title: `${co.icon} ${co.name}: strategy this year`, body: h('div', { 'data-el': 'media-plan-popup' }, h('p', { class: 'hint', text: 'This decides the year: score, revenue, reputation, budgets and scandal risk. Steady has no scandal risk but builds slowly.' })), options: opts.map((o) => ({ label: `${o.icon} ${o.name}`, sub: `${o.desc} ${mediaSub(o)}` })), dismissable: true });
  if (i == null) return false; await act(adapter.setMediaPlan(medium, opts[i].id)); return true;
}
export function mediaPlanCard(medium, co, refresh) {
  const cur = co.plan.options.find((o) => o.id === co.plan.effective) || { icon: '⚖️', name: 'Unplanned', desc: 'No strategy chosen this year.', scandalPct: 5, revenue: 0, reputation: 0, budget: 0, slots: 0 };
  return h('div', { class: 'card', 'data-el': 'media-plan-card' }, h('h3', { text: '🎞️ This year\'s strategy' }), h('div', { class: 'nm', style: { fontWeight: 800 }, text: `${cur.icon} ${cur.name}${co.plan.current ? '' : ' (not chosen yet)'}` }), h('div', { class: 'hint', text: mediaSub(cur) }),
    h('div', { class: 'btns' }, btn(co.plan.current ? 'Change strategy' : 'Choose a strategy', async () => { await showMediaPlanPopup(medium); if (refresh) await refresh(); }, 'go sm', { 'data-act': 'media-plan-choose' })));
}

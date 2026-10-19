// Quality upgrade and swap-an-employee card, used by every owned business screen (CEO companies, production companies, brand, farm, teams, racing teams).
import { adapter } from '../adapter.js';
import { h, kv, btn, sheet, confirmSheet, act, money } from '../ui.js';
export async function bizOpsCard(kind, ref, { refresh } = {}) {
  const q = await adapter.getBizQuality(kind, ref), members = await adapter.getSwapMembers(kind, ref); if (!q.has && !members.length) return null;
  const go = async (p) => { await act(p); if (refresh) refresh(); };
  const kids = [h('h3', { text: '⭐ Quality & people' })];
  if (q.has) {
    kids.push(kv(q.label, q.native ? String(q.q) : q.q + ' / 100'), h('div', { class: 'hint', text: q.note }));
    if (!q.native) kids.push(h('div', { class: 'btns', 'data-el': 'bo-steps' }, ...q.steps.map((st) => btn(`+${st.pts} · ${money(st.cost)}`, () => go(adapter.bizQualityUp(kind, ref, [4, 8, 16, 30][q.steps.indexOf(st)])), 'alt sm', { 'data-bo-up': [4, 8, 16, 30][q.steps.indexOf(st)], disabled: !st.afford }))));
  }
  kids.push(btn('🔄 Swap an employee', async () => {
    if (!members.length) { await sheet({ title: 'Nobody to swap', body: 'Hire someone first.', center: true, buttons: [{ id: 'ok', label: 'OK' }] }); return; }
    const i = await sheet({ title: 'Who should go?', options: members.map((m) => ({ label: `${m.name} · ${m.role}`, sub: `skill ${m.skill} · ${money(m.pay)}/yr` })) }); if (i == null) return;
    const cands = await adapter.getSwapCandidates(kind, ref, members[i].id); if (!cands.length) { await sheet({ title: 'No replacements', body: 'Nobody is available for that role right now.', center: true, buttons: [{ id: 'ok', label: 'OK' }] }); return; }
    const j = await sheet({ title: `Replace ${members[i].name} with…`, options: cands.map((c) => ({ label: `${c.name} · skill ${c.skill}`, sub: `${money(c.pay)}/yr` })) }); if (j == null) return;
    if (await confirmSheet(`Swap ${members[i].name}?`, `Severance is paid, then ${cands[j].name} is hired.`, 'Swap')) await go(adapter.swapStaff(kind, ref, members[i].id, cands[j].id));
  }, 'alt block', { 'data-el': 'bo-swap', 'data-bo-kind': kind }));
  { const lid = { biz: 'biz', brand: 'brand', farm: 'farm', prod: 'prod', racing: 'racing_team', team: 'teams' }[kind], tb = await adapter.getTimeBudget(), ln = tb.lines.find((x) => x.id === lid);
    if (ln) kids.push(h('div', { class: 'kv', 'data-el': 'mgmt-line' }, h('span', { text: ln.mgmt ? `🧑‍💼 Management firm: ${ln.hours}h/wk (was ${ln.was}h)` : `🧑‍💼 Time load: ${ln.hours}h/wk` }), h('button', { class: 'btn alt sm', 'data-el': 'mgmt-hire', text: ln.mgmt ? 'Change' : 'Hire management', onclick: async () => { const opts = tb.mgmtTiers.map((q) => ({ label: `${q.name}: hours to ${Math.round(q.pct * 100)}% · ${money(q.fee)}/yr each` })); if (ln.mgmt) opts.push({ label: 'Fire the firm' }); const i = await sheet({ title: 'Hire management', body: 'Only takes the time load (and the stress) off you. It makes no decisions; you keep full control.', options: opts }); if (i == null) return; go(adapter.setManagement(lid, i < tb.mgmtTiers.length ? tb.mgmtTiers[i].id : null)); } }))); }
  return h('div', { class: 'card', 'data-el': 'bizops', 'data-bo': kind }, ...kids);
}

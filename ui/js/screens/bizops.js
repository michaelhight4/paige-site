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
  { const lid = { biz: 'biz', brand: 'brand', farm: 'farm', prod: 'prod', racing: 'racing_team', team: 'teams' }[kind]; const r = await mgmtRow(lid, refresh); if (r) kids.push(r); }
  return h('div', { class: 'card', 'data-el': 'bizops', 'data-bo': kind }, ...kids);
}

// 'Hire management' line for any time-budget entity (corporate firm for companies/teams, talent firm for social/streaming). Only cuts hours.
export async function talentCard(lids, refresh) { const rows = []; for (const l of [].concat(lids)) { const r = await mgmtRow(l, refresh); if (r) rows.push(r); } if (!rows.length) return null;
  return h('div', { class: 'card', 'data-el': 'mgmt-card' }, h('h3', { text: '🧑‍💼 Hire talent management' }), h('div', { class: 'hint', text: 'A talent firm takes most of the time load (and stress) off you for a yearly fee. You keep every decision.' }), ...rows); }
// Shared firm slot sheet (one Corporate firm for all companies, one Talent firm for all socials/streams).
export async function firmSheet(gid, refresh) {
  const tb = await adapter.getTimeBudget(), G = tb.mgmtGroups.find((g) => g.id === gid); if (!G) return;
  const opts = G.quotes.map((q) => ({ label: `${q.name}: hours to ${Math.round(q.pct * 100)}% · ${money(q.fee)}/yr for ${Math.max(1, G.units)} ${G.noun}${G.tier === q.id ? ' (current)' : ''}` })); if (G.tier) opts.push({ label: 'Fire the firm' });
  const i = await sheet({ title: G.name, body: `One firm covers all your ${gid === 'corporate' ? 'companies' : 'social accounts, podcast and streaming'}. Fee: base, +25% of base per extra one. It only takes the time load (and stress) off you; you keep every decision.`, options: opts }); if (i == null) return;
  await act(adapter.setManagement(gid, i < G.quotes.length ? G.quotes[i].id : null)); if (refresh) refresh();
}
export function firmCard(G, refresh) {
  return h('div', { class: 'card', 'data-el': 'firm-card', 'data-firm': G.id }, h('h3', { text: `🧑‍💼 ${G.id === 'corporate' ? 'Corporate firm' : 'Talent firm'}: ${G.tierName || 'none'}` }),
    h('div', { class: 'hint', text: G.tier ? `Covers ${G.units} ${G.noun} · ${money(G.fee)}/yr · hours cut to ${Math.round(G.quotes.find((q) => q.id === G.tier).pct * 100)}%` : `${G.units} ${G.noun} you could hand over · from ${money(G.quotes[0].fee)}/yr` }),
    h('button', { class: 'btn ' + (G.tier ? 'alt' : 'go') + ' sm', 'data-el': 'firm-hire', text: G.tier ? 'Change or fire' : 'Hire a firm', onclick: () => firmSheet(G.id, refresh) }));
}
export async function mgmtRow(lid, refresh) {
  const tb = await adapter.getTimeBudget(), ln = tb.lines.find((x) => x.id === lid); if (!ln || !ln.manageable) return null; const G = tb.mgmtGroups.find((g) => g.id === ln.manageable);
  return h('div', { class: 'kv', 'data-el': 'mgmt-line', 'data-mgmt': lid }, h('span', { text: ln.mgmt ? `🧑‍💼 ${G.tierName} firm · Managed: ${ln.hours}h (was ${ln.was}h)` : `🧑‍💼 Time load: ${ln.hours}h/wk` }), h('button', { class: 'btn alt sm', 'data-el': 'mgmt-hire', text: ln.mgmt ? 'Change' : 'Hire management', onclick: () => firmSheet(ln.manageable, refresh) }));
}

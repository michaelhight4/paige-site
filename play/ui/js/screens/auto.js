// Autopilot pack screens: routines + floor + on/off, skip-ahead sheet and per-year summary.
import { adapter } from '../adapter.js';
import { store, h, row, section, kv, btn, empty, money, sheet, act, askNumber, toast, refreshState, rerenderTop } from '../ui.js';

const sign = (n) => (n > 0 ? '+' : '') + n;
export function lockedCard(nav) {
  return h('div', { class: 'card gold', 'data-el': 'auto-locked' }, h('h3', { text: '🤖 Autopilot Pack' }),
    h('p', { class: 'hint', text: 'Pick yearly routines (train, read, work harder, practice, date nights, gifts…) that run every time you age, and skip ahead several years with safety stops. Needs the Autopilot Pack ($5.99) or All Access.' }),
    btn('Open the Premium store', async () => { const { storeScreen } = await import('./store.js'); nav.open('Premium', storeScreen); }, 'go block', { 'data-el': 'auto-store' }));
}
export async function autopilotScreen(body, { nav, refresh }) {
  const a = await adapter.getAutopilot();
  if (!a.unlocked) return body.append(lockedCard(nav));
  body.append(h('div', { class: 'card', 'data-el': 'auto-card' }, h('h3', { text: '🤖 Autopilot ' + (a.on ? '· ON' : '· off') }),
    h('div', { class: 'hint', text: a.on ? 'Your routines run automatically every time you age (same costs and effects as doing them by hand).' : 'Turn it on and the selected routines run every time you age.' }),
    a.safety ? h('div', { class: 'hint neg', 'data-el': 'auto-safety', text: '⏸ Would pause now: ' + a.safety.reason }) : h('div', { class: 'hint', 'data-el': 'auto-safety', text: '✅ No safety stop active.' }),
    h('div', { class: 'btns' }, btn(a.on ? 'Turn off' : 'Turn on', async () => { await adapter.setAutopilot({ on: !a.on }); await refreshState(); await refresh(); }, a.on ? 'alt sm' : 'go sm', { 'data-el': 'auto-toggle' }),
      btn('⏩ Skip ahead', () => skipSheet(), 'go sm', { 'data-el': 'auto-skip' }),
      a.skipRemaining ? btn(`Continue skip (${a.skipRemaining} left)`, () => runSkip({ years: a.skipRemaining }), 'alt sm', { 'data-el': 'auto-resume' }) : null)));
  body.append(row({ id: 'auto:floor', icon: '🛟', title: 'Cash floor', sub: 'Autopilot pauses (and skips costly routines) below this much cash', right: money(a.floor), onClick: async () => { const v = await askNumber('Cash floor', { min: 0, max: 1e9, def: a.floor, note: 'Autopilot stops when your cash drops below this.' }); if (v != null) { await adapter.setAutopilot({ floor: v }); await refresh(); } } }));
  body.append(h('div', { class: 'btns', style: { padding: '0 12px' } }, ...[0, 5000, 25000, 100000].map((v) => btn(money(v), async () => { await adapter.setAutopilot({ floor: v }); await refresh(); }, (a.floor === v ? 'go' : 'alt') + ' sm', { 'data-floor': v }))));
  // passion picker: which passion the "Train passion" routine picks and practices (same Practice action as the Passions screen)
  { const ps = await adapter.getPassions(); if (!ps.locked) { const cur = ps.active.concat(ps.available).find((x) => x.id === a.passion);
    body.append(row({ id: 'auto:passion', icon: cur ? cur.icon : '🔥', title: 'Passion to train', sub: cur ? `${cur.name}${ps.active.some((x) => x.id === a.passion) ? ' · active, meter ' + ps.active.find((x) => x.id === a.passion).meter : ' · will be picked when a slot is free'}` : 'Best fit for your skills (automatic)', right: a.selected.includes('practice') ? 'On' : 'Off', onClick: async () => {
      const opts = [{ label: '✨ Best fit (automatic)' }, ...ps.active.concat(ps.available).map((x) => ({ label: `${x.icon} ${x.name}` }))]; const all = ps.active.concat(ps.available);
      const i = await sheet({ title: 'Passion to train', body: 'Autopilot practices this passion once a year (and picks it if you have a free slot).', options: opts }); if (i == null) return;
      await adapter.setAutopilot({ passion: i === 0 ? null : all[i - 1].id, routines: [...new Set([...a.selected, 'practice'])] }); await refresh(); } })); } }
  { const ss = await adapter.getSocial(); if (!ss.locked && ss.platforms.some((p) => p.open)) { const cur = ss.postPlan.options.find((o) => o.id === a.socialPlan) || ss.postPlan.options[0];
    body.append(row({ id: 'auto:socialplan', icon: cur.icon, title: 'Preferred post plan', sub: `${cur.name} · ban risk ${cur.banPct}%${cur.banPct === 0 ? ' (none)' : ''} · used for every autopilot year`, right: 'Change', onClick: async () => {
      const i = await sheet({ title: 'Autopilot post plan', body: 'Autopilot picks this plan each year (default Safe). Same risks as choosing it by hand.', options: ss.postPlan.options.map((o) => ({ label: `${o.icon} ${o.name}`, sub: `Ban risk ${o.banPct}% · growth ${o.growth >= 0 ? '+' : ''}${o.growth}% · income ${o.income >= 0 ? '+' : ''}${o.income}%` })) }); if (i == null) return;
      await adapter.setAutopilot({ socialPlan: ss.postPlan.options[i].id }); await refresh(); } })); } }
  body.append(section('Yearly routines'));
  // inline accordion: tap a banner to drop its routines down in place, tap again to collapse (open/closed is remembered)
  { const KEY = 'lifesim.auto.acc', rd = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }, wr = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* private mode */ } };
    const sel = new Set(a.selected), openState = rd(), acc = h('div', { class: 'acc', 'data-el': 'auto-acc' });
    for (const sec of a.sections) {
      const rs = a.routines.filter((r) => r.sec === sec.id), prs = (a.pages || []).filter((x) => x.section === sec.id); if (!rs.length && !prs.length) continue;
      const cnt = h('span', { class: 'acc-n', 'data-n': sec.id }), chev = h('span', { class: 'acc-chev', text: '▾' });
      const pon = new Set(prs.filter((x) => x.on).map((x) => x.id)); const count = () => { const n = rs.filter((r) => sel.has(r.id)).length + pon.size; cnt.textContent = n ? n + ' on' : 'off'; cnt.classList.toggle('on', n > 0); };
      const pageRows = prs.map((pg) => { const el = row({ id: 'page:' + pg.id, icon: pg.on ? '✅' : '⬜', title: 'This page: ' + pg.label, sub: pg.on ? `Locked settings re-apply every year: ${pg.summary}` : pg.available ? `Lock in the current settings: ${pg.summary}` : 'Set the page up first (' + pg.summary + ')', right: pg.on ? 'On' : 'Off', disabled: !pg.on && !pg.available, onClick: async () => { const r = await adapter.setAutoPage(pg.id, !pg.on); if (!r.ok) { toast(r.message, 'bad'); return; } await refresh(); } }); el.dataset.on = pg.on ? '1' : '0'; return el; });
      const list = h('div', { class: 'acc-body' }, ...pageRows, ...rs.map((r) => { const el = row({ id: 'routine:' + r.id, icon: sel.has(r.id) ? '✅' : '⬜', title: r.label, sub: r.available ? r.desc : r.desc + ' · now: ' + r.reason, right: sel.has(r.id) ? 'On' : 'Off', onClick: async () => {
        sel.has(r.id) ? sel.delete(r.id) : sel.add(r.id); await adapter.setAutopilot({ routines: [...sel] }); const on = sel.has(r.id); el.querySelector('.ic') && (el.querySelector('.ic').textContent = on ? '✅' : '⬜'); const rt = el.querySelector('.rt, .right'); if (rt) rt.textContent = on ? 'On' : 'Off'; el.dataset.on = on ? '1' : '0'; count(); } }); el.dataset.on = sel.has(r.id) ? '1' : '0'; return el; }));
      const wrap = h('div', { class: 'acc-sec' }), head = h('button', { class: 'acc-head', 'data-acc': sec.id, 'aria-expanded': 'false', type: 'button' }, h('span', { class: 'acc-ic', text: sec.icon }), h('span', { class: 'acc-t', text: sec.label }), cnt, chev);
      const setOpen = (o, anim) => { wrap.classList.toggle('open', o); head.setAttribute('aria-expanded', o ? 'true' : 'false'); list.style.maxHeight = o ? (anim ? list.scrollHeight + 'px' : 'none') : '0px'; if (o && anim) setTimeout(() => { if (wrap.classList.contains('open')) list.style.maxHeight = 'none'; }, 260); };
      head.onclick = () => { const o = !wrap.classList.contains('open'); if (!o) { list.style.maxHeight = list.scrollHeight + 'px'; void list.offsetHeight; } setOpen(o, true); const st = rd(); st[sec.id] = o ? 1 : 0; wr(st); };
      count(); wrap.append(head, list); setOpen(!!openState[sec.id], false); acc.append(wrap);
    }
    body.append(acc); }
  if (a.last) body.append(section('Last year'), summaryCard(a.last));
  body.append(h('div', { class: 'hint', style: { padding: '8px 14px' }, text: 'Safety stops: autopilot pauses on any event or choice, illness, health crisis, job loss, losing a partner, arrest, death, or cash below your floor.' }));
}
export function summaryCard(y) {
  return h('div', { class: 'card auto-year', 'data-year': y.toAge }, h('div', { class: 'nm', style: { fontWeight: 800 }, text: `Age ${y.fromAge} → ${y.toAge}` }),
    h('div', { class: 'hint', text: y.ran.length ? 'Did: ' + y.ran.map((r) => `${r.icon} ${r.label}${r.who ? ' (' + r.who + ')' : ''}`).join(', ') : (y.paused ? '⏸ ' + y.paused.reason : 'Nothing to do') }),
    y.skipped.length && y.ran.length ? h('div', { class: 'hint', text: 'Skipped: ' + y.skipped.map((r) => `${r.label} (${r.reason})`).join('; ') }) : null,
    h('div', { class: 'hint', text: `Cash ${sign(y.cashDelta < 0 ? -Math.abs(y.cashDelta) : y.cashDelta) === '0' ? '$0' : (y.cashDelta < 0 ? '-' : '+') + money(Math.abs(y.cashDelta))} · ❤️ ${sign(y.stats.health)} 😊 ${sign(y.stats.happiness)} 🧠 ${sign(y.stats.smarts)} ✨ ${sign(y.stats.looks)}${y.spent ? ' · routines cost ' + money(y.spent) : ''}` }),
    y.stops && y.stops.length ? h('div', { class: 'hint neg', text: '⏸ ' + y.stops.map((x) => x.reason).join(' ') }) : null);
}
// ---- skip ahead ----
export async function skipSheet() {
  const a = await adapter.getAutopilot(); if (!a.unlocked) { toast('Needs the Autopilot Pack or All Access', 'bad'); return; }
  const sel = new Set(a.selected); let years = 5;
  const chips = h('div', { class: 'chipbox', 'data-el': 'skip-routines', style: { display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '6px 0' } });
  const yb = h('div', { class: 'btns', 'data-el': 'skip-years', style: { flexWrap: 'wrap' } });
  const inp = h('input', { type: 'number', min: 1, max: a.maxSkip, value: years, inputmode: 'numeric', 'data-input': 'skip-years', oninput: (e) => { years = Math.max(1, Math.min(a.maxSkip, Number(e.target.value) || 1)); paint(); } });
  function paint() {
    chips.replaceChildren(...a.routines.map((r) => h('button', { class: 'qchip' + (sel.has(r.id) ? '' : ' done'), style: { minWidth: '92px', maxWidth: 'none', height: 'auto', padding: '6px 8px' }, 'data-routine': r.id, onclick: () => { sel.has(r.id) ? sel.delete(r.id) : sel.add(r.id); paint(); } }, h('span', { class: 'qi', text: sel.has(r.id) ? '✅' : '⬜' }), h('span', { class: 'ql', text: r.label }))));
    yb.replaceChildren(...[1, 2, 5, 10, 20].map((n) => btn(n + 'y', () => { years = n; inp.value = n; paint(); }, (years === n ? 'go' : 'alt') + ' sm', { 'data-years': n })));
  }
  paint();
  const body = h('div', null, h('p', { class: 'hint', text: `Pick the routines to run each year and how many years to skip (max ${a.maxSkip}). Autopilot stops early on events, illness, crises or cash below ${money(a.floor)}.` }), chips, h('div', { class: 'hint', text: 'Years to skip' }), yb, inp);
  const r = await sheet({ title: '⏩ Skip ahead', body, buttons: [{ id: 'no', label: 'Cancel', cls: 'alt' }, { id: 'go', label: 'Skip ahead', cls: 'go' }] });
  if (r === 'go') await runSkip({ years, routines: [...sel] });
}
export async function runSkip({ years, routines }) {
  let r; try { r = await adapter.skipAhead({ years, routines }); } catch (e) { console.error(e); toast('Error: ' + e.message, 'bad'); return; }
  if (!r.ok && !r.years.length) { toast(r.message || 'Could not skip', 'bad'); return; }
  if (r.entries && r.entries.length) document.dispatchEvent(new CustomEvent('journal', { detail: r.entries }));
  await refreshState(); if (store.stack.length) await rerenderTop();
  const list = h('div', { 'data-el': 'skip-summary', style: { maxHeight: '48vh', overflowY: 'auto', textAlign: 'left' } }, ...r.years.map(summaryCard), r.years.length ? null : h('p', { class: 'hint', text: 'No years were played.' }));
  const buttons = [{ id: 'ok', label: r.event ? 'Open the choice' : 'Done', cls: 'go' }];
  await sheet({ title: `Skipped ${r.done} of ${r.requested} year${r.requested === 1 ? '' : 's'}`, body: h('div', null, h('p', { class: r.stop ? 'hint neg' : 'hint', 'data-el': 'skip-stop', text: r.stop ? '⏸ Stopped: ' + r.stop.reason : '✅ Finished all requested years.' }), list), buttons, dismissable: false });
  if (r.died) document.dispatchEvent(new CustomEvent('died', { detail: r.death })); else if (r.event) document.dispatchEvent(new CustomEvent('gameevent', { detail: r.event }));
}

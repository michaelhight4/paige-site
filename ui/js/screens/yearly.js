// "Yearly actions on this page": a checklist of EVERY yearly (capped / refreshing) option the page offers. Tick the ones Autopilot should run each year.
// Ticks are the same Autopilot routines shown (by section) on the Autopilot screen.
import { adapter } from '../adapter.js';
import { h, toast, money } from '../ui.js';
export async function yearlyChecklist(body, title) {
  let y; try { y = await adapter.getYearlyOptions(title); } catch (e) { return null; } if (!y || !y.options.length) return null;
  const n = y.options.filter((o) => o.selected).length;
  const det = h('details', { class: 'card yearly', 'data-el': 'yearly', 'data-page': title, open: sessionStorage.getItem('lifesim.yearly.' + title) === '1' ? '' : null });
  det.append(h('summary', { style: { fontWeight: 800, cursor: 'pointer' }, 'data-el': 'yearly-sum', text: `🤖 Automate yearly actions (${n}/${y.options.length} ticked)` }));
  det.addEventListener('toggle', () => { try { sessionStorage.setItem('lifesim.yearly.' + title, det.open ? '1' : '0'); } catch (e) { /* ignore */ } });
  det.append(h('div', { class: 'hint', text: (y.unlocked ? '' : 'Autopilot needs the Autopilot Pack or All Access. ') + 'Tick what Autopilot should do for you every year on this page. Same costs and risks as doing it by hand.' }));
  for (const o of y.options) {
    const cb = h('input', { type: 'checkbox', 'data-yearly': o.id, checked: o.selected ? '' : null, style: { width: '22px', height: '22px', flex: '0 0 auto' }, onchange: async (e) => { await adapter.setYearlyOption(o.id, e.target.checked); const nn = det.querySelectorAll('input[type=checkbox]:checked').length; det.querySelector('[data-el=yearly-sum]').textContent = `🤖 Automate yearly actions (${nn}/${y.options.length} ticked)`; } });
    const row = h('label', { class: 'yrow', 'data-yrow': o.id, style: { display: 'flex', gap: '10px', alignItems: 'center', padding: '8px 2px', borderTop: '1px solid var(--line)' } }, cb,
      h('div', { style: { flex: 1, minWidth: 0 } }, h('div', { style: { fontWeight: 700 }, text: `${o.icon} ${o.label}` }), h('div', { class: 'hint', style: { margin: 0 }, text: o.available ? (o.cost ? 'Costs ' + money(o.cost) : 'Available now') : (o.reason || 'Not available now') })));
    det.append(row);
    if (o.choices && o.choices.length > 1) det.append(h('select', { 'data-yearly-choice': o.id, style: { margin: '0 0 6px 32px', maxWidth: 'calc(100% - 40px)', fontSize: '13px' }, onchange: (e) => adapter.setYearlyChoice(o.id, Number(e.target.value)) }, ...o.choices.map((c, i) => h('option', { value: String(i), selected: i === o.choice ? '' : null, text: c.label + (c.cost ? ' · ' + money(c.cost) : '') }))));
  }
  body.append(det); return det;
}

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
  body.append(section('Yearly routines'));
  body.append(...a.routines.map((r) => row({ id: 'routine:' + r.id, icon: r.selected ? '✅' : '⬜', title: r.label, sub: r.available ? r.desc : r.desc + ' · now: ' + r.reason, right: r.selected ? 'On' : 'Off', onClick: async () => { const sel = new Set(a.selected); sel.has(r.id) ? sel.delete(r.id) : sel.add(r.id); await adapter.setAutopilot({ routines: [...sel] }); await refresh(); } })));
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

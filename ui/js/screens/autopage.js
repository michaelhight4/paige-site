// "Autopilot this page": one toggle card on every page with yearly features. On = lock in the settings currently chosen on the page; they re-apply every year.
import { adapter } from '../adapter.js';
import { h, btn, act, toast } from '../ui.js';
export async function autoPageCard(body, id) {
  let pg; try { pg = await adapter.getAutoPage(id); } catch (e) { return null; } if (!pg) return null;
  const el = h('div', { class: 'card autopage', 'data-el': 'autopage', 'data-page': id },
    h('div', { class: 'nm', style: { fontWeight: 800 }, text: `🤖 Autopilot this page · ${pg.on ? 'ON' : 'off'}` }),
    h('div', { class: 'hint', 'data-el': 'autopage-sum', text: pg.on ? `Automating: ${pg.summary}. On since age ${pg.since}; re-applies every year with the same costs and risks.` : pg.unlocked ? (pg.available ? `Would lock in: ${pg.summary}` : 'Set this page up first, then turn this on.') : 'Needs the Autopilot Pack or All Access.' }),
    h('div', { class: 'btns' }, btn(pg.on ? 'Turn off' : 'Lock in & turn on', async () => { if (!pg.unlocked) { toast('Needs the Autopilot Pack or All Access', 'bad'); return; } await act(adapter.setAutoPage(id, !pg.on)); }, (pg.on ? 'alt' : 'go') + ' sm', { 'data-act': 'autopage-toggle', disabled: !pg.on && pg.unlocked && !pg.available ? true : null })));
  body.append(el); return el;
}

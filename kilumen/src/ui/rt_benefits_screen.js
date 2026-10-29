// RT Employee Benefits phone tab (Oct 23 2026; Gary 1:02 PM CT: "RT Employee Benifits", "build into region one on the phone").
// Installed onto the running GameUI by src/systems/rt_benefits.js (ui.js only lists the tile once ui.scr_rt_benefits exists).
// Employee ID (bare 6 digits), ID level, XP bar, points, then the node tree by branch: locked / available / owned + rank pips.
// Tap a perk: details + a Buy button (tap again or press A to buy), then a confirm. Keyboard: arrows (spatial), Z/Enter, X/Esc.
// Text: system_rt_benefits.* through ui.T (placeholders until Text Bot fills them: data/textbot_requests_rt_benefits.md).
import { MENU_ICONS } from './ui_tools2.js?v=v0.2.44-alpha';
import { employeeIdOf } from '../systems/employee_id.js?v=v0.2.44-alpha';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fill = (t, v = {}) => String(t).replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? v[k] : m));
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];

/** Placeholder text (RITA's tone). Keys mirror data/textbot_requests_rt_benefits.md. */
export const RTB_TEXT = {
  labels: {
    tab_title: 'RT Employee Benefits', employee_id: 'Employee ID', id_level: 'ID {level}', points: '{points} pts', points_one: '{points} pt', xp: 'XP',
    xp_to_next: '{into}/{span}', xp_capped: 'Region cap', buy: 'Buy rank {rank}', cancel: 'Not now', rank: 'Rank {rank}/{max}',
    cost: 'Cost: {cost} pt · Needs ID {level}', state_available: 'Available', state_owned: 'Owned', state_locked: 'Locked',
    lock_region: 'Region {region}', lock_id: 'Needs ID {level}', lock_points: 'Need {cost} pt', hint_perk: 'Perk', hint_buy: 'Details / Buy', back: 'Back',
  },
  branches: { field_logistics: 'Field Logistics', supply_pay: 'Supply & Pay', crystal_lab: 'Crystal Lab', unit_performance: 'Unit Performance' },
  nodes: {
    copay_coverage: { name: 'Copay Coverage', desc: 'We cover part of your blackout copay. Our generosity has a region lock.',
      ranks: { 1: 'Blackout copay -25%.', 2: 'Blackout copay -50%.' } },
    store_discount: { name: 'Store Discount', desc: 'Pay less at RT shops. Cheaper gear keeps company assets topped up.',
      ranks: { 1: '3% off at RT shops (stacks with staff pricing).', 2: '6% off at RT shops.', 3: '10% off at RT shops.' } },
    rt_payout: { name: 'Field Bonus', desc: 'A cut of trainer prize money, on top. Winning keeps our assets looking pricey.',
      ranks: { 1: '+10% trainer prize money.', 2: '+20% trainer prize money.', 3: '+30% trainer prize money.' } },
    crystal_grade: { name: 'Crystal Grades', desc: 'Lab-grade crystals in RT shops. Not for your current pay grade or region.',
      ranks: { 1: 'Field Crystals in RT shops.', 2: 'Prime Crystals in RT shops.', 3: 'Apex Crystals in RT shops.' } },
    unit_training: { name: 'Unit Training', desc: 'Your team learns faster. Assets that learn are worth more. To us.',
      ranks: { 1: 'Team training boost I.', 2: 'Team training boost II.' } },
    // region 2 perks (coder, Oct 23 2026): fallbacks only, Text Bot request data/textbot_requests_region2.md
    asset_logging_bonus: { name: 'Logging Bonus', desc: 'Coins for every new kind you log. We pay for assets. Not for you.',
      ranks: { 1: '+60 coins per new Kilindex log.', 2: '+120 coins per new Kilindex log.' } },
    hall_hazard_pay: { name: 'Hall Hazard Pay', desc: 'Extra prize money from hall trainers and Masters. Risk is billable.',
      ranks: { 1: '+25% hall and Master prize money.', 2: '+50% hall and Master prize money.' } },
  },
  locked: {
    region: 'Locked until Region {region}. Legal says no.', id: 'Needs ID level {level}. Keep logging assets.',
    points: 'Needs {cost} benefit point. You have {points}.', maxed: 'Fully vested. Do not ask for more.', owned_region: 'Maxed for this region. More ranks in Region {region}.',
  },
  confirm: 'Spend {cost} benefit point on {node} rank {rank}? No refunds. Company policy.',
  toast: { bought: '{node} rank {rank} filed. Asset value up. Slightly.', level_up: 'ID level {level}. +1 benefit point. Try not to waste it.',
    not_yet: '{reason}' },
};

export function installRtBenefitsScreen(ui, rt) {
  if (!ui || !rt || ui._rtbInstalled) return;
  ui._rtbInstalled = true;
  if (!MENU_ICONS.rt_benefits) MENU_ICONS.rt_benefits = 'trending-up'; // pixelarticons (already vendored)
  if (typeof document !== 'undefined' && !document.querySelector('link[data-rtb-css]')) {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = new URL('./rt_benefits.css', import.meta.url).href; l.dataset.rtbCss = '1';
    document.head.appendChild(l);
  }
  const get = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  const tx = (key, vars) => {
    const v = ui.T(`system_rt_benefits.${key}`, null);
    const s = typeof v === 'string' ? v : Array.isArray(v) ? v[0] : v?.text || v?.pages?.[0] || get(RTB_TEXT, key) || key;
    return fill(s, vars);
  };
  const nodeName = (id) => tx(`nodes.${id}.name`);
  const isTop = () => ui.active && ui.top?.scr === 'rt_benefits';

  rt.on((ev) => {
    if (ev.type === 'level' && isTop()) ui.note(tx('toast.level_up', { level: ev.level, points: ev.points }), 2600);
    if ((ev.type === 'level' || ev.type === 'xp') && isTop() && !ui.modal) ui.rerender();
  });

  ui.scr_rt_benefits = function () {
    const order = () => rt.branches.flatMap((b) => rt.nodes.filter((n) => n.branch === b.id));
    const stateLabel = (s) => (s.state === 'available' ? tx('labels.state_available') : s.state === 'owned' ? tx('labels.state_owned')
      : s.reason === 'region' ? tx('labels.lock_region', { region: s.unlockRegion }) : s.reason === 'id' ? tx('labels.lock_id', { level: s.needId }) : tx('labels.lock_points', { cost: s.cost }));
    const pips = (s) => `<span class="rtb-pips" role="img" aria-label="${esc(tx('labels.rank', { rank: s.rank, max: s.max }))}">${Array.from({ length: s.max }, (_, k) =>
      `<i class="${k < s.rank ? 'on' : k >= s.regionMax ? 'later' : ''}"></i>`).join('')}</span>`;
    const why = (s) => {
      const co = rt.company;
      if (s.state === 'owned') return s.reason === 'maxed' ? tx('locked.maxed') : tx('locked.owned_region', { region: rt.region + 1 });
      if (s.reason === 'region') return tx('locked.region', { region: s.unlockRegion });
      if (s.reason === 'id') return tx('locked.id', { level: s.needId });
      if (s.reason === 'points') return tx('locked.points', { cost: s.cost, points: co.pointsFree });
      return '';
    };
    const info = (n) => {
      if (!n) return '';
      const s = rt.state(n.id), br = rt.branches.find((b) => b.id === n.branch);
      const cur = s.rank > 0 ? tx(`nodes.${n.id}.ranks.${s.rank}`) : '', nxt = s.next ? tx(`nodes.${n.id}.ranks.${s.rank + 1}`) : '';
      return `<b class="rtb-title">${esc(nodeName(n.id))}</b>
        <p class="soft">${esc(tx(`branches.${n.branch}`) || br?.label)} · ${esc(tx('labels.rank', { rank: s.rank, max: s.max }))}</p>
        <p>${esc(tx(`nodes.${n.id}.desc`))}</p>
        ${cur ? `<p><b>${esc(ROMAN[s.rank])}:</b> ${esc(cur)}</p>` : ''}
        ${nxt && s.state !== 'owned' ? `<p><b>${esc(ROMAN[s.rank + 1])}:</b> ${esc(nxt)}</p><p class="soft">${esc(tx('labels.cost', { cost: s.cost, level: s.needId }))}</p>` : ''}
        ${s.state === 'available' ? `<button type="button" class="rtb-buy" data-act="buy">${esc(tx('labels.buy', { rank: ROMAN[s.rank + 1] }))}</button>` : `<p class="rtb-why">${esc(why(s))}</p>`}`;
    };
    const header = () => {
      const p = rt.progress();
      return `<div class="plate rtb-id">
        <span class="rtb-eid"><small>${esc(tx('labels.employee_id'))}</small><b data-rtb="eid">${esc(employeeIdOf(ui.scene))}</b></span>
        <div class="bar-row"><b>${esc(tx('labels.xp'))}</b><div class="bar xp" role="img" aria-label="${esc(`${tx('labels.xp')} ${p.xp}`)}"><i style="width:${(p.frac * 100).toFixed(1)}%"></i></div>
          <span>${esc(p.capped ? tx('labels.xp_capped') : tx('labels.xp_to_next', { into: p.xpInto, span: p.xpSpan }))}</span></div>
        <span style="display:flex;gap:6px"><span class="rtb-lv" data-rtb="lv">${esc(tx('labels.id_level', { level: p.idLevel }))}</span><span class="rtb-pts" data-rtb="pts">${esc(tx(p.points === 1 ? 'labels.points_one' : 'labels.points', { points: p.points }))}</span></span>
      </div>`;
    };
    let justSel = false;
    const scr = {
      scr: 'rt_benefits', pat: 'chevron', title: tx('labels.tab_title'), glyph: 'rt_benefits', sel: ui._rtbSel || 0, cols: 1,
      count: () => order().length,
      render: () => {
        const list = order(); let i = 0;
        if (scr.sel >= list.length) scr.sel = Math.max(0, list.length - 1);
        const tree = rt.branches.map((b) => `<section class="rtb-branch" aria-label="${esc(tx(`branches.${b.id}`) || b.label)}"><h3 class="plate dark rtb-bh">${esc(tx(`branches.${b.id}`) || b.label)}</h3>
          ${rt.nodes.filter((n) => n.branch === b.id).map((n) => { const s = rt.state(n.id), k = i++;
            return `<div class="rtb-node" data-i="${k}" data-node="${esc(n.id)}" data-state="${s.state}"><span class="rtb-nm">${esc(nodeName(n.id))}</span>${pips(s)}<span class="rtb-st">${esc(stateLabel(s))}</span></div>`; }).join('')}</section>`).join('');
        return `<div class="ui-body sys-split rtb-split"><div class="ui-panel ui-pad ui-grow ui-scroll rtb-main" data-scr="rt_benefits" data-pat="chevron">${header()}<div class="rtb-tree">${tree}</div></div>
          <div class="plate ui-pad ui-scroll sys-side rtb-info" id="rtbinfo" aria-live="polite">${info(list[scr.sel])}</div></div>`;
      },
      onSel: (i) => { ui._rtbSel = i; justSel = true; queueMicrotask(() => { justSel = false; }); const el = ui.stage?.querySelector('#rtbinfo'); if (el) el.innerHTML = info(order()[i]); },
      hint: () => ui.hintText([['▲▼◀▶', tx('labels.hint_perk')], ['A', tx('labels.hint_buy')], ['B', tx('labels.back')]]),
      onA: (i) => { if (justSel) return; buyFlow(order()[i]); }, // a tap that just moved the cursor only shows the details
      onAct: (a) => { if (a === 'buy') buyFlow(order()[scr.sel]); },
    };
    const buyFlow = async (n) => {
      if (!n || ui.modal) return;
      const s = rt.state(n.id);
      if (s.state !== 'available') { ui.note(tx('toast.not_yet', { reason: why(s) }), 2200); return; }
      const name = nodeName(n.id), rank = ROMAN[s.rank + 1];
      const k = await ui.ask('rt_benefits', [tx('confirm', { cost: s.cost, node: name, rank })], [tx('labels.buy', { rank }), tx('labels.cancel')], { pat: 'chevron' });
      if (k !== 0) { ui.rerender(); return; }
      const r = rt.buy(n.id);
      if (r.ok) {
        ui.note(tx('toast.bought', { node: name, rank: ROMAN[r.rank] }), 2400);
        try { const b = ui.root.getBoundingClientRect(); ui.sparkle(b.width / 2, b.height / 3, 12); } catch { /* fx only */ }
        ui.scene.audio?.sfx?.('select');
      }
      ui.rerender();
    };
    return scr;
  };
}

// Kilumen systems screens (systems-gd pass, Oct 22, 2026): Team (party), Pack (bag), RT Supply (shop), Heal counter.
// Installed onto the running GameUI (src/ui/ui.js, read-only here) by installSystemsScreens(ui, systems):
//   ui.scr_sys_party / scr_sys_bag / scr_sys_shop / scr_sys_heal, and (cfg.replaceUiScreens) scr_team / scr_pack / scr_shop
// point at them so the phone menu opens the real screens. Same screen-object contract as ui.js (render/onA/onTab/...).
// Text: overworld_lines.json system_party / system_shop / system_heal / comfort.bag_pockets / system_item_catalogue.
import { iconRel } from './data.js?v=v0.2.54-alpha'; // creature sync
import { ELEMENT_LABEL, statsFor } from './data.js?v=v0.2.54-alpha';
import { pxi, POCKET_ICONS, EMPTY_ICONS } from './ui_tools2.js?v=v0.2.54-alpha';
import { POCKETS } from '../systems/items.js?v=v0.2.54-alpha';
import { maxHp, maxEnergy, energyOf, xpForLevel, displayName, battleStats, speciesInfo, isFainted, needsHeal, deserialise } from '../systems/creature.js?v=v0.2.54-alpha';
import { fmtMoney } from '../systems/config.js?v=v0.2.54-alpha';
import { partyMax } from '../systems/party.js?v=v0.2.54-alpha';
import { getShops, regionOf } from '../systems/shop.js?v=v0.2.54-alpha';
import { branchByZone } from '../systems/heal.js?v=v0.2.54-alpha';
import { baseName as _baseName } from '../systems/creature.js?v=v0.2.54-alpha';
import { STAT_NAMES } from '../battle/data/creatures.js?v=v0.2.54-alpha';
const statGrid = (c) => { const st = battleStats(c); return `<div class="sys-stats"><span><b>${esc(STAT_NAMES.hp)}</b> ${c.hp}/${maxHp(c)}</span>${['atk', 'def', 'spa', 'spd', 'spe'].map((k) => `<span><b>${esc(STAT_NAMES[k])}</b> ${st[k]}</span>`).join('')}</div>`; };
// v0.2.10: name + variant mark kept together; only the name part is cut with an ellipsis, the mark and level never overlap
const nameHtml = (c) => `<span class="nmw"><span class="nmt">${esc(_baseName(c))}</span>${c?.variant ? '<span class="vmark">✦</span>' : ''}</span>`;

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const lvlOf = (f) => (f > 0.5 ? 'good' : f > 0.2 ? 'warn' : 'bad');
const elChip = (e) => `<span class="el-chip" data-el="${e}" data-pat="stripes">${esc(ELEMENT_LABEL(e))}</span>`;
// PLACEHOLDER labels until Text Bot adds system_party.status (engine status codes)
const STATUS = { brn: 'Scorched', psn: 'Queasy', tox: 'Very queasy', par: 'Jittery', slp: 'Dozing', frz: 'Frozen' };
const STATUS_PAT = { brn: 'stripes', psn: 'dots', tox: 'dots', par: 'chevron', slp: 'waves', frz: 'checker' };

let SHEET = null; // icons_sheet.json (Character models DRAFT): species -> row
async function loadSheet(cfg) {
  if (!cfg.useIconSheet) return;
  try { const j = await (await fetch(cfg.iconJson)).json(); SHEET = Object.fromEntries(j.creatures.map((c) => [c.name, c.row])); } catch { SHEET = {}; }
}
function iconHtml(c, cfg) {
  const row = SHEET?.[c.species];
  if (cfg.useIconSheet && row != null) return `<span class="sys-ico${isFainted(c) ? ' out' : ''}" style="background-image:url('${cfg.iconSheet}');--row:${row}" aria-hidden="true"></span>`;
  const rel = iconRel(c.species); // creature sync (Oct 23, 2026): synced sets have no row in the icon sheet yet
  if (rel) return `<img class="sys-ico${isFainted(c) ? ' out' : ''}" src="art/characters/pixel/${rel}" alt="" aria-hidden="true" style="image-rendering:pixelated;object-fit:contain">`;
  return `<span class="sys-ico none${isFainted(c) ? ' out' : ''}" aria-hidden="true">${esc(displayName(c).slice(0, 2))}</span>`;
}
const money = (n) => `<span class="ui-chip sys-money" title="Money"><i class="sys-purse"></i>${fmtMoney(n)}</span>`;

function bars(c, L = {}) {
  const mx = maxHp(c), f = mx ? c.hp / mx : 0, en = energyOf(c), em = maxEnergy(c);
  const ef = em.reduce((a, b) => a + b, 0) ? en.reduce((a, b) => a + b, 0) / em.reduce((a, b) => a + b, 0) : 0;
  return `<div class="bar-row"><b>HP</b><div class="bar" data-lvl="${lvlOf(f)}"><i style="width:${(f * 100).toFixed(1)}%"></i></div><span>${c.hp}/${mx}</span></div>
    <div class="bar-row sys-en"><b>${esc((L.energy || 'Energy').slice(0, 2).toUpperCase())}</b><div class="bar en" data-pat="stripes"><i style="width:${(ef * 100).toFixed(1)}%"></i></div><span>${Math.round(ef * 100)}%</span></div>`;
}
const statusChip = (c) => (isFainted(c) ? '<span class="sys-st out" data-pat="checker">Out cold</span>'
  : c.status ? `<span class="sys-st" data-st="${esc(c.status)}" data-pat="${STATUS_PAT[c.status] || 'dots'}">${esc(STATUS[c.status] || c.status)}</span>` : '');

export async function installSystemsScreens(ui, sys) {
  import('../qol/skills_menu.js?v=v0.2.54-alpha').then((m) => m.installQolSkills(ui, sys)).catch((e) => console.error('qol skills:', e)); // QoL batch B #5/#6
  if (!ui || !sys) return null;
  const cfg = sys.cfg;
  if (typeof document !== 'undefined' && !document.querySelector('link[data-sys-css]')) {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = new URL('./systems_screens.css', import.meta.url).href; l.dataset.sysCss = '1';
    document.head.appendChild(l);
  }
  await Promise.all([loadSheet(cfg), sys.ready]);
  sys.ui = ui;
  Object.defineProperty(ui, 'gold', { configurable: true, get: () => sys.wallet.coins, set: () => {} }); // phone chip shows the real wallet
  const T = (p, fb) => ui.T(p, fb), P = (p, fb, vars) => ui.P(p, fb, vars);
  const cat = () => T('system_item_catalogue', {});
  const itemName = (id) => sys.bag.nameOf(id);
  // Party source = the list the Team reorder writes to: the real party (systems.party over scene.party), or under ?uidemo
  // with no real party, ui.party() (the demo team, memory only). Demo entries are shown through full-shape copies kept per
  // entry object, so the copies follow the demo list's order and the demo objects themselves are never changed.
  const demoView = new WeakMap();
  const isDemo = () => !(sys.party?.list || sys.scene.party || []).length && !!ui.demo;
  const party = () => {
    if (!isDemo()) return sys.party?.list || sys.scene.party || [];
    return (ui.party?.() || []).map((o, i) => {
      if (!demoView.has(o)) demoView.set(o, deserialise({ ...o, level: o.level || statsFor(o, i).level }));
      return demoView.get(o);
    });
  };
  const demoOrder = (order, moved) => ui._reorderTeam(order, moved); // ui.js writes the demo list + rebuilds Team

  /** Pick a creature (field item use). -> index or -1 */
  const pickCreature = async (scr, title) => {
    const list = party(), k = await ui.ask(scr, [title], [...list.map((c) => `${displayName(c)}  ${c.hp}/${maxHp(c)}`), T('system_party.menu.labels.back', 'Back')], { pat: 'dots' });
    return k < list.length ? k : -1;
  };
  const useOn = async (scr, id, i) => {
    const c = party()[i]; if (!c) return;
    const r = sys.bag.use(id, c), name = displayName(c);
    if (r.ok) { sys.scene._dirty = true; ui.note(P(r.textKey, [`${name} perks up.`], { creature: name, item: itemName(id) })[0] || `${name} perks up.`, 2000); }
    else if (r.reason === 'out_cold') ui.note(P('system_party.out_cold', [`${name} is out cold. A carer can help.`], { creature: name })[0], 2200);
    else if (r.reason === 'rest_only') ui.note(P('system_party.item_heal.variants.rest_only', ['Energy only comes back with rest at a branch.'], { creature: name })[0], 2400);
    else ui.note(`It won't have any effect on ${name}.`, 1800);
    ui.rerender();
  };

  // ---------------- Team ----------------
  ui.scr_sys_party = function () {
    const L = T('system_party.menu.labels', {}), S = T('system_party.summary_labels.labels', {});
    const detail = (c) => {
      if (!c) return '';
      const sp = speciesInfo(c.species) || { el: ['normal'], name: c.species }, next = xpForLevel(c.level + 1), base = xpForLevel(c.level);
      const xf = c.level >= 100 ? 1 : Math.max(0, Math.min(1, (c.xp - base) / Math.max(1, next - base)));
      const en = energyOf(c), em = maxEnergy(c);
      return `<div class="sys-detail"><div class="sys-dh">${iconHtml(c, cfg)}<div><b class="nmb">${nameHtml(c)}</b> <span class="lv">${esc(S.level || 'Lv.')}${c.level}</span><div>${(sp.el || []).map(elChip).join(' ')} ${statusChip(c)}</div></div></div>
        ${bars(c, S)}<div class="bar-row"><b>XP</b><div class="bar xp"><i style="width:${(xf * 100).toFixed(1)}%"></i></div><span>${Math.round(xf * 100)}%</span></div>
        <ul class="sys-skills">${(c.skills || []).map((s, k) => `<li><span>${esc(s.replace(/_/g, ' '))}</span><span class="soft">${en[k] ?? 0}/${em[k] ?? 0}</span></li>`).join('')}</ul>${statGrid(c)}
        <div class="soft sys-small">${esc(S.met || 'Met in')}: ${esc(c.origin?.map || c.origin?.at || '—')}${c.held ? ` · ${esc(S.held || 'Holding')}: ${esc(itemName(c.held))}` : ''}</div></div>`;
    };
    const card = (c, i) => `<div class="ui-card sys-card ${i === 0 ? 'lead' : ''} ${isFainted(c) ? 'out' : ''}" data-i="${i}" data-k="${esc(c.uid)}">${iconHtml(c, cfg)}
      <div class="nm">${nameHtml(c)}<span class="lv">Lv.${c.level}</span>${i === 0 ? '<span class="sys-lead" title="Trail Buddy">Lead</span>' : ''}${statusChip(c)}</div><div>${bars(c, S)}</div></div>`;
    const scr = { scr: 'team', pat: 'dots', title: T('system_phone.menu.labels.team', 'Team'), glyph: 'team', sel: 0, cols: 1, count: () => party().length,
      chips: () => `<span class="ui-chip dark">${party().length}/${partyMax()}</span>`,
      render: () => {
        const list = party();
        if (!list.length) return `<div class="ui-panel ui-pad ui-grow" data-scr="team" data-pat="dots"><div class="plate ui-empty">${pxi(EMPTY_ICONS.team, 'pxi pxi-empty')}No creatures on your team yet.</div></div>`;
        return `<div class="ui-body sys-split"><div class="ui-panel ui-pad ui-grow ui-scroll" data-scr="team" data-pat="dots" data-scroll><div class="ui-team sys-team" data-aa="sys-team">${list.map(card).join('')}</div></div>
          <div class="plate ui-pad ui-scroll sys-side" id="sysdetail">${detail(list[scr.sel])}</div></div>`;
      },
      onSel: (i) => { const el = ui.stage.querySelector('#sysdetail'); if (el) el.innerHTML = detail(party()[i]); },
      hint: () => ui.hintText([['A', 'Choose'], ['B', 'Back']]) + (party().length > 1 ? ' &nbsp;·&nbsp; Drag to reorder' : ''),
      sortable: () => (party().length > 1 ? { el: '.sys-team', draggable: '.ui-card[data-i]', onReorder: (order, moved) => {
        if (isDemo()) { demoOrder(order, moved); return; }
        const list = party(), uids = order.map((k) => list[k]?.uid), leadBefore = list[0];
        sys.party.setOrder(uids); scr.sel = Math.max(0, order.indexOf(moved));
        if (party()[0] !== leadBefore) ui.note(P('system_party.new_lead', ['{creature} takes the lead. It looks pleased.'], { creature: displayName(party()[0]) })[0], 2200);
        ui.rerender();
      } } : null),
      onA: async (i) => {
        const c = party()[i]; if (!c) return;
        const usable = sys.bag.pocket('care').filter((it) => sys.bag.canUse(it.id, c).ok || sys.bag.canUse(it.id, c).reason === 'rest_only');
        const opts = [...(i > 0 ? [['lead', L.move || 'Move']] : []), ...(usable.length ? [['item', 'Use item']] : []), ...(isDemo() ? [] : [['rename', 'Rename']]), ...(isDemo() ? [] : (ui.qolTeamOpts?.(c) || []).map(([t, go]) => [go, t])), ['back', L.back || 'Back']]; // QoL #5/#6 rows (src/qol/skills_menu.js)
        const k = await ui.ask('team', [displayName(c)], opts.map((o) => o[1]), { pat: 'dots' });
        const act = opts[k]?.[0];
        if (typeof act === 'function') { await act(); ui.rerender(); return; }
        if (act === 'lead' && isDemo()) { await demoOrder([i, ...party().map((_, k) => k).filter((k) => k !== i)], i); return; }
        if (act === 'lead') {
          sys.party.setLead(i); scr.sel = 0;
          ui.note(P('system_party.new_lead', ['{creature} takes the lead. It looks pleased.'], { creature: displayName(c) })[0], 2200);
        } else if (act === 'rename') {
          const v = typeof prompt === 'function' ? prompt('New name (max 12 letters). Leave empty to use the species name.', c.nickname || '') : null;
          if (v !== null) {
            const nn = v.replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 12);
            c.nickname = nn || null; if (sys.scene) sys.scene._dirty = true;
            ui.note(`Now called ${displayName(c)}.`, 2000);
          }
        } else if (act === 'item') {
          const j = await ui.ask('team', ['Use which item?'], [...usable.map((it) => `${itemName(it.id)} ×${it.n}`), L.back || 'Back'], { pat: 'dots' });
          if (j < usable.length) await useOn('team', usable[j].id, i);
        }
        ui.rerender();
      },
    };
    return scr;
  };

  // ---------------- Pack ----------------
  ui.scr_sys_bag = function () {
    const PK = T('comfort.bag_pockets', {}); let pi = 0;
    const items = () => sys.bag.pocket(POCKETS[pi]).map((it) => ({ ...it, name: itemName(it.id), pages: cat()[it.id]?.pages || [] }));
    const info = (it) => (it ? `<b>${esc(it.name)}</b><p class="soft">${esc(it.pages.join(' ') || 'No description yet.')}</p>${sys.bag.def(it.id)?.field ? `<p class="sys-small">A: use on a team member</p>` : sys.bag.def(it.id)?.held ? `<p class="sys-small">A: give it to a team member to hold${(() => { const h = party().find((c) => c.held === it.id); return h ? ` (now: ${esc(displayName(h))})` : ''; })()}</p>` : ''}`
      : `<p class="soft">${esc((PK[POCKETS[pi]]?.help || []).join(' '))}</p>`);
    const scr = { scr: 'pack', pat: 'leaf', title: T('system_phone.menu.labels.pack', 'Pack'), glyph: 'pack', sel: 0, cols: 1, count: () => items().length,
      chips: () => money(sys.wallet.coins),
      render: () => {
        const l = items();
        return `<div class="ui-tabs">${POCKETS.map((p, i) => `<div class="ui-tab ${i === pi ? 'on' : ''}" data-tab="${i}">${pxi(POCKET_ICONS[p])}${esc(PK[p]?.label || p)}</div>`).join('')}</div>
        <div class="ui-body sys-split"><div class="ui-panel ui-pad ui-grow ui-scroll" data-scr="pack" data-pat="leaf" data-scroll>
          ${l.length ? `<ul class="ui-list" data-aa="sys-pack-${pi}">${l.map((it, i) => `<li class="ui-row" data-i="${i}" data-k="${esc(it.id)}"><span class="grow">${esc(it.name)}</span><span class="price">×${it.n}</span></li>`).join('')}</ul>`
            : `<div class="plate ui-empty">${pxi(EMPTY_ICONS.pack, 'pxi pxi-empty')}Nothing in this pocket yet.</div>`}</div>
          <div class="plate ui-pad sys-side" id="sysinfo">${info(l[scr.sel])}</div></div>`;
      },
      onSel: (i) => { const el = ui.stage.querySelector('#sysinfo'); if (el) el.innerHTML = info(items()[i]); },
      onTab: (t) => { pi = t; scr.sel = 0; ui.rerender(); },
      onLR: (d) => scr.onTab((pi + d + POCKETS.length) % POCKETS.length),
      hint: () => ui.hintText([['◀▶', 'Pocket'], ['A', 'Use'], ['B', 'Back']]),
      onA: async (i) => {
        const it = items()[i];
        if (it && sys.bag.def(it.id)?.held) { // held gear (Oct 29 2026): one holder at a time; picking the holder again takes it back
          const k = await pickCreature('pack', `${it.name}: who holds it?`); if (k < 0) return;
          const c = party()[k], name = displayName(c), was = c.held === it.id;
          for (const o of party()) if (o.held === it.id) o.held = null;
          if (!was) c.held = it.id;
          sys.scene._dirty = true; ui.note(was ? `${name} hands the ${it.name} back.` : `${name} is holding the ${it.name}.`, 1800); ui.rerender(); return; // PH lines (data/textbot_requests_overnight_1029.md)
        }
        if (it && await ui.qolTeach?.(it.id)) { ui.rerender(); return; } // QoL #6 Training Reels
        if (!it || !sys.bag.def(it.id)?.field) return;
        const k = await pickCreature('pack', `${it.name}: on who?`);
        if (k >= 0) await useOn('pack', it.id, k);
      },
    };
    return scr;
  };

  // ---------------- RT Supply ----------------
  ui.scr_sys_shop = function (arg = {}) {
    const M = T('system_shop.menu.labels', {}); let mode = 0;
    const shop = sys.makeShop(), region = regionOf(sys.zone);
    const list = () => (mode === 0 ? shop.stock() : shop.sellable().filter((it) => it.price != null)).map((it) => ({ ...it, name: itemName(it.id), pages: cat()[it.id]?.pages || [] }));
    const info = (it) => (it ? `<b>${esc(it.name)}</b><p class="soft">${esc(it.pages.join(' '))}</p><p class="soft">In your pack: ${sys.bag.count(it.id)}</p>` : '');
    const scr = { scr: 'shop', pat: 'awning', title: `RT Supply · ${region.city || sys.zone || ''}`, glyph: 'shop', sel: 0, cols: 1, count: () => list().length,
      chips: () => `${shop.discount ? `<span class="ui-chip sys-disc" data-pat="stripes">−${Math.round(shop.discount * 100)}%</span>` : ''}${money(sys.wallet.coins)}`,
      render: () => {
        const l = list();
        return `<div class="ui-tabs"><div class="ui-tab ${mode === 0 ? 'on' : ''}" data-tab="0">${esc(M.buy || 'Buy')}</div><div class="ui-tab ${mode === 1 ? 'on' : ''}" data-tab="1">${esc(M.sell || 'Sell')}</div></div>
        <div class="ui-body sys-split"><div class="ui-panel ui-pad ui-grow ui-scroll" data-scr="shop" data-pat="awning" data-scroll>
          ${l.length ? `<ul class="ui-list" data-aa="sys-shop-${mode}">${l.map((it, i) => `<li class="ui-row" data-i="${i}" data-k="${esc(it.id)}"><span class="grow">${esc(it.name)}</span>${it.n ? `<span class="soft">×${it.n}</span>` : ''}
            ${mode === 0 && it.base > it.price ? `<s class="soft sys-small">${fmtMoney(it.base)}</s>` : ''}<span class="price">${fmtMoney(it.price)}</span></li>`).join('')}</ul>`
            : `<div class="plate ui-empty">${pxi(EMPTY_ICONS.shop, 'pxi pxi-empty')}Nothing to sell.</div>`}</div>
          <div class="plate ui-pad sys-side" id="sysinfo">${info(l[scr.sel])}</div></div>`;
      },
      onTab: (t) => { mode = t; scr.sel = 0; ui.rerender(); },
      onLR: () => scr.onTab((mode + 1) % 2),
      onSel: (i) => { const el = ui.stage.querySelector('#sysinfo'); if (el) el.innerHTML = info(list()[i]); },
      hint: () => ui.hintText([['◀▶', `${M.buy || 'Buy'} / ${M.sell || 'Sell'}`], ['A', 'Pick'], ['B', M.done || "That's all"]]),
      onA: async (i) => {
        const it = list()[i]; if (!it) return;
        const max = mode === 0 ? shop.maxBuy(it.id) : it.n;
        if (mode === 0 && max < 1) { ui.note(P('system_shop.short', ["You're {total} short, I'm afraid."], { total: fmtMoney(it.price - sys.wallet.coins) })[0]); return; }
        const n = await ui.qty({ name: it.name, price: it.price }, max);
        if (!n) return;
        const total = fmtMoney(it.price * n);
        if (mode === 0) {
          const k = await ui.ask('shop', P('system_shop.confirm', ['{item} x{count} comes to {total}.', 'Ring it up?'], { item: it.name, count: n, total }), T('system_shop.confirm.choices', ['Ring it up', 'Never mind']), { pat: 'awning' });
          if (k !== 0) return;
          const r = shop.buy(it.id, n);
          if (r.ok) ui.note(P('system_shop.bought', ['Bagged. Pleasure doing business.'])[0]);
          else if (r.reason === 'short') ui.note(P('system_shop.short', ["You're {total} short, I'm afraid."], { total: fmtMoney(r.short) })[0]);
          else if (r.reason === 'bag_full') ui.note(P('system_shop.bag_full', ["Your {pocket} pocket can't take any more of those."], { pocket: sys.bag.pocketLabel(sys.bag.pocketOf(it.id)) })[0]);
        } else {
          const k = await ui.ask('shop', P('system_shop.sell_offer', ["I'll give you {total} for that. Deal?"], { total }), T('system_shop.sell_offer.choices', ['Deal', 'No deal']), { pat: 'awning' });
          if (k !== 0) return;
          const r = shop.sell(it.id, n);
          ui.note(r.ok ? P('system_shop.sold', ['Done. {total} for you.'], { total })[0] : P('system_shop.cant_sell', ["That's a key item. Can't take it."])[0]);
        }
        sys.scene._dirty = true; ui.rerender();
      },
      onBack: () => { ui.toastFn?.(P('system_shop.bye', ['See you.'])[0]); return true; },
    };
    if (arg.onClose) { const prev = ui._onClose; ui._onClose = () => { prev?.(); arg.onClose(); }; }
    return scr;
  };

  // ---------------- Heal counter (status board shown at the counter) ----------------
  ui.scr_sys_heal = function (arg = {}) {
    const H = T('system_heal.choices.labels', {}), b = arg.branch || branchByZone(sys.zone), region = regionOf(b?.zone);
    const shops = getShops();
    const row = (c, i) => `<div class="ui-card sys-card ${isFainted(c) ? 'out' : ''}" data-k="${esc(c.uid)}">${iconHtml(c, cfg)}<div class="nm">${nameHtml(c)}<span class="lv">Lv.${c.level}</span>${statusChip(c)}${!needsHeal(c) ? '<span class="sys-ok" data-pat="dots">Rested</span>' : ''}</div><div>${bars(c)}</div></div>`;
    const choices = [['rest', H.rest || 'Rest my team'], ['no', H.no || 'Not now']];
    const scr = { scr: 'heal', pat: 'crystal', title: `Revival Tech · ${region.city || ''}`, glyph: 'save', sel: 0, cols: 1, count: () => (arg.done ? 1 : choices.length),
      chips: () => `<span class="ui-chip dark">Copay ${fmtMoney(region.copay ?? shops.regions._default.copay)}</span>${money(sys.wallet.coins)}`,
      render: () => `<div class="ui-body sys-split"><div class="ui-panel ui-pad ui-grow ui-scroll" data-scr="heal" data-pat="crystal" data-scroll><div class="ui-team sys-team">${party().map(row).join('')}</div></div>
        <div class="plate ui-pad sys-side"><p class="soft sys-small">Last rest point: ${esc(regionOf(sys.heal.lastHeal().zone).city || sys.heal.lastHeal().map)} branch</p>
        <ul class="ui-list">${arg.done ? `<li class="ui-row" data-i="0">${esc(T('system_shop.menu.labels.done', 'OK'))}</li>` : choices.map((c, i) => `<li class="ui-row" data-i="${i}">${esc(c[1])}</li>`).join('')}</ul></div></div>`,
      hint: () => ui.hintText([['A', 'Choose'], ['B', 'Back']]),
      onA: (i) => {
        if (arg.done || choices[i][0] === 'no') { ui.back(); return; }
        sys.heal.restAt(b); arg.done = true; scr.sel = 0;
        const r = ui.root.getBoundingClientRect(); ui.sparkle?.(r.width / 2, r.height / 3, 12); ui.rerender();
      },
    };
    if (arg.onClose) { const prev = ui._onClose; ui._onClose = () => { prev?.(); arg.onClose(); }; }
    return scr;
  };

  if (cfg.replaceUiScreens) { ui.scr_team = ui.scr_sys_party; ui.scr_pack = ui.scr_sys_bag; ui.scr_shop = ui.scr_sys_shop; }
  return ui;
}

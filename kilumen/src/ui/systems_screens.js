// Kilumen systems screens (systems-gd pass, Oct 22, 2026): Team (party), Pack (bag), RT Supply (shop), Heal counter.
// Installed onto the running GameUI (src/ui/ui.js, read-only here) by installSystemsScreens(ui, systems):
//   ui.scr_sys_party / scr_sys_bag / scr_sys_shop / scr_sys_heal, and (cfg.replaceUiScreens) scr_team / scr_pack / scr_shop
// point at them so the phone menu opens the real screens. Same screen-object contract as ui.js (render/onA/onTab/...).
// Text: overworld_lines.json system_party / system_shop / system_heal / comfort.bag_pockets / system_item_catalogue.
import { iconRel } from './data.js?v=v0.2.100-alpha'; // creature sync
import { ELEMENT_LABEL, statsFor } from './data.js?v=v0.2.100-alpha';
import { pxi, POCKET_ICONS, EMPTY_ICONS } from './ui_tools2.js?v=v0.2.100-alpha';
import { POCKETS, R5_R6_ITEM_TEXT } from '../systems/items.js?v=v0.2.100-alpha';
import { coinArtOn, coinAnim } from '../achievements/coin_art.js?v=v0.2.100-alpha'; // Animator's coin art (KILUMEN_COIN_ART / ?badges=1)
import { badgesOn, renderBadges, BADGE_TAB_ICON } from '../achievements/screen.js?v=v0.2.100-alpha'; // Badges tab (globalThis.KILUMEN_BADGES_TAB)
import { maxHp, maxEnergy, energyOf, xpForLevel, displayName, battleStats, speciesInfo, isFainted, needsHeal, deserialise } from '../systems/creature.js?v=v0.2.100-alpha';
import { fmtMoney } from '../systems/config.js?v=v0.2.100-alpha';
import { partyMax } from '../systems/party.js?v=v0.2.100-alpha';
import { getShops, regionOf } from '../systems/shop.js?v=v0.2.100-alpha';
import { branchByZone } from '../systems/heal.js?v=v0.2.100-alpha';
import { baseName as _baseName } from '../systems/creature.js?v=v0.2.100-alpha';
import { STAT_NAMES } from '../battle/data/creatures.js?v=v0.2.100-alpha';
import { buildSkills, toID } from '../battle/data/skills.js?v=v0.2.100-alpha';
import { areaName } from '../overworld/area_sign.js?v=v0.2.100-alpha';
// playtest fixes 3: older saves can hold skill ids in another case/spacing ('Sparksneeze', 'spark_sneeze'); look up by toID so
// the row shows the display name ('Spark Sneeze') and its description instead of the raw id.
let _SKILLS = null; const skillDef = (id) => { const S = (_SKILLS ||= buildSkills()); return S[id] || S[toID(String(id || ''))] || null; };
const prettyId = (id) => String(id || '').replace(/_int$/, '').split('_').filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
import { giveHeld, takeHeld, swapHeld } from '../systems/held.js?v=v0.2.100-alpha'; // held items P2-P5 (Oct 29 2026)
import { HELD_DESC, HELD_LINES, charmDesc } from '../systems/data/held_text.js?v=v0.2.100-alpha';
import { HELD_BATTLE_ITEMS } from '../battle/data/held_items.js?v=v0.2.100-alpha';
import { heldIconHtml, heldIconSrc, wireHeldIcons } from './held_icons.js?v=v0.2.100-alpha'; // held-item icon on every slot (Gary, Oct 29 2026)
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
  import('../qol/skills_menu.js?v=v0.2.100-alpha').then((m) => m.installQolSkills(ui, sys)).catch((e) => console.error('qol skills:', e)); // QoL batch B #5/#6
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

  // ---------------- Held items (P2-P5, Oct 29 2026) ----------------
  // Model v2 (src/systems/held.js): giving moves one copy out of the Pack, taking puts it back. Lines are PLACEHOLDER
  // (src/systems/data/held_text.js) for Text Bot.
  const heldBadge = (c) => (wireHeldIcons(), heldIconHtml(c?.held, { name: c?.held ? itemName(c.held) : '' })); // icon + hover / long-press tip; empty socket when nothing
  const heldRow = (c, S = {}) => `<div class="sys-heldrow${c.held ? '' : ' none'}">${c.held ? heldIconHtml(c.held, { name: itemName(c.held) }) : pxi('handbag')}<span>${esc(S.held || 'Holding')}:</span> <b>${c.held ? esc(itemName(c.held)) : 'Nothing'}</b></div>`;
  const heldDesc = (id) => { const h = HELD_BATTLE_ITEMS[id]; return HELD_DESC[id] || (h?.kHeldKind === 'charm' ? charmDesc(ELEMENT_LABEL(h.kElement)) : ''); };
  const holdable = () => sys.bag.pocket('gear').filter((it) => sys.bag.def(it.id)?.held && it.n > 0);
  const elsOf = (c) => (speciesInfo(c.species)?.el || []);
  let lineN = 0;
  const line = (kind, vars) => { const L = HELD_LINES[kind] || ['']; return L[(lineN++) % L.length].replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? ''); };
  const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  /** Little creature reaction: it hops, the item pops onto it, an emote bubble shows. Reduced motion: no hop, just a fade. */
  const react = (c, kind) => {
    if (typeof document === 'undefined' || !c) return;
    const host = ui.root || document.body; host.querySelector?.('.sys-react')?.remove();
    const el = document.createElement('div');
    el.className = `sys-react k-${kind}${reduced() ? ' still' : ''}`; el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `<span class="who">${iconHtml(c, cfg)}</span><span class="it">${pxi(kind === 'take' ? 'backpack' : 'handbag')}</span><span class="emo">${kind === 'match' ? '♪' : kind === 'take' ? '…' : '!'}</span>`;
    host.appendChild(el); setTimeout(() => el.remove(), 1700);
  };
  /** Give item `id` to creature c (swaps out its old one). Shows the reaction + line. */
  const doGive = (c, id) => {
    const r = giveHeld(sys.bag, c, id), name = displayName(c), item = itemName(id);
    if (!r.ok) { if (r.reason === 'bag_full') ui.note(line('full', { item: itemName(c.held) }), 2000); else if (r.reason === 'same') ui.note(`${name} is already holding the ${item}.`, 1800); return false; }
    const h = HELD_BATTLE_ITEMS[id], match = h?.kHeldKind === 'charm' && elsOf(c).includes(h.kElement);
    const kind = r.old ? 'swap' : match ? 'match' : 'give';
    if (sys.scene) sys.scene._dirty = true;
    ui.note(line(kind, { creature: name, item, old: r.old ? itemName(r.old) : '' }), 2400); react(c, match ? 'match' : 'give');
    return true;
  };
  const doTake = (c) => {
    const r = takeHeld(sys.bag, c); if (!r.ok) { if (r.reason === 'bag_full') ui.note(line('full', { item: itemName(r.id) }), 2000); return false; }
    if (sys.scene) sys.scene._dirty = true;
    ui.note(line('take', { creature: displayName(c), item: itemName(r.id) }), 2200); react(c, 'take'); return true;
  };
  /** Team > Held item: give / swap with a teammate / take back. */
  const heldMenu = async (scr, i) => {
    const c = party()[i]; if (!c) return;
    const mates = party().filter((o, k) => k !== i && (o.held || c.held));
    const opts = [['give', c.held ? 'Swap for a Pack item' : 'Give an item'], ...(mates.length ? [['move', c.held ? 'Trade with a teammate' : 'Borrow from a teammate']] : []), ...(c.held ? [['take', 'Take it back']] : []), ['back', 'Back']];
    const k = await ui.ask(scr, [`${displayName(c)} · ${c.held ? `holding the ${itemName(c.held)}` : 'holding nothing'}`], opts.map((o) => o[1]), { pat: 'dots' });
    const act = opts[k]?.[0];
    if (act === 'give') {
      const l = holdable().filter((it) => it.id !== c.held);
      if (!l.length) { ui.note('Nothing to hold in the Gear pocket yet.', 2000); return; }
      const j = await ui.ask(scr, ['Hold which item?'], [...l.map((it) => `${itemName(it.id)} ×${it.n}`), 'Back'], { pat: 'dots' });
      if (j < l.length) doGive(c, l[j].id);
    } else if (act === 'move') {
      const j = await ui.ask(scr, ['Trade with who?'], [...mates.map((o) => `${displayName(o)} · ${o.held ? itemName(o.held) : 'nothing'}`), 'Back'], { pat: 'dots' });
      const o = mates[j]; if (!o) return;
      swapHeld(c, o); if (sys.scene) sys.scene._dirty = true;
      ui.note(c.held ? `${displayName(c)} takes the ${itemName(c.held)} from ${displayName(o)}.` : `${displayName(o)} takes the ${itemName(o.held)}.`, 2400); // PLACEHOLDER
      react(c.held ? c : o, 'give');
    } else if (act === 'take') doTake(c);
  };
  // v0.2.60: move details in Team. The energy count is labelled like the battle Skills list ("En"); the description is
  // Text Bot's system_skills.skill_desc.<id> (PH key) when written, else built from the skill's battle data.
  const skillDesc = (id, d) => {
    const t = T(`system_skills.skill_desc.${id}`, null); if (t) return Array.isArray(t) ? t.join(' ') : String(t?.pages?.join(' ') || t);
    if (!d) return '';
    const out = [`${ELEMENT_LABEL(String(d.type || 'normal').toLowerCase())} skill.`];
    if (d.basePower) out.push(`Power ${d.basePower}.`);
    const boost = (b, who) => Object.entries(b || {}).map(([k, v]) => `${STAT_NAMES[k] || (k === 'evasion' ? 'Evasion' : k)} ${v > 0 ? '+' : ''}${v}`).join(', ') + (who ? ` (${who})` : '');
    if (d.boosts) out.push(`Raises ${boost(d.boosts, d.target === 'self' ? 'self' : '')}.`);
    if (d.self?.boosts) out.push(`Then ${boost(d.self.boosts, 'self')}.`);
    if (d.heal) out.push(`Restores ${Math.round((d.heal[0] / d.heal[1]) * 100)}% HP.`);
    if (d.status) out.push(`Makes the foe ${d.status[0].toUpperCase() + d.status.slice(1)}.`);
    if (d.secondary?.status) out.push(`${d.secondary.chance}% chance to ${d.secondary.status === 'scorched' ? 'Scorch' : d.secondary.status}.`);
    if (d.priority > 0) out.push('Strikes first.'); else if (d.priority < 0) out.push('Strikes last.');
    if (typeof d.accuracy === 'number' && d.accuracy < 95) out.push(`Accuracy ${d.accuracy}%.`);
    return out.join(' ');
  };

  // ---------------- Team ----------------
  // playtest fixes 3: "Met in" shows the place's display name (not the map id) and never a bare dash: a creature with no
  // recorded map (dev-console adds, old gifts) reads as a gift, a starter without one as the player's first partner.
  const _metTitles = {};
  const metIn = (c) => {
    const id = c.origin?.map || c.origin?.at || null;
    if (!id) return c.origin?.how === 'starter' ? T('system_party.summary_labels.labels.met_starter', 'Your first partner') : T('system_party.summary_labels.labels.met_gift', 'A gift');
    if (!(id in _metTitles)) {
      const sc = ui.scene; _metTitles[id] = areaName({ name: id }, (k) => sc?.text?.(k) ?? null).title || prettyId(id);
      sc?.loadMap?.(id).then((m) => { const t = areaName(m, (k) => sc.text?.(k) ?? null).title; if (t && t !== _metTitles[id]) { _metTitles[id] = t; ui.rerender?.(); } }).catch(() => {});
    }
    return _metTitles[id];
  };
  ui.scr_sys_party = function () {
    const L = T('system_party.menu.labels', {}), S = T('system_party.summary_labels.labels', {});
    const detail = (c) => {
      if (!c) return '';
      const sp = speciesInfo(c.species) || { el: ['normal'], name: c.species }, next = xpForLevel(c.level + 1), base = xpForLevel(c.level);
      const xf = c.level >= 100 ? 1 : Math.max(0, Math.min(1, (c.xp - base) / Math.max(1, next - base)));
      const en = energyOf(c), em = maxEnergy(c);
      return `<div class="sys-detail"><div class="sys-dh">${iconHtml(c, cfg)}<div><b class="nmb">${nameHtml(c)}</b> <span class="lv">${esc(S.level || 'Lv.')}${c.level}</span><div>${(sp.el || []).map(elChip).join(' ')} ${statusChip(c)}</div></div></div>${heldRow(c, S)}
        ${bars(c, S)}<div class="bar-row"><b>XP</b><div class="bar xp"><i style="width:${(xf * 100).toFixed(1)}%"></i></div><span>${Math.round(xf * 100)}%</span></div>
        <ul class="sys-skills">${(c.skills || []).map((s, k) => { const d = skillDef(s); return `<li style="flex-wrap:wrap"><span>${esc(d?.name || prettyId(s))}</span><span class="soft">${esc(S.energy_short || 'En')} ${en[k] ?? 0}/${em[k] ?? 0}</span><span class="soft sys-small" style="flex-basis:100%;text-transform:none">${esc(skillDesc(toID(String(s || "")), d))}</span></li>`; }).join('')}</ul>${statGrid(c)}
        <div class="soft sys-small">${esc(S.met || 'Met in')}: ${esc(metIn(c))}${c.held ? ` · ${esc(S.held || 'Holding')}: ${esc(itemName(c.held))}` : ''}</div></div>`;
    };
    const card = (c, i) => `<div class="ui-card sys-card ${i === 0 ? 'lead' : ''} ${isFainted(c) ? 'out' : ''}" data-i="${i}" data-k="${esc(c.uid)}">${iconHtml(c, cfg)}
      <div class="nm">${nameHtml(c)}<span class="lv">Lv.${c.level}</span>${i === 0 ? '<span class="sys-lead" title="Trail Buddy">Lead</span>' : ''}${statusChip(c)}${heldBadge(c)}</div><div>${bars(c, S)}</div></div>`;
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
        const opts = [...(i > 0 ? [['lead', L.move || 'Move']] : []), ...(usable.length ? [['item', 'Use item']] : []), ...(isDemo() ? [] : [['held', 'Held item']]), ...(isDemo() ? [] : [['rename', 'Rename']]), ...(isDemo() ? [] : (ui.qolTeamOpts?.(c) || []).map(([t, go]) => [go, t])), ['back', L.back || 'Back']]; // QoL #5/#6 rows (src/qol/skills_menu.js)
        const k = await ui.ask('team', [displayName(c)], opts.map((o) => o[1]), { pat: 'dots' });
        const act = opts[k]?.[0];
        if (typeof act === 'function') { await act(); ui.rerender(); return; }
        if (act === 'lead' && isDemo()) { await demoOrder([i, ...party().map((_, k) => k).filter((k) => k !== i)], i); return; }
        if (act === 'lead') {
          sys.party.setLead(i); scr.sel = 0;
          ui.note(P('system_party.new_lead', ['{creature} takes the lead. It looks pleased.'], { creature: displayName(c) })[0], 2200);
        } else if (act === 'held') { await heldMenu('team', i); ui.rerender(); return;
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
    const TABS = POCKETS, isB = () => false; // v0.2.65: Badges moved out of the Pack to its own top-row menu entry (ui.scr_badges below)
    const tabLbl = (p) => `${pxi(POCKET_ICONS[p])}${esc(PK[p]?.label || p)}`;
    // v0.2.60: Masters' coins are story flags (beat_master_<zone>, src/progression/masters.js), not bag items, so the Key
    // Items pocket lists one row per earned coin from data/masters.json. Text: system_items.master_coins.<zone> (PH keys).
    // v0.2.61: items with no catalogue text yet (Text Bot placeholder keys, fallback here)
    const ITEM_FALLBACK_PAGES = { team_link_band: () => T('system_items.team_link_band.pages', ['Shares battle XP: the team earns 25% more. Give it to a creature to hold.']) };
    for (const [id, [, desc]] of Object.entries(R5_R6_ITEM_TEXT)) ITEM_FALLBACK_PAGES[id] = () => { const v = T(desc, null); return Array.isArray(v) ? v : v?.pages || null; }; // r56: system_research key cards, Ron's Umbrella, drawing, lamp
    // playtest fixes 3: an empty catalogue entry (pages: [] / '') counted as text and showed 'No description yet.'
    const nonEmpty = (p) => { const a = (Array.isArray(p) ? p : p ? [String(p)] : []).filter((x) => String(x || '').trim()); return a.length ? a : null; };
    const coinRows = () => {
      const halls = sys.scene?.progression?.masters?.halls || [], fl = sys.scene?.flags, rec = sys.state?.progression?.masters || {};
      const has = (h) => (fl?.has ? fl.has(h.flag) : false) || !!rec[h.zone];
      return halls.filter(has).sort((a, b) => a.coin_number - b.coin_number).map((h) => ({ id: `master_coin_${h.zone}`, n: 1, coin: true, zone: h.zone,
        name: T(`system_items.master_coins.${h.zone}.name`, h.reward?.coin_name_placeholder || `Coin ${h.coin_number}`),
        pages: T(`system_items.master_coins.${h.zone}.pages`, [`Master coin ${h.coin_number} of 8. Proof you beat the Master here.`]) }));
    };
    const items = () => (isB() ? [] : [...sys.bag.pocket(POCKETS[pi]).map((it) => ({ ...it, name: itemName(it.id), pages: nonEmpty(cat()[it.id]?.pages) || nonEmpty(ITEM_FALLBACK_PAGES[it.id]?.()) || (heldDesc(it.id) ? [heldDesc(it.id)] : []) })), ...(POCKETS[pi] === 'key' ? coinRows() : [])]);
    const info = (it) => (it ? `${it.coin && coinArtOn() ? `<div class="sys-coin-big">${coinAnim(it.zone)}</div>` : ''}${sys.bag.def(it.id)?.held ? `<img class="sys-held-big" src="${heldIconSrc(it.id).replace('.png', '_3x.png')}" width="48" height="48" alt="">` : ''}<b>${esc(it.name)}</b><p class="soft">${esc(it.pages.join(' ') || 'No description yet.')}</p>${sys.bag.def(it.id)?.field ? `<p class="sys-small">A: use on a team member</p>` : sys.bag.def(it.id)?.held ? `<p class="sys-small">A: give it to a team member to hold${(() => { const h = party().find((c) => c.held === it.id); return h ? ` (now: ${esc(displayName(h))})` : ''; })()}</p>` : ''}`
      : `<p class="soft">${esc((PK[POCKETS[pi]]?.help || []).join(' '))}</p>`);
    const scr = { scr: 'pack', pat: 'leaf', title: T('system_phone.menu.labels.pack', 'Pack'), glyph: 'pack', sel: 0, cols: 1, count: () => items().length,
      chips: () => money(sys.wallet.coins),
      render: () => {
        const l = items(), tabsHtml = `<div class="ui-tabs">${TABS.map((p, i) => `<div class="ui-tab ${i === pi ? 'on' : ''}" data-tab="${i}">${tabLbl(p)}</div>`).join('')}</div>`;
        if (isB()) { const b = renderBadges(sys.scene, T); b.settle(); return `${tabsHtml}<div class="ui-body">${b.html}</div>`; }
        return `${tabsHtml}
        <div class="ui-body sys-split"><div class="ui-panel ui-pad ui-grow ui-scroll" data-scr="pack" data-pat="leaf" data-scroll>
          ${l.length ? `<ul class="ui-list" data-aa="sys-pack-${pi}">${l.map((it, i) => `<li class="ui-row" data-i="${i}" data-k="${esc(it.id)}"><span class="grow">${it.coin && coinArtOn() ? coinAnim(it.zone, 'sm sys-coin-ico', i * 0.2) : ''}${sys.bag.def(it.id)?.held ? `<img class="sys-held-spr" src="${heldIconSrc(it.id)}" srcset="${heldIconSrc(it.id).replace('.png', '_2x.png')} 2x" width="16" height="16" alt="">` : ''}${esc(it.name)}</span><span class="price">×${it.n}</span></li>`).join('')}</ul>`
            : `<div class="plate ui-empty">${pxi(EMPTY_ICONS.pack, 'pxi pxi-empty')}Nothing in this pocket yet.</div>`}</div>
          <div class="plate ui-pad sys-side" id="sysinfo">${info(l[scr.sel])}</div></div>`;
      },
      onSel: (i) => { const el = ui.stage.querySelector('#sysinfo'); if (el && !isB()) el.innerHTML = info(items()[i]); },
      onTab: (t) => { pi = t; scr.sel = 0; ui.rerender(); },
      onLR: (d) => scr.onTab((pi + d + TABS.length) % TABS.length),
      hint: () => ui.hintText([['◀▶', 'Pocket'], ['A', 'Use'], ['B', 'Back']]),
      onA: async (i) => {
        const it = items()[i];
        if (it?.coin) return; // Master coins: nothing to use
        if (it && sys.bag.def(it.id)?.held) { // held gear (P2-P5, Oct 29 2026): the copy moves onto the creature; its old item comes back
          const list = party();
          const k = await ui.ask('pack', [`${it.name}: who holds it?`], [...list.map((c) => `${displayName(c)} · ${c.held ? `has ${itemName(c.held)}` : 'free'}`), T('system_party.menu.labels.back', 'Back')], { pat: 'dots' });
          if (k < list.length && doGive(list[k], it.id)) { scr.sel = Math.min(scr.sel, Math.max(0, items().length - 1)); ui.rerender(); }
          return;
        }
        if (it && await ui.qolTeach?.(it.id)) { ui.rerender(); return; } // QoL #6 Training Reels
        if (!it || !sys.bag.def(it.id)?.field) return;
        const k = await pickCreature('pack', `${it.name}: on who?`);
        if (k >= 0) await useOn('pack', it.id, k);
      },
    };
    return scr;
  };

  // ---------------- Badges (own top-row menu entry, v0.2.65; ?badges=0 removes it) ----------------
  if (badgesOn()) ui.scr_badges = function () {
    return { scr: 'badges', pat: 'sparkle', title: T('system_badges.labels.tab', 'Coins'), glyph: 'badges', sel: 0, cols: 1, count: () => 0,
      render: () => { const b = renderBadges(sys.scene, T); b.settle(); return `<div class="ui-body">${b.html}</div>`; },
      hint: () => ui.hintText([['▲▼', 'Scroll'], ['B', 'Back']]),
    };
  };
  ui.badgeIcon = BADGE_TAB_ICON;

  // ---------------- RT Supply ----------------
  ui.scr_sys_shop = function (arg = {}) {
    const M = T('system_shop.menu.labels', {}); let mode = 0;
    const shop = sys.makeShop(), region = regionOf(sys.zone);
    const list = () => (mode === 0 ? shop.stock() : shop.sellable().filter((it) => it.price != null)).map((it) => ({ ...it, name: itemName(it.id), pages: cat()[it.id]?.pages || (heldDesc(it.id) ? [heldDesc(it.id)] : []) }));
    const info = (it) => (it ? `${sys.bag.def(it.id)?.held ? `<img class="sys-held-big" src="${heldIconSrc(it.id).replace('.png', '_3x.png')}" width="48" height="48" alt="">` : ''}<b>${esc(it.name)}</b><p class="soft">${esc(it.pages.join(' '))}</p><p class="soft">In your pack: ${sys.bag.count(it.id)}</p>` : '');
    const scr = { scr: 'shop', pat: 'awning', title: `RT Stores · ${region.city || sys.zone || ''}`, glyph: 'shop', sel: 0, cols: 1, count: () => list().length,
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

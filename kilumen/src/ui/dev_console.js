// Kilumen developer console (v0.2.26), for playtest set-up: any item, any Kilumen, any coins, any ID level, and per-creature
// level / skills / evolve-now. NOT part of normal play: only dev_gate.js loads this file, and only for ?dev=1 + a signed-in site
// owner / admin. All text is in this file (Text Bot owns text/*.py and overworld_lines.json).
// Rules kept: never opens during a battle, conversation, cutscene or any save lock; holds the save lock while open (no save mid-edit),
// then releases it so the normal save runs; any change sets scene.devTouched -> save.devTouched = true (see save.js).
import { SPECIES } from './data.js?v=v0.2.76-alpha';
import { ITEMS } from '../systems/items.js?v=v0.2.76-alpha';
import { createCreature, defaultSkills, displayName, speciesName, xpForLevel, healFull, maxHp } from '../systems/creature.js?v=v0.2.76-alpha';
import { applyLearn } from '../overnight/learnsets.js?v=v0.2.76-alpha';
import { buildSkills } from '../battle/data/skills.js?v=v0.2.76-alpha';
import { buildCreatures } from '../battle/data/creatures.js?v=v0.2.76-alpha';
import { KILUMEN_RULES, VARIANT_MODS } from '../battle/data/rules.js?v=v0.2.76-alpha';
import { xpToReach, regionCap } from '../systems/rt_benefits.js?v=v0.2.76-alpha';

const CSS = `
#dv-btn { position: fixed; z-index: 40; top: calc(var(--safe-top, 0px) + 6px); left: calc(var(--safe-left, 0px) + 6px); min-width: 44px; min-height: 44px; padding: 0 12px;
  border: 2px solid #fff; border-radius: 10px; background: rgba(120, 30, 160, .85); color: #fff; font: 800 14px system-ui, sans-serif; letter-spacing: .06em; display: none; touch-action: manipulation; }
#dv-root { position: fixed; inset: 0; z-index: 50; display: none; background: rgba(8, 6, 18, .94); color: #f2eefc; font: 600 15px/1.35 system-ui, sans-serif; flex-direction: column;
  padding: calc(var(--safe-top, 0px) + 8px) calc(var(--safe-right, 0px) + 10px) 0 calc(var(--safe-left, 0px) + 10px); box-sizing: border-box; user-select: none; -webkit-user-select: none; }
#dv-root.on { display: flex; }
#dv-root * { box-sizing: border-box; }
#dv-root .dv-head { display: flex; align-items: center; gap: 8px; flex: 0 0 auto; }
#dv-root .dv-head b { flex: 1; font-size: 17px; }
#dv-root .dv-tabs { display: flex; gap: 6px; flex: 0 0 auto; margin: 8px 0 6px; overflow-x: auto; }
#dv-root button, #dv-root select, #dv-root input { font: inherit; color: inherit; }
#dv-root button { min-height: 44px; padding: 0 12px; border: 2px solid #6a5a95; border-radius: 10px; background: #2a2145; touch-action: manipulation; }
#dv-root button.on, #dv-root button[aria-pressed=true] { background: #7a3fc0; border-color: #fff; }
#dv-root button.go { background: #1f7a4a; border-color: #8be0b0; font-weight: 800; }
#dv-root button.x { background: #7a2a3a; border-color: #f0a0b0; }
#dv-root button:disabled { opacity: .45; }
#dv-root input[type=text], #dv-root input[type=search], #dv-root input[type=number], #dv-root select { width: 100%; min-height: 44px; padding: 0 10px; border: 2px solid #6a5a95; border-radius: 10px; background: #14102a; user-select: text; -webkit-user-select: text; }
#dv-root .dv-body { flex: 1 1 auto; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 4px 2px 130px; touch-action: pan-y; }
#dv-root .dv-sec { margin: 0 0 14px; padding: 10px; border: 1px solid #4a3d70; border-radius: 12px; background: rgba(40, 30, 70, .55); }
#dv-root h3 { margin: 0 0 8px; font-size: 15px; color: #d9b8ff; }
#dv-root .dv-row2 { display: flex; gap: 8px; align-items: center; margin: 8px 0; flex-wrap: wrap; }
#dv-root .dv-row2 > label { display: flex; align-items: center; gap: 6px; }
#dv-root .dv-row2 > .grow { flex: 1 1 120px; }
#dv-root .dv-list { max-height: 32vh; overflow-y: auto; margin: 8px 0; border: 1px solid #4a3d70; border-radius: 10px; -webkit-overflow-scrolling: touch; touch-action: pan-y; }
#dv-root .dv-list button { display: flex; width: 100%; justify-content: space-between; gap: 8px; border: 0; border-bottom: 1px solid #3a3060; border-radius: 0; text-align: left; background: transparent; }
#dv-root .dv-list button[aria-pressed=true] { background: #7a3fc0; }
#dv-root .dv-list small, #dv-root .dv-note { color: #b8aedb; font-weight: 500; }
#dv-root .dv-msg { position: absolute; left: 10px; right: 10px; bottom: 8px; padding: 8px 10px; border-radius: 10px; background: #14391f; border: 2px solid #8be0b0; z-index: 2; display: none; padding-right: 150px; }
#dv-root .dv-msg.bad { background: #451520; border-color: #f0a0b0; }
#dv-root .dv-msg.on { display: block; }
body.dv-open #touchpad { z-index: 51; }
body.dv-open #touchpad .dpad, body.dv-open #touchpad [data-btn=a], body.dv-open #touchpad .small { display: none !important; }
`;

const h = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'on') for (const [ev, f] of Object.entries(v)) e.addEventListener(ev, f);
    else if (k in e) e[k] = v; else e.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : String(c));
  return e;
};
const pretty = (id) => String(id).replace(/_/g, ' ').replace(/^./, (m) => m.toUpperCase());
const int = (v, lo, hi, d = lo) => { const n = Math.floor(Number(v)); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };

/** Searchable, scrollable, touch-sized list. items: [{id, label, sub, hay}]. */
function picker({ items, placeholder, limit = 40, onPick }) {
  let all = items, sel = null, q = '';
  const input = h('input', { type: 'search', placeholder, autocomplete: 'off', autocapitalize: 'off', spellcheck: false });
  const list = h('div', { class: 'dv-list', role: 'listbox' });
  const hint = h('div', { class: 'dv-note' });
  const paint = () => {
    list.textContent = '';
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const hit = all.filter((it) => words.every((w) => it.hay.includes(w)));
    for (const it of hit.slice(0, limit)) {
      list.append(h('button', { type: 'button', 'aria-pressed': sel === it.id ? 'true' : 'false', on: { click: () => { sel = it.id; paint(); onPick?.(it); } } }, h('span', {}, it.label), h('small', {}, it.sub || '')));
    }
    hint.textContent = hit.length > limit ? `${hit.length} match. Showing ${limit}. Type to narrow it down.` : hit.length ? `${hit.length} match.` : 'No match.';
  };
  input.addEventListener('input', () => { q = input.value; paint(); });
  paint();
  return { el: h('div', {}, input, list, hint), get selected() { return all.find((i) => i.id === sel) || null; }, set(items2) { all = items2; paint(); } };
}

export function mountDevConsole({ scene, ui, role = 'admin' }) {
  if (scene.__devConsole) return scene.__devConsole;
  const sys = scene.systems;
  const S = { open: false, release: null, tab: 'items', msgTimer: 0, partyUid: null, touched: false, pad: false };
  const skills = buildSkills(), creatures = buildCreatures();
  const rules = KILUMEN_RULES, maxLv = rules.maxLevel || 100;
  const VARIANTS = ['', ...Object.keys(VARIANT_MODS)];

  // ---- data lists -------------------------------------------------------------------------------------------------
  const cat = () => scene.lines?.system_item_catalogue || {};
  const itemName = (id) => sys.bag.nameOf(id) !== id ? sys.bag.nameOf(id) : pretty(id);
  let extraItemIds = [];
  const itemList = () => {
    const ids = new Set([...Object.keys(ITEMS), ...Object.keys(cat()).filter((k) => !k.startsWith('_') && cat()[k]?.pocket), ...extraItemIds, ...Object.keys(sys.bag.counts)]);
    return [...ids].filter((id) => !/^TBD/i.test(id)).map((id) => ({ id, label: itemName(id), sub: `${sys.bag.pocketLabel(sys.bag.pocketOf(id))} · have ${sys.bag.count(id)}`, hay: (itemName(id) + ' ' + id.replace(/_/g, ' ') + ' ' + sys.bag.pocketOf(id)).toLowerCase() }))
      .sort((a, b) => a.label.localeCompare(b.label));
  };
  const speciesList = () => SPECIES.map((s) => ({ id: s.id, label: s.name, sub: s.el.join('/'), hay: (s.name + ' ' + s.id + ' ' + s.el.join(' ')).toLowerCase() }));
  const skillList = () => Object.entries(skills).filter(([id]) => id !== 'struggle').map(([id, k]) => ({ id, label: k.name, sub: `${k.type}${k.basePower ? ' · power ' + k.basePower : ' · status'}`, hay: (k.name + ' ' + id + ' ' + k.type).toLowerCase() }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const skillName = (id) => skills[id]?.name || pretty(id);

  // ---- state helpers ------------------------------------------------------------------------------------------------
  const msgEl = h('div', { class: 'dv-msg', role: 'status', 'aria-live': 'polite' });
  const say = (text, bad = false) => {
    msgEl.textContent = text; msgEl.className = 'dv-msg on' + (bad ? ' bad' : '');
    clearTimeout(S.msgTimer); S.msgTimer = setTimeout(() => msgEl.classList.remove('on'), 5000);
  };
  const touch = () => { scene.devTouched = true; S.touched = true; scene._dirty = true; };
  const idCap = () => regionCap(sys.rtBenefits?.data, sys.rtBenefits?.region);

  // ---- tabs ---------------------------------------------------------------------------------------------------------
  const body = h('div', { class: 'dv-body' });
  const tabs = h('div', { class: 'dv-tabs', role: 'tablist' });
  const TABS = [['items', 'Items'], ['kilumen', 'Kilumen'], ['money', 'Coins & ID'], ['party', 'Party']];
  const showTab = (t) => {
    S.tab = t; body.textContent = ''; body.scrollTop = 0;
    for (const b of tabs.children) b.setAttribute('aria-pressed', b.dataset.tab === t ? 'true' : 'false');
    ({ items: tabItems, kilumen: tabKilumen, money: tabMoney, party: tabParty })[t]();
  };

  // ---- Items --------------------------------------------------------------------------------------------------------
  function tabItems() {
    const pk = picker({ items: itemList(), placeholder: 'Search items (name or id)' });
    const qty = h('input', { type: 'number', inputMode: 'numeric', min: 1, max: 999, value: 1 });
    const give = (n) => {
      const it = pk.selected; if (!it) return say('Pick an item first.', true);
      const r = sys.bag.add(it.id, n);
      if (r.added > 0) { touch(); say(`Added ${r.added} × ${it.label}. Now ${sys.bag.count(it.id)}.`, !r.ok); pk.set(itemList()); } else say(`${it.label}: nothing added (${sys.bag.isKey(it.id) ? 'key items hold one' : 'stack is full'}).`, true);
    };
    body.append(h('div', { class: 'dv-sec' }, h('h3', {}, 'Give an item'), pk.el,
      h('div', { class: 'dv-row2' }, h('label', { class: 'grow' }, 'Quantity', qty),
        ...[1, 5, 10, 99].map((n) => h('button', { type: 'button', on: { click: () => { qty.value = n; } } }, '×' + n)),
        h('button', { type: 'button', class: 'go', on: { click: () => give(int(qty.value, 1, 999, 1)) } }, 'Add to bag')),
      h('div', { class: 'dv-note' }, 'Key items hold one. Other items stop at 999.')));
    if (!extraItemIds.length) fetch('src/systems/data/shops.json').then((r) => r.json()).then((d) => { extraItemIds = Object.keys(d?.basePrices || {}); if (S.tab === 'items') pk.set(itemList()); }).catch(() => {});
  }

  // ---- Kilumen ------------------------------------------------------------------------------------------------------
  function tabKilumen() {
    const pk = picker({ items: speciesList(), placeholder: 'Search Kilumen (name, element)' });
    const lv = h('input', { type: 'number', inputMode: 'numeric', min: 1, max: maxLv, value: 5 });
    const vr = h('select', {}, VARIANTS.map((v) => h('option', { value: v }, v ? `✦ ${v}` : 'No variant')));
    const dex = h('input', { type: 'checkbox' });
    const give = () => {
      const it = pk.selected; if (!it) return say('Pick a Kilumen first.', true);
      const level = int(lv.value, 1, maxLv, 5), variant = vr.value;
      const c = createCreature({ species: it.id, level, variant, origin: { map: sys.scene?.map?.name || null, how: 'gift' } });
      const r = sys.party.add(c, sys.company?.idLevel || 1);
      if (r.where === 'none') return say('Party and storage are both full. Nothing added.', true);
      touch();
      if (dex.checked) sys.kilindex?.markCaught(it.id, { zone: scene.zone?.() || scene.map?.name || null, variant, skills: c.skills });
      scene.onPartyChange?.(false);
      say(`${displayName(c)} Lv.${level} added to your ${r.where === 'party' ? 'party (slot ' + (r.index + 1) + ')' : 'storage (box ' + (r.box + 1) + ')'}.`);
    };
    body.append(h('div', { class: 'dv-sec' }, h('h3', {}, 'Give a Kilumen'), pk.el,
      h('div', { class: 'dv-row2' }, h('label', { class: 'grow' }, 'Level', lv), h('label', { class: 'grow' }, 'Variant', vr)),
      h('div', { class: 'dv-row2' }, h('label', {}, dex, 'Also log it in the Kilindex')),
      h('div', { class: 'dv-row2' }, h('button', { type: 'button', class: 'go', on: { click: give } }, 'Give Kilumen')),
      h('div', { class: 'dv-note' }, `Goes to the party, or to storage when the party is full (${sys.archive?.cfg?.storageCap ?? 250} slots). It starts with its default skills at full health.`)));
  }

  // ---- Coins & ID level ----------------------------------------------------------------------------------------------
  function tabMoney() {
    const cur = h('b', {}, '');
    const amt = h('input', { type: 'number', inputMode: 'numeric', min: 0, value: 1000 });
    const paint = () => { cur.textContent = sys.wallet.coins.toLocaleString(); };
    const setCoins = (n) => { sys.wallet.n = n; touch(); paint(); say(`Coins: ${n.toLocaleString()}.`); };
    paint();
    body.append(h('div', { class: 'dv-sec' }, h('h3', {}, 'Coins'), h('div', {}, 'You have ', cur, ' coins.'),
      h('div', { class: 'dv-row2' }, h('label', { class: 'grow' }, 'Amount', amt)),
      h('div', { class: 'dv-row2' },
        h('button', { type: 'button', class: 'go', on: { click: () => setCoins(Math.min(999999999, sys.wallet.coins + int(amt.value, 0, 999999999, 0))) } }, 'Add'),
        h('button', { type: 'button', on: { click: () => setCoins(int(amt.value, 0, 999999999, 0)) } }, 'Set to this'),
        h('button', { type: 'button', class: 'x', on: { click: () => setCoins(0) } }, 'Zero'))));

    // ID level (Company ID = the game's player level)
    const rt = sys.rtBenefits, co = rt?.company || sys.company;
    if (!co) return;
    const idCur = h('b', {}), idIn = h('input', { type: 'number', inputMode: 'numeric', min: 1, max: 50, value: co.idLevel || 1 });
    const idPaint = () => { idCur.textContent = `ID ${co.idLevel || 1}`; };
    idPaint();
    const setId = () => {
      const L = int(idIn.value, 1, 50, 1), old = co.idLevel || 1;
      if (rt?.data) {
        const ppl = Math.max(0, Math.floor(Number(rt.data.pointsPerLevel ?? 1)));
        co.xp = xpToReach(rt.data, L); // XP matches the level so the game never pulls it back
        if (L > old) co.pointsFree = (co.pointsFree || 0) + ppl * (L - old);
      }
      co.idLevel = L; touch(); idPaint();
      try { rt?._emit?.({ type: 'level', level: L, points: co.pointsFree }); } catch { /* listeners are optional */ }
      say(`ID level ${old} → ${L}. Benefit points free: ${co.pointsFree ?? 0}.`);
    };
    const cap = idCap();
    body.append(h('div', { class: 'dv-sec' }, h('h3', {}, 'Player (Company ID) level'), h('div', {}, 'Now: ', idCur, co.pointsFree != null ? ` · ${co.pointsFree} benefit points free` : ''),
      h('div', { class: 'dv-row2' }, h('label', { class: 'grow' }, 'New ID level (1-50)', idIn), h('button', { type: 'button', class: 'go', on: { click: setId } }, 'Set ID level')),
      h('div', { class: 'dv-note' }, `Company XP is set to match the level. Raising it gives the usual benefit points per level. The story cap for this stage is ${cap ? 'ID ' + cap : 'not set'}, but this console can go past it.`)));
  }

  // ---- Party creature -----------------------------------------------------------------------------------------------
  function tabParty() {
    const party = sys.party.list;
    if (!party.length) { body.append(h('div', { class: 'dv-sec' }, 'No Kilumen in the party yet. Give one in the Kilumen tab.')); return; }
    if (!party.some((c) => c.uid === S.partyUid)) S.partyUid = party[0].uid;
    const c = party.find((x) => x.uid === S.partyUid);
    const pickRow = h('div', { class: 'dv-row2' }, party.map((p, i) => h('button', { type: 'button', 'aria-pressed': p.uid === c.uid ? 'true' : 'false', on: { click: () => { S.partyUid = p.uid; showTab('party'); } } }, `${i + 1}. ${displayName(p)} Lv.${p.level}`)));
    body.append(h('div', { class: 'dv-sec' }, h('h3', {}, 'Choose a party member'), pickRow));

    // level
    const lvIn = h('input', { type: 'number', inputMode: 'numeric', min: 1, max: maxLv, value: c.level });
    const setLevel = (L) => {
      L = int(L, 1, maxLv, c.level); const old = c.level;
      c.level = L; c.xp = xpForLevel(L); healFull(c); // stats are derived from level; HP / energy refilled to the new maximum
      touch(); scene.onPartyChange?.(false); say(`${displayName(c)}: Lv.${old} → Lv.${L}. HP ${c.hp}/${maxHp(c)}. Healed.`); showTab('party');
    };
    body.append(h('div', { class: 'dv-sec' }, h('h3', {}, `${displayName(c)} · ${speciesName(c.species)} · Lv.${c.level}`),
      h('div', { class: 'dv-row2' }, h('label', { class: 'grow' }, `Level (1-${maxLv})`, lvIn), h('button', { type: 'button', class: 'go', on: { click: () => setLevel(lvIn.value) } }, 'Set level')),
      h('div', { class: 'dv-row2' }, [5, 10, 20, 30, 50, maxLv].map((n) => h('button', { type: 'button', on: { click: () => setLevel(n) } }, 'Lv.' + n)),
        h('button', { type: 'button', on: { click: () => { healFull(c); touch(); say(`${displayName(c)} fully healed.`); showTab('party'); } } }, 'Full heal')),
      h('div', { class: 'dv-note' }, 'Sets level and XP together (XP = the start of that level). Stats follow the level. Skills are not changed.')));

    // skills
    const sk = picker({ items: skillList(), placeholder: 'Search skills (name, element)', limit: 30, onPick: () => paintSlots() });
    const slots = h('div', { class: 'dv-row2' });
    const learn = (slot) => {
      const it = sk.selected; if (!it) return say('Pick a skill first.', true);
      const had = c.skills.length;
      const r = applyLearn(c, it.id, slot);
      if (r.result === 'known') return say(`${displayName(c)} already knows ${it.label}.`, true);
      if (r.result === 'kept') return say('Nothing changed.', true);
      touch(); say(r.result === 'learned' ? `${displayName(c)} learned ${it.label} (slot ${had + 1}).` : `${displayName(c)}: ${skillName(r.old)} → ${it.label} (slot ${slot + 1}).`); showTab('party');
    };
    const paintSlots = () => {
      slots.textContent = '';
      c.skills.forEach((id, i) => slots.append(h('button', { type: 'button', class: 'x', on: { click: () => learn(i) } }, `Replace ${i + 1}: ${skillName(id)}`)));
      if (c.skills.length < 4) slots.append(h('button', { type: 'button', class: 'go', on: { click: () => learn(null) } }, `Add as slot ${c.skills.length + 1}`));
    };
    paintSlots();
    body.append(h('div', { class: 'dv-sec' }, h('h3', {}, 'Teach a skill'), h('div', { class: 'dv-note' }, 'Now: ' + (c.skills.map(skillName).join(', ') || 'none')), sk.el, h('div', { class: 'dv-note' }, 'Pick a skill, then pick the slot it goes in.'), slots));

    // evolve
    const targets = (creatures[c.species]?.evos || []).map((n) => SPECIES.find((s) => s.name === n)?.id).filter(Boolean);
    const sel = h('select', {}, targets.map((t) => h('option', { value: t }, speciesName(t))));
    const evo = h('button', { type: 'button', class: 'go', disabled: !targets.length, on: { click: () => evolveNow(c, sel.value) } }, targets.length ? 'Evolve now' : 'No next form');
    body.append(h('div', { class: 'dv-sec' }, h('h3', {}, 'Evolve'),
      targets.length ? h('div', { class: 'dv-row2' }, h('label', { class: 'grow' }, 'Evolve into', sel), evo) : h('div', { class: 'dv-row2' }, evo),
      h('div', { class: 'dv-note' }, 'Closes this panel and plays the normal evolution scene at any level. Name, skills, variant, warmth and level carry over like a normal evolution.')));
  }

  function evolveNow(c, to) {
    const ev = scene.evolution;
    if (!ev) return say('Evolution is switched off in this game build.', true);
    if (!to || to === c.species) return say('No form to evolve into.', true);
    touch();
    ev.queue.push({ uid: c.uid, from: c.species, to, level: c.level, force: true }); // evolution.js one(): force skips the level check, everything else is the normal path
    close();
  }

  // ---- open / close -------------------------------------------------------------------------------------------------
  const root = h('div', { id: 'dv-root', class: 'kil-devpanel', role: 'dialog', 'aria-label': 'Developer console' },
    h('div', { class: 'dv-head' }, h('b', {}, `Developer console · ${role}`), h('button', { type: 'button', 'aria-label': 'Close developer console', on: { click: () => close() } }, 'Close')),
    tabs, body, msgEl);
  for (const [id, label] of TABS) tabs.append(h('button', { type: 'button', role: 'tab', 'data-tab': id, on: { click: () => showTab(id) } }, label));
  const btn = h('button', { id: 'dv-btn', type: 'button', class: 'kil-devpanel', 'aria-label': 'Open developer console', on: { click: () => open() } }, 'DEV');
  document.head.append(h('style', { id: 'dv-style' }, CSS));
  document.body.append(root, btn);

  const canOpen = () => !S.open && !!scene.map && !scene.saveLockReason() && !scene.busy && !scene.dialog?.active && !scene.fade
    && !scene.player?.moving && !scene.player?.locked && !ui?.active && !scene.evolution?.running && !scene.evolution?.queue?.length;
  // Capture-phase key gate: while open, no key reaches the game or the phone menu (typing in the search boxes still works, only propagation stops).
  const onKey = (e) => {
    if (e.code === 'F2' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); e.stopImmediatePropagation(); if (S.open) close(); else open(); return; }
    if (!S.open) return;
    e.stopImmediatePropagation();
    if (e.code === 'Escape') { e.preventDefault(); if (!e.repeat) close(); }
  };
  window.addEventListener('keydown', onKey, true);
  const bTap = () => close();
  let raf = 0;
  const padLoop = () => { // controller B closes it too
    if (!S.open) return;
    const on = [...(navigator.getGamepads?.() || [])].some((p) => p?.buttons?.[1]?.pressed);
    if (on && !S.pad) close(); S.pad = on; raf = requestAnimationFrame(padLoop);
  };
  function open() {
    if (!canOpen()) { return; }
    S.open = true; S.touched = false;
    S.release = scene.lockSave('dev_console'); // no save while the console is open
    document.body.classList.add('dv-open');
    root.classList.add('on'); btn.style.display = 'none';
    document.querySelector('#touchpad [data-btn=b]')?.addEventListener('pointerdown', bTap);
    S.pad = true; raf = requestAnimationFrame(padLoop);
    showTab(S.tab);
  }
  function close() {
    if (!S.open) return;
    S.open = false; cancelAnimationFrame(raf);
    root.classList.remove('on'); document.body.classList.remove('dv-open'); msgEl.classList.remove('on');
    document.querySelector('#touchpad [data-btn=b]')?.removeEventListener('pointerdown', bTap);
    if (S.touched) { scene.devTouched = true; scene.onPartyChange?.(false); }
    S.release?.(); S.release = null; // the step loop writes a normal save once nothing else is locked (devTouched rides in it)
    sync();
  }
  // while open the world stands still: the game steps with no input
  const orig = scene.step.bind(scene);
  scene.step = (snap) => (S.open ? orig({ ...snap, dir: null, a: false, b: false, bTap: false, select: false }) : orig(snap));
  const sync = () => { btn.style.display = canOpen() ? 'block' : 'none'; };
  setInterval(sync, 300);
  const requestOpen = ui.requestOpen?.bind(ui);
  if (requestOpen) ui.requestOpen = (...a) => (S.open ? undefined : requestOpen(...a)); // the phone menu stays shut while this is open
  sync();
  const api = { open, close, canOpen, state: S };
  scene.__devConsole = api;
  return api;
}

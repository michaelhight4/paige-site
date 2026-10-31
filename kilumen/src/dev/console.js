// Kilumen developer console (v0.2.26, Gary). Loaded by main.js ONLY after devgate.checkDevAccess() passed: ?dev=1 + a signed-in
// admin account (server-checked admin_me). Speeds up playtesting: items, Kilumen, coins, ID level, level / skills / evolve, walk
// speed, fast travel, master key, auto-complete battle (autobattle.js) and its logs.
// Rules kept: never opens in a battle / dialogue / cutscene / fade / menu (same locks as saving); every change marks the save
// devTouched; only the Flags tab (Oct 30 2026, src/dev/flags.js) writes progress flags, on purpose (the master key is a runtime override read by the gating code, see runtime.js).
import { DEV, devWalkPace } from './runtime.js?v=v0.2.103-alpha';
import * as AB from './autobattle.js?v=v0.2.103-alpha';
import { SPECIES } from '../ui/data.js?v=v0.2.103-alpha';
import { ITEMS } from '../systems/items.js?v=v0.2.103-alpha';
import { buildSkills } from '../battle/data/skills.js?v=v0.2.103-alpha';
import { buildCreatures } from '../battle/data/creatures.js?v=v0.2.103-alpha';
import { VARIANT_MODS, KILUMEN_RULES } from '../battle/data/rules.js?v=v0.2.103-alpha';
import { createCreature, xpForLevel, healFull, speciesName, displayName, idOf, maxEnergy } from '../systems/creature.js?v=v0.2.103-alpha';
import { evoTable } from '../systems/evolution.js?v=v0.2.103-alpha';
import { xpToReach } from '../systems/rt_benefits.js?v=v0.2.103-alpha';
import { FLAG_PRESETS, setBadges, setFlagByName, applyPreset } from './flags.js?v=v0.2.103-alpha';
import { coinCount } from '../overworld/lines.js?v=v0.2.103-alpha';
import { devLandingSpot } from './landing.js?v=v0.2.103-alpha';
import { createRitaPanel } from './rita_panel.js?v=v0.2.103-alpha'; // v0.2.32: RITA voice test tab

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const MAXLV = KILUMEN_RULES?.maxLevel || 100;
const VARIANTS = Object.keys(VARIANT_MODS || {});
const MAX_ROWS = 60;
// gd bug 5: in a battle (turn-based screen or real-time) only the tabs that can't desync the fight: world speed / auto-complete / logs
export const BATTLE_TABS = ['tools'];
/** A battle is on: the ui battle screen is on the stack, or a real-time session runs (rtb/index.js RTB_STATE). */
export const battleOn = (u, k = globalThis.window?.kilumen) => !!((u?.stack || []).some((x) => x?.scr === 'battle') || k?.rtb?.active);
const TABS = [['item', 'Items'], ['mon', 'Kilumen'], ['party', 'Party'], ['money', 'Coins/ID'], ['travel', 'Travel'], ['tools', 'Tools'], ['flags', 'Flags'], ['rita', 'RITA voice']];
const CSS = `.kdev{position:fixed;inset:0;z-index:100000;background:rgba(8,10,16,.9);display:flex;align-items:stretch;justify-content:center;font:14px/1.35 system-ui,sans-serif;color:#e8ecf4;padding:max(6px,env(safe-area-inset-top)) 6px max(6px,env(safe-area-inset-bottom))}
.kdev *{box-sizing:border-box}
.kdev .box{background:#141a26;border:1px solid #3a4560;border-radius:12px;width:min(760px,100%);display:flex;flex-direction:column;overflow:hidden}
.kdev .hd{display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid #2a3348}.kdev .hd b{flex:1}
.kdev .tabs{display:flex;gap:4px;padding:6px;overflow-x:auto;border-bottom:1px solid #2a3348;flex:none}
.kdev .tabs button{flex:none}.kdev .tabs button.on{background:#3d5fb0;border-color:#7da0ff}
.kdev .body{flex:1;overflow-y:auto;padding:10px;-webkit-overflow-scrolling:touch;touch-action:pan-y;overscroll-behavior:contain}
.kdev .msg{padding:6px 10px;border-top:1px solid #2a3348;min-height:30px;color:#9fe3a8;flex:none;font-size:13px}
.kdev button,.kdev select,.kdev input{font:inherit;color:#fff;background:#27324a;border:1px solid #4a5a80;border-radius:8px;padding:8px 12px;min-height:40px}
.kdev input{background:#0e131d;min-width:0}.kdev input[type=number]{width:96px}.kdev input[type=search],.kdev input[type=text]{width:100%}
.kdev button.go{background:#2e6b43;border-color:#55b575}.kdev button.warn{background:#7a3a2e;border-color:#c97a66}.kdev button.sel{background:#3d5fb0;border-color:#7da0ff}
.kdev .row{display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #222b3d}.kdev .row .n{flex:1;min-width:0;word-break:break-word}.kdev .row small{color:#8d9ab8}
.kdev .kbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:6px 0}.kdev h4{margin:12px 0 4px;font-size:13px;color:#9db3e8}
.kdev-chip.kdev-bchip{position:fixed;top:max(8px,env(safe-area-inset-top));right:max(8px,env(safe-area-inset-right));z-index:99990}
.kdev-bmenu{position:fixed;top:56px;right:8px;z-index:99991;background:#141a26;border:1px solid #3a4560;border-radius:10px;padding:8px;display:flex;flex-direction:column;gap:6px;font:14px system-ui,sans-serif}.kdev-bmenu button{background:#24304a;color:#e8ecf4;border:1px solid #3a4560;border-radius:8px;padding:6px 10px;margin:0 2px;cursor:pointer}.kdev-bmenu button.sel{background:#3d5fb0}
.kdev-chip{position:relative;z-index:5;pointer-events:auto;touch-action:manipulation;background:#7a3a2e;color:#fff;border:1px solid #c97a66;border-radius:8px;padding:4px 10px;font:600 13px system-ui,sans-serif;min-height:44px;min-width:44px}
.kdev .box{max-height:100%}.kdev .hd [data-x]{min-width:88px;min-height:44px;font-weight:700;background:#7a3a2e;border-color:#c97a66}
.kdev button,.kdev select,.kdev input{min-height:44px;touch-action:manipulation}.kdev .tabs button{min-width:64px}
.kdev .tabs{scrollbar-width:thin;-webkit-overflow-scrolling:touch;touch-action:pan-x}
@media (max-width:560px){.kdev{padding-left:0;padding-right:0;padding-bottom:0}.kdev .box{border-radius:12px 12px 0 0}.kdev .row{flex-wrap:wrap}.kdev .row .n{flex-basis:100%}.kdev .kbar>*{flex:1 1 auto}.kdev input[type=number]{width:84px}}
@media (max-height:500px){.kdev{padding:max(2px,env(safe-area-inset-top)) max(4px,env(safe-area-inset-right)) 2px max(4px,env(safe-area-inset-left))}.kdev .hd{padding:2px 8px}.kdev .tabs{padding:3px 6px}.kdev .body{padding:6px 10px}.kdev .msg{min-height:22px;padding:2px 10px}.kdev .msg:empty{display:none}.kdev .box{width:min(980px,100%)}}`;

export async function installDevConsole(scene, access) {
  if (!scene || window.kilumen?.dev) return null;
  const sys = scene.systems;
  const ui = () => window.kilumen?.ui;
  let panel = null, inBattle = false, tab = 'item', msgEl = null, closeBlockB = false, travelling = false, selUid = null, slot = 0;
  const q = { item: '', mon: '', skill: '', travel: '' }, num = { qty: 1, lvl: 20, setLv: 20, coins: 1000, idl: 1 };
  let variant = '';
  let rita = null; // RITA voice test panel (rita_panel.js), made on first open of its tab
  let skillsData = null;
  const skillRows = () => (skillsData ||= Object.entries(buildSkills()).filter(([id]) => id !== 'struggle').map(([id, s]) => ({ id, name: s.name, type: s.type, bp: s.basePower })).sort((a, b) => a.name.localeCompare(b.name)));

  DEV.active = true;
  const touched = () => { scene.devTouched = true; scene._dirty = true; };
  const say = (t, bad) => { if (msgEl) { msgEl.textContent = t; msgEl.style.color = bad ? '#ffb0a0' : '#9fe3a8'; } };
  const party = () => sys?.party?.list || scene.party || [];
  // Playtest fix Oct 30 2026 (slot 4 level could not be set): a creature without uid rendered data-pick="" (Select did nothing)
  // and byUid(null) matched the first uid-less member. Fall back to a positional key.
  const keyOf = (c, i) => idOf(c) || `#${i ?? party().indexOf(c)}`;
  const byUid = (u) => { if (u == null) return null; const P = party(); return P.find((c, i) => keyOf(c, i) === u) || null; };

  // ---- open / close ----------------------------------------------------------------------------------------------
  const canOpen = () => {
    const u = ui();
    if (scene.saveLockReason?.() || scene.busy || scene.dialog?.active || scene.fade || u?.active || scene.evolution?.running || scene.evolution?.queue?.length || scene.player?.moving) return false;
    return !!scene.map;
  };
  const canOpenSoon = () => !!scene.map && !scene.saveLockReason?.() && !scene.busy && !scene.dialog?.active && !scene.fade; // menu closing animation may still be running
  const open = (o) => {
    if (panel) return;
    // v0.2.61: F2 / ` over the plain phone menu (e.g. left open by mashing Escape) closes it and opens the console instead of refusing
    { const u = ui(); if (u?.active && !u.modal && (u.stack || []).length === 1 && u.stack[0]?.scr === 'phone') { u.closeAll(); o = { ...(o || {}), fromMenu: true }; } }
    inBattle = battleOn(ui());
    if (inBattle) { if (!BATTLE_TABS.includes(tab)) tab = BATTLE_TABS[0]; } // gd bug 5: dev tools reachable mid-battle (battle-safe tabs only)
    else if (!canOpen() && !(o?.fromMenu && !ui()?.active && canOpenSoon())) { scene.toast?.('Dev console: not during a battle, conversation, cutscene or menu.'); return; }
    if (!document.getElementById('kdev-style')) { const s = document.createElement('style'); s.id = 'kdev-style'; s.textContent = CSS; document.head.appendChild(s); }
    panel = document.createElement('div'); panel.className = 'kdev';
    panel.innerHTML = `<div class="box"><div class="hd"><b>Dev console <small style="font-weight:400;color:#8d9ab8">${esc(access?.role || '')}</small></b><button data-x aria-label="Close dev console">✕ Close</button></div><div class="tabs"></div><div class="body"></div><div class="msg"></div></div>`;
    msgEl = panel.querySelector('.msg');
    panel.querySelector('[data-x]').onclick = close; // touch-ok: click handler; document drag guard (installDragGuard, tap_guard.js) swallows the click after a drag / hold; keeps keyboard Enter
    panel.addEventListener('keydown', (e) => e.stopPropagation()); panel.addEventListener('keyup', (e) => e.stopPropagation());
    panel.addEventListener('pointerdown', (e) => e.stopPropagation()); // touch-ok: stopPropagation guard only
    document.body.appendChild(panel); render();
  };
  // Arena playtest Oct 30 2026: focus went to <body> with the removed panel, so keys did nothing until the canvas was clicked.
  const refocus = () => { try { const cv = scene.canvas || document.querySelector('canvas'); if (!cv) return; if (!cv.hasAttribute('tabindex')) cv.setAttribute('tabindex', '0'); document.activeElement?.blur?.(); cv.focus({ preventScroll: true }); } catch { /* headless */ } };
  const close = () => { if (!panel) return; panel.remove(); panel = null; msgEl = null; closeBlockB = true; inBattle = false; refocus(); };
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && document.querySelector('.kdev-log')) return; // the log viewer closes itself (Oct 30 2026: even over the panel)
    if (panel) { if (e.code === 'Escape') { e.preventDefault(); close(); } e.stopPropagation(); return; }
    if ((e.code === 'Backquote' || e.code === 'F2') && !e.repeat && !/INPUT|TEXTAREA|SELECT/.test(e.target?.tagName || '')) { e.preventDefault(); e.stopPropagation(); open(); }
  }, true);
  // the game keeps ticking while the panel is open but gets no input; B closes it (and that press never reaches the game)
  const step = scene.step.bind(scene);
  scene.step = (snap) => {
    if (DEV.active && scene.player) devWalkPace(scene.player, DEV); // v0.2.59 / Oct 30 2026: walk follows world speed only with DEV.fastWalk (default on)
    if (panel) {
      if (snap?.b || snap?.bTap) close();
      else if (inBattle) { if (!battleOn(ui())) close(); } // battle panel: stays open over the fight, closes when it ends
      else if (scene.busy || scene.dialog?.active || scene.fade || ui()?.active) close(); // something started under us
    }
    if (panel || closeBlockB) {
      if (closeBlockB && !snap?.b && !snap?.bTap) closeBlockB = false;
      return step({ ...snap, dir: null, a: false, b: false, bTap: false, select: false, debug: false });
    }
    return step(snap);
  };
  // ---- v0.2.86-alpha world speed (1x/4x/10x/25x/100x/200x): scales the whole simulation for this admin session only ----------------
  // overworld: scene.worldSpeed = extra fixed ticks per frame (overworld.js frame, sub-stepped, so no collision skipping);
  // battle: the qol pace hook divides every battle wait; CSS / Web Animations (text reveal, UI + battle fx): playbackRate.
  // Never saved (DEV is memory-only); saving itself stays behind scene.saveLockReason (no battle / conversation / cutscene).
  const WORLD_SPEEDS = [1, 4, 10, 25, 100, 200];
  const hookPace = () => { const qq = ui()?.qol; if (!qq || qq._devWorld) return; const orig = qq.pace.bind(qq); qq.pace = (ms) => { const v = orig(ms); const w = DEV.active ? DEV.world || 1 : 1; return w > 1 ? v / w : v; }; qq._devWorld = true; };
  const pumpAnims = () => { const w = DEV.active ? DEV.world || 1 : 1; try { for (const a of document.getAnimations?.() || []) if (a.playbackRate !== w) a.playbackRate = w; } catch { /* old browser */ } };
  const setWorld = (w) => { DEV.world = WORLD_SPEEDS.includes(w) ? w : 1; scene.worldSpeed = DEV.world; hookPace(); pumpAnims(); };
  const animTimer = setInterval(() => { if ((DEV.world || 1) > 1 || animDirty) { animDirty = (DEV.world || 1) > 1; pumpAnims(); } }, 50); let animDirty = false; void animTimer;
  // HUD chip (phones have no keyboard)
  const chip = () => { const top = ui()?.hudTop; if (!top || top.querySelector('.kdev-chip')) return; if (!document.getElementById('kdev-style')) { const s = document.createElement('style'); s.id = 'kdev-style'; s.textContent = CSS; document.head.appendChild(s); }
    const b = document.createElement('button'); b.className = 'kdev-chip'; b.textContent = 'DEV'; b.setAttribute('aria-label', 'Open dev console');
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); open(); }); top.appendChild(b); }; // touch-ok: dev-only (?dev=1) floating button, not in a scroll container
  // live v0.2.93 bug 3: the HUD (and its chip) is hidden under a battle, so a battle gets its own fixed chip with a small menu:
  // Auto-complete (battle/ui_sd.js registers dev.battleAuto while a turn battle runs) and world speed. Dev session only.
  let bmenu = null;
  const bchip = () => {
    const live = !!window.kilumen?.dev?.battleAuto || battleOn(ui()); // gd bug 5: also any battle (console opens with battle-safe tabs)
    let b = document.querySelector('.kdev-bchip');
    if (!live) { b?.remove(); bmenu?.remove(); bmenu = null; return; }
    if (b) return;
    if (!document.getElementById('kdev-style')) { const s = document.createElement('style'); s.id = 'kdev-style'; s.textContent = CSS; document.head.appendChild(s); }
    b = document.createElement('button'); b.className = 'kdev-chip kdev-bchip'; b.textContent = 'DEV'; b.setAttribute('aria-label', 'Dev battle tools');
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (bmenu) { bmenu.remove(); bmenu = null; return; } // touch-ok: dev-only (?dev=1) floating button, not in a scroll container
      bmenu = document.createElement('div'); bmenu.className = 'kdev-bmenu';
      bmenu.innerHTML = `<button data-open>Dev console</button><button data-auto>Auto-complete battle</button><div>${WORLD_SPEEDS.map((n) => `<button class="${(DEV.world || 1) === n ? 'sel' : ''}" data-world="${n}">${n}x</button>`).join('')}</div>`;
      bmenu.addEventListener('pointerdown', (ev) => { ev.stopPropagation(); const a = ev.target.attributes; if (!a) return; // touch-ok: dev-only (?dev=1) popup menu, not scrollable
        if (a['data-open']) { bmenu.remove(); bmenu = null; open(); }
        else if (a['data-auto']) { touched(); window.kilumen?.dev?.battleAuto?.(); bmenu.remove(); bmenu = null; }
        else if (a['data-world']) { setWorld(Number(a['data-world'].value)); animDirty = true; bmenu.querySelectorAll('[data-world]').forEach((x) => x.classList.toggle('sel', Number(x.dataset.world) === DEV.world)); } });
      document.body.appendChild(bmenu); });
    document.body.appendChild(b);
  };
  chip(); bchip(); const chipTimer = setInterval(() => { chip(); bchip(); }, 400); void chipTimer;

  // ---- master key: water cells (Tideglide gate) are handled by map.js story gates; a block-cell WATER wrap is not needed ----
  // ---- fast-travel visited-flag cleanup: a dev warp must not leave progress ----------------------------------------
  const reg = scene.overnight?.region;
  if (reg?.onEnter) { const orig = reg.onEnter.bind(reg); reg.onEnter = (m) => { if (!travelling) return orig(m); const before = new Set(scene.flags); const r = orig(m); for (const f of [...scene.flags]) if (!before.has(f)) scene.flags.delete(f); return r; }; }

  // ---- data -------------------------------------------------------------------------------------------------------
  const itemRows = () => {
    const cat = scene.lines?.system_item_catalogue || {}, bag = sys.bag;
    const ids = [...new Set([...Object.keys(ITEMS), ...Object.keys(cat)])].filter((id) => !(ITEMS[id] && (ITEMS[id].money || ITEMS[id].pocket === null)));
    return ids.map((id) => ({ id, name: bag.nameOf(id), pocket: bag.pocketOf(id) })).sort((a, b) => a.pocket.localeCompare(b.pocket) || a.name.localeCompare(b.name));
  };
  const hit = (s, ...f) => { const t = s.trim().toLowerCase(); return !t || f.some((x) => String(x).toLowerCase().includes(t)); };
  const evoTarget = (c) => {
    const t = evoTable()[c.species]; if (t?.to) return t.to;
    const d = buildCreatures(), e = d[c.species]; if (!e?.evos?.length) return null;
    return Object.entries(d).find(([, v]) => v.name === e.evos[0])?.[0] || null;
  };

  // ---- rendering --------------------------------------------------------------------------------------------------
  const render = () => {
    if (!panel) return;
    const tabs = panel.querySelector('.tabs'); tabs.innerHTML = TABS.filter(([id]) => !inBattle || BATTLE_TABS.includes(id)).map(([id, n]) => `<button data-tab="${id}" class="${id === tab ? 'on' : ''}">${n}</button>`).join('');
    tabs.querySelectorAll('button').forEach((b) => { b.onclick = () => { tab = b.dataset.tab; render(); }; }); // touch-ok: click handler; document drag guard (installDragGuard, tap_guard.js) swallows the click after a drag / hold; keeps keyboard Enter
    const body = panel.querySelector('.body'); body.scrollTop = 0; body.className = 'body';
    ({ item: tItem, mon: tMon, party: tParty, money: tMoney, travel: tTravel, tools: tTools, flags: tFlags, rita: (b) => (rita ||= createRitaPanel({ scene, say })).render(b) })[tab](body);
  };
  const searchBox = (body, key, ph, extra = '') => {
    body.innerHTML = `<div class="kbar"><input type="search" placeholder="${esc(ph)}" value="${esc(q[key])}">${extra}</div><div data-list></div>`;
    const inp = body.querySelector('input[type=search]'); inp.oninput = () => { q[key] = inp.value; fill(); }; return inp;
  };
  let fill = () => {};
  const list = (rows, mk) => { const box = panel?.querySelector('[data-list]'); if (!box) return; const shown = rows.slice(0, MAX_ROWS); box.innerHTML = shown.map(mk).join('') + (rows.length > MAX_ROWS ? `<div class="row"><small>${rows.length - MAX_ROWS} more: type to narrow</small></div>` : '') || '<div class="row"><small>No matches</small></div>'; };

  function tItem(body) {
    searchBox(body, 'item', 'Search items (name, id, pocket)', `<label>Qty <input type="number" min="1" max="999" value="${num.qty}" data-qty></label>`);
    body.querySelector('[data-qty]').oninput = (e) => { num.qty = Math.max(1, Math.min(999, Math.floor(Number(e.target.value) || 1))); };
    const rows = itemRows();
    fill = () => { list(rows.filter((r) => hit(q.item, r.name, r.id, r.pocket)), (r) => `<div class="row"><div class="n">${esc(r.name)} <small>${esc(r.id)} · ${esc(r.pocket)} · have ${sys.bag.count(r.id)}</small></div><button class="go" data-give="${esc(r.id)}">Give</button></div>`); };
    fill();
    body.onclick = (e) => { const id = e.target.dataset?.give; if (!id) return; const r = sys.bag.add(id, num.qty); touched(); say(r.added ? `Gave ${r.added} x ${sys.bag.nameOf(id)}${r.ok ? '' : ' (stack limit reached)'}` : `Could not add ${sys.bag.nameOf(id)} (${r.reason || 'limit'})`, !r.added); fill(); }; // touch-ok: click handler; document drag guard (installDragGuard, tap_guard.js) swallows the click after a drag / hold; keeps keyboard Enter
  }

  function tMon(body) {
    const opts = VARIANTS.map((v) => `<option value="${esc(v)}" ${v === variant ? 'selected' : ''}>✦ ${esc(v)}</option>`).join('');
    searchBox(body, 'mon', 'Search Kilumen', `<label>Lv <input type="number" min="1" max="${MAXLV}" value="${num.lvl}" data-lvl></label><select data-var><option value="">no variant</option>${opts}</select>`);
    body.querySelector('[data-lvl]').oninput = (e) => { num.lvl = Math.max(1, Math.min(MAXLV, Math.floor(Number(e.target.value) || 1))); };
    body.querySelector('[data-var]').onchange = (e) => { variant = e.target.value; };
    const rows = SPECIES.map((s) => ({ id: s.id, name: s.name, el: (s.el || []).join('/') }));
    fill = () => list(rows.filter((r) => hit(q.mon, r.name, r.id, r.el)), (r) => `<div class="row"><div class="n">${esc(r.name)} <small>${esc(r.id)} · ${esc(r.el)}</small></div><button class="go" data-sp="${esc(r.id)}">Give</button></div>`);
    fill();
    body.onclick = (e) => { // touch-ok: click handler; document drag guard (installDragGuard, tap_guard.js) swallows the click after a drag / hold; keeps keyboard Enter
      const id = e.target.dataset?.sp; if (!id) return;
      const c = createCreature({ species: id, level: num.lvl, variant: variant || '', origin: { map: scene.map?.name || null, how: 'gift' } });
      const r = sys.party.add(c, sys.company?.idLevel || 1); touched(); scene.onPartyChange?.(false);
      say(r.where === 'none' ? 'Party and storage are both full (250). Nothing added.' : `Gave ${displayName(c)} Lv.${c.level} to your ${r.where === 'party' ? 'party' : 'storage'}.`, r.where === 'none');
    };
  }

  function partyRow(c, i) { const k = keyOf(c, i); return `<div class="row"><div class="n">${i + 1}. ${esc(displayName(c))} <small>${esc(speciesName(c.species))} · Lv.${c.level}</small></div><button class="${k === selUid ? 'sel' : ''}" data-pick="${esc(k)}">${k === selUid ? 'Selected' : 'Select'}</button></div>`; }
  function tParty(body) {
    const P = party(); if (!byUid(selUid)) selUid = P[0] ? keyOf(P[0], 0) : null;
    const c = byUid(selUid), sk = skillRows(), names = Object.fromEntries(sk.map((s) => [s.id, s.name]));
    let h = `<h4>Party (${P.length})</h4>${P.map(partyRow).join('') || '<div class="row"><small>Party is empty</small></div>'}`;
    if (c) {
      const target = evoTarget(c), nm = (id) => names[id] || id;
      h += `<h4>${esc(displayName(c))}  Lv.${c.level}</h4>
<div class="kbar"><label>Level <input type="number" min="1" max="${MAXLV}" value="${num.setLv}" data-setlv></label><button class="go" data-dolv>Set level</button><button data-heal>Full heal (whole party)</button></div>
<small>Setting a level sets XP to that level's start and heals. It never changes known skills.</small>
<h4>Skills (pick the slot to fill or replace)</h4><div class="kbar">${[0, 1, 2, 3].map((i) => `<button class="${slot === i ? 'sel' : ''}" data-slot="${i}">${i + 1}: ${esc(c.skills?.[i] ? nm(c.skills[i]) : '(empty)')}</button>`).join('')}</div>
<div class="kbar"><input type="search" placeholder="Search skills to teach into slot ${slot + 1}" value="${esc(q.skill)}" data-skq></div><div data-sklist></div>
<h4>Evolve</h4><div class="kbar">${target ? `<button class="warn" data-evo>Evolve now → ${esc(speciesName(target))}</button><small>Uses the normal evolution scene; nickname, skills, variant carry over.</small>` : '<small>No next form.</small>'}</div>`;
    }
    body.innerHTML = h;
    const skFill = () => { const box = body.querySelector('[data-sklist]'); if (!box) return; const rows = sk.filter((r) => hit(q.skill, r.name, r.id, r.type)).slice(0, MAX_ROWS); box.innerHTML = rows.map((r) => `<div class="row"><div class="n">${esc(r.name)} <small>${esc(r.type)}${r.bp ? ' · power ' + r.bp : ''}</small></div><button class="go" data-teach="${esc(r.id)}">Teach</button></div>`).join('') || '<div class="row"><small>No matches</small></div>'; };
    if (c) { skFill(); const si = body.querySelector('[data-skq]'); si.oninput = () => { q.skill = si.value; skFill(); }; const li = body.querySelector('[data-setlv]'); li.oninput = () => { num.setLv = Math.max(1, Math.min(MAXLV, Math.floor(Number(li.value) || 1))); }; }
    body.onclick = (e) => { // touch-ok: click handler; document drag guard (installDragGuard, tap_guard.js) swallows the click after a drag / hold; keeps keyboard Enter
      const d = e.target.dataset || {};
      if (d.pick) { selUid = d.pick; num.setLv = byUid(selUid)?.level || num.setLv; return render(); }
      if (!c) return;
      if (d.slot != null) { slot = Number(d.slot); return render(); }
      if (e.target.hasAttribute('data-dolv')) { c.level = num.setLv; c.xp = xpForLevel(c.level); healFull(c); touched(); scene.onPartyChange?.(false); say(`${displayName(c)} is now Lv.${c.level} (full heal).`); return render(); }
      if (e.target.hasAttribute('data-heal')) { const P = party(); P.forEach((x) => healFull(x)); touched(); scene.onPartyChange?.(false); say(`Whole party fully healed (${P.length}).`); return; } // v0.2.61: was the selected creature only (easy to mis-target)
      if (d.teach) {
        if (c.skills?.includes(d.teach)) return say(`${displayName(c)} already knows ${names[d.teach]}.`, true);
        c.skills ||= []; const s = Math.min(slot, c.skills.length), old = c.skills[s]; c.skills[s] = d.teach;
        if (Array.isArray(c.energy)) c.energy[s] = maxEnergy(c)[s];
        touched(); say(`${displayName(c)} learned ${names[d.teach]} in slot ${s + 1}${old ? ` (replaced ${names[old] || old})` : ''}.`); return render();
      }
      if (e.target.hasAttribute('data-evo')) {
        const to = evoTarget(c); if (!to) return;
        if (!scene.evolution?.force) return say('Evolution system is not attached.', true);
        touched(); scene.evolution.force(c, to); close(); // the normal step loop runs the evolution scene once the panel is gone
      }
    };
  }

  function tMoney(body) {
    const co = sys.company || {}, rt = sys.rtBenefits;
    const idl = rt ? rt.company.idLevel : co.idLevel;
    num.idl = idl || num.idl;
    body.innerHTML = `<h4>Coins: <span data-coins>${sys.wallet.coins}</span></h4>
<div class="kbar"><input type="number" min="0" value="${num.coins}" data-amt><button class="go" data-set>Set coins</button><button class="go" data-add>Add coins</button></div>
<h4>Company ID level: <span data-id>${idl ?? '?'}</span>${rt?.cap?.() ? ` <small>(region cap ${rt.cap()})</small>` : ''}</h4>
<div class="kbar"><input type="number" min="1" max="99" value="${num.idl}" data-idin><button class="go" data-idset>Set ID level</button></div>
<small>Raising the ID level also sets company XP to that level and grants the normal points. Lowering keeps points as they are.</small>`;
    const amt = body.querySelector('[data-amt]'); amt.oninput = () => { num.coins = Math.max(0, Math.floor(Number(amt.value) || 0)); };
    const idin = body.querySelector('[data-idin]'); idin.oninput = () => { num.idl = Math.max(1, Math.floor(Number(idin.value) || 1)); };
    const upd = () => { body.querySelector('[data-coins]').textContent = sys.wallet.coins; };
    body.onclick = (e) => { // touch-ok: click handler; document drag guard (installDragGuard, tap_guard.js) swallows the click after a drag / hold; keeps keyboard Enter
      const a = e.target.attributes;
      if (a['data-set']) { sys.wallet.n = Math.max(0, num.coins); touched(); upd(); say(`Coins set to ${sys.wallet.n}.`); }
      else if (a['data-add']) { sys.wallet.add(num.coins); touched(); upd(); say(`Added ${num.coins}. Coins: ${sys.wallet.n}.`); }
      else if (a['data-idset']) {
        const L = Math.max(1, num.idl);
        if (rt?.data) { const co = rt.company; if (L <= co.idLevel) { co.idLevel = L; co.xp = xpToReach(rt.data, L); } else { co.xp = Math.max(co.xp, xpToReach(rt.data, L)); rt.syncLevel(); } }
        else if (sys.company) sys.company.idLevel = L;
        touched(); const now = rt ? rt.company.idLevel : sys.company?.idLevel; body.querySelector('[data-id]').textContent = now; say(`ID level is now ${now}${now !== L ? ` (the region cap stopped it at ${now})` : ''}.`, now !== L);
      }
    };
  }

  // landing spot logic lives in dev/landing.js (playtest fix Oct 30 2026: never land in a sealed pocket)
  const landing = async (name) => devLandingSpot(await scene.loadMap(name), scene.layout, name);
  // v0.2.48: region-grouped, touch-friendly teleport list (Gary Oct 29 2026). Towns + areas first per region; all other built maps under "All maps".
  const TRAVEL_REGIONS = [
    ['Region 1', ['brookhollow', 'lab_brookhollow', 'office_int', 'route1', 'fernwick', 'fernwick_hall_int', 'club_int', 'thornwood', 'greystone_entrance', 'greystone_b1', 'lantern_rest']],
    ['Region 2', ['saltmere', 'saltmere_hall_int', 'saltmere_office_int', 'route_revival_saltmere', 'route_saltmere_mirefen', 'mirefen', 'mirefen_hall_int', 'mirefen_bog']],
    ['Region 3', ['revival_heights', 'revival_hall_int', 'route_revival', 'route_revival_sunmeadow', 'sunmeadow_fields', 'route_sunmeadow_mirefen']],
    ['Region 4: Frostspire', ['frostspire', 'frostspire_pass', 'frostspire_hall_int', 'frostspire_lift_int', 'frostspire_office_int', 'heal_frostspire']],
    ['Later regions', ['lanternport', 'lanternport_lighthouse_int', 'lanternport_lighthouse_f2', 'lanternport_lighthouse_f3', 'lanternport_hall_int', 'route_fernwick_lanternport', 'cindervale', 'cindervale_hall_int', 'route_cindervale', 'aurelith', 'heal_aurelith', 'aurelith_stadium_int', 'aurelith_arena', 'route_aurelith_saltmere', 'route_east', 'tidewater_coast', 'tidewater_hall_int', 'route_coast']],
  ];
  const pretty = (n) => String(n).replace(/_int$/, '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) + (/_int$/.test(n) ? ' (inside)' : '');
  function tTravel(body) {
    const built = new Set([...(scene.layout?.maps_built || []), ...(scene.knownMaps || [])]);
    const names = [...built].sort();
    searchBox(body, 'travel', `Teleport: tap a place (${names.length} maps). The master key is not needed. Save spot: ${esc(pretty((scene._devPosHold || { map: scene.map?.name || '?' }).map))}${scene._devPosHold ? ' (kept: Travel does not move it)' : ''}.`);
    const row = (n) => `<div class="row"><div class="n">${esc(pretty(n))}${scene.map?.name === n ? ' <small>(here)</small>' : ''}<br><small>${esc(n)}</small></div><button class="go" data-go="${esc(n)}">Go</button></div>`;
    fill = () => {
      const qq = q.travel; const used = new Set(); let html = '';
      for (const [title, maps] of TRAVEL_REGIONS) {
        const m = maps.filter((n) => built.has(n) && (hit(qq, n) || hit(qq, pretty(n)) || hit(qq, title)));
        m.forEach((n) => used.add(n));
        if (m.length) html += `<h4>${esc(title)}</h4>` + m.map(row).join('');
      }
      const rest = names.filter((n) => !used.has(n) && hit(qq, n));
      if (rest.length) html += `<h4>All other maps</h4>` + rest.map(row).join('');
      const lst = body.querySelector('[data-list]'); if (lst) lst.innerHTML = html || '<div class="row"><small>No matches</small></div>';
    };
    fill();
    body.onclick = async (e) => { // touch-ok: click handler; document drag guard (installDragGuard, tap_guard.js) swallows the click after a drag / hold; keeps keyboard Enter
      const n = e.target.dataset?.go; if (!n) return;
      say(`Finding a spot in ${n}…`);
      try {
        const spot = await landing(n); if (!spot) return say(`No walkable spot found in ${n}.`, true);
        if (!scene._devPosHold && scene.map && !scene.fade) scene._devPosHold = { map: scene.map.name, x: scene.player.x, y: scene.player.y, facing: scene.player.facing }; // bug 7: keep the real save spot
        travelling = true; touched();
        const ar = /^aurelith_arena_room_(\d+)$/.exec(n); // Arena playtest Oct 30 2026: a room you warp into is playable (rooms before it won this run)
        if (ar) { const A = await import('../region78/arena.js?v=v0.2.103-alpha'), want = new Set(A.runFlagsAt(+ar[1]));
          for (const fl of A.runFlags()) if (want.has(fl) !== scene.flags.has(fl)) scene.setFlag ? scene.setFlag(fl, want.has(fl)) : want.has(fl) ? scene.flags.add(fl) : scene.flags.delete(fl); }
        close();
        scene.startWarp({ map: n, x: spot.x, y: spot.y, facing: spot.facing }, 'dev');
        const t0 = performance.now(); const iv = setInterval(() => { if ((!scene.fade && scene.map?.name === n) || performance.now() - t0 > 8000) { clearInterval(iv); travelling = false; } }, 100);
      } catch (err) { travelling = false; say('Travel failed: ' + (err?.message || err), true); }
    };
  }

  // ---- Flags (Oct 30 2026): Master coins 0-8, any story flag by name, presets. Admin dev session only (devgate). ----
  function tFlags(body) {
    const fl = (num.flag ??= '');
    body.innerHTML = `<h4>Master coins / badges: <span data-cc>${coinCount(scene.flags)}</span> / 8</h4>
<div class="kbar">${[0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => `<button class="go" data-badges="${n}">${n}</button>`).join('')}</div>
<small>Sets beat_master_&lt;hall&gt; for the first N halls in hall order and clears the rest.</small>
<h4>Story flag</h4><div class="kbar"><input type="text" placeholder="flag_name" spellcheck="false" autocomplete="off" value="${esc(fl)}" data-flag><button class="go" data-fset>Set</button><button data-fclear>Clear</button></div>
<small data-fstate></small>
<h4>Presets</h4><div class="kbar">${Object.entries(FLAG_PRESETS).map(([id, p]) => `<button class="go" data-preset="${id}">${esc(p.label)}</button>`).join('')}</div>
<small>Flags are real progress: the save is marked devTouched.</small>`;
    const inp = body.querySelector('[data-flag]'), st = body.querySelector('[data-fstate]');
    const look = () => { const f = inp.value.trim(); st.textContent = f ? `${f}: ${scene.flags.has(f) ? 'SET' : 'not set'}` : ''; };
    inp.oninput = () => { num.flag = inp.value; look(); }; look();
    const done = (r, what) => { if (!r.ok) return say(r.why, true); touched(); body.querySelector('[data-cc]').textContent = coinCount(scene.flags); look(); say(what); };
    body.onclick = (e) => { // touch-ok: click handler; document drag guard (installDragGuard, tap_guard.js) swallows the click after a drag / hold; keeps keyboard Enter
      const a = e.target.attributes;
      if (a['data-badges']) { const n = Number(a['data-badges'].value); setBadges(scene, n); done({ ok: true }, `Master coins: ${n}.`); }
      else if (a['data-fset']) done(setFlagByName(scene, inp.value, true), `Set ${inp.value.trim()}.`);
      else if (a['data-fclear']) done(setFlagByName(scene, inp.value, false), `Cleared ${inp.value.trim()}.`);
      else if (a['data-preset']) { const id = a['data-preset'].value; done(applyPreset(scene, id), `${FLAG_PRESETS[id].label}: done.`); }
    };
  }

  function tTools(body) {
    const logs = AB.logs.slice().reverse();
    body.innerHTML = `<h4>World speed (whole game: movement, timers, text, animations, battles)</h4><div class="kbar">${WORLD_SPEEDS.map((n) => `<button class="${(DEV.world || 1) === n ? 'sel' : ''}" data-world="${n}">${n}x</button>`).join('')}</div><div class="kbar"><button class="${scene.worldClockFast ? 'sel' : ''}" data-wclock="1">Fast clock with world speed: ${scene.worldClockFast ? 'ON' : 'OFF'}</button></div>
<small>Dev session only, never saved. Movement is sub-stepped, so collisions hold at 100x. Saving stays blocked in battles, conversations and cutscenes.</small>
<h4>Walk speed (only while dev mode is on)</h4><div class="kbar"><button class="${DEV.fastWalk !== false ? 'sel' : ''}" data-fastwalk="1">Walk at world speed: ${DEV.fastWalk !== false ? 'ON' : 'OFF'}</button></div><div class="kbar">${[1, 2, 4].map((n) => `<button class="${DEV.speed === n ? 'sel' : ''}" data-speed="${n}">${n}x</button>`).join('')}</div>
<h4>Master key</h4><div class="kbar"><button class="${DEV.masterKey ? 'sel warn' : ''}" data-mk>${DEV.masterKey ? 'ON: all progression locks bypassed' : 'OFF'}</button></div>
<small>While ON, story gates, blocked exits / TO COME exits to built maps, locked staff doors, the hall Master requirement, the intro walls and the early-access notice are bypassed. It is a runtime override only: no badges or story flags are written, and turning it OFF restores the real locks. Saves made after using it are marked devTouched.</small>
<h4>Auto-complete battle</h4><div class="kbar"><label><input type="checkbox" data-cr ${AB.options.useCrystals ? 'checked' : ''}> use crystals on weak wild foes</label></div>
<small>In a battle the "Auto-complete" command plays it out with the normal rules and rolls, then the usual end-of-battle flow runs.</small>
<h4>Last battle logs (${logs.length}/20)</h4>${logs.map((l, i) => `<div class="row"><div class="n">${esc(l.title)} · ${esc(String(l.outcome).toUpperCase())} · ${l.turns} turns<br><small>${esc(l.at)}</small></div><button data-log="${i}">View</button></div>`).join('') || '<div class="row"><small>No logs yet</small></div>'}
<h4>Save</h4><small>Save marker: ${scene.devTouched || DEV.masterKey ? 'devTouched is set on this save' : 'not set yet (any console change sets it)'}</small>`;
    body.onclick = (e) => { // touch-ok: click handler; document drag guard (installDragGuard, tap_guard.js) swallows the click after a drag / hold; keeps keyboard Enter
      const a = e.target.attributes;
      if (a['data-wclock']) { scene.worldClockFast = !scene.worldClockFast; say(`Fast clock ${scene.worldClockFast ? 'on' : 'off'}.`); render(); }
      else if (a['data-world']) { setWorld(Number(a['data-world'].value)); animDirty = true; say(`World speed ${DEV.world}x.`); render(); }
      else if (a['data-fastwalk']) { DEV.fastWalk = DEV.fastWalk === false; devWalkPace(scene.player, DEV); say(`Walk at world speed ${DEV.fastWalk ? 'on' : 'off'}.`); render(); }
      else if (a['data-speed']) { DEV.speed = Number(a['data-speed'].value); devWalkPace(scene.player, DEV); say(`Walk speed ${DEV.speed}x.`); render(); }
      else if (a['data-mk']) { DEV.masterKey = !DEV.masterKey; if (DEV.masterKey) touched(); say(DEV.masterKey ? 'Master key ON.' : 'Master key OFF. Real locks are back.'); render(); }
      else if (a['data-log']) { const l = logs[Number(a['data-log'].value)]; if (l) { if (!l.text) l.text = l.lines.join('\n'); close(); AB.showLog(l); } } // Oct 30 2026: close the panel first, it ate every key while the log sat on top
    };
    const cr = body.querySelector('[data-cr]'); cr.onchange = () => { AB.options.useCrystals = cr.checked; };
  }

  window.kilumen.dev = { active: true, role: access?.role, open, close, rita: () => (rita ||= createRitaPanel({ scene, say })), flags: DEV, setWorldSpeed: setWorld, worldSpeeds: WORLD_SPEEDS, logs: AB.logs, autobattle: AB };
  console.info('Kilumen dev console ready: press ` or F2, or tap DEV.');
  return window.kilumen.dev;
}

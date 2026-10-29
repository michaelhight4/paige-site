// Kilumen developer console (v0.2.26, Gary). Loaded by main.js ONLY after devgate.checkDevAccess() passed: ?dev=1 + a signed-in
// admin account (server-checked admin_me). Speeds up playtesting: items, Kilumen, coins, ID level, level / skills / evolve, walk
// speed, fast travel, master key, auto-complete battle (autobattle.js) and its logs.
// Rules kept: never opens in a battle / dialogue / cutscene / fade / menu (same locks as saving); every change marks the save
// devTouched; nothing here writes progress flags (the master key is a runtime override read by the gating code, see runtime.js).
import { DEV } from './runtime.js?v=v0.2.45-alpha';
import * as AB from './autobattle.js?v=v0.2.45-alpha';
import { SPECIES } from '../ui/data.js?v=v0.2.45-alpha';
import { ITEMS } from '../systems/items.js?v=v0.2.45-alpha';
import { buildSkills } from '../battle/data/skills.js?v=v0.2.45-alpha';
import { buildCreatures } from '../battle/data/creatures.js?v=v0.2.45-alpha';
import { VARIANT_MODS, KILUMEN_RULES } from '../battle/data/rules.js?v=v0.2.45-alpha';
import { createCreature, xpForLevel, healFull, speciesName, displayName, idOf, maxEnergy } from '../systems/creature.js?v=v0.2.45-alpha';
import { evoTable } from '../systems/evolution.js?v=v0.2.45-alpha';
import { xpToReach } from '../systems/rt_benefits.js?v=v0.2.45-alpha';
import { createRitaPanel } from './rita_panel.js?v=v0.2.45-alpha'; // v0.2.32: RITA voice test tab

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const MAXLV = KILUMEN_RULES?.maxLevel || 100;
const VARIANTS = Object.keys(VARIANT_MODS || {});
const MAX_ROWS = 60;
const TABS = [['item', 'Items'], ['mon', 'Kilumen'], ['party', 'Party'], ['money', 'Coins/ID'], ['travel', 'Travel'], ['tools', 'Tools'], ['rita', 'RITA voice']];
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
.kdev-chip{position:relative;z-index:5;pointer-events:auto;touch-action:manipulation;background:#7a3a2e;color:#fff;border:1px solid #c97a66;border-radius:8px;padding:4px 10px;font:600 12px system-ui,sans-serif;min-height:30px}`;

export async function installDevConsole(scene, access) {
  if (!scene || window.kilumen?.dev) return null;
  const sys = scene.systems;
  const ui = () => window.kilumen?.ui;
  let panel = null, tab = 'item', msgEl = null, closeBlockB = false, travelling = false, selUid = null, slot = 0;
  const q = { item: '', mon: '', skill: '', travel: '' }, num = { qty: 1, lvl: 20, setLv: 20, coins: 1000, idl: 1 };
  let variant = '';
  let rita = null; // RITA voice test panel (rita_panel.js), made on first open of its tab
  let skillsData = null;
  const skillRows = () => (skillsData ||= Object.entries(buildSkills()).filter(([id]) => id !== 'struggle').map(([id, s]) => ({ id, name: s.name, type: s.type, bp: s.basePower })).sort((a, b) => a.name.localeCompare(b.name)));

  DEV.active = true;
  const touched = () => { scene.devTouched = true; scene._dirty = true; };
  const say = (t, bad) => { if (msgEl) { msgEl.textContent = t; msgEl.style.color = bad ? '#ffb0a0' : '#9fe3a8'; } };
  const party = () => sys?.party?.list || scene.party || [];
  const byUid = (u) => party().find((c) => idOf(c) === u) || null;

  // ---- open / close ----------------------------------------------------------------------------------------------
  const canOpen = () => {
    const u = ui();
    if (scene.saveLockReason?.() || scene.busy || scene.dialog?.active || scene.fade || u?.active || scene.evolution?.running || scene.evolution?.queue?.length || scene.player?.moving) return false;
    return !!scene.map;
  };
  const open = () => {
    if (panel) return;
    if (!canOpen()) { scene.toast?.('Dev console: not during a battle, conversation, cutscene or menu.'); return; }
    if (!document.getElementById('kdev-style')) { const s = document.createElement('style'); s.id = 'kdev-style'; s.textContent = CSS; document.head.appendChild(s); }
    panel = document.createElement('div'); panel.className = 'kdev';
    panel.innerHTML = `<div class="box"><div class="hd"><b>Dev console <small style="font-weight:400;color:#8d9ab8">${esc(access?.role || '')}</small></b><button data-x>Close (B / Esc)</button></div><div class="tabs"></div><div class="body"></div><div class="msg"></div></div>`;
    msgEl = panel.querySelector('.msg');
    panel.querySelector('[data-x]').onclick = close;
    panel.addEventListener('keydown', (e) => e.stopPropagation()); panel.addEventListener('keyup', (e) => e.stopPropagation());
    panel.addEventListener('pointerdown', (e) => e.stopPropagation());
    document.body.appendChild(panel); render();
  };
  const close = () => { if (!panel) return; panel.remove(); panel = null; msgEl = null; closeBlockB = true; };
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && !panel && document.querySelector('.kdev-log')) return; // the log viewer closes itself
    if (panel) { if (e.code === 'Escape') { e.preventDefault(); close(); } e.stopPropagation(); return; }
    if ((e.code === 'Backquote' || e.code === 'F2') && !e.repeat && !/INPUT|TEXTAREA|SELECT/.test(e.target?.tagName || '')) { e.preventDefault(); e.stopPropagation(); open(); }
  }, true);
  // the game keeps ticking while the panel is open but gets no input; B closes it (and that press never reaches the game)
  const step = scene.step.bind(scene);
  scene.step = (snap) => {
    if (DEV.active && scene.player) scene.player.speedMultiplier = DEV.speed || 1;
    if (panel) {
      if (snap?.b || snap?.bTap) close();
      else if (scene.busy || scene.dialog?.active || scene.fade || ui()?.active) close(); // something started under us
    }
    if (panel || closeBlockB) {
      if (closeBlockB && !snap?.b && !snap?.bTap) closeBlockB = false;
      return step({ ...snap, dir: null, a: false, b: false, bTap: false, select: false, debug: false });
    }
    return step(snap);
  };
  // HUD chip (phones have no keyboard)
  const chip = () => { const top = ui()?.hudTop; if (!top || top.querySelector('.kdev-chip')) return; if (!document.getElementById('kdev-style')) { const s = document.createElement('style'); s.id = 'kdev-style'; s.textContent = CSS; document.head.appendChild(s); }
    const b = document.createElement('button'); b.className = 'kdev-chip'; b.textContent = 'DEV'; b.setAttribute('aria-label', 'Open dev console');
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); open(); }); top.appendChild(b); };
  chip(); const chipTimer = setInterval(chip, 1500); void chipTimer;

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
    const tabs = panel.querySelector('.tabs'); tabs.innerHTML = TABS.map(([id, n]) => `<button data-tab="${id}" class="${id === tab ? 'on' : ''}">${n}</button>`).join('');
    tabs.querySelectorAll('button').forEach((b) => { b.onclick = () => { tab = b.dataset.tab; render(); }; });
    const body = panel.querySelector('.body'); body.scrollTop = 0; body.className = 'body';
    ({ item: tItem, mon: tMon, party: tParty, money: tMoney, travel: tTravel, tools: tTools, rita: (b) => (rita ||= createRitaPanel({ scene, say })).render(b) })[tab](body);
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
    body.onclick = (e) => { const id = e.target.dataset?.give; if (!id) return; const r = sys.bag.add(id, num.qty); touched(); say(r.added ? `Gave ${r.added} x ${sys.bag.nameOf(id)}${r.ok ? '' : ' (stack limit reached)'}` : `Could not add ${sys.bag.nameOf(id)} (${r.reason || 'limit'})`, !r.added); fill(); };
  }

  function tMon(body) {
    const opts = VARIANTS.map((v) => `<option value="${esc(v)}" ${v === variant ? 'selected' : ''}>✦ ${esc(v)}</option>`).join('');
    searchBox(body, 'mon', 'Search Kilumen', `<label>Lv <input type="number" min="1" max="${MAXLV}" value="${num.lvl}" data-lvl></label><select data-var><option value="">no variant</option>${opts}</select>`);
    body.querySelector('[data-lvl]').oninput = (e) => { num.lvl = Math.max(1, Math.min(MAXLV, Math.floor(Number(e.target.value) || 1))); };
    body.querySelector('[data-var]').onchange = (e) => { variant = e.target.value; };
    const rows = SPECIES.map((s) => ({ id: s.id, name: s.name, el: (s.el || []).join('/') }));
    fill = () => list(rows.filter((r) => hit(q.mon, r.name, r.id, r.el)), (r) => `<div class="row"><div class="n">${esc(r.name)} <small>${esc(r.id)} · ${esc(r.el)}</small></div><button class="go" data-sp="${esc(r.id)}">Give</button></div>`);
    fill();
    body.onclick = (e) => {
      const id = e.target.dataset?.sp; if (!id) return;
      const c = createCreature({ species: id, level: num.lvl, variant: variant || '' });
      const r = sys.party.add(c, sys.company?.idLevel || 1); touched(); scene.onPartyChange?.(false);
      say(r.where === 'none' ? 'Party and storage are both full (250). Nothing added.' : `Gave ${displayName(c)} Lv.${c.level} to your ${r.where === 'party' ? 'party' : 'storage'}.`, r.where === 'none');
    };
  }

  function partyRow(c, i) { return `<div class="row"><div class="n">${i + 1}. ${esc(displayName(c))} <small>${esc(speciesName(c.species))} · Lv.${c.level}</small></div><button class="${idOf(c) === selUid ? 'sel' : ''}" data-pick="${esc(idOf(c))}">${idOf(c) === selUid ? 'Selected' : 'Select'}</button></div>`; }
  function tParty(body) {
    const P = party(); if (!byUid(selUid)) selUid = P[0] ? idOf(P[0]) : null;
    const c = byUid(selUid), sk = skillRows(), names = Object.fromEntries(sk.map((s) => [s.id, s.name]));
    let h = `<h4>Party (${P.length})</h4>${P.map(partyRow).join('') || '<div class="row"><small>Party is empty</small></div>'}`;
    if (c) {
      const target = evoTarget(c), nm = (id) => names[id] || id;
      h += `<h4>${esc(displayName(c))}  Lv.${c.level}</h4>
<div class="kbar"><label>Level <input type="number" min="1" max="${MAXLV}" value="${num.setLv}" data-setlv></label><button class="go" data-dolv>Set level</button><button data-heal>Full heal</button></div>
<small>Setting a level sets XP to that level's start and heals. It never changes known skills.</small>
<h4>Skills (pick the slot to fill or replace)</h4><div class="kbar">${[0, 1, 2, 3].map((i) => `<button class="${slot === i ? 'sel' : ''}" data-slot="${i}">${i + 1}: ${esc(c.skills?.[i] ? nm(c.skills[i]) : '(empty)')}</button>`).join('')}</div>
<div class="kbar"><input type="search" placeholder="Search skills to teach into slot ${slot + 1}" value="${esc(q.skill)}" data-skq></div><div data-sklist></div>
<h4>Evolve</h4><div class="kbar">${target ? `<button class="warn" data-evo>Evolve now → ${esc(speciesName(target))}</button><small>Uses the normal evolution scene; nickname, skills, variant carry over.</small>` : '<small>No next form.</small>'}</div>`;
    }
    body.innerHTML = h;
    const skFill = () => { const box = body.querySelector('[data-sklist]'); if (!box) return; const rows = sk.filter((r) => hit(q.skill, r.name, r.id, r.type)).slice(0, MAX_ROWS); box.innerHTML = rows.map((r) => `<div class="row"><div class="n">${esc(r.name)} <small>${esc(r.type)}${r.bp ? ' · power ' + r.bp : ''}</small></div><button class="go" data-teach="${esc(r.id)}">Teach</button></div>`).join('') || '<div class="row"><small>No matches</small></div>'; };
    if (c) { skFill(); const si = body.querySelector('[data-skq]'); si.oninput = () => { q.skill = si.value; skFill(); }; const li = body.querySelector('[data-setlv]'); li.oninput = () => { num.setLv = Math.max(1, Math.min(MAXLV, Math.floor(Number(li.value) || 1))); }; }
    body.onclick = (e) => {
      const d = e.target.dataset || {};
      if (d.pick) { selUid = d.pick; num.setLv = byUid(selUid)?.level || num.setLv; return render(); }
      if (!c) return;
      if (d.slot != null) { slot = Number(d.slot); return render(); }
      if (e.target.hasAttribute('data-dolv')) { c.level = num.setLv; c.xp = xpForLevel(c.level); healFull(c); touched(); scene.onPartyChange?.(false); say(`${displayName(c)} is now Lv.${c.level} (full heal).`); return render(); }
      if (e.target.hasAttribute('data-heal')) { healFull(c); touched(); say(`${displayName(c)} fully healed.`); return; }
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
    body.onclick = (e) => {
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

  const landing = async (name) => {
    const m = await scene.loadMap(name), at = (x, y) => m.inBounds(x, y) && m.isWalkable(x, y) && !m.npcAt?.(x, y);
    const fp = m.json?.fly_point || scene.layout?.fly?.destinations?.[name]?.fly_point;
    if (fp && at(fp.x, fp.y)) return { x: fp.x, y: fp.y, facing: fp.facing || 'down' };
    for (const w of m.json?.warps || []) for (const [dx, dy, f] of [[0, 1, 'down'], [0, -1, 'up'], [-1, 0, 'left'], [1, 0, 'right']]) if (at(w.x + dx, w.y + dy)) return { x: w.x + dx, y: w.y + dy, facing: f };
    const cx = Math.floor(m.width / 2), cy = Math.floor(m.height / 2), R = Math.max(m.width, m.height);
    for (let r = 0; r < R; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === r && at(cx + dx, cy + dy)) return { x: cx + dx, y: cy + dy, facing: 'down' };
    return null;
  };
  function tTravel(body) {
    const names = [...(scene.knownMaps || scene.layout?.maps_built || [])].sort();
    searchBox(body, 'travel', `Search maps (${names.length}). The master key is not needed to travel.`);
    fill = () => list(names.filter((n) => hit(q.travel, n)), (n) => `<div class="row"><div class="n">${esc(n)}${scene.map?.name === n ? ' <small>(here)</small>' : ''}</div><button class="go" data-go="${esc(n)}">Go</button></div>`);
    fill();
    body.onclick = async (e) => {
      const n = e.target.dataset?.go; if (!n) return;
      say(`Finding a spot in ${n}…`);
      try {
        const spot = await landing(n); if (!spot) return say(`No walkable spot found in ${n}.`, true);
        travelling = true; touched();
        close();
        scene.startWarp({ map: n, x: spot.x, y: spot.y, facing: spot.facing }, 'dev');
        const t0 = performance.now(); const iv = setInterval(() => { if ((!scene.fade && scene.map?.name === n) || performance.now() - t0 > 8000) { clearInterval(iv); travelling = false; } }, 100);
      } catch (err) { travelling = false; say('Travel failed: ' + (err?.message || err), true); }
    };
  }

  function tTools(body) {
    const logs = AB.logs.slice().reverse();
    body.innerHTML = `<h4>Walk speed (only while dev mode is on)</h4><div class="kbar">${[1, 2, 4].map((n) => `<button class="${DEV.speed === n ? 'sel' : ''}" data-speed="${n}">${n}x</button>`).join('')}</div>
<h4>Master key</h4><div class="kbar"><button class="${DEV.masterKey ? 'sel warn' : ''}" data-mk>${DEV.masterKey ? 'ON: all progression locks bypassed' : 'OFF'}</button></div>
<small>While ON, story gates, blocked exits / TO COME exits to built maps, locked staff doors, the hall Master requirement, the intro walls and the early-access notice are bypassed. It is a runtime override only: no badges or story flags are written, and turning it OFF restores the real locks. Saves made after using it are marked devTouched.</small>
<h4>Auto-complete battle</h4><div class="kbar"><label><input type="checkbox" data-cr ${AB.options.useCrystals ? 'checked' : ''}> use crystals on weak wild foes</label></div>
<small>In a battle the "Auto-complete" command plays it out with the normal rules and rolls, then the usual end-of-battle flow runs.</small>
<h4>Last battle logs (${logs.length}/20)</h4>${logs.map((l, i) => `<div class="row"><div class="n">${esc(l.title)} · ${esc(String(l.outcome).toUpperCase())} · ${l.turns} turns<br><small>${esc(l.at)}</small></div><button data-log="${i}">View</button></div>`).join('') || '<div class="row"><small>No logs yet</small></div>'}
<h4>Save</h4><small>Save marker: ${scene.devTouched || DEV.masterKey ? 'devTouched is set on this save' : 'not set yet (any console change sets it)'}</small>`;
    body.onclick = (e) => {
      const a = e.target.attributes;
      if (a['data-speed']) { DEV.speed = Number(a['data-speed'].value); scene.player.speedMultiplier = DEV.speed; say(`Walk speed ${DEV.speed}x.`); render(); }
      else if (a['data-mk']) { DEV.masterKey = !DEV.masterKey; if (DEV.masterKey) touched(); say(DEV.masterKey ? 'Master key ON.' : 'Master key OFF. Real locks are back.'); render(); }
      else if (a['data-log']) { const l = logs[Number(a['data-log'].value)]; if (l) { if (!l.text) l.text = l.lines.join('\n'); AB.showLog(l); } }
    };
    const cr = body.querySelector('[data-cr]'); cr.onchange = () => { AB.options.useCrystals = cr.checked; };
  }

  window.kilumen.dev = { active: true, role: access?.role, open, close, rita: () => (rita ||= createRitaPanel({ scene, say })), flags: DEV, logs: AB.logs, autobattle: AB };
  console.info('Kilumen dev console ready: press ` or F2, or tap DEV.');
  return window.kilumen.dev;
}

// Progression pass entry (Oct 23, 2026, overnight coder): attachProgression(scene, ui, {query, platform}) from src/main.js
// after the UI is mounted (guarded there; a failure never blocks boot). Switches: ./flags.js (?pg=).
//  - masters (on): halls 2-8 Master results registered in TRAINER_RESULTS (src/battle/story.js), GD teams for hall
//    battles, coin record in save.systems.progression.masters, gift behind masterGifts. Dev: ?pg=masters&master=<zone>.
//  - hallPuzzles (off): hall puzzle preview overlay ?pg=hallPuzzles&hall=<zone> (hall maps 2-8 are not built yet).
//  - quests (off): quest book + phone Tasks = quest log + HUD tracker + NPC give / turn-in + rewards.
import { progressionFlags } from './flags.js?v=v0.2.46-alpha';
import { registerMasterResults, registerHallNpcResults, teamFor, findHallTrainer, hallByZone, awardMaster, hallNpc } from './masters.js?v=v0.2.46-alpha';
import { hallEntry, withOpener, chainAfter, lightAt, litLamps, lampCell } from './halls.js?v=v0.2.46-alpha';
import { QuestBook, QFLAG } from './quests.js?v=v0.2.46-alpha';
import { applyLamps, activeTint } from './hall_lamps.js?v=v0.2.46-alpha'; // batch 3: Mirefen hall tint + reed lamps
import { HallPuzzle } from './puzzles.js?v=v0.2.46-alpha';
import { TRAINER_RESULTS } from '../battle/story.js?v=v0.2.46-alpha';
import { mapTeamFor, playerStarter } from '../overnight/trainer_teams.js?v=v0.2.46-alpha';
import { isBatch3Map } from '../overnight/npc_sprites.js?v=v0.2.46-alpha'; // batch 3: route / rival trainers fight their map team

const getJSON = (url) => fetch(url, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(url + ' ' + r.status))));
const escH = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export async function attachProgression(scene, ui, { query = null, platform = null } = {}) {
  const flags = progressionFlags(query);
  const sys = scene.systems || null;
  const store = sys ? (sys.state.progression ||= { masters: {}, puzzles: {}, quests: null }) : { masters: {}, puzzles: {}, quests: null };
  const pg = { flags, store, masters: null, quests: null, puzzles: {} };
  scene.progression = pg; if (typeof window !== 'undefined') (window.kilumen ||= {}).progression = pg;

  // ---- (c) Masters ------------------------------------------------------------------------------------------------
  if (flags.masters) {
    pg.masters = await getJSON('data/masters.json');
    pg.registered = registerMasterResults(pg.masters, TRAINER_RESULTS);
    pg.registered.push(...registerHallNpcResults(pg.masters, TRAINER_RESULTS)); // World Design map ids (<hall_map>_master)
    wireHallText(scene, pg.masters); // halls 2-8: NPCs placed + text lookup with clean fallback (./halls.js)
    let pending = null;
    const standIns = await getJSON('data/standins_overnight.json').then((d) => d.trainer_species || {}).catch(() => ({}));
    pg.mapTeam = (who) => { // non-hall trainers on World Design's maps: def.team (Ron: branch for the player's starter)
      const def = who && scene.map?.name === who.map && isBatch3Map(scene.map) ? scene.map.npcs?.find((d) => d.id === who.id) : null;
      return def ? mapTeamFor(def, { starter: playerStarter([...(scene.party || []), ...(sys?.archive?.list || [])]), standIns }) : null;
    };
    if (ui) {
      const open = ui.open.bind(ui);
      ui.open = (id, arg) => open(id, id === 'battle' && pending ? { ...(arg || {}), foes: pending.foes, foeName: pending.foeName, masterNumber: pending.masterNumber || 0 } : arg);
    }
    const onBattle = scene.hooks.onBattle;
    if (onBattle) scene.hooks.onBattle = async (who) => {
      pending = who ? teamFor(pg.masters, who.map, who.id, { fernwick: flags.masterTeamFernwick }) || pg.mapTeam(who) : null;
      let won;
      try { won = await onBattle(who); } finally { pending = null; }
      const f = who && findHallTrainer(pg.masters, who.map, who.id);
      if (won !== false && f?.isMaster) {
        const r = awardMaster(f.hall, { sys, gifts: flags.masterGifts, record: store.masters });
        pg.lastAward = r;
        const said = scene._entryFor?.(who.map, { id: who.id })?._coinLine; // Text Bot coin_handover already said it
        if (f.hall.zone !== 'fernwick' && !said) scene.toast?.(`${r.coin} received! (placeholder coin name)`); // Fernwick keeps its live text
      }
      return won;
    };
    pg.openMaster = (zone) => { // dev / screenshots: fight a Master's GD team directly (no flags set)
      const h = hallByZone(pg.masters, zone); if (!h || !ui) return false;
      const t = teamFor(pg.masters, h.hall_map, h.master.id, { fernwick: true });
      ui.closeAll(); ui.open('battle', { trainer: true, foes: t.foes, foeName: t.foeName }); return true;
    };
    const mz = query?.get?.('master');
    if (mz && ui) Promise.resolve(ui.sdReady).then(() => pg.openMaster(mz));
  }

  // ---- batch 3: hall map tint (mirefen_hall_int darkness) + reed lamp tiles from the hall puzzle state ----------------
  // Always on (it is World Design map data, not a feature switch). gradeFor reads scene.mapTint() (src/overworld/clock.js).
  pg.tintDefs = {};
  const zoneOfMap = (m) => (m?.json?.tint && /_hall_int$/.test(m.name) ? m.name.replace(/_hall_int$/, '') : null);
  scene.mapTint = () => {
    const m = scene.map, z = zoneOfMap(m); if (!z) return m?.json?.tint || null;
    return pg.tintDefs[z] ? activeTint(m, pg.tintDefs[z], store.puzzles[z], scene.flags) : m.json.tint;
  };
  pg.refreshLamps = async () => {
    const m = scene.map, z = zoneOfMap(m); if (!z || !m.json.tint.lights) return [];
    const def = pg.tintDefs[z] ||= await getJSON(`data/hall_puzzles/${z}.json`).catch(() => null);
    const r = def ? applyLamps(m, def, store.puzzles[z], scene.flags) : [];
    scene._dirty = true; return r;
  };
  if (typeof scene._enterMap === 'function') {
    const enter = scene._enterMap.bind(scene);
    scene._enterMap = async (...a) => { const r = await enter(...a); await pg.refreshLamps().catch((e) => console.error('hall lamps:', e)); return r; };
  }
  await pg.refreshLamps().catch((e) => console.error('hall lamps:', e));

  // ---- (b) hall puzzles ----------------------------------------------------------------------------------------------
  if (flags.hallPuzzles) {
    pg.loadPuzzle = async (zone) => (pg.puzzles[zone] ||= await getJSON(`data/hall_puzzles/${zone}.json`));
    pg.openPuzzle = async (zone) => { const def = await pg.loadPuzzle(zone); return openPuzzleOverlay(scene, ui, def, store, platform); };
    const hz = query?.get?.('hall');
    if (hz) pg.openPuzzle(hz).catch((e) => console.error('hall puzzle:', e));
    // halls 2-8 puzzle start: the hall guide opens the puzzle; the Master only battles once puzzle_<zone>_hall_solved is set
    if (pg.masters && typeof scene.talk === 'function') {
      const talk = scene.talk.bind(scene);
      scene.talk = (n, def) => {
        const info = def && scene.map && hallNpc(pg.masters, scene.map.name, def.id);
        if (!info || info.hall.zone === 'fernwick' || info.role === 'trainer') return talk(n, def);
        const zone = info.hall.zone;
        const solvedFlag = `puzzle_${zone}_hall_solved`;
        if (info.role === 'master' && scene.flags?.has(solvedFlag)) return talk(n, def);
        if (info.role === 'guide' && !scene._entryFor(scene.map.name, def)?._fallback) talk(n, def);
        pg.hallStarts = (pg.hallStarts || 0) + 1; scene.log?.push({ tick: scene.tick, type: 'hall_puzzle', zone, from: info.role });
        return pg.openPuzzle(zone).catch((e) => console.error('hall puzzle:', e));
      };
    }
  }

  // ---- (a) quests ------------------------------------------------------------------------------------------------
  if (flags.quests) {
    const data = await getJSON('data/quests.json');
    const qb = pg.quests = new QuestBook(data, store.quests);
    const save = () => { store.quests = qb.toJSON(); };
    const quietUntil = Date.now() + 2500; // load + ?flags= catch-up stays silent
    const fin = (q, quiet) => {
      scene.setFlag(QFLAG.done(q.id)); scene.setFlag(QFLAG.on(q.id), false);
      const r = qb.rewards(q), got = [];
      for (const it of r.items) {
        if (sys?.bag?.def?.(it.id)) { const a = sys.bag.add(it.id, it.qty || 1); if (a?.ok) got.push(`${it.id} x${it.qty || 1}`); }
        else console.warn('[quests] PLACEHOLDER reward item not in items.js:', it.id, 'quest', q.id);
      }
      if (r.money && sys?.wallet) sys.wallet.add(r.money);
      for (const f of r.flags) if (!scene.flags.has(f)) scene.setFlag(f);
      if (!quiet) scene.toast?.(`Task complete: ${q.title}`);
      save();
    };
    const sayLines = async (ls, n) => { for (const l of ls) await scene.say(l.text, l.npc === 'system' || l.npc === 'player_start' ? null : scene.speakerFor?.(n)); };
    const tick = () => {
      if (!scene.map) return;
      const quiet = Date.now() < quietUntil; // catch-up on load (old saves): no toasts / no step text
      const acts = qb.update({ flags: scene.flags, map: scene.map.name, x: scene.player.x, y: scene.player.y });
      const show = [];
      for (const a of acts) {
        if (a.type === 'start') { scene.setFlag(QFLAG.on(a.q.id)); if (!quiet && a.q.type === 'main') scene.toast?.(`New task: ${a.q.title}`); }
        else if (a.type === 'set') scene.setFlag(a.flag);
        else if (a.type === 'step' && !quiet) show.push(...qb.lines(a.q, 'step', a.step.id));
        else if (a.type === 'complete') fin(a.q, quiet);
      }
      if (acts.length) save();
      if (show.length && !scene.busy) scene.script(() => sayLines(show));
      hud?.update();
    };
    const talk = scene.talk.bind(scene);
    scene.talk = (n, def) => {
      const act = def && qb.talkAction(scene.map.name, def.id, scene.flags);
      if (!act) return talk(n, def);
      const q = act.q;
      scene.script(async () => {
        if (act.type === 'give') { await sayLines(qb.lines(q, 'start'), n); scene.setFlag(QFLAG.on(q.id)); scene.toast?.(`New task: ${q.title}`); }
        else if (act.type === 'nudge') await sayLines(qb.lines(q, 'in_progress'), n);
        else { const last = qb.required(q).at(-1); if (last?.flag && qb.owns(q, last.flag)) scene.setFlag(last.flag); await sayLines(qb.lines(q, 'turn_in'), n); fin(q, false); }
        save(); hud?.update();
      });
    };
    const hud = typeof document !== 'undefined' ? questHud(scene, ui, qb, platform) : null;
    pg.questTick = tick; pg.hud = hud;
    if (ui) installQuestLog(ui, scene, qb, save);
    tick(); pg.timer = setInterval(tick, 400);
  }
  return pg;
}

// ---- quest HUD tracker (DOM; per platform position, PC and phone tuned separately here) -----------------------------
function questHud(scene, ui, qb, platform) {
  const mobile = platform?.id === 'mobile';
  const el = document.createElement('div'); el.id = 'pg-quest-hud';
  const pos = mobile ? 'top:calc(58px + env(safe-area-inset-top,0px));left:calc(10px + env(safe-area-inset-left,0px));max-width:38vw;font-size:12px'
    : 'top:84px;left:16px;max-width:min(360px,30vw);font-size:clamp(13px,1.45vh,20px)';
  el.style.cssText = `position:fixed;${pos};z-index:2;pointer-events:none;background:rgba(28,22,34,.82);color:#f4ead2;border:2px solid #f4ead2;border-radius:10px;padding:6px 10px;line-height:1.25;font-family:ui-rounded,"Nunito","Trebuchet MS",system-ui,sans-serif;box-shadow:0 2px 0 rgba(0,0,0,.35)`;
  document.body.appendChild(el);
  const update = () => {
    const q = qb.tracked(scene.flags), busy = ui?.active || scene.busy;
    if (!q || busy) { el.hidden = true; return; }
    const st = qb.status(q, scene.flags), cur = qb.current(q, scene.flags), p = qb.progress(q, scene.flags);
    const step = st === 'ready' ? 'Report back.' : cur?.desc || '';
    el.innerHTML = `<div style="font-weight:800;opacity:.85">${q.type === 'main' ? '★ ' : '◆ '}${escH(q.title)} <span style="opacity:.7">${p.done}/${p.total}</span></div><div>${escH(step)}</div>`;
    el.hidden = false;
  };
  return { el, update };
}

// ---- quest log (phone > Tasks) ----------------------------------------------------------------------------------
function installQuestLog(ui, scene, qb, save) {
  ui.scr_tasks = function () {
    const rows = () => qb.log(scene.flags);
    const tag = { ready: 'Report back', active: 'Active', done: 'Done' };
    const info = (r) => {
      if (!r) return '<p class="soft">No tasks yet. Revival Tech will text you when there is work.</p>';
      const q = r.q, cur = qb.current(q, scene.flags);
      return `<b>${escH(q.title)}</b><p class="soft">${q.type === 'main' ? 'Main task' : 'Side task'} · ${escH(tag[r.status])}${qb.state.tracked === q.id ? ' · tracked' : ''}</p>
        <ul style="margin:6px 0 0;padding-left:1.1em">${q.steps.filter((s) => !s.optional || qb.stepDone(q, s, scene.flags)).map((s) => {
          const d = r.status === 'done' || qb.stepDone(q, s, scene.flags), c = s === cur && r.status !== 'done';
          return `<li style="${d ? 'opacity:.55;text-decoration:line-through' : c ? 'font-weight:800' : 'opacity:.4'}">${escH(d || c ? s.desc : '???')}</li>`; }).join('')}</ul>`;
    };
    const scr = { scr: 'tasks', pat: 'stripes', title: ui.T('system_phone.menu.labels.tasks', 'Tasks'), glyph: 'tasks', sel: 0, cols: 1, count: () => rows().length,
      render: () => { const l = rows();
        return `<div class="ui-body sys-split"><div class="ui-panel ui-pad ui-grow ui-scroll" data-scr="tasks" data-pat="stripes" data-scroll>
          ${l.length ? `<ul class="ui-list" data-aa="pg-tasks">${l.map((r, i) => `<li class="ui-row" data-i="${i}" data-k="${escH(r.q.id)}"><span class="grow">${r.q.type === 'main' ? '★' : '◆'} ${escH(r.q.title)}</span><span class="soft">${escH(tag[r.status])}</span></li>`).join('')}</ul>`
            : '<div class="plate ui-empty">No tasks yet. Revival Tech will text you when there is work.</div>'}</div>
          <div class="plate ui-pad sys-side" id="pginfo">${info(l[scr.sel])}</div></div>`; },
      onSel: (i) => { const el = ui.stage.querySelector('#pginfo'); if (el) el.innerHTML = info(rows()[i]); },
      hint: () => ui.hintText?.([['A', 'Track'], ['B', 'Back']]) || '',
      onA: (i) => { const r = rows()[i]; if (!r || r.status === 'done') return; qb.state.tracked = r.q.id; save(); ui.rerender?.(); scene.toast?.(`Tracking: ${r.q.title}`); },
    };
    return scr;
  };
}

// ---- hall puzzle preview overlay (dev; real hall maps later) --------------------------------------------------------
function openPuzzleOverlay(scene, ui, def, store, platform) {
  if (typeof document === 'undefined') return null;
  const rt = new HallPuzzle(def, store.puzzles[def.zone] || (scene.flags?.has(def.solved_flag) ? { solved: true } : null));
  const wrap = document.createElement('div'); wrap.id = 'pg-puzzle';
  wrap.style.cssText = 'position:fixed;inset:0;z-index:50;background:rgba(18,14,24,.94);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:#f4ead2;font-family:ui-rounded,"Nunito",system-ui,sans-serif;touch-action:none';
  const head = document.createElement('div'); head.style.cssText = 'font-weight:800;font-size:clamp(14px,2.2vh,24px);text-align:center';
  const cv = document.createElement('canvas'); cv.style.cssText = 'image-rendering:pixelated;border:3px solid #f4ead2;border-radius:8px;max-width:96vw';
  const pad = document.createElement('div'); pad.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;justify-content:center';
  wrap.append(head, cv, pad); document.body.appendChild(wrap);
  let face = 'U';
  const mobile = platform?.id === 'mobile';
  const draw = () => {
    const g = rt.g, ts = Math.floor(Math.min((innerWidth * (mobile ? 0.62 : 0.9)) / g.w, (innerHeight * (mobile ? 0.78 : 0.72)) / g.h, 64));
    cv.width = g.w * ts; cv.height = g.h * ts; const c = cv.getContext('2d');
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `bold ${Math.floor(ts * 0.55)}px sans-serif`;
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      const v = rt.view(x, y); c.fillStyle = v.c; c.fillRect(x * ts, y * ts, ts, ts);
      c.strokeStyle = 'rgba(0,0,0,.25)'; c.strokeRect(x * ts + 0.5, y * ts + 0.5, ts - 1, ts - 1);
      if (v.t) { c.fillStyle = '#1c1622'; c.fillText(v.t, x * ts + ts / 2, y * ts + ts / 2 + 1); }
    }
    if (def.darkness) drawDarkness(c, def, rt, ts);
    c.fillStyle = '#f4ead2'; c.strokeStyle = '#1c1622'; c.lineWidth = 3; c.beginPath(); c.arc(rt.x * ts + ts / 2, rt.y * ts + ts / 2, ts * 0.32, 0, 7); c.fill(); c.stroke();
    const d = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] }[face];
    c.fillStyle = '#1c1622'; c.beginPath(); c.arc(rt.x * ts + ts / 2 + d[0] * ts * 0.18, rt.y * ts + ts / 2 + d[1] * ts * 0.18, ts * 0.08, 0, 7); c.fill();
    head.textContent = `${def.name_placeholder} (${def.zone}) · DRAFT preview${rt.solved ? ' · SOLVED' : ''}`;
  };
  const act = (a) => {
    if (a === 'A') a = 'A' + face; else face = a;
    const r = rt.act(a); store.puzzles[def.zone] = rt.toJSON();
    if (r.solvedNow) { scene.setFlag?.(def.solved_flag); scene.toast?.('The way to the Master is open.'); }
    scene.progression?.refreshLamps?.(); // batch 3: overworld reed lamps follow the puzzle state
    draw();
  };
  const close = () => { removeEventListener('keydown', key, true); wrap.remove(); };
  const KEYS = { ArrowUp: 'U', KeyW: 'U', ArrowDown: 'D', KeyS: 'D', ArrowLeft: 'L', KeyA: 'L', ArrowRight: 'R', KeyD: 'R', KeyZ: 'A', Enter: 'A', Space: 'A', KeyF: 'A' };
  const key = (e) => { if (e.code === 'Escape' || e.code === 'KeyX') { close(); e.preventDefault(); e.stopPropagation(); return; } const a = KEYS[e.code]; if (!a) return; e.preventDefault(); e.stopPropagation(); act(a); };
  addEventListener('keydown', key, true);
  for (const [t, a] of [['◀', 'L'], ['▲', 'U'], ['▼', 'D'], ['▶', 'R'], ['A', 'A'], ['Close', 'X']]) {
    const b = document.createElement('button'); b.textContent = t;
    b.style.cssText = 'min-width:48px;min-height:44px;font:800 18px system-ui;border-radius:10px;border:2px solid #f4ead2;background:#3a2f48;color:#f4ead2';
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); if (a === 'X') close(); else act(a); });
    pad.appendChild(b);
  }
  draw();
  return { rt, act, draw, close, el: wrap };
}

// ---- halls 2-8: NPC placement + text (Coder halls wiring, Oct 23 2026) -------------------------------------------------
// World Design keeps hall NPCs in npcs_pending_text until Text Bot adds maps.<hall_map>.* keys; the engine places them only
// when lines.maps.<hall_map> exists and _entryFor finds an entry. Here: an empty (runtime-only) maps.<hall_map> block and a
// wrapped _entryFor (normal lookup first, then Text Bot's draft paths, then a clean fallback). Text files are not touched.
function wireHallText(scene, data) {
  if (typeof scene._entryFor !== 'function') return;
  const lines = (scene.lines ||= {}); lines.maps ||= {};
  const base = scene._entryFor.bind(scene);
  scene._entryFor = (mapName, def) => {
    const e = chainAfter(withOpener(scene.lines, base(mapName, def), scene.flags, scene.env?.() || {})); // Ron 2-6 opener link; after_2 follows after
    return hallEntry(scene.lines, data, mapName, def, e, scene.flags) || e;
  };
  for (const h of data.halls) {
    if (h.zone === 'fernwick' || !h.map_built) continue;
    lines.maps[h.hall_map] ||= {};
    if (scene.map?.name !== h.hall_map) scene.mapCache?.delete?.(h.hall_map); // loaded before this hook: place NPCs on next load
  }
}

// ---- Mirefen darkness overlay: dark cells, lit reed lamps cast light circles (no weather effect) -----------------------
function drawDarkness(c, def, rt, ts) {
  const g = rt.g;
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    const l = lightAt(def, rt.st, x, y, rt.x, rt.y); if (l >= 1) continue;
    c.fillStyle = `rgba(6,5,14,${(0.9 * (1 - l)).toFixed(3)})`; c.fillRect(x * ts, y * ts, ts, ts);
  }
  if ((rt.st?.p || 0) >= def.order.length) return;
  c.save(); c.globalCompositeOperation = 'lighter';
  for (const id of litLamps(def, rt.st)) {
    const cell = lampCell(def, id); if (!cell) continue;
    const cx = cell[0] * ts + ts / 2, cy = cell[1] * ts + ts / 2, r = (def.darkness.radius || 3) * ts;
    const gr = c.createRadialGradient(cx, cy, 0, cx, cy, r); gr.addColorStop(0, 'rgba(255,200,110,.35)'); gr.addColorStop(1, 'rgba(255,200,110,0)');
    c.fillStyle = gr; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill();
  }
  c.restore();
}

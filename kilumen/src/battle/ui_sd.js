// Engine battle screen (the default since Oct 23, 2026; ?battle=shell = old shell): drives KilumenBattle (src/battle/battle.js) and plays its protocol lines back on the
// existing battle shell markup/CSS (src/ui/ui.js scr_battle). Imported by mountUI unless ?battle=shell.
// Every fallback string marked PH below is a PLACEHOLDER for Text Bot (keys listed in src/battle/data/README.md);
// the P() lookup uses the real line as soon as the key exists in text/overworld_lines.json.
import { KilumenBattle } from './battle.js';
import { authoredTeam } from './data/trainer_teams.js';
import { STAT_NAMES } from './data/creatures.js';
import { PLATFORM_BIOMES, PLATFORM_SIZES, drawPlatform } from './data/platforms.js';
// hit effects: HIT_EFFECTS_ENABLED / HIT_TRAVEL_FX_ENABLED in ../ui/data.js (both on since Oct 22, 2026, see the note there); dev ?fxpreview=staging
import { fxSettings, loadFx, prepFx, showImpact, showTravel, isRanged } from '../ui/hit_fx.js';

const KEY = 'system_battle'; // PH: proposed namespace for the new battle lines

export function makeSdBattle(ui, opts, h) {
  const { esc, front, back, fx, wait, lvlOf, speciesById, ELEMENT_LABEL, statsFor } = h;
  const P1 = (k, fb, v) => ui.P(`${KEY}.${k}`, [fb], v)[0];
  const trainer = !!opts.trainer;
  // no capturing a trainer's creatures (Gary, Oct 23 2026): any battle with an owner (trainer flag, overworld trainer id,
  // injected Master / hall team, explicit owner) is not wild, so the engine refuses the crystal and keeps it in the bag
  const owned = trainer || !!opts.who || !!opts.owner || !!opts.foes?.length;
  const noCapture = () => ui.P('system_trainers.no_capture', ['That creature already has a trainer. A crystal won\'t take it.'])[0]; // PH: key requested in data/textbot_requests_capture.md
  const partySrc = ui.party().length ? ui.party() : [{ species: 'rillop', rt: 'RT-0147' }];
  // overworld entries have no level/HP yet: level from the same placeholder statsFor() the Team screen shows, HP full
  const party = partySrc.slice(0, 6).map((c, i) => ({ ...c, level: c.level || statsFor(c, i).level }));
  const lead = party[0];
  const foeSp = opts.foe || (lead.species === 'cindrip' ? 'rillop' : 'cindrip');
  const foeLv = opts.foeLevel || Math.max(2, lead.level - 1); // foeLevel: wild encounter slot level (src/battle/encounters.js)
  // PLACEHOLDER trainer team, only for trainers with no authored / injected team: two creatures around the lead's level
  // authored teams first (src/battle/data/trainer_teams.js, keyed by the overworld's {map, id}), then injected teams, then the placeholder
  const authored = trainer ? authoredTeam(opts.who, partySrc) : null;
  const foes = authored || (opts.foes?.length ? opts.foes.map((f) => ({ species: f.species, level: f.level })) // [progression hook] Master / hall teams (src/progression/masters.js, data/masters.json)
    : trainer ? [{ species: foeSp, level: foeLv }, { species: foeSp === 'tumbloam' ? 'burlbeetle' : 'tumbloam', level: foeLv }] : [{ species: foeSp, level: foeLv }]);
  const sys = ui.demo ? null : ui.scene?.systems; // [systems-gd hook] the real bag (src/systems); ?uidemo=1 keeps the demo team + demo bag (never saved)
  const bag = sys ? sys.bagForBattle() : Object.fromEntries(Object.entries(ui.bag || {}).filter(([, n]) => n > 0));
  const seed = opts.seed || (ui.q?.get('bseed') ? ui.q.get('bseed').split(',').map(Number) : undefined);
  const kb = new KilumenBattle({ party, foes, wild: !owned, bag, seed, foeName: opts.foeName || (trainer ? 'Trainer' : 'Wild'), forceChance: opts.forceChance });
  ui.currentBattle = kb; // read-only handle for scripted play-checks (tools/playcheck_browser.mjs)
  const cat = ui.T('system_item_catalogue', {});
  const Items = kb.battle.dex.data.Items;
  const itemName = (engineId) => { const it = Items[engineId]; return cat[it?.kGameId]?.name || it?.name || engineId; };

  // battle biome: picks the background and the ground platform art (only 'grass' so far; opts.biome or ?biome=)
  const biome = PLATFORM_BIOMES[opts.biome || ui.q?.get('biome')] ? (opts.biome || ui.q.get('biome')) : 'grass', biomeArt = PLATFORM_BIOMES[biome];
  // feet line of a sprite = lowest non-transparent row / height, so the platform sits under the feet, not the image box
  const feetCache = new Map();
  const setFeet = (img) => {
    const apply = (f) => img.parentElement?.style.setProperty('--feet', String(f));
    if (feetCache.has(img.src)) return apply(feetCache.get(img.src));
    const go = () => { try {
      const c = document.createElement('canvas'), w = img.naturalWidth, hh = img.naturalHeight; c.width = w; c.height = hh;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, w, hh).data; let y = hh - 1;
      for (; y > 0; y--) { let hit = false; for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 40) { hit = true; break; } if (hit) break; }
      const f = Math.min(1, (y + 1) / hh); feetCache.set(img.src, f); apply(f);
    } catch { apply(0.94); } };
    if (img.complete && img.naturalWidth) go(); else img.addEventListener('load', go, { once: true });
  };

  let mode = 'msg', msgResolve = null, busy = true, list = [];
  const scr = { scr: 'battle', full: true, sel: 0, cols: 2, count: () => (mode === 'msg' ? 0 : list.length), kb };
  ui._sd = scr;
  // force-close fix (batch 3 wire, Oct 23 2026): ui.closeAll() during a battle empties ui.layer while playback / a say()
  // timer is still running, so the next $('#b-msg').innerHTML hit null ("Cannot set properties of null"). The battle keeps
  // its own root; once that root is detached every DOM step throws BattleClosed and guard() ends the chain quietly
  // (it also never writes into a newer battle that reuses the same ids).
  let root = null;
  const closed = () => !!root && !root.isConnected;
  const host = () => { if (closed()) throw new BattleClosed(); return root || ui.layer.firstElementChild; };
  const $ = (s) => { if (closed()) throw new BattleClosed(); return (root || ui.layer).querySelector(s); };
  const guard = (p) => Promise.resolve(p).catch((e) => { if (e instanceof BattleClosed || closed()) { scr.aborted = true; return; } throw e; });
  scr.isClosed = closed;
  const mon = { p1: null, p2: null }; // shown creature per side: { name, species, level, hp, maxhp }
  const plateHtml = (side) => `<div class="b-plate ${side === 'p2' ? 'foe' : 'ally'}" id="plate-${side}" data-pat="${side === 'p2' ? 'chevron' : 'dots'}"><div class="plate">
      <div class="top"><span class="grow" id="${side}-name"></span><span class="lv" id="${side}-lv"></span></div>
      <div class="bar-row"><b>HP</b><div class="bar" id="${side}-hp" data-lvl="good"><i style="width:100%"></i></div></div>
      ${side === 'p1' ? '<div class="hpnum" id="p1-hpnum"></div><div class="bar-row"><b>XP</b><div class="bar xp" id="p1-xp" style="height:8px"><i style="width:0%"></i></div></div>' : ''}
      ${side === 'p1' || trainer ? `<div class="b-party" id="${side}-party" role="img"></div>` : ''}</div></div>`;
  scr.mount = (layer) => {
    // ground platforms (per biome, src/battle/data/platforms.js) replace the old .b-pad ellipses; each creature container's
    // bottom edge is its feet line (--feet, measured from the sprite), and the platform is centred on it
    const plat = (s, size) => `<img class="b-plat ${size}" id="${s}-plat" alt="" src="${drawPlatform(biome, size)}" style="--plat-w:${PLATFORM_SIZES[size].w}">`;
    layer.innerHTML = `<div class="ui-battle" data-scr="battle" data-engine="sd" data-biome="${esc(biome)}"><div class="bg" style="background-image:url(${biomeArt.bg})"></div>
      <div class="b-field"><div class="b-foe">${plat('p2', 'far')}<img class="ui-sprite b-mon" id="p2-mon" alt="" style="opacity:0"></div>
        <div class="b-ally">${plat('p1', 'near')}<img class="ui-sprite b-mon" id="p1-mon" alt="" style="opacity:0"></div>
        ${plateHtml('p2')}${plateHtml('p1')}</div>
      <div class="b-bottom"><div class="plate b-msg" id="b-msg" data-act="msg"></div><div class="ui-panel b-cmds" id="b-cmds" data-scr="battle" data-pat="waves" data-scroll hidden></div></div>
      <div class="b-bars"></div></div>`;
    root = layer.firstElementChild;
    for (const s of ['p1', 'p2']) if (mon[s]) drawPlate(s);
    if (!scr.started) { scr.started = true; run(); }
  };
  const say = (t, auto = 650) => new Promise((r) => {
    const m = $('#b-msg'); m.innerHTML = `${esc(t)}${auto ? '' : '<span class="more">▼</span>'}`; mode = 'msg'; $('#b-cmds').hidden = true;
    if (auto) setTimeout(r, auto); else msgResolve = r;
  });
  // layout pass (Oct 22, 2026): compact party HP readout inside the info card (your whole team, and the trainer's team in
  // trainer battles): one mini bar per creature, empty when fainted. The shown creature uses the played-back HP (mon[s]);
  // the rest come from the engine side.
  const drawParty = (s) => {
    const el = $(`#${s}-party`), side = kb[s]; if (!el || !side?.creature) return;
    const act = side.active?.[0]; let able = 0;
    el.innerHTML = side.creature.map((c) => {
      const hp = c === act && mon[s] ? mon[s].hp : c.fainted ? 0 : c.hp, max = (c === act && mon[s] ? mon[s].maxhp : c.maxhp) || 1, f = Math.max(0, Math.min(1, hp / max));
      if (f > 0) able++;
      return `<i data-lvl="${f > 0 ? lvlOf(f) : 'out'}"${c === act ? ' class="on"' : ''} style="--f:${f.toFixed(3)}"></i>`;
    }).join('');
    el.setAttribute('aria-label', P1('party_hp', 'Team: {n} of {total} can battle', { n: able, total: side.creature.length }) /* PH */);
  };
  const drawPlate = (s) => {
    const m = mon[s]; if (!m) return;
    $(`#plate-${s}`).dataset.el = speciesById(m.species).el[0];
    $(`#${s}-name`).textContent = m.name; $(`#${s}-lv`).textContent = `Lv.${m.level}`;
    drawParty(s);
    const f = Math.max(0, m.hp / m.maxhp), b = $(`#${s}-hp`); b.dataset.lvl = lvlOf(f); b.firstElementChild.style.width = `${f * 100}%`;
    if (s === 'p1') {
      $('#p1-hpnum').textContent = `${m.hp}/${m.maxhp}`;
      const c = kb.p1.active[0], K = kb.battle.dex.data.Scripts.kilumen;
      if (c) { const lo = Math.floor(K.xpCurveMult * c.level ** 3), hi = Math.floor(K.xpCurveMult * (c.level + 1) ** 3); $('#p1-xp > i').style.width = `${Math.max(0, Math.min(100, ((c.set.xp ?? lo) - lo) / (hi - lo) * 100))}%`; }
    }
  };
  const anim = (el, cls, ms) => { el.classList.remove('idle', cls); void el.offsetWidth; el.classList.add(cls); return wait(ms).then(() => { el.classList.remove(cls); el.classList.add('idle'); }); };
  const sideOf = (ident) => ident.slice(0, 2);
  const nameOf = (ident) => ident.replace(/^p\da?: /, '');
  const hpOf = (s) => { const [hp, max] = String(s).split(' ')[0].split('/').map(Number); return { hp: hp || 0, max }; };
  // FX prep (Oct 22, 2026; ../ui/hit_fx.js): natural size from the effect's JSON, anchored on the target's impact point,
  // mirrored on the player's side, removed after total_ms. Ranged ('Special') skills play travel first when travel is on.
  // Resolves when frame 0 of the impact is on screen (or at once when there is no effect), with the removal promise.
  const fxs = fxSettings(ui.q);
  const fxAt = async (s, el, from, ranged) => {
    if (!fxs.on) return null;
    const e = fxs.force || el, box = host(), tgt = $(`#${s}-mon`);
    const pImp = loadFx(e, 'impact', fxs.base).then(prepFx); // decoded while the travel plays
    if (fxs.travel && ranged && from && from !== s) {
      const tr = await showTravel(await loadFx(e, from === 'p1' ? 'travel_p2f' : 'travel_f2p', fxs.base), box, $(`#${from}-mon`), tgt);
      if (tr) await tr.done;
    }
    return showImpact(await pImp, box, tgt, s === 'p1');
  };
  const dmgNum = (s, n) => {
    const d = $(`#${s}-mon`), r = d.getBoundingClientRect(), lr = ui.layer.getBoundingClientRect();
    const e = document.createElement('div'); e.className = 'b-dmg'; e.textContent = `-${n}`; e.style.cssText = `left:${r.left - lr.left + r.width / 2}px;top:${r.top - lr.top + 10}px`;
    host().appendChild(e); setTimeout(() => e.remove(), 600);
  };
  let lastMove = null;

  // ---- protocol playback ------------------------------------------------------------------------------------
  const play = async (lines) => {
    for (const [cmd, a = '', b = '', c = '', d = ''] of lines) {
      const s = a && /^p\d/.test(a) ? sideOf(a) : null, who = s ? nameOf(a) : '';
      switch (cmd) {
        case 'switch': case 'drag': {
          const [spName, lv] = b.split(', L'); const sp = (h.SPECIES.find((x) => x.name === spName) || {}).id || spName.toLowerCase();
          const { hp, max } = hpOf(c); const first = !mon[s];
          mon[s] = { name: who, species: sp, level: +lv || 1, hp, maxhp: max }; drawPlate(s);
          const img = $(`#${s}-mon`); img.src = s === 'p2' ? front(sp) : back(sp); img.style.opacity = '1'; setFeet(img);
          if (s === 'p2') await say(first && !trainer ? ui.P('system_wild.grass', ['{creature} bursts out of the grass!'], { creature: who })[0]
            : P1('foe_sends', 'Trainer sends out {creature}!', { creature: who }) /* PH */);
          else await say(P1('go', 'Go, {creature}!', { creature: who }) /* PH */);
          await anim(img, 'enter', 600);
          break;
        }
        case 'move': {
          lastMove = { s, move: b };
          await say(P1('used', '{creature} used {skill}!', { creature: who, skill: b }) /* PH */, 450);
          await anim($(`#${s}-mon`), s === 'p1' ? 'lunge-r' : 'lunge-l', 380);
          break;
        }
        case '-damage': {
          const { hp } = hpOf(b), m = mon[s]; const lost = m.hp - hp; m.hp = hp;
          if (c === '[from] overuse') await say(P1('overuse_hurt', '{creature} pushed too hard and got hurt.', { creature: who }) /* PH */, 500);
          else if (/scorched/i.test(c)) await say(P1('scorched_hurt', '{creature} smarts from its scorch.', { creature: who }) /* PH */, 500);
          else if (lastMove) {
            const mv = kb.battle.dex.moves.get(lastMove.move);
            // frame 0 of the impact is the hit: shake + damage number start with it (effect off -> resolves at once)
            const f = await fxAt(s, (mv.type || 'Normal').toLowerCase(), lastMove.s, isRanged({ category: mv.category }));
            if (f && lost > 0) dmgNum(s, lost);
            await Promise.all([anim($(`#${s}-mon`), 'hit', 420), f?.done]);
            if (!f && lost > 0) dmgNum(s, lost); // no effect shown: same order as before the FX prep
          } else if (lost > 0) dmgNum(s, lost);
          drawPlate(s); await wait(250);
          break;
        }
        case '-heal': { mon[s].hp = hpOf(b).hp; drawPlate(s); await say(P1('healed', '{creature} feels better.', { creature: who }) /* PH */, 550); break; }
        case '-weakspot': await say(P1('strong', 'That hit its weak spot!') /* PH */, 550); break;
        case '-resisted': await say(P1('weak', 'It shrugged most of that off.') /* PH */, 550); break;
        case '-immune': await say(P1('immune', "It didn't touch {creature}.", { creature: who }) /* PH */, 550); break;
        case '-crit': await say(P1('crit', 'A clean hit!') /* PH */, 500); break;
        case '-miss': await say(P1('miss', '{creature} missed.', { creature: who }) /* PH */, 550); break;
        case '-fail': await say(P1('fail', 'Nothing happened.') /* PH */, 550); break;
        case '-status': await say(P1(`status_${b}`, b === 'drowsy' ? '{creature} got drowsy.' : '{creature} got scorched.', { creature: who }) /* PH */, 650); break;
        case '-curestatus': await say(P1(`cure_${b}`, '{creature} shook it off.', { creature: who }) /* PH */, 600); break;
        case 'cant': await say(P1(`cant_${b}`, '{creature} is too drowsy to move.', { creature: who }) /* PH */, 650); break;
        case '-boost': case '-unboost': {
          const stat = STAT_NAMES[b] || (b === 'evasion' ? 'Evasion' : b);
          await say(P1(cmd === '-boost' ? 'stat_up' : 'stat_down', cmd === '-boost' ? "{creature}'s {stat} went up." : "{creature}'s {stat} went down.", { creature: who, stat }) /* PH */, 600);
          break;
        }
        case '-overuse': await say(ui.P('system_skills.energy_low', ['{skill} is nearly out of energy.'], { skill: lastMove?.move || '' })[0].replace('nearly out', 'out'), 500); break;
        case '-activate': if (b === 'warmth') await say(P1('warmth_endure', '{creature} held on for you!', { creature: who }) /* PH */, 800); break;
        case 'faint': {
          await anim($(`#${s}-mon`), 'faint', 700); $(`#${s}-mon`).style.opacity = '0';
          await say(P1('fainted', '{creature} is out cold!', { creature: who }) /* PH (old shell line) */, 700);
          break;
        }
        case '-kxp': await say(P1('xp', '{creature} gained {n} XP.', { creature: who, n: b }) /* PH */, 700); drawPlate('p1'); break;
        case '-klevelup': {
          mon.p1.level = +b; const st = c.split(',').map(Number);
          const box = document.createElement('div'); box.className = 'plate b-lvup ui-pad';
          box.innerHTML = `<b>${esc(P1('levelup', '{creature} grew to Lv.{level}!', { creature: who, level: b }))}</b><dl class="ui-kv">${['hp', 'atk', 'def', 'spa', 'spd', 'spe'].map((k, i) => `<dt>${esc(STAT_NAMES[k])}</dt><dd>${st[i]}</dd>`).join('')}</dl>`;
          host().appendChild(box); drawPlate('p1');
          const r = $('#p1-mon').getBoundingClientRect(), lr = ui.layer.getBoundingClientRect(); ui.sparkle?.(r.left - lr.left + r.width / 2, r.top - lr.top + r.height / 2, 20, host());
          await say(P1('levelup', '{creature} grew to Lv.{level}!', { creature: who, level: b }) /* PH */, 0); box.remove();
          break;
        }
        case '-kretreat':
          await say(b === 'success' ? ui.P('system_wild.retreated', ['You slipped away.'])[0]
            : ui.P('system_wild.cant_retreat', ["{creature} won't let you leave!"], { creature: mon.p2?.name || '' })[0], 800);
          break;
        case '-kitem': await say(P1('item_used', 'You used a {item} on {creature}.', { item: itemName(b), creature: who }) /* PH */, 700); break;
        case '-kcrystal': {
          await say(P1('crystal_throw', 'You held up a {item}.', { item: itemName(b) }) /* PH */, 600);
          const img = $('#p2-mon');
          // capture sequence (Oct 22, 2026; SOUL_PLAYBOOK 5.3): the trainer holds the crystal up, the foe streams in, c pulses (1-4, from the same capture roll: src/battle/capture.js),
          // then rune lock + bloom ('catch' chime) or the light bursts back out. ui_tools2.js catchFx -> capture_fx.js (one swap point per step)
          const ok = d === 'caught';
          await ui.fx?.catchFx(host(), { foe: img, ally: $('#p1-mon'), name: who, pulses: +c, caught: ok, el: $('#plate-p2')?.dataset.el });
          if (ok) { img.style.opacity = '0'; await say(P1('caught', '{creature} is with you now!', { creature: who }) /* PH */, 0); }
          else await say(P1('crystal_escape', '{creature} broke free!', { creature: who }) /* PH */, 700);
          break;
        }
        case 'win': if (a !== kb.p1.name) await say(P1('lost', 'Your team is out of strength...') /* PH */, 0); break;
        default: break;
      }
    }
  };

  // ---- commands ---------------------------------------------------------------------------------------------
  const showList = (m, items, label) => {
    mode = m; list = items; scr.sel = 0; const box = $('#b-cmds'); box.hidden = false;
    box.classList.toggle('skills', m !== 'cmd');
    Object.assign(box.style, items.length > 4 ? { gridTemplateRows: 'none', gridAutoRows: 'minmax(48px, auto)', overflowY: 'auto' } : { gridTemplateRows: '', gridAutoRows: '', overflowY: '' });
    box.innerHTML = items.map((it, i) => `<div class="b-cmd" data-i="${i}" data-el="${it.el || 'light'}" data-pat="${['stripes', 'dots', 'chevron', 'lattice'][i % 4]}"${it.off ? ' style="opacity:.55"' : ''}><span class="t">${esc(it.t)}</span>${it.s ? `<span class="s">${esc(it.s)}</span>` : ''}</div>`).join('');
    if (label) $('#b-msg').textContent = label;
    ui._markSel();
  };
  const whoName = () => kb.p1.active[0]?.name || '';
  const showCmds = () => showList('cmd', [{ t: 'Skills', el: 'fire', go: showSkills }, { t: 'Pack', el: 'earth', go: showPack },
    { t: 'Team', el: 'water', go: () => showTeam(false) }, { t: 'Retreat', el: 'wind', go: () => act('retreat') }],
  P1('prompt', 'What will {creature} do?', { creature: whoName() }) /* PH (old shell line) */);
  const showSkills = () => {
    const r = kb.request();
    showList('skills', r.moves.map((m, i) => { const mv = kb.battle.dex.moves.get(m.id); const el = mv.type.toLowerCase();
      return { t: m.move, s: `${ELEMENT_LABEL(el)} · En ${m.pp}/${m.maxpp}`, el, go: async () => {
        if (m.pp <= 0) {
          const k = await ui.ask('battle', ui.P('system_skills.energy_out', ['{skill} is out of energy. Use it anyway?'], { skill: m.move, creature: whoName() }),
            ui.T('system_skills.energy_out.choices', ['Use anyway', 'Pick another']));
          if (k !== 0) return;
        }
        act(`move ${i + 1}`);
      } };
    }));
  };
  const showPack = () => {
    const r = kb.request();
    const items = Object.entries(r.bag).filter(([id, n]) => n > 0 && Items[id.replace(/_/g, '')]).map(([id, n]) => {
      const it = Items[id.replace(/_/g, '')], crystal = !!it.kCrystalGrade;
      return { t: `${cat[id]?.name || it.name} ×${n}`, el: crystal ? 'mystic' : 'grass', off: crystal && owned,
        go: async () => { if (crystal && owned) { await say(noCapture(), 0); showCmds(); return; } act(crystal ? `crystal ${id}` : `item ${id}`); } }; // owned: refusal (tap-through so phones see it too), no item / turn used
    });
    if (!items.length) { $('#b-msg').textContent = P1('pack_empty', 'Nothing in the Pack you can use here.') /* PH */; return; }
    showList('pack', items, P1('pack_prompt', 'Use which item?') /* PH */);
  };
  const showTeam = (forced) => {
    const team = kb.request().team;
    showList(forced ? 'forced' : 'team', team.map((c, i) => ({ t: `${c.name} Lv.${c.level}`, s: c.fainted ? P1('out_cold_tag', 'Out cold') /* PH */ : `HP ${c.hp}/${c.maxhp}`,
      el: speciesById(c.species.id).el[0], off: c.fainted || i === 0, go: () => { if (!c.fainted && i > 0) act(`switch ${i + 1}`); } })),
    forced ? P1('send_next', 'Who goes in next?') /* PH */ : P1('team_prompt', 'Swap in who?') /* PH */);
  };
  const act = (choice) => guard(actInner(choice));
  const actInner = async (choice) => {
    busy = true; const r = kb.choose(choice);
    if (r !== true) {
      busy = false;
      const err = String(r?.error || '');
      if (choice.startsWith('crystal') && (owned || /wild/i.test(err))) $('#b-msg').textContent = noCapture();
      else if (/trainer|wild/i.test(err) || (choice === 'retreat' && owned)) $('#b-msg').textContent = ui.P('system_trainers.no_retreat', ['No walking away from a trainer battle.'])[0];
      else $('#b-msg').textContent = err;
      return;
    }
    $('#b-cmds').hidden = true;
    await play(kb.drain());
    await next();
  };
  const next = async () => {
    if (kb.ended) { await finish(); return; }
    busy = false;
    if (kb.request().state === 'switch') showTeam(true); else showCmds();
  };
  const finish = async () => {
    const res = kb.result(); ui.lastBattle = res;
    res.foes = trainer ? foes : null; // [systems-gd hook] trainer payout level (Systems.onTrainerWin); wild: none, so a stale wild team never sets a payout
    // [systems-gd hook] systems attached: party hp/energy/status/xp (by uid) + bag go back into the save; 'blackout' = team wiped
    if (sys) res.systems = sys.applyBattleResult(res);
    else if (ui.bag) for (const [k, n] of Object.entries(res.bag)) ui.bag[k] = n; // demo bag, in memory only
    await wait(250); const fl = document.createElement('div'); fl.className = 'b-flash'; host().appendChild(fl); await wait(300);
    // [systems-gd hook] hand the result over BEFORE closing: ui.js resolves onBattle in _onClose (run by closeAll) from what
    // onDone stored, so the old close-then-onDone order made every ?battle=sd trainer battle count as lost
    if (closed()) return; // force-closed during the flash: a later UI may be open, never close it
    const done = scr.onDone; done?.(res); ui.closeAll();
    // [systems-gd hook] no caller handles the result (wild / direct ?ui=battle): a wiped team blacks out here. Trainer
    // battles from talk() set onDone and black out there, after the trainer's line (overworld.js onTrainerLoss).
    if (!done && res.systems === 'blackout') await sys.onPartyFainted();
  };
  const run = () => guard((async () => { await wait(300); await play(kb.drain()); await next(); })());

  scr.handle = ({ dir, a, b }) => {
    if (mode === 'msg') { if ((a || b) && msgResolve) { const r = msgResolve; msgResolve = null; r(); } return; }
    if (busy) return;
    if (dir) { const dd = { up: -2, down: 2, left: -1, right: 1 }[dir]; const n = scr.count(); const i = scr.sel + dd; if (i >= 0 && i < n) { scr.sel = i; ui._markSel(); } }
    if (a) scr.onA(scr.sel); else if (b && !['cmd', 'forced'].includes(mode)) showCmds();
  };
  scr.onA = (i) => {
    if (mode === 'msg') { if (msgResolve) { const r = msgResolve; msgResolve = null; r(); } return; }
    if (busy) return;
    list[i]?.go?.();
  };
  scr.onAct = (a) => { if (a === 'msg' && msgResolve) { const r = msgResolve; msgResolve = null; r(); } };
  scr.onBack = () => { if (!busy && !['cmd', 'forced', 'msg'].includes(mode)) showCmds(); return false; };
  return scr;
}

/** Thrown by DOM steps after the battle was force-closed (ui.closeAll); guard() swallows it. */
export class BattleClosed extends Error { constructor() { super('battle closed'); this.name = 'BattleClosed'; } }

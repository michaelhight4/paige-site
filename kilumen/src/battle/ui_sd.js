// Engine battle screen (the default since Oct 23, 2026; ?battle=shell = old shell): drives KilumenBattle (src/battle/battle.js) and plays its protocol lines back on the
// existing battle shell markup/CSS (src/ui/ui.js scr_battle). Imported by mountUI unless ?battle=shell.
// Every fallback string marked PH below is a PLACEHOLDER for Text Bot (keys listed in src/battle/data/README.md);
// the P() lookup uses the real line as soon as the key exists in text/overworld_lines.json.
import { KilumenBattle } from './battle.js?v=v0.2.69-alpha';
import { qolFlags, XP_SHARE } from '../qol/flags.js?v=v0.2.69-alpha'; // QoL batch B: #4 xpShare, #7 matchup / dmgPreview
import { skillTag } from '../qol/matchup.js?v=v0.2.69-alpha';
import { cidleOn, reducedMotion } from '../overworld/creature_idle.js?v=v0.2.69-alpha'; // existing 4-frame idle GIF instead of the still (128px forms)
const CIDLE_RE = /\/battle\/([a-z0-9_]+)_(front|back)_128_2x\.png(\?.*)?$/;
const cidleSrc = (url) => (cidleOn() && !reducedMotion() && CIDLE_RE.test(url) ? url.replace(CIDLE_RE, '/anim/$1_$2_idle_2x.gif$3') : null);
import { DEV } from '../dev/runtime.js?v=v0.2.69-alpha';
import { modeButton, reactionLines } from '../rtb/switch.js?v=v0.2.69-alpha'; // battle mode switch (wild only, Oct 29 2026)
import { authoredTeam } from './data/trainer_teams.js?v=v0.2.69-alpha';
import { STAT_NAMES } from './data/creatures.js?v=v0.2.69-alpha';
import { diffOf, getDifficulty, scaleFoes, masterItems } from '../systems/difficulty.js?v=v0.2.69-alpha';
import { PLATFORM_BIOMES, PLATFORM_SIZES, drawPlatform } from './data/platforms.js?v=v0.2.69-alpha';
import { mountWaterBg, mountWaterArt, WATER_SPOTS, coverPoint } from './data/water_bg.js?v=v0.2.69-alpha'; // animated water backdrop (biome 'water')
// hit effects: HIT_EFFECTS_ENABLED / HIT_TRAVEL_FX_ENABLED in ../ui/data.js (both on since Oct 22, 2026, see the note there); dev ?fxpreview=staging
import { fxSettings, loadFx, prepFx, showImpact, showTravel, isRanged } from '../ui/hit_fx.js?v=v0.2.69-alpha';

// player-side facing (Gary, Oct 23 2026): these back sprites were drawn facing LEFT (away from the foe), so the player side
// mirrors them (.b-flip) to face right. Visual review of all back sprites; the art can be redrawn later and the id dropped here.
const BACK_FACES_LEFT = new Set(['tumbloam', 'belfrydove', 'gnawford', 'ledgedove', 'hearthkit', 'kilnpaw', 'velvetabby', 'stonepede', 'pandember',
  'thistlepup', 'glarekit', 'somnarch', 'cinderwyrm', 'ondravel', 'charlurcher', 'foalgust', 'geysirox']);
// trainer intro (Gary, Oct 23 2026): player back view (cal; mira shares it) and the trainer's own battle sprite
const PIXD = 'art/characters/pixel/';
const PLAYER_BACK = PIXD + 'capture_poses/player/cal_back_capture_lowered.png';
const trainerSrcs = (sid) => sid ? [`${PIXD}npcs/${sid}/trainer/${sid}_trainer_64x128_2x.png`, `${PIXD}humans/${sid}/trainer/${sid}_trainer_64x128_2x.png`] : [];
const loadInto = (img, srcs) => new Promise((res) => {
  const go = (i) => { if (!img || i >= srcs.length) return res(false); img.onload = () => res(true); img.onerror = () => go(i + 1); img.src = srcs[i]; };
  go(0);
});

const KEY = 'system_battle'; // PH: proposed namespace for the new battle lines

export function makeSdBattle(ui, opts, h) {
  const { esc, front, back, fx, lvlOf, speciesById, ELEMENT_LABEL, statsFor } = h;
  const pace = (ms) => (ui.qol ? ui.qol.pace(ms) : ms), wait = (ms) => h.wait(pace(ms)); // [qol hook] Battle pace x1/x2/x3
  const P1 = (k, fb, v) => ui.P(`${KEY}.${k}`, [fb], v)[0];
  const trainer = !!opts.trainer;
  // no capturing a trainer's creatures (Gary, Oct 23 2026): any battle with an owner (trainer flag, overworld trainer id,
  // injected Master / hall team, explicit owner) is not wild, so the engine refuses the crystal and keeps it in the bag
  const owned = trainer || !!opts.who || !!opts.owner || !!opts.foes?.length;
  // v0.2.21 (Gary, Oct 24 2026): wild only, a species already in the Kilindex caught record gets a silver 'Owned' badge with a crystal on its left
  const kxCaught = ui.demo ? null : ui.scene?.systems?.kilindex?.data?.caught;
  const ownedBadge = (sp) => !owned && !!kxCaught && !!kxCaught[sp];
  const noCapture = () => ui.P('system_trainers.no_capture', ['That creature already has a trainer. A crystal won\'t take it.'])[0]; // PH: key requested in data/textbot_requests_capture.md
  // Model swap (Gary 3:16 PM CT Oct 23 2026, "model changed after using crystal"): with an empty real party the fallback Rillop used to
  // exist in this battle only, so a catch became the whole real party and led the next battle. With systems attached it now joins
  // the real party first (Party.list fills in uid/stats), so results, catches and the next battle all see the same team. Not saved here.
  const sysP = ui.demo ? null : ui.scene?.systems?.party;
  if (!ui.party().length && sysP && ui.scene) { ui.scene.party = [{ species: 'rillop', rt: 'RT-0147', level: statsFor({ species: 'rillop' }, 0).level }]; void sysP.list; ui.scene.onPartyChange?.(true); }
  const partySrc = ui.party().length ? ui.party() : [{ species: 'rillop', rt: 'RT-0147' }];
  // overworld entries have no level/HP yet: level from the same placeholder statsFor() the Team screen shows, HP full
  const party = partySrc.slice(0, 6).map((c, i) => ({ ...c, level: c.level || statsFor(c, i).level }));
  const lead = party[0];
  const foeSp = opts.foe || (lead.species === 'cindrip' ? 'rillop' : 'cindrip');
  const foeLv = opts.foeLevel || Math.max(2, lead.level - 1); // foeLevel: wild encounter slot level (src/battle/encounters.js)
  // PLACEHOLDER trainer team, only for trainers with no authored / injected team: two creatures around the lead's level
  // authored teams first (src/battle/data/trainer_teams.js, keyed by the overworld's {map, id}), then injected teams, then the placeholder
  const authored = trainer ? authoredTeam(opts.who, partySrc) : null;
  // carry (mode switch, Oct 29 2026): a wild fight switched over from real-time keeps its foes' HP (wild only; never owned)
  const carryFoes = !owned && opts.carry?.foes?.length ? opts.carry.foes.map((f) => ({ species: f.species, level: f.level, variant: f.variant || '', hp: Math.max(1, Math.round(f.hp)) })) : null;
  const foes = authored || carryFoes || (opts.foes?.length ? opts.foes.map((f) => ({ species: f.species, level: f.level })) // [progression hook] Master / hall teams (src/progression/masters.js, data/masters.json)
    : trainer ? [{ species: foeSp, level: foeLv }, { species: foeSp === 'tumbloam' ? 'burlbeetle' : 'tumbloam', level: foeLv }] : [{ species: foeSp, level: foeLv }]);
  const sys = ui.demo ? null : ui.scene?.systems; // [systems-gd hook] the real bag (src/systems); ?uidemo=1 keeps the demo team + demo bag (never saved)
  const bag = sys ? sys.bagForBattle() : Object.fromEntries(Object.entries(ui.bag || {}).filter(([, n]) => n > 0));
  const seed = opts.seed || (ui.q?.get('bseed') ? ui.q.get('bseed').split(',').map(Number) : undefined);
  const tInfo = trainer ? (async () => {
    const w = opts.who || {}; let e = {};
    try { e = (w.map && w.id && ui.scene?._entryFor?.(w.map, { id: w.id })) || {}; } catch { e = {}; }
    const cls = e.trainer_class || '', nm = e.name || '';
    const label = opts.trainerName || (cls && nm && cls !== nm ? `${cls} ${nm}` : nm || cls) || opts.foeName || 'Trainer';
    let sid = opts.trainerSprite || null;
    if (!sid && w.map && w.id) try { sid = (await (await fetch(PIXD + 'npcs/npc_sprite_map.json')).json()).map?.[`${w.map}.${w.id}`]?.sprite_id || null; } catch { sid = null; }
    return { label, sid };
  })() : null;
  // difficulty (Oct 29 2026): the battle fights scaled foes; payout (res.foes) keeps the authored levels, the money mult is in systems
  const dMode = getDifficulty(sys?.state), foesBattle = scaleFoes(foes, Math.max(...party.map((c) => c.level || 1)), dMode);
  const foeItems = trainer ? masterItems(opts.masterNumber || 0, dMode) : {};
  const qol = qolFlags(ui.q || undefined);
  const kb = new KilumenBattle({ party, foes: foesBattle, foeItems, foeDamageMult: diffOf(dMode).damage, foeHealAt: diffOf(dMode).healAt, foeHealsPer: diffOf(dMode).healsPer, wild: !owned, bag, seed, foeName: opts.foeName || (trainer ? 'Trainer' : 'Wild'), forceChance: opts.forceChance, xpBoost: sys?.rtBenefits?.effect?.('unit_training') || 1, xpShare: qol.xpShare ? XP_SHARE : 0 });
  let sharedSaid = false; // QoL #4: one line per KO for the benched share // Unit Training perk (v0.2.28)
  ui.currentBattle = kb; // read-only handle for scripted play-checks (tools/playcheck_browser.mjs)
  const cat = ui.T('system_item_catalogue', {});
  const Items = kb.battle.dex.data.Items;
  const itemName = (engineId) => { const it = Items[engineId]; return cat[it?.kGameId]?.name || it?.name || engineId; };

  // battle biome: picks the background and the ground platform art ('grass', 'water'; opts.biome or ?biome=)
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

  // Master heal (task E): a sparkle + bounce on the foe and a line with a little personality (PH strings; Text Bot request data/textbot_requests_overnight_1029.md)
  const FOE_HEAL_PH = ['{trainer} isn\'t done yet! A {item} for {creature}.', '{trainer} digs into the bag. {creature} gets a {item}!', '"Hold on, {creature}!" {trainer} uses a {item}.'];
  let foeHealN = 0;
  const foeItemFx = async (who, id) => {
    const img = $('#p2-mon'); const r = img.getBoundingClientRect(), lr = ui.layer.getBoundingClientRect();
    ui.sparkle?.(r.left - lr.left + r.width / 2, r.top - lr.top + r.height / 2, 16, host());
    img.animate?.([{ transform: 'translateY(0)', filter: 'brightness(1)' }, { transform: 'translateY(-10px)', filter: 'brightness(1.6) drop-shadow(0 0 8px #9fffb0)' }, { transform: 'translateY(0)', filter: 'brightness(1)' }], { duration: 520, easing: 'ease-out' });
    const line = FOE_HEAL_PH[foeHealN++ % FOE_HEAL_PH.length];
    await say(P1('foe_item_used', line, { trainer: opts.foeName || 'The trainer', item: itemName(id), creature: who }), 900);
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
      ${side === 'p1' ? '<div class="b-party" id="p1-party" role="img"></div>' : trainer ? '<div class="b-trbar"><span class="b-trname" id="p2-trname"></span><div class="b-party" id="p2-party" role="img"></div></div>' : ''}</div></div>`;
  scr.mount = (layer) => {
    // ground platforms (per biome, src/battle/data/platforms.js) replace the old .b-pad ellipses; each creature container's
    // bottom edge is its feet line (--feet, measured from the sprite), and the platform is centred on it
    const wPhase = ui.q?.get('phase') || ui.scene?.phase || 'day', bgUrl = biomeArt.bgFor ? biomeArt.bgFor(wPhase) : biomeArt.bg;
    const plat = (s, size) => biomeArt.art ? '' : `<img class="b-plat ${size}" id="${s}-plat" alt="" src="${drawPlatform(biome, size)}" style="--plat-w:${PLATFORM_SIZES[size].w}">`;
    layer.innerHTML = `<div class="ui-battle${trainer ? ' b-intro' : ''}" data-scr="battle" data-engine="sd" data-biome="${esc(biome)}"${biomeArt.art ? ' data-biome-art="1"' : ''}><div class="bg" style="background-image:url(${bgUrl})"></div>
      <div class="b-field"><div class="b-foe">${plat('p2', 'far')}${trainer ? `<img class="b-trainer-fig foe" id="tr-p2" alt="" hidden><div class="b-tr-spot" id="tr-spot" hidden><img class="b-plat far b-tr-plat" alt="" src="${biomeArt.art ? '' : drawPlatform(biome, 'far')}" style="--plat-w:${PLATFORM_SIZES.far.w}"></div>` : ''}<img class="ui-sprite b-mon" id="p2-mon" alt="" style="opacity:0"></div>
        <div class="b-ally">${plat('p1', 'near')}${trainer ? '<img class="b-trainer-fig ally" id="tr-p1" alt="" hidden>' : ''}<img class="ui-sprite b-mon" id="p1-mon" alt="" style="opacity:0"></div>
        ${plateHtml('p2')}${plateHtml('p1')}${trainer ? '<div class="b-intro-row foe" id="intro-p2" aria-hidden="true"></div><div class="b-intro-row ally" id="intro-p1" aria-hidden="true"></div>' : ''}</div>
      <div class="b-bottom"><div class="plate b-msg" id="b-msg" data-act="msg"></div><div class="ui-panel b-cmds" id="b-cmds" data-scr="battle" data-pat="waves" data-scroll hidden></div></div>
      <div class="b-bars"></div></div>`;
    root = layer.firstElementChild;
    if (biomeArt.live === 'water' && biomeArt.art) { // painted backdrop: animated layers over the still; creatures on the painted spots
      const bgEl = root.querySelector('.bg'), field = root.querySelector('.b-field');
      mountWaterArt(bgEl, { phase: wPhase, reduced: reducedMotion() });
      const place = () => { if (!root.isConnected) return removeEventListener('resize', place); const b = bgEl.getBoundingClientRect(), f = field.getBoundingClientRect(); if (!b.width) return;
        const cs = getComputedStyle(bgEl), frac = (v) => (/%$/.test(v) ? parseFloat(v) / 100 : 0.5), ax = frac(cs.backgroundPositionX), ay = frac(cs.backgroundPositionY);
        for (const [sel, [fx, fy]] of [['.b-ally', WATER_SPOTS.near], ['.b-foe', WATER_SPOTS.far]]) { const [x, y] = coverPoint(fx, fy, b.width, b.height, 1280, 720, ax, ay), el = root.querySelector(sel);
          el.style.left = `${x + b.left - f.left}px`; el.style.top = `${y + b.top - f.top}px`; } };
      place(); requestAnimationFrame(place); addEventListener('resize', place);
    } else if (biomeArt.live === 'water') { // live water layer; ripples follow the foe's platform once laid out
      const foe = { x: 0.8, y: 0.6 }, bgEl = root.querySelector('.bg');
      mountWaterBg(bgEl, { phase: wPhase, reduced: reducedMotion(), foe });
      requestAnimationFrame(() => { const pl = root.querySelector('#p2-plat')?.getBoundingClientRect(), r = bgEl.getBoundingClientRect(); if (pl?.width && r.width) { foe.x = (pl.left + pl.width / 2 - r.left) / r.width; foe.y = (pl.top + pl.height * 0.6 - r.top) / r.height; } });
    }
    if (opts.rtSwitch && !owned) mountModeSwitch();
    for (const s of ['p1', 'p2']) if (mon[s]) drawPlate(s);
    if (!scr.started) { scr.started = true; run(); }
  };
  const say = (t, auto = 650) => new Promise((r) => {
    const m = $('#b-msg'); m.classList.remove('b-msg-caught'); m.innerHTML = `${esc(t)}${auto ? '' : '<span class="more">▼</span>'}`; mode = 'msg'; $('#b-cmds').hidden = true;
    if (auto) setTimeout(r, pace(auto)); else msgResolve = r;
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
    { const el = $(`#${s}-name`), v = / ✦$/.test(m.name || ''); el.textContent = ''; const t = document.createElement('span'); t.className = 'nmt'; t.textContent = v ? m.name.slice(0, -2) : m.name; el.append(t); if (v) { const k = document.createElement('span'); k.className = 'vmark'; k.textContent = '✦'; el.append(k); } if (s === 'p2' && ownedBadge(m.species)) { const o = document.createElement('span'); o.className = 'b-owned'; o.innerHTML = '<svg viewBox="0 0 10 14" aria-hidden="true"><path d="M5 0 10 5 5 14 0 5Z" fill="#8fd8ff" stroke="#2a5d86" stroke-width="1"/><path d="M5 1.5 7.5 5 5 11 2.5 5Z" fill="#e6f8ff" opacity=".7"/></svg>Owned'; el.append(o); } el.classList.add('nmw'); } $(`#${s}-lv`).textContent = `Lv.${m.level}`;
    drawParty(s);
    const f = Math.max(0, m.hp / m.maxhp), b = $(`#${s}-hp`); b.dataset.lvl = lvlOf(f); b.firstElementChild.style.width = `${f * 100}%`;
    if (s === 'p1') {
      $('#p1-hpnum').textContent = `${m.hp}/${m.maxhp}`;
      const c = kb.p1.active[0], K = kb.battle.dex.data.Scripts.kilumen;
      if (c) { const lo = Math.floor(K.xpCurveMult * c.level ** 3), hi = Math.floor(K.xpCurveMult * (c.level + 1) ** 3); $('#p1-xp > i').style.width = `${Math.max(0, Math.min(100, ((c.set.xp ?? lo) - lo) / (hi - lo) * 100))}%`; }
    }
  };
  // One motion class at a time (Gary 2:41 PM CT Oct 23 2026, "faded" sprites): a new anim drops any earlier one still on the sprite, and only
  // the call that still owns the sprite clears it, so overlapping hit / lunge / enter calls can't leave it mid-flash (ui.css ui-hit filter).
  const MOTION = ['idle', 'enter', 'lunge-r', 'lunge-l', 'hit', 'faint'];
  const anim = (el, cls, ms) => { el.classList.remove(...MOTION); void el.offsetWidth; el.classList.add(cls); const tok = (el._animTok = (el._animTok || 0) + 1);
    return wait(ms).then(() => { if (el._animTok !== tok) return; el.classList.remove(cls); el.style.filter = ''; el.classList.add('idle'); }); };
  // Failed capture (Gary 3:14 PM CT Oct 23 2026, "after using dominance crystal"): the capture FX drives the foe sprite with inline
  // opacity / transform / filter (anime.js tweens, fx_art.js frame timers, .ax-lit) and only restored it from late async callbacks,
  // so a stalled tween or a late frame timer could leave it ghosted. Stop every script animation on it, clear the capture styles and
  // classes (capDone tells fx_art.js's leftover frame timers to keep off), then a short pop back (static under reduced motion).
  const restoreFoe = (img) => {
    if (!img) return; img.dataset.capDone = '1';
    try { const A = ui.fx?._A?.(); A?.utils?.remove?.(img); A?.remove?.(img); } catch { /* anime.js absent */ }
    img.getAnimations?.().forEach((a) => { if (!(globalThis.CSSAnimation && a instanceof CSSAnimation) && !(globalThis.CSSTransition && a instanceof CSSTransition)) a.cancel(); });
    img.classList.remove('ax-lit', ...MOTION); ['opacity', 'filter', 'transform', 'visibility', 'animation', 'translate', 'scale', 'rotate'].forEach((k) => img.style.removeProperty(k));
    img.classList.add('idle');
    if (!ui.fx?.reduced?.()) img.animate?.([{ transform: 'scale(.82)' }, { transform: 'scale(1.06)', offset: 0.6 }, { transform: 'none' }], { duration: 240, easing: 'ease-out' });
  };
  // the capture FX dims the player's creature to .35 while the crystal is up; its lower step reverted to that dimmed inline value
  // (gary_fade.png: Rillop ghosted). Clear it outright once the capture is over (both outcomes).
  const restoreAlly = (el) => { if (!el) return; try { const A = ui.fx?._A?.(); A?.utils?.remove?.(el); A?.remove?.(el); } catch { /* no anime */ }
    el.getAnimations?.().forEach((a) => { if (!(globalThis.CSSAnimation && a instanceof CSSAnimation) && !(globalThis.CSSTransition && a instanceof CSSTransition)) a.cancel(); });
    ['opacity', 'filter', 'transform', 'visibility', 'translate', 'scale', 'rotate'].forEach((k) => el.style.removeProperty(k)); };
  // Caught announcement (Gary 3:15 PM CT): the creature's small overworld follower sprite (art/characters/pixel/creatures/<id>/overworld/
  // <id>_ow_sheet.png, 64x64 frames, row 0 = facing down, col 0) centred under the text. Pops in; static under reduced motion. No sheet -> nothing.
  const caughtMon = (sp) => new Promise((res) => {
    if (!sp) return res(null); const url = `art/characters/pixel/creatures/${sp}/overworld/${sp}_ow_sheet.png`, im = new Image();
    im.onload = () => res(im.naturalWidth >= 64 && im.naturalHeight >= 64 ? { url, w: im.naturalWidth, h: im.naturalHeight } : null); im.onerror = () => res(null);
    im.src = url; setTimeout(() => res(null), 1500);
  });
  const showCaughtMon = (m, info) => {
    if (!m || !info) return; const d = document.createElement('i'); d.className = 'b-caught-mon'; d.setAttribute('aria-hidden', 'true');
    d.style.backgroundImage = `url(${info.url})`; d.style.backgroundSize = `${info.w}px ${info.h}px`;
    m.classList.add('b-msg-caught'); const more = m.querySelector('.more'); m.insertBefore(d, more);
    if (!ui.fx?.reduced?.()) d.animate?.([{ transform: 'translateY(6px) scale(.4)', opacity: 0 }, { transform: 'translateY(-2px) scale(1.12)', opacity: 1, offset: 0.65 }, { transform: 'none', opacity: 1 }], { duration: 320, easing: 'ease-out' });
  };
  // trainer intro: both trainers on their platforms, '<trainer> wants to battle!', large 6-slot crystal rows per side;
  // at send-out the rows give way to the small rows on the cards, the foe trainer steps aside (stays for the fight) and
  // the player's trainer slides off. Wild battles skip all of this.
  const introRow = (s, list) => {
    const el = $(`#intro-${s}`); if (!el) return;
    el.innerHTML = Array.from({ length: 6 }, (_, i) => `<i data-st="${i >= list.length ? 'empty' : list[i].hp === 0 ? 'out' : 'ok'}"></i>`).join('');
  };
  const intro = async () => {
    const t = await tInfo; if (!t) return;
    const nmEl = $('#p2-trname'); if (nmEl) nmEl.textContent = t.label;
    const [okF, okA] = await Promise.all([loadInto($('#tr-p2'), trainerSrcs(t.sid)), loadInto($('#tr-p1'), [PLAYER_BACK])]);
    if (okF) $('#tr-p2').hidden = false; if (okA) $('#tr-p1').hidden = false;
    introRow('p2', foes); introRow('p1', party);
    await say(P1('trainer_wants', '{trainer} wants to battle!', { trainer: t.label }) /* PH */, 0);
  };
  const endIntro = (s) => {
    const rb = ui.layer?.querySelector('.ui-battle'); if (!rb?.classList.contains('b-intro') && !rb?.classList.contains('b-intro-out')) return;
    rb.classList.remove('b-intro'); rb.classList.add('b-intro-out');
    if (s === 'p2') { // the trainer steps onto their own platform beside the creature's (same feet line), kept on screen
      const f = $('#tr-p2'), spot = $('#tr-spot'), box = rb?.querySelector('.b-foe');
      if (f && spot && box && !f.hidden) {
        spot.hidden = false; spot.appendChild(f); f.classList.add('aside');
        const over = spot.getBoundingClientRect().right - (ui.layer.getBoundingClientRect().right - 8);
        if (over > 0) box.style.right = `${(parseFloat(getComputedStyle(box).right) || 0) + over}px`;
      }
    }
    if (s === 'p1') { const f = $('#tr-p1'); if (f && !f.hidden) { f.classList.add('gone'); setTimeout(() => { f.hidden = true; }, 450); } }
  };
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
          if (trainer && first) endIntro(s);
          const img = $(`#${s}-mon`); img.src = cidleSrc(s === 'p2' ? front(sp) : back(sp)) || (s === 'p2' ? front(sp) : back(sp)); img.classList.toggle('b-flip', s === 'p1' && BACK_FACES_LEFT.has(sp)); img.style.opacity = '1'; setFeet(img);
          if (s === 'p2' && first && carryFoes) { const rl = reactionLines('turn', kb.p1.active[0]?.name, who); await say(rl.foe); }
          else if (s === 'p2' && !first && !trainer && !owned) await say(`Another wild ${who} jumps in!` /* PH */);
          else if (s === 'p2') await say(first && !trainer ? ui.P(opts.intro?.key || 'system_wild.grass', opts.intro?.fallback || ['{creature} bursts out of the grass!'], { creature: who })[0]
            : P1('foe_sends', 'Trainer sends out {creature}!', { creature: who }) /* PH */);
          else if (first && carryFoes) await say(reactionLines('turn', who, '').ally);
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
        case '-kxp': await say(P1('xp', '{creature} gained {n} XP.', { creature: who, n: b }) /* PH */, 700); drawPlate('p1'); sharedSaid = false; break;
        case '-kxpshare': if (d === 'band') { await say(P1('link_band_xp', '{creature} watched and learned: +{n} XP from the Team Link Band.', { creature: who, n: b }), 600); break; } if (!sharedSaid) { sharedSaid = true; await say(P1('xp_share', 'The rest of the team gained {n} XP.', { n: b }) /* PH: QoL #4, Text Bot request */, 600); } break;
        case '-kbenchlevel': await say(P1('bench_levelup', '{creature} grew to Lv.{level}!', { creature: who, level: b }) /* PH: QoL #4, Text Bot request */, 600); break;
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
        case '-kitem': if (s === 'p2') { await foeItemFx(who, b); break; } await say(P1('item_used', 'You used a {item} on {creature}.', { item: itemName(b), creature: who }) /* PH */, 700); break;
        case '-kcrystal': {
          await say(P1('crystal_throw', 'You held up a {item}.', { item: itemName(b) }) /* PH */, 600);
          const img = $('#p2-mon');
          // capture sequence (Oct 22, 2026; SOUL_PLAYBOOK 5.3): the trainer holds the crystal up, the foe streams in, c pulses (1-4, from the same capture roll: src/battle/capture.js),
          // then rune lock + bloom ('catch' chime) or the light bursts back out. ui_tools2.js catchFx -> capture_fx.js (one swap point per step)
          const ok = d === 'caught';
          await ui.fx?.catchFx(host(), { foe: img, ally: $('#p1-mon'), name: who, pulses: +c, caught: ok, el: $('#plate-p2')?.dataset.el });
          restoreAlly($('#p1-mon'));
          if (ok) { img.style.opacity = '0'; const mi = await caughtMon(mon.p2?.species); const said = say(P1('caught', '{creature} is with you now!', { creature: who }) /* PH */, 0); showCaughtMon($('#b-msg'), mi); await said; }
          else { restoreFoe(img); await say(P1('crystal_escape', '{creature} broke free!', { creature: who }) /* PH */, 700); }
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
    { t: 'Team', el: 'water', go: () => showTeam(false) }, { t: 'Retreat', el: 'wind', go: () => act('retreat') }, ...autoItem()],
  P1('prompt', 'What will {creature} do?', { creature: whoName() }) /* PH (old shell line) */);
  // dev console (v0.2.26): "Auto-complete" only while DEV.active (admin account + ?dev=1). Plays the rest of the battle through the normal
  // engine with a computer-picked player side (no animations), then the ordinary finish() below runs unchanged (XP split, evolutions, save after).
  const autoItem = () => (DEV.active ? [{ t: 'Auto-complete', el: 'light', go: () => guard(autoRun()) }] : []);
  const autoRun = async () => {
    if (!DEV.active || kb.ended || busy) return;
    busy = true; $('#b-cmds').hidden = true; $('#b-msg').textContent = 'Auto-completing…';
    const AB = await import('../dev/autobattle.js?v=v0.2.69-alpha');
    const entry = AB.runAuto(kb, { trainer, owned });
    if (!kb.ended) { busy = false; $('#b-msg').textContent = 'Auto-complete stopped early (see the dev battle logs).'; AB.afterFinish(entry); return; }
    await finish();
    AB.afterFinish(entry);
  };
  const showSkills = () => {
    const r = kb.request();
    showList('skills', r.moves.map((m, i) => { const mv = kb.battle.dex.moves.get(m.id); const el = mv.type.toLowerCase();
      let tag = ''; try { tag = skillTag(kb, m.id, qol); } catch { tag = ''; } // QoL #7 (flags matchup / dmgPreview)
      return { t: m.move, s: `${ELEMENT_LABEL(el)} · En ${m.pp}/${m.maxpp}${tag ? ' · ' + tag : ''}`, el, go: async () => {
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
  let pickAt = 0;
  const showTeam = (forced) => {
    const team = kb.request().team;
    // forced (the active one is out cold, Gary 3:17 PM CT "pick the next one until they are all dead"): list only the ones that can
    // still fight, no Back; a press already held from the faint text can't pick (input opens 350 ms later)
    if (forced) { pickAt = performance.now() + 350;
      return showList('forced', team.map((c, i) => ({ c, i })).filter(({ c, i }) => i > 0 && !c.fainted).map(({ c, i }) => ({ t: `${c.name} Lv.${c.level}`, s: `HP ${c.hp}/${c.maxhp}`,
        el: speciesById(c.species.id).el[0], go: () => act(`switch ${i + 1}`) })).concat(autoItem()), P1('send_next', 'Who goes in next?') /* PH */); }
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
    for (const { i, xp } of res.linkXp || []) { const t = res.team[i]; if (t && xp && res.outcome === 'win') await guard(say(P1('link_band_xp', '{creature} watched and learned: +{n} XP from the Team Link Band.', { creature: kb.p1.creature[i]?.name || t.species, n: xp }) /* PH */, 800)); }
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
  const run = () => guard((async () => { await wait(300); if (trainer) await intro(); await play(kb.drain()); await next(); })());

  // ---- battle mode switch (wild only, Oct 29 2026): turn-based -> real-time. The fight carries over: party HP / energy / XP / bag
  // go into the real party now (no outcome, nothing saved: the encounter script and the save guards block saves), foe HP rides in
  // the result's carry, and ui.js wireWild opens the real-time fight with it.
  let switching = false;
  const canSwitch = () => !switching && !closed() && !kb.ended && (!busy || (mode === 'msg' && !!msgResolve));
  let wantSwitch = null; // a press mid-animation is queued until the next message / menu (never lost)
  const doSwitch = () => {
    if (!canSwitch()) {
      if (switching || closed() || kb.ended || wantSwitch) return false;
      root?.querySelector('#b-mode')?.classList.add('queued');
      wantSwitch = setInterval(() => { if (closed() || kb.ended) { clearInterval(wantSwitch); wantSwitch = null; root?.querySelector('#b-mode')?.classList.remove('queued'); } else if (canSwitch()) { clearInterval(wantSwitch); wantSwitch = null; doSwitch(); } }, 80);
      return false;
    }
    switching = true; busy = true;
    const r = kb.result();
    const carry = { foes: kb.p2.creature.filter((c) => c.hp > 0).map((c) => ({ species: c.species.id, level: c.level, variant: c.set?.variant || '', hp: c.hp })) };
    const res = { outcome: 'switch', team: r.team, bag: r.bag, caught: null, carry, turns: r.turns };
    if (sys) res.systems = sys.applyBattleResult({ outcome: 'switch', team: r.team, bag: r.bag });
    else if (ui.bag) for (const [k, n] of Object.entries(r.bag)) ui.bag[k] = n;
    const done = scr.onDone; done?.(res); ui.closeAll();
    return true;
  };
  scr.modeSwitch = doSwitch; // tests / play-checks
  const mountModeSwitch = () => {
    const touch = !document.getElementById('touchpad')?.hidden;
    const btn = modeButton('rt', { touch }); btn.id = 'b-mode'; root.appendChild(btn);
    btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); doSwitch(); });
    btn.addEventListener('pointerdown', (e) => e.stopPropagation()); // never also advances the message box underneath
    const kd = (e) => {
      if (closed()) { window.removeEventListener('keydown', kd, true); return; }
      if (e.code !== 'KeyR' || e.repeat || ui.top !== scr) return;
      e.preventDefault(); e.stopPropagation(); doSwitch();
    };
    window.addEventListener('keydown', kd, true);
  };
  scr.handle = ({ dir, a, b }) => {
    if (mode === 'msg') { if ((a || b) && msgResolve) { const r = msgResolve; msgResolve = null; r(); } return; }
    if (busy) return;
    if (dir) { const dd = { up: -2, down: 2, left: -1, right: 1 }[dir]; const n = scr.count(); const i = scr.sel + dd; if (i >= 0 && i < n) { scr.sel = i; ui._markSel(); } }
    if (a) scr.onA(scr.sel); else if (b && !['cmd', 'forced'].includes(mode)) showCmds();
  };
  scr.onA = (i) => {
    if (mode === 'msg') { if (msgResolve) { const r = msgResolve; msgResolve = null; r(); } return; }
    if (busy || (mode === 'forced' && performance.now() < pickAt)) return;
    list[i]?.go?.();
  };
  scr.onAct = (a) => { if (a === 'msg' && msgResolve) { const r = msgResolve; msgResolve = null; r(); } };
  scr.onBack = () => { if (!busy && !['cmd', 'forced', 'msg'].includes(mode)) showCmds(); return false; };
  return scr;
}

/** Thrown by DOM steps after the battle was force-closed (ui.closeAll); guard() swallows it. */
export class BattleClosed extends Error { constructor() { super('battle closed'); this.name = 'BattleClosed'; } }

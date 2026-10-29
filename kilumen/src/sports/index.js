// Kilumen sports: the Brookhollow dash track. Talk to the coach (map npc dash_coach) -> venue screen: free practice
// (no fee, no prize, any time) or the tournament (150 fee, 1000 prize, every 3 in-game days, one entry per window) ->
// pick a team creature -> a meet (2 heats of 4 -> final of 4). Self-contained DOM overlay + canvas; touches no renderer
// or overworld code (the coach is reached through a wrap of systems.onInteract). ?sports=0 turns it all off (main.js);
// ?sports=1 also shows the old dev button. Oct 28 2026.
// Save rules: the coach talk runs inside scene.script() (checkpoint before, normal save after) and a saveGuard blocks
// saving the whole time the overlay is open, so the fee, the race and the prize land in one save after the overlay
// closes. Closing the tab mid-race reloads the pre-talk checkpoint: fee not taken, window not used.
import { S, t } from './strings.js?v=v0.2.41-alpha';
import { STATS, POINTS } from './rules.js?v=v0.2.41-alpha';
import { racerFromCreature, singleEntrant, pickRivals, DASH } from './dash.js?v=v0.2.41-alpha';
import { runMeet } from './meet.js?v=v0.2.41-alpha';
import { createRace, stepRace, applyStart, applyPush, applySprint, playerOf, markerQuality, startQuality, DIST, WINDOW_S } from './race.js?v=v0.2.41-alpha';
import { pingPong, walkFrame, parallax } from './ported.js?v=v0.2.41-alpha';
import { speciesAthletics } from './athletics.js?v=v0.2.41-alpha';
import { rngFor } from './rng.js?v=v0.2.41-alpha';
import { runRaceShow, runChampion, reducedMotion, showTime } from './hype.js?v=v0.2.41-alpha';
import { TOURNEY, VENUE, sportsState, canEnter, payEntry, settle, daysUntil, isTourneyDay } from './tournament.js?v=v0.2.41-alpha';

const W = 640, H = 360, PPM = 22, LANE_Y = [176, 222, 268, 314], SPR = 64;
const sheet = new Map();
function framesFor(sp) {
  if (!sheet.has(sp)) sheet.set(sp, [0, 1, 2, 3].map((f) => { const im = new Image(); im.src = `art/characters/pixel/creatures/${sp}/overworld/${sp}_ow/${sp}_ow_right_walk${f}_2x.png`; return im; }));
  return sheet.get(sp);
}
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const CSS = `
#sports-ov{position:fixed;inset:0;z-index:9000;background:#141a26ee;color:#f3ead2;font:14px/1.35 monospace;display:flex;align-items:center;justify-content:center;touch-action:manipulation;user-select:none}
#sports-ov .box{width:min(96vw,760px);max-height:94vh;overflow:auto;background:#22293a;border:3px solid #e8c26a;border-radius:6px;padding:12px}
#sports-ov h2{margin:0 0 6px;color:#ffd77a;font-size:20px}#sports-ov .sub{opacity:.8;margin-bottom:8px}
#sports-ov .mons{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px}
#sports-ov .mon{background:#2d3549;border:2px solid #44506b;border-radius:4px;padding:6px;cursor:pointer;display:flex;gap:8px}
#sports-ov .mon:hover,#sports-ov .mon.sel{border-color:#ffd77a}
#sports-ov .mon img{width:64px;height:64px;image-rendering:pixelated;flex:none}
#sports-ov .bar{height:6px;background:#11151f;margin:2px 0 3px;position:relative}#sports-ov .bar i{position:absolute;inset:0 auto 0 0;background:#7fd27a}
#sports-ov .tr{color:#9ad1ff;font-size:12px}
#sports-ov button{font:inherit;font-size:16px;padding:10px 16px;margin:8px 6px 0 0;background:#e8c26a;color:#1b1f2a;border:0;border-radius:4px;min-height:44px;cursor:pointer}
#sports-ov canvas{width:min(100vw,calc(100vh*16/9));height:auto;aspect-ratio:16/9;image-rendering:pixelated;display:block;background:#000}
#sports-ov table{border-collapse:collapse;width:100%;margin:4px 0 8px}#sports-ov td,#sports-ov th{padding:3px 6px;border-bottom:1px solid #3a4560;text-align:left}
#sports-ov tr.me td{color:#ffd77a;font-weight:bold}
#sports-ov .modes{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px}#sports-ov .mode{background:#2d3549;border:2px solid #44506b;border-radius:4px;padding:10px}#sports-ov .mode h3{margin:0 0 4px;color:#ffd77a;font-size:16px}#sports-ov .note{color:#e8a08a;min-height:1.3em}#sports-ov .gold{color:#ffd77a}#sports-ov button:disabled{opacity:.45;cursor:default}
#sports-btn{position:fixed;left:8px;top:8px;z-index:8000;font:13px monospace;padding:8px 10px;background:#e8c26acc;border:2px solid #1b1f2a;border-radius:4px;color:#1b1f2a;cursor:pointer}`;

export function attachSports(scene, { query, systems } = {}) {
  const st = { open: false, phase: 'closed', race: null, meet: null, prompt: null, log: [], mode: 'practice', onClose: null };
  const sys = () => systems || scene.systems;
  const wallet = () => sys()?.wallet;
  const sstate = () => sportsState(sys()?.state || (scene._sportsState ||= {}));
  const day = () => scene.clock?.day || 0;
  (scene.saveGuards ||= []).push(() => (st.open ? (st.phase === 'race' ? 'sports_race' : 'sports_menu') : null));
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  let ov = null, keyH = null, savedTs = 1;
  if (query?.get?.('sports') === '1') { const btn = document.createElement('button'); btn.id = 'sports-btn'; btn.textContent = S.menu_button; document.body.appendChild(btn); btn.addEventListener('click', () => openVenue()); }

  // ---- the coach in Brookhollow: systems.onInteract runs before the overworld's own NPC talk ----
  const coachAt = (fx, fy) => { const m = scene.map; if (m?.name !== VENUE.map) return null; const n = (m.npcs || m.json?.npcs || []).find((x) => x.id === VENUE.npcId); if (!n) return null; const live = scene.npcs?.list?.find?.((x) => x.def?.id === VENUE.npcId || x.id === VENUE.npcId); const x = live ? live.x : n.x, y = live ? live.y : n.y; return x === fx && y === fy ? n : null; };
  const hookInteract = (s) => {
    if (!s || s._sportsHooked) return; s._sportsHooked = true;
    const prev = s.onInteract.bind(s);
    s.onInteract = (fx, fy) => {
      if (coachAt(fx, fy)) { scene.script(async () => { await scene.say?.([S.coach_hello], { name: S.coach_name, portrait: null }); await openVenue(); }); return true; }
      return prev(fx, fy);
    };
  };
  hookInteract(sys());

  /** Opens the venue screen; resolves when the overlay closes. */
  function openVenue() {
    if (st.open) return Promise.resolve();
    open(); showVenue();
    return new Promise((res) => { st.onClose = res; });
  }
  function open() {
    if (st.open) return;
    st.open = true; st.phase = 'venue';
    savedTs = scene.timescale ?? 1; scene.timescale = 0;
    ov = document.createElement('div'); ov.id = 'sports-ov'; document.body.appendChild(ov);
    keyH = (e) => { e.stopPropagation(); if (e.type !== 'keydown') return; if ([' ', 'Enter', 'f', 'F', 'a', 'A'].includes(e.key)) { e.preventDefault(); st.tapFn?.(); } else if (e.key === 'Escape' && st.phase !== 'race' && st.phase !== 'champion') close(); };
    for (const ty of ['keydown', 'keyup']) window.addEventListener(ty, keyH, true);
  }
  function close() {
    if (!st.open) return;
    for (const ty of ['keydown', 'keyup']) window.removeEventListener(ty, keyH, true);
    ov?.remove(); ov = null; st.tapFn = null; st.open = false; st.phase = 'closed'; st.race = null;
    scene.timescale = savedTs;
    const cb = st.onClose; st.onClose = null; cb?.();
  }
  const team = () => (scene.party || []).filter((c) => c && c.species && !(c.hp === 0));
  const creatureKey = (c, i) => { if (!c.uid && !c.id) c._sportsSeed ||= `${c.species}:${i}:${c.nickname || ''}`; return c; };

  function statsBlock(r) {
    return STATS.map((s) => `<div>${esc(S['stat_' + s])} ${r.stats[s]}<div class="bar"><i style="width:${r.stats[s]}%"></i></div></div>`).join('') +
      `<div class="tr">${r.traits.map((x) => esc(S['trait_' + x])).join(' · ')}</div>`;
  }
  function racerOf(c, i) { creatureKey(c, i); const cc = c.uid || c.id ? c : { ...c, uid: c._sportsSeed }; const r = racerFromCreature(cc, true); if (!(c.uid || c.id)) c.ath = cc.ath; return r; }

  function tourneyStatus() {
    const d = day(), w = wallet(), c = canEnter({ day: d, coins: w?.coins ?? 0, state: sstate(), teamSize: team().length });
    const msg = c.ok ? S.tourney_open : c.reason === 'gold' ? t('tourney_need_gold', { fee: TOURNEY.fee }) : c.reason === 'no_team' ? S.no_team
      : c.reason === 'entered' ? t('tourney_entered', { n: daysUntil(d) || TOURNEY.everyDays }) : t(daysUntil(d) === 1 ? 'tourney_next_1' : 'tourney_next', { n: daysUntil(d) });
    return { ...c, msg };
  }
  function showVenue(note = '') {
    st.phase = 'venue'; st.tapFn = null; st.mode = 'practice';
    const w = wallet(), ts = tourneyStatus(), ss = sstate();
    ov.innerHTML = `<div class="box" id="sports-venue"><h2>${esc(S.venue_title)}</h2><div class="sub">${esc(S.venue_sub)}</div>
      <div class="sub">${esc(S.wallet)}: <span class="gold" id="sports-gold">${w ? w.coins.toLocaleString('en-US') : '-'}</span>${ss.best != null ? ' · ' + esc(S.best_time) + ' ' + showTime(ss.best).toFixed(2) + 's' : ''}${ss.wins ? ' · ' + esc(t('tourney_wins', { n: ss.wins })) : ''}</div>
      <div class="note">${esc(note)}</div>
      <div class="modes">
        <div class="mode"><h3>${esc(S.practice_title)}</h3><div>${esc(S.practice_desc)}</div><button data-a="practice">${esc(S.practice_go)}</button></div>
        <div class="mode" id="sports-tourney"><h3>${esc(S.tourney_title)}</h3><div>${esc(t('tourney_desc', { fee: TOURNEY.fee, prize: TOURNEY.prize, n: TOURNEY.everyDays }))}</div>
          <div class="note" id="sports-tourney-status">${esc(ts.msg)}</div><button data-a="tourney" ${ts.ok ? '' : 'disabled'}>${esc(t('tourney_go', { fee: TOURNEY.fee }))}</button></div>
      </div><button data-a="close">${esc(S.close)}</button></div>`;
    ov.querySelector('[data-a=close]').onclick = close;
    ov.querySelector('[data-a=practice]').onclick = () => { st.mode = 'practice'; showPicker(); };
    ov.querySelector('[data-a=tourney]').onclick = () => { if (!tourneyStatus().ok) return showVenue(tourneyStatus().msg); st.mode = 'tourney'; showPicker(); };
  }

  function showPicker() {
    st.phase = 'pick'; st.tapFn = null;
    const mons = team();
    ov.innerHTML = `<div class="box"><h2>${esc(S.title)}</h2><div class="sub">${esc(S.subtitle)}<br>${esc(mons.length ? S.pick_hint : S.no_team)}</div>
      <div class="mons">${mons.map((c, i) => { const r = racerOf(c, i); return `<div class="mon" data-i="${i}"><img src="${framesFor(c.species)[0].src}"><div style="flex:1"><b>${esc(r.name)}</b> <span class="tr">Lv${c.level || '?'}</span>${statsBlock(r)}</div></div>`; }).join('')}</div>
      ${st.mode === 'tourney' ? `<div class="note">${esc(t('tourney_pay_hint', { fee: TOURNEY.fee }))}</div>` : ''}
      <button data-a="close">${esc(S.back)}</button></div>`;
    ov.querySelector('[data-a=close]').onclick = () => showVenue();
    ov.querySelectorAll('.mon').forEach((el) => { el.onclick = () => {
      if (st.mode === 'tourney' && !payEntry({ day: day(), wallet: wallet(), state: sstate() })) return showVenue(tourneyStatus().msg);
      startMeet(mons[+el.dataset.i], +el.dataset.i);
    }; });
  }

  async function startMeet(c, idx) {
    const me = racerOf(c, idx);
    const seed = `${me.key}:${Date.now() >>> 10}`;
    const rivals = pickRivals(c, 7, seed + st.mode);
    const entrants = [singleEntrant(me), ...rivals.map(singleEntrant)];
    st.meet = { seed, me, entrants, races: [], mode: st.mode, best: sstate().best, prevWatched: null };
    const runHeat = async (eventId, field, label) => {
      const hasPlayer = field.some((e) => e.isPlayer);
      if (!hasPlayer) { const res = await DASH.run(field, { seed: seed + label }); st.meet.races.push({ label, res, watched: false }); return res; }
      const res = await playRace(field.map((e) => e.members[0]), seed + label, label);
      st.meet.races.push({ label, res: res.map((r) => ({ ...r, entrantId: field.find((e) => e.members[0].key === r.racer.key).id })), watched: true });
      return st.meet.races.at(-1).res;
    };
    const out = await runMeet('dash', entrants, runHeat);
    st.meet.out = out;
    await celebrate();
    showResults();
  }

  // ---- the live race: hype pass v2 (src/sports/hype.js) ----
  // DEV only: ?sportswin=1 slows the rivals so a test run can win the tournament (not in the live keep list).
  const forceWin = query?.get?.('sportswin') === '1';
  const rm = reducedMotion(query);
  function playRace(racers, seed, label) {
    st.phase = 'race';
    const race = createRace(racers, seed); st.race = race;
    if (forceWin) race.racers.forEach((r, i) => { if (!r.isPlayer) r.vTop *= 0.86 + 0.02 * (i % 2); });
    const me = playerOf(race), meet = st.meet;
    return runRaceShow({ st, ov, race, me, seed, label, isFinal: label === 'final', framesFor, audio: window.kilumen?.audio, reduced: rm,
      bestBefore: meet.best, prev: meet.prevWatched, setTap: (f) => { st.tapFn = f; } })
      .then((res) => { st.race = null; st.tapFn = null;
        meet.prevWatched = race.racers.map((r) => ({ key: r.key, finish: r.finish, isPlayer: r.isPlayer }));
        if (me.finish != null && (meet.best == null || me.finish < meet.best)) meet.best = me.finish;
        return res; });
  }

  function table(rows, meKey) {
    return `<table><tr><th>#</th><th></th><th>${esc(S.time)}</th><th></th></tr>${rows.map((r) => { const m = r.racer || {}; return `<tr class="${r.entrantId === meKey ? 'me' : ''}"><td>${esc(S['place_' + r.place] || r.place)}</td><td>${esc(m.name || r.entrantId)}${r.entrantId === meKey ? ' (' + esc(S.you) + ')' : ''}</td><td>${showTime(r.time).toFixed(2)}s</td><td>${r.points ? '+' + r.points : ''}</td></tr>`; }).join('')}</table>`;
  }
  function finalOf() {
    const { out, me, races } = st.meet;
    const nameFix = (placed, label) => placed.map((p) => ({ ...p, racer: p.racer || races.find((x) => x.label === label)?.res.find((x) => x.entrantId === p.entrantId)?.racer }));
    const fin = nameFix(out.final, 'final');
    return { fin, mine: fin.find((r) => r.entrantId === me.key), nameFix };
  }
  function settleMeet() {
    if (st.meet.settled) return; st.meet.settled = true;
    const { me, races } = st.meet, { mine } = finalOf(), tour = st.meet.mode === 'tourney';
    const myBest = Math.min(...races.flatMap((r) => r.res.filter((x) => x.entrantId === me.key).map((x) => x.time)));
    st.meet.myBest = myBest; st.meet.coinsBefore = wallet()?.coins ?? 0;
    if (tour) st.meet.prize = settle({ place: mine?.place, time: myBest, wallet: wallet(), state: sstate() });
    else { const ss = sstate(); ss.practice++; if (Number.isFinite(myBest) && (ss.best == null || myBest < ss.best)) ss.best = +myBest.toFixed(2); }
  }
  /** Tournament win -> the champion screen (the prize is already in the wallet; the screen counts it up). */
  async function celebrate() {
    settleMeet();
    if (st.meet.mode !== 'tourney' || !st.meet.prize) return;
    st.phase = 'champion';
    const ss = sstate(); ss.pid ??= Math.floor(Math.random() * 100000);
    const { mine } = finalOf();
    const team = (scene.party || []).filter((c) => c?.species);
    const lead = team.findIndex((c) => (c.uid || c.id || c._sportsSeed) === st.meet.me.key);
    const order = lead > 0 ? [team[lead], ...team.filter((_, i) => i !== lead)] : team;
    const big = (sp) => { const im = new Image(); im.src = `art/characters/pixel/creatures/${sp}/battle/${sp}_front_128.png`; im.onerror = () => { im.onerror = null; im.src = `art/characters/pixel/creatures/${sp}/base/${sp}_front.png`; }; return im; };
    await runChampion({ st, ov, party: order.map((c) => c.species), playerSrc: 'art/characters/pixel/humans/cal/run_bike/frames_3x/cal_chibi_down_run0_3x.png',
      name: scene.config?.playerName || 'Cal', id: ss.pid, time: mine?.time ?? st.meet.myBest, coinsFrom: st.meet.coinsBefore, prize: st.meet.prize, reduced: rm, audio: window.kilumen?.audio, framesBig: big });
    st.tapFn = null; st.champ = null;
  }
  function showResults() {
    st.phase = 'results'; st.tapFn = null;
    const { out, me, races } = st.meet;
    const nameFix = (placed, label) => placed.map((p) => ({ ...p, racer: p.racer || races.find((x) => x.label === label)?.res.find((x) => x.entrantId === p.entrantId)?.racer }));
    const fin = nameFix(out.final, 'final'), mine = fin.find((r) => r.entrantId === me.key);
    const verdict = mine ? (mine.place === 1 ? S.result_win : mine.place <= 3 ? S.result_podium : S.result_lose) : S.result_out;
    const tour = st.meet.mode === 'tourney';
    settleMeet();
    const extra = tour ? (st.meet.prize ? t('tourney_prize', { prize: TOURNEY.prize }) : S.tourney_no_prize) : S.practice_note;
    ov.innerHTML = `<div class="box" id="sports-results"><h2>${esc(S.results)}: ${esc(tour ? S.tourney_title : S.practice_title)}</h2><div class="sub">${esc(verdict)}</div><div class="sub gold" id="sports-prize">${esc(extra)}${wallet() ? ' · ' + esc(S.wallet) + ': ' + wallet().coins.toLocaleString('en-US') : ''}</div>
      <b>${esc(S.final)}</b>${table(fin, me.key)}
      ${out.heats.map((h, i) => `<b>${esc(t('heat', { n: i + 1 }))}</b>${table(nameFix(h.placed, h.label), me.key)}`).join('')}
      ${tour ? '' : `<button data-a="again">${esc(S.race_again)}</button>`}<button data-a="close">${esc(S.back)}</button></div>`;
    ov.querySelector('[data-a=again]')?.addEventListener('click', () => { st.mode = 'practice'; showPicker(); });
    ov.querySelector('[data-a=close]').onclick = () => showVenue();
  }

  const api = { openVenue, hookInteract, tourney: () => ({ day: day(), tourneyDay: isTourneyDay(day()), daysUntil: daysUntil(day()), coins: wallet()?.coins ?? null, state: { ...sstate() }, status: tourneyStatus() }), state: () => ({ open: st.open, phase: st.phase, mode: st.mode, prompt: st.prompt?.kind || null, promptT0: st.prompt?.t0 ?? null, clock: st.race?.clock ?? null, log: st.log.slice(), fx: st.fx || null, champ: st.champ || null, forceWin }), open, close, tap: () => st.tapFn?.(), points: POINTS, speciesAthletics };
  return api;
}

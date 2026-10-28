// Kilumen sports: the Brookhollow dash track. Talk to the coach (map npc dash_coach) -> venue screen: free practice
// (no fee, no prize, any time) or the tournament (150 fee, 1000 prize, every 3 in-game days, one entry per window) ->
// pick a team creature -> a meet (2 heats of 4 -> final of 4). Self-contained DOM overlay + canvas; touches no renderer
// or overworld code (the coach is reached through a wrap of systems.onInteract). ?sports=0 turns it all off (main.js);
// ?sports=1 also shows the old dev button. Oct 28 2026.
// Save rules: the coach talk runs inside scene.script() (checkpoint before, normal save after) and a saveGuard blocks
// saving the whole time the overlay is open, so the fee, the race and the prize land in one save after the overlay
// closes. Closing the tab mid-race reloads the pre-talk checkpoint: fee not taken, window not used.
import { S, t } from './strings.js?v=v0.2.37-alpha';
import { STATS, POINTS } from './rules.js?v=v0.2.37-alpha';
import { racerFromCreature, singleEntrant, pickRivals, DASH } from './dash.js?v=v0.2.37-alpha';
import { runMeet } from './meet.js?v=v0.2.37-alpha';
import { createRace, stepRace, applyStart, applyPush, applySprint, playerOf, markerQuality, startQuality, DIST, WINDOW_S } from './race.js?v=v0.2.37-alpha';
import { pingPong, walkFrame, parallax } from './ported.js?v=v0.2.37-alpha';
import { speciesAthletics } from './athletics.js?v=v0.2.37-alpha';
import { rngFor } from './rng.js?v=v0.2.37-alpha';
import { TOURNEY, VENUE, sportsState, canEnter, payEntry, settle, daysUntil, isTourneyDay } from './tournament.js?v=v0.2.37-alpha';

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
  let ov = null, keyH = null, savedTs = 1, tapFn = null;
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
    keyH = (e) => { e.stopPropagation(); if (e.type !== 'keydown') return; if ([' ', 'Enter', 'f', 'F', 'a', 'A'].includes(e.key)) { e.preventDefault(); tapFn?.(); } else if (e.key === 'Escape' && st.phase !== 'race') close(); };
    for (const ty of ['keydown', 'keyup']) window.addEventListener(ty, keyH, true);
  }
  function close() {
    if (!st.open) return;
    for (const ty of ['keydown', 'keyup']) window.removeEventListener(ty, keyH, true);
    ov?.remove(); ov = null; tapFn = null; st.open = false; st.phase = 'closed'; st.race = null;
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
    st.phase = 'venue'; tapFn = null; st.mode = 'practice';
    const w = wallet(), ts = tourneyStatus(), ss = sstate();
    ov.innerHTML = `<div class="box" id="sports-venue"><h2>${esc(S.venue_title)}</h2><div class="sub">${esc(S.venue_sub)}</div>
      <div class="sub">${esc(S.wallet)}: <span class="gold" id="sports-gold">${w ? w.coins.toLocaleString('en-US') : '-'}</span>${ss.best != null ? ' · ' + esc(S.best_time) + ' ' + ss.best.toFixed(2) + 's' : ''}${ss.wins ? ' · ' + esc(t('tourney_wins', { n: ss.wins })) : ''}</div>
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
    st.phase = 'pick'; tapFn = null;
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
    st.meet = { seed, me, entrants, races: [], mode: st.mode };
    const runHeat = async (eventId, field, label) => {
      const hasPlayer = field.some((e) => e.isPlayer);
      if (!hasPlayer) { const res = await DASH.run(field, { seed: seed + label }); st.meet.races.push({ label, res, watched: false }); return res; }
      const res = await playRace(field.map((e) => e.members[0]), seed + label, label);
      st.meet.races.push({ label, res: res.map((r) => ({ ...r, entrantId: field.find((e) => e.members[0].key === r.racer.key).id })), watched: true });
      return st.meet.races.at(-1).res;
    };
    const out = await runMeet('dash', entrants, runHeat);
    st.meet.out = out;
    showResults();
  }

  // ---- the live race ----
  function playRace(racers, seed, label) {
    return new Promise((resolve) => {
      st.phase = 'race';
      ov.innerHTML = `<canvas width="${W}" height="${H}"></canvas>`;
      const cv = ov.querySelector('canvas'), g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
      const race = createRace(racers, seed); st.race = race;
      const me = playerOf(race), rng = rngFor('cd:' + seed);
      const setLen = 0.9 + rng() * 0.8; // random hold on "Set" so the GO can't be counted in
      let tReal = -(0.9 + setLen), last = performance.now(), acc = 0, banner = null, bannerT = 0, ended = false, endT = 0;
      const half = 0.07 + (me.stats.focus / 100) * 0.08;
      const say = (s) => { banner = s; bannerT = 0.9; };
      const rate = (q) => (q >= 0.85 ? S.perfect : q >= 0.6 ? S.good : q > 0 ? S.late : S.missed);
      tapFn = () => {
        if (me.inputs.start === null) { const q = tReal < 0 ? -1 : startQuality(tReal); applyStart(race, me, q); say(q < 0 ? S.false_start : rate(q)); st.log.push(['start', q]); return; }
        if (st.prompt) { const q = markerQuality(pingPong(race.clock - st.prompt.t0), 0.5, half); (st.prompt.kind === 'push' ? applyPush : applySprint)(race, me, q); say(rate(q)); st.log.push([st.prompt.kind, q]); st.prompt = null; }
      };
      cv.addEventListener('pointerdown', (e) => { e.preventDefault(); tapFn?.(); });
      const frame = (now) => {
        if (!st.open) return;
        const dt = Math.min(0.1, (now - last) / 1000); last = now; tReal += dt; bannerT -= dt;
        if (tReal >= 0) {
          if (me.inputs.start === null && tReal > 1) { applyStart(race, me, 0); say(S.missed); }
          acc += dt;
          while (acc >= 1 / 60 && !race.finished) { acc -= 1 / 60; for (const e of stepRace(race, 1 / 60)) if (e.key === me.key && (e.type === 'push' || e.type === 'sprint')) st.prompt = { kind: e.type, t0: race.clock }; }
          if (st.prompt && (me.inputs[st.prompt.kind] !== null)) { if (me.inputs[st.prompt.kind] === 0) say(S.missed); st.prompt = null; }
          if (st.prompt && race.clock - st.prompt.t0 > WINDOW_S) st.prompt = null;
        }
        draw(g, race, me, tReal, setLen, banner && bannerT > 0 ? banner : null, half);
        if (race.finished && !ended) { ended = true; endT = tReal; }
        if (ended && tReal - endT > 1.6) { st.race = null; tapFn = null; resolve(race.racers.map((r) => ({ time: r.finish, racer: r }))); return; }
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
  }

  function draw(g, race, me, tReal, setLen, banner, half) {
    const focusX = me.x;
    const camX = Math.max(0, Math.min(DIST * PPM - W + 160, focusX * PPM - 200));
    const px = parallax(camX);
    // sky + stands (far layer)
    g.fillStyle = '#7ec8f0'; g.fillRect(0, 0, W, 90); g.fillStyle = '#9fd8f4'; g.fillRect(0, 60, W, 30);
    g.fillStyle = '#5a4a6a'; g.fillRect(0, 90, W, 58);
    const off = ((px.far % 16) + 16) % 16;
    const crowd = ['#e86a5a', '#f3d36a', '#6ac0e8', '#f3ead2', '#8ad46a', '#c58ae8'];
    for (let y = 96; y < 144; y += 8) for (let x = -16; x < W + 16; x += 8) { const k = Math.abs(((x - off + camX * 0.5) / 8 | 0) * 7 + y * 3) % crowd.length; g.fillStyle = crowd[k]; g.fillRect(x + off - 16 + ((y / 8) % 2) * 4, y + ((tReal * 3 + x) % 2 > 1 ? 1 : 0), 4, 4); }
    g.fillStyle = '#3b3048'; g.fillRect(0, 144, W, 6);
    // track (near layer)
    g.fillStyle = '#c4573f'; g.fillRect(0, 150, W, 196);
    g.fillStyle = '#f3ead2'; for (const y of [152, 199, 245, 291, 338]) g.fillRect(0, y, W, 2);
    g.fillStyle = '#4f8a3a'; g.fillRect(0, 346, W, 14);
    for (let m = 0; m <= DIST; m += 10) { const x = m * PPM - camX + 40; if (x < -40 || x > W + 40) continue; g.fillStyle = '#f3ead2aa'; g.fillRect(x, 152, 2, 188); g.fillStyle = '#fff'; g.font = '10px monospace'; g.fillText(m + 'm', x + 3, 162); }
    const fx = DIST * PPM - camX + 40; for (let y = 152; y < 340; y += 6) for (let k = 0; k < 2; k++) { g.fillStyle = ((y / 6 + k) | 0) % 2 ? '#111' : '#fff'; g.fillRect(fx + k * 6, y, 6, 6); }
    // racers
    for (const r of race.racers) {
      const fr = framesFor(r.species), moving = r.v > 0.2;
      const im = fr[moving ? walkFrame(r.x) : 0];
      const x = Math.round(r.x * PPM - camX + 40 - SPR + 12), y = LANE_Y[r.lane] - SPR + 6;
      g.fillStyle = '#00000044'; g.fillRect(x + 14, LANE_Y[r.lane] + 2, 36, 5);
      if (im.complete && im.naturalWidth) g.drawImage(im, x, y + (moving && walkFrame(r.x) % 2 ? -2 : 0), SPR, SPR);
      g.fillStyle = r.isPlayer ? '#ffd77a' : '#f3ead2'; g.font = '10px monospace'; g.fillText((r.isPlayer ? '▶ ' : '') + r.name, Math.max(2, x + 4), y + 2);
    }
    // HUD: progress strip + stamina
    g.fillStyle = '#141a26cc'; g.fillRect(0, 0, W, 24);
    g.fillStyle = '#44506b'; g.fillRect(90, 10, 440, 4);
    for (const r of race.racers) { g.fillStyle = r.isPlayer ? '#ffd77a' : '#9ad1ff'; g.fillRect(90 + (r.x / DIST) * 436, 6 + r.lane * 1, 4, 10); }
    g.fillStyle = '#f3ead2'; g.font = '11px monospace'; g.fillText((Math.max(0, race.clock)).toFixed(1) + 's', 8, 16);
    g.fillText(S.stat_stamina, 540, 16); g.fillStyle = '#44506b'; g.fillRect(540, 18, 90, 4); g.fillStyle = '#7fd27a'; g.fillRect(540, 18, 90 * (me.energy / me.pool), 4);
    // countdown
    g.textAlign = 'center';
    if (tReal < 0 || (tReal < 0.7 && me.inputs.start !== -1)) {
      const txt = tReal < -setLen ? S.ready : tReal < 0 ? S.set : S.go;
      g.fillStyle = '#141a26cc'; g.fillRect(W / 2 - 110, 40, 220, 58); g.fillStyle = tReal >= 0 ? '#7fd27a' : '#ffd77a'; g.font = 'bold 28px monospace'; g.fillText(txt, W / 2, 76);
      g.fillStyle = '#f3ead2'; g.font = '11px monospace'; g.fillText(S.tap_go, W / 2, 92);
    }
    if (st.prompt) {
      const p = pingPong(race.clock - st.prompt.t0), bx = W / 2 - 150;
      g.fillStyle = '#141a26dd'; g.fillRect(bx - 8, 34, 316, 56);
      g.fillStyle = '#f3ead2'; g.font = '12px monospace'; g.fillText(st.prompt.kind === 'push' ? S.push_prompt : S.sprint_prompt, W / 2, 50);
      g.fillStyle = '#44506b'; g.fillRect(bx, 60, 300, 18); g.fillStyle = '#7fd27a'; g.fillRect(bx + 300 * (0.5 - half), 60, 300 * half * 2, 18);
      g.fillStyle = '#ffd77a'; g.fillRect(bx + 300 * p - 2, 56, 4, 26);
      g.fillStyle = '#e86a5a'; g.fillRect(bx, 84, 300 * (1 - (race.clock - st.prompt.t0) / WINDOW_S), 3);
    }
    if (banner) { g.fillStyle = '#ffd77a'; g.font = 'bold 18px monospace'; g.fillText(banner, W / 2, 124); }
    g.textAlign = 'left';
  }

  function table(rows, meKey) {
    return `<table><tr><th>#</th><th></th><th>${esc(S.time)}</th><th></th></tr>${rows.map((r) => { const m = r.racer || {}; return `<tr class="${r.entrantId === meKey ? 'me' : ''}"><td>${esc(S['place_' + r.place] || r.place)}</td><td>${esc(m.name || r.entrantId)}${r.entrantId === meKey ? ' (' + esc(S.you) + ')' : ''}</td><td>${r.time.toFixed(2)}s</td><td>${r.points ? '+' + r.points : ''}</td></tr>`; }).join('')}</table>`;
  }
  function showResults() {
    st.phase = 'results'; tapFn = null;
    const { out, me, races } = st.meet;
    const nameFix = (placed, label) => placed.map((p) => ({ ...p, racer: p.racer || races.find((x) => x.label === label)?.res.find((x) => x.entrantId === p.entrantId)?.racer }));
    const fin = nameFix(out.final, 'final'), mine = fin.find((r) => r.entrantId === me.key);
    const verdict = mine ? (mine.place === 1 ? S.result_win : mine.place <= 3 ? S.result_podium : S.result_lose) : S.result_out;
    const tour = st.meet.mode === 'tourney';
    if (!st.meet.settled) {
      st.meet.settled = true; const myBest = Math.min(...races.flatMap((r) => r.res.filter((x) => x.entrantId === me.key).map((x) => x.time)));
      if (tour) st.meet.prize = settle({ place: mine?.place, time: myBest, wallet: wallet(), state: sstate() });
      else { const ss = sstate(); ss.practice++; if (Number.isFinite(myBest) && (ss.best == null || myBest < ss.best)) ss.best = +myBest.toFixed(2); }
    }
    const extra = tour ? (st.meet.prize ? t('tourney_prize', { prize: TOURNEY.prize }) : S.tourney_no_prize) : S.practice_note;
    ov.innerHTML = `<div class="box" id="sports-results"><h2>${esc(S.results)}: ${esc(tour ? S.tourney_title : S.practice_title)}</h2><div class="sub">${esc(verdict)}</div><div class="sub gold" id="sports-prize">${esc(extra)}${wallet() ? ' · ' + esc(S.wallet) + ': ' + wallet().coins.toLocaleString('en-US') : ''}</div>
      <b>${esc(S.final)}</b>${table(fin, me.key)}
      ${out.heats.map((h, i) => `<b>${esc(t('heat', { n: i + 1 }))}</b>${table(nameFix(h.placed, h.label), me.key)}`).join('')}
      ${tour ? '' : `<button data-a="again">${esc(S.race_again)}</button>`}<button data-a="close">${esc(S.back)}</button></div>`;
    ov.querySelector('[data-a=again]')?.addEventListener('click', () => { st.mode = 'practice'; showPicker(); });
    ov.querySelector('[data-a=close]').onclick = () => showVenue();
  }

  const api = { openVenue, hookInteract, tourney: () => ({ day: day(), tourneyDay: isTourneyDay(day()), daysUntil: daysUntil(day()), coins: wallet()?.coins ?? null, state: { ...sstate() }, status: tourneyStatus() }), state: () => ({ open: st.open, phase: st.phase, mode: st.mode, prompt: st.prompt?.kind || null, promptT0: st.prompt?.t0 ?? null, clock: st.race?.clock ?? null, log: st.log.slice() }), open, close, tap: () => tapFn?.(), points: POINTS, speciesAthletics };
  return api;
}

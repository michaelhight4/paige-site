// Olympics UI (dev/olympics, Oct 30 2026): assign screen -> 3 x (event lanes -> results board) -> final standings -> champion.
// TAP ONLY: every control is a button/tap target; nothing needs a hold or a drag. Reuses the #town-ev overlay styles
// (town_ui.js CSS) and runChampion (hype.js) for the champion screen. Logic: olympics.js. Text: olympics_strings.js.
import { OLY_EVENTS, VENUES, canEnterOly, autoAssign, assignTap, validAssign, olyRivals, runOlympics, settleOlympics, wonFlag } from './olympics.js?v=v0.2.107-alpha';
import { OS, ot } from './olympics_strings.js?v=v0.2.107-alpha';
import { athleticStats } from './athletics.js?v=v0.2.107-alpha';
import { diffOf, getDifficulty } from '../systems/difficulty.js?v=v0.2.107-alpha';
import { reducedMotion } from './hype.js?v=v0.2.107-alpha';
import { animPlan, drawOlyFrame, frameSrc, AW, AH } from './olympics_anim.js?v=v0.2.107-alpha';
import { onTap } from '../shared/tap_guard.js?v=v0.2.107-alpha';
import { podiumPlan, drawPodiumPixels, drawPodiumText, PW, PH } from './olympics_podium.js?v=v0.2.107-alpha';

const CSS = `#town-ev.oly .ev{border:2px solid #384260;border-radius:6px;margin:4px auto;padding:4px 6px;max-width:520px;cursor:pointer;text-align:left}
#town-ev.oly .ev.on{border-color:#e8c26a;background:#1a2238}#town-ev.oly .ev small{opacity:.75}#town-ev.oly .ev b{color:#e8c26a}
#town-ev.oly .kl{display:flex;flex-wrap:wrap;justify-content:center;gap:4px}#town-ev.oly .kl button{min-height:44px;min-width:88px}
#town-ev.oly .kl button.in{border-color:#e8c26a;color:#e8c26a}#town-ev.oly button{min-height:44px}
#town-ev.oly table{margin:4px auto;border-collapse:collapse;font-size:13px}#town-ev.oly td,#town-ev.oly th{padding:2px 7px}#town-ev.oly tr.me{color:#e8c26a;font-weight:bold}
#town-ev.oly .box.wide{width:min(98vw,780px);padding:6px}#town-ev.oly canvas.lanes{width:min(100%,760px,calc((100vh - 104px)*16/9));aspect-ratio:16/9;display:block;margin:0 auto;background:#0d1320;border-radius:4px;image-rendering:pixelated;cursor:pointer}
#town-ev.oly .box.wide h2{margin:0 0 4px;font-size:15px}#town-ev.oly .skip{font-size:11px;opacity:.7}
#town-ev.oly .champ{font-size:22px;color:#e8c26a;margin:10px 0}
#town-ev.oly .box.podbox{width:auto;max-width:none;max-height:none;padding:0;border:0;background:none;overflow:visible}
#town-ev.oly .pod{position:relative;line-height:0}#town-ev.oly canvas.podium{display:block;image-rendering:pixelated;border-radius:4px;cursor:pointer;touch-action:none}
#town-ev.oly .podgo{position:absolute;right:1.2%;bottom:1.5%;min-height:40px;line-height:1.2;background:#384260ee}`;
const nameOf = (c) => c.nickname || c.name || c.species;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const imgSrc = (sp) => `art/characters/pixel/creatures/${sp}/overworld/${sp}_ow/${sp}_ow_right_walk0_2x.png`;

export function attachOlympics(scene, { sys, sstate, isOpen }) {
  const day = () => scene.clock?.day || 0, rm = reducedMotion(new URLSearchParams(location.search));
  const st = { open: false, phase: 'closed', venue: null, assign: null, sel: 0, run: null, i: 0, result: null, raf: 0 };
  (scene.saveGuards ||= []).push(() => (st.open ? 'olympics' : null));
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  let ov = null, savedTs = 1;
  const team = () => (scene.party || []).filter((c) => c && c.species && c.hp !== 0);
  const statsOf = (c) => { try { return athleticStats(c.uid || c.id ? c : { ...c, uid: `${c.species}:${c.nickname || ''}` }); } catch (e) { return {}; } };
  const mine = () => team().map((c) => ({ c, species: c.species, level: c.level || 1, stats: statsOf(c), name: nameOf(c) }));
  const status = (venue) => { const flags = scene.flags || new Set(), c = canEnterOly({ venue, flags, teamSize: team().length, day: day(), sstate: sstate() });
    const V = OS.venue[venue] || venue;
    const msg = c.ok ? '' : c.reason === 'locked' ? (venue === 'aurelith' ? ot(OS.locked_aurelith, { missing: c.missing }) : ot(OS.locked_town, { venue: V })) : c.reason === 'team' ? OS.team : OS.entered;
    return { ...c, msg }; };
  const box = (html) => { ov.innerHTML = `<div class="box">${html}</div>`; };
  const on = (sel, fn) => ov.querySelectorAll(sel).forEach((b) => (b.onclick = fn)); // touch-ok: click handler (tap), no hold or drag

  function open(venue) {
    if (st.open || isOpen?.() || !VENUES[venue]) return Promise.resolve();
    st.open = true; st.venue = venue; savedTs = scene.timescale ?? 1; scene.timescale = 0;
    ov = document.createElement('div'); ov.id = 'town-ev'; ov.className = 'oly'; document.body.appendChild(ov);
    window.addEventListener('keydown', key, true);
    const s = status(venue);
    if (!s.ok) { st.phase = 'locked'; box(`<h2>${esc(ot(OS.title, { venue: OS.venue[venue] }))}</h2><div id="oly-locked">${esc(s.msg)}</div><button data-a="x">${esc(OS.leave)}</button>`); on('[data-a=x]', close); }
    else { const k = mine(); st.assign = autoAssign(VENUES[venue], k); st.sel = 0; showAssign(); }
    return new Promise((res) => { st.onClose = res; });
  }
  function close() { cancelAnimationFrame(st.raf); st.unsize?.(); st.unsize = null; window.removeEventListener('keydown', key, true); ov?.remove(); ov = null; st.open = false; st.phase = 'closed'; scene.timescale = savedTs; const cb = st.onClose; st.onClose = null; cb?.(); }
  function key(e) { e.stopPropagation(); if (e.type === 'keydown' && e.key === 'Escape' && (st.phase === 'assign' || st.phase === 'locked')) close(); }

  function showAssign() {
    st.phase = 'assign'; const k = mine(), ids = VENUES[st.venue];
    box(`<h2>${esc(ot(OS.title, { venue: OS.venue[st.venue] }))}</h2><div>${esc(OS.intro)}</div><div style="opacity:.8">${esc(OS.assign_hint)}</div>
      ${ids.map((id, e) => { const c = k[st.assign[e]]; return `<div class="ev${e === st.sel ? ' on' : ''}" data-e="${e}">${e + 1}. <b>${esc(OS.events[id])}</b> <small>(${Object.keys(OLY_EVENTS[id].w).map((s) => OS.stats[s]).join(' + ')})</small> → ${c ? `<img src="${imgSrc(c.species)}" style="height:28px;vertical-align:middle;image-rendering:pixelated"> ${esc(c.name)}` : '-'}</div>`; }).join('')}
      <div class="kl">${k.map((c, i) => `<button data-k="${i}" class="${st.assign.includes(i) ? 'in' : ''}">${esc(c.name)} L${c.level}</button>`).join('')}</div>
      <button data-a="go" ${validAssign(st.assign, k.length) ? '' : 'disabled'}>${esc(OS.start)}</button> <button data-a="x">${esc(OS.leave)}</button>`);
    on('.ev', (ev) => { st.sel = +ev.currentTarget.dataset.e; showAssign(); });
    on('.kl button', (ev) => { st.assign = assignTap(st.assign, st.sel, +ev.currentTarget.dataset.k); st.sel = (st.sel + 1) % 3; showAssign(); });
    on('[data-a=go]', start); on('[data-a=x]', close);
  }
  function start() {
    const k = mine(); if (!validAssign(st.assign, k.length)) return;
    const lvl = k.reduce((s, c) => s + c.level, 0) / k.length, rv = olyRivals(st.venue, day(), lvl);
    const entrants = [{ who: 'me', name: OS.you, kilu: k, assign: st.assign }, ...rv.map((r, i) => ({ who: 'r' + i, name: r.trainer, kilu: r.kilu, assign: r.assign }))];
    st.entrants = entrants; st.run = runOlympics({ venue: st.venue, day: day(), entrants }); st.i = 0; showEvent();
  }
  const frameCache = new Map();
  const framesOf = (sp) => { if (!frameCache.has(sp)) frameCache.set(sp, [0, 1, 2, 3].map((i) => { const im = new Image(); im.src = frameSrc(sp, i); return im; })); return frameCache.get(sp); };
  function showEvent() {
    st.phase = 'event'; const ev = st.run.events[st.i];
    const mates = {}; for (const e of st.entrants || []) { const j = e.kilu.findIndex((_, k) => !e.assign.includes(k)); mates[e.who] = e.kilu[j >= 0 ? j : e.assign[(st.i + 1) % 3]]; }
    const plan = animPlan(ev.id, ev.rows, { mates }); st.plan = plan;
    box(`<h2>${esc(ot(OS.event_n, { n: st.i + 1, of: 3, event: OS.events[ev.id] }))}</h2><canvas class="lanes" width="${AW * 2}" height="${AH * 2}"></canvas><div><span class="skip">${esc(OS.anim_skip)}</span> <button data-a="r" disabled>${esc(OS.results)}</button></div>`);
    ov.querySelector('.box').classList.add('wide');
    const cv = ov.querySelector('canvas'), g = cv.getContext('2d'); let t0 = performance.now(), skip = rm;
    cv.onclick = () => { skip = true; cancelAnimationFrame(st.raf); st.raf = requestAnimationFrame(draw); }; // touch-ok: tap (click) skips to the finish; no hold or drag
    const draw = (now) => {
      if (!ov || st.phase !== 'event') return;
      const t = skip ? plan.end : (now - t0) / 1000; st.animT = t;
      g.setTransform(2, 0, 0, 2, 0, 0); drawOlyFrame(g, plan, t, framesOf, { rm });
      if (t < plan.end) st.raf = requestAnimationFrame(draw); else { const b = ov?.querySelector('[data-a=r]'); if (b) b.disabled = false; ov?.querySelector('.skip')?.remove(); }
    };
    st.raf = requestAnimationFrame(draw); on('[data-a=r]', showBoard);
    st.seek = (t) => { cancelAnimationFrame(st.raf); g.setTransform(2, 0, 0, 2, 0, 0); drawOlyFrame(g, plan, t, framesOf, { rm }); st.animT = t; }; // shots/tests
  }
  // Winner-circle podium after each event and the grand champion podium at the end (olympics_podium.js).
  // Crisp: the pixel layer is painted at 2x into an offscreen canvas and nearest-neighbour scaled; text is vector on top.
  // TAP ONLY: a tap (pointer down+up, short, no drag) skips the animation, a second tap continues; a hold or drag does nothing.
  function podium(plan, html, cont) {
    box(`<div class="pod"><canvas class="podium" id="${plan.kind === 'final' ? 'oly-champ' : 'oly-board'}"></canvas>${html}</div>`);
    const b = ov.querySelector('.box'); b.classList.add('podbox');
    const cv = ov.querySelector('canvas'), g = cv.getContext('2d'), L = document.createElement('canvas'); L.width = PW * 2; L.height = PH * 2; const lg = L.getContext('2d');
    const size = () => { const dpr = window.devicePixelRatio || 1, W = Math.min(innerWidth - 6, (innerHeight - 6) * 16 / 9), H = W * 9 / 16;
      cv.style.width = Math.floor(W) + 'px'; cv.style.height = Math.floor(H) + 'px'; cv.width = Math.round(Math.floor(W) * dpr); cv.height = Math.round(Math.floor(H) * dpr); };
    size(); window.addEventListener('resize', size); st.unsize = () => { window.removeEventListener("resize", size); st.untap?.(); st.untap = null; };
    let t0 = performance.now(), skip = rm; const phase = st.phase;
    const paint = (t) => { lg.setTransform(2, 0, 0, 2, 0, 0); lg.imageSmoothingEnabled = false; drawPodiumPixels(lg, plan, t, framesOf, { rm });
      g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false; g.drawImage(L, 0, 0, cv.width, cv.height);
      g.setTransform(cv.width / PW, 0, 0, cv.height / PH, 0, 0); drawPodiumText(g, plan, t, { rm, hint: t < plan.total ? OS.pod_skip : OS.pod_continue }); st.animT = t; };
    let sang = false; const jingle = () => { if (sang) return; sang = true; [['fan_c', 0], ['fan_e', 140], ['fan_g', 280], ['fan_c2', 430]].forEach(([id, ms]) => setTimeout(() => { if (st.phase === phase) scene.audio?.sfx(id); }, ms)); };
    const draw = (now) => { if (!ov || st.phase !== phase) return; const t = rm ? plan.total : (now - t0) / 1000; if (t >= plan.win0) jingle(); paint(t); // v2: winner moment + dance loops until tapped
      if (!rm) st.raf = requestAnimationFrame(draw); };
    st.untap?.(); st.untap = onTap(cv, null, () => { // tap only; hold/drag ignored by tap_guard
      if ((st.animT ?? 0) < plan.total && !skip) { skip = true; t0 = performance.now() - plan.total * 1000; cancelAnimationFrame(st.raf); st.raf = requestAnimationFrame(draw); } else cont(); });
    st.raf = requestAnimationFrame(draw); st.plan = plan;
    st.seek = (t) => { cancelAnimationFrame(st.raf); paint(t); };
    // pre-load sprites, repaint once they arrive (reduced motion paints a single frame)
    for (const e of plan.entries) for (const im of framesOf(e.kilu.species)) if (!im.complete) im.addEventListener('load', () => { if (st.phase === phase && rm) paint(plan.total); }, { once: true });
  }
  const leavePod = () => { st.unsize?.(); st.unsize = null; };
  function showBoard() {
    st.phase = 'board'; const ev = st.run.events[st.i], last = st.i === 2;
    const plan = podiumPlan({ kind: 'event', id: ev.id, rows: ev.rows, prev: st.i ? st.run.events[st.i - 1].table : [], table: ev.table, n: st.i + 1, of: 3 });
    const next = () => { cancelAnimationFrame(st.raf); leavePod(); if (last) showFinal(); else { st.i++; showEvent(); } };
    podium(plan, `<button data-a="n" class="podgo">${esc(last ? OS.final : OS.next)}</button>`, next);
    on('[data-a=n]', next);
  }
  function showFinal() {
    let mult = 1; try { mult = diffOf(getDifficulty(sys()?.state)).money || 1; } catch (e) { mult = 1; }
    const res = settleOlympics({ venue: st.venue, day: day(), table: st.run.table, wallet: sys()?.wallet, sstate: sstate(), mult, events: st.run.events }); st.result = res;
    if (res.flag && !scene.flags?.has?.(res.flag)) { try { scene.setFlag ? scene.setFlag(res.flag) : scene.flags?.add?.(res.flag); } catch (e) { /* flag */ } }
    st.phase = res.place === 1 ? 'champ' : 'final'; const V = OS.venue[st.venue];
    const plan = podiumPlan({ kind: 'final', venue: st.venue, venueName: V, table: st.run.table, events: st.run.events, result: res });
    const done = () => { cancelAnimationFrame(st.raf); leavePod(); close(); };
    podium(plan, `<button data-a="x" class="podgo">${esc(OS.done)}</button>`, done);
    on('[data-a=x]', done);
  }
  return { open, close, status, state: () => ({ open: st.open, phase: st.phase, venue: st.venue, assign: st.assign && [...st.assign], i: st.i, run: st.run, result: st.result, plan: st.plan, animT: st.animT }),
    _seek: (t) => st.seek?.(t),
    _assign: (a) => { st.assign = a; if (st.phase === 'assign') showAssign(); } };
}

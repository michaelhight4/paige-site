// Olympics UI (dev/olympics, Oct 30 2026): assign screen -> 3 x (event lanes -> results board) -> final standings -> champion.
// TAP ONLY: every control is a button/tap target; nothing needs a hold or a drag. Reuses the #town-ev overlay styles
// (town_ui.js CSS) and runChampion (hype.js) for the champion screen. Logic: olympics.js. Text: olympics_strings.js.
import { OLY_EVENTS, VENUES, canEnterOly, autoAssign, assignTap, validAssign, olyRivals, runOlympics, settleOlympics, wonFlag } from './olympics.js?v=v0.2.101-alpha';
import { OS, ot } from './olympics_strings.js?v=v0.2.101-alpha';
import { athleticStats } from './athletics.js?v=v0.2.101-alpha';
import { diffOf, getDifficulty } from '../systems/difficulty.js?v=v0.2.101-alpha';
import { reducedMotion } from './hype.js?v=v0.2.101-alpha';

const CSS = `#town-ev.oly .ev{border:2px solid #384260;border-radius:6px;margin:4px auto;padding:4px 6px;max-width:520px;cursor:pointer;text-align:left}
#town-ev.oly .ev.on{border-color:#e8c26a;background:#1a2238}#town-ev.oly .ev small{opacity:.75}#town-ev.oly .ev b{color:#e8c26a}
#town-ev.oly .kl{display:flex;flex-wrap:wrap;justify-content:center;gap:4px}#town-ev.oly .kl button{min-height:44px;min-width:88px}
#town-ev.oly .kl button.in{border-color:#e8c26a;color:#e8c26a}#town-ev.oly button{min-height:44px}
#town-ev.oly table{margin:4px auto;border-collapse:collapse;font-size:13px}#town-ev.oly td,#town-ev.oly th{padding:2px 7px}#town-ev.oly tr.me{color:#e8c26a;font-weight:bold}
#town-ev.oly .lanes{width:min(100%,520px,96vh);aspect-ratio:2/1;display:block;margin:0 auto;background:#0d1320;border-radius:4px}
#town-ev.oly .champ{font-size:22px;color:#e8c26a;margin:10px 0}`;
const nameOf = (c) => c.nickname || c.name || c.species;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const imgSrc = (sp) => `art/characters/pixel/creatures/${sp}/overworld/${sp}_ow/${sp}_ow_right_walk0_2x.png`;
const ORD = ['1st', '2nd', '3rd', '4th'];

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
  function close() { cancelAnimationFrame(st.raf); window.removeEventListener('keydown', key, true); ov?.remove(); ov = null; st.open = false; st.phase = 'closed'; scene.timescale = savedTs; const cb = st.onClose; st.onClose = null; cb?.(); }
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
    st.run = runOlympics({ venue: st.venue, day: day(), entrants }); st.i = 0; showEvent();
  }
  function showEvent() {
    st.phase = 'event'; const ev = st.run.events[st.i], rows = [...ev.rows].sort((a, b) => (a.who > b.who ? 1 : -1)); // lanes in fixed order: you first
    box(`<h2>${esc(ot(OS.event_n, { n: st.i + 1, of: 3, event: OS.events[ev.id] }))}</h2><canvas class="lanes" width="520" height="260"></canvas><div><button data-a="r" disabled>${esc(OS.results)}</button></div>`);
    const g = ov.querySelector('canvas').getContext('2d'), top = Math.max(...rows.map((r) => r.score)), T = rm ? 0 : 1.6, t0 = performance.now();
    const imgs = rows.map((r) => { const im = new Image(); im.src = imgSrc(r.kilu.species); return im; });
    const draw = (now) => {
      const p = T ? Math.min(1, (now - t0) / 1000 / T) : 1; g.fillStyle = '#0d1320'; g.fillRect(0, 0, 520, 260);
      rows.forEach((r, i) => { const y = 14 + i * 60, w = 330 * p * (r.score / top);
        g.fillStyle = i % 2 ? '#141b2e' : '#18213a'; g.fillRect(0, y - 6, 520, 56); g.fillStyle = '#fff'; g.fillRect(470, y - 6, 3, 56);
        g.fillStyle = r.who === 'me' ? '#e8c26a' : '#5b7bd5'; g.fillRect(110, y + 16, w, 14);
        if (imgs[i].complete && imgs[i].naturalWidth) g.drawImage(imgs[i], 100 + w, y - 4, 40, 40);
        g.fillStyle = r.who === 'me' ? '#e8c26a' : '#cfd6ea'; g.font = 'bold 13px monospace'; g.fillText(r.name, 6, y + 14); g.font = '11px monospace'; g.fillText(nameOf(r.kilu), 6, y + 30);
        if (p >= 1) { g.fillStyle = '#fff'; g.font = 'bold 13px monospace'; g.fillText(r.score.toFixed(1), 476, y + 28); } });
      if (p < 1) st.raf = requestAnimationFrame(draw); else { const b = ov?.querySelector('[data-a=r]'); if (b) b.disabled = false; }
    };
    st.raf = requestAnimationFrame(draw); on('[data-a=r]', showBoard);
  }
  function showBoard() {
    st.phase = 'board'; const ev = st.run.events[st.i], last = st.i === 2;
    box(`<h2>${esc(ot(OS.board, { event: OS.events[ev.id] }))}</h2>
      <table id="oly-board"><tr><th>${OS.col_place}</th><th>${OS.col_trainer}</th><th>${OS.col_kilu}</th><th>${OS.col_score}</th><th>${OS.col_pts}</th></tr>
      ${ev.rows.map((r) => `<tr class="${r.who === 'me' ? 'me' : ''}"><td>${ORD[r.place - 1]}</td><td>${esc(r.name)}</td><td>${esc(nameOf(r.kilu))}</td><td>${r.score.toFixed(1)}</td><td>+${r.pts}</td></tr>`).join('')}</table>
      <div>${esc(ot(OS.standings, { n: st.i + 1, of: 3 }))}</div>${table(ev.table)}
      <button data-a="n">${esc(last ? OS.final : OS.next)}</button>`);
    on('[data-a=n]', () => { if (last) showFinal(); else { st.i++; showEvent(); } });
  }
  const table = (t) => `<table class="oly-table"><tr><th>${OS.col_place}</th><th>${OS.col_trainer}</th><th>${OS.col_total}</th></tr>${t.map((x, i) => `<tr class="${x.who === 'me' ? 'me' : ''}"><td>${ORD[i]}</td><td>${esc(x.name)}</td><td>${x.pts}</td></tr>`).join('')}</table>`;
  function showFinal() {
    let mult = 1; try { mult = diffOf(getDifficulty(sys()?.state)).money || 1; } catch (e) { mult = 1; }
    const res = settleOlympics({ venue: st.venue, day: day(), table: st.run.table, wallet: sys()?.wallet, sstate: sstate(), mult }); st.result = res;
    if (res.flag && !scene.flags?.has?.(res.flag)) { try { scene.setFlag ? scene.setFlag(res.flag) : scene.flags?.add?.(res.flag); } catch (e) { /* flag */ } }
    st.phase = 'final'; const V = OS.venue[st.venue];
    box(`<h2>${esc(OS.final)}</h2>${table(st.run.table)}<div>${esc(res.place === 1 ? ot(OS.won, { prize: res.prize, merit: res.merit }) : ot(OS.placed, { place: ORD[res.place - 1], merit: res.merit }))}</div>
      <button data-a="n">${esc(res.place === 1 ? ot(OS.champ, { venue: V }) : OS.done)}</button>`);
    on('[data-a=n]', () => (res.place === 1 ? showChamp() : close()));
  }
  function showChamp() {
    st.phase = 'champ'; const V = OS.venue[st.venue], me = st.run.events.map((e) => e.rows.find((r) => r.who === 'me').kilu);
    box(`<div class="champ" id="oly-champ">★ ${esc(ot(OS.champ, { venue: V }))} ★</div>${st.result.firstWin ? `<div>${esc(ot(OS.first_win, { venue: V }))}</div>` : ''}
      <div>${me.map((c) => `<img src="${imgSrc(c.species)}" style="height:72px;image-rendering:pixelated;margin:4px">`).join('')}</div>
      <div>${esc(ot(OS.won, { prize: st.result.prize, merit: st.result.merit }))}</div><button data-a="x">${esc(OS.done)}</button>`);
    on('[data-a=x]', close);
  }
  return { open, close, status, state: () => ({ open: st.open, phase: st.phase, venue: st.venue, assign: st.assign && [...st.assign], i: st.i, run: st.run, result: st.result }),
    _assign: (a) => { st.assign = a; if (st.phase === 'assign') showAssign(); } };
}

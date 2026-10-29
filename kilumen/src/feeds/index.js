// Kilumen fruit feeds: attach (flag OFF by default, src/feeds/flags.js). Coder, Oct 29 2026. Self-contained DOM overlay, like
// src/sports. No edits to battle.js or items.js: fruit + seedlings live in systems.state.feeds.fruit (not the bag), battle
// wins are read through a wrap of systems.applyBattleResult (as evolution.js does), practice calls api.onPractice(c).
// Save rules: the overlay can only open in free roam (no battle, dialogue, cutscene, scene.script or other UI), and a
// saveGuard ('feeds_menu') blocks saving while it is open; the next normal save after close keeps the feed.
import { feedsEnabled } from './flags.js?v=v0.2.57-alpha';
import * as L from './logic.js?v=v0.2.57-alpha';
import { FS, ft } from './strings.js?v=v0.2.57-alpha';
import { setAthleticBonus, speciesAthletics } from '../sports/athletics.js?v=v0.2.57-alpha';
import { fruitSvg, CSS } from './ui_art.js?v=v0.2.57-alpha';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const uidOf = (c) => c?.uid || c?.id || null;

export function attachFeeds(scene, { query, systems, speciesInfo = () => null, now = () => Date.now() } = {}) {
  if (!feedsEnabled(query)) { setAthleticBonus(null); return null; }
  const sys = () => systems || scene.systems;
  const fs = () => L.feedsState(sys()?.state || (scene._feedsState ||= {}));
  L.ensurePlots(fs());
  if ((query?.get?.('feedskit') === '1' || globalThis.KILUMEN_FEEDS_KIT === true) && !fs().kit) { // dev starter kit for testing / shots
    const f = fs(); f.kit = 1;
    for (const id of ['dashfig', 'rumblemelon', 'mossplum', 'saltlime', 'glidepod', 'embergourd', 'sunheart_fig']) f.fruit[id] = (f.fruit[id] || 0) + 3;
    for (const id of ['dashfig', 'mossplum']) f.fruit[`seedling_${id}`] = 2;
  }
  setAthleticBonus((c) => { const u = uidOf(c); const b = u && fs().build[u]; return b ? L.statBonus(b) : null; });
  const bodyOf = (c) => ({ types: speciesInfo(c.species)?.el || [], shape: speciesAthletics(c.species)?.shape || 'standard' });
  const nameOf = (c) => c.nickname || speciesInfo(c.species)?.name || c.species;
  const st = { open: false, tab: 'feed', sel: 0, fruit: null, msg: null, react: null };
  (scene.saveGuards ||= []).push(() => (st.open ? 'feeds_menu' : null));
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);

  // battle wins drain Fullness: the battler(s) -5, the rest of the team (XP share) -1.25. Never with time.
  const s0 = sys();
  if (s0 && !s0._feedsHooked) {
    s0._feedsHooked = true; const apply = s0.applyBattleResult.bind(s0);
    s0.applyBattleResult = (res) => { const out = apply(res); try { if (res?.outcome === 'win') onBattleWin(res); } catch (e) { console.error('feeds:', e); } return out; };
  }
  function onBattleWin(res) {
    const team = (scene.party || []).filter(Boolean), fought = new Set((res?.team || []).filter((m) => m?.fought || m?.participated).map((m) => m.uid || m.id));
    const lead = team.find((c) => c.hp > 0);
    for (const c of team) { const u = uidOf(c); if (!u) continue; L.drain(fs(), u, fought.has(u) || (!fought.size && c === lead) ? L.DRAIN.battleWin : L.DRAIN.shared); }
  }
  function onPractice(c) { const u = uidOf(c); if (u) L.drain(fs(), u, L.DRAIN.practice); L.practiceBoost(fs()); scene._dirty = true; }

  let btn = null;
  if (typeof document !== 'undefined') {
    btn = document.createElement('button'); btn.id = 'feeds-btn'; btn.textContent = FS['feeds.button']; document.body.appendChild(btn);
    btn.addEventListener('click', () => openFeeds());
  }
  const blocked = () => {
    const ui = globalThis.kilumen?.ui;
    return !!(scene.busy || scene.fade || scene.dialog?.active || scene.saveLocked || ui?.active || ui?.stack?.some?.((s) => s.scr === 'battle') || globalThis.kilumen?.sports?.state?.()?.open);
  };
  if (btn) setInterval(() => { btn.hidden = st.open || blocked(); }, 250); // only offered in free roam
  let ov = null, keyH = null, savedTs = 1, timer = 0;
  function openFeeds(tab = 'feed') {
    if (st.open) return true;
    if (blocked()) { scene.toast?.(FS['feeds.busy']); return false; }
    st.open = true; st.tab = tab; st.msg = null; st.react = null; st.fruit = null;
    savedTs = scene.timescale ?? 1; scene.timescale = 0;
    ov = document.createElement('div'); ov.id = 'feeds-ov'; document.body.appendChild(ov);
    keyH = (e) => { e.stopPropagation(); if (e.type === 'keydown' && e.key === 'Escape') close(); };
    for (const ty of ['keydown', 'keyup']) window.addEventListener(ty, keyH, true);
    render(); timer = setInterval(() => { if (st.tab === 'grow') render(); }, 1000);
    return true;
  }
  function close() {
    if (!st.open) return;
    for (const ty of ['keydown', 'keyup']) window.removeEventListener(ty, keyH, true);
    clearInterval(timer); ov?.remove(); ov = null; st.open = false; scene.timescale = savedTs; scene._dirty = true; // saved by the next normal save
  }
  const team = () => (scene.party || []).filter((c) => c && c.species);
  const imgFor = (sp) => `art/characters/pixel/creatures/${sp}/battle/${sp}_front_128.png`;
  const tasteLabel = (c) => {
    const u = uidOf(c), t = L.tastesOf(u), seen = fs().seen?.[u] || [];
    const a = seen.includes(t.like) ? ft('feeds.taste_like', { taste: FS['feeds.taste.' + t.like] }) : null;
    const b = seen.includes(t.dislike) ? ft('feeds.taste_dislike', { taste: FS['feeds.taste.' + t.dislike] }) : null;
    return a || b ? [a, b].filter(Boolean).join(' · ') : FS['feeds.taste_unknown'];
  };

  function buildCard(c, pv) {
    const u = uidOf(c), b = L.buildOf(fs(), u), body = bodyOf(c), full = L.fullOf(fs(), u);
    const rows = L.PARTS.map((p) => {
      const v = b[p] || 0, cap = L.partCap(p, body), d = pv?.ok ? pv.delta[p] || 0 : 0, nv = Math.max(0, v + d);
      return `<div class="fd-row ${cap < L.PART_CAP ? 'misfit' : ''}" data-part="${p}"><span class="fd-part">${esc(FS['feeds.part.' + p])}</span>
        <span class="fd-bar"><i class="cap" style="width:${(cap / L.PART_CAP) * 100}%"></i><i class="cur" style="width:${(Math.min(v, nv) / L.PART_CAP) * 100}%"></i>${d > 0 ? `<i class="up" style="left:${(v / L.PART_CAP) * 100}%;width:${(d / L.PART_CAP) * 100}%"></i>` : ''}${d < 0 ? `<i class="down" style="left:${(nv / L.PART_CAP) * 100}%;width:${(-d / L.PART_CAP) * 100}%"></i>` : ''}</span>
        <span class="fd-val">${Math.floor(nv)}${d ? `<b class="${d > 0 ? 'pos' : 'neg'}">${d > 0 ? '+' : ''}${d}</b>` : ''}</span><span class="fd-stage s${L.stageOf(nv)}">${esc(FS['feeds.stage.' + L.stageOf(nv)])}</span></div>`;
    }).join('');
    const nf = pv?.ok ? Math.min(100, full + pv.full) : full;
    return `<div class="fd-card"><div class="fd-head"><img src="${imgFor(c.species)}" class="fd-mon ${st.react ? 'r-' + st.react : ''}" alt=""><div><b>${esc(nameOf(c))}</b><div class="fd-taste">${esc(tasteLabel(c))}</div>
      <div class="fd-total">${esc(ft('feeds.build_total', { n: Math.floor(L.totalBuild(b)), max: L.TOTAL_CAP }))}</div></div>
      <div class="fd-bowl" title="${esc(FS['feeds.fullness'])}"><span>${esc(FS['feeds.fullness'])}</span><div class="bowl"><i style="height:${nf}%"></i><i class="was" style="height:${full}%"></i></div><b>${Math.round(nf)}</b></div></div>
      ${rows}${st.react ? `<div class="fd-heart r-${st.react}">${st.react === 'like' ? '♥' : st.react === 'dislike' ? '~' : '·'}</div>` : ''}</div>`;
  }
  function render() {
    if (!ov) return;
    const f = fs(), mons = team(); if (st.sel >= mons.length) st.sel = 0;
    const c = mons[st.sel];
    const tabs = `<div class="fd-tabs"><button data-tab="feed" class="${st.tab === 'feed' ? 'on' : ''}">${esc(FS['feeds.tab_feed'])}</button><button data-tab="grow" class="${st.tab === 'grow' ? 'on' : ''}">${esc(FS['feeds.tab_grow'])}</button><button data-a="close" class="x">${esc(FS['feeds.close'])}</button></div>`;
    let body = '';
    if (st.tab === 'feed') {
      const fruits = L.FRUIT_IDS.filter((id) => (f.fruit[id] || 0) > 0);
      const pv = c && st.fruit ? L.previewFeed({ build: L.buildOf(f, uidOf(c)), full: L.fullOf(f, uidOf(c)), uid: uidOf(c), fruitId: st.fruit, body: bodyOf(c) }) : null;
      body = `<div class="fd-mons">${mons.map((m, i) => `<button class="fd-pick ${i === st.sel ? 'on' : ''}" data-mon="${i}"><img src="${imgFor(m.species)}" alt=""><span>${esc(nameOf(m))}</span></button>`).join('')}</div>
        <div class="fd-main">${c ? buildCard(c, pv) : ''}<div class="fd-fruits"><h3>${esc(FS['feeds.pick_fruit'])}</h3>
        ${fruits.length ? fruits.map((id) => { const fr = L.FRUITS[id]; return `<button class="fd-fruit ${st.fruit === id ? 'on' : ''}" data-fruit="${id}">${fruitSvg(id)}<span class="nm">${esc(FS[`feeds.fruit.${id}.name`])}</span><span class="ct">x${f.fruit[id]}</span><span class="tg">${esc(FS['feeds.taste.' + fr.taste])}</span></button>`; }).join('') : `<div class="fd-empty">${esc(FS['feeds.none_left'])}</div>`}
        <div class="fd-msg">${esc(st.msg || (pv && !pv.ok ? ft('feeds.refuse_' + (pv.reason === 'full' ? 'full' : pv.reason === 'misfit' ? 'misfit' : 'capped'), { creature: c ? nameOf(c) : '' }) : ''))}</div>
        <button class="fd-go" data-a="feed" ${pv?.ok ? '' : 'disabled'}>${esc(FS['feeds.give'])}</button></div></div>`;
    } else {
      const n = now(), seeds = L.FRUIT_IDS.filter((id) => (f.fruit[`seedling_${id}`] || 0) > 0);
      body = `<div class="fd-hint">${esc(FS['feeds.grow_hint'])}</div><div class="fd-plots">${f.plots.map((p, i) => {
        if (!p.fruit) return `<div class="fd-plot empty"><div class="soil"></div><b>${esc(FS['feeds.plot_empty'])}</b>${seeds.length ? seeds.map((id) => `<button data-plant="${i}:${id}">${esc(FS['feeds.plot_plant'])}: ${esc(ft('feeds.seedling_of', { fruit: FS[`feeds.fruit.${id}.name`] }))} x${f.fruit['seedling_' + id]}</button>`).join('') : `<i>${esc(FS['feeds.no_seedlings'])}</i>`}</div>`;
        const sg = L.plotStage(p, n), left = L.msLeft(p, n), pr = L.progress(p, n);
        return `<div class="fd-plot st-${sg}"><div class="soil">${fruitSvg(p.fruit, sg)}</div><b>${esc(FS[`feeds.fruit.${p.fruit}.name`])} · ${esc(FS['feeds.plot_stage.' + sg])}</b><span class="fd-grow"><i style="width:${pr * 100}%"></i></span>
          ${left > 0 ? `<span>${esc(ft('feeds.plot_left', { time: fmt(left) }))}</span>` : `<button data-harvest="${i}">${esc(FS['feeds.plot_harvest'])}</button>`}</div>`;
      }).join('')}</div><div class="fd-msg">${esc(st.msg || '')}</div>`;
    }
    ov.innerHTML = `<div class="fd-box">${tabs}${body}</div>`;
    ov.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => { st.tab = b.dataset.tab; st.msg = null; render(); }));
    ov.querySelector('[data-a=close]').onclick = close;
    ov.querySelectorAll('[data-mon]').forEach((b) => (b.onclick = () => { st.sel = +b.dataset.mon; st.react = null; st.msg = null; render(); }));
    ov.querySelectorAll('[data-fruit]').forEach((b) => (b.onclick = () => { st.fruit = b.dataset.fruit; st.react = null; st.msg = null; render(); }));
    ov.querySelector('[data-a=feed]')?.addEventListener('click', () => doFeed(c));
    ov.querySelectorAll('[data-plant]').forEach((b) => (b.onclick = () => { const [i, id] = b.dataset.plant.split(':'); L.plant(fs(), +i, id, now()); st.msg = null; render(); }));
    ov.querySelectorAll('[data-harvest]').forEach((b) => (b.onclick = () => { const r = L.harvest(fs(), +b.dataset.harvest, now()); if (r) st.msg = ft('feeds.plot_harvested', { n: r.n, fruit: FS[`feeds.fruit.${r.fruit}.name`] }) + (r.seedling ? ' ' + FS['feeds.plot_seedling'] : ''); render(); }));
  }
  const fmt = (ms) => { const m = Math.ceil(ms / 60000), h = Math.floor(m / 60); return h ? `${h}h ${m % 60}m` : `${m}m`; };
  function doFeed(c) {
    if (!c || !st.fruit) return null;
    const u = uidOf(c), r = L.feed(fs(), { uid: u, fruitId: st.fruit, body: bodyOf(c) });
    if (r.ok) {
      const taste = L.FRUITS[st.fruit].taste; const seen = ((fs().seen ||= {})[u] ||= []); if (taste !== 'all' && !seen.includes(taste)) seen.push(taste);
      st.react = r.reaction; st.msg = ft('feeds.react_' + r.reaction, { creature: nameOf(c) });
      try { globalThis.kilumen?.audio?.sfx?.(r.reaction === 'like' ? 'confirm' : 'cancel'); } catch { /* no audio */ }
      if (!fs().fruit[st.fruit]) st.fruit = null;
    } else st.msg = ft('feeds.refuse_' + (r.reason === 'full' ? 'full' : r.reason === 'misfit' ? 'misfit' : 'capped'), { creature: nameOf(c) });
    render(); return r;
  }
  const api = { open: openFeeds, close, onPractice, onBattleWin, state: () => ({ open: st.open, tab: st.tab, ...fs() }), feedFor: (i, fruitId) => { st.sel = i; st.fruit = fruitId; return doFeed(team()[i]); }, select: (i, fruitId) => { st.sel = i; st.fruit = fruitId; st.react = null; st.msg = null; render(); } };
  return api;
}

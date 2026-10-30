// Kilumen fruit feeds: attach (flag OFF by default, src/feeds/flags.js). Coder, Oct 29 2026. Self-contained DOM overlay, like
// src/sports. No edits to battle.js. Fruit + seedlings are bag items (feeds pocket, rows in src/systems/items.js); battle
// wins are read through a wrap of systems.applyBattleResult (as evolution.js does), practice calls api.onPractice(c).
// Save rules: the overlay can only open in free roam (no battle, dialogue, cutscene, scene.script or other UI), and a
// saveGuard ('feeds_menu') blocks saving while it is open; the next normal save after close keeps the feed.
import { feedsEnabled } from './flags.js?v=v0.2.91-alpha';
import * as L from './logic.js?v=v0.2.91-alpha';
import { FS, ft } from './strings.js?v=v0.2.91-alpha';
import { setAthleticBonus, speciesAthletics } from '../sports/athletics.js?v=v0.2.91-alpha';
import { fruitSvg, CSS } from './ui_art.js?v=v0.2.91-alpha';
import { feedTabHtml, playFeed, growBars, feedSfx, CSS2 } from './feed_view.js?v=v0.2.91-alpha';
import { createBackdrop, BG_CSS } from './backdrop.js?v=v0.2.91-alpha';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const uidOf = (c) => c?.uid || c?.id || null;

export function attachFeeds(scene, { query, systems, speciesInfo = () => null, now = () => Date.now() } = {}) {
  if (!feedsEnabled(query)) { setAthleticBonus(null); return null; }
  const sys = () => systems || scene.systems;
  const fs = () => L.feedsState(sys()?.state || (scene._feedsState ||= {}));
  const bag = () => sys()?.bag || (scene._feedsBag ||= { c: {}, count(id) { return this.c[id] || 0; }, add(id, n = 1) { this.c[id] = this.count(id) + n; return { ok: true }; }, remove(id, n = 1) { if (this.count(id) < n) return false; this.c[id] -= n; return true; } });
  L.ensurePlots(fs());
  if (fs().fruit) { for (const [k, n] of Object.entries(fs().fruit)) bag().add(k.startsWith('seedling_') ? k : L.fruitItem(k), n); delete fs().fruit; } // v1 test saves: move into the bag
  if ((query?.get?.('feedskit') === '1' || globalThis.KILUMEN_FEEDS_KIT === true) && !fs().kit) { // dev starter kit for testing / shots
    const f = fs(); f.kit = 1;
    for (const id of ['dashfig', 'rumblemelon', 'mossplum', 'saltlime', 'glidepod', 'embergourd', 'sunheart_fig']) bag().add(L.fruitItem(id), 3);
    for (const id of ['dashfig', 'mossplum']) bag().add(L.seedItem(id), 2);
  }
  setAthleticBonus((c) => { const u = uidOf(c); const b = u && fs().build[u]; return b ? L.statBonus(b) : null; });
  const bodyOf = (c) => ({ types: speciesInfo(c.species)?.el || [], shape: speciesAthletics(c.species)?.shape || 'standard' });
  const nameOf = (c) => c.nickname || speciesInfo(c.species)?.name || c.species;
  const st = { open: false, tab: 'feed', sel: 0, fruit: null, msg: null, react: null, quip: null, rita: null, busy: false };
  (scene.saveGuards ||= []).push(() => (st.open ? 'feeds_menu' : null));
  const style = document.createElement('style'); style.textContent = CSS + CSS2 + BG_CSS; document.head.appendChild(style);

  // Battle wins drain Fullness, but only for the creatures that actually fought (Gary Oct 29): -5 each, bench loses none.
  // Fighters = the lead plus anyone whose HP / energy / status changed (L.fightersOf), gathered over every apply of one
  // battle (mid-battle 'switch' results apply too). Never with time.
  const s0 = sys(); let fighters = null;
  if (s0 && !s0._feedsHooked) {
    s0._feedsHooked = true; const apply = s0.applyBattleResult.bind(s0);
    s0.applyBattleResult = (res) => {
      let snap = null;
      try { snap = (scene.party || []).filter(Boolean).map((c) => ({ uid: uidOf(c), hp: c.hp, energy: Array.isArray(c.energy) ? c.energy.slice() : c.energy, status: c.status || '' })); } catch (e) { /* ignore */ }
      const out = apply(res);
      try {
        if (snap) for (const u of L.fightersOf(snap, res?.team || [])) (fighters ||= new Set()).add(u);
        if (res?.outcome !== 'switch') { const f = fighters; fighters = null; if (res?.outcome === 'win') onBattleWin(f); }
      } catch (e) { console.error('feeds:', e); }
      return out;
    };
  }
  function onBattleWin(fought) { for (const u of fought || []) L.drain(fs(), u, L.DRAIN.battleWin); scene._dirty = true; }
  function onPractice(c) { const u = uidOf(c); if (u) L.drain(fs(), u, L.DRAIN.practice); L.practiceBoost(fs()); scene._dirty = true; }

  // v0.2.69 (Gary): no floating #feeds-btn any more; Feeds opens from its own top-row Phone menu entry (src/ui/ui.js, scr_phone).
  const blocked = () => {
    const ui = globalThis.kilumen?.ui;
    return !!(scene.busy || scene.fade || scene.dialog?.active || scene.saveLocked || ui?.active || ui?.stack?.some?.((s) => s.scr === 'battle') || globalThis.kilumen?.sports?.state?.()?.open);
  };
  let ov = null, keyH = null, savedTs = 1, timer = 0, bg = null;
  function openFeeds(tab = 'feed') {
    if (st.open) return true;
    if (blocked()) { scene.toast?.(FS['feeds.busy']); return false; }
    st.open = true; st.tab = tab; st.msg = null; st.react = null; st.fruit = null; st.quip = null; st.rita = fs().fed ? null : FS['feeds.rita.first'];
    savedTs = scene.timescale ?? 1; scene.timescale = 0;
    ov = document.createElement('div'); ov.id = 'feeds-ov'; document.body.appendChild(ov);
    { const own = L.FRUIT_IDS.filter((id) => L.fruitCount(bag(), id) > 0); bg = createBackdrop(own.length >= 3 ? { fruits: own } : {}); ov.__fxbg = bg; }
    keyH = (e) => { e.stopPropagation(); if (e.type === 'keydown' && e.key === 'Escape') close(); };
    for (const ty of ['keydown', 'keyup']) window.addEventListener(ty, keyH, true);
    render(); timer = setInterval(() => { if (st.tab === 'grow') render(); }, 1000);
    return true;
  }
  function close() {
    if (!st.open) return;
    for (const ty of ['keydown', 'keyup']) window.removeEventListener(ty, keyH, true);
    clearInterval(timer); bg?.stop(); bg = null; ov?.remove(); ov = null; st.open = false; scene.timescale = savedTs; scene._dirty = true; // saved by the next normal save
  }
  const team = () => (scene.party || []).filter((c) => c && c.species);
  const imgFor = (sp) => `art/characters/pixel/creatures/${sp}/battle/${sp}_front_128.png`;
  const tasteLabel = (c) => {
    const u = uidOf(c), t = L.tastesOf(u), seen = fs().seen?.[u] || [];
    const a = seen.includes(t.like) ? ft('feeds.taste_like', { taste: FS['feeds.taste.' + t.like] }) : null;
    const b = seen.includes(t.dislike) ? ft('feeds.taste_dislike', { taste: FS['feeds.taste.' + t.dislike] }) : null;
    return a || b ? [a, b].filter(Boolean).join(' · ') : FS['feeds.taste_unknown'];
  };

  const tasteChips = (c) => {
    const u = uidOf(c), t = L.tastesOf(u), seen = fs().seen?.[u] || [];
    const a = seen.includes(t.like) ? `<span class="fx-chip like">♥ ${esc(ft('feeds.taste_like', { taste: FS['feeds.taste.' + t.like] }))}</span>` : '';
    const b = seen.includes(t.dislike) ? `<span class="fx-chip dislike">✕ ${esc(ft('feeds.taste_dislike', { taste: FS['feeds.taste.' + t.dislike] }))}</span>` : '';
    return a || b ? a + b : `<span class="fx-chip">${esc(FS['feeds.taste_unknown'])}</span>`;
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
    const tabs = `<div class="fd-tabs"><span class="fd-title">${esc(FS['feeds.title'])}</span><button data-tab="feed" class="${st.tab === 'feed' ? 'on' : ''}">${esc(FS['feeds.tab_feed'])}</button><button data-tab="grow" class="${st.tab === 'grow' ? 'on' : ''}">${esc(FS['feeds.tab_grow'])}</button><button data-a="close" class="x">${esc(FS['feeds.close'])}</button></div>`;
    let body = '';
    if (st.tab === 'feed') {
      const pv = c && st.fruit ? L.previewFeed({ build: L.buildOf(f, uidOf(c)), full: L.fullOf(f, uidOf(c)), uid: uidOf(c), fruitId: st.fruit, body: bodyOf(c) }) : null;
      body = feedTabHtml({ mons, sel: st.sel, c, name: nameOf, img: imgFor, fs: f, bag: bag(), fruitId: st.fruit, pv, body: c ? bodyOf(c) : {}, tasteChips: c ? tasteChips(c) : '',
        quipText: st.quip || (c ? ft('feeds.quip.idle.' + (1 + (st.sel % 3)), { creature: nameOf(c) }) : ''), ritaText: st.rita, msg: st.msg });
    } else {
      const n = now(), seeds = L.FRUIT_IDS.filter((id) => L.seedCount(bag(), id) > 0);
      body = `<div class="fd-hint">${esc(FS['feeds.grow_hint'])}</div><div class="fd-plots">${f.plots.map((p, i) => {
        if (!p.fruit) return `<div class="fd-plot empty"><div class="soil"></div><b>${esc(FS['feeds.plot_empty'])}</b>${seeds.length ? seeds.map((id) => `<button data-plant="${i}:${id}">${esc(FS['feeds.plot_plant'])}: ${esc(ft('feeds.seedling_of', { fruit: FS[`feeds.fruit.${id}.name`] }))} x${L.seedCount(bag(), id)}</button>`).join('') : `<i>${esc(FS['feeds.no_seedlings'])}</i>`}</div>`;
        const sg = L.plotStage(p, n), left = L.msLeft(p, n), pr = L.progress(p, n);
        return `<div class="fd-plot st-${sg}"><div class="soil">${fruitSvg(p.fruit, sg)}</div><b>${esc(FS[`feeds.fruit.${p.fruit}.name`])} · ${esc(FS['feeds.plot_stage.' + sg])}</b><span class="fd-grow"><i style="width:${pr * 100}%"></i></span>
          ${left > 0 ? `<span>${esc(ft('feeds.plot_left', { time: fmt(left) }))}</span>` : `<button data-harvest="${i}">${esc(FS['feeds.plot_harvest'])}</button>`}</div>`;
      }).join('')}</div><div class="fd-msg">${esc(st.msg || '')}</div>`;
    }
    ov.innerHTML = `<div class="fd-box">${tabs}${body}</div>`;
    { const sg = ov.querySelector('.fx-stage'); if (sg && bg) { sg.classList.add('has-bg'); bg.mount(sg); } else bg?.stop(); }
    ov.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => { st.tab = b.dataset.tab; st.msg = null; render(); }));
    ov.querySelector('[data-a=close]').onclick = close;
    ov.querySelectorAll('[data-mon]').forEach((b) => (b.onclick = () => { if (st.busy) return; st.sel = +b.dataset.mon; st.react = null; st.msg = null; st.quip = null; feedSfx('pick'); render(); }));
    ov.querySelectorAll('[data-fruit]').forEach((b) => { b.onclick = () => { if (st.busy) return; st.fruit = b.dataset.fruit; st.react = null; st.msg = null; feedSfx('pick'); render(); }; b.onpointerenter = () => feedSfx('hover'); });
    ov.querySelector('[data-a=feed]')?.addEventListener('click', () => doFeed(c));
    ov.querySelectorAll('[data-plant]').forEach((b) => (b.onclick = () => { const [i, id] = b.dataset.plant.split(':'); L.plant(fs(), bag(), +i, id, now()); st.msg = null; render(); }));
    ov.querySelectorAll('[data-harvest]').forEach((b) => (b.onclick = () => { const r = L.harvest(fs(), bag(), +b.dataset.harvest, now()); if (r) st.msg = ft('feeds.plot_harvested', { n: r.n, fruit: FS[`feeds.fruit.${r.fruit}.name`] }) + (r.seedling ? ' ' + FS['feeds.plot_seedling'] : ''); render(); }));
  }
  const fmt = (ms) => { const m = Math.ceil(ms / 60000), h = Math.floor(m / 60); return h ? `${h}h ${m % 60}m` : `${m}m`; };
  /** One feed with the full picnic moment (look, arc, chew + crumbs, reaction, bars pop, cap fanfare). -> Promise<result> */
  async function doFeed(c) {
    if (!c || !st.fruit || st.busy) return null;
    const u = uidOf(c), fruitId = st.fruit, before = { ...L.buildOf(fs(), u) }, fullBefore = L.fullOf(fs(), u), body = bodyOf(c);
    const caps = Object.fromEntries(L.PARTS.map((p) => [p, L.partCap(p, body)]));
    st.busy = true; st.msg = null; st.rita = null;
    let res = null;
    await playFeed(ov, { fruitId, name: nameOf(c), apply: () => (res = L.feed(fs(), bag(), { uid: u, fruitId, body })) });
    if (res?.ok) {
      const taste = L.FRUITS[fruitId].taste; const seen = ((fs().seen ||= {})[u] ||= []); if (taste !== 'all' && !seen.includes(taste)) seen.push(taste);
      st.react = res.reaction; st.msg = ft('feeds.react_' + res.reaction, { creature: nameOf(c) });
      st.quip = ov?.querySelector('.fx-quip')?.textContent || null;
      if (!L.fruitCount(bag(), fruitId)) st.fruit = null;
      if (res.reaction === 'dislike' && fs().fed === 1) st.rita = FS['feeds.rita.dislike'];
    } else {
      st.msg = ft('feeds.refuse_' + (res?.reason === 'full' ? 'full' : res?.reason === 'misfit' ? 'misfit' : 'capped'), { creature: nameOf(c) });
      st.quip = res?.reason === 'misfit' ? FS['feeds.refuse_misfit'] : ov?.querySelector('.fx-quip')?.textContent || null;
      if (res?.reason === 'misfit') st.rita = FS['feeds.rita.misfit'];
    }
    st.busy = false; render();
    if (res?.ok && ov) {
      const soup = ov.querySelectorAll('.fx-soup,.fx-wave'), to = [...soup].map((e) => e.getAttribute('y') || e.getAttribute('d'));
      const yOf = (f) => 44 - (f / 100) * 26;
      soup.forEach((e) => { e.style.transition = 'none'; if (e.tagName === 'rect') e.setAttribute('y', yOf(fullBefore)); });
      void ov.offsetWidth; soup.forEach((e, i) => { e.style.transition = ''; if (e.tagName === 'rect') e.setAttribute('y', to[i]); });
      { const mx = growBars(ov, before, res, caps, nameOf(c)); if (mx) st.quip = ft('feeds.quip.maxed.1', { creature: nameOf(c), part: FS['feeds.part.' + mx] }); }
    }
    return res;
  }
  const api = { open: openFeeds, close, backdrop: () => bg, onPractice, onBattleWin, state: () => ({ open: st.open, tab: st.tab, ...fs(), fruit: Object.fromEntries(L.FRUIT_IDS.map((id) => [id, L.fruitCount(bag(), id)]).filter(([, n]) => n)) }), feedFor: (i, fruitId) => { st.sel = i; st.fruit = fruitId; render(); return doFeed(team()[i]); }, reactionOf: (i, fruitId) => L.reactionOf(uidOf(team()[i]), fruitId), busy: () => st.busy, select: (i, fruitId) => { st.sel = i; st.fruit = fruitId; st.react = null; st.msg = null; render(); } };
  return api;
}

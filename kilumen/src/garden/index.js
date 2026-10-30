// Garden + merit shop wiring (Coder, Oct 30 2026). Draws the soil plots under characters (wraps scene.view -> life.under),
// handles plot interaction (wraps systems.onInteract: plant / water / harvest on the faced cell) and adds the
// merit shop screen ui.scr_merit_shop (same layout as RT Supply: tabs, list, side panel, qty + confirm). No map edits.
import { TILE } from '../overworld/constants.js?v=v0.2.93-alpha';
import { CROPS, SEED_TO_CROP, CANS, plotAt, plotsOn, gardenState, plotState, stageOf, plant, water, harvest } from './garden.js?v=v0.2.93-alpha';
import { MERIT_FIXED, dailyStock, meritState, buyMerit } from '../sports/merit.js?v=v0.2.93-alpha';
import { gt } from './strings.js?v=v0.2.93-alpha';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// crop colours for the ready sprite (pixel art drawn with rects; 16x16 grid scaled to the tile)
const CROP_COL = { carrot: '#e8822a', turnip: '#efe3f2', radish: '#d8394f', tomato: '#e0402e', pumpkin: '#f09a1c', sunroot: '#f4cf3a', glowbean: '#8ff0d8', drumleek: '#b6d65a' };

/** Pixel sprite for a plot (exported for tests / shots). px(x,y,w,h,col) in a 16x16 grid. */
export function plotPixels(stage, crop, wet) {
  const out = [], px = (x, y, w, h, c) => out.push([x, y, w, h, c]);
  px(1, 3, 14, 12, wet ? '#4a2f1d' : '#6e4a2c'); // soil bed
  px(1, 3, 14, 1, wet ? '#5c3b24' : '#8a5e38');
  for (const y of [6, 9, 12]) px(2, y, 12, 1, wet ? '#3a2416' : '#5a3b22'); // furrows
  if (stage === 'seed') for (const [x, y] of [[4, 8], [8, 8], [12, 8], [6, 11], [10, 11]]) px(x, y, 1, 1, '#d9c08a');
  if (stage === 'sprout') for (const x of [4, 8, 12]) { px(x, 8, 1, 3, '#4f9a3a'); px(x - 1, 7, 1, 1, '#6cc24a'); px(x + 1, 7, 1, 1, '#6cc24a'); }
  if (stage === 'growing') for (const x of [4, 8, 12]) { px(x, 5, 1, 6, '#3f8a30'); px(x - 2, 6, 2, 2, '#5fb043'); px(x + 1, 4, 2, 2, '#5fb043'); px(x - 1, 9, 1, 1, '#6cc24a'); }
  if (stage === 'ready') {
    const c = CROP_COL[crop] || '#e0b030';
    for (const x of [4, 8, 12]) { px(x, 3, 1, 4, '#3f8a30'); px(x - 1, 2, 3, 1, '#5fb043'); px(x - 2, 7, 4, 4, c); px(x - 2, 7, 1, 1, '#ffffff55'); }
  }
  return out;
}

export function attachGarden(scene, { sys, sstate }) {
  const S = () => sys(), day = () => scene.clock?.day || 0, g = () => gardenState(S()?.state || (scene._gardenState ||= {}));
  const bag = () => S()?.bag, nm = (id) => bag()?.nameOf?.(id) || id;
  const cropName = (c) => nm(c);

  // ---- drawing: soil + crop under characters ----
  const drawPlots = (ctx, v) => {
    const map = v.map?.name || scene.map?.name; if (!map) return;
    const z = v.zoom, u = (TILE * z) / 16;
    for (const pl of plotsOn(map)) {
      const st = plotState(g(), pl.id, day()), stage = stageOf(st), wet = st?.watered === day();
      const ox = (pl.x * TILE - v.cam.x) * z, oy = (pl.y * TILE - v.cam.y) * z;
      for (const [x, y, w, h, c] of plotPixels(stage, st?.crop, wet)) { ctx.fillStyle = c; ctx.fillRect(Math.round(ox + x * u), Math.round(oy + y * u), Math.ceil(w * u), Math.ceil(h * u)); }
    }
  };
  if (typeof scene.view === 'function' && !scene._gardenView) {
    const view0 = scene.view.bind(scene); scene._gardenView = view0;
    scene.view = () => {
      const v = view0(), life = v.life;
      v.life = Object.create(life || null);
      v.life.under = (c, vv) => { life?.under?.call(life, c, vv); drawPlots(c, vv); };
      if (!life) { v.life.over = () => {}; v.life.top = () => {}; }
      return v;
    };
  }

  // ---- interaction ----
  const say = (t) => scene.say?.([t], { name: null, portrait: null });
  const ask = async (t, ch) => (scene.ask ? scene.ask([t], ch) : 0);
  async function usePlot(pl) {
    const G = g(), b = bag(), d = day(), st = plotState(G, pl.id, d), stage = stageOf(st);
    if (stage === 'empty') {
      const seeds = Object.keys(SEED_TO_CROP).filter((s) => b?.count(s) > 0);
      if (!seeds.length) { await say(gt('garden.empty')); await say(gt('garden.plant_none')); return; }
      const k = await ask(`${gt('garden.empty')} ${gt('garden.plant_ask')}`, [...seeds.map((s) => `${nm(s)} ×${b.count(s)}`), gt('garden.cancel')]);
      if (k == null || k < 0 || k >= seeds.length) return;
      const r = plant(G, pl.id, seeds[k], d, b); if (r.ok) await say(gt('garden.planted', { crop: cropName(r.crop) }));
      scene._dirty = true; return;
    }
    const crop = cropName(st.crop);
    if (stage === 'ready') {
      const k = await ask(gt('garden.ready', { crop }), [gt('garden.harvest_yes'), gt('garden.cancel')]); if (k !== 0) return;
      const r = harvest(G, pl.id, d, b);
      await say(r.ok ? gt('garden.harvested', { n: r.n, crop }) : gt('garden.bag_full', { crop })); scene._dirty = true; return;
    }
    const k = await ask(`${gt(`garden.stage.${stage}`, { crop })} ${gt('garden.water_ask')}`, [gt('garden.water_yes'), gt('garden.cancel')]); if (k !== 0) return;
    const r = water(G, pl.id, d, b);
    await say(r.ok ? gt(CANS[r.can].instant ? 'garden.watered_merit' : 'garden.watered', { crop }) : r.reason === 'no_can' ? gt('garden.no_can') : gt('garden.watered_done'));
    scene._dirty = true;
  }
  const hook = (s) => {
    if (!s || s._gardenHooked) return; s._gardenHooked = true;
    const prev = s.onInteract.bind(s);
    s.onInteract = (fx, fy) => {
      const pl = plotAt(scene.map?.name, fx, fy); if (!pl) return prev(fx, fy);
      scene.script(() => usePlot(pl)); return true;
    };
  };
  hook(S());

  // ---- merit shop screen ----
  const ui = () => S()?.ui || globalThis.window?.kilumen?.ui;
  const installScreen = (U) => {
    if (!U || U.scr_merit_shop) return;
    U.scr_merit_shop = function (arg = {}) {
      let mode = 0;
      const list = () => (mode === 0 ? dailyStock(day()) : MERIT_FIXED).map((x) => ({ ...x, name: nm(x.id), owned: bag().isKey?.(x.id) && bag().count(x.id) > 0 }));
      const desc = (id) => (CANS[id] ? gt(`merit.shop.desc.${id}`) : SEED_TO_CROP[id] ? gt('merit.shop.desc.seeds', { days: CROPS[SEED_TO_CROP[id]].days }) : '');
      const pts = () => meritState(sstate()).points;
      const info = (it) => (it ? `<b>${esc(it.name)}</b><p class="soft">${esc(desc(it.id))}</p><p class="soft">${esc(gt('merit.shop.in_pack', { n: bag().count(it.id) }))}</p>${mode === 0 ? `<p class="soft sys-small">${esc(gt('merit.shop.rotates'))}</p>` : ''}` : '');
      const scr = { scr: 'shop', pat: 'awning', title: gt('merit.shop.title'), glyph: 'shop', sel: 0, cols: 1, count: () => list().length,
        chips: () => `<span class="ui-chip merit-pts" data-aa="merit-pts">★ ${esc(gt('merit.shop.points', { points: pts() }))}</span>`,
        render: () => {
          const l = list();
          return `<div class="ui-tabs"><div class="ui-tab ${mode === 0 ? 'on' : ''}" data-tab="0">${esc(gt('merit.shop.tab_today'))}</div><div class="ui-tab ${mode === 1 ? 'on' : ''}" data-tab="1">${esc(gt('merit.shop.tab_always'))}</div></div>
          <div class="ui-body sys-split"><div class="ui-panel ui-pad ui-grow ui-scroll" data-scr="shop" data-pat="awning" data-scroll>
            <ul class="ui-list" data-aa="merit-shop-${mode}">${l.map((it, i) => `<li class="ui-row" data-i="${i}" data-k="${esc(it.id)}"><span class="grow">${esc(it.name)}</span>${it.owned ? `<span class="soft">${esc(gt('merit.shop.owned'))}</span>` : `<span class="price">★ ${it.price}</span>`}</li>`).join('')}</ul></div>
            <div class="plate ui-pad sys-side" id="meritinfo">${info(l[scr.sel])}</div></div>`;
        },
        onTab: (t) => { mode = +t; scr.sel = 0; U.rerender(); },
        onLR: () => scr.onTab((mode + 1) % 2),
        onSel: (i) => { const el = U.stage?.querySelector('#meritinfo'); if (el) el.innerHTML = info(list()[i]); },
        hint: () => U.hintText([['◀▶', gt('merit.shop.hint_tabs')], ['A', gt('merit.shop.hint_pick')], ['B', gt('merit.shop.hint_back')]]),
        onA: async (i) => {
          const it = list()[i]; if (!it) return;
          if (it.owned) { U.note(gt('merit.shop.already')); return; }
          if (pts() < it.price) { U.note(gt('merit.shop.short', { short: it.price - pts() })); return; }
          const max = bag().isKey?.(it.id) ? 1 : Math.max(1, Math.min(99, Math.floor(pts() / it.price)));
          const n = max === 1 ? 1 : await U.qty({ name: it.name, price: it.price, unit: '★' }, max); if (!n) return;
          const k = await U.ask('shop', [gt('merit.shop.confirm', { item: it.name, count: n, total: it.price * n })], [gt('merit.shop.confirm_yes'), gt('merit.shop.confirm_no')], { pat: 'awning' });
          if (k !== 0) return;
          const r = buyMerit(sstate(), bag(), it.id, n, day());
          U.note(r.ok ? gt('merit.shop.bought') : r.reason === 'short' ? gt('merit.shop.short', { short: r.short }) : r.reason === 'owned' ? gt('merit.shop.already') : gt('merit.shop.bag_full'));
          scene._dirty = true; U.rerender();
        },
        onBack: () => { U.toastFn?.(gt('merit.shop.bye')); return true; },
      };
      if (arg.onClose) { const prev = U._onClose; U._onClose = () => { prev?.(); arg.onClose(); }; }
      return scr;
    };
  };
  installScreen(ui());
  async function openMeritShop() {
    await S()?.ready; const U = ui(); installScreen(U); if (!U) return;
    await new Promise((resolve) => U.open('merit_shop', { onClose: resolve }));
  }
  scene.openMeritShop = openMeritShop;
  return { openMeritShop, usePlot, drawPlots };
}

// QoL batch C UI wiring (Coder, Oct 29 2026). Installed after the systems screens (src/main.js, one line). Wraps the
// existing GameUI (src/ui/ui.js is NOT edited): phone apps (Storage, Quick save), Summary A-menu (Stats, Rename),
// encounter hook (blocker renew prompt, chain counter). Every feature has a kill switch in ./flags.js (?qolc=).
// Text: every label is a PLACEHOLDER fallback read through ui.T('qol_c.*'); Text Bot request: design/QOL_BATCH_C_TEXT_NEEDS.md
import { qolcFlags, QOLC_CFG } from './flags.js?v=v0.2.103-alpha';
import { quickSave, quickSaveBlock, storageAvailable, statRows, renameCreature, Blocker, ChainCounter, qolcState } from './logic.js?v=v0.2.103-alpha';
import { displayName } from '../systems/creature.js?v=v0.2.103-alpha';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const STAT_FB = { hp: 'Health', atk: 'Power', def: 'Guard', spa: 'Focus', spd: 'Resolve', spe: 'Speed' };
const GRADE_FB = ['Low', 'Fair', 'Good', 'Great', 'Top'];
const GRADE_COL = ['#9aa3b5', '#7fc4ff', '#47c27a', '#ffb23f', '#ff6fa8'];
const SAVE_WHY_FB = { battle: 'Not during a battle.', dialogue: 'Not while talking.', script: 'Not right now.', default: 'Not right now.' };

export function installQolC(scene, ui, { query = null, prompt = globalThis.prompt } = {}) {
  const flags = qolcFlags(query), sys = scene?.systems;
  const api = { flags, cfg: { ...QOLC_CFG, blockerItems: { ...QOLC_CFG.blockerItems } } };
  if (!ui || !sys) return api;
  const st = qolcState(sys);
  const T = (k, fb) => { const v = ui.T('qol_c.' + k, null); return typeof v === 'string' ? v : fb; };
  const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  const party = () => sys.party?.list || scene.party || [];
  api.blocker = new Blocker(st.blocker, api.cfg);
  api.chain = new ChainCounter(st.chain);

  // ---------------- phone apps (#10 storage, #15 quick save) ----------------
  const extraApps = () => [
    ...(flags.storage && storageAvailable(scene, api.cfg) ? [['qolc_storage', T('apps.storage', 'Storage'), '#2fb5a8', '▦']] : []),
    ...(flags.quicksave ? [['qolc_quicksave', T('apps.quick_save', 'Quick save'), '#7d5cff', '✓']] : []),
    ...(flags.chain ? [['qolc_chain', T('apps.chain', 'Chain'), '#d98a00', '∞']] : []),
  ];
  const origPhone = ui.scr_phone;
  ui.scr_phone = function () {
    const scr = origPhone.call(this), extra = extraApps();
    if (!extra.length) return scr;
    const n0 = scr.count(), oRender = scr.render, oA = scr.onA;
    scr.count = () => n0 + extra.length;
    scr.render = () => oRender().replace(/<\/div><\/div>\s*$/, extra.map(([k, l, col, g], j) =>
      `<div class="ui-tile" data-i="${n0 + j}" data-app="${k}"><span class="badge" style="background:${col};color:#fff;font-weight:700;display:grid;place-items:center;font-size:1.4em">${g}</span><span class="lbl">${esc(l)}</span></div>`).join('') + '</div></div>');
    scr.onA = (i) => {
      if (i < n0) return oA(i);
      const k = extra[i - n0]?.[0]; ui._phoneSel = i;
      if (k === 'qolc_quicksave') return api.quickSave();
      ui.open(k);
    };
    return scr;
  };
  api.quickSave = () => {
    const r = quickSave(scene, ui);
    ui.note(r.ok ? T('quick_save.done', 'Saved.') : T('quick_save.blocked.' + r.reason, SAVE_WHY_FB[r.reason] || SAVE_WHY_FB.default), 1800);
    return r;
  };

  // Storage: team on top (A = drop off), current box below (A = pick up); ◀▶ box.
  ui.scr_qolc_storage = function () {
    let box = 0;
    const rows = () => [...party().map((c, i) => ['team', i, c]), ...sys.archive.box(box).map((c, i) => ['box', i, c])];
    const nBox = () => sys.archive.boxCount(sys.company?.idLevel || 1);
    const scr = { scr: 'qolc_storage', pat: 'checker', title: T('storage.title', 'Storage'), glyph: 'archive', sel: 0, cols: 1, count: () => rows().length,
      chips: () => `<span class="ui-chip dark">${esc(fill(T('storage.box', 'Box {n}'), { n: box + 1 }))} / ${nBox()}</span>`,
      render: () => {
        const r = rows(), nt = party().length;
        const li = ([w, i, c], k) => `<li class="ui-row" data-i="${k}" style="padding-left:10px"><span class="grow">${esc(displayName(c))}</span><span class="lv">Lv.${c.level}</span><span class="plate dark" style="padding:0 8px;font-size:.8em">${esc(w === 'team' ? T('storage.drop_off', 'Drop off') : T('storage.pick_up', 'Pick up'))}</span></li>`;
        return `<div class="ui-panel ui-pad ui-grow ui-scroll" data-scr="archive" data-pat="checker" data-scroll>
          <div class="plate ui-pad soft" style="font-size:.85em">${esc(T('storage.team', 'Team'))}</div><ul class="ui-list">${r.slice(0, nt).map(li).join('')}</ul>
          <div class="ui-tabs" style="margin-top:8px"><div class="ui-tab" data-act="prevbox">◀</div><div class="ui-tab on" style="flex:4">${esc(fill(T('storage.box', 'Box {n}'), { n: box + 1 }))}</div><div class="ui-tab" data-act="nextbox">▶</div></div>
          <ul class="ui-list">${r.slice(nt).map((x, k) => li(x, nt + k)).join('') || `<li class="plate ui-empty">${esc(T('storage.empty', 'This box is empty.'))}</li>`}</ul></div>`;
      },
      hint: () => ui.hintText([['A', T('storage.move', 'Move')], ['◀▶', T('storage.box_hint', 'Box')], ['B', T('back', 'Back')]]),
      onAct: (a) => { box = (box + (a === 'prevbox' ? nBox() - 1 : 1)) % nBox(); scr.sel = Math.min(scr.sel, Math.max(0, rows().length - 1)); ui.rerender(); },
      onLR: (d) => scr.onAct(d < 0 ? 'prevbox' : 'nextbox'),
      onA: (k) => {
        const row = rows()[k]; if (!row) return;
        const [w, i] = row;
        const r = w === 'team' ? sys.party.depositAt(i, sys.company?.idLevel || 1) : sys.party.withdraw(box, i);
        if (!r.ok) ui.note(T('storage.fail.' + r.reason, { last_one: 'Keep at least one ready creature with you.', team_full: 'Your team is full.', box_full: 'Storage is full.' }[r.reason] || 'Not right now.'), 2000);
        scene._dirty = true; scr.sel = Math.min(k, Math.max(0, rows().length - 1)); ui.rerender();
      },
    };
    return scr;
  };

  // ---------------- Summary A-menu (#8 stats, #16 rename) ----------------
  const origSummary = ui.scr_summary;
  ui.scr_summary = function (i = 0) {
    const scr = origSummary.call(this, i), oHandle = scr.handle, oHint = scr.hint;
    const opts = () => [...(flags.stats ? [['stats', T('summary.stats', 'Stats')]] : []), ...(flags.rename ? [['rename', T('summary.rename', 'Rename')]] : [])];
    if (!opts().length) return scr;
    scr.hint = () => ui.hintText([['A', T('summary.more', 'More')], ['◀▶', 'Page'], ['▲▼', 'Creature'], ['B', T('back', 'Back')]]);
    scr.handle = async (inp) => {
      if (!inp.a) return oHandle(inp);
      const o = opts(), c = ui.party()[scr.idx]; if (!c) return;
      const k = await ui.ask('summary', [displayName(c)], [...o.map((x) => x[1]), T('back', 'Back')], { pat: 'dots' });
      const act = o[k]?.[0];
      if (act === 'stats') ui.open('qolc_stats', scr.idx);
      else if (act === 'rename') { api.rename(c); ui.rerender(); }
    };
    void oHint;
    return scr;
  };
  api.rename = (c, value) => { if (typeof c === 'number') c = ui.party()[c]; if (!c) return { ok: false, reason: 'none' };
    const v = value !== undefined ? value : typeof prompt === 'function' ? prompt(fill(T('rename.ask', 'New name for {creature}? (max {max} letters, empty = species name)'), { creature: displayName(c), max: api.cfg.nameMax }), c.nickname || '') : null;
    if (v === null || v === undefined) return { ok: false, reason: 'cancel' };
    const r = renameCreature(c, v);
    if (r.ok) { scene._dirty = true; ui.note(fill(T('rename.done', 'Now called {creature}.'), { creature: displayName(c) }), 2000); }
    else ui.note(T('rename.fail.' + r.reason, r.reason === 'too_long' ? 'That name is too long.' : "That name can't be used."), 2200);
    return r;
  };
  ui.scr_qolc_stats = function (i = 0) {
    const scr = { scr: 'qolc_stats', pat: 'chevron', title: T('stats.title', 'Stats'), glyph: 'kilindex', sel: 0, cols: 1, idx: i, count: () => 0,
      render: () => {
        const list = ui.party(), c = list[scr.idx]; if (!c) return '<div class="plate ui-empty">—</div>';
        const rows = statRows(c);
        return `<div class="ui-panel ui-pad ui-grow ui-scroll" data-scr="summary" data-pat="chevron"><div class="plate ui-pad" style="display:flex;gap:10px"><span class="grow" style="font-size:1.2em">${esc(displayName(c))}</span><span class="lv">Lv.${c.level}</span></div>
          <table class="qolc-stats" style="width:100%;border-collapse:separate;border-spacing:0 6px;margin-top:6px"><tr class="soft" style="font-size:.8em"><th></th><th>${esc(T('stats.now', 'Now'))}</th><th style="text-align:left">${esc(T('stats.growth', 'Growth'))}</th></tr>
          ${rows.map((r) => `<tr data-stat="${r.key}"><td><b>${esc(T('stats.names.' + r.key, STAT_FB[r.key]))}</b>${r.boosted ? ' <span title="variant">✦</span>' : ''}</td><td style="text-align:right;padding-right:10px">${r.value}</td>
            <td style="width:60%"><div class="bar" style="--c:${GRADE_COL[r.grade]}"><i style="width:${(r.frac * 100).toFixed(0)}%;background:${GRADE_COL[r.grade]}"></i></div><span class="soft" style="font-size:.8em">${esc(T('stats.grades.' + r.grade, GRADE_FB[r.grade]))}</span></td></tr>`).join('')}</table>
          <p class="soft" style="font-size:.8em">${esc(T('stats.note', 'Growth shows how far each stat tends to rise for this kind of creature.'))}</p></div>`;
      },
      hint: () => ui.hintText([['▲▼', 'Creature'], ['B', T('back', 'Back')]]),
      handle: ({ dir, a, b }) => { const n = ui.party().length; if ((dir === 'up' || dir === 'down') && n) { scr.idx = (scr.idx + (dir === 'up' ? -1 : 1) + n) % n; ui.rerender(); } else if (a || b) ui.back(); },
    };
    return scr;
  };

  // ---------------- #17 chain readout (structure only, flag off by default) ----------------
  ui.scr_qolc_chain = function () {
    const o = ChainCounter.odds(st.chain.count);
    return { scr: 'qolc_chain', pat: 'waves', title: T('apps.chain', 'Chain'), glyph: 'kilindex', sel: 0, cols: 1, count: () => 0,
      render: () => `<div class="plate ui-pad"><dl class="ui-kv"><dt>${esc(T('chain.species', 'Kind'))}</dt><dd>${esc(st.chain.species || '—')}</dd><dt>${esc(T('chain.count', 'In a row'))}</dt><dd>${st.chain.count}</dd><dt>${esc(T('chain.best', 'Best'))}</dt><dd>${st.chain.best}</dd><dt>${esc(T('chain.odds', 'Variant odds'))}</dt><dd>1 / ${o.oneIn} <span class="soft">(${esc(T('chain.placeholder', 'not applied yet'))})</span></dd></dl></div>`,
      hint: () => ui.hintText([['B', T('back', 'Back')]]), handle: ({ a, b }) => { if (a || b) ui.back(); } };
  };

  // ---------------- encounter hook (#12 blocker renew, #17 chain) ----------------
  ui.scr_qolc_renew = function (arg = {}) {
    const name = sys.bag.nameOf?.(arg.item) || arg.item;
    const ch = [['yes', T('renew.yes', 'Use another')], ['no', T('renew.no', 'Not now')]];
    const scr = { scr: 'qolc_renew', pat: 'sparkle', title: name, glyph: 'pack', sel: 0, cols: 1, count: () => ch.length,
      render: () => `<div class="ui-panel ui-pad"><div class="plate ui-pad">${esc(fill(T('renew.ran_out', 'The {item} wore off. Use another? ({n} left)'), { item: name, n: sys.bag.count(arg.item) }))}</div>
        <ul class="ui-list">${ch.map((c, i) => `<li class="ui-row" data-i="${i}">${esc(c[1])}</li>`).join('')}</ul></div>`,
      hint: () => ui.hintText([['A', 'OK'], ['B', T('renew.no', 'Not now')]]),
      onA: (i) => { arg.answer = ch[i][0]; ui.closeAll(); arg.done?.(); },
      onBack: () => { arg.answer = 'no'; queueMicrotask(() => arg.done?.()); },
    };
    return scr;
  };
  api.offerRenew = () => {
    if (!api.blocker.canRenew(sys.bag)) return Promise.resolve(false);
    const item = st.blocker.item;
    return new Promise((res) => {
      const arg = { item, done: () => { const yes = arg.answer === 'yes' && api.blocker.start(item, sys.bag); scene._dirty = true; if (yes) ui.note(fill(T('renew.used', 'Used another {item}.'), { item: sys.bag.nameOf?.(item) || item }), 1600); res(!!yes); } };
      ui.open('qolc_renew', arg);
    });
  };
  const origEnc = scene.hooks?.onEncounterTile;
  if (scene.hooks) scene.hooks.onEncounterTile = (x, y, code) => {
    if (flags.renew && api.blocker.active && !scene.busy && !scene.fade) {
      const r = api.blocker.step(); scene._dirty = true;
      if (r.ranOut && api.blocker.canRenew(sys.bag)) scene.script ? scene.script(() => api.offerRenew()) : api.offerRenew();
      return;
    }
    const last = scene.log?.at?.(-1);
    origEnc?.(x, y, code);
    const e = scene.log?.at?.(-1);
    if (flags.chain && e && e !== last && e.type === 'wild') api.chain.record(e.species);
  };
  api.quickSaveBlock = () => quickSaveBlock(scene, ui);
  return api;
}

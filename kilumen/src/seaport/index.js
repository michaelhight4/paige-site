// Gullhaven Fishing Derby runtime (Coder, dev/seaport, Oct 30 2026). Rules: ./derby.js. Plan: design/seaport/PLAN.md.
// - derby clerk (gullhaven_lagoon, npc def.derby === 'desk'): shows the featured Kilu, gives 10 Tidelumens, starts the run
// - fishing (src/fishing/index.js) asks st.derby before each cast (one Tidelumen) and, on a hook, calls onCatch (weigh-in) instead
//   of opening a battle. No timer. The day clock is held (scene.timescale = 0) for the whole run and restored after.
// - the weigh-in scale (interact spot def.derby === 'scale') shows each catch's points, and at turn-in the full board
// - leaving gullhaven_lagoon (door / edge / fly) while a run is live asks to quit (forfeit) via scene.ask(['Yes','No'])
// - save: scene.systems.state.derby {best, runs, records, last, active}; the heaviest fish joins the team with weight_kg
import * as D from './derby.js?v=v0.2.108-alpha';
import { createDerbyFx, weightGlyphs, needleAngle, NEEDLE_PIVOT, READOUT_GLYPH_FRAME } from './derby_fx.js?v=v0.2.108-alpha';
import { createCreature, speciesName } from '../systems/creature.js?v=v0.2.108-alpha';

const C = { ink: '#1a1226', white: '#fcf6e8', gold: '#fcd668', sea: '#1e4078', foam: '#c6ecfa', red: '#a23432', grey: '#8a8590' };

export function attachSeaport(scene, { systems = scene.systems, rng = Math.random, fishing = () => globalThis.window?.kilumen?.fishing, installFishing = null, tables = null } = {}) {
  const sys = systems;
  const st = { run: null, scale: null, tables, savedTimescale: null, pool: [], fx: typeof Image !== 'undefined' ? createDerbyFx() : null };
  const rec = () => (sys.state.derby ||= D.blankRecord());
  const lines = (k) => { const v = sys?.text?.(k, null); return (Array.isArray(v) ? v : v?.pages) || D.TEXT[k]; };
  const T0 = (k, vars) => (scene.fill ? scene.fill(lines(k), { ...(scene.textVars?.() || {}), ...vars }) : lines(k).map((s) => s.replace(/\{(\w+)\}/g, (_, n) => vars?.[n] ?? '')));
  const T = (k, vars) => [].concat(T0(k, vars)).map((s) => (typeof s === 'string' ? s.replace(/(^|\D)1 Tidelumens\b/g, '$11 Tidelumen') : s)); // playtest: '1 Tidelumens' -> singular
  // say() remembers which scale state it was spoken over; setScale() dismisses that line when the scale moves on
  // (QA: the catch / idle line stayed open under the turn-in board).
  const say = (k, vars, sp) => { const p = scene.say(T(k, vars), sp); st.sayScale = st.scale; st.sayDlg = scene.dialog?.cur || null; return p; };
  const setScale = (next) => {
    const prev = st.scale; st.scale = next;
    const d = scene.dialog;
    if (prev !== next && d?.cur && d.cur === st.sayDlg && st.sayScale === prev && d.cur.type === 'say') d.dismiss?.();
    dirty();
  };
  const name = (sp) => { try { return speciesName(sp); } catch { return sp; } };
  const dirty = () => { scene._dirty = true; };

  const getTables = async () => {
    if (st.tables) return st.tables;
    const f = fishing(); if (f?.ready) { await f.ready; st.tables = f.tables; }
    return st.tables;
  };
  const featuredToday = async () => {
    const R = rec();
    if (R.active?.featured) return R.active.featured;
    if (!st.nextFeatured) { st.pool = D.derbyPool(await getTables()); st.nextFeatured = D.pickFeatured(st.pool, rng()); }
    return st.nextFeatured;
  };

  const holdClock = () => { if (st.savedTimescale == null) { st.savedTimescale = scene.timescale ?? 1; scene.timescale = 0; } };
  const releaseClock = () => { if (st.savedTimescale != null) { scene.timescale = st.savedTimescale; st.savedTimescale = null; } };

  async function ensureFishing() {
    if (fishing()) return fishing();
    if (!installFishing) { const m = await import('../fishing/index.js?v=v0.2.108-alpha'); installFishing = m.installFishing; }
    const f = installFishing(scene); if (globalThis.window?.kilumen) window.kilumen.fishing = f; return f;
  }
  function bindFishing(f) { if (f) f.derby = api; }

  async function startRun(featured) {
    st.run = D.newRun(featured);
    rec().active = { crystals: st.run.crystals, featured };
    holdClock(); dirty();
    if (!sys.bag?.count?.('fishing_rod') && !sys.bag?.count?.('rod_good') && !sys.bag?.count?.('rod_super')) sys.bag?.add?.('fishing_rod', 1); // loaner, as the clerk's Text Bot line says
    bindFishing(await ensureFishing());
    await say('derby.start');
  }
  async function endRun({ forfeit = false, speaker } = {}) {
    const run = st.run; if (!run) return null;
    const { result, record } = D.finishRun(rec(), run, { forfeit });
    sys.state.derby = record; st.run = null; st.nextFeatured = null; releaseClock();
    if (forfeit) { setScale(null); await say('derby.forfeit', {}, speaker); dirty(); return result; }
    setScale({ mode: 'board', run, result, t0: Date.now() }); dirty();
    await say(result.tier ? 'derby.turn_in' : 'derby.no_tier', { score: result.score, tier: D.tierName(result.tier) }, speaker);
    if (result.newBest) await say('derby.new_best');
    if (result.prize) sys.bag?.add?.(result.prize.item, result.prize.n);
    const big = D.scoreRun(run).largest;
    if (big) {
      try {
        const c = createCreature({ species: big.species, level: big.level, origin: { map: D.DERBY_MAP, how: 'derby' } }); c.weight_kg = big.kg;
        sys.party?.add?.(c, sys.company?.idLevel || 1);
        await say('derby.keeper', { species: name(big.species), kg: big.kg });
      } catch (e) { console.error('derby keeper:', e); }
    }
    setScale(null); dirty();
    return result;
  }

  // --- fishing hook api (src/fishing/index.js) ---
  const api = {
    active: () => !!st.run && scene.map?.name === D.DERBY_MAP,
    get fx() { return st.fx; },
    async useCrystal() { if (!D.useCrystal(st.run)) { await say('derby.no_crystal'); return false; } rec().active.crystals = st.run.crystals; dirty(); return true; },
    async onCatch(fish) {
      const c = D.addCatch(st.run, fish, rng(), rec().records);
      setScale({ mode: 'catch', c, t0: Date.now() }); dirty();
      await say(c.points.featured ? 'derby.catch_featured' : 'derby.catch', { species: name(c.species), kg: c.kg, points: c.points.total });
      if (c.points.record) await say('derby.record');
      setScale(null); dirty();
    },
    async afterCast() { if (st.run && st.run.crystals <= 0) await say('derby.out'); },
    get run() { return st.run; },
  };

  // --- desk clerk + scale ---
  (scene.talkHooks ||= []).push({
    match: (mapName, def) => mapName === D.DERBY_MAP && def?.derby === 'desk',
    async run({ speaker }) {
      if (st.run) {
        await say('derby.desk_busy', { n: st.run.crystals, score: st.run.score }, speaker);
        if (st.run.crystals > 0 && (await scene.ask(T('derby.turn_in_early', { n: st.run.crystals }), ['Yes', 'No'], speaker)) !== 0) return;
        await endRun({ speaker }); return;
      }
      // Marlo Hollis's legend (Text Bot v2 lines[legend]): after the first turn-in, once; sets gh_legend_heard via the line's `sets`
      const ent = scene.lines?.maps?.[D.DERBY_MAP]?.gullhaven_lagoon_derby_clerk;
      const legend = ent?.lines?.find((l) => l.id === 'legend');
      if (legend && (rec().turnIns || 0) >= 1 && !scene.flags?.has?.('gh_legend_heard')) {
        scene.setFlag?.('gh_legend_heard'); await scene.say(scene.fill ? scene.fill(legend.pages) : legend.pages, speaker);
      }
      const featured = await featuredToday(); st.deskShown = featured; dirty();
      const yes = (await scene.ask(T('derby.desk_intro', { n: D.CRYSTAL.perRun, featured: name(featured), mult: D.FEATURED_MULT }), ['Yes', 'No'], speaker)) === 0;
      if (yes) await startRun(featured);
    },
  });
  const origSpot = scene.runSpot?.bind(scene);
  if (origSpot) scene.runSpot = async (sp) => {
    if (sp?.derby !== 'scale') return origSpot(sp);
    if (st.run) { setScale({ mode: 'board', run: st.run, result: null, t0: Date.now() }); dirty(); if (st.run.crystals <= 0) await endRun(); else await say('derby.desk_busy', { n: st.run.crystals, score: st.run.score }); setScale(null); dirty(); return; }
    await say('derby.scale_idle', { best: rec().best || 0 });
  };

  // --- area lock: any warp off the derby map while a run is live asks to quit ---
  const origWarp = scene.startWarp.bind(scene);
  scene.startWarp = (spawn, kind) => {
    const to = spawn?.exit?.to ?? spawn?.map;
    if (!st.run || !D.leavesArea(scene.map?.name, to) || st.asking) return origWarp(spawn, kind);
    st.asking = true; scene.player.locked = true;
    (async () => {
      try {
        const quit = (await scene.ask(T('derby.leave_ask'), ['Yes', 'No'])) === 0;
        if (quit) { await endRun({ forfeit: true }); origWarp(spawn, kind); }
        else { const p = scene.player; const back = { up: 'down', down: 'up', left: 'right', right: 'left' }[p.facing] || 'down'; p.facing = back; }
      } finally { st.asking = false; if (!scene.fade) scene.player.locked = false; dirty(); }
    })();
  };
  api.leaveCheck = () => st.asking;

  // --- resume after a reload: an active run in the save comes back (crystals + featured; the haul is not kept) ---
  const a = rec().active;
  if (a && a.featured) { st.run = D.newRun(a.featured, a.crystals | 0); holdClock(); }
  const iv = typeof setInterval !== 'undefined' && typeof window !== 'undefined' ? setInterval(() => {
    if (scene.map?.name === D.DERBY_MAP) { const f = fishing(); if (f && f.derby !== api) bindFishing(f); else if (!f && st.run) ensureFishing().then(bindFishing).catch(() => {}); }
  }, 500) : null;

  // --- HUD + scale card (drawn in code; Kilumen palette) ---
  const origView = scene.view.bind(scene);
  scene.view = () => {
    const v = origView();
    // Director QA I8 (#14 repeat): the quest strip covered the derby stall; hide it on the derby map only
    const qh = globalThis.document?.getElementById?.('pg-quest-hud'), onDerby = scene.map?.name === D.DERBY_MAP;
    if (qh && qh.style.visibility !== (onDerby ? 'hidden' : '')) qh.style.visibility = onDerby ? 'hidden' : '';
    if (!onDerby) return v;
    if (!st.run && !st.deskShown && !st.nextFeatured && !st.fPending) st.fPending = featuredToday().then(dirty, () => {}); // QA I9: never a blank featured line

    const under = v.markers;
    v.markers = (ctx, vv) => { const r = typeof under === 'function' ? under(ctx, vv) : undefined; try { drawHud(ctx, vv || v); } catch {} return r; };
    return v;
  };
  function drawHud(ctx, v) {
    const W = ctx.canvas?.width || 640; ctx.save(); ctx.setTransform?.(1, 0, 0, 1, 0, 0);
    const featured = st.run?.featured || st.deskShown || st.nextFeatured || rec().active?.featured;
    const x = 8, y = 72, w = 230, h = st.run ? 78 : 44;
    ctx.fillStyle = 'rgba(26,18,38,0.82)'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = C.gold; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.font = 'bold 13px monospace'; ctx.fillStyle = C.gold; ctx.fillText('FISHING DERBY', x + 10, y + 18);
    ctx.font = '12px monospace'; ctx.fillStyle = C.white;
    if (featured) ctx.fillText(fit(ctx, `Featured: ${name(featured)} x${D.FEATURED_MULT}`, w - 20), x + 10, y + 35);
    if (st.run) {
      for (let i = 0; i < D.CRYSTAL.perRun; i++) { const cx = x + 14 + i * 13, cy = y + 50; ctx.fillStyle = i < st.run.crystals ? C.foam : C.grey; ctx.beginPath(); ctx.moveTo(cx, cy - 6); ctx.lineTo(cx + 4, cy); ctx.lineTo(cx, cy + 6); ctx.lineTo(cx - 4, cy); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = C.white; ctx.fillText(`${st.run.score} pts`, x + 150, y + 54); ctx.fillText(`${st.run.crystals} cast${st.run.crystals === 1 ? '' : 's'} left`, x + 10, y + 71); // count in text too (the grey/foam diamonds read as 0 at a glance)
    }
    if (st.scale) drawScale(ctx, W);
    ctx.restore();
  }
  // Scale card (Director art QA #14): Art Bot's scale_needle (held last frame + needle drawn in code from the weight),
  // readout_pop plate with weight_glyphs kg digits, new_record_burst on a record. Text is measured and wrapped to the box.
  const fit = (ctx, t, w) => { let s = String(t); if (ctx.measureText(s).width <= w) return s; while (s.length > 1 && ctx.measureText(s + '…').width > w) s = s.slice(0, -1); return s + '…'; };
  const wrap = (ctx, t, w) => { const out = []; let cur = ''; for (const word of String(t).split(' ')) { const n = cur ? cur + ' ' + word : word; if (ctx.measureText(n).width > w && cur) { out.push(cur); cur = word; } else cur = n; } if (cur) out.push(cur); return out; };
  function drawScale(ctx, W) {
    const s = st.scale, FX = st.fx, t = Date.now() - s.t0;
    const w = Math.min(W - 16, 440), x = W - w - 8, y = 96, pad = 10; // under Day / Menu (QA: banner overlap)
    const big = s.mode === 'catch' ? s.c : D.scoreRun(s.run).largest;
    const rows = s.mode === 'catch' ? [s.c] : s.run.haul.slice(-6);
    ctx.font = '12px monospace';
    const foot = s.mode === 'catch'
      ? (() => { const p = s.c.points; return `rarity ${p.base} + size ${p.weight}${p.record ? ` + record ${p.record}` : ''}${p.pb ? ` + best ${p.pb}` : ''}${p.featured ? ` x${D.FEATURED_MULT}` : ''} = ${p.total}`; })()
      : (() => { const sc = D.scoreRun(s.run); return `count +${sc.count}  heaviest +${sc.heaviest}`; })();
    const footLines = wrap(ctx, foot, w - 2 * pad);
    const colX = x + pad + 128 + pad, colW = w - (colX - x) - pad;
    const plateS = Math.min(1, (w - 2 * pad) / 256), plateY = y + 28 + 128 + 6;
    const h = (plateY - y) + 64 * plateS + 8 + footLines.length * 16 + (s.mode === 'board' ? 18 : 0) + 6;
    ctx.fillStyle = 'rgba(30,64,120,0.94)'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = C.white; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.font = 'bold 13px monospace'; ctx.fillStyle = C.gold; ctx.fillText(s.mode === 'catch' ? 'WEIGH-IN' : 'DERBY BOARD', x + pad, y + 19);
    // scale + needle
    const sx = x + pad + 64, sy = y + 28 + 116;
    if (FX?.has('scale_needle')) {
      FX.draw(ctx, 'scale_needle', FX.frameAt('scale_needle', t), sx, sy, 1);
      if (FX.done('scale_needle', t) && big) {
        const px = sx - 64 + NEEDLE_PIVOT.x, py = sy - 116 + NEEDLE_PIVOT.y, a = needleAngle(big.frac);
        ctx.strokeStyle = C.red; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(Math.round(px + Math.sin(a) * 34), Math.round(py - Math.cos(a) * 34)); ctx.stroke();
        ctx.fillStyle = C.ink; ctx.fillRect(px - 3, py - 3, 6, 6);
      }
    }
    // rows (name fitted to the column)
    ctx.font = '12px monospace'; let yy = y + 42;
    for (const c of rows) {
      const right = `${c.kg}kg ${c.points.total}${c.points.featured ? '*' : ''}`;
      ctx.fillStyle = C.white; ctx.fillText(fit(ctx, name(c.species), colW - ctx.measureText(right).width - 8), colX, yy);
      ctx.fillText(right, colX + colW - ctx.measureText(right).width, yy); yy += 18;
    }
    // readout plate + kg glyphs (+ record burst)
    const pcx = x + w / 2, pcy = plateY + 32 * plateS;
    if (FX?.has('readout_pop') && big) {
      FX.draw(ctx, 'readout_pop', FX.frameAt('readout_pop', t), pcx, pcy, plateS);
      const g0 = (FX.meta.readout_pop.ms_per_frame || []).slice(0, READOUT_GLYPH_FRAME).reduce((a, b) => a + b, 0);
      if (t >= g0 && FX.has('weight_glyphs')) {
        const ids = weightGlyphs(big.kg), gs = Math.min(0.75, (200 * plateS) / FX.glyphsWidth(ids, 1));
        FX.glyphs(ctx, ids, Math.round(pcx - FX.glyphsWidth(ids, gs) / 2), Math.round(pcy - 32 * gs), gs);
      }
      const rec2 = s.mode === 'catch' ? s.c.points.record : s.result?.newBest;
      if (rec2 && t >= g0 && FX.has('new_record_burst') && !FX.done('new_record_burst', t - g0)) FX.draw(ctx, 'new_record_burst', FX.frameAt('new_record_burst', t - g0), pcx, pcy, plateS);
    }
    ctx.font = '12px monospace'; ctx.fillStyle = C.white; let fy = plateY + 64 * plateS + 20;
    for (const l of footLines) { ctx.fillText(l, x + pad, fy); fy += 16; }
    if (s.mode === 'board') { ctx.fillStyle = C.gold; ctx.font = 'bold 12px monospace'; ctx.fillText(fit(ctx, `TOTAL ${s.result?.score ?? D.scoreRun(s.run).total}${s.result?.tier ? '  ' + D.tierName(s.result.tier).toUpperCase() : ''}`, w - 2 * pad), x + pad, fy); }
  }

  return { api, st, stop: () => iv && clearInterval(iv), startRun, endRun, featuredToday };
}

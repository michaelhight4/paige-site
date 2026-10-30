// Gullhaven Fishing Derby runtime (Coder, dev/seaport, Oct 30 2026). Rules: ./derby.js. Plan: design/seaport/PLAN.md.
// - derby clerk (gullhaven_lagoon, npc def.derby === 'desk'): shows the featured Kilu, gives 10 Tidelumens, starts the run
// - fishing (src/fishing/index.js) asks st.derby before each cast (one Tidelumen) and, on a hook, calls onCatch (weigh-in) instead
//   of opening a battle. No timer. The day clock is held (scene.timescale = 0) for the whole run and restored after.
// - the weigh-in scale (interact spot def.derby === 'scale') shows each catch's points, and at turn-in the full board
// - leaving gullhaven_lagoon (door / edge / fly) while a run is live asks to quit (forfeit) via scene.ask(['Yes','No'])
// - save: scene.systems.state.derby {best, runs, records, last, active}; the heaviest fish joins the team with weight_kg
import * as D from './derby.js?v=v0.2.93-alpha';
import { createCreature, speciesName } from '../systems/creature.js?v=v0.2.93-alpha';

const C = { ink: '#1a1226', white: '#fcf6e8', gold: '#fcd668', sea: '#1e4078', foam: '#c6ecfa', red: '#a23432', grey: '#8a8590' };

export function attachSeaport(scene, { systems = scene.systems, rng = Math.random, fishing = () => globalThis.window?.kilumen?.fishing, installFishing = null, tables = null } = {}) {
  const sys = systems;
  const st = { run: null, scale: null, tables, savedTimescale: null, pool: [] };
  const rec = () => (sys.state.derby ||= D.blankRecord());
  const lines = (k) => { const v = sys?.text?.(k, null); return (Array.isArray(v) ? v : v?.pages) || D.TEXT[k]; };
  const T = (k, vars) => (scene.fill ? scene.fill(lines(k), { ...(scene.textVars?.() || {}), ...vars }) : lines(k).map((s) => s.replace(/\{(\w+)\}/g, (_, n) => vars?.[n] ?? '')));
  const say = (k, vars, sp) => scene.say(T(k, vars), sp);
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
    if (!installFishing) { const m = await import('../fishing/index.js?v=v0.2.93-alpha'); installFishing = m.installFishing; }
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
    if (forfeit) { st.scale = null; await say('derby.forfeit', {}, speaker); dirty(); return result; }
    st.scale = { mode: 'board', run, result, t0: Date.now() }; dirty();
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
    st.scale = null; dirty();
    return result;
  }

  // --- fishing hook api (src/fishing/index.js) ---
  const api = {
    active: () => !!st.run && scene.map?.name === D.DERBY_MAP,
    async useCrystal() { if (!D.useCrystal(st.run)) { await say('derby.no_crystal'); return false; } rec().active.crystals = st.run.crystals; dirty(); return true; },
    async onCatch(fish) {
      const c = D.addCatch(st.run, fish, rng(), rec().records);
      st.scale = { mode: 'catch', c, t0: Date.now() }; dirty();
      await say(c.points.featured ? 'derby.catch_featured' : 'derby.catch', { species: name(c.species), kg: c.kg, points: c.points.total });
      if (c.points.record) await say('derby.record');
      st.scale = null; dirty();
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
      const featured = await featuredToday(); st.deskShown = featured; dirty();
      const yes = (await scene.ask(T('derby.desk_intro', { n: D.CRYSTAL.perRun, featured: name(featured), mult: D.FEATURED_MULT }), ['Yes', 'No'], speaker)) === 0;
      if (yes) await startRun(featured);
    },
  });
  const origSpot = scene.runSpot?.bind(scene);
  if (origSpot) scene.runSpot = async (sp) => {
    if (sp?.derby !== 'scale') return origSpot(sp);
    if (st.run) { st.scale = { mode: 'board', run: st.run, result: null, t0: Date.now() }; dirty(); if (st.run.crystals <= 0) await endRun(); else await say('derby.desk_busy', { n: st.run.crystals, score: st.run.score }); st.scale = null; dirty(); return; }
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
    if (scene.map?.name !== D.DERBY_MAP) return v;
    const under = v.markers;
    v.markers = (ctx, vv) => { const r = typeof under === 'function' ? under(ctx, vv) : undefined; try { drawHud(ctx, vv || v); } catch {} return r; };
    return v;
  };
  function drawHud(ctx, v) {
    const W = ctx.canvas?.width || 640; ctx.save(); ctx.setTransform?.(1, 0, 0, 1, 0, 0);
    const featured = st.run?.featured || st.deskShown || st.nextFeatured || rec().active?.featured;
    const x = 8, y = 8, w = 210, h = st.run ? 62 : 44;
    ctx.fillStyle = 'rgba(26,18,38,0.82)'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = C.gold; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.font = 'bold 13px monospace'; ctx.fillStyle = C.gold; ctx.fillText('FISHING DERBY', x + 10, y + 18);
    ctx.font = '12px monospace'; ctx.fillStyle = C.white;
    ctx.fillText(`Featured: ${featured ? name(featured) : '-'} x${D.FEATURED_MULT}`, x + 10, y + 35);
    if (st.run) {
      for (let i = 0; i < D.CRYSTAL.perRun; i++) { const cx = x + 14 + i * 13, cy = y + 50; ctx.fillStyle = i < st.run.crystals ? C.foam : C.grey; ctx.beginPath(); ctx.moveTo(cx, cy - 6); ctx.lineTo(cx + 4, cy); ctx.lineTo(cx, cy + 6); ctx.lineTo(cx - 4, cy); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = C.white; ctx.fillText(`${st.run.score} pts`, x + 150, y + 54);
    }
    if (st.scale) drawScale(ctx, W);
    ctx.restore();
  }
  function drawScale(ctx, W) {
    const s = st.scale, w = 260, x = W - w - 8, y = 8;
    const rows = s.mode === 'catch' ? [s.c] : s.run.haul.slice(-6);
    const h = 70 + rows.length * 16 + (s.mode === 'board' ? 34 : 0);
    ctx.fillStyle = 'rgba(30,64,120,0.9)'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = C.white; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    // dial: needle by weight fraction (catch) or by score vs. top tier (board)
    const frac = s.mode === 'catch' ? s.c.frac : Math.min(1, (s.result?.score ?? s.run.score) / D.TIERS[0].min);
    const cx = x + 34, cy = y + 44, R = 22; ctx.fillStyle = C.white; ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = C.red; ctx.beginPath(); ctx.moveTo(cx, cy); const a = Math.PI + Math.PI * frac; ctx.lineTo(cx + Math.cos(a) * (R - 3), cy + Math.sin(a) * (R - 3)); ctx.stroke();
    ctx.font = 'bold 12px monospace'; ctx.fillStyle = C.gold; ctx.fillText(s.mode === 'catch' ? 'WEIGH-IN' : 'DERBY BOARD', x + 64, y + 20);
    ctx.font = '11px monospace'; ctx.fillStyle = C.white;
    let yy = y + 38;
    for (const c of rows) { ctx.fillText(`${name(c.species).slice(0, 10).padEnd(10)} ${String(c.kg).padStart(6)}kg ${String(c.points.total).padStart(4)}${c.points.featured ? '*' : ''}`, x + 64, yy); yy += 16; }
    if (s.mode === 'catch') { const p = s.c.points; ctx.fillText(`rarity ${p.base} + size ${p.weight}${p.record ? ` + rec ${p.record}` : ''}${p.pb ? ` + pb ${p.pb}` : ''}${p.featured ? ` x${D.FEATURED_MULT}` : ''}`, x + 10, y + h - 10); }
    else { const sc = D.scoreRun(s.run); ctx.fillText(`count +${sc.count}  heaviest +${sc.heaviest}`, x + 10, y + h - 26); ctx.fillStyle = C.gold; ctx.fillText(`TOTAL ${s.result?.score ?? sc.total}${s.result?.tier ? ' ' + D.tierName(s.result.tier).toUpperCase() : ''}`, x + 10, y + h - 10); }
  }

  return { api, st, stop: () => iv && clearInterval(iv), startRun, endRun, featuredToday };
}

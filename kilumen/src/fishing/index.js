// Fishing v1 runtime (Coder, Oct 29 2026). Flag `fishing` (src/fishing/flags.js, ?fishing=1), off by default.
// Gary: fishing is how you catch water creatures when you are not riding on the water.
// Wraps (does not edit) scene.interact / scene.step / scene.view and systems.onTalk, so shared files stay untouched:
//  - interact facing any water cell (generic rule: lakes, rivers, the sea, a pier's end) with a rod in the bag -> cast
//  - the whole cast runs inside one scene.script (busy = save lock 'script'; the battle adds its own lock): no saves
//  - A during the wait is eaten here (keyboard Z/Space/Enter, pad A, the touch A button: all arrive as snap.a)
//  - a hook opens the normal wild battle (ui.wild.openBattle, same path as grass) with a water intro line
// Gear v1 (design/FISHING_GEAR.md): Driftline / Lanternreach rod gifts (Saltmere fisher, Lanternport keeper), earned baits
// (Lantern Moth, Hollowstar Roe), a bait picker before each cast (only when the bag holds bait), one bait used per landed cast.
// Art: bobber, line, splash, ripples and the leaping shadow are drawn in code from the Kilumen palette (our own art).
import { FISHING_URL, TIMING, TEXT, bestRod, facedWater, planCast, judgePress, castArc, ease, bitePrompt, BAIT_IDS, ROD_GIFTS, gearGiftFor, catchFlags } from './logic.js?v=v0.2.78-alpha';
import { ITEMS } from '../systems/items.js?v=v0.2.78-alpha';
import { TILE, DELTA } from '../overworld/constants.js?v=v0.2.78-alpha';

export const ROD_GIVER = Object.freeze({ map: 'brookhollow', npc: 'fisher', flag: 'got_fishing_rod', item: 'fishing_rod' });
const C = { ink: '#1a1226', red: '#a23432', white: '#fcf6e8', line: '#ecdec4', rod: '#6a442e', foam: '#c6ecfa', drop: '#7ac2e8', deep: '#1e4078', shadow: '#29252b', gold: '#fcd668' };
const now = () => (globalThis.performance?.now?.() ?? Date.now());
const frame = () => new Promise((r) => (globalThis.requestAnimationFrame ? requestAnimationFrame(() => r()) : setTimeout(r, 16)));
const wait = async (ms) => { const t = now(); while (now() - t < ms) await frame(); };

export function installFishing(scene, { ui = () => globalThis.window?.kilumen?.ui, rng = Math.random, tablesUrl = FISHING_URL } = {}) {
  const st = { tables: null, fx: null, casts: 0, last: null, picker: null, lastBait: null, baitUsed: 0 };
  st.ready = fetch(tablesUrl).then((r) => (r.ok ? r.json() : null)).then((t) => { st.tables = t; }).catch(() => {});
  const sys = scene.systems;
  const lines = (key) => { const v = sys?.text?.(key, null); return (Array.isArray(v) ? v : v?.pages) || TEXT[key]; }; // placeholder keys: Text Bot fills them
  const T = (key, vars) => (scene.fill ? scene.fill(lines(key), vars) : lines(key));
  const pick = (key, vars) => { const a = T(key, vars); return [a[Math.floor(rng() * a.length)]]; };
  const touch = () => scene.opts?.platform?.id === 'mobile' || !!globalThis.matchMedia?.('(pointer: coarse)').matches;

  // bite prompt words: the profile's keyboard confirm key (controls.prompts, e.g. "the F key" -> F), else Space
  const promptFor = (fx) => {
    const device = scene.input?.lastDevice || null;
    let confirmLabel = null;
    try { confirmLabel = device === 'keyboard' || !device ? (scene.opts?.platform?.profile?.controls?.prompts?.keyboard?.confirm_button?.label ?? null) : null; } catch {}
    const pr = bitePrompt({ touch: fx.touch, device, confirmLabel });
    return { ...pr, label: String(T(pr.textKey, { key: pr.key })[0]).replace('{key}', pr.key) };
  };

  // --- rod gift: the Brookhollow fisher (first talk after the rod exists; then their normal lines) ---
  if (sys?.onTalk) {
    const orig = sys.onTalk.bind(sys);
    sys.onTalk = async (a) => {
      if (a.mapName === ROD_GIVER.map && a.def?.id === ROD_GIVER.npc && !scene.flags?.has(ROD_GIVER.flag)) {
        await sys.say(lines('fishing.giver_pages'), {}, a.speaker);
        sys.bag?.add?.(ROD_GIVER.item, 1);
        scene.setFlag ? scene.setFlag(ROD_GIVER.flag, true) : scene.flags.add(ROD_GIVER.flag);
        scene.audio?.sfx?.('catch');
        await sys.say(lines('fishing.rod_received'));
        await sys.say(lines('fishing.rod_tip'));
        scene._dirty = true;
        return true;
      }
      const g = gearGiftFor(a.mapName, a.def?.id, scene.flags || new Set(), sys.bag);
      if (g) { await gearGift(g, a.speaker); return true; }
      return orig(a);
    };
  }

  const setFlag = (f) => (scene.setFlag ? scene.setFlag(f, true) : scene.flags?.add(f));
  const nameOf = (id) => ITEMS[id]?.name || id;
  async function gearGift(g, speaker) {
    const G = ROD_GIFTS.good, S = ROD_GIFTS.super;
    if (g.kind === 'good_hint' || g.kind === 'super_hint') { await sys.say(lines('fishing.' + g.kind), {}, speaker); return; }
    if (g.kind === 'good' || g.kind === 'super') {
      const R = g.kind === 'good' ? G : S;
      await sys.say(lines(`fishing.${g.kind}_giver_pages`), {}, speaker);
      sys.bag?.add?.(R.item, 1); setFlag(R.flag); scene.audio?.sfx?.('catch');
      st.gift = { kind: g.kind, t0: now() };
      await sys.say(lines(`fishing.${g.kind}_received`));
      if (g.kind === 'good') await sys.say(lines('fishing.good_tip'));
      else { sys.bag?.add?.('lantern_moth', R.moths); await sys.say(T('fishing.moth_received', { n: R.moths })); }
      st.gift = null; scene._dirty = true; return;
    }
    if (g.kind === 'moth') { await sys.say(lines('fishing.moth_gift'), {}, speaker); sys.bag?.add?.('lantern_moth', 1); await sys.say(T('fishing.moth_received', { n: 1 })); }
    if (g.kind === 'roe') { await sys.say(lines('fishing.roe_gift'), {}, speaker); sys.bag?.add?.('hollowstar_roe', 1); setFlag('roe_' + g.species); await sys.say(lines('fishing.roe_received')); }
    scene._dirty = true;
  }

  // --- bait picker: a small, lively list (No bait + each bait held, with counts). Up/Down, A picks, B backs out. ---
  const baitsHeld = () => BAIT_IDS.filter((id) => (sys?.bag?.count?.(id) || 0) > 0);
  function openPicker() {
    const held = baitsHeld();
    if (!held.length) return Promise.resolve({ bait: null });
    const opts = [{ id: null, name: String(T('fishing.bait_none')[0]), n: null }, ...held.map((id) => ({ id, name: nameOf(id), n: sys.bag.count(id) }))];
    const i = Math.max(0, opts.findIndex((o) => o.id === st.lastBait));
    return new Promise((done) => { st.picker = { opts, i, t0: now(), tMove: now(), title: String(T('fishing.bait_title')[0]), touch: touch(), done, prev: { a: true, b: true, dir: null } }; });
  }
  function pickerInput(snap) {
    const pk = st.picker, pv = pk.prev, a = !!snap?.a && !pv.a, b = (!!snap?.b && !pv.b) || !!snap?.bTap, dir = snap?.dir && snap.dir !== pv.dir ? snap.dir : null;
    pk.prev = { a: !!snap?.a, b: !!snap?.b, dir: snap?.dir || null };
    if (dir === 'up' || dir === 'down') { pk.i = (pk.i + (dir === 'up' ? -1 : 1) + pk.opts.length) % pk.opts.length; pk.tMove = now(); scene.audio?.sfx?.('blip'); }
    else if (a) { const o = pk.opts[pk.i]; st.lastBait = o.id; st.picker = null; scene.audio?.sfx?.('select'); pk.done({ bait: o.id }); }
    else if (b) { st.picker = null; pk.done({ cancel: true }); }
  }

  // --- interact: face water + rod -> cast ---
  const origInteract = scene.interact.bind(scene);
  scene.interact = () => {
    if (scene.busy || !st.tables) return origInteract();
    const p = scene.player, cell = facedWater(scene.map, p.x, p.y, p.facing);
    const spot = cell && scene.spots?.find((s) => s.kind !== 'trigger' && s.x === cell.x && s.y === cell.y);
    const rod = bestRod(sys?.bag);
    if (!cell || spot || !rod) return origInteract();
    scene.script(() => cast(cell, rod));
  };

  // --- step: A presses during the cast belong to fishing ---
  const origStep = scene.step.bind(scene);
  scene.step = (snap) => {
    if (st.picker) { pickerInput(snap); return origStep({ ...snap, a: false, b: false, bTap: false, dir: null }); }
    if (snap?.a && /^(cast|wait|bite)$/.test(st.fx?.phase || '')) { if (st.fx.press == null) st.fx.press = now(); snap = { ...snap, a: false }; } // dialogs (hooked line) still get A
    return origStep(snap);
  };

  // --- view: draw on top of the world (markers layer) ---
  const origView = scene.view.bind(scene);
  scene.view = () => {
    const v = origView();
    if (!st.fx && !st.picker && !st.gift) return v;
    const under = v.markers;
    v.markers = (ctx, vv) => { const r = typeof under === 'function' ? under(ctx, vv) : undefined; drawFishing(ctx, vv || v, st.fx); if (st.picker) drawBaitPicker(ctx, vv || v, st.picker); if (st.gift) drawRodGift(ctx, vv || v, st.gift, scene.player); return r; };
    return v;
  };

  async function cast(cell, rod) {
    if (!scene.party?.length) { await scene.say(T('fishing.no_team')); return; }
    const hasArt = ui()?.wild?.hasArt;
    const choice = await openPicker();
    if (choice.cancel) return;
    const baitId = choice.bait && sys.bag.count(choice.bait) > 0 ? choice.bait : null;
    const plan = planCast(st.tables, scene.map.name, rod, st.rng || rng, hasArt, baitId);
    const p = scene.player, d = DELTA[p.facing];
    const fx = st.fx = { phase: 'cast', t0: now(), cell, facing: p.facing, from: { x: (p.x + 0.5 + d.x * 0.45) * TILE, y: (p.y - 0.15) * TILE }, press: null, touch: touch(), plan };
    st.casts++;
    scene.audio?.sfx?.('select');
    scene.log?.push({ tick: scene.tick, type: 'fish_cast', map: scene.map.name, x: cell.x, y: cell.y, bite: plan.bite, species: plan.fish?.species || null, rarity: plan.fish?.rarity || null, bait: baitId, rod: rod.id });
    await wait(TIMING.CAST);
    fx.press = null; // presses during the swing do not count
    fx.phase = 'wait'; fx.tLand = now(); scene.audio?.sfx?.('blip');
    let baitOut = false; // one bait is used when the line lands, bite or not (design §4)
    if (baitId && sys.bag.remove(baitId, 1)) { st.baitUsed++; fx.bait = baitId; baitOut = sys.bag.count(baitId) === 0; scene._dirty = true; }
    let result = null;
    while (!result) {
      await frame();
      const t = now() - fx.tLand;
      const pressedAt = fx.press == null ? null : fx.press - fx.tLand;
      if (plan.bite && t >= plan.waitMs && fx.phase === 'wait') { fx.phase = 'bite'; fx.tBite = now(); fx.prompt = promptFor(fx); scene.audio?.sfx?.('grass'); }
      if (plan.empty && t > 900) result = 'no_table';
      else if (pressedAt != null) result = judgePress(plan, pressedAt, true, fx.touch) || 'early';
      else if (!plan.bite && t >= plan.waitMs + TIMING.WINDOW) result = 'nothing';
      else result = judgePress(plan, t, false, fx.touch);
    }
    st.last = result;
    if (plan.bite) for (const f of catchFlags(plan.fish, rod, scene.flags, result === 'hooked')) setFlag(f);
    if (baitOut) { if (st.lastBait === baitId) st.lastBait = null; }
    scene.log?.push({ tick: scene.tick, type: 'fish_result', result, species: result === 'hooked' ? plan.fish?.species : null });
    if (result === 'hooked' && plan.fish) {
      fx.phase = 'hooked'; fx.tHook = now(); scene.audio?.sfx?.('catch');
      fx.rare = plan.fish.rarity === 'rare';
      if (fx.rare) scene.audio?.sfx?.('select');
      await scene.say([...T(fx.rare ? 'fishing.rare_bite' : 'fishing.hooked'), ...(baitOut ? T('fishing.bait_out', { bait: nameOf(baitId) }) : [])]);
      fx.phase = 'leap'; fx.tLeap = now();
      await wait(TIMING.REEL + 300);
      st.fx = null;
      const w = ui()?.wild;
      if (w?.openBattle) {
        await w.openBattle({ species: plan.fish.species, level: plan.fish.level, biome: 'water', intro: { key: 'fishing.battle_intro', fallback: TEXT['fishing.battle_intro'] } });
        w.roller?.resetGrace?.();
      }
      return;
    }
    fx.phase = 'reelin'; fx.tReel = now();
    await wait(TIMING.REEL);
    st.fx = null;
    const key = { early: 'fishing.early', late: 'fishing.late', nothing: 'fishing.nothing', no_table: 'fishing.no_table' }[result] || 'fishing.nothing';
    await scene.say(pick(key));
    if (baitOut) await scene.say(T('fishing.bait_out', { bait: nameOf(baitId) }));
  }

  return st;
}

/** Draw rod, line, bobber, ripples, splash, bite "!" and the leaping shadow. World->screen = (w - cam) * zoom. */
export function drawFishing(ctx, v, fx) {
  if (!fx || !v?.cam) return;
  const z = v.zoom, sx = (x) => Math.round((x - v.cam.x) * z), sy = (y) => Math.round((y - v.cam.y) * z), P = Math.max(1, Math.round(z * 3));
  const t = now();
  const water = { x: (fx.cell.x + 0.5) * TILE, y: (fx.cell.y + 0.55) * TILE };
  const tip = fx.from;
  // bobber position
  let b = water, dip = 0;
  if (fx.phase === 'cast') b = castArc(tip, water, (t - fx.t0) / TIMING.CAST, 46);
  else if (fx.phase === 'reelin') b = castArc(water, tip, (t - fx.tReel) / TIMING.REEL, 10);
  else {
    const bobT = (t - (fx.tLand || t)) / 900;
    dip = fx.phase === 'bite' ? 5 + Math.sin((t - fx.tBite) / 60) * 3 : fx.phase === 'wait' ? ease.sineInOut((bobT % 1)) * 2 : 0;
  }
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  // rod
  ctx.strokeStyle = C.rod; ctx.lineWidth = Math.max(2, Math.round(z * 2.5));
  ctx.beginPath(); ctx.moveTo(sx(tip.x - (DELTA[fx.facing]?.x || 0) * 22), sy(tip.y + 26)); ctx.lineTo(sx(tip.x), sy(tip.y)); ctx.stroke();
  // line (slack curve)
  if (fx.phase !== 'leap') {
    ctx.strokeStyle = C.line; ctx.lineWidth = Math.max(1, Math.round(z));
    ctx.beginPath(); ctx.moveTo(sx(tip.x), sy(tip.y));
    ctx.quadraticCurveTo(sx((tip.x + b.x) / 2), sy(Math.max(tip.y, b.y) + 10), sx(b.x), sy(b.y + dip)); ctx.stroke();
  }
  const inWater = fx.phase === 'wait' || fx.phase === 'bite' || fx.phase === 'hooked';
  // ripples
  if (inWater) {
    const n = fx.phase === 'bite' || fx.phase === 'hooked' ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const k = (((t - (fx.tLand || t)) / (fx.phase === 'bite' ? 500 : 1400)) + i / n) % 1;
      ctx.strokeStyle = `rgba(198,236,250,${(1 - k) * 0.85})`; ctx.lineWidth = Math.max(1, Math.round(z * 1.5));
      ctx.beginPath(); ctx.ellipse(sx(water.x), sy(water.y + 4), (6 + k * 22) * z, (2.5 + k * 8) * z, 0, 0, Math.PI * 2); ctx.stroke();
    }
    if (fx.phase === 'bite' || fx.phase === 'hooked') { // a dark shape under the bobber
      ctx.fillStyle = 'rgba(30,64,120,0.55)'; ctx.beginPath(); ctx.ellipse(sx(water.x + 4), sy(water.y + 12), 16 * z, 6 * z, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  // splash on landing (first 350 ms)
  const sp = fx.tLand ? (t - fx.tLand) / 350 : 2;
  if (sp < 1) drawSplash(ctx, sx(water.x), sy(water.y), z, sp, 1);
  // bobber (pixel art, 4 x 6 art px: red cap, white body, ink outline)
  if (fx.phase !== 'leap') {
    const bx = sx(b.x) - 2 * P, by = sy(b.y + dip) - 5 * P;
    const ART = ['.OO.', 'ORRO', 'ORRO', 'OWWO', 'OWWO', '.OO.'], pal = { O: C.ink, R: C.red, W: C.white };
    const rows = inWater ? (fx.phase === 'bite' ? 3 : 5) : 6; // the bottom sits under the surface
    for (let y = 0; y < rows; y++) for (let x = 0; x < 4; x++) { const c = pal[ART[y][x]]; if (c) { ctx.fillStyle = c; ctx.fillRect(bx + x * P, by + y * P, P, P); } }
  }
  // "!" over the player when it bites
  if (fx.phase === 'bite' || fx.phase === 'hooked') {
    const px = sx((v.player.x + 0.5) * TILE), py = sy((v.player.y - 1.6) * TILE);
    const pop = ease.backOut(Math.min(1, (t - (fx.tBite || t)) / 180));
    const w = Math.round(9 * P * pop), h = Math.round(13 * P * pop);
    ctx.fillStyle = C.ink; ctx.fillRect(px - w / 2 - P, py - h - P, w + 2 * P, h + 2 * P);
    ctx.fillStyle = C.white; ctx.fillRect(px - w / 2, py - h, w, h);
    ctx.fillStyle = C.red; ctx.fillRect(px - P, py - h + 2 * P * pop, 2 * P, 6 * P * pop); ctx.fillRect(px - P, py - 3 * P * pop, 2 * P, 2 * P * pop);
    if (fx.phase === 'bite') drawBiteChip(ctx, px, py, z, t, fx);
  }
  // the creature leaps out (shadow silhouette + big splash)
  if (fx.phase === 'leap') {
    const k = Math.min(1, (t - fx.tLeap) / (TIMING.REEL + 300));
    const lx = water.x + (fx.from.x - water.x) * k * 0.5, ly = water.y - Math.sin(Math.PI * k) * 52;
    drawSplash(ctx, sx(water.x), sy(water.y), z, Math.min(1, k * 1.6), 1.6);
    ctx.fillStyle = C.shadow; ctx.beginPath(); ctx.ellipse(sx(lx), sy(ly), 14 * z, 8 * z, (k - 0.5) * 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(sx(lx - 12), sy(ly)); ctx.lineTo(sx(lx - 22), sy(ly - 7)); ctx.lineTo(sx(lx - 22), sy(ly + 7)); ctx.fill();
    ctx.fillStyle = C.white; ctx.fillRect(sx(lx + 7), sy(ly - 3), P, P);
    if (fx.rare) drawSparkles(ctx, sx(lx), sy(ly), z, t, 1.4); // rare catch: gold glints around the leap
  }
  ctx.restore();
}

// Bite prompt chip: pops in (backOut), bobs, sways/tilts, pulses, and shakes harder as the window closes.
// Gold ink-outlined chip with a key-cap icon (white cap, ink rim, red underline) + the prompt words. Min 12px text for phones.
function drawBiteChip(ctx, px, py, z, t, fx) {
  const pr = fx.prompt || { label: fx.touch ? TEXT['fishing.prompt_touch'][0] : TEXT['fishing.prompt_pc'][0].replace('{key}', 'Space'), icon: fx.touch ? 'A' : 'Space' };
  const age = t - (fx.tBite || t), win = fx.touch ? TIMING.WINDOW_TOUCH : TIMING.WINDOW;
  const urgency = Math.min(1, age / win); // 0 at the bite -> 1 when the window shuts
  const pop = ease.backOut(Math.min(1, age / 260));
  const bob = Math.sin(age / 140) * 3 * z;
  const tilt = Math.sin(age / 210) * 0.09;
  const pulse = 1 + 0.07 * ease.sineInOut((age / 300) % 1 < 0.5 ? ((age / 300) % 1) * 2 : 2 - ((age / 300) % 1) * 2);
  const amp = (0.4 + urgency * urgency * 3.2) * z;
  const shx = Math.sin(age / 23) * amp, shy = Math.cos(age / 31) * amp * 0.6;
  const fs = Math.max(12, Math.round(11 * z));
  ctx.save();
  ctx.translate(Math.round(px + shx), Math.round(py + 12 * z + fs + bob + shy));
  ctx.rotate(tilt + Math.sin(age / 37) * 0.04 * urgency);
  ctx.scale(pop * pulse, pop * pulse);
  ctx.font = `bold ${fs}px monospace`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const tw = ctx.measureText(pr.label).width;
  ctx.font = `bold ${Math.round(fs * 0.85)}px monospace`;
  const iw = Math.max(fs * 1.4, ctx.measureText(pr.icon).width + fs * 0.7), ih = fs * 1.45;
  const pad = fs * 0.55, gap = fs * 0.45, w = pad * 2 + iw + gap + tw, h = ih + pad * 1.2, x0 = -w / 2, y0 = -h / 2, o = Math.max(2, Math.round(z));
  // drop shadow, ink outline, gold body, light top band
  ctx.fillStyle = 'rgba(26,18,38,0.35)'; ctx.fillRect(x0 + o * 2, y0 + o * 2, w, h);
  ctx.fillStyle = C.ink; ctx.fillRect(x0 - o, y0 - o, w + 2 * o, h + 2 * o);
  ctx.fillStyle = C.gold; ctx.fillRect(x0, y0, w, h);
  ctx.fillStyle = C.white; ctx.globalAlpha = 0.45; ctx.fillRect(x0, y0, w, Math.max(2, h * 0.18)); ctx.globalAlpha = 1;
  // key cap (presses down on the pulse beat)
  const press = Math.sin(age / 150) > 0.6 ? o : 0;
  const kx = x0 + pad, ky = -ih / 2;
  ctx.fillStyle = C.ink; ctx.fillRect(kx - o, ky - o + press, iw + 2 * o, ih + 2 * o - press);
  ctx.fillStyle = C.red; ctx.fillRect(kx, ky + ih - o * 2, iw, o * 2);
  ctx.fillStyle = C.white; ctx.fillRect(kx, ky + press, iw, ih - o * 2 - press);
  ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.fillText(pr.icon, kx + iw / 2, ky + press + (ih - o * 2) / 2 + 1);
  // words
  ctx.font = `bold ${fs}px monospace`; ctx.textAlign = 'left';
  ctx.fillStyle = C.ink; ctx.fillText(pr.label, kx + iw + gap, 1);
  ctx.restore();
}

function drawSplash(ctx, x, y, z, k, size) {
  const e = ease.quadOut(k);
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (0.1 + 0.8 * (i / 6)), r = (8 + 18 * e) * size * z;
    const dx = Math.cos(a) * r, dy = -Math.sin(a) * r * 1.2 + e * e * 14 * z;
    ctx.fillStyle = i % 2 ? C.foam : C.drop; ctx.globalAlpha = 1 - k;
    const s = Math.max(2, Math.round(3 * z * (1 - k * 0.5)));
    ctx.fillRect(Math.round(x - dx), Math.round(y + dy), s, s); ctx.fillRect(Math.round(x + dx), Math.round(y + dy), s, s);
  }
  ctx.globalAlpha = 1;
}

// Gold four-point glints in a ring (rare catch + rod gift).
function drawSparkles(ctx, x, y, z, t, size = 1) {
  ctx.save();
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4 + t / 700, r = (22 + Math.sin(t / 160 + i) * 6) * z * size, k = 0.5 + 0.5 * Math.sin(t / 110 + i * 1.7);
    const px = Math.round(x + Math.cos(a) * r), py = Math.round(y + Math.sin(a) * r * 0.75), s = Math.max(2, Math.round((2 + k * 3) * z));
    ctx.fillStyle = i % 2 ? C.gold : C.white; ctx.globalAlpha = 0.45 + 0.55 * k;
    ctx.fillRect(px - s, py - 1, s * 2 + 1, Math.max(2, z)); ctx.fillRect(px - 1, py - s, Math.max(2, z), s * 2 + 1);
  }
  ctx.restore();
}

/** Rod gift flourish: the rod spins above the player inside a ring of glints (while the "received" line shows). */
export function drawRodGift(ctx, v, g, player = null) {
  const p = player || v.player; const W = ctx.canvas.width, H = ctx.canvas.height, z = v.zoom || 2, t = now(), age = t - g.t0;
  const cx = p && v.cam ? Math.round(((p.x + 0.5) * TILE - v.cam.x) * z) : W / 2, cy = p && v.cam ? Math.round(((p.y - 0.7) * TILE - v.cam.y) * z) : H / 2;
  const pop = ease.backOut(Math.min(1, age / 380)), bob = Math.sin(age / 180) * 3 * z;
  ctx.save(); ctx.translate(cx, cy + bob); ctx.scale(pop, pop);
  drawSparkles(ctx, 0, 0, z, t, 1.1);
  ctx.rotate(Math.sin(age / 260) * 0.35 - 0.6);
  const len = 26 * z, w = Math.max(3, Math.round(z * 2.5));
  ctx.fillStyle = C.ink; ctx.fillRect(-w / 2 - 1, -len / 2 - 1, w + 2, len + 2);
  ctx.fillStyle = g.kind === 'super' ? C.gold : '#8a5a3a'; ctx.fillRect(-w / 2, -len / 2, w, len);
  ctx.fillStyle = C.red; ctx.fillRect(-w, len * 0.15, w * 2, w * 1.4); // reel
  ctx.restore();
}

/** Bait picker: ink-outlined cream card bottom-right (PC) / full-width bottom (phone). Pops in, the cursor row sways,
 * the selected bait's icon bobs and the count chip pulses. Text min 12px. */
export function drawBaitPicker(ctx, v, pk) {
  const W = ctx.canvas.width, H = ctx.canvas.height, t = now(), age = t - pk.t0, mv = t - pk.tMove;
  const fs = Math.max(13, Math.round(Math.min(W, H) / 30)), rowH = Math.round(fs * 1.9), pad = Math.round(fs * 0.8), o = Math.max(2, Math.round(fs / 7));
  ctx.save();
  ctx.font = `bold ${fs}px monospace`;
  const tw = Math.max(...pk.opts.map((x) => ctx.measureText(x.name).width)) + fs * 7;
  const w = Math.round(Math.min(W - 2 * pad, Math.max(tw, fs * 14))), h = Math.round(rowH * pk.opts.length + fs * 2.6 + pad);
  const x0 = pk.touch ? Math.round((W - w) / 2) : W - w - pad * 2, y0 = H - h - pad * 2 - (pk.touch ? Math.round(H * 0.02) : 0);
  const pop = ease.backOut(Math.min(1, age / 260));
  ctx.translate(x0 + w / 2, y0 + h); ctx.scale(1, pop); ctx.translate(-(x0 + w / 2), -(y0 + h));
  ctx.fillStyle = 'rgba(26,18,38,0.35)'; ctx.fillRect(x0 + o * 2, y0 + o * 2, w, h);
  ctx.fillStyle = C.ink; ctx.fillRect(x0 - o, y0 - o, w + 2 * o, h + 2 * o);
  ctx.fillStyle = C.white; ctx.fillRect(x0, y0, w, h);
  // title tab
  ctx.fillStyle = C.deep; ctx.fillRect(x0, y0, w, Math.round(fs * 1.9));
  ctx.fillStyle = C.white; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.fillText(pk.title, x0 + pad, y0 + fs * 0.95);
  ctx.textAlign = 'right'; ctx.font = `bold ${Math.round(fs * 0.8)}px monospace`; ctx.fillStyle = C.foam;
  ctx.fillText(pk.touch ? 'A pick  B back' : '\u2191\u2193  A pick  B back', x0 + w - pad, y0 + fs * 0.95);
  const top = y0 + Math.round(fs * 2.4);
  pk.opts.forEach((opt, i) => {
    const y = top + i * rowH, sel = i === pk.i, sway = sel ? Math.sin(t / 170) * 2 + (mv < 160 ? (1 - mv / 160) * 6 : 0) : 0;
    if (sel) { ctx.fillStyle = C.gold; ctx.fillRect(x0 + o * 2, y, w - o * 4, rowH - o); ctx.fillStyle = C.ink; ctx.fillRect(x0 + o * 2, y + rowH - o * 2, w - o * 4, o); }
    // little bait icon (code-drawn): grub = segmented, worm = glow, moth = wings, roe = dots, none = empty hook
    const ix = x0 + pad + fs * 0.7 + sway, iy = y + rowH / 2 + (sel ? Math.sin(t / 140) * 2 : 0);
    drawBaitIcon(ctx, opt.id, ix, iy, fs, t);
    ctx.font = `bold ${fs}px monospace`; ctx.textAlign = 'left'; ctx.fillStyle = C.ink;
    ctx.fillText(opt.name, ix + fs * 1.3, y + rowH / 2);
    if (opt.n != null) {
      const label = 'x' + opt.n, cw = ctx.measureText(label).width + fs * 0.8, pul = sel ? 1 + 0.08 * Math.sin(t / 120) : 1;
      ctx.save(); ctx.translate(x0 + w - pad - cw / 2, y + rowH / 2); ctx.scale(pul, pul);
      ctx.fillStyle = C.ink; ctx.fillRect(-cw / 2 - 1, -fs * 0.65 - 1, cw + 2, fs * 1.3 + 2);
      ctx.fillStyle = sel ? C.white : C.line; ctx.fillRect(-cw / 2, -fs * 0.65, cw, fs * 1.3);
      ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.fillText(label, 0, 1); ctx.restore();
    }
  });
  ctx.restore();
}
const BAIT_COL = { ripple_grub: '#c98a5a', reed_nymph: '#6aa84f', brine_fleck: '#e8a0a0', glimmer_worm: '#fcd668', deepgut_paste: '#6a4a5a', lantern_moth: '#f4e2a8', hollowstar_roe: '#e86a5a' };
function drawBaitIcon(ctx, id, x, y, fs, t) {
  const u = Math.max(2, Math.round(fs / 6)), c = BAIT_COL[id];
  ctx.save(); ctx.fillStyle = C.ink;
  if (!id) { ctx.strokeStyle = C.ink; ctx.lineWidth = u; ctx.beginPath(); ctx.arc(x, y, u * 2, 0, Math.PI); ctx.moveTo(x + u * 2, y); ctx.lineTo(x + u * 2, y - u * 3); ctx.stroke(); ctx.restore(); return; }
  if (id === 'lantern_moth') { const f = Math.abs(Math.sin(t / 90)); ctx.fillRect(x - u * 3, y - u * 2, u * 6, u * 4); ctx.fillStyle = c; ctx.fillRect(x - u * 3 + 1, y - u * 2 * f + 1, u * 2.5, u * 3 * f); ctx.fillRect(x + u * 0.5, y - u * 2 * f + 1, u * 2.5, u * 3 * f); }
  else if (id === 'hollowstar_roe') { for (const [dx, dy] of [[-1.5, 0], [1.5, 0], [0, -1.5], [0, 1.5]]) { ctx.fillStyle = C.ink; ctx.fillRect(x + dx * u - u, y + dy * u - u, u * 2 + 2, u * 2 + 2); ctx.fillStyle = c; ctx.fillRect(x + dx * u - u + 1, y + dy * u - u + 1, u * 2, u * 2); } }
  else { for (let i = 0; i < 4; i++) { const yy = y + Math.sin(t / 150 + i) * u * 0.6; ctx.fillStyle = C.ink; ctx.fillRect(x - u * 3 + i * u * 1.5 - 1, yy - u - 1, u * 1.5 + 2, u * 2 + 2); ctx.fillStyle = c; ctx.fillRect(x - u * 3 + i * u * 1.5, yy - u, u * 1.5, u * 2); }
    if (id === 'glimmer_worm') { ctx.fillStyle = C.white; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t / 100); ctx.fillRect(x + u * 2.5, y - u * 2, u, u); } }
  ctx.restore();
}

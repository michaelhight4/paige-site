// Puzzle tells + hint keys (puzzle_hints_audit.md, Gary approved Oct 30 2026; Coder). Static, no animation needed, so they
// show on the public build too (hall_anim stays dev-only). Everything is read from live map state, so this file never needs
// the hall_v2 internals: gate open = collision 0, plate state = its ground tile, field puzzles = scene.systems.puzzles.
//  - push tiles / belts '^v<>': arrows;  warp pads / springs '1'-'6': matching glyph + colour per pair
//  - ice 'i': solid cells touching ice get a high-contrast stop-pillar frame
//  - plates T/U and gates a/b (bit 0) and c/d (bit 1) share a channel colour; each gate has lamps (one per plate on its
//    channel; lit while open). Field runtimes: plates/crystals/gates share their channel colour, gate lamps count ON switches.
//  - invisible walls 'x' shimmer when bumped; crystals ripple to the crystals they flip; a gate that opens away from the
//    player gets a short camera pan (scene.camFocus, the heal close-up hook).
//  - thick_brush / cracked_rock get their own outline (leaf hatch / crack lines).
//  - Hint text: data/textbot_puzzle_hints.json (Text Bot) and its copy merged into text/overworld_lines.json
//    (tools/merge_puzzle_hints.py). Keys system_halls.hint_<zone>.pages (rule, first ask), .pages_again (place, second ask),
//    .pages_3 (optional extra rule, third+ ask), system_halls.reset_note (shared reset line, also a door toast once per hall).
//    Missing keys fall back to the DRAFT placeholders below. Field signs: A on a plate / gate / boulder (FIELD_SIGNS).
import { TILE } from '../overworld/constants.js?v=v0.2.97-alpha';
import { PuzzleRuntime } from '../systems/puzzles.js?v=v0.2.97-alpha';
import { HALL_HINTS } from './hall_v2.js?v=v0.2.97-alpha';

export const HINTS_URL = 'data/textbot_puzzle_hints.json';
/** DRAFT placeholders (Text Bot to replace through data/textbot_puzzle_hints.json). Rules only, never the answer. */
export const RULE_FALLBACK = {
  fernwick: ['Floor plates open gates. Step on one, then look for what moved.'],
  saltmere: ['Each plate swaps which gate is open. A second plate swaps it back.'],
  revival_heights: ['Turn the crystals to carry the light. Hidden walls show when you touch them.'],
  mirefen: ['Arrow tiles carry you the way they point. Try the one by the door first.'],
  frostspire: ['Ice keeps you sliding until something stops you. Look for the marked pillars.'],
  tidewater_coast: ['Shell plates turn the tide. A plate and its gate share a colour.'],
  cindervale: ['Belts carry you the way they point. Springs with the same mark send you to each other.'],
  lanternport: ['Each floor has its own trick. Hidden walls glow when touched, and pads with the same mark are linked.'],
};
export const RESET_FALLBACK = ['Step back out the door and the hall sets itself back to the start.'];
export const CHANNEL = ['#ffb347', '#5ec8ff', '#b78cff', '#7be08a'];
export const PAIR = { 1: ['#ff6b6b', '●'], 2: ['#5ec8ff', '◆'], 3: ['#ffd34a', '★'], 4: ['#7be08a', '▲'], 5: ['#ff9de2', '■'], 6: ['#ffffff', '✚'] };
const ARROW = { '^': 'U', v: 'D', '<': 'L', '>': 'R' };
const D4 = [[0, -1], [1, 0], [0, 1], [-1, 0]];

/** Pure: rule-first hall hint pages. asks = times the attendant was asked before (0 = first). */
export function hintPages(zone, asks, entry = null, reset = null) {
  const pg = (v) => (Array.isArray(v) ? v : v?.pages) || null;
  const rule = entry?.pages || RULE_FALLBACK[zone] || [];
  const again = entry?.pages_again || HALL_HINTS[zone] || rule;
  const tier = asks <= 0 ? rule : asks === 1 || !entry?.pages_3 ? again : entry.pages_3;
  return [...tier, ...(pg(reset) || RESET_FALLBACK)];
}

/** Field signs (Text Bot ids -> real runtime ids): A on one of these cells reads maps.<map>.<key>. */
export const FIELD_SIGNS = {
  greystone_b1: [{ key: 'plate_plaque', ids: ['p1'] }],
  r9_cloudline: [{ key: 'gate_cairn', ids: ['g1', 'g2'] }],
  r9_echo_cave: [{ key: 'wall_carving', ids: ['g1', 'g2'] }],
  r9_heart_cave: [{ key: 'reset_rule', ids: ['g3', 'g4'] }],
};

/** Pure: static tells for a hall_v2 grid -> [{x,y,k,...}]. bits optional (gate lamps lit state comes from collision live). */
export function hallTells(grid) {
  const out = [], at = (x, y) => grid[y]?.[x] ?? '#';
  const plates = { 0: 0, 1: 0 };
  for (const r of grid) for (const c of r) { if (c === 'T') plates[0]++; if (c === 'U') plates[1]++; }
  grid.forEach((row, y) => [...row].forEach((c, x) => {
    if (ARROW[c]) out.push({ x, y, k: 'arrow', dir: ARROW[c] });
    else if (/[1-6]/.test(c)) out.push({ x, y, k: 'pair', id: c, color: PAIR[c][0], glyph: PAIR[c][1] });
    else if (c === 'T' || c === 'U') out.push({ x, y, k: 'plate', color: CHANNEL[c === 'T' ? 0 : 1] });
    else if ('abcd'.includes(c)) { const ch = 'ab'.includes(c) ? 0 : 1; out.push({ x, y, k: 'gate', color: CHANNEL[ch], lamps: Math.max(1, plates[ch]) }); }
    else if ((c === '#') && x > 0 && y > 0 && y < grid.length - 1 && x < row.length - 1 && D4.some(([dx, dy]) => at(x + dx, y + dy) === 'i')) out.push({ x, y, k: 'pillar' });
  }));
  return out;
}

/** Pure: tells for a field puzzle runtime def + on-set. Gate lamps = switches on its channel, lit = how many are ON. */
export function fieldTells(def, isOn) {
  const out = [], chans = Object.keys(def.channels || {});
  const ci = (c) => CHANNEL[Math.max(0, chans.indexOf([].concat(c)[0])) % CHANNEL.length];
  for (const s of def.switches || []) out.push({ x: s.x, y: s.y, k: s.type === 'crystal' ? 'crystal' : 'plate', color: ci(s.channel) });
  for (const g of def.gates || []) {
    const sw = (def.switches || []).filter((s) => [].concat(g.channel).includes(s.channel));
    out.push({ x: g.x, y: g.y, k: 'gate', color: ci(g.channel), lamps: Math.max(1, sw.length), lit: sw.filter((s) => isOn(s.id)).length });
  }
  return out;
}

/** Wire tells, bump shimmer, crystal ripple, gate pan and rule-first hints into the scene. Attach after attachHallV2. */
export function attachPuzzleTells(scene) {
  const T = { fx: [], hints: null, asks: {}, gates: null, map: null, panUntil: 0 };
  scene.puzzleTells = T;
  const now = () => scene.ms ?? (globalThis.performance?.now?.() || Date.now());
  try { if (typeof fetch === 'function' && globalThis.location) fetch(new URL(HINTS_URL, globalThis.location.href), { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((j) => { T.hints = j; }, () => {}); } catch { /* placeholders */ }
  T.text = (key, fb) => { const v = key.split('.').reduce((o, k) => o?.[k], T.hints); return v?.pages || (Array.isArray(v) ? v : null) || fb; };
  const lineAt = (key) => { const v = key.split('.').reduce((o, k) => o?.[k], scene.lines); return v?.pages || (Array.isArray(v) ? v : null); };
  T.entry = (k) => T.hints?.system_halls?.[k] || scene.lines?.system_halls?.[k] || null;
  T.resetNote = () => T.text('system_halls.reset_note', lineAt('system_halls.reset_note') || RESET_FALLBACK); // the shared reset line hook
  T.seenReset = new Set();
  const hv2 = () => scene.map?.json?.hall_v2 || null;

  // invisible wall shimmer on bump
  if (typeof scene.worldApi === 'function') {
    const wa = scene.worldApi.bind(scene);
    scene.worldApi = () => {
      const w = wa(), ob = w.onBump;
      w.onBump = (x, y, dir, mover, q) => {
        const h = hv2(), p = scene.player, d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
        if (h && p && d && (!mover || mover === p)) { const tx = p.x + d[0], ty = p.y + d[1]; if (h.grid[ty]?.[tx] === 'x') T.fx.push({ k: 'shimmer', x: tx, y: ty, t0: now(), dur: 700 }); }
        return ob?.(x, y, dir, mover, q);
      };
      return w;
    };
  }
  // crystal ripple (field runtimes): patched once on the prototype, routed to the scene that owns the map
  if (!PuzzleRuntime.prototype._tellsPatched) {
    const touch = PuzzleRuntime.prototype.touch;
    PuzzleRuntime.prototype.touch = function (x, y) {
      const r = touch.call(this, x, y), s = r && this.switchAt(x, y, 'crystal');
      if (s) globalThis.__kilumenTells?.ripple(s, (s.toggles || [s.id]).map((id) => this.sw.get(id)).filter(Boolean));
      return r;
    };
    PuzzleRuntime.prototype._tellsPatched = true;
  }
  globalThis.__kilumenTells = { ripple: (s, ns) => { const t0 = now(); T.fx.push({ k: 'ripple', x: s.x, y: s.y, t0, dur: 600 }); for (const n of ns) if (n !== s) T.fx.push({ k: 'ripple', x: n.x, y: n.y, t0: t0 + 150, dur: 600, from: [s.x, s.y] }); } };

  // rule-first attendant hints: hall_v2 reads system_halls.hint_<zone> synchronously, so swap it in for this one talk
  if (typeof scene.talk === 'function') {
    const talk = scene.talk.bind(scene);
    scene.talk = (n, def) => {
      const h = hv2(); if (!h || def?.kind !== 'villager_scholar' || !scene.lines) return talk(n, def);
      const sh = (scene.lines.system_halls ||= {}), k = `hint_${h.zone}`, had = Object.prototype.hasOwnProperty.call(sh, k), old = sh[k];
      const asks = T.asks[h.zone] || 0;
      sh[k] = { pages: hintPages(h.zone, asks, T.hints?.system_halls?.[k] || (old && !Array.isArray(old) ? old : null), T.resetNote()) };
      T.asks[h.zone] = asks + 1;
      try { return talk(n, def); } finally { if (had) sh[k] = old; else delete sh[k]; }
    };
  }

  // field signs: A facing a plate / gate / boulder with a Text Bot line
  if (typeof scene.interact === 'function') {
    const interact = scene.interact.bind(scene);
    scene.interact = (...a) => {
      const p = scene.player, m = scene.map, d = p && { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[p.facing];
      if (!scene.busy && d && m && scene.say) {
        const fx = p.x + d[0], fy = p.y + d[1], rt = scene.systems?.puzzles?.get?.(m.name), def = rt?.def;
        let key = null;
        if (def) for (const f of FIELD_SIGNS[m.name] || []) if ([...(def.switches || []), ...(def.gates || [])].some((e) => f.ids.includes(e.id) && e.x === fx && e.y === fy)) key = `maps.${m.name}.${f.key}`;
        if (!key && m._byId?.get(m.tile('decoration', fx, fy))?.name === 'push_boulder') key = 'field.boulder.inspect';
        const pages = key && (T.text(key, null) || lineAt(key));
        if (pages?.length) { const run = () => scene.say(pages); if (scene.script) scene.script(run); else run(); return; }
      }
      return interact(...a);
    };
  }

  /** Per frame: static tells for this map + live state, newly opened gates -> pan. -> draw ops */
  T.compute = () => {
    const m = scene.map; if (!m) return [];
    if (T.map !== m) { T.map = m; T.gates = null; T.fx = []; T.static = m.json?.hall_v2?.grid ? hallTells(m.json.hall_v2.grid) : []; T.brush = null;
      const z = m.json?.hall_v2?.zone; // shared reset line as a door toast, once per hall per session (after the entry toast)
      if (z && !T.seenReset.has(z)) { T.seenReset.add(z); setTimeout(() => { if (scene.map === m) scene.toast?.(T.resetNote().join(' ').replace(/\n/g, ' ')); }, 3500); } }
    const ops = T.static.slice(), col = m.layers?.collision;
    for (const o of ops) if (o.k === 'gate') o.open = col?.[o.y]?.[o.x] === 0, o.lit = o.open ? o.lamps : 0;
    const rt = scene.systems?.puzzles?.get?.(m.name);
    if (rt?.def) ops.push(...fieldTells(rt.def, (id) => rt.isOn(id)).map((o) => (o.k === 'gate' ? { ...o, open: col?.[o.y]?.[o.x] === 0 } : o)));
    if (!T.brush) { T.brush = []; const by = m._byId; if (by) for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) for (const L of ['decoration', 'ground']) { const nm = by.get(m.tile(L, x, y))?.name; if (nm === 'thick_brush' || nm === 'cracked_rock') { T.brush.push({ x, y, k: nm === 'thick_brush' ? 'brush' : 'crack' }); break; } } }
    for (const b of T.brush) { const by = m._byId, nm = by?.get(m.tile('decoration', b.x, b.y))?.name || by?.get(m.tile('ground', b.x, b.y))?.name; if (nm === 'thick_brush' || nm === 'cracked_rock') ops.push(b); }
    // gate pan
    const gs = ops.filter((o) => o.k === 'gate'), key = gs.map((g) => (g.open ? 1 : 0)).join('');
    if (T.gates != null && key !== T.gates) {
      const p = scene.player, prev = T.gates;
      const g = gs.find((g, i) => g.open && prev[i] === '0' && p && Math.abs(g.x - p.x) + Math.abs(g.y - p.y) > 4);
      if (g && !scene.camFocus) { scene.camFocus = { x: g.x * TILE + TILE / 2, y: g.y * TILE + TILE / 2 }; T.panUntil = now() + 900; T.fx.push({ k: 'flash', x: g.x, y: g.y, t0: now(), dur: 900 }); scene.log?.push?.({ tick: scene.tick, type: 'tell_gate_pan', at: [g.x, g.y] }); }
    }
    T.gates = key;
    if (T.panUntil && now() > T.panUntil) { T.panUntil = 0; scene.camFocus = null; }
    const t = now(); T.fx = T.fx.filter((f) => t < f.t0 + f.dur);
    return ops;
  };
  T.draw = (ctx, v) => drawTells(ctx, v, T.compute(), T.fx, now());
  return T;
}

/** Canvas primitives only (no tiles, no animation required; fx fade with time). */
export function drawTells(ctx, v, ops, fx = [], t = 0) {
  const z = v.zoom, S = TILE * z, sx = (x) => (x * TILE - v.cam.x) * z, sy = (y) => (y * TILE - v.cam.y) * z;
  ctx.save();
  ctx.lineWidth = Math.max(1, z);
  for (const o of ops) {
    const X = sx(o.x), Y = sy(o.y), cx = X + S / 2, cy = Y + S / 2;
    if (X < -S || Y < -S || X > ctx.canvas.width || Y > ctx.canvas.height) continue;
    if (o.k === 'arrow') {
      const a = { U: -Math.PI / 2, R: 0, D: Math.PI / 2, L: Math.PI }[o.dir], r = S * 0.3;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a); ctx.globalAlpha = 0.85; ctx.fillStyle = '#fff6c8'; ctx.strokeStyle = '#3a2a10';
      ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(-r * 0.6, -r * 0.75); ctx.lineTo(-r * 0.2, 0); ctx.lineTo(-r * 0.6, r * 0.75); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    } else if (o.k === 'pair') {
      ctx.globalAlpha = 0.9; ctx.strokeStyle = o.color; ctx.lineWidth = Math.max(1, z * 1.5); ctx.strokeRect(X + z * 2, Y + z * 2, S - z * 4, S - z * 4);
      ctx.fillStyle = o.color; ctx.font = `bold ${Math.round(S * 0.45)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o.glyph, cx, cy + z);
      ctx.lineWidth = Math.max(1, z);
    } else if (o.k === 'plate' || o.k === 'crystal') {
      ctx.globalAlpha = 0.9; ctx.strokeStyle = o.color; ctx.lineWidth = Math.max(1, z * 1.5);
      ctx.beginPath(); ctx.arc(cx, cy, S * 0.42, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = Math.max(1, z);
    } else if (o.k === 'gate') {
      ctx.globalAlpha = 0.9; ctx.strokeStyle = o.color; ctx.lineWidth = Math.max(1, z * 1.5); ctx.strokeRect(X + z, Y + z, S - z * 2, S - z * 2); ctx.lineWidth = Math.max(1, z);
      const n = Math.min(6, o.lamps || 1), r = Math.max(1.5, z * 1.5), gap = S / (n + 1);
      for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.arc(X + gap * (i + 1), Y + r + z, r, 0, Math.PI * 2); ctx.fillStyle = i < (o.lit || 0) ? '#ffe36b' : '#3a3440'; ctx.fill(); ctx.strokeStyle = '#000'; ctx.stroke(); }
    } else if (o.k === 'pillar') { // stop-pillar tell: frost corner brackets in the art's own palette (Director art QA Oct 30: the full red frame read as a debug outline)
      // v2 (Director #17/#18 follow-up): no outline at all (corner brackets still read as tile seams on wall rows): a small frost glint
      const r = Math.max(1, Math.round(z * 1.5)), cx = Math.round(X + S / 2), cy = Math.round(Y + S * 0.22);
      ctx.globalAlpha = 0.9; ctx.fillStyle = '#cfeeff'; ctx.fillRect(cx - r * 2, cy - Math.floor(r / 2), r * 4, r); ctx.fillRect(cx - Math.floor(r / 2), cy - r * 2, r, r * 4);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - Math.floor(r / 2), cy - Math.floor(r / 2), r, r);
    } else if (o.k === 'brush') {
      ctx.globalAlpha = 0.8; ctx.strokeStyle = '#d6ff7a';
      for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(X + (S * i) / 4, Y + S * 0.15); ctx.lineTo(X + (S * i) / 4 - S * 0.12, Y + S * 0.5); ctx.lineTo(X + (S * i) / 4, Y + S * 0.85); ctx.stroke(); }
    } else if (o.k === 'crack') {
      ctx.globalAlpha = 0.9; ctx.strokeStyle = '#1a1208'; ctx.lineWidth = Math.max(1, z * 1.25);
      ctx.beginPath(); ctx.moveTo(X + S * 0.2, Y + S * 0.2); ctx.lineTo(X + S * 0.45, Y + S * 0.45); ctx.lineTo(X + S * 0.35, Y + S * 0.7); ctx.moveTo(X + S * 0.45, Y + S * 0.45); ctx.lineTo(X + S * 0.8, Y + S * 0.55); ctx.stroke(); ctx.lineWidth = Math.max(1, z);
    }
  }
  for (const f of fx) {
    const k = Math.max(0, Math.min(1, (t - f.t0) / f.dur)); if (t < f.t0) continue;
    const X = sx(f.x), Y = sy(f.y), cx = X + S / 2, cy = Y + S / 2;
    if (f.k === 'shimmer') { ctx.globalAlpha = 0.7 * (1 - k); ctx.fillStyle = '#cfe9ff'; ctx.fillRect(X, Y, S, S); ctx.strokeStyle = '#ffffff'; ctx.strokeRect(X + z, Y + z, S - 2 * z, S - 2 * z); }
    else if (f.k === 'ripple') { ctx.globalAlpha = 0.8 * (1 - k); ctx.strokeStyle = '#bfe8ff'; ctx.lineWidth = Math.max(1, z * 1.5); ctx.beginPath(); ctx.arc(cx, cy, S * (0.3 + k * 0.6), 0, Math.PI * 2); ctx.stroke();
      if (f.from) { ctx.beginPath(); ctx.moveTo(sx(f.from[0]) + S / 2, sy(f.from[1]) + S / 2); ctx.lineTo(cx, cy); ctx.stroke(); } ctx.lineWidth = Math.max(1, z); }
    else if (f.k === 'flash') { ctx.globalAlpha = 0.5 * (1 - k); ctx.fillStyle = '#ffe36b'; ctx.fillRect(X, Y, S, S); }
  }
  ctx.restore();
}

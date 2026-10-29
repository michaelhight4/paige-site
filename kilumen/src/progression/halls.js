// Hall interiors 2-8 wiring (Coder, Oct 23, 2026). Pure helpers; scene wiring is in ./index.js.
// - text: hall NPCs read through the normal lookup (maps.<hall_map>.<id>, then the def's text_ref), then Text Bot's draft
//   key paths once merged (masters.<zone>, trainers.hall_<zone>.h<N>). Nothing found -> a clean fallback built from
//   existing lines (system_trainers.battle_start), so the hall is playable before Text Bot merges.
// - Text Bot merged maps.<hall>.<hall>_master in v0.4.11: battle_won, coin_handover, gift, skill_learned, after_storm and
//   horn are wired through masterEntry(); Ron 2-6 `opener` links through withOpener().
// - coin: a Master's coin_handover pages follow its battle_lost pages; without them the existing placeholder toast is used.
// - Mirefen darkness: def.darkness (data/hall_puzzles/mirefen.json, World Design spec
//   art/world/overworld/qa/autotile_port/integ/mirefen_hall_darkness.json). Light falloff = nightfx pool().
import { getPath, fillText, pickLine } from '../overworld/lines.js?v=v0.2.75-alpha';
import { hallNpc } from './masters.js?v=v0.2.75-alpha';
import { pool } from '../overworld/nightfx.js?v=v0.2.75-alpha';

/** Draft key path Text Bot uses for a hall NPC (halls_<zone>.md). */
export function draftPath(info) {
  if (!info) return null;
  if (info.role === 'master') return `masters.${info.hall.zone}`;
  if (info.role === 'trainer') return `trainers.hall_${info.hall.zone}.h${info.index + 1}`;
  return null;
}

/** Master text keys Text Bot merged (overworld_lines v0.4.11): played in this order after a win. */
export const MASTER_WIN_KEYS = ['coin_handover', 'gift', 'skill_learned', 'horn'];
export const STORM_FLAG = 'storm_season';

/** A Master entry with all six keys wired: battle_lost + coin_handover + gift + skill_learned + horn on a win
 *  (skill_learned waits for after_storm when the Master teaches after the storm, i.e. Mirefen/Tideglide);
 *  battle_won on a loss (engine: missing -> nothing said); after_storm
 *  (+ skill_learned) replaces `after` once storm_season is set. Missing keys are skipped, never shown empty. */
export function masterEntry(e, flags = new Set(), fallbackWon = null) {
  const stormSkill = !!e.after_storm?.length;
  const win = [...(e.battle_lost || [])];
  for (const k of MASTER_WIN_KEYS) {
    if (k === 'skill_learned' && stormSkill) continue;
    if (Array.isArray(e[k]) && e[k].length) win.push(...e[k]);
  }
  const out = { ...e, battle_lost: win, _coinLine: !!e.coin_handover?.length };
  if (!e.battle_won?.length && fallbackWon) out.battle_won = fallbackWon;
  if (stormSkill && flags.has(STORM_FLAG)) out.after = [...e.after_storm, ...(e.skill_learned || [])];
  return out;
}

/** Lines entry for a hall 2-8 NPC, or null (not a hall NPC / Fernwick: the live lookup stays as is).
 *  base = the entry the normal lookup found (maps.<map>.<id> / text_ref) or null. */
export function hallEntry(lines, data, map, def, base = null, flags = new Set()) {
  const info = data && def && hallNpc(data, map, def.id);
  if (!info || info.hall.zone === 'fernwick') return null;
  const dp = draftPath(info);
  const e = base || (dp && getPath(lines, dp)) || null;
  if (e) {
    if (info.role !== 'master') return e;
    return masterEntry(e, flags); // no battle_won -> the engine says nothing (no invented text; Text Bot owns lines)
  }
  if (info.role === 'guide') return { pages: [], _fallback: true };
  const name = info.who?.name_placeholder && !/^TBD/.test(info.who.name_placeholder) ? info.who.name_placeholder : 'The trainer';
  const start = getPath(lines, 'system_trainers.battle_start.pages') || [];
  return { pages: start.map((t) => fillText(t, { trainer: name })), battle_lost: [], _fallback: true };
}

/** Ron battles 2-6: the spot's pages are his intro_2 on the spot; `opener: "ron_battle_openers.<id>"` plays first.
 *  Returns the entry with the opener pages prepended to every line (unknown/missing opener -> entry unchanged). */
export function withOpener(lines, e, flags = new Set(), env = {}) {
  if (!e || typeof e.opener !== 'string' || e._openerDone) return e;
  const src = getPath(lines, e.opener);
  const op = Array.isArray(src) ? pickLine({ lines: src }, flags, env)?.pages : src?.pages;
  if (!op?.length) return e;
  const pre = (l) => ({ ...l, pages: [...op, ...(l.pages || [])] });
  return { ...e, pages: [...op, ...(e.pages || [])], lines: Array.isArray(e.lines) ? e.lines.map(pre) : e.lines, _openerDone: true };
}

/** Multi-line afters: `after_2` (Text Bot v0.4.11, e.g. lanternport_ron_5) plays straight after `after`, same box sequence. */
export function chainAfter(e) {
  if (!e || !Array.isArray(e.after_2) || !e.after_2.length || e._after2Done) return e;
  return { ...e, after: [...(e.after || []), ...e.after_2], _after2Done: true };
}

// ---- Mirefen darkness --------------------------------------------------------------------------------------------
/** Grid cell of a lamp (spec lamps are hall-map cells; grid = map - map_origin). */
export function lampCell(def, id) {
  const d = def.darkness, m = d?.lamps?.[id]; if (!m) return null;
  const [ox, oy] = d.map_origin || [0, 0];
  return [m[0] - ox, m[1] - oy];
}
/** Lamps lit so far (boardwalk state p counts correct lamps in def.order). */
export const litLamps = (def, st) => def.order.slice(0, Math.min(st?.p || 0, def.order.length));
/** Light 0..1 at a grid cell: lit lamp circles + a small circle round the player; full light once every lamp is lit. */
export function lightAt(def, st, x, y, px = null, py = null) {
  const d = def.darkness; if (!d) return 1;
  if ((st?.p || 0) >= def.order.length) return 1;
  let v = 0;
  for (const id of litLamps(def, st)) { const c = lampCell(def, id); if (c) v = Math.max(v, pool(Math.hypot(x - c[0], y - c[1]), d.radius || 2.5)); }
  if (px != null) v = Math.max(v, pool(Math.hypot(x - px, y - py), d.player_radius || 1.5));
  return v;
}

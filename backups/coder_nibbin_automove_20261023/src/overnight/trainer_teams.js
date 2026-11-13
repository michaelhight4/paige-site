// Batch 3 wiring (Oct 23 2026, Coder): battle teams for World Design's route / town / rival trainers on the overnight maps.
// Hall trainers + Masters keep their teams from data/masters.json (src/progression/masters.js teamFor). Everyone else with
// a `team` on the map NPC def (array, or Ron's object keyed if_player_took_<starter>) fights that team. A species that is
// not registered in SPECIES (not drawn / not synced yet, or excluded) uses the stand-in from
// data/standins_overnight.json trainer_species (written by tools/sync_creatures.mjs), else the nearest registered species.
import { SPECIES } from '../ui/data.js';

export const STARTERS = ['tumbloam', 'cindrip', 'rillop'];
const known = (id) => SPECIES.some((s) => s.id === id);

/** The player's starter (tumbloam / cindrip / rillop) from party + archive: origin.how 'starter', matched by evolution line. */
export function playerStarter(creatures = []) {
  const lineOf = (id) => SPECIES.find((s) => s.id === id)?.line;
  const byLine = new Map(STARTERS.map((s) => [lineOf(s), s]));
  const list = creatures.filter(Boolean);
  for (const c of [...list.filter((c) => c.origin?.how === 'starter'), ...list]) {
    if (STARTERS.includes(c.species)) return c.species;
    const l = lineOf(c.species);
    if (c.origin?.how === 'starter' && byLine.has(l)) return byLine.get(l);
  }
  return null;
}

/** Map species -> registered species: itself, else stand-in table, else fallback. */
export function resolveSpecies(id, standIns = {}, fallback = 'sailquill') {
  if (known(id)) return id;
  const s = standIns?.[id];
  if (s && known(s)) return s;
  return known(fallback) ? fallback : SPECIES[0].id;
}

/** Team rows for a map NPC def ([{species, level}]) or null. Ron: pick the branch for the player's starter. */
export function rawTeam(def, starter = null) {
  const t = def?.team;
  if (Array.isArray(t)) return t.length ? t : null;
  if (t && typeof t === 'object') {
    const keys = Object.keys(t); if (!keys.length) return null;
    const k = (starter && keys.find((x) => x === 'if_player_took_' + starter)) || keys[0];
    return t[k] || null;
  }
  return null;
}

/** {foes, foeName, fromMap:true} for a map NPC def, or null when it has no team. */
export function mapTeamFor(def, { starter = null, standIns = {}, name = null } = {}) {
  const rows = rawTeam(def, starter); if (!rows) return null;
  const foes = rows.filter((r) => r?.species).map((r) => ({ species: resolveSpecies(r.species, standIns), level: Math.max(1, r.level | 0 || 5), ...(known(r.species) ? {} : { standInFor: r.species }) }));
  return foes.length ? { foes, foeName: name || def.name || trainerName(def), fromMap: true } : null;
}

/** Display name for a map trainer: Ron for the rival, else the GD class ("harbour_hand" -> "Harbour hand"). */
export function trainerName(def) {
  if (def?.kind === 'rival' || def?.gd_class === 'ron') return 'Ron';
  const c = String(def?.gd_class || '').replace(/_/g, ' ').trim();
  return c ? c[0].toUpperCase() + c.slice(1) : 'Trainer';
}

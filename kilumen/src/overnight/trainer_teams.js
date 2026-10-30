// Batch 3 wiring (Oct 23 2026, Coder): battle teams for World Design's route / town / rival trainers on the overnight maps.
// Hall trainers + Masters keep their teams from data/masters.json (src/progression/masters.js teamFor). Everyone else with
// a `team` on the map NPC def (array, or Ron's object keyed if_player_took_<starter>) fights that team. A species that is
// not registered in SPECIES (not drawn / not synced yet, or excluded) uses the stand-in from
// data/standins_overnight.json trainer_species (written by tools/sync_creatures.mjs), else the nearest registered species.
// Nibbin swap (Oct 23 2026): the map JSON Ron teams were authored with Tumbloam as the earth starter. Keys: a Nibbin player
// reads if_player_took_nibbin, else the old if_player_took_tumbloam branch (same counter: Ron takes the fire line). Ron's
// earth picks (tumbloam / burrowmane / bastonox, rillop branch) are remapped to Nibbin's line (starters.js EARTH_SWAP) so
// the rival always fields the player's missing starter line; ordinary trainers keep their species.
import { SPECIES } from '../ui/data.js?v=v0.2.91-alpha';
import { STARTERS, ALL_STARTERS, EARTH_SWAP, partyStarter, starterKeys } from '../battle/data/starters.js?v=v0.2.91-alpha';

export { STARTERS };
const known = (id) => SPECIES.some((s) => s.id === id);

/** The player's starter (nibbin / cindrip / rillop, or legacy tumbloam) from party + archive: origin.how 'starter', matched by line. */
export function playerStarter(creatures = []) {
  const direct = partyStarter(creatures); if (direct) return direct;
  const lineOf = (id) => SPECIES.find((s) => s.id === id)?.line;
  const byLine = new Map(ALL_STARTERS.map((s) => [lineOf(s), s]));
  const list = creatures.filter(Boolean);
  for (const c of [...list.filter((c) => c.origin?.how === 'starter'), ...list]) {
    if (ALL_STARTERS.includes(c.species)) return c.species;
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
    const k = starterKeys(starter).map((x) => 'if_player_took_' + x).find((x) => keys.includes(x)) || keys[0];
    return t[k] || null;
  }
  return null;
}

/** {foes, foeName, fromMap:true} for a map NPC def, or null when it has no team. */
export function mapTeamFor(def, { starter = null, standIns = {}, name = null } = {}) {
  let rows = rawTeam(def, starter); if (!rows) return null;
  if (isRival(def)) rows = rows.map((r) => (r && EARTH_SWAP[r.species] ? { ...r, species: EARTH_SWAP[r.species] } : r));
  const foes = rows.filter((r) => r?.species).map((r) => ({ species: resolveSpecies(r.species, standIns), level: Math.max(1, r.level | 0 || 5), ...(r.held ? { held: r.held } : {}), ...(Array.isArray(r.skills) ? { skills: [...r.skills] } : {}), ...(known(r.species) ? {} : { standInFor: r.species }) }));
  return foes.length ? { foes, foeName: name || def.name || trainerName(def), fromMap: true } : null;
}

const isRival = (def) => def?.kind === 'rival' || def?.gd_class === 'ron';

/** Display name for a map trainer: Ron for the rival, else the GD class ("harbour_hand" -> "Harbour hand"). */
export function trainerName(def) {
  if (def?.kind === 'rival' || def?.gd_class === 'ron') return 'Ron';
  const c = String(def?.gd_class || '').replace(/_/g, ' ').trim();
  return c ? c[0].toUpperCase() + c.slice(1) : 'Trainer';
}

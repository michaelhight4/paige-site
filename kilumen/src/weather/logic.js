// Weather v1: pure rules (no DOM; Node-testable). Coder, Oct 29 2026. Gary: "make the snow effect a little more
// noticable and we still need dynamic rain that can affect chances of fishing rates and what kilu are in the grass".
// Area types (Gary, Oct 29): temperate = clear | fog | rain_light | rain_heavy | storm; swamp = same set, foggier and
// wetter; snowy = snow_light | ice_fog | blizzard (rain never falls in snow areas). Weather is rolled per area type per
// 3-game-hour block from a seeded hash, then eased in/out over ~2 game hours of real play (see fx.js).
// Free-code check: canvas weather libraries (weather-canvas, sparkle, let-it-go, minimal-snow; all MIT) each own their
// own canvas + rAF loop; Kilumen draws inside renderer's living-world top pass, so a small pooled layer was written here.
export const KINDS = Object.freeze(['clear', 'fog', 'rain_light', 'rain_heavy', 'storm', 'snow_light', 'ice_fog', 'blizzard']);
export const RAINY = new Set(['rain_light', 'rain_heavy', 'storm']);
export const FOGGY = new Set(['fog', 'ice_fog']);
export const BLOCK_H = 3; // weather can change every 3 game hours

export const SNOWY_MAPS = new Set(['frostspire', 'frostspire_pass']);
export const SWAMP_MAPS = new Set(['mirefen', 'mirefen_bog', 'route_saltmere_mirefen', 'route_sunmeadow_mirefen']);
/** Area type for a map name -> 'snowy' | 'swamp' | 'temperate'. Indoor / cave checks are the caller's (outdoor flag). */
export const areaType = (map) => { const b = String(map || '').replace(/_storm$/, ''); return SNOWY_MAPS.has(b) ? 'snowy' : SWAMP_MAPS.has(b) ? 'swamp' : 'temperate'; };

/** Roll chances per area type; dawn (05-08) swaps in the dawn row (fog more likely). Each row sums to 1. */
export const CHANCES = Object.freeze({
  temperate: { day: { clear: 0.52, fog: 0.08, rain_light: 0.22, rain_heavy: 0.12, storm: 0.06 }, dawn: { clear: 0.42, fog: 0.3, rain_light: 0.16, rain_heavy: 0.08, storm: 0.04 } },
  swamp: { day: { clear: 0.34, fog: 0.22, rain_light: 0.22, rain_heavy: 0.14, storm: 0.08 }, dawn: { clear: 0.24, fog: 0.46, rain_light: 0.16, rain_heavy: 0.1, storm: 0.04 } },
  snowy: { day: { snow_light: 0.66, ice_fog: 0.1, blizzard: 0.24 }, dawn: { snow_light: 0.56, ice_fog: 0.26, blizzard: 0.18 } },
});

/** Gameplay modifiers. enc: rate (x grass rate, still capped by MAX_RATE), el (element x weight), sp (species x
 * weight), only (weather-only slots added to grass tables of that area type). fish: bite (x bite chance, clamped),
 * rare / uncommon (x slot weight), wait (x bite wait). Values are Coder placeholders for Gary (WEATHER.md). */
export const MODS = Object.freeze({
  clear: { enc: {}, fish: {} },
  rain_light: { enc: { el: { water: 1.5, swamp: 1.3, rain: 2 } }, fish: { bite: 1.12, uncommon: 1.15, rare: 1.3 } },
  rain_heavy: { enc: { el: { water: 1.8, swamp: 1.5, rain: 2.5 }, only: [{ species: 'puddlenip', weight: 10 }, { species: 'pondkin', weight: 8, area: 'swamp' }] }, fish: { bite: 1.22, uncommon: 1.3, rare: 1.6 } },
  storm: { enc: { el: { water: 2, swamp: 1.6, rain: 3 }, only: [{ species: 'puddlenip', weight: 10 }, { species: 'drizzlebill', weight: 4 }, { species: 'pondkin', weight: 8, area: 'swamp' }] }, fish: { bite: 1.3, uncommon: 1.4, rare: 2, wait: 0.9 } },
  fog: { enc: { rate: 1.15, el: { ghost: 1.6, mystic: 1.6, dark: 1.4 }, only: [{ species: 'dustbonnet', weight: 5 }, { species: 'mournlily', weight: 3 }] }, fish: { bite: 0.85, wait: 1.3, uncommon: 1.3, rare: 1.8 }, trainerSight: -1 },
  snow_light: { enc: { sp: { snowgrouse: 1.2, frostlop: 1.3, snowdrowse: 1.3, alpuff: 1.2 } }, fish: {} },
  blizzard: { enc: { rate: 1.1, el: { wind: 1.4 }, sp: { snowgrouse: 1.8, frostlop: 2, shagmount: 2, tundrarch: 2.5, snowdrowse: 1.8, ledgebex: 1.5 }, only: [{ species: 'snowcairn', weight: 6 }, { species: 'rimewick', weight: 3 }] }, fish: { bite: 0.9, uncommon: 1.3, rare: 1.5 } },
  ice_fog: { enc: { rate: 1.1, el: { ghost: 1.5, mystic: 1.6 }, sp: { snowdrowse: 3 } }, fish: { bite: 0.85, wait: 1.25, rare: 1.6 }, trainerSight: -1 },
});

/** Same 32-bit mixing as living.js mulberry32 (small, deterministic). */
export function hash01(...parts) {
  let h = 2166136261;
  for (const c of parts.join('|')) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  h = (h + 0x6d2b79f5) | 0; let t = Math.imul(h ^ (h >>> 15), 1 | h); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
/** Absolute 3-hour block index from a clock {day, min}. */
export const blockOf = (clock) => ((clock?.day || 1) - 1) * (24 / BLOCK_H) + Math.floor(((clock?.min || 0) % 1440) / 60 / BLOCK_H);
/** Weather for (seed, area type, block) -> kind. Block hours 3-5 / 6-8 use the dawn row. */
export function rollWeather(seed, area, block) {
  const startH = (block % (24 / BLOCK_H)) * BLOCK_H, row = CHANCES[area] || CHANCES.temperate;
  const ch = startH >= 3 && startH < 9 ? row.dawn : row.day;
  let r = hash01(seed, area, block);
  for (const [k, p] of Object.entries(ch)) { if ((r -= p) < 0) return k; }
  return Object.keys(ch)[0];
}
/** Kind for a map now. Indoors / caves -> 'clear'. route1_storm-style variants are always 'storm'. override wins. */
export function weatherFor(state, mapName, clock, outdoor = true) {
  if (!outdoor) return 'clear';
  if (/_storm$/.test(mapName || '')) return 'storm';
  const a = areaType(mapName), o = state?.override?.[a];
  if (o && KINDS.includes(o)) return o;
  return rollWeather(state?.seed ?? 1, a, blockOf(clock));
}
/** Does a slot weather list ('rain' = any rain, 'fog' = any fog, 'snow' = snow_light | blizzard) match a kind? */
export function wxMatch(list, kind) {
  const k = kind || 'clear';
  return list.some((w) => w === k || (w === 'rain' && RAINY.has(k)) || (w === 'fog' && FOGGY.has(k)) || (w === 'snow' && (k === 'snow_light' || k === 'blizzard')));
}

// ---- encounters ----
/** Weight multiplier for one slot: slot.weather {kind|group: x} (data field), then MODS el / sp. */
export function encWeight(slot, kind, elOf = null) {
  let w = slot.weight || 0;
  if (w <= 0) return 0;
  const sw = slot.weather;
  if (sw && !Array.isArray(sw) && typeof sw === 'object') for (const [k, m] of Object.entries(sw)) if (wxMatch([k], kind)) w *= +m;
  const e = MODS[kind]?.enc;
  if (!e) return w;
  if (e.sp?.[slot.species]) w *= e.sp[slot.species];
  if (e.el && elOf) { let best = 1; for (const el of elOf(slot.species) || []) best = Math.max(best, e.el[el] || 1); w *= best; }
  return w;
}
/** Weather-only extra slots for a grass zone (not surf / cave), levels copied from the zone's own range. */
export function extraSlots(zone, kind, area, hasArt = null) {
  const only = MODS[kind]?.enc?.only;
  if (!only || !/grass/i.test(zone?.method || '')) return [];
  const lv = (zone.slots || []).map((s) => (Array.isArray(s.level) ? s.level : [s.level, s.level]));
  if (!lv.length) return [];
  const lo = Math.min(...lv.map((l) => l[0])), hi = Math.max(...lv.map((l) => l[1]));
  return only.filter((o) => (!o.area || o.area === area) && (!hasArt || hasArt(o.species))).map((o) => ({ species: o.species, weight: o.weight, level: [lo, hi], weatherOnly: kind }));
}
export const encRate = (kind) => MODS[kind]?.enc?.rate ?? 1;

// ---- fishing ----
/** Fishing modifier row for a kind -> {bite, rare, uncommon, wait} (all multipliers, default 1). */
export function fishMods(kind) { const f = MODS[kind]?.fish || {}; return { bite: f.bite ?? 1, rare: f.rare ?? 1, uncommon: f.uncommon ?? 1, wait: f.wait ?? 1 }; }

// ---- save ----
/** Shape the save block (systems.weather): {seed, override: {area: kind}}. Bad data -> defaults. */
export function normaliseWeather(o) {
  const seed = Number.isFinite(+o?.seed) && +o.seed > 0 ? Math.floor(+o.seed) : 1 + Math.floor(Math.random() * 1e9);
  const override = {};
  for (const [a, k] of Object.entries(o?.override || {})) if (CHANCES[a] && KINDS.includes(k) && Object.prototype.hasOwnProperty.call(CHANCES[a].day, k)) override[a] = k;
  return { seed, override };
}

/** Particle budget (pooled, capped). mobile halves rain; reduced motion -> 0 particles (tint / fog only). */
export function particleCap(kind, mobile, reduced) {
  if (reduced) return 0;
  const base = { rain_light: 90, rain_heavy: 200, storm: 260, blizzard: 220, snow_light: 0, fog: 0, ice_fog: 0, clear: 0 }[kind] || 0;
  return Math.round(base * (mobile ? 0.5 : 1));
}
/** Placeholder text keys (Text Bot owns text/*). Fallbacks shown until the keys exist. */
export const TEXT = Object.freeze({
  'weather.clear': ['Clear'], 'weather.fog': ['Fog'], 'weather.rain_light': ['Light rain'], 'weather.rain_heavy': ['Heavy rain'],
  'weather.storm': ['Storm'], 'weather.snow_light': ['Snow'], 'weather.ice_fog': ['Ice fog'], 'weather.blizzard': ['Blizzard'],
});

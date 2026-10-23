// Batch 3 wiring (Oct 23 2026, Coder): sprite fallback for World Design NPCs that have no entry in
// art/characters/pixel/npcs/npc_sprite_map.json yet. Without a sprite the overworld NPC is invisible (NpcSystem._npcActor
// returns null), so every placed NPC without a mapped sheet gets an existing sheet picked by kind / gd_class.
// Deterministic (hash of "<map>.<id>"), runtime only: the sprite map file is not edited. Art can override any NPC by
// adding a real "<map>.<id>" entry to the sprite map (that always wins).

const TR = ['tr_bugcatcher_f', 'tr_camper_f', 'tr_hiker_f', 'tr_hiker_m', 'tr_lass_f', 'tr_ranger_m', 'tr_scientist_f', 'tr_scientist_m', 'tr_youngster_m'];
const BY_CLASS = {
  angler: ['vil_fisher_m', 'tr_swimmer_f'], diver: ['tr_swimmer_f', 'tr_swimmer_m'], harbour_hand: ['vil_fisher_m', 'vil_worker_f'],
  birder: ['tr_camper_f', 'tr_ranger_m'], researcher: ['tr_scientist_f', 'tr_scientist_m'], scholar: ['tr_scientist_m', 'vil_scholar_m'],
  climber: ['tr_hiker_m', 'tr_hiker_f'], hiker: ['tr_hiker_m', 'tr_hiker_f'], camper: ['tr_camper_f'], ranger: ['tr_ranger_m'],
  skater: ['tr_youngster_m', 'tr_lass_f'], kid: ['tr_youngster_m', 'tr_lass_f'], courier: ['vil_courier_f'],
  worker: ['vil_worker_f', 'tr_hiker_m'], rail_worker: ['vil_worker_f'], smith: ['vil_worker_f', 'tr_hiker_m'],
  beetle_keeper: ['tr_bugcatcher_f'], gardener: ['vil_gardener_f', 'vil_gardener_f_b'], lamplighter: ['vil_office_m_b'],
  fogwalker: ['tr_ranger_m', 'tr_hiker_f'], veteran: ['tr_hiker_m', 'tr_ranger_m', 'tr_scientist_m'],
};
const BY_KIND = {
  villager: ['vil_cook_f', 'vil_elder_f', 'vil_elder_m', 'vil_kid_f', 'vil_kid_m', 'vil_kid_f_b', 'vil_kid_m_b', 'vil_parent_m', 'vil_office_m', 'vil_worker_f', 'vil_gardener_f'],
  villager_scholar: ['vil_scholar_m', 'vil_elder_m', 'vil_elder_f'],
  guard: ['vil_guard_m', 'vil_guard_m_b', 'vil_officer_f'],
  clerk: ['vil_shopkeeper_m', 'vil_receptionist_f', 'vil_receptionist_f_b'],
  rival: ['ron'],
};
const MASTER_BY_MAP = { saltmere_hall_int: 'tr_master_saltmere_f', fernwick_hall_int: 'tr_master_fernwick_m' };

export function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

/** Sprite id for a map NPC def (no I/O). */
export function pickSpriteId(mapName, def) {
  const key = mapName + '.' + def.id, h = hash(key), pick = (a) => a[h % a.length];
  const hall = /_hall_int$/.test(mapName);
  if (def.kind === 'master' || /_master$/.test(def.id)) return MASTER_BY_MAP[mapName] || pick(['tr_gymtrainer_m', 'tr_gymtrainer_f']);
  if (def.kind === 'rival' || def.gd_class === 'ron') return 'ron';
  if (hall && /_h\d+$/.test(def.id)) return pick(['tr_gymtrainer_f', 'tr_gymtrainer_m']);
  if (def.gd_class && BY_CLASS[def.gd_class]) return pick(BY_CLASS[def.gd_class]);
  if (BY_KIND[def.kind]) return pick(BY_KIND[def.kind]);
  if (hall && /guide/.test(def.id)) return 'vil_receptionist_f';
  return pick(TR);
}

/** Sprite-map entry for a sprite id: copy of an existing entry (portraits, trainer art) or the standard sheet paths. */
export function entryFor(spriteId, spriteMap = {}, extra = {}) {
  for (const e of Object.values(spriteMap)) if (e?.sprite_id === spriteId) return { ...e, fallback: true };
  for (const e of Object.values(extra || {})) if (e?.sprite_id === spriteId) return { ...e, fallback: true };
  const dir = spriteId === 'ron' ? 'humans/ron' : 'npcs/' + spriteId, b = `${dir}/overworld/${spriteId}_chibi`;
  return { sprite_id: spriteId, overworld_sheet: b + '_sheet.png', overworld_sheet_2x: b + '_sheet_2x.png', overworld_sheet_3x: b + '_sheet_3x.png', overworld_frames_dir: b + '/', fallback: true };
}

/** World Design's 28 overnight maps (batch 3) carry source "qa/overnight_maps ..."; other maps keep today's behaviour. */
export const isBatch3Map = (map) => /overnight/.test(String(map?.json?.source || ''));

/** spriteMap plus fallback entries for every NPC on a batch 3 `map` that has none. Returns a new object (input untouched). */
export function withFallbacks(map, spriteMap, extra = null) {
  const out = { ...(spriteMap || {}) };
  if (!isBatch3Map(map)) return out;
  for (const d of map?.npcs || map?.json?.npcs || []) {
    const k = map.name + '.' + d.id;
    if (!d?.id || out[k]) continue;
    out[k] = entryFor(pickSpriteId(map.name, d), spriteMap, extra);
  }
  return out;
}

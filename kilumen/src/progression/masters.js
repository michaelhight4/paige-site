import { applyHeldPicks, heldRoleFor } from '../battle/data/trainer_held.js?v=v0.2.105-alpha';
// Masters 1-8 (Oct 23, 2026, overnight coder). Data: data/masters.json (built from design/overnight_gd/halls/*.json by
// tools/build_progression_data.mjs). Pure helpers here; the scene / UI wiring is in ./index.js.
// - results: each Master win sets its story flag (beat_master_<zone>), which IS the coin (coinCount() in src/overworld/lines.js).
// - teams: Game dev's teams. battle_species is a PLACEHOLDER stand-in where the engine lacks the GD species.
// - prize money stays with Systems.onTrainerWin (class 'master' x ace level); GD prize numbers are kept as *_placeholder only.

/** Register `<hall_map>.<master id>` -> {win:[flag]} in TRAINER_RESULTS (never overwrites an existing entry). -> keys added */
export function registerMasterResults(data, results) {
  const added = [];
  for (const h of data.halls) {
    const key = `${h.hall_map}.${h.master.id}`;
    if (results[key]) continue;
    results[key] = { win: [h.flag] };
    added.push(key);
  }
  return added;
}

/** Hall interiors placed by World Design (halls 2-8) use map NPC ids <hall_map>_master / <hall_map>_h<N> / <hall_map>_guide.
 *  Register those too (same flag; never overwrites). -> keys added. Coder halls wiring, Oct 23 2026. */
export function registerHallNpcResults(data, results) {
  const added = [];
  for (const h of data.halls) {
    const key = `${h.hall_map}.${h.hall_map}_master`;
    if (h.zone === 'fernwick' || results[key] || h.master.id === `${h.hall_map}_master`) continue; // live Fernwick uses master_fernwick
    results[key] = { win: [h.flag] };
    added.push(key);
  }
  return added;
}

/** Role of a map NPC in a hall: accepts masters.json ids (master.id, trainer id / gd_id) and the World Design map ids
 *  (<hall_map>_master, <hall_map>_h<N> = trainers[N-1], <hall_map>_guide). -> {hall, role, who, index} | null */
export function hallNpc(data, map, id) {
  for (const h of data.halls) {
    if (h.hall_map !== map && !(h.floor_maps || []).includes(map)) continue; // floor_maps: Lanternport lighthouse floors 1F-3F
    if (id === h.master.id || id === `${map}_master`) return { hall: h, role: 'master', who: h.master, index: -1 };
    if (id === `${map}_guide`) return { hall: h, role: 'guide', who: null, index: -1 };
    let i = h.trainers.findIndex((t) => t.id === id || t.gd_id === id);
    const m = new RegExp(`^${map}_h(\\d+)$`).exec(id) || new RegExp(`^${h.hall_map}_h(\\d+)$`).exec(id);
    if (i < 0 && m) i = +m[1] - 1;
    if (i >= 0 && h.trainers[i]) return { hall: h, role: 'trainer', who: h.trainers[i], index: i };
    return null;
  }
  return null;
}

/** Find the hall + trainer for a battle at (map, npc id). -> {hall, who, isMaster} | null */
export function findHallTrainer(data, map, id) {
  const r = hallNpc(data, map, id);
  return r && r.role !== 'guide' ? { hall: r.hall, who: r.who, isMaster: r.role === 'master' } : null;
}

/** Battle opts for a hall trainer, or null (Fernwick only when opts.fernwick is on). */
export function teamFor(data, map, id, { fernwick = false } = {}) {
  const f = findHallTrainer(data, map, id);
  if (!f || (f.hall.zone === 'fernwick' && !fernwick)) return null;
  // r56: an authored held item / skill list (balance.json Masters 5-6) rides along; picks only fill members without one.
  const foes = f.who.team.map((m) => ({ species: m.battle_species, level: m.level, ...(m.held ? { held: m.held } : {}), ...(m.skills ? { skills: [...m.skills] } : {}) }));
  return { foes: f.isMaster ? applyHeldPicks(heldRoleFor({ zone: f.hall.zone }), foes) : foes, // held items (Oct 29 2026): Master picks, src/battle/data/trainer_held.js
    foeName: f.who.name_placeholder || 'Trainer', zone: f.hall.zone, isMaster: f.isMaster, masterNumber: f.isMaster ? f.hall.coin_number : 0 };
}

export const hallByZone = (data, zone) => data.halls.find((h) => h.zone === zone) || null;

/** Coins earned, from story flags (same rule as coinCount: one per beat_master_* flag that a hall owns). */
export function coinsFromFlags(data, flags) {
  return data.halls.filter((h) => flags.has(h.flag)).map((h) => h.coin_number).sort((a, b) => a - b);
}

/** After a Master win: coin record + optional gift. sys = scene.systems (may be null in tests). -> {coin, gift, giftStatus} */
export function awardMaster(hall, { sys = null, gifts = false, record = null } = {}) {
  const out = { coin: hall.reward.coin_name_placeholder, coinNumber: hall.coin_number, gift: null, giftStatus: 'off' };
  if (record) record[hall.zone] = { coin: hall.coin_number, flag: hall.flag };
  const g = hall.reward.gift_item_placeholder;
  if (gifts && g) {
    const id = typeof g === 'string' ? g : g.id, qty = g.qty || 1;
    if (sys?.bag?.def?.(id)) { const r = sys.bag.add(id, qty); out.gift = id; out.giftStatus = r?.ok ? 'given' : 'bag_full'; }
    else { out.gift = id; out.giftStatus = 'placeholder_unknown_item'; }
  }
  return out;
}

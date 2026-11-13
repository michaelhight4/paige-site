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

/** Find the hall + trainer for a battle at (map, npc id). -> {hall, who, isMaster} | null */
export function findHallTrainer(data, map, id) {
  for (const h of data.halls) {
    if (h.hall_map !== map) continue;
    if (h.master.id === id) return { hall: h, who: h.master, isMaster: true };
    const t = h.trainers.find((x) => x.id === id);
    if (t) return { hall: h, who: t, isMaster: false };
  }
  return null;
}

/** Battle opts for a hall trainer, or null (Fernwick only when opts.fernwick is on). */
export function teamFor(data, map, id, { fernwick = false } = {}) {
  const f = findHallTrainer(data, map, id);
  if (!f || (f.hall.zone === 'fernwick' && !fernwick)) return null;
  return { foes: f.who.team.map((m) => ({ species: m.battle_species, level: m.level })), foeName: f.who.name_placeholder || 'Trainer', zone: f.hall.zone, isMaster: f.isMaster };
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

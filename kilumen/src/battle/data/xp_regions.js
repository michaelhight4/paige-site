// Trainer XP by region (Gary, Oct 31 2026: "make trainers give 25% less xp", then: regions 1-4 only).
// Regions 1-4 (Masters 1-4, their routes, halls and Rons): trainer KOs give xpTrainerMultEarly (1.125 = 1.5 x 0.75).
// Regions 5-8, Masters 5-8, post-game (Aurelith, Wellspire r9_*, finale fin_*) and any unmapped map keep xpTrainerMult (1.5).
// Region = longest map / zone prefix, the same table as tools/level_curve/rebalance.py (R1-R8 rows). Post-game trainers
// placed on early maps (ids r9_* / fin_*) count as post-game.
import { KILUMEN_RULES } from './rules.js?v=v0.2.107-alpha';

export const REGION_PREFIXES = [
  [1, ['route1', 'brookhollow', 'bh_', 'fernwick']],
  [2, ['thornwood', 'route_east', 'route_aurelith_saltmere', 'saltmere', 'greystone_b1']],
  [3, ['route_revival_grass', 'route_revival_tr', 'route_revival', 'revival', 'greystone', 'tr_', 'sa_', 're_']],
  [4, ['frostspire', 'route_revival_saltmere', 'fs_', 'fp_', 'rs_', 'rsf_']],
  [5, ['sunmeadow', 'route_revival_sunmeadow', 'route_saltmere_mirefen', 'route_sunmeadow_mirefen', 'mirefen', 'smf_', 'sme_', 'smm_', 'sm_harbour']],
  [6, ['route_coast', 'tidewater', 'tc_', 'ct_']],
  [7, ['route_fernwick_lanternport', 'lanternport', 'lighthouse', 'lp_', 'fl_']],
  [8, ['route_cindervale', 'cindervale', 'ac_']],
  [9, ['aurelith', 'r9_', 'fin_']], // post-game
];

/** Region number (1-8, 9 = post-game) for a map / zone name and npc id, or null when no prefix matches. */
export function regionOf(map, id = '') {
  if (/^(r9_|fin_)/.test(String(id))) return 9;
  const k = String(map || '').toLowerCase(); let best = null;
  for (const [r, ps] of REGION_PREFIXES) for (const p of ps) if (k.startsWith(p) && (!best || p.length > best[1])) best = [r, p.length];
  return best ? best[0] : null;
}

/** Trainer XP multiplier for a battle: who = {map, id, masterNumber?}. Master 1-4 / region 1-4 -> early rate, else 1.5. */
export function trainerXpMult(who = {}, R = KILUMEN_RULES) {
  const r = who.masterNumber ? who.masterNumber : regionOf(who.map, who.id);
  return r >= 1 && r <= 4 ? (R.xpTrainerMultEarly ?? R.xpTrainerMult) : R.xpTrainerMult;
}

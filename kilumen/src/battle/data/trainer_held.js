// Held items for Masters and Ron, per fight (held items P2-P5, Oct 29 2026; design/HELD_ITEMS.md decision 3).
// PLACEHOLDER picks for Gary. Rules: picks line up with the team FROM THE END (the last entry is the ace), so a team
// that gains or loses a lead creature keeps its ace's item; null = holds nothing; no item twice in one team; Charms only
// on a creature of that element; difficulty ramps (Ron 1: one item ... Master 8 / Ron 6: whole team).
// Plain data, no imports (shared by battle/data/trainer_teams.js, progression/masters.js and progression/index.js).
export const HELD_PICKS = {
  ron_1: ['remedy_pouch'],                                                       // peeplark, starter counter (ace)
  master_fernwick: [null, 'remedy_pouch', 'moss_wrap'],                          // pebblant, pondkin, tumbloam
  ron_2: [null, 'mint_sprig', 'remedy_pouch'],
  master_saltmere: ['mint_sprig', 'remedy_pouch', 'droplet_charm'],              // quaymouser, polypip, spratwyrm (Water)
  ron_3: [null, 'remedy_pouch', 'steady_sight', 'hawk_lens'],
  master_revival_heights: ['remedy_pouch', 'mint_sprig', 'moss_wrap', 'glint_charm'], // ... lampwick (Light)
  ron_4: ['mint_sprig', 'remedy_pouch', 'steady_sight', 'last_stand_ribbon'],
  master_frostspire: ['steady_sight', 'gustfeather_charm', 'remedy_pouch', 'quill_charm'], // sailquill, highkite (Wind), pouchbill, gildfinch (Bird)
  master_mirefen: ['remedy_pouch', 'bogroot_charm', 'mint_sprig', 'moss_wrap', 'sap_vial'], // mirewump x4 (Swamp) + gloamtick
  ron_5: [null, 'mint_sprig', 'iron_brace', 'remedy_pouch', 'quick_tassel'],
  master_tidewater_coast: ['remedy_pouch', 'mint_sprig', 'tidebell_charm', 'steady_sight', 'last_stand_ribbon'], // ... spraytern (Sea), hullwhale
  master_lanternport: ['hush_charm', 'runestitch_charm', 'remedy_pouch', 'mint_sprig', 'oath_lens'], // gloamtick (Ghost), runeskein (Mystic) ...
  master_cindervale: ['slag_charm', 'ember_charm', 'dusk_charm', 'remedy_pouch', 'mint_sprig', 'last_stand_ribbon'], // slagrook (Magma), sparkplume (Fire), charlurcher (Dark) ...
  ron_6: ['steady_sight', 'mint_sprig', 'remedy_pouch', 'hawk_lens', 'quick_tassel', 'last_stand_ribbon'],
};

/** Fight key -> pick key: Ron's six fights by number, Masters by hall zone. */
export function heldRoleFor({ map = '', id = '', zone = '' } = {}) {
  const r = /ron(?:_rival)?_(\d)$/.exec(String(id)); if (r) return `ron_${r[1]}`;
  if (zone) return `master_${zone}`;
  const m = /^(\w+?)_hall_int$/.exec(String(map)); if (m && /master/.test(String(id))) return `master_${m[1] === 'revival' ? 'revival_heights' : m[1]}`;
  return null;
}

/** Put the picks for `role` on a team (copies; a creature that already has `held` keeps it). */
export function applyHeldPicks(role, team) {
  const p = HELD_PICKS[role]; if (!p || !Array.isArray(team)) return team;
  const off = team.length - p.length;
  return team.map((f, i) => { const h = p[i - off]; return h && f && !f.held ? { ...f, held: h } : f; });
}

// QoL batch C (Coder, Oct 29 2026; Gary approved 10:49 AM CT, design/QOL_MODS_SHORTLIST.md items 8/10/12/15/16/17).
// One kill switch per feature. URL override (not saved): ?qolc=-storage (one off), ?qolc=chain (one on), ?qolc=0 (all off).
export const QOLC_DEFAULTS = Object.freeze({
  storage: true,  // #10 storage anywhere: "Storage" app on the phone menu (optional story flag: QOLC_CFG.storageFlag)
  stats: true,    // #8 stats & growth viewer, opened from the Summary page (A -> Stats)
  renew: true,    // #12 encounter-blocker auto renew: "Use another?" when one runs out (no blocker item exists yet)
  quicksave: true,// #15 quick save app on the phone menu (refused in battles / talk / cutscenes: scene.saveLockReason)
  rename: true,   // #16 rename from the Summary page (A -> Rename), name filter on
  chain: false,   // #17 variant encounter-chain counter: STRUCTURE ONLY (no odds are applied; dev readout only)
});
export const QOLC_CFG = Object.freeze({
  storageFlag: null,     // e.g. 'has_archive_link' once Gary picks one; null = always available
  blockerItems: {},      // { item_id: steps } -- none in src/systems/items.js yet (design call pending)
  nameMax: 12,
});
export function qolcFlags(query) {
  const f = { ...QOLC_DEFAULTS };
  const raw = query?.get?.('qolc') ?? '';
  for (const t of String(raw).split(',').map((s) => s.trim()).filter(Boolean)) {
    if (t === '0' || t === 'off') for (const k of Object.keys(f)) f[k] = false;
    else if (t === 'all') for (const k of Object.keys(f)) f[k] = true;
    else if (t[0] === '-' && t.slice(1) in f) f[t.slice(1)] = false;
    else if (t in f) f[t] = true;
  }
  return f;
}

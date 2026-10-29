// Earned-only held items as rewards (held items P2-P5, Oct 29 2026; design/HELD_ITEMS.md section 3 "where").
// Never sold. Three kinds:
//  1. Hall prizes: given once after a story flag (a Master win / The Missing Note / beating Ron the 6th time).
//  2. Hidden spots: hidden pickups added to a map's `items` on entry (same pickup code as World Design's items,
//     src/systems/bag.js). They stand in for the side quests the spec names until data/quests.json exists.
//     Cells were picked by script from each map's collision layer (walkable nook, reachable, away from doors/NPCs);
//     tests/held_items.test.mjs checks every one is still walkable and free.
//  3. Post-game spots: hidden spots with `needFlag` (beat_rival_ron_6 stands in for the post-game).
// PLACEHOLDER placements for Gary / World Design.

export const POSTGAME_FLAG = 'beat_rival_ron_6';

/** flag -> items given once (got flag: got_<item>). */
export const FLAG_REWARDS = [
  { flag: 'beat_master_revival', items: ['wisp_charm'], why: 'master' },
  { flag: 'beat_master_mirefen', items: ['sap_vial'], why: 'master' },
  { flag: 'beat_master_lanternport', items: ['oath_lens'], why: 'master' },
  { flag: 'beat_master_cindervale', items: ['horncap_charm'], why: 'master' },
  { flag: 'flg_missing_note_done', items: ['lure_lantern'], why: 'quest' },           // The Missing Note (pairs with firefly_lantern)
  { flag: POSTGAME_FLAG, items: ['grit_buckle', 'crownstone_charm'], why: 'postgame' },
];
export const gotFlag = (item) => `got_held_${item}`;

/** map name -> hidden spots ({id, x, y, item, needFlag?}). */
export const HIDDEN_SPOTS = {
  brookhollow: [{ id: 'held_brookstone', x: 14, y: 23, item: 'brookstone_charm' }],
  fernwick: [{ id: 'held_shellbead', x: 39, y: 20, item: 'shellbead_charm' }],
  thornwood: [{ id: 'held_moss_wrap', x: 18, y: 33, item: 'moss_wrap' }],
  revival_heights: [{ id: 'held_clear_bell', x: 14, y: 13, item: 'clear_bell' }],
  frostspire: [{ id: 'held_hide_vest', x: 4, y: 16, item: 'hide_vest' }, { id: 'held_last_stand', x: 11, y: 24, item: 'last_stand_ribbon' }],
  sunmeadow_fields: [{ id: 'held_swift_anklet', x: 14, y: 19, item: 'swift_anklet' }],
  mirefen: [{ id: 'held_tamers_thread', x: 12, y: 12, item: 'tamers_thread' }],
  lanternport: [{ id: 'held_hush_charm', x: 12, y: 12, item: 'hush_charm' }],
  cindervale: [{ id: 'held_scaleshard', x: 12, y: 12, item: 'scaleshard_charm' }, { id: 'held_oath_band', x: 41, y: 12, item: 'oath_band' }],
  aurelith: [
    { id: 'held_halo_charm', x: 13, y: 9, item: 'halo_charm' },
    { id: 'held_mythmark', x: 43, y: 16, item: 'mythmark_charm', needFlag: POSTGAME_FLAG },
    { id: 'held_oath_spurs', x: 14, y: 22, item: 'oath_spurs', needFlag: POSTGAME_FLAG },
  ],
};

/** Add this map's hidden held-item spots to m.items (once per map object; post-game ones only after the flag). */
export function injectHiddenSpots(m, flags) {
  const spots = HIDDEN_SPOTS[m?.name]; if (!spots || !m) return 0;
  m.items = m.items || [];
  let n = 0;
  for (const s of spots) {
    if (s.needFlag && !flags.has(s.needFlag)) continue;
    if (m.items.some((it) => it.id === s.id)) continue;
    m.items.push({ id: s.id, x: s.x, y: s.y, item: s.item, hidden: true, flag: `item_${m.name}_${s.id}` }); n++;
  }
  return n;
}

/** Give every flag reward that's due. -> [{item, why, ok}] (setFlag(f) marks it got). */
export function grantFlagRewards({ flags, bag, setFlag }) {
  const out = [];
  for (const r of FLAG_REWARDS) {
    if (!flags.has(r.flag)) continue;
    for (const item of r.items) {
      const g = gotFlag(item); if (flags.has(g)) continue;
      const res = bag.add(item, 1);
      setFlag(g); out.push({ item, why: r.why, ok: res.ok });
    }
  }
  return out;
}

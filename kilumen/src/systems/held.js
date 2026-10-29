// Held items in the field (design/HELD_ITEMS.md P2-P5, Oct 29 2026). Own code.
// Model (v2): giving an item moves ONE copy out of the bag onto the creature; taking it (or swapping) puts it back.
// So two creatures can each hold a Remedy Pouch when you own two, and a Remedy Pouch used up in battle is really gone.
// Old saves (v1: the holder shared the bag copy) are migrated once by migrateHeld().

/** Every creature the player owns (team + archive boxes), for migration and "who holds it" lookups. */
export const allOwned = (party = [], archive = null) => [...party, ...((archive?.boxes || []).flat())].filter(Boolean);

/** Give `id` from the bag to creature `c`. Its old item (if any) goes back to the bag. -> {ok, reason?, old} */
export function giveHeld(bag, c, id) {
  if (!c || !id) return { ok: false, reason: 'bad' };
  if (c.held === id) return { ok: false, reason: 'same' };
  if (!bag.def(id)?.held) return { ok: false, reason: 'not_held' };
  if (!bag.remove(id, 1)) return { ok: false, reason: 'none' };
  const old = c.held || null;
  if (old) {
    const r = bag.add(old, 1);
    if (!r.ok) { bag.add(id, 1); return { ok: false, reason: 'bag_full' }; } // undo: nothing lost
  }
  c.held = id;
  return { ok: true, old };
}

/** Take creature `c`'s item back into the bag. -> {ok, reason?, id} */
export function takeHeld(bag, c) {
  const id = c?.held; if (!id) return { ok: false, reason: 'empty' };
  const r = bag.add(id, 1); if (!r.ok) return { ok: false, reason: 'bag_full', id };
  c.held = null; return { ok: true, id };
}

/** Move an item from creature a to creature b (b's own item, if any, goes to a). */
export function swapHeld(a, b) { const t = a.held || null; a.held = b.held || null; b.held = t; return { ok: true }; }

/** v1 -> v2: holders shared the bag copy, so take one copy out of the bag per holder. Runs once (state.heldModel). */
export function migrateHeld(bag, creatures, state) {
  if (!state || state.heldModel >= 2) return 0;
  let n = 0;
  for (const c of creatures) if (c?.held && bag.remove(c.held, 1)) n++;
  state.heldModel = 2; return n;
}

// ---- field effects ----------------------------------------------------------------------------------------------
// PLACEHOLDER tuning (spec rows 21-24).
export const FIELD_HELD = { lure_lantern: 1.5, hush_cloak: 0.5, tally_purse: 1.1, tamers_thread: 1.2 };

/** Wild encounter-rate multiplier from the LEAD creature (first one that can battle): Lure Lantern x1.5, Hush Cloak x0.5. */
export function leadEncounterMult(party = []) {
  const lead = party.find((c) => c && (c.hp == null || c.hp > 0)) || party[0];
  return lead?.held === 'lure_lantern' ? FIELD_HELD.lure_lantern : lead?.held === 'hush_cloak' ? FIELD_HELD.hush_cloak : 1;
}

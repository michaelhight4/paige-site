# revival_heights: overnight text DRAFT

**DRAFT, not signed off by Gary.** Text Bot overnight worker, 2026-10-23 00:46 CT. Keys = Game dev text_ref ids (design/overnight_gd/trainers_revival_heights.json). Spot ids = World Design `maps.revival_heights.<id>` from qa/overnight_maps (staged only) where they exist, else `TODO-spot:` placeholders.
Story step: 6 (coin 3, Lumen Line Pass) | GD map id `revival_heights` | World map id `revival_heights`

Format: each line is one dialogue page (max 2 x 40 chars). `intro` = trainer pages, `defeat` = battle_lost (player wins), `after` = repeat talk.

## Trainers

### `ron.battle_3` - Ron (ron_3, flag `beat_rival_ron_3`)

- team: Sailquill L24, Glassvine L25, Mirrorkin L25, Emberlunx L27 (Tumbloam-player version; GD has all three starter variants)
- note (GD): After the layoff warning letter. He loses for real and laughs it off too fast (6.1). Minor Ron motif.
- spot: `maps.revival_heights.revival_heights_ron_3` (World staged Ron spot)
- intro (opener = existing `ron_battle_openers.ron_rival_revival_heights`, mirrored): "Two bags. Maybe three. Doesn't matter." / "Bin day's tomorrow. Let's go, {nick}."
- intro_2 (after the opener): "Head Office is right there. Let's give the windows a show."
- defeat (Ron loses): "Ha! Ha. Yeah. No, that's fine. That's totally fine."
- won (Ron wins; works with or without a blackout, per Coder 12:47 AM; Gary to rule on blackout for battles 2-6): "Don't tell the plaza. They'll put it in the bulletin."
- after: "Reception's got post for me, apparently. Nobody sends me post."

### `trainers.revival_heights.plaza` - Field Researcher Lyle (tr_revival_heights_plaza)

- spot: `maps.revival_heights.revival_heights_trainer_1` | where (GD): HQ plaza, optional | team: Halovy L25, Prismite L26
- name: GD placeholder `TBD_NAME_3` -> proposed **Lyle** (Gary to approve)
- intro: "I'm on lunch. Lunch is also when I test new teams."
- defeat: "Back to the lab, then."
- after: "Head Office sends memos by hand here. Real paper. It's a whole thing."

## Signs

- `maps.revival_heights.revival_heights_sign`: "REVIVAL HEIGHTS\nHome of Revival Tech." / "Visitors report to the checkpoint."

## NPCs

- `maps.revival_heights.revival_heights_rt_guard` (guard): text already exists in `blockers.gate_revival_checkpoint (rt_guard_heights)`; World and Text Bot to align the id (see SUMMARY id-mismatch table). Not rewritten.
- `maps.revival_heights.revival_heights_pass_clerk` (clerk): text already exists in `rail_only.npcs.pass_clerk`; World and Text Bot to align the id (see SUMMARY id-mismatch table). Not rewritten.
- `maps.revival_heights.revival_heights_airspace_officer` (guard): text already exists in `rail_only.npcs.airspace_officer`; World and Text Bot to align the id (see SUMMARY id-mismatch table). Not rewritten.
- `maps.revival_heights.revival_heights_lucky_crystal_seller` (clerk): text already exists in `unplaced_npcs.lucky_crystal_seller`; World and Text Bot to align the id (see SUMMARY id-mismatch table). Not rewritten.

## Shop clerk

- spot: `maps.shop_int.clerk` variant for region `revival_heights` (Revival Heights); World warps every town to the shared shop_int, so these need a per-region line (`TODO-spot:shop_int_clerk_revival_heights`).
- greeting: "RT Supply, head office branch. Staff prices on a staff ID." / "Feeds, remedies, crystals. What do you need?"
- regular (repeat visit): "Three coins? Then you can have the good shelf."
- stock names used (GD shops.json): Big Remedy, Calm Tea, Dominance Crystal, Feed Bag, Great Remedy, High Crystal, Hush Spray, Pep Remedy, Prime Crystal, Rally Kit, Small Remedy, Vigor Seed

## Pickups (Game dev items_revival_heights.json)

The "found" message is the generic system line (`You found {item}!`-style, system_items). Only hidden pickups get a nearby hint line.

- `rh_plaza` (tonic_large -> **Big Remedy**, hidden) at: plaza planter | hint (inspect/sparkle text, `TODO-spot:revival_heights_rh_plaza_hint`): "Something glints by the plaza planter."
- `rh_station` (dominance_crystal_plus -> **Prime Crystal**) at: Central station platform end
- `rh_hq_gift` (energy_tonic -> **Pep Remedy**) at: HQ reception: Branch Access Card scene bonus (SOUL 8.2d)

- World staged its own placeholder pickups (revival_heights_item_1, revival_heights_item_2, revival_heights_item_3); Game dev ids above should replace them. Note: World's placeholder label "Lumen Tonic" must not reach players (blocked word); use Small/Big/Pep Remedy.


# aurelith: overnight text DRAFT

**DRAFT, not signed off by Gary.** Text Bot overnight worker, 2026-10-23 00:46 CT. Keys = Game dev text_ref ids (design/overnight_gd/trainers_aurelith.json). Spot ids = World Design `maps.aurelith.<id>` from qa/overnight_maps (staged only) where they exist, else `TODO-spot:` placeholders.
Story step: 4 (pass through, arena sealed) / 11+ finale | GD map id `aurelith` | World map id `aurelith`

Format: each line is one dialogue page (max 2 x 40 chars). `intro` = trainer pages, `defeat` = battle_lost (player wins), `after` = repeat talk.

## Trainers

### `ron.battle_6` - Ron (ron_6, flag `beat_rival_ron_6`)

- team: Sailquill L58, Gearwarden L59, Foldwing L59, Runeskein L60, Eavesgrim L61, Forgeharrow L62 (Tumbloam-player version; GD has all three starter variants)
- note (GD): Final Ron battle at the arena steps after all_badges (6.1 "Final"). Six creatures. Ron stands beside you afterwards.
- spot: `maps.aurelith.aurelith_ron_6` (World staged Ron spot)
- intro (opener = existing `ron_battle_openers.ron_rival_cindervale`, mirrored): "The bags have a smell now. Not ours. Their own." / "Tomorrow, {nick}. I mean it this time."
- intro_2 (after the opener): "Eight coins. Me too, nearly. Seven and a sandwich." / "One more, {nick}. For old times. Then we go and get them."
- defeat (Ron loses): "Yeah. Okay. You were always going to win that one." / "Head Office. In person. Like the list said. I'm coming."
- won (Ron wins; works with or without a blackout, per Coder 12:47 AM; Gary to rule on blackout for battles 2-6): "Huh. Didn't see that coming. Doesn't change anything." / "Head Office. In person. I'm coming."
- after: "Lead the way. I'll try to look like I belong."
  - _intro2 + defeat: Story Bot draft (QUESTS mq_finale s1/s2), kept_

### `trainers.aurelith.arena_1` - Battle Master Arlo (tr_aurelith_arena_1)

- spot: `TODO-spot:aurelith_1_battle_master` | where (GD): ARENA Battle Master 1 (count 8 vs 15 pending Gary) | team: Ingotitan L57, Dormagnus L58, Emberbrock L58, Pumicepuff L59, Netspinner L58, Railmite L60
- intro: "Welcome to the steps. No healing between us, so pace yourself."
- defeat: "Good. Keep that up. It gets harder."
- after: "Edda's at the top. She doesn't go easy on people she likes."

### `trainers.aurelith.arena_2` - Battle Master Sable (tr_aurelith_arena_2)

- spot: `TODO-spot:aurelith_2_battle_master` | where (GD): ARENA Battle Master 2 | team: Gloamtick L58, Mournlily L59, Rooftrove L59, Runeskein L59, Lampwick L60, Velvetabby L61
- name: GD placeholder `TBD_NAME_1` -> **Sable** (approved by Gary Oct 23 9:05 AM CT)
- intro: "Arlo went easy on you. That's his job. It isn't mine."
- defeat: "Huh. Arlo was right about you."
- after: "Moss is next. Don't let the gardening hat fool you."

### `trainers.aurelith.arena_3` - Battle Master Moss (tr_aurelith_arena_3)

- spot: `TODO-spot:aurelith_3_battle_master` | where (GD): ARENA Battle Master 3 | team: Plashcrown L59, Mirewump L59, Echoshell L60, Deluvane L60, Cascadorn L60, Moorcoil L62
- intro: "Everyone thinks I'm the easy one. I'm fine with that."
- defeat: "Okay. I'm the easy one today."
- after: "Edda's waiting. She's been hearing about you all the way up."

### `trainers.aurelith.arena_4` - Battle Master Edda (tr_aurelith_arena_4)

- spot: `TODO-spot:aurelith_4_battle_master` | where (GD): ARENA Battle Master 4 / head of the arena | team: Stratodrake L61, Emberseraph L61, Calderax L62, Halovy L61, Ondravel L62, Tidepony L64
- intro: "Eight coins and three Battle Masters. You've had a long day." / "One more. Then you can sit down."
- defeat: "That's the arena done. Properly done."
- after: "Come back whenever. Bring a fresh team. I'll be here."

## Signs

- `maps.aurelith.aurelith_sign`: "AURELITH\nArrivals by rail only." / "Skylift landings not permitted. By order."
- `maps.aurelith.aurelith_arena_sign`: "AURELITH ARENA\nChallengers must hold eight coins." / "No healing between Battle Masters."

## NPCs

- `maps.aurelith.aurelith_arena_doorman` (guard): text already exists in `blockers.gate_aurelith_arena / proposed arena_doorman`; World and Text Bot to align the id (see SUMMARY id-mismatch table). Not rewritten.
- `maps.aurelith.aurelith_airspace_officer` (guard): text already exists in `rail_only.npcs.airspace_officer`; World and Text Bot to align the id (see SUMMARY id-mismatch table). Not rewritten.
- `maps.aurelith.aurelith_lucky_crystal_seller` (clerk): text already exists in `unplaced_npcs.lucky_crystal_seller`; World and Text Bot to align the id (see SUMMARY id-mismatch table). Not rewritten.
- `maps.aurelith.aurelith_villager_1` (villager): "The arena's been shut since spring." / "They open it for people with eight coins. So, nobody."
- `maps.aurelith.aurelith_villager_2` (villager): "Everyone here came in on the train. Even the pigeons, I reckon."

## Shop clerk

- spot: `maps.shop_int.clerk` variant for region `aurelith` (Aurelith); World warps every town to the shared shop_int, so these need a per-region line (`TODO-spot:shop_int_clerk_aurelith`).
- greeting: "RT Supply, Aurelith. We're the only shop the train stops for." / "Feeds, remedies, crystals. What do you need?"
- regular (repeat visit): "Eight coins! I'd salute, but I'm holding a box."
- stock names used (GD shops.json): Big Remedy, Calm Tea, Clear Tea, Dominance Crystal, Feed Bag, Full Remedy, Great Remedy, High Crystal, Hush Spray, Pep Remedy, Prime Crystal, Rally Kit, Small Feed Bag, Small Remedy, Trail Mix, Vigor Seed

## Pickups (Game dev items_aurelith.json)

The "found" message is the generic system line (`You found {item}!`-style, system_items). Only hidden pickups get a nearby hint line.

- `au_fountain` (coin_pouch_small -> **a small purse**, hidden) at: plaza fountain rim | hint (inspect/sparkle text, `TODO-spot:aurelith_au_fountain_hint`): "Something glints on the fountain rim."
- `au_station` (tonic_large -> **Big Remedy**) at: station side alley
- `au_arena_steps` (energy_tonic -> **Pep Remedy**) at: arena steps planter (reachable at step 4)

- World staged its own placeholder pickups (aurelith_item_1, aurelith_item_2, aurelith_item_3); Game dev ids above should replace them. Note: World's placeholder label "Lumen Tonic" must not reach players (blocked word); use Small/Big/Pep Remedy.


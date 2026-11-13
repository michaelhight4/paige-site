# tidewater_coast: overnight text DRAFT

**DRAFT, not signed off by Gary.** Text Bot overnight worker, 2026-10-23 00:46 CT. Keys = Game dev text_ref ids (design/overnight_gd/trainers_tidewater_coast.json). Spot ids = World Design `maps.tidewater_coast.<id>` from qa/overnight_maps (staged only) where they exist, else `TODO-spot:` placeholders.
Story step: 9 (coin 6) | GD map id `tidewater_coast` | World map id `tidewater_coast`

Format: each line is one dialogue page (max 2 x 40 chars). `intro` = trainer pages, `defeat` = battle_lost (player wins), `after` = repeat talk.

## Trainers

### `trainers.tidewater_coast.a` - Reef Swimmer Merrow (tr_tidewater_coast_a)

- spot: `maps.tidewater_coast.tidewater_coast_trainer_1` | where (GD): sea lane, talk-to | team: Reefshell L41, Raywing L42
- intro: "Busy sea lane today. Two of us. Let's make it one."
- defeat: "Your lane, then."
- after: "Lanternport's down the lane. Lose the shore? Follow the lighthouse."

### `trainers.tidewater_coast.b` - Harbour Hand Neve (tr_tidewater_coast_b)

- spot: `maps.tidewater_coast.tidewater_coast_trainer_2` | where (GD): tide pools | team: Lurelamp L42, Raywing L42
- intro: "Don't step in the pools. Lurelamps live there and they've got opinions."
- defeat: "Fine. Step where you want."
- after: "The pools refill twice a day. Something new turns up every time."

### `trainers.tidewater_coast.c` - Angler Osric (tr_tidewater_coast_c)

- spot: `maps.tidewater_coast.tidewater_coast_trainer_3` | where (GD): rock arch | team: Bristlereef L43, Breakerfin L43
- intro: "Fish swim under the arch. So do challengers."
- defeat: "And the challengers win, apparently."
- after: "At low tide you can walk right through the arch. At high tide, don't."

### `trainers.tidewater_coast.d` - Birdwatcher Petra (tr_tidewater_coast_d)

- spot: `maps.tidewater_coast.tidewater_coast_trainer_4` | where (GD): sea stack | team: Sailquill L43, Cliffpuff L44
- intro: "Got out to the stack, did you? Not many bother."
- defeat: "Worth the trip, for you."
- after: "Cliffpuffs nest up top. They don't like visitors. Neither do I, usually."

### `trainers.tidewater_coast.e` - Reef Swimmer Rook (tr_tidewater_coast_e)

- spot: `maps.tidewater_coast.tidewater_coast_trainer_5` | where (GD): sea lane to Lanternport | team: Shorehound L44, Bristlereef L44
- intro: "Last stretch before Lanternport. I've been waiting all day."
- defeat: "Worth the wait. For you."
- after: "The harbour lights come on at dusk. You'll see them from here."

### `trainers.tidewater_coast.f` - Veteran Signe (tr_tidewater_coast_f)

- spot: `maps.tidewater_coast.tidewater_coast_trainer_6` | where (GD): optional grotto | team: Spinyclaw L45, Mirewump L45
- intro: "You found the grotto. Took me forty years."
- defeat: "Took you about a minute to beat me, too."
- after: "The back of the grotto's dry. Someone's left something there."

## Signs

- `maps.tidewater_coast.tidewater_coast_sign`: "TIDEWATER COAST\nWest: Lanternport. North: Coast Road." / "Check the tide board before you swim."

## NPCs

- `maps.tidewater_coast.tidewater_coast_villager_1` (villager): "The coast road's under water half the year." / "We get our post by boat. When the boat feels like it."
- `maps.tidewater_coast.tidewater_coast_lifeguard` (villager): "Swim between the flags. And not in the grotto. And not at dusk." / "Honestly, just paddle."

## Shop clerk

- spot: `maps.shop_int.clerk` variant for region `tidewater_coast` (Tidewater beach hut); World warps every town to the shared shop_int, so these need a per-region line (`TODO-spot:shop_int_clerk_tidewater_coast`).
- greeting: "Beach hut. We sell what the boat brings." / "Today that's remedies and crystals. What do you need?"
- regular (repeat visit): "Boat came in. Same stuff, slightly sandier."
- stock names used (GD shops.json): Clear Tea, Feed Bag, Great Remedy, High Crystal, Hush Spray, Pep Remedy, Rally Kit

## Pickups (Game dev items_tidewater_coast.json)

The "found" message is the generic system line (`You found {item}!`-style, system_items). Only hidden pickups get a nearby hint line.

- `tc_pools` (tonic_large -> **Big Remedy**, hidden) at: tide pool | hint (inspect/sparkle text, `TODO-spot:tidewater_coast_tc_pools_hint`): "Something glints by the tide pool."
- `tc_arch` (vigor_seed -> **Vigor Seed**) at: rock arch
- `tc_stack` (energy_tonic -> **Pep Remedy**) at: sea stack (Tideglide)
- `tc_grotto` (dominance_crystal_plus -> **Prime Crystal**) at: grotto back
- `tc_hidden_wreck` (coin_pouch_small -> **a small purse**, hidden) at: wreck | hint (inspect/sparkle text, `TODO-spot:tidewater_coast_tc_hidden_wreck_hint`): "Something glints by the wreck."
- `tc_lane` (calm_tea -> **Calm Tea**) at: sea lane islet

- World staged its own placeholder pickups (tidewater_coast_item_1, tidewater_coast_item_2, tidewater_coast_item_3, tidewater_coast_item_4, tidewater_coast_item_5, tidewater_coast_item_6); Game dev ids above should replace them. Note: World's placeholder label "Lumen Tonic" must not reach players (blocked word); use Small/Big/Pep Remedy.

## Puzzle / obstacle hints

- `TODO-spot:tidewater_coast_tide_board`: "TIDE BOARD\nLow tide: morning. High tide: dusk." / "The arch floods at high tide."


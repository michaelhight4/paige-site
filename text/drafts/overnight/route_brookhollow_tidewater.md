# route_brookhollow_tidewater: overnight text DRAFT

**DRAFT, not signed off by Gary.** Text Bot overnight worker, 2026-10-23 00:46 CT. Keys = Game dev text_ref ids (design/overnight_gd/trainers_route_brookhollow_tidewater.json). Spot ids = World Design `maps.route_coast.<id>` from qa/overnight_maps (staged only) where they exist, else `TODO-spot:` placeholders.
Story step: 9 | GD map id `route_brookhollow_tidewater` | World map id `route_coast`

Format: each line is one dialogue page (max 2 x 40 chars). `intro` = trainer pages, `defeat` = battle_lost (player wins), `after` = repeat talk.

## Trainers

### `trainers.route_brookhollow_tidewater.a` - Reef Swimmer Gwen (tr_route_brookhollow_tidewater_a)

- spot: `maps.route_coast.route_coast_trainer_1` | where (GD): floodwater (Tideglide), talk-to | team: Downpaw L39, Driftknot L39
- intro: "Floodwater's warmer than you'd think. Battle in it?"
- defeat: "Back in the water for me."
- after: "The coast road floods every spring. This year it didn't stop."

### `trainers.route_brookhollow_tidewater.b` - Harbour Hand Heath (tr_route_brookhollow_tidewater_b)

- spot: `maps.route_coast.route_coast_trainer_2` | where (GD): seawall | team: Drenchcrab L40, Downpaw L40
- intro: "This seawall's mine till six. Then it's the sea's."
- defeat: "It's yours till six, then."
- after: "When the tide comes over, get off the wall. I mean it."

### `trainers.route_brookhollow_tidewater.c` - Birdwatcher Ines (tr_route_brookhollow_tidewater_c)

- spot: `maps.route_coast.route_coast_trainer_3` | where (GD): cliff path | team: Sailquill L40, Reedcrane L41
- intro: "Cliff path, cliff birds, cliff battle. Mind the edge."
- defeat: "I should've minded my own edge."
- after: "Cranes nest under the overhang. Look, don't touch."

### `trainers.route_brookhollow_tidewater.d` - Angler Jarrah (tr_route_brookhollow_tidewater_d)

- spot: `maps.route_coast.route_coast_trainer_4` | where (GD): jetty | team: Tundrarch L40, Mirewump L41, Surfskipper L41
- intro: "This jetty's got three good spots. I'm using all of them."
- defeat: "Have one. Have two."
- after: "Surfskippers jump the waves at high tide. Fun to watch. Hard to catch."

### `trainers.route_brookhollow_tidewater.e` - Skater Kestrel (tr_route_brookhollow_tidewater_e)

- spot: `maps.route_coast.route_coast_trainer_5` | where (GD): seawall bike rail | team: Galepetrel L42, Sunbasilisk L42
- intro: "I've ridden this seawall rail a hundred times. Fallen off ninety."
- defeat: "Ninety-one."
- after: "The rail's quicker than the wall path. Wetter, too."

### `trainers.route_brookhollow_tidewater.f` - Reef Swimmer Linnet (tr_route_brookhollow_tidewater_f)

- spot: `maps.route_coast.route_coast_trainer_6` | where (GD): floodwater, optional | team: Coilarch L42, Galepetrel L43
- intro: "You swam all the way out here? Then you can battle."
- defeat: "And swim back. Good luck."
- after: "There's a hut roof past the reeds. Someone left something on it."

## Signs

- `maps.route_coast.route_coast_sign`: "COAST ROAD\nFloods in storm season." / "North: East Road. South: Tidewater Coast."

## Pickups (Game dev items_route_brookhollow_tidewater.json)

The "found" message is the generic system line (`You found {item}!`-style, system_items). Only hidden pickups get a nearby hint line.

- `ct_seawall` (tonic_large -> **Big Remedy**) at: seawall steps
- `ct_flood_roof` (vigor_seed -> **Vigor Seed**) at: flooded hut roof (Tideglide)
- `ct_jetty` (dominance_crystal_plus -> **Prime Crystal**) at: jetty
- `ct_hidden_dune` (energy_tonic -> **Pep Remedy**, hidden) at: dune grass | hint (inspect/sparkle text, `TODO-spot:route_coast_ct_hidden_dune_hint`): "Something glints by the dune grass."
- `ct_cliff` (calm_tea -> **Calm Tea**) at: cliff path
- `ct_hidden_buoy` (coin_pouch_small -> **a small purse**, hidden) at: beached buoy | hint (inspect/sparkle text, `TODO-spot:route_coast_ct_hidden_buoy_hint`): "Something glints by the beached buoy."

- World staged its own placeholder pickups (route_coast_pocket_1, route_coast_item_1, route_coast_item_2, route_coast_item_3, route_coast_item_4, route_coast_item_5); Game dev ids above should replace them. Note: World's placeholder label "Lumen Tonic" must not reach players (blocked word); use Small/Big/Pep Remedy.

## Puzzle / obstacle hints

- `maps.route_coast.route_coast_brush_pocket_1`: "Thick brush, knotted tight. Something's behind it." / "A creature with Brushbreak could clear it."
- story gates on this map (gate_coast_road_flood): text already in `blockers.*` (overworld_lines.json); not duplicated.


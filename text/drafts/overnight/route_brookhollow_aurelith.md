# route_brookhollow_aurelith: overnight text DRAFT

**DRAFT, not signed off by Gary.** Text Bot overnight worker, 2026-10-23 00:46 CT. Keys = Game dev text_ref ids (design/overnight_gd/trainers_route_brookhollow_aurelith.json). Spot ids = World Design `maps.route_east.<id>` from qa/overnight_maps (staged only) where they exist, else `TODO-spot:` placeholders.
Story step: 4 | GD map id `route_brookhollow_aurelith` | World map id `route_east`

Format: each line is one dialogue page (max 2 x 40 chars). `intro` = trainer pages, `defeat` = battle_lost (player wins), `after` = repeat talk.

## Trainers

### `trainers.route_brookhollow_aurelith.a` - Courier Hollis (tr_route_brookhollow_aurelith_a)

- spot: `maps.route_east.route_east_trainer_1` | where (GD): by the bridge road, first trainer past the RT gate | team: Sailquill L13, Flockpup L13
- intro: "I've got a parcel due in Aurelith and five minutes. Quick one?"
- defeat: "Late now. Thanks for that."
- after: "Aurelith's past the bluff. Rail only, so don't try flying in."

### `trainers.route_brookhollow_aurelith.b` - Angler Rue (tr_route_brookhollow_aurelith_b)

- spot: `maps.route_east.route_east_trainer_2` | where (GD): on the river bank (sees the bridge) | team: Ditchsnap L13, Pondkin L14, Puddlenip L15
- intro: "You walked right through my cast. Round here that's a battle."
- defeat: "And now the fish are gone too."
- after: "Ditchsnaps bite near the bridge. Literally. Mind your fingers."

### `trainers.route_brookhollow_aurelith.c` - Trail Kid Bram (tr_route_brookhollow_aurelith_c)

- spot: `maps.route_east.route_east_trainer_3` | where (GD): grass patch | team: Burlbeetle L14, Gloamtick L14
- intro: "I found two creatures in this grass. Want to see them? You're seeing them."
- defeat: "That's okay. They're still my favourites."
- after: "Wade through the tall bit and you'll find more. And ticks."

### `trainers.route_brookhollow_aurelith.d` - Skater Tilly (tr_route_brookhollow_aurelith_d)

- spot: `maps.route_east.route_east_trainer_4` | where (GD): downhill bluff (later bike ramps) | team: Millwhirl L15, Sailquill L16
- intro: "This slope's perfect for wheels. Shame I've only got feet today."
- defeat: "Fine. I'll go back to falling off things."
- after: "With a bike you could take those ramps. Probably. Wear a helmet."

### `trainers.route_brookhollow_aurelith.e` - Field Worker Cass (tr_route_brookhollow_aurelith_e)

- spot: `maps.route_east.route_east_trainer_5` | where (GD): road works near the Aurelith bluff | team: Bleatling L16, Loamworm L16
- intro: "Road's closed for works. Well. I'm on break. Battle?"
- defeat: "Break's over, then."
- after: "We're widening it for Revival Tech trucks. Nobody's said why."

### `trainers.route_brookhollow_aurelith.f` - Birdwatcher Juno (tr_route_brookhollow_aurelith_f)

- spot: `maps.route_east.route_east_trainer_6` | where (GD): optional, behind a ledge | team: Sailquill L15, Crowkin L17
- intro: "Shh. I've watched a Crowkin nest for an hour. Now you're here."
- defeat: "It flew off anyway. Great."
- after: "You only get back here off the ledge. Nobody checks back here."

## Signs

- `maps.route_east.route_east_sign`: "EAST ROAD\nAhead: Aurelith (arrivals by rail only)." / "South: the coast road to Tidewater."

## Pickups (Game dev items_route_brookhollow_aurelith.json)

The "found" message is the generic system line (`You found {item}!`-style, system_items). Only hidden pickups get a nearby hint line.

- `re_bridge` (tonic_small -> **Small Remedy**) at: under the bridge abutment
- `re_ledge` (dominance_crystal -> **Dominance Crystal**) at: behind first ledge
- `re_hidden_grass` (calm_tea -> **Calm Tea**, hidden) at: last tile of the grass patch | hint (inspect/sparkle text, `TODO-spot:route_east_re_hidden_grass_hint`): "Something glints at the far end of the grass."
- `re_bluff` (feed_bag -> **Feed Bag**) at: top of the bluff
- `re_hidden_post` (coin_pouch_small -> **a small purse**, hidden) at: by the mile post | hint (inspect/sparkle text, `TODO-spot:route_east_re_hidden_post_hint`): "Something glints by the mile post."
- `re_ramp` (vigor_seed -> **Vigor Seed**) at: bike ramp chain landing (revisit with bike)

- World staged its own placeholder pickups (route_east_pocket_1, route_east_pocket_2, route_east_item_1, route_east_item_2, route_east_item_3, route_east_item_4); Game dev ids above should replace them. Note: World's placeholder label "Lumen Tonic" must not reach players (blocked word); use Small/Big/Pep Remedy.

## Puzzle / obstacle hints

- `maps.route_east.route_east_brush_pocket_1`: "Thick brush, knotted tight. Something's behind it." / "A creature with Brushbreak could clear it."
- `maps.route_east.route_east_boulder_pocket_2`: "A heavy boulder with a gap behind it." / "A creature with Stonebreak could shift it."


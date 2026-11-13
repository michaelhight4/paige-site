# route_saltmere_aurelith: overnight text DRAFT

**DRAFT, not signed off by Gary.** Text Bot overnight worker, 2026-10-23 00:46 CT. Keys = Game dev text_ref ids (design/overnight_gd/trainers_route_saltmere_aurelith.json). Spot ids = World Design `maps.route_aurelith_saltmere.<id>` from qa/overnight_maps (staged only) where they exist, else `TODO-spot:` placeholders.
Story step: 4-5 | GD map id `route_saltmere_aurelith` | World map id `route_aurelith_saltmere`

Format: each line is one dialogue page (max 2 x 40 chars). `intro` = trainer pages, `defeat` = battle_lost (player wins), `after` = repeat talk.

## Trainers

### `trainers.route_saltmere_aurelith.a` - Harbour Hand Ferris (tr_route_saltmere_aurelith_a)

- spot: `maps.route_aurelith_saltmere.route_aurelith_saltmere_trainer_1` | where (GD): salt-pan path | team: Pinchkin L16, Brinepipit L17
- intro: "Salt in my boots, salt in my hair. Might as well battle."
- defeat: "Salt in the wound, now."
- after: "Saltmere's down the long road. The harbour smells like work."

### `trainers.route_saltmere_aurelith.b` - Birdwatcher Gil (tr_route_saltmere_aurelith_b)

- spot: `maps.route_aurelith_saltmere.route_aurelith_saltmere_trainer_2` | where (GD): dune lookout | team: Sailquill L17, Brinepipit L17
- intro: "From up here I see everyone coming. I saw you an hour ago."
- defeat: "Should've used that hour to get ready."
- after: "Brinepipits nest in the dune grass. Step light."

### `trainers.route_saltmere_aurelith.c` - Angler Hana (tr_route_saltmere_aurelith_c)

- spot: `maps.route_aurelith_saltmere.route_aurelith_saltmere_trainer_3` | where (GD): tidal creek footbridge | team: Blubbet L17, Sandstarlet L17
- intro: "Hang on, my line's caught. Battle while I wait?"
- defeat: "Still caught. Brilliant."
- after: "The creek fills at high tide. The footbridge doesn't care either way."

### `trainers.route_saltmere_aurelith.d` - Camper Iska (tr_route_saltmere_aurelith_d)

- spot: `maps.route_aurelith_saltmere.route_aurelith_saltmere_trainer_4` | where (GD): dune grass | team: Burlbeetle L16, Moatling L16, Grainling L18
- intro: "My tent blew over twice today. I need a win."
- defeat: "Third time, then."
- after: "Camping past the dunes? Bring pegs. Lots of pegs."

### `trainers.route_saltmere_aurelith.e` - Courier Jem (tr_route_saltmere_aurelith_e)

- spot: `maps.route_aurelith_saltmere.route_aurelith_saltmere_trainer_5` | where (GD): long straight before Saltmere | team: Tinderwren L18, Sailquill L18
- intro: "Last stretch before Saltmere. I've run it a hundred times. Battle me."
- defeat: "My route times are going to be awful this week."
- after: "Revival Tech cut half the courier routes. The rest of us run faster."

### `trainers.route_saltmere_aurelith.f` - Veteran Kerr (tr_route_saltmere_aurelith_f)

- spot: `maps.route_aurelith_saltmere.route_aurelith_saltmere_trainer_6` | where (GD): optional, hidden cove; tough | team: Whelkin L19, Sandstarlet L19
- intro: "Not many find this cove. Fewer leave it happy."
- defeat: "You'll leave happy, then. Fair enough."
- after: "Whatever's washed up in here, take it. I've no use for it."

## Signs

- `maps.route_aurelith_saltmere.route_aurelith_saltmere_sign`: "SALT ROAD\nWest: Aurelith. East: Saltmere." / "Mind the salt pans. They're slippery."

## Pickups (Game dev items_route_saltmere_aurelith.json)

The "found" message is the generic system line (`You found {item}!`-style, system_items). Only hidden pickups get a nearby hint line.

- `sa_salt_pan` (crystal_dust -> **Crystal Dust**, hidden) at: salt pan crust | hint (inspect/sparkle text, `TODO-spot:route_aurelith_saltmere_sa_salt_pan_hint`): "Something glints under the salt crust."
- `sa_dune` (tonic_small -> **Small Remedy**) at: dune top
- `sa_cove` (tonic_large -> **Big Remedy**) at: hidden cove (veteran guards)
- `sa_footbridge` (dominance_crystal -> **Dominance Crystal**) at: footbridge end
- `sa_hidden_post` (feed_bag -> **Feed Bag**, hidden) at: old signpost | hint (inspect/sparkle text, `TODO-spot:route_aurelith_saltmere_sa_hidden_post_hint`): "Something glints by the old signpost."

- World staged its own placeholder pickups (route_aurelith_saltmere_pocket_1, route_aurelith_saltmere_item_1, route_aurelith_saltmere_item_2, route_aurelith_saltmere_item_3, route_aurelith_saltmere_item_4); Game dev ids above should replace them. Note: World's placeholder label "Lumen Tonic" must not reach players (blocked word); use Small/Big/Pep Remedy.

## Puzzle / obstacle hints

- `maps.route_aurelith_saltmere.route_aurelith_saltmere_brush_pocket_1`: "Thick brush, knotted tight. Something's behind it." / "A creature with Brushbreak could clear it."


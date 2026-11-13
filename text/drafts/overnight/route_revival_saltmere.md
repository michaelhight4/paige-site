# route_revival_saltmere: overnight text DRAFT

**DRAFT, not signed off by Gary.** Text Bot overnight worker, 2026-10-23 00:46 CT. Keys = Game dev text_ref ids (design/overnight_gd/trainers_route_revival_saltmere.json). Spot ids = World Design `maps.route_revival_saltmere.<id>` from qa/overnight_maps (staged only) where they exist, else `TODO-spot:` placeholders.
Story step: after coin 3 | GD map id `route_revival_saltmere` | World map id `route_revival_saltmere`

Format: each line is one dialogue page (max 2 x 40 chars). `intro` = trainer pages, `defeat` = battle_lost (player wins), `after` = repeat talk.

## Trainers

### `trainers.route_revival_saltmere.a` - Field Worker Garrick (tr_route_revival_saltmere_a)

- spot: `maps.route_revival_saltmere.route_revival_saltmere_trainer_1` | where (GD): checkpoint road | team: Slagrook L27, Shalekin L28
- name: GD placeholder `TBD_NAME_4` -> proposed **Garrick** (Gary to approve)
- intro: "Checkpoint road. I check things. Let me check you."
- defeat: "Checked. You pass."
- after: "Saltmere's south. The air gets saltier every step."

### `trainers.route_revival_saltmere.b` - Courier Una (tr_route_revival_saltmere_b)

- spot: `maps.route_revival_saltmere.route_revival_saltmere_trainer_2` | where (GD): bike lane | team: Sailquill L28, Kindlepup L28
- intro: "Three letters, two parcels, no time. Make it quick."
- defeat: "Quick. Just not how I wanted."
- after: "The bike lane runs the whole way. Lucky you, if you've got wheels."

### `trainers.route_revival_saltmere.c` - Harbour Hand Vale (tr_route_revival_saltmere_c)

- spot: `maps.route_revival_saltmere.route_revival_saltmere_trainer_3` | where (GD): salt flats | team: Spiralith L28, Bulwarkrab L29
- intro: "Out on the flats there's nowhere to hide. Good for battling."
- defeat: "Nowhere to hide from that either."
- after: "The salt crust cracks if you stamp. Things turn up under it."

### `trainers.route_revival_saltmere.d` - Veteran Wynn (tr_route_revival_saltmere_d)

- spot: `maps.route_revival_saltmere.route_revival_saltmere_trainer_4` | where (GD): optional | team: Prismite L29, Scutadillo L30
- intro: "Thirty years I've battled on this road. Show me something new."
- defeat: "That was new. Thank you."
- after: "Keep your team rested. Pride doesn't heal anything."

## Signs

- `maps.route_revival_saltmere.route_revival_saltmere_sign`: "CHECKPOINT ROAD\nNorth: Revival Heights. South: Saltmere." / "Bike lane on the left. Walkers, stay right."

## Pickups (Game dev items_route_revival_saltmere.json)

The "found" message is the generic system line (`You found {item}!`-style, system_items). Only hidden pickups get a nearby hint line.

- `rs_checkpoint` (tonic_large -> **Big Remedy**) at: checkpoint bench
- `rs_flats` (crystal_dust -> **Crystal Dust**, hidden) at: salt flat | hint (inspect/sparkle text, `TODO-spot:route_revival_saltmere_rs_flats_hint`): "Something glints by the salt flat."
- `rs_hidden` (vigor_seed -> **Vigor Seed**, hidden) at: lone post | hint (inspect/sparkle text, `TODO-spot:route_revival_saltmere_rs_hidden_hint`): "Something glints by the lone post."

- World staged its own placeholder pickups (route_revival_saltmere_pocket_1, route_revival_saltmere_item_1, route_revival_saltmere_item_2); Game dev ids above should replace them. Note: World's placeholder label "Lumen Tonic" must not reach players (blocked word); use Small/Big/Pep Remedy.

## Puzzle / obstacle hints

- `maps.route_revival_saltmere.route_revival_saltmere_brush_pocket_1`: "Thick brush, knotted tight. Something's behind it." / "A creature with Brushbreak could clear it."


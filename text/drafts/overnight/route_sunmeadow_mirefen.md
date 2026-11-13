# route_sunmeadow_mirefen: overnight text DRAFT

**DRAFT, not signed off by Gary.** Text Bot overnight worker, 2026-10-23 00:46 CT. Keys = Game dev text_ref ids (design/overnight_gd/trainers_route_sunmeadow_mirefen.json). Spot ids = World Design `maps.route_sunmeadow_mirefen.<id>` from qa/overnight_maps (staged only) where they exist, else `TODO-spot:` placeholders.
Story step: 8 | GD map id `route_sunmeadow_mirefen` | World map id `route_sunmeadow_mirefen`

Format: each line is one dialogue page (max 2 x 40 chars). `intro` = trainer pages, `defeat` = battle_lost (player wins), `after` = repeat talk.

## Trainers

### `trainers.route_sunmeadow_mirefen.a` - Angler Ross (tr_route_sunmeadow_mirefen_a)

- spot: `maps.route_sunmeadow_mirefen.route_sunmeadow_mirefen_trainer_1` | where (GD): reed pond | team: Dewbell L33, Floepaddle L34
- intro: "Nothing's biting. Maybe you will."
- defeat: "You bit. Hard."
- after: "This pond drains into the bog. Everything ends up in Mirefen."

### `trainers.route_sunmeadow_mirefen.b` - Bog Walker Saffi (tr_route_sunmeadow_mirefen_b)

- spot: `maps.route_sunmeadow_mirefen.route_sunmeadow_mirefen_trainer_2` | where (GD): fog bank | team: Gloamtick L34, Snapmoor L34
- intro: "Out here the reeds hide everything. Except you."
- defeat: "Back into the reeds for me."
- after: "Stick to the boardwalk past here. The ground lies about being ground."

### `trainers.route_sunmeadow_mirefen.c` - Beetle Keeper Tobin (tr_route_sunmeadow_mirefen_c)

- spot: `maps.route_sunmeadow_mirefen.route_sunmeadow_mirefen_trainer_3` | where (GD): rotting fence | team: Burlbeetle L34, Sunspeckle L35
- intro: "This fence is mostly beetles now. I'm proud of it."
- defeat: "The fence still stands. So do I. Just."
- after: "Sunspeckles only come out at noon. Bring patience."

### `trainers.route_sunmeadow_mirefen.d` - Ranger Ulla (tr_route_sunmeadow_mirefen_d)

- spot: `maps.route_sunmeadow_mirefen.route_sunmeadow_mirefen_trainer_4` | where (GD): boardwalk start | team: Reedmoot L35, Plainhorn L35
- intro: "The boardwalk starts here. So does my patrol. Ready?"
- defeat: "Patrol's going well, then."
- after: "Planks marked red are rotten. I painted them. You're welcome."

### `trainers.route_sunmeadow_mirefen.e` - Camper Vic (tr_route_sunmeadow_mirefen_e)

- spot: `maps.route_sunmeadow_mirefen.route_sunmeadow_mirefen_trainer_5` | where (GD): optional | team: Heliobloom L35, Rimewyrm L36
- intro: "Camping next to a bog. My friends said it'd be fun."
- defeat: "It's not. Neither was that."
- after: "Frogs at night? Fine. No frogs at night? Worry."

## Signs

- `maps.route_sunmeadow_mirefen.route_sunmeadow_mirefen_sign`: "REED ROAD\nEast: Mirefen. West: Sunmeadow Fields." / "Boardwalk ahead. Red planks are rotten."

## Pickups (Game dev items_route_sunmeadow_mirefen.json)

The "found" message is the generic system line (`You found {item}!`-style, system_items). Only hidden pickups get a nearby hint line.

- `smm_pond` (calm_tea -> **Calm Tea**) at: pond jetty
- `smm_fence` (tonic_large -> **Big Remedy**, hidden) at: fence post | hint (inspect/sparkle text, `TODO-spot:route_sunmeadow_mirefen_smm_fence_hint`): "Something glints by the fence post."
- `smm_boardwalk` (dominance_crystal_plus -> **Prime Crystal**) at: boardwalk end
- `smm_hidden` (vigor_seed -> **Vigor Seed**, hidden) at: reed tuft | hint (inspect/sparkle text, `TODO-spot:route_sunmeadow_mirefen_smm_hidden_hint`): "Something glints by the reed tuft."

- World staged its own placeholder pickups (route_sunmeadow_mirefen_pocket_1, route_sunmeadow_mirefen_item_1, route_sunmeadow_mirefen_item_2, route_sunmeadow_mirefen_item_3); Game dev ids above should replace them. Note: World's placeholder label "Lumen Tonic" must not reach players (blocked word); use Small/Big/Pep Remedy.

## Puzzle / obstacle hints

- `maps.route_sunmeadow_mirefen.route_sunmeadow_mirefen_water_pocket_1`: "Deep, still water. There's dry ground on the far side." / "Tideglide would get you across."


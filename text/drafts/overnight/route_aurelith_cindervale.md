# route_aurelith_cindervale: overnight text DRAFT

**DRAFT, not signed off by Gary.** Text Bot overnight worker, 2026-10-23 00:46 CT. Keys = Game dev text_ref ids (design/overnight_gd/trainers_route_aurelith_cindervale.json). Spot ids = World Design `maps.route_cindervale.<id>` from qa/overnight_maps (staged only) where they exist, else `TODO-spot:` placeholders.
Story step: 11 | GD map id `route_aurelith_cindervale` | World map id `route_cindervale`

Format: each line is one dialogue page (max 2 x 40 chars). `intro` = trainer pages, `defeat` = battle_lost (player wins), `after` = repeat talk.

## Trainers

### `trainers.route_aurelith_cindervale.a` - Smith Yolo (tr_route_aurelith_cindervale_a)

- spot: `maps.route_cindervale.route_cindervale_trainer_1` | where (GD): where the giant slept | team: Slagrook L47, Clinkerback L47
- intro: "A giant slept here for years. Left a dent the size of a house."
- defeat: "Now there's a dent in me, too."
- after: "The horn woke it. Nobody's sure where it went. Nobody's asking."

### `trainers.route_aurelith_cindervale.b` - Hillwalker Zinnia (tr_route_aurelith_cindervale_b)

- spot: `maps.route_cindervale.route_cindervale_trainer_2` | where (GD): ash slope | team: Dormagnus L48, Geysirox L48
- intro: "Ash in my boots, ash in my lunch. Battle me before I give up."
- defeat: "I give up. On today."
- after: "Geysirox vents go off without warning. Stand upwind."

### `trainers.route_aurelith_cindervale.c` - Field Researcher Pip (tr_route_aurelith_cindervale_c)

- spot: `maps.route_cindervale.route_cindervale_trainer_3` | where (GD): vent survey | team: Calderock L48, Scorchkite L49
- intro: "I'm measuring the vents. Let's see if you measure up."
- defeat: "You measure up fine."
- after: "The vents run hotter every month. The company says that's normal."

### `trainers.route_aurelith_cindervale.d` - Climber Tam (tr_route_aurelith_cindervale_d)

- spot: `maps.route_cindervale.route_cindervale_trainer_4` | where (GD): basalt steps | team: Emberbrock L49, Slagrook L49
- intro: "Lava made these steps, not people. They're uneven. So am I."
- defeat: "Very uneven, apparently."
- after: "Cindervale's at the bottom. Hold the rail on the way down."

### `trainers.route_aurelith_cindervale.e` - Smith Wren (tr_route_aurelith_cindervale_e)

- spot: `maps.route_cindervale.route_cindervale_trainer_5` | where (GD): forge outpost | team: Obsidiax L50, Emberbrock L50
- intro: "Outpost forge. I make tools and lose battles. Let's test the second one."
- defeat: "Test passed. Or failed. Depends who's asking."
- after: "The forges in town have run for three hundred years. Never this busy."

### `trainers.route_aurelith_cindervale.f` - Veteran Odo (tr_route_aurelith_cindervale_f)

- spot: `maps.route_cindervale.route_cindervale_trainer_6` | where (GD): optional lava tube | team: Tidepony L51, Slagrook L51
- intro: "The tube's cooler than outside. That's not saying much."
- defeat: "Cool enough to lose in, anyway."
- after: "There's a ledge at the end of the tube. Something's glinting on it."

## Signs

- `maps.route_cindervale.route_cindervale_sign`: "EMBER ROAD\nNorth: Aurelith. South: Cindervale." / "Vents are hot. Don't stand on them."

## Pickups (Game dev items_route_aurelith_cindervale.json)

The "found" message is the generic system line (`You found {item}!`-style, system_items). Only hidden pickups get a nearby hint line.

- `ac_giant` (energy_tonic -> **Pep Remedy**) at: where the giant slept
- `ac_slope` (tonic_large -> **Big Remedy**, hidden) at: ash slope | hint (inspect/sparkle text, `TODO-spot:route_cindervale_ac_slope_hint`): "Something glints by the ash slope."
- `ac_tube` (vigor_seed -> **Vigor Seed**) at: lava tube end
- `ac_outpost` (dominance_crystal_plus -> **Prime Crystal**) at: forge outpost
- `ac_hidden_vent` (coin_pouch_small -> **a small purse**, hidden) at: cold vent | hint (inspect/sparkle text, `TODO-spot:route_cindervale_ac_hidden_vent_hint`): "Something glints by the cold vent."

- World staged its own placeholder pickups (route_cindervale_pocket_1, route_cindervale_item_1, route_cindervale_item_2, route_cindervale_item_3, route_cindervale_item_4); Game dev ids above should replace them. Note: World's placeholder label "Lumen Tonic" must not reach players (blocked word); use Small/Big/Pep Remedy.

## Puzzle / obstacle hints

- `maps.route_cindervale.route_cindervale_boulder_pocket_1`: "A heavy boulder with a gap behind it." / "A creature with Stonebreak could shift it."
- `TODO-spot:route_aurelith_cindervale_giant_hollow`: "A dent in the ground the size of a house." / "It's still warm."
- story gates on this map (gate_cindervale_giant): text already in `blockers.*` (overworld_lines.json); not duplicated.


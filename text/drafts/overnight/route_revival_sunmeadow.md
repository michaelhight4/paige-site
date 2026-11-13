# route_revival_sunmeadow: overnight text DRAFT

**DRAFT, not signed off by Gary.** Text Bot overnight worker, 2026-10-23 00:46 CT. Keys = Game dev text_ref ids (design/overnight_gd/trainers_route_revival_sunmeadow.json). Spot ids = World Design `maps.route_revival_sunmeadow.<id>` from qa/overnight_maps (staged only) where they exist, else `TODO-spot:` placeholders.
Story step: 8 (alt entry) | GD map id `route_revival_sunmeadow` | World map id `route_revival_sunmeadow`

Format: each line is one dialogue page (max 2 x 40 chars). `intro` = trainer pages, `defeat` = battle_lost (player wins), `after` = repeat talk.

## Trainers

### `trainers.route_revival_sunmeadow.a` - Field Researcher Nash (tr_route_revival_sunmeadow_a)

- spot: `maps.route_revival_sunmeadow.route_revival_sunmeadow_trainer_1` | where (GD): crystal field edge | team: Seraphawk L32, Halovy L33
- intro: "These crystals were humming last year. Now they barely glow."
- defeat: "Neither do I, after that."
- after: "The company logs this field every week. Same numbers, only lower."

### `trainers.route_revival_sunmeadow.b` - Field Worker Oona (tr_route_revival_sunmeadow_b)

- spot: `maps.route_revival_sunmeadow.route_revival_sunmeadow_trainer_2` | where (GD): RT crystal survey rig | team: Slagrook L33, Spinemonitor L33
- intro: "This rig cost more than my house. Battle away from it, please."
- defeat: "Rig's fine. My pride isn't."
- after: "The readings go to Head Office. Nobody tells us what they mean."

### `trainers.route_revival_sunmeadow.c` - Scholar Piers (tr_route_revival_sunmeadow_c)

- spot: `maps.route_revival_sunmeadow.route_revival_sunmeadow_trainer_3` | where (GD): optional | team: Shardhart L34, Quartzhopper L34
- intro: "I'm writing a paper on Shardharts. You can be a footnote."
- defeat: "You're a whole chapter now."
- after: "Quartzhoppers hop toward light. Bring a lamp and they'll follow you."

## Signs

- `maps.route_revival_sunmeadow.route_revival_sunmeadow_sign`: "NORTH ROAD\nNorth: Sunmeadow Fields." / "South: Revival Heights."

## Pickups (Game dev items_route_revival_sunmeadow.json)

The "found" message is the generic system line (`You found {item}!`-style, system_items). Only hidden pickups get a nearby hint line.

- `rsf_rig` (energy_tonic -> **Pep Remedy**) at: survey rig
- `rsf_hidden` (crystal_dust -> **Crystal Dust**, hidden) at: dim crystal stub | hint (inspect/sparkle text, `TODO-spot:route_revival_sunmeadow_rsf_hidden_hint`): "Something glints by the dim crystal stub."

- World staged its own placeholder pickups (route_revival_sunmeadow_pocket_1, route_revival_sunmeadow_item_1); Game dev ids above should replace them. Note: World's placeholder label "Lumen Tonic" must not reach players (blocked word); use Small/Big/Pep Remedy.

## Puzzle / obstacle hints

- `maps.route_revival_sunmeadow.route_revival_sunmeadow_brush_pocket_1`: "Thick brush, knotted tight. Something's behind it." / "A creature with Brushbreak could clear it."
- story gates on this map (gate_sunmeadow_north): text already in `blockers.*` (overworld_lines.json); not duplicated.


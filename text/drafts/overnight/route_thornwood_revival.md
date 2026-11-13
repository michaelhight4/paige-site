# route_thornwood_revival: overnight text DRAFT

**DRAFT, not signed off by Gary.** Text Bot overnight worker, 2026-10-23 00:46 CT. Keys = Game dev text_ref ids (design/overnight_gd/trainers_route_thornwood_revival.json). Spot ids = World Design `maps.route_revival.<id>` from qa/overnight_maps (staged only) where they exist, else `TODO-spot:` placeholders.
Story step: 6 | GD map id `route_thornwood_revival` | World map id `route_revival`

Format: each line is one dialogue page (max 2 x 40 chars). `intro` = trainer pages, `defeat` = battle_lost (player wins), `after` = repeat talk.

## Trainers

### `trainers.route_thornwood_revival.a` - Ranger Lark (tr_route_thornwood_revival_a)

- spot: `maps.route_revival.route_revival_trainer_1` | where (GD): just past the fallen log | team: Scutadillo L21, Topiarix L22
- intro: "That log took the council a month to move. I'll take less."
- defeat: "Took less, all right."
- after: "Revival Heights is east. You'll see the HQ before you see the town."

### `trainers.route_thornwood_revival.b` - Field Researcher Mabry (tr_route_thornwood_revival_b)

- spot: `maps.route_revival.route_revival_trainer_2` | where (GD): survey stakes in the grass | team: Halovy L22, Prismwing L22
- intro: "Careful, those stakes are measured to the centimetre. Stand still."
- defeat: "And now one's moved. Lovely."
- after: "Revival Tech's surveying this whole field. Nobody's said what for."

### `trainers.route_thornwood_revival.c` - Beetle Keeper Nico (tr_route_thornwood_revival_c)

- spot: `maps.route_revival.route_revival_trainer_3` | where (GD): tree line | team: Burlbeetle L21, Chiselbug L22, Prismwing L23
- intro: "Three beetles, one jar of patience. Ready?"
- defeat: "Patience: gone. Beetles: tired."
- after: "Chiselbugs chew through fence posts. The farmers love me."

### `trainers.route_thornwood_revival.d` - Rail Worker Orla (tr_route_thornwood_revival_d)

- spot: `maps.route_revival.route_revival_trainer_4` | where (GD): Lumen Line track side | team: Slagrook L23, Moatling L23
- intro: "No standing on the Lumen Line. Battle off the track, please."
- defeat: "Good. Now stay off the track."
- after: "Trains run every half hour. You'll hear them before you see them."

### `trainers.route_thornwood_revival.e` - Courier Penn (tr_route_thornwood_revival_e)

- spot: `maps.route_revival.route_revival_trainer_5` | where (GD): bike lane | team: Sailquill L23, Kindlepup L24
- intro: "This is the bike lane. You're on foot. Let's settle it."
- defeat: "Fine. Walk where you like."
- after: "With a bike this road takes ten minutes. Without, an hour."

### `trainers.route_thornwood_revival.f` - Scholar Ambrose (tr_route_thornwood_revival_f)

- spot: `maps.route_revival.route_revival_trainer_6` | where (GD): stone circle, optional | team: Reverion L24, Cogwhisk L25
- name: GD placeholder `TBD_NAME_2` -> proposed **Ambrose** (Gary to approve)
- intro: "These stones are older than the company. Older than the town."
- defeat: "The stones won't remember this. I will."
- after: "People say the circle hums at night. It's the wind. Mostly."

### `trainers.route_thornwood_revival.g` - Field Worker Rhea (tr_route_thornwood_revival_g)

- spot: `maps.route_revival.route_revival_trainer_7` | where (GD): RT survey gate before Revival Heights | team: Ankerling L24, Brinecube L25
- intro: "Survey gate. I'm meant to check IDs. Battle instead?"
- defeat: "You're through. Don't tell my supervisor."
- after: "Revival Heights is just past here. Smile for the cameras."

## Signs

- `maps.route_revival.route_revival_sign`: "HEIGHTS ROAD\nEast: Revival Heights." / "West: Thornwood. Keep off the Lumen Line."

## Pickups (Game dev items_route_thornwood_revival.json)

The "found" message is the generic system line (`You found {item}!`-style, system_items). Only hidden pickups get a nearby hint line.

- `tr_log` (tonic_large -> **Big Remedy**) at: past the fallen log
- `tr_stakes` (crystal_dust -> **Crystal Dust**, hidden) at: survey stake | hint (inspect/sparkle text, `TODO-spot:route_revival_tr_stakes_hint`): "Something glints by the survey stake."
- `tr_track` (energy_tonic -> **Pep Remedy**) at: track side shed
- `tr_circle` (vigor_seed -> **Vigor Seed**, hidden) at: stone circle centre | hint (inspect/sparkle text, `TODO-spot:route_revival_tr_circle_hint`): "Something glints in the middle of the stones."
- `tr_gate` (dominance_crystal_plus -> **Prime Crystal**) at: survey gate bench
- `tr_hidden_tree` (coin_pouch_small -> **a small purse**, hidden) at: lone tree | hint (inspect/sparkle text, `TODO-spot:route_revival_tr_hidden_tree_hint`): "Something glints by the lone tree."

- World staged its own placeholder pickups (route_revival_pocket_1, route_revival_pocket_2, route_revival_item_1, route_revival_item_2, route_revival_item_3, route_revival_item_4); Game dev ids above should replace them. Note: World's placeholder label "Lumen Tonic" must not reach players (blocked word); use Small/Big/Pep Remedy.

## Puzzle / obstacle hints

- `maps.route_revival.route_revival_boulder_pocket_1`: "A heavy boulder with a gap behind it." / "A creature with Stonebreak could shift it."
- `maps.route_revival.route_revival_brush_pocket_2`: "Thick brush, knotted tight. Something's behind it." / "A creature with Brushbreak could clear it."


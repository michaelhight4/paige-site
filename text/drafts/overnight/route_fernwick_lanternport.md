# route_fernwick_lanternport: overnight text DRAFT

**DRAFT, not signed off by Gary.** Text Bot overnight worker, 2026-10-23 00:46 CT. Keys = Game dev text_ref ids (design/overnight_gd/trainers_route_fernwick_lanternport.json). Spot ids = World Design `maps.route_fernwick_lanternport.<id>` from qa/overnight_maps (staged only) where they exist, else `TODO-spot:` placeholders.
Story step: after coin 7 | GD map id `route_fernwick_lanternport` | World map id `route_fernwick_lanternport`

Format: each line is one dialogue page (max 2 x 40 chars). `intro` = trainer pages, `defeat` = battle_lost (player wins), `after` = repeat talk.

## Trainers

### `trainers.route_fernwick_lanternport.a` - Angler Umber (tr_route_fernwick_lanternport_a)

- spot: `maps.route_fernwick_lanternport.route_fernwick_lanternport_trainer_1` | where (GD): lock basin | team: Moorcoil L45, Mooncrab L46
- intro: "The lock fills slowly. Plenty of time for a battle."
- defeat: "Lock's full. My luck's empty."
- after: "The keeper only opens the tide-lock for people the town trusts."

### `trainers.route_fernwick_lanternport.b` - Lamplighter Viggo (tr_route_fernwick_lanternport_b)

- spot: `maps.route_fernwick_lanternport.route_fernwick_lanternport_trainer_2` | where (GD): canal lamps | team: Gloamtick L46, Lanternkeep L46
- intro: "I light these lamps every evening. You're in my way."
- defeat: "Fine. I'll light around you."
- after: "Same poles as my grandad's day. Crystal in them now, not flame."

### `trainers.route_fernwick_lanternport.c` - Ranger Wyn (tr_route_fernwick_lanternport_c)

- spot: `maps.route_fernwick_lanternport.route_fernwick_lanternport_trainer_3` | where (GD): forest edge near Fernwick | team: Parasoleaf L46, Netspinner L47
- intro: "Forest edge. Fernwick that way, canal this way, me in the middle."
- defeat: "You can have the middle."
- after: "Fernwick's back through the trees. The path's clear now."

### `trainers.route_fernwick_lanternport.d` - Veteran Xan (tr_route_fernwick_lanternport_d)

- spot: `maps.route_fernwick_lanternport.route_fernwick_lanternport_trainer_4` | where (GD): optional | team: Runeskein L47, Novarch L47
- intro: "You walk like someone who's won a few coins. Show me."
- defeat: "More than a few, then."
- after: "Rest up before Cindervale. It's hot there, and rude about it."

## Signs

- `maps.route_fernwick_lanternport.route_fernwick_lanternport_sign`: "TIDE-LOCK ROAD\nEast: Fernwick. South: Lanternport." / "The lock opens on the keeper's say-so."

## NPCs

- `maps.route_fernwick_lanternport.route_fernwick_lanternport_lock_keeper` (guard): text already exists in `blockers.gate_lanternport_tidelock (lock_keeper)`; World and Text Bot to align the id (see SUMMARY id-mismatch table). Not rewritten.

## Pickups (Game dev items_route_fernwick_lanternport.json)

The "found" message is the generic system line (`You found {item}!`-style, system_items). Only hidden pickups get a nearby hint line.

- `fl_lock` (tonic_large -> **Big Remedy**) at: lock keeper hut
- `fl_hidden` (vigor_seed -> **Vigor Seed**, hidden) at: canal bollard | hint (inspect/sparkle text, `TODO-spot:route_fernwick_lanternport_fl_hidden_hint`): "Something glints by the canal bollard."
- `fl_edge` (energy_tonic -> **Pep Remedy**) at: forest edge

- World staged its own placeholder pickups (route_fernwick_lanternport_pocket_1, route_fernwick_lanternport_item_1, route_fernwick_lanternport_item_2); Game dev ids above should replace them. Note: World's placeholder label "Lumen Tonic" must not reach players (blocked word); use Small/Big/Pep Remedy.

## Puzzle / obstacle hints

- `maps.route_fernwick_lanternport.route_fernwick_lanternport_brush_pocket_1`: "Thick brush, knotted tight. Something's behind it." / "A creature with Brushbreak could clear it."
- `TODO-spot:route_fernwick_lanternport_lock_board`: "TIDE-LOCK\nOpened by the keeper." / "Lock times posted on the hut door."
- story gates on this map (gate_lanternport_tidelock): text already in `blockers.*` (overworld_lines.json); not duplicated.


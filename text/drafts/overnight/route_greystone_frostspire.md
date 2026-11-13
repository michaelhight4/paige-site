# route_greystone_frostspire: overnight text DRAFT

**DRAFT, not signed off by Gary.** Text Bot overnight worker, 2026-10-23 00:46 CT. Keys = Game dev text_ref ids (design/overnight_gd/trainers_route_greystone_frostspire.json). Spot ids = World Design `maps.frostspire_pass.<id>` from qa/overnight_maps (staged only) where they exist, else `TODO-spot:` placeholders.
Story step: 6->7 | GD map id `route_greystone_frostspire` | World map id `frostspire_pass`

Format: each line is one dialogue page (max 2 x 40 chars). `intro` = trainer pages, `defeat` = battle_lost (player wins), `after` = repeat talk.

## Trainers

### `ron.battle_4` - Ron (ron_4, flag `beat_rival_ron_4`)

- team: Sailquill L29, Fernlume L30, Geodling L30, Shagmount L31, Forgeharrow L32 (Tumbloam-player version; GD has all three starter variants)
- note (GD): At the rebuilt bridge (rt_engineer_pass nearby). Optional to add a Ron battle here; drop if Text Bot wants fewer.
- spot: `maps.frostspire_pass.frostspire_pass_ron_4` (World staged Ron spot)
- intro (opener = existing `ron_battle_openers.ron_rival_frostspire`, mirrored): "The bags froze to the bin last night." / "That's basically storage. Ready, {nick}?"
- intro_2 (after the opener): "I came up here without a coat. On purpose. Don't look at me like that."
- defeat (Ron loses): "My hands are too cold to be upset about it."
- won (Ron wins; works with or without a blackout, per Coder 12:47 AM; Gary to rule on blackout for battles 2-6): "Huh. Cold weather suits me."
- after: "I'm not going back for a coat. I've committed to this now."

### `trainers.route_greystone_frostspire.a` - Climber Yara (tr_route_greystone_frostspire_a)

- spot: `maps.frostspire_pass.frostspire_pass_trainer_1` | where (GD): switchback | team: Frostlop L28, Sailquill L29
- intro: "Halfway up and my legs have quit. My team hasn't."
- defeat: "Now we've all quit."
- after: "Switchbacks look slow. Cutting across looks fast. It isn't."

### `trainers.route_greystone_frostspire.b` - Hillwalker Zev (tr_route_greystone_frostspire_b)

- spot: `maps.frostspire_pass.frostspire_pass_trainer_2` | where (GD): cave exit ledge | team: Snowcairn L29, Slagrook L29
- intro: "You came out of Greystone? Then you've earned a proper battle."
- defeat: "And you've earned the view."
- after: "The bridge was out for weeks. They fixed it the day the company needed it."

### `trainers.route_greystone_frostspire.c` - Birdwatcher Ada (tr_route_greystone_frostspire_c)

- spot: `maps.frostspire_pass.frostspire_pass_trainer_3` | where (GD): cliff lookout | team: Sailquill L29, Skyrender L30
- intro: "Skyrenders ride the updraft here. Let me show you why that's scary."
- defeat: "Okay. Less scary than I thought."
- after: "On a clear day you can see the Frostspire shrine from here."

### `trainers.route_greystone_frostspire.d` - Ranger Bryn (tr_route_greystone_frostspire_d)

- spot: `maps.frostspire_pass.frostspire_pass_trainer_4` | where (GD): snow-fern band (forced) | team: Skyrender L30, Rubblon L30
- intro: "The ferns glow when things move in them. Something moved. It was me."
- defeat: "Right. Back into the ferns."
- after: "There's no way round this band. Through the ferns or nothing."

### `trainers.route_greystone_frostspire.e` - Climber Cole (tr_route_greystone_frostspire_e)

- spot: `maps.frostspire_pass.frostspire_pass_trainer_5` | where (GD): last before Frostspire | team: Snowgrouse L31, Squallwhirl L31
- intro: "Last climb before town. Last battle before soup."
- defeat: "Soup it is."
- after: "Frostspire's over the rise. Get your team looked at in the branch."

## Signs

- `maps.frostspire_pass.frostspire_pass_sign`: "FROSTSPIRE PASS\nBridge out. Engineers on site." / "North: Frostspire. South: Greystone Caverns."

## NPCs

- `maps.frostspire_pass.frostspire_pass_rt_engineer` (guard): text already exists in `blockers.gate_frostspire_bridge (rt_engineer_pass)`; World and Text Bot to align the id (see SUMMARY id-mismatch table). Not rewritten.

## Pickups (Game dev items_route_greystone_frostspire.json)

The "found" message is the generic system line (`You found {item}!`-style, system_items). Only hidden pickups get a nearby hint line.

- `fp_switchback` (tonic_large -> **Big Remedy**) at: switchback corner
- `fp_bridge` (energy_tonic -> **Pep Remedy**, hidden) at: bridge anchor post | hint (inspect/sparkle text, `TODO-spot:frostspire_pass_fp_bridge_hint`): "Something glints by the bridge anchor post."
- `fp_lookout` (dominance_crystal_plus -> **Prime Crystal**) at: cliff lookout
- `fp_camp` (feed_bag -> **Feed Bag**, hidden) at: Frostspire camp (club note tier 2) | hint (inspect/sparkle text, `TODO-spot:frostspire_pass_fp_camp_hint`): "Something glints under the camp's spare tarp."

- World staged its own placeholder pickups (frostspire_pass_pocket_1, frostspire_pass_item_1, frostspire_pass_item_2, frostspire_pass_item_3); Game dev ids above should replace them. Note: World's placeholder label "Lumen Tonic" must not reach players (blocked word); use Small/Big/Pep Remedy.

## Puzzle / obstacle hints

- `maps.frostspire_pass.frostspire_pass_boulder_pocket_1`: "A heavy boulder with a gap behind it." / "A creature with Stonebreak could shift it."
- story gates on this map (gate_frostspire_bridge): text already in `blockers.*` (overworld_lines.json); not duplicated.


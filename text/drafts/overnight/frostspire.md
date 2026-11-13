# frostspire: overnight text DRAFT

**DRAFT, not signed off by Gary.** Text Bot overnight worker, 2026-10-23 00:46 CT. Keys = Game dev text_ref ids (design/overnight_gd/trainers_frostspire.json). Spot ids = World Design `maps.frostspire.<id>` from qa/overnight_maps (staged only) where they exist, else `TODO-spot:` placeholders.
Story step: 7 (coin 4, Skylift) | GD map id `frostspire` | World map id `frostspire`

Format: each line is one dialogue page (max 2 x 40 chars). `intro` = trainer pages, `defeat` = battle_lost (player wins), `after` = repeat talk.

## Trainers

### `trainers.frostspire.a` - Climber Dara (tr_frostspire_a)

- spot: `maps.frostspire.frostspire_trainer_1` | where (GD): lower slope | team: Spirewing L31, Skyrender L31
- intro: "Lower slope's for practice. Let's practise."
- defeat: "Back to practice for me."
- after: "Up top the wind pushes you sideways. Lean into it."

### `trainers.frostspire.b` - Skater Elm (tr_frostspire_b)

- spot: `maps.frostspire.frostspire_trainer_2` | where (GD): packed-snow sled run top | team: Frostlop L31, Sailquill L32
- intro: "The sled run only goes one way. So does this battle."
- defeat: "Down I go, then."
- after: "The run ends at the bottom of town. There's no climbing back up it."

### `trainers.frostspire.c` - Scholar Flint (tr_frostspire_c)

- spot: `maps.frostspire.frostspire_trainer_3` | where (GD): shrine (Shrines of the North flavour) | team: Halovy L32, Chimelet L32
- intro: "The shrine's been quiet since the walls went up. Let's not be."
- defeat: "Loud enough. Thank you."
- after: "Old books say the shrine keeps the north in balance. Old books say a lot."

### `trainers.frostspire.d` - Veteran Greer (tr_frostspire_d)

- spot: `maps.frostspire.frostspire_trainer_4` | where (GD): optional peak hut | team: Snowgrouse L33, Peakbrute L33
- intro: "Made it to the hut? Then you can manage one more battle."
- defeat: "You can. Sit by the stove a minute."
- after: "Snowgrouses don't fly in this wind. You shouldn't either."

## Signs

- `maps.frostspire.frostspire_sign`: "FROSTSPIRE\nMountain town. Elevation: high." / "The shrine is open. Mind the ice."

## NPCs

- `maps.frostspire.frostspire_villager_1` (villager): "The walls went dim the week you showed up." / "I'm not saying it was you. I'm just saying."
- `maps.frostspire.frostspire_skylift_tutor` (villager_scholar): "With that coin, a strong flyer can carry you to towns you've been to." / "That's Skylift. Not Aurelith, mind. Rail only there."

## Shop clerk

- spot: `maps.shop_int.clerk` variant for region `frostspire` (Frostspire lodge stall); World warps every town to the shared shop_int, so these need a per-region line (`TODO-spot:shop_int_clerk_frostspire`).
- greeting: "Lodge stall. Warm hands, warm prices." / "Remedies and feeds mostly. What do you need?"
- regular (repeat visit): "You again. Shut the door, the heat's getting out."
- stock names used (GD shops.json): Big Remedy, Calm Tea, Clear Tea, Feed Bag, Great Remedy, Pep Remedy, Prime Crystal

## Pickups (Game dev items_frostspire.json)

The "found" message is the generic system line (`You found {item}!`-style, system_items). Only hidden pickups get a nearby hint line.

- `fs_sled_end` (vigor_seed -> **Vigor Seed**) at: bottom of the one-way sled run
- `fs_shrine` (calm_tea -> **Calm Tea**, hidden) at: shrine offering stone | hint (inspect/sparkle text, `TODO-spot:frostspire_fs_shrine_hint`): "Something glints by the shrine offering stone."
- `fs_hut` (tonic_large -> **Big Remedy**) at: peak hut
- `fs_ice_cave` (dominance_crystal_plus -> **Prime Crystal**) at: ice cave dead end
- `fs_hidden_cairn` (coin_pouch_small -> **a small purse**, hidden) at: cairn | hint (inspect/sparkle text, `TODO-spot:frostspire_fs_hidden_cairn_hint`): "Something glints by the cairn."

- World staged its own placeholder pickups (frostspire_item_1, frostspire_item_2, frostspire_item_3, frostspire_item_4, frostspire_item_5); Game dev ids above should replace them. Note: World's placeholder label "Lumen Tonic" must not reach players (blocked word); use Small/Big/Pep Remedy.

## Puzzle / obstacle hints

- `TODO-spot:frostspire_sled_run_top`: "SLED RUN: one way only." / "Once you're down, you walk back round."


# sunmeadow_fields: overnight text DRAFT

**DRAFT, not signed off by Gary.** Text Bot overnight worker, 2026-10-23 00:46 CT. Keys = Game dev text_ref ids (design/overnight_gd/trainers_sunmeadow_fields.json). Spot ids = World Design `maps.sunmeadow_fields.<id>` from qa/overnight_maps (staged only) where they exist, else `TODO-spot:` placeholders.
Story step: 8 | GD map id `sunmeadow_fields` | World map id `sunmeadow_fields`

Format: each line is one dialogue page (max 2 x 40 chars). `intro` = trainer pages, `defeat` = battle_lost (player wins), `after` = repeat talk.

## Trainers

### `trainers.sunmeadow_fields.a` - Gardener Hux (tr_sunmeadow_fields_a)

- spot: `maps.sunmeadow_fields.sunmeadow_fields_trainer_1` | where (GD): past the dim crystal barrier | team: Heliobloom L31, Plainhorn L31
- intro: "The crystal wall's gone dim. First visitor in months, and we battle."
- defeat: "Still nice to have company."
- after: "The meadow's coming back. Slowly. Like my knees."

### `trainers.sunmeadow_fields.b` - Birdwatcher Ione (tr_sunmeadow_fields_b)

- spot: `maps.sunmeadow_fields.sunmeadow_fields_trainer_2` | where (GD): stream footbridge | team: Sailquill L32, Sunquail L32
- intro: "Sunquails only sing when it's quiet. Let's not be quiet."
- defeat: "Now they won't sing at all."
- after: "Cross the footbridge one at a time. It's older than it looks."

### `trainers.sunmeadow_fields.c` - Trail Kid Jory (tr_sunmeadow_fields_c)

- spot: `maps.sunmeadow_fields.sunmeadow_fields_trainer_3` | where (GD): near Wexley's Croft | team: Halovy L32, Burlbeetle L32
- intro: "Nan Wexley says I can battle anyone who looks lost. You look lost."
- defeat: "Okay, you're not lost. Just good."
- after: "The Croft's over there. Nan feeds anyone who helps with the gate."

### `trainers.sunmeadow_fields.d` - Skater Kaz (tr_sunmeadow_fields_d)

- spot: `maps.sunmeadow_fields.sunmeadow_fields_trainer_4` | where (GD): bike boardwalk loop | team: Thermalark L33, Basklet L33
- intro: "The bike loop's my turf. Well. My gravel."
- defeat: "The gravel's yours now."
- after: "Loop it twice and you'll spot the island path. Wet feet guaranteed."

### `trainers.sunmeadow_fields.e` - Field Researcher Lomond (tr_sunmeadow_fields_e)

- spot: `maps.sunmeadow_fields.sunmeadow_fields_trainer_5` | where (GD): flower survey | team: Reapmantis L33, Heliobloom L34
- intro: "I'm counting flowers. You've just stepped on forty."
- defeat: "Thirty-nine. One bounced back."
- after: "The flowers came back the week the wall went dim. Make of that what you like."

### `trainers.sunmeadow_fields.f` - Veteran Mira (tr_sunmeadow_fields_f)

- spot: `maps.sunmeadow_fields.sunmeadow_fields_trainer_6` | where (GD): optional north meadow | team: Popgopher L34, Spinemonitor L35
- intro: "Folks don't come north much. Spinemonitors do."
- defeat: "You'll do fine up here."
- after: "Popgophers dig up the whole north meadow. Watch your ankles."

## Signs

- `maps.sunmeadow_fields.sunmeadow_fields_sign`: "SUNMEADOW FIELDS\nWest: Route 1. East: Reed Road." / "South: Revival Heights. Close the gates."

## Pickups (Game dev items_sunmeadow_fields.json)

The "found" message is the generic system line (`You found {item}!`-style, system_items). Only hidden pickups get a nearby hint line.

- `smf_barrier` (tonic_large -> **Big Remedy**) at: just past the barrier stubs
- `smf_croft` (feed_bag -> **Feed Bag**) at: Croft paddock gate
- `smf_loop` (vigor_seed -> **Vigor Seed**) at: bike loop island
- `smf_hidden_flowers` (energy_tonic -> **Pep Remedy**, hidden) at: flower ring | hint (inspect/sparkle text, `TODO-spot:sunmeadow_fields_smf_hidden_flowers_hint`): "Something glints by the flower ring."
- `smf_north` (dominance_crystal_plus -> **Prime Crystal**) at: north meadow
- `smf_hidden_stile` (coin_pouch_small -> **a small purse**, hidden) at: stile | hint (inspect/sparkle text, `TODO-spot:sunmeadow_fields_smf_hidden_stile_hint`): "Something glints by the stile."

- World staged its own placeholder pickups (sunmeadow_fields_pocket_1, sunmeadow_fields_pocket_2, sunmeadow_fields_item_1, sunmeadow_fields_item_2, sunmeadow_fields_item_3, sunmeadow_fields_item_4); Game dev ids above should replace them. Note: World's placeholder label "Lumen Tonic" must not reach players (blocked word); use Small/Big/Pep Remedy.

## Puzzle / obstacle hints

- `maps.sunmeadow_fields.sunmeadow_fields_brush_pocket_1`: "Thick brush, knotted tight. Something's behind it." / "A creature with Brushbreak could clear it."
- `maps.sunmeadow_fields.sunmeadow_fields_water_pocket_2`: "Deep, still water. There's dry ground on the far side." / "Tideglide would get you across."


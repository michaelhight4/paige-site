# fernwick: overnight text DRAFT

**DRAFT, not signed off by Gary.** Text Bot overnight worker, 2026-10-23 00:46 CT. Keys = Game dev text_ref ids (design/overnight_gd/trainers_fernwick.json). Spot ids = World Design `maps.fernwick.<id>` from qa/overnight_maps (staged only) where they exist, else `TODO-spot:` placeholders.
Story step: 2-3 | GD map id `fernwick` | World map id `fernwick` (live map)

Format: each line is one dialogue page (max 2 x 40 chars). `intro` = trainer pages, `defeat` = battle_lost (player wins), `after` = repeat talk.

## Trainers

### `ron.battle_1` - Ron (ron_1, flag `beat_rival_ron_1`)

- team: Cindrip L6 (Tumbloam-player version; GD has all three starter variants)
- note (GD): Fernwick entrance. Win or lose: gives Trail Runners (has_run_shoes), no blackout on loss (MECHANICS_PARITY G3). Ron is "cocky and lucky" here.
- intro / defeat / won / after: **already live** in `maps.fernwick.ron_rival_1 (pages / battle_lost / battle_won / after)`; not rewritten.
- handover (`ron.battle_1.handover`, after either result, gives Trail Runners): "Here. Company Trail Runners. They gave me two pairs." / "Don't ask why. I didn't ask why."  _(Story Bot draft (QUESTS mq_route1_benchmark s4), Ron voice checked, kept word for word)_

_Fernwick is in scope only for Ron 1. Hall text is the second worker's (halls_*.md)._

# thornwood: overnight text DRAFT

**DRAFT, not signed off by Gary.** Text Bot overnight worker, 2026-10-23 00:46 CT. Keys = Game dev text_ref ids (design/overnight_gd/trainers_thornwood.json). Spot ids = World Design `maps.thornwood.<id>` from qa/overnight_maps (staged only) where they exist, else `TODO-spot:` placeholders.
Story step: after coin 1 (optional) / crossed at step 6 | GD map id `thornwood` | World map id `thornwood` (live map)

Format: each line is one dialogue page (max 2 x 40 chars). `intro` = trainer pages, `defeat` = battle_lost (player wins), `after` = repeat talk.

## Trainers

### `trainers.thornwood.bug` - Beetle Keeper Odo (tr_thornwood_bug)

- spot: `maps.thornwood.trainer_tw_bug` | where (GD): existing npc trainer_tw_bug (11,15) | team: Burlbeetle L10, Thornpod L11
- intro / defeat / after: **already live** in `maps.thornwood.trainer_tw_bug` (mirrored, unchanged):
  - intro: "Shh! You'll scare the Burlbeetles. They look like stumps till you step on one."
  - defeat: "Fine. I wasn't catching anything anyway."
  - after: "These paths loop back on themselves. Dead end? Look for gaps in the trees."

### `trainers.thornwood.b` - Camper Bea (tr_thornwood_b)

- spot: `maps.thornwood.trainer_tw_b` | where (GD): existing npc trainer_tw_b (27,16), cannot be skipped | team: Spinelet L11, Sailquill L11
- intro / defeat / after: **already live** in `maps.thornwood.trainer_tw_b` (mirrored, unchanged):
  - intro: "The east trail's blocked, so you're stuck with me."
  - defeat: "Yeah. Long day."
  - after: "Your company says it'll move that trunk once someone important asks." / "Two coins makes you important, apparently."

### `trainers.thornwood.c` - Gardener Kit (tr_thornwood_c)

- spot: `TODO-spot:thornwood_c_gardener` | where (GD): NEW: suggest pond-side clearing, facing the path | team: Cobblepup L10, Briarlet L12
- intro: "I tidy this clearing every Sunday. Nobody asked me to."
- defeat: "Well. The brambles are winning today too."
- after: "Briarlets like the pond edge. Mind the thorns if you pick one up."

### `trainers.thornwood.d` - Trail Kid Lio (tr_thornwood_d)

- spot: `TODO-spot:thornwood_d_kid` | where (GD): NEW: suggest mud patch near the east log gate; only after dusk? (keep always for now) | team: Gloamtick L12
- intro: "Don't look at my boots. Look at my Gloamtick."
- defeat: "My mum's going to ask about the mud AND this."
- after: "Gloamticks come out more after dark. That's when I'm not allowed out."

### `trainers.thornwood.e` - Field Researcher Nell (tr_thornwood_e)

- spot: `TODO-spot:thornwood_e_researcher` | where (GD): NEW: optional, near the Thornwood camp (STORY_RULINGS_CLUB) | team: Lancebeetle L12, Burlbeetle L13
- intro: "Revival Tech jacket? Field team? You're a bit late, aren't you?"
- defeat: "Fine. You're not late. You're just new."
- after: "The old camp's down the path. Nobody's lit that stove in weeks."


# mirefen: overnight text DRAFT

**DRAFT, not signed off by Gary.** Text Bot overnight worker, 2026-10-23 00:46 CT. Keys = Game dev text_ref ids (design/overnight_gd/trainers_mirefen.json). Spot ids = World Design `maps.mirefen.<id>` from qa/overnight_maps (staged only) where they exist, else `TODO-spot:` placeholders.
Story step: 8 (coin 5, Tideglide; storm season starts) | GD map id `mirefen` | World map id `mirefen`

Format: each line is one dialogue page (max 2 x 40 chars). `intro` = trainer pages, `defeat` = battle_lost (player wins), `after` = repeat talk.

## Trainers

### `trainers.mirefen.a` - Bog Walker Briar (tr_mirefen_a)

- spot: `maps.mirefen.mirefen_trainer_1` | where (GD): bog entrance | team: Gloamtick L35, Mirewump L36
- intro: "Welcome to Mirefen. Boots on? Good. Battle."
- defeat: "You'll fit in here."
- after: "The town's on stilts. Don't ask about the stairs."

### `trainers.mirefen.b` - Angler Corin (tr_mirefen_b)

- spot: `maps.mirefen.mirefen_trainer_2` | where (GD): islet jetty | team: Mirewump L36, Peatbellow L36, Mirejaw L37
- intro: "Three hours on this jetty. One bite. It was a Mirewump. It bit me."
- defeat: "Two bites today, then."
- after: "Mirejaws come up at dusk. Keep your fingers out of the water."

### `trainers.mirefen.c` - Scholar Dilys (tr_mirefen_c)

- spot: `maps.mirefen.mirefen_trainer_3` | where (GD): bog lights (Bog Lights and Other Nonsense flavour) | team: Runeskein L37, Turfhulk L37
- intro: "Here about the bog lights? Everyone's here about the bog lights."
- defeat: "Fine. You can stay."
- after: "Gas, or creatures, or both. My book calls it nonsense. Good book."

### `trainers.mirefen.d` - Beetle Keeper Esk (tr_mirefen_d)

- spot: `maps.mirefen.mirefen_trainer_4` | where (GD): reed line (the only dry line) | team: Burlbeetle L36, Bogdart L37, Glimmoth L37
- intro: "This reed line's the only dry path. I'm on it. Battle me or swim."
- defeat: "You'd not have liked swimming anyway."
- after: "Burlbeetles float. Did you know that? Neither did they."

### `trainers.mirefen.e` - Veteran Hedda (tr_mirefen_e)

- spot: `maps.mirefen.mirefen_trainer_5` | where (GD): optional, bike boardwalk spur | team: Pitchergulp L38, Mirewump L38
- name: GD placeholder `Fable` -> proposed **Hedda** (Gary to approve)
- intro: "Came down the spur on wheels? Brave. Let's see the rest of you."
- defeat: "Brave and good. Annoying."
- after: "The spur ends at nothing. Except whatever's lying at the end of it."

## Signs

- `maps.mirefen.mirefen_sign`: "MIREFEN\nMarsh town. Built on stilts." / "Stay on the boardwalks. Really."

## NPCs

- `maps.mirefen.mirefen_tideglide_giver` (villager_scholar): "Storm's coming in. The causeway won't hold." / "Your water creatures can carry you across. Call it Tideglide."
- `maps.mirefen.mirefen_villager_1` (villager): "Mirefen's built on stilts. Grandad built ours. It leans left." / "So do we, now."

## Shop clerk

- spot: `maps.shop_int.clerk` variant for region `mirefen` (Mirefen stilt stall); World warps every town to the shared shop_int, so these need a per-region line (`TODO-spot:shop_int_clerk_mirefen`).
- greeting: "Stilt stall. Mind the gap in the floor." / "Remedies, teas, Hush Spray. What do you need?"
- regular (repeat visit): "Still dry? Good. What can I get you?"
- stock names used (GD shops.json): Big Remedy, Calm Tea, Clear Tea, Feed Bag, Great Remedy, High Crystal, Hush Spray, Rally Kit

## Pickups (Game dev items_mirefen.json)

The "found" message is the generic system line (`You found {item}!`-style, system_items). Only hidden pickups get a nearby hint line.

- `mf_islet_fix` (vigor_seed -> **Vigor Seed**) at: replaces mirefen_islet_item TBD (giveTbdItems=false skips it today)
- `mf_notebook_fisher` (tonic_large -> **Big Remedy**) at: Mirefen fisher field notebook scene (club tier 3)
- `mf_spur` (dominance_crystal_plus -> **Prime Crystal**) at: bike boardwalk spur end
- `mf_hidden_lights` (energy_tonic -> **Pep Remedy**, hidden) at: where the bog lights gather | hint (inspect/sparkle text, `TODO-spot:mirefen_mf_hidden_lights_hint`): "Something glints where the bog lights gather."

- World staged its own placeholder pickups (mirefen_item_1, mirefen_item_2, mirefen_item_3, mirefen_item_4); Game dev ids above should replace them. Note: World's placeholder label "Lumen Tonic" must not reach players (blocked word); use Small/Big/Pep Remedy.

## Puzzle / obstacle hints

- `TODO-spot:mirefen_bog_lights`: "Little lights hang over the bog. They drift when you walk." / "They seem to gather in one spot."


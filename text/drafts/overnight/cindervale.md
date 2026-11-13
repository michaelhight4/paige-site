# cindervale: overnight text DRAFT

**DRAFT, not signed off by Gary.** Text Bot overnight worker, 2026-10-23 00:46 CT. Keys = Game dev text_ref ids (design/overnight_gd/trainers_cindervale.json). Spot ids = World Design `maps.cindervale.<id>` from qa/overnight_maps (staged only) where they exist, else `TODO-spot:` placeholders.
Story step: 11 (coin 8 -> all_badges) | GD map id `cindervale` | World map id `cindervale`

Format: each line is one dialogue page (max 2 x 40 chars). `intro` = trainer pages, `defeat` = battle_lost (player wins), `after` = repeat talk.

## Trainers

### `trainers.cindervale.square` - Smith Bea (tr_cindervale_square)

- spot: `maps.cindervale.cindervale_trainer_1` | where (GD): forge square, optional | team: Foundrax L50, Cinderwyrm L51
- intro: "The forge square's for working. And for this."
- defeat: "Back to working, then."
- after: "The Master's hall is past the anvils. It's warm in there. Very."

## Signs

- `maps.cindervale.cindervale_sign`: "CINDERVALE\nForge town." / "Mind the sparks. Mind the anvils."

## NPCs

- `maps.cindervale.cindervale_smith` (villager): "Three hundred years this forge has run." / "Revival Tech wants it running faster. The forge has opinions."
- `maps.cindervale.cindervale_villager_1` (villager): "Cindervale's warm all year. We don't own coats. We own sunburns."

## Shop clerk

- spot: `maps.shop_int.clerk` variant for region `cindervale` (Cindervale); World warps every town to the shared shop_int, so these need a per-region line (`TODO-spot:shop_int_clerk_cindervale`).
- greeting: "Forge-side counter. Everything here's hard-wearing." / "Remedies, crystals, feeds. What do you need?"
- regular (repeat visit): "Back from the vents? You look cooked. Remedies?"
- stock names used (GD shops.json): Big Remedy, Clear Tea, Feed Bag, Full Remedy, Great Remedy, High Crystal, Hush Spray, Pep Remedy, Prime Crystal, Rally Kit, Vigor Seed

## Pickups (Game dev items_cindervale.json)

The "found" message is the generic system line (`You found {item}!`-style, system_items). Only hidden pickups get a nearby hint line.

- `cv_forge` (tonic_large -> **Big Remedy**) at: forge yard
- `cv_hidden_anvil` (coin_pouch_small -> **a small purse**, hidden) at: old anvil | hint (inspect/sparkle text, `TODO-spot:cindervale_cv_hidden_anvil_hint`): "Something glints by the old anvil."
- `cv_spring` (vigor_seed -> **Vigor Seed**) at: hot spring path

- World staged its own placeholder pickups (cindervale_item_1, cindervale_item_2, cindervale_item_3); Game dev ids above should replace them. Note: World's placeholder label "Lumen Tonic" must not reach players (blocked word); use Small/Big/Pep Remedy.


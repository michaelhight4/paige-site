# lanternport: overnight text DRAFT

**DRAFT, not signed off by Gary.** Text Bot overnight worker, 2026-10-23 00:46 CT. Keys = Game dev text_ref ids (design/overnight_gd/trainers_lanternport.json). Spot ids = World Design `maps.lanternport.<id>` from qa/overnight_maps (staged only) where they exist, else `TODO-spot:` placeholders.
Story step: 10 (coin 7) | GD map id `lanternport` | World map id `lanternport`

Format: each line is one dialogue page (max 2 x 40 chars). `intro` = trainer pages, `defeat` = battle_lost (player wins), `after` = repeat talk.

## Trainers

### `ron.battle_5` - Ron (ron_5, flag `beat_rival_ron_5`)

- team: Sailquill L43, Parasoleaf L44, Novarch L44, Netspinner L45, Forgeharrow L47 (Tumbloam-player version; GD has all three starter variants)
- note (GD): Ron finds a field team log page first and chooses to share it after the battle (6.1 turn toward trust).
- spot: `maps.lanternport.lanternport_ron_5` (World staged Ron spot)
- intro (opener = existing `ron_battle_openers.ron_rival_lanternport`, mirrored): "The neighbour left a note about the bins." / "I'm choosing to battle you instead, {nick}."
- defeat (Ron loses): "Yeah. You'd have won with or without this." / "Hang on. Before you go."
- won (Ron wins; works with or without a blackout, per Coder 12:47 AM; Gary to rule on blackout for battles 2-6): "Don't read into it." / "I'll be around, {nick}. I've got something for you."
- after: "Found this in a lost-and-found box at the station. Revival Tech paper." / "I read it. Then I thought about keeping it. Then I didn't."
- after_2: "No job, remember? So I'm not doing this for the company." / "I'm doing it because they're ours. Same as you."
  - _after / after_2: Story Bot draft (QUESTS mq_lanternport s2), kept word for word_

### `trainers.lanternport.pier` - Harbour Hand Tamsin (tr_lanternport_pier)

- spot: `maps.lanternport.lanternport_trainer_1` | where (GD): pier, optional | team: Moorcoil L44, Sluicekin L45
- intro: "End of the pier's my office. Today it's a battlefield."
- defeat: "Back to the office."
- after: "The lighthouse keeper knows everyone. Ask about the horn."

## Signs

- `maps.lanternport.lanternport_sign`: "LANTERNPORT\nLighthouse town." / "East: Tidewater Coast. North: Tide-lock Road."

## NPCs

- `maps.lanternport.lanternport_lighthouse_keeper` (villager_scholar): "The horn hasn't sounded in years. Loud enough to wake a giant." / "That's not a figure of speech, by the way."
- `maps.lanternport.lanternport_villager_1` (villager): "The lighthouse keeps the boats off the rocks." / "Keeps me up at night, too. Swings right past my window."

## Shop clerk

- spot: `maps.shop_int.clerk` variant for region `lanternport` (Lanternport); World warps every town to the shared shop_int, so these need a per-region line (`TODO-spot:shop_int_clerk_lanternport`).
- greeting: "RT Supply, Lanternport. Biggest shelf on the coast." / "Feeds, remedies, crystals. What do you need?"
- regular (repeat visit): "Seven coins? The back shelf's open to you now."
- stock names used (GD shops.json): Big Remedy, Calm Tea, Clear Tea, Dominance Crystal, Feed Bag, Full Remedy, Great Remedy, High Crystal, Hush Spray, Pep Remedy, Prime Crystal, Rally Kit, Small Remedy, Trail Mix, Vigor Seed

## Pickups (Game dev items_lanternport.json)

The "found" message is the generic system line (`You found {item}!`-style, system_items). Only hidden pickups get a nearby hint line.

- `lp_pier` (tonic_large -> **Big Remedy**) at: pier end
- `lp_hidden_crate` (coin_pouch_small -> **a small purse**, hidden) at: warehouse crate | hint (inspect/sparkle text, `TODO-spot:lanternport_lp_hidden_crate_hint`): "Something glints by the warehouse crate."
- `lp_lighthouse` (energy_tonic -> **Pep Remedy**) at: lighthouse stair
- `lp_station` (dominance_crystal_plus -> **Prime Crystal**) at: station alley

- World staged its own placeholder pickups (lanternport_item_1, lanternport_item_2, lanternport_item_3, lanternport_item_4); Game dev ids above should replace them. Note: World's placeholder label "Lumen Tonic" must not reach players (blocked word); use Small/Big/Pep Remedy.


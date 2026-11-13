# saltmere: overnight text DRAFT

**DRAFT, not signed off by Gary.** Text Bot overnight worker, 2026-10-23 00:46 CT. Keys = Game dev text_ref ids (design/overnight_gd/trainers_saltmere.json). Spot ids = World Design `maps.saltmere.<id>` from qa/overnight_maps (staged only) where they exist, else `TODO-spot:` placeholders.
Story step: 5 (coin 2, Courier Bike) | GD map id `saltmere` | World map id `saltmere`

Format: each line is one dialogue page (max 2 x 40 chars). `intro` = trainer pages, `defeat` = battle_lost (player wins), `after` = repeat talk.

## Trainers

### `ron.battle_2` - Ron (ron_2, flag `beat_rival_ron_2`)

- team: Sailquill L17, Grainling L18, Emberlunx L20 (Tumbloam-player version; GD has all three starter variants)
- note (GD): Harbour, before the hall. Ron jealous of your employee ID level (6.1).
- spot: `maps.saltmere.saltmere_ron_2` (World staged Ron spot)
- intro (opener = existing `ron_battle_openers.ron_rival_saltmere`, mirrored): "One bag by the bin now. It's fine, {nick}." / "Tomorrow."
- intro_2 (after the opener): "Your ID says 'Field Researcher II'. Mine says 'Field Researcher'." / "No numeral. Just vibes. Let's fix that, {nick}."
- defeat (Ron loses): "Still no numeral. Love that for me."
- won (Ron wins; works with or without a blackout, per Coder 12:47 AM; Gary to rule on blackout for battles 2-6): "Ha. Put THAT on my ID."
- after: "The hall's past the fish market. Follow your nose. Sorry about your nose."

## Signs

- `maps.saltmere.saltmere_sign`: "SALTMERE\nHarbour town." / "Fish market mornings. Revival Tech office south side."
- `maps.saltmere.saltmere_hall_sign`: "SALTMERE MASTER'S HALL\nCoin holders and challengers welcome." / "Please wipe your feet. It's a harbour."

## NPCs

- `maps.saltmere.saltmere_causeway_local` (villager): text already exists in `blockers.gate_saltmere_causeway (causeway_local)`; World and Text Bot to align the id (see SUMMARY id-mismatch table). Not rewritten.
- `maps.saltmere.saltmere_fisher` (villager): "Nets were full every morning, once." / "Now I bring them in and count. It doesn't take long."
- `maps.saltmere.saltmere_villager_1` (villager): "The harbour bell rings at six. Then at seven, because Jory's late."
- `maps.saltmere_office_int.saltmere_office_int_clerk` (clerk): text already exists in `Courier Bike handover (CRITICAL_PATH saltmere_office_clerk); see maps/blockers bike quest text`; World and Text Bot to align the id (see SUMMARY id-mismatch table). Not rewritten.
- `maps.saltmere_office_int.saltmere_office_int_coworker` (villager): "I've been 'temporary' here for four years." / "Don't let them hand you a desk. You'll never leave."

## Shop clerk

- spot: `maps.shop_int.clerk` variant for region `saltmere` (Saltmere); World warps every town to the shared shop_int, so these need a per-region line (`TODO-spot:shop_int_clerk_saltmere`).
- greeting: "RT Supply, Saltmere branch. Everything smells of fish. Not the stock." / "Feeds, remedies, crystals. What do you need?"
- regular (repeat visit): "Back again? The fish market's quieter than us today."
- stock names used (GD shops.json): Big Remedy, Calm Tea, Dominance Crystal, Feed Bag, Hush Spray, Pep Remedy, Prime Crystal, Small Feed Bag, Small Remedy, Trail Mix, Vigor Seed

## Pickups (Game dev items_saltmere.json)

The "found" message is the generic system line (`You found {item}!`-style, system_items). Only hidden pickups get a nearby hint line.

- `sm_islet` (gold_coin -> **Gold Token**, hidden) at: lighthouse islet via the bike pier rail (world_layout bike_routes.planned.saltmere). Held: x1.5 trainer money | hint (inspect/sparkle text, `TODO-spot:saltmere_sm_islet_hint`): "Something glints out on the lighthouse islet."
- `sm_net_shed` (calm_tea -> **Calm Tea**) at: behind the net shed
- `sm_hidden_crate` (coin_pouch_small -> **a small purse**, hidden) at: fish crates | hint (inspect/sparkle text, `TODO-spot:saltmere_sm_hidden_crate_hint`): "Something glints by the fish crates."
- `sm_office_gift` (dominance_crystal_plus -> **Prime Crystal**) at: RT office clerk extra gift with the Courier Bike

- World staged its own placeholder pickups (saltmere_item_1, saltmere_item_2, saltmere_item_3, saltmere_item_4); Game dev ids above should replace them. Note: World's placeholder label "Lumen Tonic" must not reach players (blocked word); use Small/Big/Pep Remedy.


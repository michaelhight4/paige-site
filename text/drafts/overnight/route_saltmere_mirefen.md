# route_saltmere_mirefen: overnight text DRAFT

**DRAFT, not signed off by Gary.** Text Bot overnight worker, 2026-10-23 00:46 CT. Keys = Game dev text_ref ids (design/overnight_gd/trainers_route_saltmere_mirefen.json). Spot ids = World Design `maps.route_saltmere_mirefen.<id>` from qa/overnight_maps (staged only) where they exist, else `TODO-spot:` placeholders.
Story step: 8 (alt entry) | GD map id `route_saltmere_mirefen` | World map id `route_saltmere_mirefen`

Format: each line is one dialogue page (max 2 x 40 chars). `intro` = trainer pages, `defeat` = battle_lost (player wins), `after` = repeat talk.

## Trainers

### `trainers.route_saltmere_mirefen.a` - Harbour Hand Wilde (tr_route_saltmere_mirefen_a)

- spot: `maps.route_saltmere_mirefen.route_saltmere_mirefen_trainer_1` | where (GD): drained causeway | team: Floepaddle L33, Dewbell L34
- intro: "They drained the causeway for the thaw. I'm stuck out here till Tuesday."
- defeat: "Still Tuesday. Still stuck."
- after: "Mirefen's north. Keep to the stones. The mud's deeper than it looks."

### `trainers.route_saltmere_mirefen.b` - Angler Yves (tr_route_saltmere_mirefen_b)

- spot: `maps.route_saltmere_mirefen.route_saltmere_mirefen_trainer_2` | where (GD): causeway sluice | team: Floepaddle L34, Rimewyrm L34
- intro: "The sluice opens on the hour. You've got till then."
- defeat: "Plenty of time to spare."
- after: "When the sluice opens, everything downstream gets wet. You included."

### `trainers.route_saltmere_mirefen.c` - Bog Walker Ansel (tr_route_saltmere_mirefen_c)

- spot: `maps.route_saltmere_mirefen.route_saltmere_mirefen_trainer_3` | where (GD): marsh end | team: Gloamtick L35, Snapmoor L35
- intro: "Marsh end. Last dry spot for a mile. I'm keeping it."
- defeat: "Keep it, then. I'm off."
- after: "Gloamticks get everywhere out here. Check your socks."

## Signs

- `maps.route_saltmere_mirefen.route_saltmere_mirefen_sign`: "CAUSEWAY\nFlooded until the thaw ends." / "West: Saltmere. North: Mirefen."

## Pickups (Game dev items_route_saltmere_mirefen.json)

The "found" message is the generic system line (`You found {item}!`-style, system_items). Only hidden pickups get a nearby hint line.

- `sme_sluice` (tonic_large -> **Big Remedy**) at: sluice house
- `sme_hidden` (crystal_dust -> **Crystal Dust**, hidden) at: causeway stone | hint (inspect/sparkle text, `TODO-spot:route_saltmere_mirefen_sme_hidden_hint`): "Something glints by the causeway stone."
- `sme_marsh` (energy_tonic -> **Pep Remedy**) at: marsh hummock

- World staged its own placeholder pickups (route_saltmere_mirefen_pocket_1, route_saltmere_mirefen_item_1, route_saltmere_mirefen_item_2); Game dev ids above should replace them. Note: World's placeholder label "Lumen Tonic" must not reach players (blocked word); use Small/Big/Pep Remedy.

## Puzzle / obstacle hints

- `maps.route_saltmere_mirefen.route_saltmere_mirefen_boulder_pocket_1`: "A heavy boulder with a gap behind it." / "A creature with Stonebreak could shift it."
- story gates on this map (gate_saltmere_causeway): text already in `blockers.*` (overworld_lines.json); not duplicated.


> **Game Dev · Nov 5, 2026** — data only; Coder wires UI. Do not edit `src/` from this task.
# Gear shop
## Data
- File: `/workspace/boundwake/data_fantasy/gear.json`
- **44 items** across slots `weapon, armor, trinket, tool, home, mount`.
- Fields: `id`, `name`, `slot`, `price` (gold), `realm`, `minAge`, `minRenown`, `bonus`, `desc`; optional `flags` (`rent`, `own`, `hall`, `travel`, `prestige`).

## Economy
- Wearable gear **8–420** gold; **homes 15–600**; **mounts 40–480** — against wages (~40–700) and hall/team spends.
- `sellRate` **0.5** (rent cot: no sell-back; cancel rent free).
- One equipped item per combat/tool slot; one active **home**; one active **mount**.

## Homes
- Buy (`flags: own` / `hall`) or rent (`gear_rent_cot`, yearly renew at **half** list price).
- Moving home: sell old at sellRate (owns only) or abandon rent, then buy/rent new.
- `gear_ember_hall` is the prestige hall tier (crest hook for guild UI later).

## Mounts
- Travel speed / Visit distance flavor for Coder (draft: pony/mule 1.0×, courser/reedrunner 1.15×, destrier/ashcharger 1.3×).
- Prestige mounts may add court/tournament hooks later.

## Where sold
- Filtered by current/unlocked realm + `minAge` / `minRenown`.

## Wiring notes (Coder)
- State: `bw.gear = { owned: [id], equipped: { weapon, armor, trinket, tool, mount }, home: id|null, rentYearsLeft?: number }`.
- Icons: `/workspace/boundwake/assets/gear/<id>.png` — exact `id`, no `icon_` prefix (Character models).
- No tobacco/drugs/alcohol. Original Boundwake names only.

## Item ids

### weapon
- `gear_ash_staff` — Ashwood Practice Staff (8g, hearthfold)
- `gear_hunting_knife` — Hunting Knife (18g, hearthfold)
- `gear_vale_shortsword` — Vale Short Sword (45g, hearthfold)
- `gear_reed_longbow` — Thornreed Longbow (60g, thornreed)
- `gear_glass_focus` — Glass Spell Focus (90g, glassmarket)
- `gear_spire_longsword` — Spireward Longsword (160g, spireward)
- `gear_ember_blade` — Emberlight Blade (420g, emberlight)
- `gear_bulwark_mace` — Watch Mace (55g, hearthfold)

### armor
- `gear_padded_jerkin` — Padded Jerkin (20g, hearthfold)
- `gear_leather_coat` — Trail Leather (48g, thornreed)
- `gear_mail_shirt` — Ring Mail Shirt (110g, glassmarket)
- `gear_watch_cuirass` — Watch Cuirass (140g, hearthfold)
- `gear_collegium_robe` — Collegium Robe (85g, spireward)
- `gear_banneret_plate` — Banneret Half-Plate (280g, spireward)
- `gear_ashwalker_harness` — Ashwalker Harness (350g, emberlight)
- `gear_scale_vest` — Envoy Scale Vest (175g, glassmarket)

### trinket
- `gear_hearth_charm` — Hearthkeeper Charm (12g, hearthfold)
- `gear_tide_lens` — Tidepool Lens (35g, glassmarket)
- `gear_reed_whistle` — Reedpath Whistle (22g, thornreed)
- `gear_lantern_brooch` — Lantern Brooch (70g, glassmarket)
- `gear_codex_pendant` — Codex Pendant (95g, spireward)
- `gear_ward_ring` — Simple Ward Ring (130g, spireward)
- `gear_ember_sigil` — Ember Sigil (200g, emberlight)

### tool
- `gear_herb_kit` — Herbalist Kit (25g, hearthfold)
- `gear_smith_hammer` — Journeyman Hammer (40g, hearthfold)
- `gear_lock_picks` — Scout Pick Set (55g, thornreed)
- `gear_ledger_case` — Ledger Case (50g, glassmarket)
- `gear_lute` — Travel Lute (65g, glassmarket)
- `gear_enchant_kit` — Rune Stitch Kit (120g, spireward)
- `gear_field_surgery` — Field Surgery Roll (80g, emberlight)

### home
- `gear_rent_cot` — Rented Cot Room (15g, hearthfold) [rent]
- `gear_cottage_lane` — Cottage Lane Home (120g, hearthfold) [own]
- `gear_willow_house` — Willowpond House (200g, hearthfold) [own]
- `gear_quay_flat` — Lantern Quay Flat (280g, glassmarket) [own]
- `gear_ledger_townhouse` — Ledger Townhouse (450g, glassmarket) [own]
- `gear_reed_cabin` — Reedpath Cabin (160g, thornreed) [own]
- `gear_spire_rooms` — Spireward Rooms (360g, spireward) [own]
- `gear_ember_hall` — Emberlight Hall (600g, emberlight) [own, hall]

### mount
- `gear_mount_mule` — Pack Mule (40g, hearthfold) [travel]
- `gear_mount_pony` — Vale Pony (75g, hearthfold) [travel]
- `gear_mount_courser` — Coast Courser (160g, glassmarket) [travel]
- `gear_mount_reedrunner` — Reedrunner (140g, thornreed) [travel]
- `gear_mount_destrier` — Spire Destrier (320g, spireward) [travel, prestige]
- `gear_mount_ashcharger` — Ashcharger (480g, emberlight) [travel, prestige]

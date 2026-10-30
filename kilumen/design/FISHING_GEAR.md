# Fishing Gear: Rods and Bait

> **Status (Oct 29 2026):** approved by Gary and built on `dev/fishing-v1`. Hard rule added after approval: **fishing rods catch ONLY water-type Kilumen** (`el` includes `water`). Tables, baits and the sample sims below are updated for it; see §9 for what changed against the approved plan.

Status: design proposal, Oct 29 2026. Nothing here is built yet. All ids, names, prices and numbers are PLACEHOLDER until Gary signs off.
Builds on: `src/fishing/logic.js` (ROD_TIERS, `tableFor`, `biteChance`, `pickFish`, `planCast`), `data/fishing_tables.json`, `src/systems/items.js`, `src/systems/data/shops.json`.

## 1. Current state (what exists)
- One rod item, `fishing_rod` (Fishing Rod, key pocket), given by the Brookhollow `fisher` NPC (`ROD_GIVER`, flag `got_fishing_rod`).
- Bite chance comes from `tables.rods[id].bite`: basic 0.70, good 0.80, super 0.90 (good and super are placeholders, with no items placed and every `good`/`super` table `null`).
- `pickFish` makes a plain weighted pick, with no rarity and no modifiers. The level is uniform in `[lo, hi]`.
- The hook press window (900 ms, or 1100 ms on touch) is a separate skill check and is not changed by this design.

## 2. Rod tiers

| Tier | Item id | Name (invented) | Bite | Table it unlocks | Source |
|---|---|---|---|---|---|
| 1 | `fishing_rod` | Fishing Rod (existing) | 0.70 | `basic`: today's tables | **Gift**: Brookhollow `fisher` (already built) |
| 2 | `fishing_rod_good` | Driftline Rod | 0.80 | `good`: levels about +3 over basic, rare weights about ×3–4, extra uncommon slots | **Gift**: Saltmere `saltmere_fisher` (harbour NPC at 34,29). Available after the player shows them any creature caught with the Fishing Rod (flag `got_rod_good`). |
| 3 | `fishing_rod_super` | Lanternreach Rod | 0.90 | `super`: levels about +6, new rarer shallows species, rare weights about ×6 | **Gift**: Lanternport `lanternport_lighthouse_keeper`. Comes after a short request to land three Moorcoil sightings or one Moorcoil catch with the Driftline Rod (flag `got_rod_super`). |

Notes
- I proposed both upgrades as gifts, not shop stock, because they are key items like the bike and the regional shops only sell consumables. **Decision: gift-only.** The Driftline Rod is not sold anywhere.
- `tableFor` already falls back to the best lower tier when a tier is `null`, so maps can gain `good`/`super` tables over time without breaking anything.
- Pacing: Saltmere water sits at level 15–18 and Lanternport at level 42–46, so the two upgrades land at mid-game and late-game.

## 3. Rarity tagging in tables
Each slot gets an optional `rarity` field: `"common" | "uncommon" | "rare"`. A slot without a tag counts as `common`, so existing data stays valid.
```json
{ "species": "moorcoil", "weight": 2, "level": [42, 46], "rarity": "rare" }
```
Authoring guide: a slot whose base share of the table is at least 40% is common, 10–39% is uncommon, and under 10% is rare. The tag is authored by hand, not computed, so designers can keep a story species rare even at a higher weight. The rarity drives bait multipliers, and later it can drive a catch fanfare and the log.

Bait data lives in a new top-level `baits` block in `data/fishing_tables.json`:
```json
"baits": {
  "ripple_grub":   { "bite": 0.10 },
  "glimmer_worm":  { "bite": 0.05, "rare": 2 },
  "deepgut_paste": { "bite": -0.05, "rare": 3, "uncommon": 1.5 },
  "reed_nymph":    { "bite": 0.05, "element": "freshwater", "elementMult": 2 },
  "brine_fleck":   { "bite": 0.05, "element": "sea", "elementMult": 2 },
  "lantern_moth":  { "bite": 0.05, "uncommonMult": 2, "earned": true },
  "hollowstar_roe":{ "bite": 0.05, "rare": 3 }
}
```
Element ids are the existing `el` values in `src/ui/species_synced.gen.js` (`water`, `sea`, `freshwater`, `light`, ...).

## 4. Bait types (bag items, pocket `items`, one consumed per cast)

| Item id | Name | Effect | Price | Where |
|---|---|---|---|---|
| `ripple_grub` | Ripple Grub | Bite +0.10 | 40 | Brookhollow, Fernwick, Saltmere, `_default` (coin tier 0) |
| `reed_nymph` | Reed Nymph | Bite +0.05; **freshwater** species ×2 | 80 | Fernwick, Brookhollow (tier 0) |
| `brine_fleck` | Brine Fleck | Bite +0.05; **sea** species ×2 | 80 | Saltmere, Aurelith (tier 0) |
| `glimmer_worm` | Glimmer Worm | Bite +0.05; rare ×2 | 150 | Fernwick, Saltmere, Revival Heights (tier 1) |
| `deepgut_paste` | Deepgut Paste | Bite −0.05; rare ×3, uncommon ×1.5 (a strong scent spooks some bites) | 400 | Saltmere, Frostspire (tier 1) |
| `lantern_moth` | Lantern Moth | Bite +0.05; **uncommon** ×2 (reworked: no water species has a light secondary type, so the light boost was dropped) | earned only | Lanternport lighthouse keeper: 3 on the super-rod handover, then 1 more whenever you have none |
| `hollowstar_roe` | Hollowstar Roe | Bite +0.05; rare ×3 | earned only | Saltmere fisher: 1 per new species shown (the fishing log). Also a rare reward from master rematches (`data/masters.json`) |

How the prices fit the economy (`shops.json` basePrices): trail_mix 100, crystal_dust 80, small healing item 200, calm_tea 250, large healing item 600. A trainer pays `40 × level`, so beating one level-15 foe (600) buys about 15 grubs or 4 glimmer worms. Bait should cost less per cast than a capture crystal (200), so the common baits are 40–150 and the premium bait is 400. The sell rate follows `shops.sellRate`, and the earned-only baits sell for 0 so nobody farms them for money.

Rules
- Bait is **consumed when the line lands**, whether or not anything bites. There is no refund on an early or late press. This keeps it hard.
- Only one bait is active at a time. The player picks it from the bag (a `field: 'bait'` item sets `bag.activeBait`), and it stays selected until the stack runs out, then falls back to "no bait" with a single line from Text Bot (key `fishing.bait_out`).
- If no bait is selected, casting works exactly as it does today.

## 5. Exact maths
Given rod `r`, optional bait `b`, and the table `T = tableFor(tables, map, r)`:

1. **Bite**: `p = clamp(rods[r].bite + (b.bite ?? 0), 0.05, 0.95)`.
2. **Effective weight** for each slot `s` with base weight `w > 0`:
   `w' = w × R(s.rarity) × E(s.species)`
   - `R = b.rare` if the slot is rare, `b.uncommon` if it is uncommon, else 1. Missing fields count as 1.
   - `E = b.elementMult` if `b.element` is in `species.el`, else 1.
3. **Pick**: a weighted pick over `w'` (same algorithm as `pickFish`). The chance of a slot is `w' / Σw'`.
4. **Level**: uniform in `[lo, hi]`, unchanged.
5. **Expected catches per 100 casts** for a class `k`: `100 × p × Σ_{s∈k} w' / Σ w'`. This assumes a clean hook press. Multiply by the player's hook rate (playtest target about 0.85) for real-world numbers.
6. RNG order in `planCast` stays `wait → bite → species → level`, so existing seeded tests keep their order. The bait is decided before the cast and passed in, as in `planCast(tables, map, rod, rng, hasArt, bait)`.

Proposed code touch points (later): `biteChance(tables, rod, bait)`, `pickFish(table, rng, hasArt, bait, speciesEl)`, and in `index.js` a bag decrement when the line lands.

## 6. Sample map: Lanternport (as built, water-only)
The water-only rule removed mooncrab and seaglint (neither is water type), so the tables were rebuilt:
- basic: reefshell 60 C [42–45], brineseal 25 U [42–46], moorcoil 2 **R** [42–46]
- good: reefshell 55 C [45–48], brineseal 20 U, moorcoil 8 **R** [45–49]
- super: reefshell 40 C [48–52], brineseal 20 U [49–52], tuskwallow 15 U, moorcoil 12 **R** [49–53]

All are water/sea, so Brine Fleck only adds bite here and Reed Nymph does nothing extra. Element baits only ever boost water species (enforced in `effectiveWeight`).

### Expected catches per 100 casts (clean hooks) — `node tools/fishing/sim_gear.mjs lanternport`, checked in tests
| Rod | Bait | Bite | Bites/100 | Common | Uncommon | Rare |
|---|---|---|---|---|---|---|
| basic | none | 0.70 | 70 | 48.3 | 20.1 | 1.61 |
| basic | ripple_grub | 0.80 | 80 | 55.2 | 23.0 | 1.84 |
| basic | reed_nymph | 0.75 | 75 | 51.7 | 21.6 | 1.72 |
| basic | brine_fleck | 0.75 | 75 | 51.7 | 21.6 | 1.72 |
| basic | glimmer_worm | 0.75 | 75 | 50.6 | 21.1 | 3.37 |
| basic | deepgut_paste | 0.65 | 65 | 37.7 | 23.6 | 3.77 |
| basic | lantern_moth | 0.75 | 75 | 40.2 | 33.5 | 1.34 |
| basic | hollowstar_roe | 0.75 | 75 | 49.5 | 20.6 | 4.95 |
| good | none | 0.80 | 80 | 53.0 | 19.3 | 7.71 |
| good | ripple_grub | 0.90 | 90 | 59.6 | 21.7 | 8.67 |
| good | reed_nymph | 0.85 | 85 | 56.3 | 20.5 | 8.19 |
| good | brine_fleck | 0.85 | 85 | 56.3 | 20.5 | 8.19 |
| good | glimmer_worm | 0.85 | 85 | 51.4 | 18.7 | 14.95 |
| good | deepgut_paste | 0.75 | 75 | 37.8 | 20.6 | 16.51 |
| good | lantern_moth | 0.85 | 85 | 45.4 | 33.0 | 6.60 |
| good | hollowstar_roe | 0.85 | 85 | 47.2 | 17.2 | 20.61 |
| super | none | 0.90 | 90 | 41.4 | 36.2 | 12.41 |
| super | ripple_grub | 0.95 | 95 | 43.7 | 38.2 | 13.10 |
| super | reed_nymph | 0.95 | 95 | 43.7 | 38.2 | 13.10 |
| super | brine_fleck | 0.95 | 95 | 43.7 | 38.2 | 13.10 |
| super | glimmer_worm | 0.95 | 95 | 38.4 | 33.6 | 23.03 |
| super | deepgut_paste | 0.85 | 85 | 26.5 | 34.7 | 23.81 |
| super | lantern_moth | 0.95 | 95 | 31.1 | 54.5 | 9.34 |
| super | hollowstar_roe | 0.95 | 95 | 34.2 | 30.0 | 30.81 |

Reading the table: the Driftline Rod gives about 5× the basic rod's Moorcoil rate; Glimmer Worm roughly doubles rares; Deepgut Paste trades bites for rares; Lantern Moth shifts catches to uncommons. The top earned combination (Lanternreach + Hollowstar Roe) gives about 31 rares per 100 clean casts.

## 7. Free-licensed references
- **LootTable.js** (jotson, MIT): https://github.com/jotson/LootTable.js. Weighted choose over arbitrary weights, the same model as `pickFish`.
- **EvenMoreFish docs**, "Weight System": https://evenmorefish.github.io/EvenMoreFish/docs/features/weights. Shows bait as multipliers on rarity or fish weights, which is the model used above. Use it for the concept only; check the project's license before copying any code.
- **Fishing_Incremental** (daniellazureanu, MIT): https://github.com/daniellazureanu/Fishing_Incremental. A small JS fishing game, useful as a UI and loop reference.
- Already credited in the repo: tween.js easing (MIT), see THIRD_PARTY_LICENSES "Fishing v1".
If any of this code gets copied rather than re-implemented, add an entry to THIRD_PARTY_LICENSES.

## 8. Open questions for Gary
1. ~~Gift-only or sold?~~ Decided: gift-only.
2. Should bait be consumed on every landed cast, or only on a bite? (I proposed every cast.)
3. Is a 0.95 bite cap too generous? An alternative is a 0.92 cap.
4. Text Bot needs to name the items and write the lines (`fishing.bait_out`, the rod gift pages).

## 9. As built vs the approved plan
- **Water-only rule** (Gary, after approval): every basic/good/super table holds only water-type species; `pickFish` drops any non-water species at runtime (fails closed when element data is missing); a test fails if any table has one. Removed per map: fernwick seaglint; lanternport mooncrab, seaglint; route_aurelith_saltmere ankerling; route_saltmere_mirefen spraytern; saltmere brinecube, spraytern, dawnfin; tidewater_coast barnaclump; route_fernwick_lanternport seaglint. No table is empty.
- **Lantern Moth** reworked to uncommon ×2 (see §4).
- **Simplified:** Hollowstar Roe only comes from the Saltmere fisher (one per new species you have fished), not from master rematches. The daily Lantern Moth became "1 moth when you have none".
- Good/super tables for other maps are generated by `tools/fishing/gen_gear_tables.mjs` (good: levels +3, rares ×4; super: +6, ×6, rare share capped; one extra water species each).

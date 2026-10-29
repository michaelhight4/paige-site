# Kilumen held items (DESIGN ONLY, no code) — draft for Gary, v0.2.55, Oct 29 2026
Gary 11:43 AM CT Oct 29 2026: "we need to add a list of held items you can buy and get from quests as well like pokemon".
Pokémon categories are used for structure only; every name and flavour line is Kilumen's own. Text Bot writes the final player text.
All numbers are PLACEHOLDER until Gary signs off.

## 0. What exists today (read from code)
- **Holding works in the field only.** `creature.held` (string id) is saved (creature.js, save.js), shown on the summary screen, and set from the bag (systems_screens.js: one holder per item; picking the holder again takes it back). Items with `held: true` in `src/systems/items.js` FIELD can be held.
- **Two held items exist:** `gold_coin` (x1.5 trainer money, read in `shop.js awardPrize`, cfg.goldCoinMult) and `team_link_band` (key item, from Saltmere, `src/systems/link_band.js`: a holder that sat out the faint gets **half** XP, `battle.js linkShare`).
- **The battle engine never sees held items.** `buildItems()` (src/battle/data/rules.js) only exports BATTLE_ITEMS (remedies, tea, crystals) as bag items; `kilumen.ts runItem` only handles kHeal/kCure/kEnergy/kCrystalGrade from the bag. `creature.held` is not passed into the engine team set.
- **But the engine is a Showdown fork**, and its core still has the item plumbing: `setItem`, `takeItem`, `eatItem`, `useItem`, `ignoringItem`, `runEvent("ModifyCritRatio")` and the item event hooks (onModifyAtk, onBasePower, onResidual, onDamage, onModifyMove…). So **one wiring job (P1) turns most battle items into data**: pass `held` into the team set and add item rows with Showdown-style handlers.
- Money: shop basePrices run 80–1500 (Pep Remedy 1500, Apex Crystal 1500). Masters pay 120 x level, rival 60 x level. A Lv 20 Master pays 2,400; a Lv 50 post-game Master 6,000.
- Design docs: `design/overnight_quests/SIDE_QUESTS.md` and `vendor/battle-sim/sim/kilumen.ts` are **not in the live tree** (/workspace/ps_clone/kilumen); I read them from the /tmp/tt/k copy. SPORTS_FEEDS.md is at /workspace/kilumen/design. Worth syncing.
- Shops.json has regions for brookhollow, fernwick, revival_heights, frostspire, aurelith, saltmere + _default only; Sunmeadow, Mirefen, Lanternport, Cindervale need shop rows.

Legend: **ENGINE** = already supported (works today or is pure data once P1 wiring exists, using fork core); **NEW** = needs Kilumen-specific code. "Reuse" = permissive code to copy/adapt first (Gary's rule). Showdown `data/items.ts` is MIT (github.com/smogon/pokemon-showdown, MIT licence) — our engine is that fork, so each handler copies straight in with a THIRD_PARTY_LICENSES line.

## 1. Pricing & hardness rules
- Shop held items cost 1–3 Master fights' pay, so buying one is a choice. Nothing over x1.2 power is ever sold before Region 5.
- **Strong effects (survive-a-hit, choice-lock, x1.5 XP, life-drain, priority) are quest, hall or post-game only**, one copy each, not sellable (key: true or no sell price).
- One copy of each held item per creature; no duplicate held items in Master fights (Masters may hold items too — see decision 3).
- Sell price = 50% (existing sellRate) where sellable.

## 2. Type boosters — "Charms" (24, one per element)  — ENGINE (P1)
Effect: holder's moves of that element deal **x1.15** damage (Showdown's are x1.2; ours lower to keep it hard). Reuse: Showdown items.ts `charcoal` / `mysticwater` `onBasePower` handler, change type and multiplier.
Source: the region's own shop sells its two "home" elements' charms at **2,000**; the rest come from quests/halls; the three rare elements are post-game.

| Element | Name | Flavour (draft) | Source (first region) |
|---|---|---|---|
| grass | Sprig Charm | a pressed leaf that never wilts | Fernwick shop 2,000 |
| bug | Shellbead Charm | a beetle wing set in resin | Fernwick: quest *Where the Fireflies Went* |
| water | Droplet Charm | glass bead with a drop sealed inside | Saltmere shop 2,000 |
| sea | Tidebell Charm | a shell that hums the tide | Saltmere shop 2,000 |
| freshwater | Brookstone Charm | river stone worn smooth | Brookhollow side quest *A Fly for the Fisher* (replaces feed_bag) |
| normal | Plainthread Charm | a knotted cord, nothing more | Revival Heights shop 2,000 |
| light | Glint Charm | a mirror chip that holds noon | Revival Heights shop 2,000 |
| spirit | Wisp Charm | a moth-light in a jar stopper | Revival Heights Hall prize |
| ghost | Hush Charm | a bell with no clapper | Lanternport quest (night) |
| wind | Gustfeather Charm | a feather that won't fall | Frostspire shop 2,000 |
| bird | Quill Charm | a striped tail quill | Frostspire shop 2,000 |
| earth | Clodstone Charm | packed clay, stamped with a paw | Sunmeadow shop 2,200 |
| fire | Ember Charm | a coal that is warm in your hand | Sunmeadow shop 2,200 |
| swamp | Bogroot Charm | a twisted root, always damp | Mirefen shop 2,400 |
| rain | Drizzle Charm | a vial of rain that rattles | Mirefen shop 2,400 |
| mystic | Runestitch Charm | a cloth patch stitched with signs | Lanternport shop 2,400 |
| dark | Dusk Charm | black glass that eats lamplight | Lanternport shop 2,400 |
| magma | Slag Charm | cooled lava with a red seam | Cindervale shop 2,600 |
| dragos | Scaleshard Charm | a scale too big for any lizard | Cindervale quest |
| demon | Horncap Charm | a cracked horn tip | Cindervale Hall prize |
| devil | Brimtooth Charm | a tooth that smells of smoke | Aurelith capital shop 3,000 |
| angelic | Halo Charm | a thin gold ring, floats a little | Aurelith capital quest |
| god | Crownstone Charm | stone from the capital's oldest wall | post-game: Aurelith league win |
| legendary | Mythmark Charm | a token no one remembers making | post-game: final side quest |

## 3. The other held items (24)
| # | Name | Category | Effect (numbers) | Source (first region) | Engine | Reuse (permissive) |
|---|---|---|---|---|---|---|
| 1 | **Iron Brace** | stat boost | Power x1.1 (physical attack) | Saltmere shop 3,000 | ENGINE | items.ts `onModifyAtk` pattern (Choice Band handler minus lock) |
| 2 | **Focus Lens** | stat boost | Focus x1.1 (special attack) | Saltmere shop 3,000 | ENGINE | same, `onModifySpA` |
| 3 | **Hide Vest** | stat boost | Defence & Sp. Def x1.15 if the holder can still evolve | Frostspire quest | ENGINE | items.ts `eviolite` |
| 4 | **Moss Wrap** | healing over time | heals 1/16 max HP end of each turn | Fernwick: *Ticks on the Flyer* (swap one shake) | ENGINE | items.ts `leftovers` `onResidual` (rules.js already has an onResidual 1/16 example) |
| 5 | **Sap Vial** | healing over time | heals 1/8 HP of damage dealt (life drain on hits) | Mirefen Hall prize | ENGINE | items.ts `shellbell` |
| 6 | **Remedy Pouch** | auto-heal | eats itself at ≤50% HP: heals 25% max HP (once) | Brookhollow shop 400 (consumable) | ENGINE | items.ts `sitrusberry` `onUpdate` + `eatItem` (rename only) |
| 7 | **Last Stand Ribbon** | survive-a-hit | from full HP, a KO hit leaves 1 HP; then it is used up (single-use, quest re-gives 1/day) | Frostspire quest | ENGINE | items.ts `focussash` |
| 8 | **Grit Buckle** | survive-a-hit | 10% chance to survive any KO hit at 1 HP | post-game Aurelith hall | ENGINE | items.ts `focusband` |
| 9 | **Oath Band** | choice-lock | Power x1.5, locked into the first move until switched | Cindervale quest | ENGINE | items.ts `choiceband` (+ `choicelock` volatile in conditions.ts) |
| 10 | **Oath Lens** | choice-lock | Focus x1.5, locked | Lanternport Hall prize | ENGINE | `choicespecs` |
| 11 | **Oath Spurs** | choice-lock | Speed x1.5, locked | post-game | ENGINE | `choicescarf` |
| 12 | **Hawk Lens** | crit | crit stage +1 | Frostspire shop 2,800 | ENGINE | `scopelens` `onModifyCritRatio` |
| 13 | **Steady Sight** | accuracy | move accuracy x1.1 | Sunmeadow shop 2,500 | ENGINE | `widelens` `onSourceModifyAccuracy` |
| 14 | **Mint Sprig** | status cure | cures any status once, then used | Fernwick shop 500 (consumable) | ENGINE | `lumberry` (rename, no fruit word) |
| 15 | **Clear Bell** | status guard | holder cannot be put to sleep or confused | Revival Heights quest | NEW (small) | adapt items.ts `onSetStatus` / `onTryAddVolatile` (pattern from Safety Goggles/Covert Cloak) |
| 16 | **Quick Tassel** | speed/priority | 20% chance to act first in its priority bracket | Mirefen shop 3,000 | ENGINE | `quickclaw` `onFractionalPriority` |
| 17 | **Swift Anklet** | speed | Speed x1.1, no lock | Sunmeadow quest | ENGINE | `onModifySpe` pattern (choicescarf without lock) |
| 18 | **Team Link Band** (exists) | XP | **change per Gary's rule:** holder on the bench gets **+25% of the XP share** for each faint, even if it never battled (today: half XP, only if it sat out) | Saltmere (existing link_band.js) | NEW (edit `battle.js linkShare` amt/2 → amt*0.25) | own code |
| 19 | **Apprentice Badge** | XP | holder earns x1.5 XP from battles it fights in | Lanternport quest (one only) | NEW | ~10 lines in battle.js XP award; Showdown has no XP (no reuse; Lucky Egg logic is trivial) |
| 20 | **Gold Coin** (exists) | money | trainer prize x1.5 | Revival Heights quest (keep as-is) | ENGINE (field, shop.js) | own code |
| 21 | **Tally Purse** | money | +10% trainer prize, stacks with nothing (sold version) | Lanternport shop 4,000 | NEW (tiny, shop.js) | own code |
| 22 | **Lure Lantern** | encounter | lead holder: wild encounter rate x1.5 in grass | Fernwick: *The Missing Note* (pairs with firefly_lantern) | NEW | encounters.js rate hook; no reuse needed |
| 23 | **Hush Cloak** | encounter | lead holder: wild encounters x0.5 | Frostspire shop 1,500 | NEW | same hook |
| 24 | **Tamer's Thread** | capture | crystal catch rate x1.2 when the holder is active, wild only | Mirefen quest | NEW | capture.js multiplier; no reuse (catch math is ours) |
| 25 | **Coach's Whistle** | sports/practice | practice events: Fullness drains x2 but build gain x1.5 (per SPORTS_FEEDS §8) | Sunmeadow sports hall prize | NEW | sports code, own |
| 26 | **Orchard Satchel** | sports/feeds | after a practice top-2 finish: +1 local fruit; harvest +1 yield | Sunmeadow shop 3,500 | NEW | garden code, own |
| 27 | **Pacer Band** | sports | event score +5% in the holder's best event; no effect in battle | Aurelith major event prize | NEW | sports code, own |

Total: 24 charms + 27 items (2 existing). If Gary wants nearer 40, cut charms to the 20 non-rare elements and drop #8, #21, #27.

## 4. First availability by region
Brookhollow: Remedy Pouch, Brookstone Charm. Fernwick: Sprig/Shellbead Charms, Moss Wrap, Mint Sprig, Lure Lantern. Saltmere: Team Link Band, Iron Brace, Focus Lens, Droplet/Tidebell. Revival Heights: Gold Coin, Clear Bell, 3 charms. Frostspire: Hide Vest, Last Stand Ribbon, Hawk Lens, Hush Cloak, 2 charms. Sunmeadow: Steady Sight, Swift Anklet, Coach's Whistle, Orchard Satchel. Mirefen: Sap Vial, Quick Tassel, Tamer's Thread. Lanternport: Oath Lens, Apprentice Badge, Tally Purse. Cindervale: Oath Band. Aurelith: Brimtooth/Halo, Pacer Band. Post-game: Oath Spurs, Grit Buckle, Crownstone, Mythmark.
Quest swaps above change only reward rows in SIDE_QUESTS.md; new quests for Regions 4–8 still need writing (Text Bot).

## 5. Phased build plan
- **P1 wiring (the big one):** pass `creature.held` into the engine team set (battle.js build + rules.js `buildItems()` merges a new `HELD_ITEMS` table); show `-item`/`-enditem` lines in ui_sd.js; consumed items cleared from `creature.held` after battle. Add charms + #1-14, #16-17 as data rows copying Showdown items.ts handlers (MIT; add to THIRD_PARTY_LICENSES). Tests: one battle per handler.
- **P2 XP & money:** Team Link Band to +25% bench share; Apprentice Badge; Tally Purse. Shop rows for the 4 missing regions + prices.
- **P3 field items:** Lure Lantern, Hush Cloak, Tamer's Thread, Clear Bell.
- **P4 sports:** Coach's Whistle, Orchard Satchel, Pacer Band (after SPORTS_FEEDS ships).
- **P5 content:** quest reward swaps, new region quests, Master held items, Text Bot item descriptions.

## 6. Decisions for Gary
1. Link Band: replace "half XP if sat out" with "+25% share on the bench", or keep both (two items)?
2. Charms at x1.15 (harder than Pokémon's x1.2) and 2,000-3,000 each — OK?
3. Should Masters and the rival hold items (makes fights harder; Showdown supports it free once P1 lands)?
4. Survive-a-hit and choice-lock items quest/hall-only, never sold — agreed?

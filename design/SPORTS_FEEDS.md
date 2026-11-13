# Sports Feeds: growing a creature's athletic body (DESIGN ONLY, no code)
Requested by Gary 11:14 AM CT, Oct 29, 2026. Written Oct 29, 2026. Status: proposal, every number is PLACEHOLDER until Gary signs off.
Player-facing names below are placeholders; Text Bot writes all final text. Gary rulings: **no berries at all**; feeds come from
other fruit kinds (melons, figs, citrus, stone fruit, pods, gourds), and invented Kilumen fruits are welcome.

## 0. What exists today (read from code)
- `src/sports/athletics.js`: each creature has `c.ath = { v:1, q:{speed,power,stamina,agility,focus} 0..1, traits[] }`.
  The shown stat is `lo + q*(hi-lo)` of the species range (rules.js: type centre +-14, body shape, base-stat lean, evo stage shift).
  Rolled from the uid, so it is stable with no save. **There is no way to raise it yet.** This doc adds that way.
- Rivals are rolled with a 0.75 skew (`rollRivalAthletics`): "games are meant to be hard". Feeds are how the player closes that gap.
- Events: Dash (Brookhollow, live), Garden Hop (Fernwick), Tide Run (Saltmere), Signal Relay (Revival Heights),
  Ice Slide (Frostspire), Lantern Catch (Lanternport), Forge Push (Cindervale) in `ps_clone/.../town_events.js`; Aurelith hosts the major meet.
- Items: `src/systems/items.js` already has a **`feeds` pocket** (trail_mix, feed_bag_small, feed_bag, vigor_seed; shop prices 100/150/400/1200).
  No plant, garden or harvest system exists anywhere. XP share is `XP_SHARE = 0.25` (`src/qol/flags.js`).

## 1. Growth stats: six body parts
A creature keeps its rolled *talent* (`q`). Feeds grow a separate *build* layer per body part. Build adds flat points on top of the rolled stat.

| Part (placeholder) | Grows stat | Notes |
|---|---|---|
| Legs | speed (+ a little agility) | every creature |
| Lungs | stamina | every creature |
| Grip | power | every creature |
| Mind | focus | every creature |
| Fins | swim (event-only stat) | only grows past stage 1 on water/sea/freshwater/swamp/rain types or serpent shape; others cap at stage 1 |
| Wings | glide (event-only stat) | full growth on avian shape, wind/bird/angelic/light types; others cap at stage 1 |
Agility = 0.5 Legs + 0.5 Wings build (no separate part: keeps the menu at six).

Event weights (how much each part's build counts in that event's score; rows sum to 1):

| Event (town) | Legs | Lungs | Grip | Mind | Fins | Wings |
|---|---|---|---|---|---|---|
| Dash (Brookhollow) | .55 | .25 | .10 | .10 | - | - |
| Garden Hop (Fernwick) | .40 | .10 | .10 | .25 | - | .15 |
| Tide Run (Saltmere) | .25 | .25 | - | .10 | .40 | - |
| Signal Relay (Revival Heights) | .20 | .15 | - | .55 | - | .10 |
| Ice Slide (Frostspire) | .15 | .10 | .25 | .30 | - | .20 |
| Lantern Catch (Lanternport) | .15 | .10 | - | .35 | - | .40 |
| Forge Push (Cindervale) | .10 | .30 | .55 | .05 | - | - |
| Aurelith major (all seven) | sum of the event rows used that day | | | | | |
No single part wins the major meet: an all-rounder build is the long goal.

## 2. Build numbers, caps, diminishing returns, trade-offs (the grind)
- Each part: **0-60 build points**. Total across all six: **cap 150** (structure: per-stat cap + total cap, like effort points). So a creature can max at most 2.5 parts.
- Build -> stat: `+round(build * 0.25)` -> max **+15** to a stat (a rolled range is ~28 wide, so feeds matter but talent still matters).
- Diminishing returns on each feed: gain = base x tier multiplier: 0-19 build x1.0, 20-39 x0.6, 40-60 x0.3.
- **Fullness** (structure of a fill meter): each creature has Fullness 0-100. Each feed adds Fullness (10-35). At 100 it refuses feeds.
  Fullness drops by 10 per completed practice event or 5 per battle won, *not* with time. Hard work empties it; you cannot feed-spam.
- **Trade-offs**: each feed raises one or two parts and lowers an opposite one by a little (Grip up -> Legs -1, Wings up -> Grip -1, Lungs up -> Mind -1, Mind up -> Grip -1, Fins up -> Wings -1, Legs up -> Lungs -1). Mixed feeds avoid the penalty only if well made.
- **Likes/dislikes** (structure of natures + flavours): each creature rolls one liked and one disliked taste from its uid (stable, no save).
  Five tastes: Sweet, Sour, Bitter, Tangy, Earthy. Liked = x1.25 gain and -5 Fullness; disliked = x0.75 gain and +10 Fullness.
- **Reset feed**: a rare fruit lowers one part by 10 (refund room under the 150 cap).
- Rough grind time to fully build one creature (150 points): about **25-35 garden harvest days + 60+ practice events**. One 2-part specialist ~10 days.

## 3. The fruits (original Kilumen fruits, no berries)
Raw fruit is a weak feed; its main use is mixing (section 5). base = raw build points.

| Fruit | Kind | Look | Taste | Biome / region | Raw gain | Fullness |
|---|---|---|---|---|---|---|
| Rumblemelon | melon | fat striped green melon that thumps when knocked | Sweet, watery | Brookhollow meadows | Lungs +3 | 30 |
| Dashfig | fig | small purple teardrop, split shows gold seeds | Sweet, jammy | Brookhollow hedges | Legs +3 | 15 |
| Padgourd | gourd | flat lily-pad-shaped gourd that floats | Earthy | Fernwick ponds | Legs +2, Wings +1 | 20 |
| Mossplum | stone fruit | velvet green plum with a moss fuzz | Bitter-sweet | Fernwick woods | Mind +3 | 15 |
| Saltlime | citrus | pale blue lime with a salt crust on the peel | Sour, salty | Saltmere shore | Fins +3 | 15 |
| Tidepod | pod | long kelp-brown pod that rattles with beads | Tangy | Saltmere tidepools | Fins +2, Lungs +1 | 20 |
| Sparkcitron | citrus | yellow citron whose peel ticks with tiny static | Sour, fizzy | Revival Heights | Mind +3 | 15 |
| Frostquince | stone fruit | hard white quince, frost never melts off it | Bitter, cold | Frostspire | Grip +2, Mind +1 | 20 |
| Glidepod | pod | papery winged pod that drifts off the vine | Sweet, light | Frostspire cliffs / Lanternport | Wings +3 | 10 |
| Glowmelon | melon | small melon with a faint inner glow at night | Sweet, floral | Lanternport | Wings +2, Mind +1 | 25 |
| Embergourd | gourd | ridged red gourd, warm to the touch | Earthy, spicy | Cindervale | Grip +3 | 25 |
| Cinderapricot | stone fruit | ash-dusted orange apricot | Tangy | Cindervale | Grip +2, Lungs +1 | 20 |
| Sunheart Fig | fig (rare) | gold fig that only fruits in Aurelith | all tastes | Aurelith only, prize | +2 to every part | 35 |
| Hollowpith | gourd (rare) | grey empty gourd that sounds like a drum | Bitter | prize / deep shop | Reset: -10 to one chosen part | 10 |

## 4. Where feeds come from
1. **Garden plots** (main loop). Each town with an event has a community plot; the home has 4 plots, more from the Benefits Board.
   Plant a **seedling** (bought or from a harvest) -> 4 stages: Sprout, Leaf, Flower, Fruit. Real-time growth 8-24 h per fruit (rare 48 h),
   plus each practice event in that town ticks local plots by 1 h (ties sport to garden).
   **Watering**: a watering can, each plot needs it once per stage; dry plot = growth pauses (never dies, no punishment beyond time).
   Yield 2-5 fruit; well watered + biome-matched soil = top yield. Wrong biome = 1 fruit. Each harvest has 30% chance of a seedling back.
   Optional: a creature with a liked taste helping in the garden adds +1 yield (soul moment).
2. **Mixing at a Feed Kitchen** (one per event town; structure of a blender/cooker): put 2-4 fruit in, play a short timing stir (reuses the Forge Push ping-pong marker). Result is a **feed cake**:
   - gain = sum of raw gains x mix quality (0.8-1.6 by timing) ; trade-off penalty removed at quality >= 1.3.
   - taste = majority taste of the fruits; Fullness = average of the fruit Fullness (so mixing saves Fullness: the key reason to cook).
   - same fruit twice = "bland" (x0.7). 4 different biomes = "festival" bonus x1.2.
3. **Shops**: seedlings of the local town's two fruits (300-600 coins), watering can (key item), plain feed cakes (one part +4, 900 coins, quality 1.0). Existing `vigor_seed` (1200) becomes a seedling pack.
4. **Event prizes**: practice = 1 local fruit for a top-2 finish; tournament win = rare seedling; Aurelith major = Sunheart Fig seedling, Hollowpith.
5. Wild pickups (fruit bushes in grass areas) at a low rate: one per area per day.

## 5. How growth shows (with soul)
- **Build card** (creature summary -> Sports tab): six part icons, each with a stat bar (0-60) and a stage icon:
  Stage 0 Plain (0-14), 1 Toned (15-29), 2 Strong (30-44), 3 Peak (45-60). Icon art: legs with motion lines, lungs/chest puff, gripping paw, fins, wings, a calm eye.
  The bar shows a lighter "next feed" preview when a feed is selected, and greyed part cap. Total cap shows as a ring 0/150. Fullness as a bowl that empties.
- **Sprite touches**: at Peak in a part, a small permanent look in sports scenes (dust trail for Legs, steam breath for Lungs, chalked paws for Grip, fin shimmer, wing flutter, a focus glint).
- **Reactions** when fed (from SOUL_PLAYBOOK style): liked taste = hop, heart puff, a short happy line; neutral = chew + nod; disliked = scrunch face, turns away for a second, still eats it (we never refuse a feed the player paid for, except Full).
  Full: creature pats belly, lies down. First time a part hits a new stage: a little flex pose + jingle.
- Coaches at each venue comment on the build ("Those legs have grown") and hint the event's key part.
- Likes/dislikes start hidden; the player learns them by feeding (shown after first try), so discovery is part of the bond.

## 6. UI flow
Bag -> Feeds pocket -> pick feed -> pick creature (list shows Fullness bowl + liked/disliked icon if known) -> preview bars (gain, trade-off in red, Fullness) -> Confirm -> reaction animation -> updated build card.
Garden: walk up to plot -> menu: Plant / Water / Harvest / Look (stage, time left). Kitchen: pick fruits -> stir mini-game -> cake result card -> to bag.
Venue: before an event, an "event focus" strip shows which parts that event weights.

## 7. Save data shape (adds to existing, lazy defaults, no version break)
```
creature.ath = { v:1, q:{...}, traits:[...],            // existing
  build: { legs:0, lungs:0, grip:0, mind:0, fins:0, wings:0 },  // 0..60 each, total <= 150
  full: 0,                                               // Fullness 0..100
  tasteKnown: { liked:false, disliked:false } }          // liked/disliked themselves roll from uid, not saved
save.garden = { plots: [ { id:'home_1', fruit:'dashfig'|null, plantedAt: ms, stage:0..4, wateredStage:-1..3, bonusMs:0 } ],
                canLevel: 1 }
save.bag.feeds += fruit ids, seedling ids ('seed_dashfig'), cake ids with data: { id:'cake', parts:{legs:5,..}, taste:'sweet', quality:1.3, full:18 }
```
Cakes are stack-by-identical-data. Time uses server/device clock with a cap so clock changes cannot skip more than one stage.

## 8. Fit with XP boosters and the 25% XP share
- Build and XP are separate tracks: **XP never raises build**, and feeds never give XP. Level stays a battle thing.
- Fullness drains from **battles won** (5) too, and benched creatures getting the 25% XP share also drain Fullness by 25% of that (1.25), so the share helps a whole team keep eating at a slow rate. That mirrors the share without letting it grow build.
- XP booster items do not affect feeds. A separate rare "Coach's Whistle" held item (later) could make practice events drain double Fullness: the sports-side "booster", only for practice.
- Evolution keeps build points (like `q` is kept); later stages have higher ranges so build stacks on a bigger base.

## 9. Balance numbers (start points)
| Thing | Value |
|---|---|
| Part cap / total cap | 60 / 150 |
| Build -> stat | x0.25 (max +15) |
| Diminishing tiers | 1.0 / 0.6 / 0.3 at 0 / 20 / 40 |
| Fullness drain | 10 per practice, 5 per battle win, 1.25 per shared XP award |
| Liked / disliked | x1.25 -5 Full / x0.75 +10 Full |
| Grow time | 8-24 h common, 48 h rare, -1 h per local practice |
| Yield | 1-5, seedling back 30% |
| Mix quality | 0.8-1.6 |
| Shop cake | +4 one part, 900 coins |
Check with the existing race sim (`tools/sports/stage_race.mjs`, `stats_sheet.mjs`): a fully built average creature should beat 0.75-skew rivals ~55% in its best event, and an unbuilt one ~25%.

## 10. Phased build plan
1. **Data + math** (no UI): build/full fields, feed table, gain/cap/trade-off functions, hook build into `athleticStats` and the race; unit tests + sim check.
2. **Feeding UI**: Feeds pocket use, preview, reactions, build card with stage icons and bars. Shop sells plain cakes + 4 fruits. Playable with Dash.
3. **Garden**: home plots, seedlings, watering, harvest, timers; then town community plots.
4. **Feed Kitchen** mixing mini-game and cakes.
5. **Fins/Wings + per-event weights** for the six town events; prizes; Aurelith rare fruits; coach lines.
6. Polish: Peak sprite touches, taste discovery, balance pass with sims, Text Bot final names.

## 11. Word check
No banned words used in player-facing names (no PP, shiny, super effective, Pokédex, Poké Ball, Gotcha!, nurse, weed, route, throw). No "berry" anywhere.
"Seedling" used instead of "seed" packs is fine; avoid "weed/weeding" in garden text (use "tidy the plot" if ever needed).

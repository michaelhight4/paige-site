# Kilumen expansion plan: match Pokemon Gold, then beat it

Status: PLAN ONLY (no code changes). Written Oct 29 2026, 3:08 PM CT, from the live/dev vs Gold comparison.
Gary (pt2055u): "we need to expand hard to match their size and quality then beat it."
Baseline: live `paige-site/kilumen` (origin/main, Oct 29 2:59 PM CT) and `dev/r56-wiring` (66065fce).
Gold figures marked (v) were checked on Bulbapedia; the rest are well-known numbers, not checked.

## 1. Targets (beat Gold in every category)

| Category | Live today | Dev today | Gold | Kilumen target |
|---|---|---|---|---|
| Regions | 4 | 6 | 2 (v) | 8 + the mountaintop region (a full region, reached after Ending 1) (the time-travel finale reuses past-era Kilumen) |
| Towns / cities (outdoor) | 8 | 8 | ~21 | 24+ |
| Paths / trails / wilds (outdoor) | 18 | 18 | 46 numbered (v) | 50+ |
| Caves / dungeons | 2 | 3 | ~15 | 18+ (each with its own puzzle and layout) |
| Interiors | 39 | 41 | 100+ | 140+ (unique interiors for every story building) |
| Total maps | 67 | 70 | several hundred | 250+ |
| Species (art + wild) | 259 / ~220 | 254 / ~217 | 251 (v) | 300+, every one catchable somewhere |
| Evolution lines | 43 multi-stage, 159 single | 42 / 159 | ~105 families | 110+ lines; at most ~30 deliberate single-stage (legendaries, unique ones) |
| Masters / coins | 8 built, 4 reachable | 6 wired | 16 badges + Elite Four (v) | 8 Masters + the Guardian (final boss); Aurelith Stadium Arena final tower (ending 1): 8 trainers on 8 themed floors (one-go gauntlet), re-battleable unlimited times |
| Trainers | ~137 | ~139 | ~400 | 420+ (every one with a name, a class, a line) |
| Named NPCs | ~12 | ~12 | dozens | 80+ with a name, home and line |
| Skills | 32 placeholder | 37 | 251 | 200-260 real skills, each with description, power, accuracy, effect |
| Items / held | 42 / 42 | same | ~250 | 260+ total (consumables, feeds, crystals, key items, held) |
| Quests | 52 | 52 | none | 120+ (main + side) |
| Side content | sports, fishing, bike, Skylift, rail, benefits | same | Bug Contest, Game Corner (v) | everything here + 2 new (e.g. a farm/garden plot, a weekly league event) |
| Postgame | none | none | Kanto + Red (v) | no new region (Gary, Oct 29 2026): the Guardian win rolls credits, then the player keeps playing in the existing world (catching, battles, side content) |
| Playtime | ~5-8 h | ~8-12 h | ~30-40 h | 35-45 h to the Guardian finale |

## 2. Quality bar (blocks release of any phase)

- No placeholder anything: no `PLACEHOLDER`, `name_placeholder`, `DRAFT`, "No description yet", stand-in species, or flat stage stats in any player-facing path. A CI check (Coder) fails the build if any of these strings reach the screen.
- Grid-fit asset standard: every tile, building and prop sits on the 64 px grid, collision matches the art, no half-tile overhangs, integer zoom only (1x/2x/3x sheets).
- Full-resolution art: every creature, building, NPC and effect at final resolution, never upscaled; battle and overworld sprites for every species.
- Life and personality in every feature: every town has a story, at least one quest and named locals; every Master has a personality, a hall puzzle and a theme; every trail has a landmark, trainers and a secret; ambient animation and audio everywhere.
- Balance pass: real stat sheets, catch rates, XP curve and level pacing per region, signed off by Gary.
- Terminology: Kilumen words only (paths/trails, Masters, halls, coins, crystals); see the Text Bot blocked-words list.

## 3. Phased roadmap (Gary's order, updated Oct 29 2026 3:26 PM CT: regions 5-8, then P1-P3, then the finale)

Already in progress alongside P1 (not a new phase): dev/interim-ending (all 8 Masters reachable + interim ending) and the Soccer Rpg bot's blockers: Revival Heights prism, Mirefen lamp gating, DRAFT / "No description yet" text, Fernwick coin in Key Items. (Coder, World Design, Text Bot)

### P0: Regions 5-8 first (Gary reprioritised Oct 29 2026, 3:26 PM CT) (~5-7 weeks)
- Regions 5-8 come BEFORE hall trainers, skills and caves. Another worker is building them on dev/regions-5-8; dev/r56-wiring folds into that. Aurelith city to the approved plan. P1-P3 then rebase on top. (Coder, World Design, Character models)

### P1: More hall trainers (~1 week)
- All 8 halls get ~5-8 trainers each (existing helpers included). Teams match the hall's element and sit just under the Master's levels. Placement fits the grid, with fair sight lines that don't trap the player. (Coder, World Design, Story Bot names, Text Bot lines)
- Built on dev/hall-trainers.

### P2: Skills, stats and names (~3-4 weeks)
- 200-260 real skills with descriptions, power, accuracy, energy and effect, plus hit effects. Reuse the Pokemon Showdown patterns (MIT). (Story Bot, Text Bot, Coder, Animator)
- Real stat sheets for every species. Evolution lines for ~130 single-stage species. (Character models, Coder, Story Bot)
- Final names for Masters, trainers and NPCs; no placeholder left. (Story Bot, Text Bot)

### P3: 4 new caves + 3 new maps + 2 towns without halls (~3-4 weeks)
- 4 caves, each with its own puzzle mechanic (dark/lamps, ice slide, currents, push blocks). (World Design, Coder, Animator)
- 3 new outdoor maps (paths/trails or wild areas). (World Design)
- 2 towns with no hall, built around region-specific content: local quests, shops, a sport or fishing spot, named locals. (World Design, Character models buildings, Story Bot, Text Bot)

### P4: Two endings: final tower, then Wellspire (the mountaintop region) and the Guardian finale (~7-10 weeks, the mountaintop is a full region)
- **Ending 1: final tower**, the Aurelith Stadium Arena. 8 trainers, each on their own floor with its own theme (8 themed floors: unique tiles, music, element and team per floor), all re-battleable unlimited times (Gary, Oct 29 2026). Gauntlet rule (Gary): all 8 floors must be beaten in one go, with no going back to heal. Leaving or losing resets the run to floor 1. Items in the bag stay usable unless Gary decides otherwise. Beating floor 8 sets `tower_done` and rolls the first credits. Floor themes come from Story Bot and the floor maps from World Design; Character models do the floor tiles and trainers, Animator the effects. Coder: run state, no heal or exit points between floors, a reset on loss or exit, the first credits, and tests.
- **Bridge:** after the first credits, a courier brings a head-office letter that sends the player to investigate a disturbance in a mountaintop region. (Story Bot, Text Bot: letter and courier scene; Coder: courier trigger after `tower_done`)
- **Wellspire, the mountaintop region (a FULL region, Gary Oct 29; not a short dungeon):** reached only through the courier letter after Ending 1 (`tower_done`). Built to the same bar as regions 5-8: a town or base camp with heal point and shop, 3+ outdoor mountain maps (lower slopes, ridge, summit approach), at least one cave, its own wild species table, a full trainer roster, side quests and contact trainers, Skylift landing plus a trail way back, and the summit shrine where the player meets the Guardian. Sized like one of regions 5-8 (~3-4 weeks of map/art/text work on top of the finale). (World Design maps, Character models tiles/buildings/species, Story Bot, Text Bot, Coder gating on `tower_done`)
- **Ending 2: Guardian finale (canon).** On the mountaintop the Guardian throws the player back in time to the Kilumen rebellion. The player defeats the research teams, releases the Guardian from his crystal enclosure, then fights him. The past era reuses rebellion-era versions of existing places. (Story Bot, World Design, Character models, Animator: time warp, crystal shatter, Guardian battle effects)
- Winning sets `finale_done` and rolls the second credits. Then the player keeps playing in the existing world: catching, battles, side content. No extra postgame continent (Gary, Oct 29 2026).
- Replay content task (Coder, Story Bot, Text Bot): after `finale_done`, contact (phone) rematches and side quests keep firing, with stronger teams. Add a post-finale level tier to the contact rematch steps and the side-quest trainers, and lift the region XP cap. The Arena's 8 trainers stay re-battleable. Tests cover a save that has `finale_done` set.
- Done when: the credits roll, the save keeps working, and contact rematches and side quests still trigger with stronger teams.

Total rough effort: ~19-27 weeks, with owners working in parallel.

## 4. Owners

| Owner | Responsibility |
|---|---|
| Coder | engine, data wiring, skills/evolution systems, gates, tests, no-placeholder CI check |
| World Design | all maps: paths/trails, towns, caves, interiors, gates, encounter tables |
| Character models | creatures, evolution forms, NPCs, buildings, full-res sprites |
| Animator | skill/hit effects, evolution, cutscenes, time-warp, ambient life |
| Story Bot | main plot, Guardian canon (credits, then free play), quests, Master/NPC personalities, dex lore |
| Text Bot | every player-facing line, descriptions, keys; zero DRAFT text |

## 5. Reuse first
Before building anything, check the toolkit registry and dev notes and use free-licensed code first: Pokemon Showdown (MIT) for battle mechanics and items, existing open tile and pathfinding libs, CC0 audio/effects. Log every reused tool and its licence in THIRD_PARTY_LICENSES.

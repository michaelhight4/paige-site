# Farm, fruit feeds and day care: open-source shortlist (RESEARCH ONLY, no code changed)
Requested by Gary 11:42 AM CT, Oct 29, 2026 ("yes look for open source please"). Written Oct 29, 2026 ~11:55 AM CT by Grok Bot.
Scope: fruit feeds + cakes (SPORTS_FEEDS.md), player home with 8 crop plots, neighbouring day care with daily XP.

## 0. Registry check first
- `/workspace/quality/OPEN_SOURCE_TOOLKIT.md`, `toolkit/`, `dev_notes/kilumen*.md`: **nothing adopted for farming, crops, offline timers or day care.**
- Reusable already: Kilumen `save.js` (versioned save), seeded RNG `src/sports/rng.js` (mulberry32/cyrb53), the `feeds` items pocket, workbox PWA (unrelated). Evolve Idle was looked at Oct 27 (MPL-2.0, reference only), Trimps unverified, so neither is a candidate.
- Licence rule: MIT/BSD/Apache/ISC code, CC0 assets ship; CC-BY ship with credit; CC-BY-SA/GPL/AGPL never ship.

## 1. Ranked shortlist (licences verified Oct 29, 2026 by fetching the LICENSE file or licence link)
| # | Candidate | Link | Licence (verified) | What it gives us | Effort | Style-match concerns |
|---|---|---|---|---|---|---|
| 1 | IdleKit `@idlekitjs/plugins` offline-progress + `mechanics` (timers, crafting) | github.com/idlekitjs/idlekit · idlekitjs.github.io/plugins/offline-progress | MIT, LICENSE read ("(c) 2026 IdleKit contributors") | Proven pattern: elapsed = now - savedAt, clamp to a cap (default 24 h), replay in fixed steps; page-lifecycle bridge for hidden tabs. Crafting/timer primitives fit "cook fruit into cake" jobs. | Low if we **port the ~2 ideas** (clamp + stepped catch-up), Medium if we vendor the packages (new, 0 stars, 2026: young project) | Code only. Recommend porting the pattern, not the whole engine |
| 2 | clicker-engine `applyOfflineProgress` | github.com/blixxurd/clicker-engine | MIT, LICENSE read ("(c) 2025 Fidget Idle Engine Contributors") | A pure function `applyOfflineProgress(state, registries, lastSave, now)` and versioned-save serialise; good test reference for crop/daycare catch-up | Low (read and rewrite ~50 lines) | Code only |
| 3 | dewdrop-farm (js13k 2020) | github.com/onefrankguy/dewdrop-farm | Code MIT (LICENSE.md read, (c) 2020 Frank Mitchell); its art is CC-BY 4.0 / partly CC-BY-SA 3.0 | Tiny, complete farm loop in vanilla JS: buy seed, till, plant, water daily, dead crops, harvest, sell. Best compact reference for plot state machine | Low-Medium (port the plot logic; it is day-based, we add real-time) | **Do not take its art** (the hoe is CC-BY-SA). Code only |
| 4 | Farming crops 16x16 (josehzz) | opengameart.org/content/farming-crops-16x16 | CC0 (page links publicdomain/zero/1.0) | 20 crops x 5 growth stages + icon each. Fruits: melon, lemon, pineapple, grapes, orange, avocado (fits "no berries"; **skip strawberry**). A 32/64 px fan upscale exists in the comments | Low: drop in as stand-in stage art | 16 px is far below 192 px chibi. At 3x = 48 px it reads as a tile, fine on the plot tile; icons need a redraw or 2x+outline for menus. Must be recoloured to our 64-colour palette (palette lock). Simple shading, flatter than ours |
| 5 | Kenney Tiny Farm | kenney.nl/assets/tiny-farm | CC0 (Kenney page) | 132 16x16 farm tiles: tilled soil, fences, plots, props, for the 8-plot home yard | Low | Kenney's flat minimal style differs most from our shaded chibi; best used as layout/grey-box placeholders, or as soil/fence bases repainted to our palette |
| 6 | Crops CC0 (SnoopethDuckDuck) | opengameart.org/content/crops-cc0 · snoopethduckduck.itch.io/crops | CC0 (OGA licence link + itch page "license is CC0") | Extra hand-drawn crop/fruit sprites to fill gaps for invented Kilumen fruits (figs, gourds, pods) | Low | Sizes vary; needs a palette and outline pass |
| 7 | Mini Meadow (myobln) | myobln.itch.io/game-assets | CC0-1.0 (itch page), "No generative AI was used" | Seamless 16x16 grass/dirt autotile edges for the home and day-care yard | Low | Dark crisp outlines match our tiles better than Kenney; palette swap still needed |
| 8 | generic-training-sim (xShadowBlade) | github.com/xShadowBlade/generic-training-sim | MIT, LICENSE read ((c) 2024) | Training-stat loop with offline progress: daily/idle stat gain with upgrades. Pattern for the day care (XP per elapsed day, cap, upgrades) | Low (pattern only; it depends on the author's emath.js) | Code only; stale since Oct 2024 |
| 9 | 16x16 fruits (GamerYouTubik) | opengameart.org/content/16x16-fruits-for-rpg-roguelike-puzzle-sprites | CC0 | 10 fruit icons (melon, mango, pear, citrus) for feed and cake menu icons | Low | Same as #4. **Skip the grapes if they read as berries** |
| 10 | Sunsprout / FarmSimulator | github.com/Sanjays2402/sunsprout · github.com/devhitp/FarmSimulator | MIT, both LICENSE files read (2026) | Crop stage tables (3-5 stages), watering, harvest in vanilla JS | Low (reference only) | Sunsprout is AI-generated with fillRect art, so it is a reference not a source. Both are tiny new repos |

## 2. Daycare and training-loop pattern (no licensed creature-daycare code found)
- monster-daycare (verstraate, Godot) and trainers-progress (jarcane): **no licence file**, so reference only. monster-trainer-rl (slashman): no licence shown, reference only.
- Pattern to write in-house (~60 lines, uses #1/#2 ideas): `daycare = {uid, since, lastTick, course}`. On load/visit: `days = floor((now - lastTick)/24h)` capped (e.g. 7), XP = days x rate(course, level), applied through the existing XP path; `lastTick += days*24h` so partial days carry over. Guard against negative elapsed time (clock change). Show a "while you were away" summary.
- Crops use the same clamp + stepped catch-up: store `plantedAt`, `waterBy`, stage = f(elapsed watered time); no per-frame timers, so offline growth is free.
- Cakes: a crafting job (`inputs fruits[]`, `outputs cake`, `ms`) like IdleKit's crafting primitive; no library needed.

## 3. Rejected
- [LPC] Crops (bluecarrot16): CC-BY-SA / GPL-3.0, so not shippable.
- Sprout Lands, Mini Farm (Jofra), Cozy Farm 16x16 (WhiteRose): custom "no redistribution" licences (Cozy Farm is also AI-assisted). Not CC0/CC-BY as Gary asked; Mini Farm calls itself CC0 but adds a redistribution ban (a contradiction, so unclear).
- GreenValley_ (DevStudio-AI): proprietary.
- farming-sim-no-mouse-hackathon: no LICENSE file.
- Anything Pokémon-owned (Day Care, Berries, Pokéathlon): design idea only, no names, text or art. Our day care must use its own name (Text Bot).

## 4. Style match summary
Every pixel asset found is 16 px; our world tiles are 2x/3x and creatures are 192 px chibi. So crops on plot tiles at 3x (48 px) work after a palette-lock recolour and outline pass. Fruit/cake **menu icons and the cake art should be our own** (or a redraw over #4/#9 shapes), because 16 px icons look blurry/blocky beside 192 px creatures.

## 5. Owner decisions needed
1. Port patterns from #1/#2 in-house (recommended) or vendor IdleKit packages?
2. OK to use CC0 crop art as placeholders until the art team redraws?
3. Offline caps: crop growth and day care catch-up cap (suggested 7 days)?

# Evolutions expansion (PLAN ONLY: no art, nothing wired, nothing live)

Asked for by Gary, 1:46 PM CT, Oct 29 2026: "we also need more evolutions to help cover some ground and some that can only be obtained by getting a crystal from the key card areas."
Status: DRAFT for Gary. Written by Grok Bot (executor), Oct 29 2026. Source data: `design/DEX_450.json` + `design/dex_additions_new_evos.json` (453 species), art registry `data/creatures_synced.json` (232 synced sprite entries, 213 of them match DEX ids). Research-area context: `design/REGIONS_5_6_PLAN.md` §5, `design/regions56/story_beats.md` §5, `design/story_r5_r6/REGION_6_TIDEWATER.md` §6.

Rules followed: original designs only (Pokemon is structure only). Every Kilumen keeps its violet dominance crystal. Creature art is 192 px chibi. Overworld pickups and props sit on whole grid squares (`grid_fit_and_swap.py --check --overworld` must pass). Blocked words are kept out of player-facing names (shiny, berry, throw, Poke-anything, route, PP, super effective). Player-facing text uses "Trail", never "route". Dex numbers 454+ are PROVISIONAL.

---
## 1. Audit

### 1.1 Totals
| | count |
|---|---|
| Species (DEX_450 + additions) | 453 |
| Species with registered art | 213 |
| Lines: single-stage | **157** (35% of the dex) |
| Lines: 2-stage | 91 |
| Lines: 3-stage | 37 |
| Evolution methods in use | level (159), Dusk/Dawn/Sun Shard (7), revived (2), Warmth/high bond (1), Star (1) |

### 1.2 By element (main type): evolving species vs single-stage species
| element | evolving | single | note |
|---|---|---|---|
| earth | 50 | 24 | fine |
| fire | 34 | 15 | **few in R5/R6** (only basklet→sunbasilisk; hearthghast single at Frostspire) |
| water | 68 | 26 | fine overall, but R6 has 7 water singles |
| wind | 34 | 20 | birds are mostly singles late on |
| grass | 34 | 20 | R5 has 3 grass singles |
| dark | 37 | 15 | singles are ghosts that never grow |
| mystic | 22 | **18** | **weak**: about as many singles as evolvers |
| light | 17 | **19** | **weakest**: more singles than evolvers; 7 light singles from Trail 1 to Sunmeadow |

### 1.3 By zone and level band (total / single / with art)
| zone (wild levels) | total | single | art | gap |
|---|---|---|---|---|
| brookhollow (2-5) | 15 | 1 | 6 | ok |
| route1 / Trail 1 (2-6) | 25 | 9 | 21 | early light/mystic singles (halovy, mumblet) |
| fernwick (5-9) | 20 | 7 | 20 | candlewren, wickerling stay small |
| thornwood (9-13) | 29 | 9 | 7 | |
| route_east (12-16) | 21 | 6 | 12 | |
| aurelith (14-18) | 18 | 7 | 13 | lampwick, tollkin single |
| saltmere (16-22) | 29 | 8 | 21 | dawnfin single |
| route_revival / revival_heights (18-25) | 31 | 9 | 17 | prismite single |
| greystone (20-27) | 26 | 9 | 23 | glimslug single |
| frostspire_pass / frostspire (24-31) | 36 | 11 | 13 | |
| **route1_east / Trail 1 East (28-32), R5** | 11 | **5** | 0 | 3 mystic/light singles |
| **sunmeadow (29-34), R5** | 19 | **10** | 0 | **worst zone: over half single** |
| **mirefen_bog (33-39), R5** | 24 | **11** | 0 | swamp singles everywhere |
| **coast_road (36-41), R6** | 11 | 4 | 2 | no fire, no light |
| **tidewater_coast (38-44), R6** | 28 | **12** | 18 | many art-ready singles that could grow |
| lanternport and later | 110 | 39 | 40 | out of scope for this pass |

### 1.4 The gaps in plain words
1. **Regions 5 and 6 are the thinnest**: 42 of 93 species there (45%) never evolve. A player at levels 28-44 catches lots of creatures that can't grow.
2. **Light and mystic** are the only elements where singles roughly equal evolvers. Early light/mystic picks (halovy, mumblet, lampwick, tollkin, candlewren) stay small all game.
3. **Fire is missing from R5/R6** apart from one 2-stage line.
4. Several rare, story-flavoured singles (runeskein, aurelmare, shardhart, pearlisk, hullwhale) are the natural fit for a crystal reward, and 7 of them already have art for the base form.
5. Research-only Kilumen (bogbeacon, fenmaw, gloommire, stampedor in Station M) are already final stages, so the research area gives no growth of its own yet.

---
## 2. New evolutions

Columns: **stage** = stage/line length after the change. **Art**: every new form needs new Character model art (192 px chibi, violet crystal kept). "base art ✓" means the creature it grows from already has art and is reused unchanged.

### 2a. Regular evolutions (level or condition)
Trigger levels follow the curves: R1-R4 forms evolve inside their region band. R5 forms at 30-36 (Master Wenna Peat tops at 36). R6 forms at 37-41 (Master Jory Swell tops at 41).

**New stages for early light/mystic singles (they now pay off later)**
| # | new form | from | element | stage | trigger | concept | art |
|---|---|---|---|---|---|---|---|
| 1 | Halovane | halovy | light/angelic | 2/2 | lv 20 | The shy dawn sprite grows a long-handled halo it carries like a lantern. It walks lost travellers to the trail edge, then hides behind a tree before they can thank it. | new; base needs art too |
| 2 | Murmuran | mumblet | mystic/spirit | 2/2 | lv 17 | No longer repeats the last word, but the last word *yesterday*. Old folk keep one to remember sayings the town forgot. A little hurt when no one listens. | new; base art ✓ |
| 3 | Lampwarden | lampwick | light/spirit | 2/2 | lv 24 | Grows to streetlamp height with a brass-coloured hood. Sulks and flickers if the town goes to bed early, and waits up anyway. | new; base art ✓ |
| 4 | Tollmarch | tollkin | mystic | 2/2 | lv 27 | The bridge-keeper takes itself very seriously now: sash, little ledger. The fee is no longer a bow but a true story, and it can tell when you lie. | new; base art ✓ |
| 5 | Prismantle | prismite | light | 2/2 | lv 30 | Its scattered colours knit into a cloak of split light. Vain: it poses in sunbeams and dims when ignored. | new; base art ✓ |
| 6 | Glimsnail | glimslug | light/bug | 2/2 | lv 26 | Grows a lantern-glass shell. Miners follow its trail out of Greystone tunnels; it waits at the mouth until the last one is out. | new; base art ✓ |

**Region 5 (Trail 1 East, Sunmeadow, Mirefen), triggers lv 30-36**
| # | new form | from | element | stage | trigger | concept | art |
|---|---|---|---|---|---|---|---|
| 7 | Quartzchime | quartzhopper | mystic/bug | 2/2 | lv 31 | Its chiming legs tune into chords. Several sit together on the ridge and "practise" a song that never quite finishes. | new; base new |
| 8 | Lilacrown | lilacthorn | grass/spirit | 2/2 | lv 32 | A crown of lilac on a thorny body. Forgives pickers now, but only if they say sorry to the flower. | new; base new |
| 9 | Dawnplume | sunquail | light/bird | 2/2 | lv 32 | The family's lead quail: tall plume, stern eye. Marches the chicks in a perfect line and counts them twice. | new; base new |
| 10 | Gnomonmoss | dialmoss | mystic | 2/2 | lv 33 | Becomes a mossy living sundial. Its shadow points at the thing you lost, not at the hour. Gets grumpy when people ask the time. | new; base new |
| 11 | Popwarren | popgopher | earth | 2/2 | lv 31 | A stout warren boss with a bandana of grass. Still pops up to say hello, but now drags the whole warren up to say it too. | new; base new |
| 12 | Dewcarillon | dewbell | water/rain | 2/2 | lv 33 | A cluster of bell-flowers. Ringing them shakes a short rain out of a clear sky over a dry field. Never rings for itself. | new; base new |
| 13 | Pollenpuff | pollenub | grass | 2/3 | lv 30 | Rounder, fluffier, sneezes in bigger clouds and laughs harder at its own sneezes. | new; base new |
| 14 | Bloomhaze | pollenpuff | grass/mystic | 3/3 | lv 38 | A soft walking meadow that leaves a golden haze; meadows it passes bloom a week early. Sleepy and kind, gets hay fever from its own flowers. | new |
| 15 | Reedsonnet | reedcrane | wind/bird | 2/2 | lv 35 | Long reed-striped neck, ribbon tail. Only dances with the same partner for life and will wait all season if it is late. | new; base new |
| 16 | Bogbarrow | turfhulk | earth/swamp | 2/2 | lv 36 | A walking peat mound with a little garden and a frog pond on its back. Lets smaller Kilumen live there rent-free. | new; base new |
| 17 | Gulpitcher | pitchergulp | grass/swamp | 2/2 | lv 34 | A tall jug-plant that saves rain for dry weeks, burps louder bubbles and is proud of it. | new; base new |
| 18 | Mirewhisker | mudwhisk | water/swamp | 2/2 | lv 34 | A long otter-like guide with lantern whiskers. Knows every hidden pool and shows only the ones it trusts you with. | new; base new |
| 19-21 | **New line**: Emberwhit → Hedgeblaze → Harvestorch | — | fire → fire → fire/light | 1/3, 2/3, 3/3 | wild in Sunmeadow hedges lv 28-31; lv 30; lv 40 | A stoat-sized ember sprite that keeps one small flame alive through storm season and is terrified of rain. Hedgeblaze curls around hay bales to keep them dry. Harvestorch carries a lantern tail and guards the granary; it finally stands in the rain for someone it loves. Fills R5's fire gap. | 3 new |

**Region 6 (Coast Road, Tidewater), triggers lv 37-41**
| # | new form | from | element | stage | trigger | concept | art |
|---|---|---|---|---|---|---|---|
| 22 | Cisternmole | slurrymole | earth/rain | 2/2 | lv 38 | Digs underground cisterns and saves storm water for the dry season. Wears a dented bucket for a helmet. | new; base new |
| 23 | Driftloom | driftknot | grass/sea | 2/2 | lv 38 | Its knots weave into a small raft that smaller creatures ride ashore. Never knows where it will land and doesn't mind. | new; base new |
| 24 | Gannetide | divegannet | wind/bird | 2/2 | lv 39 | Sleek and storm-grey. Dives in the worst weather to bring fish to the young of other flocks. Brave, a bit of a show-off. | new; base new |
| 25 | Inkshroud | squidge | dark/sea | 2/2 | lv 37 | Grows a cloak of ink it hides inside when startled, then peeks out to check if you're still there. Still squirts, now apologetically. | new; base art ✓ |
| 26 | Clackmarshal | spinyclaw | water/sea | 2/2 | lv 38 | The reef's chatterbox becomes its town crier: antennae like flag poles, clicks news to the whole rock pool. | new; base art ✓ |
| 27 | Choraconch | shellsinger | water/spirit | 2/2 | lv 40 | Lives in a spiral shell that is a whole choir. When it sings, the tide comes in a little gentler. | new; base new |
| 28-29 | **New line**: Signalet → Beaconclaw | — | fire/sea | 1/2, 2/2 | wild on Coast Road rocks lv 36-38; lv 39 | A small crab that rescued a hot coal from a drowned signal lamp and carries it like treasure. Beaconclaw holds a glowing brazier claw high on the cliff during storms so boats find the bay. Fills R6's fire gap and ties to the Tidewater Signal Lab. | 2 new |

### 2b. Crystal-only evolutions (key card research areas)
Two research cores, one per research area. They are **not** dominance crystals (those catch Kilumen and are held up, never thrown). Research cores are consumable evolution items in the Key Items / Research pocket. Names are invented; Text Bot may rename (item ids stay).

#### Amberpeat Core (`research_core_amberpeat`), Station M only
- **What it is:** a thumb-sized amber crystal cut from old lumen that pooled in the bog peat (ties to the station's sample jars: "Core 14. Colour: amber"). Warm to hold. Theme: *things that remember and keep warm*: light, mystic, swamp.
- **How to get it (only inside RT Mirefen Peat Station, gate `rt_keycard_r5` from Benefits node `rt_node_station_m`):**
  1. Story: 1 guaranteed from the Crystal bench (room 5) on first visit (flag `got_core_amberpeat_1`).
  2. Renewable: the Sample room's 3 jar rows each give 1 core per in-game day (interact; one whole grid square each).
  3. Rare drop: research-only Kilumen in the station hold one at 5%.
  - Not sold, not on the Benefits board, stack max 9. Never appears outside Station M.
- **Use:** use on a Kilumen at or above the level shown. Core is used up.

| # | new form | from | element | stage | trigger | concept | art |
|---|---|---|---|---|---|---|---|
| C1 | Ambervigil | bogbeacon (research-only) | light/ghost | 3/3 (line becomes 3) | Amberpeat Core, lv 38 | Keeps one jar of old lumen glowing inside its chest. Sits at the sunken windows each dusk so the station is never fully dark. Quietly sad, very loyal. | new; base new |
| C2 | Runeloom | runeskein | mystic/spirit | 2/2 | Amberpeat Core, lv 34 | Weaves itself into a living tapestry that records what the station forgot. When hurt, it unpicks the bad memory first. | new; base art ✓ |
| C3 | Mirethrone | mirewump | water/swamp | 2/2 | Amberpeat Core, lv 35 | The grumpy bog-lord gets a throne of warm peat grown onto its back. Now sure the bog *and* the station belong to it. Secretly lets frogs sleep in the throne. | new; base art ✓ |
| C4 | Ambermoth | glimmoth | mystic/bug | 2/2 | Amberpeat Core, lv 33 | Wings turn to amber windowpanes with old lights trapped inside. Flies at dusk to "show" the bog the colours it used to have. | new; base new |
| C5 | Halcyonmare | aurelmare | light/angelic | 2/2 | Amberpeat Core, lv 36, high bond | A golden mare with a mane of slow sunrise. Will only change for a handler it has run beside. Proud, gentle with foals. | new; base new |
| C6 | Wardhart | shardhart | mystic | 2/2 | Amberpeat Core, lv 34 | The hart that hummed by the crystal barrier learns to hold a small barrier of its own around its herd. Tired eyes, steady feet. | new; base new |
| C7 | Candlemere | candlewren (Fernwick) | light/angelic | 2/2 | Amberpeat Core, lv 30 | The window-sitter becomes a tall candle-feathered bird whose flame never gutters. Rewards an early favourite with a late form. | new; base art ✓ |

#### Tidecall Prism (`research_core_tidecall`), Station T only
- **What it is:** a sea-green prism grown on the Signal Lab's old receiver masts; it hums when the tide turns. Theme: *storm, tide, voices across water*: water, sea, wind/rain.
- **How to get it (only inside RT Tidewater Signal Lab in `tidewater_coast_cave`, gate `rt_keycard_r6` from Benefits node `rt_node_station_t`, reached by Tideglide at low tide):**
  1. Story: 1 guaranteed from the receiver mast room on first visit (flag `got_core_tidecall_1`).
  2. Renewable: tide pools in the lab hold 1 each at **low tide only** (2 pools, refill each low tide).
  3. Rare drop: research-only Kilumen in the lab hold one at 5%.
  - Not sold, not on the board, stack max 9. Never appears outside Station T.

| # | new form | from | element | stage | trigger | concept | art |
|---|---|---|---|---|---|---|---|
| T1 | Fathomlure | lurelamp | dark/sea | 3/3 (line becomes 3) | Tidecall Prism, lv 42 | Its lure becomes a signal lamp that flashes old lab code. Lonely; it is calling for someone who never answered. | new; base art ✓ |
| T2 | Choirwhale | hullwhale | water/sea | 2/2 | Tidecall Prism, lv 42 | Grows ridges like organ pipes. Its songs carry storm warnings across the whole sea, and other whales sing back. | new; base art ✓ |
| T3 | Pearlseer | pearlisk | mystic/sea | 2/2 | Tidecall Prism, lv 40 | Its pearl stops showing dreams and starts showing tomorrow's weather. Worries about the storm more than anyone. | new; base art ✓ |
| T4 | Stormstrider | kelpstrider | water/ghost | 2/2 | Tidecall Prism, lv 40, at night | Gallops on storm waves with a mane of sea-foam lightning. Only runs on dim, wild nights, and only toward ships in trouble. | new; base art ✓ |
| T5 | Currentcrest | tidepony | water/dragos | 2/2 | Tidecall Prism, lv 39 | Its curled tail grows a crest that reads the current. Holds a whole kelp bed together in the strongest tide. Stubborn, protective. | new; base art ✓ |
| T6 | Spindrel | foamkin | water/spirit | 2/2 | Tidecall Prism, lv 38 | The wave-crest sprite becomes a spinning dancer of spray. Lives only as long as the wave, then reappears on the next. Joyful, forgetful. | new; base art ✓ |
| T7 | Dawnwake | dawnfin (Saltmere) | light/sea | 2/2 | Tidecall Prism, lv 38 | A long gold-and-pearl fish that leaves a dawn-coloured wake. Sailors say if Dawnwake follows your boat, you'll be home by morning. | new; base art ✓ |
| T8 | Squallcrown | squallwhirl (Frostspire) | wind/rain | 3/3 (line becomes 3) | Tidecall Prism, lv 41 | A crown of little thunderheads circles its head. Moody: it storms when sad, clears when praised. | new; base art ✓ |

Notes:
- C7, T7, T8 reach back to earlier regions on purpose, so cores "cover ground" for creatures the player already owns.
- Station M research list adds no new species; C1 gives the research-only bogbeacon line a reason to come back.
- Two cores only, by area (not by element), to keep the item list small. If Gary wants more, the next step would be one core per later research area (R7+), same pattern.

---
## 3. Counts and build order

### 3.1 Counts
| | count |
|---|---|
| Regular new forms (2a) | **29** (24 new stages on 23 existing lines + 5 forms in 2 new lines) |
| Crystal-only new forms (2b) | **15** (Amberpeat 7, Tidecall 8) |
| **Total new species** | **44** (provisional dex 454-497) |
| New items | 2 (`research_core_amberpeat`, `research_core_tidecall`) |
| Single-stage lines after the change | 157 → **122** (23 regular + 12 crystal singles gain a stage) |
| R5/R6 singles after | 42 → **19** |
| New Character model art needed | **44** creature forms (all of them; none reuse art) |
| Base forms reused with existing art | **18** (2a: mumblet, lampwick, tollkin, prismite, glimslug, squidge, spinyclaw; 2b: runeskein, mirewump, candlewren, lurelamp, hullwhale, pearlisk, kelpstrider, tidepony, foamkin, dawnfin, squallwhirl) |
| Base forms that still need art anyway | 20 (19 already in the R5/R6 art queue + halovy, Trail 1) |
| Other art (later) | 2 item icons (our own, not 16 px stand-ins), 3 jar-row + 1 bench + 2 tide-pool pickup spots (whole grid squares; reuse reed lamps 2067/2068 style where possible) |

Every new form: 192 px chibi, same palette lock, violet dominance crystal visible, Large/Small/Enraged/Cosmic as markers only.

### 3.2 Recommended build order
1. **Data and cores first (no art):** add the 44 entries to a new `design/dex_additions_evos_expansion.json` (same shape as `dex_additions_new_evos.json`), the 2 core items, and the `research_core` evolution method. Text Bot request file for names, pages and dex blurbs.
2. **Crystal-only forms with base art ready (11):** C2, C3, C7, T1-T8. Biggest payoff: they make the key card areas worth it and their bases already exist. Art order: T1, C3, C2, T2, T3, T4, T5, T6, T7, T8, C7.
3. **R5 regular forms (13, #7-21):** ship with the R5 art batch, since their bases are being drawn now anyway. Emberwhit line first (fire gap).
4. **Remaining crystal forms (C1, C4, C5, C6):** after their R5 bases are drawn.
5. **R6 regular forms (8, #22-29):** with the R6 batch; Signalet line first, then Inkshroud and Clackmarshal (bases have art).
6. **Early light/mystic backfill (6, #1-6):** last, as a free patch for older regions. Murmuran, Lampwarden, Tollmarch, Prismantle and Glimsnail first (bases have art); Halovane once halovy is drawn.
7. QA each batch: `tools/run.py --check` 0, grid-fit check pass for the new pickup spots, evolve-in-battle and use-core tests, save migration for owned creatures.

### 3.3 Open questions for Gary
1. Is "Research Core" fine as the item family name, since "crystal" already means dominance crystals?
2. Should cores be tradeable or locked to the save?
3. Do you want a third core later (one per element instead of one per area)?
4. Should C5 (Halcyonmare) need high bond, or just the core?

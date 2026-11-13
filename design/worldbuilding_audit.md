# Kilumen worldbuilding audit vs. the 2D sprite-era monster RPGs
Branch audited: `dev/regions-5-8` (`/workspace/wt_r58/kilumen`), Oct 30 2026, about 1 AM CT. Grok Bot for Gary.
Scope (Gary): only the pixel games. That means Gen 1-5 (GSC/HGSS, RSE, DPPt, BW/B2W2) plus 2D fan games (Reborn, Insurgence, Uranium, Rejuvenation, Infinite Fusion). 3D games are left out (X/Y and later, Let's Go, BDSP, Legends, SV).
Content rule: we copy structure only. Proposed text avoids the blocked words. In this file a "road" is the reference games' numbered route, a "hall" is their league building, and a "Heal Centre" is their healing building.

Sources (structure and mechanics):
- Bulbapedia: HGSS https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_HeartGold_and_SoulSilver_Versions , Johto https://bulbapedia.bulbagarden.net/wiki/Johto , Time https://bulbapedia.bulbagarden.net/wiki/Time , Day/night https://bulbapedia.bulbagarden.net/wiki/Day_and_night , Weekday siblings https://bulbapedia.bulbagarden.net/wiki/Week_Siblings , Bug-Catching Contest https://bulbapedia.bulbagarden.net/wiki/Bug-Catching_Contest , HGSS Safari Zone https://bulbapedia.bulbagarden.net/wiki/Johto_Safari_Zone , Game Corner https://bulbapedia.bulbagarden.net/wiki/Game_Corner , Pokéathlon https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9athlon , Contests https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_Contest , Underground https://bulbapedia.bulbagarden.net/wiki/Underground , Secret Base https://bulbapedia.bulbagarden.net/wiki/Secret_Base , Hidden items https://bulbapedia.bulbagarden.net/wiki/Hidden_item , HMs https://bulbapedia.bulbagarden.net/wiki/HM , Seasons (BW) https://bulbapedia.bulbagarden.net/wiki/Season , Phenomenon (BW shaking grass and rippling water) https://bulbapedia.bulbagarden.net/wiki/Phenomenon , Fishing https://bulbapedia.bulbagarden.net/wiki/Fishing (fetched this session), Surf https://bulbapedia.bulbagarden.net/wiki/Surf_(move)
- Serebii town and road pages (NPC, item and trainer lists): https://www.serebii.net/heartgoldsoulsilver/ , https://www.serebii.net/platinum/ , https://www.serebii.net/blackwhite/ , https://www.serebii.net/emerald/
- Decompilations, for movement and timing: pret pokeemerald https://github.com/pret/pokeemerald , pokeplatinum https://github.com/pret/pokeplatinum , pokeheartgold https://github.com/pret/pokeheartgold
- Design talks: Junichi Masuda, "Pokémon Black and White" GDC 2011 talk (iteration, the lively town feel): https://www.gdcvault.com/ (search "Masuda"). Also Mark Brown / Game Maker's Toolkit on gating with field abilities (Metroidvania-style backtracking): https://www.youtube.com/@GMTK
- HGSS numbers below are hand counts from the Serebii and Bulbapedia location pages. They are approximate (±1 to 2), are meant as benchmarks and not exact quotas, and are not re-verified frame by frame.

---
## 1. Key techniques in the reference games (structure only)
1. **One idea per town, said three times.** Each town has a theme, one landmark you can see from the entrance (a tower, a lighthouse, a dragon shrine, a big bridge), one signature building that exists only there (a radio tower, a dept store, a dance theatre, a tin tower) and NPCs who talk about it. Ecruteak is "old tradition": the burned tower, the dance theatre, kimono girls, elders talking about the legend. Olivine is "port": the lighthouse, the ship, sailors, and a sick lighthouse creature quest.
2. **Small but full interiors.** A Heal Centre has a healer, a PC and about 3 to 5 NPCs (one tip, one lore line, one trade or gift hook, plus link and club attendants). A Mart has a clerk, an optional specialty clerk and 1 to 3 shoppers who talk about items. A home is 6 to 12 props (bed, TV, shelf, table, plant, stove, PC, window) and 1 to 3 NPCs, often one with a gift, trade or rumour. Labs have 2 to 4 aides with tutorial lines. Every NPC says something local. Generic lines are rare.
3. **NPC roles are mixed on purpose.** In a typical HGSS town of 6 to 12 NPCs you find about 40% tips (mechanics), 25% lore and rumour, 10 to 15% gift or trade, 10% daily or weekly events, and the rest flavour. Lines change after story beats (hall cleared, rival met, villain beaten).
4. **Roads are paced.** An early road (Johto road 29 or 30) is 2 to 3 screens long with 0 to 3 trainers, a fruit tree, 1 to 2 visible items and 1 to 2 hidden items. A mid road (road 32 or 34) is 4 to 6 screens with 6 to 10 trainers plus fishermen, a side path gated by a field skill, and a resting spot (a gatehouse or a Heal Centre at the halfway point). Trainer lines of sight overlap rarely. There is a "breather" stretch after every 2 to 3 fights.
5. **Environmental storytelling.** Ruins with unown-style puzzle panels, a burned tower, a draining lake with a hostile base, a dried-up power plant. Lore is split across signs, statues, books on shelves and NPC rumours, so the player pieces the story together.
6. **Optional areas and secrets.** Every region hides 3 to 6 optional places: a cave behind a waterfall, an islet reached only by water, a hidden grotto, a far-off island. Hidden items sit at dead ends, behind trees, at the tip of a pier, or in the one odd tile.
7. **Time.** HGSS has morning, day and night (encounters, NPCs, events), seven weekday siblings who give gifts, the Bug-Catching Contest on Tue/Thu/Sat, and daily trees and rematch calls. BW has seasons that change the map (snow paths) and daily phenomena (shaking grass, rippling water, dust clouds).
8. **Side activities.** Contests (RSE, DPPt), a Safari Zone (all eras), a bug contest, a game corner, Pokéathlon (HGSS), a musical (BW), the Underground and secret bases (DPPt, RSE), a Trick House (Emerald) and the Battle Frontier.
9. **Exploration rewards** come as a curve. Every dead end pays (an item, an NPC, a view, a lore panel). Rare things sit behind skills. Some rewards are fixed in time (a weekday or a night).
10. **Dungeon variety.** Each cave has one idea: dark (needs a light), ice slide puzzles, strength boulders, water currents, rotating floors, a multi-floor tower climb, or a burned basement with legends.
11. **Map shape and backtracking.** Johto is a ring around a central city. Each new field skill (cut, surf, strength, whirlpool, waterfall, rock climb) reopens 2 to 4 earlier side paths, so returning to old towns pays. Fan games (Reborn, Insurgence) push density further: more NPC subplots per town and hidden quests that run across several towns.

## 2. Kilumen vs. HGSS: per town and per area
Measured by script from `art/world/overworld/maps/*.json` (`npcs`, `signs`, `interact_spots`=props, `items`) and `text/overworld_lines.json` (unique line variants per map). Trn = trainers among the NPCs. Side quests come from `data/quests.json` (36 side quests out of 52).

### Towns
| Kilumen map | Size | NPCs (trn) | Unique lines | Signs | Props | Items (hidden) | Interiors | Side quests | HGSS comparable | HGSS NPCs / signs / interiors / hidden |
|---|---|---|---|---|---|---|---|---|---|---|
| brookhollow (start) | 58x46 | 5 (0) | 40 | 5 | 5 | 1 (3) | heal, lab, 2 homes (+2F) | 4 | New Bark | ~4 / 4 / 3 / 1 |
| fernwick | 54x38 | 7 (3) | 16 | 2 | 0 | 2 (1) | heal, hall, 2 homes | 3 (+1 in home) | Cherrygrove/Violet | ~8 / 5 / 5-6 / 1-2 |
| saltmere | 58x40 | 6 (0) | 12 | 5 | 0 | 1 (2) | heal, hall, office, 1 home | 2 (+1) | Azalea | ~8 / 5 / 5 / 1 |
| tidewater_coast (town area) | 54x46 | 9 (6) | 16 | 5 | 0 | 4 (2) | hall, cave | 1 | Olivine | ~10 / 6 / 6 / 2 |
| mirefen | 54x46 | 7 (5) | 14 | 4 | 0 | 3 (1) | hall, sunken lab | 0 (3 in bog) | Mahogany | ~8 / 5 / 4 / 1 |
| frostspire | 54x46 | 12 (4) | 12 | 7 | 0 | 3 (2) | heal, hall, lift, office | 3 | Blackthorn | ~8 / 5 / 5 / 2 |
| revival_heights | 58x40 | 7 (1) | 13 | 3 | 0 | 2 (1) | heal, hall | 1 | Ecruteak | ~10 / 6 / 7 / 2 |
| lanternport (R7) | 54x46 | 4 (1) | 11 | 3 | 0 | 3 (1) | heal, hall, lighthouse x3, 5 homes, shop, grotto | 1 (+1) | Olivine | ~10 / 6 / 6 / 2 |
| cindervale (R8) | 54x46 | 4 (1) | 12 | 4 | 0 | 2 (1) | heal, hall, 3 homes, shop, caldera | 1 | Mahogany/Blackthorn | ~8 / 5 / 5 / 1-2 |
| aurelith (city) | 88x62 | 15 (0) | 29 | 11 | 0 | 2 (1) | galleria 4F+roof, hotel 2F, HQ, stadium, terminal, arena x8 | 0 | Goldenrod | ~25 / 12 / 14+ / 3 |
| r9_cairnfold (post-game) | 54x46 | 9 (0) | **0** | 0 | 3 | 0 (0) | lodge | 0 | Mt. Silver area | — |

### Interiors (average)
| Type | Kilumen NPCs in map | Kilumen props | Kilumen lines | HGSS NPCs | HGSS props |
|---|---|---|---|---|---|
| Heal Centre (heal_* x8) | **0** (healer is injected by code, other NPCs have text but no map object) | **0** | 8-22 written, none placed | 4-6 | ~10 (PC, counter, plants, benches, link desk) |
| Shop (shop_*, x3) | 0-1 | 0 | 3-10 | 2-4 | ~8 shelves |
| Home (home_* x15) | 0-1 (most 0) | 0-1 | 2-22 | 1-3 | 6-12 |
| Lab (lab_brookhollow) | 0 | 0 | 23 | 3-4 aides | 12+ |
| Hall (x8) | 5-14 (trainers) | 0 | 5-14 | 4-8 + guide | — |
The reference screenshot Gary shared (a pixel fan game Heal Centre) shows **5 people** (healer, 4 visitors, one standing at the shelves), a PC terminal, a 3-unit shelf run on each side, 2 plants, a counter with an item and a doormat. That is 8 to 10 props in a 14x10 room. Our 14x10 `heal_*` rooms place 0 people and 0 inspectable props.

### Roads and field areas
| Kilumen map | Size | Trainers | Lines | Signs | Items (hidden) | Enc. zones | HGSS comparable | HGSS trainers / items (hidden) |
|---|---|---|---|---|---|---|---|---|
| route1 | 68x48 | 9 | 13 | 4 | 3 (3) | 15 | road 29+30 | 0-3 / 2-3 (1-2) |
| route_east | 64x40 | 6 | 9 | 3 | 4 (2) | 6 | road 31 | 2 / 2 (1) |
| route_coast | 46x56 | 6 | 9 | 3 | 4 (2) | 6 | road 32 | 9 / 4 (2) |
| thornwood (forest) | 60x44 | 5 | 13 | 3 | 4 (4) | 6 | Ilex Forest | 1 / 5 (3) + shrine, NPC quest |
| sunmeadow_fields | 60x50 | 6 | 9 | 3 | 4 (2) | 10 | road 34/35 | 8-10 / 3 (2) + side building |
| route_revival / _saltmere / _sunmeadow | 64x44 / 46x60 / 46x60 | 7 / 4 / 3 | 11 / 7 / 5 | 4 / 3 / 2 | 3(3) / 1(2) / 1(1) | 6/6/5 | road 36-38 | 6-8 / 3 (2) |
| route_saltmere_mirefen / sunmeadow_mirefen | 60x50 / 60x46 | 3 / 5 | 5 / 8 | 2 / 3 | 2(1) / 2(2) | 7/6 | road 42/43 | 8-10 / 3 (2) + gatehouse |
| route_aurelith_saltmere | 64x40 | 6 | 9 | 3 | 3 (2) | 6 | road 34 | 8 / 3 (2) |
| route_fernwick_lanternport (R7) | 60x46 | 4 | 10 | 3 | 2 (1) | 5 | road 39/40 | 6-8 / 2 (2) + farm, beach |
| route_cindervale (R8) | 46x60 | 6 | 10 | 4 | 3 (2) | 5 | road 44/45 | 9-12 / 4 (3) |
| frostspire_pass | 50x60 | 5 | 11 | 3 | 2 (2) | 5 | Ice Path | 0 / 4 (2) + slide puzzle |
| mirefen_bog | 44x38 | 0 | 6 | 1 | 2 (1) | 5 | Lake of Rage | 3 / 3 (2) + 3 side quests (ours) |
| greystone_entrance / b1 | 52x36 / 54x38 | 1 / 1 | 1 / 5 | 0 | 1(2) / 1(3) | 2/0 | Union Cave | 4-5 / 4 (2) |
| lanternport_grotto / cindervale_caldera / tidewater_cave_int | small | 0 | 3 / 4 / 2 | 0-1 | 0-1 (0-1) | 1 | Whirl Islands / Mt. Mortar | 2-6 / 4-6 |
| r9_* (5 maps), fin_* (14 maps) | — | 0-6 | **0** | 0 | 0 | 0-6 | — | — |
Takeaways. Our roads match HGSS on hidden items (1 to 4 per road) and trainer counts. They fall behind on **resting points, side paths, gatehouses, signs that point at landmarks, and repeatable pickups**. There are no regrowing fruit-tree-like pickups at all. Caves are small single-idea rooms that are fine on puzzles but thin on items and trainers.

### Time, side activities and field skills (repo-wide)
- Day/night: LUTs exist (`art/world/overworld/time_of_day`, dawn/day/dusk). Text has only 18 `when` windows (`window_day_b` / `window_night_b`). Weekday lines are marked "NOT SUPPORTED by Coder" in `text/overworld_lines.json`. There are no weekly events and no daily pickups.
- Side activities: fishing (rod tiers, `src/fishing`), the club (`club_int`, 5 side quests, 47 lines) and the arena. There is no contest, safari-style park, bug-style contest, prize corner or minigame.
- Field skills: Tideglide, Brushbreak, Stonebreak, Skylift and Glowcall are defined in `src/overnight/field.js`, **behind overnight flag `field`, default OFF**. Tideglide encounters are "not wired". This matters for backtracking: no earlier side path currently reopens with a new skill.

---
## 3. Biggest gaps, ranked by player impact
1. **Heal Centres, shops and homes are empty rooms.** Heal rooms have 0 placed NPCs and 0 props (8-22 lines are written but unplaced). Homes and shops have 0-1 NPCs and 0 props. HGSS: 4-6 people and about 10 props. This is the first thing a player sees in every town.
2. **Field skills are off, so there is no backtracking loop.** Five skills exist behind a default-off flag and no earlier map has a skill-gated side path or prize. HGSS reopens 2-4 side paths per skill.
3. **Town interact props are 0 in 9 of 10 towns.** There are no inspectable bins, shelves, statues or noticeboards. Only Brookhollow has 5.
4. **Post-game and finale areas are mute.** The r9_* and fin_* maps (19 maps) have 0 lines and 0 signs.
5. **No side activity hub.** Outside the club and arena there is no contest, park, bug-style contest or prize corner. HGSS has one in almost every second town.
6. **Time is cosmetic.** There are no weekday NPCs, no daily pickups, no night-only NPCs or events, and the engine does not support weekdays.
7. **Weak town identity in R5-8 (Lanternport, Cindervale, Mirefen).** 4 NPCs and 11-12 lines each, with no signature-building tour and no local NPC culture (sailors, smiths). HGSS port and foundry towns have 8-10 NPCs.
8. **Roads have no rest stops or side paths.** There are no gatehouses, no halfway Heal Centre or lodge, no fork to an optional pocket, and no regrowing pickups.
9. **Optional areas are few and small.** There are 4 caves of 1 room each with 0-1 items and no optional island, water-only pocket or hidden grotto with a payoff. HGSS has 3-6 per region.
10. **Lore is in docs, not on the map.** There are few lore signs or statues (towns have 2-7 signs; Aurelith has 11), there are no bookshelves you can read, and the region history (signal labs, the Missing Note) does not appear in the overworld.
Others: the Aurelith metropolis has 0 side quests. Hall trainers have no guide NPC. Tideglide water areas have no water encounters or water-only items (see Feel).

---
## 4. Fix list per region
Owners: **Coder** = code, **WD** = World Design maps and props, **TB** = Text Bot lines, **SB** = Story Bot lore.

### All regions (systems)
- Coder: turn on `field` by default after QA. Wire Tideglide water encounters and fishing while gliding. Add weekday support to the `when` matcher (`mon`..`sun`) and a `daily` pickup flag that resets at local midnight. Add a "heal room NPC" placement so heal_* use map NPCs. Make bookshelf and noticeboard props read multi-page text.
- WD: one shared Heal Centre template with 4 visitor slots, PC, link desk, 2 benches, 2 plants, a board and a mat (about 10 props). One shop template with 3 shelf props and 1-2 shoppers. One home kit: 6-10 props, 1-2 NPC slots.
- TB: per town, 1 tip, 1 local lore and 1 rumour line for each Heal Centre visitor. Write 3 variants per NPC: before the town hall, after it, and night.
- SB: a one-page "region bible" per region with theme, landmark, signature building, local job and a myth, which TB and WD draw from.

### Region 1-2 (Brookhollow, Fernwick, route1, route_east, thornwood)
- WD: fernwick gets 4 town props (noticeboard, well, bench, fountain), a 3rd home and a road fork on route_east to a small hidden glade (1 hidden item, 1 NPC). Thornwood shrine: 1 inspect prop plus a returning-visitor reward.
- TB: Fernwick +6 NPC lines (local craft or culture). A home NPC gives a trade hook.
- Coder: a daily regrowing fruit-bush pickup type (we use "bush" or "pod", not the blocked word), 2 on route1 and 1 on route_east.

### Region 3-4 (Saltmere, Tidewater Coast, route_coast, route_aurelith_saltmere, Greystone)
- WD: a Tideglide-only islet off route_coast (2 items, 1 hermit NPC). A gatehouse on route_aurelith_saltmere. Greystone gets +2 trainers and +2 items.
- TB: Saltmere office and fish-market chatter, and a weekday fishmonger (Mon/Thu).
- SB: tidewater shipwreck lore across 3 signs and a cave panel.

### Region 5-6 (Mirefen, Frostspire, Revival Heights, bog, pass, routes to Mirefen)
- WD: Mirefen gets +3 NPCs and 4 props (stilt-house theme). frostspire_pass gets a Stonebreak side cave with an optional ice pocket. Revival Heights gets a signature building interior (a memorial or archive).
- TB: night-only NPCs in Revival Heights (ghost stories) and Frostspire (aurora watcher).
- SB: lore panels in the sunken lab and the Revival archive that link to the signal labs.

### Region 7 (Lanternport, route_fernwick_lanternport, grotto)
- WD: put NPCs in the 5 homes and the shop (all 0 now). Add a lighthouse keeper's log prop on each floor, a pier fishing spot sign and a grotto second chamber reached by Tideglide.
- TB: +8 town lines (sailors, a net-mender, a child who collects shells). A shell-collection side quest (Coder: counter flag).
- SB: SIGNAL crate trail told through 3 props (pier, lighthouse F3, grotto).
- Side activity: **a fishing derby on Saturdays** (Coder timer and scoring; WD pier layout; TB host lines).

### Region 8 (Cindervale, route_cindervale, caldera)
- WD: a foundry tour interior as the signature building, +3 NPCs, 5 props (anvils, kilns, an ore cart) and a caldera second floor with 2 items.
- TB: smith culture lines and an ore-trade NPC.
- Side activity: a **kiln-firing or ore-sorting minigame** run as a weekly event (Coder).

### Aurelith and post-game (r9_*, fin_*)
- TB and SB: lines and signs for all 19 mute maps (at least 1 line per NPC, 2 signs per outdoor map).
- WD: Aurelith gets a prize counter in the Galleria (club tokens) and 2 side quests.
- Coder: a "park" side activity (a limited-catch habitat park, structure like a safari) off the Aurelith terminal.

---
## 5. Feel (movement, water, fishing)
**Video status:** I searched YouTube with yt-dlp and found candidates, but YouTube blocked every download with HTTP 429 and "Sign in to confirm you're not a bot". I did not try to get around this with browser cookies. The links are below for manual review. The mechanics in this section come from the pret decompilations and Bulbapedia, not from frame-stepping.
- HGSS longplay, Johto part 1, no commentary: https://www.youtube.com/watch?v=2V8stJAewZk (about 0:10:00 leaving New Bark onto road 29; town walks run through the first hour)
- Platinum full-game longplay: https://www.youtube.com/watch?v=c48jQJNzzko ; Platinum part 1: https://www.youtube.com/watch?v=gUh_MKMxeAs
- Black longplay: https://www.youtube.com/watch?v=xUN6SP1igac ; Black walkthrough: https://www.youtube.com/watch?v=EYT1on4c_2E
- HGSS fishing rods (62 s): https://www.youtube.com/watch?v=kuop8RvOBxg ; Good Rod (16 s): https://www.youtube.com/watch?v=DSAzPahugdM
- Timestamps other than the first are not verified, because the clips could not be pulled.

| Aspect | Reference (Gen 3-5) | Kilumen | Fix |
|---|---|---|---|
| Walk | 16 frames per tile at 60 fps, about 3.75 tiles/s | 4 tiles/s (15 ticks) | OK |
| Run | 8 frames per tile, about 7.5 tiles/s | 8 tiles/s | OK |
| Bike | about 4 frames per tile (Mach), about 15 tiles/s | 12 tiles/s | OK |
| Camera | locked on the player, 15x10 (GBA) or 16x12 (DS) tiles | to check | Coder: confirm the view is ≤ 17x12 tiles so towns read as dense |
| NPC movement | about 30-50% of town NPCs wander or turn on timers. Water and flowers animate (4-8 frame loops) | most NPCs static, ambient field exists | WD: mark 1/3 of town NPCs as wanderers. Animated flower and water tiles in every town |
| Surf mount | a short hop onto the creature (about 1 tile, ~8 frames), then **run-speed** travel, a bobbing loop and a hop-off onto land | Tideglide: A prompt, **walk speed** only, gets off by stepping on land, no water encounters, flag OFF | Coder: glide at 6-8 tiles/s, add the mount and dismount hop (reuse HOP_TICKS), a bob loop and water encounters |
| Water layout | roads with lakes or sea that hold islets, current lanes, fishermen on piers and hidden items on small sandbars | water edges exist, no water-only pockets | WD: 1 water-only pocket per coastal region |
| Fishing rods | 3 tiers (Gen 2-4). Gen 4 bite odds are 25/50/75% (Old/Good/Super), and Gen 5 has only a Super Rod at 50% (Bulbapedia Fishing) | 3 tiers, base bite set per rod (default 0.7), bait modifiers | OK. Tune tier 1 down to about 0.4 so rod upgrades feel earned |
| Cast and bite cue | cast animation, then dots, then "!" over the player (Gen 4) or a "bite" textbox (Gen 3). A short, roughly sub-second window to press A. Gen 3 better rods need repeated confirmations | cast 650 ms, wait 1.4-3.8 s, window 900 ms (1100 touch), reel 500 ms | OK. Add an "!" pop and a sound on the bite, and a "got away" line when late. BW-style rippling-water spots for rare tables |
| Fishing spots | any water edge, plus fishing off the surf mount from Gen 3 | any water edge or pier | Coder: allow fishing while gliding |

---
## 6. Furniture perspective and value steps
**Reference measurement.** I measured Gary's screenshot (a pixel fan game Heal Centre in the Gen 3 style) in greyscale. The shelf runs on both sides are about 174 px tall at screenshot scale.
- Top face is about **33% of the piece height** (the front is about 67%), so top:front is about **1:2**. The low counter is mostly top with a thin front lip of about 20-25%.
- Value step: top face luma about **244**, front about **130 mean** (110-150). **The top is about 85% lighter than the front.** A dark outline of 1 px (luma about 85-90) separates the faces and the floor.
- Light comes from the top-left, and left halves read a little lighter. There is a 1-2 px drop shadow under and to the right of each piece.

**Proposed projection spec (WD and Character models redraw to this):**
1. One viewpoint: a top-down tilt of about 35°. **Tall pieces** (shelves, wardrobes, machines): top face is 25-35% of the sprite height. **Low pieces** (tables, desks, beds, counters): front face or lip is 20-35% and the rest is top.
2. Value step: in greyscale the top face must be at least **25% lighter** than the front's mean (target 40-80%). Front shadows and recesses sit at least 15% below the front's midtone.
3. Light from the top-left: the left third at least as light as the right third. Cast shadow of 1-2 px at 25-35% alpha, down and to the right.
4. Outline: 1 px dark outline (luma ≤ 35% of the top face), the same on all edges facing the floor.

**Automated check.** `/workspace/kilumen/design/furniture_value_check.py` (audit helper, not game code) converts each sprite on a sheet to greyscale, finds the top/front split, and flags INVERTED, FLAT, STEEP, FRONTAL and LIGHT_R. Run on `art/world/overworld/interiors_new/tiles_1x/i_furniture_v2.png` and `_v3.png`, it flagged 271 of 323 pieces (INVERTED 95, FLAT 12, STEEP 98, FRONTAL 114, LIGHT_R 11). The tool is a heuristic. STEEP fires on every table and bed, which the low-piece rule allows, and INVERTED fires on beds, because the white pillow end is lighter than the blanket. Treat these as real offenders for redraw:
- **FRONTAL tall pieces (80):** bookcases, cabinets and machines with a top face of only 8-15%, against the reference's 33%. For example v3 at (204..460, 130) is a bookcase row with a 10% top. In v2, (900,196), (4,260), (260,260), (324,256), (644,262), (772,262), (326..582,322), (194,646), (4,704), (262,708) and (644,832) all have a top of 8-15%. They read side-on next to the 35° floor.
- **FLAT value (top and front within 15%):** v2 (5,203) 121x113, (68,320), (6,323), (258,640), (326,704), (652,960), (209,980). v3 (580,130) 58x190, (768,130) 126x254, (652,960), (962,1350).
- **Light from the right:** v2 (262,70), (389,203), (582,402), (326,450), (836,644), (964,904). v3 (198,194), (578,266), (326,450), (964,904), (0,1280).
- Full list: rerun the script. The output is TSV with sheet, x, y, size, top%, value step %, left-right difference and tags.
Coordinates are 1x sheet pixels (64 px cells). The v3 sheet is mostly the v2 art re-laid, so fix it once and both sheets pick it up.

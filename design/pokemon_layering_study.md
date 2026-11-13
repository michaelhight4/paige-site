# Pokémon map layering study for Kilumen (Oct 30 2026)
_STUDY ONLY. These images are Nintendo/Game Freak and fan-game IP. Never copy them into the game, a build, or a texture atlas._
Gary's brief: caves get you into otherwise unreachable areas; cave exits either just let you out or drop you onto a pocket (Easter egg, hidden strong item, extra trainers); trees and cliffs seal pockets; field skills open them; ledges are one-way.

Files: raw maps are in `pokemon_refs/raw/` (26 images, sources in `pokemon_refs/sources.json`). Annotated copies (17) are in `pokemon_refs/annotated/`. The contact sheet is `pokemon_refs/study_sheet.png`. The tools are `pokemon_refs/tools/annotate.py` (marks are in `annotations.json`) and `deadspace.py`.
Legend: **green ring** = plain exit; **orange ring** = exit, ladder or stairs into a pocket or gated area; **cyan box** = sealed pocket; **red triangle** = one-way ledge; **brown bar** = sealing wall or HM barrier; **yellow star** = item; **magenta square** = trainer; **grey hatch** = filler or render padding.

## 1. Per-map counts (counted by hand from the annotations; tiles are 16 px)
| Map | Cave exits (plain / pocket-or-gated) | Sealed pockets | Typical pocket size (tiles) | Trainers off main path | Items off main path | How it is sealed |
|---|---|---|---|---|---|---|
| HGSS Route 45 | 1 cave mouth (Dark Cave) | 4 | 5x7 to 6x8 (~35-45) | 4 of 10 | 2 of 2 | cliff bands plus about 6 south-only ledge rows (you can't walk back north on the fast line) |
| HGSS Dark Cave (Route 45 side) | 2 / 3 stair sets | 3 | islet 6x6 (~20 walkable), shelves 4x8 | 0 of 1 | 2 of 2 | Surf lake, stair-only pillars |
| HGSS Mt. Mortar entrance | 4 / 3 (one needs Waterfall, one needs Strength) | 4 | 9x5 to 10x6 (~30-45) | n/a | 3 of 3 | Waterfall wall down the middle, Surf moats |
| HGSS Ice Path 1F | 1 / 3 (2 ladders, 1 deeper exit) | 2 | ice field 14x11, shelf 6x3 | 0 | 3 of 3 | ice-slide physics |
| HGSS Union Cave 1F | 2 (Route 32 and Route 33) / 1 hole | 4 Surf pools | 6x6 to 14x8 | 0 of 5 | 3 of 4 | Surf water |
| HGSS Route 32 | 1 (Union Cave mouth at the end) | 5 | 4x4 to 5x8 (~16-30) | 2 of 6 | 3 of 3 | cliff boxes, a ledge row, Surf rocks, a tree wall |
| FRLG Route 4 | 1 / 1 (Mt. Moon puts you east of the ledges) | 1-2 | upper shelf 15x3 | 0 | 1 of 1 | a long one-way ledge (no walking back west) |
| FRLG Mt. Moon 1F | 1 / 3 ladders (one goes to a dead-end B1F room with an item) | 0 on this floor (the pockets are on B1F) | n/a | n/a | 3 | rock pillars, floor changes |
| FRLG Victory Road 1F | 1 / 1 ladder plus 1 Strength boulder | 2 plateaus | 14x5, 11x5 | n/a | n/a | stairs, Strength |
| Emerald Meteor Falls 1F | 2 (Route 114 and 115) / 2 (north room, Waterfall to B1F) | 2-3 | 5x8 shelves | n/a | 1 of 1 | 2 Waterfall barriers, Surf |
| Emerald Route 114 | 1 cave mouth, 4 secret-base holes | 5 | islet 4x3, ponds 3x4 | n/a | 1 of 1 | Surf, a waterfall, stairs up cliffs |
| Pt Route 210 | 0 caves; the north half is behind a fog/cliff gate | 3 plus the gated half | 4x3 raised walkway, 3x3 pocket | 3 of 8 | n/a | raised cliffs, a stair walkway, the Psyduck/Defog gate |
| Pt Mt. Coronet 2F | 2 / 3 stairs (2 go to isolated stair-only rooms) | 3 | 9x10 rooms, 6x6 | n/a | 4 of 4 | stair-only links, bridges |

**Aggregates for the 13 official maps:**
- **Pockets:** a route-sized outdoor map has 3-5 sealed pockets (median 4). Caves have 2-4.
- **Cave exits:** every cave has at least 2 mouths (Mt. Mortar has 7). There are about 26 exits in total: roughly 14 are plain ways out and roughly 12 lead to a pocket, a gated area or another floor. That is about 45% pocket or gated, and every cave has at least 1.
- **Pocket size:** islets and nooks are 9-20 tiles (3x3 to 4x5). Shelves and plateaus are 30-45 tiles (5x7 to 6x8). The largest are 70-150 (an ice field or a whole Surf lake). Median ≈ 25 walkable tiles.
- **Off-path content:** about 30-40% of trainers and 80-100% of items are off the main path.
- **Dead space:** see §2. Inside the play area, the largest empty square is 3-6 tiles, and walls are 2-6 tiles thick.

## 2. Measured dead space (`tools/deadspace.py`)
A tile counts as "plain" when its pixel standard deviation is below 9 and it is not black or white void. This is a heuristic: it treats flat floor, sand, grass and water with nothing on it as empty.
| Map | Map tiles | Plain share | Largest plain square (tiles) |
|---|---|---|---|
| Johto_Route_45_HGSS.png | 3813 | 0.12 | 4 |
| Dark_Cave_2_HGSS.png | 2465 | 0.26 | 6 |
| Mt_Mortar_Entrance_HGSS.png | 3936 | 0.18 | 5 |
| Ice_Path_1F_HGSS.png | 1481 | 0.16 | 3 |
| Union_Cave_1F_HGSS.png | 1567 | 0.18 | 5 |
| Johto_Route_32_HGSS.png | 3750 | 0.08 | 5 |
| Kanto_Route_4_FRLG.png | 2160 | 0.32 | 5 |
| Mt_Moon_1F_FRLG.png | 1920 | 0.07 | 4 |
| Victory_Road_1F_FRLG.png | 1056 | 0.00 | 0 |
| Meteor_Falls_1F1R_E.png | 1260 | 0.07 | 3 |
| Hoenn_Route_114_E.png | 3200 | 0.08 | 6 |
| Sinnoh_Route_210_Pt.png | 5096 | 0.15 | 18 |
| Mt_Coronet_2F_Pt.png | 792 | 0.15 | 3 |
| FAN_Unbound_Route_1.jpg | 1838 | 0.28 | 8 |
| FAN_Unbound_Route_3.jpg | 3568 | 0.42 | 9 |
| FAN_Unbound_Route_5.jpg | 2711 | 0.11 | 3 |
| FAN_Reborn_Route_4.png | 7000 | 0.08 | 3 |

How to read the table: in the official maps the largest empty square in the play area is **3-6 tiles** (median 5), and the plain share is 7-26%. Three rows are outliers for known reasons. Route 210's 18 is the brown render padding in the image, not the map. Unbound Route 3's 9 is open sea, which is itself a Surf layer. Kanto Route 4's 0.32 is long sand strips cut up by ledges. Victory Road reads 0 because rock texture is never "plain".

## 3. Recurring patterns
1. **The cave is a stair.** Dark Cave, Mt. Moon, Union Cave and Meteor Falls each have one mouth on the main path. The other mouth drops you somewhere you couldn't walk to: east of Route 4's ledges, onto Route 45's upper end, or into Meteor Falls' Waterfall chamber.
2. **Ledge rivers.** On Route 45 and Route 4, rows of south-only ledges make one direction fast. The same tiles can't be walked the other way, so a shelf you can see from below is only reachable from above or from a cave.
3. **Moats.** Surf water seals pockets in Union Cave, Mt. Mortar, Dark Cave and Route 114. Each pool holds 1 item, sometimes with a trainer.
4. **The HM wall.** Waterfall (Mt. Mortar, Meteor Falls), Strength (Victory Road, Mt. Mortar's side room) and ice (Ice Path) split one map into a now-layer and a later-layer.
5. **Stair-only boxes.** Raised cliff boxes on Route 32, plateaus in Victory Road and isolated rooms on Mt. Coronet 2F. You can see them early but only enter them from one side.
6. **Walls stay thin.** Filler between paths is 2-6 tiles thick. Big filler areas exist only at the map border.

## 4. Fan games (Unbound, Reborn) and what they do better
Four maps were annotated: Unbound Routes 1, 3 and 5 (unboundwiki.com) and Reborn Route 4 (reborn-db-site). Insurgence, Uranium and Gaia were not annotated: I found no clean full-map image in the time available, so they are left as follow-ups.
- **Unbound Route 3 (Gary's video: surf to a bridge, stairs up a cliff, raised grass with a trainer):** 5 pockets on one screen-and-a-half. Every Surf islet holds a trainer plus an item, or a hidden "?" item (4 islets). A raised grass plateau with a trainer sits over the bridge, and there are 3 stair cuts up the cliff. **Better than official:** a 1:1 pairing of a pocket with a trainer and a reward, and almost no empty islet.
- **Unbound Route 1:** a Rock Climb shelf holding a Lucky Egg (a strong early item you see early but reach late), a hidden berry in a rock at a ledge dead end, and the cave as the only way out. **Better:** a strong item is shown on turn one and reached much later.
- **Unbound Route 5:** a dark dense-forest belt hides 3 trainers (13/14/15) inside a tree mass that would otherwise be filler. **Better:** filler turned into content without adding walls.
- **Reborn Route 4:** a Rock Climb plateau with a freeze/melt field puzzle holding 6 items. The big mountain frame around it is filler. **Better:** one pocket reused in two states. **Worse:** large empty border mass.
**Takeaways:** (a) every pocket gets at least one reward and ideally a trainer as well; (b) dense trees can be a pocket, not a wall; (c) show the strong item early and gate it late; (d) one pocket can have two states.

## 5. Hard numeric rules for Kilumen (checked by `tools/map_audit/layering_rules.py`)
| # | Rule | Derived from |
|---|---|---|
| R1a | No empty walkable square larger than **6x6** (no item, NPC, sign, warp, spot, decoration, ledge or water inside). Target ≤ 5x5. | official play areas measure 3-6, median 5 |
| R1b | No solid filler square larger than **8x8** inside the playable bounding box. Walls should be 2-6 thick. | wall bands measured in the refs |
| R2 | Route-sized outdoor maps (≥ 1500 cells) need **≥ 3 sealed pockets**; other outdoor maps need **≥ 1**. Each pocket is **6-60 walkable squares** (aim for 9-45). | median of 4 pockets; pocket sizes 9-45 |
| R3 | Every cave has **≥ 2 exits**, and **≥ 1 exit lands in a pocket** that the destination map's no-skill main path can't reach. Aim for about 45% pocket exits on big caves. | 26 exits, about 12 pocket or gated |
| R4 | Every pocket is **sealed** by trees, cliffs, water or ledges (no plain walking link to the main path) **and enterable**: by a cave or warp, by a field-skill square on its edge, or by a ledge dropping into it. Orphan pockets fail. | all reference pockets |
| R5 | **≥ 30% of trainers and ≥ 50% of items** sit off the main path (pocket, ledge-only shelf or hidden). | 30-40% of trainers, 80-100% of items |
| R6 (design) | Every pocket holds ≥ 1 reward. At least 1 pocket per route holds a trainer plus a hidden strong item, and is visible from the main path. | Unbound Route 3 / Route 1 |

## 6. Kilumen audit on Oct 30 2026
`python3 tools/map_audit/layering_rules.py --fails` reports 43 of 130 maps failing (the list is saved in `pokemon_refs/kilumen_rules_audit_2026-10-30.txt`). **Every route-sized outdoor map has 0 or 1 sealed pockets, against the 3 required.** Most also have filler squares of 9-25 against the limit of 8. Those two numbers are exactly the "big empty areas" Gary sees. Caves `greystone_entrance`, `lanternport_grotto`, `tidewater_cave_int` and `cindervale_caldera` have only plain exits. Game dev's uncommitted `cave_pockets.py` pass on r9_switchbacks is aimed at this.

## 7. Sources
| File | Page | Direct URL |
|---|---|---|
| Dark_Cave_1_HGSS.png | https://archives.bulbagarden.net/wiki/File%3ADark_Cave_1_HGSS.png | https://archives.bulbagarden.net/media/upload/4/4e/Dark_Cave_1_HGSS.png |
| Dark_Cave_2_HGSS.png | https://archives.bulbagarden.net/wiki/File%3ADark_Cave_2_HGSS.png | https://archives.bulbagarden.net/media/upload/7/78/Dark_Cave_2_HGSS.png |
| Ice_Path_1F_HGSS.png | https://archives.bulbagarden.net/wiki/File%3AIce_Path_1F_HGSS.png | https://archives.bulbagarden.net/media/upload/9/9a/Ice_Path_1F_HGSS.png |
| Ice_Path_B1F_HGSS.png | https://archives.bulbagarden.net/wiki/File%3AIce_Path_B1F_HGSS.png | https://archives.bulbagarden.net/media/upload/8/89/Ice_Path_B1F_HGSS.png |
| Johto_Route_32_HGSS.png | https://archives.bulbagarden.net/wiki/File%3AJohto_Route_32_HGSS.png | https://archives.bulbagarden.net/media/upload/8/86/Johto_Route_32_HGSS.png |
| Johto_Route_45_HGSS.png | https://archives.bulbagarden.net/wiki/File%3AJohto_Route_45_HGSS.png | https://archives.bulbagarden.net/media/upload/a/a4/Johto_Route_45_HGSS.png |
| Johto_Route_46_HGSS.png | https://archives.bulbagarden.net/wiki/File%3AJohto_Route_46_HGSS.png | https://archives.bulbagarden.net/media/upload/e/e4/Johto_Route_46_HGSS.png |
| Mt_Mortar_Entrance_HGSS.png | https://archives.bulbagarden.net/wiki/File%3AMt_Mortar_Entrance_HGSS.png | https://archives.bulbagarden.net/media/upload/1/15/Mt_Mortar_Entrance_HGSS.png |
| Mt_Mortar_Lower_Cave_HGSS.png | https://archives.bulbagarden.net/wiki/File%3AMt_Mortar_Lower_Cave_HGSS.png | https://archives.bulbagarden.net/media/upload/e/ec/Mt_Mortar_Lower_Cave_HGSS.png |
| Union_Cave_1F_HGSS.png | https://archives.bulbagarden.net/wiki/File%3AUnion_Cave_1F_HGSS.png | https://archives.bulbagarden.net/media/upload/6/65/Union_Cave_1F_HGSS.png |
| Hoenn_Route_114_E.png | https://archives.bulbagarden.net/wiki/File%3AHoenn_Route_114_E.png | https://archives.bulbagarden.net/media/upload/4/41/Hoenn_Route_114_E.png |
| Johto_Route_33_HGSS.png | https://archives.bulbagarden.net/wiki/File%3AJohto_Route_33_HGSS.png | https://archives.bulbagarden.net/media/upload/8/8b/Johto_Route_33_HGSS.png |
| Kanto_Route_4_FRLG.png | https://archives.bulbagarden.net/wiki/File%3AKanto_Route_4_FRLG.png | https://archives.bulbagarden.net/media/upload/3/37/Kanto_Route_4_FRLG.png |
| Meteor_Falls_1F1R_E.png | https://archives.bulbagarden.net/wiki/File%3AMeteor_Falls_1F1R_E.png | https://archives.bulbagarden.net/media/upload/2/23/Meteor_Falls_1F1R_E.png |
| Meteor_Falls_1F2R_E.png | https://archives.bulbagarden.net/wiki/File%3AMeteor_Falls_1F2R_E.png | https://archives.bulbagarden.net/media/upload/7/7d/Meteor_Falls_1F2R_E.png |
| Mt_Moon_1F_FRLG.png | https://archives.bulbagarden.net/wiki/File%3AMt_Moon_1F_FRLG.png | https://archives.bulbagarden.net/media/upload/7/7f/Mt_Moon_1F_FRLG.png |
| Mt_Moon_B2F_FRLG.png | https://archives.bulbagarden.net/wiki/File%3AMt_Moon_B2F_FRLG.png | https://archives.bulbagarden.net/media/upload/0/00/Mt_Moon_B2F_FRLG.png |
| Sinnoh_Route_210_Pt.png | https://archives.bulbagarden.net/wiki/File%3ASinnoh_Route_210_Pt.png | https://archives.bulbagarden.net/media/upload/d/d1/Sinnoh_Route_210_Pt.png |
| Victory_Road_1F_FRLG.png | https://archives.bulbagarden.net/wiki/File%3AVictory_Road_1F_FRLG.png | https://archives.bulbagarden.net/media/upload/1/10/Victory_Road_1F_FRLG.png |
| Victory_Road_2F_FRLG.png | https://archives.bulbagarden.net/wiki/File%3AVictory_Road_2F_FRLG.png | https://archives.bulbagarden.net/media/upload/d/d1/Victory_Road_2F_FRLG.png |
| Mt_Coronet_1F_south_Pt.png | https://archives.bulbagarden.net/wiki/File%3AMt_Coronet_1F_south_Pt.png | https://archives.bulbagarden.net/media/upload/1/15/Mt_Coronet_1F_south_Pt.png |
| Mt_Coronet_2F_Pt.png | https://archives.bulbagarden.net/wiki/File%3AMt_Coronet_2F_Pt.png | https://archives.bulbagarden.net/media/upload/c/c8/Mt_Coronet_2F_Pt.png |
| FAN_Unbound_Route_1.jpg | https://unboundwiki.com/locations/route-1/ | https://static.unboundwiki.com/wp-content/assets/images/locations/route-1/01-pokemon-unbound-route-1-map-fullsize.jpg |
| FAN_Unbound_Route_3.jpg | https://unboundwiki.com/locations/route-3/ | https://static.unboundwiki.com/wp-content/assets/images/locations/route-3/01-pokemon-unbound-route-3-map-fullsize.jpg |
| FAN_Unbound_Route_5.jpg | https://unboundwiki.com/locations/route-5/ | https://static.unboundwiki.com/wp-content/assets/images/locations/route-5/01-pokemon-unbound-route-5-map-fullsize.jpg |
| FAN_Reborn_Route_4.png | https://andrew-foote.github.io/reborn-db-site/area/412.html | https://andrew-foote.github.io/reborn-db-site/img/area/412.png |
